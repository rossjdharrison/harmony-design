/**
 * @fileoverview OptimizationPass - Individual optimization passes for graph transformations
 * Implements specific optimization strategies like constant folding, inlining, dead code elimination
 * 
 * Related files:
 * - harmony-graph/graph-optimizer.js - Orchestrates optimization passes
 * - harmony-graph/graph-rewriter.js - Applies rewrite rules
 * - harmony-graph/rewrite-rule.js - Pattern matching and replacement
 * 
 * @see DESIGN_SYSTEM.md#optimization-pass
 */

/**
 * Base class for optimization passes
 * Each pass implements a specific optimization strategy
 */
export class OptimizationPass {
  /**
   * @param {string} name - Pass name for debugging
   * @param {Object} options - Pass configuration
   */
  constructor(name, options = {}) {
    this.name = name;
    this.enabled = options.enabled !== false;
    this.maxIterations = options.maxIterations || 10;
    this.stats = {
      applicationsCount: 0,
      nodesModified: 0,
      edgesModified: 0,
      executionTimeMs: 0
    };
  }

  /**
   * Apply optimization pass to graph
   * @param {Object} graph - Graph to optimize
   * @returns {Promise<{modified: boolean, graph: Object}>}
   */
  async apply(graph) {
    if (!this.enabled) {
      return { modified: false, graph };
    }

    const startTime = performance.now();
    let modified = false;
    let iterations = 0;

    while (iterations < this.maxIterations) {
      const result = await this._applyOnce(graph);
      
      if (!result.modified) {
        break;
      }

      modified = true;
      graph = result.graph;
      iterations++;
    }

    this.stats.executionTimeMs += performance.now() - startTime;
    
    return { modified, graph };
  }

  /**
   * Apply pass once (to be implemented by subclasses)
   * @param {Object} graph - Graph to optimize
   * @returns {Promise<{modified: boolean, graph: Object}>}
   * @protected
   */
  async _applyOnce(graph) {
    throw new Error('OptimizationPass._applyOnce must be implemented by subclass');
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      applicationsCount: 0,
      nodesModified: 0,
      edgesModified: 0,
      executionTimeMs: 0
    };
  }

  /**
   * Get pass statistics
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }
}

/**
 * Constant Folding Pass
 * Evaluates constant expressions at compile time
 * Example: Add(2, 3) → Constant(5)
 */
export class ConstantFoldingPass extends OptimizationPass {
  constructor(options = {}) {
    super('ConstantFolding', options);
    this.foldableOps = new Set([
      'Add', 'Subtract', 'Multiply', 'Divide',
      'And', 'Or', 'Not',
      'Equal', 'NotEqual', 'LessThan', 'GreaterThan'
    ]);
  }

  async _applyOnce(graph) {
    let modified = false;
    const newNodes = new Map(graph.nodes);

    for (const [nodeId, node] of graph.nodes) {
      if (!this.foldableOps.has(node.type)) {
        continue;
      }

      const inputValues = this._getConstantInputs(graph, nodeId);
      
      if (!inputValues) {
        continue; // Not all inputs are constants
      }

      const result = this._evaluateOperation(node.type, inputValues);
      
      if (result !== null) {
        // Replace node with constant
        newNodes.set(nodeId, {
          id: nodeId,
          type: 'Constant',
          value: result,
          metadata: {
            ...node.metadata,
            foldedFrom: node.type,
            foldedAt: Date.now()
          }
        });

        modified = true;
        this.stats.nodesModified++;
      }
    }

    if (modified) {
      this.stats.applicationsCount++;
    }

    return {
      modified,
      graph: { ...graph, nodes: newNodes }
    };
  }

  /**
   * Get constant input values for a node
   * @param {Object} graph
   * @param {string} nodeId
   * @returns {Array|null} Array of values or null if not all constants
   * @private
   */
  _getConstantInputs(graph, nodeId) {
    const inputs = [];
    
    for (const [edgeId, edge] of graph.edges) {
      if (edge.to !== nodeId) {
        continue;
      }

      const sourceNode = graph.nodes.get(edge.from);
      
      if (!sourceNode || sourceNode.type !== 'Constant') {
        return null; // Non-constant input
      }

      inputs.push({
        port: edge.toPort,
        value: sourceNode.value
      });
    }

    return inputs.sort((a, b) => a.port.localeCompare(b.port));
  }

