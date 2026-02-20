/**
 * @file AudioGraphProcessor - WebAudio worklet processor for harmony-sound graph topology
 * @module harmony-web/workers/audio-graph-processor
 * 
 * Extends AudioWorkletProcessor to create WebAudio nodes from harmony-sound graph topology.
 * Handles dependency wave execution per process() call, ensuring correct order of operations.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#audio-graph-processing}
 */

/**
 * AudioGraphProcessor extends AudioWorkletProcessor to process audio graphs.
 * 
 * Graph topology is received via MessagePort from SignalGraphBridge.
 * Each process() call executes nodes in dependency order (topological sort).
 * 
 * Architecture:
 * - SignalGraphBridge (main thread) → MessagePort → AudioGraphProcessor (audio thread)
 * - Graph nodes represent DSP operations (oscillators, filters, mixers, etc.)
 * - Edges represent signal flow dependencies
 * - Execution order computed once per graph update, cached for performance
 * 
 * Performance constraints:
 * - Must complete within 128 samples / sample_rate (e.g., 2.9ms @ 44.1kHz)
 * - No allocations in process() call
 * - Pre-computed topological sort
 * - Inline node execution (no function calls per sample when possible)
 * 
 * @extends AudioWorkletProcessor
 */
class AudioGraphProcessor extends AudioWorkletProcessor {
  /**
   * Creates an AudioGraphProcessor instance.
   * 
   * @param {object} options - Worklet node options
   * @param {number} options.processorOptions.graphId - Unique graph identifier
   * @param {number} options.processorOptions.maxNodes - Maximum nodes in graph (default: 256)
   */
  constructor(options) {
    super();

    // Graph metadata
    this.graphId = options.processorOptions?.graphId ?? 0;
    this.maxNodes = options.processorOptions?.maxNodes ?? 256;

    // Graph topology
    this.nodes = new Map(); // nodeId → { type, params, inputs, outputs, state }
    this.executionOrder = []; // [nodeId] in topological order
    this.nodeOutputs = new Map(); // nodeId → Float32Array (128 samples)

    // Pre-allocated buffers (no allocation in process())
    this.scratchBuffer = new Float32Array(128);
    this.mixBuffer = new Float32Array(128);

    // Graph state
    this.graphDirty = false;
    this.currentSample = 0;
    this.sampleRate = sampleRate;

    // Message port for graph updates
    this.port.onmessage = this.handleMessage.bind(this);

    // Performance tracking
    this.processCallCount = 0;
    this.totalProcessTime = 0;
  }

  /**
   * Declares processor parameters (none - graph is dynamic).
   * 
   * @returns {object} Empty parameter descriptor
   */
  static get parameterDescriptors() {
    return [];
  }

  /**
   * Handles messages from main thread (graph updates, parameter changes).
   * 
   * @param {MessageEvent} event - Message from SignalGraphBridge
   */
  handleMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'updateGraph':
        this.updateGraph(data);
        break;

      case 'updateNodeParams':
        this.updateNodeParams(data.nodeId, data.params);
        break;

      case 'removeNode':
        this.removeNode(data.nodeId);
        break;

      case 'reset':
        this.reset();
        break;

