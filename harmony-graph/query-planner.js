/**
 * @fileoverview QueryPlanner - Optimizes query execution plans for graph traversal
 * 
 * Implements cost-based query optimization including:
 * - Index selection and utilization
 * - Join order optimization
 * - Predicate pushdown
 * - Cardinality estimation
 * - Execution plan caching
 * 
 * Related: harmony-graph/query-parser.js, harmony-graph/query-executor.js
 * Documentation: DESIGN_SYSTEM.md § Graph Query Planning
 * 
 * @module harmony-graph/query-planner
 */

/**
 * Cost estimates for different operation types
 * @const {Object<string, number>}
 */
const OPERATION_COSTS = {
  INDEX_LOOKUP: 1,
  SEQUENTIAL_SCAN: 100,
  FILTER: 2,
  TRAVERSE: 5,
  JOIN: 50,
  SORT: 10,
  AGGREGATE: 8
};

/**
 * Execution plan node representing a single operation
 * @typedef {Object} PlanNode
 * @property {string} type - Operation type (scan, filter, traverse, etc.)
 * @property {number} estimatedCost - Estimated execution cost
 * @property {number} estimatedCardinality - Estimated result set size
 * @property {Object} metadata - Operation-specific metadata
 * @property {PlanNode[]} children - Child plan nodes
 */

/**
 * Query statistics for cardinality estimation
 * @typedef {Object} QueryStats
 * @property {number} totalNodes - Total nodes in graph
 * @property {number} totalEdges - Total edges in graph
 * @property {Map<string, number>} nodeTypeCounts - Count by node type
 * @property {Map<string, number>} edgeTypeCounts - Count by edge type
 * @property {Map<string, Set<any>>} indexedProperties - Properties with indexes
 */

/**
 * QueryPlanner optimizes parsed query ASTs into efficient execution plans
 * 
 * Performs multi-phase optimization:
 * 1. Logical optimization (predicate pushdown, join reordering)
 * 2. Physical optimization (index selection, access method)
 * 3. Cost estimation and plan comparison
 * 
 * @class QueryPlanner
 */
export class QueryPlanner {
  /**
   * @param {Object} options - Configuration options
   * @param {QueryStats} options.stats - Graph statistics for estimation
   * @param {boolean} options.enableCache - Enable plan caching
   * @param {number} options.maxPlanCacheSize - Maximum cached plans
   */
  constructor(options = {}) {
    this.stats = options.stats || this._createDefaultStats();
    this.enableCache = options.enableCache !== false;
    this.maxPlanCacheSize = options.maxPlanCacheSize || 1000;
    
    /** @type {Map<string, PlanNode>} */
    this.planCache = new Map();
    
    /** @type {Map<string, number>} */
    this.planCacheHits = new Map();
  }

  /**
   * Creates default statistics object
   * @private
   * @returns {QueryStats}
   */
  _createDefaultStats() {
    return {
      totalNodes: 0,
      totalEdges: 0,
      nodeTypeCounts: new Map(),
      edgeTypeCounts: new Map(),
      indexedProperties: new Map()
    };
  }

  /**
   * Optimizes a parsed query AST into an execution plan
   * 
   * @param {Object} queryAst - Parsed query AST from QueryParser
   * @returns {PlanNode} Optimized execution plan
   * 
   * @example
   * const plan = planner.optimize({
   *   type: 'match',
   *   pattern: { type: 'User', properties: { active: true } },
   *   where: { age: { $gt: 18 } },
   *   return: ['name', 'email']
   * });
   */
  optimize(queryAst) {
    if (!queryAst || typeof queryAst !== 'object') {
      throw new Error('Invalid query AST');
    }

    // Check cache first
    const cacheKey = this._generateCacheKey(queryAst);
    if (this.enableCache && this.planCache.has(cacheKey)) {
      this.planCacheHits.set(cacheKey, (this.planCacheHits.get(cacheKey) || 0) + 1);
      return this.planCache.get(cacheKey);
    }

    // Phase 1: Logical optimization
    const logicalPlan = this._applyLogicalOptimizations(queryAst);

    // Phase 2: Generate alternative physical plans
    const physicalPlans = this._generatePhysicalPlans(logicalPlan);

    // Phase 3: Cost-based selection
    const bestPlan = this._selectBestPlan(physicalPlans);

    // Cache the result
    if (this.enableCache) {
      this._cachePlan(cacheKey, bestPlan);
    }

    return bestPlan;
  }

