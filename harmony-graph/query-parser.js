/**
 * @fileoverview QueryParser - Parses query DSL into executable query plan
 * @module harmony-graph/query-parser
 * 
 * Transforms declarative query DSL into optimized execution plans for graph traversal.
 * Supports node selection, edge traversal, filtering, aggregation, and sorting.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#query-parser
 */

/**
 * @typedef {Object} QueryNode
 * @property {string} type - Node type (select, traverse, filter, aggregate, sort, limit)
 * @property {Object} config - Node-specific configuration
 * @property {QueryNode[]} children - Child nodes in execution tree
 */

/**
 * @typedef {Object} QueryPlan
 * @property {QueryNode} root - Root node of execution tree
 * @property {Object} metadata - Query metadata (estimated cost, indexes used)
 * @property {string[]} requiredIndexes - Indexes required for optimal execution
 */

/**
 * @typedef {Object} QueryDSL
 * @property {string|string[]} select - Node IDs or patterns to select
 * @property {Object} [traverse] - Traversal configuration
 * @property {Object} [filter] - Filter conditions
 * @property {Object} [aggregate] - Aggregation operations
 * @property {Object} [sort] - Sort configuration
 * @property {number} [limit] - Result limit
 */

/**
 * QueryParser - Parses query DSL into executable query plans
 */
export class QueryParser {
  constructor() {
    /** @type {Map<string, Function>} */
    this.operators = new Map([
      ['eq', (a, b) => a === b],
      ['ne', (a, b) => a !== b],
      ['gt', (a, b) => a > b],
      ['gte', (a, b) => a >= b],
      ['lt', (a, b) => a < b],
      ['lte', (a, b) => a <= b],
      ['in', (a, b) => Array.isArray(b) && b.includes(a)],
      ['contains', (a, b) => String(a).includes(String(b))],
      ['startsWith', (a, b) => String(a).startsWith(String(b))],
      ['endsWith', (a, b) => String(a).endsWith(String(b))],
      ['matches', (a, b) => new RegExp(b).test(String(a))]
    ]);

    /** @type {Map<string, Function>} */
    this.aggregators = new Map([
      ['count', (values) => values.length],
      ['sum', (values) => values.reduce((a, b) => a + b, 0)],
      ['avg', (values) => values.reduce((a, b) => a + b, 0) / values.length],
      ['min', (values) => Math.min(...values)],
      ['max', (values) => Math.max(...values)],
      ['first', (values) => values[0]],
      ['last', (values) => values[values.length - 1]]
    ]);
  }

  /**
   * Parse query DSL into executable query plan
   * @param {QueryDSL} dsl - Query DSL object
   * @returns {QueryPlan} Executable query plan
   * @throws {Error} If DSL is invalid
   */
  parse(dsl) {
    if (!dsl || typeof dsl !== 'object') {
      throw new Error('Query DSL must be an object');
    }

    if (!dsl.select) {
      throw new Error('Query DSL must include a select clause');
    }

    const root = this._buildExecutionTree(dsl);
    const metadata = this._analyzeQuery(root);
    const requiredIndexes = this._identifyRequiredIndexes(dsl);

    return {
      root,
      metadata,
      requiredIndexes
    };
  }

  /**
   * Build execution tree from DSL
   * @private
   * @param {QueryDSL} dsl - Query DSL
   * @returns {QueryNode} Root execution node
   */
  _buildExecutionTree(dsl) {
    let currentNode = this._buildSelectNode(dsl.select);

    if (dsl.traverse) {
      currentNode = this._buildTraverseNode(dsl.traverse, currentNode);
    }

    if (dsl.filter) {
      currentNode = this._buildFilterNode(dsl.filter, currentNode);
    }

    if (dsl.aggregate) {
      currentNode = this._buildAggregateNode(dsl.aggregate, currentNode);
    }

    if (dsl.sort) {
      currentNode = this._buildSortNode(dsl.sort, currentNode);
    }

    if (dsl.limit) {
      currentNode = this._buildLimitNode(dsl.limit, currentNode);
    }

    return currentNode;
  }

  /**
   * Build select node
   * @private
   * @param {string|string[]|Object} select - Select clause
   * @returns {QueryNode} Select node
   */
  _buildSelectNode(select) {
    const config = {};

    if (typeof select === 'string') {
      config.pattern = select;
      config.type = select.includes('*') ? 'pattern' : 'id';
    } else if (Array.isArray(select)) {
      config.ids = select;
      config.type = 'ids';
    } else if (typeof select === 'object') {
      config.criteria = select;
      config.type = 'criteria';
    } else {
      throw new Error('Invalid select clause');
    }

    return {
      type: 'select',
      config,
      children: []
    };
  }

