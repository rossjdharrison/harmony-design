/**
 * @fileoverview EventEnvelope - Wraps events with context and prevents reprocessing
 * @module core/event-envelope
 * 
 * EventEnvelope provides:
 * - Context metadata (source, timestamp, correlation)
 * - Deduplication via propagation_id
 * - Event tracing and debugging support
 * - Immutable event wrapping
 * 
 * Related: See DESIGN_SYSTEM.md § Event System Architecture
 */

/**
 * @typedef {Object} EventEnvelopeMetadata
 * @property {string} propagation_id - Unique ID for deduplication (prevents reprocessing)
 * @property {string} event_type - Type of the wrapped event
 * @property {string} source - Component/module that created the event
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {string} [correlation_id] - Optional ID to correlate related events
 * @property {string} [causation_id] - Optional ID of the event that caused this one
 * @property {number} [sequence] - Optional sequence number for ordering
 * @property {Object} [tags] - Optional tags for filtering/routing
 */

/**
 * @typedef {Object} EventEnvelope
 * @property {EventEnvelopeMetadata} metadata - Envelope metadata
 * @property {*} payload - The actual event data
 * @property {number} version - Envelope format version (currently 1)
 */

/**
 * Generates a unique propagation ID for event deduplication
 * Format: timestamp-random-counter
 * @returns {string} Unique propagation ID
 */
function generatePropagationId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  const counter = (generatePropagationId.counter = (generatePropagationId.counter || 0) + 1);
  return `${timestamp}-${random}-${counter.toString(36)}`;
}

/**
 * EventEnvelope class - Wraps events with context and deduplication support
 * 
 * Usage:
 * ```javascript
 * const envelope = EventEnvelope.wrap('ButtonClicked', { id: 'btn1' }, {
 *   source: 'ui/button',
 *   correlation_id: 'user-action-123'
 * });
 * 
 * // Check if already processed
 * if (processedIds.has(envelope.metadata.propagation_id)) {
 *   return; // Skip duplicate
 * }
 * 
 * // Process event
 * processEvent(envelope.payload);
 * processedIds.add(envelope.metadata.propagation_id);
 * ```
 */
export class EventEnvelope {
  /**
   * Creates an EventEnvelope (use EventEnvelope.wrap() instead)
   * @private
   * @param {EventEnvelopeMetadata} metadata - Envelope metadata
   * @param {*} payload - Event payload
   */
  constructor(metadata, payload) {
    this.version = 1;
    this.metadata = Object.freeze(metadata);
    this.payload = Object.freeze(payload);
    Object.freeze(this);
  }

  /**
   * Wraps an event with envelope metadata
   * @param {string} eventType - Type of event being wrapped
   * @param {*} payload - Event payload
   * @param {Object} [options] - Optional envelope options
   * @param {string} [options.source] - Event source (defaults to 'unknown')
   * @param {string} [options.correlation_id] - Correlation ID for related events
   * @param {string} [options.causation_id] - ID of event that caused this one
   * @param {number} [options.sequence] - Sequence number for ordering
   * @param {Object} [options.tags] - Tags for filtering/routing
   * @param {string} [options.propagation_id] - Override propagation ID (for testing)
   * @returns {EventEnvelope} Wrapped event with metadata
   */
  static wrap(eventType, payload, options = {}) {
    const metadata = {
      propagation_id: options.propagation_id || generatePropagationId(),
      event_type: eventType,
      source: options.source || 'unknown',
      timestamp: Date.now(),
      ...(options.correlation_id && { correlation_id: options.correlation_id }),
      ...(options.causation_id && { causation_id: options.causation_id }),
      ...(options.sequence !== undefined && { sequence: options.sequence }),
      ...(options.tags && { tags: options.tags })
    };

    return new EventEnvelope(metadata, payload);
  }

  /**
   * Unwraps envelope to get the original payload
   * @returns {*} Original event payload
   */
  unwrap() {
    return this.payload;
  }

  /**
   * Creates a new envelope as a response to this one
   * Automatically sets causation_id and correlation_id
   * @param {string} eventType - Type of response event
   * @param {*} payload - Response payload
   * @param {Object} [options] - Additional options
   * @returns {EventEnvelope} New envelope with causation linkage
   */
  reply(eventType, payload, options = {}) {
    return EventEnvelope.wrap(eventType, payload, {
      ...options,
      causation_id: this.metadata.propagation_id,
      correlation_id: this.metadata.correlation_id || this.metadata.propagation_id,
      source: options.source || this.metadata.source
    });
  }

  /**
   * Checks if this envelope is a duplicate of another
   * @param {EventEnvelope} other - Other envelope to compare
   * @returns {boolean} True if propagation_ids match
   */
  isDuplicateOf(other) {
    return other && 
           other.metadata && 
           this.metadata.propagation_id === other.metadata.propagation_id;
  }

