/**
 * @fileoverview DispatchTarget - Abstract base class for execution targets
 * @module wasm-edge-executor/dispatch-target
 * 
 * Defines the interface and common behavior for dispatching node execution
 * to different runtime targets (WebWorker, SharedWorker, RemoteNode, WASM).
 * 
 * Related:
 * - dispatch-protocol.js: Message format for dispatch communication
 * - See DESIGN_SYSTEM.md § WASM Edge Executor
 */

/**
 * Target type enumeration
 * @enum {string}
 */
export const TargetType = {
  WEB_WORKER: 'web-worker',
  SHARED_WORKER: 'shared-worker',
  REMOTE_NODE: 'remote-node',
  WASM: 'wasm',
};

/**
 * Target status enumeration
 * @enum {string}
 */
export const TargetStatus = {
  IDLE: 'idle',
  BUSY: 'busy',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
};

/**
 * Abstract base class for dispatch targets
 * 
 * Provides common interface for executing node logic across different
 * runtime environments while maintaining consistent error handling,
 * lifecycle management, and performance monitoring.
 * 
 * @abstract
 */
export class DispatchTarget {
  /**
   * @param {TargetType} type - The type of dispatch target
   * @param {Object} config - Target-specific configuration
   * @param {number} [config.timeoutMs=5000] - Execution timeout in milliseconds
   * @param {number} [config.maxRetries=3] - Maximum retry attempts
   * @param {boolean} [config.enableMetrics=true] - Enable performance metrics
   */
  constructor(type, config = {}) {
    if (new.target === DispatchTarget) {
      throw new Error('DispatchTarget is abstract and cannot be instantiated directly');
    }

    this.type = type;
    this.status = TargetStatus.IDLE;
    this.config = {
      timeoutMs: 5000,
      maxRetries: 3,
      enableMetrics: true,
      ...config,
    };

    /** @type {Map<string, {resolve: Function, reject: Function, startTime: number}>} */
    this.pendingRequests = new Map();

    /** @type {Object} */
    this.metrics = {
      totalDispatches: 0,
      successfulDispatches: 0,
      failedDispatches: 0,
      averageLatencyMs: 0,
      lastDispatchTime: null,
    };

    /** @type {number} */
    this.requestIdCounter = 0;
  }

  /**
   * Initialize the dispatch target
   * Must be implemented by subclasses
   * 
   * @abstract
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Dispatch a node execution request
   * Must be implemented by subclasses
   * 
   * @abstract
   * @param {Object} request - Dispatch request conforming to DispatchProtocol
   * @param {string} request.nodeId - Unique node identifier
   * @param {string} request.codeHash - Content hash of node code
   * @param {Object} request.inputs - Input values for node
   * @param {Object} request.config - Node configuration
   * @returns {Promise<Object>} Execution result
   */
  async dispatch(request) {
    throw new Error('dispatch() must be implemented by subclass');
  }

  /**
   * Terminate the dispatch target and cleanup resources
   * Must be implemented by subclasses
   * 
   * @abstract
   * @returns {Promise<void>}
   */
  async terminate() {
    throw new Error('terminate() must be implemented by subclass');
  }

  /**
   * Check if target is available and ready for dispatch
   * 
   * @returns {boolean}
   */
  isAvailable() {
    return this.status === TargetStatus.IDLE;
  }

  /**
   * Generate a unique request ID
   * 
   * @protected
   * @returns {string}
   */
  generateRequestId() {
    return `${this.type}-${Date.now()}-${++this.requestIdCounter}`;
  }

  /**
   * Register a pending request with timeout handling
   * 
   * @protected
   * @param {string} requestId - Unique request identifier
   * @returns {Promise<Object>} Promise that resolves with execution result
   */
  registerPendingRequest(requestId) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();

      // Setup timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        this.updateMetrics(false, performance.now() - startTime);
        reject(new Error(`Request ${requestId} timed out after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(requestId);
          this.updateMetrics(true, performance.now() - startTime);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          this.pendingRequests.delete(requestId);
          this.updateMetrics(false, performance.now() - startTime);
          reject(error);
        },
        startTime,
      });
    });
  }

  /**
   * Resolve a pending request
   * 
   * @protected
   * @param {string} requestId - Request identifier
   * @param {Object} result - Execution result
   */
  resolvePendingRequest(requestId, result) {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      pending.resolve(result);
    } else {
      console.warn(`No pending request found for ID: ${requestId}`);
    }
  }

  /**
   * Reject a pending request
   * 
   * @protected
   * @param {string} requestId - Request identifier
   * @param {Error} error - Error that occurred
   */
  rejectPendingRequest(requestId, error) {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      pending.reject(error);
    } else {
      console.warn(`No pending request found for ID: ${requestId}`);
    }
  }

  /**
   * Update performance metrics
   * 
   * @protected
   * @param {boolean} success - Whether dispatch was successful
   * @param {number} latencyMs - Execution latency in milliseconds
   */
  updateMetrics(success, latencyMs) {
    if (!this.config.enableMetrics) return;

    this.metrics.totalDispatches++;
    if (success) {
      this.metrics.successfulDispatches++;
    } else {
      this.metrics.failedDispatches++;
    }

    // Update rolling average latency
    const totalSuccessful = this.metrics.successfulDispatches;
    this.metrics.averageLatencyMs =
      (this.metrics.averageLatencyMs * (totalSuccessful - 1) + latencyMs) / totalSuccessful;

    this.metrics.lastDispatchTime = Date.now();
  }

  /**
   * Get current performance metrics
   * 
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      totalDispatches: 0,
      successfulDispatches: 0,
      failedDispatches: 0,
      averageLatencyMs: 0,
      lastDispatchTime: null,
    };
  }

  /**
   * Validate dispatch request
   * 
   * @protected
   * @param {Object} request - Dispatch request
   * @throws {Error} If request is invalid
   */
  validateRequest(request) {
    if (!request) {
      throw new Error('Dispatch request is required');
    }

    if (!request.nodeId || typeof request.nodeId !== 'string') {
      throw new Error('Request must have a valid nodeId');
    }

    if (!request.codeHash || typeof request.codeHash !== 'string') {
      throw new Error('Request must have a valid codeHash');
    }

    if (!request.inputs || typeof request.inputs !== 'object') {
      throw new Error('Request must have valid inputs object');
    }

    if (!request.config || typeof request.config !== 'object') {
      throw new Error('Request must have valid config object');
    }
  }

  /**
   * Handle dispatch error with retry logic
   * 
   * @protected
   * @param {Error} error - Error that occurred
   * @param {Object} request - Original dispatch request
   * @param {number} attemptNumber - Current attempt number
   * @returns {Promise<Object>} Result after retry or rethrown error
   */
  async handleDispatchError(error, request, attemptNumber = 0) {
    console.error(`Dispatch error on ${this.type} (attempt ${attemptNumber + 1}):`, error);

    if (attemptNumber < this.config.maxRetries) {
      // Exponential backoff
      const delayMs = Math.min(1000 * Math.pow(2, attemptNumber), 5000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      console.log(`Retrying dispatch (attempt ${attemptNumber + 2}/${this.config.maxRetries + 1})...`);
      return this.dispatch(request);
    }

    // Max retries exceeded
    this.status = TargetStatus.ERROR;
    throw new Error(`Dispatch failed after ${this.config.maxRetries + 1} attempts: ${error.message}`);
  }

  /**
   * Get string representation of target
   * 
   * @returns {string}
   */
  toString() {
    return `[DispatchTarget:${this.type} status=${this.status}]`;
  }
}