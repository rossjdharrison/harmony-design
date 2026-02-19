/**
 * @fileoverview EdgeSubscription implementation for graph event filtering
 * @module harmony-graph/edge-subscription
 * 
 * EdgeSubscription defines subscription filters for graph edges, specifying:
 * - event_types[]: Which event types to subscribe to
 * - direction: Flow direction (forward, backward, bidirectional)
 * - priority: Processing priority (0-100, higher = first)
 * 
 * Related Documentation:
 * - See DESIGN_SYSTEM.md § Graph Event System
 * - See harmony-schemas/edge_subscription.json for schema
 * - See harmony-graph/graph-event.js for event types
 * 
 * Performance Constraints:
 * - Subscription matching must complete in < 1ms
 * - Priority-based sorting must be O(log n)
 * - Memory per subscription: < 1KB
 */

/**
 * Direction enum for edge subscription
 * @enum {string}
 */
export const EdgeDirection = {
  FORWARD: 'forward',
  BACKWARD: 'backward',
  BIDIRECTIONAL: 'bidirectional'
};

/**
 * EdgeSubscription class for defining event filters on graph edges
 * @class
 */
export class EdgeSubscription {
  /**
   * Creates an EdgeSubscription instance
   * @param {Object} config - Subscription configuration
   * @param {string} config.id - Unique subscription identifier
   * @param {string[]} config.event_types - Array of event types to filter
   * @param {EdgeDirection} config.direction - Direction of event flow
   * @param {number} [config.priority=50] - Priority (0-100, higher = first)
   * @param {string} [config.source_node_id] - Optional source node filter
   * @param {string} [config.target_node_id] - Optional target node filter
   * @param {Object} [config.metadata] - Additional metadata
   * @throws {Error} If configuration is invalid
   */
  constructor(config) {
    this.validate(config);
    
    this.id = config.id;
    this.event_types = [...config.event_types]; // Defensive copy
    this.direction = config.direction;
    this.priority = config.priority ?? 50;
    this.source_node_id = config.source_node_id || null;
    this.target_node_id = config.target_node_id || null;
    this.metadata = config.metadata || {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: []
    };
    
    // Performance optimization: Set for O(1) event type lookup
    this._event_type_set = new Set(this.event_types);
  }

  /**
   * Validates subscription configuration against schema
   * @param {Object} config - Configuration to validate
   * @throws {Error} If validation fails
   * @private
   */
  validate(config) {
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('EdgeSubscription: id is required and must be a string');
    }
    
    if (!/^edge-sub-[a-z0-9-]+$/.test(config.id)) {
      throw new Error('EdgeSubscription: id must match pattern "edge-sub-[a-z0-9-]+"');
    }
    
    if (!Array.isArray(config.event_types) || config.event_types.length === 0) {
      throw new Error('EdgeSubscription: event_types must be a non-empty array');
    }
    
    // Validate event type format
    for (const eventType of config.event_types) {
      if (typeof eventType !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(eventType)) {
        throw new Error(`EdgeSubscription: Invalid event type "${eventType}". Must match pattern "^[A-Za-z][A-Za-z0-9]*$"`);
      }
    }
    
    // Check for duplicate event types
    if (new Set(config.event_types).size !== config.event_types.length) {
      throw new Error('EdgeSubscription: event_types must contain unique values');
    }
    
    if (!Object.values(EdgeDirection).includes(config.direction)) {
      throw new Error(`EdgeSubscription: direction must be one of: ${Object.values(EdgeDirection).join(', ')}`);
    }
    
    if (config.priority !== undefined) {
      if (typeof config.priority !== 'number' || config.priority < 0 || config.priority > 100) {
        throw new Error('EdgeSubscription: priority must be a number between 0 and 100');
      }
    }
    
    if (config.source_node_id && !/^node-[a-z0-9-]+$/.test(config.source_node_id)) {
      throw new Error('EdgeSubscription: source_node_id must match pattern "node-[a-z0-9-]+"');
    }
    
