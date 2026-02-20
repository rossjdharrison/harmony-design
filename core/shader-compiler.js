/**
 * @fileoverview Compute Shader Compilation Pipeline
 * @module core/shader-compiler
 * 
 * Compiles WGSL compute shaders into WebGPU compute pipelines with caching,
 * validation, and error reporting. Integrates with WebGPU device initialization.
 * 
 * Performance targets:
 * - Compilation: < 50ms per shader
 * - Cache lookup: < 1ms
 * - Memory overhead: < 5MB for cache
 * 
 * Related docs: DESIGN_SYSTEM.md § GPU-First Audio Processing
 */

import { WebGPUDevice } from './webgpu-device.js';
import { EventBus } from './event-bus.js';

/**
 * @typedef {Object} ShaderCompilationResult
 * @property {GPUComputePipeline} pipeline - Compiled compute pipeline
 * @property {GPUBindGroupLayout} bindGroupLayout - Bind group layout
 * @property {string} hash - Cache key hash
 * @property {number} compilationTime - Time taken to compile in ms
 */

/**
 * @typedef {Object} ShaderDescriptor
 * @property {string} code - WGSL shader source code
 * @property {string} entryPoint - Entry point function name (default: "main")
 * @property {Object.<string, any>} [constants] - Pipeline constants
 * @property {string} [label] - Debug label for the pipeline
 */

/**
 * @typedef {Object} ShaderValidationError
 * @property {string} message - Error message
 * @property {number} [line] - Line number where error occurred
 * @property {number} [column] - Column number where error occurred
 * @property {string} [snippet] - Code snippet around error
 */

/**
 * Compute Shader Compilation Pipeline
 * 
 * Manages compilation, validation, and caching of WebGPU compute shaders.
 * Integrates with the EventBus for error reporting and lifecycle events.
 * 
 * @class ShaderCompiler
 */
export class ShaderCompiler {
  /**
   * @private
   * @type {Map<string, ShaderCompilationResult>}
   */
  #cache = new Map();

  /**
   * @private
   * @type {WebGPUDevice}
   */
  #deviceManager = null;

  /**
   * @private
   * @type {EventBus}
   */
  #eventBus = null;

  /**
   * @private
   * @type {boolean}
   */
  #initialized = false;

  /**
   * Maximum cache size in number of compiled pipelines
   * @private
   * @type {number}
   */
  #maxCacheSize = 100;

