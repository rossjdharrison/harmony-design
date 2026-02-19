/**
 * @fileoverview Remote Config Adapter - Integrates RemoteConfigService with Feature Flag Context
 * @module config/remote-config/remote-config-adapter
 * 
 * Bridges remote config service with the feature flag context system.
 * Handles initialization, updates, and error recovery.
 * 
 * Related: config/remote-config/remote-config-service.js, contexts/feature-flag-context.js
 * Documentation: DESIGN_SYSTEM.md#remote-config-adapter
 */

import { RemoteConfigService } from './remote-config-service.js';

/**
 * @typedef {Object} RemoteConfigAdapterOptions
 * @property {string} endpoint - Remote config API endpoint
 * @property {number} [pollInterval] - Polling interval in ms
 * @property {number} [timeout] - Request timeout in ms
 * @property {boolean} [enablePolling] - Enable automatic polling
 * @property {Object} [headers] - Custom headers
 * @property {Function} updateFlags - Callback to update flags in context
 * @property {Function} [onError] - Error handler
 */

/**
 * Adapter for integrating RemoteConfigService with Feature Flag Context
 */
export class RemoteConfigAdapter {
  /**
   * @param {RemoteConfigAdapterOptions} options - Adapter configuration
   */
  constructor(options) {
    this.updateFlags = options.updateFlags;
    this.errorHandler = options.onError || ((error) => console.error('[RemoteConfigAdapter]', error));
    
    // Create remote config service
    this.service = new RemoteConfigService({
      endpoint: options.endpoint,
      pollInterval: options.pollInterval,
      timeout: options.timeout,
      enablePolling: options.enablePolling,
      headers: options.headers,
      onUpdate: this._handleConfigUpdate.bind(this),
      onError: this._handleError.bind(this)
    });

    /** @type {boolean} */
    this.isInitialized = false;
  }

  /**
   * Initialize and start remote config fetching
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('[RemoteConfigAdapter] Already initialized');
      return;
    }

    try {
      // Load cached config immediately
      const cachedFlags = this.service.getAllFlags();
      if (Object.keys(cachedFlags).length > 0) {
        this.updateFlags(cachedFlags);
        console.log('[RemoteConfigAdapter] Loaded cached flags:', Object.keys(cachedFlags).length);
      }

      // Start polling (includes initial fetch)
      this.service.startPolling();
      
      this.isInitialized = true;
      console.log('[RemoteConfigAdapter] Initialized');

    } catch (error) {
      console.error('[RemoteConfigAdapter] Initialization failed:', error);
      this.errorHandler(error);
      throw error;
    }
  }

  /**
   * Handle config update from remote service
   * @param {Object} config - Updated config
   * @private
   */
  _handleConfigUpdate(config) {
    if (!config || !config.flags) {
      console.warn('[RemoteConfigAdapter] Invalid config update');
      return;
    }

    console.log('[RemoteConfigAdapter] Config updated, version:', config.version);
    this.updateFlags(config.flags);
  }

  /**
   * Handle errors from remote service
   * @param {Error} error - Error object
   * @private
   */
  _handleError(error) {
    console.error('[RemoteConfigAdapter] Service error:', error);
    this.errorHandler(error);
  }

  /**
   * Get current flag value
   * @param {string} flagName - Feature flag name
   * @param {boolean} [defaultValue] - Default value
   * @returns {boolean}
   */
  getFlag(flagName, defaultValue) {
    return this.service.getFlag(flagName, defaultValue);
  }

  /**
   * Get all flags
   * @returns {Object<string, boolean>}
   */
  getAllFlags() {
    return this.service.getAllFlags();
  }

  /**
   * Force refresh from remote
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      await this.service.refresh();
    } catch (error) {
      console.error('[RemoteConfigAdapter] Refresh failed:', error);
      this.errorHandler(error);
    }
  }

  /**
   * Stop polling and clean up
   * @returns {void}
   */
  destroy() {
    this.service.destroy();
    this.isInitialized = false;
    console.log('[RemoteConfigAdapter] Destroyed');
  }
}

/**
 * Create remote config adapter
 * @param {RemoteConfigAdapterOptions} options - Adapter configuration
 * @returns {RemoteConfigAdapter}
 */
export function createRemoteConfigAdapter(options) {
  return new RemoteConfigAdapter(options);
}