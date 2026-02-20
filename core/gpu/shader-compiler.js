/**
 * @fileoverview WebGPU shader compiler with validation and error reporting.
 * Compiles WGSL shaders, validates them, and provides detailed error messages.
 * Part of the GPU-First Audio architecture.
 * 
 * @module core/gpu/shader-compiler
 * @see DESIGN_SYSTEM.md#gpu-shader-compilation
 */

/**
 * @typedef {Object} ShaderCompilationResult
 * @property {boolean} success - Whether compilation succeeded
 * @property {GPUShaderModule|null} module - Compiled shader module (null on failure)
 * @property {string|null} error - Error message (null on success)
 * @property {Array<string>} warnings - Compilation warnings
 * @property {number} compilationTime - Time taken to compile in milliseconds
 */

/**
 * @typedef {Object} ShaderMetadata
 * @property {string} name - Shader identifier
 * @property {string} entryPoint - Entry point function name
 * @property {string} stage - Shader stage ('compute', 'vertex', 'fragment')
 * @property {Object<string, any>} bindGroupLayouts - Expected bind group layouts
 */

/**
 * Compiles and manages WebGPU shaders with validation and error reporting.
 */
export class ShaderCompiler {
  /**
   * @param {GPUDevice} device - WebGPU device for shader compilation
   */
  constructor(device) {
    /** @private @type {GPUDevice} */
    this.device = device;
    
    /** @private @type {Map<string, GPUShaderModule>} */
    this.compiledShaders = new Map();
    
    /** @private @type {Map<string, ShaderMetadata>} */
    this.shaderMetadata = new Map();
    
    /** @private @type {Map<string, string>} */
    this.shaderSources = new Map();
  }

  /**
   * Compiles a WGSL shader module with validation.
   * 
   * @param {string} name - Unique identifier for the shader
   * @param {string} source - WGSL shader source code
   * @param {ShaderMetadata} metadata - Shader metadata
   * @returns {ShaderCompilationResult} Compilation result
   */
  compile(name, source, metadata) {
    const startTime = performance.now();
    const warnings = [];

    try {
      // Validate shader source is not empty
      if (!source || source.trim().length === 0) {
        return {
          success: false,
          module: null,
          error: 'Shader source is empty',
          warnings,
          compilationTime: performance.now() - startTime
        };
      }

      // Basic WGSL syntax validation
      const syntaxValidation = this._validateSyntax(source);
      if (!syntaxValidation.valid) {
        return {
          success: false,
          module: null,
          error: `Syntax error: ${syntaxValidation.error}`,
          warnings,
          compilationTime: performance.now() - startTime
        };
      }
      warnings.push(...syntaxValidation.warnings);

      // Compile shader module
      const shaderModule = this.device.createShaderModule({
        label: name,
        code: source
      });

      // Check for compilation errors via getCompilationInfo (async, but we'll handle sync)
      // Note: In production, use async version for better error reporting
      
      // Store compiled shader and metadata
      this.compiledShaders.set(name, shaderModule);
      this.shaderMetadata.set(name, metadata);
      this.shaderSources.set(name, source);

      const compilationTime = performance.now() - startTime;

      console.log(`[ShaderCompiler] Compiled shader "${name}" in ${compilationTime.toFixed(2)}ms`);

      return {
        success: true,
        module: shaderModule,
        error: null,
        warnings,
        compilationTime
      };

    } catch (error) {
      const compilationTime = performance.now() - startTime;
      
      console.error(`[ShaderCompiler] Failed to compile shader "${name}":`, error);

      return {
        success: false,
        module: null,
        error: error.message || 'Unknown compilation error',
        warnings,
        compilationTime
      };
    }
  }

  /**
   * Retrieves a compiled shader module by name.
   * 
   * @param {string} name - Shader identifier
   * @returns {GPUShaderModule|null} Compiled shader module or null
   */
  getShader(name) {
    return this.compiledShaders.get(name) || null;
  }

  /**
   * Retrieves shader metadata by name.
   * 
   * @param {string} name - Shader identifier
   * @returns {ShaderMetadata|null} Shader metadata or null
   */
  getMetadata(name) {
    return this.shaderMetadata.get(name) || null;
  }

  /**
   * Retrieves shader source code by name.
   * 
   * @param {string} name - Shader identifier
   * @returns {string|null} Shader source or null
   */
  getSource(name) {
    return this.shaderSources.get(name) || null;
  }

  /**
   * Removes a compiled shader from cache.
   * 
   * @param {string} name - Shader identifier
   * @returns {boolean} True if shader was removed
   */
  removeShader(name) {
    const hadShader = this.compiledShaders.has(name);
    this.compiledShaders.delete(name);
    this.shaderMetadata.delete(name);
    this.shaderSources.delete(name);
    return hadShader;
  }

  /**
   * Lists all compiled shader names.
   * 
   * @returns {Array<string>} Array of shader names
   */
  listShaders() {
    return Array.from(this.compiledShaders.keys());
  }

  /**
   * Validates WGSL syntax (basic checks).
   * 
   * @private
   * @param {string} source - WGSL source code
   * @returns {{valid: boolean, error: string|null, warnings: Array<string>}} Validation result
   */
  _validateSyntax(source) {
    const warnings = [];

    // Check for required entry point
    if (!source.includes('@compute') && !source.includes('@vertex') && !source.includes('@fragment')) {
      return {
        valid: false,
        error: 'No entry point found (missing @compute, @vertex, or @fragment)',
        warnings
      };
    }

    // Check for balanced braces
    const openBraces = (source.match(/{/g) || []).length;
    const closeBraces = (source.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      return {
        valid: false,
        error: `Unbalanced braces (${openBraces} open, ${closeBraces} close)`,
        warnings
      };
    }

    // Check for balanced parentheses
    const openParens = (source.match(/\(/g) || []).length;
    const closeParens = (source.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return {
        valid: false,
        error: `Unbalanced parentheses (${openParens} open, ${closeParens} close)`,
        warnings
      };
    }

    // Warning: Check for deprecated syntax
    if (source.includes('[[') || source.includes(']]')) {
      warnings.push('Deprecated attribute syntax [[...]] detected, use @... instead');
    }

    return {
      valid: true,
      error: null,
      warnings
    };
  }

  /**
   * Clears all compiled shaders from cache.
   */
  clear() {
    this.compiledShaders.clear();
    this.shaderMetadata.clear();
    this.shaderSources.clear();
    console.log('[ShaderCompiler] Cleared all cached shaders');
  }
}