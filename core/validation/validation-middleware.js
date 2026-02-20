/**
 * @fileoverview Validation Middleware - Intercepts and validates external data
 * @module core/validation/validation-middleware
 * 
 * Provides middleware for validating data at system boundaries:
 * - HTTP API responses
 * - EventBus messages
 * - WASM bridge communications
 * - User input from forms
 * - Configuration files
 * 
 * @see DESIGN_SYSTEM.md#validation-middleware
 */

import { schemaValidator } from './schema-validator.js';

/**
 * Validation middleware for EventBus
 * Validates event payloads before they are processed
 * 
 * @param {Object} eventBus - EventBus instance
 * @param {Map<string, string>} eventSchemaMap - Map of event types to schema IDs
 */
export class EventBusValidationMiddleware {
  constructor(eventBus, eventSchemaMap = new Map()) {
    this.eventBus = eventBus;
    this.eventSchemaMap = eventSchemaMap;
    this.validationStats = {
      total: 0,
      passed: 0,
      failed: 0,
      totalTime: 0
    };
  }

  /**
   * Register schema for an event type
   * @param {string} eventType - Event type identifier
   * @param {string} schemaId - Schema ID to validate against
   */
  registerEventSchema(eventType, schemaId) {
    this.eventSchemaMap.set(eventType, schemaId);
  }

  /**
   * Install middleware on EventBus
   * Intercepts all events and validates payloads
   */
  install() {
    const originalPublish = this.eventBus.publish.bind(this.eventBus);
    
    this.eventBus.publish = (eventType, payload, metadata = {}) => {
      const schemaId = this.eventSchemaMap.get(eventType);
      
      // If no schema registered, allow through (optional validation)
      if (!schemaId) {
        return originalPublish(eventType, payload, metadata);
      }

      // Validate payload
      const result = schemaValidator.validate(schemaId, payload);
      this.validationStats.total++;
      this.validationStats.totalTime += result.validationTime;

      if (result.valid) {
        this.validationStats.passed++;
        return originalPublish(eventType, payload, {
          ...metadata,
          validated: true,
          validationTime: result.validationTime
        });
      } else {
        this.validationStats.failed++;
        console.error(`[EventBusValidation] Invalid payload for event: ${eventType}`, {
          errors: result.errors,
          payload
        });

        // Publish validation error event
        originalPublish('validation:error', {
          eventType,
          errors: result.errors,
          originalPayload: payload
        }, metadata);

        // Don't publish invalid event
        return false;
      }
    };
  }

  /**
   * Get validation statistics
   * @returns {Object} Validation stats
   */
  getStats() {
    return {
      ...this.validationStats,
      averageTime: this.validationStats.total > 0 
        ? this.validationStats.totalTime / this.validationStats.total 
        : 0,
      successRate: this.validationStats.total > 0
        ? (this.validationStats.passed / this.validationStats.total) * 100
        : 0
    };
  }
}

/**
 * Validation middleware for HTTP API responses
 * Validates API responses before they are returned to caller
 */
export class APIValidationMiddleware {
  constructor() {
    this.endpointSchemaMap = new Map();
    this.validationStats = new Map();
  }

  /**
   * Register schema for an API endpoint
   * @param {string} endpoint - API endpoint pattern (e.g., '/api/users/:id')
   * @param {string} schemaId - Schema ID to validate response against
   */
  registerEndpointSchema(endpoint, schemaId) {
    this.endpointSchemaMap.set(endpoint, schemaId);
  }

  /**
   * Validate API response
   * @param {string} endpoint - API endpoint that was called
   * @param {*} response - Response data to validate
   * @returns {ValidationResult} Validation result
   */
  validateResponse(endpoint, response) {
    const schemaId = this.endpointSchemaMap.get(endpoint);
    
    if (!schemaId) {
      console.warn(`[APIValidation] No schema registered for endpoint: ${endpoint}`);
      return { valid: true, errors: [], data: response };
    }

    const result = schemaValidator.validate(schemaId, response);
    
    // Update stats
    if (!this.validationStats.has(endpoint)) {
      this.validationStats.set(endpoint, { total: 0, passed: 0, failed: 0 });
    }
    const stats = this.validationStats.get(endpoint);
    stats.total++;
    result.valid ? stats.passed++ : stats.failed++;

    if (!result.valid) {
      console.error(`[APIValidation] Invalid response from endpoint: ${endpoint}`, {
        errors: result.errors,
        response
      });
    }

    return result;
  }

