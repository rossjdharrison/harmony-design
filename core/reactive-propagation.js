/**
 * @fileoverview Reactive Propagation System
 * 
 * Implements a reactive data flow system that propagates state changes
 * through the component hierarchy using the EventBus. Provides:
 * - Observable state management
 * - Automatic dependency tracking
 * - Efficient change propagation
 * - Integration with EventBus for cross-component reactivity
 * 
 * Performance: O(n) propagation where n = number of subscribers
 * Memory: ~1KB base + ~100 bytes per observable
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#reactive-propagation
 */

/**
 * Observable value that tracks dependencies and notifies subscribers
 * @template T
 */
class Observable {
  /**
   * @param {T} initialValue - Initial value
   */
  constructor(initialValue) {
    this._value = initialValue;
    this._subscribers = new Set();
    this._id = `obs_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current value and register dependency
   * @returns {T}
   */
  get() {
    if (ReactiveContext.current) {
      ReactiveContext.current.addDependency(this);
    }
    return this._value;
  }

  /**
   * Set new value and notify subscribers
   * @param {T} newValue
   */
  set(newValue) {
    if (this._value === newValue) return;
    
    const oldValue = this._value;
    this._value = newValue;
    
    this._notifySubscribers(oldValue, newValue);
  }

  /**
   * Update value using function
   * @param {function(T): T} updater
   */
  update(updater) {
    this.set(updater(this._value));
  }

  /**
   * Subscribe to changes
   * @param {function(T, T): void} callback - Called with (newValue, oldValue)
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
  _notifySubscribers(oldValue, newValue) {
    // Snapshot before iterating: if a subscriber triggers _compute() which
    // re-subscribes to this observable, the new callback must NOT fire in
    // the current notification cycle (that would cause an infinite loop).
    const snapshot = new Set(this._subscribers);
    snapshot.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (error) {
        console.error('[ReactiveSystem] Subscriber error:', error);
      }
    });
  }
}

/**
 * Computed value that automatically updates when dependencies change
 * @template T
 */
class Computed {
  /**
   * @param {function(): T} computeFn - Function to compute value
   */
  constructor(computeFn) {
    this._computeFn = computeFn;
    this._value = undefined;
    this._dependencies = new Set();
    this._subscribers = new Set();
    this._dirty = true;
    this._id = `comp_${Math.random().toString(36).substr(2, 9)}`;
    
    this._compute();
  }

  /**
   * Get current value, recomputing if dirty
   * @returns {T}
   */
  get() {
    if (this._dirty) {
      this._compute();
    }
    
    if (ReactiveContext.current) {
      ReactiveContext.current.addDependency(this);
    }
    
    return this._value;
  }

  /**
   * Subscribe to changes
   * @param {function(T, T): void} callback
   * @returns {function(): void} Unsubscribe function
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Compute value and track dependencies
   * @private
   */
  _compute() {
    // Clear old dependencies
    this._dependencies.forEach(dep => {
      if (dep._unsubscribe) {
        dep._unsubscribe();
      }
    });
    this._dependencies.clear();

    // Track new dependencies
    const context = new ReactiveContext();
    ReactiveContext.current = context;
    
    try {
      const newValue = this._computeFn();
      const oldValue = this._value;
      this._value = newValue;
      this._dirty = false;

      // Subscribe to dependencies
      context.dependencies.forEach(dep => {
        const unsubscribe = dep.subscribe(() => this._markDirty());
        this._dependencies.add({ dep, _unsubscribe: unsubscribe });
      });

      // Notify subscribers if value changed
      if (oldValue !== newValue) {
        this._notifySubscribers(oldValue, newValue);
      }
    } finally {
      ReactiveContext.current = null;
    }
  }

  /**
   * Mark as dirty and schedule recomputation
   * @private
   */
  _markDirty() {
    if (this._dirty) return;
    this._dirty = true;
    
    // Recompute on next access or immediately if there are subscribers
    if (this._subscribers.size > 0) {
      this._compute();
    }
  }

  /**
   * Notify subscribers of change
   * @private
   */
  _notifySubscribers(oldValue, newValue) {
    // Snapshot to avoid re-entrancy if a subscriber causes further mutations.
    const snapshot = new Set(this._subscribers);
    snapshot.forEach(callback => {
      try {
        callback(newValue, oldValue);
      } catch (error) {
        console.error('[ReactiveSystem] Computed subscriber error:', error);
      }
    });
  }
}

/**
 * Context for tracking reactive dependencies during computation
 */
class ReactiveContext {
  constructor() {
    this.dependencies = new Set();
  }

  /**
   * Add dependency to current context
   * @param {Observable|Computed} observable
   */
  addDependency(observable) {
    this.dependencies.add(observable);
  }

  /**
   * Current active context
   * @type {ReactiveContext|null}
   */
  static current = null;
}

/**
 * Effect that runs when dependencies change
 */
class Effect {
  /**
   * @param {function(): void} effectFn - Effect function
   * @param {Object} options
   * @param {boolean} options.immediate - Run immediately (default: true)
   */
  constructor(effectFn, { immediate = true } = {}) {
    this._effectFn = effectFn;
    this._dependencies = new Set();
    this._cleanup = null;
    
    if (immediate) {
      this.run();
    }
  }

  /**
   * Run effect and track dependencies
   */
  run() {
    // Cleanup previous run
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }

    // Clear old dependencies
    this._dependencies.forEach(dep => {
      if (dep._unsubscribe) {
        dep._unsubscribe();
      }
    });
    this._dependencies.clear();

    // Track new dependencies
    const context = new ReactiveContext();
    ReactiveContext.current = context;
    
    try {
      const result = this._effectFn();
      
      // Store cleanup function if returned
      if (typeof result === 'function') {
        this._cleanup = result;
      }

      // Subscribe to dependencies
      context.dependencies.forEach(dep => {
        const unsubscribe = dep.subscribe(() => this.run());
        this._dependencies.add({ dep, _unsubscribe: unsubscribe });
      });
    } catch (error) {
      console.error('[ReactiveSystem] Effect error:', error);
    } finally {
      ReactiveContext.current = null;
    }
  }

  /**
   * Stop effect and cleanup
   */
  stop() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }

    this._dependencies.forEach(dep => {
      if (dep._unsubscribe) {
        dep._unsubscribe();
      }
    });
    this._dependencies.clear();
  }
}

/**
 * Reactive Propagation System
 * Integrates reactive state with EventBus for cross-component communication
 */
class ReactivePropagationSystem {
  constructor() {
    this._observables = new Map();
    this._eventBus = null;
    this._propagationQueue = [];
    this._isProcessing = false;
    
    // Performance tracking
    this._stats = {
      propagations: 0,
      averageTime: 0,
      maxTime: 0
    };
  }

  /**
   * Initialize with EventBus
   * @param {Object} eventBus - EventBus instance
   */
  initialize(eventBus) {
    this._eventBus = eventBus;
    
    // Subscribe to state change events
    if (eventBus && eventBus.subscribe) {
      eventBus.subscribe('StateChange', (event) => {
        this._handleStateChange(event);
      });
    }
  }

  /**
   * Create observable value
   * @template T
   * @param {T} initialValue
   * @param {string} [key] - Optional key for named observables
   * @returns {Observable<T>}
   */
  observable(initialValue, key = null) {
    const obs = new Observable(initialValue);
    
    if (key) {
      this._observables.set(key, obs);
    }
    
    return obs;
  }

  /**
   * Create computed value
   * @template T
   * @param {function(): T} computeFn
   * @returns {Computed<T>}
   */
  computed(computeFn) {
    return new Computed(computeFn);
  }

  /**
   * Create effect
   * @param {function(): void|function} effectFn
   * @param {Object} options
   * @returns {Effect}
   */
  effect(effectFn, options = {}) {
    return new Effect(effectFn, options);
  }

  /**
   * Get named observable
   * @param {string} key
   * @returns {Observable|null}
   */
  getObservable(key) {
    return this._observables.get(key) || null;
  }

  /**
   * Propagate state change through system
   * @param {string} source - Source component/context
   * @param {string} key - State key
   * @param {*} value - New value
   */
  propagate(source, key, value) {
    const startTime = performance.now();
    
    this._propagationQueue.push({ source, key, value, timestamp: Date.now() });
    
    if (!this._isProcessing) {
      this._processPropagationQueue();
    }
    
    const duration = performance.now() - startTime;
    this._updateStats(duration);
  }

  /**
   * Process propagation queue
   * @private
   */
  _processPropagationQueue() {
    this._isProcessing = true;
    
    while (this._propagationQueue.length > 0) {
      const { source, key, value } = this._propagationQueue.shift();
      
      // Update observable if exists
      const obs = this._observables.get(key);
      if (obs) {
        obs.set(value);
      }
      
      // Publish to EventBus
      if (this._eventBus && this._eventBus.publish) {
        this._eventBus.publish({
          type: 'StateChange',
          source,
          payload: { key, value },
          timestamp: Date.now()
        });
      }
    }
    
    this._isProcessing = false;
  }

  /**
   * Handle state change from EventBus
   * @private
   */
  _handleStateChange(event) {
    const { key, value } = event.payload || {};
    
    if (!key) return;
    
    const obs = this._observables.get(key);
    if (obs) {
      obs.set(value);
    }
  }

  /**
   * Update performance statistics
   * @private
   */
  _updateStats(duration) {
    this._stats.propagations++;
    this._stats.averageTime = 
      (this._stats.averageTime * (this._stats.propagations - 1) + duration) / 
      this._stats.propagations;
    this._stats.maxTime = Math.max(this._stats.maxTime, duration);
    
    // Warn if propagation is slow
    if (duration > 16) {
      console.warn(
        `[ReactiveSystem] Slow propagation detected: ${duration.toFixed(2)}ms ` +
        `(budget: 16ms for 60fps)`
      );
    }
  }

  /**
   * Get performance statistics
   * @returns {Object}
   */
  getStats() {
    return { ...this._stats };
  }

  /**
   * Reset system
   */
  reset() {
    this._observables.clear();
    this._propagationQueue = [];
    this._isProcessing = false;
    this._stats = {
      propagations: 0,
      averageTime: 0,
      maxTime: 0
    };
  }
}

// Export singleton instance
const reactivePropagationSystem = new ReactivePropagationSystem();

export {
  Observable,
  Computed,
  Effect,
  ReactivePropagationSystem,
  reactivePropagationSystem
};