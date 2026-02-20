/**
 * @fileoverview Consolidated EventBus implementation for Harmony Design System
 * @module core/EventBus
 * 
 * Centralized event routing system following ProcessCommand pattern.
 * Supports type validation, subscriber management, and debugging.
 * 
 * Related: DESIGN_SYSTEM.md § EventBus Architecture
 * Related: components/EventBusComponent.js (debugging UI)
 */

/**
 * Event subscription configuration
 * @typedef {Object} EventSubscription
 * @property {string} id - Unique subscription identifier
 * @property {string} eventType - Type of event to subscribe to
 * @property {Function} handler - Callback function
 * @property {Object} [context] - Optional context for handler
 * @property {number} priority - Execution priority (higher = earlier)
 */

/**
 * Event payload structure
 * @typedef {Object} EventPayload
 * @property {string} type - Event type identifier
 * @property {*} data - Event data
 * @property {string} [source] - Event source identifier
 * @property {number} timestamp - Event creation timestamp
 * @property {string} [correlationId] - For tracking related events
 */

/**
 * Consolidated EventBus implementation
 * Singleton pattern for global event coordination
 */
class EventBus {
  constructor() {
    if (EventBus.instance) {
      return EventBus.instance;
    }

    /** @type {Map<string, Set<EventSubscription>>} */
    this.subscribers = new Map();
    
    /** @type {Array<EventPayload>} */
    this.eventHistory = [];
    
    /** @type {number} */
    this.maxHistorySize = 1000;
    
    /** @type {boolean} */
    this.debugMode = false;
    
    /** @type {Set<string>} */
    this.validEventTypes = new Set();
    
    /** @type {number} */
    this.subscriptionCounter = 0;

    EventBus.instance = this;
  }

  /**
   * Register valid event types for validation
   * @param {string[]} types - Array of valid event type strings
   */
  registerEventTypes(types) {
    types.forEach(type => this.validEventTypes.add(type));
    if (this.debugMode) {
      console.log('[EventBus] Registered event types:', types);
    }
  }

  /**
   * Subscribe to events of a specific type
   * @param {string} eventType - Type of event to subscribe to
   * @param {Function} handler - Callback function
   * @param {Object} [options] - Subscription options
   * @param {Object} [options.context] - Context for handler execution
   * @param {number} [options.priority=0] - Execution priority
   * @returns {string} Subscription ID for unsubscribing
   */
  subscribe(eventType, handler, options = {}) {
    if (typeof handler !== 'function') {
      const error = new Error('[EventBus] Handler must be a function');
      console.error(error, { eventType, handler });
      throw error;
    }

    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    const subscription = {
      id: `sub_${++this.subscriptionCounter}`,
      eventType,
      handler,
      context: options.context || null,
      priority: options.priority || 0
    };

    this.subscribers.get(eventType).add(subscription);

    if (this.debugMode) {
      console.log('[EventBus] Subscription added:', {
        id: subscription.id,
        eventType,
        subscriberCount: this.subscribers.get(eventType).size
      });
    }

    return subscription.id;
  }

