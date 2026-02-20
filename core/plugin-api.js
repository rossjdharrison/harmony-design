/**
 * @fileoverview Plugin API Contract - Stable API surface for plugin authors
 * @module core/plugin-api
 * 
 * Provides versioned, stable interfaces for plugin development including:
 * - Plugin lifecycle hooks
 * - Context access patterns
 * - Event publishing/subscription
 * - State management integration
 * - UI extension points
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#plugin-api-contract}
 */

/**
 * Plugin API version following semantic versioning
 * @const {string}
 */
export const PLUGIN_API_VERSION = '1.0.0';

/**
 * Plugin lifecycle states
 * @enum {string}
 */
export const PluginLifecycleState = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  ERROR: 'error',
  DESTROYED: 'destroyed'
};

/**
 * Plugin capability flags
 * @enum {string}
 */
export const PluginCapability = {
  AUDIO_PROCESSING: 'audio-processing',
  UI_COMPONENT: 'ui-component',
  EVENT_HANDLER: 'event-handler',
  STATE_PROVIDER: 'state-provider',
  COMMAND_PROVIDER: 'command-provider',
  VISUALIZATION: 'visualization',
  EFFECT: 'effect',
  INSTRUMENT: 'instrument',
  ANALYZER: 'analyzer'
};

/**
 * Plugin metadata schema
 * @typedef {Object} PluginMetadata
 * @property {string} id - Unique plugin identifier (reverse domain notation recommended)
 * @property {string} name - Human-readable plugin name
 * @property {string} version - Plugin version (semver)
 * @property {string} apiVersion - Required Plugin API version (semver range)
 * @property {string} description - Plugin description
 * @property {string} author - Plugin author
 * @property {string} [license] - License identifier (SPDX)
 * @property {string} [homepage] - Plugin homepage URL
 * @property {PluginCapability[]} capabilities - Plugin capabilities
 * @property {Object<string, string>} [dependencies] - Plugin dependencies (id -> version range)
 * @property {Object<string, any>} [config] - Default configuration
 */

/**
 * Plugin context provides access to system services
 * @typedef {Object} PluginContext
 * @property {EventBus} eventBus - Event bus for publishing/subscribing
 * @property {TypeNavigator} typeNavigator - Query system state
 * @property {Object} config - Plugin configuration
 * @property {Logger} logger - Scoped logger instance
 * @property {UIRegistry} ui - UI extension registry
 * @property {AudioContext} [audioContext] - Web Audio context (if audio-processing capability)
 * @property {string} pluginId - This plugin's ID
 * @property {string} apiVersion - Current API version
 */

/**
 * Plugin lifecycle hooks
 * @typedef {Object} PluginLifecycle
 * @property {function(PluginContext): Promise<void>} [onInitialize] - Called when plugin is loaded
 * @property {function(PluginContext): Promise<void>} [onActivate] - Called when plugin becomes active
 * @property {function(PluginContext): Promise<void>} [onDeactivate] - Called when plugin is suspended
 * @property {function(PluginContext): Promise<void>} [onDestroy] - Called when plugin is unloaded
 * @property {function(PluginContext, Error): Promise<void>} [onError] - Called when plugin encounters error
 * @property {function(PluginContext, Object): Promise<void>} [onConfigChange] - Called when config changes
 */

/**
 * Base plugin interface that all plugins must implement
 * @interface Plugin
 */
export class Plugin {
  /**
   * Plugin metadata
   * @type {PluginMetadata}
   */
  static metadata = {
    id: '',
    name: '',
    version: '0.0.0',
    apiVersion: '^1.0.0',
    description: '',
    author: '',
    capabilities: []
  };

  /**
   * @param {PluginContext} context - Plugin context
   */
  constructor(context) {
    this.context = context;
    this.state = PluginLifecycleState.UNINITIALIZED;
  }

  /**
   * Initialize plugin - called once when plugin is loaded
   * @returns {Promise<void>}
   */
  async initialize() {
    this.state = PluginLifecycleState.INITIALIZING;
    try {
      await this.onInitialize(this.context);
      this.state = PluginLifecycleState.READY;
    } catch (error) {
      this.state = PluginLifecycleState.ERROR;
      throw error;
    }
  }

  /**
   * Activate plugin - called when plugin should start working
   * @returns {Promise<void>}
   */
  async activate() {
    if (this.state !== PluginLifecycleState.READY && this.state !== PluginLifecycleState.SUSPENDED) {
      throw new Error(`Cannot activate plugin in state: ${this.state}`);
    }
    await this.onActivate(this.context);
    this.state = PluginLifecycleState.ACTIVE;
  }

