/**
 * @fileoverview Computed Value Cache - Memoization layer for derived/computed values
 * with dependency tracking and lazy invalidation.
 * 
 * This system provides:
 * - Automatic memoization of expensive computed values
 * - Fine-grained dependency tracking
 * - Lazy invalidation when dependencies change
 * - Memory-efficient cache management
 * - Performance monitoring and debugging
 * 
 * @module core/computed-value-cache
 * @see {@link file://./DESIGN_SYSTEM.md#computed-value-cache}
 */

/**
 * @typedef {Object} ComputedValueOptions
 * @property {Function} compute - Function to compute the value
 * @property {Array<string>} [dependencies=[]] - List of dependency keys
 * @property {number} [ttl=Infinity] - Time-to-live in milliseconds
 * @property {boolean} [lazy=true] - Whether to compute lazily (on access) or eagerly
 * @property {Function} [equals] - Custom equality function for change detection
 * @property {string} [debugName] - Name for debugging purposes
 */

/**
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached computed value
 * @property {number} computedAt - Timestamp when value was computed
 * @property {Array<string>} dependencies - Dependency keys
 * @property {Set<string>} dependents - Keys that depend on this entry
 * @property {boolean} dirty - Whether the value needs recomputation
 * @property {number} hits - Number of cache hits
 * @property {number} misses - Number of cache misses
 * @property {number} computeTime - Last computation time in ms
 */

/**
 * Computed Value Cache - Manages memoized computed values with dependency tracking.
 * 
 * Performance characteristics:
 * - O(1) cache lookup
 * - O(d) invalidation where d = number of dependents
 * - Memory: ~200 bytes per cache entry
 * 
 * @class
 * @example
 * const cache = new ComputedValueCache();
 * 
 * // Define computed values with dependencies
 * cache.define('fullName', {
 *   compute: () => `${state.firstName} ${state.lastName}`,
 *   dependencies: ['firstName', 'lastName']
 * });
 * 
 * // Access computed value (computed on first access)
 * const name = cache.get('fullName');
 * 
 * // Invalidate when dependencies change
 * cache.invalidate('firstName');
 * 
 * // Next access will recompute
 * const newName = cache.get('fullName');
 */
export class ComputedValueCache {
  /**
   * Creates a new ComputedValueCache instance.
   * 
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.maxSize=1000] - Maximum number of cached entries
   * @param {boolean} [options.enableStats=true] - Enable performance statistics
   * @param {Function} [options.onEvict] - Callback when entry is evicted
   */
  constructor(options = {}) {
    /** @private @type {Map<string, CacheEntry>} */
    this._cache = new Map();
    
    /** @private @type {Map<string, ComputedValueOptions>} */
    this._definitions = new Map();
    
    /** @private @type {Map<string, Set<string>>} */
    this._dependencyGraph = new Map();
    
    /** @private @type {number} */
    this._maxSize = options.maxSize || 1000;
    
    /** @private @type {boolean} */
    this._enableStats = options.enableStats !== false;
    
    /** @private @type {Function|null} */
    this._onEvict = options.onEvict || null;
    
    /** @private @type {Set<string>} */
    this._computing = new Set();
    
    /** @private @type {Object} */
    this._stats = {
      totalHits: 0,
      totalMisses: 0,
      totalComputeTime: 0,
      totalInvalidations: 0,
      circularDependencies: 0
    };
  }

  /**
   * Defines a computed value with its computation function and dependencies.
   * 
   * @param {string} key - Unique identifier for the computed value
   * @param {ComputedValueOptions} options - Computation options
   * @throws {Error} If key is already defined or options are invalid
   * @example
   * cache.define('totalPrice', {
   *   compute: () => items.reduce((sum, item) => sum + item.price, 0),
   *   dependencies: ['items'],
   *   debugName: 'Shopping Cart Total'
   * });
   */
  define(key, options) {
    if (!key || typeof key !== 'string') {
      throw new Error('ComputedValueCache: key must be a non-empty string');
    }

    if (this._definitions.has(key)) {
      throw new Error(`ComputedValueCache: key "${key}" is already defined`);
    }

    if (typeof options.compute !== 'function') {
      throw new Error('ComputedValueCache: options.compute must be a function');
    }

    const definition = {
      compute: options.compute,
      dependencies: options.dependencies || [],
      ttl: options.ttl || Infinity,
      lazy: options.lazy !== false,
      equals: options.equals || Object.is,
      debugName: options.debugName || key
    };

    this._definitions.set(key, definition);

    // Build dependency graph
    for (const dep of definition.dependencies) {
      if (!this._dependencyGraph.has(dep)) {
        this._dependencyGraph.set(dep, new Set());
      }
      this._dependencyGraph.get(dep).add(key);
    }

    // Eager computation if not lazy
    if (!definition.lazy) {
      this._compute(key);
    }
  }

