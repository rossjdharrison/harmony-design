/**
 * @fileoverview GraphIntrospector - Query graph structure, types, relationships programmatically
 * @module harmony-graph/graph-introspector
 * 
 * Provides introspection capabilities for graph structures:
 * - Query node types and their properties
 * - Discover edge types and relationships
 * - Navigate graph structure programmatically
 * - Extract metadata and statistics
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Graph Engine § GraphIntrospector
 */

/**
 * @typedef {Object} NodeTypeInfo
 * @property {string} type - Node type identifier
 * @property {number} count - Number of nodes of this type
 * @property {Array<string>} properties - Available properties on this node type
 * @property {Array<string>} incomingEdgeTypes - Edge types that can point to this node
 * @property {Array<string>} outgoingEdgeTypes - Edge types that can originate from this node
 */

/**
 * @typedef {Object} EdgeTypeInfo
 * @property {string} type - Edge type identifier
 * @property {number} count - Number of edges of this type
 * @property {Array<string>} sourceTypes - Valid source node types
 * @property {Array<string>} targetTypes - Valid target node types
 * @property {Array<string>} properties - Available properties on this edge type
 */

/**
 * @typedef {Object} GraphStatistics
 * @property {number} nodeCount - Total number of nodes
 * @property {number} edgeCount - Total number of edges
 * @property {number} typeCount - Number of distinct node types
 * @property {number} edgeTypeCount - Number of distinct edge types
 * @property {number} maxDepth - Maximum depth from root nodes
 * @property {number} avgDegree - Average node degree (connections)
 */

/**
 * @typedef {Object} PathInfo
 * @property {Array<string>} nodeIds - Node IDs in the path
 * @property {Array<string>} edgeIds - Edge IDs connecting the nodes
 * @property {number} length - Path length (number of edges)
 * @property {number} weight - Total path weight (if edges have weights)
 */

/**
 * GraphIntrospector provides programmatic access to graph structure and metadata
 * 
 * Performance considerations:
 * - Caches type information to avoid repeated traversals
 * - Uses indexes for fast lookups (see Policy #22: Cross-Graph Edges Must Be Indexed)
 * - Invalidates cache when graph structure changes
 * 
 * @class
 */
export class GraphIntrospector {
  /**
   * @param {Object} graph - Graph instance to introspect
   * @param {Object} schema - GraphSchema instance for validation
   */
  constructor(graph, schema) {
    /** @private */
    this.graph = graph;
    
    /** @private */
    this.schema = schema;
    
    /** @private */
    this.cache = {
      nodeTypes: null,
      edgeTypes: null,
      statistics: null,
      lastInvalidation: Date.now()
    };
    
    /** @private */
    this.cacheTimeout = 5000; // 5 seconds
  }

  /**
   * Get information about all node types in the graph
   * 
   * @returns {Map<string, NodeTypeInfo>} Map of type name to type information
   */
  getNodeTypes() {
    if (this._isCacheValid() && this.cache.nodeTypes) {
      return this.cache.nodeTypes;
    }

    const nodeTypes = new Map();
    const nodes = this.graph.nodes || new Map();

    // First pass: collect type counts and properties
    for (const [nodeId, node] of nodes) {
      const type = node.type || 'unknown';
      
      if (!nodeTypes.has(type)) {
        nodeTypes.set(type, {
          type,
          count: 0,
          properties: new Set(),
          incomingEdgeTypes: new Set(),
          outgoingEdgeTypes: new Set()
        });
      }

      const typeInfo = nodeTypes.get(type);
      typeInfo.count++;

      // Collect properties
      if (node.data) {
        Object.keys(node.data).forEach(prop => typeInfo.properties.add(prop));
      }
    }

    // Second pass: collect edge type relationships
    const edges = this.graph.edges || new Map();
    for (const [edgeId, edge] of edges) {
      const sourceNode = nodes.get(edge.source);
      const targetNode = nodes.get(edge.target);
      
      if (sourceNode && targetNode) {
        const sourceType = sourceNode.type || 'unknown';
        const targetType = targetNode.type || 'unknown';
        const edgeType = edge.type || 'unknown';

        if (nodeTypes.has(sourceType)) {
          nodeTypes.get(sourceType).outgoingEdgeTypes.add(edgeType);
        }
        if (nodeTypes.has(targetType)) {
          nodeTypes.get(targetType).incomingEdgeTypes.add(edgeType);
        }
      }
    }

    // Convert Sets to Arrays for serialization
    const result = new Map();
    for (const [type, info] of nodeTypes) {
      result.set(type, {
        type: info.type,
        count: info.count,
        properties: Array.from(info.properties),
        incomingEdgeTypes: Array.from(info.incomingEdgeTypes),
        outgoingEdgeTypes: Array.from(info.outgoingEdgeTypes)
      });
    }

    this.cache.nodeTypes = result;
    return result;
  }

