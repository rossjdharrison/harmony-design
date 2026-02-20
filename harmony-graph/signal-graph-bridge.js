/**
 * @fileoverview JS bridge to harmony-sound/domains/signal-graph compiled to WASM.
 * Exposes graph construction, node connection, and parameter control APIs.
 * 
 * @module harmony-graph/signal-graph-bridge
 * @see {@link ../../DESIGN_SYSTEM.md#signal-graph-bridge Signal Graph Bridge Documentation}
 */

import { EventBus } from '../core/event-bus.js';

/**
 * Signal graph node types supported by the WASM implementation.
 * @enum {string}
 */
export const NodeType = {
  OSCILLATOR: 'oscillator',
  FILTER: 'filter',
  GAIN: 'gain',
  ENVELOPE: 'envelope',
  LFO: 'lfo',
  MIXER: 'mixer',
  OUTPUT: 'output',
};

/**
 * Parameter types for signal graph nodes.
 * @enum {string}
 */
export const ParameterType = {
  FREQUENCY: 'frequency',
  AMPLITUDE: 'amplitude',
  CUTOFF: 'cutoff',
  RESONANCE: 'resonance',
  ATTACK: 'attack',
  DECAY: 'decay',
  SUSTAIN: 'sustain',
  RELEASE: 'release',
  RATE: 'rate',
  DEPTH: 'depth',
};

/**
 * Bridge to WASM-compiled signal graph implementation.
 * Manages graph construction, node connections, and parameter control.
 * 
 * Memory budget: Maximum 50MB WASM heap (Policy #2).
 * Latency budget: Maximum 10ms end-to-end (Policy #5).
 * 
 * @class SignalGraphBridge
 */
export class SignalGraphBridge {
  /**
   * @param {EventBus} eventBus - EventBus singleton for command/event pattern
   */
  constructor(eventBus) {
    if (!eventBus || !(eventBus instanceof EventBus)) {
      throw new Error('SignalGraphBridge requires EventBus singleton from core/event-bus.js');
    }

    /** @private */
    this._eventBus = eventBus;

    /** @private @type {WebAssembly.Instance|null} */
    this._wasmInstance = null;

    /** @private @type {WebAssembly.Memory|null} */
    this._wasmMemory = null;

    /** @private @type {Map<string, number>} */
    this._nodeHandles = new Map();

    /** @private @type {Map<string, Map<string, number>>} */
    this._parameterHandles = new Map();

    /** @private @type {number} */
    this._nextNodeId = 1;

    /** @private @type {boolean} */
    this._initialized = false;

    /** @private @type {number} */
    this._memoryUsageBytes = 0;

    /** @private @constant {number} */
    this._MAX_MEMORY_BYTES = 50 * 1024 * 1024; // 50MB policy limit

    this._setupEventSubscriptions();
  }

