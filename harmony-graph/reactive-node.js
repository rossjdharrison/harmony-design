/**
 * @fileoverview ReactiveNode - Node wrapper with signal-based state management
 * 
 * Provides a reactive wrapper around graph nodes that automatically emits events
 * when state changes occur. Uses a signal-based pattern for efficient state tracking
 * and propagation.
 * 
 * Key Features:
 * - Signal-based state management with automatic change detection
 * - Auto-emits events on state mutations
 * - Batched updates for performance
 * - Computed properties with dependency tracking
 * - Memory-efficient signal subscriptions
 * 
 * Performance Targets:
 * - State update: <1ms per operation
 * - Signal propagation: <0.5ms per signal
 * - Memory overhead: <1KB per node
 * 
 * Related Files:
 * - harmony-graph/node-emitter.js - Event emission capabilities
 * - harmony-graph/graph-event.js - Event type definitions
 * - harmony-graph/event-envelope.js - Event wrapping
 * 
 * @see DESIGN_SYSTEM.md#reactive-node for architecture details
 */

import { NodeEmitter } from './node-emitter.js';
import { GraphEvent } from './graph-event.js';

/**
 * Signal represents a reactive value that notifies subscribers on change
 * @template T
 */
class Signal {
  /**
   * @param {T} initialValue - Initial signal value
   */
  constructor(initialValue) {
    /** @type {T} @private */
    this._value = initialValue;
    
    /** @type {Set<Function>} @private */
    this._subscribers = new Set();
    
    /** @type {Set<ComputedSignal>} @private */
    this._computedDependents = new Set();
    
    /** @type {number} @private */
    this._version = 0;
  }

  /**
   * Get current signal value
   * @returns {T}
   */
  get value() {
    // Track dependency if we're in a computed context
    if (Signal._computingContext) {
      Signal._computingContext._dependencies.add(this);
    }
    return this._value;
  }

  /**
   * Set signal value and notify subscribers
   * @param {T} newValue
   */
  set value(newValue) {
    if (this._value === newValue) {
      return; // No change, skip notification
    }
    
    this._value = newValue;
    this._version++;
    this._notify();
  }

  /**
   * Update value using a function
   * @param {function(T): T} updater
   */
  update(updater) {
    this.value = updater(this._value);
  }

  /**
   * Subscribe to value changes
   * @param {function(T): void} callback
   * @returns {function(): void} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of change
   * @private
   */
  _notify() {
    // Notify direct subscribers
    for (const callback of this._subscribers) {
      callback(this._value);
    }
    
    // Notify computed dependents
    for (const computed of this._computedDependents) {
      computed._invalidate();
    }
  }

  /**
   * Register a computed signal as dependent
   * @param {ComputedSignal} computed
   * @private
   */
  _addComputedDependent(computed) {
    this._computedDependents.add(computed);
  }

  /**
   * Remove a computed signal dependency
   * @param {ComputedSignal} computed
   * @private
   */
  _removeComputedDependent(computed) {
    this._computedDependents.delete(computed);
  }
}

/**
 * Current computing context for dependency tracking
 * @type {ComputedSignal|null}
 * @private
 */
Signal._computingContext = null;

/**
 * ComputedSignal represents a derived reactive value
 * @template T
 */
class ComputedSignal {
  /**
   * @param {function(): T} computeFn - Function to compute value
   */
  constructor(computeFn) {
    /** @type {function(): T} @private */
    this._computeFn = computeFn;
    
    /** @type {T} @private */
    this._cachedValue = undefined;
    
    /** @type {boolean} @private */
    this._isDirty = true;
    
    /** @type {Set<Signal>} @private */
    this._dependencies = new Set();
    
    /** @type {Set<Function>} @private */
    this._subscribers = new Set();
  }

  /**
   * Get computed value (cached if clean)
   * @returns {T}
   */
  get value() {
    if (this._isDirty) {
      this._recompute();
    }
    return this._cachedValue;
  }

