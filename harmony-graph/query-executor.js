/**
 * @fileoverview QueryExecutor - Executes optimized query plans against the graph
 * 
 * Responsibilities:
 * - Execute query plans from QueryPlanner
 * - Traverse graph based on execution plan
 * - Apply filters, projections, and aggregations
 * - Handle joins and cross-graph queries
 * - Manage execution context and state
 * - Optimize execution with caching
 * - Support streaming results for large datasets
 * 
 * Performance targets:
 * - Simple queries: <5ms
 * - Complex queries: <50ms
 * - Cross-graph queries: <100ms
 * 
 * Related: harmony-graph/query-planner.js, harmony-graph/query-parser.js
 * Documentation: DESIGN_SYSTEM.md § Graph Query Execution
 * 
 * @module harmony-graph/query-executor
 */

import { TypeNavigator } from '../harmony-core/type-navigator.js';
import { EventBus } from '../harmony-core/event-bus.js';

/**
 * Execution context for query execution
 * @typedef {Object} ExecutionContext
 * @property {Map<string, any>} variables - Query variables
 * @property {Map<string, any>} cache - Execution cache
 * @property {number} startTime - Execution start timestamp
 * @property {number} timeout - Execution timeout in ms
 * @property {AbortSignal} [signal] - Abort signal for cancellation
 */

/**
 * Execution statistics
 * @typedef {Object} ExecutionStats
 * @property {number} nodesVisited - Number of nodes visited
 * @property {number} edgesTraversed - Number of edges traversed
 * @property {number} filtersApplied - Number of filters applied
 * @property {number} cacheHits - Number of cache hits
 * @property {number} cacheMisses - Number of cache misses
 * @property {number} executionTimeMs - Total execution time
 */

/**
 * Query result
 * @typedef {Object} QueryResult
 * @property {Array<any>} data - Result data
 * @property {ExecutionStats} stats - Execution statistics
 * @property {boolean} complete - Whether execution completed
 * @property {Error} [error] - Error if execution failed
 */

/**
 * QueryExecutor - Executes query plans against graph
 */
export class QueryExecutor {
  /**
   * @param {Object} graphEngine - Graph engine instance
   * @param {TypeNavigator} typeNavigator - Type navigator for queries
   * @param {EventBus} eventBus - Event bus for communication
   */
  constructor(graphEngine, typeNavigator, eventBus) {
    this.graphEngine = graphEngine;
    this.typeNavigator = typeNavigator;
    this.eventBus = eventBus;
    
    // Execution cache
    this.resultCache = new Map();
    this.maxCacheSize = 100;
    
    // Performance monitoring
    this.executionHistory = [];
    this.maxHistorySize = 1000;
    
    // Default timeout
    this.defaultTimeout = 5000; // 5 seconds
  }

