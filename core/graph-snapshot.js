/**
 * @fileoverview GraphSnapshot - Immutable snapshot of entire graph state at point in time
 * 
 * Provides functionality to capture and restore complete graph state including:
 * - All nodes and their properties
 * - All edges and their weights
 * - Metadata and timestamps
 * - Validation and integrity checks
 * 
 * Part of the Harmony Design System graph execution engine.
 * See DESIGN_SYSTEM.md § Graph Snapshot for architecture details.
 * 
 * @module core/graph-snapshot
 */

/**
 * Represents an immutable snapshot of graph state at a specific point in time
 * 
 * @class GraphSnapshot
 * @property {string} id - Unique identifier for this snapshot
 * @property {number} timestamp - Unix timestamp when snapshot was created
 * @property {Object} nodes - Frozen map of node ID to node data
 * @property {Object} edges - Frozen map of edge ID to edge data
 * @property {Object} metadata - Additional snapshot metadata
 * @property {string} checksum - SHA-256 checksum for integrity verification
 */
export class GraphSnapshot {
  /**
   * Creates a new immutable graph snapshot
   * 
   * @param {Object} graphState - Current graph state to snapshot
   * @param {Map<string, Object>} graphState.nodes - Graph nodes
   * @param {Map<string, Object>} graphState.edges - Graph edges
   * @param {Object} [metadata={}] - Additional metadata to include
   */
  constructor(graphState, metadata = {}) {
    if (!graphState || !graphState.nodes || !graphState.edges) {
      throw new Error('GraphSnapshot requires valid graphState with nodes and edges');
    }

    this.id = this._generateId();
    this.timestamp = Date.now();
    
    // Deep clone and freeze node data
    this.nodes = Object.freeze(this._cloneNodes(graphState.nodes));
    
    // Deep clone and freeze edge data
    this.edges = Object.freeze(this._cloneEdges(graphState.edges));
    
    // Freeze metadata
    this.metadata = Object.freeze({
      ...metadata,
      nodeCount: Object.keys(this.nodes).length,
      edgeCount: Object.keys(this.edges).length,
      captureTime: new Date(this.timestamp).toISOString()
    });
    
    // Calculate integrity checksum
    this.checksum = this._calculateChecksum();
    
    // Make the entire snapshot immutable
    Object.freeze(this);
  }

