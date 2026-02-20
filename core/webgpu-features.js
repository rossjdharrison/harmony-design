/**
 * @fileoverview WebGPU Feature Detection Utilities
 * @module core/webgpu-features
 * 
 * Provides helper functions for checking WebGPU feature availability
 * and compatibility. Used throughout the system to gracefully degrade
 * or provide fallbacks when advanced features are unavailable.
 * 
 * Related: DESIGN_SYSTEM.md § WebGPU Feature Detection
 */

import { webgpuDevice } from './webgpu-device.js';

/**
 * Common WebGPU optional features that Harmony may use
 */
export const WEBGPU_FEATURES = {
  // Texture compression formats
  TEXTURE_COMPRESSION_BC: 'texture-compression-bc',
  TEXTURE_COMPRESSION_ETC2: 'texture-compression-etc2',
  TEXTURE_COMPRESSION_ASTC: 'texture-compression-astc',
  
  // Depth/stencil formats
  DEPTH32_FLOAT_STENCIL8: 'depth32float-stencil8',
  DEPTH24_UNORM_STENCIL8: 'depth24unorm-stencil8',
  
  // Shader features
  SHADER_F16: 'shader-f16',
  
  // Timestamp queries
  TIMESTAMP_QUERY: 'timestamp-query',
  
  // Other features
  INDIRECT_FIRST_INSTANCE: 'indirect-first-instance',
  RG11B10_UFLOAT_RENDERABLE: 'rg11b10ufloat-renderable',
  BGRA8_UNORM_STORAGE: 'bgra8unorm-storage',
  FLOAT32_FILTERABLE: 'float32-filterable'
};

/**
 * Check if WebGPU is supported in the current environment
 * @returns {boolean}
 */
export function isWebGPUSupported() {
  return 'gpu' in navigator;
}

/**
 * Check if a specific feature is available
 * @param {string} feature - Feature name from WEBGPU_FEATURES
 * @returns {boolean}
 */
export function hasFeature(feature) {
  return webgpuDevice.hasFeature(feature);
}

/**
 * Check if any texture compression format is available
 * @returns {boolean}
 */
export function hasTextureCompression() {
  return (
    hasFeature(WEBGPU_FEATURES.TEXTURE_COMPRESSION_BC) ||
    hasFeature(WEBGPU_FEATURES.TEXTURE_COMPRESSION_ETC2) ||
    hasFeature(WEBGPU_FEATURES.TEXTURE_COMPRESSION_ASTC)
  );
}

/**
 * Get the best available texture compression format
 * @returns {string|null} Feature name or null if none available
 */
export function getBestTextureCompressionFormat() {
  if (hasFeature(WEBGPU_FEATURES.TEXTURE_COMPRESSION_BC)) {
    return WEBGPU_FEATURES.TEXTURE_COMPRESSION_BC;
  }
  if (hasFeature(WEBGPU_FEATURES.TEXTURE_COMPRESSION_ETC2)) {
    return WEBGPU_FEATURES.TEXTURE_COMPRESSION_ETC2;
  }
  if (hasFeature(WEBGPU_FEATURES.TEXTURE_COMPRESSION_ASTC)) {
    return WEBGPU_FEATURES.TEXTURE_COMPRESSION_ASTC;
  }
  return null;
}

/**
 * Check if timestamp queries are available for performance profiling
 * @returns {boolean}
 */
export function hasTimestampQuery() {
  return hasFeature(WEBGPU_FEATURES.TIMESTAMP_QUERY);
}

/**
 * Check if 16-bit float shader operations are available
 * @returns {boolean}
 */
export function hasShaderF16() {
  return hasFeature(WEBGPU_FEATURES.SHADER_F16);
}

/**
 * Get a report of all available features
 * @returns {Object} Map of feature names to availability
 */
export function getFeatureReport() {
  const report = {};
  for (const [key, feature] of Object.entries(WEBGPU_FEATURES)) {
    report[key] = hasFeature(feature);
  }
  return report;
}

/**
 * Check if device meets minimum requirements for Harmony
 * @returns {Object} { meets: boolean, missing: string[] }
 */
export function checkMinimumRequirements() {
  const caps = webgpuDevice.getCapabilities();
  
  if (!caps) {
    return { meets: false, missing: ['Device not initialized'] };
  }

  const missing = [];
  const limits = caps.limits;

  // Check critical limits for audio processing
  if (limits.maxStorageBufferBindingSize < 128 * 1024 * 1024) { // 128MB
    missing.push('maxStorageBufferBindingSize too small for audio buffers');
  }

  if (limits.maxComputeWorkgroupStorageSize < 16384) {
    missing.push('maxComputeWorkgroupStorageSize too small for audio processing');
  }

  if (limits.maxComputeInvocationsPerWorkgroup < 256) {
    missing.push('maxComputeInvocationsPerWorkgroup too small');
  }

  return {
    meets: missing.length === 0,
    missing
  };
}

/**
 * Log feature detection results to console
 */
export function logFeatureReport() {
  if (!isWebGPUSupported()) {
    console.warn('WebGPU is not supported in this browser');
    return;
  }

  const caps = webgpuDevice.getCapabilities();
  if (!caps) {
    console.warn('WebGPU device not initialized. Call webgpuDevice.initialize() first.');
    return;
  }

  console.group('WebGPU Feature Report');
  console.log('Adapter:', caps.adapterInfo);
  console.log('Supported Features:', caps.features);
  
  const requirements = checkMinimumRequirements();
  console.log('Minimum Requirements:', requirements.meets ? '✓ Met' : '✗ Not Met');
  if (!requirements.meets) {
    console.warn('Missing Requirements:', requirements.missing);
  }

  console.log('Texture Compression:', hasTextureCompression() ? '✓ Available' : '✗ Not Available');
  console.log('Timestamp Queries:', hasTimestampQuery() ? '✓ Available' : '✗ Not Available');
  console.log('Shader F16:', hasShaderF16() ? '✓ Available' : '✗ Not Available');
  
  console.groupEnd();
}