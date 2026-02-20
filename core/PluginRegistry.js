/**
 * @fileoverview Plugin Registry - Central registry for discovering and managing plugins
 * @module core/PluginRegistry
 * 
 * Provides a centralized system for plugin lifecycle management including:
 * - Plugin registration and discovery
 * - Dependency resolution
 * - Version compatibility checking
 * - Plugin activation/deactivation
 * - Event-based plugin communication
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#plugin-registry
 */

/**
 * @typedef {Object} PluginMetadata
 * @property {string} id - Unique plugin identifier
 * @property {string} name - Human-readable plugin name
 * @property {string} version - Semver version string
 * @property {string} description - Plugin description
 * @property {string[]} [dependencies] - Array of plugin IDs this plugin depends on
 * @property {Object.<string, string>} [peerDependencies] - Plugin IDs with version constraints
 * @property {string[]} [provides] - Capabilities this plugin provides
 * @property {string[]} [requires] - Capabilities this plugin requires
 * @property {Object} [config] - Default configuration
 */

/**
 * @typedef {Object} PluginInstance
 * @property {PluginMetadata} metadata - Plugin metadata
 * @property {Object} plugin - The actual plugin object
 * @property {string} state - Current state: 'registered' | 'initializing' | 'active' | 'error' | 'disabled'
 * @property {Error} [error] - Error if state is 'error'
 * @property {number} registeredAt - Timestamp of registration
 * @property {number} [activatedAt] - Timestamp of activation
 */

/**
 * Plugin Registry - Manages plugin lifecycle and discovery
 * 
 * Design principles:
 * - Event-driven communication via EventBus
 * - Dependency resolution before activation
 * - Version compatibility checking
 * - Safe activation/deactivation lifecycle
 * - Query-based discovery via TypeNavigator
 * 
 * @class PluginRegistry
 */
export class PluginRegistry {
  /**
   * @param {Object} options
   * @param {import('./EventBus.js').EventBus} options.eventBus - EventBus instance
   * @param {import('./TypeNavigator.js').TypeNavigator} [options.typeNavigator] - TypeNavigator instance
   */
  constructor({ eventBus, typeNavigator = null }) {
    if (!eventBus) {
      throw new Error('PluginRegistry requires an EventBus instance');
    }

    /** @type {Map<string, PluginInstance>} */
    this.plugins = new Map();

    /** @type {Map<string, Set<string>>} */
    this.capabilityProviders = new Map();

    /** @type {import('./EventBus.js').EventBus} */
    this.eventBus = eventBus;

    /** @type {import('./TypeNavigator.js').TypeNavigator|null} */
    this.typeNavigator = typeNavigator;

    /** @type {Map<string, Set<Function>>} */
    this.pluginHooks = new Map();

    this._setupEventHandlers();
  }

  /**
   * Setup EventBus command handlers
   * @private
   */
  _setupEventHandlers() {
    // Register plugin command
    this.eventBus.subscribe('plugin:register', (event) => {
      const { plugin, metadata } = event.payload;
      try {
        this.register(plugin, metadata);
        this.eventBus.publish({
          type: 'plugin:registered',
          payload: { id: metadata.id, metadata },
          source: 'PluginRegistry'
        });
      } catch (error) {
        this.eventBus.publish({
          type: 'plugin:error',
          payload: { id: metadata.id, error: error.message, phase: 'registration' },
          source: 'PluginRegistry'
        });
        console.error(`[PluginRegistry] Registration failed for ${metadata.id}:`, error);
      }
    });

    // Activate plugin command
    this.eventBus.subscribe('plugin:activate', (event) => {
      const { id } = event.payload;
      try {
        this.activate(id);
        this.eventBus.publish({
          type: 'plugin:activated',
          payload: { id },
          source: 'PluginRegistry'
        });
      } catch (error) {
        this.eventBus.publish({
          type: 'plugin:error',
          payload: { id, error: error.message, phase: 'activation' },
          source: 'PluginRegistry'
        });
        console.error(`[PluginRegistry] Activation failed for ${id}:`, error);
      }
    });

    // Deactivate plugin command
    this.eventBus.subscribe('plugin:deactivate', (event) => {
      const { id } = event.payload;
      try {
        this.deactivate(id);
        this.eventBus.publish({
          type: 'plugin:deactivated',
          payload: { id },
          source: 'PluginRegistry'
        });
      } catch (error) {
        this.eventBus.publish({
          type: 'plugin:error',
          payload: { id, error: error.message, phase: 'deactivation' },
          source: 'PluginRegistry'
        });
        console.error(`[PluginRegistry] Deactivation failed for ${id}:`, error);
      }
    });

    // Query plugins command
    this.eventBus.subscribe('plugin:query', (event) => {
      const { query } = event.payload;
      const results = this.query(query);
      this.eventBus.publish({
        type: 'plugin:query:result',
        payload: { query, results },
        source: 'PluginRegistry'
      });
    });
  }

