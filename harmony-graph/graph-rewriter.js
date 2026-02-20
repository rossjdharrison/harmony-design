/**
 * @fileoverview GraphRewriter: Rules engine for transforming graph structure automatically
 * @module harmony-graph/graph-rewriter
 * 
 * Provides a rules-based system for automatically transforming graph structures.
 * Supports pattern matching, conditional transformations, and composition of rules.
 * 
 * Related: harmony-graph/meta-graph.js, harmony-graph/graph-introspector.js
 * Documentation: See DESIGN_SYSTEM.md § Graph Rewriter
 * 
 * Performance targets:
 * - Rule evaluation: <1ms per rule per node
 * - Batch transformations: <16ms for 1000 nodes
 * - Memory overhead: <5MB for rule registry
 */

/**
 * @typedef {Object} RewriteRule
 * @property {string} id - Unique rule identifier
 * @property {string} name - Human-readable rule name
 * @property {string} description - Rule description
 * @property {number} priority - Execution priority (higher = earlier)
 * @property {Function} matcher - Function(node, context) => boolean
 * @property {Function} transformer - Function(node, context) => TransformResult
 * @property {Object} [constraints] - Optional constraints for rule application
 * @property {boolean} [enabled] - Whether rule is active
 */

/**
 * @typedef {Object} TransformResult
 * @property {boolean} applied - Whether transformation was applied
 * @property {Object} [node] - Transformed node (if applied)
 * @property {Array<Object>} [newNodes] - Additional nodes to add
 * @property {Array<string>} [deleteNodes] - Node IDs to delete
 * @property {Array<Object>} [newEdges] - New edges to add
 * @property {Array<string>} [deleteEdges] - Edge IDs to delete
 * @property {string} [reason] - Explanation of transformation
 */

/**
 * @typedef {Object} RewriteContext
 * @property {Object} graph - Current graph state
 * @property {Map<string, *>} metadata - Contextual metadata
 * @property {number} iteration - Current rewrite iteration
 * @property {Array<string>} appliedRules - Rules applied so far
 */

/**
 * @typedef {Object} RewriteSession
 * @property {string} id - Session identifier
 * @property {number} startTime - Session start timestamp
 * @property {number} iterations - Number of iterations performed
 * @property {Array<Object>} transformations - Applied transformations log
 * @property {Object} stats - Session statistics
 */

/**
 * GraphRewriter: Rules engine for graph transformations
 * 
 * Enables declarative graph transformations through pattern matching and rules.
 * Supports fixed-point iteration, constraint checking, and transformation tracking.
 * 
 * @class
 */
