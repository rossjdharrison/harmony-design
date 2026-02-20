/**
 * @fileoverview CacheInvalidator - Automatically invalidates caches based on graph changes
 * 
 * Monitors graph mutations and intelligently invalidates affected cache entries.
 * Supports dependency tracking, selective invalidation, and invalidation strategies.
 * 
 * Performance Targets:
 * - Invalidation decision: <1ms per change
 * - Dependency resolution: <5ms for 1000 nodes
 * - Memory overhead: <5MB for tracking metadata
 * 
 * @module harmony-graph/cache-invalidator
 * @see harmony-design/DESIGN_SYSTEM.md#cache-invalidation
 */

/**
 * @typedef {Object} InvalidationRule
 * @property {string} id - Unique rule identifier
 * @property {Function} matcher - (change) => boolean - Determines if rule applies
 * @property {Function} selector - (change) => string[] - Selects cache keys to invalidate
 * @property {number} priority - Rule priority (higher = earlier)
 */

/**
 * @typedef {Object} CacheChange
 * @property {string} type - 'node-added'|'node-removed'|'edge-added'|'edge-removed'|'node-updated'
 * @property {string} nodeId - Affected node ID
 * @property {string} [edgeId] - Affected edge ID (for edge changes)
 * @property {Object} [metadata] - Additional change metadata
 * @property {number} timestamp - Change timestamp
 */

/**
 * @typedef {Object} InvalidationStrategy
 * @property {string} type - 'immediate'|'batched'|'deferred'
 * @property {number} [batchWindow] - Batch window in ms (for batched)
 * @property {number} [deferMs] - Defer duration in ms (for deferred)
 */

/**
 * CacheInvalidator automatically invalidates caches based on graph changes.
 * Tracks dependencies and applies invalidation rules efficiently.
 */
export class CacheInvalidator {
  /**
   * @param {Object} options - Configuration options
   * @param {Object} options.eventBus - EventBus instance for subscribing to graph changes
   * @param {InvalidationStrategy} [options.strategy] - Invalidation strategy
   * @param {boolean} [options.trackDependencies=true] - Enable dependency tracking
   * @param {number} [options.maxDependencyDepth=5] - Maximum dependency traversal depth
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.strategy = options.strategy || { type: 'immediate' };
    this.trackDependencies = options.trackDependencies !== false;
    this.maxDependencyDepth = options.maxDependencyDepth || 5;

    /** @type {Map<string, Set<string>>} */
    this.cacheRegistry = new Map(); // cacheId -> Set of cache keys
    
    /** @type {Map<string, Set<string>>} */
    this.nodeToCacheKeys = new Map(); // nodeId -> Set of cache keys
    
    /** @type {Map<string, Set<string>>} */
    this.edgeToCacheKeys = new Map(); // edgeId -> Set of cache keys
    
    /** @type {InvalidationRule[]} */
    this.rules = [];
    
    /** @type {CacheChange[]} */
    this.pendingChanges = [];
    
    /** @type {number|null} */
    this.batchTimer = null;
    
    /** @type {Map<string, Function>} */
    this.invalidationCallbacks = new Map(); // cacheId -> invalidation function
    
    /** @type {Set<string>} */
    this.invalidatedKeys = new Set();
    
    this.stats = {
      changesProcessed: 0,
      keysInvalidated: 0,
      rulesApplied: 0,
      batchesProcessed: 0
    };