  /**
   * Unsubscribe from events
   * @param {string} subscriptionId - ID returned from subscribe()
   * @returns {boolean} True if unsubscribed successfully
   */
  unsubscribe(subscriptionId) {
    for (const [eventType, subs] of this.subscribers.entries()) {
      for (const sub of subs) {
        if (sub.id === subscriptionId) {
          subs.delete(sub);
          if (this.debugMode) {
            console.log('[EventBus] Unsubscribed:', subscriptionId);
          }
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Publish event following ProcessCommand pattern
   * @param {string} eventType - Type of event
   * @param {*} data - Event data payload
   * @param {Object} [options] - Publishing options
   * @param {string} [options.source] - Event source identifier
   * @param {string} [options.correlationId] - Correlation ID for tracking
   * @returns {Promise<void>}
   */
  async publish(eventType, data, options = {}) {
    // Validate event type if validation is enabled
    if (this.validEventTypes.size > 0 && !this.validEventTypes.has(eventType)) {
      const error = new Error(`[EventBus] Invalid event type: ${eventType}`);
      console.error(error, {
        eventType,
        validTypes: Array.from(this.validEventTypes)
      });
      throw error;
    }

    const event = {
      type: eventType,
      data,
      source: options.source || 'unknown',
      timestamp: Date.now(),
      correlationId: options.correlationId || this.generateCorrelationId()
    };

    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    if (this.debugMode) {
      console.log('[EventBus] Event published:', event);
    }

    // Dispatch to subscribers
    const subscribers = this.subscribers.get(eventType);
    if (!subscribers || subscribers.size === 0) {
      if (this.debugMode) {
        console.warn('[EventBus] No subscribers for event type:', eventType);
      }
      return;
    }

    // Sort by priority (higher priority first)
    const sortedSubscribers = Array.from(subscribers).sort(
      (a, b) => b.priority - a.priority
    );

    // Execute handlers
    for (const sub of sortedSubscribers) {
      try {
        const result = sub.context
          ? sub.handler.call(sub.context, event)
          : sub.handler(event);
        
        // Handle async handlers
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error('[EventBus] Handler error:', {
          eventType,
          subscriptionId: sub.id,
          error: error.message,
          stack: error.stack
        });
      }
    }
  }

  /**
   * Publish event synchronously (use sparingly)
   * @param {string} eventType - Type of event
   * @param {*} data - Event data payload
   * @param {Object} [options] - Publishing options
   */
  publishSync(eventType, data, options = {}) {
    const event = {
      type: eventType,
      data,
      source: options.source || 'unknown',
      timestamp: Date.now(),
      correlationId: options.correlationId || this.generateCorrelationId()
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    const subscribers = this.subscribers.get(eventType);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const sortedSubscribers = Array.from(subscribers).sort(
      (a, b) => b.priority - a.priority
    );

    for (const sub of sortedSubscribers) {
      try {
        if (sub.context) {
          sub.handler.call(sub.context, event);
        } else {
          sub.handler(event);
        }
      } catch (error) {
        console.error('[EventBus] Handler error:', {
          eventType,
          subscriptionId: sub.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Generate unique correlation ID
   * @returns {string}
   */
  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event history
   * @param {Object} [filter] - Optional filter
   * @param {string} [filter.type] - Filter by event type
   * @param {string} [filter.source] - Filter by source
   * @param {number} [filter.since] - Filter by timestamp
   * @returns {Array<EventPayload>}
   */
  getHistory(filter = {}) {
    let history = [...this.eventHistory];

    if (filter.type) {
      history = history.filter(e => e.type === filter.type);
    }
    if (filter.source) {
      history = history.filter(e => e.source === filter.source);
    }
    if (filter.since) {
      history = history.filter(e => e.timestamp >= filter.since);
    }

    return history;
  }

  /**
   * Get subscriber count for event type
   * @param {string} eventType - Event type
   * @returns {number}
   */
  getSubscriberCount(eventType) {
    const subs = this.subscribers.get(eventType);
    return subs ? subs.size : 0;
  }

  /**
   * Get all registered event types
   * @returns {string[]}
   */
  getRegisteredEventTypes() {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Clear all subscribers (use with caution)
   */
  clearAllSubscribers() {
    this.subscribers.clear();
    if (this.debugMode) {
      console.log('[EventBus] All subscribers cleared');
    }
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    if (this.debugMode) {
      console.log('[EventBus] History cleared');
    }
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get diagnostic information
   * @returns {Object}
   */
  getDiagnostics() {
    const eventTypeCounts = {};
    for (const [type, subs] of this.subscribers.entries()) {
      eventTypeCounts[type] = subs.size;
    }

    return {
      totalSubscribers: Array.from(this.subscribers.values())
        .reduce((sum, subs) => sum + subs.size, 0),
      eventTypes: this.getRegisteredEventTypes(),
      subscribersByType: eventTypeCounts,
      historySize: this.eventHistory.length,
      debugMode: this.debugMode,
      validEventTypes: Array.from(this.validEventTypes)
    };
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Export singleton
export default eventBus;
export { EventBus };