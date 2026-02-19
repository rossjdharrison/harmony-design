/**
 * @fileoverview EventCoalescer - Batches rapid-fire events of the same type within a time window
 * @module core/event-coalescer
 * 
 * Design Philosophy:
 * - Reduces event processing overhead by batching similar events
 * - Configurable time windows per event type
 * - Preserves event order and context
 * - Memory-efficient with automatic cleanup
 * 
 * Performance Targets:
 * - Coalescing overhead: < 1ms per batch
 * - Memory: < 1MB for 1000 pending events
 * - Batch dispatch: < 5ms for 100 events
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Event System Architecture
 * Related Code: core/event-envelope.js, core/graph-event.js
 */

/**
 * @typedef {Object} CoalescerConfig
 * @property {number} windowMs - Time window in milliseconds for batching (default: 100ms)
 * @property {number} maxBatchSize - Maximum events per batch (default: 50)
 * @property {boolean} preserveFirst - Keep first event separate (default: false)
 * @property {boolean} preserveLast - Keep last event separate (default: false)
 * @property {Function} [mergeStrategy] - Custom merge function for event payloads
 */

/**
 * @typedef {Object} CoalescedBatch
 * @property {string} eventType - Type of events in this batch
 * @property {Array} events - Array of coalesced events
 * @property {number} count - Number of events in batch
 * @property {number} firstTimestamp - Timestamp of first event
 * @property {number} lastTimestamp - Timestamp of last event
 * @property {Object} mergedPayload - Merged payload if merge strategy provided
 */

/**
 * EventCoalescer batches rapid-fire events of the same type within configurable time windows
 * 
 * Usage Example:
 * ```javascript
 * const coalescer = new EventCoalescer();
 * 
 * // Configure coalescing for specific event type
 * coalescer.configure('mousemove', { windowMs: 50, maxBatchSize: 20 });
 * 
 * // Add events
 * coalescer.addEvent('mousemove', { x: 100, y: 200 });
 * coalescer.addEvent('mousemove', { x: 101, y: 201 });
 * 
 * // Flush batches when ready
 * const batches = coalescer.flush('mousemove');
 * ```
 * 
 * @class EventCoalescer
 */
export class EventCoalescer {
  /**
   * Creates an EventCoalescer instance
   * @param {Object} options - Global options
   * @param {number} [options.defaultWindowMs=100] - Default time window
   * @param {number} [options.defaultMaxBatchSize=50] - Default max batch size
   * @param {boolean} [options.autoFlush=true] - Automatically flush on window expiry
   */
  constructor(options = {}) {
    /** @private */
    this.defaultWindowMs = options.defaultWindowMs || 100;
    
    /** @private */
    this.defaultMaxBatchSize = options.defaultMaxBatchSize || 50;
    
    /** @private */
    this.autoFlush = options.autoFlush !== false;
    
    /** @private @type {Map<string, CoalescerConfig>} */
    this.configs = new Map();
    
    /** @private @type {Map<string, Array>} */
    this.pendingEvents = new Map();
    
    /** @private @type {Map<string, number>} */
    this.timers = new Map();
    
    /** @private @type {Map<string, Function>} */
    this.flushCallbacks = new Map();
    
    /** @private */
    this.stats = {
      totalEventsReceived: 0,
      totalEventsBatched: 0,
      totalBatchesFlushed: 0,
      averageBatchSize: 0
    };
    
    // Performance monitoring
    /** @private */
    this.performanceMarks = new Map();
  }
  
  /**
   * Configure coalescing behavior for a specific event type
   * @param {string} eventType - Type of event to configure
   * @param {CoalescerConfig} config - Configuration options
   * @returns {EventCoalescer} - Returns this for chaining
   */
  configure(eventType, config = {}) {
    if (!eventType || typeof eventType !== 'string') {
      throw new Error('EventCoalescer.configure: eventType must be a non-empty string');
    }
    
    const fullConfig = {
      windowMs: config.windowMs || this.defaultWindowMs,
      maxBatchSize: config.maxBatchSize || this.defaultMaxBatchSize,
      preserveFirst: config.preserveFirst || false,
      preserveLast: config.preserveLast || false,
      mergeStrategy: config.mergeStrategy || null
    };
    
    // Validate config
    if (fullConfig.windowMs < 0 || fullConfig.windowMs > 10000) {
      throw new Error('EventCoalescer.configure: windowMs must be between 0 and 10000ms');
    }
    
    if (fullConfig.maxBatchSize < 1 || fullConfig.maxBatchSize > 1000) {
      throw new Error('EventCoalescer.configure: maxBatchSize must be between 1 and 1000');
    }
    
    this.configs.set(eventType, fullConfig);
    
    return this;
  }
  
