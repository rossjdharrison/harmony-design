/**
 * @fileoverview ImpactAnalysis: Given a changed node, compute all affected downstream nodes
 * 
 * This module analyzes the impact of changes to nodes in a graph by computing
 * all downstream nodes that could be affected. Uses BFS traversal to find all
 * reachable nodes from the changed node, respecting edge directionality.
 * 
 * @module harmony-graph/impact-analysis
 * @see DESIGN_SYSTEM.md#graph-engine-impact-analysis
 */

import { GraphTraversal } from './graph-traversal.js';

/**
 * @typedef {Object} ImpactResult
 * @property {string} changedNodeId - The node that was changed
 * @property {Set<string>} affectedNodes - All downstream nodes affected by the change
 * @property {Map<string, number>} distances - Distance from changed node to each affected node
 * @property {Map<string, string[]>} paths - Shortest path from changed node to each affected node
 * @property {number} maxDepth - Maximum depth of impact propagation
 */

/**
 * @typedef {Object} ImpactAnalysisOptions
 * @property {number} [maxDepth=Infinity] - Maximum depth to traverse (prevents infinite loops)
 * @property {Set<string>} [excludeNodes] - Nodes to exclude from impact analysis
 * @property {function(string): boolean} [edgeFilter] - Filter edges by type/property
 * @property {boolean} [includeIndirect=true] - Include indirectly affected nodes
 */

/**
 * ImpactAnalysis: Computes all affected downstream nodes when a node changes
 * 
 * Given a changed node in a directed graph, this analyzer identifies all nodes
 * that could be affected by the change. It performs a breadth-first traversal
 * following outgoing edges to find all reachable downstream nodes.
 * 
 * Features:
 * - BFS-based traversal for shortest paths
 * - Configurable depth limiting
 * - Edge filtering for selective propagation
 * - Distance and path tracking
 * - Cycle detection and handling
 * 
 * Performance:
 * - Time: O(V + E) where V = vertices, E = edges
 * - Space: O(V) for tracking visited nodes
 * 
 * @example
 * const analyzer = new ImpactAnalysis(graph);
 * const result = analyzer.analyze('nodeA');
 * console.log(`${result.affectedNodes.size} nodes affected`);
 * result.affectedNodes.forEach(nodeId => {
 *   console.log(`${nodeId} at distance ${result.distances.get(nodeId)}`);
 * });
 */
export class ImpactAnalysis {
  /**
   * Creates an ImpactAnalysis instance
   * @param {Object} graph - Graph structure with nodes and edges
   * @param {Map<string, Object>} graph.nodes - Map of node ID to node data
   * @param {Map<string, Array>} graph.edges - Map of source node ID to array of edges
   */
  constructor(graph) {
    if (!graph || !graph.nodes || !graph.edges) {
      throw new Error('ImpactAnalysis requires a valid graph with nodes and edges');
    }
    
    this.graph = graph;
    this.traversal = new GraphTraversal(graph);
  }

