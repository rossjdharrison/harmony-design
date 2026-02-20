/**
 * @fileoverview WorkerPool: Pool of WebWorkers for parallel dispatch execution
 * 
 * Manages a pool of WebWorkers to execute dispatched code in parallel.
 * Handles worker lifecycle, task assignment, and load balancing.
 * 
 * Related: See DESIGN_SYSTEM.md § WASM Edge Executor - Worker Pool
 * 
 * @module bounded-contexts/wasm-edge-executor/worker-pool
 */

import { DispatchProtocol } from './dispatch-protocol.js';

/**
 * @typedef {Object} WorkerInfo
 * @property {Worker} worker - The WebWorker instance
 * @property {string} id - Unique identifier for this worker
 * @property {boolean} busy - Whether the worker is currently executing a task
 * @property {string|null} currentTaskId - ID of the task currently being executed
 * @property {number} tasksCompleted - Total number of tasks completed by this worker
 * @property {number} createdAt - Timestamp when worker was created
 * @property {number|null} lastUsed - Timestamp when worker last completed a task
 */

/**
 * @typedef {Object} PoolConfig
 * @property {number} [minWorkers=2] - Minimum number of workers to maintain
 * @property {number} [maxWorkers=navigator.hardwareConcurrency || 4] - Maximum number of workers
 * @property {number} [idleTimeout=30000] - Time (ms) before idle workers are terminated
 * @property {number} [taskTimeout=5000] - Maximum time (ms) for a single task
 * @property {string} [workerScript='./sandboxed-executor-worker.js'] - Path to worker script
 */

/**
 * WorkerPool manages a pool of WebWorkers for parallel dispatch execution.
 * 
 * Features:
 * - Dynamic worker scaling based on load
 * - Automatic idle worker cleanup
 * - Task timeout handling
 * - Load balancing across workers
 * - Worker health monitoring
 * 
 * Performance constraints:
 * - Maximum 50MB memory per worker (WASM heap budget)
 * - Task execution timeout configurable (default 5s)
 * - Idle worker cleanup to free resources
 * 
 * @class
 */
export class WorkerPool {
  /**
   * @param {PoolConfig} config - Configuration for the worker pool
   */
  constructor(config = {}) {
    this.config = {
      minWorkers: 2,
      maxWorkers: navigator.hardwareConcurrency || 4,
      idleTimeout: 30000,
      taskTimeout: 5000,
      workerScript: './sandboxed-executor-worker.js',
      ...config
    };

    /** @type {Map<string, WorkerInfo>} */
    this.workers = new Map();

    /** @type {Map<string, {resolve: Function, reject: Function, timeout: number}>} */
    this.pendingTasks = new Map();

    /** @type {number} */
    this.nextWorkerId = 0;

    /** @type {number|null} */
    this.cleanupInterval = null;

    this.initialized = false;
  }