  /**
   * Execute a query plan
   * @param {Object} queryPlan - Optimized query plan from QueryPlanner
   * @param {Object} [options={}] - Execution options
   * @param {Map<string, any>} [options.variables] - Query variables
   * @param {number} [options.timeout] - Execution timeout
   * @param {AbortSignal} [options.signal] - Abort signal
   * @param {boolean} [options.cache=true] - Enable result caching
   * @param {boolean} [options.stream=false] - Stream results
   * @returns {Promise<QueryResult>} Query result
   */
  async execute(queryPlan, options = {}) {
    const startTime = performance.now();
    
    // Create execution context
    const context = this._createContext(queryPlan, options, startTime);
    
    try {
      // Check cache if enabled
      if (options.cache !== false) {
        const cached = this._checkCache(queryPlan, context);
        if (cached) {
          return this._createResult(cached, context, startTime, true);
        }
      }
      
      // Execute plan
      const data = await this._executePlan(queryPlan, context);
      
      // Cache result if enabled
      if (options.cache !== false) {
        this._cacheResult(queryPlan, context, data);
      }
      
      // Create result
      const result = this._createResult(data, context, startTime, false);
      
      // Record execution
      this._recordExecution(queryPlan, result);
      
      // Publish event
      this.eventBus.publish('QueryExecuted', {
        planId: queryPlan.id,
        stats: result.stats,
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      // Handle execution error
      const result = this._createErrorResult(error, context, startTime);
      
      this.eventBus.publish('QueryExecutionFailed', {
        planId: queryPlan.id,
        error: error.message,
        timestamp: Date.now()
      });
      
      return result;
    }
  }

  /**
   * Execute a query plan with streaming results
   * @param {Object} queryPlan - Optimized query plan
   * @param {Object} [options={}] - Execution options
   * @returns {AsyncGenerator<any>} Streaming results
   */
  async* executeStream(queryPlan, options = {}) {
    const startTime = performance.now();
    const context = this._createContext(queryPlan, options, startTime);
    
    try {
      for await (const item of this._executePlanStream(queryPlan, context)) {
        // Check timeout
        if (this._isTimeout(context)) {
          throw new Error('Query execution timeout');
        }
        
        // Check abort signal
        if (context.signal?.aborted) {
          throw new Error('Query execution aborted');
        }
        
        yield item;
      }
    } catch (error) {
      this.eventBus.publish('QueryStreamFailed', {
        planId: queryPlan.id,
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Execute a query plan
   * @private
   * @param {Object} plan - Query plan
   * @param {ExecutionContext} context - Execution context
   * @returns {Promise<Array<any>>} Results
   */
  async _executePlan(plan, context) {
    switch (plan.type) {
      case 'scan':
        return this._executeScan(plan, context);
      case 'filter':
        return this._executeFilter(plan, context);
      case 'project':
        return this._executeProject(plan, context);
      case 'traverse':
        return this._executeTraverse(plan, context);
      case 'join':
        return this._executeJoin(plan, context);
      case 'aggregate':
        return this._executeAggregate(plan, context);
      case 'sort':
        return this._executeSort(plan, context);
      case 'limit':
        return this._executeLimit(plan, context);
      case 'union':
        return this._executeUnion(plan, context);
      default:
        throw new Error(`Unknown plan type: ${plan.type}`);
    }
  }

  /**
   * Execute scan operation
   * @private
   */
  async _executeScan(plan, context) {
    context.stats.nodesVisited++;
    
    const { nodeType, index } = plan;
    
    // Use index if available
    if (index) {
      return this._scanWithIndex(nodeType, index, context);
    }
    
    // Full scan
    return this._fullScan(nodeType, context);
  }

  /**
   * Execute filter operation
   * @private
   */
  async _executeFilter(plan, context) {
    const input = await this._executePlan(plan.input, context);
    const { predicate } = plan;
    
    const results = [];
    for (const item of input) {
      context.stats.filtersApplied++;
      
      if (this._evaluatePredicate(predicate, item, context)) {
        results.push(item);
      }
      
      // Check timeout periodically
      if (results.length % 100 === 0 && this._isTimeout(context)) {
        throw new Error('Query execution timeout');
      }
    }
    
    return results;
  }

  /**
   * Execute project operation
   * @private
   */
  async _executeProject(plan, context) {
    const input = await this._executePlan(plan.input, context);
    const { fields } = plan;
    
    return input.map(item => {
      const projected = {};
      for (const field of fields) {
        if (field.includes('.')) {
          // Nested field access
          projected[field] = this._getNestedValue(item, field);
        } else {
          projected[field] = item[field];
        }
      }
      return projected;
    });
  }

  /**
   * Execute traverse operation
   * @private
   */
  async _executeTraverse(plan, context) {
    const input = await this._executePlan(plan.input, context);
    const { edgeType, direction, depth } = plan;
    
    const results = [];
    for (const node of input) {
      const traversed = await this._traverse(
        node,
        edgeType,
        direction,
        depth,
        context
      );
      results.push(...traversed);
    }
    
    return results;
  }

  /**
   * Execute join operation
   * @private
   */
  async _executeJoin(plan, context) {
    const [left, right] = await Promise.all([
      this._executePlan(plan.left, context),
      this._executePlan(plan.right, context)
    ]);
    
    const { joinType, leftKey, rightKey } = plan;
    
    switch (joinType) {
      case 'inner':
        return this._innerJoin(left, right, leftKey, rightKey);
      case 'left':
        return this._leftJoin(left, right, leftKey, rightKey);
      case 'cross':
        return this._crossJoin(left, right);
      default:
        throw new Error(`Unknown join type: ${joinType}`);
    }
  }

  /**
   * Execute aggregate operation
   * @private
   */
  async _executeAggregate(plan, context) {
    const input = await this._executePlan(plan.input, context);
    const { groupBy, aggregates } = plan;
    
    if (!groupBy) {
      // Global aggregation
      return [this._computeAggregates(input, aggregates)];
    }
    
    // Group by aggregation
    const groups = new Map();
    for (const item of input) {
      const key = this._getGroupKey(item, groupBy);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    }
    
    const results = [];
    for (const [key, items] of groups) {
      const result = this._computeAggregates(items, aggregates);
      result._groupKey = key;
      results.push(result);
    }
    
    return results;
  }

  /**
   * Execute sort operation
   * @private
   */
  async _executeSort(plan, context) {
    const input = await this._executePlan(plan.input, context);
    const { sortBy } = plan;
    
    return [...input].sort((a, b) => {
      for (const { field, order } of sortBy) {
        const aVal = this._getNestedValue(a, field);
        const bVal = this._getNestedValue(b, field);
        
        const cmp = this._compare(aVal, bVal);
        if (cmp !== 0) {
          return order === 'asc' ? cmp : -cmp;
        }
      }
      return 0;
    });
  }

  /**
   * Execute limit operation
   * @private
   */
  async _executeLimit(plan, context) {
    const input = await this._executePlan(plan.input, context);
    const { offset = 0, limit } = plan;
    
    return input.slice(offset, offset + limit);
  }

  /**
   * Execute union operation
   * @private
   */
  async _executeUnion(plan, context) {
    const results = await Promise.all(
      plan.inputs.map(input => this._executePlan(input, context))
    );
    
    if (plan.distinct) {
      const seen = new Set();
      const unique = [];
      for (const result of results.flat()) {
        const key = JSON.stringify(result);
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(result);
        }
      }
      return unique;
    }
    
    return results.flat();
  }

  /**
   * Traverse graph from node
   * @private
   */
  async _traverse(node, edgeType, direction, maxDepth, context) {
    const visited = new Set();
    const results = [];
    const queue = [{ node, depth: 0 }];
    
    while (queue.length > 0) {
      const { node: current, depth } = queue.shift();
      
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      
      if (depth > 0) {
        results.push(current);
      }
      
      if (depth >= maxDepth) continue;
      
      // Get edges
      const edges = this._getEdges(current, edgeType, direction);
      context.stats.edgesTraversed += edges.length;
      
      for (const edge of edges) {
        const nextNode = direction === 'out' ? edge.target : edge.source;
        queue.push({ node: nextNode, depth: depth + 1 });
      }
      
      // Check timeout periodically
      if (visited.size % 100 === 0 && this._isTimeout(context)) {
        throw new Error('Query execution timeout');
      }
    }
    
    return results;
  }

  /**
   * Execute plan with streaming
   * @private
   */
  async* _executePlanStream(plan, context) {
    // For now, execute and yield items one by one
    // TODO: Implement true streaming execution
    const results = await this._executePlan(plan, context);
    for (const item of results) {
      yield item;
    }
  }

  /**
   * Evaluate predicate
   * @private
   */
  _evaluatePredicate(predicate, item, context) {
    switch (predicate.op) {
      case 'eq':
        return this._getNestedValue(item, predicate.field) === predicate.value;
      case 'ne':
        return this._getNestedValue(item, predicate.field) !== predicate.value;
      case 'gt':
        return this._getNestedValue(item, predicate.field) > predicate.value;
      case 'gte':
        return this._getNestedValue(item, predicate.field) >= predicate.value;
      case 'lt':
        return this._getNestedValue(item, predicate.field) < predicate.value;
      case 'lte':
        return this._getNestedValue(item, predicate.field) <= predicate.value;
      case 'in':
        return predicate.value.includes(this._getNestedValue(item, predicate.field));
      case 'contains':
        return this._getNestedValue(item, predicate.field)?.includes(predicate.value);
      case 'and':
        return predicate.predicates.every(p => this._evaluatePredicate(p, item, context));
      case 'or':
        return predicate.predicates.some(p => this._evaluatePredicate(p, item, context));
      case 'not':
        return !this._evaluatePredicate(predicate.predicate, item, context);
      default:
        throw new Error(`Unknown predicate operator: ${predicate.op}`);
    }
  }

  /**
   * Get nested value from object
   * @private
   */
  _getNestedValue(obj, path) {
    const parts = path.split('.');
    let value = obj;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    return value;
  }

  /**
   * Get edges from node
   * @private
   */
  _getEdges(node, edgeType, direction) {
    // Query graph engine for edges
    const edges = this.graphEngine.getEdges(node.id);
    
    return edges.filter(edge => {
      if (edgeType && edge.type !== edgeType) return false;
      if (direction === 'out' && edge.source !== node.id) return false;
      if (direction === 'in' && edge.target !== node.id) return false;
      return true;
    });
  }

  /**
   * Scan with index
   * @private
   */
  async _scanWithIndex(nodeType, index, context) {
    // Use index to find nodes
    const nodes = this.graphEngine.queryIndex(index.name, index.value);
    context.stats.cacheHits++;
    return nodes;
  }

  /**
   * Full scan
   * @private
   */
  async _fullScan(nodeType, context) {
    const nodes = this.graphEngine.getNodesByType(nodeType);
    context.stats.nodesVisited += nodes.length;
    return nodes;
  }

  /**
   * Inner join
   * @private
   */
  _innerJoin(left, right, leftKey, rightKey) {
    const results = [];
    const rightIndex = new Map();
    
    // Build index on right
    for (const item of right) {
      const key = this._getNestedValue(item, rightKey);
      if (!rightIndex.has(key)) {
        rightIndex.set(key, []);
      }
      rightIndex.get(key).push(item);
    }
    
    // Join
    for (const leftItem of left) {
      const key = this._getNestedValue(leftItem, leftKey);
      const rightItems = rightIndex.get(key) || [];
      for (const rightItem of rightItems) {
        results.push({ ...leftItem, ...rightItem });
      }
    }
    
    return results;
  }

  /**
   * Left join
   * @private
   */
  _leftJoin(left, right, leftKey, rightKey) {
    const results = [];
    const rightIndex = new Map();
    
    // Build index on right
    for (const item of right) {
      const key = this._getNestedValue(item, rightKey);
      if (!rightIndex.has(key)) {
        rightIndex.set(key, []);
      }
      rightIndex.get(key).push(item);
    }
    
    // Join
    for (const leftItem of left) {
      const key = this._getNestedValue(leftItem, leftKey);
      const rightItems = rightIndex.get(key);
      
      if (rightItems && rightItems.length > 0) {
        for (const rightItem of rightItems) {
          results.push({ ...leftItem, ...rightItem });
        }
      } else {
        results.push(leftItem);
      }
    }
    
    return results;
  }

  /**
   * Cross join
   * @private
   */
  _crossJoin(left, right) {
    const results = [];
    for (const leftItem of left) {
      for (const rightItem of right) {
        results.push({ ...leftItem, ...rightItem });
      }
    }
    return results;
  }

  /**
   * Compute aggregates
   * @private
   */
  _computeAggregates(items, aggregates) {
    const result = {};
    
    for (const agg of aggregates) {
      const values = items.map(item => this._getNestedValue(item, agg.field));
      
      switch (agg.func) {
        case 'count':
          result[agg.alias || `count_${agg.field}`] = values.length;
          break;
        case 'sum':
          result[agg.alias || `sum_${agg.field}`] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result[agg.alias || `avg_${agg.field}`] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          result[agg.alias || `min_${agg.field}`] = Math.min(...values);
          break;
        case 'max':
          result[agg.alias || `max_${agg.field}`] = Math.max(...values);
          break;
        default:
          throw new Error(`Unknown aggregate function: ${agg.func}`);
      }
    }
    
    return result;
  }

  /**
   * Get group key
   * @private
   */
  _getGroupKey(item, groupBy) {
    return groupBy.map(field => this._getNestedValue(item, field)).join('|');
  }

  /**
   * Compare values
   * @private
   */
  _compare(a, b) {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    return a < b ? -1 : 1;
  }

  /**
   * Create execution context
   * @private
   */
  _createContext(plan, options, startTime) {
    return {
      variables: options.variables || new Map(),
      cache: new Map(),
      startTime,
      timeout: options.timeout || this.defaultTimeout,
      signal: options.signal,
      stats: {
        nodesVisited: 0,
        edgesTraversed: 0,
        filtersApplied: 0,
        cacheHits: 0,
        cacheMisses: 0,
        executionTimeMs: 0
      }
    };
  }

  /**
   * Check if execution timeout
   * @private
   */
  _isTimeout(context) {
    return performance.now() - context.startTime > context.timeout;
  }

  /**
   * Check cache for result
   * @private
   */
  _checkCache(plan, context) {
    const key = this._getCacheKey(plan, context);
    if (this.resultCache.has(key)) {
      context.stats.cacheHits++;
      return this.resultCache.get(key);
    }
    context.stats.cacheMisses++;
    return null;
  }

  /**
   * Cache result
   * @private
   */
  _cacheResult(plan, context, data) {
    const key = this._getCacheKey(plan, context);
    
    // Evict oldest if cache full
    if (this.resultCache.size >= this.maxCacheSize) {
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }
    
    this.resultCache.set(key, data);
  }

  /**
   * Get cache key
   * @private
   */
  _getCacheKey(plan, context) {
    return JSON.stringify({
      plan: plan.id,
      variables: Array.from(context.variables.entries())
    });
  }

  /**
   * Create result
   * @private
   */
  _createResult(data, context, startTime, fromCache) {
    context.stats.executionTimeMs = performance.now() - startTime;
    
    return {
      data,
      stats: context.stats,
      complete: true,
      fromCache
    };
  }

  /**
   * Create error result
   * @private
   */
  _createErrorResult(error, context, startTime) {
    context.stats.executionTimeMs = performance.now() - startTime;
    
    return {
      data: [],
      stats: context.stats,
      complete: false,
      error
    };
  }

  /**
   * Record execution for monitoring
   * @private
   */
  _recordExecution(plan, result) {
    this.executionHistory.push({
      planId: plan.id,
      timestamp: Date.now(),
      stats: result.stats
    });
    
    // Trim history if too large
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }

  /**
   * Get execution statistics
   * @returns {Object} Execution statistics
   */
  getStats() {
    const recent = this.executionHistory.slice(-100);
    
    if (recent.length === 0) {
      return {
        totalExecutions: 0,
        avgExecutionTime: 0,
        avgNodesVisited: 0,
        avgEdgesTraversed: 0,
        cacheHitRate: 0
      };
    }
    
    const totalTime = recent.reduce((sum, ex) => sum + ex.stats.executionTimeMs, 0);
    const totalNodes = recent.reduce((sum, ex) => sum + ex.stats.nodesVisited, 0);
    const totalEdges = recent.reduce((sum, ex) => sum + ex.stats.edgesTraversed, 0);
    const totalHits = recent.reduce((sum, ex) => sum + ex.stats.cacheHits, 0);
    const totalMisses = recent.reduce((sum, ex) => sum + ex.stats.cacheMisses, 0);
    
    return {
      totalExecutions: this.executionHistory.length,
      avgExecutionTime: totalTime / recent.length,
      avgNodesVisited: totalNodes / recent.length,
      avgEdgesTraversed: totalEdges / recent.length,
      cacheHitRate: totalHits / (totalHits + totalMisses)
    };
  }

  /**
   * Clear execution cache
   */
  clearCache() {
    this.resultCache.clear();
    this.eventBus.publish('QueryCacheCleared', {
      timestamp: Date.now()
    });
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.executionHistory = [];
  }
}