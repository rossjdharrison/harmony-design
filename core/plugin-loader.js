/**
 * @fileoverview Plugin Loader - Dynamic plugin loading and instantiation
 * @module core/plugin-loader
 * 
 * Handles loading, validation, and instantiation of plugins.
 * Supports ES modules and validates against Plugin API contract.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#plugin-loader}
 */

import { PluginAPI, PLUGIN_API_VERSION } from './plugin-api.js';

/**
 * Plugin loader manages plugin lifecycle
 */
export class PluginLoader {
  constructor() {
    /** @type {Map<string, Plugin>} */
    this.loadedPlugins = new Map();
    
    /** @type {Map<string, PluginMetadata>} */
    this.pluginMetadata = new Map();
    
    /** @type {Set<string>} */
    this.activePlugins = new Set();
  }

  /**
   * Load plugin from URL
   * @param {string} url - Plugin module URL
   * @param {Object} contextOptions - Context creation options
   * @returns {Promise<Plugin>} Loaded plugin instance
   */
  async loadFromURL(url, contextOptions) {
    try {
      // Dynamic import of plugin module
      const module = await import(url);
      
      // Validate module exports
      if (!module.default) {
        throw new Error('Plugin module must have default export');
      }

      const PluginClass = module.default;
      
      // Validate metadata
      if (!PluginClass.metadata) {
        throw new Error('Plugin class must have static metadata property');
      }

      PluginAPI.validateMetadata(PluginClass.metadata);
      
      // Check API compatibility
      if (!PluginAPI.isCompatible(PluginClass.metadata.apiVersion, PLUGIN_API_VERSION)) {
        throw new Error(
          `Plugin requires API version ${PluginClass.metadata.apiVersion}, ` +
          `but current version is ${PLUGIN_API_VERSION}`
        );
      }

      // Check for duplicate plugin ID
      if (this.loadedPlugins.has(PluginClass.metadata.id)) {
        throw new Error(`Plugin already loaded: ${PluginClass.metadata.id}`);
      }

      // Create plugin context
      const context = PluginAPI.createContext({
        ...contextOptions,
        pluginId: PluginClass.metadata.id
      });

      // Instantiate plugin
      const plugin = new PluginClass(context);
      
      // Initialize plugin
      await plugin.initialize();

      // Store plugin
      this.loadedPlugins.set(PluginClass.metadata.id, plugin);
      this.pluginMetadata.set(PluginClass.metadata.id, PluginClass.metadata);

      context.logger.info(`Plugin loaded: ${PluginClass.metadata.name} v${PluginClass.metadata.version}`);

      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Load plugin from inline definition
   * @param {typeof Plugin} PluginClass - Plugin class
   * @param {Object} contextOptions - Context creation options
   * @returns {Promise<Plugin>} Loaded plugin instance
   */
  async loadPlugin(PluginClass, contextOptions) {
    try {
      // Validate metadata
      if (!PluginClass.metadata) {
        throw new Error('Plugin class must have static metadata property');
      }

      PluginAPI.validateMetadata(PluginClass.metadata);
      
      // Check API compatibility
      if (!PluginAPI.isCompatible(PluginClass.metadata.apiVersion, PLUGIN_API_VERSION)) {
        throw new Error(
          `Plugin requires API version ${PluginClass.metadata.apiVersion}, ` +
          `but current version is ${PLUGIN_API_VERSION}`
        );
      }

      // Check for duplicate plugin ID
      if (this.loadedPlugins.has(PluginClass.metadata.id)) {
        throw new Error(`Plugin already loaded: ${PluginClass.metadata.id}`);
      }

      // Create plugin context
      const context = PluginAPI.createContext({
        ...contextOptions,
        pluginId: PluginClass.metadata.id
      });

      // Instantiate plugin
      const plugin = new PluginClass(context);
      
      // Initialize plugin
      await plugin.initialize();

      // Store plugin
      this.loadedPlugins.set(PluginClass.metadata.id, plugin);
      this.pluginMetadata.set(PluginClass.metadata.id, PluginClass.metadata);

      context.logger.info(`Plugin loaded: ${PluginClass.metadata.name} v${PluginClass.metadata.version}`);

      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${PluginClass.metadata?.id}:`, error);
      throw error;
    }
  }

  /**
   * Activate plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<void>}
   */
  async activatePlugin(pluginId) {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    await plugin.activate();
    this.activePlugins.add(pluginId);
  }

  /**
   * Deactivate plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<void>}
   */
  async deactivatePlugin(pluginId) {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    await plugin.deactivate();
    this.activePlugins.delete(pluginId);
  }

  /**
   * Unload plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<void>}
   */
  async unloadPlugin(pluginId) {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Deactivate if active
    if (this.activePlugins.has(pluginId)) {
      await this.deactivatePlugin(pluginId);
    }

    // Destroy plugin
    await plugin.destroy();

    // Remove from registry
    this.loadedPlugins.delete(pluginId);
    this.pluginMetadata.delete(pluginId);
  }

  /**
   * Get plugin by ID
   * @param {string} pluginId - Plugin ID
   * @returns {Plugin|undefined} Plugin instance
   */
  getPlugin(pluginId) {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * Get plugin metadata
   * @param {string} pluginId - Plugin ID
   * @returns {PluginMetadata|undefined} Plugin metadata
   */
  getMetadata(pluginId) {
    return this.pluginMetadata.get(pluginId);
  }

  /**
   * List all loaded plugins
   * @returns {PluginMetadata[]} Array of plugin metadata
   */
  listPlugins() {
    return Array.from(this.pluginMetadata.values());
  }

  /**
   * List active plugins
   * @returns {string[]} Array of active plugin IDs
   */
  listActivePlugins() {
    return Array.from(this.activePlugins);
  }

  /**
   * Check if plugin is loaded
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} True if loaded
   */
  isLoaded(pluginId) {
    return this.loadedPlugins.has(pluginId);
  }

  /**
   * Check if plugin is active
   * @param {string} pluginId - Plugin ID
   * @returns {boolean} True if active
   */
  isActive(pluginId) {
    return this.activePlugins.has(pluginId);
  }

  /**
   * Reload plugin (unload and load again)
   * @param {string} pluginId - Plugin ID
   * @param {string} url - Plugin module URL
   * @param {Object} contextOptions - Context creation options
   * @returns {Promise<Plugin>} Reloaded plugin instance
   */
  async reloadPlugin(pluginId, url, contextOptions) {
    const wasActive = this.isActive(pluginId);
    
    // Unload existing plugin
    await this.unloadPlugin(pluginId);
    
    // Load new version
    const plugin = await this.loadFromURL(url, contextOptions);
    
    // Reactivate if was active
    if (wasActive) {
      await this.activatePlugin(pluginId);
    }
    
    return plugin;
  }
}

/**
 * Global plugin loader instance
 */
export const pluginLoader = new PluginLoader();