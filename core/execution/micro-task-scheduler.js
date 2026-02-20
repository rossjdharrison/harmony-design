/**
 * @fileoverview MicroTaskScheduler - Schedules tasks onto the microtask queue for immediate execution
 * @module core/execution/micro-task-scheduler
 * 
 * The microtask queue runs after the current task completes but before the browser
 * yields control back to the event loop. This makes it ideal for:
 * - Batching DOM updates
 * - Promise resolution callbacks
 * - High-priority state synchronization
 * - Immediate cleanup operations
 * 
 * Performance characteristics:
 * - Lower latency than setTimeout(0) or requestAnimationFrame
 * - Executes before next render frame
 * - Can cause starvation if overused (blocks rendering)
 * 
 * Related: See DESIGN_SYSTEM.md § Execution Model § Microtask Scheduling
 */

/**
 * @typedef {Object} MicroTask
 * @property {string} id - Unique task identifier
 * @property {Function} callback - Task callback function
 * @property {any} context - Execution context (this binding)
 * @property {Array<any>} args - Arguments to pass to callback
 * @property {number} scheduledAt - Timestamp when task was scheduled
 * @property {string} [label] - Optional debug label
 */

/**
 * @typedef {Object} MicroTaskResult
 * @property {string} taskId - Task identifier
 * @property {boolean} success - Whether execution succeeded
 * @property {any} [result] - Return value from callback
 * @property {Error} [error] - Error if execution failed
 * @property {number} executionTime - Time taken to execute (ms)
 */

/**
 * MicroTaskScheduler - Manages microtask queue scheduling
 * 
 * Uses the native queueMicrotask() API for optimal performance.
 * Provides tracking, error handling, and debugging capabilities.
 * 
 * @class
 */
export class MicroTaskScheduler {
  /**
   * Creates a new MicroTaskScheduler instance
   * @param {Object} [options={}] - Configuration options
   * @param {boolean} [options.trackMetrics=false] - Enable performance tracking
   * @param {Function} [options.errorHandler=null] - Global error handler
   * @param {number} [options.maxQueueSize=1000] - Maximum pending tasks
   */
  constructor(options = {}) {
    /** @private */
    this.options = {
      trackMetrics: options.trackMetrics ?? false,
      errorHandler: options.errorHandler ?? null,
      maxQueueSize: options.maxQueueSize ?? 1000,
    };

    /** @private @type {Map<string, MicroTask>} */
    this.pendingTasks = new Map();

    /** @private @type {Map<string, MicroTaskResult>} */
    this.completedTasks = new Map();

    /** @private */
    this.metrics = {
      scheduled: 0,
      executed: 0,
      failed: 0,
      cancelled: 0,
      totalExecutionTime: 0,
    };

    /** @private */
    this.taskIdCounter = 0;

    /** @private */
    this.isShutdown = false;
  }

  /**
   * Schedules a callback onto the microtask queue
   * 
   * @param {Function} callback - Function to execute
   * @param {Object} [options={}] - Scheduling options
   * @param {any} [options.context=null] - Execution context (this binding)
   * @param {Array<any>} [options.args=[]] - Arguments to pass
   * @param {string} [options.label=''] - Debug label
   * @returns {string} Task ID for tracking/cancellation
   * @throws {Error} If scheduler is shutdown or queue is full
   */
  schedule(callback, options = {}) {
    if (this.isShutdown) {
      throw new Error('MicroTaskScheduler is shutdown');
    }

    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (this.pendingTasks.size >= this.options.maxQueueSize) {
      throw new Error(`Microtask queue full (max: ${this.options.maxQueueSize})`);
    }

    const taskId = this._generateTaskId();
    const task = {
      id: taskId,
      callback,
      context: options.context ?? null,
      args: options.args ?? [],
      scheduledAt: performance.now(),
      label: options.label ?? '',
    };

    this.pendingTasks.set(taskId, task);
    this.metrics.scheduled++;

    // Schedule onto microtask queue
    queueMicrotask(() => this._executeTask(taskId));

    return taskId;
  }