  /**
   * Evaluate operation on constant inputs
   * @param {string} opType
   * @param {Array} inputs
   * @returns {*} Result value or null if cannot evaluate
   * @private
   */
  _evaluateOperation(opType, inputs) {
    try {
      const values = inputs.map(i => i.value);

      switch (opType) {
        case 'Add':
          return values.reduce((a, b) => a + b, 0);
        case 'Subtract':
          return values[0] - values[1];
        case 'Multiply':
          return values.reduce((a, b) => a * b, 1);
        case 'Divide':
          return values[1] !== 0 ? values[0] / values[1] : null;
        case 'And':
          return values.every(v => v);
        case 'Or':
          return values.some(v => v);
        case 'Not':
          return !values[0];
        case 'Equal':
          return values[0] === values[1];
        case 'NotEqual':
          return values[0] !== values[1];
        case 'LessThan':
          return values[0] < values[1];
        case 'GreaterThan':
          return values[0] > values[1];
        default:
          return null;
      }
    } catch (e) {
      return null;
    }
  }
}

/**
 * Dead Code Elimination Pass
 * Removes nodes that have no effect on outputs
 */
export class DeadCodeEliminationPass extends OptimizationPass {
  constructor(options = {}) {
    super('DeadCodeElimination', options);
  }

  async _applyOnce(graph) {
    const liveNodes = this._findLiveNodes(graph);
    const newNodes = new Map();
    const newEdges = new Map();
    let modified = false;

    // Keep only live nodes
    for (const [nodeId, node] of graph.nodes) {
      if (liveNodes.has(nodeId)) {
        newNodes.set(nodeId, node);
      } else {
        modified = true;
        this.stats.nodesModified++;
      }
    }

    // Keep only edges between live nodes
    for (const [edgeId, edge] of graph.edges) {
      if (liveNodes.has(edge.from) && liveNodes.has(edge.to)) {
        newEdges.set(edgeId, edge);
      } else {
        modified = true;
        this.stats.edgesModified++;
      }
    }

    if (modified) {
      this.stats.applicationsCount++;
    }

    return {
      modified,
      graph: {
        ...graph,
        nodes: newNodes,
        edges: newEdges
      }
    };
  }

  /**
   * Find nodes that affect outputs (live nodes)
   * @param {Object} graph
   * @returns {Set<string>} Set of live node IDs
   * @private
   */
  _findLiveNodes(graph) {
    const liveNodes = new Set();
    const queue = [];

    // Start with output nodes
    for (const [nodeId, node] of graph.nodes) {
      if (node.type === 'Output' || node.metadata?.isOutput) {
        liveNodes.add(nodeId);
        queue.push(nodeId);
      }
    }

    // Traverse backwards to find all nodes that affect outputs
    while (queue.length > 0) {
      const nodeId = queue.shift();

      for (const [edgeId, edge] of graph.edges) {
        if (edge.to === nodeId && !liveNodes.has(edge.from)) {
          liveNodes.add(edge.from);
          queue.push(edge.from);
        }
      }
    }

    return liveNodes;
  }
}

/**
 * Inline Expansion Pass
 * Inlines small subgraphs directly into parent graph
 */
export class InlineExpansionPass extends OptimizationPass {
  constructor(options = {}) {
    super('InlineExpansion', options);
    this.maxInlineNodes = options.maxInlineNodes || 5;
    this.inlinableTypes = new Set(options.inlinableTypes || ['SubGraph', 'Function']);
  }

  async _applyOnce(graph) {
    let modified = false;
    let newGraph = graph;

    for (const [nodeId, node] of graph.nodes) {
      if (!this.inlinableTypes.has(node.type)) {
        continue;
      }

      if (!node.subgraph || node.subgraph.nodes.size > this.maxInlineNodes) {
        continue;
      }

      // Inline this subgraph
      const result = this._inlineSubgraph(newGraph, nodeId, node.subgraph);
      
      if (result.modified) {
        newGraph = result.graph;
        modified = true;
        this.stats.nodesModified += node.subgraph.nodes.size;
      }
    }

    if (modified) {
      this.stats.applicationsCount++;
    }

    return { modified, graph: newGraph };
  }

