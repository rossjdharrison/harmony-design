/**
 * @fileoverview Cache Strategy Manager
 * 
 * Implements three primary caching strategies for resource management:
 * - Cache-First: Serve from cache if available, fetch if not
 * - Network-First: Fetch from network, fallback to cache on failure
 * - Stale-While-Revalidate: Serve from cache immediately, fetch in background
 * 
 * Aligns with Harmony Design System performance budgets:
 * - Maximum 200ms initial load time
 * - Efficient resource caching for WASM modules and assets
 * 
 * @see DESIGN_SYSTEM.md#cache-strategy-manager
 */

/**
 * Cache strategy types
 * @enum {string}
 */
export const CacheStrategy = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

/**
 * Cache configuration options
 * @typedef {Object} CacheConfig
 * @property {string} cacheName - Name of the cache storage
 * @property {number} maxAge - Maximum age in milliseconds before cache is stale
 * @property {number} maxEntries - Maximum number of entries in cache
 * @property {string[]} urlPatterns - URL patterns to match for this strategy
 * @property {CacheStrategy} strategy - Cache strategy to use
 */

/**
 * Cache entry metadata
 * @typedef {Object} CacheMetadata
 * @property {number} timestamp - When the entry was cached
 * @property {string} etag - ETag from server response
 * @property {number} size - Size of cached content in bytes
 * @property {number} hits - Number of times this entry was accessed
 */

/**
 * Cache Strategy Manager
 * 
 * Manages caching strategies for different resource types.
 * Provides performance optimization through intelligent caching.
 * 
 * @class
 */
export class CacheStrategyManager {
  /**
   * @param {Object} options - Configuration options
   * @param {string} [options.version='v1'] - Cache version for invalidation
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(options = {}) {
    this.version = options.version || 'v1';
    this.debug = options.debug || false;
    
    /** @type {Map<string, CacheConfig>} */
    this.strategies = new Map();
    
    /** @type {Map<string, CacheMetadata>} */
    this.metadata = new Map();
    
    /** @type {number} */
    this.totalCacheSize = 0;
    
    /** @type {number} */
    this.maxTotalSize = 50 * 1024 * 1024; // 50MB aligned with WASM heap budget
    
