/**
 * @fileoverview Typed Error Classes for Harmony Design System
 * @module core/errors
 * 
 * Provides strongly-typed error classes for different subsystems:
 * - AudioError: Audio processing and Web Audio API failures
 * - GraphError: Graph traversal, node relationships, and cycle detection
 * - ValidationError: Schema validation and type checking failures
 * 
 * All errors include context information for debugging and error recovery.
 * Error instances are serializable for logging and remote diagnostics.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Error Handling
 */

/**
 * Base error class for Harmony Design System
 * Provides common structure and serialization for all typed errors
 * 
 * @class HarmonyError
 * @extends Error
 */
class HarmonyError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {Object} context - Additional context for debugging
   */
  constructor(message, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = context;
    this.timestamp = Date.now();
    
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON for logging or transmission
   * @returns {Object} Serialized error object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Create error from serialized JSON
   * @param {Object} json - Serialized error object
   * @returns {HarmonyError} Reconstructed error instance
   */
  static fromJSON(json) {
    const error = new this(json.message, json.context);
    error.timestamp = json.timestamp;
    if (json.stack) {
      error.stack = json.stack;
    }
    return error;
  }
}

/**
 * Audio processing and Web Audio API errors
 * 
 * Used for:
 * - AudioContext initialization failures
 * - AudioWorklet loading errors
 * - Buffer allocation failures
 * - Sample rate mismatches
 * - Latency constraint violations
 * 
 * Context should include:
 * - nodeType: Type of audio node involved
 * - sampleRate: Current sample rate
 * - bufferSize: Buffer size if relevant
 * - latency: Measured latency if available
 * 
 * @class AudioError
 * @extends HarmonyError
 * 
 * @example
 * throw new AudioError('AudioContext initialization failed', {
 *   nodeType: 'AudioContext',
 *   sampleRate: 48000,
 *   error: originalError.message
 * });
 */
export class AudioError extends HarmonyError {
  /**
   * @param {string} message - Error description
   * @param {Object} context - Audio-specific context
   * @param {string} [context.nodeType] - Audio node type
   * @param {number} [context.sampleRate] - Sample rate in Hz
   * @param {number} [context.bufferSize] - Buffer size in samples
   * @param {number} [context.latency] - Measured latency in ms
   * @param {string} [context.workletUrl] - AudioWorklet URL if applicable
   */
  constructor(message, context = {}) {
    super(message, {
      subsystem: 'audio',
      ...context
    });
  }

  /**
   * Check if error is related to latency constraints
   * @returns {boolean} True if latency-related
   */
  isLatencyViolation() {
    return this.context.latency && this.context.latency > 10;
  }

  /**
   * Check if error is recoverable
   * @returns {boolean} True if recovery might be possible
   */
  isRecoverable() {
    const recoverableTypes = [
      'buffer-allocation',
      'worklet-load',
      'temporary-suspension'
    ];
    return recoverableTypes.includes(this.context.errorType);
  }
}

/**
 * Graph traversal and relationship errors
 * 
 * Used for:
 * - Cycle detection failures
 * - Invalid node relationships
 * - Missing required edges
 * - Type mismatch between connected nodes
 * - Graph constraint violations
 * 
 * Context should include:
 * - nodeId: Primary node involved
 * - relatedNodeId: Connected node if relevant
 * - edgeType: Type of edge/relationship
 * - graphPath: Path through graph if applicable
 * - cycleDetected: Boolean if cycle found
 * 
 * @class GraphError
 * @extends HarmonyError
 * 
 * @example
 * throw new GraphError('Cycle detected in component graph', {
 *   nodeId: 'component-a',
 *   relatedNodeId: 'component-b',
 *   graphPath: ['component-a', 'component-b', 'component-c', 'component-a'],
 *   cycleDetected: true
 * });
 */
export class GraphError extends HarmonyError {
  /**
   * @param {string} message - Error description
   * @param {Object} context - Graph-specific context
   * @param {string} [context.nodeId] - Primary node ID
   * @param {string} [context.relatedNodeId] - Related node ID
   * @param {string} [context.edgeType] - Edge type (parent, child, reference)
   * @param {Array<string>} [context.graphPath] - Path through graph
   * @param {boolean} [context.cycleDetected] - Whether cycle was detected
   */
  constructor(message, context = {}) {
    super(message, {
      subsystem: 'graph',
      ...context
    });
  }

  /**
   * Check if error is due to cycle detection
   * @returns {boolean} True if cycle detected
   */
  isCycleError() {
    return this.context.cycleDetected === true;
  }

  /**
   * Check if error is due to missing edge
   * @returns {boolean} True if missing required edge
   */
  isMissingEdgeError() {
    return this.context.errorType === 'missing-edge';
  }

  /**
   * Get the cycle path if available
   * @returns {Array<string>|null} Cycle path or null
   */
  getCyclePath() {
    if (this.isCycleError() && this.context.graphPath) {
      return this.context.graphPath;
    }
    return null;
  }
}

