/**
 * @fileoverview Preemptor: Preempt low-priority executions for high-priority
 * 
 * Manages execution preemption, allowing high-priority tasks to interrupt
 * low-priority running tasks. Maintains execution state for resumption.
 * 
 * Related: PriorityQueue.js, ExecutionPlan.js, ExecutionTargetSelector.js
 * Documentation: See DESIGN_SYSTEM.md § Delegation Engine - Preemption
 * 
 * @module core/delegation-engine/Preemptor
 */

/**
 * Priority thresholds for preemption decisions
 * @enum {number}
 */
export const PreemptionThreshold = {
  CRITICAL: 1,    // Can preempt anything
  HIGH: 5,        // Can preempt medium and low
  MEDIUM: 10,     // Can preempt low only
  LOW: 15         // Cannot preempt
};

/**
 * Execution state for preempted tasks
 * @typedef {Object} PreemptedState
 * @property {string} executionId - Unique execution identifier
 * @property {Object} task - The task being executed
 * @property {number} priority - Task priority
 * @property {string} target - Execution target (main/worker/wasm/gpu)
 * @property {Object} checkpoint - Saved execution state
 * @property {number} preemptedAt - Timestamp of preemption
 * @property {number} progressPercent - Execution progress (0-100)
 * @property {AbortController} abortController - For cancellation
 */

/**
 * Preemptor manages execution preemption for priority scheduling
 * 
 * Features:
 * - Priority-based preemption decisions
 * - Execution state checkpointing
 * - Graceful task resumption
 * - Preemption cost estimation
 * - Starvation prevention
 * 
 * Performance: <1ms preemption decision time
 * 
 * @class
 */
export class Preemptor {
  constructor() {
    /** @type {Map<string, PreemptedState>} */
    this.preemptedTasks = new Map();
    
    /** @type {Map<string, Object>} */
    this.runningExecutions = new Map();
    
    /** @type {Map<string, number>} */
    this.preemptionCounts = new Map();
    
    /** @type {number} */
    this.maxPreemptionsPerTask = 3; // Prevent starvation
    
    /** @type {number} */
    this.preemptionCostMs = 5; // Estimated overhead
    
    /** @type {number} */
    this.totalPreemptions = 0;
    
    /** @type {number} */
    this.totalResumptions = 0;
  }

  /**
   * Determine if an incoming task should preempt running executions
   * 
   * @param {Object} incomingTask - Task requesting execution
   * @param {number} incomingPriority - Task priority
   * @returns {{shouldPreempt: boolean, targetExecution: string|null, reason: string}}
   */
  shouldPreempt(incomingTask, incomingPriority) {
    if (this.runningExecutions.size === 0) {
      return {
        shouldPreempt: false,
        targetExecution: null,
        reason: 'no_running_executions'
      };
    }

    // Find lowest priority running execution
    let lowestPriority = -1;
    let targetExecution = null;

    for (const [execId, execution] of this.runningExecutions.entries()) {
      if (execution.priority > lowestPriority) {
        // Check if this task has been preempted too many times (starvation prevention)
        const preemptCount = this.preemptionCounts.get(execution.task.id) || 0;
        if (preemptCount >= this.maxPreemptionsPerTask) {
          continue; // Protect from starvation
        }

        lowestPriority = execution.priority;
        targetExecution = execId;
      }
    }

    if (targetExecution === null) {
      return {
        shouldPreempt: false,
        targetExecution: null,
        reason: 'all_protected_from_starvation'
      };
    }

    // Preempt if incoming priority is significantly higher
    const priorityDelta = lowestPriority - incomingPriority;
    
    if (priorityDelta >= 5) { // Significant priority difference
      return {
        shouldPreempt: true,
        targetExecution,
        reason: `priority_delta_${priorityDelta}`
      };
    }

    return {
      shouldPreempt: false,
      targetExecution: null,
      reason: 'insufficient_priority_delta'
    };
  }

  /**
   * Preempt a running execution
   * 
   * @param {string} executionId - Execution to preempt
   * @returns {Promise<PreemptedState|null>}
   */
  async preempt(executionId) {
    const execution = this.runningExecutions.get(executionId);
    if (!execution) {
      console.warn(`[Preemptor] Cannot preempt unknown execution: ${executionId}`);
      return null;
    }

    const startTime = performance.now();

    try {
      // Signal abort to running execution
      if (execution.abortController) {
        execution.abortController.abort('preempted');
      }

      // Create checkpoint of current state
      const checkpoint = await this._createCheckpoint(execution);

      // Create preempted state
      const preemptedState = {
        executionId,
        task: execution.task,
        priority: execution.priority,
        target: execution.target,
        checkpoint,
        preemptedAt: Date.now(),
        progressPercent: execution.progressPercent || 0,
        abortController: execution.abortController
      };

      // Store preempted state
      this.preemptedTasks.set(executionId, preemptedState);
      
      // Remove from running
      this.runningExecutions.delete(executionId);

      // Track preemption count for starvation prevention
      const taskId = execution.task.id;
      const count = this.preemptionCounts.get(taskId) || 0;
      this.preemptionCounts.set(taskId, count + 1);

      this.totalPreemptions++;

      const duration = performance.now() - startTime;
      
      console.log(`[Preemptor] Preempted execution ${executionId} (${duration.toFixed(2)}ms)`);

      return preemptedState;

    } catch (error) {
      console.error(`[Preemptor] Failed to preempt execution ${executionId}:`, error);
      return null;
    }
  }

