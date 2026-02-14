/**
 * Development mode utilities for EventBus
 * 
 * Provides stricter error handling and validation in development environments.
 * In production, validation errors are logged but don't throw to prevent app crashes.
 * 
 * Related: harmony-design/DESIGN_SYSTEM.md#event-bus-validation
 * 
 * @module harmony-core/event-bus/dev-mode
 */

/**
 * Determines if the application is running in development mode
 * 
 * Checks multiple signals:
 * - hostname is localhost or 127.0.0.1
 * - URL contains ?dev=true
 * - localStorage has devMode flag
 * 
 * @returns {boolean} True if in development mode
 */
export function isDevMode() {
  // Check hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
      return true;
    }
    
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === 'true') {
      return true;
    }
    
    // Check localStorage flag
    try {
      if (localStorage.getItem('harmonyDevMode') === 'true') {
        return true;
      }
    } catch (e) {
      // localStorage might not be available
    }
  }
  
  return false;
}

/**
 * Schema violation error class
 * 
 * Thrown when an event payload doesn't match its schema in development mode.
 * Contains detailed information for debugging.
 */
export class SchemaViolationError extends Error {
  /**
   * @param {string} eventType - The type of event that violated schema
   * @param {Object} payload - The invalid payload
   * @param {Array<string>} violations - List of validation error messages
   * @param {string|null} source - Component that emitted the event
   */
  constructor(eventType, payload, violations, source = null) {
    const violationList = violations.map(v => `  - ${v}`).join('\n');
    const sourceInfo = source ? ` from ${source}` : '';
    
    super(
      `Schema violation in event "${eventType}"${sourceInfo}:\n${violationList}\n\n` +
      `Payload: ${JSON.stringify(payload, null, 2)}\n\n` +
      `This error is only thrown in development mode. In production, ` +
      `violations are logged but don't throw.`
    );
    
    this.name = 'SchemaViolationError';
    this.eventType = eventType;
    this.payload = payload;
    this.violations = violations;
    this.source = source;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SchemaViolationError);
    }
  }
}

/**
 * Missing subscriber error class
 * 
 * Thrown when an event is emitted but has no subscribers in development mode.
 * Helps catch configuration issues and dead event emissions.
 */
export class MissingSubscriberError extends Error {
  /**
   * @param {string} eventType - The type of event with no subscribers
   * @param {string|null} source - Component that emitted the event
   */
  constructor(eventType, source = null) {
    const sourceInfo = source ? ` from ${source}` : '';
    
    super(
      `No subscribers for event "${eventType}"${sourceInfo}.\n\n` +
      `This may indicate:\n` +
      `  - The event type is misspelled\n` +
      `  - The subscriber hasn't been registered yet\n` +
      `  - The bounded context isn't loaded\n\n` +
      `This error is only thrown in development mode.`
    );
    
    this.name = 'MissingSubscriberError';
    this.eventType = eventType;
    this.source = source;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MissingSubscriberError);
    }
  }
}

/**
 * Handles a schema violation based on current mode
 * 
 * In development: throws SchemaViolationError
 * In production: logs error to console
 * 
 * @param {string} eventType - The type of event that violated schema
 * @param {Object} payload - The invalid payload
 * @param {Array<string>} violations - List of validation error messages
 * @param {string|null} source - Component that emitted the event
 * @throws {SchemaViolationError} In development mode
 */
export function handleSchemaViolation(eventType, payload, violations, source = null) {
  const error = new SchemaViolationError(eventType, payload, violations, source);
  
  if (isDevMode()) {
    throw error;
  } else {
    console.error(error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Handles a missing subscriber based on current mode
 * 
 * In development: throws MissingSubscriberError
 * In production: logs warning to console
 * 
 * @param {string} eventType - The type of event with no subscribers
 * @param {string|null} source - Component that emitted the event
 * @throws {MissingSubscriberError} In development mode
 */
export function handleMissingSubscriber(eventType, source = null) {
  const error = new MissingSubscriberError(eventType, source);
  
  if (isDevMode()) {
    throw error;
  } else {
    console.warn(error.message);
  }
}

/**
 * Enables development mode manually
 * 
 * Useful for testing error handling in production builds.
 * Sets a localStorage flag that persists across page loads.
 */
export function enableDevMode() {
  try {
    localStorage.setItem('harmonyDevMode', 'true');
    console.log('Development mode enabled. Reload page to take effect.');
  } catch (e) {
    console.error('Could not enable dev mode:', e);
  }
}

/**
 * Disables development mode manually
 */
export function disableDevMode() {
  try {
    localStorage.removeItem('harmonyDevMode');
    console.log('Development mode disabled. Reload page to take effect.');
  } catch (e) {
    console.error('Could not disable dev mode:', e);
  }
}