  /**
   * Register a plugin with the registry
   * 
   * @param {Object} plugin - Plugin object with lifecycle methods
   * @param {PluginMetadata} metadata - Plugin metadata
   * @throws {Error} If plugin ID already registered or metadata invalid
   */
  register(plugin, metadata) {
    // Validate metadata
    if (!metadata.id || typeof metadata.id !== 'string') {
      throw new Error('Plugin metadata must include a valid string id');
    }

    if (!metadata.version || !this._isValidSemver(metadata.version)) {
      throw new Error(`Plugin ${metadata.id} must have a valid semver version`);
    }

    if (this.plugins.has(metadata.id)) {
      throw new Error(`Plugin ${metadata.id} is already registered`);
    }

    // Validate plugin interface
    if (typeof plugin.init !== 'function') {
      throw new Error(`Plugin ${metadata.id} must implement init() method`);
    }

    /** @type {PluginInstance} */
    const instance = {
      metadata,
      plugin,
      state: 'registered',
      registeredAt: Date.now()
    };

    this.plugins.set(metadata.id, instance);

    // Register capabilities
    if (metadata.provides) {
      for (const capability of metadata.provides) {
        if (!this.capabilityProviders.has(capability)) {
          this.capabilityProviders.set(capability, new Set());
        }
        this.capabilityProviders.get(capability).add(metadata.id);
      }
    }

    // Register with TypeNavigator if available
    if (this.typeNavigator) {
      this.typeNavigator.registerType('plugin', metadata.id, {
        metadata,
        state: instance.state
      });
    }

    console.log(`[PluginRegistry] Registered plugin: ${metadata.id} v${metadata.version}`);
  }

