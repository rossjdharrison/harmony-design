/**
 * @fileoverview BatchExecutor - Batches multiple small executions into single dispatch
 * 
 * Part of the Harmony Design System execution engine. Reduces overhead by collecting
 * multiple small execution requests and dispatching them as a single batch operation.
 * 
 * Vision Alignment: WASM Performance - Reduces cross-boundary call overhead
 * 
 * Performance Targets:
 * - Batch dispatch within 16ms window
 * - Maximum 100 operations per batch
 * - Sub-millisecond batching overhead
 * 
 * @module core/execution/batch-executor
 * @see {@link file://./DESIGN_SYSTEM.md#batch-executor}
 */

/**
 * @typedef {Object} ExecutionRequest
 * @property {string} id - Unique execution identifier
 * @property {string} type - Execution type (e.g., 'node', 'transform', 'audio')
 * @property {Object} payload - Execution payload
 * @property {number} priority - Execution priority (0-10)
 * @property {number} timestamp - Request timestamp
 * @property {Function} resolve - Promise resolve callback
 * @property {Function} reject - Promise reject callback
 */

/**
 * @typedef {Object} BatchResult
 * @property {string} id - Execution ID
 * @property {boolean} success - Whether execution succeeded
 * @property {*} result - Execution result or error
 * @property {number} duration - Execution duration in ms
 */

/**
 * @typedef {Object} BatchExecutorConfig
 * @property {number} [maxBatchSize=100] - Maximum operations per batch
 * @property {number} [batchWindowMs=16] - Time window to collect operations (ms)
 * @property {number} [minBatchSize=1] - Minimum operations to trigger batch
 * @property {boolean} [autoFlush=true] - Auto-flush on animation frame
 * @property {Function} [executor] - Custom batch executor function
 */

/**
 * BatchExecutor - Batches multiple small executions into single dispatch
 * 
 * Collects execution requests over a time window and dispatches them as a single
 * batch operation. Reduces overhead from multiple small calls, especially beneficial
 * for WASM boundary crossings.
 * 
 * Usage:
 * ```javascript
 * const batchExecutor = new BatchExecutor({
 *   maxBatchSize: 100,
 *   batchWindowMs: 16,
 *   executor: async (batch) => {
 *     // Process batch
 *     return results;
 *   }
 * });
 * 
 * // Queue executions
 * const result1 = await batchExecutor.execute('node-1', 'transform', { x: 10 });
 * const result2 = await batchExecutor.execute('node-2', 'transform', { x: 20 });
 * ```
 * 
 * @class
 */
export class BatchExecutor {
  /**
   * Creates a new BatchExecutor instance
   * @param {BatchExecutorConfig} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize ?? 100,
      batchWindowMs: config.batchWindowMs ?? 16,
      minBatchSize: config.minBatchSize ?? 1,
      autoFlush: config.autoFlush ?? true,
      executor: config.executor ?? this._defaultExecutor.bind(this),
    };

    /** @type {ExecutionRequest[]} */
    this.pendingRequests = [];

    /** @type {number|null} */
    this.batchTimer = null;

    /** @type {number|null} */
    this.rafHandle = null;

    /** @type {boolean} */
    this.isProcessing = false;

    /** @type {Object<string, number>} */
    this.stats = {
      totalBatches: 0,
      totalExecutions: 0,
      averageBatchSize: 0,
      lastBatchDuration: 0,
      maxBatchDuration: 0,
    };

