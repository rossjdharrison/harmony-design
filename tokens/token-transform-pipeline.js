/**
 * @fileoverview Token Transform Pipeline - Transforms raw tokens through resolution steps
 * @module tokens/token-transform-pipeline
 * 
 * Transforms raw design tokens through multiple resolution phases:
 * 1. Reference Resolution - Resolves {token.reference} syntax
 * 2. Math Evaluation - Evaluates calc() expressions
 * 3. Type Coercion - Converts string values to typed values
 * 4. Alias Resolution - Resolves $alias syntax
 * 5. Validation - Ensures final tokens match schema
 * 
 * Performance: O(n*m) where n=tokens, m=max reference depth
 * Memory: O(n) for transformed token cache
 * 
 * @see tokens/token-loader.js - Loads raw tokens
 * @see tokens/token-validator.js - Validates transformed tokens
 * @see DESIGN_SYSTEM.md#token-transform-pipeline
 */

/**
 * Maximum depth for resolving nested token references
 * Prevents infinite loops in circular references
 * @const {number}
 */
const MAX_REFERENCE_DEPTH = 10;

/**
 * Regex pattern for matching token references: {token.path.name}
 * @const {RegExp}
 */
const REFERENCE_PATTERN = /\{([a-zA-Z0-9._-]+)\}/g;

/**
 * Regex pattern for matching alias references: $alias-name
 * @const {RegExp}
 */
const ALIAS_PATTERN = /\$([a-zA-Z0-9._-]+)/g;

/**
 * Regex pattern for matching calc() expressions
 * @const {RegExp}
 */
const CALC_PATTERN = /calc\(([^)]+)\)/g;

/**
 * Transform pipeline configuration
 * @typedef {Object} TransformConfig
 * @property {boolean} [resolveReferences=true] - Enable reference resolution
 * @property {boolean} [evaluateMath=true] - Enable math evaluation
 * @property {boolean} [coerceTypes=true] - Enable type coercion
 * @property {boolean} [resolveAliases=true] - Enable alias resolution
 * @property {boolean} [validate=true] - Enable final validation
 * @property {number} [maxDepth=10] - Maximum reference resolution depth
 */

/**
 * Transform step result
 * @typedef {Object} TransformStepResult
 * @property {Object} tokens - Transformed tokens
 * @property {Array<string>} warnings - Non-fatal warnings
 * @property {Array<string>} errors - Fatal errors
 */

/**
 * Token Transform Pipeline
 * Orchestrates multi-step token transformation process
 */
export class TokenTransformPipeline {
  /**
   * @param {TransformConfig} [config={}] - Pipeline configuration
   */
  constructor(config = {}) {
    this.config = {
      resolveReferences: true,
      evaluateMath: true,
      coerceTypes: true,
      resolveAliases: true,
      validate: true,
      maxDepth: MAX_REFERENCE_DEPTH,
      ...config
    };

    this.warnings = [];
    this.errors = [];
    this.transformCache = new Map();
  }

  /**
   * Transform raw tokens through all pipeline steps
   * @param {Object} rawTokens - Raw token object from JSON
   * @returns {Promise<TransformStepResult>} Transformed tokens with warnings/errors
   */
  async transform(rawTokens) {
    this.warnings = [];
    this.errors = [];
    this.transformCache.clear();

    let tokens = this._deepClone(rawTokens);

    try {
      // Step 1: Resolve aliases first (they may be used in references)
      if (this.config.resolveAliases) {
        tokens = this._resolveAliases(tokens);
      }

      // Step 2: Resolve token references
      if (this.config.resolveReferences) {
        tokens = this._resolveReferences(tokens);
      }

      // Step 3: Evaluate math expressions
      if (this.config.evaluateMath) {
        tokens = this._evaluateMath(tokens);
      }

      // Step 4: Coerce types based on token type
      if (this.config.coerceTypes) {
        tokens = this._coerceTypes(tokens);
      }

      // Step 5: Validate final tokens
      if (this.config.validate) {
        await this._validateTokens(tokens);
      }

      return {
        tokens,
        warnings: this.warnings,
        errors: this.errors
      };
    } catch (error) {
      this.errors.push(`Pipeline failed: ${error.message}`);
      return {
        tokens: rawTokens,
        warnings: this.warnings,
        errors: this.errors
      };
    }
  }

