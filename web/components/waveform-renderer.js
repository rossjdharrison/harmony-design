/**
 * @fileoverview Waveform visualization component using WebGPU compute shaders
 * for peak reduction. Implements multi-resolution cache system for efficient
 * rendering at different zoom levels.
 * 
 * @see DESIGN_SYSTEM.md#waveform-visualization
 * @module web/components/waveform-renderer
 */

import { EventBus } from '../../core/event-bus.js';

/**
 * Waveform renderer component that visualizes audio data using WebGPU.
 * Implements multi-resolution caching and GPU-accelerated peak reduction.
 * 
 * @extends HTMLElement
 * @example
 * <waveform-renderer
 *   width="800"
 *   height="200"
 *   sample-rate="44100"
 *   channels="2">
 * </waveform-renderer>
 */
export class WaveformRenderer extends HTMLElement {
  static get observedAttributes() {
    return ['width', 'height', 'sample-rate', 'channels', 'zoom-level'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {GPUDevice|null} */
    this.device = null;
    
    /** @type {GPUQueue|null} */
    this.queue = null;
    
    /** @type {HTMLCanvasElement|null} */
    this.canvas = null;
    
    /** @type {GPUCanvasContext|null} */
    this.context = null;
    
    /** @type {Map<number, CachedWaveform>} */
    this.resolutionCache = new Map();
    
    /** @type {GPUComputePipeline|null} */
    this.peakReductionPipeline = null;
    
    /** @type {GPUBuffer|null} */
    this.audioDataBuffer = null;
    
    /** @type {Float32Array|null} */
    this.audioData = null;
    
    /** @type {number} */
    this.sampleRate = 44100;
    
    /** @type {number} */
    this.channels = 2;
    
    /** @type {number} */
    this.zoomLevel = 1.0;
    
    /** @type {EventBus} */
    this.eventBus = EventBus.getInstance();
    
    /** @type {boolean} */
    this.isInitialized = false;
    
    /** @type {number} */
    this.animationFrameId = null;
  }

  /**
   * Called when element is connected to DOM
   */
  async connectedCallback() {
    this.render();
    await this.initWebGPU();
    this.setupEventListeners();
    this.isInitialized = true;
    
    // Publish ready event
    this.eventBus.publish({
      type: 'WaveformRenderer.Ready',
      payload: {
        componentId: this.id || 'waveform-renderer',
        capabilities: {
          webgpu: !!this.device,
          maxTextureSize: this.device?.limits.maxTextureDimension2D || 0
        }
      }
    });
  }

  /**
   * Called when element is disconnected from DOM
   */
  disconnectedCallback() {
    this.cleanup();
  }

  /**
   * Called when observed attributes change
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'width':
      case 'height':
        this.updateCanvasSize();
        break;
      case 'sample-rate':
        this.sampleRate = parseInt(newValue, 10) || 44100;
        this.invalidateCache();
        break;
      case 'channels':
        this.channels = parseInt(newValue, 10) || 2;
        this.invalidateCache();
        break;
      case 'zoom-level':
        this.zoomLevel = parseFloat(newValue) || 1.0;
        this.requestRender();
        break;
    }
  }

  /**
   * Renders the component's shadow DOM structure
   */
  render() {
    const width = this.getAttribute('width') || '800';
    const height = this.getAttribute('height') || '200';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: ${width}px;
          height: ${height}px;
          contain: layout style paint;
        }
        
        canvas {
          display: block;
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
        }
        
        .loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--harmony-text-secondary, #666);
          font-family: var(--harmony-font-family, system-ui);
          font-size: 14px;
        }
        