  /**
   * Gets a computed value, computing it if necessary.
   * 
   * @param {string} key - Key of the computed value
   * @returns {*} The computed value
   * @throws {Error} If key is not defined or circular dependency detected
   * @example
   * const result = cache.get('totalPrice');
   */
  get(key) {
    if (!this._definitions.has(key)) {
      throw new Error(`ComputedValueCache: key "${key}" is not defined`);
    }

    const entry = this._cache.get(key);
    const definition = this._definitions.get(key);

    // Check if cached value is valid
    if (entry && !entry.dirty && this._isValid(entry, definition)) {
      entry.hits++;
      if (this._enableStats) {
        this._stats.totalHits++;
      }
      return entry.value;
    }

    // Need to compute
    if (this._enableStats) {
      this._stats.totalMisses++;
      if (entry) entry.misses++;
    }

    return this._compute(key);
  }

  /**
   * Checks if a computed value exists and is valid.
   * 
   * @param {string} key - Key to check
   * @returns {boolean} True if value is cached and valid
   */
  has(key) {
    const entry = this._cache.get(key);
    const definition = this._definitions.get(key);
    return entry && !entry.dirty && this._isValid(entry, definition);
  }

  /**
   * Invalidates a computed value and all its dependents.
   * Uses lazy invalidation - values are marked dirty but not recomputed.
   * 
   * @param {string} key - Key to invalidate
   * @param {boolean} [cascade=true] - Whether to invalidate dependents
   * @example
   * // When state changes
   * cache.invalidate('items');
   * // This will also invalidate 'totalPrice' if it depends on 'items'
   */
  invalidate(key, cascade = true) {
    const entry = this._cache.get(key);
    if (entry) {
      entry.dirty = true;
    }

    if (this._enableStats) {
      this._stats.totalInvalidations++;
    }

    // Cascade invalidation to dependents
    if (cascade && this._dependencyGraph.has(key)) {
      const dependents = this._dependencyGraph.get(key);
      for (const dependent of dependents) {
        this.invalidate(dependent, true);
      }
    }
  }

  /**
   * Clears a specific entry or all entries from the cache.
   * 
   * @param {string} [key] - Key to clear, or undefined to clear all
   */
  clear(key) {
    if (key) {
      const entry = this._cache.get(key);
      if (entry && this._onEvict) {
        this._onEvict(key, entry.value);
      }
      this._cache.delete(key);
    } else {
      if (this._onEvict) {
        for (const [k, entry] of this._cache.entries()) {
          this._onEvict(k, entry.value);
        }
      }
      this._cache.clear();
    }
  }

  /**
   * Removes a computed value definition.
   * 
   * @param {string} key - Key to undefine
   */
  undefine(key) {
    this.clear(key);
    this._definitions.delete(key);

    // Clean up dependency graph
    for (const [dep, dependents] of this._dependencyGraph.entries()) {
      dependents.delete(key);
      if (dependents.size === 0) {
        this._dependencyGraph.delete(dep);
      }
    }
  }

