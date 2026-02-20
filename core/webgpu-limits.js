/**
 * @fileoverview WebGPU Limits Validation and Device Capability Checking
 * @module core/webgpu-limits
 * 
 * Validates WebGPU device capabilities against Harmony Design System requirements.
 * Ensures GPU compute pipelines can run with required resources and performance.
 * 
 * @see DESIGN_SYSTEM.md#gpu-limits-validation
 */

/**
 * Minimum required WebGPU limits for Harmony Design System.
 * These limits ensure graph processing, audio compute, and shader operations can run.
 * 
 * @typedef {Object} HarmonyGPURequirements
 * @property {number} maxBufferSize - Minimum buffer size (bytes) for graph data
 * @property {number} maxStorageBufferBindingSize - Minimum storage buffer binding size
 * @property {number} maxComputeWorkgroupSizeX - Minimum workgroup size X dimension
 * @property {number} maxComputeWorkgroupSizeY - Minimum workgroup size Y dimension
 * @property {number} maxComputeWorkgroupSizeZ - Minimum workgroup size Z dimension
 * @property {number} maxComputeInvocationsPerWorkgroup - Minimum invocations per workgroup
 * @property {number} maxComputeWorkgroupsPerDimension - Minimum workgroups per dimension
 * @property {number} maxStorageBuffersPerShaderStage - Minimum storage buffers per stage
 * @property {number} maxBindGroups - Minimum bind groups
 * @property {number} maxBindingsPerBindGroup - Minimum bindings per group
 */

/**
 * @type {HarmonyGPURequirements}
 */
const HARMONY_GPU_REQUIREMENTS = {
  // Graph processing: 64MB buffers for large graphs (16M nodes × 4 bytes)
  maxBufferSize: 64 * 1024 * 1024,
  
  // Storage buffers: 32MB for edge lists and state arrays
  maxStorageBufferBindingSize: 32 * 1024 * 1024,
  
  // Workgroup sizes: 256 threads for efficient graph traversal
  maxComputeWorkgroupSizeX: 256,
  maxComputeWorkgroupSizeY: 256,
  maxComputeWorkgroupSizeZ: 64,
  
  // Total invocations: 256 for parallel edge processing
  maxComputeInvocationsPerWorkgroup: 256,
  
  // Workgroups: 65535 for large graph partitioning
  maxComputeWorkgroupsPerDimension: 65535,
  
  // Storage buffers: 8 per stage (nodes, edges, state, metadata, etc.)
  maxStorageBuffersPerShaderStage: 8,
  
  // Bind groups: 4 (input, output, uniforms, metadata)
  maxBindGroups: 4,
  
  // Bindings: 16 per group for complex compute pipelines
  maxBindingsPerBindGroup: 16
};

/**
 * Optional features that enhance performance but are not strictly required.
 * 
 * @typedef {Object} OptionalGPUFeatures
 * @property {boolean} timestamp-query - GPU timing queries for profiling
 * @property {boolean} indirect-first-instance - Indirect drawing optimization
 * @property {boolean} shader-f16 - Half-precision float support for memory efficiency
 * @property {boolean} bgra8unorm-storage - BGRA texture storage for rendering
 */

/**
 * @type {string[]}
 */
const OPTIONAL_FEATURES = [
  'timestamp-query',           // Performance profiling
  'indirect-first-instance',   // Optimized dispatch
  'shader-f16',                // Memory-efficient audio processing
  'bgra8unorm-storage'         // Rendering optimization
];

/**
 * Validation result for WebGPU device capabilities.
 * 
 * @typedef {Object} GPUValidationResult
 * @property {boolean} supported - Whether WebGPU is supported
 * @property {boolean} meetsRequirements - Whether device meets minimum requirements
 * @property {Object<string, boolean>} limits - Limit validation results
 * @property {Object<string, boolean>} features - Feature availability
 * @property {string[]} warnings - Non-critical capability warnings
 * @property {string[]} errors - Critical capability errors
 * @property {GPUDevice|null} device - GPU device if validation passed
 * @property {GPUAdapter|null} adapter - GPU adapter if available
 */

