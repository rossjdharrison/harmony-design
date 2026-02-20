/**
 * @fileoverview Execution Timeout: Terminate runaway code execution
 * 
 * Provides mechanisms to prevent infinite loops and runaway executions in:
 * - WASM module execution
 * - User-provided scripts
 * - Dynamic code evaluation
 * - EventBus command handlers
 * 
 * Related: security/sandbox-policy.js, security/capability-checker.js
 * Documentation: DESIGN_SYSTEM.md#execution-timeout
 * 
 * @module security/execution-timeout
 */

/**
 * Default timeout configurations for different execution contexts
 */
const DEFAULT_TIMEOUTS = {
  WASM_MODULE: 5000,        // 5 seconds for WASM execution
  EVENT_HANDLER: 1000,      // 1 second for event handlers
  USER_SCRIPT: 3000,        // 3 seconds for user scripts
  RENDER_FUNCTION: 16,      // 16ms for render functions (60fps budget)
  AUDIO_PROCESS: 10,        // 10ms for audio processing
  ANIMATION_FRAME: 16,      // 16ms for animation frames
  NETWORK_REQUEST: 30000,   // 30 seconds for network requests
  FILE_OPERATION: 10000     // 10 seconds for file operations
};

/**
 * Execution context types
 * @enum {string}
 */
const ExecutionContext = {
  WASM_MODULE: 'wasm_module',
  EVENT_HANDLER: 'event_handler',
  USER_SCRIPT: 'user_script',
  RENDER_FUNCTION: 'render_function',
  AUDIO_PROCESS: 'audio_process',
  ANIMATION_FRAME: 'animation_frame',
  NETWORK_REQUEST: 'network_request',
  FILE_OPERATION: 'file_operation'
};

/**
 * Timeout error thrown when execution exceeds time limit
 */
class ExecutionTimeoutError extends Error {
  /**
   * @param {string} context - Execution context that timed out
   * @param {number} timeout - Timeout value in milliseconds
   * @param {Object} metadata - Additional context information
   */
  constructor(context, timeout, metadata = {}) {
    super(`Execution timeout: ${context} exceeded ${timeout}ms limit`);
    this.name = 'ExecutionTimeoutError';
    this.context = context;
    this.timeout = timeout;
    this.metadata = metadata;
    this.timestamp = Date.now();
  }
}

/**
 * Execution timeout manager
 * Tracks and enforces execution time limits across the system
 */
class ExecutionTimeoutManager {
  constructor() {
    /** @type {Map<string, {timer: number, startTime: number, context: string}>} */
    this.activeExecutions = new Map();
    
    /** @type {Array<{context: string, duration: number, timestamp: number}>} */
    this.timeoutHistory = [];
    
    /** @type {number} */
    this.maxHistorySize = 100;
    
    /** @type {Map<string, number>} */
    this.customTimeouts = new Map();
    
    /** @type {Set<Function>} */
    this.timeoutListeners = new Set();
  }

  /**
   * Set custom timeout for a specific execution context
   * @param {string} context - Execution context
   * @param {number} timeout - Timeout in milliseconds
   */
  setCustomTimeout(context, timeout) {
    if (timeout <= 0) {
      throw new Error('Timeout must be positive');
    }
    this.customTimeouts.set(context, timeout);
  }

  /**
   * Get timeout for a specific context
   * @param {string} context - Execution context
   * @returns {number} Timeout in milliseconds
   */
  getTimeout(context) {
    return this.customTimeouts.get(context) || DEFAULT_TIMEOUTS[context.toUpperCase()] || DEFAULT_TIMEOUTS.USER_SCRIPT;
  }

  /**
   * Register a timeout event listener
   * @param {Function} listener - Callback for timeout events
   */
  onTimeout(listener) {
    this.timeoutListeners.add(listener);
  }

  /**
   * Unregister a timeout event listener
   * @param {Function} listener - Callback to remove
   */
  offTimeout(listener) {
    this.timeoutListeners.delete(listener);
  }

  /**
   * Notify listeners of timeout event
   * @param {ExecutionTimeoutError} error - Timeout error
   * @private
   */
  _notifyTimeout(error) {
    this.timeoutListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in timeout listener:', err);
      }
    });
  }

  /**
   * Start tracking execution with timeout
   * @param {string} executionId - Unique identifier for this execution
   * @param {string} context - Execution context type
   * @param {Object} metadata - Additional context information
   * @returns {string} Execution ID
   */
  startExecution(executionId, context, metadata = {}) {
    const timeout = this.getTimeout(context);
    const startTime = performance.now();

    const timer = setTimeout(() => {
      this.terminateExecution(executionId, 'timeout');
    }, timeout);

    this.activeExecutions.set(executionId, {
      timer,
      startTime,
      context,
      timeout,
      metadata
    });

    return executionId;
  }

  /**
   * End execution tracking (successful completion)
   * @param {string} executionId - Execution identifier
   * @returns {number} Execution duration in milliseconds
   */
  endExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return 0;
    }

    clearTimeout(execution.timer);
    const duration = performance.now() - execution.startTime;
    this.activeExecutions.delete(executionId);

    return duration;
  }

  /**
   * Terminate execution (timeout or forced)
   * @param {string} executionId - Execution identifier
   * @param {string} reason - Termination reason
   */
  terminateExecution(executionId, reason = 'forced') {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return;
    }

    clearTimeout(execution.timer);
    const duration = performance.now() - execution.startTime;
    this.activeExecutions.delete(executionId);

    // Record in history
    this.timeoutHistory.push({
      context: execution.context,
      duration,
      timeout: execution.timeout,
      reason,
      timestamp: Date.now(),
      metadata: execution.metadata
    });

    // Trim history
    if (this.timeoutHistory.length > this.maxHistorySize) {
      this.timeoutHistory.shift();
    }

    // Create and notify error
    const error = new ExecutionTimeoutError(
      execution.context,
      execution.timeout,
      { ...execution.metadata, reason, duration }
    );

    this._notifyTimeout(error);

    console.error('Execution terminated:', {
      executionId,
      context: execution.context,
      duration,
      timeout: execution.timeout,
      reason
    });
  }

  /**
   * Check if execution is still active
   * @param {string} executionId - Execution identifier
   * @returns {boolean}
   */
  isActive(executionId) {
    return this.activeExecutions.has(executionId);
  }

  /**
   * Get execution statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const timeouts = this.timeoutHistory.filter(h => h.reason === 'timeout');
    const byContext = {};
    
    this.timeoutHistory.forEach(h => {
      if (!byContext[h.context]) {
        byContext[h.context] = { count: 0, totalDuration: 0 };
      }
      byContext[h.context].count++;
      byContext[h.context].totalDuration += h.duration;
    });

    return {
      activeExecutions: this.activeExecutions.size,
      totalTimeouts: timeouts.length,
      historySize: this.timeoutHistory.length,
      byContext,
      recentTimeouts: this.timeoutHistory.slice(-10)
    };
  }

  /**
   * Clear all active executions (emergency stop)
   */
  clearAll() {
    this.activeExecutions.forEach((execution, id) => {
      this.terminateExecution(id, 'emergency_stop');
    });
  }
}