  /**
   * Resolve alias references ($alias-name)
   * @private
   * @param {Object} tokens - Token object
   * @returns {Object} Tokens with aliases resolved
   */
  _resolveAliases(tokens) {
    const aliases = tokens.$aliases || {};
    const resolved = this._deepClone(tokens);

    this._traverseTokens(resolved, (token, path) => {
      if (typeof token.value === 'string') {
        token.value = token.value.replace(ALIAS_PATTERN, (match, aliasName) => {
          if (aliases[aliasName] !== undefined) {
            return aliases[aliasName];
          }
          this.warnings.push(`Unresolved alias: ${aliasName} at ${path}`);
          return match;
        });
      }
    });

    return resolved;
  }

  /**
   * Resolve token references ({token.path})
   * @private
   * @param {Object} tokens - Token object
   * @returns {Object} Tokens with references resolved
   */
  _resolveReferences(tokens) {
    const resolved = this._deepClone(tokens);

    this._traverseTokens(resolved, (token, path) => {
      if (typeof token.value === 'string' && REFERENCE_PATTERN.test(token.value)) {
        token.value = this._resolveValue(token.value, tokens, path, 0);
      }
    });

    return resolved;
  }

  /**
   * Recursively resolve a value with references
   * @private
   * @param {string} value - Value potentially containing references
   * @param {Object} tokens - Full token object for lookups
   * @param {string} currentPath - Current token path (for error reporting)
   * @param {number} depth - Current recursion depth
   * @returns {string} Resolved value
   */
  _resolveValue(value, tokens, currentPath, depth) {
    if (depth >= this.config.maxDepth) {
      this.errors.push(`Max reference depth exceeded at ${currentPath}`);
      return value;
    }

    // Check cache
    const cacheKey = `${value}:${depth}`;
    if (this.transformCache.has(cacheKey)) {
      return this.transformCache.get(cacheKey);
    }

    const resolved = value.replace(REFERENCE_PATTERN, (match, refPath) => {
      const refToken = this._getTokenByPath(tokens, refPath);
      
      if (!refToken) {
        this.errors.push(`Unresolved reference: ${refPath} at ${currentPath}`);
        return match;
      }

      let refValue = refToken.value;

      // Recursively resolve if the referenced value also has references
      if (typeof refValue === 'string' && REFERENCE_PATTERN.test(refValue)) {
        refValue = this._resolveValue(refValue, tokens, refPath, depth + 1);
      }

      return refValue;
    });

    this.transformCache.set(cacheKey, resolved);
    return resolved;
  }

  /**
   * Evaluate math expressions in token values
   * @private
   * @param {Object} tokens - Token object
   * @returns {Object} Tokens with math evaluated
   */
  _evaluateMath(tokens) {
    const evaluated = this._deepClone(tokens);

    this._traverseTokens(evaluated, (token, path) => {
      if (typeof token.value === 'string' && CALC_PATTERN.test(token.value)) {
        token.value = token.value.replace(CALC_PATTERN, (match, expression) => {
          try {
            // Sanitize expression (allow only numbers, operators, spaces, parentheses)
            const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');
            if (sanitized !== expression) {
              this.warnings.push(`Sanitized calc expression at ${path}: ${expression}`);
            }

            // Evaluate using Function constructor (safer than eval)
            const result = new Function(`return ${sanitized}`)();
            return String(result);
          } catch (error) {
            this.errors.push(`Invalid calc expression at ${path}: ${expression}`);
            return match;
          }
        });
      }
    });

    return evaluated;
  }

