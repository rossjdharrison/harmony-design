/**
 * @fileoverview Resource Limits Enforcer - Monitors and enforces memory/CPU limits on dispatched code
 * @module security/resource-limits-enforcer
 * 
 * Enforces resource constraints on WASM and JavaScript execution:
 * - Memory limits (heap size, allocation rate)
 * - CPU limits (execution time, instruction count)
 * - Integration with execution timeout system
 * 
 * Related: security/execution-timeout.js, security/sandbox-policy.js
 * Documentation: harmony-design/DESIGN_SYSTEM.md#resource-limits
 */

/**
 * @typedef {Object} ResourceLimits
 * @property {number} maxMemoryBytes - Maximum memory allocation in bytes
 * @property {number} maxCpuTimeMs - Maximum CPU time in milliseconds
 * @property {number} maxAllocationRate - Maximum allocations per second
 * @property {number} memoryCheckIntervalMs - Interval for memory checks
 * @property {number} cpuCheckIntervalMs - Interval for CPU checks
 */

/**
 * @typedef {Object} ResourceUsage
 * @property {number} memoryUsed - Current memory usage in bytes
 * @property {number} cpuTimeUsed - CPU time used in milliseconds
 * @property {number} allocationCount - Number of allocations
 * @property {number} timestamp - Timestamp of measurement
 */

/**
 * @typedef {Object} ResourceViolation
 * @property {'memory'|'cpu'|'allocation-rate'} type - Type of violation
 * @property {number} limit - The limit that was exceeded
 * @property {number} actual - The actual value
 * @property {string} executionId - ID of the execution context
 * @property {number} timestamp - When violation occurred
 */

/**
 * Enforces resource limits on code execution
 */
export class ResourceLimitsEnforcer {
  /**
   * Default resource limits based on global performance budgets
   * @type {ResourceLimits}
   */
  static DEFAULT_LIMITS = {
    maxMemoryBytes: 50 * 1024 * 1024, // 50MB WASM heap (global policy)
    maxCpuTimeMs: 100, // 100ms per execution (allows 6 executions per frame budget)
    maxAllocationRate: 10000, // 10k allocations per second
    memoryCheckIntervalMs: 10, // Check every 10ms
    cpuCheckIntervalMs: 5 // Check every 5ms
  };

  /**
   * Stricter limits for untrusted/user code
   * @type {ResourceLimits}
   */
  static UNTRUSTED_LIMITS = {
    maxMemoryBytes: 10 * 1024 * 1024, // 10MB for untrusted code
    maxCpuTimeMs: 50, // 50ms max
    maxAllocationRate: 5000,
    memoryCheckIntervalMs: 5,
    cpuCheckIntervalMs: 2
  };

  /**
   * @param {ResourceLimits} [limits] - Custom resource limits
   */
  constructor(limits = ResourceLimitsEnforcer.DEFAULT_LIMITS) {
    /** @type {ResourceLimits} */
    this.limits = { ...limits };

    /** @type {Map<string, ResourceUsage>} */
    this.activeExecutions = new Map();

    /** @type {Map<string, number>} */
    this.monitoringIntervals = new Map();

    /** @type {Array<ResourceViolation>} */
    this.violations = [];

    /** @type {EventTarget} */
    this.eventTarget = new EventTarget();

    this.enabled = true;
  }

  /**
   * Start monitoring an execution context
   * @param {string} executionId - Unique ID for this execution
   * @param {Object} context - Execution context (WASM instance, Worker, etc.)
   * @returns {void}
   */
  startMonitoring(executionId, context) {
    if (!this.enabled) return;

    const usage = {
      memoryUsed: 0,
      cpuTimeUsed: 0,
      allocationCount: 0,
      timestamp: performance.now(),
      startTime: performance.now(),
      context
    };

    this.activeExecutions.set(executionId, usage);

    // Start memory monitoring
    const memoryInterval = setInterval(() => {
      this._checkMemoryLimits(executionId);
    }, this.limits.memoryCheckIntervalMs);

    // Start CPU monitoring
    const cpuInterval = setInterval(() => {
      this._checkCpuLimits(executionId);
    }, this.limits.cpuCheckIntervalMs);

    this.monitoringIntervals.set(executionId, {
      memory: memoryInterval,
      cpu: cpuInterval
    });

    this._dispatchEvent('monitoring-started', { executionId, limits: this.limits });
  }