  /**
   * Applies logical query optimizations
   * @private
   * @param {Object} queryAst - Query AST
   * @returns {Object} Logically optimized AST
   */
  _applyLogicalOptimizations(queryAst) {
    let optimized = { ...queryAst };

    // Apply predicate pushdown
    optimized = this._pushDownPredicates(optimized);

    // Apply join reordering
    optimized = this._reorderJoins(optimized);

    // Eliminate redundant operations
    optimized = this._eliminateRedundantOps(optimized);

    return optimized;
  }

  /**
   * Pushes filter predicates as close to data source as possible
   * @private
   * @param {Object} ast - Query AST
   * @returns {Object} Optimized AST
   */
  _pushDownPredicates(ast) {
    if (ast.type === 'match' && ast.where) {
      // Move WHERE predicates into MATCH pattern when possible
      const pushablePredicates = this._identifyPushablePredicates(ast.where);
      
      if (pushablePredicates.length > 0) {
        return {
          ...ast,
          pattern: {
            ...ast.pattern,
            properties: {
              ...(ast.pattern.properties || {}),
              ...Object.fromEntries(pushablePredicates)
            }
          },
          where: this._removePredicates(ast.where, pushablePredicates.map(p => p[0]))
        };
      }
    }

    return ast;
  }

  /**
   * Identifies predicates that can be pushed down to pattern matching
   * @private
   * @param {Object} whereClause - WHERE clause predicates
   * @returns {Array<[string, any]>} Pushable predicates
   */
  _identifyPushablePredicates(whereClause) {
    const pushable = [];
    
    for (const [key, value] of Object.entries(whereClause)) {
      // Simple equality predicates can be pushed down
      if (typeof value !== 'object' || value === null) {
        pushable.push([key, value]);
      }
    }

    return pushable;
  }

  /**
   * Removes specified predicates from WHERE clause
   * @private
   * @param {Object} whereClause - WHERE clause
   * @param {string[]} predicateKeys - Keys to remove
   * @returns {Object|null} Updated WHERE clause
   */
  _removePredicates(whereClause, predicateKeys) {
    const remaining = { ...whereClause };
    
    for (const key of predicateKeys) {
      delete remaining[key];
    }

    return Object.keys(remaining).length > 0 ? remaining : null;
  }

  /**
   * Reorders joins for optimal execution
   * @private
   * @param {Object} ast - Query AST
   * @returns {Object} Optimized AST
   */
  _reorderJoins(ast) {
    // For now, return as-is. Full join reordering requires
    // analyzing join selectivity and cardinality
    return ast;
  }

  /**
   * Eliminates redundant operations
   * @private
   * @param {Object} ast - Query AST
   * @returns {Object} Optimized AST
   */
  _eliminateRedundantOps(ast) {
    // Remove duplicate filters, unnecessary sorts, etc.
    return ast;
  }

  /**
   * Generates alternative physical execution plans
   * @private
   * @param {Object} logicalPlan - Logically optimized plan
   * @returns {PlanNode[]} Array of physical plans
   */
  _generatePhysicalPlans(logicalPlan) {
    const plans = [];

    if (logicalPlan.type === 'match') {
      // Generate index-based plan if applicable
      const indexPlan = this._generateIndexPlan(logicalPlan);
      if (indexPlan) {
        plans.push(indexPlan);
      }

      // Generate sequential scan plan as fallback
      const scanPlan = this._generateScanPlan(logicalPlan);
      plans.push(scanPlan);
    }

    return plans;
  }

