/**
 * @fileoverview Health Check Service - Provides readiness and liveness probes
 * @module health/health-check-service
 * 
 * Implements health check endpoints for monitoring system health:
 * - Liveness: Is the application running?
 * - Readiness: Is the application ready to serve requests?
 * 
 * Related: See DESIGN_SYSTEM.md § Health Monitoring
 */

import { EventBus } from '../core/event-bus.js';

/**
 * @typedef {Object} HealthCheckResult
 * @property {boolean} healthy - Overall health status
 * @property {string} status - 'healthy' | 'degraded' | 'unhealthy'
 * @property {number} timestamp - Check timestamp (ms)
 * @property {Object.<string, CheckResult>} checks - Individual check results
 */

/**
 * @typedef {Object} CheckResult
 * @property {boolean} healthy - Check status
 * @property {string} [message] - Optional status message
 * @property {number} [duration] - Check duration (ms)
 * @property {*} [metadata] - Additional check-specific data
 */

/**
 * Health Check Service
 * Manages liveness and readiness probes for system monitoring
 */
export class HealthCheckService {
  constructor() {
    /** @type {Map<string, Function>} */
    this.livenessChecks = new Map();
    
    /** @type {Map<string, Function>} */
    this.readinessChecks = new Map();
    
    /** @type {HealthCheckResult|null} */
    this.lastLivenessResult = null;
    
    /** @type {HealthCheckResult|null} */
    this.lastReadinessResult = null;
    
    /** @type {number} */
    this.checkTimeout = 5000; // 5s timeout for checks
    
    this._initializeDefaultChecks();
  }

  /**
   * Initialize default health checks
   * @private
   */
  _initializeDefaultChecks() {
    // Liveness: Basic runtime checks
    this.registerLivenessCheck('runtime', async () => {
      return {
        healthy: true,
        message: 'Runtime operational'
      };
    });

    this.registerLivenessCheck('memory', async () => {
      if (performance.memory) {
        const usedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = performance.memory.jsHeapSizeLimit / (1024 * 1024);
        const usage = (usedMB / limitMB) * 100;
        
        return {
          healthy: usage < 90,
          message: usage >= 90 ? 'Memory usage critical' : 'Memory usage normal',
          metadata: {
            usedMB: Math.round(usedMB),
            limitMB: Math.round(limitMB),
            usagePercent: Math.round(usage)
          }
        };
      }
      
      return { healthy: true, message: 'Memory API not available' };
    });

    // Readiness: System component checks
    this.registerReadinessCheck('event-bus', async () => {
      try {
        const eventBus = EventBus.getInstance();
        return {
          healthy: eventBus !== null,
          message: 'EventBus available'
        };
      } catch (error) {
        return {
          healthy: false,
          message: `EventBus unavailable: ${error.message}`
        };
      }
    });

    this.registerReadinessCheck('dom', async () => {
      return {
        healthy: document.readyState === 'complete' || document.readyState === 'interactive',
        message: `DOM state: ${document.readyState}`
      };
    });
  }

  /**
   * Register a liveness check
   * Liveness checks determine if the application is running
   * 
   * @param {string} name - Check name
   * @param {Function} checkFn - Async function returning CheckResult
   */
  registerLivenessCheck(name, checkFn) {
    if (typeof checkFn !== 'function') {
      throw new TypeError('Check function must be a function');
    }
    this.livenessChecks.set(name, checkFn);
  }

  /**
   * Register a readiness check
   * Readiness checks determine if the application can serve requests
   * 
   * @param {string} name - Check name
   * @param {Function} checkFn - Async function returning CheckResult
   */
  registerReadinessCheck(name, checkFn) {
    if (typeof checkFn !== 'function') {
      throw new TypeError('Check function must be a function');
    }
    this.readinessChecks.set(name, checkFn);
  }

  /**
   * Unregister a liveness check
   * @param {string} name - Check name
   */
  unregisterLivenessCheck(name) {
    this.livenessChecks.delete(name);
  }

  /**
   * Unregister a readiness check
   * @param {string} name - Check name
   */
  unregisterReadinessCheck(name) {
    this.readinessChecks.delete(name);
  }

