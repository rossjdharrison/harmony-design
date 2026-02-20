/**
 * @fileoverview Shader loader for loading WGSL shaders from files and URLs.
 * Supports both static loading and dynamic hot-reload during development.
 * 
 * @module core/gpu/shader-loader
 * @see DESIGN_SYSTEM.md#gpu-shader-compilation
 */

/**
 * @typedef {Object} LoadedShader
 * @property {string} name - Shader identifier
 * @property {string} source - WGSL source code
 * @property {string} path - Original file path or URL
 * @property {number} loadTime - Time taken to load in milliseconds
 */

/**
 * Loads WGSL shader files from filesystem or network.
 */
export class ShaderLoader {
  constructor() {
    /** @private @type {Map<string, LoadedShader>} */
    this.loadedShaders = new Map();
    
    /** @private @type {Map<string, string>} */
    this.pathToName = new Map();
  }

  /**
   * Loads a shader from a URL or file path.
   * 
   * @param {string} name - Unique identifier for the shader
   * @param {string} path - URL or file path to WGSL shader
   * @returns {Promise<LoadedShader>} Loaded shader data
   * @throws {Error} If loading fails
   */
  async load(name, path) {
    const startTime = performance.now();

    try {
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const source = await response.text();
      const loadTime = performance.now() - startTime;

      const loadedShader = {
        name,
        source,
        path,
        loadTime
      };

      this.loadedShaders.set(name, loadedShader);
      this.pathToName.set(path, name);

      console.log(`[ShaderLoader] Loaded shader "${name}" from "${path}" in ${loadTime.toFixed(2)}ms`);

      return loadedShader;

    } catch (error) {
      console.error(`[ShaderLoader] Failed to load shader "${name}" from "${path}":`, error);
      throw new Error(`Failed to load shader "${name}": ${error.message}`);
    }
  }

  /**
   * Loads multiple shaders in parallel.
   * 
   * @param {Array<{name: string, path: string}>} shaders - Array of shader definitions
   * @returns {Promise<Array<LoadedShader>>} Array of loaded shaders
   */
  async loadBatch(shaders) {
    const loadPromises = shaders.map(({ name, path }) => this.load(name, path));
    return Promise.all(loadPromises);
  }

  /**
   * Retrieves a loaded shader by name.
   * 
   * @param {string} name - Shader identifier
   * @returns {LoadedShader|null} Loaded shader or null
   */
  getShader(name) {
    return this.loadedShaders.get(name) || null;
  }

  /**
   * Retrieves shader name by file path.
   * 
   * @param {string} path - File path
   * @returns {string|null} Shader name or null
   */
  getNameByPath(path) {
    return this.pathToName.get(path) || null;
  }

  /**
   * Checks if a shader is loaded.
   * 
   * @param {string} name - Shader identifier
   * @returns {boolean} True if shader is loaded
   */
  hasShader(name) {
    return this.loadedShaders.has(name);
  }

  /**
   * Lists all loaded shader names.
   * 
   * @returns {Array<string>} Array of shader names
   */
  listShaders() {
    return Array.from(this.loadedShaders.keys());
  }

  /**
   * Clears all loaded shaders from cache.
   */
  clear() {
    this.loadedShaders.clear();
    this.pathToName.clear();
    console.log('[ShaderLoader] Cleared all loaded shaders');
  }
}