/**
 * @fileoverview Token Validator - Runtime validation against JSON Schema
 * @module tokens/token-validator
 * 
 * Validates token objects against the token JSON schema at runtime.
 * Provides detailed error messages for debugging token issues.
 * 
 * Performance: Validation occurs once at load time, not per-frame.
 * Memory: Minimal overhead - schema cached, no persistent state.
 * 
 * Related: tokens/token-schema.json, tokens/token-loader.js
 */

/**
 * Validation error with detailed context
 * @typedef {Object} ValidationError
 * @property {string} path - JSON path to the invalid property (e.g., "colors.primary.value")
 * @property {string} message - Human-readable error message
 * @property {string} schemaRule - The schema rule that was violated
 * @property {*} actualValue - The actual value that failed validation
 * @property {*} expectedType - The expected type or constraint
 */

/**
 * Validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {ValidationError[]} errors - Array of validation errors (empty if valid)
 * @property {string[]} warnings - Array of non-critical warnings
 */

/**
 * Token Validator Class
 * Validates token objects against JSON Schema with detailed error reporting
 */
export class TokenValidator {
  /**
   * @param {Object} schema - JSON Schema object for tokens
   */
  constructor(schema) {
    this.schema = schema;
    this.errors = [];
    this.warnings = [];
    this.path = [];
  }

  /**
   * Validate a token object against the schema
   * @param {Object} tokens - Token object to validate
   * @returns {ValidationResult} Validation result with detailed errors
   */
  validate(tokens) {
    this.errors = [];
    this.warnings = [];
    this.path = [];

    if (!tokens || typeof tokens !== 'object') {
      this.addError('$', 'Token object must be a non-null object', 'type', tokens, 'object');
      return this.getResult();
    }

    // Validate root schema
    this.validateObject(tokens, this.schema, '$');

    return this.getResult();
  }

  /**
   * Validate an object against a schema definition
   * @private
   * @param {Object} obj - Object to validate
   * @param {Object} schema - Schema definition
   * @param {string} currentPath - Current path in the object tree
   */
  validateObject(obj, schema, currentPath) {
    // Check required properties
    if (schema.required && Array.isArray(schema.required)) {
      for (const required of schema.required) {
        if (!(required in obj)) {
          this.addError(
            currentPath,
            `Missing required property: ${required}`,
            'required',
            undefined,
            required
          );
        }
      }
    }

    // Validate properties
    if (schema.properties) {
      for (const [key, value] of Object.entries(obj)) {
        const propPath = `${currentPath}.${key}`;
        const propSchema = schema.properties[key];

        if (!propSchema) {
          // Check if additionalProperties is allowed
          if (schema.additionalProperties === false) {
            this.addWarning(propPath, `Unexpected property: ${key}`);
          } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
            this.validateValue(value, schema.additionalProperties, propPath);
          }
          continue;
        }

        this.validateValue(value, propSchema, propPath);
      }
    }