export class GraphRewriter {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.maxIterations=100] - Maximum rewrite iterations
   * @param {number} [options.iterationTimeout=1000] - Timeout per iteration (ms)
   * @param {boolean} [options.trackHistory=true] - Track transformation history
   * @param {boolean} [options.validateConstraints=true] - Validate rule constraints
   */
  constructor(options = {}) {
    this.maxIterations = options.maxIterations || 100;
    this.iterationTimeout = options.iterationTimeout || 1000;
    this.trackHistory = options.trackHistory !== false;
    this.validateConstraints = options.validateConstraints !== false;

    /** @type {Map<string, RewriteRule>} */
    this.rules = new Map();

    /** @type {Array<RewriteRule>} */
    this.rulesByPriority = [];

    /** @type {Map<string, RewriteSession>} */
    this.sessions = new Map();

    /** @type {Object} */
    this.stats = {
      rulesRegistered: 0,
      rulesApplied: 0,
      transformationsApplied: 0,
      sessionsCompleted: 0,
      averageIterations: 0
    };

    this._initialized = true;
  }

  /**
   * Register a rewrite rule
   * 
   * @param {RewriteRule} rule - Rule to register
   * @returns {boolean} Success status
   */
  registerRule(rule) {
    if (!rule || !rule.id) {
      console.error('[GraphRewriter] Invalid rule: missing id');
      return false;
    }

    if (!rule.matcher || typeof rule.matcher !== 'function') {
      console.error(`[GraphRewriter] Invalid rule ${rule.id}: matcher must be a function`);
      return false;
    }

    if (!rule.transformer || typeof rule.transformer !== 'function') {
      console.error(`[GraphRewriter] Invalid rule ${rule.id}: transformer must be a function`);
      return false;
    }

    const normalizedRule = {
      id: rule.id,
      name: rule.name || rule.id,
      description: rule.description || '',
      priority: rule.priority || 0,
      matcher: rule.matcher,
      transformer: rule.transformer,
      constraints: rule.constraints || {},
      enabled: rule.enabled !== false
    };

    this.rules.set(rule.id, normalizedRule);
    this._rebuildPriorityList();
    this.stats.rulesRegistered++;

    return true;
  }

  /**
   * Unregister a rule
   * 
   * @param {string} ruleId - Rule identifier
   * @returns {boolean} Success status
   */
  unregisterRule(ruleId) {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this._rebuildPriorityList();
    }
    return deleted;
  }

  /**
   * Enable or disable a rule
   * 
   * @param {string} ruleId - Rule identifier
   * @param {boolean} enabled - Enable state
   * @returns {boolean} Success status
   */
  setRuleEnabled(ruleId, enabled) {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return false;
    }
    rule.enabled = enabled;
    return true;
  }

  /**
   * Rewrite a graph using registered rules
   * 
   * @param {Object} graph - Graph to rewrite (nodes, edges)
   * @param {Object} [options] - Rewrite options
   * @param {Array<string>} [options.includeRules] - Only apply these rules
   * @param {Array<string>} [options.excludeRules] - Skip these rules
   * @param {number} [options.maxIterations] - Override max iterations
   * @param {Object} [options.metadata] - Additional context metadata
   * @returns {Promise<Object>} Rewritten graph and session info
   */
  async rewrite(graph, options = {}) {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    const session = {
      id: sessionId,
      startTime,
      iterations: 0,
      transformations: [],
      stats: {
        nodesAdded: 0,
        nodesDeleted: 0,
        nodesModified: 0,
        edgesAdded: 0,
        edgesDeleted: 0,
        rulesApplied: 0
      }
    };

    this.sessions.set(sessionId, session);

    // Clone graph to avoid mutations
    let currentGraph = this._cloneGraph(graph);

    const context = {
      graph: currentGraph,
      metadata: new Map(Object.entries(options.metadata || {})),
      iteration: 0,
      appliedRules: []
    };

    const maxIter = options.maxIterations || this.maxIterations;
    const activeRules = this._getActiveRules(options);

    let converged = false;

    for (let i = 0; i < maxIter && !converged; i++) {
      context.iteration = i;
      const iterationStart = performance.now();

      const changes = await this._applyRulesIteration(currentGraph, context, activeRules);

      const iterationTime = performance.now() - iterationStart;

      if (iterationTime > this.iterationTimeout) {
        console.warn(`[GraphRewriter] Iteration ${i} exceeded timeout (${iterationTime.toFixed(2)}ms)`);
      }

      if (changes.length === 0) {
        converged = true;
      } else {
        // Apply changes to graph
        currentGraph = this._applyChanges(currentGraph, changes);
        context.graph = currentGraph;

        if (this.trackHistory) {
          session.transformations.push(...changes);
        }

        // Update stats
        changes.forEach(change => {
          if (change.newNodes) session.stats.nodesAdded += change.newNodes.length;
          if (change.deleteNodes) session.stats.nodesDeleted += change.deleteNodes.length;
          if (change.node) session.stats.nodesModified++;
          if (change.newEdges) session.stats.edgesAdded += change.newEdges.length;
          if (change.deleteEdges) session.stats.edgesDeleted += change.deleteEdges.length;
          session.stats.rulesApplied++;
        });
      }

      session.iterations++;
    }

    const totalTime = performance.now() - startTime;
    session.endTime = performance.now();
    session.duration = totalTime;
    session.converged = converged;

    this.stats.sessionsCompleted++;
    this.stats.transformationsApplied += session.transformations.length;
    this.stats.averageIterations = 
      (this.stats.averageIterations * (this.stats.sessionsCompleted - 1) + session.iterations) 
      / this.stats.sessionsCompleted;

    return {
      graph: currentGraph,
      session,
      converged,
      iterations: session.iterations,
      duration: totalTime
    };
  }

  /**
   * Apply rules for one iteration
   * 
   * @private
   * @param {Object} graph - Current graph
   * @param {RewriteContext} context - Rewrite context
   * @param {Array<RewriteRule>} rules - Active rules
   * @returns {Promise<Array<TransformResult>>} Applied transformations
   */
  async _applyRulesIteration(graph, context, rules) {
    const changes = [];

    for (const rule of rules) {
      for (const node of graph.nodes) {
        try {
          // Check if matcher applies
          const matches = await rule.matcher(node, context);

          if (matches) {
            // Validate constraints
            if (this.validateConstraints && !this._checkConstraints(rule, node, context)) {
              continue;
            }

            // Apply transformation
            const result = await rule.transformer(node, context);

            if (result && result.applied) {
              changes.push({
                ...result,
                ruleId: rule.id,
                ruleName: rule.name,
                nodeId: node.id,
                iteration: context.iteration
              });

              context.appliedRules.push(rule.id);
              this.stats.rulesApplied++;

              // Only apply first matching rule per node per iteration
              break;
            }
          }
        } catch (error) {
          console.error(`[GraphRewriter] Error applying rule ${rule.id} to node ${node.id}:`, error);
        }
      }
    }

    return changes;
  }

  /**
   * Apply accumulated changes to graph
   * 
   * @private
   * @param {Object} graph - Current graph
   * @param {Array<TransformResult>} changes - Changes to apply
   * @returns {Object} Modified graph
   */
  _applyChanges(graph, changes) {
    const newGraph = this._cloneGraph(graph);
    const nodeMap = new Map(newGraph.nodes.map(n => [n.id, n]));
    const edgeMap = new Map(newGraph.edges.map(e => [e.id, e]));

    for (const change of changes) {
      // Delete nodes
      if (change.deleteNodes) {
        change.deleteNodes.forEach(id => nodeMap.delete(id));
      }

      // Delete edges
      if (change.deleteEdges) {
        change.deleteEdges.forEach(id => edgeMap.delete(id));
      }

      // Modify node
      if (change.node) {
        nodeMap.set(change.node.id, change.node);
      }

      // Add nodes
      if (change.newNodes) {
        change.newNodes.forEach(node => nodeMap.set(node.id, node));
      }

      // Add edges
      if (change.newEdges) {
        change.newEdges.forEach(edge => {
          const edgeId = edge.id || `edge-${edge.from}-${edge.to}`;
          edgeMap.set(edgeId, { ...edge, id: edgeId });
        });
      }
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values())
    };
  }

  /**
   * Check rule constraints
   * 
   * @private
   * @param {RewriteRule} rule - Rule to check
   * @param {Object} node - Target node
   * @param {RewriteContext} context - Rewrite context
   * @returns {boolean} Constraints satisfied
   */
  _checkConstraints(rule, node, context) {
    const constraints = rule.constraints;

    // Max applications per session
    if (constraints.maxApplications) {
      const applications = context.appliedRules.filter(id => id === rule.id).length;
      if (applications >= constraints.maxApplications) {
        return false;
      }
    }

    // Node type constraints
    if (constraints.nodeTypes && !constraints.nodeTypes.includes(node.type)) {
      return false;
    }

    // Custom constraint function
    if (constraints.custom && typeof constraints.custom === 'function') {
      return constraints.custom(node, context);
    }

    return true;
  }

  /**
   * Get active rules based on options
   * 
   * @private
   * @param {Object} options - Rewrite options
   * @returns {Array<RewriteRule>} Active rules
   */
  _getActiveRules(options) {
    let rules = this.rulesByPriority.filter(r => r.enabled);

    if (options.includeRules) {
      const included = new Set(options.includeRules);
      rules = rules.filter(r => included.has(r.id));
    }

    if (options.excludeRules) {
      const excluded = new Set(options.excludeRules);
      rules = rules.filter(r => !excluded.has(r.id));
    }

    return rules;
  }

  /**
   * Rebuild priority-sorted rule list
   * 
   * @private
   */
  _rebuildPriorityList() {
    this.rulesByPriority = Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Clone graph structure
   * 
   * @private
   * @param {Object} graph - Graph to clone
   * @returns {Object} Cloned graph
   */
  _cloneGraph(graph) {
    return {
      nodes: graph.nodes.map(n => ({ ...n })),
      edges: graph.edges.map(e => ({ ...e }))
    };
  }

  /**
   * Get rewrite session
   * 
   * @param {string} sessionId - Session identifier
   * @returns {RewriteSession|null} Session or null
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all registered rules
   * 
   * @returns {Array<RewriteRule>} All rules
   */
  getRules() {
    return Array.from(this.rules.values());
  }

  /**
   * Get statistics
   * 
   * @returns {Object} Statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Clear all rules
   */
  clearRules() {
    this.rules.clear();
    this.rulesByPriority = [];
  }

  /**
   * Clear session history
   * 
   * @param {string} [sessionId] - Specific session to clear, or all if omitted
   */
  clearSessions(sessionId) {
    if (sessionId) {
      this.sessions.delete(sessionId);
    } else {
      this.sessions.clear();
    }
  }
}

