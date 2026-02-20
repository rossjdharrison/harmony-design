/**
 * @fileoverview GPUFallback: Graceful fallback to CPU when WebGPU unavailable
 * 
 * Provides automatic detection of WebGPU availability and transparent fallback
 * to CPU-based implementations for graph operations, audio processing, and
 * parallel computations.
 * 
 * @module performance/gpu-fallback
 * @see DESIGN_SYSTEM.md#gpu-fallback
 */

/**
 * GPU capability levels for fallback strategy
 * @enum {string}
 */
export const GPUCapability = {
  WEBGPU: 'webgpu',
  WEBGL2: 'webgl2',
  CPU: 'cpu'
};

/**
 * GPU feature requirements for different operations
 * @enum {string}
 */
export const GPUFeature = {
  COMPUTE_SHADERS: 'compute-shaders',
  STORAGE_BUFFERS: 'storage-buffers',
  SHARED_MEMORY: 'shared-memory',
  TIMESTAMP_QUERY: 'timestamp-query'
};

/**
 * GPUFallback: Manages GPU capability detection and fallback strategies
 * 
 * Detects available GPU capabilities at runtime and provides transparent
 * fallback to CPU implementations when GPU features are unavailable.
 * Maintains performance budgets by selecting optimal execution path.
 * 
 * @class
 * @example
 * const fallback = new GPUFallback();
 * await fallback.initialize();
 * 
 * if (fallback.hasCapability(GPUCapability.WEBGPU)) {
 *   await runWebGPUPath();
 * } else {
 *   await runCPUPath();
 * }
 */
export class GPUFallback {
  constructor() {
    /** @type {GPUCapability} */
    this.capability = GPUCapability.CPU;
    
    /** @type {GPU|null} */
    this.gpu = null;
    
    /** @type {GPUAdapter|null} */
    this.adapter = null;
    
    /** @type {GPUDevice|null} */
    this.device = null;
    
    /** @type {Set<GPUFeature>} */
    this.availableFeatures = new Set();
    
    /** @type {boolean} */
    this.initialized = false;
    
    /** @type {Map<string, Function>} */
    this.cpuFallbacks = new Map();
    
    /** @type {Map<string, Function>} */
    this.gpuImplementations = new Map();
  }

  /**
   * Initialize GPU detection and setup fallback strategy
   * 
   * @returns {Promise<GPUCapability>} Detected capability level
   */
  async initialize() {
    if (this.initialized) {
      return this.capability;
    }

    // Check WebGPU availability
    if (navigator.gpu) {
      try {
        this.gpu = navigator.gpu;
        this.adapter = await this.gpu.requestAdapter();
        
        if (this.adapter) {
          this.device = await this.adapter.requestDevice();
          this.capability = GPUCapability.WEBGPU;
          
          // Detect available features
          this._detectFeatures();
          
          // Setup device error handling
          this.device.addEventListener('uncapturederror', (event) => {
            console.error('[GPUFallback] WebGPU error:', event.error);
            this._handleGPUError(event.error);
          });
          
          console.log('[GPUFallback] WebGPU initialized successfully');
        }
      } catch (error) {
        console.warn('[GPUFallback] WebGPU initialization failed:', error);
        this.capability = GPUCapability.CPU;
      }
    }

    // Fallback to WebGL2 if available
    if (this.capability === GPUCapability.CPU) {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      
      if (gl) {
        this.capability = GPUCapability.WEBGL2;
        console.log('[GPUFallback] WebGL2 available as fallback');
      } else {
        console.log('[GPUFallback] Falling back to CPU implementation');
      }
    }

    this.initialized = true;
    return this.capability;
  }

  /**
   * Detect available GPU features
   * @private
   */
  _detectFeatures() {
    if (!this.adapter) return;

    // Check for compute shader support
    if (this.adapter.features.has('shader-f16')) {
      this.availableFeatures.add(GPUFeature.COMPUTE_SHADERS);
    }

    // Storage buffer support is baseline for WebGPU
    this.availableFeatures.add(GPUFeature.STORAGE_BUFFERS);

    // Check for timestamp queries
    if (this.adapter.features.has('timestamp-query')) {
      this.availableFeatures.add(GPUFeature.TIMESTAMP_QUERY);
    }

    // Check SharedArrayBuffer support
    if (typeof SharedArrayBuffer !== 'undefined') {
      this.availableFeatures.add(GPUFeature.SHARED_MEMORY);
    }
  }

  /**
   * Handle GPU errors and trigger fallback if necessary
   * @private
   * @param {Error} error - GPU error
   */
  _handleGPUError(error) {
    // Critical errors that require fallback
    const criticalErrors = [
      'device lost',
      'out of memory',
      'internal error'
    ];

    const errorMessage = error.message.toLowerCase();
    const isCritical = criticalErrors.some(msg => errorMessage.includes(msg));

    if (isCritical) {
      console.error('[GPUFallback] Critical GPU error, switching to CPU fallback');
      this.capability = GPUCapability.CPU;
      this.device = null;
      this.adapter = null;
    }
  }

