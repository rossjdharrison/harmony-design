/**
 * @fileoverview Central event bus for component communication
 * @see harmony-design/DESIGN_SYSTEM.md#event-bus
 */

import { validateEvent, EventValidationError } from './event-bus-validator.js';

/**
 * Global event bus for component-to-BC communication
 * Implements publish-subscribe pattern with runtime validation
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.subscribers = new Map();
    
    /** @type {Array<Object>} Event history for debugging */
    this.eventHistory = [];
    
    /** @type {number} Maximum history size */
    this.maxHistorySize = 100;
    
    /** @type {boolean} Whether to log events to console */
    this.debugMode = false;
  }

  /**
   * Subscribe to an event type
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} callback - Callback function (event) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (!eventType || typeof eventType !== 'string') {
      console.error('[EventBus] Subscribe failed: eventType must be a non-empty string', {
        eventType,
        callback: callback?.name || 'anonymous'
      });
      return () => {};
    }

    if (typeof callback !== 'function') {
      console.error('[EventBus] Subscribe failed: callback must be a function', {
        eventType,
        callback
      });
      return () => {};
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType).add(callback);

    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to '${eventType}'`, {
        callback: callback.name || 'anonymous',
        totalSubscribers: this.subscribers.get(eventType).size
      });
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(eventType);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Emit an event with runtime validation
   * @param {string} eventType - Event type
   * @param {Object} event - Event object
   * @param {string} [event.source] - Event source component
   * @param {Object} [event.payload] - Event payload
   * @throws {EventValidationError} If validation fails
   */
  emit(eventType, event = {}) {
    const timestamp = Date.now();
    
    // Basic parameter validation
    if (!eventType || typeof eventType !== 'string') {
      const error = new EventValidationError(
        'Event type must be a non-empty string',
        {
          eventType,
          source: event.source,
          payload: event.payload,
          expected: 'string',
          value: eventType
        }
      );
      
      console.error('[EventBus] Emit failed:', error.getDetailedMessage());
      throw error;
    }

    if (event === null || typeof event !== 'object') {
      const error = new EventValidationError(
        'Event must be an object',
        {
          eventType,
          expected: 'object',
          value: event
        }
      );
      
      console.error('[EventBus] Emit failed:', error.getDetailedMessage());
      throw error;
    }

    // Runtime schema validation
    try {
      validateEvent(eventType, event);
    } catch (err) {
      if (err instanceof EventValidationError) {
        console.error('[EventBus] Validation failed:', err.getDetailedMessage());
        throw err;
      }
      // Re-throw unexpected errors
      throw err;
    }

    // Check for subscribers
    const subs = this.subscribers.get(eventType);
    if (!subs || subs.size === 0) {
      console.warn('[EventBus] No subscribers for event type:', {
        eventType,
        source: event.source,
        availableTypes: Array.from(this.subscribers.keys())
      });
    }

    // Add to history
    const historyEntry = {
      eventType,
      source: event.source,
      payload: event.payload,
      timestamp,
      subscriberCount: subs ? subs.size : 0
    };
    
    this.eventHistory.push(historyEntry);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Debug logging
    if (this.debugMode) {
      console.log(`[EventBus] Emitting '${eventType}'`, {
        source: event.source,
        payload: event.payload,
        subscribers: subs ? subs.size : 0
      });
    }

    // Notify subscribers
    if (subs) {
      const fullEvent = {
        type: eventType,
        source: event.source,
        payload: event.payload,
        timestamp
      };

      subs.forEach(callback => {
        try {
          callback(fullEvent);
        } catch (err) {
          console.error('[EventBus] Subscriber callback error:', {
            eventType,
            source: event.source,
            callback: callback.name || 'anonymous',
            error: err.message,
            stack: err.stack
          });
        }
      });
    }
  }

  /**
   * Get event history
   * @param {number} [limit] - Maximum number of events to return
   * @returns {Array<Object>} Event history
   */
  getHistory(limit) {
    if (limit && limit > 0) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
    console.log(`[EventBus] Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get all subscriber counts by event type
   * @returns {Object} Map of event type to subscriber count
   */
  getSubscriberCounts() {
    const counts = {};
    this.subscribers.forEach((subs, eventType) => {
      counts[eventType] = subs.size;
    });
    return counts;
  }

  /**
   * Check if an event type has subscribers
   * @param {string} eventType - Event type to check
   * @returns {boolean} True if event type has subscribers
   */
  hasSubscribers(eventType) {
    const subs = this.subscribers.get(eventType);
    return subs && subs.size > 0;
  }
}

// Global singleton instance
export const eventBus = new EventBus();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.__harmonyEventBus = eventBus;
}