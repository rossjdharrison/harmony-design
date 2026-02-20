/**
 * @fileoverview PlanOptimizer - Optimizes execution plans for maximum parallelism
 * 
 * This module analyzes execution plans and reorganizes them to maximize parallel
 * execution opportunities while respecting data dependencies. It identifies
 * independent operations that can run concurrently and groups them into parallel
 * execution stages.
 * 
 * Key Features:
 * - Dependency graph analysis to identify parallelizable operations
 * - Stage grouping for concurrent execution
 * - Critical path identification for performance optimization
 * - Resource-aware optimization (respects memory and CPU constraints)
 * 
 * Related: See DESIGN_SYSTEM.md § Query Execution Engine
 * 
 * @module core/graph-query/PlanOptimizer
 */

/**
 * Represents an optimized execution plan with parallel stages
 * @typedef {Object} OptimizedPlan
 * @property {Array<Array<Object>>} stages - Array of stages, each containing parallel operations
 * @property {number} estimatedParallelism - Average parallelism factor
 * @property {Array<string>} criticalPath - Sequence of operation IDs on the critical path
 * @property {Object} metrics - Optimization metrics
 */

/**
 * Represents a dependency between operations
 * @typedef {Object} Dependency
 * @property {string} from - Source operation ID
 * @property {string} to - Target operation ID
 * @property {string} type - Type of dependency (data, control, resource)
 */

export class PlanOptimizer {
  constructor() {
    /**
     * @private
     * @type {Map<string, Set<string>>}
     */
    this.dependencyGraph = new Map();
    
    /**
     * @private
     * @type {Map<string, number>}
     */
    this.operationCosts = new Map();
    
    /**
     * @private
     * @type {Object}
     */
    this.config = {
      maxParallelOps: 8, // Maximum concurrent operations
      enableResourceOptimization: true,
      enableCriticalPathAnalysis: true,
      minStageSize: 1 // Minimum operations per stage
    };
  }

  /**
   * Configures the optimizer with custom settings
   * @param {Object} config - Configuration options
   * @param {number} [config.maxParallelOps] - Maximum concurrent operations
   * @param {boolean} [config.enableResourceOptimization] - Enable resource-aware optimization
   * @param {boolean} [config.enableCriticalPathAnalysis] - Enable critical path analysis
   * @param {number} [config.minStageSize] - Minimum operations per stage
   */
  configure(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Optimizes an execution plan for maximum parallelism
   * @param {Object} plan - The execution plan to optimize
   * @param {Array<Object>} plan.steps - Array of execution steps
   * @returns {OptimizedPlan} The optimized plan with parallel stages
   */
  optimize(plan) {
    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('Invalid execution plan: must have steps array');
    }

    // Reset internal state
    this.dependencyGraph.clear();
    this.operationCosts.clear();

    // Build dependency graph
    this._buildDependencyGraph(plan.steps);

    // Perform topological sort with level assignment
    const levels = this._assignLevels();

    // Group operations into parallel stages
    const stages = this._groupIntoStages(levels, plan.steps);

    // Optimize stage boundaries if enabled
    const optimizedStages = this.config.enableResourceOptimization
      ? this._optimizeStages(stages)
      : stages;

    // Calculate critical path if enabled
    const criticalPath = this.config.enableCriticalPathAnalysis
      ? this._calculateCriticalPath()
      : [];

    // Calculate metrics
    const metrics = this._calculateMetrics(optimizedStages, plan.steps);

    return {
      stages: optimizedStages,
      estimatedParallelism: metrics.avgParallelism,
      criticalPath,
      metrics
    };
  }

  /**
   * Builds a dependency graph from execution steps
   * @private
   * @param {Array<Object>} steps - Execution steps
   */
  _buildDependencyGraph(steps) {
    // Initialize nodes
    steps.forEach(step => {
      this.dependencyGraph.set(step.id, new Set());
      this.operationCosts.set(step.id, step.estimatedCost || 1);
    });

    // Build edges based on dependencies
    steps.forEach(step => {
      if (step.dependsOn && Array.isArray(step.dependsOn)) {
        step.dependsOn.forEach(depId => {
          if (this.dependencyGraph.has(depId)) {
            this.dependencyGraph.get(depId).add(step.id);
          }
        });
      }
    });
  }