  /**
   * Generates a unique identifier for the snapshot
   * 
   * @private
   * @returns {string} Unique snapshot ID
   */
  _generateId() {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Deep clones node data from Map or Object
   * 
   * @private
   * @param {Map<string, Object>|Object} nodes - Nodes to clone
   * @returns {Object} Cloned node data as plain object
   */
  _cloneNodes(nodes) {
    const cloned = {};
    const nodeEntries = nodes instanceof Map ? Array.from(nodes.entries()) : Object.entries(nodes);
    
    for (const [id, node] of nodeEntries) {
      cloned[id] = {
        id: node.id,
        type: node.type,
        properties: this._deepClone(node.properties || {}),
        metadata: this._deepClone(node.metadata || {}),
        state: this._deepClone(node.state || {})
      };
      Object.freeze(cloned[id].properties);
      Object.freeze(cloned[id].metadata);
      Object.freeze(cloned[id].state);
      Object.freeze(cloned[id]);
    }
    
    return cloned;
  }

  /**
   * Deep clones edge data from Map or Object
   * 
   * @private
   * @param {Map<string, Object>|Object} edges - Edges to clone
   * @returns {Object} Cloned edge data as plain object
   */
  _cloneEdges(edges) {
    const cloned = {};
    const edgeEntries = edges instanceof Map ? Array.from(edges.entries()) : Object.entries(edges);
    
    for (const [id, edge] of edgeEntries) {
      cloned[id] = {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'default',
        weight: edge.weight !== undefined ? edge.weight : 1.0,
        properties: this._deepClone(edge.properties || {}),
        metadata: this._deepClone(edge.metadata || {})
      };
      Object.freeze(cloned[id].properties);
      Object.freeze(cloned[id].metadata);
      Object.freeze(cloned[id]);
    }
    
    return cloned;
  }

  /**
   * Deep clones an object or array
   * 
   * @private
   * @param {*} obj - Object to clone
   * @returns {*} Deep cloned object
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this._deepClone(item));
    }
    
    if (obj instanceof Map) {
      const cloned = new Map();
      for (const [key, value] of obj.entries()) {
        cloned.set(key, this._deepClone(value));
      }
      return cloned;
    }
    
    if (obj instanceof Set) {
      const cloned = new Set();
      for (const value of obj.values()) {
        cloned.add(this._deepClone(value));
      }
      return cloned;
    }
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this._deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Calculates SHA-256 checksum for integrity verification
   * 
   * @private
   * @returns {string} Hexadecimal checksum string
   */
  _calculateChecksum() {
    const data = JSON.stringify({
      nodes: this.nodes,
      edges: this.edges,
      timestamp: this.timestamp
    });
    
    // Simple hash for browser environments without crypto.subtle
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Verifies snapshot integrity by recalculating checksum
   * 
   * @returns {boolean} True if snapshot is intact, false if corrupted
   */
  verifyIntegrity() {
    const currentChecksum = this._calculateChecksum();
    return currentChecksum === this.checksum;
  }

  /**
   * Gets a node by ID from the snapshot
   * 
   * @param {string} nodeId - Node identifier
   * @returns {Object|null} Frozen node object or null if not found
   */
  getNode(nodeId) {
    return this.nodes[nodeId] || null;
  }

  /**
   * Gets an edge by ID from the snapshot
   * 
   * @param {string} edgeId - Edge identifier
   * @returns {Object|null} Frozen edge object or null if not found
   */
  getEdge(edgeId) {
    return this.edges[edgeId] || null;
  }

  /**
   * Gets all nodes in the snapshot
   * 
   * @returns {Object} Frozen map of node ID to node data
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Gets all edges in the snapshot
   * 
   * @returns {Object} Frozen map of edge ID to edge data
   */
  getEdges() {
    return this.edges;
  }

  /**
   * Finds edges connected to a specific node
   * 
   * @param {string} nodeId - Node identifier
   * @returns {Array<Object>} Array of frozen edge objects
   */
  getNodeEdges(nodeId) {
    return Object.values(this.edges).filter(
      edge => edge.source === nodeId || edge.target === nodeId
    );
  }

  /**
   * Exports snapshot to JSON-serializable format
   * 
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      nodes: this.nodes,
      edges: this.edges,
      metadata: this.metadata,
      checksum: this.checksum
    };
  }

  /**
   * Creates a snapshot from JSON data
   * 
   * @static
   * @param {Object} json - JSON representation of snapshot
   * @returns {GraphSnapshot} Reconstructed snapshot
   * @throws {Error} If JSON is invalid or checksum doesn't match
   */
  static fromJSON(json) {
    if (!json || !json.nodes || !json.edges) {
      throw new Error('Invalid snapshot JSON: missing required fields');
    }

    const snapshot = Object.create(GraphSnapshot.prototype);
    snapshot.id = json.id;
    snapshot.timestamp = json.timestamp;
    snapshot.nodes = Object.freeze(json.nodes);
    snapshot.edges = Object.freeze(json.edges);
    snapshot.metadata = Object.freeze(json.metadata);
    snapshot.checksum = json.checksum;
    
    Object.freeze(snapshot);
    
    if (!snapshot.verifyIntegrity()) {
      throw new Error('Snapshot integrity check failed: checksum mismatch');
    }
    
    return snapshot;
  }

  /**
   * Compares this snapshot with another to find differences
   * 
   * @param {GraphSnapshot} otherSnapshot - Snapshot to compare with
   * @returns {Object} Difference report
   */
  diff(otherSnapshot) {
    if (!(otherSnapshot instanceof GraphSnapshot)) {
      throw new Error('Can only diff against another GraphSnapshot');
    }

    const diff = {
      nodesAdded: [],
      nodesRemoved: [],
      nodesModified: [],
      edgesAdded: [],
      edgesRemoved: [],
      edgesModified: []
    };

    // Compare nodes
    const thisNodeIds = new Set(Object.keys(this.nodes));
    const otherNodeIds = new Set(Object.keys(otherSnapshot.nodes));

    for (const nodeId of otherNodeIds) {
      if (!thisNodeIds.has(nodeId)) {
        diff.nodesAdded.push(nodeId);
      } else if (JSON.stringify(this.nodes[nodeId]) !== JSON.stringify(otherSnapshot.nodes[nodeId])) {
        diff.nodesModified.push(nodeId);
      }
    }

    for (const nodeId of thisNodeIds) {
      if (!otherNodeIds.has(nodeId)) {
        diff.nodesRemoved.push(nodeId);
      }
    }

    // Compare edges
    const thisEdgeIds = new Set(Object.keys(this.edges));
    const otherEdgeIds = new Set(Object.keys(otherSnapshot.edges));

    for (const edgeId of otherEdgeIds) {
      if (!thisEdgeIds.has(edgeId)) {
        diff.edgesAdded.push(edgeId);
      } else if (JSON.stringify(this.edges[edgeId]) !== JSON.stringify(otherSnapshot.edges[edgeId])) {
        diff.edgesModified.push(edgeId);
      }
    }

    for (const edgeId of thisEdgeIds) {
      if (!otherEdgeIds.has(edgeId)) {
        diff.edgesRemoved.push(edgeId);
      }
    }

    return Object.freeze(diff);
  }

  /**
   * Creates a new snapshot by merging this one with changes
   * Note: Returns a new snapshot, this one remains immutable
   * 
   * @param {Object} changes - Changes to apply
   * @param {Object} [changes.nodes] - Node changes
   * @param {Object} [changes.edges] - Edge changes
   * @returns {GraphSnapshot} New snapshot with changes applied
   */
  merge(changes) {
    const newNodes = { ...this.nodes };
    const newEdges = { ...this.edges };

    if (changes.nodes) {
      Object.assign(newNodes, changes.nodes);
    }

    if (changes.edges) {
      Object.assign(newEdges, changes.edges);
    }

    return new GraphSnapshot(
      { nodes: newNodes, edges: newEdges },
      { ...this.metadata, mergedFrom: this.id }
    );
  }

  /**
   * Gets statistics about the snapshot
   * 
   * @returns {Object} Snapshot statistics
   */
  getStats() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      age: Date.now() - this.timestamp,
      nodeCount: Object.keys(this.nodes).length,
      edgeCount: Object.keys(this.edges).length,
      checksum: this.checksum,
      sizeBytes: JSON.stringify(this.toJSON()).length
    };
  }
}