  /**
   * Resume a preempted execution
   * 
   * @param {string} executionId - Execution to resume
   * @returns {Promise<Object|null>} Restored execution context
   */
  async resume(executionId) {
    const preemptedState = this.preemptedTasks.get(executionId);
    if (!preemptedState) {
      console.warn(`[Preemptor] Cannot resume unknown execution: ${executionId}`);
      return null;
    }

    const startTime = performance.now();

    try {
      // Restore checkpoint
      const restoredContext = await this._restoreCheckpoint(preemptedState.checkpoint);

      // Create new abort controller for resumed execution
      const abortController = new AbortController();

      // Recreate running execution
      const execution = {
        executionId,
        task: preemptedState.task,
        priority: preemptedState.priority,
        target: preemptedState.target,
        progressPercent: preemptedState.progressPercent,
        abortController,
        resumedFrom: preemptedState.preemptedAt,
        context: restoredContext
      };

      // Move back to running
      this.runningExecutions.set(executionId, execution);
      this.preemptedTasks.delete(executionId);

      this.totalResumptions++;

      const duration = performance.now() - startTime;
      
      console.log(`[Preemptor] Resumed execution ${executionId} (${duration.toFixed(2)}ms)`);

      return execution;

    } catch (error) {
      console.error(`[Preemptor] Failed to resume execution ${executionId}:`, error);
      return null;
    }
  }

  /**
   * Register a running execution for preemption tracking
   * 
   * @param {string} executionId - Unique execution identifier
   * @param {Object} execution - Execution details
   */
  registerExecution(executionId, execution) {
    this.runningExecutions.set(executionId, {
      ...execution,
      registeredAt: Date.now()
    });
  }

  /**
   * Unregister a completed execution
   * 
   * @param {string} executionId - Execution identifier
   */
  unregisterExecution(executionId) {
    this.runningExecutions.delete(executionId);
    
    // Clear preemption count if task completed
    const execution = this.runningExecutions.get(executionId);
    if (execution) {
      this.preemptionCounts.delete(execution.task.id);
    }
  }

  /**
   * Create a checkpoint of execution state
   * 
   * @private
   * @param {Object} execution - Running execution
   * @returns {Promise<Object>} Checkpoint data
   */
  async _createCheckpoint(execution) {
    // Basic checkpoint - can be extended for specific execution types
    return {
      taskId: execution.task.id,
      target: execution.target,
      progress: execution.progressPercent || 0,
      timestamp: Date.now(),
      // Store any intermediate results or state
      intermediateState: execution.intermediateState || null
    };
  }

  /**
   * Restore execution state from checkpoint
   * 
   * @private
   * @param {Object} checkpoint - Checkpoint data
   * @returns {Promise<Object>} Restored context
   */
  async _restoreCheckpoint(checkpoint) {
    // Restore execution context from checkpoint
    return {
      taskId: checkpoint.taskId,
      target: checkpoint.target,
      resumeFrom: checkpoint.progress,
      intermediateState: checkpoint.intermediateState,
      restoredAt: Date.now()
    };
  }

  /**
   * Estimate cost of preempting an execution
   * 
   * @param {string} executionId - Execution to preempt
   * @returns {number} Estimated cost in milliseconds
   */
  estimatePreemptionCost(executionId) {
    const execution = this.runningExecutions.get(executionId);
    if (!execution) {
      return 0;
    }

    // Base cost
    let cost = this.preemptionCostMs;

    // Add checkpoint overhead based on progress
    const progress = execution.progressPercent || 0;
    cost += (progress / 100) * 2; // More progress = more state to save

    // Add target-specific overhead
    switch (execution.target) {
      case 'gpu':
        cost += 3; // GPU state transfer overhead
        break;
      case 'wasm':
        cost += 2; // WASM memory snapshot overhead
        break;
      case 'worker':
        cost += 1; // Worker message overhead
        break;
      default:
        cost += 0.5; // Main thread minimal overhead
    }

    return cost;
  }

  /**
   * Get all preempted tasks sorted by priority
   * 
   * @returns {PreemptedState[]}
   */
  getPreemptedTasks() {
    return Array.from(this.preemptedTasks.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get statistics about preemption
   * 
   * @returns {Object} Preemption statistics
   */
  getStats() {
    return {
      runningExecutions: this.runningExecutions.size,
      preemptedTasks: this.preemptedTasks.size,
      totalPreemptions: this.totalPreemptions,
      totalResumptions: this.totalResumptions,
      preemptionRate: this.totalPreemptions > 0 
        ? (this.totalResumptions / this.totalPreemptions * 100).toFixed(1) + '%'
        : '0%',
      tasksNearStarvation: Array.from(this.preemptionCounts.entries())
        .filter(([_, count]) => count >= this.maxPreemptionsPerTask - 1)
        .length
    };
  }

  /**
   * Clear all preempted tasks (emergency reset)
   */
  clearPreemptedTasks() {
    const count = this.preemptedTasks.size;
    this.preemptedTasks.clear();
    console.warn(`[Preemptor] Cleared ${count} preempted tasks`);
  }

  /**
   * Reset preemptor state
   */
  reset() {
    this.preemptedTasks.clear();
    this.runningExecutions.clear();
    this.preemptionCounts.clear();
    this.totalPreemptions = 0;
    this.totalResumptions = 0;
  }
}