  /**
   * Analyzes the impact of a change to a specific node
   * 
   * Computes all downstream nodes that would be affected if the specified
   * node changes. Uses BFS to ensure we find the shortest path to each
   * affected node.
   * 
   * @param {string} changedNodeId - ID of the node that changed
   * @param {ImpactAnalysisOptions} [options={}] - Analysis options
   * @returns {ImpactResult} Impact analysis results
   * @throws {Error} If changed node doesn't exist in graph
   */
  analyze(changedNodeId, options = {}) {
    if (!this.graph.nodes.has(changedNodeId)) {
      throw new Error(`Node ${changedNodeId} not found in graph`);
    }

    const {
      maxDepth = Infinity,
      excludeNodes = new Set(),
      edgeFilter = null,
      includeIndirect = true
    } = options;

    const affectedNodes = new Set();
    const distances = new Map();
    const paths = new Map();
    const visited = new Set();
    const queue = [{ nodeId: changedNodeId, depth: 0, path: [changedNodeId] }];

    visited.add(changedNodeId);
    distances.set(changedNodeId, 0);
    paths.set(changedNodeId, [changedNodeId]);

    let maxDepthReached = 0;

    while (queue.length > 0) {
      const { nodeId, depth, path } = queue.shift();

      // Check depth limit
      if (depth >= maxDepth) {
        continue;
      }

      // Get outgoing edges from this node
      const edges = this.graph.edges.get(nodeId) || [];

      for (const edge of edges) {
        const targetId = edge.target;

        // Skip if node should be excluded
        if (excludeNodes.has(targetId)) {
          continue;
        }

        // Apply edge filter if provided
        if (edgeFilter && !edgeFilter(edge)) {
          continue;
        }

        // Skip if already visited (cycle detection)
        if (visited.has(targetId)) {
          continue;
        }

        visited.add(targetId);
        affectedNodes.add(targetId);

        const newDepth = depth + 1;
        const newPath = [...path, targetId];

        distances.set(targetId, newDepth);
        paths.set(targetId, newPath);
        maxDepthReached = Math.max(maxDepthReached, newDepth);

        // Continue traversal if including indirect impacts
        if (includeIndirect) {
          queue.push({
            nodeId: targetId,
            depth: newDepth,
            path: newPath
          });
        }
      }
    }

    return {
      changedNodeId,
      affectedNodes,
      distances,
      paths,
      maxDepth: maxDepthReached
    };
  }

  /**
   * Analyzes impact of multiple changed nodes simultaneously
   * 
   * Useful for batch updates where multiple nodes change at once.
   * Computes the union of all affected nodes from all changed nodes.
   * 
   * @param {string[]} changedNodeIds - Array of node IDs that changed
   * @param {ImpactAnalysisOptions} [options={}] - Analysis options
   * @returns {Object} Combined impact results
   * @returns {Set<string>} return.affectedNodes - All affected nodes
   * @returns {Map<string, Set<string>>} return.sources - For each affected node, which changed nodes affect it
   * @returns {Map<string, number>} return.minDistances - Minimum distance to each affected node
   */
  analyzeMultiple(changedNodeIds, options = {}) {
    const allAffectedNodes = new Set();
    const sources = new Map(); // For each affected node, track which changed nodes affect it
    const minDistances = new Map(); // Track minimum distance to each affected node

    for (const changedNodeId of changedNodeIds) {
      const result = this.analyze(changedNodeId, options);

      result.affectedNodes.forEach(nodeId => {
        allAffectedNodes.add(nodeId);

        // Track source
        if (!sources.has(nodeId)) {
          sources.set(nodeId, new Set());
        }
        sources.get(nodeId).add(changedNodeId);

        // Track minimum distance
        const distance = result.distances.get(nodeId);
        if (!minDistances.has(nodeId) || distance < minDistances.get(nodeId)) {
          minDistances.set(nodeId, distance);
        }
      });
    }

    return {
      changedNodeIds,
      affectedNodes: allAffectedNodes,
      sources,
      minDistances
    };
  }

  /**
   * Computes impact layers - groups affected nodes by distance
   * 
   * Organizes affected nodes into layers based on their distance from
   * the changed node. Useful for staged update propagation.
   * 
   * @param {string} changedNodeId - ID of the node that changed
   * @param {ImpactAnalysisOptions} [options={}] - Analysis options
   * @returns {Map<number, Set<string>>} Map of distance to set of node IDs at that distance
   */
  computeLayers(changedNodeId, options = {}) {
    const result = this.analyze(changedNodeId, options);
    const layers = new Map();

    result.affectedNodes.forEach(nodeId => {
      const distance = result.distances.get(nodeId);
      if (!layers.has(distance)) {
        layers.set(distance, new Set());
      }
      layers.get(distance).add(nodeId);
    });

    return layers;
  }

