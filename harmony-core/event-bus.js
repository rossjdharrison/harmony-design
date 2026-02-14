/**
 * @fileoverview EventBus - Central event routing system for Harmony Design System
 * 
 * The EventBus enables decoupled communication between UI components and bounded contexts.
 * All events are validated and logged for debugging.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#event-driven-communication
 */

/**
 * @typedef {Object} HarmonyEvent
 * @property {string} type - Event type identifier
 * @property {string} source - Component or context that published the event
 * @property {*} payload - Event data
 * @property {number} timestamp - Event creation timestamp
 */

/**
 * Central event bus for Harmony Design System
 * Manages event publication, subscription, and routing
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.subscribers = new Map();
    
    /** @type {Array<HarmonyEvent>} */
    this.eventHistory = [];
    
    /** @type {number} */
    this.maxHistorySize = 100;
    
    /** @type {boolean} */
    this.debugMode = false;
  }

  /**
   * Subscribe to events of a specific type
   * @param {string} eventType - The event type to listen for
   * @param {Function} handler - Callback function to handle the event
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, handler) {
    if (typeof eventType !== 'string' || !eventType) {
      this._logError('subscribe', 'Invalid event type', { eventType });
      return () => {};
    }

    if (typeof handler !== 'function') {
      this._logError('subscribe', 'Handler must be a function', { eventType });
      return () => {};
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType).add(handler);

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
   * Publish an event to all subscribers
   * @param {string} eventType - The event type
   * @param {string} source - The source component/context
   * @param {*} payload - The event payload
   */
  publish(eventType, source, payload) {
    // Validate inputs
    if (typeof eventType !== 'string' || !eventType) {
      this._logError('publish', 'Invalid event type', { eventType, source, payload });
      return;
    }

    if (typeof source !== 'string' || !source) {
      this._logError('publish', 'Invalid source', { eventType, source, payload });
      return;
    }

    // Create event object
    const event = {
      type: eventType,
      source,
      payload,
      timestamp: Date.now()
    };

    // Add to history
    this._addToHistory(event);

    // Log if in debug mode
    if (this.debugMode) {
      console.log('[EventBus] Publishing:', event);
    }

    // Get subscribers
    const handlers = this.subscribers.get(eventType);

    if (!handlers || handlers.size === 0) {
      if (this.debugMode) {
        console.warn('[EventBus] No subscribers for event type:', eventType);
      }
      return;
    }

    // Call all handlers
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        this._logError('publish', 'Handler threw error', {
          eventType,
          source,
          error: error.message,
          stack: error.stack
        });
      }
    });
  }

  /**
   * Get event history for debugging
   * @returns {Array<HarmonyEvent>}
   */
  getHistory() {
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
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
    console.log('[EventBus] Debug mode:', this.debugMode ? 'enabled' : 'disabled');
  }

  /**
   * Add event to history with size limit
   * @private
   * @param {HarmonyEvent} event
   */
  _addToHistory(event) {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Log error with context
   * @private
   * @param {string} operation - The operation that failed
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   */
  _logError(operation, message, context) {
    console.error('[EventBus Error]', {
      operation,
      message,
      context,
      timestamp: Date.now()
    });
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.HarmonyEventBus = eventBus;
}

export default eventBus;