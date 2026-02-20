/**
 * @fileoverview AdaptiveScheduler - Adjusts execution strategy based on runtime metrics
 * @module performance/adaptive-scheduler
 * 
 * Monitors performance metrics (frame time, memory usage, task duration) and
 * dynamically adjusts scheduling strategies to maintain performance targets.
 * 
 * Related: DESIGN_SYSTEM.md § Performance Management
 */

/**
 * Execution strategy types
 * @enum {string}
 */
export const ExecutionStrategy = {
  IMMEDIATE: 'immediate',        // Execute immediately (low load)
  BATCHED: 'batched',           // Batch multiple tasks (moderate load)
  THROTTLED: 'throttled',       // Throttle execution rate (high load)
  DEFERRED: 'deferred',         // Defer non-critical tasks (critical load)
  IDLE: 'idle'                  // Execute only during idle periods (overload)
};

/**
 * Priority levels for tasks
 * @enum {number}
 */
export const Priority = {
  CRITICAL: 0,    // Must execute (audio, user input)
  HIGH: 1,        // Important (rendering, state updates)
  NORMAL: 2,      // Standard operations
  LOW: 3,         // Background work
  IDLE: 4         // Can be deferred indefinitely
};

/**
 * Runtime metrics thresholds
 * @typedef {Object} MetricsThresholds
 * @property {number} frameTimeWarning - Frame time warning threshold (ms)
 * @property {number} frameTimeCritical - Frame time critical threshold (ms)
 * @property {number} memoryWarning - Memory warning threshold (MB)
 * @property {number} memoryCritical - Memory critical threshold (MB)
 * @property {number} taskQueueWarning - Task queue warning threshold
 * @property {number} taskQueueCritical - Task queue critical threshold
 */

/**
 * Current runtime metrics
 * @typedef {Object} RuntimeMetrics
 * @property {number} averageFrameTime - Average frame time over last N frames (ms)
 * @property {number} peakFrameTime - Peak frame time in current window (ms)
 * @property {number} memoryUsage - Current memory usage (MB)
 * @property {number} taskQueueLength - Number of pending tasks
 * @property {number} cpuUtilization - Estimated CPU utilization (0-1)
 * @property {number} droppedFrames - Number of dropped frames in window
 */

/**
 * AdaptiveScheduler - Dynamically adjusts execution strategy based on runtime metrics
 * 
 * @example
 * const scheduler = new AdaptiveScheduler({
 *   frameTimeWarning: 12,
 *   frameTimeCritical: 14
 * });
 * 
 * scheduler.schedule(() => {
 *   // Heavy computation
 * }, Priority.NORMAL);
 * 
 * // Scheduler automatically adjusts strategy based on load
 */
export class AdaptiveScheduler {
  /**
   * @param {Partial<MetricsThresholds>} thresholds - Custom threshold configuration
   */
  constructor(thresholds = {}) {
    /** @type {MetricsThresholds} */
    this.thresholds = {
      frameTimeWarning: 12,      // 12ms leaves 4ms buffer for 60fps
      frameTimeCritical: 14,     // 14ms is danger zone
      memoryWarning: 40,         // 40MB of 50MB budget
      memoryCritical: 45,        // 45MB is critical
      taskQueueWarning: 50,      // 50 pending tasks
      taskQueueCritical: 100,    // 100 pending tasks
      ...thresholds
    };

    /** @type {ExecutionStrategy} */
    this.currentStrategy = ExecutionStrategy.IMMEDIATE;

    /** @type {RuntimeMetrics} */
    this.metrics = {
      averageFrameTime: 0,
      peakFrameTime: 0,
      memoryUsage: 0,
      taskQueueLength: 0,
      cpuUtilization: 0,
      droppedFrames: 0
    };

    /** @type {Array<{fn: Function, priority: Priority, addedAt: number}>} */
    this.taskQueue = [];

    /** @type {Array<number>} */
    this.frameTimeSamples = [];
    
    /** @type {number} */
    this.maxFrameSamples = 60; // Track last 60 frames (1 second at 60fps)

    /** @type {number|null} */
    this.lastFrameTime = null;

    /** @type {number} */
    this.batchSize = 5; // Number of tasks to process in batched mode

    /** @type {number} */
    this.throttleDelay = 16; // Delay between task executions in throttled mode

    /** @type {number|null} */
    this.rafId = null;

    /** @type {number|null} */
    this.idleCallbackId = null;

    /** @type {boolean} */
    this.isProcessing = false;

    /** @type {Array<Function>} */
    this.strategyChangeListeners = [];

    this._startMonitoring();
  }

  /**
   * Start monitoring runtime metrics
   * @private
   */
  _startMonitoring() {
    this._measureFrame();
    this._measureMemory();
  }