/**
 * Create common rewrite rules
 * 
 * @returns {Array<RewriteRule>} Standard rule set
 */
export function createStandardRules() {
  return [
    {
      id: 'remove-orphan-nodes',
      name: 'Remove Orphan Nodes',
      description: 'Remove nodes with no incoming or outgoing edges',
      priority: 10,
      matcher: (node, context) => {
        const edges = context.graph.edges;
        const hasEdges = edges.some(e => e.from === node.id || e.to === node.id);
        return !hasEdges && !node.isRoot;
      },
      transformer: (node) => ({
        applied: true,
        deleteNodes: [node.id],
        reason: 'Node has no connections'
      })
    },
    {
      id: 'collapse-passthrough-nodes',
      name: 'Collapse Passthrough Nodes',
      description: 'Remove nodes that only pass data through',
      priority: 20,
      matcher: (node, context) => {
        const edges = context.graph.edges;
        const incoming = edges.filter(e => e.to === node.id);
        const outgoing = edges.filter(e => e.from === node.id);
        return incoming.length === 1 && outgoing.length === 1 && node.type === 'passthrough';
      },
      transformer: (node, context) => {
        const edges = context.graph.edges;
        const incoming = edges.find(e => e.to === node.id);
        const outgoing = edges.find(e => e.from === node.id);

        return {
          applied: true,
          deleteNodes: [node.id],
          deleteEdges: [incoming.id, outgoing.id],
          newEdges: [{
            from: incoming.from,
            to: outgoing.to,
            type: incoming.type
          }],
          reason: 'Collapsed passthrough node'
        };
      }
    },
    {
      id: 'merge-parallel-edges',
      name: 'Merge Parallel Edges',
      description: 'Combine multiple edges between same nodes',
      priority: 15,
      matcher: (node, context) => {
        const edges = context.graph.edges;
        const outgoing = edges.filter(e => e.from === node.id);
        const targets = new Set(outgoing.map(e => e.to));
        return targets.size < outgoing.length;
      },
      transformer: (node, context) => {
        const edges = context.graph.edges;
        const outgoing = edges.filter(e => e.from === node.id);
        const grouped = new Map();

        outgoing.forEach(edge => {
          const key = edge.to;
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key).push(edge);
        });

        const toDelete = [];
        const toAdd = [];

        grouped.forEach((edgeGroup, target) => {
          if (edgeGroup.length > 1) {
            toDelete.push(...edgeGroup.map(e => e.id));
            toAdd.push({
              from: node.id,
              to: target,
              type: 'merged',
              sources: edgeGroup.map(e => e.id)
            });
          }
        });

        return {
          applied: toDelete.length > 0,
          deleteEdges: toDelete,
          newEdges: toAdd,
          reason: `Merged ${toDelete.length} parallel edges`
        };
      }
    }
  ];
}