  /**
   * Gets performance statistics for the cache.
   * 
   * @returns {Object} Statistics object
   * @example
   * const stats = cache.getStats();
   * console.log(`Hit rate: ${stats.hitRate}%`);
   */
  getStats() {
    const totalAccesses = this._stats.totalHits + this._stats.totalMisses;
    const hitRate = totalAccesses > 0 
      ? (this._stats.totalHits / totalAccesses * 100).toFixed(2)
      : 0;

    const entries = Array.from(this._cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      misses: entry.misses,
      computeTime: entry.computeTime,
      dirty: entry.dirty,
      age: Date.now() - entry.computedAt
    }));

    return {
      ...this._stats,
      hitRate: parseFloat(hitRate),
      totalAccesses,
      cacheSize: this._cache.size,
      definitionCount: this._definitions.size,
      entries
    };
  }

  /**
   * Resets all statistics counters.
   */
  resetStats() {
    this._stats = {
      totalHits: 0,
      totalMisses: 0,
      totalComputeTime: 0,
      totalInvalidations: 0,
      circularDependencies: 0
    };

    for (const entry of this._cache.values()) {
      entry.hits = 0;
      entry.misses = 0;
    }
  }

  /**
   * Gets debug information about the cache state.
   * 
   * @returns {Object} Debug information
   */
  debug() {
    const dependencyTree = {};
    for (const [key, definition] of this._definitions.entries()) {
      dependencyTree[key] = {
        dependencies: definition.dependencies,
        dependents: Array.from(this._dependencyGraph.get(key) || []),
        cached: this._cache.has(key),
        dirty: this._cache.get(key)?.dirty || false
      };
    }

    return {
      stats: this.getStats(),
      dependencyTree,
      cacheKeys: Array.from(this._cache.keys()),
      definedKeys: Array.from(this._definitions.keys())
    };
  }

  /**
   * Computes a value and caches it.
   * 
   * @private
   * @param {string} key - Key to compute
   * @returns {*} The computed value
   * @throws {Error} If circular dependency detected
   */
  _compute(key) {
    // Detect circular dependencies
    if (this._computing.has(key)) {
      this._stats.circularDependencies++;
      throw new Error(
        `ComputedValueCache: Circular dependency detected involving "${key}"`
      );
    }

    const definition = this._definitions.get(key);
    this._computing.add(key);

    try {
      const startTime = performance.now();
      const value = definition.compute();
      const computeTime = performance.now() - startTime;

      if (this._enableStats) {
        this._stats.totalComputeTime += computeTime;
      }

      // Create or update cache entry
      let entry = this._cache.get(key);
      if (!entry) {
        entry = {
          value: undefined,
          computedAt: 0,
          dependencies: definition.dependencies,
          dependents: new Set(),
          dirty: false,
          hits: 0,
          misses: 1,
          computeTime: 0
        };
        this._cache.set(key, entry);
      }

      // Check if value actually changed
      const changed = !definition.equals(entry.value, value);

      entry.value = value;
      entry.computedAt = Date.now();
      entry.dirty = false;
      entry.computeTime = computeTime;

      // Evict old entries if cache is full
      if (this._cache.size > this._maxSize) {
        this._evictLRU();
      }

      this._computing.delete(key);

      // If value changed, invalidate dependents
      if (changed && this._dependencyGraph.has(key)) {
        for (const dependent of this._dependencyGraph.get(key)) {
          this.invalidate(dependent, false);
        }
      }

      return value;
    } catch (error) {
      this._computing.delete(key);
      throw new Error(
        `ComputedValueCache: Error computing "${key}": ${error.message}`
      );
    }
  }

  /**
   * Checks if a cache entry is still valid.
   * 
   * @private
   * @param {CacheEntry} entry - Cache entry to check
   * @param {ComputedValueOptions} definition - Value definition
   * @returns {boolean} True if entry is valid
   */
  _isValid(entry, definition) {
    if (entry.dirty) return false;
    
    // Check TTL
    if (definition.ttl !== Infinity) {
      const age = Date.now() - entry.computedAt;
      if (age > definition.ttl) return false;
    }

    return true;
  }

  /**
   * Evicts the least recently used entry.
   * 
   * @private
   */
  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this._cache.entries()) {
      if (entry.computedAt < oldestTime) {
        oldestTime = entry.computedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this._cache.get(oldestKey);
      if (this._onEvict) {
        this._onEvict(oldestKey, entry.value);
      }
      this._cache.delete(oldestKey);
    }
  }
}

/**
 * Creates a scoped computed value cache with automatic cleanup.
 * 
 * @param {Object} [options] - Cache options
 * @returns {ComputedValueCache} New cache instance
 * @example
 * const cache = createComputedCache({ maxSize: 500 });
 */
export function createComputedCache(options) {
  return new ComputedValueCache(options);
}

/**
 * Global singleton cache instance for convenience.
 * Use this for application-wide computed values.
 */
export const globalComputedCache = new ComputedValueCache({
  maxSize: 2000,
  enableStats: true
});