/**
 * @fileoverview GPU/CPU capability detection and backend routing manager
 * @module harmony-graph/capability-manager
 * 
 * Manages detection of WebGPU availability and routes compute operations
 * to either GPU or CPU backends with transparent fallback.
 * 
 * Related: docs/gpu-cpu-fallback-spec.md
 */

import { EventBus } from '../../core/event-bus.js';

/**
 * Capability detection and backend routing manager
 * 
 * Detects available compute backends (WebGPU, WASM) and provides
 * a unified interface for graph operations with automatic fallback.
 * 
 * @example
 * const manager = new CapabilityManager(eventBus);
 * await manager.initialize();
 * const backend = manager.getBackend();
 * const result = await backend.traverseGraph(nodes, edges, startNode);
 */
export class CapabilityManager {
  /**
   * @param {EventBus} eventBus - Event bus for capability events
   */
  constructor(eventBus) {
    if (!eventBus) {
      throw new Error('CapabilityManager requires EventBus instance');
    }
    
    this.eventBus = eventBus;
    this.gpuBackend = null;
    this.cpuBackend = null;
    this.activeBackend = null;
    
    /** @type {Object} Detected capabilities */
    this.capabilities = {
      webgpu: false,
      wasm: false,
      sharedArrayBuffer: false,
      webWorkers: false
    };
    
    /** @type {string|null} Reason for current backend selection */
    this.backendReason = null;
    
    /** @type {boolean} Whether initialization is complete */
    this.initialized = false;
  }
  
  /**
   * Initialize capability detection and backend selection
   * 
   * Attempts to initialize WebGPU backend first, falls back to CPU
   * if unavailable. Always initializes CPU backend as fallback.
   * 
   * @returns {Promise<Object>} Detected capabilities
   * @throws {Error} If no backends are available
   */
  async initialize() {
    if (this.initialized) {
      console.warn('[CapabilityManager] Already initialized');
      return this.capabilities;
    }
    
    console.log('[CapabilityManager] Starting capability detection...');
    
    // Detect WebGPU
    await this._detectWebGPU();
    
    // Detect WASM
    this._detectWASM();
    
    // Detect SharedArrayBuffer
    this._detectSharedArrayBuffer();
    
    // Detect Web Workers
    this._detectWebWorkers();
    
    // Initialize CPU backend (always available as fallback)
    await this._initializeCPUBackend();
    
    // Select active backend
    this._selectActiveBackend();
    
    this.initialized = true;
    
    // Publish capability detection event
    this.eventBus.publish('system:capabilities:detected', {
      capabilities: { ...this.capabilities },
      activeBackend: this._getActiveBackendName(),
      reason: this.backendReason,
      timestamp: Date.now()
    });
    
    console.log('[CapabilityManager] Initialization complete:', {
      capabilities: this.capabilities,
      activeBackend: this._getActiveBackendName()
    });
    
    return this.capabilities;
  }
  
  /**
   * Detect WebGPU availability
   * @private
   */
  async _detectWebGPU() {
    if (!('gpu' in navigator)) {
      console.warn('[CapabilityManager] WebGPU not available: navigator.gpu undefined');
      this.capabilities.webgpu = false;
      return;
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      
      if (!adapter) {
        console.warn('[CapabilityManager] WebGPU adapter request failed');
        this.capabilities.webgpu = false;
        return;
      }
      
      // Attempt to create device
      const device = await adapter.requestDevice();
      
      if (device) {
        this.capabilities.webgpu = true;
        console.log('[CapabilityManager] WebGPU available');
        
        // Store for GPU backend initialization
        this._gpuAdapter = adapter;
        this._gpuDevice = device;
      }
      
    } catch (err) {
      console.warn('[CapabilityManager] WebGPU initialization failed:', err);
      this.capabilities.webgpu = false;
    }
  }
  
  /**
   * Detect WebAssembly availability
   * @private
   */
  _detectWASM() {
    if (typeof WebAssembly !== 'undefined') {
      this.capabilities.wasm = true;
      console.log('[CapabilityManager] WebAssembly available');
    } else {
      console.warn('[CapabilityManager] WebAssembly not available');
      this.capabilities.wasm = false;
    }
  }
  
  /**
   * Detect SharedArrayBuffer availability
   * @private
   */
  _detectSharedArrayBuffer() {
    if (typeof SharedArrayBuffer !== 'undefined') {
      this.capabilities.sharedArrayBuffer = true;
      console.log('[CapabilityManager] SharedArrayBuffer available');
    } else {
      console.warn('[CapabilityManager] SharedArrayBuffer not available');
      this.capabilities.sharedArrayBuffer = false;
    }
  }
  
  /**
   * Detect Web Workers availability
   * @private
   */
  _detectWebWorkers() {
    if (typeof Worker !== 'undefined') {
      this.capabilities.webWorkers = true;
      console.log('[CapabilityManager] Web Workers available');
    } else {
      console.warn('[CapabilityManager] Web Workers not available');
      this.capabilities.webWorkers = false;
    }
  }
  
