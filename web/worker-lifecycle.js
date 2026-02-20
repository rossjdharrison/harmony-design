/**
 * @fileoverview WorkerLifecycle: Manage worker creation, warmup, and termination
 * 
 * Responsibilities:
 * - Create and initialize WebWorkers with proper configuration
 * - Warmup workers with preloaded code and dependencies
 * - Track worker health and lifecycle state
 * - Gracefully terminate workers and cleanup resources
 * - Handle worker failures and recovery
 * 
 * Performance Targets:
 * - Worker creation: < 50ms
 * - Worker warmup: < 100ms
 * - Termination cleanup: < 20ms
 * 
 * Related: WorkerPool (uses this), DispatchQueue (triggers warmup)
 * See: harmony-design/DESIGN_SYSTEM.md#worker-lifecycle
 */

/**
 * Worker lifecycle states
 * @enum {string}
 */
export const WorkerState = {
  CREATING: 'creating',
  WARMING_UP: 'warming_up',
  READY: 'ready',
  BUSY: 'busy',
  TERMINATING: 'terminating',
  TERMINATED: 'terminated',
  FAILED: 'failed'
};

/**
 * Worker lifecycle events
 * @enum {string}
 */
export const WorkerLifecycleEvent = {
  CREATED: 'worker:created',
  WARMED_UP: 'worker:warmed_up',
  READY: 'worker:ready',
  BUSY: 'worker:busy',
  IDLE: 'worker:idle',
  TERMINATING: 'worker:terminating',
  TERMINATED: 'worker:terminated',
  FAILED: 'worker:failed',
  HEALTH_CHECK: 'worker:health_check'
};

/**
 * Configuration for worker lifecycle
 * @typedef {Object} WorkerLifecycleConfig
 * @property {string} workerScriptUrl - URL to worker script
 * @property {number} warmupTimeoutMs - Timeout for warmup phase (default: 5000ms)
 * @property {number} healthCheckIntervalMs - Health check interval (default: 30000ms)
 * @property {number} terminationTimeoutMs - Timeout for graceful termination (default: 2000ms)
 * @property {boolean} enableHealthChecks - Enable periodic health checks (default: true)
 * @property {Object} warmupPayload - Initial payload to send during warmup
 */

/**
 * Worker instance metadata
 * @typedef {Object} WorkerInstance
 * @property {string} id - Unique worker identifier
 * @property {Worker} worker - WebWorker instance
 * @property {WorkerState} state - Current lifecycle state
 * @property {number} createdAt - Creation timestamp
 * @property {number} lastActiveAt - Last activity timestamp
 * @property {number} tasksCompleted - Number of completed tasks
 * @property {number} tasksErrored - Number of errored tasks
 * @property {boolean} healthy - Health status
 * @property {number|null} healthCheckTimer - Health check timer ID
 */

/**
 * Manages worker creation, warmup, and termination
 */
export class WorkerLifecycle {
  /**
   * @param {WorkerLifecycleConfig} config - Lifecycle configuration
   */
  constructor(config) {
    this.config = {
      warmupTimeoutMs: 5000,
      healthCheckIntervalMs: 30000,
      terminationTimeoutMs: 2000,
      enableHealthChecks: true,
      warmupPayload: null,
      ...config
    };

    /** @type {Map<string, WorkerInstance>} */
    this.workers = new Map();

    /** @type {Set<Function>} */
    this.eventListeners = new Set();

    /** @type {number} */
    this.workerIdCounter = 0;

    this._boundHandleMessage = this._handleWorkerMessage.bind(this);
    this._boundHandleError = this._handleWorkerError.bind(this);
  }

  /**
   * Create a new worker instance
   * @param {Object} options - Creation options
   * @returns {Promise<WorkerInstance>} Created worker instance
   */
  async createWorker(options = {}) {
    const startTime = performance.now();
    const workerId = `worker-${++this.workerIdCounter}-${Date.now()}`;

    try {
      // Create WebWorker
      const worker = new Worker(this.config.workerScriptUrl, {
        type: options.type || 'module',
        name: workerId
      });

      // Create worker instance metadata
      const instance = {
        id: workerId,
        worker,
        state: WorkerState.CREATING,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        tasksCompleted: 0,
        tasksErrored: 0,
        healthy: true,
        healthCheckTimer: null
      };

      // Setup event handlers
      worker.addEventListener('message', (event) => {
        this._boundHandleMessage(workerId, event);
      });

      worker.addEventListener('error', (event) => {
        this._boundHandleError(workerId, event);
      });

      // Store worker instance
      this.workers.set(workerId, instance);

      // Emit created event
      this._emitEvent(WorkerLifecycleEvent.CREATED, {
        workerId,
        creationTime: performance.now() - startTime
      });

      // Log performance
      const creationTime = performance.now() - startTime;
      if (creationTime > 50) {
        console.warn(`[WorkerLifecycle] Worker creation took ${creationTime.toFixed(2)}ms (target: <50ms)`);
      }

      return instance;
    } catch (error) {
      console.error(`[WorkerLifecycle] Failed to create worker:`, error);
      throw error;
    }
  }

