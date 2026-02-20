/**
 * @fileoverview IdleScheduler - Schedules low-priority work during browser idle time
 * 
 * Uses requestIdleCallback API to defer non-critical work until the browser is idle.
 * Provides timeout fallback for browsers without requestIdleCallback support.
 * Integrates with PriorityQueue for priority-based scheduling.
 * 
 * Performance Budget: <1ms overhead per scheduled task
 * Memory Budget: <100KB for task queue
 * 
 * @see DESIGN_SYSTEM.md#idle-scheduler
 * @module performance/IdleScheduler
 */

/**
 * @typedef {Object} IdleTask
 * @property {string} id - Unique task identifier
 * @property {Function} callback - Task callback to execute
 * @property {number} priority - Task priority (0-10, lower = more important)
 * @property {number} timeout - Maximum time to wait before forcing execution (ms)
 * @property {number} scheduledAt - Timestamp when task was scheduled
 * @property {number|null} idleCallbackId - requestIdleCallback ID if scheduled
 */

/**
 * @typedef {Object} IdleDeadline
 * @property {Function} timeRemaining - Returns remaining idle time in ms
 * @property {boolean} didTimeout - Whether callback was invoked due to timeout
 */

/**
 * IdleScheduler - Schedule low-priority work during browser idle time
 * 
 * Uses requestIdleCallback to defer non-critical tasks until the browser
 * has spare cycles. Falls back to setTimeout for unsupported browsers.
 * 
 * Example usage:
 * ```javascript
 * const scheduler = new IdleScheduler();
 * 
 * scheduler.schedule(() => {
 *   // Low-priority work like analytics, prefetching
 *   console.log('Running during idle time');
 * }, { priority: 5, timeout: 2000 });
 * ```
 */