    if (config.target_node_id && !/^node-[a-z0-9-]+$/.test(config.target_node_id)) {
      throw new Error('EdgeSubscription: target_node_id must match pattern "node-[a-z0-9-]+"');
    }
  }

  /**
   * Checks if this subscription matches a given event
   * @param {Object} event - Event to match against
   * @param {string} event.type - Event type
   * @param {string} [event.source_node_id] - Source node ID
   * @param {string} [event.target_node_id] - Target node ID
   * @returns {boolean} True if event matches subscription filters
   * 
   * Performance: O(1) for event type check, O(1) for node filters
   */
  matches(event) {
    // Fast path: Check event type using Set (O(1))
    if (!this._event_type_set.has(event.type)) {
      return false;
    }
    
    // Check source node filter if specified
    if (this.source_node_id && event.source_node_id !== this.source_node_id) {
      return false;
    }
    
    // Check target node filter if specified
    if (this.target_node_id && event.target_node_id !== this.target_node_id) {
      return false;
    }
    
    return true;
  }

  /**
   * Checks if event direction is compatible with subscription direction
   * @param {string} eventDirection - Direction of the event flow
   * @returns {boolean} True if direction is compatible
   */
  isDirectionCompatible(eventDirection) {
    if (this.direction === EdgeDirection.BIDIRECTIONAL) {
      return true;
    }
    return this.direction === eventDirection;
  }

  /**
   * Updates subscription metadata
   * @param {Object} updates - Metadata updates
   */
  updateMetadata(updates) {
    this.metadata = {
      ...this.metadata,
      ...updates,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Serializes subscription to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      event_types: this.event_types,
      direction: this.direction,
      priority: this.priority,
      source_node_id: this.source_node_id,
      target_node_id: this.target_node_id,
      metadata: this.metadata
    };
  }

  /**
   * Creates EdgeSubscription from JSON
   * @param {Object} json - JSON representation
   * @returns {EdgeSubscription} New instance
   * @static
   */
  static fromJSON(json) {
    return new EdgeSubscription(json);
  }

  /**
   * Compares two subscriptions by priority (for sorting)
   * Higher priority comes first
   * @param {EdgeSubscription} a - First subscription
   * @param {EdgeSubscription} b - Second subscription
   * @returns {number} Comparison result
   * @static
   */
  static comparePriority(a, b) {
    return b.priority - a.priority; // Descending order
  }
}

/**
 * EdgeSubscriptionRegistry manages multiple subscriptions with efficient lookup
 * @class
 */
export class EdgeSubscriptionRegistry {
  constructor() {
    /** @type {Map<string, EdgeSubscription>} */
    this._subscriptions = new Map();
    
    /** @type {Map<string, Set<EdgeSubscription>>} */
    this._byEventType = new Map();
    
    /** @type {EdgeSubscription[]} Sorted by priority */
    this._prioritySorted = [];
    
    this._needsSort = false;
  }

  /**
   * Registers a new subscription
   * @param {EdgeSubscription} subscription - Subscription to register
   * @throws {Error} If subscription with same ID already exists
   */
  register(subscription) {
    if (this._subscriptions.has(subscription.id)) {
      throw new Error(`EdgeSubscriptionRegistry: Subscription with id "${subscription.id}" already exists`);
    }
    
    this._subscriptions.set(subscription.id, subscription);
    
    // Index by event type for fast lookup
    for (const eventType of subscription.event_types) {
      if (!this._byEventType.has(eventType)) {
        this._byEventType.set(eventType, new Set());
      }
      this._byEventType.get(eventType).add(subscription);
    }
    
    this._prioritySorted.push(subscription);
    this._needsSort = true;
  }

  /**
   * Unregisters a subscription
   * @param {string} subscriptionId - ID of subscription to remove
   * @returns {boolean} True if subscription was removed
   */
  unregister(subscriptionId) {
    const subscription = this._subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }
    
    this._subscriptions.delete(subscriptionId);
    
    // Remove from event type index
    for (const eventType of subscription.event_types) {
      const set = this._byEventType.get(eventType);
      if (set) {
        set.delete(subscription);
        if (set.size === 0) {
          this._byEventType.delete(eventType);
        }
      }
    }
    
    // Remove from priority-sorted array
    const index = this._prioritySorted.indexOf(subscription);
    if (index !== -1) {
      this._prioritySorted.splice(index, 1);
    }
    
    return true;
  }

  /**
   * Finds all subscriptions matching an event
   * @param {Object} event - Event to match
   * @returns {EdgeSubscription[]} Matching subscriptions, sorted by priority
   * 
   * Performance: O(k log k) where k = number of matching subscriptions
   */
  findMatching(event) {
    // Fast path: Get candidates by event type
    const candidates = this._byEventType.get(event.type);
    if (!candidates || candidates.size === 0) {
      return [];
    }
    
    // Filter candidates by full matching criteria
    const matching = [];
    for (const subscription of candidates) {
      if (subscription.matches(event)) {
        matching.push(subscription);
      }
    }
    
    // Sort by priority (descending)
    matching.sort(EdgeSubscription.comparePriority);
    
    return matching;
  }

  /**
   * Gets subscription by ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {EdgeSubscription|null} Subscription or null if not found
   */
  get(subscriptionId) {
    return this._subscriptions.get(subscriptionId) || null;
  }

  /**
   * Gets all subscriptions sorted by priority
   * @returns {EdgeSubscription[]} All subscriptions
   */
  getAllSorted() {
    if (this._needsSort) {
      this._prioritySorted.sort(EdgeSubscription.comparePriority);
      this._needsSort = false;
    }
    return [...this._prioritySorted];
  }

  /**
   * Gets count of registered subscriptions
   * @returns {number} Subscription count
   */
  get size() {
    return this._subscriptions.size;
  }

  /**
   * Clears all subscriptions
   */
  clear() {
    this._subscriptions.clear();
    this._byEventType.clear();
    this._prioritySorted = [];
    this._needsSort = false;
  }
}