/**
 * Global timeout manager instance
 */
const timeoutManager = new ExecutionTimeoutManager();

/**
 * Wrap a function with execution timeout
 * @param {Function} fn - Function to wrap
 * @param {string} context - Execution context
 * @param {Object} options - Options
 * @returns {Function} Wrapped function
 */
function withTimeout(fn, context, options = {}) {
  return async function(...args) {
    const executionId = options.executionId || `${context}_${Date.now()}_${Math.random()}`;
    const metadata = options.metadata || {};

    timeoutManager.startExecution(executionId, context, metadata);

    try {
      const result = await fn.apply(this, args);
      timeoutManager.endExecution(executionId);
      return result;
    } catch (error) {
      timeoutManager.endExecution(executionId);
      throw error;
    }
  };
}

/**
 * Create a timeout-aware promise
 * @param {Promise} promise - Promise to wrap
 * @param {string} context - Execution context
 * @param {Object} metadata - Additional context
 * @returns {Promise} Wrapped promise that rejects on timeout
 */
function withTimeoutPromise(promise, context, metadata = {}) {
  const executionId = `${context}_${Date.now()}_${Math.random()}`;
  const timeout = timeoutManager.getTimeout(context);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new ExecutionTimeoutError(context, timeout, metadata);
      timeoutManager._notifyTimeout(error);
      reject(error);
    }, timeout);

    timeoutManager.startExecution(executionId, context, metadata);

    promise
      .then(result => {
        clearTimeout(timer);
        timeoutManager.endExecution(executionId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        timeoutManager.endExecution(executionId);
        reject(error);
      });
  });
}

/**
 * WASM execution wrapper with timeout
 * @param {WebAssembly.Instance} instance - WASM instance
 * @param {string} functionName - Function to call
 * @param {Array} args - Function arguments
 * @param {Object} options - Options
 * @returns {Promise<any>} Function result
 */
async function executeWasmWithTimeout(instance, functionName, args = [], options = {}) {
  const context = ExecutionContext.WASM_MODULE;
  const executionId = options.executionId || `wasm_${functionName}_${Date.now()}`;
  const metadata = { functionName, ...options.metadata };

  timeoutManager.startExecution(executionId, context, metadata);

  try {
    // Execute WASM function
    const fn = instance.exports[functionName];
    if (!fn) {
      throw new Error(`WASM function not found: ${functionName}`);
    }

    const result = await fn(...args);
    const duration = timeoutManager.endExecution(executionId);

    // Log slow executions
    if (duration > timeoutManager.getTimeout(context) * 0.8) {
      console.warn(`Slow WASM execution: ${functionName} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    timeoutManager.endExecution(executionId);
    throw error;
  }
}

/**
 * Event handler wrapper with timeout
 * @param {Function} handler - Event handler function
 * @param {string} eventType - Event type
 * @returns {Function} Wrapped handler
 */
function wrapEventHandler(handler, eventType) {
  return withTimeout(handler, ExecutionContext.EVENT_HANDLER, {
    metadata: { eventType }
  });
}

/**
 * Animation frame wrapper with timeout
 * @param {Function} callback - Animation callback
 * @returns {Function} Wrapped callback
 */
function wrapAnimationFrame(callback) {
  return withTimeout(callback, ExecutionContext.ANIMATION_FRAME, {
    metadata: { type: 'requestAnimationFrame' }
  });
}

/**
 * Audio process wrapper with timeout
 * @param {Function} processor - Audio processor function
 * @returns {Function} Wrapped processor
 */
function wrapAudioProcessor(processor) {
  return withTimeout(processor, ExecutionContext.AUDIO_PROCESS, {
    metadata: { type: 'audioWorklet' }
  });
}

// Export public API
export {
  ExecutionTimeoutManager,
  ExecutionTimeoutError,
  ExecutionContext,
  DEFAULT_TIMEOUTS,
  timeoutManager,
  withTimeout,
  withTimeoutPromise,
  executeWasmWithTimeout,
  wrapEventHandler,
  wrapAnimationFrame,
  wrapAudioProcessor
};