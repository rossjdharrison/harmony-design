/**
 * EdgeBinaryFormat JavaScript Wrapper
 * 
 * Provides a convenient JavaScript interface to the WASM EdgeBinaryFormat module.
 * Handles WASM module loading and provides typed interfaces.
 * 
 * @module EdgeBinaryFormat
 * @see harmony-design/DESIGN_SYSTEM.md#edge-binary-format
 */

let wasmModule = null;

/**
 * Initializes the WASM module
 * @returns {Promise<void>}
 */
export async function initEdgeBinaryFormat() {
  if (wasmModule) return;
  
  try {
    wasmModule = await import('./pkg/wasm_edge_executor.js');
  } catch (error) {
    console.error('Failed to load EdgeBinaryFormat WASM module:', error);
    throw new Error('EdgeBinaryFormat WASM module initialization failed');
  }
}

/**
 * Edge binary format wrapper
 * Provides a JavaScript-friendly interface to edge binary operations
 */
export class Edge {
  /**
   * Creates a new edge
   * @param {number} source - Source node ID
   * @param {number} target - Target node ID
   * @param {number} edgeType - Edge type ID
   */
  constructor(source, target, edgeType) {
    if (!wasmModule) {
      throw new Error('EdgeBinaryFormat not initialized. Call initEdgeBinaryFormat() first.');
    }
    
    this._edge = new wasmModule.EdgeBinaryFormat(source, target, edgeType);
  }

  /**
   * Gets the source node ID
   * @returns {number}
   */
  get source() {
    return this._edge.source;
  }

  /**
   * Gets the target node ID
   * @returns {number}
   */
  get target() {
    return this._edge.target;
  }

  /**
   * Gets the edge type ID
   * @returns {number}
   */
  get edgeType() {
    return this._edge.edgeType;
  }

  /**
   * Serializes the edge to a byte buffer
   * @param {Uint8Array} buffer - Target buffer
   * @param {number} offset - Offset in buffer
   * @returns {number} Number of bytes written
   */
  toBytes(buffer, offset = 0) {
    return this._edge.toBytes(buffer, offset);
  }

  /**
   * Deserializes an edge from a byte buffer
   * @param {Uint8Array} buffer - Source buffer
   * @param {number} offset - Offset in buffer
   * @returns {Edge}
   */
  static fromBytes(buffer, offset = 0) {
    if (!wasmModule) {
      throw new Error('EdgeBinaryFormat not initialized. Call initEdgeBinaryFormat() first.');
    }
    
    const wasmEdge = wasmModule.EdgeBinaryFormat.fromBytes(buffer, offset);
    const edge = Object.create(Edge.prototype);
    edge._edge = wasmEdge;
    return edge;
  }

  /**
   * Checks if this edge connects the given nodes (in either direction)
   * @param {number} nodeA - First node ID
   * @param {number} nodeB - Second node ID
   * @returns {boolean}
   */
  connectsNodes(nodeA, nodeB) {
    return this._edge.connectsNodes(nodeA, nodeB);
  }

  /**
   * Checks if this edge is a self-loop
   * @returns {boolean}
   */
  isSelfLoop() {
    return this._edge.isSelfLoop();
  }

  /**
   * Reverses the direction of the edge
   * @returns {Edge}
   */
  reverse() {
    const reversed = this._edge.reverse();
    const edge = Object.create(Edge.prototype);
    edge._edge = reversed;
    return edge;
  }

  /**
   * Converts the edge to a plain object
   * @returns {{source: number, target: number, edgeType: number}}
   */
  toObject() {
    return {
      source: this.source,
      target: this.target,
      edgeType: this.edgeType,
    };
  }

  /**
   * Creates an edge from a plain object
   * @param {{source: number, target: number, edgeType: number}} obj
   * @returns {Edge}
   */
  static fromObject(obj) {
    return new Edge(obj.source, obj.target, obj.edgeType);
  }
}

/**
 * Serializes multiple edges to a contiguous buffer
 * @param {Edge[]} edges - Array of edges
 * @returns {Uint8Array} Serialized buffer
 */
export function serializeEdges(edges) {
  if (!wasmModule) {
    throw new Error('EdgeBinaryFormat not initialized. Call initEdgeBinaryFormat() first.');
  }
  
  const wasmEdges = edges.map(e => e._edge);
  return wasmModule.serializeEdges(wasmEdges);
}

/**
 * Deserializes multiple edges from a contiguous buffer
 * @param {Uint8Array} buffer - Serialized buffer
 * @returns {Edge[]} Array of edges
 */
export function deserializeEdges(buffer) {
  if (!wasmModule) {
    throw new Error('EdgeBinaryFormat not initialized. Call initEdgeBinaryFormat() first.');
  }
  
  const wasmEdges = wasmModule.deserializeEdges(buffer);
  return wasmEdges.map(wasmEdge => {
    const edge = Object.create(Edge.prototype);
    edge._edge = wasmEdge;
    return edge;
  });
}

/**
 * Size of a single edge in bytes
 * @constant {number}
 */
export const EDGE_SIZE = 12;

/**
 * Calculates the buffer size needed for a given number of edges
 * @param {number} edgeCount - Number of edges
 * @returns {number} Buffer size in bytes
 */
export function calculateBufferSize(edgeCount) {
  return edgeCount * EDGE_SIZE;
}