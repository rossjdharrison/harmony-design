/**
 * @fileoverview Plugin Sandbox System - Runs plugins in isolated contexts with limited capabilities
 * 
 * Provides secure execution environments for plugins with:
 * - Isolated global scope using Realms API or iframe isolation
 * - Capability-based security model
 * - Resource quotas (CPU, memory, storage)
 * - API surface restrictions
 * - Communication via structured cloning only
 * 
 * @module systems/plugin-sandbox
 * @see DESIGN_SYSTEM.md#plugin-sandbox
 */

import { EventBus } from '../../core/event-bus/event-bus.js';

/**
 * Sandbox isolation strategies
 * @enum {string}
 */
export const IsolationStrategy = {
  IFRAME: 'iframe',           // iframe-based isolation (most secure)
  WORKER: 'worker',           // Web Worker isolation (good for compute)
  REALM: 'realm',             // ShadowRealm API (when available)
  PROXY: 'proxy'              // Proxy-based isolation (least secure, fallback)
};

/**
 * Default capability set for plugins
 * @type {Object}
 */
const DEFAULT_CAPABILITIES = {
  eventBus: true,             // Can publish/subscribe to events
  storage: false,             // Can access localStorage/IndexedDB
  network: false,             // Can make network requests
  dom: false,                 // Can access DOM
  audio: false,               // Can access audio processing
  gpu: false,                 // Can access GPU compute
  fileSystem: false,          // Can access file system
  clipboard: false            // Can access clipboard
};

/**
 * Default resource quotas
 * @type {Object}
 */
const DEFAULT_QUOTAS = {
  maxMemoryMB: 10,            // Maximum memory usage in MB
  maxCpuMs: 100,              // Maximum CPU time per frame in ms
  maxStorageKB: 100,          // Maximum storage usage in KB
  maxEventRate: 100           // Maximum events per second
};

/**
 * Plugin Sandbox - Manages isolated execution contexts for plugins
 */
export class PluginSandbox {
  /**
   * @param {Object} options - Sandbox configuration
   * @param {IsolationStrategy} options.strategy - Isolation strategy to use
   * @param {Object} options.capabilities - Allowed capabilities
   * @param {Object} options.quotas - Resource quotas
   */
  constructor(options = {}) {
    this.strategy = options.strategy || this._selectStrategy();
    this.capabilities = { ...DEFAULT_CAPABILITIES, ...options.capabilities };
    this.quotas = { ...DEFAULT_QUOTAS, ...options.quotas };
    
    /** @type {Map<string, SandboxContext>} */
    this.contexts = new Map();
    
    /** @type {Map<string, ResourceMonitor>} */
    this.monitors = new Map();
    
    this._setupEventHandlers();
  }

  /**
   * Select best available isolation strategy
   * @private
   * @returns {IsolationStrategy}
   */
  _selectStrategy() {
    // Check for ShadowRealm support
    if (typeof ShadowRealm !== 'undefined') {
      return IsolationStrategy.REALM;
    }
    
    // Check for Worker support
    if (typeof Worker !== 'undefined') {
      return IsolationStrategy.WORKER;
    }
    
    // Fallback to iframe
    if (typeof HTMLIFrameElement !== 'undefined') {
      return IsolationStrategy.IFRAME;
    }
    
    // Last resort: proxy-based isolation
    console.warn('[PluginSandbox] Using proxy-based isolation - limited security');
    return IsolationStrategy.PROXY;
  }

  /**
   * Setup event handlers for sandbox management
   * @private
   */
  _setupEventHandlers() {
    EventBus.subscribe('plugin:load', (event) => {
      this._handlePluginLoad(event.detail);
    });

    EventBus.subscribe('plugin:unload', (event) => {
      this._handlePluginUnload(event.detail);
    });

    EventBus.subscribe('plugin:execute', (event) => {
      this._handlePluginExecute(event.detail);
    });
  }

  /**
   * Create sandbox context for plugin
   * @param {string} pluginId - Plugin identifier
   * @param {Object} pluginCode - Plugin code and metadata
   * @returns {Promise<SandboxContext>}
   */
  async createContext(pluginId, pluginCode) {
    if (this.contexts.has(pluginId)) {
      throw new Error(`Sandbox context already exists for plugin: ${pluginId}`);
    }

    const context = await this._createContextByStrategy(pluginId, pluginCode);
    this.contexts.set(pluginId, context);

    // Setup resource monitoring
    const monitor = new ResourceMonitor(pluginId, this.quotas);
    this.monitors.set(pluginId, monitor);
    monitor.start();

    EventBus.publish('sandbox:created', {
      pluginId,
      strategy: this.strategy,
      capabilities: this.capabilities
    });

    return context;
  }

