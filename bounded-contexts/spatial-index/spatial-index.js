/**
 * @fileoverview JavaScript wrapper for SpatialIndex WASM bounded context
 * Provides spatial indexing for nodes with coordinates using quadtree data structure
 * @see DESIGN_SYSTEM.md#spatial-index
 */

/**
 * SpatialIndex wrapper class
 * Manages spatial indexing of nodes with 2D coordinates for efficient spatial queries
 */
class SpatialIndexWrapper {
  /**
   * @param {object} wasmModule - The loaded WASM module
   * @param {number} minX - Minimum X coordinate of index bounds
   * @param {number} minY - Minimum Y coordinate of index bounds
   * @param {number} maxX - Maximum X coordinate of index bounds
   * @param {number} maxY - Maximum Y coordinate of index bounds
   * @param {number} capacity - Maximum nodes per quadtree node before subdivision (default: 4)
   */
  constructor(wasmModule, minX, minY, maxX, maxY, capacity = 4) {
    this.wasm = wasmModule;
    this.index = new wasmModule.SpatialIndex(minX, minY, maxX, maxY, capacity);
    this.bounds = { minX, minY, maxX, maxY };
  }

  /**
   * Insert a node with coordinates into the spatial index
   * @param {string} id - Unique node identifier
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {object} metadata - Additional metadata for the node
   * @returns {boolean} True if insertion successful, false if out of bounds
   */
  insert(id, x, y, metadata = {}) {
    const metadataJson = JSON.stringify(metadata);
    return this.index.insert(id, x, y, metadataJson);
  }

  /**
   * Query nodes within a rectangular bounding box
   * @param {number} minX - Minimum X coordinate
   * @param {number} minY - Minimum Y coordinate
   * @param {number} maxX - Maximum X coordinate
   * @param {number} maxY - Maximum Y coordinate
   * @returns {Array<object>} Array of nodes within the range
   */
  queryRange(minX, minY, maxX, maxY) {
    const resultJson = this.index.query_range(minX, minY, maxX, maxY);
    return JSON.parse(resultJson);
  }

  /**
   * Query nodes within a circular radius from a center point
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Search radius
   * @returns {Array<object>} Array of nodes within the radius
   */
  queryRadius(centerX, centerY, radius) {
    const resultJson = this.index.query_radius(centerX, centerY, radius);
    return JSON.parse(resultJson);
  }

  /**
   * Find k-nearest neighbors to a point
   * @param {number} x - Query point X coordinate
   * @param {number} y - Query point Y coordinate
   * @param {number} k - Number of nearest neighbors to find
   * @returns {Array<object>} Array of k nearest nodes, sorted by distance
   */
  queryNearest(x, y, k) {
    const resultJson = this.index.query_nearest(x, y, k);
    return JSON.parse(resultJson);
  }

  /**
   * Get the position of a node by its ID
   * @param {string} id - Node identifier
   * @returns {object|null} Position object {x, y} or null if not found
   */
  getPosition(id) {
    const positionJson = this.index.get_position(id);
    return JSON.parse(positionJson);
  }

  /**
   * Get total number of indexed nodes
   * @returns {number} Total node count
   */
  size() {
    return this.index.size();
  }

  /**
   * Clear all nodes from the index
   */
  clear() {
    this.index.clear();
  }

  /**
   * Get the bounds of this spatial index
   * @returns {object} Bounds object {minX, minY, maxX, maxY}
   */
  getBounds() {
    return { ...this.bounds };
  }
}

/**
 * Load and initialize the SpatialIndex WASM module
 * @param {string} wasmPath - Path to the WASM file
 * @returns {Promise<function>} Factory function to create SpatialIndex instances
 */
async function loadSpatialIndex(wasmPath = '/bounded-contexts/spatial-index/spatial_index.wasm') {
  const wasmModule = await import(wasmPath);
  await wasmModule.default();

  /**
   * Create a new SpatialIndex instance
   * @param {number} minX - Minimum X coordinate of index bounds
   * @param {number} minY - Minimum Y coordinate of index bounds
   * @param {number} maxX - Maximum X coordinate of index bounds
   * @param {number} maxY - Maximum Y coordinate of index bounds
   * @param {number} capacity - Maximum nodes per quadtree node (default: 4)
   * @returns {SpatialIndexWrapper} New spatial index instance
   */
  return (minX, minY, maxX, maxY, capacity = 4) => {
    return new SpatialIndexWrapper(wasmModule, minX, minY, maxX, maxY, capacity);
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadSpatialIndex, SpatialIndexWrapper };
}