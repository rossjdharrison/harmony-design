/**
 * @fileoverview WASMCallback - Registry for JS callbacks that WASM can invoke
 * @module bounded-contexts/wasm-bridge/wasm-callback
 * 
 * Provides a bidirectional callback system allowing WASM modules to invoke
 * JavaScript functions during execution. Manages callback registration,
 * lifecycle, and safe invocation across the JS/WASM boundary.
 * 
 * Performance constraints:
 * - Callback lookup: O(1) constant time
 * - Memory overhead: <1KB per 100 callbacks
 * - Invocation latency: <0.1ms per call
 * 
 * Related documentation: DESIGN_SYSTEM.md § WASM Bridge Architecture
 */

/**
 * @typedef {Object} CallbackDescriptor
 * @property {Function} fn - The callback function
 * @property {string} name - Human-readable name for debugging
 * @property {number} registeredAt - Timestamp of registration
 * @property {number} invocationCount - Number of times invoked
 * @property {boolean} persistent - Whether callback survives WASM reloads
 */

/**
 * @typedef {Object} CallbackInvocation
 * @property {number} callbackId - ID of the callback invoked
 * @property {Array<*>} args - Arguments passed to callback
 * @property {number} timestamp - When invocation occurred
 * @property {*} result - Return value from callback
 * @property {Error|null} error - Error if invocation failed
 */

/**
 * Registry and manager for WASM-invokable JavaScript callbacks
 * 
 * Handles the complete lifecycle of callbacks that WASM modules can invoke:
 * - Registration with unique IDs
 * - Safe invocation with error handling
 * - Automatic cleanup on WASM reload
 * - Performance monitoring and debugging
 * 
 * @class WASMCallback
 */
export class WASMCallback {
  constructor() {
    /** @type {Map<number, CallbackDescriptor>} */
    this.callbacks = new Map();
    
    /** @type {number} */
    this.nextCallbackId = 1;
    
    /** @type {Array<CallbackInvocation>} */
    this.invocationHistory = [];
    
    /** @type {number} */
    this.maxHistorySize = 1000;
    
    /** @type {boolean} */
    this.debugMode = false;
    
    /** @type {Set<number>} */
    this.persistentCallbacks = new Set();
  }