export class IdleScheduler {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.maxConcurrent=3] - Max concurrent idle tasks
   * @param {number} [options.defaultTimeout=5000] - Default timeout in ms
   * @param {number} [options.minIdleTime=10] - Minimum idle time required (ms)
   */
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.defaultTimeout = options.defaultTimeout || 5000;
    this.minIdleTime = options.minIdleTime || 10;
    
    /** @type {Map<string, IdleTask>} */
    this.tasks = new Map();
    
    /** @type {Set<string>} */
    this.runningTasks = new Set();
    
    /** @type {number} */
    this.nextTaskId = 1;
    
    /** @type {boolean} */
    this.hasIdleCallback = typeof requestIdleCallback !== 'undefined';
    
    /** @type {Object} */
    this.stats = {
      scheduled: 0,
      executed: 0,
      timedOut: 0,
      cancelled: 0,
      totalIdleTime: 0,
      totalExecutionTime: 0
    };
    
    // Bind methods
    this._processIdleTask = this._processIdleTask.bind(this);
  }
  
  /**
   * Schedule a task to run during idle time
   * 
   * @param {Function} callback - Task to execute
   * @param {Object} [options] - Scheduling options
   * @param {number} [options.priority=5] - Priority (0-10, lower = more important)
   * @param {number} [options.timeout] - Max wait time before forcing execution
   * @returns {string} Task ID for cancellation
   */
  schedule(callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }
    
    const taskId = `idle-${this.nextTaskId++}`;
    const priority = Math.max(0, Math.min(10, options.priority ?? 5));
    const timeout = options.timeout ?? this.defaultTimeout;
    
    /** @type {IdleTask} */
    const task = {
      id: taskId,
      callback,
      priority,
      timeout,
      scheduledAt: performance.now(),
      idleCallbackId: null
    };
    
    this.tasks.set(taskId, task);
    this.stats.scheduled++;
    
    this._scheduleNext();
    
    return taskId;
  }
  
  /**
   * Schedule multiple tasks in batch
   * 
   * @param {Array<{callback: Function, priority?: number, timeout?: number}>} tasks
   * @returns {Array<string>} Array of task IDs
   */
  scheduleBatch(tasks) {
    if (!Array.isArray(tasks)) {
      throw new TypeError('Tasks must be an array');
    }
    
    return tasks.map(task => 
      this.schedule(task.callback, {
        priority: task.priority,
        timeout: task.timeout
      })
    );
  }
  
  /**
   * Cancel a scheduled task
   * 
   * @param {string} taskId - Task ID to cancel
   * @returns {boolean} True if task was cancelled
   */
  cancel(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }
    
    if (task.idleCallbackId !== null) {
      if (this.hasIdleCallback) {
        cancelIdleCallback(task.idleCallbackId);
      } else {
        clearTimeout(task.idleCallbackId);
      }
    }
    
    this.tasks.delete(taskId);
    this.runningTasks.delete(taskId);
    this.stats.cancelled++;
    
    return true;
  }
  
  /**
   * Cancel all scheduled tasks
   * 
   * @returns {number} Number of tasks cancelled
   */
  cancelAll() {
    const count = this.tasks.size;
    
    for (const task of this.tasks.values()) {
      if (task.idleCallbackId !== null) {
        if (this.hasIdleCallback) {
          cancelIdleCallback(task.idleCallbackId);
        } else {
          clearTimeout(task.idleCallbackId);
        }
      }
    }
    
    this.tasks.clear();
    this.runningTasks.clear();
    this.stats.cancelled += count;
    
    return count;
  }
  
  /**
   * Get pending task count
   * 
   * @returns {number} Number of pending tasks
   */
  getPendingCount() {
    return this.tasks.size - this.runningTasks.size;
  }
  
  /**
   * Get running task count
   * 
   * @returns {number} Number of running tasks
   */
  getRunningCount() {
    return this.runningTasks.size;
  }
  
  /**
   * Get scheduler statistics
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      pending: this.getPendingCount(),
      running: this.getRunningCount(),
      avgIdleTime: this.stats.executed > 0 
        ? this.stats.totalIdleTime / this.stats.executed 
        : 0,
      avgExecutionTime: this.stats.executed > 0
        ? this.stats.totalExecutionTime / this.stats.executed
        : 0
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      scheduled: 0,
      executed: 0,
      timedOut: 0,
      cancelled: 0,
      totalIdleTime: 0,
      totalExecutionTime: 0
    };
  }
  
  /**
   * Schedule next task if capacity available
   * 
   * @private
   */
  _scheduleNext() {
    // Check if we have capacity
    if (this.runningTasks.size >= this.maxConcurrent) {
      return;
    }
    
    // Find highest priority pending task
    let nextTask = null;
    let highestPriority = Infinity;
    
    for (const task of this.tasks.values()) {
      if (!this.runningTasks.has(task.id) && task.idleCallbackId === null) {
        if (task.priority < highestPriority) {
          highestPriority = task.priority;
          nextTask = task;
        }
      }
    }
    
    if (!nextTask) {
      return;
    }
    
    // Schedule the task
    this.runningTasks.add(nextTask.id);
    
    if (this.hasIdleCallback) {
      nextTask.idleCallbackId = requestIdleCallback(
        (deadline) => this._processIdleTask(nextTask.id, deadline),
        { timeout: nextTask.timeout }
      );
    } else {
      // Fallback to setTimeout
      nextTask.idleCallbackId = setTimeout(
        () => this._processIdleTask(nextTask.id, this._createFakeDeadline()),
        Math.min(nextTask.timeout, 50) // Small delay to simulate idle
      );
    }
  }
  
  /**
   * Process an idle task
   * 
   * @param {string} taskId - Task ID to process
   * @param {IdleDeadline} deadline - Idle deadline object
   * @private
   */
  _processIdleTask(taskId, deadline) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }
    
    const idleTimeRemaining = deadline.timeRemaining();
    const didTimeout = deadline.didTimeout;
    
    // Check if we have enough idle time (unless timed out)
    if (!didTimeout && idleTimeRemaining < this.minIdleTime) {
      // Reschedule for next idle period
      this.runningTasks.delete(taskId);
      task.idleCallbackId = null;
      this._scheduleNext();
      return;
    }
    
    // Execute the task
    const startTime = performance.now();
    
    try {
      task.callback(deadline);
      this.stats.executed++;
      
      if (didTimeout) {
        this.stats.timedOut++;
      }
      
      const executionTime = performance.now() - startTime;
      this.stats.totalExecutionTime += executionTime;
      this.stats.totalIdleTime += idleTimeRemaining;
      
    } catch (error) {
      console.error(`[IdleScheduler] Task ${taskId} failed:`, error);
    }
    
    // Clean up
    this.tasks.delete(taskId);
    this.runningTasks.delete(taskId);
    
    // Schedule next task
    this._scheduleNext();
  }
  
  /**
   * Create fake deadline for setTimeout fallback
   * 
   * @returns {IdleDeadline} Fake deadline object
   * @private
   */
  _createFakeDeadline() {
    return {
      timeRemaining: () => 50, // Assume 50ms available
      didTimeout: false
    };
  }
  
  /**
   * Dispose scheduler and cancel all tasks
   */
  dispose() {
    this.cancelAll();
    this.tasks.clear();
    this.runningTasks.clear();
  }
}

/**
 * Global idle scheduler instance
 * @type {IdleScheduler|null}
 */
let globalScheduler = null;

/**
 * Get or create global idle scheduler instance
 * 
 * @param {Object} [options] - Scheduler options
 * @returns {IdleScheduler} Global scheduler instance
 */
export function getIdleScheduler(options) {
  if (!globalScheduler) {
    globalScheduler = new IdleScheduler(options);
  }
  return globalScheduler;
}

/**
 * Schedule task on global scheduler
 * 
 * @param {Function} callback - Task callback
 * @param {Object} [options] - Scheduling options
 * @returns {string} Task ID
 */
export function scheduleIdle(callback, options) {
  return getIdleScheduler().schedule(callback, options);
}

/**
 * Cancel task on global scheduler
 * 
 * @param {string} taskId - Task ID to cancel
 * @returns {boolean} True if cancelled
 */
export function cancelIdle(taskId) {
  return getIdleScheduler().cancel(taskId);
}