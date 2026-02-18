/**
 * @fileoverview EventBus implementation for decoupling UI components from Bounded Contexts.
 * See: /harmony-design/DESIGN_SYSTEM.md#event-system
 * 
 * @module harmony-core/event-bus
 */

/**
 * @typedef {Object} Event
 * @property {string} type - Event type in format: {domain}.{context}.{action}
 * @property {*} payload - Event payload
 * @property {string} [source] - Source component/BC identifier
 * @property {number} timestamp - Event timestamp
 */

/**
 * @typedef {function(Event): void} EventHandler
 */

/**
 * EventBus for publish-subscribe pattern between UI and Bounded Contexts.
 * Enforces policy: Components never call BCs directly.
 * 
 * @class EventBus
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<EventHandler>>} */
    this.subscribers = new Map();
    
    /** @type {Array<Event>} */
    this.eventHistory = [];
    
    /** @type {number} */
    this.maxHistorySize = 100;
    
    /** @type {boolean} */
    this.debugMode = false;
  }

  /**
   * Subscribe to events of a specific type.
   * 
   * @param {string} eventType - Event type to subscribe to
   * @param {EventHandler} handler - Handler function
   * @returns {function(): void} Unsubscribe function
   */
  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType).add(handler);
    
    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to: ${eventType}`, handler);
    }
    
    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Publish an event to all subscribers.
   * 
   * @param {Event} event - Event to publish
   * @throws {Error} If event validation fails
   */
  publish(event) {
    // Validate event structure
    if (!event.type || typeof event.type !== 'string') {
      const error = new Error('Event must have a string type property');
      console.error('[EventBus] Validation error:', error, event);
      throw error;
    }

    // Enrich event with metadata
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      source: event.source || 'unknown'
    };

    // Add to history
    this.eventHistory.push(enrichedEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get subscribers for this event type
    const handlers = this.subscribers.get(event.type);
    
    if (!handlers || handlers.size === 0) {
      if (this.debugMode) {
        console.warn(`[EventBus] No subscribers for event: ${event.type}`, event);
      }
      return;
    }

    if (this.debugMode) {
      console.log(`[EventBus] Publishing: ${event.type}`, enrichedEvent);
      console.log(`[EventBus] Subscribers: ${handlers.size}`);
    }

    // Notify all subscribers
    handlers.forEach(handler => {
      try {
        handler(enrichedEvent);
      } catch (error) {
        console.error(
          `[EventBus] Handler error for event: ${event.type}`,
          { event: enrichedEvent, error, handler }
        );
      }
    });
  }

  /**
   * Get event history for debugging.
   * 
   * @returns {Array<Event>} Event history
   */
  getHistory() {
    return [...this.eventHistory];
  }

  /**
   * Clear event history.
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Enable or disable debug mode.
   * 
   * @param {boolean} enabled - Debug mode state
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`[EventBus] Debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  /**
   * Get current subscribers for debugging.
   * 
   * @returns {Object} Subscriber information
   */
  getSubscribers() {
    const result = {};
    this.subscribers.forEach((handlers, eventType) => {
      result[eventType] = handlers.size;
    });
    return result;
  }
}

// Create global singleton instance
if (typeof window !== 'undefined') {
  window.eventBus = window.eventBus || new EventBus();
}