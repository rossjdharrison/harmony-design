/**
 * @fileoverview Memoization utilities for Harmony Design System
 * 
 * Provides vanilla JavaScript memoization patterns for optimizing
 * expensive computations in audio components while maintaining
 * performance budgets (16ms render, 10ms audio latency).
 * 
 * @see docs/performance/memoization-strategy.md
 */

/**
 * Memoizes a single computed value with manual invalidation.
 * 
 * Use for expensive calculations that depend on component state
 * and need explicit cache invalidation when dependencies change.
 * 
 * @example
 * class SpectrumAnalyzer extends HTMLElement {
 *   #fftCache = new MemoizedValue(() => this.#calculateFFT());
 *   
 *   set audioData(value) {
 *     this.#audioData = value;
 *     this.#fftCache.invalidate();
 *   }
 *   
 *   get spectrum() {
 *     return this.#fftCache.get();
 *   }
 * }
 */
export class MemoizedValue {
  #compute;
  #cached;
  #valid = false;

  /**
   * Creates a memoized value
   * @param {Function} computeFn - Function that computes the value
   */
  constructor(computeFn) {
    if (typeof computeFn !== 'function') {
      throw new TypeError('computeFn must be a function');
    }
    this.#compute = computeFn;
  }

  /**
   * Gets the cached value, computing if necessary
   * @returns {*} The computed value
   */
  get() {
    if (!this.#valid) {
      this.#cached = this.#compute();
      this.#valid = true;
    }
    return this.#cached;
  }

  /**
   * Invalidates the cache, forcing recomputation on next get()
   */
  invalidate() {
    this.#valid = false;
  }

  /**
   * Checks if cached value is valid
   * @returns {boolean} True if cache is valid
   */
  isValid() {
    return this.#valid;
  }
}

/**
 * Weak memoization for creating stable function references.
 * 
 * Use for event handlers and callbacks that need stable identity
 * to avoid unnecessary listener re-registration.
 * 
 * @example
 * class AudioControl extends HTMLElement {
 *   #handlers = new WeakMemo();
 *   
 *   connectedCallback() {
 *     const handler = this.#handlers.get(this.#handlePlay, this);
 *     this.addEventListener('click', handler);
 *   }
 *   
 *   #handlePlay(event) {
 *     // Handler implementation
 *   }
 * }
 */
export class WeakMemo {
  #cache = new WeakMap();

  /**
   * Gets or creates a bound function reference
   * @param {Function} fn - Function to memoize
   * @param {Object} context - Context to bind (usually 'this')
   * @returns {Function} Bound function with stable reference
   */
  get(fn, context) {
    if (typeof fn !== 'function') {
      throw new TypeError('fn must be a function');
    }

    if (!this.#cache.has(fn)) {
      this.#cache.set(fn, fn.bind(context));
    }
    return this.#cache.get(fn);
  }

  /**
   * Clears a specific function from cache
   * @param {Function} fn - Function to clear
   */
  clear(fn) {
    this.#cache.delete(fn);
  }
}

/**
 * Dependency-based cache similar to React's useMemo.
 * 
 * Use for values that depend on multiple inputs and should
 * recompute only when dependencies change.
 * 
 * @example
 * class WaveformRenderer extends HTMLElement {
 *   #pathCache = new DependencyCache();
 *   
 *   render() {
 *     const path = this.#pathCache.compute(
 *       [this.audioBuffer, this.width, this.height],
 *       () => this.#generateWaveformPath()
 *     );
 *     this.#drawPath(path);
 *   }
 * }
 */
export class DependencyCache {
  #lastDeps = [];
  #lastResult;
  #hasResult = false;

  /**
   * Computes value if dependencies changed
   * @param {Array} deps - Array of dependency values
   * @param {Function} computeFn - Function to compute result
   * @returns {*} Cached or newly computed result
   */
  compute(deps, computeFn) {
    if (!Array.isArray(deps)) {
      throw new TypeError('deps must be an array');
    }
    if (typeof computeFn !== 'function') {
      throw new TypeError('computeFn must be a function');
    }

    if (!this.#hasResult || this.#depsChanged(deps)) {
      this.#lastDeps = deps;
      this.#lastResult = computeFn();
      this.#hasResult = true;
    }
    return this.#lastResult;
  }

