/**
 * @fileoverview EventBus — lightweight pub/sub for harmony-graph processors.
 *
 * Singleton instance is obtained via EventBus.getInstance().
 * Processors subscribe to typed events at construction time and publish
 * events when graph mutations occur.
 *
 * @module harmony-graph/src/core/event_bus
 */

/**
 * @typedef {Object} GraphEvent
 * @property {string} type    - Event type identifier (e.g. 'DesignSpecNode.Created')
 * @property {Object} payload - Event-specific data
 * @property {number} timestamp - Unix ms timestamp
 */

/**
 * Pub/sub event bus for harmony-graph processors.
 *
 * Consumed via EventBus.getInstance() — do not construct directly.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._subscribers = new Map();
  }

  // ─── Singleton ─────────────────────────────────────────────────────────────

  /** @type {EventBus|null} */
  static _instance = null;

  /**
   * Return the process-wide singleton.
   * @returns {EventBus}
   */
  static getInstance() {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  /**
   * Replace the singleton (useful in tests to get a fresh bus per suite).
   * @param {EventBus|null} [instance=null]
   */
  static resetInstance(instance = null) {
    EventBus._instance = instance;
  }

  // ─── Pub/sub ───────────────────────────────────────────────────────────────

  /**
   * Subscribe to events of a specific type.
   *
   * @param {string} eventType
   * @param {Function} handler - Called with a {@link GraphEvent}
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, handler) {
    if (!eventType || typeof handler !== 'function') return () => {};

    if (!this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, new Set());
    }
    this._subscribers.get(eventType).add(handler);

    return () => {
      const set = this._subscribers.get(eventType);
      if (set) set.delete(handler);
    };
  }

  /**
   * Publish an event to all subscribers of that type.
   *
   * @param {string} eventType
   * @param {Object} payload
   */
  publish(eventType, payload) {
    const event = { type: eventType, payload, timestamp: Date.now() };
    const set = this._subscribers.get(eventType);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(event);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${eventType}":`, err);
      }
    }
  }

  /**
   * Remove all subscribers for a given event type (or all types if omitted).
   * Primarily used in test teardown.
   *
   * @param {string} [eventType]
   */
  clear(eventType) {
    if (eventType) {
      this._subscribers.delete(eventType);
    } else {
      this._subscribers.clear();
    }
  }
}