  /**
   * Wrap fetch to automatically validate responses
   * @param {string} endpoint - API endpoint
   * @returns {Function} Wrapped fetch function
   */
  createValidatedFetch(endpoint) {
    return async (...args) => {
      const response = await fetch(...args);
      const data = await response.json();
      
      const validationResult = this.validateResponse(endpoint, data);
      
      if (!validationResult.valid) {
        throw new Error(`API validation failed: ${JSON.stringify(validationResult.errors)}`);
      }
      
      return data;
    };
  }

  /**
   * Get validation statistics for all endpoints
   * @returns {Object} Stats by endpoint
   */
  getStats() {
    const stats = {};
    for (const [endpoint, data] of this.validationStats) {
      stats[endpoint] = {
        ...data,
        successRate: data.total > 0 ? (data.passed / data.total) * 100 : 0
      };
    }
    return stats;
  }
}

/**
 * Validation middleware for WASM bridge
 * Validates messages crossing the JS/WASM boundary
 */
export class WASMBridgeValidationMiddleware {
  constructor() {
    this.messageSchemas = new Map();
    this.validationStats = {
      jsToWasm: { total: 0, passed: 0, failed: 0 },
      wasmToJs: { total: 0, passed: 0, failed: 0 }
    };
  }

  /**
   * Register schema for WASM message type
   * @param {string} messageType - Message type identifier
   * @param {string} schemaId - Schema ID
   * @param {string} direction - 'jsToWasm' or 'wasmToJs'
   */
  registerMessageSchema(messageType, schemaId, direction = 'both') {
    if (direction === 'both' || direction === 'jsToWasm') {
      this.messageSchemas.set(`jsToWasm:${messageType}`, schemaId);
    }
    if (direction === 'both' || direction === 'wasmToJs') {
      this.messageSchemas.set(`wasmToJs:${messageType}`, schemaId);
    }
  }

  /**
   * Validate message before sending to WASM
   * @param {string} messageType - Message type
   * @param {*} message - Message data
   * @returns {ValidationResult} Validation result
   */
  validateJsToWasm(messageType, message) {
    const schemaId = this.messageSchemas.get(`jsToWasm:${messageType}`);
    
    if (!schemaId) {
      return { valid: true, errors: [], data: message };
    }

    const result = schemaValidator.validate(schemaId, message);
    this.validationStats.jsToWasm.total++;
    result.valid ? this.validationStats.jsToWasm.passed++ : this.validationStats.jsToWasm.failed++;

    if (!result.valid) {
      console.error(`[WASMBridgeValidation] Invalid JS→WASM message: ${messageType}`, {
        errors: result.errors,
        message
      });
    }

    return result;
  }

  /**
   * Validate message received from WASM
   * @param {string} messageType - Message type
   * @param {*} message - Message data
   * @returns {ValidationResult} Validation result
   */
  validateWasmToJs(messageType, message) {
    const schemaId = this.messageSchemas.get(`wasmToJs:${messageType}`);
    
    if (!schemaId) {
      return { valid: true, errors: [], data: message };
    }

    const result = schemaValidator.validate(schemaId, message);
    this.validationStats.wasmToJs.total++;
    result.valid ? this.validationStats.wasmToJs.passed++ : this.validationStats.wasmToJs.failed++;

    if (!result.valid) {
      console.error(`[WASMBridgeValidation] Invalid WASM→JS message: ${messageType}`, {
        errors: result.errors,
        message
      });
    }

    return result;
  }

  /**
   * Get validation statistics
   * @returns {Object} Validation stats
   */
  getStats() {
    return {
      jsToWasm: {
        ...this.validationStats.jsToWasm,
        successRate: this.validationStats.jsToWasm.total > 0
          ? (this.validationStats.jsToWasm.passed / this.validationStats.jsToWasm.total) * 100
          : 0
      },
      wasmToJs: {
        ...this.validationStats.wasmToJs,
        successRate: this.validationStats.wasmToJs.total > 0
          ? (this.validationStats.wasmToJs.passed / this.validationStats.wasmToJs.total) * 100
          : 0
      }
    };
  }
}