    // Check pattern properties
    if (schema.patternProperties) {
      for (const [pattern, patternSchema] of Object.entries(schema.patternProperties)) {
        const regex = new RegExp(pattern);
        for (const [key, value] of Object.entries(obj)) {
          if (regex.test(key)) {
            const propPath = `${currentPath}.${key}`;
            this.validateValue(value, patternSchema, propPath);
          }
        }
      }
    }
  }

  /**
   * Validate a value against a schema definition
   * @private
   * @param {*} value - Value to validate
   * @param {Object} schema - Schema definition
   * @param {string} currentPath - Current path in the object tree
   */
  validateValue(value, schema, currentPath) {
    // Handle $ref (simplified - assumes local definitions)
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/definitions/', '');
      const refSchema = this.schema.definitions?.[refPath];
      if (refSchema) {
        this.validateValue(value, refSchema, currentPath);
        return;
      } else {
        this.addError(currentPath, `Invalid schema reference: ${schema.$ref}`, 'ref', value, schema.$ref);
        return;
      }
    }

    // Handle oneOf
    if (schema.oneOf) {
      const validSchemas = schema.oneOf.filter(subSchema => {
        const validator = new TokenValidator(this.schema);
        validator.path = [...this.path];
        const tempResult = validator.validateValueInternal(value, subSchema, currentPath);
        return tempResult;
      });

      if (validSchemas.length === 0) {
        this.addError(
          currentPath,
          'Value does not match any of the allowed schemas',
          'oneOf',
          value,
          'one of the defined schemas'
        );
      } else if (validSchemas.length > 1) {
        this.addError(
          currentPath,
          'Value matches multiple schemas (should match exactly one)',
          'oneOf',
          value,
          'exactly one schema'
        );
      }
      return;
    }

    // Validate type
    if (schema.type) {
      if (!this.validateType(value, schema.type, currentPath)) {
        return;
      }
    }

    // Type-specific validations
    if (typeof value === 'string') {
      this.validateString(value, schema, currentPath);
    } else if (typeof value === 'number') {
      this.validateNumber(value, schema, currentPath);
    } else if (Array.isArray(value)) {
      this.validateArray(value, schema, currentPath);
    } else if (typeof value === 'object' && value !== null) {
      this.validateObject(value, schema, currentPath);
    }

    // Validate enum
    if (schema.enum && !schema.enum.includes(value)) {
      this.addError(
        currentPath,
        `Value must be one of: ${schema.enum.join(', ')}`,
        'enum',
        value,
        schema.enum
      );
    }

    // Validate const
    if ('const' in schema && value !== schema.const) {
      this.addError(
        currentPath,
        `Value must be exactly: ${schema.const}`,
        'const',
        value,
        schema.const
      );
    }
  }

  /**
   * Internal validation helper (returns boolean instead of adding errors)
   * @private
   * @param {*} value - Value to validate
   * @param {Object} schema - Schema definition
   * @param {string} currentPath - Current path
   * @returns {boolean} True if valid
   */
  validateValueInternal(value, schema, currentPath) {
    const originalErrors = this.errors.length;
    this.validateValue(value, schema, currentPath);
    const hasNewErrors = this.errors.length > originalErrors;
    
    // Remove errors added by this validation
    if (hasNewErrors) {
      this.errors.splice(originalErrors);
    }
    
    return !hasNewErrors;
  }

  /**
   * Validate type
   * @private
   * @param {*} value - Value to validate
   * @param {string|string[]} type - Expected type(s)
   * @param {string} currentPath - Current path
   * @returns {boolean} True if type is valid
   */
  validateType(value, type, currentPath) {
    const types = Array.isArray(type) ? type : [type];
    const actualType = this.getType(value);

    if (!types.includes(actualType)) {
      this.addError(
        currentPath,
        `Expected type ${types.join(' or ')}, got ${actualType}`,
        'type',
        value,
        types.join(' or ')
      );
      return false;
    }

    return true;
  }

  /**
   * Get JSON Schema type of a value
   * @private
   * @param {*} value - Value to check
   * @returns {string} JSON Schema type name
   */
  getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    return typeof value;
  }

  /**
   * Validate string constraints
   * @private
   * @param {string} value - String value
   * @param {Object} schema - Schema definition
   * @param {string} currentPath - Current path
   */
  validateString(value, schema, currentPath) {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      this.addError(
        currentPath,
        `String length ${value.length} is less than minimum ${schema.minLength}`,
        'minLength',
        value,
        `>= ${schema.minLength} characters`
      );
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      this.addError(
        currentPath,
        `String length ${value.length} exceeds maximum ${schema.maxLength}`,
        'maxLength',
        value,
        `<= ${schema.maxLength} characters`
      );
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        this.addError(
          currentPath,
          `String does not match pattern: ${schema.pattern}`,
          'pattern',
          value,
          schema.pattern
        );
      }
    }

    if (schema.format) {
      this.validateFormat(value, schema.format, currentPath);
    }
  }

  /**
   * Validate string format
   * @private
   * @param {string} value - String value
   * @param {string} format - Format name
   * @param {string} currentPath - Current path
   */
  validateFormat(value, format, currentPath) {
    const formatValidators = {
      'color-hex': /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/,
      'css-dimension': /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax)$/,
      'css-time': /^\d+(\.\d+)?(ms|s)$/,
      'css-easing': /^(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\(.+\))$/,
    };

    const validator = formatValidators[format];
    if (validator && !validator.test(value)) {
      this.addError(
        currentPath,
        `String does not match format: ${format}`,
        'format',
        value,
        format
      );
    }
  }

  /**
   * Validate number constraints
   * @private
   * @param {number} value - Number value
   * @param {Object} schema - Schema definition
   * @param {string} currentPath - Current path
   */
  validateNumber(value, schema, currentPath) {
    if (schema.minimum !== undefined) {
      const exclusive = schema.exclusiveMinimum === true;
      if (exclusive ? value <= schema.minimum : value < schema.minimum) {
        this.addError(
          currentPath,
          `Number ${value} is ${exclusive ? '<=' : '<'} minimum ${schema.minimum}`,
          exclusive ? 'exclusiveMinimum' : 'minimum',
          value,
          `${exclusive ? '>' : '>='} ${schema.minimum}`
        );
      }
    }

    if (schema.maximum !== undefined) {
      const exclusive = schema.exclusiveMaximum === true;
      if (exclusive ? value >= schema.maximum : value > schema.maximum) {
        this.addError(
          currentPath,
          `Number ${value} is ${exclusive ? '>=' : '>'} maximum ${schema.maximum}`,
          exclusive ? 'exclusiveMaximum' : 'maximum',
          value,
          `${exclusive ? '<' : '<='} ${schema.maximum}`
        );
      }
    }

    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      this.addError(
        currentPath,
        `Number ${value} is not a multiple of ${schema.multipleOf}`,
        'multipleOf',
        value,
        `multiple of ${schema.multipleOf}`
      );
    }
  }

  /**
   * Validate array constraints
   * @private
   * @param {Array} value - Array value
   * @param {Object} schema - Schema definition
   * @param {string} currentPath - Current path
   */
  validateArray(value, schema, currentPath) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      this.addError(
        currentPath,
        `Array length ${value.length} is less than minimum ${schema.minItems}`,
        'minItems',
        value,
        `>= ${schema.minItems} items`
      );
    }

    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      this.addError(
        currentPath,
        `Array length ${value.length} exceeds maximum ${schema.maxItems}`,
        'maxItems',
        value,
        `<= ${schema.maxItems} items`
      );
    }

    if (schema.uniqueItems === true) {
      const seen = new Set();
      const duplicates = [];
      for (let i = 0; i < value.length; i++) {
        const item = JSON.stringify(value[i]);
        if (seen.has(item)) {
          duplicates.push(i);
        }
        seen.add(item);
      }
      if (duplicates.length > 0) {
        this.addError(
          currentPath,
          `Array contains duplicate items at indices: ${duplicates.join(', ')}`,
          'uniqueItems',
          value,
          'unique items only'
        );
      }
    }

    // Validate items
    if (schema.items) {
      value.forEach((item, index) => {
        this.validateValue(item, schema.items, `${currentPath}[${index}]`);
      });
    }
  }

  /**
   * Add a validation error
   * @private
   * @param {string} path - Path to the invalid property
   * @param {string} message - Error message
   * @param {string} schemaRule - Schema rule that was violated
   * @param {*} actualValue - Actual value
   * @param {*} expectedType - Expected type or constraint
   */
  addError(path, message, schemaRule, actualValue, expectedType) {
    this.errors.push({
      path,
      message,
      schemaRule,
      actualValue,
      expectedType,
    });
  }

  /**
   * Add a validation warning
   * @private
   * @param {string} path - Path to the property
   * @param {string} message - Warning message
   */
  addWarning(path, message) {
    this.warnings.push(`${path}: ${message}`);
  }

  /**
   * Get validation result
   * @private
   * @returns {ValidationResult} Validation result
   */
  getResult() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Format validation errors as a human-readable string
   * @param {ValidationResult} result - Validation result
   * @returns {string} Formatted error message
   */
  static formatErrors(result) {
    if (result.valid) {
      return 'Validation passed ✓';
    }

    const lines = ['Token Validation Failed:', ''];

    result.errors.forEach((error, index) => {
      lines.push(`Error ${index + 1}:`);
      lines.push(`  Path: ${error.path}`);
      lines.push(`  Rule: ${error.schemaRule}`);
      lines.push(`  Message: ${error.message}`);
      if (error.actualValue !== undefined) {
        lines.push(`  Actual: ${JSON.stringify(error.actualValue)}`);
      }
      if (error.expectedType !== undefined) {
        lines.push(`  Expected: ${JSON.stringify(error.expectedType)}`);
      }
      lines.push('');
    });

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      result.warnings.forEach(warning => {
        lines.push(`  - ${warning}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Validate tokens against the schema and log errors
 * @param {Object} tokens - Token object to validate
 * @param {Object} schema - JSON Schema object
 * @returns {ValidationResult} Validation result
 */
export function validateTokens(tokens, schema) {
  const validator = new TokenValidator(schema);
  const result = validator.validate(tokens);

  if (!result.valid) {
    console.error(TokenValidator.formatErrors(result));
  } else if (result.warnings.length > 0) {
    console.warn('Token validation warnings:', result.warnings);
  }

  return result;
}

/**
 * Assert that tokens are valid (throws if invalid)
 * @param {Object} tokens - Token object to validate
 * @param {Object} schema - JSON Schema object
 * @throws {Error} If validation fails
 */
export function assertValidTokens(tokens, schema) {
  const result = validateTokens(tokens, schema);
  
  if (!result.valid) {
    throw new Error(TokenValidator.formatErrors(result));
  }
}