  /**
   * Subscribe to computed value changes
   * @param {function(T): void} callback
   * @returns {function(): void} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Recompute the value and track dependencies
   * @private
   */
  _recompute() {
    // Clear old dependencies
    for (const dep of this._dependencies) {
      dep._removeComputedDependent(this);
    }
    this._dependencies.clear();
    
    // Track new dependencies
    const previousContext = Signal._computingContext;
    Signal._computingContext = this;
    
    try {
      this._cachedValue = this._computeFn();
    } finally {
      Signal._computingContext = previousContext;
    }
    
    // Register with new dependencies
    for (const dep of this._dependencies) {
      dep._addComputedDependent(this);
    }
    
    this._isDirty = false;
  }

  /**
   * Mark computed as dirty and notify subscribers
   * @private
   */
  _invalidate() {
    if (this._isDirty) {
      return; // Already dirty
    }
    
    this._isDirty = true;
    
    // Notify subscribers
    for (const callback of this._subscribers) {
      callback(this.value);
    }
  }

  /**
   * Dispose of the computed signal
   */
  dispose() {
    for (const dep of this._dependencies) {
      dep._removeComputedDependent(this);
    }
    this._dependencies.clear();
    this._subscribers.clear();
  }
}

/**
 * ReactiveNode wraps a node with signal-based reactive state
 * Automatically emits events when state changes occur
 */
export class ReactiveNode {
  /**
   * @param {string} nodeId - Unique node identifier
   * @param {string} nodeType - Type of node (e.g., "audio", "control")
   * @param {Object} initialState - Initial state object
   */
  constructor(nodeId, nodeType, initialState = {}) {
    /** @type {string} */
    this.nodeId = nodeId;
    
    /** @type {string} */
    this.nodeType = nodeType;
    
    /** @type {NodeEmitter} @private */
    this._emitter = new NodeEmitter(nodeId, nodeType);
    
    /** @type {Map<string, Signal>} @private */
    this._signals = new Map();
    
    /** @type {Map<string, ComputedSignal>} @private */
    this._computed = new Map();
    
    /** @type {Set<function(): void>} @private */
    this._unsubscribers = new Set();
    
    /** @type {boolean} @private */
    this._batchingUpdates = false;
    
    /** @type {Set<string>} @private */
    this._pendingChanges = new Set();
    
    // Initialize signals from initial state
    this._initializeState(initialState);
  }

  /**
   * Initialize signals from state object
   * @param {Object} state
   * @private
   */
  _initializeState(state) {
    for (const [key, value] of Object.entries(state)) {
      this.createSignal(key, value);
    }
  }

  /**
   * Create a new signal for a state property
   * @param {string} key - Property key
   * @param {*} initialValue - Initial value
   * @returns {Signal}
   */
  createSignal(key, initialValue) {
    if (this._signals.has(key)) {
      throw new Error(`Signal "${key}" already exists on node ${this.nodeId}`);
    }
    
    const signal = new Signal(initialValue);
    this._signals.set(key, signal);
    
    // Subscribe to signal changes and emit events
    const unsubscribe = signal.subscribe((newValue) => {
      this._handleStateChange(key, newValue);
    });
    this._unsubscribers.add(unsubscribe);
    
    return signal;
  }

  /**
   * Create a computed signal derived from other signals
   * @param {string} key - Property key
   * @param {function(): *} computeFn - Compute function
   * @returns {ComputedSignal}
   */
  createComputed(key, computeFn) {
    if (this._computed.has(key)) {
      throw new Error(`Computed signal "${key}" already exists on node ${this.nodeId}`);
    }
    
    const computed = new ComputedSignal(computeFn);
    this._computed.set(key, computed);
    
    // Subscribe to computed changes and emit events
    const unsubscribe = computed.subscribe((newValue) => {
      this._handleStateChange(key, newValue);
    });
    this._unsubscribers.add(unsubscribe);
    
    return computed;
  }