  /**
   * Checks if this envelope is in the same correlation chain
   * @param {EventEnvelope} other - Other envelope to compare
   * @returns {boolean} True if correlation_ids match
   */
  isCorrelatedWith(other) {
    if (!other || !other.metadata) return false;
    
    const thisCorrelation = this.metadata.correlation_id || this.metadata.propagation_id;
    const otherCorrelation = other.metadata.correlation_id || other.metadata.propagation_id;
    
    return thisCorrelation === otherCorrelation;
  }

  /**
   * Checks if this envelope was caused by another
   * @param {EventEnvelope} other - Potential causal envelope
   * @returns {boolean} True if this was caused by other
   */
  wasCausedBy(other) {
    return other && 
           other.metadata && 
           this.metadata.causation_id === other.metadata.propagation_id;
  }

  /**
   * Serializes envelope to JSON
   * @returns {string} JSON representation
   */
  toJSON() {
    return {
      version: this.version,
      metadata: this.metadata,
      payload: this.payload
    };
  }

  /**
   * Deserializes envelope from JSON
   * @param {Object} json - JSON object
   * @returns {EventEnvelope} Reconstructed envelope
   * @throws {Error} If JSON is invalid
   */
  static fromJSON(json) {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON: must be an object');
    }

    if (!json.metadata || !json.metadata.propagation_id) {
      throw new Error('Invalid JSON: missing metadata.propagation_id');
    }

    if (!json.metadata.event_type) {
      throw new Error('Invalid JSON: missing metadata.event_type');
    }

    return new EventEnvelope(json.metadata, json.payload);
  }

  /**
   * Creates a debug-friendly string representation
   * @returns {string} Debug string
   */
  toString() {
    return `EventEnvelope[${this.metadata.event_type}](${this.metadata.propagation_id})`;
  }
}

/**
 * EventDeduplicator - Tracks processed propagation IDs to prevent reprocessing
 * 
 * Usage:
 * ```javascript
 * const deduplicator = new EventDeduplicator({ maxSize: 10000 });
 * 
 * if (deduplicator.isDuplicate(envelope)) {
 *   console.log('Already processed, skipping');
 *   return;
 * }
 * 
 * deduplicator.markProcessed(envelope);
 * processEvent(envelope);
 * ```
 */
export class EventDeduplicator {
  /**
   * Creates an EventDeduplicator
   * @param {Object} [options] - Configuration options
   * @param {number} [options.maxSize=10000] - Maximum tracked IDs (LRU eviction)
   * @param {number} [options.ttl=3600000] - Time-to-live in ms (default 1 hour)
   */
  constructor(options = {}) {
    this.maxSize = options.maxSize || 10000;
    this.ttl = options.ttl || 3600000; // 1 hour default
    
    /** @type {Map<string, number>} Map of propagation_id -> timestamp */
    this.processedIds = new Map();
    
    // Start cleanup timer
    this._startCleanup();
  }

  /**
   * Checks if an envelope has already been processed
   * @param {EventEnvelope} envelope - Envelope to check
   * @returns {boolean} True if already processed
   */
  isDuplicate(envelope) {
    if (!envelope || !envelope.metadata) return false;
    
    const id = envelope.metadata.propagation_id;
    const timestamp = this.processedIds.get(id);
    
    if (!timestamp) return false;
    
    // Check if expired
    if (Date.now() - timestamp > this.ttl) {
      this.processedIds.delete(id);
      return false;
    }
    
    return true;
  }

  /**
   * Marks an envelope as processed
   * @param {EventEnvelope} envelope - Envelope to mark
   */
  markProcessed(envelope) {
    if (!envelope || !envelope.metadata) return;
    
    const id = envelope.metadata.propagation_id;
    
    // LRU eviction if at capacity
    if (this.processedIds.size >= this.maxSize) {
      const firstKey = this.processedIds.keys().next().value;
      this.processedIds.delete(firstKey);
    }
    
    this.processedIds.set(id, Date.now());
  }

  /**
   * Clears all tracked IDs
   */
  clear() {
    this.processedIds.clear();
  }

  /**
   * Gets the number of tracked IDs
   * @returns {number} Count of tracked IDs
   */
  get size() {
    return this.processedIds.size;
  }

  /**
   * Starts periodic cleanup of expired IDs
   * @private
   */
  _startCleanup() {
    // Run cleanup every 5 minutes
    this._cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expired = [];
      
      for (const [id, timestamp] of this.processedIds.entries()) {
        if (now - timestamp > this.ttl) {
          expired.push(id);
        }
      }
      
      expired.forEach(id => this.processedIds.delete(id));
      
      if (expired.length > 0) {
        console.debug(`EventDeduplicator: Cleaned up ${expired.length} expired IDs`);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Stops the cleanup timer
   */
  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }
}

/**
 * Global deduplicator instance for convenience
 * Can be replaced with a custom instance if needed
 */
export const globalDeduplicator = new EventDeduplicator();