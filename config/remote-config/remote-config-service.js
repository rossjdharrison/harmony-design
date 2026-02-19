/**
 * @fileoverview Remote Config Service - Fetches feature flags from remote config endpoint
 * @module config/remote-config/remote-config-service
 * 
 * Implements remote feature flag fetching with caching, polling, and error recovery.
 * Integrates with Feature Flag Context to provide dynamic flag updates.
 * 
 * Related: contexts/feature-flag-context.js, hooks/useFeatureFlag.js
 * Documentation: DESIGN_SYSTEM.md#remote-config-service
 */

/**
 * @typedef {Object} RemoteConfigOptions
 * @property {string} endpoint - Remote config API endpoint
 * @property {number} [pollInterval=300000] - Polling interval in ms (default 5 min)
 * @property {number} [timeout=5000] - Request timeout in ms
 * @property {boolean} [enablePolling=true] - Enable automatic polling
 * @property {Object} [headers] - Custom headers for requests
 * @property {Function} [onUpdate] - Callback when config updates
 * @property {Function} [onError] - Callback when fetch fails
 */

/**
 * @typedef {Object} RemoteConfigResponse
 * @property {Object<string, boolean>} flags - Feature flag values
 * @property {number} version - Config version number
 * @property {string} [etag] - ETag for cache validation
 * @property {number} [ttl] - Time-to-live in seconds
 */

/**
 * Remote Config Service for fetching feature flags
 * Provides caching, polling, and error recovery mechanisms
 */
export class RemoteConfigService {
  /**
   * @param {RemoteConfigOptions} options - Service configuration
   */
  constructor(options) {
    this.endpoint = options.endpoint;
    this.pollInterval = options.pollInterval || 300000; // 5 minutes default
    this.timeout = options.timeout || 5000;
    this.enablePolling = options.enablePolling !== false;
    this.headers = options.headers || {};
    this.onUpdate = options.onUpdate || (() => {});
    this.onError = options.onError || ((error) => console.error('[RemoteConfig]', error));
    
    /** @type {RemoteConfigResponse|null} */
    this.currentConfig = null;
    
    /** @type {number|null} */
    this.pollTimerId = null;
    
    /** @type {string|null} */
    this.cachedEtag = null;
    
    /** @type {boolean} */
    this.isPolling = false;
    
    /** @type {AbortController|null} */
    this.abortController = null;
    
    this._loadFromCache();
  }

  /**
   * Fetch feature flags from remote endpoint
   * @returns {Promise<RemoteConfigResponse>}
   */
  async fetch() {
    // Cancel any in-flight request
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => this.abortController.abort(), this.timeout);

    try {
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...this.headers
      };

      // Add ETag for conditional requests
      if (this.cachedEtag) {
        requestHeaders['If-None-Match'] = this.cachedEtag;
      }

      const response = await fetch(this.endpoint, {
        method: 'GET',
        headers: requestHeaders,
        signal: this.abortController.signal
      });

      clearTimeout(timeoutId);

      // 304 Not Modified - use cached config
      if (response.status === 304) {
        console.log('[RemoteConfig] Config unchanged (304)');
        return this.currentConfig;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const config = await response.json();
      
      // Validate response structure
      if (!config.flags || typeof config.flags !== 'object') {
        throw new Error('Invalid config response: missing flags object');
      }

      // Update ETag for next request
      this.cachedEtag = response.headers.get('ETag');
      
      // Store config
      this.currentConfig = {
        flags: config.flags,
        version: config.version || Date.now(),
        etag: this.cachedEtag,
        ttl: config.ttl
      };

      // Cache to localStorage
      this._saveToCache();

      // Notify listeners
      this.onUpdate(this.currentConfig);

      console.log('[RemoteConfig] Fetched config version:', this.currentConfig.version);
      
      return this.currentConfig;

    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('[RemoteConfig] Request timeout');
        this.onError(new Error('Request timeout'));
      } else {
        console.error('[RemoteConfig] Fetch failed:', error);
        this.onError(error);
      }

      // Return cached config if available
      if (this.currentConfig) {
        console.log('[RemoteConfig] Using cached config');
        return this.currentConfig;
      }

      throw error;

    } finally {
      clearTimeout(timeoutId);
      this.abortController = null;
    }
  }

  /**
   * Start polling for config updates
   * @returns {void}
   */
  startPolling() {
    if (this.isPolling || !this.enablePolling) {
      return;
    }

    this.isPolling = true;
    console.log('[RemoteConfig] Starting polling (interval:', this.pollInterval, 'ms)');

    // Initial fetch
    this.fetch().catch(() => {
      // Error already handled in fetch()
    });

    // Set up polling
    this.pollTimerId = setInterval(() => {
      this.fetch().catch(() => {
        // Error already handled in fetch()
      });
    }, this.pollInterval);
  }

  /**
   * Stop polling for config updates
   * @returns {void}
   */
  stopPolling() {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;
    
    if (this.pollTimerId) {
      clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    console.log('[RemoteConfig] Polling stopped');
  }

  /**
   * Get current feature flag value
   * @param {string} flagName - Feature flag name
   * @param {boolean} [defaultValue=false] - Default value if flag not found
   * @returns {boolean}
   */
  getFlag(flagName, defaultValue = false) {
    if (!this.currentConfig || !this.currentConfig.flags) {
      return defaultValue;
    }

    return this.currentConfig.flags[flagName] ?? defaultValue;
  }

  /**
   * Get all feature flags
   * @returns {Object<string, boolean>}
   */
  getAllFlags() {
    return this.currentConfig?.flags || {};
  }

  /**
   * Get current config version
   * @returns {number|null}
   */
  getVersion() {
    return this.currentConfig?.version || null;
  }

  /**
   * Force refresh config from remote
   * @returns {Promise<RemoteConfigResponse>}
   */
  async refresh() {
    console.log('[RemoteConfig] Forcing refresh');
    this.cachedEtag = null; // Clear ETag to force full fetch
    return this.fetch();
  }

  /**
   * Load cached config from localStorage
   * @private
   */
  _loadFromCache() {
    try {
      const cached = localStorage.getItem('harmony:remote-config');
      if (cached) {
        this.currentConfig = JSON.parse(cached);
        this.cachedEtag = this.currentConfig.etag;
        console.log('[RemoteConfig] Loaded from cache, version:', this.currentConfig.version);
      }
    } catch (error) {
      console.warn('[RemoteConfig] Failed to load cache:', error);
    }
  }

  /**
   * Save config to localStorage cache
   * @private
   */
  _saveToCache() {
    try {
      localStorage.setItem('harmony:remote-config', JSON.stringify(this.currentConfig));
    } catch (error) {
      console.warn('[RemoteConfig] Failed to save cache:', error);
    }
  }

  /**
   * Clear cached config
   * @returns {void}
   */
  clearCache() {
    this.currentConfig = null;
    this.cachedEtag = null;
    try {
      localStorage.removeItem('harmony:remote-config');
      console.log('[RemoteConfig] Cache cleared');
    } catch (error) {
      console.warn('[RemoteConfig] Failed to clear cache:', error);
    }
  }

  /**
   * Destroy service and clean up resources
   * @returns {void}
   */
  destroy() {
    this.stopPolling();
    this.currentConfig = null;
    this.cachedEtag = null;
  }
}

/**
 * Create and configure remote config service
 * @param {RemoteConfigOptions} options - Service configuration
 * @returns {RemoteConfigService}
 */
export function createRemoteConfigService(options) {
  return new RemoteConfigService(options);
}