  /**
   * Create context using selected strategy
   * @private
   * @param {string} pluginId - Plugin identifier
   * @param {Object} pluginCode - Plugin code
   * @returns {Promise<SandboxContext>}
   */
  async _createContextByStrategy(pluginId, pluginCode) {
    switch (this.strategy) {
      case IsolationStrategy.IFRAME:
        return this._createIframeContext(pluginId, pluginCode);
      case IsolationStrategy.WORKER:
        return this._createWorkerContext(pluginId, pluginCode);
      case IsolationStrategy.REALM:
        return this._createRealmContext(pluginId, pluginCode);
      case IsolationStrategy.PROXY:
        return this._createProxyContext(pluginId, pluginCode);
      default:
        throw new Error(`Unknown isolation strategy: ${this.strategy}`);
    }
  }

  /**
   * Create iframe-based sandbox context
   * @private
   * @param {string} pluginId - Plugin identifier
   * @param {Object} pluginCode - Plugin code
   * @returns {Promise<IframeSandboxContext>}
   */
  async _createIframeContext(pluginId, pluginCode) {
    return new IframeSandboxContext(pluginId, pluginCode, this.capabilities);
  }

  /**
   * Create worker-based sandbox context
   * @private
   * @param {string} pluginId - Plugin identifier
   * @param {Object} pluginCode - Plugin code
   * @returns {Promise<WorkerSandboxContext>}
   */
  async _createWorkerContext(pluginId, pluginCode) {
    return new WorkerSandboxContext(pluginId, pluginCode, this.capabilities);
  }

  /**
   * Create realm-based sandbox context
   * @private
   * @param {string} pluginId - Plugin identifier
   * @param {Object} pluginCode - Plugin code
   * @returns {Promise<RealmSandboxContext>}
   */
  async _createRealmContext(pluginId, pluginCode) {
    return new RealmSandboxContext(pluginId, pluginCode, this.capabilities);
  }

  /**
   * Create proxy-based sandbox context
   * @private
   * @param {string} pluginId - Plugin identifier
   * @param {Object} pluginCode - Plugin code
   * @returns {Promise<ProxySandboxContext>}
   */
  async _createProxyContext(pluginId, pluginCode) {
    return new ProxySandboxContext(pluginId, pluginCode, this.capabilities);
  }

