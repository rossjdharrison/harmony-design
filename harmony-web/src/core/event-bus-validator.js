/**
 * @fileoverview Runtime validation for EventBus events
 * @see harmony-design/DESIGN_SYSTEM.md#event-validation
 */

/**
 * Validation error with detailed context
 */
export class EventValidationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} context - Error context
   * @param {string} context.eventType - Event type being validated
   * @param {string} [context.source] - Event source component
   * @param {*} [context.payload] - Event payload
   * @param {string} [context.field] - Specific field that failed validation
   * @param {*} [context.value] - Value that failed validation
   * @param {string} [context.expected] - Expected type or format
   */
  constructor(message, context) {
    super(message);
    this.name = 'EventValidationError';
    this.context = context;
  }

  /**
   * Get formatted error message with context
   * @returns {string}
   */
  getDetailedMessage() {
    const parts = [this.message];
    
    if (this.context.eventType) {
      parts.push(`Event Type: ${this.context.eventType}`);
    }
    
    if (this.context.source) {
      parts.push(`Source: ${this.context.source}`);
    }
    
    if (this.context.field) {
      parts.push(`Field: ${this.context.field}`);
    }
    
    if (this.context.expected) {
      parts.push(`Expected: ${this.context.expected}`);
    }
    
    if (this.context.value !== undefined) {
      parts.push(`Received: ${JSON.stringify(this.context.value)}`);
    }
    
    if (this.context.payload !== undefined) {
      parts.push(`Full Payload: ${JSON.stringify(this.context.payload, null, 2)}`);
    }
    
    return parts.join('\n  ');
  }
}

/**
 * Event schema registry
 * Maps event types to their validation schemas
 */
const eventSchemas = new Map();

/**
 * Register an event schema for validation
 * @param {string} eventType - Event type identifier
 * @param {Object} schema - Validation schema
 * @param {Object} schema.payload - Payload field definitions
 * @param {boolean} [schema.requiresSource=true] - Whether source is required
 * @param {string} [schema.description] - Schema description for errors
 */
export function registerEventSchema(eventType, schema) {
  eventSchemas.set(eventType, {
    requiresSource: true,
    ...schema
  });
}

/**
 * Validate a field value against its type definition
 * @param {string} fieldName - Field name
 * @param {*} value - Value to validate
 * @param {Object} fieldDef - Field definition
 * @param {string} fieldDef.type - Expected type
 * @param {boolean} [fieldDef.required=true] - Whether field is required
 * @param {*} [fieldDef.default] - Default value if not provided
 * @param {Function} [fieldDef.validate] - Custom validation function
 * @returns {Object} Validation result {valid: boolean, error?: string}
 */
function validateField(fieldName, value, fieldDef) {
  // Handle optional fields
  if (value === undefined || value === null) {
    if (fieldDef.required !== false) {
      return {
        valid: false,
        error: `Required field '${fieldName}' is missing`,
        expected: fieldDef.type
      };
    }
    return { valid: true };
  }

  // Type validation
  const actualType = typeof value;
  let typeValid = false;

  switch (fieldDef.type) {
    case 'string':
      typeValid = actualType === 'string';
      break;
    case 'number':
      typeValid = actualType === 'number' && !isNaN(value);
      break;
    case 'boolean':
      typeValid = actualType === 'boolean';
      break;
    case 'object':
      typeValid = actualType === 'object' && value !== null && !Array.isArray(value);
      break;
    case 'array':
      typeValid = Array.isArray(value);
      break;
    case 'any':
      typeValid = true;
      break;
    default:
      typeValid = actualType === fieldDef.type;
  }

  if (!typeValid) {
    return {
      valid: false,
      error: `Field '${fieldName}' has incorrect type`,
      expected: fieldDef.type,
      actual: actualType
    };
  }

  // Custom validation
  if (fieldDef.validate && typeof fieldDef.validate === 'function') {
    try {
      const customResult = fieldDef.validate(value);
      if (customResult !== true) {
        return {
          valid: false,
          error: `Field '${fieldName}' failed custom validation: ${customResult}`,
          expected: fieldDef.type
        };
      }
    } catch (err) {
      return {
        valid: false,
        error: `Field '${fieldName}' validation threw error: ${err.message}`,
        expected: fieldDef.type
      };
    }
  }

  return { valid: true };
}

/**
 * Validate an event against its registered schema
 * @param {string} eventType - Event type
 * @param {Object} event - Event object to validate
 * @param {string} [event.source] - Event source
 * @param {Object} [event.payload] - Event payload
 * @throws {EventValidationError} If validation fails
 */
export function validateEvent(eventType, event) {
  // Check if event type is registered
  const schema = eventSchemas.get(eventType);
  if (!schema) {
    // Log warning but don't fail - allow unregistered events for flexibility
    console.warn(`[EventBus] No schema registered for event type: ${eventType}`);
    return;
  }

  const baseContext = {
    eventType,
    source: event.source,
    payload: event.payload
  };

  // Validate source if required
  if (schema.requiresSource && !event.source) {
    throw new EventValidationError(
      'Event source is required but not provided',
      baseContext
    );
  }

  // Validate source format if provided
  if (event.source && typeof event.source !== 'string') {
    throw new EventValidationError(
      'Event source must be a string',
      {
        ...baseContext,
        field: 'source',
        expected: 'string',
        value: event.source
      }
    );
  }

  // Validate payload exists if schema defines payload fields
  if (schema.payload && Object.keys(schema.payload).length > 0) {
    if (!event.payload || typeof event.payload !== 'object') {
      throw new EventValidationError(
        'Event payload is required but not provided or not an object',
        {
          ...baseContext,
          field: 'payload',
          expected: 'object',
          value: event.payload
        }
      );
    }

    // Validate each payload field
    for (const [fieldName, fieldDef] of Object.entries(schema.payload)) {
      const fieldValue = event.payload[fieldName];
      const result = validateField(fieldName, fieldValue, fieldDef);

      if (!result.valid) {
        throw new EventValidationError(
          result.error,
          {
            ...baseContext,
            field: `payload.${fieldName}`,
            expected: result.expected,
            value: fieldValue
          }
        );
      }
    }

    // Check for unexpected fields (strict mode)
    if (schema.strict) {
      const allowedFields = new Set(Object.keys(schema.payload));
      const actualFields = Object.keys(event.payload);
      const unexpectedFields = actualFields.filter(f => !allowedFields.has(f));

      if (unexpectedFields.length > 0) {
        throw new EventValidationError(
          `Unexpected fields in payload: ${unexpectedFields.join(', ')}`,
          {
            ...baseContext,
            field: 'payload',
            value: unexpectedFields
          }
        );
      }
    }
  }
}

/**
 * Get all registered event types
 * @returns {string[]} Array of registered event type names
 */
export function getRegisteredEventTypes() {
  return Array.from(eventSchemas.keys());
}

/**
 * Get schema for a specific event type
 * @param {string} eventType - Event type
 * @returns {Object|undefined} Schema definition or undefined if not registered
 */
export function getEventSchema(eventType) {
  return eventSchemas.get(eventType);
}

/**
 * Clear all registered schemas (useful for testing)
 */
export function clearSchemas() {
  eventSchemas.clear();
}