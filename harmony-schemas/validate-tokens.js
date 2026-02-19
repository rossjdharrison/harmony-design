/**
 * @fileoverview Token validation utility using JSON Schema
 * Validates design token files against the token schema
 * @module harmony-schemas/validate-tokens
 */

/**
 * Simple JSON Schema validator implementation
 * @class SchemaValidator
 */
class SchemaValidator {
  /**
   * @param {object} schema - JSON Schema definition
   */
  constructor(schema) {
    this.schema = schema;
    this.errors = [];
  }

  /**
   * Validate data against schema
   * @param {object} data - Data to validate
   * @returns {boolean} True if valid
   */
  validate(data) {
    this.errors = [];
    return this._validateObject(data, this.schema, 'root');
  }

  /**
   * Get validation errors
   * @returns {Array<{path: string, message: string}>} Validation errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Validate object against schema
   * @private
   * @param {*} data - Data to validate
   * @param {object} schema - Schema definition
   * @param {string} path - Current path in data
   * @returns {boolean} True if valid
   */
  _validateObject(data, schema, path) {
    if (schema.type === 'object') {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        this.errors.push({ path, message: `Expected object, got ${typeof data}` });
        return false;
      }

      // Check required properties
      if (schema.required) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            this.errors.push({ path: `${path}.${prop}`, message: 'Required property missing' });
            return false;
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [key, value] of Object.entries(data)) {
          if (schema.properties[key]) {
            if (!this._validateValue(value, schema.properties[key], `${path}.${key}`)) {
              return false;
            }
          }
        }
      }

      // Validate pattern properties
      if (schema.patternProperties) {
        for (const [key, value] of Object.entries(data)) {
          for (const [pattern, propSchema] of Object.entries(schema.patternProperties)) {
            const regex = new RegExp(pattern);
            if (regex.test(key)) {
              if (!this._validateValue(value, propSchema, `${path}.${key}`)) {
                return false;
              }
            }
          }
        }
      }

      return true;
    }

    return this._validateValue(data, schema, path);
  }

  /**
   * Validate value against schema
   * @private
   * @param {*} value - Value to validate
   * @param {object} schema - Schema definition
   * @param {string} path - Current path
   * @returns {boolean} True if valid
   */
  _validateValue(value, schema, path) {
    // Handle $ref
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/definitions/', '');
      const refSchema = this.schema.definitions?.[refPath];
      if (refSchema) {
        return this._validateValue(value, refSchema, path);
      }
    }

    // Handle oneOf
    if (schema.oneOf) {
      for (const subSchema of schema.oneOf) {
        const tempErrors = [...this.errors];
        if (this._validateValue(value, subSchema, path)) {
          return true;
        }
        this.errors = tempErrors; // Restore errors if this branch fails
      }
      this.errors.push({ path, message: 'Value does not match any oneOf schemas' });
      return false;
    }

    // Handle const
    if ('const' in schema) {
      if (value !== schema.const) {
        this.errors.push({ path, message: `Expected constant value "${schema.const}", got "${value}"` });
        return false;
      }
      return true;
    }

    // Type validation
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schema.type) {
        this.errors.push({ path, message: `Expected type ${schema.type}, got ${actualType}` });
        return false;
      }

      // String pattern validation
      if (schema.type === 'string' && schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          this.errors.push({ path, message: `String does not match pattern ${schema.pattern}` });
          return false;
        }
      }

      // Number range validation
      if (schema.type === 'number') {
        if (schema.minimum !== undefined && value < schema.minimum) {
          this.errors.push({ path, message: `Number ${value} is less than minimum ${schema.minimum}` });
          return false;
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
          this.errors.push({ path, message: `Number ${value} is greater than maximum ${schema.maximum}` });
          return false;
        }
      }

      // Enum validation
      if (schema.enum) {
        if (!schema.enum.includes(value)) {
          this.errors.push({ path, message: `Value "${value}" is not in enum [${schema.enum.join(', ')}]` });
          return false;
        }
      }

      // Object validation
      if (schema.type === 'object') {
        return this._validateObject(value, schema, path);
      }
    }

    return true;
  }
}

/**
 * Load and parse JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<object>} Parsed JSON data
 */
async function loadJSON(filePath) {
  if (typeof window !== 'undefined' && window.fetch) {
    // Browser environment
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
    }
    return await response.json();
  } else if (typeof require !== 'undefined') {
    // Node.js environment (for testing)
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8');
    return JSON.parse(content);
  } else {
    throw new Error('No file loading mechanism available');
  }
}

/**
 * Validate token file against schema
 * @param {string} tokenFilePath - Path to token JSON file
 * @param {string} [schemaPath='./token-schema.json'] - Path to schema file
 * @returns {Promise<{valid: boolean, errors: Array}>} Validation result
 */
export async function validateTokenFile(tokenFilePath, schemaPath = './token-schema.json') {
  try {
    const schema = await loadJSON(schemaPath);
    const tokenData = await loadJSON(tokenFilePath);

    const validator = new SchemaValidator(schema);
    const valid = validator.validate(tokenData);

    return {
      valid,
      errors: validator.getErrors(),
      data: tokenData
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{ path: 'root', message: error.message }],
      data: null
    };
  }
}

/**
 * Validate token data object against schema
 * @param {object} tokenData - Token data to validate
 * @param {object} schema - Schema object
 * @returns {{valid: boolean, errors: Array}} Validation result
 */
export function validateTokenData(tokenData, schema) {
  const validator = new SchemaValidator(schema);
  const valid = validator.validate(tokenData);

  return {
    valid,
    errors: validator.getErrors()
  };
}

/**
 * Create a validation report
 * @param {object} result - Validation result
 * @returns {string} Formatted report
 */
export function createValidationReport(result) {
  if (result.valid) {
    return '✅ Token file is valid';
  }

  let report = '❌ Token file validation failed:\n\n';
  for (const error of result.errors) {
    report += `  • ${error.path}: ${error.message}\n`;
  }

  return report;
}

// Export validator class for advanced usage
export { SchemaValidator };