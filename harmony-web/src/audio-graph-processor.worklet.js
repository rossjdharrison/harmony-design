/**
 * @fileoverview AudioGraphProcessor - AudioWorkletProcessor implementation
 * Processes harmony-sound graph topology with dependency wave execution.
 * 
 * @module harmony-web/audio-graph-processor
 * @see DESIGN_SYSTEM.md#audio-graph-processing
 * 
 * CRITICAL CONSTRAINTS:
 * - No async operations in process() (Policy #30)
 * - Maximum 10ms end-to-end latency (Policy #5)
 * - Uses SharedArrayBuffer for data transfer (Policy #26)
 * - Supports both WebGPU and WASM implementations (Policy #25)
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} id - Unique node identifier
 * @property {string} type - Node type (oscillator, filter, gain, etc.)
 * @property {Object<string, number>} params - Node parameters
 * @property {string[]} inputs - Input node IDs
 * @property {string[]} outputs - Output node IDs
 * @property {number} wave - Dependency wave index for execution order
 */

/**
 * @typedef {Object} GraphTopology
 * @property {Map<string, GraphNode>} nodes - Node map by ID
 * @property {number} maxWave - Maximum wave index
 * @property {Map<number, string[]>} waveGroups - Nodes grouped by wave
 */

/**
 * AudioGraphProcessor - Processes audio graph with topological execution.
 * Extends AudioWorkletProcessor to handle custom graph-based audio processing.
 * 
 * Execution model:
 * 1. Nodes are organized into dependency waves
 * 2. Each wave executes in parallel (no dependencies within wave)
 * 3. Waves execute sequentially (wave N+1 depends on wave N)
 * 4. Per process() call, all waves execute once
 * 
 * @extends AudioWorkletProcessor
 */
class AudioGraphProcessor extends AudioWorkletProcessor {
  /**
   * @param {AudioWorkletNodeOptions} options
   */
  constructor(options) {
    super();
    
    /**
     * Graph topology with dependency waves
     * @type {GraphTopology}
     * @private
     */
    this._topology = {
      nodes: new Map(),
      maxWave: 0,
      waveGroups: new Map()
    };
    
    /**
     * Node output buffers (128 samples per quantum)
     * @type {Map<string, Float32Array>}
     * @private
     */
    this._nodeBuffers = new Map();
    
    /**
     * Quantum size (fixed by Web Audio API)
     * @type {number}
     * @private
     */
    this._quantumSize = 128;
    
    /**
     * SharedArrayBuffer for GPU data transfer
     * @type {SharedArrayBuffer|null}
     * @private
     */
    this._sharedBuffer = null;
    
    /**
     * Processing mode: 'wasm' or 'gpu'
     * @type {string}
     * @private
     */
    this._processingMode = 'wasm';
    
    /**
     * Performance tracking
     * @type {Object}
     * @private
     */
    this._perfStats = {
      processCount: 0,
      totalTime: 0,
      maxTime: 0,
      waveTimings: new Map()
    };
    
    // Listen for graph updates from main thread
    this.port.onmessage = this._handleMessage.bind(this);
    
    // Initialize with options if provided
    if (options.processorOptions) {
      this._initializeFromOptions(options.processorOptions);
    }
  }
  
  /**
   * AudioWorkletProcessor descriptor for parameter automation
   * @returns {Object}
   */
  static get parameterDescriptors() {
    return [
      {
        name: 'masterGain',
        defaultValue: 1.0,
        minValue: 0.0,
        maxValue: 2.0,
        automationRate: 'a-rate'
      }
    ];
  }
  
  /**
   * Initialize processor from options
   * @param {Object} options
   * @private
   */
  _initializeFromOptions(options) {
    if (options.sharedBuffer) {
      this._sharedBuffer = options.sharedBuffer;
    }
    
    if (options.processingMode) {
      this._processingMode = options.processingMode;
    }
    
    if (options.topology) {
      this._updateTopology(options.topology);
    }
  }
  
  /**
   * Handle messages from main thread
   * @param {MessageEvent} event
   * @private
   */
  _handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'updateTopology':
        this._updateTopology(data);
        this.port.postMessage({ type: 'topologyUpdated', success: true });
        break;
        
      case 'setProcessingMode':
        this._processingMode = data.mode;
        this.port.postMessage({ type: 'processingModeSet', mode: data.mode });
        break;
        
      case 'getStats':
        this.port.postMessage({ 
          type: 'stats', 
          data: this._getStats() 
        });
        break;
        
      case 'reset':
        this._reset();
        this.port.postMessage({ type: 'resetComplete' });
        break;
        
