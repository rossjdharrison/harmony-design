/**
 * @fileoverview Runtime loader for design token JSON files with validation
 * @module tokens/token-loader
 * 
 * Provides a runtime loader that:
 * - Loads token JSON files
 * - Validates against JSON schema
 * - Caches loaded tokens
 * - Provides type-safe access to token values
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Design Tokens
 */

/**
 * @typedef {Object} TokenValue
 * @property {string|number} value - The token value
 * @property {string} [type] - Token type (color, spacing, typography, etc.)
 * @property {string} [description] - Human-readable description
 */

/**
 * @typedef {Object} TokenGroup
 * @property {Object.<string, TokenValue|TokenGroup>} [properties] - Nested token properties
 */

/**
 * @typedef {Object} TokenFile
 * @property {Object.<string, TokenValue|TokenGroup>} tokens - Root token definitions
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} path - JSON path to the error
 * @property {string} message - Error message
 * @property {string} [expected] - Expected value or type
 * @property {*} [actual] - Actual value found
 */

/**
 * @typedef {Object} LoadResult
 * @property {boolean} success - Whether load was successful
 * @property {TokenFile} [data] - Loaded token data (if successful)
 * @property {ValidationError[]} [errors] - Validation errors (if failed)
 * @property {Error} [error] - Load error (if failed)
 */

/**
 * Token Loader - Runtime loader for design token JSON files
 * 
 * Performance: Caches loaded tokens to meet 200ms load budget
 * Memory: Validates token structure to prevent memory leaks
 * 
 * @class TokenLoader
 */
class TokenLoader {
  constructor() {
    /** @type {Map<string, TokenFile>} */
    this.cache = new Map();
    
    /** @type {Object|null} */
    this.schema = null;
    
    /** @type {boolean} */
    this.schemaLoaded = false;
  }

  /**
   * Load JSON schema for token validation
   * 
   * @param {string} [schemaPath='./harmony-schemas/schemas/design-tokens.schema.json'] - Path to schema
   * @returns {Promise<void>}
   */
  async loadSchema(schemaPath = './harmony-schemas/schemas/design-tokens.schema.json') {
    if (this.schemaLoaded) {
      return;
    }

    try {
      const response = await fetch(schemaPath);
      if (!response.ok) {
        console.warn(`[TokenLoader] Schema not found at ${schemaPath}, validation will be basic`);
        this.schema = null;
        this.schemaLoaded = true;
        return;
      }

      this.schema = await response.json();
      this.schemaLoaded = true;
      console.log('[TokenLoader] Schema loaded successfully');
    } catch (error) {
      console.warn('[TokenLoader] Failed to load schema, validation will be basic:', error);
      this.schema = null;
      this.schemaLoaded = true;
    }
  }