  /**
   * Warmup a worker with preloaded code and dependencies
   * @param {string} workerId - Worker identifier
   * @param {Object} warmupPayload - Warmup payload (optional, uses config default)
   * @returns {Promise<void>}
   */
  async warmupWorker(workerId, warmupPayload = null) {
    const instance = this.workers.get(workerId);
    if (!instance) {
      throw new Error(`Worker ${workerId} not found`);
    }

    if (instance.state !== WorkerState.CREATING) {
      console.warn(`[WorkerLifecycle] Worker ${workerId} already warmed up (state: ${instance.state})`);
      return;
    }

    const startTime = performance.now();
    instance.state = WorkerState.WARMING_UP;

    try {
      // Send warmup message
      const payload = warmupPayload || this.config.warmupPayload;
      const warmupPromise = this._sendWithResponse(instance, {
        type: 'warmup',
        payload
      });

      // Wait for warmup with timeout
      await Promise.race([
        warmupPromise,
        this._timeout(this.config.warmupTimeoutMs, `Worker ${workerId} warmup timeout`)
      ]);

      // Update state
      instance.state = WorkerState.READY;
      instance.lastActiveAt = Date.now();

      // Start health checks if enabled
      if (this.config.enableHealthChecks) {
        this._startHealthCheck(workerId);
      }

      // Emit ready event
      this._emitEvent(WorkerLifecycleEvent.READY, {
        workerId,
        warmupTime: performance.now() - startTime
      });

      // Log performance
      const warmupTime = performance.now() - startTime;
      if (warmupTime > 100) {
        console.warn(`[WorkerLifecycle] Worker warmup took ${warmupTime.toFixed(2)}ms (target: <100ms)`);
      }
    } catch (error) {
      instance.state = WorkerState.FAILED;
      instance.healthy = false;
      
      this._emitEvent(WorkerLifecycleEvent.FAILED, {
        workerId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Terminate a worker gracefully
   * @param {string} workerId - Worker identifier
   * @param {boolean} force - Force immediate termination
   * @returns {Promise<void>}
   */
  async terminateWorker(workerId, force = false) {
    const instance = this.workers.get(workerId);
    if (!instance) {
      console.warn(`[WorkerLifecycle] Worker ${workerId} not found for termination`);
      return;
    }

    if (instance.state === WorkerState.TERMINATED || instance.state === WorkerState.TERMINATING) {
      return;
    }

    const startTime = performance.now();
    instance.state = WorkerState.TERMINATING;

    this._emitEvent(WorkerLifecycleEvent.TERMINATING, { workerId });

    try {
      // Stop health checks
      if (instance.healthCheckTimer) {
        clearInterval(instance.healthCheckTimer);
        instance.healthCheckTimer = null;
      }

      if (!force) {
        // Graceful shutdown: send termination message
        try {
          await Promise.race([
            this._sendWithResponse(instance, { type: 'terminate' }),
            this._timeout(this.config.terminationTimeoutMs, 'Graceful termination timeout')
          ]);
        } catch (error) {
          console.warn(`[WorkerLifecycle] Graceful termination failed, forcing:`, error.message);
          force = true;
        }
      }

      // Terminate worker
      instance.worker.terminate();
      instance.state = WorkerState.TERMINATED;

      // Remove from map
      this.workers.delete(workerId);

      // Emit terminated event
      this._emitEvent(WorkerLifecycleEvent.TERMINATED, {
        workerId,
        terminationTime: performance.now() - startTime,
        forced: force,
        stats: {
          tasksCompleted: instance.tasksCompleted,
          tasksErrored: instance.tasksErrored,
          uptime: Date.now() - instance.createdAt
        }
      });

      // Log performance
      const terminationTime = performance.now() - startTime;
      if (terminationTime > 20) {
        console.warn(`[WorkerLifecycle] Worker termination took ${terminationTime.toFixed(2)}ms (target: <20ms)`);
      }
    } catch (error) {
      console.error(`[WorkerLifecycle] Error during termination:`, error);
      // Force terminate on error
      instance.worker.terminate();
      instance.state = WorkerState.TERMINATED;
      this.workers.delete(workerId);
      throw error;
    }
  }

  /**
   * Mark worker as busy
   * @param {string} workerId - Worker identifier
   */
  markBusy(workerId) {
    const instance = this.workers.get(workerId);
    if (instance && instance.state === WorkerState.READY) {
      instance.state = WorkerState.BUSY;
      instance.lastActiveAt = Date.now();
      this._emitEvent(WorkerLifecycleEvent.BUSY, { workerId });
    }
  }

  /**
   * Mark worker as idle (ready)
   * @param {string} workerId - Worker identifier
   * @param {boolean} success - Whether task completed successfully
   */
  markIdle(workerId, success = true) {
    const instance = this.workers.get(workerId);
    if (instance && instance.state === WorkerState.BUSY) {
      instance.state = WorkerState.READY;
      instance.lastActiveAt = Date.now();
      
      if (success) {
        instance.tasksCompleted++;
      } else {
        instance.tasksErrored++;
      }

      this._emitEvent(WorkerLifecycleEvent.IDLE, { 
        workerId,
        tasksCompleted: instance.tasksCompleted,
        tasksErrored: instance.tasksErrored
      });
    }
  }

  /**
   * Get worker instance
   * @param {string} workerId - Worker identifier
   * @returns {WorkerInstance|null}
   */
  getWorker(workerId) {
    return this.workers.get(workerId) || null;
  }

  /**
   * Get all workers
   * @returns {WorkerInstance[]}
   */
  getAllWorkers() {
    return Array.from(this.workers.values());
  }

  /**
   * Get workers by state
   * @param {WorkerState} state - Worker state
   * @returns {WorkerInstance[]}
   */
  getWorkersByState(state) {
    return Array.from(this.workers.values()).filter(w => w.state === state);
  }

  /**
   * Get worker statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const workers = Array.from(this.workers.values());
    
    return {
      total: workers.length,
      byState: {
        creating: workers.filter(w => w.state === WorkerState.CREATING).length,
        warmingUp: workers.filter(w => w.state === WorkerState.WARMING_UP).length,
        ready: workers.filter(w => w.state === WorkerState.READY).length,
        busy: workers.filter(w => w.state === WorkerState.BUSY).length,
        terminating: workers.filter(w => w.state === WorkerState.TERMINATING).length,
        failed: workers.filter(w => w.state === WorkerState.FAILED).length
      },
      healthy: workers.filter(w => w.healthy).length,
      unhealthy: workers.filter(w => !w.healthy).length,
      totalTasksCompleted: workers.reduce((sum, w) => sum + w.tasksCompleted, 0),
      totalTasksErrored: workers.reduce((sum, w) => sum + w.tasksErrored, 0)
    };
  }

  /**
   * Add event listener
   * @param {Function} listener - Event listener function
   */
  addEventListener(listener) {
    this.eventListeners.add(listener);
  }

  /**
   * Remove event listener
   * @param {Function} listener - Event listener function
   */
  removeEventListener(listener) {
    this.eventListeners.delete(listener);
  }

  /**
   * Terminate all workers
   * @param {boolean} force - Force immediate termination
   * @returns {Promise<void>}
   */
  async terminateAll(force = false) {
    const workerIds = Array.from(this.workers.keys());
    await Promise.all(workerIds.map(id => this.terminateWorker(id, force)));
  }

  /**
   * Handle worker message
   * @private
   */
  _handleWorkerMessage(workerId, event) {
    const instance = this.workers.get(workerId);
    if (!instance) return;

    instance.lastActiveAt = Date.now();

    // Handle health check responses
    if (event.data && event.data.type === 'health_check_response') {
      instance.healthy = true;
      this._emitEvent(WorkerLifecycleEvent.HEALTH_CHECK, {
        workerId,
        healthy: true
      });
    }
  }

  /**
   * Handle worker error
   * @private
   */
  _handleWorkerError(workerId, event) {
    const instance = this.workers.get(workerId);
    if (!instance) return;

    instance.healthy = false;
    instance.state = WorkerState.FAILED;

    console.error(`[WorkerLifecycle] Worker ${workerId} error:`, event.message);

    this._emitEvent(WorkerLifecycleEvent.FAILED, {
      workerId,
      error: event.message
    });
  }

  /**
   * Start health check for worker
   * @private
   */
  _startHealthCheck(workerId) {
    const instance = this.workers.get(workerId);
    if (!instance) return;

    instance.healthCheckTimer = setInterval(() => {
      if (instance.state === WorkerState.READY || instance.state === WorkerState.BUSY) {
        // Send health check ping
        instance.worker.postMessage({ type: 'health_check' });

        // Check if worker is responsive
        const timeSinceActive = Date.now() - instance.lastActiveAt;
        if (timeSinceActive > this.config.healthCheckIntervalMs * 2) {
          instance.healthy = false;
          this._emitEvent(WorkerLifecycleEvent.HEALTH_CHECK, {
            workerId,
            healthy: false,
            reason: 'unresponsive'
          });
        }
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Send message to worker and wait for response
   * @private
   */
  _sendWithResponse(instance, message) {
    return new Promise((resolve, reject) => {
      const messageId = `msg-${Date.now()}-${Math.random()}`;
      
      const handler = (event) => {
        if (event.data && event.data.messageId === messageId) {
          instance.worker.removeEventListener('message', handler);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        }
      };

      instance.worker.addEventListener('message', handler);
      instance.worker.postMessage({ ...message, messageId });
    });
  }

  /**
   * Create timeout promise
   * @private
   */
  _timeout(ms, message) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Emit lifecycle event
   * @private
   */
  _emitEvent(type, data) {
    const event = { type, data, timestamp: Date.now() };
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[WorkerLifecycle] Event listener error:', error);
      }
    });
  }
}

/**
 * Create and initialize a worker lifecycle manager
 * @param {WorkerLifecycleConfig} config - Configuration
 * @returns {WorkerLifecycle}
 */
export function createWorkerLifecycle(config) {
  return new WorkerLifecycle(config);
}