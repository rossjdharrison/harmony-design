/**
 * @fileoverview ResultCollector - Collects and merges results from distributed executions
 * @module bounded-contexts/wasm-edge-executor/result-collector
 * 
 * Handles aggregation of execution results from multiple distributed workers/targets.
 * Supports partial results, streaming updates, and final result merging.
 * 
 * Related Documentation: {@link ../../../../DESIGN_SYSTEM.md#result-collector}
 * Related Files:
 * - {@link ./dispatch-protocol.js} - Message format definitions
 * - {@link ./sandboxed-executor.js} - Individual execution units
 * - {@link ./execution-context.js} - Context management
 */

/**
 * @typedef {Object} PartialResult
 * @property {string} executionId - Unique execution identifier
 * @property {string} targetId - Target that produced this result
 * @property {*} data - Result data (can be any serializable type)
 * @property {number} timestamp - When result was produced
 * @property {boolean} isFinal - Whether this is the final result from this target
 * @property {Object} [metadata] - Optional metadata about execution
 * @property {number} [metadata.executionTime] - Time taken in ms
 * @property {number} [metadata.memoryUsed] - Memory used in bytes
 */

/**
 * @typedef {Object} MergedResult
 * @property {string} executionId - Execution identifier
 * @property {*} data - Merged result data
 * @property {number} startTime - When collection started
 * @property {number} endTime - When collection completed
 * @property {number} totalTargets - Number of targets involved
 * @property {number} completedTargets - Number of targets that completed
 * @property {Object} aggregateMetadata - Aggregated metadata
 * @property {number} aggregateMetadata.totalExecutionTime - Sum of execution times
 * @property {number} aggregateMetadata.totalMemoryUsed - Sum of memory used
 * @property {string[]} targetIds - List of target IDs that contributed
 */

/**
 * @typedef {Object} CollectionStrategy
 * @property {string} type - Strategy type: 'array', 'object', 'reduce', 'stream'
 * @property {Function} [reducer] - Reducer function for 'reduce' strategy
 * @property {Function} [merger] - Custom merge function
 * @property {boolean} [allowPartial] - Whether to emit partial results
 */

/**
 * ResultCollector - Collects and merges results from distributed executions
 * 
 * Handles multiple collection strategies:
 * - Array: Collects results into an array
 * - Object: Merges results into a single object
 * - Reduce: Uses custom reducer function
 * - Stream: Emits partial results as they arrive
 * 
 * @class
 * @example
 * const collector = new ResultCollector({
 *   executionId: 'exec-123',
 *   expectedTargets: 3,
 *   strategy: { type: 'array' },
 *   timeout: 30000
 * });
 * 
 * collector.on('partial', (result) => {
 *   console.log('Partial result:', result);
 * });
 * 
 * collector.on('complete', (merged) => {
 *   console.log('All results collected:', merged);
 * });
 * 
 * collector.collect(partialResult1);
 * collector.collect(partialResult2);
 * collector.collect(partialResult3);
 */
export class ResultCollector {
  /**
   * @param {Object} config - Collector configuration
   * @param {string} config.executionId - Execution identifier
   * @param {number} config.expectedTargets - Number of targets to wait for
   * @param {CollectionStrategy} config.strategy - Collection strategy
   * @param {number} [config.timeout=30000] - Timeout in milliseconds
   * @param {boolean} [config.strictOrder=false] - Whether results must arrive in order
   */
  constructor(config) {
    this.executionId = config.executionId;
    this.expectedTargets = config.expectedTargets;
    this.strategy = config.strategy || { type: 'array' };
    this.timeout = config.timeout || 30000;
    this.strictOrder = config.strictOrder || false;

    /** @type {Map<string, PartialResult[]>} */
    this.results = new Map();
    
    /** @type {Set<string>} */
    this.completedTargets = new Set();
    
    /** @type {Map<string, Function[]>} */
    this.listeners = new Map();
    
    this.startTime = performance.now();
    this.endTime = null;
    this.isComplete = false;
    this.timeoutHandle = null;

    this._setupTimeout();
  }

  /**
   * Set up timeout handler
   * @private
   */
  _setupTimeout() {
    if (this.timeout > 0) {
      this.timeoutHandle = setTimeout(() => {
        if (!this.isComplete) {
          this._handleTimeout();
        }
      }, this.timeout);
    }
  }

