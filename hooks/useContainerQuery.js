/**
 * @fileoverview Container Query Hook - JavaScript-based container queries
 * @module hooks/useContainerQuery
 * 
 * Provides a reactive hook for observing container size changes and applying
 * JavaScript-based container queries. Complements CSS @container queries with
 * programmatic control.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#container-query-hooks}
 * @performance Target: <1ms query evaluation, ResizeObserver-based
 */

/**
 * @typedef {Object} ContainerDimensions
 * @property {number} width - Container width in pixels
 * @property {number} height - Container height in pixels
 * @property {number} inlineSize - Inline size (writing-mode aware)
 * @property {number} blockSize - Block size (writing-mode aware)
 */

/**
 * @typedef {Object} ContainerQueryMatch
 * @property {boolean} matches - Whether the query currently matches
 * @property {ContainerDimensions} dimensions - Current container dimensions
 */

/**
 * @typedef {Object} ContainerQueryOptions
 * @property {('width'|'height'|'inline-size'|'block-size')} [type='inline-size'] - Query type
 * @property {number} [threshold=0] - Debounce threshold in milliseconds
 * @property {boolean} [initialMatch=false] - Initial match state before measurement
 */

/**
 * Container Query Hook
 * 
 * Observes a container element and evaluates size-based queries.
 * Returns reactive match state and current dimensions.
 * 
 * @example
 * const containerRef = { current: null };
 * const query = useContainerQuery(containerRef, {
 *   minWidth: 600,
 *   maxWidth: 1200
 * });
 * 
 * if (query.matches) {
 *   // Apply medium breakpoint behavior
 * }
 * 
 * @param {Object} containerRef - Reference object with .current pointing to container element
 * @param {Object} queryConditions - Query conditions (minWidth, maxWidth, minHeight, maxHeight)
 * @param {ContainerQueryOptions} [options={}] - Hook options
 * @returns {ContainerQueryMatch} Current query match state and dimensions
 */
export function useContainerQuery(containerRef, queryConditions, options = {}) {
  const {
    type = 'inline-size',
    threshold = 0,
    initialMatch = false
  } = options;

  // State management (vanilla JS pattern)
  let state = {
    matches: initialMatch,
    dimensions: {
      width: 0,
      height: 0,
      inlineSize: 0,
      blockSize: 0
    }
  };

  let observer = null;
  let debounceTimer = null;
  const listeners = new Set();

  /**
   * Evaluates query conditions against current dimensions
   * @private
   * @param {ContainerDimensions} dims - Current dimensions
   * @returns {boolean} Whether conditions match
   */
  function evaluateQuery(dims) {
    const conditions = [
      queryConditions.minWidth ? dims.width >= queryConditions.minWidth : true,
      queryConditions.maxWidth ? dims.width <= queryConditions.maxWidth : true,
      queryConditions.minHeight ? dims.height >= queryConditions.minHeight : true,
      queryConditions.maxHeight ? dims.height <= queryConditions.maxHeight : true,
      queryConditions.minInlineSize ? dims.inlineSize >= queryConditions.minInlineSize : true,
      queryConditions.maxInlineSize ? dims.inlineSize <= queryConditions.maxInlineSize : true,
      queryConditions.minBlockSize ? dims.blockSize >= queryConditions.minBlockSize : true,
      queryConditions.maxBlockSize ? dims.blockSize <= queryConditions.maxBlockSize : true
    ];

    return conditions.every(condition => condition);
  }

  /**
   * Updates state and notifies listeners
   * @private
   * @param {ContainerDimensions} dimensions - New dimensions
   */
  function updateState(dimensions) {
    const matches = evaluateQuery(dimensions);
    const changed = matches !== state.matches || 
                   dimensions.width !== state.dimensions.width ||
                   dimensions.height !== state.dimensions.height;

    if (changed) {
      state = { matches, dimensions };
      listeners.forEach(listener => listener(state));
    }
  }

  /**
   * Handles resize observation
   * @private
   * @param {ResizeObserverEntry[]} entries - Resize entries
   */
  function handleResize(entries) {
    if (entries.length === 0) return;

    const entry = entries[0];
    const borderBoxSize = entry.borderBoxSize?.[0];
    const contentRect = entry.contentRect;

    const dimensions = {
      width: contentRect.width,
      height: contentRect.height,
      inlineSize: borderBoxSize?.inlineSize || contentRect.width,
      blockSize: borderBoxSize?.blockSize || contentRect.height
    };

    if (threshold > 0) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => updateState(dimensions), threshold);
    } else {
      updateState(dimensions);
    }
  }

  /**
   * Subscribes to state changes
   * @param {Function} listener - Callback for state changes
   * @returns {Function} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.add(listener);
    // Immediately call with current state
    listener(state);

    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Starts observing the container
   * @returns {void}
   */
  function observe() {
    if (!containerRef.current) {
      console.warn('[useContainerQuery] Container ref is null, cannot observe');
      return;
    }

    if (observer) {
      observer.disconnect();
    }

    try {
      observer = new ResizeObserver(handleResize);
      observer.observe(containerRef.current, {
        box: 'border-box'
      });
    } catch (error) {
      console.error('[useContainerQuery] Failed to create ResizeObserver:', error);
    }
  }

  /**
   * Stops observing and cleans up
   * @returns {void}
   */
  function disconnect() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    listeners.clear();
  }

  /**
   * Gets current state synchronously
   * @returns {ContainerQueryMatch} Current state
   */
  function getState() {
    return state;
  }

  // Auto-observe if container is already available
  if (containerRef.current) {
    observe();
  }

  return {
    get matches() { return state.matches; },
    get dimensions() { return state.dimensions; },
    subscribe,
    observe,
    disconnect,
    getState
  };
}

