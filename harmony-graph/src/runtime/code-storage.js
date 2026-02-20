/**
 * @fileoverview Graph code storage and serialization implementation
 * @see docs/graph-code-storage-format.md
 * @module harmony-graph/runtime/code-storage
 */

/**
 * Code storage manager for graph nodes
 */
export class CodeStorage {
  constructor() {
    /** @type {Map<string, object>} */
    this.compilationCache = new Map();
    
    /** @type {string} */
    this.version = "1.0.0";
  }

  /**
   * Create ES module code entry
   * @param {string} source - Module source code
   * @param {string[]} exports - Exported identifiers
   * @param {Array<{specifier: string, imports: string[], default?: string}>} imports - Import specs
   * @returns {object} ES module code object
   */
  createESModule(source, exports = [], imports = []) {
    return {
      type: "es-module",
      source,
      exports,
      imports,
      hash: this._computeHash(source)
    };
  }

  /**
   * Create code property entry
   * @param {string} body - Function body
   * @param {Array<{name: string, type: string, optional: boolean, default?: any}>} params - Parameters
   * @param {string} returnType - Return type
   * @param {boolean} [isAsync=false] - Whether function is async
   * @param {boolean} [isPure=true] - Whether function is pure
   * @returns {object} Code property object
   */
  createCodeProperty(body, params, returnType, isAsync = false, isPure = true) {
    return {
      type: "code-property",
      body,
      params,
      returnType,
      async: isAsync,
      pure: isPure
    };
  }

  /**
   * Create computed expression entry
   * @param {string} expression - JavaScript expression
   * @param {string[]} dependencies - Dependency paths
   * @param {boolean} [cached=true] - Whether to cache result
   * @param {number} [debounce] - Debounce delay in ms
   * @returns {object} Computed expression object
   */
  createComputedExpression(expression, dependencies, cached = true, debounce) {
    return {
      type: "computed-expression",
      expression,
      dependencies,
      cached,
      ...(debounce !== undefined && { debounce })
    };
  }

  /**
   * Serialize node code to JSON
   * @param {object} nodeCode - Node code object
   * @param {object} [options] - Serialization options
   * @returns {string} JSON string
   */
  serialize(nodeCode, options = {}) {
    const serializable = this._makeSerializable(nodeCode);
    return JSON.stringify(serializable, null, options.minify ? 0 : 2);
  }

  /**
   * Deserialize node code from JSON
   * @param {string} json - JSON string
   * @returns {object} Node code object
   */
  deserialize(json) {
    const parsed = JSON.parse(json);
    return this._restoreFromSerializable(parsed);
  }

  /**
   * Validate node code structure
   * @param {object} nodeCode - Node code to validate
   * @returns {{valid: boolean, errors: Array<{message: string, severity: string}>}}
   */
  validate(nodeCode) {
    const errors = [];

    if (!nodeCode.metadata || !nodeCode.metadata.version) {
      errors.push({
        message: "Missing or invalid metadata.version",
        severity: "error"
      });
    }

    if (nodeCode.modules) {
      for (const [name, module] of Object.entries(nodeCode.modules)) {
        if (module.type !== "es-module") {
          errors.push({
            message: `Module ${name} has invalid type: ${module.type}`,
            severity: "error"
          });
        }
        if (!module.source || typeof module.source !== "string") {
          errors.push({
            message: `Module ${name} missing or invalid source`,
            severity: "error"
          });
        }
      }
    }

    if (nodeCode.properties) {
      for (const [name, prop] of Object.entries(nodeCode.properties)) {
        if (prop.type !== "code-property") {
          errors.push({
            message: `Property ${name} has invalid type: ${prop.type}`,
            severity: "error"
          });
        }
        if (!prop.body || typeof prop.body !== "string") {
          errors.push({
            message: `Property ${name} missing or invalid body`,
            severity: "error"
          });
        }
      }
    }

    if (nodeCode.computed) {
      for (const [name, expr] of Object.entries(nodeCode.computed)) {
        if (expr.type !== "computed-expression") {
          errors.push({
            message: `Computed ${name} has invalid type: ${expr.type}`,
            severity: "error"
          });
        }
        if (!expr.expression || typeof expr.expression !== "string") {
          errors.push({
            message: `Computed ${name} missing or invalid expression`,
            severity: "error"
          });
        }
      }
    }

    return {
      valid: errors.filter(e => e.severity === "error").length === 0,
      errors
    };
  }

  /**
   * Get compilation cache key
   * @param {string} source - Source code
   * @returns {string} Cache key
   * @private
   */
  _getCacheKey(source) {
    return this._computeHash(source);
  }

  /**
   * Compute SHA-256 hash of source code
   * @param {string} source - Source code
   * @returns {string} Hex-encoded hash
   * @private
   */
  _computeHash(source) {
    // Simple hash for now - in production, use crypto.subtle.digest
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  /**
   * Convert Maps to plain objects for serialization
   * @param {object} nodeCode - Node code with Maps
   * @returns {object} Serializable object
   * @private
   */
  _makeSerializable(nodeCode) {
    const result = {
      metadata: nodeCode.metadata
    };

    if (nodeCode.modules) {
      result.modules = nodeCode.modules instanceof Map
        ? Object.fromEntries(nodeCode.modules)
        : nodeCode.modules;
    }

    if (nodeCode.properties) {
      result.properties = nodeCode.properties instanceof Map
        ? Object.fromEntries(nodeCode.properties)
        : nodeCode.properties;
    }

    if (nodeCode.computed) {
      result.computed = nodeCode.computed instanceof Map
        ? Object.fromEntries(nodeCode.computed)
        : nodeCode.computed;
    }

    return result;
  }

  /**
   * Restore Maps from serialized objects
   * @param {object} serialized - Serialized node code
   * @returns {object} Node code with Maps
   * @private
   */
  _restoreFromSerializable(serialized) {
    const result = {
      metadata: serialized.metadata
    };

    if (serialized.modules) {
      result.modules = new Map(Object.entries(serialized.modules));
    }

    if (serialized.properties) {
      result.properties = new Map(Object.entries(serialized.properties));
    }

    if (serialized.computed) {
      result.computed = new Map(Object.entries(serialized.computed));
    }

    return result;
  }

  /**
   * Clear compilation cache
   */
  clearCache() {
    this.compilationCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {{size: number, hits: number, misses: number}}
   */
  getCacheStats() {
    return {
      size: this.compilationCache.size,
      hits: this._cacheHits || 0,
      misses: this._cacheMisses || 0
    };
  }
}

/**
 * Default code storage instance
 * @type {CodeStorage}
 */
export const codeStorage = new CodeStorage();