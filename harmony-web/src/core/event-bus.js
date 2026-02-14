/**
 * @fileoverview EventBus implementation for the Harmony Design System.
 * Provides publish-subscribe pattern for component communication.
 * See DESIGN_SYSTEM.md#event-bus for architecture details.
 */

/**
 * @typedef {Object} HarmonyEvent
 * @property {string} type - Event type identifier
 * @property {string} source - Component or context that published the event
 * @property {Object} payload - Event data
 * @property {number} timestamp - Event creation timestamp
 * @property {string} id - Unique event identifier
 */

/**
 * @typedef {Object} EventSubscription
 * @property {string} id - Unique subscription identifier
 * @property {string} eventType - Event type this subscription listens to
 * @property {Function} handler - Callback function
 * @property {Object} [options] - Subscription options
 */

/**
 * Central event bus for Harmony Design System.
 * Manages event publication, subscription, and routing between components and bounded contexts.
 * 
 * @class EventBus
 * @example
 * // Subscribe to an event
 * const subId = EventBus.subscribe('AudioPlayRequested', (event) => {
 *   console.log('Play requested:', event.payload);
 * });
 * 
 * // Publish an event
 * EventBus.publish('AudioPlayRequested', { trackId: '123' });
 * 
 * // Unsubscribe
 * EventBus.unsubscribe(subId);
 */
class EventBus {
  /**
   * Creates an EventBus instance.
   * @constructor
   */
  constructor() {
    /** @private @type {Map<string, Set<EventSubscription>>} */
    this.subscriptions = new Map();
    
    /** @private @type {Array<HarmonyEvent>} */
    this.eventHistory = [];
    
    /** @private @type {number} */
    this.maxHistorySize = 100;
    
    /** @private @type {boolean} */
    this.debugMode = false;
  }

  /**
   * Publishes an event to all subscribers.
   * 
   * @param {string} eventType - Type of event to publish
   * @param {Object} payload - Event data
   * @param {string} [source='unknown'] - Source component or context
   * @returns {string} Event ID
   * @throws {Error} If eventType is not a string or payload is not an object
   * 
   * @example
   * EventBus.publish('ButtonClicked', { buttonId: 'play-btn' }, 'PlayButton');
   */
  publish(eventType, payload, source = 'unknown') {
    if (typeof eventType !== 'string') {
      const error = new Error('Event type must be a string');
      console.error('[EventBus] Validation failure:', error.message, { eventType, payload, source });
      throw error;
    }

    if (typeof payload !== 'object' || payload === null) {
      const error = new Error('Payload must be an object');
      console.error('[EventBus] Validation failure:', error.message, { eventType, payload, source });
      throw error;
    }

    const event = {
      type: eventType,
      source,
      payload,
      timestamp: Date.now(),
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this._addToHistory(event);

    const subscribers = this.subscriptions.get(eventType);
    
    if (!subscribers || subscribers.size === 0) {
      console.warn(`[EventBus] No subscribers for event type: ${eventType}`, { source, payload });
    } else {
      if (this.debugMode) {
        console.log(`[EventBus] Publishing ${eventType}:`, event);
      }

      subscribers.forEach(subscription => {
        try {
          subscription.handler(event);
        } catch (error) {
          console.error('[EventBus] Handler error:', {
            eventType,
            source,
            payload,
            subscriptionId: subscription.id,
            error: error.message
          });
        }
      });
    }

    return event.id;
  }

  /**
   * Subscribes to an event type.
   * 
   * @param {string} eventType - Type of event to subscribe to
   * @param {Function} handler - Callback function to handle events
   * @param {Object} [options={}] - Subscription options
   * @param {boolean} [options.once=false] - Auto-unsubscribe after first event
   * @returns {string} Subscription ID for later unsubscription
   * @throws {Error} If eventType is not a string or handler is not a function
   * 
   * @example
   * const subId = EventBus.subscribe('AudioPlayRequested', (event) => {
   *   console.log('Handling play request:', event.payload);
   * }, { once: false });
   */
  subscribe(eventType, handler, options = {}) {
    if (typeof eventType !== 'string') {
      throw new Error('Event type must be a string');
    }

    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription = {
      id: subscriptionId,
      eventType,
      handler: options.once ? (event) => {
        handler(event);
        this.unsubscribe(subscriptionId);
      } : handler,
      options
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }

    this.subscriptions.get(eventType).add(subscription);

    if (this.debugMode) {
      console.log(`[EventBus] Subscribed to ${eventType}:`, subscriptionId);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribes from an event.
   * 
   * @param {string} subscriptionId - ID returned from subscribe()
   * @returns {boolean} True if unsubscribed successfully, false if not found
   * 
   * @example
   * const subId = EventBus.subscribe('SomeEvent', handler);
   * EventBus.unsubscribe(subId);
   */
  unsubscribe(subscriptionId) {
    for (const [eventType, subscribers] of this.subscriptions.entries()) {
      for (const subscription of subscribers) {
        if (subscription.id === subscriptionId) {
          subscribers.delete(subscription);
          if (subscribers.size === 0) {
            this.subscriptions.delete(eventType);
          }
          if (this.debugMode) {
            console.log(`[EventBus] Unsubscribed:`, subscriptionId);
          }
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Gets event history.
   * 
   * @param {number} [limit] - Maximum number of events to return
   * @returns {Array<HarmonyEvent>} Array of recent events
   * 
   * @example
   * const recentEvents = EventBus.getHistory(10);
   */
  getHistory(limit) {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * Clears event history.
   * 
   * @example
   * EventBus.clearHistory();
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Enables or disables debug mode.
   * 
   * @param {boolean} enabled - Whether to enable debug mode
   * 
   * @example
   * EventBus.setDebugMode(true);
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Gets all active subscriptions.
   * 
   * @returns {Object} Map of event types to subscriber counts
   * 
   * @example
   * const subs = EventBus.getSubscriptions();
   * console.log('Active subscriptions:', subs);
   */
  getSubscriptions() {
    const result = {};
    for (const [eventType, subscribers] of this.subscriptions.entries()) {
      result[eventType] = subscribers.size;
    }
    return result;
  }

  /**
   * Adds event to history with size limit.
   * @private
   * @param {HarmonyEvent} event - Event to add
   */
  _addToHistory(event) {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
}

// Singleton instance
const eventBusInstance = new EventBus();

export default eventBusInstance;