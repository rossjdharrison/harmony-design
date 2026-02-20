/**
 * @fileoverview WASM Resource Monitor - Monitors WASM module resource usage
 * @module security/wasm-resource-monitor
 * 
 * Integrates with WebAssembly instances to monitor memory and CPU usage.
 * Provides hooks for ResourceLimitsEnforcer to track WASM execution.
 * 
 * Related: security/resource-limits-enforcer.js, bounded-contexts/wasm-bridge/wasm-bridge.js
 * Documentation: harmony-design/DESIGN_SYSTEM.md#wasm-resource-monitoring
 */

import { globalResourceLimits } from './resource-limits-enforcer.js';

/**
 * @typedef {Object} WasmMemoryInfo
 * @property {number} currentBytes - Current memory usage in bytes
 * @property {number} maxBytes - Maximum memory available
 * @property {number} pageSize - Memory page size (typically 64KB)
 * @property {number} pages - Number of allocated pages
 */

/**
 * Monitor resource usage for WASM modules
 */
export class WasmResourceMonitor {
  /**
   * @param {ResourceLimitsEnforcer} [enforcer] - Resource limits enforcer to use
   */
  constructor(enforcer = globalResourceLimits) {
    this.enforcer = enforcer;

    /** @type {Map<string, WebAssembly.Instance>} */
    this.instances = new Map();

    /** @type {Map<string, number>} */
    this.startTimes = new Map();

    /** @type {Map<string, number>} */
    this.lastMemoryUpdate = new Map();
  }

  /**
   * Register a WASM instance for monitoring
   * @param {string} executionId - Unique execution ID
   * @param {WebAssembly.Instance} instance - WASM instance
   * @returns {void}
   */
  registerInstance(executionId, instance) {
    this.instances.set(executionId, instance);
    this.startTimes.set(executionId, performance.now());

    // Start monitoring with enforcer
    this.enforcer.startMonitoring(executionId, {
      terminate: () => this.terminateInstance(executionId),
      abort: () => this.terminateInstance(executionId)
    });

    // Initial memory check
    this.updateMemory(executionId);
  }

  /**
   * Unregister a WASM instance
   * @param {string} executionId - Execution ID
   * @returns {void}
   */
  unregisterInstance(executionId) {
    this.enforcer.stopMonitoring(executionId);
    this.instances.delete(executionId);
    this.startTimes.delete(executionId);
    this.lastMemoryUpdate.delete(executionId);
  }

  /**
   * Update memory usage for a WASM instance
   * @param {string} executionId - Execution ID
   * @returns {WasmMemoryInfo|null}
   */
  updateMemory(executionId) {
    const instance = this.instances.get(executionId);
    if (!instance || !instance.exports.memory) {
      return null;
    }

    const memory = instance.exports.memory;
    const memoryInfo = this.getMemoryInfo(memory);

    // Update enforcer
    this.enforcer.updateMemoryUsage(executionId, memoryInfo.currentBytes);
    this.lastMemoryUpdate.set(executionId, performance.now());

    return memoryInfo;
  }

  /**
   * Update CPU time for a WASM instance
   * @param {string} executionId - Execution ID
   * @returns {number} CPU time in milliseconds
   */
  updateCpuTime(executionId) {
    const startTime = this.startTimes.get(executionId);
    if (startTime === undefined) return 0;

    const cpuTime = performance.now() - startTime;
    this.enforcer.updateCpuTime(executionId, cpuTime);

    return cpuTime;
  }

  /**
   * Get memory information from WebAssembly.Memory
   * @param {WebAssembly.Memory} memory - WASM memory object
   * @returns {WasmMemoryInfo}
   */
  getMemoryInfo(memory) {
    const buffer = memory.buffer;
    const pageSize = 65536; // 64KB per page
    const currentBytes = buffer.byteLength;
    const pages = currentBytes / pageSize;

    // Get max from memory descriptor if available
    let maxBytes = currentBytes;
    try {
      // Memory.grow() throws if max is reached, use that to estimate
      const descriptor = Object.getOwnPropertyDescriptor(memory, 'buffer');
      if (descriptor && descriptor.value) {
        maxBytes = descriptor.value.maxByteLength || currentBytes;
      }
    } catch (e) {
      // Fallback to current size
    }

    return {
      currentBytes,
      maxBytes,
      pageSize,
      pages
    };
  }

  /**
   * Terminate a WASM instance
   * @param {string} executionId - Execution ID
   * @returns {void}
   */
  terminateInstance(executionId) {
    const instance = this.instances.get(executionId);
    if (!instance) return;

    console.warn(`[WasmResourceMonitor] Terminating WASM instance: ${executionId}`);

    // Call abort function if available
    if (instance.exports.abort && typeof instance.exports.abort === 'function') {
      try {
        instance.exports.abort();
      } catch (e) {
        console.error('[WasmResourceMonitor] Error calling abort:', e);
      }
    }

    this.unregisterInstance(executionId);
  }

  /**
   * Create monitoring wrapper for WASM function calls
   * @param {string} executionId - Execution ID
   * @param {Function} wasmFunction - WASM function to wrap
   * @returns {Function} Wrapped function with monitoring
   */
  wrapFunction(executionId, wasmFunction) {
    return (...args) => {
      // Update CPU time before call
      this.updateCpuTime(executionId);

      // Execute function
      const result = wasmFunction(...args);

      // Update memory and CPU after call
      this.updateMemory(executionId);
      this.updateCpuTime(executionId);

      return result;
    };
  }

  /**
   * Wrap all exported functions of a WASM instance
   * @param {string} executionId - Execution ID
   * @param {WebAssembly.Instance} instance - WASM instance
   * @returns {Object} Wrapped exports
   */
  wrapExports(executionId, instance) {
    const wrappedExports = {};

    for (const [name, value] of Object.entries(instance.exports)) {
      if (typeof value === 'function') {
        wrappedExports[name] = this.wrapFunction(executionId, value);
      } else {
        wrappedExports[name] = value;
      }
    }

    return wrappedExports;
  }

  /**
   * Get current resource usage
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Resource usage info
   */
  getUsage(executionId) {
    const enforcerUsage = this.enforcer.getUsage(executionId);
    if (!enforcerUsage) return null;

    const instance = this.instances.get(executionId);
    const memoryInfo = instance && instance.exports.memory
      ? this.getMemoryInfo(instance.exports.memory)
      : null;

    return {
      ...enforcerUsage,
      memoryInfo
    };
  }
}

/**
 * Global WASM resource monitor instance
 * @type {WasmResourceMonitor}
 */
export const globalWasmMonitor = new WasmResourceMonitor();