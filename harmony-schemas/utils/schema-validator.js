/**
 * @fileoverview JSON Schema Validator Utility
 * @doc-ref DESIGN_SYSTEM.md#json-schema-validation
 * 
 * Simple JSON schema validator for harmony-schemas examples.
 * Uses basic validation logic without external dependencies.
 */

/**
 * Validates data against a JSON schema
 * @param {Object} schema - JSON schema definition
 * @param {Object} data - Data to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateSchema(schema, data) {
  const errors = [];

  function validate(schema, data, path = '') {
    // Required properties check
    if (schema.required && Array.isArray(schema.required)) {
      for (const prop of schema.required) {
        if (!(prop in data)) {
          errors.push(`Missing required property: ${path}${prop}`);
        }
      }
    }

    // Type check
    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== schema.type && !(schema.type === 'integer' && typeof data === 'number')) {
        errors.push(`Type mismatch at ${path || 'root'}: expected ${schema.type}, got ${actualType}`);
        return;
      }
    }

    // Properties check
    if (schema.properties && typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          validate(propSchema, data[key], `${path}${key}.`);
        }
      }
    }

    // Array items check
    if (schema.items && Array.isArray(data)) {
      data.forEach((item, index) => {
        validate(schema.items, item, `${path}[${index}].`);
      });
    }

    // Enum check
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push(`Value at ${path || 'root'} must be one of: ${schema.enum.join(', ')}`);
    }

    // Pattern check
    if (schema.pattern && typeof data === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(data)) {
        errors.push(`Value at ${path || 'root'} does not match pattern: ${schema.pattern}`);
      }
    }

    // MinLength check
    if (schema.minLength !== undefined && typeof data === 'string') {
      if (data.length < schema.minLength) {
        errors.push(`String at ${path || 'root'} is too short (min: ${schema.minLength})`);
      }
    }
  }

  validate(schema, data);

  return {
    valid: errors.length === 0,
    errors
  };
}