/**
 * Manages a collection of graph snapshots with history tracking
 * 
 * @class SnapshotManager
 */
export class SnapshotManager {
  constructor() {
    this.snapshots = new Map();
    this.maxSnapshots = 100; // Limit to prevent memory issues
  }

  /**
   * Adds a snapshot to the manager
   * 
   * @param {GraphSnapshot} snapshot - Snapshot to add
   * @returns {string} Snapshot ID
   */
  addSnapshot(snapshot) {
    if (!(snapshot instanceof GraphSnapshot)) {
      throw new Error('Can only add GraphSnapshot instances');
    }

    // Enforce max snapshots limit (FIFO)
    if (this.snapshots.size >= this.maxSnapshots) {
      const oldestKey = this.snapshots.keys().next().value;
      this.snapshots.delete(oldestKey);
    }

    this.snapshots.set(snapshot.id, snapshot);
    return snapshot.id;
  }

  /**
   * Retrieves a snapshot by ID
   * 
   * @param {string} snapshotId - Snapshot identifier
   * @returns {GraphSnapshot|null} Snapshot or null if not found
   */
  getSnapshot(snapshotId) {
    return this.snapshots.get(snapshotId) || null;
  }

  /**
   * Gets the most recent snapshot
   * 
   * @returns {GraphSnapshot|null} Most recent snapshot or null if none exist
   */
  getLatest() {
    if (this.snapshots.size === 0) return null;
    
    const snapshots = Array.from(this.snapshots.values());
    return snapshots.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
  }

  /**
   * Gets all snapshots ordered by timestamp
   * 
   * @returns {Array<GraphSnapshot>} Sorted array of snapshots
   */
  getAllSnapshots() {
    return Array.from(this.snapshots.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Removes a snapshot by ID
   * 
   * @param {string} snapshotId - Snapshot identifier
   * @returns {boolean} True if removed, false if not found
   */
  removeSnapshot(snapshotId) {
    return this.snapshots.delete(snapshotId);
  }

  /**
   * Clears all snapshots
   */
  clear() {
    this.snapshots.clear();
  }

  /**
   * Gets snapshots within a time range
   * 
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {Array<GraphSnapshot>} Snapshots in range
   */
  getSnapshotsInRange(startTime, endTime) {
    return Array.from(this.snapshots.values())
      .filter(s => s.timestamp >= startTime && s.timestamp <= endTime)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Gets total memory usage of all snapshots (approximate)
   * 
   * @returns {number} Approximate bytes used
   */
  getMemoryUsage() {
    let total = 0;
    for (const snapshot of this.snapshots.values()) {
      total += snapshot.getStats().sizeBytes;
    }
    return total;
  }
}