/**
 * WebGPU Limits Validator
 * Checks device capabilities against Harmony requirements.
 */
export class WebGPULimitsValidator {
  constructor() {
    /** @type {GPUAdapter|null} */
    this.adapter = null;
    
    /** @type {GPUDevice|null} */
    this.device = null;
    
    /** @type {GPUValidationResult|null} */
    this.lastValidation = null;
  }

  /**
   * Check if WebGPU is supported in the current environment.
   * 
   * @returns {boolean} True if WebGPU API is available
   */
  isWebGPUSupported() {
    return 'gpu' in navigator && navigator.gpu !== undefined;
  }

  /**
   * Request GPU adapter with preferred options.
   * 
   * @returns {Promise<GPUAdapter|null>} GPU adapter or null if unavailable
   */
  async requestAdapter() {
    if (!this.isWebGPUSupported()) {
      return null;
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });
      return this.adapter;
    } catch (error) {
      console.error('[WebGPU] Adapter request failed:', error);
      return null;
    }
  }

  /**
   * Validate adapter limits against Harmony requirements.
   * 
   * @param {GPUAdapter} adapter - GPU adapter to validate
   * @returns {Object} Validation results for each limit
   */
  validateLimits(adapter) {
    const limits = adapter.limits;
    const results = {};
    const errors = [];
    const warnings = [];

    // Validate each required limit
    for (const [key, minValue] of Object.entries(HARMONY_GPU_REQUIREMENTS)) {
      const actualValue = limits[key];
      const meets = actualValue >= minValue;
      
      results[key] = meets;

      if (!meets) {
        errors.push(
          `${key}: requires ${minValue}, device has ${actualValue}`
        );
      } else if (actualValue < minValue * 2) {
        // Warn if barely meets requirements
        warnings.push(
          `${key}: meets minimum (${actualValue}) but close to limit (${minValue})`
        );
      }
    }

    return { results, errors, warnings };
  }

  /**
   * Check availability of optional features.
   * 
   * @param {GPUAdapter} adapter - GPU adapter to check
   * @returns {Object<string, boolean>} Feature availability map
   */
  checkOptionalFeatures(adapter) {
    const features = {};
    
    for (const feature of OPTIONAL_FEATURES) {
      features[feature] = adapter.features.has(feature);
    }

    return features;
  }

  /**
   * Request GPU device with required features.
   * 
   * @param {GPUAdapter} adapter - GPU adapter
   * @returns {Promise<GPUDevice|null>} GPU device or null if request fails
   */
  async requestDevice(adapter) {
    try {
      // Request only available optional features
      const requiredFeatures = [];
      for (const feature of OPTIONAL_FEATURES) {
        if (adapter.features.has(feature)) {
          requiredFeatures.push(feature);
        }
      }

      this.device = await adapter.requestDevice({
        requiredFeatures,
        requiredLimits: {
          // Request limits matching our requirements where possible
          maxStorageBufferBindingSize: Math.min(
            adapter.limits.maxStorageBufferBindingSize,
            HARMONY_GPU_REQUIREMENTS.maxStorageBufferBindingSize
          ),
          maxComputeWorkgroupSizeX: Math.min(
            adapter.limits.maxComputeWorkgroupSizeX,
            HARMONY_GPU_REQUIREMENTS.maxComputeWorkgroupSizeX
          ),
          maxComputeInvocationsPerWorkgroup: Math.min(
            adapter.limits.maxComputeInvocationsPerWorkgroup,
            HARMONY_GPU_REQUIREMENTS.maxComputeInvocationsPerWorkgroup
          )
        }
      });

      // Set up error handling
      this.device.addEventListener('uncapturederror', (event) => {
        console.error('[WebGPU] Uncaptured error:', event.error);
      });

      return this.device;
    } catch (error) {
      console.error('[WebGPU] Device request failed:', error);
      return null;
    }
  }

  /**
   * Perform complete validation of WebGPU capabilities.
   * This is the main entry point for capability checking.
   * 
   * @returns {Promise<GPUValidationResult>} Comprehensive validation result
   */
  async validate() {
    /** @type {GPUValidationResult} */
    const result = {
      supported: false,
      meetsRequirements: false,
      limits: {},
      features: {},
      warnings: [],
      errors: [],
      device: null,
      adapter: null
    };

    // Check WebGPU support
    if (!this.isWebGPUSupported()) {
      result.errors.push('WebGPU is not supported in this environment');
      this.lastValidation = result;
      return result;
    }

    result.supported = true;

    // Request adapter
    const adapter = await this.requestAdapter();
    if (!adapter) {
      result.errors.push('Failed to request GPU adapter');
      this.lastValidation = result;
      return result;
    }

    result.adapter = adapter;

    // Validate limits
    const { results, errors, warnings } = this.validateLimits(adapter);
    result.limits = results;
    result.errors.push(...errors);
    result.warnings.push(...warnings);

    // Check optional features
    result.features = this.checkOptionalFeatures(adapter);

    // Determine if requirements are met
    result.meetsRequirements = result.errors.length === 0;

    // Request device if requirements are met
    if (result.meetsRequirements) {
      const device = await this.requestDevice(adapter);
      if (device) {
        result.device = device;
      } else {
        result.errors.push('Failed to request GPU device');
        result.meetsRequirements = false;
      }
    }

    this.lastValidation = result;
    return result;
  }

  /**
   * Get a human-readable report of validation results.
   * 
   * @param {GPUValidationResult} result - Validation result
   * @returns {string} Formatted report
   */
  generateReport(result) {
    const lines = [];
    
    lines.push('=== WebGPU Capability Report ===\n');
    
    lines.push(`WebGPU Supported: ${result.supported ? 'YES' : 'NO'}`);
    lines.push(`Meets Requirements: ${result.meetsRequirements ? 'YES' : 'NO'}\n`);

    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      result.errors.forEach(error => lines.push(`  ❌ ${error}`));
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('WARNINGS:');
      result.warnings.forEach(warning => lines.push(`  ⚠️  ${warning}`));
      lines.push('');
    }

    if (Object.keys(result.limits).length > 0) {
      lines.push('LIMITS:');
      for (const [limit, passes] of Object.entries(result.limits)) {
        const status = passes ? '✓' : '✗';
        lines.push(`  ${status} ${limit}`);
      }
      lines.push('');
    }

    if (Object.keys(result.features).length > 0) {
      lines.push('OPTIONAL FEATURES:');
      for (const [feature, available] of Object.entries(result.features)) {
        const status = available ? '✓' : '○';
        lines.push(`  ${status} ${feature}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Clean up GPU resources.
   */
  destroy() {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    this.lastValidation = null;
  }
}

/**
 * Singleton validator instance for application-wide use.
 * 
 * @type {WebGPULimitsValidator}
 */
let validatorInstance = null;

/**
 * Get or create the singleton validator instance.
 * 
 * @returns {WebGPULimitsValidator} Validator instance
 */
export function getValidator() {
  if (!validatorInstance) {
    validatorInstance = new WebGPULimitsValidator();
  }
  return validatorInstance;
}

/**
 * Convenience function to validate WebGPU capabilities.
 * 
 * @returns {Promise<GPUValidationResult>} Validation result
 */
export async function validateWebGPU() {
  const validator = getValidator();
  return await validator.validate();
}

/**
 * Quick check if WebGPU meets Harmony requirements.
 * Caches result for subsequent calls.
 * 
 * @returns {Promise<boolean>} True if requirements are met
 */
export async function checkWebGPUCompatibility() {
  const validator = getValidator();
  
  // Return cached result if available
  if (validator.lastValidation !== null) {
    return validator.lastValidation.meetsRequirements;
  }

  const result = await validator.validate();
  return result.meetsRequirements;
}

/**
 * Export requirements for external reference.
 */
export { HARMONY_GPU_REQUIREMENTS, OPTIONAL_FEATURES };