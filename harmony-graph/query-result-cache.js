/**
 * @fileoverview Query Result Cache with LRU eviction strategy
 * @module harmony-graph/query-result-cache
 * 
 * Implements an LRU cache for expensive graph queries with:
 * - TTL (Time To Live) for automatic expiration
 * - Automatic invalidation on graph mutations
 * - Memory-efficient storage with size limits
 * - Performance metrics tracking
 * 
 * @see DESIGN_SYSTEM.md#query-result-cache
 */

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {any} result - The cached query result
 * @property {number} timestamp - When the entry was created (ms)
 * @property {number} accessCount - Number of times accessed
 * @property {number} lastAccess - Last access timestamp (ms)
 * @property {Set<string>} affectedNodes - Node IDs that affect this query
 * @property {Set<string>} affectedEdges - Edge IDs that affect this query
 * @property {number} size - Estimated memory size in bytes
 */

/**
 * Cache configuration
 * @typedef {Object} CacheConfig
 * @property {number} maxSize - Maximum cache size in bytes (default: 10MB)
 * @property {number} maxEntries - Maximum number of entries (default: 1000)
 * @property {number} defaultTTL - Default TTL in milliseconds (default: 5 minutes)
 * @property {boolean} enableMetrics - Enable performance metrics (default: true)
 */

/**
 * Query Result Cache with LRU eviction
 * Caches expensive graph query results and invalidates on mutations
 */
export class QueryResultCache {
  /**
   * @param {CacheConfig} config - Cache configuration
   */
  constructor(config = {}) {
    this.config = {
      maxSize: config.maxSize || 10 * 1024 * 1024, // 10MB
      maxEntries: config.maxEntries || 1000,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      enableMetrics: config.enableMetrics !== false,
    };

    /** @type {Map<string, CacheEntry>} */
    this.cache = new Map();

    /** @type {Map<string, Set<string>>} Node ID -> Set of cache keys */
    this.nodeIndex = new Map();

    /** @type {Map<string, Set<string>>} Edge ID -> Set of cache keys */
    this.edgeIndex = new Map();

    this.currentSize = 0;
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
      totalQueries: 0,
    };

