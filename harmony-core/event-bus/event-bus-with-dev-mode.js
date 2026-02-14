/**
 * EventBus integration with development mode error handling
 * 
 * Enhances the base EventBus with strict validation in development mode.
 * Integrates with existing validation infrastructure and adds throwing behavior.
 * 
 * Related: harmony-design/DESIGN_SYSTEM.md#event-bus-architecture
 * 
 * @module harmony-core/event-bus/event-bus-with-dev-mode
 */

import { 
  handleSchemaViolation, 
  handleMissingSubscriber,
  isDevMode 
} from './dev-mode.js';

/**
 * Wraps EventBus.emit to add development mode validation
 * 
 * This should be called during EventBus initialization to enhance
 * the emit method with strict validation.
 * 
 * @param {Object} eventBus - The EventBus instance to enhance
 * @param {Function} validateEvent - Validation function that returns {valid, errors}
 */
export function enhanceEventBusWithDevMode(eventBus, validateEvent) {
  const originalEmit = eventBus.emit.bind(eventBus);
  
  /**
   * Enhanced emit method with development mode validation
   * 
   * @param {string} eventType - Type of event to emit
   * @param {Object} payload - Event payload
   * @param {string|null} source - Source component identifier
   */
  eventBus.emit = function(eventType, payload, source = null) {
    // Validate against schema
    const validation = validateEvent(eventType, payload);
    
    if (!validation.valid) {
      handleSchemaViolation(eventType, payload, validation.errors, source);
      
      // In production mode, we logged but continue execution
      // Return early to prevent invalid event from propagating
      if (!isDevMode()) {
        return;
      }
    }
    
    // Check for subscribers (only in dev mode for performance)
    if (isDevMode()) {
      const hasSubscribers = eventBus.hasSubscribers(eventType);
      if (!hasSubscribers) {
        handleMissingSubscriber(eventType, source);
      }
    }
    
    // Emit the event
    originalEmit(eventType, payload, source);
  };
}

/**
 * Adds hasSubscribers method to EventBus if not present
 * 
 * @param {Object} eventBus - The EventBus instance
 */
export function ensureHasSubscribersMethod(eventBus) {
  if (!eventBus.hasSubscribers) {
    /**
     * Checks if an event type has any subscribers
     * 
     * @param {string} eventType - Event type to check
     * @returns {boolean} True if there are subscribers
     */
    eventBus.hasSubscribers = function(eventType) {
      const subscribers = this.subscribers || this._subscribers || {};
      return subscribers[eventType] && subscribers[eventType].length > 0;
    };
  }
}