/**
 * Creates a container query matcher for multiple breakpoints
 * 
 * @example
 * const matcher = createContainerQueryMatcher({
 *   small: { maxWidth: 600 },
 *   medium: { minWidth: 601, maxWidth: 1200 },
 *   large: { minWidth: 1201 }
 * });
 * 
 * matcher.subscribe(containerRef, (matches) => {
 *   console.log('Current breakpoint:', matches.current);
 * });
 * 
 * @param {Object.<string, Object>} breakpoints - Named breakpoint definitions
 * @returns {Object} Matcher API
 */
export function createContainerQueryMatcher(breakpoints) {
  const queries = new Map();
  const activeListeners = new Map();

  /**
   * Subscribes to breakpoint changes
   * @param {Object} containerRef - Container reference
   * @param {Function} callback - Called with { current: string, matches: Object }
   * @returns {Function} Unsubscribe function
   */
  function subscribe(containerRef, callback) {
    const queryInstances = [];

    // Create query for each breakpoint
    Object.entries(breakpoints).forEach(([name, conditions]) => {
      const query = useContainerQuery(containerRef, conditions);
      queryInstances.push({ name, query });
    });

    // Subscribe to all queries
    const unsubscribers = queryInstances.map(({ name, query }) => {
      return query.subscribe(() => {
        // Collect all matches
        const matches = {};
        let current = null;

        queryInstances.forEach(({ name: n, query: q }) => {
          matches[n] = q.matches;
          if (q.matches && !current) {
            current = n;
          }
        });

        callback({ current, matches });
      });
    });

    // Start observing
    queryInstances.forEach(({ query }) => query.observe());

    // Store for cleanup
    const listenerId = Symbol('listener');
    activeListeners.set(listenerId, { queryInstances, unsubscribers });

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
      queryInstances.forEach(({ query }) => query.disconnect());
      activeListeners.delete(listenerId);
    };
  }

  /**
   * Disconnects all active listeners
   * @returns {void}
   */
  function disconnectAll() {
    activeListeners.forEach(({ queryInstances, unsubscribers }) => {
      unsubscribers.forEach(unsub => unsub());
      queryInstances.forEach(({ query }) => query.disconnect());
    });
    activeListeners.clear();
  }

  return {
    subscribe,
    disconnectAll
  };
}

/**
 * Utility: Creates a container query CSS class applier
 * 
 * Automatically applies CSS classes based on container query matches.
 * Useful for progressive enhancement alongside @container queries.
 * 
 * @example
 * const applier = createContainerQueryClassApplier(containerRef, {
 *   'container-sm': { maxWidth: 600 },
 *   'container-md': { minWidth: 601, maxWidth: 1200 },
 *   'container-lg': { minWidth: 1201 }
 * });
 * 
 * @param {Object} containerRef - Container reference
 * @param {Object.<string, Object>} classQueries - Map of class names to query conditions
 * @returns {Object} Applier API with disconnect method
 */
export function createContainerQueryClassApplier(containerRef, classQueries) {
  const queries = [];

  Object.entries(classQueries).forEach(([className, conditions]) => {
    const query = useContainerQuery(containerRef, conditions);
    
    const unsubscribe = query.subscribe((state) => {
      if (!containerRef.current) return;

      if (state.matches) {
        containerRef.current.classList.add(className);
      } else {
        containerRef.current.classList.remove(className);
      }
    });

    queries.push({ query, unsubscribe });
  });

  // Start observing
  queries.forEach(({ query }) => query.observe());

  return {
    disconnect: () => {
      queries.forEach(({ query, unsubscribe }) => {
        unsubscribe();
        query.disconnect();
      });
    }
  };
}

/**
 * Performance monitoring wrapper
 * Logs query evaluation performance to console
 * 
 * @param {Function} queryFn - Query function to wrap
 * @returns {Function} Wrapped query function
 * @private
 */
function withPerformanceMonitoring(queryFn) {
  return (...args) => {
    const start = performance.now();
    const result = queryFn(...args);
    const duration = performance.now() - start;

    if (duration > 1) {
      console.warn(`[useContainerQuery] Slow query evaluation: ${duration.toFixed(2)}ms`);
    }

    return result;
  };
}

// Export performance-monitored version in development
if (process.env.NODE_ENV === 'development') {
  const originalUseContainerQuery = useContainerQuery;
  useContainerQuery = withPerformanceMonitoring(originalUseContainerQuery);
}