    // Subscribe to graph mutation events
    this._subscribeToMutations();
  }

  /**
   * Subscribe to graph mutation events for automatic invalidation
   * @private
   */
  _subscribeToMutations() {
    if (typeof window !== 'undefined' && window.eventBus) {
      // Subscribe to node mutations
      window.eventBus.subscribe('graph.node.created', (event) => {
        this._invalidateByNode(event.payload.nodeId);
      });

      window.eventBus.subscribe('graph.node.updated', (event) => {
        this._invalidateByNode(event.payload.nodeId);
      });

      window.eventBus.subscribe('graph.node.deleted', (event) => {
        this._invalidateByNode(event.payload.nodeId);
      });

      // Subscribe to edge mutations
      window.eventBus.subscribe('graph.edge.created', (event) => {
        this._invalidateByEdge(event.payload.edgeId);
      });

      window.eventBus.subscribe('graph.edge.updated', (event) => {
        this._invalidateByEdge(event.payload.edgeId);
      });

      window.eventBus.subscribe('graph.edge.deleted', (event) => {
        this._invalidateByEdge(event.payload.edgeId);
      });

      // Subscribe to bulk mutations
      window.eventBus.subscribe('graph.mutation.batch', (event) => {
        this.invalidateAll();
      });
    }
  }

  /**
   * Generate cache key from query parameters
   * @param {string} queryType - Type of query
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  generateKey(queryType, params) {
    return `${queryType}:${JSON.stringify(params)}`;
  }

  /**
   * Get cached query result
   * @param {string} key - Cache key
   * @returns {any|null} Cached result or null if not found/expired
   */
  get(key) {
    this.metrics.totalQueries++;

    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check TTL
    const now = Date.now();
    const age = now - entry.timestamp;
    if (age > this.config.defaultTTL) {
      this.delete(key);
      this.metrics.misses++;
      return null;
    }

    // Update access tracking (LRU)
    entry.accessCount++;
    entry.lastAccess = now;

    this.metrics.hits++;
    return entry.result;
  }

  /**
   * Store query result in cache
   * @param {string} key - Cache key
   * @param {any} result - Query result to cache
   * @param {Object} dependencies - Query dependencies
   * @param {string[]} dependencies.nodes - Affected node IDs
   * @param {string[]} dependencies.edges - Affected edge IDs
   * @param {number} [ttl] - Custom TTL in milliseconds
   */
  set(key, result, dependencies = {}, ttl = null) {
    const size = this._estimateSize(result);
    const now = Date.now();

    // Check if we need to evict entries
    this._ensureCapacity(size);

    const entry = {
      result,
      timestamp: now,
      accessCount: 1,
      lastAccess: now,
      affectedNodes: new Set(dependencies.nodes || []),
      affectedEdges: new Set(dependencies.edges || []),
      size,
      ttl: ttl || this.config.defaultTTL,
    };

    // Update cache
    this.cache.set(key, entry);
    this.currentSize += size;

    // Update indexes
    for (const nodeId of entry.affectedNodes) {
      if (!this.nodeIndex.has(nodeId)) {
        this.nodeIndex.set(nodeId, new Set());
      }
      this.nodeIndex.get(nodeId).add(key);
    }

    for (const edgeId of entry.affectedEdges) {
      if (!this.edgeIndex.has(edgeId)) {
        this.edgeIndex.set(edgeId, new Set());
      }
      this.edgeIndex.get(edgeId).add(key);
    }
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if entry was deleted
   */
  delete(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Remove from indexes
    for (const nodeId of entry.affectedNodes) {
      const keys = this.nodeIndex.get(nodeId);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.nodeIndex.delete(nodeId);
        }
      }
    }

    for (const edgeId of entry.affectedEdges) {
      const keys = this.edgeIndex.get(edgeId);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.edgeIndex.delete(edgeId);
        }
      }
    }

    // Remove from cache
    this.currentSize -= entry.size;
    this.cache.delete(key);

    return true;
  }

  /**
   * Invalidate cache entries affected by node mutation
   * @param {string} nodeId - Node ID that was mutated
   * @private
   */
  _invalidateByNode(nodeId) {
    const keys = this.nodeIndex.get(nodeId);
    if (!keys) {
      return;
    }

    for (const key of keys) {
      this.delete(key);
      this.metrics.invalidations++;
    }
  }

  /**
   * Invalidate cache entries affected by edge mutation
   * @param {string} edgeId - Edge ID that was mutated
   * @private
   */
  _invalidateByEdge(edgeId) {
    const keys = this.edgeIndex.get(edgeId);
    if (!keys) {
      return;
    }

    for (const key of keys) {
      this.delete(key);
      this.metrics.invalidations++;
    }
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll() {
    const count = this.cache.size;
    this.cache.clear();
    this.nodeIndex.clear();
    this.edgeIndex.clear();
    this.currentSize = 0;
    this.metrics.invalidations += count;
  }

  /**
   * Ensure cache has capacity for new entry
   * Evicts LRU entries if necessary
   * @param {number} requiredSize - Size needed for new entry
   * @private
   */
  _ensureCapacity(requiredSize) {
    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      this._evictLRU();
    }

    // Check size limit
    while (this.currentSize + requiredSize > this.config.maxSize) {
      this._evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   * @private
   */
  _evictLRU() {
    if (this.cache.size === 0) {
      return;
    }

    let lruKey = null;
    let lruTime = Infinity;

    // Find entry with oldest lastAccess
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Estimate memory size of cached value
   * @param {any} value - Value to estimate
   * @returns {number} Estimated size in bytes
   * @private
   */
  _estimateSize(value) {
    if (value === null || value === undefined) {
      return 8;
    }

    const type = typeof value;
    if (type === 'boolean') {
      return 4;
    }
    if (type === 'number') {
      return 8;
    }
    if (type === 'string') {
      return value.length * 2; // UTF-16
    }

    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this._estimateSize(item), 24);
    }

    if (type === 'object') {
      let size = 24; // Object overhead
      for (const [key, val] of Object.entries(value)) {
        size += key.length * 2 + this._estimateSize(val);
      }
      return size;
    }

    return 8; // Default
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.metrics.totalQueries > 0
      ? (this.metrics.hits / this.metrics.totalQueries) * 100
      : 0;

    return {
      entries: this.cache.size,
      size: this.currentSize,
      maxSize: this.config.maxSize,
      maxEntries: this.config.maxEntries,
      utilizationPercent: (this.currentSize / this.config.maxSize) * 100,
      hitRate: hitRate.toFixed(2),
      ...this.metrics,
    };
  }

  /**
   * Clear cache and reset metrics
   */
  clear() {
    this.cache.clear();
    this.nodeIndex.clear();
    this.edgeIndex.clear();
    this.currentSize = 0;
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
      totalQueries: 0,
    };
  }

  /**
   * Export cache state for debugging
   * @returns {Object} Cache state
   */
  debug() {
    const entries = [];
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        timestamp: entry.timestamp,
        accessCount: entry.accessCount,
        lastAccess: entry.lastAccess,
        age: Date.now() - entry.timestamp,
        size: entry.size,
        nodes: Array.from(entry.affectedNodes),
        edges: Array.from(entry.affectedEdges),
      });
    }

    return {
      stats: this.getStats(),
      entries: entries.sort((a, b) => b.lastAccess - a.lastAccess),
      nodeIndex: Array.from(this.nodeIndex.entries()).map(([nodeId, keys]) => ({
        nodeId,
        cacheKeys: Array.from(keys),
      })),
      edgeIndex: Array.from(this.edgeIndex.entries()).map(([edgeId, keys]) => ({
        edgeId,
        cacheKeys: Array.from(keys),
      })),
    };
  }
}

// Global singleton instance
let globalCache = null;

/**
 * Get or create global cache instance
 * @param {CacheConfig} [config] - Configuration (only used on first call)
 * @returns {QueryResultCache} Global cache instance
 */
export function getQueryCache(config) {
  if (!globalCache) {
    globalCache = new QueryResultCache(config);
  }
  return globalCache;
}

/**
 * Reset global cache instance (for testing)
 */
export function resetQueryCache() {
  if (globalCache) {
    globalCache.clear();
  }
  globalCache = null;
}