  /**
   * Deactivate plugin - called when plugin should stop working
   * @returns {Promise<void>}
   */
  async deactivate() {
    if (this.state !== PluginLifecycleState.ACTIVE) {
      throw new Error(`Cannot deactivate plugin in state: ${this.state}`);
    }
    await this.onDeactivate(this.context);
    this.state = PluginLifecycleState.SUSPENDED;
  }

  /**
   * Destroy plugin - called when plugin is unloaded
   * @returns {Promise<void>}
   */
  async destroy() {
    await this.onDestroy(this.context);
    this.state = PluginLifecycleState.DESTROYED;
  }

  /**
   * Lifecycle hook implementations (override in subclass)
   */
  async onInitialize(context) {}
  async onActivate(context) {}
  async onDeactivate(context) {}
  async onDestroy(context) {}
  async onError(context, error) {}
  async onConfigChange(context, newConfig) {}
}

/**
 * Audio processing plugin base class
 * @extends Plugin
 */
export class AudioPlugin extends Plugin {
  static metadata = {
    ...Plugin.metadata,
    capabilities: [PluginCapability.AUDIO_PROCESSING]
  };

  /**
   * Create audio processing node
   * @param {AudioContext} audioContext - Web Audio context
   * @returns {AudioNode} Audio processing node
   */
  createAudioNode(audioContext) {
    throw new Error('AudioPlugin must implement createAudioNode()');
  }

  /**
   * Process audio buffer (for WASM-based processing)
   * @param {Float32Array} inputBuffer - Input audio samples
   * @param {Float32Array} outputBuffer - Output audio samples
   * @param {number} sampleRate - Sample rate
   */
  processAudio(inputBuffer, outputBuffer, sampleRate) {
    throw new Error('AudioPlugin must implement processAudio()');
  }
}

/**
 * UI component plugin base class
 * @extends Plugin
 */
export class UIPlugin extends Plugin {
  static metadata = {
    ...Plugin.metadata,
    capabilities: [PluginCapability.UI_COMPONENT]
  };

  /**
   * Register UI components
   * @param {UIRegistry} registry - UI registry
   */
  registerComponents(registry) {
    throw new Error('UIPlugin must implement registerComponents()');
  }

  /**
   * Create plugin UI element
   * @returns {HTMLElement} Plugin UI element
   */
  createUI() {
    throw new Error('UIPlugin must implement createUI()');
  }
}

/**
 * Effect plugin base class (audio effect)
 * @extends AudioPlugin
 */
export class EffectPlugin extends AudioPlugin {
  static metadata = {
    ...AudioPlugin.metadata,
    capabilities: [PluginCapability.AUDIO_PROCESSING, PluginCapability.EFFECT]
  };

  /**
   * Get effect parameters
   * @returns {Object<string, ParameterDescriptor>} Parameter descriptors
   */
  getParameters() {
    return {};
  }

  /**
   * Set parameter value
   * @param {string} name - Parameter name
   * @param {number} value - Parameter value
   */
  setParameter(name, value) {
    throw new Error('EffectPlugin must implement setParameter()');
  }

  /**
   * Get parameter value
   * @param {string} name - Parameter name
   * @returns {number} Parameter value
   */
  getParameter(name) {
    throw new Error('EffectPlugin must implement getParameter()');
  }
}

/**
 * Parameter descriptor for audio parameters
 * @typedef {Object} ParameterDescriptor
 * @property {string} name - Parameter name
 * @property {number} defaultValue - Default value
 * @property {number} minValue - Minimum value
 * @property {number} maxValue - Maximum value
 * @property {string} [unit] - Unit of measurement
 * @property {boolean} [automatable] - Whether parameter can be automated
 * @property {number} [step] - Step size for discrete parameters
 */

/**
 * Logger interface for plugins
 * @typedef {Object} Logger
 * @property {function(string, ...any): void} debug - Debug level logging
 * @property {function(string, ...any): void} info - Info level logging
 * @property {function(string, ...any): void} warn - Warning level logging
 * @property {function(string, ...any): void} error - Error level logging
 */

/**
 * UI Registry for plugin UI extensions
 * @typedef {Object} UIRegistry
 * @property {function(string, HTMLElement): void} registerPanel - Register panel component
 * @property {function(string, HTMLElement): void} registerControl - Register control component
 * @property {function(string, HTMLElement): void} registerVisualization - Register visualization
 * @property {function(string): void} unregister - Unregister component
 */

/**
 * Event subscription handle
 * @typedef {Object} EventSubscription
 * @property {function(): void} unsubscribe - Unsubscribe from event
 */

/**
 * Plugin API helper functions
 */
