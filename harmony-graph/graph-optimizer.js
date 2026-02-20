/**
 * @fileoverview GraphOptimizer - Apply optimization passes to graphs
 * @module harmony-graph/graph-optimizer
 * 
 * Applies optimization passes to graph structures:
 * - Dead node elimination: Removes nodes with no inputs/outputs
 * - Edge fusion: Merges redundant edges between same nodes
 * - Constant folding: Evaluates constant expressions at optimization time
 * - Path simplification: Removes unnecessary intermediate nodes
 * 
 * Performance targets:
 * - Optimization pass: <5ms for graphs with <1000 nodes
 * - Memory overhead: <1MB per optimization context
 * 
 * Related: harmony-graph/graph-rewriter.js, harmony-graph/graph-introspector.js
 * See: DESIGN_SYSTEM.md § Graph Optimization
 */

import { GraphIntrospector } from './graph-introspector.js';

/**
 * @typedef {Object} OptimizationPass
 * @property {string} name - Pass name
 * @property {Function} apply - Function to apply the pass
 * @property {number} priority - Execution priority (lower = earlier)
 */

/**
 * @typedef {Object} OptimizationResult
 * @property {boolean} modified - Whether graph was modified
 * @property {number} nodesRemoved - Number of nodes removed
 * @property {number} edgesRemoved - Number of edges removed
 * @property {number} edgesMerged - Number of edges merged
 * @property {number} durationMs - Optimization duration
 * @property {string[]} appliedPasses - Names of passes that modified graph
 */

/**
 * @typedef {Object} OptimizationConfig
 * @property {boolean} deadNodeElimination - Enable dead node removal
 * @property {boolean} edgeFusion - Enable edge fusion
 * @property {boolean} constantFolding - Enable constant folding
 * @property {boolean} pathSimplification - Enable path simplification
 * @property {number} maxIterations - Maximum optimization iterations
 * @property {boolean} preserveMetadata - Keep node metadata during optimization
 */

/**
 * GraphOptimizer applies optimization passes to graph structures
 * Implements iterative optimization until fixed point or max iterations
 */
export class GraphOptimizer {
  /**
   * @param {OptimizationConfig} [config] - Optimization configuration
   */
  constructor(config = {}) {
    /** @type {OptimizationConfig} */
    this.config = {
      deadNodeElimination: true,
      edgeFusion: true,
      constantFolding: false,
      pathSimplification: false,
      maxIterations: 10,
      preserveMetadata: true,
      ...config
    };

    /** @type {OptimizationPass[]} */
    this.passes = [];
    
    /** @type {GraphIntrospector} */
    this.introspector = new GraphIntrospector();

    this._registerBuiltInPasses();
  }

  /**
   * Register built-in optimization passes
   * @private
   */
  _registerBuiltInPasses() {
    if (this.config.deadNodeElimination) {
      this.registerPass({
        name: 'dead-node-elimination',
        apply: this._deadNodeEliminationPass.bind(this),
        priority: 1
      });
    }

    if (this.config.edgeFusion) {
      this.registerPass({
        name: 'edge-fusion',
        apply: this._edgeFusionPass.bind(this),
        priority: 2
      });
    }

    if (this.config.constantFolding) {
      this.registerPass({
        name: 'constant-folding',
        apply: this._constantFoldingPass.bind(this),
        priority: 3
      });
    }

    if (this.config.pathSimplification) {
      this.registerPass({
        name: 'path-simplification',
        apply: this._pathSimplificationPass.bind(this),
        priority: 4
      });
    }
  }