  /**
   * Register a JavaScript callback that WASM can invoke
   * 
   * @param {Function} fn - The callback function to register
   * @param {string} [name='anonymous'] - Human-readable name for debugging
   * @param {boolean} [persistent=false] - Whether callback survives WASM reloads
   * @returns {number} Unique callback ID for WASM to use
   * 
   * @example
   * const callbackId = wasmCallback.register(
   *   (nodeId) => console.log('Node processed:', nodeId),
   *   'onNodeProcessed',
   *   true
   * );
   */
  register(fn, name = 'anonymous', persistent = false) {
    if (typeof fn !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    const callbackId = this.nextCallbackId++;
    
    const descriptor = {
      fn,
      name,
      registeredAt: performance.now(),
      invocationCount: 0,
      persistent
    };

    this.callbacks.set(callbackId, descriptor);
    
    if (persistent) {
      this.persistentCallbacks.add(callbackId);
    }

    if (this.debugMode) {
      console.log(`[WASMCallback] Registered callback ${callbackId}: ${name}`);
    }

    return callbackId;
  }

  /**
   * Unregister a callback by ID
   * 
   * @param {number} callbackId - The callback ID to unregister
   * @returns {boolean} True if callback was found and removed
   * 
   * @example
   * wasmCallback.unregister(callbackId);
   */
  unregister(callbackId) {
    const existed = this.callbacks.delete(callbackId);
    this.persistentCallbacks.delete(callbackId);
    
    if (this.debugMode && existed) {
      console.log(`[WASMCallback] Unregistered callback ${callbackId}`);
    }
    
    return existed;
  }

  /**
   * Invoke a registered callback from WASM
   * 
   * This method is called by WASM modules to execute JavaScript callbacks.
   * Handles error catching, performance tracking, and history logging.
   * 
   * @param {number} callbackId - The callback ID to invoke
   * @param {...*} args - Arguments to pass to the callback
   * @returns {*} The callback's return value
   * @throws {Error} If callback not found or invocation fails
   * 
   * @example
   * // From WASM side (via imports):
   * // invoke_callback(callbackId, arg1, arg2)
   * const result = wasmCallback.invoke(callbackId, nodeId, edgeCount);
   */
  invoke(callbackId, ...args) {
    const descriptor = this.callbacks.get(callbackId);
    
    if (!descriptor) {
      const error = new Error(`Callback ${callbackId} not found`);
      this._logInvocation(callbackId, args, null, error);
      throw error;
    }

    const startTime = performance.now();
    let result = null;
    let error = null;

    try {
      result = descriptor.fn(...args);
      descriptor.invocationCount++;
      
      const duration = performance.now() - startTime;
      if (duration > 1.0 && this.debugMode) {
        console.warn(
          `[WASMCallback] Slow callback ${callbackId} (${descriptor.name}): ${duration.toFixed(2)}ms`
        );
      }
    } catch (err) {
      error = err;
      console.error(`[WASMCallback] Error in callback ${callbackId} (${descriptor.name}):`, err);
      throw err;
    } finally {
      this._logInvocation(callbackId, args, result, error);
    }

    return result;
  }

  /**
   * Clear all non-persistent callbacks
   * 
   * Called when WASM module is reloaded to clean up temporary callbacks.
   * Persistent callbacks are retained.
   * 
   * @example
   * wasmCallback.clearNonPersistent();
   */
  clearNonPersistent() {
    const toDelete = [];
    
    for (const [id, descriptor] of this.callbacks.entries()) {
      if (!descriptor.persistent) {
        toDelete.push(id);
      }
    }
    
    toDelete.forEach(id => this.callbacks.delete(id));
    
    if (this.debugMode) {
      console.log(`[WASMCallback] Cleared ${toDelete.length} non-persistent callbacks`);
    }
  }

  /**
   * Clear all callbacks including persistent ones
   * 
   * @example
   * wasmCallback.clearAll();
   */
  clearAll() {
    const count = this.callbacks.size;
    this.callbacks.clear();
    this.persistentCallbacks.clear();
    
    if (this.debugMode) {
      console.log(`[WASMCallback] Cleared all ${count} callbacks`);
    }
  }

  /**
   * Get statistics about registered callbacks
   * 
   * @returns {Object} Statistics object
   * 
   * @example
   * const stats = wasmCallback.getStats();
   * console.log(`Total callbacks: ${stats.totalCallbacks}`);
   */
  getStats() {
    let totalInvocations = 0;
    
    for (const descriptor of this.callbacks.values()) {
      totalInvocations += descriptor.invocationCount;
    }
    
    return {
      totalCallbacks: this.callbacks.size,
      persistentCallbacks: this.persistentCallbacks.size,
      totalInvocations,
      historySize: this.invocationHistory.length
    };
  }

  /**
   * Get information about a specific callback
   * 
   * @param {number} callbackId - The callback ID to inspect
   * @returns {CallbackDescriptor|null} Callback descriptor or null if not found
   * 
   * @example
   * const info = wasmCallback.getCallbackInfo(callbackId);
   * if (info) {
   *   console.log(`Callback ${info.name} invoked ${info.invocationCount} times`);
   * }
   */
  getCallbackInfo(callbackId) {
    return this.callbacks.get(callbackId) || null;
  }

  /**
   * Get recent invocation history
   * 
   * @param {number} [limit=100] - Maximum number of entries to return
   * @returns {Array<CallbackInvocation>} Recent invocations
   * 
   * @example
   * const recent = wasmCallback.getInvocationHistory(10);
   * recent.forEach(inv => console.log(`Callback ${inv.callbackId} at ${inv.timestamp}`));
   */
  getInvocationHistory(limit = 100) {
    return this.invocationHistory.slice(-limit);
  }

  /**
   * Enable or disable debug mode
   * 
   * @param {boolean} enabled - Whether to enable debug logging
   * 
   * @example
   * wasmCallback.setDebugMode(true);
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`[WASMCallback] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Log an invocation to history
   * 
   * @private
   * @param {number} callbackId - The callback ID
   * @param {Array<*>} args - Arguments passed
   * @param {*} result - Return value
   * @param {Error|null} error - Error if any
   */
  _logInvocation(callbackId, args, result, error) {
    const invocation = {
      callbackId,
      args,
      timestamp: performance.now(),
      result,
      error
    };

    this.invocationHistory.push(invocation);

    // Trim history if too large
    if (this.invocationHistory.length > this.maxHistorySize) {
      this.invocationHistory.shift();
    }

    if (this.debugMode) {
      const descriptor = this.callbacks.get(callbackId);
      const name = descriptor ? descriptor.name : 'unknown';
      console.log(`[WASMCallback] Invoked ${callbackId} (${name})`, {
        args,
        result,
        error: error ? error.message : null
      });
    }
  }

  /**
   * Create a wrapper function that can be passed to WASM imports
   * 
   * Returns a function that WASM can call directly, which internally
   * routes to the registered callback system.
   * 
   * @returns {Function} Wrapper function for WASM imports
   * 
   * @example
   * const wasmImports = {
   *   env: {
   *     invoke_callback: wasmCallback.createImportWrapper()
   *   }
   * };
   */
  createImportWrapper() {
    return (callbackId, ...args) => {
      return this.invoke(callbackId, ...args);
    };
  }

  /**
   * Register multiple callbacks at once
   * 
   * @param {Object<string, Function>} callbacks - Map of name -> function
   * @param {boolean} [persistent=false] - Whether callbacks are persistent
   * @returns {Object<string, number>} Map of name -> callback ID
   * 
   * @example
   * const ids = wasmCallback.registerBatch({
   *   onNodeProcessed: (id) => console.log('Node:', id),
   *   onEdgeTraversed: (from, to) => console.log('Edge:', from, to)
   * }, true);
   */
  registerBatch(callbacks, persistent = false) {
    const ids = {};
    
    for (const [name, fn] of Object.entries(callbacks)) {
      ids[name] = this.register(fn, name, persistent);
    }
    
    return ids;
  }
}

/**
 * Singleton instance for global use
 * @type {WASMCallback}
 */
export const wasmCallback = new WASMCallback();

// Expose to window for WASM bridge access
if (typeof window !== 'undefined') {
  window.wasmCallback = wasmCallback;
}