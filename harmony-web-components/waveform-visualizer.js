/**
 * @fileoverview Waveform visualization Web Component using WebGPU compute shaders
 * for peak reduction with multi-resolution cache system.
 * 
 * Integrates with harmony-sound analysis output format.
 * Publishes events via EventBus, never calls BCs directly.
 * 
 * @see DESIGN_SYSTEM.md#waveform-visualization
 */

import { EventBus } from '../core/event-bus.js';

/**
 * Waveform visualizer Web Component with WebGPU acceleration.
 * Displays audio waveform with multi-resolution rendering.
 * 
 * @element harmony-waveform-visualizer
 * 
 * @attr {string} audio-id - ID of the audio clip to visualize
 * @attr {number} width - Canvas width in pixels (default: 800)
 * @attr {number} height - Canvas height in pixels (default: 200)
 * @attr {string} color - Waveform color (default: #3b82f6)
 * @attr {string} background - Background color (default: #1e293b)
 * 
 * @fires waveform-loaded - When waveform data is loaded and cached
 * @fires waveform-error - When an error occurs during rendering
 * @fires waveform-click - When user clicks on waveform (includes time position)
 * 
 * @example
 * <harmony-waveform-visualizer 
 *   audio-id="clip-123"
 *   width="1000"
 *   height="150"
 *   color="#10b981">
 * </harmony-waveform-visualizer>
 */
class HarmonyWaveformVisualizer extends HTMLElement {
  /** @type {EventBus} */
  #eventBus;
  
  /** @type {GPUDevice | null} */
  #device = null;
  
  /** @type {HTMLCanvasElement} */
  #canvas;
  
  /** @type {GPUCanvasContext} */
  #context;
  
  /** @type {WaveformCache} */
  #cache;
  
  /** @type {GPUComputePipeline | null} */
  #peakReductionPipeline = null;
  
  /** @type {GPURenderPipeline | null} */
  #renderPipeline = null;
  
  /** @type {string | null} */
  #currentAudioId = null;
  
  /** @type {Float32Array | null} */
  #audioData = null;
  
