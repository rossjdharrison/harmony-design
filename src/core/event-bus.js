/**
 * @fileoverview Central EventBus for Harmony Design System
 * Provides typed event publishing and subscription with validation.
 * See DESIGN_SYSTEM.md § Event Architecture for usage patterns.
 */

/**
 * @typedef {Object} HarmonyEvent
 * @property {string} type - Event type identifier
 * @property {string} source - Component or context that published the event
 * @property {Object} payload - Event-specific data
 * @property {number} timestamp - Event creation timestamp
 */

/**
 * Central event bus for component and bounded context communication.
 * Implements publish-subscribe pattern with type validation.
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
   * @param {Function} handler - Callback function (receives HarmonyEvent)
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, handler) {
    if (!eventType || typeof eventType !== 'string') {
      console.error('[EventBus] Invalid event type:', eventType);
      return () => {};
    }

    if (typeof handler !== 'function') {
      console.error('[EventBus] Invalid handler for event type:', eventType);
      return () => {};
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    this.subscribers.get(eventType).add(handler);

    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to: ${eventType}`);
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
   * Publish an event to all subscribers
   * @param {string} eventType - The event type
   * @param {string} source - Component or context publishing the event
   * @param {Object} payload - Event data
   */
  publish(eventType, source, payload = {}) {
    if (!eventType || typeof eventType !== 'string') {
      console.error('[EventBus] Cannot publish: invalid event type', eventType);
      return;
    }

    if (!source || typeof source !== 'string') {
      console.error('[EventBus] Cannot publish: invalid source', { eventType, source });
      return;
    }

    /** @type {HarmonyEvent} */
    const event = {
      type: eventType,
      source,
      payload,
      timestamp: Date.now()
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Get subscribers
    const handlers = this.subscribers.get(eventType);
    
    if (!handlers || handlers.size === 0) {
      if (this.debugMode) {
        console.warn(`[EventBus] No subscribers for event: ${eventType}`, { source, payload });
      }
      return;
    }

    if (this.debugMode) {
      console.log(`[EventBus] Publishing: ${eventType}`, { source, payload, subscribers: handlers.size });
    }

    // Notify all subscribers
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${eventType}:`, error, { source, payload });
      }
    });
  }

  /**
   * Process a command (alias for publish with command semantics)
   * @param {string} commandType - The command type
   * @param {string} source - Component issuing the command
   * @param {Object} payload - Command parameters
   */
  processCommand(commandType, source, payload = {}) {
    this.publish(commandType, source, payload);
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
   * Enable/disable debug mode
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
    console.log(`[EventBus] Debug mode: ${this.debugMode ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current subscriber count for an event type
   * @param {string} eventType
   * @returns {number}
   */
  getSubscriberCount(eventType) {
    const handlers = this.subscribers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * Get all registered event types
   * @returns {Array<string>}
   */
  getEventTypes() {
    return Array.from(this.subscribers.keys());
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Expose globally for debugging
if (typeof window !== 'undefined') {
  window.HarmonyEventBus = eventBus;
}

export default eventBus;