  /**
   * Schedules a Promise-returning callback onto the microtask queue
   * 
   * @param {Function} asyncCallback - Async function to execute
   * @param {Object} [options={}] - Scheduling options
   * @returns {Promise<any>} Promise that resolves with callback result
   */
  scheduleAsync(asyncCallback, options = {}) {
    return new Promise((resolve, reject) => {
      this.schedule(
        async () => {
          try {
            const result = await asyncCallback();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        options
      );
    });
  }

  /**
   * Schedules multiple tasks as a batch
   * 
   * @param {Array<{callback: Function, options?: Object}>} tasks - Tasks to schedule
   * @returns {Array<string>} Task IDs
   */
  scheduleBatch(tasks) {
    return tasks.map(({ callback, options }) => this.schedule(callback, options));
  }

  /**
   * Cancels a pending task
   * 
   * @param {string} taskId - Task identifier
   * @returns {boolean} True if task was cancelled, false if not found
   */
  cancel(taskId) {
    const task = this.pendingTasks.get(taskId);
    if (!task) {
      return false;
    }

    this.pendingTasks.delete(taskId);
    this.metrics.cancelled++;
    return true;
  }

  /**
   * Cancels all pending tasks
   * 
   * @returns {number} Number of tasks cancelled
   */
  cancelAll() {
    const count = this.pendingTasks.size;
    this.pendingTasks.clear();
    this.metrics.cancelled += count;
    return count;
  }

  /**
   * Checks if a task is pending
   * 
   * @param {string} taskId - Task identifier
   * @returns {boolean} True if task is pending
   */
  isPending(taskId) {
    return this.pendingTasks.has(taskId);
  }

  /**
   * Gets result of a completed task
   * 
   * @param {string} taskId - Task identifier
   * @returns {MicroTaskResult|null} Task result or null if not found
   */
  getResult(taskId) {
    return this.completedTasks.get(taskId) ?? null;
  }

  /**
   * Gets current metrics
   * 
   * @returns {Object} Scheduler metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      pending: this.pendingTasks.size,
      completed: this.completedTasks.size,
      averageExecutionTime:
        this.metrics.executed > 0
          ? this.metrics.totalExecutionTime / this.metrics.executed
          : 0,
    };
  }

  /**
   * Clears completed task history
   */
  clearHistory() {
    this.completedTasks.clear();
  }

  /**
   * Shuts down the scheduler
   * Cancels all pending tasks and prevents new scheduling
   */
  shutdown() {
    this.cancelAll();
    this.isShutdown = true;
  }

  /**
   * Resets the scheduler to initial state
   */
  reset() {
    this.cancelAll();
    this.completedTasks.clear();
    this.metrics = {
      scheduled: 0,
      executed: 0,
      failed: 0,
      cancelled: 0,
      totalExecutionTime: 0,
    };
    this.taskIdCounter = 0;
    this.isShutdown = false;
  }

  /**
   * Executes a scheduled task
   * @private
   * @param {string} taskId - Task identifier
   */
  async _executeTask(taskId) {
    const task = this.pendingTasks.get(taskId);
    
    // Task may have been cancelled
    if (!task) {
      return;
    }

    this.pendingTasks.delete(taskId);

    const startTime = performance.now();
    const result = {
      taskId,
      success: false,
      executionTime: 0,
    };

    try {
      // Execute callback with context and args
      const returnValue = await task.callback.apply(task.context, task.args);
      
      result.success = true;
      result.result = returnValue;
      this.metrics.executed++;
    } catch (error) {
      result.success = false;
      result.error = error;
      this.metrics.failed++;

      // Call error handler if provided
      if (this.options.errorHandler) {
        try {
          this.options.errorHandler(error, task);
        } catch (handlerError) {
          console.error('Error in microtask error handler:', handlerError);
        }
      }

      // Log error
      console.error(
        `MicroTask execution failed [${taskId}]${task.label ? ` "${task.label}"` : ''}:`,
        error
      );
    } finally {
      result.executionTime = performance.now() - startTime;
      
      if (this.options.trackMetrics) {
        this.metrics.totalExecutionTime += result.executionTime;
        this.completedTasks.set(taskId, result);
      }
    }
  }

  /**
   * Generates unique task ID
   * @private
   * @returns {string} Task ID
   */
  _generateTaskId() {
    return `mt-${++this.taskIdCounter}-${Date.now()}`;
  }
}

/**
 * Global singleton instance
 * @type {MicroTaskScheduler}
 */
export const globalMicroTaskScheduler = new MicroTaskScheduler({
  trackMetrics: true,
  errorHandler: (error, task) => {
    console.warn('Global microtask error:', {
      taskId: task.id,
      label: task.label,
      error: error.message,
    });
  },
});

/**
 * Convenience function to schedule a microtask using global scheduler
 * 
 * @param {Function} callback - Function to execute
 * @param {Object} [options={}] - Scheduling options
 * @returns {string} Task ID
 */
export function scheduleMicroTask(callback, options = {}) {
  return globalMicroTaskScheduler.schedule(callback, options);
}

/**
 * Convenience function to schedule async microtask using global scheduler
 * 
 * @param {Function} asyncCallback - Async function to execute
 * @param {Object} [options={}] - Scheduling options
 * @returns {Promise<any>} Promise that resolves with result
 */
export function scheduleMicroTaskAsync(asyncCallback, options = {}) {
  return globalMicroTaskScheduler.scheduleAsync(asyncCallback, options);
}