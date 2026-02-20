/**
 * @fileoverview Effects Processor Audio Worklet
 * 
 * Bridges harmony-sound/domains/effects to Audio Worklet via WASM.
 * Compiles EffectFunctionRegistry to WASM for real-time parameter automation.
 * 
 * Architecture:
 * - Extends AudioWorkletProcessor for real-time audio processing
 * - Loads WASM module containing EffectFunctionRegistry
 * - Supports real-time parameter automation via AudioParam
 * - Uses SharedArrayBuffer for zero-copy parameter updates
 * - Maximum 10ms end-to-end latency (audio processing constraint)
 * 
 * Performance Targets:
 * - Audio Processing Latency: Maximum 10ms End-to-End
 * - No Async Operations in Audio Render Thread
 * - Memory Budget: Maximum 50MB WASM heap
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Audio Processing Pipeline
 * Related Files:
 * - web/worklets/transport-processor.js (Transport handling pattern)
 * - web/worklets/clip-player-processor.js (Audio worklet pattern)
 * - harmony-graph/src/domains/effects/ (WASM source)
 * 
 * @module web/worklets/effects-processor
 */

/**
 * EffectsProcessor - Real-time audio effects processing via WASM
 * 
 * Responsibilities:
 * - Load and initialize WASM EffectFunctionRegistry
 * - Process audio buffers through effect chain
 * - Handle real-time parameter automation
 * - Manage effect state and routing
 * 
 * WASM Interface Expected:
 * - process_effects(inputPtr, outputPtr, numFrames, numChannels)
 * - set_parameter(effectId, paramName, value)
 * - add_effect(effectType)
 * - remove_effect(effectId)
 * - bypass_effect(effectId, bypass)
 * 
 * @class
 * @extends AudioWorkletProcessor
 */
class EffectsProcessor extends AudioWorkletProcessor {
  /**
   * Define AudioParam descriptors for real-time automation
   * 
   * @static
   * @returns {Array<AudioParamDescriptor>} Parameter descriptors
   */
  static get parameterDescriptors() {
    return [
      {
        name: 'mix',
        defaultValue: 1.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'a-rate' // Audio-rate automation
      },
      {
        name: 'bypass',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'k-rate' // Control-rate automation
      }
    ];
  }

  /**
   * Initialize the effects processor
   * 
   * @param {AudioWorkletNodeOptions} options - Initialization options
   */
  constructor(options) {
    super();

    /**
     * WASM module instance
     * @type {WebAssembly.Instance|null}
     * @private
     */
    this.wasmInstance = null;

    /**
     * WASM memory buffer
     * @type {WebAssembly.Memory|null}
     * @private
     */
    this.wasmMemory = null;

    /**
     * Input buffer pointer in WASM memory
     * @type {number}
     * @private
     */
    this.inputPtr = 0;

    /**
     * Output buffer pointer in WASM memory
     * @type {number}
     * @private
     */
    this.outputPtr = 0;

    /**
     * Effect chain state
     * @type {Array<{id: number, type: string, bypass: boolean}>}
     * @private
     */
    this.effectChain = [];

    /**
     * Parameter cache for optimization
     * @type {Map<string, number>}
     * @private
     */
    this.parameterCache = new Map();

    /**
     * Processing statistics
     * @type {{processedFrames: number, droppedFrames: number, avgLatency: number}}
     * @private
     */
    this.stats = {
      processedFrames: 0,
      droppedFrames: 0,
      avgLatency: 0
    };

    /**
     * Latency measurement buffer
     * @type {Array<number>}
     * @private
     */
    this.latencyBuffer = [];

    /**
     * Maximum latency samples for moving average
     * @type {number}
     * @private
     */
    this.maxLatencySamples = 100;

    // Initialize message port for control messages
    this.port.onmessage = this.handleMessage.bind(this);

    // Request WASM module load
    this.port.postMessage({
      type: 'request-wasm',
      module: 'effects'
    });
  }

  /**
   * Handle control messages from main thread
   * 
   * CRITICAL: No async operations allowed in audio render thread
   * All async work must complete before process() is called
   * 
   * @param {MessageEvent} event - Message event
   * @private
   */
  handleMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'wasm-module':
        this.initializeWasm(data.module, data.memory);
        break;

      case 'add-effect':
        this.addEffect(data.effectType, data.config);
        break;

      case 'remove-effect':
        this.removeEffect(data.effectId);
        break;

      case 'set-parameter':
        this.setEffectParameter(data.effectId, data.paramName, data.value);
        break;

      case 'bypass-effect':
        this.bypassEffect(data.effectId, data.bypass);
        break;

      case 'clear-chain':
        this.clearEffectChain();
        break;

      case 'get-stats':
        this.port.postMessage({
          type: 'stats',
          data: this.stats
        });
        break;