/**
 * Create a pattern-based matcher
 * 
 * @param {Object} pattern - Pattern to match against nodes
 * @returns {Function} Matcher function
 */
export function createPatternMatcher(pattern) {
  return (node) => {
    for (const [key, value] of Object.entries(pattern)) {
      if (typeof value === 'function') {
        if (!value(node[key])) return false;
      } else if (node[key] !== value) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Create a graph query-based matcher
 * 
 * @param {Function} query - Query function(node, graph) => boolean
 * @returns {Function} Matcher function
 */
export function createGraphQueryMatcher(query) {
  return (node, context) => query(node, context.graph);
}

/**
 * Compose multiple matchers with AND logic
 * 
 * @param {...Function} matchers - Matcher functions to compose
 * @returns {Function} Composed matcher
 */
export function andMatchers(...matchers) {
  return async (node, context) => {
    for (const matcher of matchers) {
      const result = await matcher(node, context);
      if (!result) return false;
    }
    return true;
  };
}

/**
 * Compose multiple matchers with OR logic
 * 
 * @param {...Function} matchers - Matcher functions to compose
 * @returns {Function} Composed matcher
 */
export function orMatchers(...matchers) {
  return async (node, context) => {
    for (const matcher of matchers) {
      const result = await matcher(node, context);
      if (result) return true;
    }
    return false;
  };
}