  /**
   * Add an event to be coalesced
   * @param {string} eventType - Type of event
   * @param {*} payload - Event payload
   * @param {Object} [metadata={}] - Additional metadata
   * @returns {boolean} - True if event was added, false if immediately flushed
   */
  addEvent(eventType, payload, metadata = {}) {
    const startTime = performance.now();
    
    if (!eventType || typeof eventType !== 'string') {
      console.error('EventCoalescer.addEvent: eventType must be a non-empty string');
      return false;
    }
    
    this.stats.totalEventsReceived++;
    
    // Get or create config for this event type
    if (!this.configs.has(eventType)) {
      this.configure(eventType);
    }
    
    const config = this.configs.get(eventType);
    
    // Create event object
    const event = {
      type: eventType,
      payload,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        coalescerReceived: performance.now()
      }
    };
    
    // Get or create pending events array
    if (!this.pendingEvents.has(eventType)) {
      this.pendingEvents.set(eventType, []);
    }
    
    const pending = this.pendingEvents.get(eventType);
    pending.push(event);
    
    // Check if we need to flush due to batch size
    if (pending.length >= config.maxBatchSize) {
      this.flush(eventType);
      this._recordPerformance('addEvent', startTime);
      return false;
    }
    
    // Set or reset timer for auto-flush
    if (this.autoFlush) {
      this._resetTimer(eventType, config.windowMs);
    }
    