  /**
   * Get information about all edge types in the graph
   * 
   * @returns {Map<string, EdgeTypeInfo>} Map of edge type to edge information
   */
  getEdgeTypes() {
    if (this._isCacheValid() && this.cache.edgeTypes) {
      return this.cache.edgeTypes;
    }

    const edgeTypes = new Map();
    const nodes = this.graph.nodes || new Map();
    const edges = this.graph.edges || new Map();

    for (const [edgeId, edge] of edges) {
      const type = edge.type || 'unknown';
      
      if (!edgeTypes.has(type)) {
        edgeTypes.set(type, {
          type,
          count: 0,
          sourceTypes: new Set(),
          targetTypes: new Set(),
          properties: new Set()
        });
      }

      const typeInfo = edgeTypes.get(type);
      typeInfo.count++;

      // Collect source and target types
      const sourceNode = nodes.get(edge.source);
      const targetNode = nodes.get(edge.target);
      
      if (sourceNode) {
        typeInfo.sourceTypes.add(sourceNode.type || 'unknown');
      }
      if (targetNode) {
        typeInfo.targetTypes.add(targetNode.type || 'unknown');
      }

      // Collect properties
      if (edge.data) {
        Object.keys(edge.data).forEach(prop => typeInfo.properties.add(prop));
      }
    }

    // Convert Sets to Arrays for serialization
    const result = new Map();
    for (const [type, info] of edgeTypes) {
      result.set(type, {
        type: info.type,
        count: info.count,
        sourceTypes: Array.from(info.sourceTypes),
        targetTypes: Array.from(info.targetTypes),
        properties: Array.from(info.properties)
      });
    }

    this.cache.edgeTypes = result;
    return result;
  }

  /**
   * Get statistical information about the graph
   * 
   * @returns {GraphStatistics} Graph statistics
   */
  getStatistics() {
    if (this._isCacheValid() && this.cache.statistics) {
      return this.cache.statistics;
    }

    const nodes = this.graph.nodes || new Map();
    const edges = this.graph.edges || new Map();

    // Calculate node degrees
    const degrees = new Map();
    for (const nodeId of nodes.keys()) {
      degrees.set(nodeId, 0);
    }

    for (const edge of edges.values()) {
      degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
    }

    const avgDegree = degrees.size > 0
      ? Array.from(degrees.values()).reduce((sum, deg) => sum + deg, 0) / degrees.size
      : 0;

    // Calculate max depth (BFS from nodes with no incoming edges)
    const maxDepth = this._calculateMaxDepth();

    const nodeTypes = this.getNodeTypes();
    const edgeTypes = this.getEdgeTypes();

    const statistics = {
      nodeCount: nodes.size,
      edgeCount: edges.size,
      typeCount: nodeTypes.size,
      edgeTypeCount: edgeTypes.size,
      maxDepth,
      avgDegree: Math.round(avgDegree * 100) / 100
    };

    this.cache.statistics = statistics;
    return statistics;
  }

  /**
   * Find all nodes of a specific type
   * 
   * @param {string} type - Node type to search for
   * @returns {Array<Object>} Array of nodes matching the type
   */
  findNodesByType(type) {
    const nodes = this.graph.nodes || new Map();
    const results = [];

    for (const [nodeId, node] of nodes) {
      if (node.type === type) {
        results.push({ id: nodeId, ...node });
      }
    }

    return results;
  }

