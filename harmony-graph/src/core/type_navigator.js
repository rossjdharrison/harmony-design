/**
 * @fileoverview TypeNavigator — graph node and edge query interface for
 * harmony-graph processors.
 *
 * Provides async CRUD operations over graph nodes and edges.
 * Production usage is backed by whatever store the processor is wired to;
 * tests replace instances directly via `processor.typeNavigator = mock`.
 *
 * Required interface (duck-typed, see isTypeNavigator):
 *   getNode(id)
 *   createEdge(edgeData)
 *   getOutgoingEdges(nodeId, edgeType?)
 *   getIncomingEdges(nodeId, edgeType?)
 *   deleteEdge(edgeId)
 *   nodeExists(nodeId)
 *
 * @module harmony-graph/src/core/type_navigator
 */

/**
 * In-memory TypeNavigator used when no external store is provided.
 * Processors that need a real persistence layer inject their own store
 * via the constructor.
 */
export class TypeNavigator {
  /**
   * @param {Object|null} [store=null] - Optional backing store.  When null,
   *   the navigator maintains a lightweight in-process Map so that unit tests
   *   and tool-introspection scenarios work without external dependencies.
   */
  constructor(store = null) {
    this._store = store;

    // Fallback in-memory state (used when store is null)
    /** @type {Map<string, Object>} */
    this._nodes = new Map();
    /** @type {Map<string, Object>} */
    this._edges = new Map();
    this._edgeSeq = 0;
  }

  // ─── Node operations ───────────────────────────────────────────────────────

  /**
   * Fetch a single node by id.
   * @param {string} nodeId
   * @returns {Promise<Object|null>}
   */
  async getNode(nodeId) {
    if (this._store) {
      try { return await this._store.getNode(nodeId); } catch { return null; }
    }
    return this._nodes.get(nodeId) ?? null;
  }

  /**
   * Check whether a node exists.
   * @param {string} nodeId
   * @returns {Promise<boolean>}
   */
  async nodeExists(nodeId) {
    if (this._store) {
      try { return await this._store.nodeExists(nodeId); } catch { return false; }
    }
    return this._nodes.has(nodeId);
  }

  /**
   * Persist a node (upsert by id).
   * @param {Object} nodeData - Must include an `id` property.
   * @returns {Promise<Object>} The stored node.
   */
  async upsertNode(nodeData) {
    if (this._store) {
      try { return await this._store.upsertNode(nodeData); } catch { return nodeData; }
    }
    this._nodes.set(nodeData.id, nodeData);
    return nodeData;
  }

  // ─── Edge operations ───────────────────────────────────────────────────────

  /**
   * Create a new directed edge.
   *
   * @param {Object} edgeData
   * @param {string} edgeData.fromNodeId - Source node id
   * @param {string} edgeData.toNodeId   - Target node id
   * @param {string} edgeData.edgeType   - Edge type label
   * @param {Object} [edgeData.props]    - Optional edge properties
   * @returns {Promise<Object>} The created edge (with auto-assigned `id`).
   */
  async createEdge(edgeData) {
    if (this._store) {
      try { return await this._store.createEdge(edgeData); } catch { return edgeData; }
    }
    const edge = { id: `edge-${++this._edgeSeq}`, ...edgeData };
    this._edges.set(edge.id, edge);
    return edge;
  }

  /**
   * Delete an edge by id.
   * @param {string} edgeId
   * @returns {Promise<void>}
   */
  async deleteEdge(edgeId) {
    if (this._store) {
      try { return await this._store.deleteEdge(edgeId); } catch { return; }
    }
    this._edges.delete(edgeId);
  }

  /**
   * Return all edges whose source is `nodeId`, optionally filtered by type.
   * @param {string} nodeId
   * @param {string} [edgeType]
   * @returns {Promise<Object[]>}
   */
  async getOutgoingEdges(nodeId, edgeType) {
    if (this._store) {
      try { return await this._store.getOutgoingEdges(nodeId, edgeType); } catch { return []; }
    }
    const results = [];
    for (const edge of this._edges.values()) {
      if (edge.fromNodeId !== nodeId) continue;
      if (edgeType && edge.edgeType !== edgeType) continue;
      results.push(edge);
    }
    return results;
  }

  /**
   * Return all edges whose target is `nodeId`, optionally filtered by type.
   * @param {string} nodeId
   * @param {string} [edgeType]
   * @returns {Promise<Object[]>}
   */
  async getIncomingEdges(nodeId, edgeType) {
    if (this._store) {
      try { return await this._store.getIncomingEdges(nodeId, edgeType); } catch { return []; }
    }
    const results = [];
    for (const edge of this._edges.values()) {
      if (edge.toNodeId !== nodeId) continue;
      if (edgeType && edge.edgeType !== edgeType) continue;
      results.push(edge);
    }
    return results;
  }
}

/**
 * Duck-type guard: returns true when `value` looks like a TypeNavigator.
 * Use this in constructors instead of `instanceof` so test mocks are accepted.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isTypeNavigator(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.getNode === 'function' &&
    typeof value.createEdge === 'function' &&
    typeof value.getOutgoingEdges === 'function' &&
    typeof value.deleteEdge === 'function'
  );
}