  /**
   * Checks if dependencies have changed using Object.is comparison
   * @private
   * @param {Array} newDeps - New dependency values
   * @returns {boolean} True if any dependency changed
   */
  #depsChanged(newDeps) {
    if (this.#lastDeps.length !== newDeps.length) {
      return true;
    }
    return newDeps.some((dep, i) => !Object.is(dep, this.#lastDeps[i]));
  }

  /**
   * Manually invalidates the cache
   */
  invalidate() {
    this.#hasResult = false;
    this.#lastDeps = [];
  }

  /**
   * Gets current dependencies without computing
   * @returns {Array} Current dependency array
   */
  getDependencies() {
    return [...this.#lastDeps];
  }
}

/**
 * Performance-tracked memoization for development profiling.
 * 
 * Wraps any memoization strategy and tracks hit/miss statistics.
 * Only use in development builds.
 * 
 * @example
 * const cache = new PerformanceTrackedCache(
 *   new DependencyCache(),
 *   'waveform-path'
 * );
 * 
 * // Later in development console:
 * cache.logStats(); // Shows hit rate, avg compute time
 */
export class PerformanceTrackedCache {
  #cache;
  #name;
  #hits = 0;
  #misses = 0;
  #computeTimes = [];

  /**
   * Creates a performance-tracked cache wrapper
   * @param {Object} cache - Cache instance (MemoizedValue, DependencyCache, etc.)
   * @param {string} name - Name for logging
   */
  constructor(cache, name = 'cache') {
    this.#cache = cache;
    this.#name = name;
  }

  /**
   * Computes value with performance tracking
   * @param {Array} deps - Dependencies (if using DependencyCache)
   * @param {Function} computeFn - Compute function
   * @returns {*} Computed result
   */
  compute(deps, computeFn) {
    const start = performance.now();
    let isHit = false;

    // Wrap compute function to detect cache hits
    const wrappedFn = () => {
      isHit = false;
      const result = computeFn();
      this.#misses++;
      return result;
    };

    // Check if cache has compute method (DependencyCache)
    let result;
    if (typeof this.#cache.compute === 'function') {
      const oldDeps = this.#cache.getDependencies?.() || [];
      result = this.#cache.compute(deps, wrappedFn);
      
      // If deps didn't change, it was a hit
      if (oldDeps.length === deps.length && 
          deps.every((d, i) => Object.is(d, oldDeps[i]))) {
        isHit = true;
        this.#hits++;
      }
    } else {
      // For MemoizedValue
      isHit = this.#cache.isValid?.() || false;
      if (isHit) {
        this.#hits++;
      }
      result = this.#cache.get();
    }

    const duration = performance.now() - start;
    if (!isHit) {
      this.#computeTimes.push(duration);
    }

    return result;
  }

  /**
   * Logs cache statistics to console
   */
  logStats() {
    const total = this.#hits + this.#misses;
    const hitRate = total > 0 ? (this.#hits / total * 100).toFixed(1) : 0;
    const avgTime = this.#computeTimes.length > 0
      ? (this.#computeTimes.reduce((a, b) => a + b, 0) / this.#computeTimes.length).toFixed(2)
      : 0;

    console.group(`Cache Stats: ${this.#name}`);
    console.log(`Hit Rate: ${hitRate}% (${this.#hits}/${total})`);
    console.log(`Avg Compute Time: ${avgTime}ms`);
    console.log(`Total Computes: ${this.#misses}`);
    console.groupEnd();
  }

  /**
   * Resets statistics
   */
  resetStats() {
    this.#hits = 0;
    this.#misses = 0;
    this.#computeTimes = [];
  }

  /**
   * Gets underlying cache instance
   * @returns {Object} Cache instance
   */
  getCache() {
    return this.#cache;
  }
}

/**
 * Utility to detect if code is running in AudioWorklet context.
 * Use to prevent accidental memoization in audio thread.
 * 
 * @returns {boolean} True if running in AudioWorklet
 */
export function isAudioWorkletContext() {
  return typeof AudioWorkletGlobalScope !== 'undefined' &&
         self instanceof AudioWorkletGlobalScope;
}

/**
 * Asserts that code is NOT running in AudioWorklet.
 * Throws error if called from audio thread.
 * 
 * @param {string} operation - Description of operation
 * @throws {Error} If called from AudioWorklet
 */
export function assertNotAudioThread(operation) {
  if (isAudioWorkletContext()) {
    throw new Error(
      `${operation} should not be used in AudioWorklet. ` +
      `Memoization adds latency that violates 10ms audio processing budget.`
    );
  }
}