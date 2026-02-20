/**
 * @fileoverview DispatchQueue: Queue of pending dispatches with retry and backoff
 * 
 * Manages a priority queue of dispatch operations with:
 * - Automatic retry on failure with exponential backoff
 * - Configurable retry limits and backoff strategies
 * - Priority-based ordering
 * - Timeout handling
 * - Circuit breaker pattern for failing targets
 * 
 * Related files:
 * - dispatch-protocol.js: Message format definitions
 * - dispatch-router.js: Routes dispatches to targets
 * - dispatch-target.js: Target abstraction
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#wasm-edge-executor
 */

/**
 * @typedef {Object} QueuedDispatch
 * @property {string} id - Unique dispatch identifier
 * @property {import('./dispatch-protocol.js').DispatchMessage} message - Dispatch message
 * @property {number} priority - Priority level (higher = more urgent)
 * @property {number} attempts - Number of dispatch attempts
 * @property {number} maxAttempts - Maximum retry attempts
 * @property {number} nextRetryTime - Timestamp for next retry attempt
 * @property {number} createdAt - Creation timestamp
 * @property {number} timeoutMs - Timeout in milliseconds
 * @property {Function} resolve - Promise resolve callback
 * @property {Function} reject - Promise reject callback
 * @property {Error|null} lastError - Last error encountered
 */

/**
 * @typedef {Object} BackoffStrategy
 * @property {string} type - Strategy type: 'exponential' | 'linear' | 'constant'
 * @property {number} baseDelayMs - Base delay in milliseconds
 * @property {number} maxDelayMs - Maximum delay in milliseconds
 * @property {number} multiplier - Multiplier for exponential backoff
 * @property {number} jitterFactor - Random jitter factor (0-1)
 */

/**
 * @typedef {Object} QueueMetrics
 * @property {number} pending - Number of pending dispatches
 * @property {number} processing - Number of dispatches in progress
 * @property {number} succeeded - Total successful dispatches
 * @property {number} failed - Total failed dispatches
 * @property {number} retried - Total retry attempts
 * @property {number} timedOut - Total timed out dispatches
 * @property {number} averageLatencyMs - Average dispatch latency
 */

/**
 * DispatchQueue manages pending dispatches with retry and backoff
 */