  /**
   * Check if specific capability is available
   * 
   * @param {GPUCapability} capability - Capability to check
   * @returns {boolean} True if capability is available
   */
  hasCapability(capability) {
    const levels = {
      [GPUCapability.WEBGPU]: 3,
      [GPUCapability.WEBGL2]: 2,
      [GPUCapability.CPU]: 1
    };

    return levels[this.capability] >= levels[capability];
  }

  /**
   * Check if specific feature is available
   * 
   * @param {GPUFeature} feature - Feature to check
   * @returns {boolean} True if feature is available
   */
  hasFeature(feature) {
    return this.availableFeatures.has(feature);
  }

  /**
   * Register CPU fallback implementation for an operation
   * 
   * @param {string} operationName - Name of the operation
   * @param {Function} implementation - CPU implementation function
   */
  registerCPUFallback(operationName, implementation) {
    this.cpuFallbacks.set(operationName, implementation);
  }

  /**
   * Register GPU implementation for an operation
   * 
   * @param {string} operationName - Name of the operation
   * @param {Function} implementation - GPU implementation function
   */
  registerGPUImplementation(operationName, implementation) {
    this.gpuImplementations.set(operationName, implementation);
  }

  /**
   * Execute operation with automatic fallback
   * 
   * Attempts GPU implementation first, falls back to CPU if unavailable
   * or if GPU execution fails. Maintains performance budgets.
   * 
   * @param {string} operationName - Name of the operation
   * @param {...any} args - Arguments to pass to implementation
   * @returns {Promise<any>} Operation result
   * @throws {Error} If no implementation is available
   */
  async execute(operationName, ...args) {
    const startTime = performance.now();

    // Try GPU implementation if available
    if (this.capability === GPUCapability.WEBGPU && 
        this.gpuImplementations.has(operationName)) {
      try {
        const gpuImpl = this.gpuImplementations.get(operationName);
        const result = await gpuImpl(this.device, ...args);
        
        const duration = performance.now() - startTime;
        console.log(`[GPUFallback] ${operationName} executed on GPU in ${duration.toFixed(2)}ms`);
        
        return result;
      } catch (error) {
        console.warn(`[GPUFallback] GPU execution failed for ${operationName}:`, error);
        // Continue to CPU fallback
      }
    }

    // Fallback to CPU implementation
    if (this.cpuFallbacks.has(operationName)) {
      const cpuImpl = this.cpuFallbacks.get(operationName);
      const result = await cpuImpl(...args);
      
      const duration = performance.now() - startTime;
      console.log(`[GPUFallback] ${operationName} executed on CPU in ${duration.toFixed(2)}ms`);
      
      return result;
    }

    throw new Error(`[GPUFallback] No implementation available for operation: ${operationName}`);
  }

  /**
   * Get optimal buffer transfer strategy based on capability
   * 
   * @param {number} bufferSize - Size of buffer in bytes
   * @returns {string} Transfer strategy ('gpu', 'shared', 'copy')
   */
  getBufferStrategy(bufferSize) {
    if (this.capability === GPUCapability.WEBGPU) {
      // Use SharedArrayBuffer for large buffers if available
      if (this.hasFeature(GPUFeature.SHARED_MEMORY) && bufferSize > 1024 * 1024) {
        return 'shared';
      }
      return 'gpu';
    }
    
    return 'copy';
  }

  /**
   * Get capability information for debugging
   * 
   * @returns {Object} Capability information
   */
  getCapabilityInfo() {
    return {
      capability: this.capability,
      features: Array.from(this.availableFeatures),
      adapterInfo: this.adapter ? {
        vendor: this.adapter.info?.vendor || 'unknown',
        architecture: this.adapter.info?.architecture || 'unknown'
      } : null,
      registeredOperations: {
        gpu: Array.from(this.gpuImplementations.keys()),
        cpu: Array.from(this.cpuFallbacks.keys())
      }
    };
  }

  /**
   * Cleanup GPU resources
   */
  async cleanup() {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    
    this.adapter = null;
    this.gpu = null;
    this.initialized = false;
    
    console.log('[GPUFallback] Cleaned up GPU resources');
  }
}

/**
 * Global singleton instance
 * @type {GPUFallback|null}
 */
let globalInstance = null;

/**
 * Get or create global GPUFallback instance
 * 
 * @returns {GPUFallback} Global instance
 */
export function getGPUFallback() {
  if (!globalInstance) {
    globalInstance = new GPUFallback();
  }
  return globalInstance;
}

/**
 * Initialize global GPU fallback system
 * 
 * @returns {Promise<GPUCapability>} Detected capability
 */
export async function initializeGPUFallback() {
  const fallback = getGPUFallback();
  return await fallback.initialize();
}