  /**
   * Finds critical paths - nodes that if changed would affect the most downstream nodes
   * 
   * Analyzes the entire graph to identify which nodes have the largest
   * impact radius. Useful for identifying critical dependencies.
   * 
   * @param {ImpactAnalysisOptions} [options={}] - Analysis options
   * @returns {Array<{nodeId: string, impactSize: number, affectedNodes: Set<string>}>} 
   *          Sorted list of nodes by impact size (descending)
   */
  findCriticalPaths(options = {}) {
    const impacts = [];

    for (const nodeId of this.graph.nodes.keys()) {
      const result = this.analyze(nodeId, options);
      impacts.push({
        nodeId,
        impactSize: result.affectedNodes.size,
        affectedNodes: result.affectedNodes,
        maxDepth: result.maxDepth
      });
    }

    // Sort by impact size descending
    impacts.sort((a, b) => b.impactSize - a.impactSize);

    return impacts;
  }

  /**
   * Estimates update cost based on affected nodes and their processing complexity
   * 
   * @param {string} changedNodeId - ID of the node that changed
   * @param {function(string): number} costFunction - Function that returns processing cost for a node
   * @param {ImpactAnalysisOptions} [options={}] - Analysis options
   * @returns {Object} Cost analysis
   * @returns {number} return.totalCost - Total estimated processing cost
   * @returns {Map<string, number>} return.nodeCosts - Individual node costs
   * @returns {number} return.criticalPathCost - Cost of longest sequential path
   */
  estimateUpdateCost(changedNodeId, costFunction, options = {}) {
    const result = this.analyze(changedNodeId, options);
    const nodeCosts = new Map();
    let totalCost = 0;

    // Calculate cost for each affected node
    result.affectedNodes.forEach(nodeId => {
      const cost = costFunction(nodeId);
      nodeCosts.set(nodeId, cost);
      totalCost += cost;
    });

    // Calculate critical path cost (longest sequential path)
    const layers = this.computeLayers(changedNodeId, options);
    let criticalPathCost = 0;
    
    layers.forEach((nodesInLayer, distance) => {
      // For each layer, find the maximum cost (assuming parallel execution within layer)
      let maxCostInLayer = 0;
      nodesInLayer.forEach(nodeId => {
        const cost = nodeCosts.get(nodeId) || 0;
        maxCostInLayer = Math.max(maxCostInLayer, cost);
      });
      criticalPathCost += maxCostInLayer;
    });

    return {
      totalCost,
      nodeCosts,
      criticalPathCost,
      parallelizationPotential: totalCost / Math.max(criticalPathCost, 1)
    };
  }

  /**
   * Generates a visual representation of the impact for debugging
   * 
   * @param {string} changedNodeId - ID of the node that changed
   * @param {ImpactAnalysisOptions} [options={}] - Analysis options
   * @returns {string} ASCII art representation of impact tree
   */
  visualize(changedNodeId, options = {}) {
    const result = this.analyze(changedNodeId, options);
    const layers = this.computeLayers(changedNodeId, options);
    
    let output = `Impact Analysis for: ${changedNodeId}\n`;
    output += `Total Affected Nodes: ${result.affectedNodes.size}\n`;
    output += `Maximum Depth: ${result.maxDepth}\n\n`;

    const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0]);

    sortedLayers.forEach(([distance, nodes]) => {
      output += `Layer ${distance} (${nodes.size} nodes):\n`;
      nodes.forEach(nodeId => {
        const path = result.paths.get(nodeId) || [];
        const indent = '  '.repeat(distance);
        output += `${indent}└─ ${nodeId} [path: ${path.join(' → ')}]\n`;
      });
      output += '\n';
    });

    return output;
  }
}

/**
 * Factory function for creating ImpactAnalysis instances
 * 
 * @param {Object} graph - Graph structure
 * @returns {ImpactAnalysis} New ImpactAnalysis instance
 */
export function createImpactAnalysis(graph) {
  return new ImpactAnalysis(graph);
}