  /**
   * Find all edges of a specific type
   * 
   * @param {string} type - Edge type to search for
   * @returns {Array<Object>} Array of edges matching the type
   */
  findEdgesByType(type) {
    const edges = this.graph.edges || new Map();
    const results = [];

    for (const [edgeId, edge] of edges) {
      if (edge.type === type) {
        results.push({ id: edgeId, ...edge });
      }
    }

    return results;
  }

  /**
   * Get all neighbors of a node
   * 
   * @param {string} nodeId - Node ID to find neighbors for
   * @param {Object} options - Query options
   * @param {string} [options.direction='both'] - 'incoming', 'outgoing', or 'both'
   * @param {string} [options.edgeType] - Filter by edge type
   * @returns {Array<Object>} Array of neighbor nodes with edge information
   */
  getNeighbors(nodeId, options = {}) {
    const { direction = 'both', edgeType } = options;
    const nodes = this.graph.nodes || new Map();
    const edges = this.graph.edges || new Map();
    const neighbors = [];

    for (const [edgeId, edge] of edges) {
      if (edgeType && edge.type !== edgeType) {
        continue;
      }

      let neighborId = null;
      let edgeDirection = null;

      if (edge.source === nodeId && (direction === 'outgoing' || direction === 'both')) {
        neighborId = edge.target;
        edgeDirection = 'outgoing';
      } else if (edge.target === nodeId && (direction === 'incoming' || direction === 'both')) {
        neighborId = edge.source;
        edgeDirection = 'incoming';
      }

      if (neighborId && nodes.has(neighborId)) {
        neighbors.push({
          node: { id: neighborId, ...nodes.get(neighborId) },
          edge: { id: edgeId, ...edge },
          direction: edgeDirection
        });
      }
    }

    return neighbors;
  }

  /**
   * Find paths between two nodes
   * 
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   * @param {Object} options - Query options
   * @param {number} [options.maxDepth=10] - Maximum path length to search
   * @param {number} [options.maxPaths=10] - Maximum number of paths to return
   * @returns {Array<PathInfo>} Array of paths found
   */
  findPaths(sourceId, targetId, options = {}) {
    const { maxDepth = 10, maxPaths = 10 } = options;
    const nodes = this.graph.nodes || new Map();
    const edges = this.graph.edges || new Map();

    if (!nodes.has(sourceId) || !nodes.has(targetId)) {
      return [];
    }

    const paths = [];
    const visited = new Set();

    const dfs = (currentId, path, edgePath, depth) => {
      if (depth > maxDepth || paths.length >= maxPaths) {
        return;
      }

      if (currentId === targetId) {
        paths.push({
          nodeIds: [...path],
          edgeIds: [...edgePath],
          length: edgePath.length,
          weight: this._calculatePathWeight(edgePath)
        });
        return;
      }

      visited.add(currentId);

      for (const [edgeId, edge] of edges) {
        if (edge.source === currentId && !visited.has(edge.target)) {
          path.push(edge.target);
          edgePath.push(edgeId);
          dfs(edge.target, path, edgePath, depth + 1);
          path.pop();
          edgePath.pop();
        }
      }

      visited.delete(currentId);
    };

    dfs(sourceId, [sourceId], [], 0);
    return paths;
  }

  /**
   * Query nodes using a filter function
   * 
   * @param {Function} predicate - Filter function (node) => boolean
   * @returns {Array<Object>} Array of nodes matching the predicate
   */
  queryNodes(predicate) {
    const nodes = this.graph.nodes || new Map();
    const results = [];

    for (const [nodeId, node] of nodes) {
      if (predicate({ id: nodeId, ...node })) {
        results.push({ id: nodeId, ...node });
      }
    }

    return results;
  }

  /**
   * Query edges using a filter function
   * 
   * @param {Function} predicate - Filter function (edge) => boolean
   * @returns {Array<Object>} Array of edges matching the predicate
   */
  queryEdges(predicate) {
    const edges = this.graph.edges || new Map();
    const results = [];

    for (const [edgeId, edge] of edges) {
      if (predicate({ id: edgeId, ...edge })) {
        results.push({ id: edgeId, ...edge });
      }
    }

    return results;
  }

