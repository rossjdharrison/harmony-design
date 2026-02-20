/**
 * @fileoverview WebGPU Device Initialization and Feature Detection
 * @module core/webgpu-device
 * 
 * Provides singleton access to WebGPU device with feature detection,
 * adapter selection, and error handling. Ensures GPU-first architecture
 * compliance and performance budget adherence.
 * 
 * Related: DESIGN_SYSTEM.md § WebGPU Device Management
 */

/**
 * @typedef {Object} WebGPUCapabilities
 * @property {boolean} supported - Whether WebGPU is supported in this browser
 * @property {string[]} features - List of supported optional features
 * @property {Object} limits - Device limits (maxBufferSize, maxComputeWorkgroupsPerDimension, etc.)
 * @property {string} adapterInfo - Human-readable adapter description
 */

/**
 * @typedef {Object} DeviceInitOptions
 * @property {string[]} [requiredFeatures] - Optional features that must be available
 * @property {Object} [requiredLimits] - Limits that must be met
 * @property {boolean} [preferHighPerformance] - Prefer high-performance adapter over low-power
 */

/**
 * Singleton WebGPU device manager
 * Handles initialization, feature detection, and device lifecycle
 */
class WebGPUDevice {
  constructor() {
    if (WebGPUDevice.instance) {
      return WebGPUDevice.instance;
    }

    /** @type {GPUAdapter|null} */
    this.adapter = null;

    /** @type {GPUDevice|null} */
    this.device = null;

    /** @type {WebGPUCapabilities|null} */
    this.capabilities = null;

    /** @type {Promise<void>|null} */
    this.initPromise = null;

    /** @type {boolean} */
    this.initialized = false;

    /** @type {Array<Function>} */
    this.deviceLostCallbacks = [];

    WebGPUDevice.instance = this;
  }