  /**
   * Initialize the worker pool with minimum number of workers.
   * 
   * @returns {Promise<void>}
   * @throws {Error} If worker creation fails
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Create minimum number of workers
    const promises = [];
    for (let i = 0; i < this.config.minWorkers; i++) {
      promises.push(this.createWorker());
    }

    await Promise.all(promises);

    // Start cleanup interval for idle workers
    this.startCleanupInterval();

    this.initialized = true;
  }

  /**
   * Create a new worker and add it to the pool.
   * 
   * @returns {Promise<string>} Worker ID
   * @throws {Error} If worker creation fails
   */
  async createWorker() {
    if (this.workers.size >= this.config.maxWorkers) {
      throw new Error(`Worker pool at maximum capacity: ${this.config.maxWorkers}`);
    }

    const workerId = `worker-${this.nextWorkerId++}`;
    
    try {
      const worker = new Worker(this.config.workerScript, { type: 'module' });
      
      const workerInfo = {
        worker,
        id: workerId,
        busy: false,
        currentTaskId: null,
        tasksCompleted: 0,
        createdAt: Date.now(),
        lastUsed: null
      };

      // Set up message handler
      worker.onmessage = (event) => this.handleWorkerMessage(workerId, event);
      worker.onerror = (error) => this.handleWorkerError(workerId, error);

      this.workers.set(workerId, workerInfo);

      return workerId;
    } catch (error) {
      console.error(`Failed to create worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a dispatch task on an available worker.
   * 
   * @param {Object} task - The dispatch task to execute
   * @param {string} task.id - Unique task identifier
   * @param {string} task.code - Code to execute
   * @param {Object} task.context - Execution context
   * @returns {Promise<Object>} Task result
   * @throws {Error} If no workers available or task times out
   */
  async execute(task) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Validate task using DispatchProtocol
    if (!DispatchProtocol.validate(task)) {
      throw new Error('Invalid dispatch task format');
    }

    // Find or create an available worker
    let workerId = this.findAvailableWorker();
    
    if (!workerId) {
      // Try to create a new worker if under max capacity
      if (this.workers.size < this.config.maxWorkers) {
        workerId = await this.createWorker();
      } else {
        // Wait for a worker to become available
        workerId = await this.waitForAvailableWorker();
      }
    }

    return this.executeOnWorker(workerId, task);
  }

  /**
   * Find an available (non-busy) worker.
   * 
   * @returns {string|null} Worker ID or null if none available
   */
  findAvailableWorker() {
    for (const [workerId, workerInfo] of this.workers.entries()) {
      if (!workerInfo.busy) {
        return workerId;
      }
    }
    return null;
  }

  /**
   * Wait for a worker to become available.
   * 
   * @param {number} [timeout=5000] - Maximum wait time in milliseconds
   * @returns {Promise<string>} Worker ID
   * @throws {Error} If timeout occurs
   */
  waitForAvailableWorker(timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        const workerId = this.findAvailableWorker();
        
        if (workerId) {
          clearInterval(checkInterval);
          resolve(workerId);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for available worker'));
        }
      }, 50);
    });
  }

  /**
   * Execute a task on a specific worker.
   * 
   * @param {string} workerId - ID of the worker to use
   * @param {Object} task - The dispatch task
   * @returns {Promise<Object>} Task result
   */
  executeOnWorker(workerId, task) {
    const workerInfo = this.workers.get(workerId);
    
    if (!workerInfo) {
      return Promise.reject(new Error(`Worker ${workerId} not found`));
    }

    if (workerInfo.busy) {
      return Promise.reject(new Error(`Worker ${workerId} is busy`));
    }

    return new Promise((resolve, reject) => {
      // Mark worker as busy
      workerInfo.busy = true;
      workerInfo.currentTaskId = task.id;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(workerId, task.id);
        reject(new Error(`Task ${task.id} timed out after ${this.config.taskTimeout}ms`));
      }, this.config.taskTimeout);

      // Store pending task
      this.pendingTasks.set(task.id, {
        resolve,
        reject,
        timeout: timeoutId
      });

      // Send task to worker
      const message = DispatchProtocol.createExecuteMessage(
        task.code,
        task.context,
        task.id
      );

      workerInfo.worker.postMessage(message);
    });
  }

  /**
   * Handle message from worker.
   * 
   * @param {string} workerId - ID of the worker that sent the message
   * @param {MessageEvent} event - Message event from worker
   */
  handleWorkerMessage(workerId, event) {
    const message = event.data;
    const workerInfo = this.workers.get(workerId);

    if (!workerInfo) {
      console.error(`Received message from unknown worker: ${workerId}`);
      return;
    }

    // Validate message format
    if (!DispatchProtocol.validate(message)) {
      console.error(`Invalid message format from worker ${workerId}:`, message);
      return;
    }

    const taskId = message.taskId;
    const pending = this.pendingTasks.get(taskId);

    if (!pending) {
      console.warn(`Received result for unknown task: ${taskId}`);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingTasks.delete(taskId);

    // Update worker info
    workerInfo.busy = false;
    workerInfo.currentTaskId = null;
    workerInfo.tasksCompleted++;
    workerInfo.lastUsed = Date.now();

    // Resolve or reject based on message type
    if (message.type === 'result') {
      pending.resolve(message.result);
    } else if (message.type === 'error') {
      pending.reject(new Error(message.error));
    }
  }

  /**
   * Handle worker error.
   * 
   * @param {string} workerId - ID of the worker that errored
   * @param {ErrorEvent} error - Error event from worker
   */
  handleWorkerError(workerId, error) {
    console.error(`Worker ${workerId} error:`, error);
    
    const workerInfo = this.workers.get(workerId);
    
    if (workerInfo && workerInfo.currentTaskId) {
      const pending = this.pendingTasks.get(workerInfo.currentTaskId);
      
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingTasks.delete(workerInfo.currentTaskId);
        pending.reject(new Error(`Worker error: ${error.message}`));
      }
    }

    // Terminate and replace the worker
    this.terminateWorker(workerId);
    
    // Create a replacement if below minimum
    if (this.workers.size < this.config.minWorkers) {
      this.createWorker().catch(err => {
        console.error('Failed to create replacement worker:', err);
      });
    }
  }

  /**
   * Handle task timeout.
   * 
   * @param {string} workerId - ID of the worker executing the task
   * @param {string} taskId - ID of the timed-out task
   */
  handleTaskTimeout(workerId, taskId) {
    console.warn(`Task ${taskId} timed out on worker ${workerId}`);
    
    const workerInfo = this.workers.get(workerId);
    
    if (workerInfo) {
      // Terminate the worker (it may be stuck)
      this.terminateWorker(workerId);
      
      // Create a replacement
      this.createWorker().catch(err => {
        console.error('Failed to create replacement worker after timeout:', err);
      });
    }

    this.pendingTasks.delete(taskId);
  }

  /**
   * Terminate a worker and remove it from the pool.
   * 
   * @param {string} workerId - ID of the worker to terminate
   */
  terminateWorker(workerId) {
    const workerInfo = this.workers.get(workerId);
    
    if (workerInfo) {
      workerInfo.worker.terminate();
      this.workers.delete(workerId);
    }
  }

  /**
   * Start the cleanup interval for idle workers.
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleWorkers();
    }, this.config.idleTimeout / 2);
  }

  /**
   * Clean up idle workers above minimum pool size.
   */
  cleanupIdleWorkers() {
    const now = Date.now();
    const workersToTerminate = [];

    for (const [workerId, workerInfo] of this.workers.entries()) {
      // Keep minimum number of workers
      if (this.workers.size <= this.config.minWorkers) {
        break;
      }

      // Only consider idle workers
      if (workerInfo.busy) {
        continue;
      }

      // Check if worker has been idle too long
      const idleTime = workerInfo.lastUsed 
        ? now - workerInfo.lastUsed 
        : now - workerInfo.createdAt;

      if (idleTime > this.config.idleTimeout) {
        workersToTerminate.push(workerId);
      }
    }

    // Terminate idle workers
    for (const workerId of workersToTerminate) {
      this.terminateWorker(workerId);
    }
  }

  /**
   * Get pool statistics.
   * 
   * @returns {Object} Pool statistics
   */
  getStats() {
    const stats = {
      totalWorkers: this.workers.size,
      busyWorkers: 0,
      idleWorkers: 0,
      totalTasksCompleted: 0,
      pendingTasks: this.pendingTasks.size,
      workers: []
    };

    for (const workerInfo of this.workers.values()) {
      if (workerInfo.busy) {
        stats.busyWorkers++;
      } else {
        stats.idleWorkers++;
      }
      
      stats.totalTasksCompleted += workerInfo.tasksCompleted;
      
      stats.workers.push({
        id: workerInfo.id,
        busy: workerInfo.busy,
        tasksCompleted: workerInfo.tasksCompleted,
        currentTaskId: workerInfo.currentTaskId,
        age: Date.now() - workerInfo.createdAt
      });
    }

    return stats;
  }

  /**
   * Shutdown the worker pool.
   * Terminates all workers and clears intervals.
   * 
   * @returns {Promise<void>}
   */
  async shutdown() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Reject all pending tasks
    for (const [taskId, pending] of this.pendingTasks.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Worker pool shutting down'));
    }
    this.pendingTasks.clear();

    // Terminate all workers
    for (const workerId of this.workers.keys()) {
      this.terminateWorker(workerId);
    }

    this.initialized = false;
  }
}