  /**
   * Measure frame time continuously
   * @private
   */
  _measureFrame() {
    const measure = (timestamp) => {
      if (this.lastFrameTime !== null) {
        const frameTime = timestamp - this.lastFrameTime;
        this.frameTimeSamples.push(frameTime);
        
        if (this.frameTimeSamples.length > this.maxFrameSamples) {
          this.frameTimeSamples.shift();
        }

        this._updateMetrics();
        this._adjustStrategy();
      }
      
      this.lastFrameTime = timestamp;
      this.rafId = requestAnimationFrame(measure);
    };

    this.rafId = requestAnimationFrame(measure);
  }

  /**
   * Measure memory usage periodically
   * @private
   */
  _measureMemory() {
    const measure = () => {
      if (performance.memory) {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
      }
      setTimeout(measure, 1000); // Check every second
    };

    measure();
  }

  /**
   * Update runtime metrics from samples
   * @private
   */
  _updateMetrics() {
    if (this.frameTimeSamples.length === 0) return;

    const sum = this.frameTimeSamples.reduce((a, b) => a + b, 0);
    this.metrics.averageFrameTime = sum / this.frameTimeSamples.length;
    this.metrics.peakFrameTime = Math.max(...this.frameTimeSamples);
    this.metrics.taskQueueLength = this.taskQueue.length;
    
    // Count dropped frames (frame time > 16.67ms)
    this.metrics.droppedFrames = this.frameTimeSamples.filter(t => t > 16.67).length;
    
    // Estimate CPU utilization based on frame time
    this.metrics.cpuUtilization = Math.min(1, this.metrics.averageFrameTime / 16);
  }

  /**
   * Adjust execution strategy based on current metrics
   * @private
   */
  _adjustStrategy() {
    const oldStrategy = this.currentStrategy;
    let newStrategy = ExecutionStrategy.IMMEDIATE;

    // Critical conditions - use idle strategy
    if (
      this.metrics.averageFrameTime > this.thresholds.frameTimeCritical ||
      this.metrics.memoryUsage > this.thresholds.memoryCritical ||
      this.metrics.taskQueueLength > this.thresholds.taskQueueCritical ||
      this.metrics.droppedFrames > 10
    ) {
      newStrategy = ExecutionStrategy.IDLE;
    }
    // High load - defer non-critical tasks
    else if (
      this.metrics.averageFrameTime > this.thresholds.frameTimeWarning ||
      this.metrics.memoryUsage > this.thresholds.memoryWarning ||
      this.metrics.taskQueueLength > this.thresholds.taskQueueWarning ||
      this.metrics.droppedFrames > 5
    ) {
      newStrategy = ExecutionStrategy.DEFERRED;
    }
    // Moderate load - throttle execution
    else if (
      this.metrics.averageFrameTime > 10 ||
      this.metrics.taskQueueLength > 20 ||
      this.metrics.cpuUtilization > 0.7
    ) {
      newStrategy = ExecutionStrategy.THROTTLED;
    }
    // Some load - batch tasks
    else if (
      this.metrics.averageFrameTime > 8 ||
      this.metrics.taskQueueLength > 10 ||
      this.metrics.cpuUtilization > 0.5
    ) {
      newStrategy = ExecutionStrategy.BATCHED;
    }
    // Low load - immediate execution
    else {
      newStrategy = ExecutionStrategy.IMMEDIATE;
    }

    if (newStrategy !== oldStrategy) {
      this.currentStrategy = newStrategy;
      this._notifyStrategyChange(oldStrategy, newStrategy);
      console.log(`[AdaptiveScheduler] Strategy changed: ${oldStrategy} → ${newStrategy}`, {
        metrics: { ...this.metrics }
      });
    }
  }

  /**
   * Notify listeners of strategy change
   * @private
   * @param {ExecutionStrategy} oldStrategy
   * @param {ExecutionStrategy} newStrategy
   */
  _notifyStrategyChange(oldStrategy, newStrategy) {
    this.strategyChangeListeners.forEach(listener => {
      try {
        listener(newStrategy, oldStrategy, { ...this.metrics });
      } catch (error) {
        console.error('[AdaptiveScheduler] Error in strategy change listener:', error);
      }
    });
  }

  /**
   * Schedule a task for execution
   * @param {Function} fn - Task function to execute
   * @param {Priority} priority - Task priority level
   * @returns {Promise<any>} Promise that resolves with task result
   */
  schedule(fn, priority = Priority.NORMAL) {
    return new Promise((resolve, reject) => {
      const task = {
        fn,
        priority,
        addedAt: performance.now(),
        resolve,
        reject
      };

      this.taskQueue.push(task);
      this._sortTaskQueue();
      
      if (!this.isProcessing) {
        this._processQueue();
      }
    });
  }

  /**
   * Sort task queue by priority
   * @private
   */
  _sortTaskQueue() {
    this.taskQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Process task queue based on current strategy
   * @private
   */
  async _processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) return;

    this.isProcessing = true;

    switch (this.currentStrategy) {
      case ExecutionStrategy.IMMEDIATE:
        await this._processImmediate();
        break;
      case ExecutionStrategy.BATCHED:
        await this._processBatched();
        break;
      case ExecutionStrategy.THROTTLED:
        await this._processThrottled();
        break;
      case ExecutionStrategy.DEFERRED:
        await this._processDeferred();
        break;
      case ExecutionStrategy.IDLE:
        await this._processIdle();
        break;
    }