  /**
   * Generates an index-based execution plan
   * @private
   * @param {Object} logicalPlan - Logical plan
   * @returns {PlanNode|null} Index plan or null if not applicable
   */
  _generateIndexPlan(logicalPlan) {
    const pattern = logicalPlan.pattern;
    
    if (!pattern || !pattern.properties) {
      return null;
    }

    // Check if any properties are indexed
    const indexedProps = Object.keys(pattern.properties).filter(prop =>
      this.stats.indexedProperties.has(prop)
    );

    if (indexedProps.length === 0) {
      return null;
    }

    // Select best index based on selectivity
    const bestIndex = this._selectBestIndex(indexedProps, pattern.properties);
    const cardinality = this._estimateIndexCardinality(bestIndex, pattern.properties[bestIndex]);

    const plan = {
      type: 'index_lookup',
      estimatedCost: OPERATION_COSTS.INDEX_LOOKUP * Math.log2(cardinality + 1),
      estimatedCardinality: cardinality,
      metadata: {
        index: bestIndex,
        value: pattern.properties[bestIndex],
        nodeType: pattern.type
      },
      children: []
    };

    // Add filter for remaining predicates
    if (logicalPlan.where) {
      plan.children.push(this._createFilterNode(logicalPlan.where, cardinality));
    }

    return plan;
  }

  /**
   * Selects the best index to use based on selectivity
   * @private
   * @param {string[]} indexedProps - Available indexed properties
   * @param {Object} properties - Property values
   * @returns {string} Best index property
   */
  _selectBestIndex(indexedProps, properties) {
    // Simple heuristic: prefer indexes with higher selectivity
    // In practice, would use actual statistics
    return indexedProps[0];
  }

  /**
   * Estimates cardinality for index lookup
   * @private
   * @param {string} indexProp - Index property
   * @param {any} value - Lookup value
   * @returns {number} Estimated result count
   */
  _estimateIndexCardinality(indexProp, value) {
    const indexValues = this.stats.indexedProperties.get(indexProp);
    
    if (!indexValues || indexValues.size === 0) {
      return this.stats.totalNodes * 0.1; // Default 10% selectivity
    }

    // Estimate based on unique value count
    return Math.max(1, Math.floor(this.stats.totalNodes / indexValues.size));
  }

  /**
   * Generates a sequential scan execution plan
   * @private
   * @param {Object} logicalPlan - Logical plan
   * @returns {PlanNode} Scan plan
   */
  _generateScanPlan(logicalPlan) {
    const pattern = logicalPlan.pattern;
    let cardinality = this.stats.totalNodes;

    // Estimate cardinality based on node type
    if (pattern && pattern.type) {
      cardinality = this.stats.nodeTypeCounts.get(pattern.type) || cardinality;
    }

    const plan = {
      type: 'sequential_scan',
      estimatedCost: OPERATION_COSTS.SEQUENTIAL_SCAN * cardinality,
      estimatedCardinality: cardinality,
      metadata: {
        nodeType: pattern?.type || null
      },
      children: []
    };

    // Add filter for pattern properties
    if (pattern && pattern.properties) {
      const filterCard = cardinality * 0.1; // Assume 10% selectivity
      plan.children.push(this._createFilterNode(pattern.properties, filterCard));
      cardinality = filterCard;
    }

    // Add filter for WHERE clause
    if (logicalPlan.where) {
      plan.children.push(this._createFilterNode(logicalPlan.where, cardinality));
    }

    return plan;
  }

  /**
   * Creates a filter plan node
   * @private
   * @param {Object} predicates - Filter predicates
   * @param {number} inputCardinality - Input cardinality
   * @returns {PlanNode} Filter node
   */
  _createFilterNode(predicates, inputCardinality) {
    const selectivity = this._estimateSelectivity(predicates);
    const outputCardinality = Math.max(1, Math.floor(inputCardinality * selectivity));

    return {
      type: 'filter',
      estimatedCost: OPERATION_COSTS.FILTER * inputCardinality,
      estimatedCardinality: outputCardinality,
      metadata: {
        predicates,
        selectivity
      },
      children: []
    };
  }

  /**
   * Estimates filter selectivity
   * @private
   * @param {Object} predicates - Filter predicates
   * @returns {number} Selectivity (0-1)
   */
  _estimateSelectivity(predicates) {
    // Simple heuristic: each predicate reduces by 50%
    const predicateCount = Object.keys(predicates).length;
    return Math.pow(0.5, predicateCount);
  }

  /**
   * Selects the best plan based on cost estimation
   * @private
   * @param {PlanNode[]} plans - Candidate plans
   * @returns {PlanNode} Best plan
   */
  _selectBestPlan(plans) {
    if (plans.length === 0) {
      throw new Error('No execution plans generated');
    }

    // Select plan with lowest total cost
    return plans.reduce((best, current) => {
      const bestCost = this._calculateTotalCost(best);
      const currentCost = this._calculateTotalCost(current);
      return currentCost < bestCost ? current : best;
    });
  }