  /**
   * Get subgraph containing specified nodes and their connections
   * 
   * @param {Array<string>} nodeIds - Node IDs to include
   * @param {Object} options - Query options
   * @param {boolean} [options.includeNeighbors=false] - Include direct neighbors
   * @returns {Object} Subgraph with nodes and edges
   */
  getSubgraph(nodeIds, options = {}) {
    const { includeNeighbors = false } = options;
    const nodes = this.graph.nodes || new Map();
    const edges = this.graph.edges || new Map();

    const nodeSet = new Set(nodeIds);

    // Include neighbors if requested
    if (includeNeighbors) {
      for (const nodeId of nodeIds) {
        const neighbors = this.getNeighbors(nodeId);
        neighbors.forEach(n => nodeSet.add(n.node.id));
      }
    }

    // Extract nodes
    const subgraphNodes = new Map();
    for (const nodeId of nodeSet) {
      if (nodes.has(nodeId)) {
        subgraphNodes.set(nodeId, nodes.get(nodeId));
      }
    }

    // Extract edges between included nodes
    const subgraphEdges = new Map();
    for (const [edgeId, edge] of edges) {
      if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
        subgraphEdges.set(edgeId, edge);
      }
    }

    return {
      nodes: subgraphNodes,
      edges: subgraphEdges
    };
  }

  /**
   * Invalidate introspection cache
   * Call this when graph structure changes
   */
  invalidateCache() {
    this.cache = {
      nodeTypes: null,
      edgeTypes: null,
      statistics: null,
      lastInvalidation: Date.now()
    };
  }

  /**
   * Check if cache is still valid
   * @private
   * @returns {boolean} True if cache is valid
   */
  _isCacheValid() {
    return (Date.now() - this.cache.lastInvalidation) < this.cacheTimeout;
  }

  /**
   * Calculate maximum depth from root nodes (nodes with no incoming edges)
   * @private
   * @returns {number} Maximum depth
   */
  _calculateMaxDepth() {
    const nodes = this.graph.nodes || new Map();
    const edges = this.graph.edges || new Map();

    // Find nodes with no incoming edges (roots)
    const incomingCounts = new Map();
    for (const nodeId of nodes.keys()) {
      incomingCounts.set(nodeId, 0);
    }

    for (const edge of edges.values()) {
      incomingCounts.set(edge.target, (incomingCounts.get(edge.target) || 0) + 1);
    }

    const roots = Array.from(incomingCounts.entries())
      .filter(([_, count]) => count === 0)
      .map(([nodeId, _]) => nodeId);

    if (roots.length === 0) {
      return 0; // No roots, possibly cyclic graph
    }

    // BFS from all roots to find maximum depth
    let maxDepth = 0;
    const visited = new Set();

    for (const root of roots) {
      const queue = [{ nodeId: root, depth: 0 }];
      
      while (queue.length > 0) {
        const { nodeId, depth } = queue.shift();
        
        if (visited.has(nodeId)) {
          continue;
        }
        
        visited.add(nodeId);
        maxDepth = Math.max(maxDepth, depth);

        // Add neighbors to queue
        for (const edge of edges.values()) {
          if (edge.source === nodeId && !visited.has(edge.target)) {
            queue.push({ nodeId: edge.target, depth: depth + 1 });
          }
        }
      }
    }

    return maxDepth;
  }

  /**
   * Calculate total weight of a path
   * @private
   * @param {Array<string>} edgeIds - Edge IDs in the path
   * @returns {number} Total weight
   */
  _calculatePathWeight(edgeIds) {
    const edges = this.graph.edges || new Map();
    let weight = 0;

    for (const edgeId of edgeIds) {
      const edge = edges.get(edgeId);
      if (edge && edge.data && typeof edge.data.weight === 'number') {
        weight += edge.data.weight;
      } else {
        weight += 1; // Default weight
      }
    }

    return weight;
  }
}