    this._initializeDefaultStrategies();
    this._log('CacheStrategyManager initialized', { version: this.version });
  }

  /**
   * Initialize default caching strategies for common resource types
   * @private
   */
  _initializeDefaultStrategies() {
    // WASM modules: Cache-first (rarely change, critical for performance)
    this.registerStrategy({
      cacheName: `harmony-wasm-${this.version}`,
      strategy: CacheStrategy.CACHE_FIRST,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxEntries: 10,
      urlPatterns: ['*.wasm', '/wasm/*', '*/harmony-*.wasm']
    });

    // Static assets: Cache-first with longer TTL
    this.registerStrategy({
      cacheName: `harmony-assets-${this.version}`,
      strategy: CacheStrategy.CACHE_FIRST,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxEntries: 100,
      urlPatterns: ['*.css', '*.js', '*.svg', '*.png', '*.jpg', '*.webp']
    });

    // API data: Network-first (freshness important)
    this.registerStrategy({
      cacheName: `harmony-api-${this.version}`,
      strategy: CacheStrategy.NETWORK_FIRST,
      maxAge: 5 * 60 * 1000, // 5 minutes
      maxEntries: 50,
      urlPatterns: ['/api/*', '*/api/*']
    });

    // Audio samples: Stale-while-revalidate (balance freshness and performance)
    this.registerStrategy({
      cacheName: `harmony-audio-${this.version}`,
      strategy: CacheStrategy.STALE_WHILE_REVALIDATE,
      maxAge: 60 * 60 * 1000, // 1 hour
      maxEntries: 200,
      urlPatterns: ['*.wav', '*.mp3', '*.ogg', '*.flac', '/audio/*']
    });
  }

  /**
   * Register a new caching strategy
   * @param {CacheConfig} config - Strategy configuration
   */
  registerStrategy(config) {
    const key = config.cacheName;
    this.strategies.set(key, config);
    this._log('Strategy registered', config);
  }

  /**
   * Match URL against registered strategies
   * @param {string} url - URL to match
   * @returns {CacheConfig|null} Matching strategy or null
   * @private
   */
  _matchStrategy(url) {
    for (const [, config] of this.strategies) {
      for (const pattern of config.urlPatterns) {
        if (this._matchPattern(url, pattern)) {
          return config;
        }
      }
    }
    return null;
  }

  /**
   * Match URL against pattern (supports wildcards)
   * @param {string} url - URL to match
   * @param {string} pattern - Pattern with optional wildcards
   * @returns {boolean} True if matches
   * @private
   */
  _matchPattern(url, pattern) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(url);
  }

  /**
   * Fetch resource using cache-first strategy
   * @param {Request} request - Fetch request
   * @param {CacheConfig} config - Cache configuration
   * @returns {Promise<Response>} Response from cache or network
   * @private
   */
  async _cacheFirst(request, config) {
    const cache = await caches.open(config.cacheName);
    const cached = await cache.match(request);

    if (cached) {
      const metadata = this._getMetadata(request.url);
      if (metadata && !this._isStale(metadata, config.maxAge)) {
        this._updateMetadata(request.url, { hits: metadata.hits + 1 });
        this._log('Cache hit (cache-first)', { url: request.url });
        return cached;
      }
    }

    this._log('Cache miss (cache-first), fetching', { url: request.url });
    const response = await fetch(request);
    
    if (response.ok) {
      await this._cacheResponse(cache, request, response.clone(), config);
    }
    
    return response;
  }

  /**
   * Fetch resource using network-first strategy
   * @param {Request} request - Fetch request
   * @param {CacheConfig} config - Cache configuration
   * @returns {Promise<Response>} Response from network or cache
   * @private
   */
  async _networkFirst(request, config) {
    const cache = await caches.open(config.cacheName);

    try {
      this._log('Fetching from network (network-first)', { url: request.url });
      const response = await fetch(request);
      
      if (response.ok) {
        await this._cacheResponse(cache, request, response.clone(), config);
      }
      
      return response;
    } catch (error) {
      this._log('Network failed, trying cache', { url: request.url, error: error.message });
      const cached = await cache.match(request);
      
      if (cached) {
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Fetch resource using stale-while-revalidate strategy
   * @param {Request} request - Fetch request
   * @param {CacheConfig} config - Cache configuration
   * @returns {Promise<Response>} Response from cache, revalidate in background
   * @private
   */
  async _staleWhileRevalidate(request, config) {
    const cache = await caches.open(config.cacheName);
    const cached = await cache.match(request);

    // Revalidate in background (non-blocking)
    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        this._cacheResponse(cache, request, response.clone(), config);
      }
      return response;
    }).catch(error => {
      this._log('Background revalidation failed', { url: request.url, error: error.message });
    });

    // Return cached response immediately if available
    if (cached) {
      this._log('Serving stale content, revalidating', { url: request.url });
      return cached;
    }

    // If no cache, wait for network
    this._log('No cache, waiting for network', { url: request.url });
    return fetchPromise;
  }

  /**
   * Cache a response with metadata
   * @param {Cache} cache - Cache instance
   * @param {Request} request - Original request
   * @param {Response} response - Response to cache
   * @param {CacheConfig} config - Cache configuration
   * @private
   */
  async _cacheResponse(cache, request, response, config) {
    // Check cache size limits
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    
    if (this.totalCacheSize + contentLength > this.maxTotalSize) {
      await this._evictOldest(cache, config);
    }

    await cache.put(request, response);
    
    const metadata = {
      timestamp: Date.now(),
      etag: response.headers.get('etag') || '',
      size: contentLength,
      hits: 0
    };
    
    this._setMetadata(request.url, metadata);
    this.totalCacheSize += contentLength;
    
    this._log('Response cached', { url: request.url, size: contentLength });
    
    // Enforce max entries
    await this._enforceMaxEntries(cache, config);
  }

  /**
   * Check if cached entry is stale
   * @param {CacheMetadata} metadata - Cache metadata
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} True if stale
   * @private
   */
  _isStale(metadata, maxAge) {
    return Date.now() - metadata.timestamp > maxAge;
  }

  /**
   * Evict oldest cache entries to free space
   * @param {Cache} cache - Cache instance
   * @param {CacheConfig} config - Cache configuration
   * @private
   */
  async _evictOldest(cache, config) {
    const keys = await cache.keys();
    const entries = [];

    for (const request of keys) {
      const metadata = this._getMetadata(request.url);
      if (metadata) {
        entries.push({ request, metadata });
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

    // Remove oldest 20%
    const toRemove = Math.ceil(entries.length * 0.2);
    
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      await cache.delete(entries[i].request);
      this.totalCacheSize -= entries[i].metadata.size;
      this.metadata.delete(entries[i].request.url);
      this._log('Evicted old entry', { url: entries[i].request.url });
    }
  }

  /**
   * Enforce maximum entries limit
   * @param {Cache} cache - Cache instance
   * @param {CacheConfig} config - Cache configuration
   * @private
   */
  async _enforceMaxEntries(cache, config) {
    const keys = await cache.keys();
    
    if (keys.length > config.maxEntries) {
      const toRemove = keys.length - config.maxEntries;
      
      for (let i = 0; i < toRemove; i++) {
        const metadata = this._getMetadata(keys[i].url);
        await cache.delete(keys[i]);
        
        if (metadata) {
          this.totalCacheSize -= metadata.size;
          this.metadata.delete(keys[i].url);
        }
      }
      
      this._log('Enforced max entries', { removed: toRemove, limit: config.maxEntries });
    }
  }

  /**
   * Get metadata for cached URL
   * @param {string} url - Cache key URL
   * @returns {CacheMetadata|null} Metadata or null
   * @private
   */
  _getMetadata(url) {
    return this.metadata.get(url) || null;
  }

  /**
   * Set metadata for cached URL
   * @param {string} url - Cache key URL
   * @param {CacheMetadata} metadata - Metadata to store
   * @private
   */
  _setMetadata(url, metadata) {
    this.metadata.set(url, metadata);
  }

  /**
   * Update metadata for cached URL
   * @param {string} url - Cache key URL
   * @param {Partial<CacheMetadata>} updates - Partial metadata updates
   * @private
   */
  _updateMetadata(url, updates) {
    const existing = this.metadata.get(url);
    if (existing) {
      this.metadata.set(url, { ...existing, ...updates });
    }
  }

  /**
   * Fetch resource using appropriate strategy
   * @param {string|Request} input - URL or Request object
   * @param {RequestInit} [init] - Fetch options
   * @returns {Promise<Response>} Response
   */
  async fetch(input, init) {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = request.url;
    
    const config = this._matchStrategy(url);
    
    if (!config) {
      this._log('No strategy matched, using network-only', { url });
      return fetch(request);
    }

    this._log('Strategy matched', { url, strategy: config.strategy });

    switch (config.strategy) {
      case CacheStrategy.CACHE_FIRST:
        return this._cacheFirst(request, config);
      
      case CacheStrategy.NETWORK_FIRST:
        return this._networkFirst(request, config);
      
      case CacheStrategy.STALE_WHILE_REVALIDATE:
        return this._staleWhileRevalidate(request, config);
      
      case CacheStrategy.NETWORK_ONLY:
        return fetch(request);
      
      case CacheStrategy.CACHE_ONLY:
        const cache = await caches.open(config.cacheName);
        const cached = await cache.match(request);
        if (!cached) {
          throw new Error(`No cached response for ${url}`);
        }
        return cached;
      
      default:
        return fetch(request);
    }
  }

  /**
   * Clear all caches managed by this instance
   * @returns {Promise<void>}
   */
  async clearAll() {
    const cacheNames = Array.from(this.strategies.keys());
    
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
      this._log('Cache cleared', { cacheName });
    }
    
    this.metadata.clear();
    this.totalCacheSize = 0;
  }

  /**
   * Clear specific cache by name
   * @param {string} cacheName - Name of cache to clear
   * @returns {Promise<boolean>} True if cache was deleted
   */
  async clearCache(cacheName) {
    const deleted = await caches.delete(cacheName);
    
    if (deleted) {
      // Clear metadata for this cache
      for (const [url, metadata] of this.metadata) {
        const config = this._matchStrategy(url);
        if (config && config.cacheName === cacheName) {
          this.totalCacheSize -= metadata.size;
          this.metadata.delete(url);
        }
      }
      
      this._log('Cache cleared', { cacheName });
    }
    
    return deleted;
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    const stats = {
      totalSize: this.totalCacheSize,
      maxSize: this.maxTotalSize,
      utilizationPercent: (this.totalCacheSize / this.maxTotalSize) * 100,
      strategies: {},
      totalEntries: 0,
      totalHits: 0
    };

    for (const [cacheName, config] of this.strategies) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      let hits = 0;
      let size = 0;
      
      for (const request of keys) {
        const metadata = this._getMetadata(request.url);
        if (metadata) {
          hits += metadata.hits;
          size += metadata.size;
        }
      }
      
      stats.strategies[cacheName] = {
        strategy: config.strategy,
        entries: keys.length,
        maxEntries: config.maxEntries,
        size,
        hits
      };
      
      stats.totalEntries += keys.length;
      stats.totalHits += hits;
    }

    return stats;
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data
   * @private
   */
  _log(message, data = {}) {
    if (this.debug) {
      console.log(`[CacheStrategyManager] ${message}`, data);
    }
  }
}

/**
 * Global cache strategy manager instance
 * @type {CacheStrategyManager|null}
 */
let globalInstance = null;

/**
 * Get or create global cache strategy manager instance
 * @param {Object} [options] - Configuration options
 * @returns {CacheStrategyManager} Global instance
 */
export function getCacheStrategyManager(options) {
  if (!globalInstance) {
    globalInstance = new CacheStrategyManager(options);
  }
  return globalInstance;
}

/**
 * Reset global instance (useful for testing)
 */
export function resetCacheStrategyManager() {
  globalInstance = null;
}