  /**
   * Get signal value by key
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    const signal = this._signals.get(key);
    if (signal) {
      return signal.value;
    }
    
    const computed = this._computed.get(key);
    if (computed) {
      return computed.value;
    }
    
    return undefined;
  }

  /**
   * Set signal value by key
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    const signal = this._signals.get(key);
    if (!signal) {
      throw new Error(`Signal "${key}" does not exist on node ${this.nodeId}`);
    }
    
    signal.value = value;
  }

  /**
   * Update signal using updater function
   * @param {string} key
   * @param {function(*): *} updater
   */
  update(key, updater) {
    const signal = this._signals.get(key);
    if (!signal) {
      throw new Error(`Signal "${key}" does not exist on node ${this.nodeId}`);
    }
    
    signal.update(updater);
  }

  /**
   * Get all current state as plain object
   * @returns {Object}
   */
  getState() {
    const state = {};
    
    for (const [key, signal] of this._signals) {
      state[key] = signal.value;
    }
    
    for (const [key, computed] of this._computed) {
      state[key] = computed.value;
    }
    
    return state;
  }

  /**
   * Batch multiple state updates to emit single event
   * @param {function(): void} updateFn
   */
  batch(updateFn) {
    this._batchingUpdates = true;
    this._pendingChanges.clear();
    
    try {
      updateFn();
    } finally {
      this._batchingUpdates = false;
      
      if (this._pendingChanges.size > 0) {
        this._emitBatchedStateChange();
      }
    }
  }

  /**
   * Handle individual state change
   * @param {string} key
   * @param {*} newValue
   * @private
   */
  _handleStateChange(key, newValue) {
    if (this._batchingUpdates) {
      this._pendingChanges.add(key);
      return;
    }
    
    this._emitStateChange(key, newValue);
  }

  /**
   * Emit state change event
   * @param {string} key
   * @param {*} newValue
   * @private
   */
  _emitStateChange(key, newValue) {
    const event = new GraphEvent(
      'NodeStateChanged',
      this.nodeId,
      {
        nodeId: this.nodeId,
        nodeType: this.nodeType,
        key,
        value: newValue,
        timestamp: Date.now()
      }
    );
    
    this._emitter.emit(event);
  }

  /**
   * Emit batched state change event
   * @private
   */
  _emitBatchedStateChange() {
    const changes = {};
    for (const key of this._pendingChanges) {
      changes[key] = this.get(key);
    }
    
    const event = new GraphEvent(
      'NodeStateBatchChanged',
      this.nodeId,
      {
        nodeId: this.nodeId,
        nodeType: this.nodeType,
        changes,
        timestamp: Date.now()
      }
    );
    
    this._emitter.emit(event);
    this._pendingChanges.clear();
  }

  /**
   * Subscribe to events from this node
   * @param {string} eventType - Event type to subscribe to
   * @param {function(GraphEvent): void} handler
   * @returns {function(): void} Unsubscribe function
   */
  on(eventType, handler) {
    return this._emitter.on(eventType, handler);
  }

  /**
   * Subscribe to all events from this node
   * @param {function(GraphEvent): void} handler
   * @returns {function(): void} Unsubscribe function
   */
  onAny(handler) {
    return this._emitter.onAny(handler);
  }

  /**
   * Emit a custom event
   * @param {GraphEvent} event
   */
  emit(event) {
    this._emitter.emit(event);
  }

  /**
   * Dispose of the reactive node and cleanup resources
   */
  dispose() {
    // Unsubscribe from all signals
    for (const unsubscribe of this._unsubscribers) {
      unsubscribe();
    }
    this._unsubscribers.clear();
    
    // Dispose computed signals
    for (const computed of this._computed.values()) {
      computed.dispose();
    }
    
    // Clear collections
    this._signals.clear();
    this._computed.clear();
    this._pendingChanges.clear();
  }
}

/**
 * Create a reactive node with initial state
 * @param {string} nodeId
 * @param {string} nodeType
 * @param {Object} initialState
 * @returns {ReactiveNode}
 */
export function createReactiveNode(nodeId, nodeType, initialState = {}) {
  return new ReactiveNode(nodeId, nodeType, initialState);
}