  /**
   * Stop monitoring an execution context
   * @param {string} executionId - Execution ID to stop monitoring
   * @returns {ResourceUsage|null} Final resource usage
   */
  stopMonitoring(executionId) {
    const intervals = this.monitoringIntervals.get(executionId);
    if (intervals) {
      clearInterval(intervals.memory);
      clearInterval(intervals.cpu);
      this.monitoringIntervals.delete(executionId);
    }

    const usage = this.activeExecutions.get(executionId);
    this.activeExecutions.delete(executionId);

    if (usage) {
      this._dispatchEvent('monitoring-stopped', {
        executionId,
        finalUsage: {
          memoryUsed: usage.memoryUsed,
          cpuTimeUsed: usage.cpuTimeUsed,
          allocationCount: usage.allocationCount
        }
      });
    }

    return usage || null;
  }

  /**
   * Update memory usage for an execution
   * @param {string} executionId - Execution ID
   * @param {number} memoryBytes - Current memory usage in bytes
   * @returns {void}
   */
  updateMemoryUsage(executionId, memoryBytes) {
    const usage = this.activeExecutions.get(executionId);
    if (!usage) return;

    const previousMemory = usage.memoryUsed;
    usage.memoryUsed = memoryBytes;
    usage.timestamp = performance.now();

    // Track allocations
    if (memoryBytes > previousMemory) {
      usage.allocationCount++;
    }
  }

  /**
   * Update CPU time for an execution
   * @param {string} executionId - Execution ID
   * @param {number} cpuTimeMs - CPU time used in milliseconds
   * @returns {void}
   */
  updateCpuTime(executionId, cpuTimeMs) {
    const usage = this.activeExecutions.get(executionId);
    if (!usage) return;

    usage.cpuTimeUsed = cpuTimeMs;
    usage.timestamp = performance.now();
  }

  /**
   * Get current resource usage for an execution
   * @param {string} executionId - Execution ID
   * @returns {ResourceUsage|null}
   */
  getUsage(executionId) {
    const usage = this.activeExecutions.get(executionId);
    if (!usage) return null;

    return {
      memoryUsed: usage.memoryUsed,
      cpuTimeUsed: usage.cpuTimeUsed,
      allocationCount: usage.allocationCount,
      timestamp: usage.timestamp
    };
  }

  /**
   * Check if execution is within limits
   * @param {string} executionId - Execution ID
   * @returns {boolean}
   */
  isWithinLimits(executionId) {
    const usage = this.activeExecutions.get(executionId);
    if (!usage) return true;

    return (
      usage.memoryUsed <= this.limits.maxMemoryBytes &&
      usage.cpuTimeUsed <= this.limits.maxCpuTimeMs &&
      this._getAllocationRate(usage) <= this.limits.maxAllocationRate
    );
  }

  /**
   * Terminate an execution due to resource violation
   * @param {string} executionId - Execution ID to terminate
   * @param {ResourceViolation} violation - The violation that triggered termination
   * @returns {void}
   */
  terminateExecution(executionId, violation) {
    const usage = this.activeExecutions.get(executionId);
    if (!usage) return;

    console.error(`[ResourceLimitsEnforcer] Terminating execution ${executionId}:`, violation);

    // Attempt to terminate the execution context
    if (usage.context) {
      if (usage.context.terminate && typeof usage.context.terminate === 'function') {
        usage.context.terminate();
      } else if (usage.context.abort && typeof usage.context.abort === 'function') {
        usage.context.abort();
      }
    }

    this.stopMonitoring(executionId);

    this._dispatchEvent('execution-terminated', {
      executionId,
      violation,
      finalUsage: {
        memoryUsed: usage.memoryUsed,
        cpuTimeUsed: usage.cpuTimeUsed,
        allocationCount: usage.allocationCount
      }
    });
  }

