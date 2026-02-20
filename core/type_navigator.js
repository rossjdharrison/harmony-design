/**
 * @fileoverview TypeNavigator — graph-backed type/component query interface.
 *
 * Provides a simple async API for querying DesignSpecNodes, implementation
 * edges, and arbitrary node lookups from the Harmony graph layer.
 *
 * Used by tools/track_design_code_sync.js and other design-audit tools.
 * Tests supply a MockTypeNavigator that implements the same interface — the
 * constructor guard in consumers should check for the interface (duck-type)
 * rather than a strict instanceof check.
 *
 * @module core/type_navigator
 */

/**
 * TypeNavigator provides a read-only query interface over the Harmony
 * design-graph data.  In production it is backed by the MCP graph layer;
 * in tests it is replaced with a lightweight in-memory mock that exposes
 * the same three methods.
 */
export class TypeNavigator {
  /**
   * @param {Object} [graphClient] - Optional graph client.  When omitted the
   *   navigator operates in no-op / empty mode (useful for tool introspection
   *   without a live graph connection).
   */
  constructor(graphClient = null) {
    this._client = graphClient;
  }

  /**
   * Return all nodes whose `type` property matches the given type name.
   *
   * @param {string} typeName - e.g. 'DesignSpecNode', 'ImplementationFile'
   * @returns {Promise<Object[]>}
   */
  async queryByType(typeName) {
    if (!this._client) return [];
    try {
      return await this._client.queryByType(typeName);
    } catch {
      return [];
    }
  }

  /**
   * Return edges that match the given filter.
   *
   * @param {Object} query
   * @param {string} [query.source]   - Filter by source node id
   * @param {string} [query.target]   - Filter by target node id
   * @param {string} [query.edgeType] - Filter by edge type label
   * @returns {Promise<Object[]>}
   */
  async queryEdges(query) {
    if (!this._client) return [];
    try {
      return await this._client.queryEdges(query);
    } catch {
      return [];
    }
  }

  /**
   * Fetch a single node by its id.
   *
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getNode(id) {
    if (!this._client) return null;
    try {
      return await this._client.getNode(id);
    } catch {
      return null;
    }
  }
}

/**
 * Duck-type guard: returns true when the value exposes the TypeNavigator
 * interface (queryByType, queryEdges, getNode).  Use this instead of
 * `instanceof TypeNavigator` so that test mocks are accepted without needing
 * to extend the class.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isTypeNavigator(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.queryByType === 'function' &&
    typeof value.queryEdges === 'function' &&
    typeof value.getNode === 'function'
  );
}
