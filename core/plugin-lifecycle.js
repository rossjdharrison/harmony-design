/**
 * @fileoverview Plugin Lifecycle Management System
 * Provides lifecycle hooks for plugins: onLoad, onUnload, onActivate, onDeactivate
 * 
 * @module core/plugin-lifecycle
 * @see DESIGN_SYSTEM.md#plugin-lifecycle-hooks
 */

import { EventBus } from './event-bus.js';

/**
 * @typedef {Object} PluginLifecycleHooks
 * @property {Function} [onLoad] - Called when plugin is first loaded into memory
 * @property {Function} [onUnload] - Called when plugin is removed from memory
 * @property {Function} [onActivate] - Called when plugin becomes active/enabled
 * @property {Function} [onDeactivate] - Called when plugin becomes inactive/disabled
 */

/**
 * @typedef {Object} PluginLifecycleState
 * @property {'unloaded'|'loaded'|'active'|'inactive'|'error'} status - Current lifecycle status
 * @property {number} loadedAt - Timestamp when plugin was loaded
 * @property {number} [activatedAt] - Timestamp when plugin was activated
 * @property {number} [deactivatedAt] - Timestamp when plugin was deactivated
 * @property {Error} [error] - Error if lifecycle transition failed
 */

/**
 * Plugin Lifecycle Manager
 * Manages the lifecycle state transitions and hook execution for plugins
 */
export class PluginLifecycleManager {
  constructor() {
    /** @type {Map<string, PluginLifecycleState>} */
    this.lifecycleStates = new Map();
    
    /** @type {Map<string, PluginLifecycleHooks>} */
    this.pluginHooks = new Map();
    
    /** @type {EventBus} */
    this.eventBus = EventBus.getInstance();
    
    this._setupEventListeners();
  }

  /**
   * Setup event bus listeners for lifecycle management
   * @private
   */
  _setupEventListeners() {
    // Listen for plugin registration events
    this.eventBus.subscribe('plugin:registered', (event) => {
      this._initializePluginLifecycle(event.detail.pluginId);
    });
    
    // Listen for plugin unregistration events
    this.eventBus.subscribe('plugin:unregistered', (event) => {
      this._cleanupPluginLifecycle(event.detail.pluginId);
    });
  }

  /**
   * Register lifecycle hooks for a plugin
   * @param {string} pluginId - Unique plugin identifier
   * @param {PluginLifecycleHooks} hooks - Lifecycle hook functions
   * @throws {Error} If hooks are invalid
   */
  registerHooks(pluginId, hooks) {
    if (!pluginId || typeof pluginId !== 'string') {
      throw new Error('Plugin ID must be a non-empty string');
    }

    // Validate hook functions
    const validHooks = ['onLoad', 'onUnload', 'onActivate', 'onDeactivate'];
    for (const [key, value] of Object.entries(hooks)) {
      if (!validHooks.includes(key)) {
        console.warn(`Unknown lifecycle hook: ${key} for plugin ${pluginId}`);
        continue;
      }
      if (typeof value !== 'function') {
        throw new Error(`Lifecycle hook ${key} must be a function`);
      }
    }

    this.pluginHooks.set(pluginId, hooks);
    
    console.log(`[PluginLifecycle] Registered hooks for plugin: ${pluginId}`, 
      Object.keys(hooks));
  }

  /**
   * Initialize lifecycle state for a new plugin
   * @private
   * @param {string} pluginId - Plugin identifier
   */
  _initializePluginLifecycle(pluginId) {
    this.lifecycleStates.set(pluginId, {
      status: 'unloaded',
      loadedAt: 0
    });
  }

  /**
   * Clean up lifecycle state for removed plugin
   * @private
   * @param {string} pluginId - Plugin identifier
   */
  _cleanupPluginLifecycle(pluginId) {
    this.lifecycleStates.delete(pluginId);
    this.pluginHooks.delete(pluginId);
  }

