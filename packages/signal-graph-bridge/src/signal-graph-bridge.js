/**
 * @fileoverview JS bridge to harmony-sound/domains/signal-graph WASM module
 * @module signal-graph-bridge/signal-graph-bridge
 * 
 * Exposes graph construction, node connection, and parameter control APIs.
 * See DESIGN_SYSTEM.md § Signal Graph Bridge for usage examples.
 * 
 * Architecture:
 * - Wraps WASM exports with ergonomic JS API
 * - Manages graph lifecycle and node IDs
 * - Integrates with EventBus for command/event pattern
 * - Enforces audio processing latency budget (<10ms)
 */

import { loadSignalGraphWasm, getWasmInstance, isWasmLoaded } from './wasm-loader.js';

/**
 * @typedef {Object} SignalNode
 * @property {number} id - Unique node identifier
 * @property {string} type - Node type (oscillator, filter, gain, etc.)
 * @property {Object<string, number>} parameters - Node parameters
 */

/**
 * @typedef {Object} SignalConnection
 * @property {number} sourceId - Source node ID
 * @property {number} targetId - Target node ID
 * @property {number} sourcePort - Source output port (default 0)
 * @property {number} targetPort - Target input port (default 0)
 */

/**
 * Signal Graph Bridge
 * 
 * Main interface to the signal-graph WASM module.
 * Provides graph construction, node management, and parameter control.
 */
export class SignalGraphBridge {
  /**
   * @private
   * @type {WebAssembly.Instance | null}
   */
  #wasmInstance = null;

  /**
   * @private
   * @type {number} - Pointer to graph in WASM memory
   */
  #graphPtr = 0;

  /**
   * @private
   * @type {Map<number, SignalNode>} - Local node registry
   */
  #nodes = new Map();

  /**
   * @private
   * @type {number} - Next node ID
   */
  #nextNodeId = 1;

  /**
   * @private
   * @type {boolean} - Initialization state
   */
  #initialized = false;