    // Auto-flush on animation frame if enabled
    if (this.config.autoFlush) {
      this._scheduleAutoFlush();
    }
  }

  /**
   * Executes an operation, batching with other pending operations
   * @param {string} id - Execution identifier
   * @param {string} type - Execution type
   * @param {Object} payload - Execution payload
   * @param {number} [priority=5] - Execution priority (0-10)
   * @returns {Promise<*>} Execution result
   */
  execute(id, type, payload, priority = 5) {
    return new Promise((resolve, reject) => {
      const request = {
        id,
        type,
        payload,
        priority,
        timestamp: performance.now(),
        resolve,
        reject,
      };

      this.pendingRequests.push(request);

      // Schedule batch processing
      this._scheduleBatch();

      // Flush immediately if batch is full
      if (this.pendingRequests.length >= this.config.maxBatchSize) {
        this._flushBatch();
      }
    });
  }

  /**
   * Executes multiple operations as a batch
   * @param {Array<{id: string, type: string, payload: Object, priority?: number}>} operations
   * @returns {Promise<Array<*>>} Array of execution results
   */
  async executeBatch(operations) {
    const promises = operations.map(op =>
      this.execute(op.id, op.type, op.payload, op.priority)
    );
    return Promise.all(promises);
  }

  /**
   * Flushes pending requests immediately
   * @returns {Promise<void>}
   */
  async flush() {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    await this._flushBatch();
  }

  /**
   * Schedules batch processing
   * @private
   */
  _scheduleBatch() {
    if (this.batchTimer !== null) {
      return; // Already scheduled
    }

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this._flushBatch();
    }, this.config.batchWindowMs);
  }

  /**
   * Schedules auto-flush on animation frame
   * @private
   */
  _scheduleAutoFlush() {
    const autoFlush = () => {
      if (this.pendingRequests.length > 0 && !this.isProcessing) {
        this._flushBatch();
      }
      this.rafHandle = requestAnimationFrame(autoFlush);
    };

    this.rafHandle = requestAnimationFrame(autoFlush);
  }

  /**
   * Flushes pending batch
   * @private
   * @returns {Promise<void>}
   */
  async _flushBatch() {
    if (this.isProcessing || this.pendingRequests.length < this.config.minBatchSize) {
      return;
    }

    this.isProcessing = true;

    // Extract batch (up to maxBatchSize)
    const batch = this.pendingRequests.splice(0, this.config.maxBatchSize);

    if (batch.length === 0) {
      this.isProcessing = false;
      return;
    }

    const startTime = performance.now();

    try {
      // Execute batch
      const results = await this.config.executor(batch);

      // Resolve individual promises
      batch.forEach((request, index) => {
        const result = results[index];
        if (result && result.success) {
          request.resolve(result.result);
        } else {
          request.reject(new Error(result?.error || 'Execution failed'));
        }
      });

      // Update statistics
      const duration = performance.now() - startTime;
      this._updateStats(batch.length, duration);

    } catch (error) {
      // Reject all requests in batch
      batch.forEach(request => {
        request.reject(error);
      });

      console.error('[BatchExecutor] Batch execution failed:', error);
    } finally {
      this.isProcessing = false;

      // Process remaining requests if any
      if (this.pendingRequests.length > 0) {
        this._scheduleBatch();
      }
    }
  }

  /**
   * Default executor implementation
   * @private
   * @param {ExecutionRequest[]} batch - Batch of requests
   * @returns {Promise<BatchResult[]>} Batch results
   */
  async _defaultExecutor(batch) {
    // Default implementation: execute each request individually
    // Override with custom executor for optimized batch processing
    return Promise.all(
      batch.map(async (request) => {
        try {
          const result = await this._executeRequest(request);
          return {
            id: request.id,
            success: true,
            result,
            duration: performance.now() - request.timestamp,
          };
        } catch (error) {
          return {
            id: request.id,
            success: false,
            error: error.message,
            duration: performance.now() - request.timestamp,
          };
        }
      })
    );
  }

  /**
   * Executes a single request (default implementation)
   * @private
   * @param {ExecutionRequest} request - Request to execute
   * @returns {Promise<*>} Execution result
   */
  async _executeRequest(request) {
    // Default implementation: return payload
    // Override with actual execution logic
    return request.payload;
  }

  /**
   * Updates execution statistics
   * @private
   * @param {number} batchSize - Size of executed batch
   * @param {number} duration - Batch execution duration
   */
  _updateStats(batchSize, duration) {
    this.stats.totalBatches++;
    this.stats.totalExecutions += batchSize;
    this.stats.averageBatchSize =
      this.stats.totalExecutions / this.stats.totalBatches;
    this.stats.lastBatchDuration = duration;
    this.stats.maxBatchDuration = Math.max(
      this.stats.maxBatchDuration,
      duration
    );
  }

  /**
   * Gets current execution statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      pendingRequests: this.pendingRequests.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Resets execution statistics
   */
  resetStats() {
    this.stats = {
      totalBatches: 0,
      totalExecutions: 0,
      averageBatchSize: 0,
      lastBatchDuration: 0,
      maxBatchDuration: 0,
    };
  }

  /**
   * Clears all pending requests
   * @param {Error} [error] - Optional error to reject pending requests with
   */
  clear(error = new Error('Batch executor cleared')) {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(request => {
      request.reject(error);
    });

    this.pendingRequests = [];
  }

  /**
   * Destroys the batch executor
   */
  destroy() {
    this.clear();

    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }
}

/**
 * Creates a specialized batch executor for WASM operations
 * @param {Object} wasmModule - WASM module instance
 * @param {string} functionName - WASM function name to call
 * @param {BatchExecutorConfig} config - Configuration options
 * @returns {BatchExecutor} Configured batch executor
 */
export function createWasmBatchExecutor(wasmModule, functionName, config = {}) {
  return new BatchExecutor({
    ...config,
    executor: async (batch) => {
      // Prepare batch data for WASM
      const batchData = batch.map(req => ({
        id: req.id,
        type: req.type,
        payload: req.payload,
      }));

      try {
        // Call WASM function with entire batch
        const results = wasmModule[functionName](batchData);

        // Map results back to batch format
        return results.map((result, index) => ({
          id: batch[index].id,
          success: true,
          result,
          duration: performance.now() - batch[index].timestamp,
        }));
      } catch (error) {
        console.error(`[WasmBatchExecutor] Error calling ${functionName}:`, error);
        
        // Return error for all items in batch
        return batch.map(req => ({
          id: req.id,
          success: false,
          error: error.message,
          duration: performance.now() - req.timestamp,
        }));
      }
    },
  });
}

/**
 * Creates a specialized batch executor for EventBus commands
 * @param {Object} eventBus - EventBus instance
 * @param {BatchExecutorConfig} config - Configuration options
 * @returns {BatchExecutor} Configured batch executor
 */
export function createEventBusBatchExecutor(eventBus, config = {}) {
  return new BatchExecutor({
    ...config,
    executor: async (batch) => {
      // Group by event type for efficient processing
      const groupedByType = batch.reduce((acc, req) => {
        if (!acc[req.type]) {
          acc[req.type] = [];
        }
        acc[req.type].push(req);
        return acc;
      }, {});

      const results = [];

      // Process each group
      for (const [type, requests] of Object.entries(groupedByType)) {
        try {
          // Publish batch event
          const batchPayload = requests.map(req => req.payload);
          await eventBus.publish(`${type}.batch`, batchPayload);

          // Mark all as successful
          requests.forEach(req => {
            results.push({
              id: req.id,
              success: true,
              result: { batched: true },
              duration: performance.now() - req.timestamp,
            });
          });
        } catch (error) {
          // Mark all as failed
          requests.forEach(req => {
            results.push({
              id: req.id,
              success: false,
              error: error.message,
              duration: performance.now() - req.timestamp,
            });
          });
        }
      }

      return results;
    },
  });
}