  /**
   * Coerce string values to appropriate types based on token type
   * @private
   * @param {Object} tokens - Token object
   * @returns {Object} Tokens with coerced types
   */
  _coerceTypes(tokens) {
    const coerced = this._deepClone(tokens);

    this._traverseTokens(coerced, (token, path) => {
      if (!token.type || token.value === null || token.value === undefined) {
        return;
      }

      try {
        switch (token.type) {
          case 'dimension':
          case 'number':
            if (typeof token.value === 'string') {
              const num = parseFloat(token.value);
              if (!isNaN(num)) {
                token.value = num;
              }
            }
            break;

          case 'duration':
            if (typeof token.value === 'string') {
              // Convert duration strings to milliseconds
              const match = token.value.match(/^([\d.]+)(ms|s)$/);
              if (match) {
                const value = parseFloat(match[1]);
                const unit = match[2];
                token.value = unit === 's' ? value * 1000 : value;
              }
            }
            break;

          case 'boolean':
            if (typeof token.value === 'string') {
              token.value = token.value === 'true';
            }
            break;

          case 'color':
            // Keep colors as strings but validate format
            if (typeof token.value === 'string') {
              const validFormats = [
                /^#[0-9A-Fa-f]{3,8}$/,           // Hex
                /^rgb\(/,                         // RGB
                /^rgba\(/,                        // RGBA
                /^hsl\(/,                         // HSL
                /^hsla\(/                         // HSLA
              ];
              const isValid = validFormats.some(pattern => pattern.test(token.value));
              if (!isValid) {
                this.warnings.push(`Invalid color format at ${path}: ${token.value}`);
              }
            }
            break;

          // String types remain as strings
          case 'fontFamily':
          case 'fontWeight':
          case 'cubicBezier':
          case 'strokeStyle':
            // No coercion needed
            break;

          default:
            this.warnings.push(`Unknown token type at ${path}: ${token.type}`);
        }
      } catch (error) {
        this.errors.push(`Type coercion failed at ${path}: ${error.message}`);
      }
    });

    return coerced;
  }

  /**
   * Validate transformed tokens against schema
   * @private
   * @param {Object} tokens - Transformed token object
   * @returns {Promise<void>}
   */
  async _validateTokens(tokens) {
    try {
      // Dynamically import validator to avoid circular dependencies
      const { TokenValidator } = await import('./token-validator.js');
      const validator = new TokenValidator();
      
      const result = await validator.validate(tokens);
      
      if (!result.valid) {
        this.errors.push(...result.errors.map(err => 
          `Validation error: ${err.path} - ${err.message}`
        ));
      }
    } catch (error) {
      this.warnings.push(`Validation skipped: ${error.message}`);
    }
  }

  /**
   * Get token by dot-notation path
   * @private
   * @param {Object} tokens - Token object
   * @param {string} path - Dot-notation path (e.g., "color.primary.500")
   * @returns {Object|null} Token or null if not found
   */
  _getTokenByPath(tokens, path) {
    const parts = path.split('.');
    let current = tokens;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * Traverse all tokens in the object tree
   * @private
   * @param {Object} obj - Token object or subtree
   * @param {Function} callback - Called for each token with (token, path)
   * @param {string} [currentPath=''] - Current path for recursion
   */
  _traverseTokens(obj, callback, currentPath = '') {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      // Skip metadata keys
      if (key.startsWith('$')) {
        continue;
      }

      const path = currentPath ? `${currentPath}.${key}` : key;

      if (value && typeof value === 'object') {
        // Check if this is a token (has value property) or a group
        if ('value' in value) {
          callback(value, path);
        } else {
          // Recurse into group
          this._traverseTokens(value, callback, path);
        }
      }
    }
  }

  /**
   * Deep clone an object
   * @private
   * @param {Object} obj - Object to clone
   * @returns {Object} Cloned object
   */
  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Clear transform cache
   * Call this when tokens are reloaded
   */
  clearCache() {
    this.transformCache.clear();
  }
}

/**
 * Create a transform pipeline with default configuration
 * @returns {TokenTransformPipeline} Pipeline instance
 */
export function createTransformPipeline() {
  return new TokenTransformPipeline();
}

/**
 * Transform tokens using default pipeline
 * Convenience function for one-off transformations
 * @param {Object} rawTokens - Raw token object
 * @returns {Promise<TransformStepResult>} Transformed tokens
 */
export async function transformTokens(rawTokens) {
  const pipeline = createTransformPipeline();
  return pipeline.transform(rawTokens);
}