  /** @type {number} */
  #sampleRate = 48000;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#eventBus = EventBus.getInstance();
    this.#cache = new WaveformCache();
  }

  static get observedAttributes() {
    return ['audio-id', 'width', 'height', 'color', 'background'];
  }

  async connectedCallback() {
    this.#render();
    await this.#initWebGPU();
    this.#setupEventListeners();
    
    const audioId = this.getAttribute('audio-id');
    if (audioId) {
      await this.#loadWaveform(audioId);
    }
  }

  disconnectedCallback() {
    this.#cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'audio-id':
        this.#loadWaveform(newValue);
        break;
      case 'width':
      case 'height':
        this.#resizeCanvas();
        this.#renderWaveform();
        break;
      case 'color':
      case 'background':
        this.#renderWaveform();
        break;
    }
  }

  /**
   * Renders the component's shadow DOM structure.
   * @private
   */
  #render() {
    const width = parseInt(this.getAttribute('width') || '800', 10);
    const height = parseInt(this.getAttribute('height') || '200', 10);
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        .waveform-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          cursor: crosshair;
        }
        
        .loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #94a3b8;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
        }
        
        .error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #ef4444;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          text-align: center;
        }
      </style>
      
      <div class="waveform-container">
        <canvas width="${width}" height="${height}"></canvas>
        <div class="loading" hidden>Loading waveform...</div>
        <div class="error" hidden></div>
      </div>
    `;
    
    this.#canvas = this.shadowRoot.querySelector('canvas');
  }

  /**
   * Initializes WebGPU device and context.
   * Falls back to Canvas 2D if WebGPU is unavailable.
   * @private
   * @returns {Promise<void>}
   */
  async #initWebGPU() {
    if (!navigator.gpu) {
      console.warn('WebGPU not available, falling back to Canvas 2D');
      this.#context = this.#canvas.getContext('2d');
      return;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error('No GPU adapter available');
      }

      this.#device = await adapter.requestDevice();
      this.#context = this.#canvas.getContext('webgpu');
      
      const format = navigator.gpu.getPreferredCanvasFormat();
      this.#context.configure({
        device: this.#device,
        format,
        alphaMode: 'premultiplied',
      });

      await this.#createPipelines();
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      this.#context = this.#canvas.getContext('2d');
    }
  }

  /**
   * Creates WebGPU compute and render pipelines.
   * @private
   * @returns {Promise<void>}
   */
  async #createPipelines() {
    if (!this.#device) return;

    // Peak reduction compute shader
    const peakReductionShader = `
      struct PeakData {
        min: f32,
        max: f32,
      }
      
      @group(0) @binding(0) var<storage, read> inputData: array<f32>;
      @group(0) @binding(1) var<storage, read_write> outputPeaks: array<PeakData>;
      @group(0) @binding(2) var<uniform> params: vec4<u32>; // inputLength, outputLength, samplesPerPeak, padding
      
      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let peakIndex = global_id.x;
        let outputLength = params.y;
        
        if (peakIndex >= outputLength) {
          return;
        }
        
        let samplesPerPeak = params.z;
        let startSample = peakIndex * samplesPerPeak;
        let endSample = min(startSample + samplesPerPeak, params.x);
        
        var minVal = 1.0;
        var maxVal = -1.0;
        
        for (var i = startSample; i < endSample; i = i + 1u) {
          let sample = inputData[i];
          minVal = min(minVal, sample);
          maxVal = max(maxVal, sample);
        }
        
        outputPeaks[peakIndex].min = minVal;
        outputPeaks[peakIndex].max = maxVal;
      }
    `;

    const peakReductionModule = this.#device.createShaderModule({
      code: peakReductionShader,
    });

    this.#peakReductionPipeline = this.#device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: peakReductionModule,
        entryPoint: 'main',
      },
    });

    // Render pipeline for drawing waveform
    const vertexShader = `
      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec4<f32>,
      }
      
      @group(0) @binding(0) var<uniform> resolution: vec2<f32>;
      @group(0) @binding(1) var<uniform> waveformColor: vec4<f32>;
      
      @vertex
      fn main(@location(0) position: vec2<f32>) -> VertexOutput {
        var output: VertexOutput;
        let clipSpace = (position / resolution) * 2.0 - 1.0;
        output.position = vec4<f32>(clipSpace.x, -clipSpace.y, 0.0, 1.0);
        output.color = waveformColor;
        return output;
      }
    `;

    const fragmentShader = `
      @fragment
      fn main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
        return color;
      }
    `;

    const vertexModule = this.#device.createShaderModule({ code: vertexShader });
    const fragmentModule = this.#device.createShaderModule({ code: fragmentShader });

    this.#renderPipeline = this.#device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: vertexModule,
        entryPoint: 'main',
        buffers: [{
          arrayStride: 8,
          attributes: [{
            shaderLocation: 0,
            offset: 0,
            format: 'float32x2',
          }],
        }],
      },
      fragment: {
        module: fragmentModule,
        entryPoint: 'main',
        targets: [{
          format: navigator.gpu.getPreferredCanvasFormat(),
        }],
      },
      primitive: {
        topology: 'triangle-strip',
      },
    });
  }

  /**
   * Sets up event listeners for user interaction.
   * @private
   */
  #setupEventListeners() {
    this.#canvas.addEventListener('click', (event) => {
      const rect = this.#canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const normalizedX = x / rect.width;
      
      if (this.#audioData) {
        const duration = this.#audioData.length / this.#sampleRate;
        const time = normalizedX * duration;
        
        this.#eventBus.publish({
          type: 'waveform-click',
          source: 'harmony-waveform-visualizer',
          payload: {
            audioId: this.#currentAudioId,
            time,
            normalizedPosition: normalizedX,
          },
        });
      }
    });
  }

  /**
   * Loads waveform data for the specified audio ID.
   * @private
   * @param {string} audioId - Audio clip identifier
   * @returns {Promise<void>}
   */
  async #loadWaveform(audioId) {
    if (!audioId) return;
    
    this.#currentAudioId = audioId;
    this.#showLoading(true);
    
    try {
      // Check cache first
      const cached = this.#cache.get(audioId, this.#canvas.width);
      if (cached) {
        this.#audioData = cached.audioData;
        this.#sampleRate = cached.sampleRate;
        await this.#renderWaveform();
        this.#showLoading(false);
        return;
      }
      
      // Request audio analysis from harmony-sound via EventBus
      const response = await this.#requestAudioAnalysis(audioId);
      
      if (response && response.audioData) {
        this.#audioData = response.audioData;
        this.#sampleRate = response.sampleRate || 48000;
        
        // Cache the data
        this.#cache.set(audioId, this.#canvas.width, {
          audioData: this.#audioData,
          sampleRate: this.#sampleRate,
        });
        
        await this.#renderWaveform();
        
        this.#eventBus.publish({
          type: 'waveform-loaded',
          source: 'harmony-waveform-visualizer',
          payload: {
            audioId,
            duration: this.#audioData.length / this.#sampleRate,
            sampleRate: this.#sampleRate,
          },
        });
      } else {
        throw new Error('No audio data received');
      }
      
      this.#showLoading(false);
    } catch (error) {
      console.error('Failed to load waveform:', error);
      this.#showError(error.message);
      
      this.#eventBus.publish({
        type: 'waveform-error',
        source: 'harmony-waveform-visualizer',
        payload: {
          audioId,
          error: error.message,
        },
      });
    }
  }

  /**
   * Requests audio analysis data via EventBus.
   * @private
   * @param {string} audioId - Audio clip identifier
   * @returns {Promise<{audioData: Float32Array, sampleRate: number}>}
   */
  async #requestAudioAnalysis(audioId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Audio analysis request timeout'));
      }, 5000);
      
      const unsubscribe = this.#eventBus.subscribe(
        'audio-analysis-response',
        (event) => {
          if (event.payload.audioId === audioId) {
            clearTimeout(timeout);
            unsubscribe();
            resolve(event.payload);
          }
        }
      );
      
      this.#eventBus.publish({
        type: 'audio-analysis-request',
        source: 'harmony-waveform-visualizer',
        payload: { audioId },
      });
    });
  }

  /**
   * Renders the waveform using WebGPU or Canvas 2D fallback.
   * @private
   * @returns {Promise<void>}
   */
  async #renderWaveform() {
    if (!this.#audioData) return;
    
    if (this.#device && this.#peakReductionPipeline) {
      await this.#renderWithWebGPU();
    } else {
      this.#renderWithCanvas2D();
    }
  }

  /**
   * Renders waveform using WebGPU compute shaders for peak reduction.
   * @private
   * @returns {Promise<void>}
   */
  async #renderWithWebGPU() {
    const startTime = performance.now();
    
    const width = this.#canvas.width;
    const height = this.#canvas.height;
    const pixelsPerPeak = 2; // 2 pixels per peak for better quality
    const peakCount = Math.floor(width / pixelsPerPeak);
    const samplesPerPeak = Math.ceil(this.#audioData.length / peakCount);
    
    // Create buffers
    const inputBuffer = this.#device.createBuffer({
      size: this.#audioData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    this.#device.queue.writeBuffer(inputBuffer, 0, this.#audioData);
    
    const peakDataSize = peakCount * 8; // 2 floats per peak (min, max)
    const outputBuffer = this.#device.createBuffer({
      size: peakDataSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    
    const paramsData = new Uint32Array([
      this.#audioData.length,
      peakCount,
      samplesPerPeak,
      0, // padding
    ]);
    
    const paramsBuffer = this.#device.createBuffer({
      size: paramsData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    this.#device.queue.writeBuffer(paramsBuffer, 0, paramsData);
    
    // Create bind group
    const bindGroup = this.#device.createBindGroup({
      layout: this.#peakReductionPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    });
    
    // Run compute shader
    const commandEncoder = this.#device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.#peakReductionPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(peakCount / 256));
    passEncoder.end();
    
    // Copy results to readable buffer
    const readBuffer = this.#device.createBuffer({
      size: peakDataSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, peakDataSize);
    this.#device.queue.submit([commandEncoder.finish()]);
    
    // Read peak data
    await readBuffer.mapAsync(GPUMapMode.READ);
    const peakData = new Float32Array(readBuffer.getMappedRange());
    
    // Draw using Canvas 2D for simplicity (could use WebGPU render pipeline)
    const ctx = this.#canvas.getContext('2d');
    const bgColor = this.getAttribute('background') || '#1e293b';
    const fgColor = this.getAttribute('color') || '#3b82f6';
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = fgColor;
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = 1;
    
    const centerY = height / 2;
    const scale = height / 2;
    
    for (let i = 0; i < peakCount; i++) {
      const min = peakData[i * 2];
      const max = peakData[i * 2 + 1];
      const x = (i / peakCount) * width;
      const yMin = centerY - (min * scale);
      const yMax = centerY - (max * scale);
      
      ctx.fillRect(x, yMax, pixelsPerPeak, yMin - yMax);
    }
    
    readBuffer.unmap();
    
    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    paramsBuffer.destroy();
    readBuffer.destroy();
    
    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`Waveform render exceeded 16ms budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Renders waveform using Canvas 2D (fallback).
   * @private
   */
  #renderWithCanvas2D() {
    const ctx = this.#context;
    const width = this.#canvas.width;
    const height = this.#canvas.height;
    
    const bgColor = this.getAttribute('background') || '#1e293b';
    const fgColor = this.getAttribute('color') || '#3b82f6';
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = fgColor;
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = 1;
    
    const centerY = height / 2;
    const scale = height / 2;
    const samplesPerPixel = Math.ceil(this.#audioData.length / width);
    
    for (let x = 0; x < width; x++) {
      const startSample = x * samplesPerPixel;
      const endSample = Math.min(startSample + samplesPerPixel, this.#audioData.length);
      
      let min = 1.0;
      let max = -1.0;
      
      for (let i = startSample; i < endSample; i++) {
        const sample = this.#audioData[i];
        min = Math.min(min, sample);
        max = Math.max(max, sample);
      }
      
      const yMin = centerY - (min * scale);
      const yMax = centerY - (max * scale);
      
      ctx.fillRect(x, yMax, 1, yMin - yMax);
    }
  }

  /**
   * Resizes the canvas to match current attributes.
   * @private
   */
  #resizeCanvas() {
    const width = parseInt(this.getAttribute('width') || '800', 10);
    const height = parseInt(this.getAttribute('height') || '200', 10);
    
    this.#canvas.width = width;
    this.#canvas.height = height;
  }

  /**
   * Shows or hides the loading indicator.
   * @private
   * @param {boolean} show - Whether to show the loading indicator
   */
  #showLoading(show) {
    const loading = this.shadowRoot.querySelector('.loading');
    const error = this.shadowRoot.querySelector('.error');
    
    loading.hidden = !show;
    error.hidden = true;
  }

  /**
   * Shows an error message.
   * @private
   * @param {string} message - Error message to display
   */
  #showError(message) {
    const loading = this.shadowRoot.querySelector('.loading');
    const error = this.shadowRoot.querySelector('.error');
    
    loading.hidden = true;
    error.hidden = false;
    error.textContent = message;
  }

  /**
   * Cleanup resources on disconnect.
   * @private
   */
  #cleanup() {
    // WebGPU resources are cleaned up automatically
    this.#device = null;
    this.#peakReductionPipeline = null;
    this.#renderPipeline = null;
  }
}