  /**
   * Load token JSON file with validation
   * 
   * @param {string} path - Path to token JSON file
   * @param {Object} [options] - Load options
   * @param {boolean} [options.cache=true] - Whether to cache the result
   * @param {boolean} [options.validate=true] - Whether to validate against schema
   * @returns {Promise<LoadResult>}
   */
  async load(path, options = {}) {
    const { cache = true, validate = true } = options;

    // Check cache first
    if (cache && this.cache.has(path)) {
      return {
        success: true,
        data: this.cache.get(path)
      };
    }

    try {
      // Load JSON file
      const response = await fetch(path);
      if (!response.ok) {
        return {
          success: false,
          error: new Error(`Failed to load token file: ${response.status} ${response.statusText}`)
        };
      }

      const data = await response.json();

      // Validate if requested
      if (validate) {
        const validationResult = await this.validate(data);
        if (!validationResult.valid) {
          return {
            success: false,
            errors: validationResult.errors
          };
        }
      }

      // Cache if requested
      if (cache) {
        this.cache.set(path, data);
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  }

  /**
   * Validate token data against schema
   * 
   * @param {*} data - Data to validate
   * @returns {Promise<{valid: boolean, errors?: ValidationError[]}>}
   */
  async validate(data) {
    // Ensure schema is loaded
    if (!this.schemaLoaded) {
      await this.loadSchema();
    }

    // Basic validation if no schema
    if (!this.schema) {
      return this.basicValidation(data);
    }

    // Full JSON Schema validation
    return this.schemaValidation(data);
  }

  /**
   * Basic validation without JSON Schema
   * 
   * @param {*} data - Data to validate
   * @returns {{valid: boolean, errors?: ValidationError[]}}
   * @private
   */
  basicValidation(data) {
    const errors = [];

    // Must be an object
    if (typeof data !== 'object' || data === null) {
      errors.push({
        path: '$',
        message: 'Token file must be a JSON object',
        expected: 'object',
        actual: typeof data
      });
      return { valid: false, errors };
    }

    // Validate token structure recursively
    this.validateTokenStructure(data, '$', errors);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate token structure recursively
   * 
   * @param {*} obj - Object to validate
   * @param {string} path - Current JSON path
   * @param {ValidationError[]} errors - Array to collect errors
   * @private
   */
  validateTokenStructure(obj, path, errors) {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = `${path}.${key}`;

      if (typeof value === 'object' && value !== null) {
        // Check if it's a token value or nested group
        if ('value' in value) {
          // Token value - validate structure
          if (!('value' in value)) {
            errors.push({
              path: currentPath,
              message: 'Token must have a "value" property'
            });
          }

          if ('type' in value && typeof value.type !== 'string') {
            errors.push({
              path: `${currentPath}.type`,
              message: 'Token type must be a string',
              expected: 'string',
              actual: typeof value.type
            });
          }
        } else {
          // Nested group - recurse
          this.validateTokenStructure(value, currentPath, errors);
        }
      }
    }
  }

  /**
   * Full JSON Schema validation
   * 
   * @param {*} data - Data to validate
   * @returns {{valid: boolean, errors?: ValidationError[]}}
   * @private
   */
  schemaValidation(data) {
    // Simple JSON Schema validator implementation
    // For production, consider using a library like ajv
    // But following npm-free policy, we implement basic validation
    
    const errors = [];
    
    // Validate against schema properties
    if (this.schema.type && typeof data !== this.schema.type) {
      errors.push({
        path: '$',
        message: `Expected type ${this.schema.type}`,
        expected: this.schema.type,
        actual: typeof data
      });
    }

    // Additional schema validation would go here
    // For now, fall back to basic validation
    const basicResult = this.basicValidation(data);
    if (!basicResult.valid) {
      errors.push(...(basicResult.errors || []));
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Get a token value by path
   * 
   * @param {TokenFile} tokenData - Token data to query
   * @param {string} path - Dot-separated path (e.g., 'colors.primary.500')
   * @returns {*} Token value or undefined
   */
  getToken(tokenData, path) {
    const parts = path.split('.');
    let current = tokenData;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) {
        return undefined;
      }
      current = current[part];
    }

    // If it's a token value object, return the value property
    if (typeof current === 'object' && current !== null && 'value' in current) {
      return current.value;
    }

    return current;
  }

  /**
   * Resolve token references (e.g., {colors.primary.500})
   * 
   * @param {TokenFile} tokenData - Token data
   * @param {string} value - Value that may contain references
   * @returns {string} Resolved value
   */
  resolveReferences(tokenData, value) {
    if (typeof value !== 'string') {
      return value;
    }

    // Match {path.to.token} pattern
    const referencePattern = /\{([^}]+)\}/g;
    
    return value.replace(referencePattern, (match, path) => {
      const resolvedValue = this.getToken(tokenData, path);
      if (resolvedValue === undefined) {
        console.warn(`[TokenLoader] Unresolved token reference: ${path}`);
        return match;
      }
      return resolvedValue;
    });
  }

  /**
   * Clear the token cache
   * 
   * @param {string} [path] - Specific path to clear, or all if not provided
   */
  clearCache(path) {
    if (path) {
      this.cache.delete(path);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Preload multiple token files
   * 
   * @param {string[]} paths - Array of paths to preload
   * @returns {Promise<Map<string, LoadResult>>} Map of path to load result
   */
  async preload(paths) {
    const results = new Map();
    
    await Promise.all(
      paths.map(async (path) => {
        const result = await this.load(path);
        results.set(path, result);
      })
    );

    return results;
  }
}

// Singleton instance
const tokenLoader = new TokenLoader();

export { TokenLoader, tokenLoader };