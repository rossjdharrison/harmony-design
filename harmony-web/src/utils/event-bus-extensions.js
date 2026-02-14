/**
 * @fileoverview EventBus extensions for wildcard subscriptions
 * @see harmony-design/DESIGN_SYSTEM.md#event-bus-extensions
 */

/**
 * Extend EventBus with subscribeAll capability for monitoring
 * This should be called after EventBus is initialized
 */
export function extendEventBus() {
  if (!window.EventBus) {
    console.warn('EventBus not found, cannot extend');
    return;
  }

  // Store all subscribers
  if (!window.EventBus._allSubscribers) {
    window.EventBus._allSubscribers = new Set();
  }

  // Store original publish method
  if (!window.EventBus._originalPublish) {
    window.EventBus._originalPublish = window.EventBus.publish;
  }

  /**
   * Subscribe to all events (monitoring/debugging)
   * @param {Function} callback - Callback function receiving all events
   */
  window.EventBus.subscribeAll = function(callback) {
    if (typeof callback !== 'function') {
      throw new Error('subscribeAll requires a callback function');
    }
    this._allSubscribers.add(callback);
  };

  /**
   * Unsubscribe from all events
   * @param {Function} callback - Callback function to remove
   */
  window.EventBus.unsubscribeAll = function(callback) {
    this._allSubscribers.delete(callback);
  };

  /**
   * Enhanced publish that notifies all subscribers
   * @param {string} eventType - Event type
   * @param {Object} payload - Event payload
   * @param {string} source - Event source
   */
  window.EventBus.publish = function(eventType, payload, source = 'unknown') {
    // Call original publish
    const result = this._originalPublish.call(this, eventType, payload, source);

    // Notify all subscribers
    const event = {
      type: eventType,
      payload: payload,
      source: source,
      timestamp: Date.now()
    };

    this._allSubscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in subscribeAll callback:', error);
      }
    });

    return result;
  };

  console.log('EventBus extended with subscribeAll capability');
}

/**
 * Initialize EventBus extensions on DOM ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', extendEventBus);
} else {
  extendEventBus();
}