    this._recordPerformance('addEvent', startTime);
    return true;
  }
  
  /**
   * Flush all pending events of a specific type
   * @param {string} eventType - Type of events to flush
   * @returns {CoalescedBatch|null} - Batch of coalesced events or null if none pending
   */
  flush(eventType) {
    const startTime = performance.now();
    
    if (!this.pendingEvents.has(eventType)) {
      return null;
    }
    
    const pending = this.pendingEvents.get(eventType);
    
    if (pending.length === 0) {
      return null;
    }
    
    const config = this.configs.get(eventType);
    
    // Build batch
    const batch = {
      eventType,
      events: [...pending],
      count: pending.length,
      firstTimestamp: pending[0].metadata.timestamp,
      lastTimestamp: pending[pending.length - 1].metadata.timestamp,
      mergedPayload: null
    };
    
    // Apply merge strategy if provided
    if (config.mergeStrategy && typeof config.mergeStrategy === 'function') {
      try {
        batch.mergedPayload = config.mergeStrategy(pending.map(e => e.payload));
      } catch (error) {
        console.error(`EventCoalescer.flush: mergeStrategy error for ${eventType}:`, error);
      }
    }
    
    // Update stats
    this.stats.totalEventsBatched += pending.length;
    this.stats.totalBatchesFlushed++;
    this.stats.averageBatchSize = this.stats.totalEventsBatched / this.stats.totalBatchesFlushed;
    
    // Clear pending events
    this.pendingEvents.set(eventType, []);
    
    // Clear timer
    this._clearTimer(eventType);
    
    // Call flush callback if registered
    if (this.flushCallbacks.has(eventType)) {
      const callback = this.flushCallbacks.get(eventType);
      try {
        callback(batch);
      } catch (error) {
        console.error(`EventCoalescer.flush: callback error for ${eventType}:`, error);
      }
    }
    
    this._recordPerformance('flush', startTime);
    
    return batch;
  }
  
  /**
   * Flush all pending events of all types
   * @returns {Map<string, CoalescedBatch>} - Map of event types to batches
   */
  flushAll() {
    const batches = new Map();
    
    for (const eventType of this.pendingEvents.keys()) {
      const batch = this.flush(eventType);
      if (batch) {
        batches.set(eventType, batch);
      }
    }
    
    return batches;
  }
  
  /**
   * Register a callback to be called when events are flushed
   * @param {string} eventType - Type of event
   * @param {Function} callback - Callback function receiving CoalescedBatch
   * @returns {EventCoalescer} - Returns this for chaining
   */
  onFlush(eventType, callback) {
    if (!eventType || typeof eventType !== 'string') {
      throw new Error('EventCoalescer.onFlush: eventType must be a non-empty string');
    }
    
    if (typeof callback !== 'function') {
      throw new Error('EventCoalescer.onFlush: callback must be a function');
    }
    
    this.flushCallbacks.set(eventType, callback);
    
    return this;
  }
  
  /**
   * Get pending event count for a specific type
   * @param {string} eventType - Type of event
   * @returns {number} - Number of pending events
   */
  getPendingCount(eventType) {
    if (!this.pendingEvents.has(eventType)) {
      return 0;
    }
    
    return this.pendingEvents.get(eventType).length;
  }
  
  /**
   * Get all pending event types
   * @returns {Array<string>} - Array of event types with pending events
   */
  getPendingTypes() {
    const types = [];
    
    for (const [eventType, events] of this.pendingEvents.entries()) {
      if (events.length > 0) {
        types.push(eventType);
      }
    }
    
    return types;
  }
  
  /**
   * Get statistics about coalescer performance
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      pendingEventTypes: this.getPendingTypes().length,
      totalPendingEvents: Array.from(this.pendingEvents.values())
        .reduce((sum, events) => sum + events.length, 0),
      configuredTypes: this.configs.size,
      averageCoalescingTime: this._getAveragePerformance('addEvent'),
      averageFlushTime: this._getAveragePerformance('flush')
    };
  }
  
  /**
   * Clear all pending events and reset state
   */
  clear() {
    // Clear all timers
    for (const eventType of this.timers.keys()) {
      this._clearTimer(eventType);
    }
    
    this.pendingEvents.clear();
    this.timers.clear();
    
    // Reset stats
    this.stats = {
      totalEventsReceived: 0,
      totalEventsBatched: 0,
      totalBatchesFlushed: 0,
      averageBatchSize: 0
    };
    
    this.performanceMarks.clear();
  }
  
  /**
   * Reset timer for auto-flush
   * @private
   */
  _resetTimer(eventType, windowMs) {
    // Clear existing timer
    this._clearTimer(eventType);
    
    // Set new timer
    const timerId = setTimeout(() => {
      this.flush(eventType);
    }, windowMs);
    
    this.timers.set(eventType, timerId);
  }
  
  /**
   * Clear timer for event type
   * @private
   */
  _clearTimer(eventType) {
    if (this.timers.has(eventType)) {
      clearTimeout(this.timers.get(eventType));
      this.timers.delete(eventType);
    }
  }
  
  /**
   * Record performance metric
   * @private
   */
  _recordPerformance(operation, startTime) {
    const duration = performance.now() - startTime;
    
    if (!this.performanceMarks.has(operation)) {
      this.performanceMarks.set(operation, []);
    }
    
    const marks = this.performanceMarks.get(operation);
    marks.push(duration);
    
    // Keep only last 100 marks to prevent memory growth
    if (marks.length > 100) {
      marks.shift();
    }
  }
  
  /**
   * Get average performance for operation
   * @private
   */
  _getAveragePerformance(operation) {
    if (!this.performanceMarks.has(operation)) {
      return 0;
    }
    
    const marks = this.performanceMarks.get(operation);
    
    if (marks.length === 0) {
      return 0;
    }
    
    const sum = marks.reduce((acc, val) => acc + val, 0);
    return sum / marks.length;
  }
}

/**
 * Common merge strategies for event coalescing
 */
export const MergeStrategies = {
  /**
   * Keep only the last event's payload
   */
  keepLast: (payloads) => payloads[payloads.length - 1],
  
  /**
   * Keep only the first event's payload
   */
  keepFirst: (payloads) => payloads[0],
  
  /**
   * Merge all payloads into an array
   */
  toArray: (payloads) => payloads,
  
  /**
   * Merge numeric values by averaging
   */
  average: (payloads) => {
    if (payloads.length === 0) return null;
    
    const result = {};
    const keys = Object.keys(payloads[0]);
    
    for (const key of keys) {
      const values = payloads.map(p => p[key]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        result[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }
    
    return result;
  },
  
  /**
   * Merge objects by taking last non-null value for each key
   */
  mergeObjects: (payloads) => {
    return payloads.reduce((merged, payload) => {
      return { ...merged, ...payload };
    }, {});
  },
  
  /**
   * Count occurrences
   */
  count: (payloads) => ({ count: payloads.length })
};

// Singleton instance for global use
let globalCoalescer = null;

/**
 * Get or create global EventCoalescer instance
 * @returns {EventCoalescer}
 */
export function getGlobalCoalescer() {
  if (!globalCoalescer) {
    globalCoalescer = new EventCoalescer();
  }
  return globalCoalescer;
}

/**
 * Reset global EventCoalescer instance (useful for testing)
 */
export function resetGlobalCoalescer() {
  if (globalCoalescer) {
    globalCoalescer.clear();
  }
  globalCoalescer = null;
}