/**
 * Multi-resolution cache for waveform data.
 * Stores waveform data at different resolutions for efficient rendering.
 */
class WaveformCache {
  /** @type {Map<string, Map<number, {audioData: Float32Array, sampleRate: number}>>} */
  #cache = new Map();
  
  /** @type {number} */
  #maxEntries = 50;
  
  /** @type {number} */
  #maxMemoryMB = 25; // Half of the 50MB budget
  
  /** @type {number} */
  #currentMemoryBytes = 0;

  /**
   * Gets cached waveform data for the specified audio ID and resolution.
   * @param {string} audioId - Audio clip identifier
   * @param {number} width - Target width in pixels
   * @returns {{audioData: Float32Array, sampleRate: number} | null}
   */
  get(audioId, width) {
    const resolutionMap = this.#cache.get(audioId);
    if (!resolutionMap) return null;
    
    // Find closest resolution
    const resolutions = Array.from(resolutionMap.keys()).sort((a, b) => a - b);
    const closestResolution = resolutions.reduce((prev, curr) => {
      return Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev;
    }, resolutions[0]);
    
    // Only use if within 20% of target width
    if (Math.abs(closestResolution - width) / width > 0.2) {
      return null;
    }
    
    return resolutionMap.get(closestResolution);
  }

  /**
   * Stores waveform data in the cache.
   * @param {string} audioId - Audio clip identifier
   * @param {number} width - Resolution width in pixels
   * @param {{audioData: Float32Array, sampleRate: number}} data - Waveform data
   */
  set(audioId, width, data) {
    // Check memory budget
    const dataSize = data.audioData.byteLength;
    while (this.#currentMemoryBytes + dataSize > this.#maxMemoryMB * 1024 * 1024) {
      this.#evictOldest();
    }
    
    let resolutionMap = this.#cache.get(audioId);
    if (!resolutionMap) {
      resolutionMap = new Map();
      this.#cache.set(audioId, resolutionMap);
    }
    
    resolutionMap.set(width, data);
    this.#currentMemoryBytes += dataSize;
    
    // Enforce max entries
    if (this.#cache.size > this.#maxEntries) {
      this.#evictOldest();
    }
  }

  /**
   * Evicts the oldest cache entry.
   * @private
   */
  #evictOldest() {
    const firstKey = this.#cache.keys().next().value;
    if (firstKey) {
      const resolutionMap = this.#cache.get(firstKey);
      if (resolutionMap) {
        for (const data of resolutionMap.values()) {
          this.#currentMemoryBytes -= data.audioData.byteLength;
        }
      }
      this.#cache.delete(firstKey);
    }
  }

  /**
   * Clears all cached data.
   */
  clear() {
    this.#cache.clear();
    this.#currentMemoryBytes = 0;
  }

  /**
   * Gets current cache statistics.
   * @returns {{entries: number, memoryMB: number}}
   */
  getStats() {
    return {
      entries: this.#cache.size,
      memoryMB: this.#currentMemoryBytes / (1024 * 1024),
    };
  }
}

customElements.define('harmony-waveform-visualizer', HarmonyWaveformVisualizer);

export { HarmonyWaveformVisualizer, WaveformCache };