/**
 * @fileoverview Hot-reload system for WebGPU shaders during development.
 * Monitors shader files for changes and automatically recompiles and updates pipelines.
 * 
 * @module core/gpu/shader-hot-reload
 * @see DESIGN_SYSTEM.md#gpu-shader-compilation
 */

import { EventBus } from '../event-bus.js';

/**
 * @typedef {Object} HotReloadConfig
 * @property {number} pollInterval - Polling interval in milliseconds (default: 1000)
 * @property {boolean} autoReload - Whether to auto-reload on change (default: true)
 * @property {Array<string>} watchPaths - Paths to watch for changes
 */

/**
 * @typedef {Object} ReloadEvent
 * @property {string} name - Shader name
 * @property {string} path - Shader file path
 * @property {string} source - New shader source
 * @property {number} timestamp - Reload timestamp
 */

/**
 * Hot-reload manager for shader development workflow.
 * Only active in development mode.
 */
export class ShaderHotReload {
  /**
   * @param {import('./shader-loader.js').ShaderLoader} loader - Shader loader instance
   * @param {import('./shader-compiler.js').ShaderCompiler} compiler - Shader compiler instance
   * @param {HotReloadConfig} config - Hot-reload configuration
   */
  constructor(loader, compiler, config = {}) {
    /** @private @type {import('./shader-loader.js').ShaderLoader} */
    this.loader = loader;
    
    /** @private @type {import('./shader-compiler.js').ShaderCompiler} */
    this.compiler = compiler;
    
    /** @private @type {HotReloadConfig} */
    this.config = {
      pollInterval: config.pollInterval || 1000,
      autoReload: config.autoReload !== false,
      watchPaths: config.watchPaths || []
    };
    
    /** @private @type {Map<string, string>} */
    this.lastSources = new Map();
    
    /** @private @type {number|null} */
    this.pollTimerId = null;
    
    /** @private @type {boolean} */
    this.isWatching = false;
    
    /** @private @type {EventBus} */
    this.eventBus = new EventBus();
  }

  /**
   * Starts watching shader files for changes.
   * 
   * @returns {void}
   */
  start() {
    if (this.isWatching) {
      console.warn('[ShaderHotReload] Already watching for changes');
      return;
    }

    // Store initial shader sources
    for (const name of this.loader.listShaders()) {
      const shader = this.loader.getShader(name);
      if (shader) {
        this.lastSources.set(name, shader.source);
      }
    }

    // Start polling for changes
    this.pollTimerId = setInterval(() => {
      this._checkForChanges();
    }, this.config.pollInterval);

    this.isWatching = true;
    console.log(`[ShaderHotReload] Started watching shaders (poll interval: ${this.config.pollInterval}ms)`);
  }

  /**
   * Stops watching shader files.
   * 
   * @returns {void}
   */
  stop() {
    if (!this.isWatching) {
      return;
    }

    if (this.pollTimerId !== null) {
      clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }

    this.isWatching = false;
    console.log('[ShaderHotReload] Stopped watching shaders');
  }

  /**
   * Manually reloads a shader from its source path.
   * 
   * @param {string} name - Shader identifier
   * @returns {Promise<boolean>} True if reload succeeded
   */
  async reload(name) {
    const shader = this.loader.getShader(name);
    if (!shader) {
      console.error(`[ShaderHotReload] Shader "${name}" not found`);
      return false;
    }

    try {
      // Reload shader source
      const reloaded = await this.loader.load(name, shader.path);
      
      // Check if source changed
      const oldSource = this.lastSources.get(name);
      if (oldSource === reloaded.source) {
        console.log(`[ShaderHotReload] Shader "${name}" unchanged, skipping recompile`);
        return true;
      }

      // Recompile shader
      const metadata = this.compiler.getMetadata(name);
      if (!metadata) {
        console.error(`[ShaderHotReload] Metadata for shader "${name}" not found`);
        return false;
      }

      const result = this.compiler.compile(name, reloaded.source, metadata);
      
      if (result.success) {
        this.lastSources.set(name, reloaded.source);
        
        // Publish reload event
        const reloadEvent = {
          name,
          path: shader.path,
          source: reloaded.source,
          timestamp: Date.now()
        };
        
        this.eventBus.publish('shader:reloaded', reloadEvent);
        
        console.log(`[ShaderHotReload] Successfully reloaded shader "${name}"`);
        return true;
      } else {
        console.error(`[ShaderHotReload] Failed to recompile shader "${name}":`, result.error);
        return false;
      }

    } catch (error) {
      console.error(`[ShaderHotReload] Failed to reload shader "${name}":`, error);
      return false;
    }
  }

  /**
   * Subscribes to shader reload events.
   * 
   * @param {function(ReloadEvent): void} callback - Event callback
   * @returns {function(): void} Unsubscribe function
   */
  onReload(callback) {
    return this.eventBus.subscribe('shader:reloaded', callback);
  }

  /**
   * Checks all watched shaders for changes.
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _checkForChanges() {
    const shaderNames = this.loader.listShaders();
    
    for (const name of shaderNames) {
      const shader = this.loader.getShader(name);
      if (!shader) continue;

      // Only check shaders in watch paths
      if (this.config.watchPaths.length > 0) {
        const inWatchPath = this.config.watchPaths.some(watchPath => 
          shader.path.startsWith(watchPath)
        );
        if (!inWatchPath) continue;
      }

      try {
        // Fetch current source
        const response = await fetch(shader.path, { cache: 'no-store' });
        if (!response.ok) continue;

        const currentSource = await response.text();
        const lastSource = this.lastSources.get(name);

        // Check if source changed
        if (lastSource !== currentSource) {
          console.log(`[ShaderHotReload] Detected change in shader "${name}"`);
          
          if (this.config.autoReload) {
            await this.reload(name);
          } else {
            // Just notify, don't reload
            this.eventBus.publish('shader:changed', {
              name,
              path: shader.path,
              timestamp: Date.now()
            });
          }
        }

      } catch (error) {
        // Silently ignore fetch errors during polling
      }
    }
  }

  /**
   * Gets the current watching status.
   * 
   * @returns {boolean} True if watching
   */
  isActive() {
    return this.isWatching;
  }
}