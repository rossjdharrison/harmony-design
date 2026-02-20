/**
 * @fileoverview Configuration Layer Schema Validation
 * @module config/validators/schema-validator
 * 
 * Validates configuration objects against JSON schemas.
 * Synchronous validation for performance (<50ms target).
 * 
 * Related Documentation:
 * - docs/architecture/validation-architecture.md
 * - harmony-schemas/README.md
 */

/**
 * Validation error structure
 * @typedef {Object} ValidationError
 * @property {string} field - Field path (e.g., 'config.audio.sampleRate')
 * @property {string} message - Human-readable error message
 * @property {string} code - Machine-readable error code
 * @property {*} [context] - Additional context for debugging
 */

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {Array<ValidationError>} [errors] - Validation errors if invalid
 */

/**
 * Validates a value against a schema type
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema definition
 * @param {string} path - Current field path for error reporting
 * @returns {Array<ValidationError>} Array of validation errors
 */
function validateType(value, schema, path) {
  const errors = [];
  
  // Check type
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (schema.type !== actualType) {
      errors.push({
        field: path,
        message: `Expected type ${schema.type}, got ${actualType}`,
        code: 'TYPE_MISMATCH',
        context: { expected: schema.type, actual: actualType }
      });
      return errors; // Stop further validation on type mismatch
    }
  }
  
  // Number validations
  if (schema.type === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        field: path,
        message: `Value must be at least ${schema.minimum}`,
        code: 'BELOW_MINIMUM',
        context: { minimum: schema.minimum, actual: value }
      });
    }
    
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        field: path,
        message: `Value must be at most ${schema.maximum}`,
        code: 'ABOVE_MAXIMUM',
        context: { maximum: schema.maximum, actual: value }
      });
    }
  }
  
  // String validations
  if (schema.type === 'string') {
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: path,
          message: `Value does not match required pattern`,
          code: 'PATTERN_MISMATCH',
          context: { pattern: schema.pattern, actual: value }
        });
      }
    }
    
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field: path,
        message: `Value must be at least ${schema.minLength} characters`,
        code: 'TOO_SHORT',
        context: { minLength: schema.minLength, actual: value.length }
      });
    }
    
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field: path,
        message: `Value must be at most ${schema.maxLength} characters`,
        code: 'TOO_LONG',
        context: { maxLength: schema.maxLength, actual: value.length }
      });
    }
    
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM',
        context: { allowed: schema.enum, actual: value }
      });
    }
  }
  
  // Array validations
  if (schema.type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({
        field: path,
        message: `Array must have at least ${schema.minItems} items`,
        code: 'TOO_FEW_ITEMS',
        context: { minItems: schema.minItems, actual: value.length }
      });
    }
    
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({
        field: path,
        message: `Array must have at most ${schema.maxItems} items`,
        code: 'TOO_MANY_ITEMS',
        context: { maxItems: schema.maxItems, actual: value.length }
      });
    }
    
    if (schema.items) {
      value.forEach((item, index) => {
        const itemErrors = validateType(item, schema.items, `${path}[${index}]`);
        errors.push(...itemErrors);
      });
    }
  }
  
  // Object validations
  if (schema.type === 'object' && schema.properties) {
    // Check required properties
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value)) {
          errors.push({
            field: `${path}.${requiredProp}`,
            message: `Required property '${requiredProp}' is missing`,
            code: 'MISSING_REQUIRED',
            context: { property: requiredProp }
          });
        }
      }
    }
    
    // Validate each property
    for (const [prop, propSchema] of Object.entries(schema.properties)) {
      if (prop in value) {
        const propErrors = validateType(
          value[prop],
          propSchema,
          `${path}.${prop}`
        );
        errors.push(...propErrors);
      }
    }
  }
  
  return errors;
}

/**
 * Validates a configuration object against a schema
 * @param {Object} config - Configuration to validate
 * @param {Object} schema - JSON schema definition
 * @returns {ValidationResult} Validation result
 */
export function validateSchema(config, schema) {
  const errors = validateType(config, schema, 'config');
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Audio configuration schema
 */
export const audioConfigSchema = {
  type: 'object',
  properties: {
    sampleRate: {
      type: 'number',
      minimum: 44100,
      maximum: 192000,
      enum: [44100, 48000, 88200, 96000, 176400, 192000]
    },
    bufferSize: {
      type: 'number',
      minimum: 64,
      maximum: 8192,
      enum: [64, 128, 256, 512, 1024, 2048, 4096, 8192]
    },
    channels: {
      type: 'number',
      minimum: 1,
      maximum: 32
    }
  },
  required: ['sampleRate', 'bufferSize']
};

/**
 * Composition configuration schema
 */
export const compositionConfigSchema = {
  type: 'object',
  properties: {
    tempo: {
      type: 'number',
      minimum: 20,
      maximum: 999
    },
    timeSignature: {
      type: 'string',
      pattern: '^\\d+/\\d+$'
    },
    key: {
      type: 'string',
      pattern: '^[A-G][#b]?\\s*(major|minor)$'
    }
  },
  required: ['tempo', 'timeSignature']
};

/**
 * Track configuration schema
 */
export const trackConfigSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    gain: {
      type: 'number',
      minimum: -60,
      maximum: 12
    },
    pan: {
      type: 'number',
      minimum: -100,
      maximum: 100
    },
    muted: {
      type: 'boolean'
    },
    solo: {
      type: 'boolean'
    }
  },
  required: ['name']
};

/**
 * Validates audio configuration
 * @param {Object} config - Audio configuration to validate
 * @returns {ValidationResult} Validation result
 */
export function validateAudioConfig(config) {
  return validateSchema(config, audioConfigSchema);
}

/**
 * Validates composition configuration
 * @param {Object} config - Composition configuration to validate
 * @returns {ValidationResult} Validation result
 */
export function validateCompositionConfig(config) {
  return validateSchema(config, compositionConfigSchema);
}

/**
 * Validates track configuration
 * @param {Object} config - Track configuration to validate
 * @returns {ValidationResult} Validation result
 */
export function validateTrackConfig(config) {
  return validateSchema(config, trackConfigSchema);
}