  /**
   * Assigns each operation to a level (execution stage) using topological sort
   * @private
   * @returns {Map<number, Set<string>>} Map of level to operation IDs
   */
  _assignLevels() {
    const levels = new Map();
    const inDegree = new Map();
    const opLevel = new Map();

    // Calculate in-degree for each node
    this.dependencyGraph.forEach((_, nodeId) => {
      inDegree.set(nodeId, 0);
    });

    this.dependencyGraph.forEach((children, _) => {
      children.forEach(childId => {
        inDegree.set(childId, (inDegree.get(childId) || 0) + 1);
      });
    });

    // Find all nodes with in-degree 0 (no dependencies)
    const queue = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
        opLevel.set(nodeId, 0);
      }
    });

    // Process queue and assign levels
    while (queue.length > 0) {
      const nodeId = queue.shift();
      const currentLevel = opLevel.get(nodeId);

      // Add to level set
      if (!levels.has(currentLevel)) {
        levels.set(currentLevel, new Set());
      }
      levels.get(currentLevel).add(nodeId);

      // Process children
      const children = this.dependencyGraph.get(nodeId);
      if (children) {
        children.forEach(childId => {
          const newDegree = inDegree.get(childId) - 1;
          inDegree.set(childId, newDegree);

          // Update child's level
          const childLevel = Math.max(
            opLevel.get(childId) || 0,
            currentLevel + 1
          );
          opLevel.set(childId, childLevel);

          if (newDegree === 0) {
            queue.push(childId);
          }
        });
      }
    }

    // Check for cycles
    if (opLevel.size !== this.dependencyGraph.size) {
      throw new Error('Circular dependency detected in execution plan');
    }

    return levels;
  }

  /**
   * Groups operations into executable stages
   * @private
   * @param {Map<number, Set<string>>} levels - Level assignments
   * @param {Array<Object>} steps - Original execution steps
   * @returns {Array<Array<Object>>} Array of stages
   */
  _groupIntoStages(levels, steps) {
    const stepMap = new Map(steps.map(step => [step.id, step]));
    const stages = [];

    // Sort levels by number
    const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);

    sortedLevels.forEach(levelNum => {
      const opsInLevel = levels.get(levelNum);
      const stageOps = Array.from(opsInLevel)
        .map(opId => stepMap.get(opId))
        .filter(op => op !== undefined);

      if (stageOps.length > 0) {
        stages.push(stageOps);
      }
    });

    return stages;
  }

  /**
   * Optimizes stage boundaries based on resource constraints
   * @private
   * @param {Array<Array<Object>>} stages - Initial stages
   * @returns {Array<Array<Object>>} Optimized stages
   */
  _optimizeStages(stages) {
    const optimized = [];

    for (const stage of stages) {
      if (stage.length <= this.config.maxParallelOps) {
        // Stage fits within parallel limit
        optimized.push(stage);
      } else {
        // Split large stage into multiple sub-stages
        const subStages = this._splitStage(stage);
        optimized.push(...subStages);
      }
    }

    // Merge small adjacent stages if possible
    return this._mergeSmallStages(optimized);
  }

  /**
   * Splits a large stage into smaller sub-stages
   * @private
   * @param {Array<Object>} stage - Stage to split
   * @returns {Array<Array<Object>>} Array of sub-stages
   */
  _splitStage(stage) {
    const subStages = [];
    const maxOps = this.config.maxParallelOps;

    // Sort by cost (descending) for better load balancing
    const sorted = [...stage].sort((a, b) => {
      const costA = this.operationCosts.get(a.id) || 1;
      const costB = this.operationCosts.get(b.id) || 1;
      return costB - costA;
    });

    for (let i = 0; i < sorted.length; i += maxOps) {
      subStages.push(sorted.slice(i, i + maxOps));
    }

    return subStages;
  }

  /**
   * Merges small adjacent stages to improve efficiency
   * @private
   * @param {Array<Array<Object>>} stages - Stages to merge
   * @returns {Array<Array<Object>>} Merged stages
   */
  _mergeSmallStages(stages) {
    if (stages.length <= 1) {
      return stages;
    }

    const merged = [];
    let currentStage = [...stages[0]];

    for (let i = 1; i < stages.length; i++) {
      const nextStage = stages[i];
      const combinedSize = currentStage.length + nextStage.length;

      // Check if we can merge without violating dependencies
      if (combinedSize <= this.config.maxParallelOps &&
          this._canMergeStages(currentStage, nextStage)) {
        currentStage.push(...nextStage);
      } else {
        merged.push(currentStage);
        currentStage = [...nextStage];
      }
    }

    merged.push(currentStage);
    return merged;
  }

  /**
   * Checks if two stages can be safely merged
   * @private
   * @param {Array<Object>} stage1 - First stage
   * @param {Array<Object>} stage2 - Second stage
   * @returns {boolean} True if stages can be merged
   */
  _canMergeStages(stage1, stage2) {
    // Check if any operation in stage2 depends on stage1
    const stage1Ids = new Set(stage1.map(op => op.id));

    for (const op of stage2) {
      if (op.dependsOn && op.dependsOn.some(depId => stage1Ids.has(depId))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculates the critical path through the execution plan
   * @private
   * @returns {Array<string>} Array of operation IDs on critical path
   */
  _calculateCriticalPath() {
    const distances = new Map();
    const predecessors = new Map();

    // Initialize distances
    this.dependencyGraph.forEach((_, nodeId) => {
      distances.set(nodeId, 0);
    });

    // Find nodes with no dependencies (starting nodes)
    const reverseDeps = new Map();
    this.dependencyGraph.forEach((children, nodeId) => {
      children.forEach(childId => {
        if (!reverseDeps.has(childId)) {
          reverseDeps.set(childId, new Set());
        }
        reverseDeps.get(childId).add(nodeId);
      });
    });

    // Topological sort with longest path calculation
    const visited = new Set();
    const stack = [];

    const dfs = (nodeId) => {
      visited.add(nodeId);
      const children = this.dependencyGraph.get(nodeId);
      
      if (children) {
        children.forEach(childId => {
          if (!visited.has(childId)) {
            dfs(childId);
          }
        });
      }
      
      stack.push(nodeId);
    };

    // Start DFS from all nodes
    this.dependencyGraph.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    });

    // Process in reverse topological order
    while (stack.length > 0) {
      const nodeId = stack.pop();
      const nodeCost = this.operationCosts.get(nodeId) || 1;
      const deps = reverseDeps.get(nodeId);

      if (deps) {
        deps.forEach(depId => {
          const newDistance = distances.get(depId) + nodeCost;
          if (newDistance > distances.get(nodeId)) {
            distances.set(nodeId, newDistance);
            predecessors.set(nodeId, depId);
          }
        });
      }
    }

    // Find the node with maximum distance (end of critical path)
    let maxDistance = 0;
    let endNode = null;

    distances.forEach((distance, nodeId) => {
      if (distance > maxDistance) {
        maxDistance = distance;
        endNode = nodeId;
      }
    });

    // Reconstruct critical path
    const criticalPath = [];
    let currentNode = endNode;

    while (currentNode) {
      criticalPath.unshift(currentNode);
      currentNode = predecessors.get(currentNode);
    }

    return criticalPath;
  }

  /**
   * Calculates optimization metrics
   * @private
   * @param {Array<Array<Object>>} stages - Optimized stages
   * @param {Array<Object>} originalSteps - Original steps
   * @returns {Object} Metrics object
   */
  _calculateMetrics(stages, originalSteps) {
    const totalOps = originalSteps.length;
    const stageCount = stages.length;
    
    // Calculate average parallelism
    const totalParallelOps = stages.reduce((sum, stage) => sum + stage.length, 0);
    const avgParallelism = stageCount > 0 ? totalParallelOps / stageCount : 0;

    // Calculate theoretical speedup
    const sequentialCost = Array.from(this.operationCosts.values())
      .reduce((sum, cost) => sum + cost, 0);
    
    const parallelCost = stages.reduce((sum, stage) => {
      const stageCost = Math.max(...stage.map(op => 
        this.operationCosts.get(op.id) || 1
      ));
      return sum + stageCost;
    }, 0);

    const speedup = parallelCost > 0 ? sequentialCost / parallelCost : 1;

    return {
      totalOperations: totalOps,
      stageCount,
      avgParallelism: Math.round(avgParallelism * 100) / 100,
      maxParallelism: Math.max(...stages.map(s => s.length)),
      minParallelism: Math.min(...stages.map(s => s.length)),
      theoreticalSpeedup: Math.round(speedup * 100) / 100,
      sequentialCost,
      parallelCost
    };
  }

  /**
   * Validates an optimized plan for correctness
   * @param {OptimizedPlan} optimizedPlan - The plan to validate
   * @param {Object} originalPlan - Original execution plan
   * @returns {Object} Validation result with any errors
   */
  validateOptimization(optimizedPlan, originalPlan) {
    const errors = [];
    const warnings = [];

    // Check all operations are present
    const originalIds = new Set(originalPlan.steps.map(s => s.id));
    const optimizedIds = new Set();
    
    optimizedPlan.stages.forEach(stage => {
      stage.forEach(op => optimizedIds.add(op.id));
    });

    originalIds.forEach(id => {
      if (!optimizedIds.has(id)) {
        errors.push(`Missing operation: ${id}`);
      }
    });

    // Check for duplicates
    if (optimizedIds.size !== originalIds.size) {
      errors.push('Duplicate operations detected in optimized plan');
    }

    // Validate dependencies are respected
    const executedOps = new Set();
    
    optimizedPlan.stages.forEach((stage, stageIdx) => {
      stage.forEach(op => {
        if (op.dependsOn) {
          op.dependsOn.forEach(depId => {
            if (!executedOps.has(depId)) {
              errors.push(
                `Operation ${op.id} in stage ${stageIdx} depends on ` +
                `${depId} which hasn't executed yet`
              );
            }
          });
        }
        executedOps.add(op.id);
      });
    });

    // Check stage sizes
    optimizedPlan.stages.forEach((stage, idx) => {
      if (stage.length > this.config.maxParallelOps) {
        warnings.push(
          `Stage ${idx} has ${stage.length} operations, ` +
          `exceeding max of ${this.config.maxParallelOps}`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Creates and configures a PlanOptimizer instance
 * @param {Object} [config] - Optional configuration
 * @returns {PlanOptimizer} Configured optimizer instance
 */
export function createPlanOptimizer(config = {}) {
  const optimizer = new PlanOptimizer();
  if (Object.keys(config).length > 0) {
    optimizer.configure(config);
  }
  return optimizer;
}