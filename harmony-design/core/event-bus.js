/**
 * @fileoverview EventBus Implementation for Harmony Design System
 * Central event routing system following the ProcessCommand pattern.
 * See DESIGN_SYSTEM.md#event-bus-architecture for details.
 * 
 * @performance Target: <0.5ms event routing
 * @memory Bounded subscriber list with cleanup
 */

/**
 * EventBus - Central event routing system
 * Implements pub/sub pattern with type validation and error handling
 * 
 * @class EventBus
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._subscribers = new Map();
    
    /** @type {Array<{type: string, payload: any, timestamp: number}>} */
    this._eventHistory = [];
    
    /** @type {number} */
    this._maxHistorySize = 100;
    
    /** @type {boolean} */
    this._debugMode = false;
  }

  /**
   * Enables debug mode for verbose logging
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this._debugMode = enabled;
    if (enabled) {
      console.log('[EventBus] Debug mode enabled');
    }
  }

  /**
   * Subscribes to an event type
   * @param {string} eventType - The event type to subscribe to
   * @param {Function} callback - The callback function to invoke
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (typeof eventType !== 'string' || !eventType) {
      console.error('[EventBus] Invalid event type:', eventType);
      return () => {};
    }

    if (typeof callback !== 'function') {
      console.error('[EventBus] Invalid callback for event type:', eventType);
      return () => {};
    }

    if (!this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, new Set());
    }

    this._subscribers.get(eventType).add(callback);

    if (this._debugMode) {
      console.log(`[EventBus] Subscribed to '${eventType}'. Total subscribers: ${this._subscribers.get(eventType).size}`);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(eventType, callback);
    };
  }

  /**
   * Unsubscribes from an event type
   * @param {string} eventType - The event type to unsubscribe from
   * @param {Function} callback - The callback function to remove
   */
  unsubscribe(eventType, callback) {
    if (!this._subscribers.has(eventType)) {
      return;
    }

    const subscribers = this._subscribers.get(eventType);
    subscribers.delete(callback);

    if (subscribers.size === 0) {
      this._subscribers.delete(eventType);
    }

    if (this._debugMode) {
      console.log(`[EventBus] Unsubscribed from '${eventType}'. Remaining subscribers: ${subscribers.size}`);
    }
  }

  /**
   * Publishes an event to all subscribers
   * @param {string} eventType - The event type to publish
   * @param {any} payload - The event payload
   */
  publish(eventType, payload) {
    const startTime = performance.now();

    if (typeof eventType !== 'string' || !eventType) {
      console.error('[EventBus] Invalid event type:', eventType);
      return;
    }

    // Record event in history
    this._recordEvent(eventType, payload);

    const subscribers = this._subscribers.get(eventType);

    if (!subscribers || subscribers.size === 0) {
      if (this._debugMode) {
        console.warn(`[EventBus] No subscribers for event '${eventType}'`, payload);
      }
      return;
    }

    if (this._debugMode) {
      console.log(`[EventBus] Publishing '${eventType}' to ${subscribers.size} subscriber(s)`, payload);
    }

    // Invoke all subscribers
    subscribers.forEach(callback => {
      try {
        callback(payload, eventType);
      } catch (error) {
        console.error(`[EventBus] Error in subscriber for '${eventType}':`, error, {
          eventType,
          payload,
          error: error.message,
          stack: error.stack
        });
      }
    });

    const duration = performance.now() - startTime;
    
    if (duration > 1) {
      console.warn(`[EventBus] Slow event processing for '${eventType}': ${duration.toFixed(2)}ms`);
    }

    if (this._debugMode) {
      console.log(`[EventBus] Event '${eventType}' processed in ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Records event in history for debugging
   * @private
   * @param {string} eventType
   * @param {any} payload
   */
  _recordEvent(eventType, payload) {
    this._eventHistory.push({
      type: eventType,
      payload: payload,
      timestamp: Date.now()
    });

    // Maintain bounded history
    if (this._eventHistory.length > this._maxHistorySize) {
      this._eventHistory.shift();
    }
  }

  /**
   * Gets recent event history
   * @param {number} limit - Maximum number of events to return
   * @returns {Array<{type: string, payload: any, timestamp: number}>}
   */
  getEventHistory(limit = 50) {
    return this._eventHistory.slice(-limit);
  }

  /**
   * Gets all current subscribers
   * @returns {Map<string, number>} Map of event types to subscriber counts
   */
  getSubscribers() {
    const result = new Map();
    this._subscribers.forEach((subscribers, eventType) => {
      result.set(eventType, subscribers.size);
    });
    return result;
  }

  /**
   * Clears all subscribers (use with caution)
   */
  clear() {
    this._subscribers.clear();
    console.log('[EventBus] All subscribers cleared');
  }

  /**
   * Clears event history
   */
  clearHistory() {
    this._eventHistory = [];
    console.log('[EventBus] Event history cleared');
  }
}

// Create global singleton instance
if (!window.EventBus) {
  window.EventBus = new EventBus();
  console.log('[EventBus] Initialized');
}