  /**
   * Get all violations for an execution
   * @param {string} [executionId] - Optional execution ID to filter by
   * @returns {Array<ResourceViolation>}
   */
  getViolations(executionId = null) {
    if (executionId) {
      return this.violations.filter(v => v.executionId === executionId);
    }
    return [...this.violations];
  }

  /**
   * Clear violation history
   * @returns {void}
   */
  clearViolations() {
    this.violations = [];
  }

  /**
   * Add event listener
   * @param {string} type - Event type
   * @param {EventListener} listener - Event listener
   * @returns {void}
   */
  addEventListener(type, listener) {
    this.eventTarget.addEventListener(type, listener);
  }

  /**
   * Remove event listener
   * @param {string} type - Event type
   * @param {EventListener} listener - Event listener
   * @returns {void}
   */
  removeEventListener(type, listener) {
    this.eventTarget.removeEventListener(type, listener);
  }

  /**
   * Check memory limits for an execution
   * @private
   * @param {string} executionId - Execution ID
   * @returns {void}
   */
  _checkMemoryLimits(executionId) {
    const usage = this.activeExecutions.get(executionId);
    if (!usage) return;

    // Check memory limit
    if (usage.memoryUsed > this.limits.maxMemoryBytes) {
      const violation = {
        type: 'memory',
        limit: this.limits.maxMemoryBytes,
        actual: usage.memoryUsed,
        executionId,
        timestamp: performance.now()
      };

      this.violations.push(violation);
      this._dispatchEvent('limit-exceeded', violation);
      this.terminateExecution(executionId, violation);
      return;
    }

    // Check allocation rate
    const allocationRate = this._getAllocationRate(usage);
    if (allocationRate > this.limits.maxAllocationRate) {
      const violation = {
        type: 'allocation-rate',
        limit: this.limits.maxAllocationRate,
        actual: allocationRate,
        executionId,
        timestamp: performance.now()
      };

      this.violations.push(violation);
      this._dispatchEvent('limit-exceeded', violation);
      this.terminateExecution(executionId, violation);
    }
  }

  /**
   * Check CPU limits for an execution
   * @private
   * @param {string} executionId - Execution ID
   * @returns {void}
   */
  _checkCpuLimits(executionId) {
    const usage = this.activeExecutions.get(executionId);
    if (!usage) return;

    if (usage.cpuTimeUsed > this.limits.maxCpuTimeMs) {
      const violation = {
        type: 'cpu',
        limit: this.limits.maxCpuTimeMs,
        actual: usage.cpuTimeUsed,
        executionId,
        timestamp: performance.now()
      };

      this.violations.push(violation);
      this._dispatchEvent('limit-exceeded', violation);
      this.terminateExecution(executionId, violation);
    }
  }

  /**
   * Calculate allocation rate
   * @private
   * @param {Object} usage - Usage object
   * @returns {number} Allocations per second
   */
  _getAllocationRate(usage) {
    const elapsedSeconds = (performance.now() - usage.startTime) / 1000;
    if (elapsedSeconds === 0) return 0;
    return usage.allocationCount / elapsedSeconds;
  }

  /**
   * Dispatch custom event
   * @private
   * @param {string} type - Event type
   * @param {Object} detail - Event detail
   * @returns {void}
   */
  _dispatchEvent(type, detail) {
    this.eventTarget.dispatchEvent(new CustomEvent(type, { detail }));
  }

  /**
   * Create enforcer with untrusted limits
   * @returns {ResourceLimitsEnforcer}
   */
  static createUntrusted() {
    return new ResourceLimitsEnforcer(ResourceLimitsEnforcer.UNTRUSTED_LIMITS);
  }
}

/**
 * Global resource limits enforcer instance
 * @type {ResourceLimitsEnforcer}
 */
export const globalResourceLimits = new ResourceLimitsEnforcer();