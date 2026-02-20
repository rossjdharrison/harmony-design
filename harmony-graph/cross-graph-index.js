/**
 * @fileoverview Cross-Graph Edge Index
 * @see DESIGN_SYSTEM.md § Graph Engine → Cross-Graph Edges
 * 
 * Indexes relationships between different graph types (Domain, Intent, Component)
 * for efficient querying without full graph traversal.
 * 
 * Policy Compliance:
 * - [22] Cross-Graph Edges Must Be Indexed
 * - [27] Project files MUST be serializable to JSON for IndexedDB storage
 * - [1] Render Budget: Maximum 16ms per frame
 */

/**
 * @typedef {Object} CrossGraphEdge
 * @property {string} id - Unique edge identifier
 * @property {string} sourceGraph - Source graph type (domain|intent|component)
 * @property {string} sourceNode - Source node ID
 * @property {string} targetGraph - Target graph type
 * @property {string} targetNode - Target node ID
 * @property {string} edgeType - Relationship type (implements|requires|refines|etc)
 * @property {Object.<string, any>} [metadata] - Optional edge metadata
 */

/**
 * @typedef {Object} IndexQuery
 * @property {string} [sourceGraph] - Filter by source graph type
 * @property {string} [sourceNode] - Filter by source node ID
 * @property {string} [targetGraph] - Filter by target graph type
 * @property {string} [targetNode] - Filter by target node ID
 * @property {string} [edgeType] - Filter by edge type
 */

/**
 * Cross-graph edge index for efficient relationship queries.
 * 
 * Maintains multiple indexes for O(1) lookups:
 * - By source node
 * - By target node
 * - By edge type
 * - By graph pair (source+target)
 * 
 * @class
 */
export class CrossGraphIndex {
  constructor() {
    /** @type {Map<string, CrossGraphEdge>} */
    this.edges = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.bySourceNode = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.byTargetNode = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.byEdgeType = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.byGraphPair = new Map();
    
    /** @type {number} */
    this.version = 0;
  }

  /**
   * Add or update a cross-graph edge.
   * 
   * @param {CrossGraphEdge} edge - Edge to add
   * @throws {Error} If edge is invalid
   */
  addEdge(edge) {
    this._validateEdge(edge);
    
    const edgeId = edge.id;
    const existing = this.edges.get(edgeId);
    
    // Remove old indexes if updating
    if (existing) {
      this._removeFromIndexes(existing);
    }
    
    // Store edge
    this.edges.set(edgeId, { ...edge });
    
    // Update indexes
    this._addToIndexes(edge);
    
    this.version++;
  }

  /**
   * Remove a cross-graph edge.
   * 
   * @param {string} edgeId - ID of edge to remove
   * @returns {boolean} True if edge was removed
   */
  removeEdge(edgeId) {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      return false;
    }
    
    this._removeFromIndexes(edge);
    this.edges.delete(edgeId);
    this.version++;
    
