/**
 * @fileoverview NodeEmitter - Allows graph nodes to emit typed events with automatic propagation tracking
 * @module core/node-emitter
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Event System Architecture
 * Related Files:
 * - core/graph-event.js - Base event type
 * - core/event-envelope.js - Event wrapping with context
 * - core/event-bus.js - Global event routing
 */

import { GraphEvent } from './graph-event.js';
import { EventEnvelope } from './event-envelope.js';

/**
 * @typedef {Object} NodeEmitterOptions
 * @property {string} nodeId - Unique identifier for the node
 * @property {string} nodeType - Type of node (e.g., 'audio', 'midi', 'control')
 * @property {Function} [eventBusPublish] - Optional EventBus publish function for automatic routing
 */

/**
 * @typedef {Object} EmitOptions
 * @property {string} [propagationId] - Optional propagation ID (auto-generated if not provided)
 * @property {Object} [metadata] - Additional metadata to attach to the envelope
 * @property {boolean} [skipEventBus=false] - Skip automatic EventBus publishing
 */

/**
 * NodeEmitter - Enables graph nodes to emit typed events with automatic propagation tracking
 * 
 * Features:
 * - Automatic propagation_id stamping for event tracing
 * - Type-safe event emission
 * - Integration with EventBus for automatic routing
 * - Event envelope wrapping with context
 * - Local event listeners for node-specific handling
 * 
 * @class
 * 
 * @example
 * // Create emitter for audio node
 * const emitter = new NodeEmitter({
 *   nodeId: 'audio-node-1',
 *   nodeType: 'audio',
 *   eventBusPublish: eventBus.publish.bind(eventBus)
 * });
 * 
 * // Emit typed event
 * emitter.emit('node:state-changed', {
 *   state: 'playing',
 *   timestamp: Date.now()
 * });
 * 
 * // Listen to node events locally
 * emitter.on('node:state-changed', (envelope) => {
 *   console.log('State changed:', envelope.event.payload);
 * });
 */
export class NodeEmitter {
  /**
   * @param {NodeEmitterOptions} options - Configuration options
   */
  constructor(options) {
    if (!options.nodeId) {
      throw new Error('NodeEmitter requires nodeId');
    }
    if (!options.nodeType) {
      throw new Error('NodeEmitter requires nodeType');
    }

    /** @private */
    this._nodeId = options.nodeId;

    /** @private */
    this._nodeType = options.nodeType;

    /** @private */
    this._eventBusPublish = options.eventBusPublish || null;

    /** @private @type {Map<string, Set<Function>>} */
    this._listeners = new Map();

    /** @private */
    this._eventCounter = 0;
  }

  /**
   * Get the node ID
   * @returns {string}
   */
  get nodeId() {
    return this._nodeId;
  }

  /**
   * Get the node type
   * @returns {string}
   */
  get nodeType() {
    return this._nodeType;
  }

  /**
   * Generate a unique propagation ID for event tracing
   * @private
   * @returns {string}
   */
  _generatePropagationId() {
    this._eventCounter++;
    const timestamp = Date.now();
    return `${this._nodeId}:${timestamp}:${this._eventCounter}`;
  }

  /**
   * Emit a typed event from this node
   * 
   * @param {string} eventType - Type of event to emit
   * @param {Object} payload - Event payload data
   * @param {EmitOptions} [options={}] - Emission options
   * @returns {EventEnvelope} The emitted event envelope
   * 
   * @example
   * emitter.emit('node:parameter-changed', {
   *   parameter: 'gain',
   *   value: 0.8,
   *   previousValue: 0.5
   * });
   */
  emit(eventType, payload, options = {}) {
    // Create base GraphEvent
    const event = new GraphEvent(eventType, this._nodeId, payload);

    // Generate or use provided propagation ID
    const propagationId = options.propagationId || this._generatePropagationId();

    // Create envelope with context
    const envelope = new EventEnvelope(event, {
      source: this._nodeId,
      sourceType: this._nodeType,
      propagationId,
      ...options.metadata
    });

    // Notify local listeners
    this._notifyListeners(eventType, envelope);

    // Publish to EventBus if configured and not skipped
    if (this._eventBusPublish && !options.skipEventBus) {
      try {
        this._eventBusPublish(envelope);
      } catch (error) {
        console.error(`[NodeEmitter] Failed to publish to EventBus:`, error);
      }
    }

    return envelope;
  }

  /**
   * Emit an event that continues an existing propagation chain
   * 
   * @param {string} eventType - Type of event to emit
   * @param {Object} payload - Event payload data
   * @param {string} parentPropagationId - Propagation ID from parent event
   * @param {EmitOptions} [options={}] - Emission options
   * @returns {EventEnvelope} The emitted event envelope
   * 
   * @example
   * // Continue propagation from received event
   * emitter.on('node:input-received', (envelope) => {
   *   emitter.emitChained('node:processing-complete', {
   *     result: processData(envelope.event.payload)
   *   }, envelope.metadata.propagationId);
   * });
   */
  emitChained(eventType, payload, parentPropagationId, options = {}) {
    const chainedPropagationId = `${parentPropagationId}>${this._generatePropagationId()}`;
    return this.emit(eventType, payload, {
      ...options,
      propagationId: chainedPropagationId
    });
  }

  /**
   * Register a local event listener for this node
   * 
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function (receives EventEnvelope)
   * @returns {Function} Unsubscribe function
   * 
   * @example
   * const unsubscribe = emitter.on('node:state-changed', (envelope) => {
   *   console.log('State:', envelope.event.payload.state);
   * });
   * 
   * // Later: unsubscribe()
   */
  on(eventType, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }

    this._listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this._listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this._listeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Register a one-time event listener
   * 
   * @param {string} eventType - Type of event to listen for
   * @param {Function} callback - Callback function (receives EventEnvelope)
   * @returns {Function} Unsubscribe function
   */
  once(eventType, callback) {
    const wrappedCallback = (envelope) => {
      unsubscribe();
      callback(envelope);
    };

    const unsubscribe = this.on(eventType, wrappedCallback);
    return unsubscribe;
  }

  /**
   * Remove a specific listener or all listeners for an event type
   * 
   * @param {string} eventType - Type of event
   * @param {Function} [callback] - Specific callback to remove (removes all if not provided)
   */
  off(eventType, callback) {
    if (!callback) {
      this._listeners.delete(eventType);
      return;
    }

    const listeners = this._listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this._listeners.delete(eventType);
      }
    }
  }

  /**
   * Notify all local listeners for an event type
   * @private
   * @param {string} eventType - Type of event
   * @param {EventEnvelope} envelope - Event envelope to pass to listeners
   */
  _notifyListeners(eventType, envelope) {
    const listeners = this._listeners.get(eventType);
    if (!listeners || listeners.size === 0) {
      return;
    }

    // Create array to avoid issues if listener modifies the set
    const listenerArray = Array.from(listeners);

    for (const callback of listenerArray) {
      try {
        callback(envelope);
      } catch (error) {
        console.error(`[NodeEmitter] Listener error for ${eventType}:`, error);
      }
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    this._listeners.clear();
  }

  /**
   * Get count of listeners for an event type
   * 
   * @param {string} eventType - Type of event
   * @returns {number} Number of listeners
   */
  listenerCount(eventType) {
    const listeners = this._listeners.get(eventType);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event types that have listeners
   * 
   * @returns {string[]} Array of event types
   */
  eventTypes() {
    return Array.from(this._listeners.keys());
  }

  /**
   * Dispose of the emitter and clean up resources
   */
  dispose() {
    this.removeAllListeners();
    this._eventBusPublish = null;
  }
}