  /**
   * Initialize GPU backend (lazy, only if WebGPU available)
   * @private
   */
  async _initializeGPUBackend() {
    if (!this.capabilities.webgpu) {
      return null;
    }
    
    try {
      // Lazy load GPU backend to avoid loading WGSL if not needed
      const { GPUBackend } = await import('./gpu/gpu-backend.js');
      
      this.gpuBackend = new GPUBackend(
        this._gpuDevice,
        this._gpuAdapter
      );
      
      await this.gpuBackend.initialize();
      
      console.log('[CapabilityManager] GPU backend initialized');
      return this.gpuBackend;
      
    } catch (err) {
      console.error('[CapabilityManager] GPU backend initialization failed:', err);
      this.capabilities.webgpu = false;
      return null;
    }
  }
  
  /**
   * Initialize CPU backend (always runs)
   * @private
   */
  async _initializeCPUBackend() {
    try {
      const { CPUBackend } = await import('./cpu/cpu-backend.js');
      
      this.cpuBackend = new CPUBackend({
        useWASM: this.capabilities.wasm,
        useWorkers: this.capabilities.webWorkers
      });
      
      await this.cpuBackend.initialize();
      
      console.log('[CapabilityManager] CPU backend initialized');
      return this.cpuBackend;
      
    } catch (err) {
      console.error('[CapabilityManager] CPU backend initialization failed:', err);
      throw new Error('No compute backends available');
    }
  }
  
  /**
   * Select active backend based on capabilities
   * @private
   */
  _selectActiveBackend() {
    if (this.capabilities.webgpu && this.gpuBackend) {
      this.activeBackend = this.gpuBackend;
      this.backendReason = 'webgpu_available';
    } else if (this.cpuBackend) {
      this.activeBackend = this.cpuBackend;
      this.backendReason = this.capabilities.webgpu 
        ? 'webgpu_init_failed' 
        : 'webgpu_unavailable';
    } else {
      throw new Error('No compute backends available');
    }
  }
  
  /**
   * Get active backend name
   * @private
   * @returns {string} 'gpu' or 'cpu'
   */
  _getActiveBackendName() {
    if (!this.activeBackend) return 'none';
    return this.activeBackend === this.gpuBackend ? 'gpu' : 'cpu';
  }
  
  /**
   * Get current active backend
   * 
   * @returns {Object} Active compute backend (GPU or CPU)
   * @throws {Error} If not initialized
   */
  getBackend() {
    if (!this.initialized) {
      throw new Error('CapabilityManager not initialized. Call initialize() first.');
    }
    
    return this.activeBackend;
  }
  
  /**
   * Get detected capabilities
   * 
   * @returns {Object} Capability flags
   */
  getCapabilities() {
    return { ...this.capabilities };
  }
  
  /**
   * Check if GPU backend is active
   * 
   * @returns {boolean} True if GPU backend is active
   */
  isUsingGPU() {
    return this.activeBackend === this.gpuBackend;
  }
  
  /**
   * Force fallback to CPU backend
   * 
   * Used for testing or when GPU becomes unavailable at runtime.
   * 
   * @param {string} reason - Reason for forced fallback
   */
  forceCPUFallback(reason = 'manual') {
    if (!this.cpuBackend) {
      throw new Error('CPU backend not available');
    }
    
    const previousBackend = this._getActiveBackendName();
    this.activeBackend = this.cpuBackend;
    this.backendReason = `forced_${reason}`;
    
    this.eventBus.publish('system:backend:switched', {
      from: previousBackend,
      to: 'cpu',
      reason: this.backendReason,
      timestamp: Date.now()
    });
    
    console.log('[CapabilityManager] Forced CPU fallback:', reason);
  }
  
  /**
   * Attempt to switch back to GPU backend
   * 
   * @returns {Promise<boolean>} True if switch successful
   */
  async tryGPUBackend() {
    if (!this.capabilities.webgpu) {
      console.warn('[CapabilityManager] WebGPU not available, cannot switch');
      return false;
    }
    
    if (!this.gpuBackend) {
      // Try to initialize GPU backend
      await this._initializeGPUBackend();
    }
    
    if (this.gpuBackend) {
      const previousBackend = this._getActiveBackendName();
      this.activeBackend = this.gpuBackend;
      this.backendReason = 'manual_switch';
      
      this.eventBus.publish('system:backend:switched', {
        from: previousBackend,
        to: 'gpu',
        reason: this.backendReason,
        timestamp: Date.now()
      });
      
      console.log('[CapabilityManager] Switched to GPU backend');
      return true;
    }
    
    return false;
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    if (this.gpuBackend) {
      this.gpuBackend.dispose();
    }
    
    if (this.cpuBackend) {
      this.cpuBackend.dispose();
    }
    
    this.activeBackend = null;
    this.initialized = false;
    
    console.log('[CapabilityManager] Disposed');
  }
}