  /**
   * Register a custom optimization pass
   * @param {OptimizationPass} pass - Optimization pass to register
   */
  registerPass(pass) {
    if (!pass.name || typeof pass.apply !== 'function') {
      throw new Error('Invalid optimization pass: must have name and apply function');
    }

    this.passes.push({
      priority: 100,
      ...pass
    });

    // Sort by priority
    this.passes.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Optimize a graph by applying all registered passes
   * @param {Object} graph - Graph structure to optimize
   * @returns {OptimizationResult} Optimization result
   */
  optimize(graph) {
    const startTime = performance.now();
    
    const result = {
      modified: false,
      nodesRemoved: 0,
      edgesRemoved: 0,
      edgesMerged: 0,
      durationMs: 0,
      appliedPasses: []
    };

    let iteration = 0;
    let modified = true;

    // Iterative optimization until fixed point or max iterations
    while (modified && iteration < this.config.maxIterations) {
      modified = false;
      iteration++;

      for (const pass of this.passes) {
        const passResult = pass.apply(graph);
        
        if (passResult.modified) {
          modified = true;
          result.modified = true;
          result.nodesRemoved += passResult.nodesRemoved || 0;
          result.edgesRemoved += passResult.edgesRemoved || 0;
          result.edgesMerged += passResult.edgesMerged || 0;
          
          if (!result.appliedPasses.includes(pass.name)) {
            result.appliedPasses.push(pass.name);
          }
        }
      }
    }

    result.durationMs = performance.now() - startTime;
    
    return result;
  }

  /**
   * Dead node elimination pass
   * Removes nodes that have no connections or are unreachable
   * @private
   * @param {Object} graph - Graph to optimize
   * @returns {Object} Pass result
   */
  _deadNodeEliminationPass(graph) {
    const result = {
      modified: false,
      nodesRemoved: 0,
      edgesRemoved: 0
    };

    if (!graph.nodes || !Array.isArray(graph.nodes)) {
      return result;
    }

    const deadNodes = new Set();

    // Find nodes with no inputs and no outputs
    for (const node of graph.nodes) {
      const hasInputs = this._hasIncomingEdges(graph, node.id);
      const hasOutputs = this._hasOutgoingEdges(graph, node.id);
      
      // Node is dead if it has no connections (except entry/exit nodes)
      if (!hasInputs && !hasOutputs && !node.isEntry && !node.isExit) {
        deadNodes.add(node.id);
      }
    }

    // Find unreachable nodes (not connected to entry nodes)
    const reachable = this._findReachableNodes(graph);
    for (const node of graph.nodes) {
      if (!reachable.has(node.id) && !node.isEntry && !node.isExit) {
        deadNodes.add(node.id);
      }
    }

    // Remove dead nodes
    if (deadNodes.size > 0) {
      graph.nodes = graph.nodes.filter(node => !deadNodes.has(node.id));
      
      // Remove edges connected to dead nodes
      if (graph.edges && Array.isArray(graph.edges)) {
        const originalEdgeCount = graph.edges.length;
        graph.edges = graph.edges.filter(edge => 
          !deadNodes.has(edge.source) && !deadNodes.has(edge.target)
        );
        result.edgesRemoved = originalEdgeCount - graph.edges.length;
      }

      result.modified = true;
      result.nodesRemoved = deadNodes.size;
    }

    return result;
  }

  /**
   * Edge fusion pass
   * Merges multiple edges between the same source and target
   * @private
   * @param {Object} graph - Graph to optimize
   * @returns {Object} Pass result
   */
  _edgeFusionPass(graph) {
    const result = {
      modified: false,
      edgesMerged: 0,
      edgesRemoved: 0
    };

    if (!graph.edges || !Array.isArray(graph.edges)) {
      return result;
    }

    // Group edges by source-target pair
    const edgeGroups = new Map();
    
    for (const edge of graph.edges) {
      const key = `${edge.source}:${edge.target}`;
      
      if (!edgeGroups.has(key)) {
        edgeGroups.set(key, []);
      }
      
      edgeGroups.get(key).push(edge);
    }

    // Merge redundant edges
    const mergedEdges = [];
    
    for (const [key, edges] of edgeGroups) {
      if (edges.length === 1) {
        mergedEdges.push(edges[0]);
      } else {
        // Multiple edges between same nodes - merge them
        const mergedEdge = this._mergeEdges(edges);
        mergedEdges.push(mergedEdge);
        
        result.modified = true;
        result.edgesMerged += edges.length - 1;
        result.edgesRemoved += edges.length - 1;
      }
    }

    if (result.modified) {
      graph.edges = mergedEdges;
    }

    return result;
  }

  /**
   * Constant folding pass (placeholder for future implementation)
   * @private
   * @param {Object} graph - Graph to optimize
   * @returns {Object} Pass result
   */
  _constantFoldingPass(graph) {
    // TODO: Implement constant folding
    // Evaluate constant expressions at optimization time
    return { modified: false };
  }

  /**
   * Path simplification pass (placeholder for future implementation)
   * @private
   * @param {Object} graph - Graph to optimize
   * @returns {Object} Pass result
   */
  _pathSimplificationPass(graph) {
    // TODO: Implement path simplification
    // Remove unnecessary intermediate nodes
    return { modified: false };
  }

  /**
   * Check if node has incoming edges
   * @private
   * @param {Object} graph - Graph structure
   * @param {string} nodeId - Node ID
   * @returns {boolean} True if node has incoming edges
   */
  _hasIncomingEdges(graph, nodeId) {
    if (!graph.edges || !Array.isArray(graph.edges)) {
      return false;
    }
    
    return graph.edges.some(edge => edge.target === nodeId);
  }

  /**
   * Check if node has outgoing edges
   * @private
   * @param {Object} graph - Graph structure
   * @param {string} nodeId - Node ID
   * @returns {boolean} True if node has outgoing edges
   */
  _hasOutgoingEdges(graph, nodeId) {
    if (!graph.edges || !Array.isArray(graph.edges)) {
      return false;
    }
    
    return graph.edges.some(edge => edge.source === nodeId);
  }

  /**
   * Find all nodes reachable from entry nodes
   * @private
   * @param {Object} graph - Graph structure
   * @returns {Set<string>} Set of reachable node IDs
   */
  _findReachableNodes(graph) {
    const reachable = new Set();
    const queue = [];

    // Start from entry nodes
    for (const node of graph.nodes || []) {
      if (node.isEntry) {
        queue.push(node.id);
        reachable.add(node.id);
      }
    }

    // BFS to find all reachable nodes
    while (queue.length > 0) {
      const currentId = queue.shift();
      
      for (const edge of graph.edges || []) {
        if (edge.source === currentId && !reachable.has(edge.target)) {
          reachable.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    return reachable;
  }

  /**
   * Merge multiple edges into a single edge
   * @private
   * @param {Object[]} edges - Edges to merge
   * @returns {Object} Merged edge
   */
  _mergeEdges(edges) {
    if (edges.length === 0) {
      throw new Error('Cannot merge empty edge list');
    }

    const merged = {
      id: edges[0].id,
      source: edges[0].source,
      target: edges[0].target,
      type: edges[0].type || 'merged'
    };

    // Preserve metadata if configured
    if (this.config.preserveMetadata) {
      merged.metadata = {
        mergedFrom: edges.map(e => e.id),
        mergedCount: edges.length,
        originalTypes: [...new Set(edges.map(e => e.type).filter(Boolean))]
      };

      // Merge custom properties
      merged.properties = {};
      for (const edge of edges) {
        if (edge.properties) {
          Object.assign(merged.properties, edge.properties);
        }
      }
    }

    return merged;
  }

  /**
   * Get optimization statistics
   * @param {Object} graph - Graph structure
   * @returns {Object} Statistics about potential optimizations
   */
  analyzeOptimizationPotential(graph) {
    const stats = {
      totalNodes: (graph.nodes || []).length,
      totalEdges: (graph.edges || []).length,
      deadNodes: 0,
      redundantEdges: 0,
      unreachableNodes: 0
    };

    // Count dead nodes
    for (const node of graph.nodes || []) {
      const hasInputs = this._hasIncomingEdges(graph, node.id);
      const hasOutputs = this._hasOutgoingEdges(graph, node.id);
      
      if (!hasInputs && !hasOutputs && !node.isEntry && !node.isExit) {
        stats.deadNodes++;
      }
    }

    // Count unreachable nodes
    const reachable = this._findReachableNodes(graph);
    stats.unreachableNodes = stats.totalNodes - reachable.size;

    // Count redundant edges
    const edgeGroups = new Map();
    for (const edge of graph.edges || []) {
      const key = `${edge.source}:${edge.target}`;
      edgeGroups.set(key, (edgeGroups.get(key) || 0) + 1);
    }
    
    for (const count of edgeGroups.values()) {
      if (count > 1) {
        stats.redundantEdges += count - 1;
      }
    }

    return stats;
  }

  /**
   * Reset optimizer to initial state
   */
  reset() {
    this.passes = [];
    this._registerBuiltInPasses();
  }
}

// Default export
export default GraphOptimizer;