  /**
   * Activate a registered plugin
   * 
   * @param {string} id - Plugin ID
   * @throws {Error} If plugin not found, already active, or dependencies not met
   */
  activate(id) {
    const instance = this.plugins.get(id);
    if (!instance) {
      throw new Error(`Plugin ${id} not found`);
    }

    if (instance.state === 'active') {
      console.warn(`[PluginRegistry] Plugin ${id} is already active`);
      return;
    }

    if (instance.state === 'error') {
      throw new Error(`Plugin ${id} is in error state: ${instance.error?.message}`);
    }

    // Check dependencies
    if (instance.metadata.dependencies) {
      for (const depId of instance.metadata.dependencies) {
        const dep = this.plugins.get(depId);
        if (!dep) {
          throw new Error(`Plugin ${id} requires missing dependency: ${depId}`);
        }
        if (dep.state !== 'active') {
          throw new Error(`Plugin ${id} requires dependency ${depId} to be active`);
        }
      }
    }

    // Check peer dependencies with version constraints
    if (instance.metadata.peerDependencies) {
      for (const [depId, versionConstraint] of Object.entries(instance.metadata.peerDependencies)) {
        const dep = this.plugins.get(depId);
        if (!dep) {
          throw new Error(`Plugin ${id} requires peer dependency: ${depId}`);
        }
        if (!this._checkVersionConstraint(dep.metadata.version, versionConstraint)) {
          throw new Error(
            `Plugin ${id} requires ${depId} ${versionConstraint}, found ${dep.metadata.version}`
          );
        }
      }
    }

    // Check required capabilities
    if (instance.metadata.requires) {
      for (const capability of instance.metadata.requires) {
        const providers = this.capabilityProviders.get(capability);
        if (!providers || providers.size === 0) {
          throw new Error(`Plugin ${id} requires capability: ${capability}`);
        }
        // Check if at least one provider is active
        const hasActiveProvider = Array.from(providers).some(
          providerId => this.plugins.get(providerId)?.state === 'active'
        );
        if (!hasActiveProvider) {
          throw new Error(`Plugin ${id} requires active provider for capability: ${capability}`);
        }
      }
    }

    // Initialize plugin
    instance.state = 'initializing';

    try {
      const config = instance.metadata.config || {};
      instance.plugin.init({
        eventBus: this.eventBus,
        registry: this,
        config
      });

      instance.state = 'active';
      instance.activatedAt = Date.now();

      // Update TypeNavigator
      if (this.typeNavigator) {
        this.typeNavigator.updateType('plugin', id, { state: 'active' });
      }

      // Trigger hooks
      this._triggerHooks('activated', { id, instance });

      console.log(`[PluginRegistry] Activated plugin: ${id}`);
    } catch (error) {
      instance.state = 'error';
      instance.error = error;
      console.error(`[PluginRegistry] Failed to activate plugin ${id}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate an active plugin
   * 
   * @param {string} id - Plugin ID
   * @throws {Error} If plugin not found or has active dependents
   */
  deactivate(id) {
    const instance = this.plugins.get(id);
    if (!instance) {
      throw new Error(`Plugin ${id} not found`);
    }

    if (instance.state !== 'active') {
      console.warn(`[PluginRegistry] Plugin ${id} is not active`);
      return;
    }

    // Check if any active plugins depend on this one
    for (const [otherId, otherInstance] of this.plugins.entries()) {
      if (otherInstance.state === 'active' && otherInstance.metadata.dependencies?.includes(id)) {
        throw new Error(`Cannot deactivate ${id}: plugin ${otherId} depends on it`);
      }
    }

    // Call cleanup if available
    if (typeof instance.plugin.cleanup === 'function') {
      try {
        instance.plugin.cleanup();
      } catch (error) {
        console.error(`[PluginRegistry] Error during cleanup of ${id}:`, error);
      }
    }

    instance.state = 'disabled';

    // Update TypeNavigator
    if (this.typeNavigator) {
      this.typeNavigator.updateType('plugin', id, { state: 'disabled' });
    }

    // Trigger hooks
    this._triggerHooks('deactivated', { id, instance });

    console.log(`[PluginRegistry] Deactivated plugin: ${id}`);
  }

  /**
   * Query plugins by various criteria
   * 
   * @param {Object} query
   * @param {string} [query.state] - Filter by state
   * @param {string} [query.provides] - Filter by capability
   * @param {string} [query.requires] - Filter by requirement
   * @param {string} [query.id] - Filter by ID (supports wildcards)
   * @returns {PluginInstance[]} Matching plugin instances
   */
  query(query = {}) {
    let results = Array.from(this.plugins.values());

    if (query.state) {
      results = results.filter(instance => instance.state === query.state);
    }

    if (query.provides) {
      results = results.filter(instance => 
        instance.metadata.provides?.includes(query.provides)
      );
    }

    if (query.requires) {
      results = results.filter(instance => 
        instance.metadata.requires?.includes(query.requires)
      );
    }

    if (query.id) {
      const pattern = new RegExp(query.id.replace('*', '.*'));
      results = results.filter(instance => pattern.test(instance.metadata.id));
    }

    return results;
  }

  /**
   * Get plugin by ID
   * 
   * @param {string} id - Plugin ID
   * @returns {PluginInstance|undefined} Plugin instance or undefined
   */
  get(id) {
    return this.plugins.get(id);
  }

  /**
   * Get all plugins providing a specific capability
   * 
   * @param {string} capability - Capability name
   * @returns {PluginInstance[]} Plugins providing the capability
   */
  getProviders(capability) {
    const providerIds = this.capabilityProviders.get(capability);
    if (!providerIds) {
      return [];
    }
    return Array.from(providerIds)
      .map(id => this.plugins.get(id))
      .filter(Boolean);
  }

  /**
   * Register a hook to be called on plugin lifecycle events
   * 
   * @param {string} event - Event name: 'activated' | 'deactivated'
   * @param {Function} callback - Callback function
   */
  onPluginEvent(event, callback) {
    if (!this.pluginHooks.has(event)) {
      this.pluginHooks.set(event, new Set());
    }
    this.pluginHooks.get(event).add(callback);
  }

  /**
   * Trigger registered hooks
   * @private
   */
  _triggerHooks(event, data) {
    const hooks = this.pluginHooks.get(event);
    if (hooks) {
      for (const callback of hooks) {
        try {
          callback(data);
        } catch (error) {
          console.error(`[PluginRegistry] Hook error for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Validate semver format
   * @private
   */
  _isValidSemver(version) {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version);
  }

  /**
   * Check if version satisfies constraint
   * Simple implementation supporting: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0
   * @private
   */
  _checkVersionConstraint(version, constraint) {
    const parseVersion = (v) => v.split('.').map(Number);
    const [major, minor, patch] = parseVersion(version);

    if (constraint.startsWith('^')) {
      const [cMajor, cMinor] = parseVersion(constraint.slice(1));
      return major === cMajor && (minor > cMinor || (minor === cMinor && patch >= 0));
    }

    if (constraint.startsWith('~')) {
      const [cMajor, cMinor, cPatch] = parseVersion(constraint.slice(1));
      return major === cMajor && minor === cMinor && patch >= cPatch;
    }

    if (constraint.startsWith('>=')) {
      const [cMajor, cMinor, cPatch] = parseVersion(constraint.slice(2));
      if (major > cMajor) return true;
      if (major === cMajor && minor > cMinor) return true;
      if (major === cMajor && minor === cMinor && patch >= cPatch) return true;
      return false;
    }

    return version === constraint;
  }

  /**
   * Get registry statistics
   * 
   * @returns {Object} Registry statistics
   */
  getStats() {
    const stats = {
      total: this.plugins.size,
      active: 0,
      disabled: 0,
      error: 0,
      registered: 0,
      capabilities: this.capabilityProviders.size
    };

    for (const instance of this.plugins.values()) {
      stats[instance.state]++;
    }

    return stats;
  }

  /**
   * Export registry state for persistence
   * 
   * @returns {Object} Serializable registry state
   */
  export() {
    return {
      plugins: Array.from(this.plugins.entries()).map(([id, instance]) => ({
        id,
        metadata: instance.metadata,
        state: instance.state,
        registeredAt: instance.registeredAt,
        activatedAt: instance.activatedAt
      })),
      capabilities: Array.from(this.capabilityProviders.entries()).map(([cap, providers]) => ({
        capability: cap,
        providers: Array.from(providers)
      }))
    };
  }
}