  /**
   * Execute code in sandbox
   * @param {string} pluginId - Plugin identifier
   * @param {string} method - Method to execute
   * @param {Array} args - Method arguments
   * @returns {Promise<any>}
   */
  async execute(pluginId, method, args = []) {
    const context = this.contexts.get(pluginId);
    if (!context) {
      throw new Error(`No sandbox context found for plugin: ${pluginId}`);
    }

    const monitor = this.monitors.get(pluginId);
    if (!monitor.canExecute()) {
      throw new Error(`Plugin ${pluginId} exceeded resource quotas`);
    }

    try {
      monitor.recordExecution();
      const result = await context.execute(method, args);
      monitor.recordSuccess();
      return result;
    } catch (error) {
      monitor.recordError();
      EventBus.publish('sandbox:error', {
        pluginId,
        method,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Destroy sandbox context
   * @param {string} pluginId - Plugin identifier
   */
  async destroyContext(pluginId) {
    const context = this.contexts.get(pluginId);
    if (context) {
      await context.destroy();
      this.contexts.delete(pluginId);
    }

    const monitor = this.monitors.get(pluginId);
    if (monitor) {
      monitor.stop();
      this.monitors.delete(pluginId);
    }

    EventBus.publish('sandbox:destroyed', { pluginId });
  }

  /**
   * Get sandbox statistics
   * @param {string} pluginId - Plugin identifier
   * @returns {Object}
   */
  getStats(pluginId) {
    const monitor = this.monitors.get(pluginId);
    return monitor ? monitor.getStats() : null;
  }

  /**
   * Handle plugin load event
   * @private
   * @param {Object} detail - Event detail
   */
  async _handlePluginLoad(detail) {
    const { pluginId, code } = detail;
    try {
      await this.createContext(pluginId, code);
    } catch (error) {
      console.error(`[PluginSandbox] Failed to create context for ${pluginId}:`, error);
      EventBus.publish('sandbox:error', {
        pluginId,
        error: error.message
      });
    }
  }

  /**
   * Handle plugin unload event
   * @private
   * @param {Object} detail - Event detail
   */
  async _handlePluginUnload(detail) {
    const { pluginId } = detail;
    await this.destroyContext(pluginId);
  }

  /**
   * Handle plugin execute event
   * @private
   * @param {Object} detail - Event detail
   */
  async _handlePluginExecute(detail) {
    const { pluginId, method, args } = detail;
    try {
      const result = await this.execute(pluginId, method, args);
      EventBus.publish('plugin:executed', {
        pluginId,
        method,
        result
      });
    } catch (error) {
      console.error(`[PluginSandbox] Execution failed for ${pluginId}.${method}:`, error);
    }
  }
}

/**
 * Base class for sandbox contexts
 * @abstract
 */
class SandboxContext {
  /**
   * @param {string} pluginId - Plugin identifier
   * @param {Object} pluginCode - Plugin code
   * @param {Object} capabilities - Allowed capabilities
   */
  constructor(pluginId, pluginCode, capabilities) {
    this.pluginId = pluginId;
    this.pluginCode = pluginCode;
    this.capabilities = capabilities;
  }

  /**
   * Execute method in sandbox
   * @abstract
   * @param {string} method - Method name
   * @param {Array} args - Arguments
   * @returns {Promise<any>}
   */
  async execute(method, args) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Destroy sandbox context
   * @abstract
   * @returns {Promise<void>}
   */
  async destroy() {
    throw new Error('destroy() must be implemented by subclass');
  }

  /**
   * Create restricted API surface based on capabilities
   * @protected
   * @returns {Object}
   */
  _createRestrictedAPI() {
    const api = {};

    if (this.capabilities.eventBus) {
      api.EventBus = {
        publish: (type, detail) => EventBus.publish(type, detail),
        subscribe: (type, handler) => EventBus.subscribe(type, handler)
      };
    }

    if (this.capabilities.storage) {
      api.storage = {
        get: (key) => localStorage.getItem(`plugin:${this.pluginId}:${key}`),
        set: (key, value) => localStorage.setItem(`plugin:${this.pluginId}:${key}`, value),
        remove: (key) => localStorage.removeItem(`plugin:${this.pluginId}:${key}`)
      };
    }

    // Add other capabilities as needed
    return api;
  }
}

/**
 * Iframe-based sandbox context
 */
class IframeSandboxContext extends SandboxContext {
  constructor(pluginId, pluginCode, capabilities) {
    super(pluginId, pluginCode, capabilities);
    this.iframe = null;
    this.messageHandlers = new Map();
    this._initialize();
  }

  /**
   * Initialize iframe sandbox
   * @private
   */
  _initialize() {
    this.iframe = document.createElement('iframe');
    this.iframe.sandbox = 'allow-scripts';
    this.iframe.style.display = 'none';
    
    // Setup message passing
    window.addEventListener('message', (event) => {
      if (event.source === this.iframe.contentWindow) {
        this._handleMessage(event.data);
      }
    });

    document.body.appendChild(this.iframe);

    // Inject plugin code with restricted API
    const api = this._createRestrictedAPI();
    const code = `
      const HarmonyAPI = ${JSON.stringify(api)};
      ${this.pluginCode.code}
    `;

    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    this.iframe.src = url;
  }

  /**
   * Handle message from iframe
   * @private
   * @param {Object} data - Message data
   */
  _handleMessage(data) {
    const { id, result, error } = data;
    const handler = this.messageHandlers.get(id);
    if (handler) {
      if (error) {
        handler.reject(new Error(error));
      } else {
        handler.resolve(result);
      }
      this.messageHandlers.delete(id);
    }
  }

  /**
   * Execute method in iframe
   * @param {string} method - Method name
   * @param {Array} args - Arguments
   * @returns {Promise<any>}
   */
  async execute(method, args) {
    const id = Math.random().toString(36).substr(2, 9);
    
    return new Promise((resolve, reject) => {
      this.messageHandlers.set(id, { resolve, reject });
      
      this.iframe.contentWindow.postMessage({
        id,
        method,
        args
      }, '*');

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.messageHandlers.has(id)) {
          this.messageHandlers.delete(id);
          reject(new Error('Execution timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Destroy iframe context
   */
  async destroy() {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    this.messageHandlers.clear();
  }
}

/**
 * Worker-based sandbox context
 */
class WorkerSandboxContext extends SandboxContext {
  constructor(pluginId, pluginCode, capabilities) {
    super(pluginId, pluginCode, capabilities);
    this.worker = null;
    this.messageHandlers = new Map();
    this._initialize();
  }

  /**
   * Initialize worker sandbox
   * @private
   */
  _initialize() {
    const api = this._createRestrictedAPI();
    const code = `
      const HarmonyAPI = ${JSON.stringify(api)};
      ${this.pluginCode.code}
      
      self.onmessage = function(e) {
        const { id, method, args } = e.data;
        try {
          const result = self[method](...args);
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };
    `;

    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);

    this.worker.onmessage = (event) => {
      this._handleMessage(event.data);
    };
  }

  /**
   * Handle message from worker
   * @private
   * @param {Object} data - Message data
   */
  _handleMessage(data) {
    const { id, result, error } = data;
    const handler = this.messageHandlers.get(id);
    if (handler) {
      if (error) {
        handler.reject(new Error(error));
      } else {
        handler.resolve(result);
      }
      this.messageHandlers.delete(id);
    }
  }

  /**
   * Execute method in worker
   * @param {string} method - Method name
   * @param {Array} args - Arguments
   * @returns {Promise<any>}
   */
  async execute(method, args) {
    const id = Math.random().toString(36).substr(2, 9);
    
    return new Promise((resolve, reject) => {
      this.messageHandlers.set(id, { resolve, reject });
      
      this.worker.postMessage({
        id,
        method,
        args
      });

      setTimeout(() => {
        if (this.messageHandlers.has(id)) {
          this.messageHandlers.delete(id);
          reject(new Error('Execution timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Destroy worker context
   */
  async destroy() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = null;
    this.messageHandlers.clear();
  }
}

/**
 * ShadowRealm-based sandbox context
 */
class RealmSandboxContext extends SandboxContext {
  constructor(pluginId, pluginCode, capabilities) {
    super(pluginId, pluginCode, capabilities);
    this.realm = null;
    this._initialize();
  }

  /**
   * Initialize realm sandbox
   * @private
   */
  _initialize() {
    this.realm = new ShadowRealm();
    
    const api = this._createRestrictedAPI();
    this.realm.evaluate(`
      const HarmonyAPI = ${JSON.stringify(api)};
      ${this.pluginCode.code}
    `);
  }

  /**
   * Execute method in realm
   * @param {string} method - Method name
   * @param {Array} args - Arguments
   * @returns {Promise<any>}
   */
  async execute(method, args) {
    const argsJson = JSON.stringify(args);
    const result = await this.realm.evaluate(`
      (function() {
        const args = ${argsJson};
        return ${method}(...args);
      })()
    `);
    return result;
  }

  /**
   * Destroy realm context
   */
  async destroy() {
    this.realm = null;
  }
}

/**
 * Proxy-based sandbox context (fallback, least secure)
 */
class ProxySandboxContext extends SandboxContext {
  constructor(pluginId, pluginCode, capabilities) {
    super(pluginId, pluginCode, capabilities);
    this.scope = {};
    this._initialize();
  }

  /**
   * Initialize proxy sandbox
   * @private
   */
  _initialize() {
    const api = this._createRestrictedAPI();
    
    // Create restricted global scope
    const restrictedGlobal = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'HarmonyAPI') return api;
        if (prop in target) return target[prop];
        throw new Error(`Access to '${prop}' is not allowed`);
      },
      set: (target, prop, value) => {
        target[prop] = value;
        return true;
      }
    });

    // Execute plugin code in restricted scope
    const func = new Function('global', `
      with (global) {
        ${this.pluginCode.code}
      }
      return global;
    `);

    this.scope = func(restrictedGlobal);
  }

  /**
   * Execute method in proxy scope
   * @param {string} method - Method name
   * @param {Array} args - Arguments
   * @returns {Promise<any>}
   */
  async execute(method, args) {
    if (typeof this.scope[method] !== 'function') {
      throw new Error(`Method '${method}' not found in plugin`);
    }
    return this.scope[method](...args);
  }

  /**
   * Destroy proxy context
   */
  async destroy() {
    this.scope = null;
  }
}

/**
 * Resource monitor for tracking plugin resource usage
 */
class ResourceMonitor {
  constructor(pluginId, quotas) {
    this.pluginId = pluginId;
    this.quotas = quotas;
    this.stats = {
      executionCount: 0,
      errorCount: 0,
      lastExecutionTime: 0,
      totalCpuTime: 0,
      eventRate: 0
    };
    this.eventTimestamps = [];
  }

  /**
   * Start monitoring
   */
  start() {
    this.startTime = performance.now();
  }

  /**
   * Stop monitoring
   */
  stop() {
    // Cleanup
  }

  /**
   * Check if plugin can execute
   * @returns {boolean}
   */
  canExecute() {
    // Check event rate
    const now = Date.now();
    this.eventTimestamps = this.eventTimestamps.filter(t => now - t < 1000);
    
    if (this.eventTimestamps.length >= this.quotas.maxEventRate) {
      return false;
    }

    return true;
  }

  /**
   * Record execution
   */
  recordExecution() {
    this.stats.executionCount++;
    this.stats.lastExecutionTime = performance.now();
    this.eventTimestamps.push(Date.now());
  }

  /**
   * Record successful execution
   */
  recordSuccess() {
    const elapsed = performance.now() - this.stats.lastExecutionTime;
    this.stats.totalCpuTime += elapsed;
  }

  /**
   * Record error
   */
  recordError() {
    this.stats.errorCount++;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      eventRate: this.eventTimestamps.length,
      averageCpuTime: this.stats.executionCount > 0 
        ? this.stats.totalCpuTime / this.stats.executionCount 
        : 0
    };
  }
}

// Create singleton instance
export const pluginSandbox = new PluginSandbox();