      default:
        console.warn(`[AudioGraphProcessor] Unknown message type: ${type}`);
    }
  }
  
  /**
   * Update graph topology with new node configuration
   * @param {Object} topologyData - Raw topology data
   * @private
   */
  _updateTopology(topologyData) {
    const nodes = new Map();
    const waveGroups = new Map();
    let maxWave = 0;
    
    // Parse nodes and organize by wave
    for (const [id, nodeData] of Object.entries(topologyData.nodes || {})) {
      const node = {
        id,
        type: nodeData.type,
        params: nodeData.params || {},
        inputs: nodeData.inputs || [],
        outputs: nodeData.outputs || [],
        wave: nodeData.wave || 0
      };
      
      nodes.set(id, node);
      
      // Group by wave
      if (!waveGroups.has(node.wave)) {
        waveGroups.set(node.wave, []);
      }
      waveGroups.get(node.wave).push(id);
      
      maxWave = Math.max(maxWave, node.wave);
      
      // Allocate buffer for this node
      if (!this._nodeBuffers.has(id)) {
        this._nodeBuffers.set(id, new Float32Array(this._quantumSize));
      }
    }
    
    this._topology = { nodes, maxWave, waveGroups };
  }
  
  /**
   * Main processing function called by Web Audio API
   * Executes dependency waves sequentially, nodes within wave in parallel
   * 
   * @param {Float32Array[][]} inputs - Input buffers
   * @param {Float32Array[][]} outputs - Output buffers
   * @param {Object} parameters - Automated parameters
   * @returns {boolean} - true to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const startTime = currentTime;
    
    // Early exit if no topology
    if (this._topology.nodes.size === 0) {
      // Pass through silence
      for (let channel = 0; channel < outputs[0].length; channel++) {
        outputs[0][channel].fill(0);
      }
      return true;
    }
    
    // Clear all node buffers
    for (const buffer of this._nodeBuffers.values()) {
      buffer.fill(0);
    }
    
    // Execute waves sequentially
    for (let wave = 0; wave <= this._topology.maxWave; wave++) {
      const waveStartTime = currentTime;
      
      const nodeIds = this._topology.waveGroups.get(wave);
      if (!nodeIds) continue;
      
      // Process all nodes in this wave
      // Note: In true parallel execution, these would run concurrently
      // For now, we execute sequentially but maintain wave semantics
      for (const nodeId of nodeIds) {
        this._processNode(nodeId, inputs, parameters);
      }
      
      // Track wave timing
      const waveTime = currentTime - waveStartTime;
      if (!this._perfStats.waveTimings.has(wave)) {
        this._perfStats.waveTimings.set(wave, { total: 0, count: 0, max: 0 });
      }
      const waveStats = this._perfStats.waveTimings.get(wave);
      waveStats.total += waveTime;
      waveStats.count++;
      waveStats.max = Math.max(waveStats.max, waveTime);
    }
    
    // Mix final output from terminal nodes
    this._mixOutput(outputs, parameters);
    
    // Update performance stats
    const totalTime = currentTime - startTime;
    this._perfStats.processCount++;
    this._perfStats.totalTime += totalTime;
    this._perfStats.maxTime = Math.max(this._perfStats.maxTime, totalTime);
    
    // Warn if exceeding latency budget (10ms = 10000 microseconds)
    if (totalTime > 10000) {
      console.warn(
        `[AudioGraphProcessor] Process time exceeded 10ms budget: ${totalTime.toFixed(2)}μs`
      );
    }
    
    return true;
  }
  
  /**
   * Process a single node
   * @param {string} nodeId
   * @param {Float32Array[][]} inputs
   * @param {Object} parameters
   * @private
   */
  _processNode(nodeId, inputs, parameters) {
    const node = this._topology.nodes.get(nodeId);
    if (!node) return;
    
    const outputBuffer = this._nodeBuffers.get(nodeId);
    
    // Collect input buffers
    const inputBuffers = node.inputs.map(inputId => 
      this._nodeBuffers.get(inputId) || new Float32Array(this._quantumSize)
    );
    
    // Route to appropriate processor based on node type
    switch (node.type) {
      case 'oscillator':
        this._processOscillator(node, outputBuffer);
        break;
        
      case 'gain':
        this._processGain(node, inputBuffers, outputBuffer);
        break;
        
      case 'filter':
        this._processFilter(node, inputBuffers, outputBuffer);
        break;
        
      case 'mix':
        this._processMix(node, inputBuffers, outputBuffer);
        break;
        
      case 'input':
        this._processInput(node, inputs, outputBuffer);
        break;
        
      default:
        console.warn(`[AudioGraphProcessor] Unknown node type: ${node.type}`);
    }
  }
  
  /**
   * Process oscillator node
   * @param {GraphNode} node
   * @param {Float32Array} output
   * @private
   */
  _processOscillator(node, output) {
    const freq = node.params.frequency || 440;
    const amp = node.params.amplitude || 1.0;
    const phase = node.params.phase || 0;
    const type = node.params.waveform || 'sine';
    
    const phaseIncrement = (2 * Math.PI * freq) / sampleRate;
    
    for (let i = 0; i < this._quantumSize; i++) {
      const currentPhase = phase + (i * phaseIncrement);
      
      switch (type) {
        case 'sine':
          output[i] = amp * Math.sin(currentPhase);
          break;
        case 'square':
          output[i] = amp * (Math.sin(currentPhase) >= 0 ? 1 : -1);
          break;
        case 'sawtooth':
          output[i] = amp * (2 * ((currentPhase / (2 * Math.PI)) % 1) - 1);
          break;
        case 'triangle':
          const t = (currentPhase / (2 * Math.PI)) % 1;
          output[i] = amp * (4 * Math.abs(t - 0.5) - 1);
          break;
        default:
          output[i] = 0;
      }
    }
    
    // Update phase for next quantum
    node.params.phase = (phase + this._quantumSize * phaseIncrement) % (2 * Math.PI);
  }
  
  /**
   * Process gain node
   * @param {GraphNode} node
   * @param {Float32Array[]} inputs
   * @param {Float32Array} output
   * @private
   */
  _processGain(node, inputs, output) {
    const gain = node.params.gain || 1.0;
    
    if (inputs.length === 0) {
      output.fill(0);
      return;
    }
    
    const input = inputs[0];
    for (let i = 0; i < this._quantumSize; i++) {
      output[i] = input[i] * gain;
    }
  }
  
  /**
   * Process filter node (simple one-pole lowpass for now)
   * @param {GraphNode} node
   * @param {Float32Array[]} inputs
   * @param {Float32Array} output
   * @private
   */
  _processFilter(node, inputs, output) {
    if (inputs.length === 0) {
      output.fill(0);
      return;
    }
    
    const input = inputs[0];
    const cutoff = node.params.cutoff || 1000;
    
    // Simple one-pole lowpass coefficient
    const rc = 1.0 / (2 * Math.PI * cutoff);
    const dt = 1.0 / sampleRate;
    const alpha = dt / (rc + dt);
    
    let prev = node.params._filterState || 0;
    
    for (let i = 0; i < this._quantumSize; i++) {
      prev = prev + alpha * (input[i] - prev);
      output[i] = prev;
    }
    
    node.params._filterState = prev;
  }
  
  /**
   * Process mix node (sum inputs)
   * @param {GraphNode} node
   * @param {Float32Array[]} inputs
   * @param {Float32Array} output
   * @private
   */
  _processMix(node, inputs, output) {
    output.fill(0);
    
    for (const input of inputs) {
      for (let i = 0; i < this._quantumSize; i++) {
        output[i] += input[i];
      }
    }
  }
  
  /**
   * Process input node (copy from AudioWorklet input)
   * @param {GraphNode} node
   * @param {Float32Array[][]} inputs
   * @param {Float32Array} output
   * @private
   */
  _processInput(node, inputs, output) {
    const channel = node.params.channel || 0;
    
    if (inputs.length > 0 && inputs[0].length > channel) {
      output.set(inputs[0][channel]);
    } else {
      output.fill(0);
    }
  }
  
  /**
   * Mix final output from terminal nodes (nodes with no outputs)
   * @param {Float32Array[][]} outputs
   * @param {Object} parameters
   * @private
   */
  _mixOutput(outputs, parameters) {
    const masterGain = parameters.masterGain;
    const outputChannel = outputs[0][0];
    
    if (!outputChannel) return;
    
    outputChannel.fill(0);
    
    // Find terminal nodes (no outputs)
    for (const [nodeId, node] of this._topology.nodes) {
      if (node.outputs.length === 0) {
        const nodeBuffer = this._nodeBuffers.get(nodeId);
        
        for (let i = 0; i < this._quantumSize; i++) {
          const gain = masterGain.length > 1 ? masterGain[i] : masterGain[0];
          outputChannel[i] += nodeBuffer[i] * gain;
        }
      }
    }
    
    // Copy to other channels if present
    for (let ch = 1; ch < outputs[0].length; ch++) {
      outputs[0][ch].set(outputChannel);
    }
  }
  
  /**
   * Reset processor state
   * @private
   */
  _reset() {
    for (const buffer of this._nodeBuffers.values()) {
      buffer.fill(0);
    }
    
    // Reset node state
    for (const node of this._topology.nodes.values()) {
      node.params.phase = 0;
      delete node.params._filterState;
    }
    
    this._perfStats = {
      processCount: 0,
      totalTime: 0,
      maxTime: 0,
      waveTimings: new Map()
    };
  }
  
  /**
   * Get performance statistics
   * @returns {Object}
   * @private
   */
  _getStats() {
    const avgTime = this._perfStats.processCount > 0
      ? this._perfStats.totalTime / this._perfStats.processCount
      : 0;
    
    const waveStats = {};
    for (const [wave, stats] of this._perfStats.waveTimings) {
      waveStats[wave] = {
        avg: stats.count > 0 ? stats.total / stats.count : 0,
        max: stats.max
      };
    }
    
    return {
      processCount: this._perfStats.processCount,
      avgProcessTime: avgTime,
      maxProcessTime: this._perfStats.maxTime,
      waveStats,
      nodeCount: this._topology.nodes.size,
      maxWave: this._topology.maxWave
    };
  }
}

// Register the processor
registerProcessor('audio-graph-processor', AudioGraphProcessor);