  /**
   * Calculates total cost of a plan including children
   * @private
   * @param {PlanNode} plan - Execution plan
   * @returns {number} Total cost
   */
  _calculateTotalCost(plan) {
    let total = plan.estimatedCost;

    for (const child of plan.children) {
      total += this._calculateTotalCost(child);
    }

    return total;
  }

  /**
   * Generates cache key for a query AST
   * @private
   * @param {Object} queryAst - Query AST
   * @returns {string} Cache key
   */
  _generateCacheKey(queryAst) {
    return JSON.stringify(queryAst);
  }

  /**
   * Caches an execution plan
   * @private
   * @param {string} key - Cache key
   * @param {PlanNode} plan - Execution plan
   */
  _cachePlan(key, plan) {
    // Implement LRU eviction if cache is full
    if (this.planCache.size >= this.maxPlanCacheSize) {
      const lruKey = this._findLRUKey();
      this.planCache.delete(lruKey);
      this.planCacheHits.delete(lruKey);
    }

    this.planCache.set(key, plan);
    this.planCacheHits.set(key, 0);
  }

  /**
   * Finds least recently used cache key
   * @private
   * @returns {string} LRU key
   */
  _findLRUKey() {
    let minHits = Infinity;
    let lruKey = null;

    for (const [key, hits] of this.planCacheHits.entries()) {
      if (hits < minHits) {
        minHits = hits;
        lruKey = key;
      }
    }

    return lruKey || this.planCache.keys().next().value;
  }

  /**
   * Updates graph statistics for better cost estimation
   * 
   * @param {QueryStats} stats - Updated statistics
   * 
   * @example
   * planner.updateStats({
   *   totalNodes: 10000,
   *   totalEdges: 50000,
   *   nodeTypeCounts: new Map([['User', 5000], ['Post', 5000]]),
   *   indexedProperties: new Map([['id', new Set()], ['email', new Set()]])
   * });
   */
  updateStats(stats) {
    this.stats = { ...this.stats, ...stats };
    
    // Invalidate plan cache when stats change significantly
    this.planCache.clear();
    this.planCacheHits.clear();
  }

  /**
   * Clears the plan cache
   */
  clearCache() {
    this.planCache.clear();
    this.planCacheHits.clear();
  }

  /**
   * Gets cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    let totalHits = 0;
    for (const hits of this.planCacheHits.values()) {
      totalHits += hits;
    }

    return {
      size: this.planCache.size,
      maxSize: this.maxPlanCacheSize,
      totalHits,
      hitRate: this.planCache.size > 0 ? totalHits / this.planCache.size : 0
    };
  }

  /**
   * Explains an execution plan in human-readable format
   * 
   * @param {PlanNode} plan - Execution plan
   * @param {number} indent - Indentation level
   * @returns {string} Formatted explanation
   * 
   * @example
   * const explanation = planner.explainPlan(plan);
   * console.log(explanation);
   */
  explainPlan(plan, indent = 0) {
    const prefix = '  '.repeat(indent);
    let explanation = `${prefix}${plan.type.toUpperCase()}\n`;
    explanation += `${prefix}  Cost: ${plan.estimatedCost.toFixed(2)}\n`;
    explanation += `${prefix}  Cardinality: ${plan.estimatedCardinality}\n`;
    
    if (Object.keys(plan.metadata).length > 0) {
      explanation += `${prefix}  Metadata: ${JSON.stringify(plan.metadata)}\n`;
    }

    for (const child of plan.children) {
      explanation += this.explainPlan(child, indent + 1);
    }

    return explanation;
  }
}

/**
 * Creates a QueryPlanner instance with default configuration
 * 
 * @param {Object} options - Configuration options
 * @returns {QueryPlanner} Query planner instance
 * 
 * @example
 * import { createQueryPlanner } from './harmony-graph/query-planner.js';
 * 
 * const planner = createQueryPlanner({
 *   stats: graphStats,
 *   enableCache: true
 * });
 */
export function createQueryPlanner(options = {}) {
  return new QueryPlanner(options);
}