      default:
        console.warn(`[AudioGraphProcessor] Unknown message type: ${type}`);
    }
  }

  /**
   * Updates the entire graph topology.
   * Recomputes execution order via topological sort.
   * 
   * @param {object} graphData - Graph topology from SignalGraphBridge
   * @param {Array<object>} graphData.nodes - Array of node descriptors
   * @param {Array<object>} graphData.edges - Array of edge descriptors
   */
  updateGraph(graphData) {
    const { nodes, edges } = graphData;

    // Clear existing graph
    this.nodes.clear();
    this.nodeOutputs.clear();

    // Build node map
    for (const nodeDesc of nodes) {
      this.nodes.set(nodeDesc.id, {
        type: nodeDesc.type,
        params: nodeDesc.params || {},
        inputs: [], // [{ fromNodeId, fromPort, toPort }]
        outputs: [], // [{ toNodeId, fromPort, toPort }]
        state: this.createNodeState(nodeDesc.type, nodeDesc.params)
      });

      // Pre-allocate output buffer
      this.nodeOutputs.set(nodeDesc.id, new Float32Array(128));
    }

    // Build edge lists
    for (const edge of edges) {
      const fromNode = this.nodes.get(edge.from);
      const toNode = this.nodes.get(edge.to);

      if (fromNode && toNode) {
        fromNode.outputs.push({
          toNodeId: edge.to,
          fromPort: edge.fromPort || 0,
          toPort: edge.toPort || 0
        });

        toNode.inputs.push({
          fromNodeId: edge.from,
          fromPort: edge.fromPort || 0,
          toPort: edge.toPort || 0
        });
      }
    }

    // Compute execution order (topological sort)
    this.executionOrder = this.computeExecutionOrder();

    this.graphDirty = false;

    // Notify main thread
    this.port.postMessage({
      type: 'graphUpdated',
      data: {
        graphId: this.graphId,
        nodeCount: this.nodes.size,
        executionOrder: this.executionOrder
      }
    });
  }

  /**
   * Updates parameters for a single node.
   * 
   * @param {number} nodeId - Node identifier
   * @param {object} params - New parameter values
   */
  updateNodeParams(nodeId, params) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`[AudioGraphProcessor] Node ${nodeId} not found`);
      return;
    }

    // Merge new params
    Object.assign(node.params, params);

    // Update state if needed
    this.updateNodeState(node, params);
  }

  /**
   * Removes a node from the graph.
   * 
   * @param {number} nodeId - Node identifier
   */
  removeNode(nodeId) {
    this.nodes.delete(nodeId);
    this.nodeOutputs.delete(nodeId);
    this.graphDirty = true;

    // Recompute execution order
    this.executionOrder = this.computeExecutionOrder();
  }

  /**
   * Resets the processor state.
   */
  reset() {
    // Reset all node states
    for (const [nodeId, node] of this.nodes) {
      node.state = this.createNodeState(node.type, node.params);
    }

    this.currentSample = 0;
    this.processCallCount = 0;
    this.totalProcessTime = 0;
  }

  /**
   * Computes topological execution order using Kahn's algorithm.
   * Ensures nodes are processed after all their dependencies.
   * 
   * @returns {Array<number>} Array of node IDs in execution order
   */
  computeExecutionOrder() {
    const inDegree = new Map();
    const queue = [];
    const order = [];

    // Initialize in-degree count
    for (const [nodeId, node] of this.nodes) {
      inDegree.set(nodeId, node.inputs.length);
      if (node.inputs.length === 0) {
        queue.push(nodeId);
      }
    }

    // Kahn's algorithm
    while (queue.length > 0) {
      const nodeId = queue.shift();
      order.push(nodeId);

      const node = this.nodes.get(nodeId);
      for (const output of node.outputs) {
        const degree = inDegree.get(output.toNodeId) - 1;
        inDegree.set(output.toNodeId, degree);

        if (degree === 0) {
          queue.push(output.toNodeId);
        }
      }
    }

    // Check for cycles
    if (order.length !== this.nodes.size) {
      console.error('[AudioGraphProcessor] Graph contains cycles!');
      return [];
    }

    return order;
  }

  /**
   * Creates initial state for a node based on its type.
   * 
   * @param {string} type - Node type (e.g., 'oscillator', 'filter', 'gain')
   * @param {object} params - Node parameters
   * @returns {object} Initial node state
   */
  createNodeState(type, params) {
    switch (type) {
      case 'oscillator':
        return {
          phase: 0,
          frequency: params.frequency || 440,
          waveform: params.waveform || 'sine'
        };

      case 'gain':
        return {
          gain: params.gain || 1.0
        };

      case 'filter':
        return {
          type: params.filterType || 'lowpass',
          frequency: params.frequency || 1000,
          q: params.q || 1.0,
          // Biquad filter state
          x1: 0, x2: 0,
          y1: 0, y2: 0,
          b0: 1, b1: 0, b2: 0,
          a1: 0, a2: 0
        };

      case 'mixer':
        return {
          inputCount: params.inputCount || 2
        };

      case 'output':
        return {};

      default:
        return {};
    }
  }

  /**
   * Updates node state when parameters change.
   * 
   * @param {object} node - Node descriptor
   * @param {object} params - New parameters
   */
  updateNodeState(node, params) {
    switch (node.type) {
      case 'oscillator':
        if (params.frequency !== undefined) {
          node.state.frequency = params.frequency;
        }
        if (params.waveform !== undefined) {
          node.state.waveform = params.waveform;
        }
        break;

      case 'gain':
        if (params.gain !== undefined) {
          node.state.gain = params.gain;
        }
        break;

      case 'filter':
        if (params.frequency !== undefined || params.q !== undefined) {
          // Recompute biquad coefficients
          this.computeBiquadCoefficients(node.state);
        }
        break;
    }
  }

  /**
   * Computes biquad filter coefficients from frequency and Q.
   * 
   * @param {object} state - Filter state object
   */
  computeBiquadCoefficients(state) {
    const omega = 2 * Math.PI * state.frequency / this.sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * state.q);

    // Lowpass coefficients
    const b0 = (1 - cs) / 2;
    const b1 = 1 - cs;
    const b2 = (1 - cs) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cs;
    const a2 = 1 - alpha;

    // Normalize
    state.b0 = b0 / a0;
    state.b1 = b1 / a0;
    state.b2 = b2 / a0;
    state.a1 = a1 / a0;
    state.a2 = a2 / a0;
  }

  /**
   * Main audio processing callback.
   * Executes graph nodes in dependency order.
   * 
   * @param {Array<Float32Array[]>} inputs - Input buffers (unused - graph is self-contained)
   * @param {Array<Float32Array[]>} outputs - Output buffers
   * @returns {boolean} True to keep processor alive
   */
  process(inputs, outputs) {
    const startTime = performance.now();

    // If no graph, output silence
    if (this.executionOrder.length === 0) {
      return true;
    }

    // Execute nodes in dependency order
    for (const nodeId of this.executionOrder) {
      const node = this.nodes.get(nodeId);
      const outputBuffer = this.nodeOutputs.get(nodeId);

      this.processNode(node, nodeId, outputBuffer);
    }

    // Copy final output (find output node)
    const outputNode = Array.from(this.nodes.entries()).find(
      ([id, node]) => node.type === 'output'
    );

    if (outputNode) {
      const [outputNodeId] = outputNode;
      const finalBuffer = this.nodeOutputs.get(outputNodeId);

      // Copy to worklet output
      if (outputs[0] && outputs[0][0]) {
        outputs[0][0].set(finalBuffer);
      }
    }

    // Update sample counter
    this.currentSample += 128;
    this.processCallCount++;

    // Performance tracking
    const elapsed = performance.now() - startTime;
    this.totalProcessTime += elapsed;

    // Warn if over budget (2.9ms @ 44.1kHz)
    if (elapsed > 2.9) {
      console.warn(`[AudioGraphProcessor] Process took ${elapsed.toFixed(2)}ms (over budget)`);
    }

    return true;
  }

  /**
   * Processes a single node, writing output to buffer.
   * 
   * @param {object} node - Node descriptor
   * @param {number} nodeId - Node identifier
   * @param {Float32Array} outputBuffer - Output buffer (128 samples)
   */
  processNode(node, nodeId, outputBuffer) {
    switch (node.type) {
      case 'oscillator':
        this.processOscillator(node, outputBuffer);
        break;

      case 'gain':
        this.processGain(node, nodeId, outputBuffer);
        break;

      case 'filter':
        this.processFilter(node, nodeId, outputBuffer);
        break;

      case 'mixer':
        this.processMixer(node, nodeId, outputBuffer);
        break;

      case 'output':
        this.processOutput(node, nodeId, outputBuffer);
        break;

      default:
        // Unknown node type - output silence
        outputBuffer.fill(0);
    }
  }

  /**
   * Processes an oscillator node.
   * 
   * @param {object} node - Oscillator node
   * @param {Float32Array} outputBuffer - Output buffer
   */
  processOscillator(node, outputBuffer) {
    const { state } = node;
    const phaseIncrement = (2 * Math.PI * state.frequency) / this.sampleRate;

    for (let i = 0; i < 128; i++) {
      switch (state.waveform) {
        case 'sine':
          outputBuffer[i] = Math.sin(state.phase);
          break;

        case 'square':
          outputBuffer[i] = state.phase < Math.PI ? 1 : -1;
          break;

        case 'sawtooth':
          outputBuffer[i] = (state.phase / Math.PI) - 1;
          break;

        case 'triangle':
          outputBuffer[i] = Math.abs((state.phase / Math.PI) - 1) * 2 - 1;
          break;

        default:
          outputBuffer[i] = 0;
      }

      state.phase += phaseIncrement;
      if (state.phase >= 2 * Math.PI) {
        state.phase -= 2 * Math.PI;
      }
    }
  }

  /**
   * Processes a gain node.
   * 
   * @param {object} node - Gain node
   * @param {number} nodeId - Node identifier
   * @param {Float32Array} outputBuffer - Output buffer
   */
  processGain(node, nodeId, outputBuffer) {
    const { state, inputs } = node;

    // Mix all inputs
    outputBuffer.fill(0);

    for (const input of inputs) {
      const inputBuffer = this.nodeOutputs.get(input.fromNodeId);
      if (inputBuffer) {
        for (let i = 0; i < 128; i++) {
          outputBuffer[i] += inputBuffer[i];
        }
      }
    }

    // Apply gain
    for (let i = 0; i < 128; i++) {
      outputBuffer[i] *= state.gain;
    }
  }

  /**
   * Processes a biquad filter node.
   * 
   * @param {object} node - Filter node
   * @param {number} nodeId - Node identifier
   * @param {Float32Array} outputBuffer - Output buffer
   */
  processFilter(node, nodeId, outputBuffer) {
    const { state, inputs } = node;

    // Get input (first input only)
    const inputBuffer = inputs.length > 0
      ? this.nodeOutputs.get(inputs[0].fromNodeId)
      : null;

    if (!inputBuffer) {
      outputBuffer.fill(0);
      return;
    }

    // Apply biquad filter
    for (let i = 0; i < 128; i++) {
      const x = inputBuffer[i];
      const y = state.b0 * x + state.b1 * state.x1 + state.b2 * state.x2
                - state.a1 * state.y1 - state.a2 * state.y2;

      state.x2 = state.x1;
      state.x1 = x;
      state.y2 = state.y1;
      state.y1 = y;

      outputBuffer[i] = y;
    }
  }

  /**
   * Processes a mixer node (sums all inputs).
   * 
   * @param {object} node - Mixer node
   * @param {number} nodeId - Node identifier
   * @param {Float32Array} outputBuffer - Output buffer
   */
  processMixer(node, nodeId, outputBuffer) {
    const { inputs } = node;

    outputBuffer.fill(0);

    for (const input of inputs) {
      const inputBuffer = this.nodeOutputs.get(input.fromNodeId);
      if (inputBuffer) {
        for (let i = 0; i < 128; i++) {
          outputBuffer[i] += inputBuffer[i];
        }
      }
    }
  }

  /**
   * Processes an output node (pass-through).
   * 
   * @param {object} node - Output node
   * @param {number} nodeId - Node identifier
   * @param {Float32Array} outputBuffer - Output buffer
   */
  processOutput(node, nodeId, outputBuffer) {
    const { inputs } = node;

    // Pass through first input
    if (inputs.length > 0) {
      const inputBuffer = this.nodeOutputs.get(inputs[0].fromNodeId);
      if (inputBuffer) {
        outputBuffer.set(inputBuffer);
        return;
      }
    }

    outputBuffer.fill(0);
  }
}

// Register processor
registerProcessor('audio-graph-processor', AudioGraphProcessor);