    this.isProcessing = false;

    // Continue processing if tasks remain
    if (this.taskQueue.length > 0) {
      requestAnimationFrame(() => this._processQueue());
    }
  }

  /**
   * Process tasks immediately
   * @private
   */
  async _processImmediate() {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      await this._executeTask(task);
      
      // Check if strategy changed during execution
      if (this.currentStrategy !== ExecutionStrategy.IMMEDIATE) {
        break;
      }
    }
  }

  /**
   * Process tasks in batches
   * @private
   */
  async _processBatched() {
    const batch = this.taskQueue.splice(0, this.batchSize);
    
    for (const task of batch) {
      await this._executeTask(task);
    }
  }

  /**
   * Process tasks with throttling
   * @private
   */
  async _processThrottled() {
    if (this.taskQueue.length === 0) return;

    const task = this.taskQueue.shift();
    await this._executeTask(task);
    
    // Wait before processing next task
    await new Promise(resolve => setTimeout(resolve, this.throttleDelay));
  }

  /**
   * Process only critical tasks, defer others
   * @private
   */
  async _processDeferred() {
    // Only process critical and high priority tasks
    const criticalTasks = this.taskQueue.filter(
      t => t.priority <= Priority.HIGH
    );
    
    if (criticalTasks.length > 0) {
      const task = criticalTasks[0];
      const index = this.taskQueue.indexOf(task);
      this.taskQueue.splice(index, 1);
      await this._executeTask(task);
    }
  }

  /**
   * Process tasks only during idle periods
   * @private
   */
  async _processIdle() {
    // Only process critical tasks immediately
    const criticalTask = this.taskQueue.find(t => t.priority === Priority.CRITICAL);
    
    if (criticalTask) {
      const index = this.taskQueue.indexOf(criticalTask);
      this.taskQueue.splice(index, 1);
      await this._executeTask(criticalTask);
      return;
    }

    // Schedule other tasks during idle time
    if ('requestIdleCallback' in window) {
      this.idleCallbackId = requestIdleCallback((deadline) => {
        while (deadline.timeRemaining() > 0 && this.taskQueue.length > 0) {
          const task = this.taskQueue.shift();
          this._executeTask(task);
        }
      });
    }
  }

  /**
   * Execute a single task
   * @private
   * @param {Object} task - Task to execute
   */
  async _executeTask(task) {
    const startTime = performance.now();
    
    try {
      const result = await task.fn();
      task.resolve(result);
      
      const duration = performance.now() - startTime;
      
      if (duration > 16) {
        console.warn(`[AdaptiveScheduler] Long task detected: ${duration.toFixed(2)}ms`, {
          priority: task.priority,
          queueTime: startTime - task.addedAt
        });
      }
    } catch (error) {
      console.error('[AdaptiveScheduler] Task execution error:', error);
      task.reject(error);
    }
  }

  /**
   * Add listener for strategy changes
   * @param {Function} listener - Callback function (newStrategy, oldStrategy, metrics) => void
   */
  onStrategyChange(listener) {
    this.strategyChangeListeners.push(listener);
  }

  /**
   * Remove strategy change listener
   * @param {Function} listener - Listener to remove
   */
  offStrategyChange(listener) {
    const index = this.strategyChangeListeners.indexOf(listener);
    if (index !== -1) {
      this.strategyChangeListeners.splice(index, 1);
    }
  }

  /**
   * Get current runtime metrics
   * @returns {RuntimeMetrics} Current metrics snapshot
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get current execution strategy
   * @returns {ExecutionStrategy} Current strategy
   */
  getStrategy() {
    return this.currentStrategy;
  }

  /**
   * Get pending task count by priority
   * @returns {Object<Priority, number>} Task counts by priority
   */
  getTaskCounts() {
    const counts = {
      [Priority.CRITICAL]: 0,
      [Priority.HIGH]: 0,
      [Priority.NORMAL]: 0,
      [Priority.LOW]: 0,
      [Priority.IDLE]: 0
    };

    this.taskQueue.forEach(task => {
      counts[task.priority]++;
    });

    return counts;
  }

  /**
   * Clear all pending tasks
   * @param {Priority} [minPriority] - Only clear tasks with priority >= minPriority
   */
  clearTasks(minPriority = Priority.IDLE) {
    const cleared = [];
    
    this.taskQueue = this.taskQueue.filter(task => {
      if (task.priority >= minPriority) {
        cleared.push(task);
        task.reject(new Error('Task cleared by scheduler'));
        return false;
      }
      return true;
    });

    console.log(`[AdaptiveScheduler] Cleared ${cleared.length} tasks`);
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.idleCallbackId !== null) {
      cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }

    this.clearTasks(Priority.CRITICAL);
    this.strategyChangeListeners = [];
  }
}