    this._setupEventListeners();
    this._registerDefaultRules();
  }

  /**
   * Register a cache with the invalidator
   * @param {string} cacheId - Unique cache identifier
   * @param {Function} invalidationCallback - (keys: string[]) => void
   */
  registerCache(cacheId, invalidationCallback) {
    if (!this.cacheRegistry.has(cacheId)) {
      this.cacheRegistry.set(cacheId, new Set());
    }
    this.invalidationCallbacks.set(cacheId, invalidationCallback);
  }

  /**
   * Unregister a cache
   * @param {string} cacheId - Cache identifier
   */
  unregisterCache(cacheId) {
    this.cacheRegistry.delete(cacheId);
    this.invalidationCallbacks.delete(cacheId);
  }

  /**
   * Register a cache key with dependencies
   * @param {string} cacheId - Cache identifier
   * @param {string} cacheKey - Cache key
   * @param {Object} dependencies - Dependencies for this cache entry
   * @param {string[]} [dependencies.nodes] - Node IDs this entry depends on
   * @param {string[]} [dependencies.edges] - Edge IDs this entry depends on
   */
  registerCacheKey(cacheId, cacheKey, dependencies = {}) {
    // Add to cache registry
    if (!this.cacheRegistry.has(cacheId)) {
      this.cacheRegistry.set(cacheId, new Set());
    }
    this.cacheRegistry.get(cacheId).add(cacheKey);

    // Track node dependencies
    if (dependencies.nodes) {
      for (const nodeId of dependencies.nodes) {
        if (!this.nodeToCacheKeys.has(nodeId)) {
          this.nodeToCacheKeys.set(nodeId, new Set());
        }
        this.nodeToCacheKeys.get(nodeId).add(cacheKey);
      }
    }

    // Track edge dependencies
    if (dependencies.edges) {
      for (const edgeId of dependencies.edges) {
        if (!this.edgeToCacheKeys.has(edgeId)) {
          this.edgeToCacheKeys.set(edgeId, new Set());
        }
        this.edgeToCacheKeys.get(edgeId).add(cacheKey);
      }
    }
  }

  /**
   * Add an invalidation rule
   * @param {InvalidationRule} rule - Invalidation rule
   */
  addRule(rule) {
    this.rules.push(rule);
    // Sort by priority (descending)
    this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Remove an invalidation rule
   * @param {string} ruleId - Rule identifier
   */
  removeRule(ruleId) {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Process a graph change and invalidate affected caches
   * @param {CacheChange} change - Graph change event
   */
  processChange(change) {
    this.stats.changesProcessed++;

    if (this.strategy.type === 'batched') {
      this.pendingChanges.push(change);
      this._scheduleBatch();
    } else if (this.strategy.type === 'deferred') {
      this.pendingChanges.push(change);
      this._scheduleDeferred();
    } else {
      this._invalidateForChange(change);
    }
  }

  /**
   * Force immediate processing of all pending changes
   */
  flush() {
    if (this.pendingChanges.length > 0) {
      this._processBatch();
    }
  }

  /**
   * Clear all invalidation tracking
   */
  clear() {
    this.nodeToCacheKeys.clear();
    this.edgeToCacheKeys.clear();
    this.invalidatedKeys.clear();
    this.pendingChanges = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Get invalidation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      registeredCaches: this.cacheRegistry.size,
      trackedNodes: this.nodeToCacheKeys.size,
      trackedEdges: this.edgeToCacheKeys.size,
      pendingChanges: this.pendingChanges.length
    };
  }

  /**
   * Setup event listeners for graph changes
   * @private
   */
  _setupEventListeners() {
    if (!this.eventBus) return;

    // Listen for graph mutation events
    this.eventBus.subscribe('graph:node:added', (event) => {
      this.processChange({
        type: 'node-added',
        nodeId: event.detail.nodeId,
        metadata: event.detail,
        timestamp: Date.now()
      });
    });

    this.eventBus.subscribe('graph:node:removed', (event) => {
      this.processChange({
        type: 'node-removed',
        nodeId: event.detail.nodeId,
        metadata: event.detail,
        timestamp: Date.now()
      });
    });

    this.eventBus.subscribe('graph:node:updated', (event) => {
      this.processChange({
        type: 'node-updated',
        nodeId: event.detail.nodeId,
        metadata: event.detail,
        timestamp: Date.now()
      });
    });

    this.eventBus.subscribe('graph:edge:added', (event) => {
      this.processChange({
        type: 'edge-added',
        nodeId: event.detail.sourceId,
        edgeId: event.detail.edgeId,
        metadata: event.detail,
        timestamp: Date.now()
      });
    });

    this.eventBus.subscribe('graph:edge:removed', (event) => {
      this.processChange({
        type: 'edge-removed',
        nodeId: event.detail.sourceId,
        edgeId: event.detail.edgeId,
        metadata: event.detail,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Register default invalidation rules
   * @private
   */
  _registerDefaultRules() {
    // Rule: Invalidate node-specific caches on node changes
    this.addRule({
      id: 'node-direct-dependency',
      priority: 100,
      matcher: (change) => change.nodeId !== undefined,
      selector: (change) => {
        const keys = this.nodeToCacheKeys.get(change.nodeId);
        return keys ? Array.from(keys) : [];
      }
    });

    // Rule: Invalidate edge-specific caches on edge changes
    this.addRule({
      id: 'edge-direct-dependency',
      priority: 100,
      matcher: (change) => change.edgeId !== undefined,
      selector: (change) => {
        const keys = this.edgeToCacheKeys.get(change.edgeId);
        return keys ? Array.from(keys) : [];
      }
    });

    // Rule: Invalidate connected node caches on edge changes
    this.addRule({
      id: 'edge-affects-connected-nodes',
      priority: 90,
      matcher: (change) => change.type === 'edge-added' || change.type === 'edge-removed',
      selector: (change) => {
        const keys = new Set();
        if (change.metadata?.sourceId) {
          const sourceKeys = this.nodeToCacheKeys.get(change.metadata.sourceId);
          if (sourceKeys) sourceKeys.forEach(k => keys.add(k));
        }
        if (change.metadata?.targetId) {
          const targetKeys = this.nodeToCacheKeys.get(change.metadata.targetId);
          if (targetKeys) targetKeys.forEach(k => keys.add(k));
        }
        return Array.from(keys);
      }
    });
  }

  /**
   * Invalidate caches for a specific change
   * @private
   * @param {CacheChange} change - Graph change
   */
  _invalidateForChange(change) {
    const keysToInvalidate = new Set();

    // Apply all matching rules
    for (const rule of this.rules) {
      if (rule.matcher(change)) {
        const keys = rule.selector(change);
        keys.forEach(k => keysToInvalidate.add(k));
        this.stats.rulesApplied++;
      }
    }

    // Group keys by cache ID and invoke callbacks
    const keysByCache = new Map();
    for (const key of keysToInvalidate) {
      // Find which cache this key belongs to
      for (const [cacheId, keys] of this.cacheRegistry.entries()) {
        if (keys.has(key)) {
          if (!keysByCache.has(cacheId)) {
            keysByCache.set(cacheId, []);
          }
          keysByCache.get(cacheId).push(key);
        }
      }
    }

    // Invoke invalidation callbacks
    for (const [cacheId, keys] of keysByCache.entries()) {
      const callback = this.invalidationCallbacks.get(cacheId);
      if (callback) {
        callback(keys);
        keys.forEach(k => this.invalidatedKeys.add(k));
        this.stats.keysInvalidated += keys.length;
      }
    }

    // Publish invalidation event
    if (this.eventBus && keysToInvalidate.size > 0) {
      this.eventBus.publish('cache:invalidated', {
        change,
        keysInvalidated: Array.from(keysToInvalidate),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Schedule a batch processing
   * @private
   */
  _scheduleBatch() {
    if (this.batchTimer) return;

    const batchWindow = this.strategy.batchWindow || 100;
    this.batchTimer = setTimeout(() => {
      this._processBatch();
    }, batchWindow);
  }

  /**
   * Schedule deferred processing
   * @private
   */
  _scheduleDeferred() {
    if (this.batchTimer) return;

    const deferMs = this.strategy.deferMs || 1000;
    this.batchTimer = setTimeout(() => {
      this._processBatch();
    }, deferMs);
  }

  /**
   * Process batched changes
   * @private
   */
  _processBatch() {
    this.batchTimer = null;
    this.stats.batchesProcessed++;

    // Deduplicate changes by node/edge
    const uniqueChanges = new Map();
    for (const change of this.pendingChanges) {
      const key = change.edgeId || change.nodeId;
      // Keep the latest change for each entity
      if (!uniqueChanges.has(key) || uniqueChanges.get(key).timestamp < change.timestamp) {
        uniqueChanges.set(key, change);
      }
    }

    // Process deduplicated changes
    for (const change of uniqueChanges.values()) {
      this._invalidateForChange(change);
    }

    this.pendingChanges = [];
  }
}

/**
 * Create a CacheInvalidator instance with common configuration
 * @param {Object} eventBus - EventBus instance
 * @param {Object} [options] - Additional options
 * @returns {CacheInvalidator}
 */
export function createCacheInvalidator(eventBus, options = {}) {
  return new CacheInvalidator({
    eventBus,
    ...options
  });
}