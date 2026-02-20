/**
 * @fileoverview WASM loader for harmony-sound/domains/signal-graph module
 * @module signal-graph-bridge/wasm-loader
 * 
 * Handles loading and initialization of the signal-graph WASM module.
 * See DESIGN_SYSTEM.md § Signal Graph Bridge for architecture overview.
 * 
 * Performance constraints:
 * - Initial load: <200ms (MANDATORY RULE: Load Budget)
 * - Memory: <50MB heap (MANDATORY RULE: Memory Budget)
 */

/**
 * WASM module state
 * @type {WebAssembly.Instance | null}
 */
let wasmInstance = null;

/**
 * WASM memory view
 * @type {WebAssembly.Memory | null}
 */
let wasmMemory = null;

/**
 * Module initialization promise (singleton pattern)
 * @type {Promise<WebAssembly.Instance> | null}
 */
let initPromise = null;

/**
 * Load and initialize the signal-graph WASM module
 * @param {string} wasmPath - Path to the .wasm file
 * @returns {Promise<WebAssembly.Instance>} Initialized WASM instance
 * @throws {Error} If loading fails or memory budget exceeded
 */
export async function loadSignalGraphWasm(wasmPath = '/wasm/signal-graph.wasm') {
  // Singleton pattern - return existing instance if already loaded
  if (wasmInstance) {
    return wasmInstance;
  }

  // Return existing init promise if loading in progress
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const startTime = performance.now();

    try {
      // Fetch WASM binary
      const response = await fetch(wasmPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM module: ${response.status} ${response.statusText}`);
      }

      const wasmBytes = await response.arrayBuffer();

      // Create memory with budget constraints (50MB max)
      const MEMORY_PAGES = 768; // 768 pages * 64KB = 48MB (under 50MB budget)
      wasmMemory = new WebAssembly.Memory({
        initial: MEMORY_PAGES,
        maximum: MEMORY_PAGES,
        shared: false
      });

      // Import object for WASM module
      const importObject = {
        env: {
          memory: wasmMemory,
          abort: (msg, file, line, column) => {
            console.error(`WASM abort: ${msg} at ${file}:${line}:${column}`);
            throw new Error('WASM module aborted');
          }
        }
      };

      // Instantiate WASM module
      const { instance } = await WebAssembly.instantiate(wasmBytes, importObject);
      wasmInstance = instance;

      // Verify load time budget
      const loadTime = performance.now() - startTime;
      if (loadTime > 200) {
        console.warn(`WASM load time ${loadTime.toFixed(2)}ms exceeds 200ms budget`);
      }

      console.log(`Signal graph WASM loaded in ${loadTime.toFixed(2)}ms`);
      return instance;

    } catch (error) {
      initPromise = null; // Reset on failure to allow retry
      throw new Error(`Failed to load signal-graph WASM: ${error.message}`);
    }
  })();

  return initPromise;
}

/**
 * Get the current WASM instance
 * @returns {WebAssembly.Instance | null} Current instance or null if not loaded
 */
export function getWasmInstance() {
  return wasmInstance;
}

/**
 * Get WASM memory view
 * @returns {WebAssembly.Memory | null} Memory object or null if not loaded
 */
export function getWasmMemory() {
  return wasmMemory;
}

/**
 * Reset WASM instance (for testing/cleanup)
 * @internal
 */
export function resetWasmInstance() {
  wasmInstance = null;
  wasmMemory = null;
  initPromise = null;
}

/**
 * Check if WASM module is loaded
 * @returns {boolean} True if loaded and ready
 */
export function isWasmLoaded() {
  return wasmInstance !== null;
}