  /**
   * Initialize WebGPU device with optional requirements
   * @param {DeviceInitOptions} [options={}] - Initialization options
   * @returns {Promise<GPUDevice>} Initialized device
   * @throws {Error} If WebGPU is not supported or requirements not met
   */
  async initialize(options = {}) {
    // Return existing initialization if in progress or complete
    if (this.initPromise) {
      await this.initPromise;
      return this.device;
    }

    if (this.initialized && this.device) {
      return this.device;
    }

    // Create initialization promise
    this.initPromise = this._initializeInternal(options);

    try {
      await this.initPromise;
      return this.device;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Internal initialization logic
   * @private
   * @param {DeviceInitOptions} options
   */
  async _initializeInternal(options) {
    const startTime = performance.now();

    // Check WebGPU support
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or another WebGPU-capable browser.');
    }

    try {
      // Request adapter with power preference
      const adapterOptions = {
        powerPreference: options.preferHighPerformance ? 'high-performance' : 'low-power'
      };

      this.adapter = await navigator.gpu.requestAdapter(adapterOptions);

      if (!this.adapter) {
        throw new Error('Failed to request WebGPU adapter. Your GPU may not support WebGPU.');
      }

      // Detect capabilities
      this.capabilities = await this._detectCapabilities(this.adapter);

      // Validate required features
      if (options.requiredFeatures) {
        const missing = options.requiredFeatures.filter(
          feature => !this.capabilities.features.includes(feature)
        );
        if (missing.length > 0) {
          throw new Error(`Required WebGPU features not available: ${missing.join(', ')}`);
        }
      }

      // Prepare device descriptor
      const deviceDescriptor = {
        label: 'Harmony Design System - Main Device',
        requiredFeatures: options.requiredFeatures || [],
        requiredLimits: options.requiredLimits || {}
      };

      // Request device
      this.device = await this.adapter.requestDevice(deviceDescriptor);

      // Set up device lost handler
      this.device.lost.then((info) => {
        console.error('WebGPU device lost:', info.message, info.reason);
        this._handleDeviceLost(info);
      });

      // Set up error handler
      this.device.addEventListener('uncapturederror', (event) => {
        console.error('WebGPU uncaptured error:', event.error);
      });

      this.initialized = true;

      const initTime = performance.now() - startTime;
      console.log(`WebGPU device initialized in ${initTime.toFixed(2)}ms`, {
        adapter: this.capabilities.adapterInfo,
        features: this.capabilities.features,
        limits: this._summarizeLimits(this.capabilities.limits)
      });

      // Verify load budget (200ms max)
      if (initTime > 200) {
        console.warn(`WebGPU initialization exceeded load budget: ${initTime.toFixed(2)}ms > 200ms`);
      }

      return this.device;

    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      throw error;
    }
  }

  /**
   * Detect adapter capabilities
   * @private
   * @param {GPUAdapter} adapter
   * @returns {Promise<WebGPUCapabilities>}
   */
  async _detectCapabilities(adapter) {
    const features = Array.from(adapter.features);
    const limits = adapter.limits;
    
    // Get adapter info if available
    let adapterInfo = 'Unknown adapter';
    if (adapter.info) {
      const info = adapter.info;
      adapterInfo = `${info.vendor || 'Unknown'} ${info.architecture || ''} (${info.device || 'Unknown device'})`.trim();
    }

    return {
      supported: true,
      features,
      limits: this._serializeLimits(limits),
      adapterInfo
    };
  }

  /**
   * Serialize GPU limits object (GPUSupportedLimits is not directly serializable)
   * @private
   * @param {GPUSupportedLimits} limits
   * @returns {Object}
   */
  _serializeLimits(limits) {
    const serialized = {};
    const limitKeys = [
      'maxTextureDimension1D',
      'maxTextureDimension2D',
      'maxTextureDimension3D',
      'maxTextureArrayLayers',
      'maxBindGroups',
      'maxDynamicUniformBuffersPerPipelineLayout',
      'maxDynamicStorageBuffersPerPipelineLayout',
      'maxSampledTexturesPerShaderStage',
      'maxSamplersPerShaderStage',
      'maxStorageBuffersPerShaderStage',
      'maxStorageTexturesPerShaderStage',
      'maxUniformBuffersPerShaderStage',
      'maxUniformBufferBindingSize',
      'maxStorageBufferBindingSize',
      'maxVertexBuffers',
      'maxVertexAttributes',
      'maxVertexBufferArrayStride',
      'maxComputeWorkgroupStorageSize',
      'maxComputeInvocationsPerWorkgroup',
      'maxComputeWorkgroupSizeX',
      'maxComputeWorkgroupSizeY',
      'maxComputeWorkgroupSizeZ',
      'maxComputeWorkgroupsPerDimension'
    ];

    for (const key of limitKeys) {
      if (key in limits) {
        serialized[key] = limits[key];
      }
    }

    return serialized;
  }

  /**
   * Create summary of key limits for logging
   * @private
   * @param {Object} limits
   * @returns {Object}
   */
  _summarizeLimits(limits) {
    return {
      maxTexture2D: limits.maxTextureDimension2D,
      maxBindGroups: limits.maxBindGroups,
      maxBufferSize: limits.maxStorageBufferBindingSize,
      maxComputeWorkgroups: limits.maxComputeWorkgroupsPerDimension
    };
  }

  /**
   * Handle device lost event
   * @private
   * @param {GPUDeviceLostInfo} info
   */
  _handleDeviceLost(info) {
    this.initialized = false;
    this.device = null;
    this.initPromise = null;

    // Notify all registered callbacks
    for (const callback of this.deviceLostCallbacks) {
      try {
        callback(info);
      } catch (error) {
        console.error('Error in device lost callback:', error);
      }
    }

    // Attempt recovery if destroyed explicitly (not by browser/system)
    if (info.reason === 'destroyed') {
      console.log('Device was explicitly destroyed. Reinitialize when needed.');
    } else {
      console.error('Device lost unexpectedly. Manual reinitialization required.');
    }
  }

  /**
   * Register callback for device lost event
   * @param {Function} callback - Function to call when device is lost
   * @returns {Function} Unregister function
   */
  onDeviceLost(callback) {
    this.deviceLostCallbacks.push(callback);
    return () => {
      const index = this.deviceLostCallbacks.indexOf(callback);
      if (index > -1) {
        this.deviceLostCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current device (null if not initialized)
   * @returns {GPUDevice|null}
   */
  getDevice() {
    return this.device;
  }

  /**
   * Get adapter (null if not initialized)
   * @returns {GPUAdapter|null}
   */
  getAdapter() {
    return this.adapter;
  }

  /**
   * Get detected capabilities
   * @returns {WebGPUCapabilities|null}
   */
  getCapabilities() {
    return this.capabilities;
  }

  /**
   * Check if a specific feature is supported
   * @param {string} feature - Feature name (e.g., 'texture-compression-bc')
   * @returns {boolean}
   */
  hasFeature(feature) {
    return this.capabilities?.features.includes(feature) || false;
  }

  /**
   * Check if device is initialized and ready
   * @returns {boolean}
   */
  isReady() {
    return this.initialized && this.device !== null;
  }

  /**
   * Destroy device and reset state
   */
  destroy() {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.capabilities = null;
    this.initialized = false;
    this.initPromise = null;
  }
}

// Export singleton instance
const webgpuDevice = new WebGPUDevice();

export { webgpuDevice, WebGPUDevice };