  /**
   * Initialize the WASM module and memory.
   * @param {string} wasmPath - Path to the signal-graph WASM file
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails or memory budget exceeded
   */
  async initialize(wasmPath) {
    if (this._initialized) {
      console.warn('SignalGraphBridge already initialized');
      return;
    }

    const startTime = performance.now();

    try {
      // Load WASM module with memory constraints
      const memory = new WebAssembly.Memory({
        initial: 256, // 16MB initial
        maximum: 800, // ~50MB maximum (Policy #2)
        shared: false,
      });

      this._wasmMemory = memory;

      const importObject = {
        env: {
          memory,
          abort: this._handleWasmAbort.bind(this),
          log: this._handleWasmLog.bind(this),
        },
      };

      const response = await fetch(wasmPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM module: ${response.statusText}`);
      }

      const wasmBytes = await response.arrayBuffer();
      const wasmModule = await WebAssembly.compile(wasmBytes);
      this._wasmInstance = await WebAssembly.instantiate(wasmModule, importObject);

      // Initialize the signal graph runtime
      if (this._wasmInstance.exports.init_signal_graph) {
        this._wasmInstance.exports.init_signal_graph();
      }

      this._initialized = true;

      const loadTime = performance.now() - startTime;
      
      // Policy #3: Maximum 200ms initial load time
      if (loadTime > 200) {
        console.warn(`SignalGraphBridge load time ${loadTime.toFixed(2)}ms exceeds 200ms budget`);
      }

      this._eventBus.publish({
        type: 'SignalGraphBridge.Initialized',
        payload: { loadTime },
        source: 'SignalGraphBridge',
      });

      console.log(`SignalGraphBridge initialized in ${loadTime.toFixed(2)}ms`);
    } catch (error) {
      this._eventBus.publish({
        type: 'SignalGraphBridge.InitializationFailed',
        payload: { error: error.message },
        source: 'SignalGraphBridge',
      });
      throw error;
    }
  }

  /**
   * Create a new signal graph node.
   * @param {NodeType} nodeType - Type of node to create
   * @param {Object} config - Node configuration
   * @returns {string} Node ID
   * @throws {Error} If WASM not initialized or memory budget exceeded
   */
  createNode(nodeType, config = {}) {
    this._ensureInitialized();
    this._checkMemoryBudget();

    const nodeId = `node_${this._nextNodeId++}`;
    
    try {
      // Allocate memory for node configuration
      const configJson = JSON.stringify(config);
      const configPtr = this._allocateString(configJson);
      const nodeTypePtr = this._allocateString(nodeType);

      // Call WASM function to create node
      const nodeHandle = this._wasmInstance.exports.create_node(nodeTypePtr, configPtr);

      if (nodeHandle === 0) {
        throw new Error(`Failed to create node of type ${nodeType}`);
      }

      this._nodeHandles.set(nodeId, nodeHandle);
      this._parameterHandles.set(nodeId, new Map());

      // Track memory usage
      this._memoryUsageBytes += this._estimateNodeMemory(nodeType);

      this._eventBus.publish({
        type: 'SignalGraphBridge.NodeCreated',
        payload: { nodeId, nodeType, config },
        source: 'SignalGraphBridge',
      });

      return nodeId;
    } catch (error) {
      this._eventBus.publish({
        type: 'SignalGraphBridge.NodeCreationFailed',
        payload: { nodeType, error: error.message },
        source: 'SignalGraphBridge',
      });
      throw error;
    }
  }

  /**
   * Connect two nodes in the signal graph.
   * @param {string} sourceNodeId - Source node ID
   * @param {string} targetNodeId - Target node ID
   * @param {number} [sourceOutput=0] - Source output index
   * @param {number} [targetInput=0] - Target input index
   * @throws {Error} If nodes don't exist or connection fails
   */
  connectNodes(sourceNodeId, targetNodeId, sourceOutput = 0, targetInput = 0) {
    this._ensureInitialized();

    const sourceHandle = this._nodeHandles.get(sourceNodeId);
    const targetHandle = this._nodeHandles.get(targetNodeId);

    if (!sourceHandle) {
      throw new Error(`Source node ${sourceNodeId} not found`);
    }

    if (!targetHandle) {
      throw new Error(`Target node ${targetNodeId} not found`);
    }

    try {
      const result = this._wasmInstance.exports.connect_nodes(
        sourceHandle,
        targetHandle,
        sourceOutput,
        targetInput
      );

      if (result !== 1) {
        throw new Error('Connection failed in WASM');
      }

      this._eventBus.publish({
        type: 'SignalGraphBridge.NodesConnected',
        payload: { sourceNodeId, targetNodeId, sourceOutput, targetInput },
        source: 'SignalGraphBridge',
      });
    } catch (error) {
      this._eventBus.publish({
        type: 'SignalGraphBridge.ConnectionFailed',
        payload: { sourceNodeId, targetNodeId, error: error.message },
        source: 'SignalGraphBridge',
      });
      throw error;
    }
  }

  /**
   * Disconnect two nodes in the signal graph.
   * @param {string} sourceNodeId - Source node ID
   * @param {string} targetNodeId - Target node ID
   * @throws {Error} If nodes don't exist or disconnection fails
   */
  disconnectNodes(sourceNodeId, targetNodeId) {
    this._ensureInitialized();

    const sourceHandle = this._nodeHandles.get(sourceNodeId);
    const targetHandle = this._nodeHandles.get(targetNodeId);

    if (!sourceHandle || !targetHandle) {
      throw new Error('One or both nodes not found');
    }

    try {
      const result = this._wasmInstance.exports.disconnect_nodes(sourceHandle, targetHandle);

      if (result !== 1) {
        throw new Error('Disconnection failed in WASM');
      }

      this._eventBus.publish({
        type: 'SignalGraphBridge.NodesDisconnected',
        payload: { sourceNodeId, targetNodeId },
        source: 'SignalGraphBridge',
      });
    } catch (error) {
      this._eventBus.publish({
        type: 'SignalGraphBridge.DisconnectionFailed',
        payload: { sourceNodeId, targetNodeId, error: error.message },
        source: 'SignalGraphBridge',
      });
      throw error;
    }
  }

  /**
   * Set a parameter value on a node.
   * @param {string} nodeId - Node ID
   * @param {ParameterType} parameterType - Parameter to set
   * @param {number} value - Parameter value
   * @throws {Error} If node doesn't exist or parameter invalid
   */
  setParameter(nodeId, parameterType, value) {
    this._ensureInitialized();

    const nodeHandle = this._nodeHandles.get(nodeId);
    if (!nodeHandle) {
      throw new Error(`Node ${nodeId} not found`);
    }

    try {
      const paramTypePtr = this._allocateString(parameterType);
      const result = this._wasmInstance.exports.set_parameter(nodeHandle, paramTypePtr, value);

      if (result !== 1) {
        throw new Error(`Failed to set parameter ${parameterType}`);
      }

      this._eventBus.publish({
        type: 'SignalGraphBridge.ParameterSet',
        payload: { nodeId, parameterType, value },
        source: 'SignalGraphBridge',
      });
    } catch (error) {
      this._eventBus.publish({
        type: 'SignalGraphBridge.ParameterSetFailed',
        payload: { nodeId, parameterType, value, error: error.message },
        source: 'SignalGraphBridge',
      });
      throw error;
    }
  }

  /**
   * Get a parameter value from a node.
   * @param {string} nodeId - Node ID
   * @param {ParameterType} parameterType - Parameter to get
   * @returns {number} Parameter value
   * @throws {Error} If node doesn't exist or parameter invalid
   */
  getParameter(nodeId, parameterType) {
    this._ensureInitialized();

    const nodeHandle = this._nodeHandles.get(nodeId);
    if (!nodeHandle) {
      throw new Error(`Node ${nodeId} not found`);
    }

    try {
      const paramTypePtr = this._allocateString(parameterType);
      const value = this._wasmInstance.exports.get_parameter(nodeHandle, paramTypePtr);

      return value;
    } catch (error) {
      console.error(`Failed to get parameter ${parameterType} from node ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a node from the signal graph.
   * @param {string} nodeId - Node ID to delete
   * @throws {Error} If node doesn't exist
   */
  deleteNode(nodeId) {
    this._ensureInitialized();

    const nodeHandle = this._nodeHandles.get(nodeId);
    if (!nodeHandle) {
      throw new Error(`Node ${nodeId} not found`);
    }

    try {
      this._wasmInstance.exports.delete_node(nodeHandle);
      this._nodeHandles.delete(nodeId);
      this._parameterHandles.delete(nodeId);

      this._eventBus.publish({
        type: 'SignalGraphBridge.NodeDeleted',
        payload: { nodeId },
        source: 'SignalGraphBridge',
      });
    } catch (error) {
      this._eventBus.publish({
        type: 'SignalGraphBridge.NodeDeletionFailed',
        payload: { nodeId, error: error.message },
        source: 'SignalGraphBridge',
      });
      throw error;
    }
  }

  /**
   * Process the signal graph for one buffer.
   * @param {Float32Array} outputBuffer - Output buffer to fill
   * @param {number} sampleRate - Sample rate in Hz
   * @throws {Error} If processing fails or latency budget exceeded
   */
  process(outputBuffer, sampleRate) {
    this._ensureInitialized();

    const startTime = performance.now();

    try {
      const bufferLength = outputBuffer.length;
      const bufferPtr = this._allocateFloat32Array(bufferLength);

      // Call WASM processing function
      this._wasmInstance.exports.process_graph(bufferPtr, bufferLength, sampleRate);

      // Copy processed data back to output buffer
      const wasmBuffer = new Float32Array(
        this._wasmMemory.buffer,
        bufferPtr,
        bufferLength
      );
      outputBuffer.set(wasmBuffer);

      const processingTime = performance.now() - startTime;

      // Policy #5: Maximum 10ms end-to-end latency
      if (processingTime > 10) {
        console.warn(`Signal graph processing time ${processingTime.toFixed(2)}ms exceeds 10ms budget`);
      }
    } catch (error) {
      this._eventBus.publish({
        type: 'SignalGraphBridge.ProcessingFailed',
        payload: { error: error.message },
        source: 'SignalGraphBridge',
      });
      throw error;
    }
  }

  /**
   * Get current memory usage statistics.
   * @returns {Object} Memory usage info
   */
  getMemoryUsage() {
    if (!this._wasmMemory) {
      return { used: 0, available: this._MAX_MEMORY_BYTES, percentage: 0 };
    }

    const used = this._wasmMemory.buffer.byteLength;
    const percentage = (used / this._MAX_MEMORY_BYTES) * 100;

    return {
      used,
      available: this._MAX_MEMORY_BYTES,
      percentage: percentage.toFixed(2),
    };
  }

  /**
   * Dispose of all resources and clean up.
   */
  dispose() {
    if (!this._initialized) {
      return;
    }

    try {
      // Delete all nodes
      for (const [nodeId, nodeHandle] of this._nodeHandles.entries()) {
        try {
          this._wasmInstance.exports.delete_node(nodeHandle);
        } catch (error) {
          console.error(`Failed to delete node ${nodeId}:`, error);
        }
      }

      // Clean up WASM instance
      if (this._wasmInstance && this._wasmInstance.exports.cleanup) {
        this._wasmInstance.exports.cleanup();
      }

      this._nodeHandles.clear();
      this._parameterHandles.clear();
      this._wasmInstance = null;
      this._wasmMemory = null;
      this._initialized = false;

      this._eventBus.publish({
        type: 'SignalGraphBridge.Disposed',
        payload: {},
        source: 'SignalGraphBridge',
      });
    } catch (error) {
      console.error('Error during SignalGraphBridge disposal:', error);
    }
  }

  /**
   * Set up event subscriptions for command pattern.
   * @private
   */
  _setupEventSubscriptions() {
    // Subscribe to graph construction commands
    this._eventBus.subscribe('SignalGraph.CreateNode', (event) => {
      try {
        const { nodeType, config } = event.payload;
        const nodeId = this.createNode(nodeType, config);
        this._eventBus.publish({
          type: 'SignalGraph.NodeCreated',
          payload: { nodeId, nodeType },
          source: 'SignalGraphBridge',
        });
      } catch (error) {
        console.error('SignalGraph.CreateNode command failed:', error);
      }
    });

    this._eventBus.subscribe('SignalGraph.ConnectNodes', (event) => {
      try {
        const { sourceNodeId, targetNodeId, sourceOutput, targetInput } = event.payload;
        this.connectNodes(sourceNodeId, targetNodeId, sourceOutput, targetInput);
      } catch (error) {
        console.error('SignalGraph.ConnectNodes command failed:', error);
      }
    });

    this._eventBus.subscribe('SignalGraph.SetParameter', (event) => {
      try {
        const { nodeId, parameterType, value } = event.payload;
        this.setParameter(nodeId, parameterType, value);
      } catch (error) {
        console.error('SignalGraph.SetParameter command failed:', error);
      }
    });

    this._eventBus.subscribe('SignalGraph.DeleteNode', (event) => {
      try {
        const { nodeId } = event.payload;
        this.deleteNode(nodeId);
      } catch (error) {
        console.error('SignalGraph.DeleteNode command failed:', error);
      }
    });
  }

  /**
   * Ensure WASM is initialized before operations.
   * @private
   * @throws {Error} If not initialized
   */
  _ensureInitialized() {
    if (!this._initialized) {
      throw new Error('SignalGraphBridge not initialized. Call initialize() first.');
    }
  }

  /**
   * Check if memory budget would be exceeded.
   * @private
   * @throws {Error} If memory budget exceeded
   */
  _checkMemoryBudget() {
    if (this._wasmMemory && this._wasmMemory.buffer.byteLength > this._MAX_MEMORY_BYTES) {
      throw new Error(`Memory budget exceeded: ${this._wasmMemory.buffer.byteLength} > ${this._MAX_MEMORY_BYTES}`);
    }
  }

  /**
   * Allocate a string in WASM memory.
   * @private
   * @param {string} str - String to allocate
   * @returns {number} Pointer to allocated string
   */
  _allocateString(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const ptr = this._wasmInstance.exports.allocate(bytes.length + 1);
    const buffer = new Uint8Array(this._wasmMemory.buffer, ptr, bytes.length + 1);
    buffer.set(bytes);
    buffer[bytes.length] = 0; // Null terminator
    return ptr;
  }

  /**
   * Allocate a Float32Array in WASM memory.
   * @private
   * @param {number} length - Array length
   * @returns {number} Pointer to allocated array
   */
  _allocateFloat32Array(length) {
    const byteLength = length * 4; // 4 bytes per float32
    return this._wasmInstance.exports.allocate(byteLength);
  }

  /**
   * Estimate memory usage for a node type.
   * @private
   * @param {NodeType} nodeType - Node type
   * @returns {number} Estimated bytes
   */
  _estimateNodeMemory(nodeType) {
    // Rough estimates for different node types
    const estimates = {
      [NodeType.OSCILLATOR]: 1024,
      [NodeType.FILTER]: 2048,
      [NodeType.GAIN]: 512,
      [NodeType.ENVELOPE]: 1024,
      [NodeType.LFO]: 1024,
      [NodeType.MIXER]: 1536,
      [NodeType.OUTPUT]: 512,
    };
    return estimates[nodeType] || 1024;
  }

  /**
   * Handle WASM abort callback.
   * @private
   */
  _handleWasmAbort(message, fileName, lineNumber, columnNumber) {
    console.error('WASM abort:', { message, fileName, lineNumber, columnNumber });
    this._eventBus.publish({
      type: 'SignalGraphBridge.WasmAbort',
      payload: { message, fileName, lineNumber, columnNumber },
      source: 'SignalGraphBridge',
    });
  }

  /**
   * Handle WASM log callback.
   * @private
   */
  _handleWasmLog(messagePtr) {
    const message = this._readString(messagePtr);
    console.log('[WASM]', message);
  }

  /**
   * Read a null-terminated string from WASM memory.
   * @private
   * @param {number} ptr - Pointer to string
   * @returns {string} Decoded string
   */
  _readString(ptr) {
    const buffer = new Uint8Array(this._wasmMemory.buffer);
    let end = ptr;
    while (buffer[end] !== 0) end++;
    const bytes = buffer.slice(ptr, end);
    return new TextDecoder().decode(bytes);
  }
}