  /**
   * Handle collection timeout
   * @private
   */
  _handleTimeout() {
    const error = new Error(
      `ResultCollector timeout: Expected ${this.expectedTargets} targets, ` +
      `got ${this.completedTargets.size} within ${this.timeout}ms`
    );
    error.executionId = this.executionId;
    error.completedTargets = Array.from(this.completedTargets);
    error.expectedTargets = this.expectedTargets;
    
    this._emit('timeout', error);
    this._emit('error', error);
  }

  /**
   * Collect a partial result from a target
   * 
   * @param {PartialResult} partialResult - Result to collect
   * @returns {boolean} Whether collection is now complete
   * @throws {Error} If result is invalid or collection already complete
   */
  collect(partialResult) {
    // Validate result
    if (!partialResult.executionId || partialResult.executionId !== this.executionId) {
      throw new Error(
        `Invalid executionId: expected ${this.executionId}, ` +
        `got ${partialResult.executionId}`
      );
    }

    if (this.isComplete) {
      throw new Error(`Collection already complete for ${this.executionId}`);
    }

    const { targetId, isFinal } = partialResult;

    // Store result
    if (!this.results.has(targetId)) {
      this.results.set(targetId, []);
    }
    this.results.get(targetId).push(partialResult);

    // Emit partial result if strategy allows
    if (this.strategy.allowPartial) {
      this._emit('partial', {
        targetId,
        data: partialResult.data,
        timestamp: partialResult.timestamp,
        isFinal
      });
    }

    // Mark target as complete if this is final result
    if (isFinal) {
      this.completedTargets.add(targetId);
    }

    // Check if collection is complete
    if (this.completedTargets.size === this.expectedTargets) {
      this._finalize();
      return true;
    }

    return false;
  }

  /**
   * Finalize collection and merge results
   * @private
   */
  _finalize() {
    if (this.isComplete) return;

    this.isComplete = true;
    this.endTime = performance.now();

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    const merged = this._mergeResults();
    this._emit('complete', merged);
  }

  /**
   * Merge all collected results based on strategy
   * @private
   * @returns {MergedResult}
   */
  _mergeResults() {
    const targetIds = Array.from(this.completedTargets);
    let mergedData;
    let totalExecutionTime = 0;
    let totalMemoryUsed = 0;

    // Collect all final results
    const finalResults = [];
    for (const targetId of targetIds) {
      const targetResults = this.results.get(targetId);
      const finalResult = targetResults[targetResults.length - 1];
      finalResults.push(finalResult);

      // Aggregate metadata
      if (finalResult.metadata) {
        totalExecutionTime += finalResult.metadata.executionTime || 0;
        totalMemoryUsed += finalResult.metadata.memoryUsed || 0;
      }
    }

    // Merge based on strategy
    switch (this.strategy.type) {
      case 'array':
        mergedData = finalResults.map(r => r.data);
        break;

      case 'object':
        mergedData = {};
        for (const result of finalResults) {
          if (this.strategy.merger) {
            mergedData = this.strategy.merger(mergedData, result.data, result.targetId);
          } else {
            Object.assign(mergedData, result.data);
          }
        }
        break;

      case 'reduce':
        if (!this.strategy.reducer) {
          throw new Error('Reduce strategy requires a reducer function');
        }
        mergedData = finalResults.reduce(
          (acc, result) => this.strategy.reducer(acc, result.data, result.targetId),
          undefined
        );
        break;

      case 'stream':
        // For stream strategy, data was already emitted as partials
        mergedData = finalResults.map(r => r.data);
        break;

      default:
        throw new Error(`Unknown strategy type: ${this.strategy.type}`);
    }

    return {
      executionId: this.executionId,
      data: mergedData,
      startTime: this.startTime,
      endTime: this.endTime,
      totalTargets: this.expectedTargets,
      completedTargets: this.completedTargets.size,
      aggregateMetadata: {
        totalExecutionTime,
        totalMemoryUsed,
        averageExecutionTime: totalExecutionTime / this.completedTargets.size,
        averageMemoryUsed: totalMemoryUsed / this.completedTargets.size
      },
      targetIds
    };
  }