  /**
   * Execute a single check with timeout
   * @private
   * @param {string} name - Check name
   * @param {Function} checkFn - Check function
   * @returns {Promise<CheckResult>}
   */
  async _executeCheck(name, checkFn) {
    const startTime = performance.now();
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Check timeout')), this.checkTimeout);
      });
      
      const result = await Promise.race([
        checkFn(),
        timeoutPromise
      ]);
      
      const duration = performance.now() - startTime;
      
      return {
        ...result,
        duration: Math.round(duration)
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      return {
        healthy: false,
        message: `Check failed: ${error.message}`,
        duration: Math.round(duration)
      };
    }
  }

  /**
   * Execute all checks in a collection
   * @private
   * @param {Map<string, Function>} checks - Check collection
   * @returns {Promise<HealthCheckResult>}
   */
  async _executeChecks(checks) {
    const timestamp = Date.now();
    const results = {};
    
    // Execute all checks in parallel
    const checkPromises = Array.from(checks.entries()).map(async ([name, checkFn]) => {
      const result = await this._executeCheck(name, checkFn);
      results[name] = result;
    });
    
    await Promise.all(checkPromises);
    
    // Determine overall health
    const allHealthy = Object.values(results).every(r => r.healthy);
    const anyUnhealthy = Object.values(results).some(r => !r.healthy);
    
    let status = 'healthy';
    if (anyUnhealthy) {
      status = allHealthy ? 'degraded' : 'unhealthy';
    }
    
    return {
      healthy: allHealthy,
      status,
      timestamp,
      checks: results
    };
  }

  /**
   * Perform liveness check
   * Returns immediately with cached result if available and recent
   * 
   * @param {boolean} [force=false] - Force fresh check
   * @returns {Promise<HealthCheckResult>}
   */
  async checkLiveness(force = false) {
    // Return cached result if recent (< 1s old)
    if (!force && this.lastLivenessResult) {
      const age = Date.now() - this.lastLivenessResult.timestamp;
      if (age < 1000) {
        return this.lastLivenessResult;
      }
    }
    
    const result = await this._executeChecks(this.livenessChecks);
    this.lastLivenessResult = result;
    
    // Publish event
    try {
      const eventBus = EventBus.getInstance();
      eventBus.publish({
        type: 'health.liveness.checked',
        payload: result,
        source: 'HealthCheckService'
      });
    } catch (error) {
      console.warn('Failed to publish liveness check event:', error);
    }
    
    return result;
  }

  /**
   * Perform readiness check
   * Returns immediately with cached result if available and recent
   * 
   * @param {boolean} [force=false] - Force fresh check
   * @returns {Promise<HealthCheckResult>}
   */
  async checkReadiness(force = false) {
    // Return cached result if recent (< 1s old)
    if (!force && this.lastReadinessResult) {
      const age = Date.now() - this.lastReadinessResult.timestamp;
      if (age < 1000) {
        return this.lastReadinessResult;
      }
    }
    
    const result = await this._executeChecks(this.readinessChecks);
    this.lastReadinessResult = result;
    
    // Publish event
    try {
      const eventBus = EventBus.getInstance();
      eventBus.publish({
        type: 'health.readiness.checked',
        payload: result,
        source: 'HealthCheckService'
      });
    } catch (error) {
      console.warn('Failed to publish readiness check event:', error);
    }
    
    return result;
  }

  /**
   * Get health status summary
   * @returns {Object} Status summary
   */
  getStatus() {
    return {
      liveness: this.lastLivenessResult ? {
        status: this.lastLivenessResult.status,
        timestamp: this.lastLivenessResult.timestamp,
        age: Date.now() - this.lastLivenessResult.timestamp
      } : null,
      readiness: this.lastReadinessResult ? {
        status: this.lastReadinessResult.status,
        timestamp: this.lastReadinessResult.timestamp,
        age: Date.now() - this.lastReadinessResult.timestamp
      } : null,
      checks: {
        liveness: this.livenessChecks.size,
        readiness: this.readinessChecks.size
      }
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get HealthCheckService singleton instance
 * @returns {HealthCheckService}
 */
export function getHealthCheckService() {
  if (!instance) {
    instance = new HealthCheckService();
  }
  return instance;
}