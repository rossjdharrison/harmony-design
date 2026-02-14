/**
 * Event Validator
 * 
 * Validates events against JSON schemas before they are published to the EventBus.
 * Ensures type safety and contract compliance across component-BC interactions.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#event-validation
 */

/**
 * Validates an event against the component event schema
 * 
 * @param {Object} event - Event to validate
 * @returns {{valid: boolean, errors: Array<string>}} Validation result
 */
export function validateEvent(event) {
  const errors = [];

  // Base event validation
  if (!event.type || typeof event.type !== 'string') {
    errors.push('Event must have a type property of type string');
  }

  if (!event.timestamp || typeof event.timestamp !== 'number') {
    errors.push('Event must have a timestamp property of type number');
  }

  if (!event.source || typeof event.source !== 'string') {
    errors.push('Event must have a source property of type string');
  }

  // Event type pattern validation
  if (event.type) {
    const parts = event.type.split('.');
    if (parts.length !== 3) {
      errors.push(`Event type must follow pattern {context}.{category}.{action}, got: ${event.type}`);
    } else {
      const [context, category, action] = parts;
      
      const validContexts = ['playback', 'component', 'graph', 'ui', 'audio'];
      if (!validContexts.includes(context)) {
        errors.push(`Invalid context: ${context}. Must be one of: ${validContexts.join(', ')}`);
      }

      const validCategories = ['command', 'result'];
      if (!validCategories.includes(category)) {
        errors.push(`Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}`);
      }
    }
  }

  // Specific event type validation
  if (event.type && errors.length === 0) {
    validateSpecificEventType(event, errors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates specific event types with their payload requirements
 * 
 * @param {Object} event - Event to validate
 * @param {Array<string>} errors - Array to collect errors
 */
function validateSpecificEventType(event, errors) {
  const validators = {
    'playback.command.play': (e) => {
      if (!e.payload?.trackId) {
        errors.push('playback.command.play requires payload.trackId');
      }
      if (e.payload?.startPosition !== undefined && typeof e.payload.startPosition !== 'number') {
        errors.push('payload.startPosition must be a number');
      }
    },
    
    'playback.command.seek': (e) => {
      if (!e.payload?.position || typeof e.payload.position !== 'number') {
        errors.push('playback.command.seek requires payload.position as number');
      }
      if (e.payload.position < 0) {
        errors.push('payload.position must be >= 0');
      }
    },
    
    'playback.command.volume': (e) => {
      if (typeof e.payload?.level !== 'number') {
        errors.push('playback.command.volume requires payload.level as number');
      }
      if (e.payload.level < 0 || e.payload.level > 1) {
        errors.push('payload.level must be between 0.0 and 1.0');
      }
    },
    
    'playback.result.started': (e) => {
      if (!e.payload?.trackId) {
        errors.push('playback.result.started requires payload.trackId');
      }
      if (typeof e.payload?.duration !== 'number') {
        errors.push('playback.result.started requires payload.duration as number');
      }
    },
    
    'playback.result.progress': (e) => {
      if (typeof e.payload?.position !== 'number') {
        errors.push('playback.result.progress requires payload.position as number');
      }
      if (typeof e.payload?.duration !== 'number') {
        errors.push('playback.result.progress requires payload.duration as number');
      }
    },
    
    'playback.result.error': (e) => {
      if (!e.payload?.code) {
        errors.push('playback.result.error requires payload.code');
      }
      if (!e.payload?.message) {
        errors.push('playback.result.error requires payload.message');
      }
      const validCodes = ['LOAD_FAILED', 'DECODE_ERROR', 'NETWORK_ERROR', 'INVALID_TRACK'];
      if (e.payload?.code && !validCodes.includes(e.payload.code)) {
        errors.push(`Invalid error code: ${e.payload.code}. Must be one of: ${validCodes.join(', ')}`);
      }
    },
    
    'component.command.updateState': (e) => {
      if (!e.payload?.componentId) {
        errors.push('component.command.updateState requires payload.componentId');
      }
      if (!e.payload?.state) {
        errors.push('component.command.updateState requires payload.state');
      }
    },
    
    'component.result.stateUpdated': (e) => {
      if (!e.payload?.componentId) {
        errors.push('component.result.stateUpdated requires payload.componentId');
      }
      if (!e.payload?.previousState) {
        errors.push('component.result.stateUpdated requires payload.previousState');
      }
      if (!e.payload?.newState) {
        errors.push('component.result.stateUpdated requires payload.newState');
      }
    },
    
    'component.result.validationFailed': (e) => {
      if (!e.payload?.componentId) {
        errors.push('component.result.validationFailed requires payload.componentId');
      }
      if (!e.payload?.state) {
        errors.push('component.result.validationFailed requires payload.state');
      }
      if (!Array.isArray(e.payload?.failedChecks)) {
        errors.push('component.result.validationFailed requires payload.failedChecks as array');
      }
    },
    
    'graph.command.query': (e) => {
      if (!e.payload?.queryType) {
        errors.push('graph.command.query requires payload.queryType');
      }
      const validTypes = ['findComponentsByState', 'findLinkedUI', 'findDependencies', 'findUsages'];
      if (e.payload?.queryType && !validTypes.includes(e.payload.queryType)) {
        errors.push(`Invalid queryType: ${e.payload.queryType}. Must be one of: ${validTypes.join(', ')}`);
      }
    },
    
    'graph.result.queryResponse': (e) => {
      if (!Array.isArray(e.payload?.results)) {
        errors.push('graph.result.queryResponse requires payload.results as array');
      }
    },
    
    'ui.command.navigate': (e) => {
      if (!e.payload?.route) {
        errors.push('ui.command.navigate requires payload.route');
      }
    },
    
    'ui.result.navigated': (e) => {
      if (!e.payload?.route) {
        errors.push('ui.result.navigated requires payload.route');
      }
    },
    
    'audio.command.process': (e) => {
      if (!e.payload?.operation) {
        errors.push('audio.command.process requires payload.operation');
      }
      if (!e.payload?.audioData) {
        errors.push('audio.command.process requires payload.audioData');
      }
      const validOps = ['normalize', 'fade', 'trim', 'mix', 'analyze'];
      if (e.payload?.operation && !validOps.includes(e.payload.operation)) {
        errors.push(`Invalid operation: ${e.payload.operation}. Must be one of: ${validOps.join(', ')}`);
      }
    },
    
    'audio.result.processed': (e) => {
      if (!e.payload?.operation) {
        errors.push('audio.result.processed requires payload.operation');
      }
      if (!e.payload?.result) {
        errors.push('audio.result.processed requires payload.result');
      }
    }
  };

  const validator = validators[event.type];
  if (validator) {
    validator(event);
  }
}

/**
 * Creates a validated event with automatic timestamp and source
 * 
 * @param {string} type - Event type
 * @param {string} source - Event source
 * @param {Object} payload - Event payload
 * @param {string} [correlationId] - Optional correlation ID
 * @returns {Object} Validated event
 * @throws {Error} If event validation fails
 */
export function createEvent(type, source, payload, correlationId = null) {
  const event = {
    type,
    timestamp: Date.now(),
    source,
    payload
  };

  if (correlationId) {
    event.correlationId = correlationId;
  }

  const validation = validateEvent(event);
  if (!validation.valid) {
    const errorMsg = `Event validation failed: ${validation.errors.join(', ')}`;
    console.error(errorMsg, event);
    throw new Error(errorMsg);
  }

  return event;
}

/**
 * Logs validation errors with context
 * 
 * @param {Object} event - Event that failed validation
 * @param {Array<string>} errors - Validation errors
 */
export function logValidationErrors(event, errors) {
  console.error('[EventValidator] Validation failed:', {
    eventType: event.type,
    source: event.source,
    errors,
    event
  });
}