/**
 * Schema validation and type checking errors
 * 
 * Used for:
 * - Schema validation failures
 * - Type mismatches
 * - Required field violations
 * - Format validation errors
 * - Constraint violations
 * 
 * Context should include:
 * - schemaId: Schema being validated against
 * - fieldPath: Path to invalid field (e.g., 'user.email')
 * - expectedType: Expected type or format
 * - actualValue: Actual value that failed
 * - constraint: Constraint that was violated
 * 
 * @class ValidationError
 * @extends HarmonyError
 * 
 * @example
 * throw new ValidationError('Invalid event payload', {
 *   schemaId: 'AudioNodeConnectedEvent',
 *   fieldPath: 'payload.sampleRate',
 *   expectedType: 'number',
 *   actualValue: '48000',
 *   constraint: 'type'
 * });
 */
export class ValidationError extends HarmonyError {
  /**
   * @param {string} message - Error description
   * @param {Object} context - Validation-specific context
   * @param {string} [context.schemaId] - Schema identifier
   * @param {string} [context.fieldPath] - Path to invalid field
   * @param {string} [context.expectedType] - Expected type
   * @param {*} [context.actualValue] - Actual value
   * @param {string} [context.constraint] - Violated constraint
   * @param {Array<Object>} [context.validationErrors] - Detailed validation errors
   */
  constructor(message, context = {}) {
    super(message, {
      subsystem: 'validation',
      ...context
    });
  }

  /**
   * Check if error is a type mismatch
   * @returns {boolean} True if type mismatch
   */
  isTypeMismatch() {
    return this.context.constraint === 'type';
  }

  /**
   * Check if error is a required field violation
   * @returns {boolean} True if required field missing
   */
  isRequiredFieldError() {
    return this.context.constraint === 'required';
  }

  /**
   * Get all validation errors if multiple
   * @returns {Array<Object>} Array of validation error details
   */
  getValidationErrors() {
    return this.context.validationErrors || [];
  }

  /**
   * Get human-readable field path
   * @returns {string} Formatted field path
   */
  getFieldPath() {
    return this.context.fieldPath || 'unknown';
  }
}

/**
 * Create appropriate error type from error code
 * Useful for deserializing errors or mapping from error codes
 * 
 * @param {string} errorCode - Error code (e.g., 'AUDIO_001', 'GRAPH_002')
 * @param {string} message - Error message
 * @param {Object} context - Error context
 * @returns {HarmonyError} Appropriate error instance
 * 
 * @example
 * const error = createErrorFromCode('AUDIO_001', 'Context failed', { sampleRate: 48000 });
 */
export function createErrorFromCode(errorCode, message, context = {}) {
  const prefix = errorCode.split('_')[0];
  
  switch (prefix) {
    case 'AUDIO':
      return new AudioError(message, { ...context, errorCode });
    case 'GRAPH':
      return new GraphError(message, { ...context, errorCode });
    case 'VALIDATION':
      return new ValidationError(message, { ...context, errorCode });
    default:
      return new HarmonyError(message, { ...context, errorCode });
  }
}

/**
 * Error code constants for common error scenarios
 * Use these for consistent error reporting and handling
 */
export const ErrorCodes = {
  // Audio Errors (AUDIO_xxx)
  AUDIO_CONTEXT_INIT_FAILED: 'AUDIO_001',
  AUDIO_WORKLET_LOAD_FAILED: 'AUDIO_002',
  AUDIO_BUFFER_ALLOCATION_FAILED: 'AUDIO_003',
  AUDIO_LATENCY_VIOLATION: 'AUDIO_004',
  AUDIO_SAMPLE_RATE_MISMATCH: 'AUDIO_005',
  AUDIO_NODE_CONNECTION_FAILED: 'AUDIO_006',
  
  // Graph Errors (GRAPH_xxx)
  GRAPH_CYCLE_DETECTED: 'GRAPH_001',
  GRAPH_MISSING_EDGE: 'GRAPH_002',
  GRAPH_INVALID_NODE: 'GRAPH_003',
  GRAPH_TYPE_MISMATCH: 'GRAPH_004',
  GRAPH_CONSTRAINT_VIOLATION: 'GRAPH_005',
  GRAPH_TRAVERSAL_FAILED: 'GRAPH_006',
  
  // Validation Errors (VALIDATION_xxx)
  VALIDATION_SCHEMA_FAILED: 'VALIDATION_001',
  VALIDATION_TYPE_MISMATCH: 'VALIDATION_002',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_003',
  VALIDATION_FORMAT_INVALID: 'VALIDATION_004',
  VALIDATION_CONSTRAINT_VIOLATED: 'VALIDATION_005',
  VALIDATION_UNKNOWN_SCHEMA: 'VALIDATION_006'
};

// Export base class for extension by other modules
export { HarmonyError };