  /**
   * Register event listener
   * 
   * @param {string} event - Event name: 'partial', 'complete', 'timeout', 'error'
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit event to listeners
   * @private
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  _emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ResultCollector ${event} listener:`, error);
        }
      }
    }
  }

  /**
   * Get current collection status
   * 
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      executionId: this.executionId,
      isComplete: this.isComplete,
      expectedTargets: this.expectedTargets,
      completedTargets: this.completedTargets.size,
      completedTargetIds: Array.from(this.completedTargets),
      elapsedTime: this.endTime 
        ? this.endTime - this.startTime 
        : performance.now() - this.startTime,
      hasTimedOut: this.timeoutHandle === null && !this.isComplete
    };
  }

  /**
   * Cancel collection and clean up
   */
  cancel() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    this.isComplete = true;
    this.listeners.clear();
    this.results.clear();
    this.completedTargets.clear();

    this._emit('cancelled', { executionId: this.executionId });
  }

  /**
   * Get all results for a specific target
   * 
   * @param {string} targetId - Target identifier
   * @returns {PartialResult[]} All results from target
   */
  getTargetResults(targetId) {
    return this.results.get(targetId) || [];
  }

  /**
   * Check if a target has completed
   * 
   * @param {string} targetId - Target identifier
   * @returns {boolean} Whether target has sent final result
   */
  isTargetComplete(targetId) {
    return this.completedTargets.has(targetId);
  }
}

/**
 * ResultCollectorPool - Manages multiple ResultCollectors
 * 
 * Useful for managing many concurrent distributed executions.
 * Automatically cleans up completed collectors.
 * 
 * @class
 */
export class ResultCollectorPool {
  constructor() {
    /** @type {Map<string, ResultCollector>} */
    this.collectors = new Map();
    
    /** @type {Map<string, MergedResult>} */
    this.completedResults = new Map();
    
    this.maxRetainedResults = 100;
  }

  /**
   * Create a new collector
   * 
   * @param {Object} config - Collector configuration
   * @returns {ResultCollector} New collector instance
   */
  createCollector(config) {
    if (this.collectors.has(config.executionId)) {
      throw new Error(`Collector already exists for ${config.executionId}`);
    }

    const collector = new ResultCollector(config);
    this.collectors.set(config.executionId, collector);

    // Auto-cleanup on completion
    collector.on('complete', (merged) => {
      this._handleCollectorComplete(config.executionId, merged);
    });

    collector.on('error', () => {
      this._handleCollectorError(config.executionId);
    });

    return collector;
  }

  /**
   * Handle collector completion
   * @private
   */
  _handleCollectorComplete(executionId, merged) {
    this.completedResults.set(executionId, merged);
    this.collectors.delete(executionId);

    // Limit retained results
    if (this.completedResults.size > this.maxRetainedResults) {
      const oldestKey = this.completedResults.keys().next().value;
      this.completedResults.delete(oldestKey);
    }
  }

  /**
   * Handle collector error
   * @private
   */
  _handleCollectorError(executionId) {
    this.collectors.delete(executionId);
  }

  /**
   * Get collector by execution ID
   * 
   * @param {string} executionId - Execution identifier
   * @returns {ResultCollector|null} Collector or null if not found
   */
  getCollector(executionId) {
    return this.collectors.get(executionId) || null;
  }

  /**
   * Get completed result by execution ID
   * 
   * @param {string} executionId - Execution identifier
   * @returns {MergedResult|null} Merged result or null if not found
   */
  getCompletedResult(executionId) {
    return this.completedResults.get(executionId) || null;
  }

  /**
   * Collect a partial result (routes to appropriate collector)
   * 
   * @param {PartialResult} partialResult - Result to collect
   * @returns {boolean} Whether collection is complete
   * @throws {Error} If no collector found for execution ID
   */
  collect(partialResult) {
    const collector = this.collectors.get(partialResult.executionId);
    if (!collector) {
      throw new Error(`No collector found for ${partialResult.executionId}`);
    }
    return collector.collect(partialResult);
  }

  /**
   * Cancel all active collectors
   */
  cancelAll() {
    for (const collector of this.collectors.values()) {
      collector.cancel();
    }
    this.collectors.clear();
  }

  /**
   * Get pool statistics
   * 
   * @returns {Object} Pool statistics
   */
  getStats() {
    return {
      activeCollectors: this.collectors.size,
      completedResults: this.completedResults.size,
      activeExecutionIds: Array.from(this.collectors.keys()),
      completedExecutionIds: Array.from(this.completedResults.keys())
    };
  }
}