        .error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--harmony-error, #d32f2f);
          font-family: var(--harmony-font-family, system-ui);
          font-size: 14px;
          text-align: center;
        }
      </style>
      <canvas></canvas>
      <div class="loading">Initializing WebGPU...</div>
    `;
    
    this.canvas = this.shadowRoot.querySelector('canvas');
    this.updateCanvasSize();
  }

  /**
   * Updates canvas dimensions based on attributes
   */
  updateCanvasSize() {
    if (!this.canvas) return;
    
    const width = parseInt(this.getAttribute('width'), 10) || 800;
    const height = parseInt(this.getAttribute('height'), 10) || 200;
    
    // Set logical size
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Configure context if available
    if (this.context && this.device) {
      this.context.configure({
        device: this.device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'premultiplied',
      });
    }
  }

  /**
   * Initializes WebGPU device and resources
   * @returns {Promise<void>}
   */
  async initWebGPU() {
    const loadingEl = this.shadowRoot.querySelector('.loading');
    
    try {
      // Check WebGPU support
      if (!navigator.gpu) {
        throw new Error('WebGPU not supported in this browser');
      }
      
      // Request adapter
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      
      if (!adapter) {
        throw new Error('Failed to get WebGPU adapter');
      }
      
      // Request device
      this.device = await adapter.requestDevice({
        requiredLimits: {
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
          maxBufferSize: adapter.limits.maxBufferSize,
        }
      });
      
      this.queue = this.device.queue;
      
      // Configure canvas context
      this.context = this.canvas.getContext('webgpu');
      this.context.configure({
        device: this.device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'premultiplied',
      });
      
      // Initialize compute pipeline
      await this.initComputePipeline();
      
      // Hide loading indicator
      if (loadingEl) {
        loadingEl.style.display = 'none';
      }
      
    } catch (error) {
      console.error('[WaveformRenderer] WebGPU initialization failed:', error);
      
      if (loadingEl) {
        loadingEl.className = 'error';
        loadingEl.textContent = `WebGPU Error: ${error.message}`;
      }
      
      this.eventBus.publish({
        type: 'WaveformRenderer.Error',
        payload: {
          componentId: this.id || 'waveform-renderer',
          error: error.message,
          stage: 'initialization'
        }
      });
    }
  }

  /**
   * Initializes WebGPU compute pipeline for peak reduction
   * @returns {Promise<void>}
   */
  async initComputePipeline() {
    // WGSL shader for peak reduction
    const shaderCode = `
      struct PeakData {
        min: f32,
        max: f32,
      }
      
      @group(0) @binding(0) var<storage, read> audioData: array<f32>;
      @group(0) @binding(1) var<storage, read_write> peaks: array<PeakData>;
      @group(0) @binding(2) var<uniform> params: vec4<u32>; // samplesPerPeak, numPeaks, channel, totalSamples
      
      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let peakIndex = global_id.x;
        let samplesPerPeak = params.x;
        let numPeaks = params.y;
        let channel = params.z;
        let totalSamples = params.w;
        
        if (peakIndex >= numPeaks) {
          return;
        }
        
        let startSample = peakIndex * samplesPerPeak;
        let endSample = min(startSample + samplesPerPeak, totalSamples);
        
        var minVal = 0.0;
        var maxVal = 0.0;
        
        for (var i = startSample; i < endSample; i = i + 1u) {
          let sample = audioData[i];
          minVal = min(minVal, sample);
          maxVal = max(maxVal, sample);
        }
        
        peaks[peakIndex].min = minVal;
        peaks[peakIndex].max = maxVal;
      }
    `;
    
    const shaderModule = this.device.createShaderModule({
      code: shaderCode,
      label: 'Peak Reduction Shader'
    });
    
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        }
      ]
    });
    
    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    });
    
    this.peakReductionPipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });
  }

  /**
   * Sets up event listeners for component interactions
   */
  setupEventListeners() {
    // Subscribe to audio data events
    this.eventBus.subscribe('AudioAnalysis.DataReady', (event) => {
      this.handleAudioData(event.payload);
    });
    
    // Subscribe to playback position updates
    this.eventBus.subscribe('Transport.PositionChanged', (event) => {
      this.updatePlayheadPosition(event.payload.position);
    });
    
    // Handle canvas interactions
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.handleZoom(e);
    });
    
    this.canvas.addEventListener('pointerdown', (e) => {
      this.handlePointerDown(e);
    });
  }

  /**
   * Handles incoming audio data from harmony-sound analysis
   * @param {Object} payload - Audio data payload
   * @param {Float32Array} payload.samples - Audio samples
   * @param {number} payload.sampleRate - Sample rate
   * @param {number} payload.channels - Number of channels
   */
  async handleAudioData(payload) {
    if (!this.device) {
      console.warn('[WaveformRenderer] WebGPU not initialized');
      return;
    }
    
    try {
      this.audioData = payload.samples;
      this.sampleRate = payload.sampleRate || this.sampleRate;
      this.channels = payload.channels || this.channels;
      
      // Create GPU buffer for audio data
      if (this.audioDataBuffer) {
        this.audioDataBuffer.destroy();
      }
      
      this.audioDataBuffer = this.device.createBuffer({
        size: this.audioData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        label: 'Audio Data Buffer'
      });
      
      this.queue.writeBuffer(this.audioDataBuffer, 0, this.audioData);
      
      // Invalidate cache and trigger render
      this.invalidateCache();
      await this.computePeaksForResolution(this.zoomLevel);
      this.requestRender();
      
      this.eventBus.publish({
        type: 'WaveformRenderer.DataLoaded',
        payload: {
          componentId: this.id || 'waveform-renderer',
          sampleCount: this.audioData.length,
          duration: this.audioData.length / this.sampleRate
        }
      });
      
    } catch (error) {
      console.error('[WaveformRenderer] Error handling audio data:', error);
      this.eventBus.publish({
        type: 'WaveformRenderer.Error',
        payload: {
          componentId: this.id || 'waveform-renderer',
          error: error.message,
          stage: 'data-processing'
        }
      });
    }
  }

  /**
   * Computes peak data for a specific resolution using GPU
   * @param {number} resolution - Zoom level/resolution
   * @returns {Promise<CachedWaveform>}
   */
  async computePeaksForResolution(resolution) {
    if (!this.device || !this.audioDataBuffer) {
      return null;
    }
    
    // Check cache first
    if (this.resolutionCache.has(resolution)) {
      return this.resolutionCache.get(resolution);
    }
    
    const canvasWidth = this.canvas.width;
    const samplesPerPixel = Math.ceil((this.audioData.length / canvasWidth) / resolution);
    const numPeaks = Math.ceil(this.audioData.length / samplesPerPixel);
    
    // Create output buffer for peaks
    const peaksBuffer = this.device.createBuffer({
      size: numPeaks * 8, // 2 floats per peak (min, max)
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      label: `Peaks Buffer (res: ${resolution})`
    });
    
    // Create uniform buffer for parameters
    const paramsBuffer = this.device.createBuffer({
      size: 16, // 4 u32 values
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'Peak Reduction Params'
    });
    
    const params = new Uint32Array([
      samplesPerPixel,
      numPeaks,
      0, // channel (process first channel for now)
      this.audioData.length
    ]);
    
    this.queue.writeBuffer(paramsBuffer, 0, params);
    
    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.peakReductionPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.audioDataBuffer } },
        { binding: 1, resource: { buffer: peaksBuffer } },
        { binding: 2, resource: { buffer: paramsBuffer } }
      ]
    });
    
    // Execute compute shader
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.peakReductionPipeline);
    passEncoder.setBindGroup(0, bindGroup);
    
    const workgroupCount = Math.ceil(numPeaks / 256);
    passEncoder.dispatchWorkgroups(workgroupCount);
    passEncoder.end();
    
    // Read back results
    const readBuffer = this.device.createBuffer({
      size: numPeaks * 8,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      label: 'Read Buffer'
    });
    
    commandEncoder.copyBufferToBuffer(peaksBuffer, 0, readBuffer, 0, numPeaks * 8);
    this.queue.submit([commandEncoder.finish()]);
    
    await readBuffer.mapAsync(GPUMapMode.READ);
    const peaksData = new Float32Array(readBuffer.getMappedRange());
    const peaksCopy = new Float32Array(peaksData);
    readBuffer.unmap();
    
    // Clean up temporary buffers
    peaksBuffer.destroy();
    paramsBuffer.destroy();
    readBuffer.destroy();
    
    // Cache the result
    const cached = {
      resolution,
      peaks: peaksCopy,
      samplesPerPixel,
      timestamp: performance.now()
    };
    
    this.resolutionCache.set(resolution, cached);
    
    // Limit cache size (keep 5 most recent resolutions)
    if (this.resolutionCache.size > 5) {
      const oldest = Array.from(this.resolutionCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.resolutionCache.delete(oldest[0]);
    }
    
    return cached;
  }

  /**
   * Requests a render on next animation frame
   */
  requestRender() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.animationFrameId = requestAnimationFrame(() => {
      this.renderWaveform();
    });
  }

  /**
   * Renders the waveform to canvas
   */
  async renderWaveform() {
    if (!this.context || !this.device) return;
    
    const startTime = performance.now();
    
    const cached = this.resolutionCache.get(this.zoomLevel);
    if (!cached) {
      // Peaks not computed yet
      return;
    }
    
    const textureView = this.context.getCurrentTexture().createView();
    const commandEncoder = this.device.createCommandEncoder();
    
    const renderPassDescriptor = {
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };
    
    // For now, use 2D canvas fallback for actual drawing
    // Full WebGPU rendering pipeline would require vertex/fragment shaders
    this.renderWaveformCanvas2D(cached);
    
    const renderTime = performance.now() - startTime;
    
    // Check performance budget (16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`[WaveformRenderer] Render time ${renderTime.toFixed(2)}ms exceeds 16ms budget`);
    }
  }

  /**
   * Renders waveform using 2D canvas (fallback/hybrid approach)
   * @param {CachedWaveform} cached - Cached peak data
   */
  renderWaveformCanvas2D(cached) {
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerY = height / 2;
    
    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    const peaks = cached.peaks;
    const pixelsPerPeak = width / (peaks.length / 2);
    
    for (let i = 0; i < peaks.length; i += 2) {
      const x = (i / 2) * pixelsPerPeak;
      const min = peaks[i];
      const max = peaks[i + 1];
      
      const y1 = centerY + (min * centerY);
      const y2 = centerY + (max * centerY);
      
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    
    ctx.stroke();
    
    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }

  /**
   * Handles zoom interaction
   * @param {WheelEvent} event - Wheel event
   */
  handleZoom(event) {
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, this.zoomLevel * delta));
    
    this.zoomLevel = newZoom;
    this.setAttribute('zoom-level', newZoom.toString());
    
    // Compute peaks for new resolution if needed
    if (!this.resolutionCache.has(newZoom)) {
      this.computePeaksForResolution(newZoom).then(() => {
        this.requestRender();
      });
    } else {
      this.requestRender();
    }
    
    this.eventBus.publish({
      type: 'WaveformRenderer.ZoomChanged',
      payload: {
        componentId: this.id || 'waveform-renderer',
        zoomLevel: newZoom
      }
    });
  }

  /**
   * Handles pointer down for seeking
   * @param {PointerEvent} event - Pointer event
   */
  handlePointerDown(event) {
    if (!this.audioData) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const position = (x / this.canvas.width) * (this.audioData.length / this.sampleRate);
    
    this.eventBus.publish({
      type: 'WaveformRenderer.SeekRequested',
      payload: {
        componentId: this.id || 'waveform-renderer',
        position
      }
    });
  }

  /**
   * Updates playhead position visualization
   * @param {number} position - Position in seconds
   */
  updatePlayheadPosition(position) {
    // Store for next render
    this.playheadPosition = position;
    this.requestRender();
  }

  /**
   * Invalidates all cached resolutions
   */
  invalidateCache() {
    this.resolutionCache.clear();
  }

  /**
   * Cleans up resources
   */
  cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.audioDataBuffer) {
      this.audioDataBuffer.destroy();
      this.audioDataBuffer = null;
    }
    
    this.resolutionCache.clear();
    this.audioData = null;
    this.device = null;
    this.queue = null;
  }
}

/**
 * @typedef {Object} CachedWaveform
 * @property {number} resolution - Resolution/zoom level
 * @property {Float32Array} peaks - Peak data (interleaved min/max)
 * @property {number} samplesPerPixel - Samples per pixel at this resolution
 * @property {number} timestamp - Cache timestamp
 */

// Register custom element
customElements.define('waveform-renderer', WaveformRenderer);

// Export for module usage
export default WaveformRenderer;