  /**
   * Inline a subgraph into parent graph
   * @param {Object} graph - Parent graph
   * @param {string} nodeId - Node to inline
   * @param {Object} subgraph - Subgraph to inline
   * @returns {{modified: boolean, graph: Object}}
   * @private
   */
  _inlineSubgraph(graph, nodeId, subgraph) {
    const newNodes = new Map(graph.nodes);
    const newEdges = new Map(graph.edges);
    const nodeMapping = new Map();

    // Create new nodes for subgraph nodes
    for (const [subNodeId, subNode] of subgraph.nodes) {
      const newNodeId = `${nodeId}_${subNodeId}`;
      nodeMapping.set(subNodeId, newNodeId);
      
      newNodes.set(newNodeId, {
        ...subNode,
        id: newNodeId,
        metadata: {
          ...subNode.metadata,
          inlinedFrom: nodeId,
          inlinedAt: Date.now()
        }
      });
    }

    // Create new edges for subgraph edges
    for (const [subEdgeId, subEdge] of subgraph.edges) {
      const newEdgeId = `${nodeId}_${subEdgeId}`;
      
      newEdges.set(newEdgeId, {
        ...subEdge,
        id: newEdgeId,
        from: nodeMapping.get(subEdge.from),
        to: nodeMapping.get(subEdge.to)
      });
    }

    // Reconnect input edges
    for (const [edgeId, edge] of graph.edges) {
      if (edge.to === nodeId) {
        const inputNode = this._findInputNode(subgraph, edge.toPort);
        if (inputNode) {
          newEdges.set(edgeId, {
            ...edge,
            to: nodeMapping.get(inputNode)
          });
        }
      }
    }

    // Reconnect output edges
    for (const [edgeId, edge] of graph.edges) {
      if (edge.from === nodeId) {
        const outputNode = this._findOutputNode(subgraph, edge.fromPort);
        if (outputNode) {
          newEdges.set(edgeId, {
            ...edge,
            from: nodeMapping.get(outputNode)
          });
        }
      }
    }

    // Remove original node
    newNodes.delete(nodeId);

    return {
      modified: true,
      graph: {
        ...graph,
        nodes: newNodes,
        edges: newEdges
      }
    };
  }

  /**
   * Find input node in subgraph for given port
   * @param {Object} subgraph
   * @param {string} port
   * @returns {string|null}
   * @private
   */
  _findInputNode(subgraph, port) {
    for (const [nodeId, node] of subgraph.nodes) {
      if (node.type === 'Input' && node.port === port) {
        return nodeId;
      }
    }
    return null;
  }

  /**
   * Find output node in subgraph for given port
   * @param {Object} subgraph
   * @param {string} port
   * @returns {string|null}
   * @private
   */
  _findOutputNode(subgraph, port) {
    for (const [nodeId, node] of subgraph.nodes) {
      if (node.type === 'Output' && node.port === port) {
        return nodeId;
      }
    }
    return null;
  }
}

/**
 * Common Subexpression Elimination Pass
 * Identifies and deduplicates identical computations
 */
export class CommonSubexpressionEliminationPass extends OptimizationPass {
  constructor(options = {}) {
    super('CommonSubexpressionElimination', options);
  }

  async _applyOnce(graph) {
    const equivalentNodes = this._findEquivalentNodes(graph);
    
    if (equivalentNodes.size === 0) {
      return { modified: false, graph };
    }

    let modified = false;
    const newEdges = new Map(graph.edges);
    const nodesToRemove = new Set();

    // For each set of equivalent nodes, keep one and redirect edges
    for (const [representative, equivalents] of equivalentNodes) {
      for (const duplicate of equivalents) {
        if (duplicate === representative) continue;

        // Redirect edges from duplicate to representative
        for (const [edgeId, edge] of newEdges) {
          if (edge.from === duplicate) {
            newEdges.set(edgeId, {
              ...edge,
              from: representative
            });
            modified = true;
            this.stats.edgesModified++;
          }
        }

        nodesToRemove.add(duplicate);
        this.stats.nodesModified++;
      }
    }

    if (!modified) {
      return { modified: false, graph };
    }

    // Remove duplicate nodes
    const newNodes = new Map(graph.nodes);
    for (const nodeId of nodesToRemove) {
      newNodes.delete(nodeId);
    }

    this.stats.applicationsCount++;

    return {
      modified: true,
      graph: {
        ...graph,
        nodes: newNodes,
        edges: newEdges
      }
    };
  }

