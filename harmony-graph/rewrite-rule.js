/**
 * @fileoverview RewriteRule: Pattern → Replacement rules for graph transformation
 * 
 * Defines declarative rules for matching graph patterns and replacing them with
 * new structures. Used by GraphRewriter to transform graphs based on schemas,
 * optimizations, or migrations.
 * 
 * @module harmony-graph/rewrite-rule
 * @see harmony-graph/graph-rewriter.js - Uses RewriteRule for transformations
 * @see harmony-graph/graph-schema.js - Provides schema constraints for rules
 * @see DESIGN_SYSTEM.md#graph-transformation-rules
 */

/**
 * Pattern matching operators for node/edge properties
 * @enum {string}
 */
export const MatchOperator = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  CONTAINS: 'contains',
  MATCHES: 'matches', // regex
  EXISTS: 'exists',
  NOT_EXISTS: 'not_exists',
  IN: 'in',
  NOT_IN: 'not_in',
  GREATER_THAN: 'gt',
  LESS_THAN: 'lt',
  ANY: 'any' // matches any value
};

/**
 * Rule application strategy
 * @enum {string}
 */
export const RuleStrategy = {
  FIRST_MATCH: 'first_match', // Apply to first matching pattern only
  ALL_MATCHES: 'all_matches', // Apply to all matching patterns
  GREEDY: 'greedy', // Apply repeatedly until no matches
  ONCE_PER_NODE: 'once_per_node' // Apply at most once per node
};

/**
 * Pattern element for matching nodes in the graph
 * @typedef {Object} NodePattern
 * @property {string} [id] - Specific node ID to match (optional)
 * @property {string} [type] - Node type to match
 * @property {Object.<string, {operator: MatchOperator, value: *}>} [properties] - Property constraints
 * @property {string} [variable] - Variable name to bind matched node
 * @property {boolean} [optional] - Whether this node is optional in the pattern
 */

/**
 * Pattern element for matching edges in the graph
 * @typedef {Object} EdgePattern
 * @property {string} from - Variable name of source node
 * @property {string} to - Variable name of target node
 * @property {string} [type] - Edge type to match
 * @property {Object.<string, {operator: MatchOperator, value: *}>} [properties] - Property constraints
 * @property {string} [variable] - Variable name to bind matched edge
 * @property {boolean} [optional] - Whether this edge is optional in the pattern
 */

/**
 * Complete pattern to match in the graph
 * @typedef {Object} GraphPattern
 * @property {NodePattern[]} nodes - Node patterns to match
 * @property {EdgePattern[]} [edges] - Edge patterns to match
 * @property {Function} [constraint] - Custom constraint function (bindings) => boolean
 */

/**
 * Replacement specification for matched pattern
 * @typedef {Object} ReplacementSpec
 * @property {Array<{type: string, properties: Object|Function, id?: string|Function}>} [nodes] - Nodes to create
 * @property {Array<{from: string|Function, to: string|Function, type: string, properties?: Object|Function}>} [edges] - Edges to create
 * @property {string[]} [removeNodes] - Variable names of nodes to remove
 * @property {string[]} [removeEdges] - Variable names of edges to remove
 * @property {Array<{node: string, properties: Object|Function}>} [updateNodes] - Node updates
 * @property {Array<{edge: string, properties: Object|Function}>} [updateEdges] - Edge updates
 */

/**
 * Defines a graph rewrite rule with pattern matching and replacement
 */
export class RewriteRule {
  /**
   * @param {Object} config - Rule configuration
   * @param {string} config.id - Unique rule identifier
   * @param {string} config.name - Human-readable rule name
   * @param {string} [config.description] - Rule description
   * @param {GraphPattern} config.pattern - Pattern to match
   * @param {ReplacementSpec} config.replacement - Replacement specification
   * @param {RuleStrategy} [config.strategy='first_match'] - Application strategy
   * @param {number} [config.priority=0] - Rule priority (higher = applied first)
   * @param {Function} [config.condition] - Additional condition (graph, bindings) => boolean
   * @param {Object} [config.metadata] - Additional metadata
   */
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description || '';
    this.pattern = config.pattern;
    this.replacement = config.replacement;
    this.strategy = config.strategy || RuleStrategy.FIRST_MATCH;
    this.priority = config.priority || 0;
    this.condition = config.condition;
    this.metadata = config.metadata || {};
    