  /**
   * Statistics for monitoring and debugging
   * @private
   * @type {Object}
   */
  #stats = {
    compilations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    totalCompilationTime: 0
  };

  /**
   * Initialize the shader compiler
   * 
   * @param {EventBus} eventBus - Event bus instance for event publishing
   * @returns {Promise<void>}
   */
  async initialize(eventBus) {
    if (this.#initialized) {
      console.warn('[ShaderCompiler] Already initialized');
      return;
    }

    this.#eventBus = eventBus;
    this.#deviceManager = new WebGPUDevice();
    
    try {
      await this.#deviceManager.initialize();
      this.#initialized = true;

      this.#eventBus.publish({
        type: 'ShaderCompiler.Initialized',
        payload: {
          timestamp: performance.now(),
          maxCacheSize: this.#maxCacheSize
        }
      });

      console.log('[ShaderCompiler] Initialized successfully');
    } catch (error) {
      this.#stats.errors++;
      this.#eventBus.publish({
        type: 'ShaderCompiler.InitializationFailed',
        payload: {
          error: error.message,
          timestamp: performance.now()
        }
      });
      throw new Error(`Failed to initialize shader compiler: ${error.message}`);
    }
  }

  /**
   * Compile a compute shader into a pipeline
   * 
   * @param {ShaderDescriptor} descriptor - Shader descriptor
   * @returns {Promise<ShaderCompilationResult>}
   * @throws {Error} If compilation fails or device not initialized
   */
  async compile(descriptor) {
    if (!this.#initialized) {
      throw new Error('ShaderCompiler not initialized. Call initialize() first.');
    }

    const startTime = performance.now();
    
    // Validate descriptor
    this.#validateDescriptor(descriptor);

    // Generate cache key
    const cacheKey = this.#generateCacheKey(descriptor);

    // Check cache
    if (this.#cache.has(cacheKey)) {
      this.#stats.cacheHits++;
      const cached = this.#cache.get(cacheKey);
      
      this.#eventBus.publish({
        type: 'ShaderCompiler.CacheHit',
        payload: {
          hash: cacheKey,
          label: descriptor.label,
          timestamp: performance.now()
        }
      });

      return cached;
    }

    this.#stats.cacheMisses++;

    try {
      // Compile shader module
      const device = this.#deviceManager.getDevice();
      const shaderModule = device.createShaderModule({
        label: descriptor.label ? `${descriptor.label}_module` : 'compute_shader_module',
        code: descriptor.code
      });

      // Check for compilation errors
      const compilationInfo = await shaderModule.getCompilationInfo();
      if (compilationInfo.messages.length > 0) {
        this.#handleCompilationMessages(compilationInfo.messages, descriptor);
      }

      // Create pipeline layout (auto layout for simplicity, can be explicit if needed)
      const pipeline = device.createComputePipeline({
        label: descriptor.label || 'compute_pipeline',
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: descriptor.entryPoint || 'main',
          constants: descriptor.constants
        }
      });

      // Get bind group layout
      const bindGroupLayout = pipeline.getBindGroupLayout(0);

      const compilationTime = performance.now() - startTime;
      
      const result = {
        pipeline,
        bindGroupLayout,
        hash: cacheKey,
        compilationTime
      };

      // Add to cache
      this.#addToCache(cacheKey, result);

      // Update stats
      this.#stats.compilations++;
      this.#stats.totalCompilationTime += compilationTime;

      this.#eventBus.publish({
        type: 'ShaderCompiler.CompilationSuccess',
        payload: {
          hash: cacheKey,
          label: descriptor.label,
          compilationTime,
          timestamp: performance.now()
        }
      });

      console.log(`[ShaderCompiler] Compiled shader "${descriptor.label || 'unnamed'}" in ${compilationTime.toFixed(2)}ms`);

      return result;

    } catch (error) {
      this.#stats.errors++;
      
      const validationError = this.#parseCompilationError(error, descriptor);
      
      this.#eventBus.publish({
        type: 'ShaderCompiler.CompilationError',
        payload: {
          label: descriptor.label,
          error: validationError,
          timestamp: performance.now()
        }
      });

      console.error('[ShaderCompiler] Compilation failed:', validationError);
      throw new Error(`Shader compilation failed: ${validationError.message}`);
    }
  }

  /**
   * Compile multiple shaders in parallel
   * 
   * @param {ShaderDescriptor[]} descriptors - Array of shader descriptors
   * @returns {Promise<ShaderCompilationResult[]>}
   */
  async compileMany(descriptors) {
    return Promise.all(descriptors.map(desc => this.compile(desc)));
  }

  /**
   * Clear the shader cache
   * 
   * @param {string} [hash] - Optional specific hash to clear, clears all if omitted
   */
  clearCache(hash) {
    if (hash) {
      this.#cache.delete(hash);
      console.log(`[ShaderCompiler] Cleared cache entry: ${hash}`);
    } else {
      const size = this.#cache.size;
      this.#cache.clear();
      console.log(`[ShaderCompiler] Cleared entire cache (${size} entries)`);
    }

    this.#eventBus?.publish({
      type: 'ShaderCompiler.CacheCleared',
      payload: {
        hash: hash || 'all',
        timestamp: performance.now()
      }
    });
  }

  /**
   * Get compilation statistics
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.#stats,
      cacheSize: this.#cache.size,
      averageCompilationTime: this.#stats.compilations > 0 
        ? this.#stats.totalCompilationTime / this.#stats.compilations 
        : 0,
      cacheHitRate: (this.#stats.cacheHits + this.#stats.cacheMisses) > 0
        ? this.#stats.cacheHits / (this.#stats.cacheHits + this.#stats.cacheMisses)
        : 0
    };
  }

  /**
   * Check if a shader is cached
   * 
   * @param {ShaderDescriptor} descriptor - Shader descriptor
   * @returns {boolean}
   */
  isCached(descriptor) {
    const cacheKey = this.#generateCacheKey(descriptor);
    return this.#cache.has(cacheKey);
  }

  /**
   * Get the WebGPU device manager
   * 
   * @returns {WebGPUDevice}
   */
  getDeviceManager() {
    return this.#deviceManager;
  }

  /**
   * Validate shader descriptor
   * 
   * @private
   * @param {ShaderDescriptor} descriptor
   * @throws {Error} If descriptor is invalid
   */
  #validateDescriptor(descriptor) {
    if (!descriptor || typeof descriptor !== 'object') {
      throw new Error('Shader descriptor must be an object');
    }

    if (!descriptor.code || typeof descriptor.code !== 'string') {
      throw new Error('Shader descriptor must have a "code" property with WGSL source');
    }

    if (descriptor.code.trim().length === 0) {
      throw new Error('Shader code cannot be empty');
    }

    if (descriptor.entryPoint && typeof descriptor.entryPoint !== 'string') {
      throw new Error('Entry point must be a string');
    }

    if (descriptor.constants && typeof descriptor.constants !== 'object') {
      throw new Error('Constants must be an object');
    }
  }

  /**
   * Generate cache key from shader descriptor
   * 
   * @private
   * @param {ShaderDescriptor} descriptor
   * @returns {string} Cache key hash
   */
  #generateCacheKey(descriptor) {
    const parts = [
      descriptor.code,
      descriptor.entryPoint || 'main',
      JSON.stringify(descriptor.constants || {})
    ];
    
    // Simple hash function (for production, consider using a proper hash like SHA-256)
    const str = parts.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `shader_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Add compiled pipeline to cache with LRU eviction
   * 
   * @private
   * @param {string} key - Cache key
   * @param {ShaderCompilationResult} result - Compilation result
   */
  #addToCache(key, result) {
    // LRU eviction: if cache is full, remove oldest entry
    if (this.#cache.size >= this.#maxCacheSize) {
      const firstKey = this.#cache.keys().next().value;
      this.#cache.delete(firstKey);
      console.log(`[ShaderCompiler] Cache full, evicted: ${firstKey}`);
    }

    this.#cache.set(key, result);
  }

  /**
   * Handle compilation messages (warnings, errors, info)
   * 
   * @private
   * @param {GPUCompilationMessage[]} messages
   * @param {ShaderDescriptor} descriptor
   */
  #handleCompilationMessages(messages, descriptor) {
    for (const message of messages) {
      const logData = {
        type: message.type,
        message: message.message,
        line: message.lineNum,
        linePos: message.linePos,
        label: descriptor.label
      };

      if (message.type === 'error') {
        console.error('[ShaderCompiler] Compilation error:', logData);
      } else if (message.type === 'warning') {
        console.warn('[ShaderCompiler] Compilation warning:', logData);
      } else {
        console.info('[ShaderCompiler] Compilation info:', logData);
      }

      this.#eventBus.publish({
        type: 'ShaderCompiler.CompilationMessage',
        payload: {
          ...logData,
          timestamp: performance.now()
        }
      });
    }
  }

  /**
   * Parse compilation error into structured format
   * 
   * @private
   * @param {Error} error
   * @param {ShaderDescriptor} descriptor
   * @returns {ShaderValidationError}
   */
  #parseCompilationError(error, descriptor) {
    const message = error.message || 'Unknown compilation error';
    
    // Try to extract line/column info from error message
    const lineMatch = message.match(/line[:\s]+(\d+)/i);
    const columnMatch = message.match(/column[:\s]+(\d+)/i);
    
    const validationError = {
      message
    };

    if (lineMatch) {
      validationError.line = parseInt(lineMatch[1], 10);
    }

    if (columnMatch) {
      validationError.column = parseInt(columnMatch[1], 10);
    }

    // Extract code snippet if we have line number
    if (validationError.line) {
      const lines = descriptor.code.split('\n');
      const errorLine = validationError.line - 1;
      const start = Math.max(0, errorLine - 2);
      const end = Math.min(lines.length, errorLine + 3);
      
      validationError.snippet = lines
        .slice(start, end)
        .map((line, idx) => {
          const lineNum = start + idx + 1;
          const marker = lineNum === validationError.line ? '> ' : '  ';
          return `${marker}${lineNum}: ${line}`;
        })
        .join('\n');
    }

    return validationError;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.clearCache();
    this.#initialized = false;
    
    this.#eventBus?.publish({
      type: 'ShaderCompiler.Destroyed',
      payload: {
        stats: this.getStats(),
        timestamp: performance.now()
      }
    });

    console.log('[ShaderCompiler] Destroyed');
  }
}

/**
 * Singleton instance
 * @type {ShaderCompiler|null}
 */
let instance = null;

/**
 * Get or create the shader compiler singleton
 * 
 * @param {EventBus} [eventBus] - Event bus instance (required on first call)
 * @returns {Promise<ShaderCompiler>}
 */
export async function getShaderCompiler(eventBus) {
  if (!instance) {
    if (!eventBus) {
      throw new Error('EventBus required to initialize ShaderCompiler');
    }
    instance = new ShaderCompiler();
    await instance.initialize(eventBus);
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetShaderCompiler() {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}