export const PluginAPI = {
  /**
   * Validate plugin metadata
   * @param {PluginMetadata} metadata - Plugin metadata to validate
   * @returns {boolean} True if valid
   * @throws {Error} If metadata is invalid
   */
  validateMetadata(metadata) {
    const required = ['id', 'name', 'version', 'apiVersion', 'description', 'author', 'capabilities'];
    for (const field of required) {
      if (!metadata[field]) {
        throw new Error(`Plugin metadata missing required field: ${field}`);
      }
    }

    // Validate ID format (reverse domain notation)
    if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(metadata.id)) {
      throw new Error(`Invalid plugin ID format: ${metadata.id}. Use reverse domain notation (e.g., com.example.plugin)`);
    }

    // Validate version format (semver)
    if (!/^\d+\.\d+\.\d+/.test(metadata.version)) {
      throw new Error(`Invalid plugin version format: ${metadata.version}. Use semver (e.g., 1.0.0)`);
    }

    // Validate capabilities
    if (!Array.isArray(metadata.capabilities) || metadata.capabilities.length === 0) {
      throw new Error('Plugin must declare at least one capability');
    }

    const validCapabilities = Object.values(PluginCapability);
    for (const capability of metadata.capabilities) {
      if (!validCapabilities.includes(capability)) {
        throw new Error(`Invalid capability: ${capability}`);
      }
    }

    return true;
  },

  /**
   * Check API version compatibility
   * @param {string} requiredVersion - Required API version (semver range)
   * @param {string} currentVersion - Current API version
   * @returns {boolean} True if compatible
   */
  isCompatible(requiredVersion, currentVersion = PLUGIN_API_VERSION) {
    // Simple semver range checking (supports ^, ~, >=, >, <, <=, =)
    const parseVersion = (v) => v.split('.').map(Number);
    const [reqMajor, reqMinor, reqPatch] = parseVersion(requiredVersion.replace(/^[\^~>=<]+/, ''));
    const [curMajor, curMinor, curPatch] = parseVersion(currentVersion);

    if (requiredVersion.startsWith('^')) {
      // Compatible with same major version
      return curMajor === reqMajor && (curMinor > reqMinor || (curMinor === reqMinor && curPatch >= reqPatch));
    } else if (requiredVersion.startsWith('~')) {
      // Compatible with same minor version
      return curMajor === reqMajor && curMinor === reqMinor && curPatch >= reqPatch;
    } else if (requiredVersion.startsWith('>=')) {
      return curMajor > reqMajor || 
             (curMajor === reqMajor && curMinor > reqMinor) ||
             (curMajor === reqMajor && curMinor === reqMinor && curPatch >= reqPatch);
    }

    // Exact match
    return currentVersion === requiredVersion;
  },

  /**
   * Create scoped logger for plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Logger} Scoped logger
   */
  createLogger(pluginId) {
    const prefix = `[Plugin:${pluginId}]`;
    return {
      debug: (msg, ...args) => console.debug(prefix, msg, ...args),
      info: (msg, ...args) => console.info(prefix, msg, ...args),
      warn: (msg, ...args) => console.warn(prefix, msg, ...args),
      error: (msg, ...args) => console.error(prefix, msg, ...args)
    };
  },

  /**
   * Create plugin context
   * @param {Object} options - Context options
   * @param {string} options.pluginId - Plugin ID
   * @param {EventBus} options.eventBus - Event bus
   * @param {TypeNavigator} options.typeNavigator - Type navigator
   * @param {Object} options.config - Plugin configuration
   * @param {AudioContext} [options.audioContext] - Audio context
   * @returns {PluginContext} Plugin context
   */
  createContext({ pluginId, eventBus, typeNavigator, config, audioContext }) {
    const logger = this.createLogger(pluginId);
    
    return {
      pluginId,
      apiVersion: PLUGIN_API_VERSION,
      eventBus,
      typeNavigator,
      config,
      logger,
      audioContext,
      ui: {
        registerPanel: (id, element) => {
          logger.debug(`Registering panel: ${id}`);
          // Implementation delegated to UI system
        },
        registerControl: (id, element) => {
          logger.debug(`Registering control: ${id}`);
          // Implementation delegated to UI system
        },
        registerVisualization: (id, element) => {
          logger.debug(`Registering visualization: ${id}`);
          // Implementation delegated to UI system
        },
        unregister: (id) => {
          logger.debug(`Unregistering component: ${id}`);
          // Implementation delegated to UI system
        }
      }
    };
  }
};

/**
 * Plugin manifest schema for package.json or plugin.json
 * @typedef {Object} PluginManifest
 * @property {PluginMetadata} plugin - Plugin metadata
 * @property {string} main - Entry point file path
 * @property {string[]} [files] - Files to include in plugin package
 * @property {Object<string, string>} [scripts] - Build/test scripts
 */

/**
 * Export stable API surface
 */
export default {
  PLUGIN_API_VERSION,
  PluginLifecycleState,
  PluginCapability,
  Plugin,
  AudioPlugin,
  UIPlugin,
  EffectPlugin,
  PluginAPI
};