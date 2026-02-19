/**
 * @fileoverview GraphEvent Type - Base event structure for graph system events
 * 
 * Provides the foundational event type for all graph-related operations including
 * node updates, edge changes, and propagation tracking. All graph events inherit
 * from this base structure.
 * 
 * @see DESIGN_SYSTEM.md#graph-event-system
 */

/**
 * Generates a unique event ID
 * @returns {string} Unique event identifier
 */
function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique propagation ID for tracking event chains
 * @returns {string} Unique propagation identifier
 */
function generatePropagationId() {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @typedef {Object} GraphEventPayload
 * @description Generic payload structure for graph events. Can contain any data
 * relevant to the specific event type.
 */

/**
 * @typedef {Object} GraphEvent
 * @description Base event structure for all graph system events. Provides tracking,
 * identification, and propagation capabilities.
 * 
 * @property {string} id - Unique identifier for this event instance
 * @property {number} timestamp - Unix timestamp (milliseconds) when event was created
 * @property {string} source_node - Identifier of the node that originated this event
 * @property {string} event_type - Type classification of the event (e.g., 'node.update', 'edge.add')
 * @property {GraphEventPayload|Object} payload - Event-specific data payload
 * @property {string} propagation_id - Identifier for tracking related events in a propagation chain
 * 
 * @example
 * const event = createGraphEvent({
 *   source_node: 'node_123',
 *   event_type: 'node.value_changed',
 *   payload: { old_value: 0.5, new_value: 0.8 }
 * });
 */

/**
 * Creates a new GraphEvent with all required fields
 * 
 * @param {Object} options - Event creation options
 * @param {string} options.source_node - Node that originated the event
 * @param {string} options.event_type - Type classification of the event
 * @param {Object} [options.payload={}] - Event-specific data
 * @param {string} [options.propagation_id] - Optional propagation ID (auto-generated if not provided)
 * @param {string} [options.id] - Optional event ID (auto-generated if not provided)
 * @param {number} [options.timestamp] - Optional timestamp (auto-generated if not provided)
 * @returns {GraphEvent} Fully formed graph event
 * 
 * @example
 * const event = createGraphEvent({
 *   source_node: 'oscillator_1',
 *   event_type: 'audio.frequency_changed',
 *   payload: { frequency: 440 }
 * });
 */
export function createGraphEvent({
  source_node,
  event_type,
  payload = {},
  propagation_id = null,
  id = null,
  timestamp = null
}) {
  if (!source_node) {
    throw new Error('GraphEvent requires source_node');
  }
  if (!event_type) {
    throw new Error('GraphEvent requires event_type');
  }

  return {
    id: id || generateEventId(),
    timestamp: timestamp || Date.now(),
    source_node,
    event_type,
    payload,
    propagation_id: propagation_id || generatePropagationId()
  };
}

/**
 * Validates a GraphEvent structure
 * 
 * @param {Object} event - Event object to validate
 * @returns {boolean} True if event is valid
 * @throws {Error} If event structure is invalid
 * 
 * @example
 * try {
 *   validateGraphEvent(event);
 *   console.log('Event is valid');
 * } catch (error) {
 *   console.error('Invalid event:', error.message);
 * }
 */
export function validateGraphEvent(event) {
  if (!event || typeof event !== 'object') {
    throw new Error('GraphEvent must be an object');
  }

  const requiredFields = ['id', 'timestamp', 'source_node', 'event_type', 'payload', 'propagation_id'];
  
  for (const field of requiredFields) {
    if (!(field in event)) {
      throw new Error(`GraphEvent missing required field: ${field}`);
    }
  }

  if (typeof event.id !== 'string' || event.id.length === 0) {
    throw new Error('GraphEvent id must be a non-empty string');
  }

  if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
    throw new Error('GraphEvent timestamp must be a positive number');
  }

  if (typeof event.source_node !== 'string' || event.source_node.length === 0) {
    throw new Error('GraphEvent source_node must be a non-empty string');
  }

  if (typeof event.event_type !== 'string' || event.event_type.length === 0) {
    throw new Error('GraphEvent event_type must be a non-empty string');
  }

  if (typeof event.payload !== 'object' || event.payload === null) {
    throw new Error('GraphEvent payload must be an object');
  }

  if (typeof event.propagation_id !== 'string' || event.propagation_id.length === 0) {
    throw new Error('GraphEvent propagation_id must be a non-empty string');
  }

  return true;
}

/**
 * Creates a derived event from an existing event, maintaining propagation chain
 * 
 * @param {GraphEvent} parentEvent - Original event to derive from
 * @param {Object} options - Options for the derived event
 * @param {string} options.source_node - Node originating the derived event
 * @param {string} options.event_type - Type of the derived event
 * @param {Object} [options.payload={}] - Payload for the derived event
 * @returns {GraphEvent} New event with same propagation_id
 * 
 * @example
 * const derivedEvent = deriveGraphEvent(originalEvent, {
 *   source_node: 'node_456',
 *   event_type: 'node.propagated',
 *   payload: { from: originalEvent.source_node }
 * });
 */
export function deriveGraphEvent(parentEvent, { source_node, event_type, payload = {} }) {
  validateGraphEvent(parentEvent);
  
  return createGraphEvent({
    source_node,
    event_type,
    payload,
    propagation_id: parentEvent.propagation_id
  });
}

/**
 * Clones a GraphEvent with optional field overrides
 * 
 * @param {GraphEvent} event - Event to clone
 * @param {Object} [overrides={}] - Fields to override in the clone
 * @returns {GraphEvent} Cloned event
 * 
 * @example
 * const clonedEvent = cloneGraphEvent(originalEvent, {
 *   payload: { ...originalEvent.payload, extra: 'data' }
 * });
 */
export function cloneGraphEvent(event, overrides = {}) {
  validateGraphEvent(event);
  
  return {
    ...event,
    payload: { ...event.payload },
    ...overrides
  };
}

/**
 * Serializes a GraphEvent to JSON string
 * 
 * @param {GraphEvent} event - Event to serialize
 * @returns {string} JSON string representation
 */
export function serializeGraphEvent(event) {
  validateGraphEvent(event);
  return JSON.stringify(event);
}

/**
 * Deserializes a GraphEvent from JSON string
 * 
 * @param {string} json - JSON string to deserialize
 * @returns {GraphEvent} Deserialized event
 * @throws {Error} If JSON is invalid or event structure is invalid
 */
export function deserializeGraphEvent(json) {
  try {
    const event = JSON.parse(json);
    validateGraphEvent(event);
    return event;
  } catch (error) {
    throw new Error(`Failed to deserialize GraphEvent: ${error.message}`);
  }
}

/**
 * Common event type constants for graph operations
 */
export const GraphEventTypes = {
  // Node events
  NODE_CREATED: 'node.created',
  NODE_UPDATED: 'node.updated',
  NODE_DELETED: 'node.deleted',
  NODE_VALUE_CHANGED: 'node.value_changed',
  
  // Edge events
  EDGE_CREATED: 'edge.created',
  EDGE_UPDATED: 'edge.updated',
  EDGE_DELETED: 'edge.deleted',
  
  // Graph events
  GRAPH_INITIALIZED: 'graph.initialized',
  GRAPH_CLEARED: 'graph.cleared',
  
  // Propagation events
  PROPAGATION_STARTED: 'propagation.started',
  PROPAGATION_COMPLETED: 'propagation.completed',
  PROPAGATION_ERROR: 'propagation.error'
};