  /**
   * Load a plugin (transition: unloaded → loaded)
   * @param {string} pluginId - Plugin identifier
   * @param {Object} [context] - Context to pass to onLoad hook
   * @returns {Promise<void>}
   */
  async load(pluginId, context = {}) {
    const state = this.lifecycleStates.get(pluginId);
    if (!state) {
      throw new Error(`Plugin ${pluginId} not registered`);
    }

    if (state.status !== 'unloaded') {
      console.warn(`[PluginLifecycle] Plugin ${pluginId} already loaded`);
      return;
    }

    const startTime = performance.now();
    
    try {
      // Execute onLoad hook if present
      const hooks = this.pluginHooks.get(pluginId);
      if (hooks?.onLoad) {
        await this._executeHook(pluginId, 'onLoad', hooks.onLoad, context);
      }

      // Update state
      state.status = 'loaded';
      state.loadedAt = Date.now();
      
      const duration = performance.now() - startTime;
      
      // Publish event
      this.eventBus.publish('plugin:loaded', {
        pluginId,
        loadTime: duration,
        timestamp: state.loadedAt
      });

      console.log(`[PluginLifecycle] Plugin ${pluginId} loaded in ${duration.toFixed(2)}ms`);
      
      // Check performance budget (200ms max load time)
      if (duration > 200) {
        console.warn(`[PluginLifecycle] Plugin ${pluginId} exceeded load budget: ${duration.toFixed(2)}ms > 200ms`);
      }
      
    } catch (error) {
      state.status = 'error';
      state.error = error;
      
      this.eventBus.publish('plugin:load-error', {
        pluginId,
        error: error.message
      });
      
      console.error(`[PluginLifecycle] Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Unload a plugin (transition: loaded/inactive → unloaded)
   * @param {string} pluginId - Plugin identifier
   * @param {Object} [context] - Context to pass to onUnload hook
   * @returns {Promise<void>}
   */
  async unload(pluginId, context = {}) {
    const state = this.lifecycleStates.get(pluginId);
    if (!state) {
      throw new Error(`Plugin ${pluginId} not registered`);
    }

    if (state.status === 'unloaded') {
      console.warn(`[PluginLifecycle] Plugin ${pluginId} already unloaded`);
      return;
    }

    // Deactivate first if active
    if (state.status === 'active') {
      await this.deactivate(pluginId, context);
    }

    try {
      // Execute onUnload hook if present
      const hooks = this.pluginHooks.get(pluginId);
      if (hooks?.onUnload) {
        await this._executeHook(pluginId, 'onUnload', hooks.onUnload, context);
      }

      // Update state
      const previousStatus = state.status;
      state.status = 'unloaded';
      state.loadedAt = 0;
      delete state.activatedAt;
      delete state.deactivatedAt;
      delete state.error;
      
      // Publish event
      this.eventBus.publish('plugin:unloaded', {
        pluginId,
        previousStatus,
        timestamp: Date.now()
      });

      console.log(`[PluginLifecycle] Plugin ${pluginId} unloaded`);
      
    } catch (error) {
      state.status = 'error';
      state.error = error;
      
      this.eventBus.publish('plugin:unload-error', {
        pluginId,
        error: error.message
      });
      
      console.error(`[PluginLifecycle] Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Activate a plugin (transition: loaded/inactive → active)
   * @param {string} pluginId - Plugin identifier
   * @param {Object} [context] - Context to pass to onActivate hook
   * @returns {Promise<void>}
   */
  async activate(pluginId, context = {}) {
    const state = this.lifecycleStates.get(pluginId);
    if (!state) {
      throw new Error(`Plugin ${pluginId} not registered`);
    }

    if (state.status === 'unloaded') {
      throw new Error(`Plugin ${pluginId} must be loaded before activation`);
    }

    if (state.status === 'active') {
      console.warn(`[PluginLifecycle] Plugin ${pluginId} already active`);
      return;
    }

    try {
      // Execute onActivate hook if present
      const hooks = this.pluginHooks.get(pluginId);
      if (hooks?.onActivate) {
        await this._executeHook(pluginId, 'onActivate', hooks.onActivate, context);
      }

      // Update state
      state.status = 'active';
      state.activatedAt = Date.now();
      
      // Publish event
      this.eventBus.publish('plugin:activated', {
        pluginId,
        timestamp: state.activatedAt
      });

      console.log(`[PluginLifecycle] Plugin ${pluginId} activated`);
      
    } catch (error) {
      state.status = 'error';
      state.error = error;
      
      this.eventBus.publish('plugin:activate-error', {
        pluginId,
        error: error.message
      });
      
      console.error(`[PluginLifecycle] Failed to activate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate a plugin (transition: active → inactive)
   * @param {string} pluginId - Plugin identifier
   * @param {Object} [context] - Context to pass to onDeactivate hook
   * @returns {Promise<void>}
   */
  async deactivate(pluginId, context = {}) {
    const state = this.lifecycleStates.get(pluginId);
    if (!state) {
      throw new Error(`Plugin ${pluginId} not registered`);
    }

    if (state.status !== 'active') {
      console.warn(`[PluginLifecycle] Plugin ${pluginId} not active`);
      return;
    }

    try {
      // Execute onDeactivate hook if present
      const hooks = this.pluginHooks.get(pluginId);
      if (hooks?.onDeactivate) {
        await this._executeHook(pluginId, 'onDeactivate', hooks.onDeactivate, context);
      }

      // Update state
      state.status = 'inactive';
      state.deactivatedAt = Date.now();
      
      // Publish event
      this.eventBus.publish('plugin:deactivated', {
        pluginId,
        timestamp: state.deactivatedAt
      });

      console.log(`[PluginLifecycle] Plugin ${pluginId} deactivated`);
      
    } catch (error) {
      state.status = 'error';
      state.error = error;
      
      this.eventBus.publish('plugin:deactivate-error', {
        pluginId,
        error: error.message
      });
      
      console.error(`[PluginLifecycle] Failed to deactivate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a lifecycle hook with error handling and timeout
   * @private
   * @param {string} pluginId - Plugin identifier
   * @param {string} hookName - Name of the hook being executed
   * @param {Function} hookFn - Hook function to execute
   * @param {Object} context - Context to pass to hook
   * @returns {Promise<void>}
   */
  async _executeHook(pluginId, hookName, hookFn, context) {
    const timeout = 5000; // 5 second timeout for lifecycle hooks
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Hook ${hookName} timed out after ${timeout}ms`)), timeout);
    });

    try {
      await Promise.race([
        hookFn.call(null, context),
        timeoutPromise
      ]);
    } catch (error) {
      console.error(`[PluginLifecycle] Hook ${hookName} failed for plugin ${pluginId}:`, error);
      throw new Error(`Lifecycle hook ${hookName} failed: ${error.message}`);
    }
  }

  /**
   * Get current lifecycle state for a plugin
   * @param {string} pluginId - Plugin identifier
   * @returns {PluginLifecycleState|null}
   */
  getState(pluginId) {
    return this.lifecycleStates.get(pluginId) || null;
  }

  /**
   * Get all plugins in a specific lifecycle state
   * @param {'unloaded'|'loaded'|'active'|'inactive'|'error'} status - Status to filter by
   * @returns {string[]} Array of plugin IDs
   */
  getPluginsByStatus(status) {
    const plugins = [];
    for (const [pluginId, state] of this.lifecycleStates.entries()) {
      if (state.status === status) {
        plugins.push(pluginId);
      }
    }
    return plugins;
  }

  /**
   * Get lifecycle statistics
   * @returns {Object} Statistics about plugin lifecycle states
   */
  getStatistics() {
    const stats = {
      total: this.lifecycleStates.size,
      unloaded: 0,
      loaded: 0,
      active: 0,
      inactive: 0,
      error: 0
    };

    for (const state of this.lifecycleStates.values()) {
      stats[state.status]++;
    }

    return stats;
  }

  /**
   * Reset lifecycle manager (for testing)
   */
  reset() {
    this.lifecycleStates.clear();
    this.pluginHooks.clear();
  }
}

// Singleton instance
let lifecycleManagerInstance = null;

/**
 * Get singleton instance of PluginLifecycleManager
 * @returns {PluginLifecycleManager}
 */
export function getLifecycleManager() {
  if (!lifecycleManagerInstance) {
    lifecycleManagerInstance = new PluginLifecycleManager();
  }
  return lifecycleManagerInstance;
}