  /**
   * Find groups of equivalent nodes
   * @param {Object} graph
   * @returns {Map<string, Set<string>>} Map from representative to equivalents
   * @private
   */
  _findEquivalentNodes(graph) {
    const equivalentGroups = new Map();
    const nodeSignatures = new Map();

    // Compute signature for each node
    for (const [nodeId, node] of graph.nodes) {
      const signature = this._computeNodeSignature(graph, nodeId, node);
      
      if (!nodeSignatures.has(signature)) {
        nodeSignatures.set(signature, []);
      }
      
      nodeSignatures.get(signature).push(nodeId);
    }

    // Group nodes with same signature
    for (const [signature, nodeIds] of nodeSignatures) {
      if (nodeIds.length > 1) {
        const representative = nodeIds[0];
        equivalentGroups.set(representative, new Set(nodeIds));
      }
    }

    return equivalentGroups;
  }

  /**
   * Compute signature for node (type + inputs)
   * @param {Object} graph
   * @param {string} nodeId
   * @param {Object} node
   * @returns {string}
   * @private
   */
  _computeNodeSignature(graph, nodeId, node) {
    const inputs = [];
    
    for (const [edgeId, edge] of graph.edges) {
      if (edge.to === nodeId) {
        inputs.push(`${edge.toPort}:${edge.from}`);
      }
    }

    inputs.sort();
    
    return `${node.type}|${JSON.stringify(node.value)}|${inputs.join(',')}`;
  }
}

/**
 * Strength Reduction Pass
 * Replaces expensive operations with cheaper equivalents
 * Example: x * 2 → x << 1
 */
export class StrengthReductionPass extends OptimizationPass {
  constructor(options = {}) {
    super('StrengthReduction', options);
  }

  async _applyOnce(graph) {
    let modified = false;
    const newNodes = new Map(graph.nodes);

    for (const [nodeId, node] of graph.nodes) {
      const reduction = this._findReduction(graph, nodeId, node);
      
      if (reduction) {
        newNodes.set(nodeId, {
          ...node,
          type: reduction.newType,
          value: reduction.newValue,
          metadata: {
            ...node.metadata,
            reducedFrom: node.type,
            reducedAt: Date.now()
          }
        });

        modified = true;
        this.stats.nodesModified++;
      }
    }

    if (modified) {
      this.stats.applicationsCount++;
    }

    return {
      modified,
      graph: { ...graph, nodes: newNodes }
    };
  }

  /**
   * Find strength reduction for node
   * @param {Object} graph
   * @param {string} nodeId
   * @param {Object} node
   * @returns {Object|null}
   * @private
   */
  _findReduction(graph, nodeId, node) {
    // Multiply by power of 2 → Shift left
    if (node.type === 'Multiply') {
      const constant = this._getConstantInput(graph, nodeId);
      if (constant && this._isPowerOfTwo(constant)) {
        return {
          newType: 'ShiftLeft',
          newValue: Math.log2(constant)
        };
      }
    }

    // Divide by power of 2 → Shift right
    if (node.type === 'Divide') {
      const constant = this._getConstantInput(graph, nodeId);
      if (constant && this._isPowerOfTwo(constant)) {
        return {
          newType: 'ShiftRight',
          newValue: Math.log2(constant)
        };
      }
    }

    return null;
  }

  /**
   * Get constant input if exactly one input is constant
   * @param {Object} graph
   * @param {string} nodeId
   * @returns {number|null}
   * @private
   */
  _getConstantInput(graph, nodeId) {
    let constantValue = null;
    let constantCount = 0;

    for (const [edgeId, edge] of graph.edges) {
      if (edge.to === nodeId) {
        const sourceNode = graph.nodes.get(edge.from);
        if (sourceNode && sourceNode.type === 'Constant') {
          constantValue = sourceNode.value;
          constantCount++;
        }
      }
    }

    return constantCount === 1 ? constantValue : null;
  }

  /**
   * Check if number is power of 2
   * @param {number} n
   * @returns {boolean}
   * @private
   */
  _isPowerOfTwo(n) {
    return n > 0 && (n & (n - 1)) === 0;
  }
}