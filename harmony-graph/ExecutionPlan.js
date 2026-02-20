/**
 * @fileoverview ExecutionPlan - Ordered plan of node executions with parallelization
 * 
 * Represents an optimized execution plan for graph queries with:
 * - Ordered execution stages
 * - Parallel execution within stages
 * - Dependency tracking between operations
 * - Cost estimation for optimization
 * - Support for pipeline execution
 * 
 * Vision Alignment: Supports reactive component system through efficient query execution
 * Performance: Enables parallel processing for sub-10ms query execution
 * 
 * @module harmony-graph/ExecutionPlan
 * @see {@link file://./QueryPlanner.js} - Creates execution plans
 * @see {@link file://./QueryExecutor.js} - Executes plans
 * @see {@link file://../DESIGN_SYSTEM.md#graph-engine} - Graph engine architecture
 */

/**
 * Execution stage containing operations that can run in parallel
 * @typedef {Object} ExecutionStage
 * @property {number} stageId - Unique stage identifier
 * @property {ExecutionNode[]} nodes - Operations in this stage (can run in parallel)
 * @property {number[]} dependencies - Stage IDs that must complete before this stage
 * @property {number} estimatedCost - Estimated execution cost (in microseconds)
 * @property {boolean} canParallelize - Whether operations can truly run in parallel
 */

/**
 * Individual execution operation within a stage
 * @typedef {Object} ExecutionNode
 * @property {string} nodeId - Unique node identifier
 * @property {string} operation - Operation type (scan, filter, join, aggregate, etc.)
 * @property {Object} params - Operation parameters
 * @property {string[]} inputBindings - Variable bindings from previous stages
 * @property {string[]} outputBindings - Variable bindings produced by this node
 * @property {number} estimatedCost - Estimated cost for this operation
 * @property {Object} metadata - Additional metadata for execution
 */

/**
 * Execution statistics for completed plans
 * @typedef {Object} ExecutionStats
 * @property {number} totalTime - Total execution time in milliseconds
 * @property {number} stagesExecuted - Number of stages executed
 * @property {number} nodesExecuted - Total nodes executed
 * @property {number} parallelNodes - Nodes executed in parallel
 * @property {number} peakMemory - Peak memory usage in bytes
 * @property {Object<string, number>} operationCounts - Count by operation type
 */

/**
 * ExecutionPlan - Manages ordered execution with parallelization
 * 
 * Features:
 * - Stage-based execution with dependency tracking
 * - Automatic parallelization of independent operations
 * - Cost-based optimization hints
 * - Pipeline execution support
 * - Execution statistics collection
 * 
 * Performance Targets:
 * - Plan creation: <1ms for typical queries
 * - Stage scheduling: <100μs per stage
 * - Memory overhead: <1KB per plan
 * 
 * @class
 */