    return true;
  }

  /**
   * Query edges by various criteria.
   * 
   * @param {IndexQuery} query - Query parameters
   * @returns {CrossGraphEdge[]} Matching edges
   */
  query(query) {
    const startTime = performance.now();
    
    let candidateIds = null;
    
    // Find smallest candidate set using indexes
    if (query.sourceNode) {
      candidateIds = this.bySourceNode.get(query.sourceNode);
    } else if (query.targetNode) {
      candidateIds = this.byTargetNode.get(query.targetNode);
    } else if (query.edgeType) {
      candidateIds = this.byEdgeType.get(query.edgeType);
    } else if (query.sourceGraph && query.targetGraph) {
      const pairKey = `${query.sourceGraph}:${query.targetGraph}`;
      candidateIds = this.byGraphPair.get(pairKey);
    }
    
    // If no index matched, use all edges
    if (!candidateIds) {
      candidateIds = new Set(this.edges.keys());
    }
    
    // Filter candidates by remaining criteria
    const results = [];
    for (const edgeId of candidateIds) {
      const edge = this.edges.get(edgeId);
      if (!edge) continue;
      
      if (query.sourceGraph && edge.sourceGraph !== query.sourceGraph) continue;
      if (query.sourceNode && edge.sourceNode !== query.sourceNode) continue;
      if (query.targetGraph && edge.targetGraph !== query.targetGraph) continue;
      if (query.targetNode && edge.targetNode !== query.targetNode) continue;
      if (query.edgeType && edge.edgeType !== query.edgeType) continue;
      
      results.push({ ...edge });
    }
    
    const elapsed = performance.now() - startTime;
    if (elapsed > 16) {
      console.warn(`CrossGraphIndex query exceeded 16ms budget: ${elapsed.toFixed(2)}ms`);
    }
    
    return results;
  }

  /**
   * Get all outgoing edges from a node.
   * 
   * @param {string} graphType - Source graph type
   * @param {string} nodeId - Source node ID
   * @returns {CrossGraphEdge[]} Outgoing edges
   */
  getOutgoingEdges(graphType, nodeId) {
    return this.query({ sourceGraph: graphType, sourceNode: nodeId });
  }

  /**
   * Get all incoming edges to a node.
   * 
   * @param {string} graphType - Target graph type
   * @param {string} nodeId - Target node ID
   * @returns {CrossGraphEdge[]} Incoming edges
   */
  getIncomingEdges(graphType, nodeId) {
    return this.query({ targetGraph: graphType, targetNode: nodeId });
  }

  /**
   * Get all edges of a specific type.
   * 
   * @param {string} edgeType - Edge type to query
   * @returns {CrossGraphEdge[]} Matching edges
   */
  getEdgesByType(edgeType) {
    return this.query({ edgeType });
  }

  /**
   * Get edges between two specific graph types.
   * 
   * @param {string} sourceGraph - Source graph type
   * @param {string} targetGraph - Target graph type
   * @returns {CrossGraphEdge[]} Matching edges
   */
  getEdgesBetweenGraphs(sourceGraph, targetGraph) {
    return this.query({ sourceGraph, targetGraph });
  }

  /**
   * Serialize index to JSON for storage.
   * 
   * @returns {Object} Serializable representation
   */
  toJSON() {
    return {
      version: this.version,
      edges: Array.from(this.edges.values()),
      timestamp: Date.now()
    };
  }

  /**
   * Restore index from JSON.
   * 
   * @param {Object} data - Serialized data
   */
  fromJSON(data) {
    this.clear();
    
    if (data.edges && Array.isArray(data.edges)) {
      for (const edge of data.edges) {
        this.addEdge(edge);
      }
    }
    
    if (typeof data.version === 'number') {
      this.version = data.version;
    }
  }

  /**
   * Clear all edges and indexes.
   */
  clear() {
    this.edges.clear();
    this.bySourceNode.clear();
    this.byTargetNode.clear();
    this.byEdgeType.clear();
    this.byGraphPair.clear();
    this.version = 0;
  }

  /**
   * Get index statistics.
   * 
   * @returns {Object} Index statistics
   */
  getStats() {
    return {
      totalEdges: this.edges.size,
      indexSizes: {
        bySourceNode: this.bySourceNode.size,
        byTargetNode: this.byTargetNode.size,
        byEdgeType: this.byEdgeType.size,
        byGraphPair: this.byGraphPair.size
      },
      version: this.version
    };
  }

  /**
   * Validate edge structure.
   * 
   * @private
   * @param {CrossGraphEdge} edge - Edge to validate
   * @throws {Error} If edge is invalid
   */
  _validateEdge(edge) {
    if (!edge || typeof edge !== 'object') {
      throw new Error('Edge must be an object');
    }
    
    const required = ['id', 'sourceGraph', 'sourceNode', 'targetGraph', 'targetNode', 'edgeType'];
    for (const field of required) {
      if (!edge[field] || typeof edge[field] !== 'string') {
        throw new Error(`Edge missing required field: ${field}`);
      }
    }
    
    const validGraphs = ['domain', 'intent', 'component'];
    if (!validGraphs.includes(edge.sourceGraph)) {
      throw new Error(`Invalid sourceGraph: ${edge.sourceGraph}`);
    }
    if (!validGraphs.includes(edge.targetGraph)) {
      throw new Error(`Invalid targetGraph: ${edge.targetGraph}`);
    }
  }

  /**
   * Add edge to all indexes.
   * 
   * @private
   * @param {CrossGraphEdge} edge - Edge to index
   */
  _addToIndexes(edge) {
    const edgeId = edge.id;
    
    // Index by source node
    if (!this.bySourceNode.has(edge.sourceNode)) {
      this.bySourceNode.set(edge.sourceNode, new Set());
    }
    this.bySourceNode.get(edge.sourceNode).add(edgeId);
    
    // Index by target node
    if (!this.byTargetNode.has(edge.targetNode)) {
      this.byTargetNode.set(edge.targetNode, new Set());
    }
    this.byTargetNode.get(edge.targetNode).add(edgeId);
    
    // Index by edge type
    if (!this.byEdgeType.has(edge.edgeType)) {
      this.byEdgeType.set(edge.edgeType, new Set());
    }
    this.byEdgeType.get(edge.edgeType).add(edgeId);
    
    // Index by graph pair
    const pairKey = `${edge.sourceGraph}:${edge.targetGraph}`;
    if (!this.byGraphPair.has(pairKey)) {
      this.byGraphPair.set(pairKey, new Set());
    }
    this.byGraphPair.get(pairKey).add(edgeId);
  }

  /**
   * Remove edge from all indexes.
   * 
   * @private
   * @param {CrossGraphEdge} edge - Edge to remove from indexes
   */
  _removeFromIndexes(edge) {
    const edgeId = edge.id;
    
    // Remove from source node index
    const sourceSet = this.bySourceNode.get(edge.sourceNode);
    if (sourceSet) {
      sourceSet.delete(edgeId);
      if (sourceSet.size === 0) {
        this.bySourceNode.delete(edge.sourceNode);
      }
    }
    
    // Remove from target node index
    const targetSet = this.byTargetNode.get(edge.targetNode);
    if (targetSet) {
      targetSet.delete(edgeId);
      if (targetSet.size === 0) {
        this.byTargetNode.delete(edge.targetNode);
      }
    }
    
    // Remove from edge type index
    const typeSet = this.byEdgeType.get(edge.edgeType);
    if (typeSet) {
      typeSet.delete(edgeId);
      if (typeSet.size === 0) {
        this.byEdgeType.delete(edge.edgeType);
      }
    }
    
    // Remove from graph pair index
    const pairKey = `${edge.sourceGraph}:${edge.targetGraph}`;
    const pairSet = this.byGraphPair.get(pairKey);
    if (pairSet) {
      pairSet.delete(edgeId);
      if (pairSet.size === 0) {
        this.byGraphPair.delete(pairKey);
      }
    }
  }
}