  /**
   * Build traverse node
   * @private
   * @param {Object} traverse - Traverse configuration
   * @param {QueryNode} child - Child node
   * @returns {QueryNode} Traverse node
   */
  _buildTraverseNode(traverse, child) {
    const config = {
      direction: traverse.direction || 'outbound',
      edgeType: traverse.edgeType || '*',
      depth: traverse.depth || 1,
      breadthFirst: traverse.breadthFirst !== false
    };

    if (traverse.maxDepth) {
      config.maxDepth = traverse.maxDepth;
    }

    if (traverse.filter) {
      config.filter = traverse.filter;
    }

    return {
      type: 'traverse',
      config,
      children: [child]
    };
  }

  /**
   * Build filter node
   * @private
   * @param {Object} filter - Filter conditions
   * @param {QueryNode} child - Child node
   * @returns {QueryNode} Filter node
   */
  _buildFilterNode(filter, child) {
    const config = {
      conditions: this._parseFilterConditions(filter)
    };

    return {
      type: 'filter',
      config,
      children: [child]
    };
  }

  /**
   * Parse filter conditions into executable format
   * @private
   * @param {Object} filter - Filter object
   * @returns {Array} Parsed conditions
   */
  _parseFilterConditions(filter) {
    const conditions = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === '$and' || key === '$or') {
        conditions.push({
          logical: key.substring(1),
          conditions: value.map(v => this._parseFilterConditions(v))
        });
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Operator-based condition: { age: { $gt: 18 } }
        for (const [op, val] of Object.entries(value)) {
          const operator = op.startsWith('$') ? op.substring(1) : op;
          if (!this.operators.has(operator)) {
            throw new Error(`Unknown operator: ${operator}`);
          }
          conditions.push({
            field: key,
            operator,
            value: val
          });
        }
      } else {
        // Simple equality: { name: "John" }
        conditions.push({
          field: key,
          operator: 'eq',
          value
        });
      }
    }

    return conditions;
  }

  /**
   * Build aggregate node
   * @private
   * @param {Object} aggregate - Aggregation configuration
   * @param {QueryNode} child - Child node
   * @returns {QueryNode} Aggregate node
   */
  _buildAggregateNode(aggregate, child) {
    const config = {
      operations: []
    };

    for (const [field, operation] of Object.entries(aggregate)) {
      if (typeof operation === 'string') {
        if (!this.aggregators.has(operation)) {
          throw new Error(`Unknown aggregation operation: ${operation}`);
        }
        config.operations.push({
          field,
          operation,
          as: field
        });
      } else if (typeof operation === 'object') {
        const op = operation.op || operation.operation;
        if (!this.aggregators.has(op)) {
          throw new Error(`Unknown aggregation operation: ${op}`);
        }
        config.operations.push({
          field,
          operation: op,
          as: operation.as || field
        });
      }
    }

    return {
      type: 'aggregate',
      config,
      children: [child]
    };
  }

  /**
   * Build sort node
   * @private
   * @param {Object|string} sort - Sort configuration
   * @param {QueryNode} child - Child node
   * @returns {QueryNode} Sort node
   */
  _buildSortNode(sort, child) {
    const config = {
      fields: []
    };

    if (typeof sort === 'string') {
      config.fields.push({
        field: sort,
        direction: 'asc'
      });
    } else if (Array.isArray(sort)) {
      for (const field of sort) {
        if (typeof field === 'string') {
          config.fields.push({
            field,
            direction: 'asc'
          });
        } else {
          config.fields.push(field);
        }
      }
    } else {
      for (const [field, direction] of Object.entries(sort)) {
        config.fields.push({
          field,
          direction: direction === -1 ? 'desc' : 'asc'
        });
      }
    }

    return {
      type: 'sort',
      config,
      children: [child]
    };
  }

  /**
   * Build limit node
   * @private
   * @param {number} limit - Result limit
   * @param {QueryNode} child - Child node
   * @returns {QueryNode} Limit node
   */
  _buildLimitNode(limit, child) {
    if (typeof limit !== 'number' || limit < 0) {
      throw new Error('Limit must be a non-negative number');
    }

    return {
      type: 'limit',
      config: { limit },
      children: [child]
    };
  }

  /**
   * Analyze query and estimate execution cost
   * @private
   * @param {QueryNode} root - Root execution node
   * @returns {Object} Query metadata
   */
  _analyzeQuery(root) {
    let estimatedCost = 0;
    let nodeCount = 0;
    const operations = [];

    const traverse = (node) => {
      nodeCount++;
      operations.push(node.type);

      switch (node.type) {
        case 'select':
          estimatedCost += node.config.type === 'ids' ? 1 : 10;
          break;
        case 'traverse':
          estimatedCost += node.config.depth * 5;
          break;
        case 'filter':
          estimatedCost += node.config.conditions.length * 2;
          break;
        case 'aggregate':
          estimatedCost += node.config.operations.length * 3;
          break;
        case 'sort':
          estimatedCost += 10; // Sorting is expensive
          break;
        case 'limit':
          estimatedCost += 1;
          break;
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(root);

    return {
      estimatedCost,
      nodeCount,
      operations,
      complexity: estimatedCost > 50 ? 'high' : estimatedCost > 20 ? 'medium' : 'low'
    };
  }

  /**
   * Identify required indexes for optimal execution
   * @private
   * @param {QueryDSL} dsl - Query DSL
   * @returns {string[]} Required index names
   */
  _identifyRequiredIndexes(dsl) {
    const indexes = new Set();

    if (dsl.filter) {
      this._extractFilterFields(dsl.filter).forEach(field => {
        indexes.add(`filter_${field}`);
      });
    }

    if (dsl.sort) {
      if (typeof dsl.sort === 'string') {
        indexes.add(`sort_${dsl.sort}`);
      } else if (typeof dsl.sort === 'object') {
        Object.keys(dsl.sort).forEach(field => {
          indexes.add(`sort_${field}`);
        });
      }
    }

    if (dsl.traverse && dsl.traverse.edgeType && dsl.traverse.edgeType !== '*') {
      indexes.add(`edge_${dsl.traverse.edgeType}`);
    }

    return Array.from(indexes);
  }

  /**
   * Extract field names from filter conditions
   * @private
   * @param {Object} filter - Filter object
   * @returns {Set<string>} Field names
   */
  _extractFilterFields(filter) {
    const fields = new Set();

    for (const [key, value] of Object.entries(filter)) {
      if (key === '$and' || key === '$or') {
        value.forEach(v => {
          this._extractFilterFields(v).forEach(f => fields.add(f));
        });
      } else if (!key.startsWith('$')) {
        fields.add(key);
      }
    }

    return fields;
  }

  /**
   * Optimize query plan by reordering operations
   * @param {QueryPlan} plan - Query plan to optimize
   * @returns {QueryPlan} Optimized query plan
   */
  optimize(plan) {
    // Create a copy to avoid mutating original
    const optimizedRoot = this._optimizeNode(JSON.parse(JSON.stringify(plan.root)));
    
    return {
      root: optimizedRoot,
      metadata: this._analyzeQuery(optimizedRoot),
      requiredIndexes: plan.requiredIndexes
    };
  }

  /**
   * Optimize individual node and its children
   * @private
   * @param {QueryNode} node - Node to optimize
   * @returns {QueryNode} Optimized node
   */
  _optimizeNode(node) {
    // Recursively optimize children first
    node.children = node.children.map(child => this._optimizeNode(child));

    // Apply optimization rules
    if (node.type === 'filter' && node.children.length > 0) {
      const child = node.children[0];
      
      // Push filters down before traversal when possible
      if (child.type === 'traverse') {
        // Move filter into traverse filter config
        if (!child.config.filter) {
          child.config.filter = node.config.conditions;
          return child;
        }
      }

      // Merge consecutive filters
      if (child.type === 'filter') {
        node.config.conditions = [
          ...node.config.conditions,
          ...child.config.conditions
        ];
        node.children = child.children;
      }
    }

    // Move limit before sort when possible (sort fewer items)
    if (node.type === 'sort' && node.children.length > 0) {
      const child = node.children[0];
      if (child.type === 'limit') {
        // Swap sort and limit
        const limitNode = { ...child };
        node.children = child.children;
        limitNode.children = [node];
        return limitNode;
      }
    }

    return node;
  }

  /**
   * Validate query plan for correctness
   * @param {QueryPlan} plan - Query plan to validate
   * @returns {Object} Validation result
   */
  validate(plan) {
    const errors = [];
    const warnings = [];

    const validateNode = (node, depth = 0) => {
      if (depth > 10) {
        errors.push('Query depth exceeds maximum (10 levels)');
        return;
      }

      if (!node.type) {
        errors.push('Node missing type');
        return;
      }

      if (!node.config) {
        errors.push(`Node ${node.type} missing config`);
      }

      // Type-specific validation
      switch (node.type) {
        case 'select':
          if (!node.config.pattern && !node.config.ids && !node.config.criteria) {
            errors.push('Select node must have pattern, ids, or criteria');
          }
          break;
        case 'traverse':
          if (!['inbound', 'outbound', 'both'].includes(node.config.direction)) {
            errors.push(`Invalid traverse direction: ${node.config.direction}`);
          }
          if (node.config.depth > 5) {
            warnings.push('Traverse depth > 5 may cause performance issues');
          }
          break;
        case 'filter':
          if (!node.config.conditions || node.config.conditions.length === 0) {
            warnings.push('Filter node has no conditions');
          }
          break;
      }

      node.children.forEach(child => validateNode(child, depth + 1));
    };

    validateNode(plan.root);

    if (plan.metadata.complexity === 'high') {
      warnings.push('Query has high complexity - consider optimization');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Create a new QueryParser instance
 * @returns {QueryParser} Query parser instance
 */
export function createQueryParser() {
  return new QueryParser();
}