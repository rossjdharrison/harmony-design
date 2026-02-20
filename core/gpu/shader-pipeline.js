/**
 * @fileoverview Unified shader pipeline combining loading, compilation, and hot-reload.
 * Provides a high-level API for shader management in the Harmony Design System.
 * 
 * @module core/gpu/shader-pipeline
 * @see DESIGN_SYSTEM.md#gpu-shader-compilation
 */

import { ShaderLoader } from './shader-loader.js';
import { ShaderCompiler } from './shader-compiler.js';
import { ShaderHotReload } from './shader-hot-reload.js';

/**
 * @typedef {Object} ShaderPipelineConfig
 * @property {GPUDevice} device - WebGPU device
 * @property {boolean} enableHotReload - Enable hot-reload (default: false)
 * @property {number} hotReloadInterval - Hot-reload poll interval in ms (default: 1000)
 * @property {Array<string>} watchPaths - Paths to watch for hot-reload
 */

/**
 * @typedef {Object} ShaderDefinition
 * @property {string} name - Unique shader identifier
 * @property {string} path - Path to WGSL file
 * @property {string} entryPoint - Entry point function name
 * @property {string} stage - Shader stage ('compute', 'vertex', 'fragment')
 * @property {Object<string, any>} bindGroupLayouts - Expected bind group layouts
 */

/**
 * Unified shader management pipeline.
 * Handles loading, compilation, caching, and hot-reload.
 */
export class ShaderPipeline {
  /**
   * @param {ShaderPipelineConfig} config - Pipeline configuration
   */
  constructor(config) {
    if (!config.device) {
      throw new Error('ShaderPipeline requires a GPUDevice');
    }

    /** @private @type {GPUDevice} */
    this.device = config.device;
    
    /** @private @type {ShaderLoader} */
    this.loader = new ShaderLoader();
    
    /** @private @type {ShaderCompiler} */
    this.compiler = new ShaderCompiler(this.device);
    
    /** @private @type {ShaderHotReload|null} */
    this.hotReload = null;
    
    /** @private @type {boolean} */
    this.enableHotReload = config.enableHotReload || false;

    // Initialize hot-reload if enabled
    if (this.enableHotReload) {
      this.hotReload = new ShaderHotReload(this.loader, this.compiler, {
        pollInterval: config.hotReloadInterval || 1000,
        autoReload: true,
        watchPaths: config.watchPaths || []
      });
    }
  }

  /**
   * Loads and compiles a shader from a file path.
   * 
   * @param {ShaderDefinition} definition - Shader definition
   * @returns {Promise<GPUShaderModule>} Compiled shader module
   * @throws {Error} If loading or compilation fails
   */
  async loadShader(definition) {
    const { name, path, entryPoint, stage, bindGroupLayouts } = definition;

    // Load shader source
    const loaded = await this.loader.load(name, path);

    // Compile shader
    const metadata = {
      name,
      entryPoint,
      stage,
      bindGroupLayouts: bindGroupLayouts || {}
    };

    const result = this.compiler.compile(name, loaded.source, metadata);

    if (!result.success) {
      throw new Error(`Failed to compile shader "${name}": ${result.error}`);
    }

    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn(`[ShaderPipeline] Warnings for shader "${name}":`, result.warnings);
    }

    return result.module;
  }

  /**
   * Loads and compiles multiple shaders in parallel.
   * 
   * @param {Array<ShaderDefinition>} definitions - Array of shader definitions
   * @returns {Promise<Array<GPUShaderModule>>} Array of compiled shader modules
   */
  async loadShaders(definitions) {
    const loadPromises = definitions.map(def => this.loadShader(def));
    return Promise.all(loadPromises);
  }

  /**
   * Retrieves a compiled shader module by name.
   * 
   * @param {string} name - Shader identifier
   * @returns {GPUShaderModule|null} Compiled shader module or null
   */
  getShader(name) {
    return this.compiler.getShader(name);
  }

  /**
   * Retrieves shader metadata by name.
   * 
   * @param {string} name - Shader identifier
   * @returns {import('./shader-compiler.js').ShaderMetadata|null} Shader metadata or null
   */
  getMetadata(name) {
    return this.compiler.getMetadata(name);
  }

  /**
   * Starts hot-reload if enabled.
   * 
   * @returns {void}
   */
  startHotReload() {
    if (!this.hotReload) {
      console.warn('[ShaderPipeline] Hot-reload not enabled');
      return;
    }
    this.hotReload.start();
  }

  /**
   * Stops hot-reload if active.
   * 
   * @returns {void}
   */
  stopHotReload() {
    if (!this.hotReload) {
      return;
    }
    this.hotReload.stop();
  }

  /**
   * Subscribes to shader reload events.
   * 
   * @param {function(import('./shader-hot-reload.js').ReloadEvent): void} callback - Event callback
   * @returns {function(): void} Unsubscribe function
   */
  onShaderReload(callback) {
    if (!this.hotReload) {
      console.warn('[ShaderPipeline] Hot-reload not enabled');
      return () => {};
    }
    return this.hotReload.onReload(callback);
  }

  /**
   * Lists all loaded shader names.
   * 
   * @returns {Array<string>} Array of shader names
   */
  listShaders() {
    return this.compiler.listShaders();
  }

  /**
   * Clears all cached shaders and loaded sources.
   */
  clear() {
    this.compiler.clear();
    this.loader.clear();
    if (this.hotReload) {
      this.hotReload.stop();
    }
    console.log('[ShaderPipeline] Cleared all cached data');
  }

  /**
   * Disposes the pipeline and cleans up resources.
   */
  dispose() {
    this.clear();
    console.log('[ShaderPipeline] Disposed');
  }
}