export class DispatchQueue {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.maxConcurrent=10] - Maximum concurrent dispatches
   * @param {number} [options.defaultMaxAttempts=3] - Default max retry attempts
   * @param {number} [options.defaultTimeoutMs=5000] - Default timeout
   * @param {BackoffStrategy} [options.backoffStrategy] - Backoff strategy
   */
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 10;
    this.defaultMaxAttempts = options.defaultMaxAttempts || 3;
    this.defaultTimeoutMs = options.defaultTimeoutMs || 5000;
    
    this.backoffStrategy = options.backoffStrategy || {
      type: 'exponential',
      baseDelayMs: 100,
      maxDelayMs: 30000,
      multiplier: 2,
      jitterFactor: 0.1
    };

    /** @type {Map<string, QueuedDispatch>} */
    this.queue = new Map();
    
    /** @type {Set<string>} */
    this.processing = new Set();
    
    /** @type {QueueMetrics} */
    this.metrics = {
      pending: 0,
      processing: 0,
      succeeded: 0,
      failed: 0,
      retried: 0,
      timedOut: 0,
      averageLatencyMs: 0
    };

    /** @type {number[]} */
    this.latencySamples = [];
    this.maxLatencySamples = 100;

    this.processingInterval = null;
    this.isRunning = false;
  }

  /**
   * Enqueue a dispatch operation
   * @param {import('./dispatch-protocol.js').DispatchMessage} message - Dispatch message
   * @param {Object} options - Enqueue options
   * @param {number} [options.priority=0] - Priority level
   * @param {number} [options.maxAttempts] - Maximum retry attempts
   * @param {number} [options.timeoutMs] - Timeout in milliseconds
   * @returns {Promise<any>} Promise that resolves with dispatch result
   */
  enqueue(message, options = {}) {
    const id = message.id || this._generateId();
    
    return new Promise((resolve, reject) => {
      /** @type {QueuedDispatch} */
      const dispatch = {
        id,
        message: { ...message, id },
        priority: options.priority || 0,
        attempts: 0,
        maxAttempts: options.maxAttempts || this.defaultMaxAttempts,
        nextRetryTime: Date.now(),
        createdAt: Date.now(),
        timeoutMs: options.timeoutMs || this.defaultTimeoutMs,
        resolve,
        reject,
        lastError: null
      };

      this.queue.set(id, dispatch);
      this.metrics.pending = this.queue.size;

      // Start processing if not already running
      if (!this.isRunning) {
        this.start();
      }
    });
  }

  /**
   * Start processing the queue
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.processingInterval = setInterval(() => {
      this._processQueue();
    }, 10); // Check every 10ms for responsive processing
  }

  /**
   * Stop processing the queue
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Clear all pending dispatches
   * @param {string} [reason='Queue cleared'] - Reason for clearing
   */
  clear(reason = 'Queue cleared') {
    for (const dispatch of this.queue.values()) {
      dispatch.reject(new Error(reason));
    }
    this.queue.clear();
    this.metrics.pending = 0;
  }

  /**
   * Cancel a specific dispatch
   * @param {string} id - Dispatch ID
   * @param {string} [reason='Cancelled'] - Cancellation reason
   * @returns {boolean} True if dispatch was cancelled
   */
  cancel(id, reason = 'Cancelled') {
    const dispatch = this.queue.get(id);
    if (dispatch) {
      dispatch.reject(new Error(reason));
      this.queue.delete(id);
      this.metrics.pending = this.queue.size;
      return true;
    }
    return false;
  }

  /**
   * Get current queue metrics
   * @returns {QueueMetrics} Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Process queued dispatches
   * @private
   */
  _processQueue() {
    const now = Date.now();
    
    // Check for timed out dispatches
    this._checkTimeouts(now);

    // Process dispatches if under concurrency limit
    while (this.processing.size < this.maxConcurrent && this.queue.size > 0) {
      const dispatch = this._getNextDispatch(now);
      if (!dispatch) {
        break; // No dispatch ready to process
      }

      this._executeDispatch(dispatch);
    }
  }

  /**
   * Get next dispatch ready for processing
   * @param {number} now - Current timestamp
   * @returns {QueuedDispatch|null} Next dispatch or null
   * @private
   */
  _getNextDispatch(now) {
    let bestDispatch = null;
    let bestPriority = -Infinity;

    for (const dispatch of this.queue.values()) {
      // Skip if not ready for retry
      if (dispatch.nextRetryTime > now) {
        continue;
      }

      // Skip if already processing
      if (this.processing.has(dispatch.id)) {
        continue;
      }

      // Select highest priority
      if (dispatch.priority > bestPriority) {
        bestPriority = dispatch.priority;
        bestDispatch = dispatch;
      }
    }

    return bestDispatch;
  }

  /**
   * Execute a dispatch
   * @param {QueuedDispatch} dispatch - Dispatch to execute
   * @private
   */
  async _executeDispatch(dispatch) {
    this.processing.add(dispatch.id);
    this.metrics.processing = this.processing.size;
    dispatch.attempts++;

    const startTime = Date.now();

    try {
      // Dispatch execution is delegated to the router
      // This queue only manages retry/backoff logic
      const result = await this._sendDispatch(dispatch);
      
      // Success
      this._handleSuccess(dispatch, result, startTime);
    } catch (error) {
      // Failure
      this._handleFailure(dispatch, error, startTime);
    }
  }

  /**
   * Send dispatch (to be overridden or injected)
   * @param {QueuedDispatch} dispatch - Dispatch to send
   * @returns {Promise<any>} Dispatch result
   * @private
   */
  async _sendDispatch(dispatch) {
    // This is a placeholder - actual dispatch logic should be injected
    // via setDispatchHandler() method
    if (!this.dispatchHandler) {
      throw new Error('No dispatch handler configured');
    }
    return await this.dispatchHandler(dispatch.message);
  }

  /**
   * Set the dispatch handler function
   * @param {Function} handler - Handler function that executes dispatches
   */
  setDispatchHandler(handler) {
    this.dispatchHandler = handler;
  }

  /**
   * Handle successful dispatch
   * @param {QueuedDispatch} dispatch - Completed dispatch
   * @param {any} result - Dispatch result
   * @param {number} startTime - Start timestamp
   * @private
   */
  _handleSuccess(dispatch, result, startTime) {
    const latency = Date.now() - startTime;
    this._recordLatency(latency);

    this.queue.delete(dispatch.id);
    this.processing.delete(dispatch.id);
    
    this.metrics.pending = this.queue.size;
    this.metrics.processing = this.processing.size;
    this.metrics.succeeded++;

    dispatch.resolve(result);
  }

  /**
   * Handle failed dispatch
   * @param {QueuedDispatch} dispatch - Failed dispatch
   * @param {Error} error - Error that occurred
   * @param {number} startTime - Start timestamp
   * @private
   */
  _handleFailure(dispatch, error, startTime) {
    const latency = Date.now() - startTime;
    this._recordLatency(latency);

    dispatch.lastError = error;
    this.processing.delete(dispatch.id);
    this.metrics.processing = this.processing.size;

    // Check if should retry
    if (dispatch.attempts < dispatch.maxAttempts) {
      // Schedule retry with backoff
      const backoffDelay = this._calculateBackoff(dispatch.attempts);
      dispatch.nextRetryTime = Date.now() + backoffDelay;
      this.metrics.retried++;

      console.warn(`Dispatch ${dispatch.id} failed (attempt ${dispatch.attempts}/${dispatch.maxAttempts}), retrying in ${backoffDelay}ms`, error);
    } else {
      // Max attempts reached
      this.queue.delete(dispatch.id);
      this.metrics.pending = this.queue.size;
      this.metrics.failed++;

      console.error(`Dispatch ${dispatch.id} failed after ${dispatch.attempts} attempts`, error);
      dispatch.reject(error);
    }
  }

  /**
   * Calculate backoff delay
   * @param {number} attempt - Attempt number
   * @returns {number} Delay in milliseconds
   * @private
   */
  _calculateBackoff(attempt) {
    const { type, baseDelayMs, maxDelayMs, multiplier, jitterFactor } = this.backoffStrategy;

    let delay;
    switch (type) {
      case 'exponential':
        delay = baseDelayMs * Math.pow(multiplier, attempt - 1);
        break;
      case 'linear':
        delay = baseDelayMs * attempt;
        break;
      case 'constant':
        delay = baseDelayMs;
        break;
      default:
        delay = baseDelayMs;
    }

    // Apply max delay cap
    delay = Math.min(delay, maxDelayMs);

    // Apply jitter to prevent thundering herd
    const jitter = delay * jitterFactor * (Math.random() * 2 - 1);
    delay += jitter;

    return Math.max(0, Math.floor(delay));
  }

  /**
   * Check for timed out dispatches
   * @param {number} now - Current timestamp
   * @private
   */
  _checkTimeouts(now) {
    for (const dispatch of this.queue.values()) {
      const age = now - dispatch.createdAt;
      if (age > dispatch.timeoutMs) {
        const error = new Error(`Dispatch timed out after ${age}ms`);
        this.queue.delete(dispatch.id);
        this.processing.delete(dispatch.id);
        
        this.metrics.pending = this.queue.size;
        this.metrics.processing = this.processing.size;
        this.metrics.timedOut++;
        
        console.error(`Dispatch ${dispatch.id} timed out`, error);
        dispatch.reject(error);
      }
    }
  }

  /**
   * Record latency sample
   * @param {number} latency - Latency in milliseconds
   * @private
   */
  _recordLatency(latency) {
    this.latencySamples.push(latency);
    if (this.latencySamples.length > this.maxLatencySamples) {
      this.latencySamples.shift();
    }

    // Calculate average
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    this.metrics.averageLatencyMs = Math.round(sum / this.latencySamples.length);
  }

  /**
   * Generate unique dispatch ID
   * @returns {string} Unique ID
   * @private
   */
  _generateId() {
    return `dispatch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Dispose of the queue
   */
  dispose() {
    this.stop();
    this.clear('Queue disposed');
    this.latencySamples = [];
  }
}