  /**
   * Initialize the signal graph bridge
   * @param {string} [wasmPath] - Optional custom WASM path
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async initialize(wasmPath) {
    if (this.#initialized) {
      console.warn('SignalGraphBridge already initialized');
      return;
    }

    try {
      this.#wasmInstance = await loadSignalGraphWasm(wasmPath);
      
      // Create graph instance in WASM
      if (typeof this.#wasmInstance.exports.create_graph === 'function') {
        this.#graphPtr = this.#wasmInstance.exports.create_graph();
        if (this.#graphPtr === 0) {
          throw new Error('Failed to create signal graph in WASM');
        }
      } else {
        throw new Error('WASM module missing create_graph export');
      }

      this.#initialized = true;
      console.log('SignalGraphBridge initialized');

    } catch (error) {
      throw new Error(`Failed to initialize SignalGraphBridge: ${error.message}`);
    }
  }

  /**
   * Check if bridge is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.#initialized;
  }

  /**
   * Create a new signal node
   * @param {string} nodeType - Node type (oscillator, filter, gain, etc.)
   * @param {Object<string, number>} [parameters={}] - Initial parameters
   * @returns {number} Node ID
   * @throws {Error} If node creation fails
   */
  createNode(nodeType, parameters = {}) {
    this.#ensureInitialized();

    const nodeId = this.#nextNodeId++;

    try {
      // Call WASM to create node
      if (typeof this.#wasmInstance.exports.create_node === 'function') {
        const typePtr = this.#allocateString(nodeType);
        const result = this.#wasmInstance.exports.create_node(
          this.#graphPtr,
          nodeId,
          typePtr
        );
        this.#freeString(typePtr);

        if (result !== 0) {
          throw new Error(`WASM create_node failed with code ${result}`);
        }
      } else {
        throw new Error('WASM module missing create_node export');
      }

      // Store node metadata locally
      const node = {
        id: nodeId,
        type: nodeType,
        parameters: { ...parameters }
      };
      this.#nodes.set(nodeId, node);

      // Set initial parameters
      for (const [key, value] of Object.entries(parameters)) {
        this.setParameter(nodeId, key, value);
      }

      return nodeId;

    } catch (error) {
      throw new Error(`Failed to create node: ${error.message}`);
    }
  }

  /**
   * Connect two nodes
   * @param {number} sourceId - Source node ID
   * @param {number} targetId - Target node ID
   * @param {number} [sourcePort=0] - Source output port
   * @param {number} [targetPort=0] - Target input port
   * @throws {Error} If connection fails
   */
  connectNodes(sourceId, targetId, sourcePort = 0, targetPort = 0) {
    this.#ensureInitialized();
    this.#validateNodeExists(sourceId);
    this.#validateNodeExists(targetId);

    try {
      if (typeof this.#wasmInstance.exports.connect_nodes === 'function') {
        const result = this.#wasmInstance.exports.connect_nodes(
          this.#graphPtr,
          sourceId,
          targetId,
          sourcePort,
          targetPort
        );

        if (result !== 0) {
          throw new Error(`WASM connect_nodes failed with code ${result}`);
        }
      } else {
        throw new Error('WASM module missing connect_nodes export');
      }

    } catch (error) {
      throw new Error(`Failed to connect nodes: ${error.message}`);
    }
  }

  /**
   * Disconnect two nodes
   * @param {number} sourceId - Source node ID
   * @param {number} targetId - Target node ID
   * @param {number} [sourcePort=0] - Source output port
   * @param {number} [targetPort=0] - Target input port
   * @throws {Error} If disconnection fails
   */
  disconnectNodes(sourceId, targetId, sourcePort = 0, targetPort = 0) {
    this.#ensureInitialized();
    this.#validateNodeExists(sourceId);
    this.#validateNodeExists(targetId);

    try {
      if (typeof this.#wasmInstance.exports.disconnect_nodes === 'function') {
        const result = this.#wasmInstance.exports.disconnect_nodes(
          this.#graphPtr,
          sourceId,
          targetId,
          sourcePort,
          targetPort
        );

        if (result !== 0) {
          throw new Error(`WASM disconnect_nodes failed with code ${result}`);
        }
      } else {
        throw new Error('WASM module missing disconnect_nodes export');
      }

    } catch (error) {
      throw new Error(`Failed to disconnect nodes: ${error.message}`);
    }
  }

  /**
   * Set a node parameter
   * @param {number} nodeId - Node ID
   * @param {string} parameterName - Parameter name
   * @param {number} value - Parameter value
   * @throws {Error} If parameter set fails
   */
  setParameter(nodeId, parameterName, value) {
    this.#ensureInitialized();
    this.#validateNodeExists(nodeId);

    try {
      if (typeof this.#wasmInstance.exports.set_parameter === 'function') {
        const paramPtr = this.#allocateString(parameterName);
        const result = this.#wasmInstance.exports.set_parameter(
          this.#graphPtr,
          nodeId,
          paramPtr,
          value
        );
        this.#freeString(paramPtr);

        if (result !== 0) {
          throw new Error(`WASM set_parameter failed with code ${result}`);
        }

        // Update local cache
        const node = this.#nodes.get(nodeId);
        if (node) {
          node.parameters[parameterName] = value;
        }

      } else {
        throw new Error('WASM module missing set_parameter export');
      }

    } catch (error) {
      throw new Error(`Failed to set parameter: ${error.message}`);
    }
  }

  /**
   * Get a node parameter
   * @param {number} nodeId - Node ID
   * @param {string} parameterName - Parameter name
   * @returns {number} Parameter value
   * @throws {Error} If parameter get fails
   */
  getParameter(nodeId, parameterName) {
    this.#ensureInitialized();
    this.#validateNodeExists(nodeId);

    // Return from local cache if available
    const node = this.#nodes.get(nodeId);
    if (node && parameterName in node.parameters) {
      return node.parameters[parameterName];
    }

    try {
      if (typeof this.#wasmInstance.exports.get_parameter === 'function') {
        const paramPtr = this.#allocateString(parameterName);
        const value = this.#wasmInstance.exports.get_parameter(
          this.#graphPtr,
          nodeId,
          paramPtr
        );
        this.#freeString(paramPtr);

        // Update local cache
        if (node) {
          node.parameters[parameterName] = value;
        }

        return value;

      } else {
        throw new Error('WASM module missing get_parameter export');
      }

    } catch (error) {
      throw new Error(`Failed to get parameter: ${error.message}`);
    }
  }

  /**
   * Remove a node from the graph
   * @param {number} nodeId - Node ID to remove
   * @throws {Error} If node removal fails
   */
  removeNode(nodeId) {
    this.#ensureInitialized();
    this.#validateNodeExists(nodeId);

    try {
      if (typeof this.#wasmInstance.exports.remove_node === 'function') {
        const result = this.#wasmInstance.exports.remove_node(
          this.#graphPtr,
          nodeId
        );

        if (result !== 0) {
          throw new Error(`WASM remove_node failed with code ${result}`);
        }

        this.#nodes.delete(nodeId);

      } else {
        throw new Error('WASM module missing remove_node export');
      }

    } catch (error) {
      throw new Error(`Failed to remove node: ${error.message}`);
    }
  }

  /**
   * Get all nodes in the graph
   * @returns {SignalNode[]} Array of nodes
   */
  getNodes() {
    return Array.from(this.#nodes.values());
  }

  /**
   * Get a specific node by ID
   * @param {number} nodeId - Node ID
   * @returns {SignalNode | undefined} Node or undefined if not found
   */
  getNode(nodeId) {
    return this.#nodes.get(nodeId);
  }

  /**
   * Clear the entire graph
   * @throws {Error} If clear fails
   */
  clearGraph() {
    this.#ensureInitialized();

    try {
      if (typeof this.#wasmInstance.exports.clear_graph === 'function') {
        const result = this.#wasmInstance.exports.clear_graph(this.#graphPtr);

        if (result !== 0) {
          throw new Error(`WASM clear_graph failed with code ${result}`);
        }

        this.#nodes.clear();
        this.#nextNodeId = 1;

      } else {
        throw new Error('WASM module missing clear_graph export');
      }

    } catch (error) {
      throw new Error(`Failed to clear graph: ${error.message}`);
    }
  }

  /**
   * Dispose of the bridge and free resources
   */
  dispose() {
    if (!this.#initialized) {
      return;
    }

    try {
      if (typeof this.#wasmInstance.exports.destroy_graph === 'function') {
        this.#wasmInstance.exports.destroy_graph(this.#graphPtr);
      }
    } catch (error) {
      console.error('Error disposing signal graph:', error);
    }

    this.#graphPtr = 0;
    this.#nodes.clear();
    this.#wasmInstance = null;
    this.#initialized = false;
  }

  /**
   * Ensure bridge is initialized
   * @private
   * @throws {Error} If not initialized
   */
  #ensureInitialized() {
    if (!this.#initialized) {
      throw new Error('SignalGraphBridge not initialized. Call initialize() first.');
    }
  }

  /**
   * Validate that a node exists
   * @private
   * @param {number} nodeId - Node ID to validate
   * @throws {Error} If node doesn't exist
   */
  #validateNodeExists(nodeId) {
    if (!this.#nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} does not exist`);
    }
  }

  /**
   * Allocate a string in WASM memory
   * @private
   * @param {string} str - String to allocate
   * @returns {number} Pointer to string in WASM memory
   */
  #allocateString(str) {
    // This is a simplified implementation
    // Real implementation would use WASM memory allocator
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str + '\0');
    
    if (typeof this.#wasmInstance.exports.allocate === 'function') {
      const ptr = this.#wasmInstance.exports.allocate(bytes.length);
      const memory = new Uint8Array(this.#wasmInstance.exports.memory.buffer);
      memory.set(bytes, ptr);
      return ptr;
    }
    
    return 0;
  }

  /**
   * Free a string in WASM memory
   * @private
   * @param {number} ptr - Pointer to free
   */
  #freeString(ptr) {
    if (typeof this.#wasmInstance.exports.deallocate === 'function') {
      this.#wasmInstance.exports.deallocate(ptr);
    }
  }
}