    this._validateRule();
  }

  /**
   * Validates rule configuration
   * @private
   */
  _validateRule() {
    if (!this.id || typeof this.id !== 'string') {
      throw new Error('RewriteRule requires valid id');
    }
    
    if (!this.pattern || !this.pattern.nodes || !Array.isArray(this.pattern.nodes)) {
      throw new Error(`RewriteRule ${this.id}: pattern must have nodes array`);
    }
    
    if (!this.replacement) {
      throw new Error(`RewriteRule ${this.id}: replacement specification required`);
    }
    
    // Validate pattern variables are unique
    const variables = new Set();
    for (const node of this.pattern.nodes) {
      if (node.variable) {
        if (variables.has(node.variable)) {
          throw new Error(`RewriteRule ${this.id}: duplicate variable ${node.variable}`);
        }
        variables.add(node.variable);
      }
    }
    
    if (this.pattern.edges) {
      for (const edge of this.pattern.edges) {
        if (edge.variable) {
          if (variables.has(edge.variable)) {
            throw new Error(`RewriteRule ${this.id}: duplicate variable ${edge.variable}`);
          }
          variables.add(edge.variable);
        }
      }
    }
  }

  /**
   * Matches a node against a node pattern
   * @param {Object} node - Node to match
   * @param {NodePattern} pattern - Pattern to match against
   * @returns {boolean} True if node matches pattern
   */
  matchNode(node, pattern) {
    // Match specific ID
    if (pattern.id && node.id !== pattern.id) {
      return false;
    }
    
    // Match type
    if (pattern.type && node.type !== pattern.type) {
      return false;
    }
    
    // Match properties
    if (pattern.properties) {
      for (const [key, constraint] of Object.entries(pattern.properties)) {
        if (!this._matchProperty(node.data?.[key], constraint)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Matches an edge against an edge pattern
   * @param {Object} edge - Edge to match
   * @param {EdgePattern} pattern - Pattern to match against
   * @param {Object} bindings - Current variable bindings
   * @returns {boolean} True if edge matches pattern
   */
  matchEdge(edge, pattern, bindings) {
    // Match source and target nodes
    const fromNode = bindings[pattern.from];
    const toNode = bindings[pattern.to];
    
    if (!fromNode || !toNode) {
      return false;
    }
    
    if (edge.source !== fromNode.id || edge.target !== toNode.id) {
      return false;
    }
    
    // Match type
    if (pattern.type && edge.type !== pattern.type) {
      return false;
    }
    
    // Match properties
    if (pattern.properties) {
      for (const [key, constraint] of Object.entries(pattern.properties)) {
        if (!this._matchProperty(edge.data?.[key], constraint)) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Matches a property value against a constraint
   * @private
   * @param {*} value - Property value
   * @param {{operator: MatchOperator, value: *}} constraint - Constraint to check
   * @returns {boolean} True if value matches constraint
   */
  _matchProperty(value, constraint) {
    const { operator, value: constraintValue } = constraint;
    
    switch (operator) {
      case MatchOperator.EQUALS:
        return value === constraintValue;
      
      case MatchOperator.NOT_EQUALS:
        return value !== constraintValue;
      
      case MatchOperator.CONTAINS:
        return typeof value === 'string' && value.includes(constraintValue);
      
      case MatchOperator.MATCHES:
        return typeof value === 'string' && new RegExp(constraintValue).test(value);
      
      case MatchOperator.EXISTS:
        return value !== undefined && value !== null;
      
      case MatchOperator.NOT_EXISTS:
        return value === undefined || value === null;
      
      case MatchOperator.IN:
        return Array.isArray(constraintValue) && constraintValue.includes(value);
      
      case MatchOperator.NOT_IN:
        return Array.isArray(constraintValue) && !constraintValue.includes(value);
      
      case MatchOperator.GREATER_THAN:
        return typeof value === 'number' && value > constraintValue;
      
      case MatchOperator.LESS_THAN:
        return typeof value === 'number' && value < constraintValue;
      
      case MatchOperator.ANY:
        return true;
      
      default:
        console.warn(`Unknown match operator: ${operator}`);
        return false;
    }
  }

  /**
   * Applies replacement specification using matched bindings
   * @param {Object} bindings - Variable bindings from pattern match
   * @returns {Object} Replacement actions {addNodes, addEdges, removeNodes, removeEdges, updateNodes, updateEdges}
   */
  applyReplacement(bindings) {
    const actions = {
      addNodes: [],
      addEdges: [],
      removeNodes: [],
      removeEdges: [],
      updateNodes: [],
      updateEdges: []
    };
    
    // Process node additions
    if (this.replacement.nodes) {
      for (const nodeSpec of this.replacement.nodes) {
        const node = {
          id: this._resolveValue(nodeSpec.id, bindings),
          type: nodeSpec.type,
          data: this._resolveValue(nodeSpec.properties, bindings)
        };
        actions.addNodes.push(node);
      }
    }
    
    // Process edge additions
    if (this.replacement.edges) {
      for (const edgeSpec of this.replacement.edges) {
        const edge = {
          source: this._resolveValue(edgeSpec.from, bindings),
          target: this._resolveValue(edgeSpec.to, bindings),
          type: edgeSpec.type,
          data: edgeSpec.properties ? this._resolveValue(edgeSpec.properties, bindings) : {}
        };
        actions.addEdges.push(edge);
      }
    }
    
    // Process node removals
    if (this.replacement.removeNodes) {
      for (const variable of this.replacement.removeNodes) {
        const node = bindings[variable];
        if (node) {
          actions.removeNodes.push(node.id);
        }
      }
    }
    
    // Process edge removals
    if (this.replacement.removeEdges) {
      for (const variable of this.replacement.removeEdges) {
        const edge = bindings[variable];
        if (edge) {
          actions.removeEdges.push(edge.id);
        }
      }
    }
    
    // Process node updates
    if (this.replacement.updateNodes) {
      for (const updateSpec of this.replacement.updateNodes) {
        const node = bindings[updateSpec.node];
        if (node) {
          actions.updateNodes.push({
            id: node.id,
            properties: this._resolveValue(updateSpec.properties, bindings)
          });
        }
      }
    }
    
    // Process edge updates
    if (this.replacement.updateEdges) {
      for (const updateSpec of this.replacement.updateEdges) {
        const edge = bindings[updateSpec.edge];
        if (edge) {
          actions.updateEdges.push({
            id: edge.id,
            properties: this._resolveValue(updateSpec.properties, bindings)
          });
        }
      }
    }
    
    return actions;
  }

  /**
   * Resolves a value that may be a function or literal
   * @private
   * @param {*|Function} value - Value or function to resolve
   * @param {Object} bindings - Variable bindings
   * @returns {*} Resolved value
   */
  _resolveValue(value, bindings) {
    if (typeof value === 'function') {
      return value(bindings);
    }
    return value;
  }

  /**
   * Serializes rule to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      pattern: this.pattern,
      replacement: this.replacement,
      strategy: this.strategy,
      priority: this.priority,
      metadata: this.metadata
    };
  }

  /**
   * Creates rule from JSON
   * @param {Object} json - JSON representation
   * @returns {RewriteRule} Reconstructed rule
   */
  static fromJSON(json) {
    return new RewriteRule(json);
  }
}

/**
 * Builder for creating rewrite rules with fluent API
 */
export class RewriteRuleBuilder {
  constructor() {
    this._config = {
      pattern: { nodes: [] },
      replacement: {}
    };
  }

  /**
   * Sets rule ID
   * @param {string} id - Rule identifier
   * @returns {RewriteRuleBuilder} This builder
   */
  id(id) {
    this._config.id = id;
    return this;
  }

  /**
   * Sets rule name
   * @param {string} name - Rule name
   * @returns {RewriteRuleBuilder} This builder
   */
  name(name) {
    this._config.name = name;
    return this;
  }

  /**
   * Sets rule description
   * @param {string} description - Rule description
   * @returns {RewriteRuleBuilder} This builder
   */
  description(description) {
    this._config.description = description;
    return this;
  }

  /**
   * Adds node pattern to match
   * @param {NodePattern} pattern - Node pattern
   * @returns {RewriteRuleBuilder} This builder
   */
  matchNode(pattern) {
    this._config.pattern.nodes.push(pattern);
    return this;
  }

  /**
   * Adds edge pattern to match
   * @param {EdgePattern} pattern - Edge pattern
   * @returns {RewriteRuleBuilder} This builder
   */
  matchEdge(pattern) {
    if (!this._config.pattern.edges) {
      this._config.pattern.edges = [];
    }
    this._config.pattern.edges.push(pattern);
    return this;
  }

  /**
   * Sets pattern constraint function
   * @param {Function} constraint - Constraint function
   * @returns {RewriteRuleBuilder} This builder
   */
  constraint(constraint) {
    this._config.pattern.constraint = constraint;
    return this;
  }

  /**
   * Adds node to create in replacement
   * @param {Object} nodeSpec - Node specification
   * @returns {RewriteRuleBuilder} This builder
   */
  addNode(nodeSpec) {
    if (!this._config.replacement.nodes) {
      this._config.replacement.nodes = [];
    }
    this._config.replacement.nodes.push(nodeSpec);
    return this;
  }

  /**
   * Adds edge to create in replacement
   * @param {Object} edgeSpec - Edge specification
   * @returns {RewriteRuleBuilder} This builder
   */
  addEdge(edgeSpec) {
    if (!this._config.replacement.edges) {
      this._config.replacement.edges = [];
    }
    this._config.replacement.edges.push(edgeSpec);
    return this;
  }

  /**
   * Marks node for removal
   * @param {string} variable - Variable name of node to remove
   * @returns {RewriteRuleBuilder} This builder
   */
  removeNode(variable) {
    if (!this._config.replacement.removeNodes) {
      this._config.replacement.removeNodes = [];
    }
    this._config.replacement.removeNodes.push(variable);
    return this;
  }

  /**
   * Marks edge for removal
   * @param {string} variable - Variable name of edge to remove
   * @returns {RewriteRuleBuilder} This builder
   */
  removeEdge(variable) {
    if (!this._config.replacement.removeEdges) {
      this._config.replacement.removeEdges = [];
    }
    this._config.replacement.removeEdges.push(variable);
    return this;
  }

  /**
   * Adds node update
   * @param {string} variable - Variable name of node to update
   * @param {Object|Function} properties - Properties to update
   * @returns {RewriteRuleBuilder} This builder
   */
  updateNode(variable, properties) {
    if (!this._config.replacement.updateNodes) {
      this._config.replacement.updateNodes = [];
    }
    this._config.replacement.updateNodes.push({ node: variable, properties });
    return this;
  }

  /**
   * Sets rule strategy
   * @param {RuleStrategy} strategy - Application strategy
   * @returns {RewriteRuleBuilder} This builder
   */
  strategy(strategy) {
    this._config.strategy = strategy;
    return this;
  }

  /**
   * Sets rule priority
   * @param {number} priority - Priority value
   * @returns {RewriteRuleBuilder} This builder
   */
  priority(priority) {
    this._config.priority = priority;
    return this;
  }

  /**
   * Builds the rewrite rule
   * @returns {RewriteRule} Constructed rule
   */
  build() {
    return new RewriteRule(this._config);
  }
}

/**
 * Collection of rewrite rules with management capabilities
 */
export class RewriteRuleSet {
  constructor() {
    /** @type {Map<string, RewriteRule>} */
    this.rules = new Map();
  }

  /**
   * Adds a rule to the set
   * @param {RewriteRule} rule - Rule to add
   */
  addRule(rule) {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule ${rule.id} already exists in set`);
    }
    this.rules.set(rule.id, rule);
  }

  /**
   * Removes a rule from the set
   * @param {string} ruleId - ID of rule to remove
   * @returns {boolean} True if rule was removed
   */
  removeRule(ruleId) {
    return this.rules.delete(ruleId);
  }

  /**
   * Gets a rule by ID
   * @param {string} ruleId - Rule ID
   * @returns {RewriteRule|undefined} Rule if found
   */
  getRule(ruleId) {
    return this.rules.get(ruleId);
  }

  /**
   * Gets all rules sorted by priority (descending)
   * @returns {RewriteRule[]} Sorted rules
   */
  getRulesByPriority() {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gets rules matching specific criteria
   * @param {Function} predicate - Filter function (rule) => boolean
   * @returns {RewriteRule[]} Matching rules
   */
  filterRules(predicate) {
    return Array.from(this.rules.values()).filter(predicate);
  }

  /**
   * Clears all rules
   */
  clear() {
    this.rules.clear();
  }

  /**
   * Gets number of rules in set
   * @returns {number} Rule count
   */
  get size() {
    return this.rules.size;
  }

  /**
   * Serializes rule set to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      rules: Array.from(this.rules.values()).map(rule => rule.toJSON())
    };
  }

  /**
   * Creates rule set from JSON
   * @param {Object} json - JSON representation
   * @returns {RewriteRuleSet} Reconstructed rule set
   */
  static fromJSON(json) {
    const ruleSet = new RewriteRuleSet();
    for (const ruleJson of json.rules) {
      ruleSet.addRule(RewriteRule.fromJSON(ruleJson));
    }
    return ruleSet;
  }
}