export class ExecutionPlan {
  /**
   * Create a new execution plan
   * @param {Object} options - Plan configuration
   * @param {string} options.queryId - Query identifier
   * @param {ExecutionStage[]} [options.stages=[]] - Initial stages
   * @param {Object} [options.metadata={}] - Plan metadata
   */
  constructor(options = {}) {
    /** @type {string} */
    this.queryId = options.queryId || `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    /** @type {ExecutionStage[]} */
    this.stages = options.stages || [];
    
    /** @type {Object} */
    this.metadata = options.metadata || {};
    
    /** @type {number} */
    this.totalEstimatedCost = 0;
    
    /** @type {number} */
    this.maxParallelism = 0;
    
    /** @type {ExecutionStats|null} */
    this.stats = null;
    
    /** @type {Map<string, any>} */
    this.variableBindings = new Map();
    
    /** @type {number} */
    this.createdAt = Date.now();
    
    this._recalculateMetrics();
  }

  /**
   * Add a new execution stage to the plan
   * @param {ExecutionStage} stage - Stage to add
   * @returns {ExecutionPlan} This plan for chaining
   */
  addStage(stage) {
    // Validate stage
    if (!stage.stageId) {
      stage.stageId = this.stages.length;
    }
    
    if (!stage.nodes || stage.nodes.length === 0) {
      throw new Error('Stage must contain at least one execution node');
    }
    
    // Validate dependencies exist
    for (const depId of (stage.dependencies || [])) {
      if (!this.stages.some(s => s.stageId === depId)) {
        throw new Error(`Dependency stage ${depId} not found`);
      }
    }
    
    this.stages.push(stage);
    this._recalculateMetrics();
    
    return this;
  }

  /**
   * Add an execution node to a specific stage
   * @param {number} stageId - Target stage ID
   * @param {ExecutionNode} node - Node to add
   * @returns {ExecutionPlan} This plan for chaining
   */
  addNodeToStage(stageId, node) {
    const stage = this.stages.find(s => s.stageId === stageId);
    if (!stage) {
      throw new Error(`Stage ${stageId} not found`);
    }
    
    // Validate node
    if (!node.nodeId) {
      node.nodeId = `node-${stageId}-${stage.nodes.length}`;
    }
    
    if (!node.operation) {
      throw new Error('Execution node must have an operation type');
    }
    
    stage.nodes.push(node);
    this._recalculateMetrics();
    
    return this;
  }

  /**
   * Get stages in execution order (respecting dependencies)
   * @returns {ExecutionStage[]} Ordered stages
   */
  getExecutionOrder() {
    const executed = new Set();
    const order = [];
    
    while (order.length < this.stages.length) {
      let progress = false;
      
      for (const stage of this.stages) {
        if (executed.has(stage.stageId)) {
          continue;
        }
        
        // Check if all dependencies are satisfied
        const depsReady = (stage.dependencies || []).every(depId => executed.has(depId));
        
        if (depsReady) {
          order.push(stage);
          executed.add(stage.stageId);
          progress = true;
        }
      }
      
      if (!progress) {
        throw new Error('Circular dependency detected in execution plan');
      }
    }
    
    return order;
  }

  /**
   * Get stages that can execute in parallel at a given point
   * @param {Set<number>} completedStages - Set of completed stage IDs
   * @returns {ExecutionStage[]} Stages ready to execute
   */
  getParallelStages(completedStages) {
    const ready = [];
    
    for (const stage of this.stages) {
      if (completedStages.has(stage.stageId)) {
        continue;
      }
      
      // Check if all dependencies are complete
      const depsComplete = (stage.dependencies || []).every(depId => 
        completedStages.has(depId)
      );
      
      if (depsComplete) {
        ready.push(stage);
      }
    }
    
    return ready;
  }

  /**
   * Optimize the execution plan
   * @param {Object} options - Optimization options
   * @param {boolean} [options.mergeStages=true] - Merge compatible stages
   * @param {boolean} [options.reorderNodes=true] - Reorder nodes within stages
   * @param {number} [options.maxParallelism=4] - Maximum parallel operations
   * @returns {ExecutionPlan} Optimized plan (may be new instance)
   */
  optimize(options = {}) {
    const {
      mergeStages = true,
      reorderNodes = true,
      maxParallelism = 4
    } = options;
    
    let optimized = this;
    
    // Merge stages with no dependencies that can run together
    if (mergeStages) {
      optimized = this._mergeCompatibleStages(maxParallelism);
    }
    
    // Reorder nodes within stages by cost (expensive operations first)
    if (reorderNodes) {
      optimized = optimized._reorderNodesByCost();
    }
    
    return optimized;
  }

  /**
   * Merge compatible stages to increase parallelism
   * @private
   * @param {number} maxParallelism - Maximum parallel operations
   * @returns {ExecutionPlan} New plan with merged stages
   */
  _mergeCompatibleStages(maxParallelism) {
    const newPlan = new ExecutionPlan({
      queryId: this.queryId,
      metadata: { ...this.metadata, optimized: true }
    });
    
    const processed = new Set();
    
    for (const stage of this.stages) {
      if (processed.has(stage.stageId)) {
        continue;
      }
      
      // Find stages with same dependencies that can merge
      const compatible = this.stages.filter(s => 
        !processed.has(s.stageId) &&
        s.canParallelize !== false &&
        this._sameDependencies(s.dependencies, stage.dependencies) &&
        (stage.nodes.length + s.nodes.length) <= maxParallelism
      );
      
      if (compatible.length > 1) {
        // Merge into single stage
        const mergedStage = {
          stageId: newPlan.stages.length,
          nodes: compatible.flatMap(s => s.nodes),
          dependencies: stage.dependencies || [],
          estimatedCost: Math.max(...compatible.map(s => s.estimatedCost || 0)),
          canParallelize: true,
          metadata: { merged: true, originalStages: compatible.map(s => s.stageId) }
        };
        
        newPlan.addStage(mergedStage);
        compatible.forEach(s => processed.add(s.stageId));
      } else {
        // Keep stage as-is
        newPlan.addStage({ ...stage, stageId: newPlan.stages.length });
        processed.add(stage.stageId);
      }
    }
    
    return newPlan;
  }

  /**
   * Reorder nodes within stages by cost
   * @private
   * @returns {ExecutionPlan} New plan with reordered nodes
   */
  _reorderNodesByCost() {
    const newPlan = new ExecutionPlan({
      queryId: this.queryId,
      metadata: { ...this.metadata, reordered: true }
    });
    
    for (const stage of this.stages) {
      const reorderedNodes = [...stage.nodes].sort((a, b) => 
        (b.estimatedCost || 0) - (a.estimatedCost || 0)
      );
      
      newPlan.addStage({
        ...stage,
        nodes: reorderedNodes
      });
    }
    
    return newPlan;
  }

  /**
   * Check if two dependency arrays are the same
   * @private
   * @param {number[]} deps1 - First dependency array
   * @param {number[]} deps2 - Second dependency array
   * @returns {boolean} True if dependencies match
   */
  _sameDependencies(deps1, deps2) {
    const d1 = deps1 || [];
    const d2 = deps2 || [];
    
    if (d1.length !== d2.length) {
      return false;
    }
    
    const set1 = new Set(d1);
    return d2.every(d => set1.has(d));
  }

  /**
   * Recalculate plan metrics
   * @private
   */
  _recalculateMetrics() {
    this.totalEstimatedCost = this.stages.reduce((sum, stage) => 
      sum + (stage.estimatedCost || 0), 0
    );
    
    this.maxParallelism = Math.max(
      ...this.stages.map(stage => stage.nodes.length),
      0
    );
  }

  /**
   * Record execution statistics
   * @param {ExecutionStats} stats - Execution statistics
   */
  recordStats(stats) {
    this.stats = {
      ...stats,
      recordedAt: Date.now()
    };
  }

  /**
   * Get a summary of the execution plan
   * @returns {Object} Plan summary
   */
  getSummary() {
    const totalNodes = this.stages.reduce((sum, stage) => sum + stage.nodes.length, 0);
    const parallelStages = this.stages.filter(s => s.nodes.length > 1).length;
    
    return {
      queryId: this.queryId,
      stageCount: this.stages.length,
      nodeCount: totalNodes,
      parallelStages,
      maxParallelism: this.maxParallelism,
      estimatedCost: this.totalEstimatedCost,
      hasStats: this.stats !== null,
      metadata: this.metadata
    };
  }

  /**
   * Serialize plan to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      queryId: this.queryId,
      stages: this.stages,
      metadata: this.metadata,
      totalEstimatedCost: this.totalEstimatedCost,
      maxParallelism: this.maxParallelism,
      stats: this.stats,
      createdAt: this.createdAt
    };
  }

  /**
   * Create plan from JSON
   * @param {Object} json - JSON representation
   * @returns {ExecutionPlan} Restored plan
   */
  static fromJSON(json) {
    const plan = new ExecutionPlan({
      queryId: json.queryId,
      stages: json.stages,
      metadata: json.metadata
    });
    
    plan.stats = json.stats;
    plan.createdAt = json.createdAt;
    
    return plan;
  }

  /**
   * Create a simple sequential plan
   * @param {ExecutionNode[]} nodes - Nodes to execute sequentially
   * @param {string} [queryId] - Optional query ID
   * @returns {ExecutionPlan} Sequential execution plan
   */
  static createSequential(nodes, queryId) {
    const plan = new ExecutionPlan({ queryId });
    
    nodes.forEach((node, index) => {
      plan.addStage({
        stageId: index,
        nodes: [node],
        dependencies: index > 0 ? [index - 1] : [],
        estimatedCost: node.estimatedCost || 0,
        canParallelize: false
      });
    });
    
    return plan;
  }

  /**
   * Create a parallel plan for independent operations
   * @param {ExecutionNode[]} nodes - Nodes to execute in parallel
   * @param {string} [queryId] - Optional query ID
   * @returns {ExecutionPlan} Parallel execution plan
   */
  static createParallel(nodes, queryId) {
    const plan = new ExecutionPlan({ queryId });
    
    plan.addStage({
      stageId: 0,
      nodes: nodes,
      dependencies: [],
      estimatedCost: Math.max(...nodes.map(n => n.estimatedCost || 0)),
      canParallelize: true
    });
    
    return plan;
  }
}

/**
 * ExecutionPlanBuilder - Fluent API for building execution plans
 * 
 * @class
 */
export class ExecutionPlanBuilder {
  constructor(queryId) {
    this.plan = new ExecutionPlan({ queryId });
    this.currentStage = null;
  }

  /**
   * Start a new stage
   * @param {Object} [options={}] - Stage options
   * @returns {ExecutionPlanBuilder} This builder for chaining
   */
  startStage(options = {}) {
    this.currentStage = {
      stageId: this.plan.stages.length,
      nodes: [],
      dependencies: options.dependencies || [],
      estimatedCost: 0,
      canParallelize: options.canParallelize !== false,
      metadata: options.metadata || {}
    };
    
    return this;
  }

  /**
   * Add a node to the current stage
   * @param {ExecutionNode} node - Node to add
   * @returns {ExecutionPlanBuilder} This builder for chaining
   */
  addNode(node) {
    if (!this.currentStage) {
      this.startStage();
    }
    
    this.currentStage.nodes.push(node);
    this.currentStage.estimatedCost += (node.estimatedCost || 0);
    
    return this;
  }

  /**
   * Complete the current stage and add it to the plan
   * @returns {ExecutionPlanBuilder} This builder for chaining
   */
  endStage() {
    if (this.currentStage && this.currentStage.nodes.length > 0) {
      this.plan.addStage(this.currentStage);
      this.currentStage = null;
    }
    
    return this;
  }

  /**
   * Build the final execution plan
   * @returns {ExecutionPlan} Completed plan
   */
  build() {
    if (this.currentStage) {
      this.endStage();
    }
    
    return this.plan;
  }
}