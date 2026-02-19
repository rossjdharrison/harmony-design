/**
 * @fileoverview Config Context - Typed configuration access pattern
 * @module contexts/config-context
 * 
 * Provides a context pattern for accessing typed configuration throughout
 * the application. Uses singleton pattern with type validation.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#configuration-context}
 */

import { loadEnvironmentConfig } from '../config/environment-loader.js';

/**
 * @typedef {import('../types/environment-types.js').EnvironmentConfig} EnvironmentConfig
 */

/**
 * ConfigContext - Singleton context for typed configuration access
 * 
 * Provides centralized, typed access to application configuration.
 * Loads configuration from environment and validates types.
 * 
 * @example
 * ```javascript
 * import { ConfigContext } from './contexts/config-context.js';
 * 
 * const context = ConfigContext.getInstance();
 * const apiUrl = context.get('api.baseUrl');
 * const isDebug = context.get('debug.enabled');
 * ```
 */
class ConfigContext {
  /** @type {ConfigContext | null} */
  static #instance = null;

  /** @type {EnvironmentConfig | null} */
  #config = null;

  /** @type {boolean} */
  #initialized = false;

  /** @type {Set<Function>} */
  #subscribers = new Set();

  /**
   * Private constructor - use getInstance()
   * @private
   */
  constructor() {
    if (ConfigContext.#instance) {
      throw new Error('ConfigContext is a singleton. Use ConfigContext.getInstance()');
    }
  }

  /**
   * Get singleton instance of ConfigContext
   * @returns {ConfigContext}
   */
  static getInstance() {
    if (!ConfigContext.#instance) {
      ConfigContext.#instance = new ConfigContext();
    }
    return ConfigContext.#instance;
  }

  /**
   * Initialize context with configuration
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.#initialized) {
      console.warn('ConfigContext already initialized');
      return;
    }

    try {
      this.#config = await loadEnvironmentConfig();
      this.#initialized = true;
      this.#notifySubscribers();
      console.log('[ConfigContext] Initialized successfully');
    } catch (error) {
      console.error('[ConfigContext] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get configuration value by path
   * @param {string} path - Dot-separated path (e.g., 'api.baseUrl')
   * @returns {*} Configuration value
   * @throws {Error} If context not initialized or path not found
   */
  get(path) {
    if (!this.#initialized) {
      throw new Error('ConfigContext not initialized. Call initialize() first.');
    }

    const keys = path.split('.');
    let value = this.#config;

    for (const key of keys) {
      if (value === null || value === undefined) {
        throw new Error(`Config path not found: ${path}`);
      }
      value = value[key];
    }

    if (value === undefined) {
      throw new Error(`Config path not found: ${path}`);
    }

    return value;
  }

  /**
   * Get configuration value with default fallback
   * @param {string} path - Dot-separated path
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} Configuration value or default
   */
  getOrDefault(path, defaultValue) {
    try {
      return this.get(path);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Get entire configuration object (read-only)
   * @returns {Readonly<EnvironmentConfig>}
   * @throws {Error} If context not initialized
   */
  getAll() {
    if (!this.#initialized) {
      throw new Error('ConfigContext not initialized. Call initialize() first.');
    }
    return Object.freeze({ ...this.#config });
  }

  /**
   * Check if context is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.#initialized;
  }

  /**
   * Subscribe to configuration changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.#subscribers.add(callback);
    return () => this.#subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of configuration changes
   * @private
   */
  #notifySubscribers() {
    this.#subscribers.forEach(callback => {
      try {
        callback(this.#config);
      } catch (error) {
        console.error('[ConfigContext] Subscriber error:', error);
      }
    });
  }

  /**
   * Reset context (for testing only)
   * @private
   */
  static _resetForTesting() {
    if (ConfigContext.#instance) {
      ConfigContext.#instance.#config = null;
      ConfigContext.#instance.#initialized = false;
      ConfigContext.#instance.#subscribers.clear();
    }
    ConfigContext.#instance = null;
  }
}

/**
 * Get singleton instance (convenience export)
 * @returns {ConfigContext}
 */
export function getConfigContext() {
  return ConfigContext.getInstance();
}

/**
 * Hook-like helper for accessing config in components
 * @param {string} path - Config path
 * @param {*} [defaultValue] - Optional default value
 * @returns {*} Configuration value
 */
export function useConfig(path, defaultValue) {
  const context = ConfigContext.getInstance();
  
  if (!context.isInitialized()) {
    console.warn('[useConfig] Context not initialized, returning default');
    return defaultValue;
  }

  return defaultValue !== undefined 
    ? context.getOrDefault(path, defaultValue)
    : context.get(path);
}

export { ConfigContext };