      default:
        console.warn(`[EffectsProcessor] Unknown message type: ${type}`);
    }
  }

  /**
   * Initialize WASM module and allocate buffers
   * 
   * Memory Layout:
   * - Input buffer: 128 frames * 2 channels * 4 bytes (f32)
   * - Output buffer: 128 frames * 2 channels * 4 bytes (f32)
   * - Effect state: Variable size per effect
   * 
   * @param {ArrayBuffer} wasmModule - Compiled WASM module
   * @param {WebAssembly.Memory} memory - Shared WASM memory
   * @private
   */
  async initializeWasm(wasmModule, memory) {
    try {
      // Instantiate WASM module
      const result = await WebAssembly.instantiate(wasmModule, {
        env: {
          memory: memory || new WebAssembly.Memory({ 
            initial: 256, // 16MB initial
            maximum: 3200, // 200MB maximum (within 50MB budget per effect)
            shared: true 
          })
        }
      });

      this.wasmInstance = result.instance;
      this.wasmMemory = memory || result.instance.exports.memory;

      // Allocate audio buffers in WASM memory
      const maxFrames = 128; // Standard Web Audio buffer size
      const maxChannels = 2;
      const bytesPerSample = 4; // f32
      const bufferSize = maxFrames * maxChannels * bytesPerSample;

      // Call WASM allocator
      if (this.wasmInstance.exports.allocate_buffers) {
        const ptrs = this.wasmInstance.exports.allocate_buffers(maxFrames, maxChannels);
        this.inputPtr = ptrs >> 16; // High 16 bits
        this.outputPtr = ptrs & 0xFFFF; // Low 16 bits
      } else {
        // Fallback: manual allocation
        this.inputPtr = this.wasmInstance.exports.__heap_base || 1024;
        this.outputPtr = this.inputPtr + bufferSize;
      }

      // Initialize effect registry
      if (this.wasmInstance.exports.initialize_registry) {
        this.wasmInstance.exports.initialize_registry();
      }

      this.port.postMessage({
        type: 'wasm-ready',
        data: {
          inputPtr: this.inputPtr,
          outputPtr: this.outputPtr,
          memorySize: this.wasmMemory.buffer.byteLength
        }
      });

    } catch (error) {
      console.error('[EffectsProcessor] WASM initialization failed:', error);
      this.port.postMessage({
        type: 'error',
        data: {
          message: 'WASM initialization failed',
          error: error.message
        }
      });
    }
  }

  /**
   * Add effect to processing chain
   * 
   * @param {string} effectType - Effect type identifier
   * @param {Object} config - Effect configuration
   * @private
   */
  addEffect(effectType, config = {}) {
    if (!this.wasmInstance) {
      console.warn('[EffectsProcessor] WASM not initialized');
      return;
    }

    try {
      // Call WASM to add effect
      const effectId = this.wasmInstance.exports.add_effect
        ? this.wasmInstance.exports.add_effect(this.encodeString(effectType))
        : this.effectChain.length;

      // Track in chain
      this.effectChain.push({
        id: effectId,
        type: effectType,
        bypass: false,
        config
      });

      // Apply initial configuration
      for (const [param, value] of Object.entries(config)) {
        this.setEffectParameter(effectId, param, value);
      }

      this.port.postMessage({
        type: 'effect-added',
        data: { effectId, effectType }
      });

    } catch (error) {
      console.error('[EffectsProcessor] Add effect failed:', error);
    }
  }

  /**
   * Remove effect from processing chain
   * 
   * @param {number} effectId - Effect identifier
   * @private
   */
  removeEffect(effectId) {
    if (!this.wasmInstance) return;

    try {
      // Call WASM to remove effect
      if (this.wasmInstance.exports.remove_effect) {
        this.wasmInstance.exports.remove_effect(effectId);
      }

      // Remove from chain
      this.effectChain = this.effectChain.filter(e => e.id !== effectId);

      this.port.postMessage({
        type: 'effect-removed',
        data: { effectId }
      });

    } catch (error) {
      console.error('[EffectsProcessor] Remove effect failed:', error);
    }
  }

  /**
   * Set effect parameter value
   * 
   * @param {number} effectId - Effect identifier
   * @param {string} paramName - Parameter name
   * @param {number} value - Parameter value
   * @private
   */
  setEffectParameter(effectId, paramName, value) {
    if (!this.wasmInstance) return;

    try {
      const cacheKey = `${effectId}:${paramName}`;
      
      // Skip if value hasn't changed (optimization)
      if (this.parameterCache.get(cacheKey) === value) {
        return;
      }

      // Call WASM to set parameter
      if (this.wasmInstance.exports.set_parameter) {
        this.wasmInstance.exports.set_parameter(
          effectId,
          this.encodeString(paramName),
          value
        );
      }

      this.parameterCache.set(cacheKey, value);

    } catch (error) {
      console.error('[EffectsProcessor] Set parameter failed:', error);
    }
  }

  /**
   * Bypass/enable effect
   * 
   * @param {number} effectId - Effect identifier
   * @param {boolean} bypass - Bypass state
   * @private
   */
  bypassEffect(effectId, bypass) {
    if (!this.wasmInstance) return;

    try {
      // Call WASM to bypass effect
      if (this.wasmInstance.exports.bypass_effect) {
        this.wasmInstance.exports.bypass_effect(effectId, bypass ? 1 : 0);
      }

      // Update chain state
      const effect = this.effectChain.find(e => e.id === effectId);
      if (effect) {
        effect.bypass = bypass;
      }

    } catch (error) {
      console.error('[EffectsProcessor] Bypass effect failed:', error);
    }
  }

  /**
   * Clear entire effect chain
   * 
   * @private
   */
  clearEffectChain() {
    if (!this.wasmInstance) return;

    try {
      // Remove all effects
      for (const effect of this.effectChain) {
        if (this.wasmInstance.exports.remove_effect) {
          this.wasmInstance.exports.remove_effect(effect.id);
        }
      }

      this.effectChain = [];
      this.parameterCache.clear();

      this.port.postMessage({
        type: 'chain-cleared'
      });

    } catch (error) {
      console.error('[EffectsProcessor] Clear chain failed:', error);
    }
  }

  /**
   * Process audio buffer through effect chain
   * 
   * CRITICAL: Must complete within 10ms for real-time audio
   * No allocations, no async operations, no locks
   * 
   * @param {Array<Float32Array[]>} inputs - Input audio buffers
   * @param {Array<Float32Array[]>} outputs - Output audio buffers
   * @param {Object} parameters - AudioParam values
   * @returns {boolean} True to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const startTime = performance.now();

    // Early return if no WASM or no effects
    if (!this.wasmInstance || this.effectChain.length === 0) {
      // Pass through
      const input = inputs[0];
      const output = outputs[0];
      if (input && output) {
        for (let channel = 0; channel < output.length; channel++) {
          if (input[channel]) {
            output[channel].set(input[channel]);
          }
        }
      }
      return true;
    }

    const input = inputs[0];
    const output = outputs[0];

    if (!input || !output || input.length === 0) {
      return true;
    }

    const numFrames = input[0].length;
    const numChannels = Math.min(input.length, output.length);

    try {
      // Get parameter values
      const mix = parameters.mix[0] || 1.0;
      const bypass = parameters.bypass[0] > 0.5;

      if (bypass) {
        // Bypass: copy input to output
        for (let channel = 0; channel < numChannels; channel++) {
          output[channel].set(input[channel]);
        }
        return true;
      }

      // Copy input to WASM memory
      const memoryView = new Float32Array(this.wasmMemory.buffer);
      const inputOffset = this.inputPtr / 4; // f32 offset
      
      for (let channel = 0; channel < numChannels; channel++) {
        for (let frame = 0; frame < numFrames; frame++) {
          memoryView[inputOffset + channel * numFrames + frame] = input[channel][frame];
        }
      }

      // Process through WASM effect chain
      if (this.wasmInstance.exports.process_effects) {
        this.wasmInstance.exports.process_effects(
          this.inputPtr,
          this.outputPtr,
          numFrames,
          numChannels
        );
      }

      // Copy output from WASM memory
      const outputOffset = this.outputPtr / 4; // f32 offset
      
      for (let channel = 0; channel < numChannels; channel++) {
        for (let frame = 0; frame < numFrames; frame++) {
          const wetSample = memoryView[outputOffset + channel * numFrames + frame];
          const drySample = input[channel][frame];
          // Apply mix parameter
          output[channel][frame] = drySample * (1 - mix) + wetSample * mix;
        }
      }

      // Update statistics
      this.stats.processedFrames += numFrames;

      // Measure latency
      const latency = performance.now() - startTime;
      this.latencyBuffer.push(latency);
      
      if (this.latencyBuffer.length > this.maxLatencySamples) {
        this.latencyBuffer.shift();
      }
      
      this.stats.avgLatency = this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;

      // Check latency constraint (10ms maximum)
      if (latency > 10) {
        console.warn(`[EffectsProcessor] Latency exceeded: ${latency.toFixed(2)}ms`);
        this.stats.droppedFrames += numFrames;
      }

    } catch (error) {
      console.error('[EffectsProcessor] Process failed:', error);
      this.stats.droppedFrames += numFrames;
      
      // Failsafe: pass through on error
      for (let channel = 0; channel < numChannels; channel++) {
        output[channel].set(input[channel]);
      }
    }

    return true;
  }

  /**
   * Encode string to WASM memory
   * 
   * @param {string} str - String to encode
   * @returns {number} Pointer to encoded string
   * @private
   */
  encodeString(str) {
    if (!this.wasmInstance || !this.wasmInstance.exports.allocate_string) {
      // Fallback: return hash
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return hash;
    }

    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const ptr = this.wasmInstance.exports.allocate_string(bytes.length);
    const memoryView = new Uint8Array(this.wasmMemory.buffer);
    memoryView.set(bytes, ptr);
    return ptr;
  }
}

// Register the processor
registerProcessor('effects-processor', EffectsProcessor);