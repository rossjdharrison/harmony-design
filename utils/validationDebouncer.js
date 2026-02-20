/**
 * @fileoverview Validation Debouncer - Configurable debounce for async validation
 * @module utils/validationDebouncer
 * 
 * Reduces server calls by debouncing validation requests with configurable timing.
 * Supports per-field debounce configuration and validation request cancellation.
 * 
 * Related: DESIGN_SYSTEM.md § Validation System
 */

/**
 * @typedef {Object} DebounceConfig
 * @property {number} delay - Debounce delay in milliseconds (default: 300)
 * @property {boolean} leading - Execute on leading edge (default: false)
 * @property {boolean} trailing - Execute on trailing edge (default: true)
 * @property {number} maxWait - Maximum time to wait before forcing execution (optional)
 */

/**
 * @typedef {Object} ValidationRequest
 * @property {string} fieldId - Unique field identifier
 * @property {*} value - Value to validate
 * @property {Function} validator - Async validation function
 * @property {AbortController} abortController - Controller for cancellation
 * @property {number} timestamp - Request timestamp
 */

/**
 * Validation Debouncer
 * Manages debounced async validation with configurable timing and cancellation
 */
export class ValidationDebouncer {
  /**
   * @param {DebounceConfig} defaultConfig - Default debounce configuration
   */
  constructor(defaultConfig = {}) {
    this.defaultConfig = {
      delay: 300,
      leading: false,
      trailing: true,
      maxWait: null,
      ...defaultConfig
    };

    // Track pending timeouts per field
    this.timeouts = new Map();
    
    // Track pending validation requests
    this.pendingRequests = new Map();
    
    // Track last execution time per field
    this.lastExecution = new Map();
    
    // Track results cache for immediate responses
    this.resultsCache = new Map();
    
    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      debouncedRequests: 0,
      cancelledRequests: 0,
      cacheHits: 0,
      serverCalls: 0
    };
  }

  /**
   * Debounce a validation request
   * @param {string} fieldId - Unique field identifier
   * @param {*} value - Value to validate
   * @param {Function} validator - Async validation function
   * @param {DebounceConfig} config - Field-specific debounce config
   * @returns {Promise<*>} Validation result
   */
  async debounce(fieldId, value, validator, config = {}) {
    this.metrics.totalRequests++;

    const finalConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();

    // Check cache for immediate response
    const cacheKey = this._getCacheKey(fieldId, value);
    if (this.resultsCache.has(cacheKey)) {
      this.metrics.cacheHits++;
      return this.resultsCache.get(cacheKey);
    }

    // Cancel any pending validation for this field
    this._cancelPending(fieldId);

    // Create new abort controller
    const abortController = new AbortController();

    // Create promise that will be resolved when validation completes
    const validationPromise = new Promise((resolve, reject) => {
      const executeValidation = async () => {
        try {
          // Check if aborted before executing
          if (abortController.signal.aborted) {
            this.metrics.cancelledRequests++;
            reject(new Error('Validation cancelled'));
            return;
          }

          this.metrics.serverCalls++;
          this.lastExecution.set(fieldId, Date.now());

          // Execute validation
          const result = await validator(value, abortController.signal);

          // Cache result
          this.resultsCache.set(cacheKey, result);
          
          // Clear from pending
          this.pendingRequests.delete(fieldId);
          
          resolve(result);
        } catch (error) {
          if (error.name === 'AbortError') {
            this.metrics.cancelledRequests++;
            reject(new Error('Validation cancelled'));
          } else {
            reject(error);
          }
        }
      };

      // Handle leading edge execution
      if (finalConfig.leading) {
        const lastExec = this.lastExecution.get(fieldId) || 0;
        const timeSinceLastExec = now - lastExec;
        
        if (timeSinceLastExec >= finalConfig.delay) {
          executeValidation();
          return;
        }
      }

      // Calculate delay considering maxWait
      let delay = finalConfig.delay;
      
      if (finalConfig.maxWait !== null) {
        const lastExec = this.lastExecution.get(fieldId) || now;
        const timeSinceLastExec = now - lastExec;
        const remainingMaxWait = finalConfig.maxWait - timeSinceLastExec;
        
        if (remainingMaxWait <= 0) {
          // MaxWait exceeded, execute immediately
          delay = 0;
        } else if (remainingMaxWait < delay) {
          // Use remaining maxWait time
          delay = remainingMaxWait;
        }
      }

      // Set timeout for trailing edge execution
      if (finalConfig.trailing) {
        const timeoutId = setTimeout(() => {
          this.timeouts.delete(fieldId);
          executeValidation();
        }, delay);

        this.timeouts.set(fieldId, timeoutId);
        this.metrics.debouncedRequests++;
      }
    });

    // Store pending request
    this.pendingRequests.set(fieldId, {
      fieldId,
      value,
      validator,
      abortController,
      timestamp: now,
      promise: validationPromise
    });

    return validationPromise;
  }

  /**
   * Cancel pending validation for a field
   * @param {string} fieldId - Field identifier
   */
  cancel(fieldId) {
    this._cancelPending(fieldId);
  }

  /**
   * Cancel all pending validations
   */
  cancelAll() {
    for (const fieldId of this.pendingRequests.keys()) {
      this._cancelPending(fieldId);
    }
  }

  /**
   * Flush pending validation immediately
   * @param {string} fieldId - Field identifier
   * @returns {Promise<*>|null} Validation promise if exists
   */
  flush(fieldId) {
    const timeoutId = this.timeouts.get(fieldId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(fieldId);
    }

    const request = this.pendingRequests.get(fieldId);
    return request ? request.promise : null;
  }

  /**
   * Clear results cache
   * @param {string} fieldId - Optional field to clear, or all if not specified
   */
  clearCache(fieldId = null) {
    if (fieldId) {
      // Clear cache entries for specific field
      for (const key of this.resultsCache.keys()) {
        if (key.startsWith(`${fieldId}:`)) {
          this.resultsCache.delete(key);
        }
      }
    } else {
      this.resultsCache.clear();
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    const savingsPercent = this.metrics.totalRequests > 0
      ? ((this.metrics.totalRequests - this.metrics.serverCalls) / this.metrics.totalRequests * 100).toFixed(1)
      : 0;

    return {
      ...this.metrics,
      savingsPercent: `${savingsPercent}%`
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      debouncedRequests: 0,
      cancelledRequests: 0,
      cacheHits: 0,
      serverCalls: 0
    };
  }

  /**
   * Cancel pending validation (internal)
   * @private
   * @param {string} fieldId - Field identifier
   */
  _cancelPending(fieldId) {
    // Clear timeout
    const timeoutId = this.timeouts.get(fieldId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(fieldId);
    }

    // Abort pending request
    const request = this.pendingRequests.get(fieldId);
    if (request) {
      request.abortController.abort();
      this.pendingRequests.delete(fieldId);
    }
  }

  /**
   * Generate cache key
   * @private
   * @param {string} fieldId - Field identifier
   * @param {*} value - Value to cache
   * @returns {string} Cache key
   */
  _getCacheKey(fieldId, value) {
    return `${fieldId}:${JSON.stringify(value)}`;
  }
}

/**
 * Create a debounced validator function
 * @param {Function} validator - Async validation function
 * @param {DebounceConfig} config - Debounce configuration
 * @returns {Function} Debounced validator function
 */
export function createDebouncedValidator(validator, config = {}) {
  const debouncer = new ValidationDebouncer(config);
  
  return async function debouncedValidator(fieldId, value) {
    return debouncer.debounce(fieldId, value, validator, config);
  };
}

/**
 * Global validation debouncer instance
 * Shared across all form fields for centralized management
 */
export const globalValidationDebouncer = new ValidationDebouncer({
  delay: 300,
  leading: false,
  trailing: true,
  maxWait: 1000
});