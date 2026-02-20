/**
 * @fileoverview Sandbox Policy - Defines what dispatched code is allowed to access
 * 
 * This module provides a comprehensive security policy system for controlling
 * access to browser APIs and system resources when executing dispatched code
 * (WASM modules, user scripts, plugins, etc.).
 * 
 * @module core/sandbox-policy
 * @see {@link ../../DESIGN_SYSTEM.md#sandbox-policy}
 */

/**
 * @typedef {Object} SandboxPolicy
 * @property {string} id - Unique policy identifier
 * @property {string} name - Human-readable policy name
 * @property {string} description - Policy description
 * @property {PermissionSet} permissions - Allowed permissions
 * @property {ResourceLimits} limits - Resource usage limits
 * @property {APIWhitelist} apis - Allowed browser APIs
 * @property {number} trustLevel - Trust level (0-100)
 * @property {string[]} tags - Policy categorization tags
 */

/**
 * @typedef {Object} PermissionSet
 * @property {boolean} dom - DOM access allowed
 * @property {boolean} network - Network requests allowed
 * @property {boolean} storage - Storage access allowed
 * @property {boolean} audio - Audio API access allowed
 * @property {boolean} gpu - GPU/WebGL access allowed
 * @property {boolean} wasm - WASM instantiation allowed
 * @property {boolean} worker - Worker creation allowed
 * @property {boolean} sharedArrayBuffer - SharedArrayBuffer allowed
 * @property {boolean} eventBus - EventBus access allowed
 * @property {boolean} fileSystem - File system access allowed
 */

/**
 * @typedef {Object} ResourceLimits
 * @property {number} maxMemoryMB - Maximum memory in MB
 * @property {number} maxCpuTimeMs - Maximum CPU time per operation
 * @property {number} maxNetworkRequests - Maximum concurrent network requests
 * @property {number} maxStorageKB - Maximum storage in KB
 * @property {number} maxWorkers - Maximum worker threads
 * @property {number} maxEventRate - Maximum events per second
 */

/**
 * @typedef {Object} APIWhitelist
 * @property {string[]} globalObjects - Allowed global objects
 * @property {string[]} domMethods - Allowed DOM methods
 * @property {string[]} eventTypes - Allowed event types
 * @property {string[]} storageKeys - Allowed storage key patterns
 * @property {string[]} networkOrigins - Allowed network origins
 */

/**
 * @typedef {Object} ViolationReport
 * @property {string} policyId - Policy that was violated
 * @property {string} violationType - Type of violation
 * @property {string} resource - Resource that was accessed
 * @property {string} timestamp - ISO timestamp
 * @property {Object} context - Additional context
 */

/**
 * Predefined sandbox policies for common use cases
 */
const PREDEFINED_POLICIES = {
  /**
   * Strictest policy - no external access
   */
  ISOLATED: {
    id: 'isolated',
    name: 'Isolated',
    description: 'Completely isolated - no external access',
    permissions: {
      dom: false,
      network: false,
      storage: false,
      audio: false,
      gpu: false,
      wasm: true,
      worker: false,
      sharedArrayBuffer: false,
      eventBus: false,
      fileSystem: false
    },
    limits: {
      maxMemoryMB: 10,
      maxCpuTimeMs: 100,
      maxNetworkRequests: 0,
      maxStorageKB: 0,
      maxWorkers: 0,
      maxEventRate: 0
    },
    apis: {
      globalObjects: ['Math', 'JSON', 'Array', 'Object', 'String', 'Number'],
      domMethods: [],
      eventTypes: [],
      storageKeys: [],
      networkOrigins: []
    },
    trustLevel: 0,
    tags: ['strict', 'isolated', 'untrusted']
  },

  /**
   * Audio processing policy - GPU and audio access only
   */
  AUDIO_PROCESSOR: {
    id: 'audio-processor',
    name: 'Audio Processor',
    description: 'Audio and GPU access for DSP operations',
    permissions: {
      dom: false,
      network: false,
      storage: false,
      audio: true,
      gpu: true,
      wasm: true,
      worker: true,
      sharedArrayBuffer: true,
      eventBus: true,
      fileSystem: false
    },
    limits: {
      maxMemoryMB: 50, // Per MANDATORY RULES: Maximum 50MB WASM heap
      maxCpuTimeMs: 10, // Per ABSOLUTE CONSTRAINTS: Maximum 10ms latency
      maxNetworkRequests: 0,
      maxStorageKB: 0,
      maxWorkers: 4,
      maxEventRate: 1000
    },
    apis: {
      globalObjects: ['Math', 'Float32Array', 'Float64Array', 'SharedArrayBuffer'],
      domMethods: [],
      eventTypes: ['audio-process', 'buffer-ready'],
      storageKeys: [],
      networkOrigins: []
    },
    trustLevel: 50,
    tags: ['audio', 'gpu', 'performance-critical']
  },

  /**
   * UI component policy - DOM and EventBus access
   */
  UI_COMPONENT: {
    id: 'ui-component',
    name: 'UI Component',
    description: 'DOM manipulation and event publishing for UI components',
    permissions: {
      dom: true,
      network: false,
      storage: false,
      audio: false,
      gpu: false,
      wasm: false,
      worker: false,
      sharedArrayBuffer: false,
      eventBus: true,
      fileSystem: false
    },
    limits: {
      maxMemoryMB: 20,
      maxCpuTimeMs: 16, // Per ABSOLUTE CONSTRAINTS: Maximum 16ms per frame
      maxNetworkRequests: 0,
      maxStorageKB: 0,
      maxWorkers: 0,
      maxEventRate: 100
    },
    apis: {
      globalObjects: ['document', 'customElements', 'HTMLElement', 'ShadowRoot'],
      domMethods: ['querySelector', 'createElement', 'appendChild', 'setAttribute', 'addEventListener'],
      eventTypes: ['click', 'input', 'change', 'focus', 'blur'],
      storageKeys: [],
      networkOrigins: []
    },
    trustLevel: 60,
    tags: ['ui', 'dom', 'components']
  },

  /**
   * Bounded context policy - full system access
   */
  BOUNDED_CONTEXT: {
    id: 'bounded-context',
    name: 'Bounded Context',
    description: 'Full system access for trusted bounded contexts',
    permissions: {
      dom: false,
      network: true,
      storage: true,
      audio: true,
      gpu: true,
      wasm: true,
      worker: true,
      sharedArrayBuffer: true,
      eventBus: true,
      fileSystem: true
    },
    limits: {
      maxMemoryMB: 50,
      maxCpuTimeMs: 1000,
      maxNetworkRequests: 10,
      maxStorageKB: 10240, // 10MB
      maxWorkers: 8,
      maxEventRate: 10000
    },
    apis: {
      globalObjects: ['*'], // All allowed
      domMethods: [],
      eventTypes: ['*'],
      storageKeys: ['*'],
      networkOrigins: ['*']
    },
    trustLevel: 100,
    tags: ['trusted', 'system', 'bounded-context']
  },

  /**
   * Plugin policy - limited access for third-party code
   */
  PLUGIN: {
    id: 'plugin',
    name: 'Plugin',
    description: 'Limited access for third-party plugins',
    permissions: {
      dom: true,
      network: true,
      storage: true,
      audio: false,
      gpu: false,
      wasm: false,
      worker: false,
      sharedArrayBuffer: false,
      eventBus: true,
      fileSystem: false
    },
    limits: {
      maxMemoryMB: 25,
      maxCpuTimeMs: 100,
      maxNetworkRequests: 5,
      maxStorageKB: 1024, // 1MB
      maxWorkers: 0,
      maxEventRate: 50
    },
    apis: {
      globalObjects: ['document', 'fetch', 'localStorage'],
      domMethods: ['querySelector', 'createElement', 'appendChild'],
      eventTypes: ['*'],
      storageKeys: ['plugin-*'],
      networkOrigins: ['https://*']
    },
    trustLevel: 30,
    tags: ['plugin', 'third-party', 'limited']
  }
};

/**
 * Sandbox Policy Manager
 * 
 * Manages security policies for dispatched code execution.
 * Enforces access controls and resource limits.
 */
class SandboxPolicyManager {
  constructor() {
    /** @type {Map<string, SandboxPolicy>} */
    this.policies = new Map();
    
    /** @type {Map<string, string>} */
    this.contextPolicies = new Map();
    
    /** @type {ViolationReport[]} */
    this.violations = [];
    
    /** @type {Map<string, ResourceUsage>} */
    this.resourceUsage = new Map();
    
    this._initializePredefinedPolicies();
  }

  /**
   * Initialize predefined policies
   * @private
   */
  _initializePredefinedPolicies() {
    Object.values(PREDEFINED_POLICIES).forEach(policy => {
      this.policies.set(policy.id, policy);
    });
  }

  /**
   * Register a custom policy
   * 
   * @param {SandboxPolicy} policy - Policy to register
   * @throws {Error} If policy is invalid
   */
  registerPolicy(policy) {
    this._validatePolicy(policy);
    this.policies.set(policy.id, policy);
  }

  /**
   * Assign a policy to a context
   * 
   * @param {string} contextId - Context identifier
   * @param {string} policyId - Policy identifier
   * @throws {Error} If policy doesn't exist
   */
  assignPolicy(contextId, policyId) {
    if (!this.policies.has(policyId)) {
      throw new Error(`Policy not found: ${policyId}`);
    }
    this.contextPolicies.set(contextId, policyId);
    this.resourceUsage.set(contextId, this._createResourceUsage());
  }

  /**
   * Check if an operation is allowed
   * 
   * @param {string} contextId - Context identifier
   * @param {string} operation - Operation type
   * @param {Object} details - Operation details
   * @returns {boolean} Whether operation is allowed
   */
  checkPermission(contextId, operation, details = {}) {
    const policy = this._getPolicyForContext(contextId);
    if (!policy) {
      this._recordViolation(contextId, 'no-policy', operation, details);
      return false;
    }

    // Check permission
    const allowed = this._checkOperationPermission(policy, operation, details);
    
    if (!allowed) {
      this._recordViolation(contextId, 'permission-denied', operation, details);
      return false;
    }

    // Check resource limits
    const withinLimits = this._checkResourceLimits(contextId, policy, operation, details);
    
    if (!withinLimits) {
      this._recordViolation(contextId, 'resource-limit', operation, details);
      return false;
    }

    return true;
  }

  /**
   * Create a sandboxed execution environment
   * 
   * @param {string} contextId - Context identifier
   * @returns {Object} Sandboxed global object
   */
  createSandbox(contextId) {
    const policy = this._getPolicyForContext(contextId);
    if (!policy) {
      throw new Error(`No policy assigned to context: ${contextId}`);
    }

    const sandbox = Object.create(null);
    
    // Add whitelisted global objects
    this._addWhitelistedGlobals(sandbox, policy);
    
    // Add proxied APIs with permission checks
    this._addProxiedAPIs(sandbox, contextId, policy);
    
    return sandbox;
  }

  /**
   * Get policy for a context
   * 
   * @private
   * @param {string} contextId - Context identifier
   * @returns {SandboxPolicy|null} Policy or null
   */
  _getPolicyForContext(contextId) {
    const policyId = this.contextPolicies.get(contextId);
    return policyId ? this.policies.get(policyId) : null;
  }

  /**
   * Check if operation is permitted by policy
   * 
   * @private
   * @param {SandboxPolicy} policy - Policy to check
   * @param {string} operation - Operation type
   * @param {Object} details - Operation details
   * @returns {boolean} Whether operation is allowed
   */
  _checkOperationPermission(policy, operation, details) {
    switch (operation) {
      case 'dom:access':
        return policy.permissions.dom;
      
      case 'dom:method':
        return policy.permissions.dom && 
               this._isWhitelisted(details.method, policy.apis.domMethods);
      
      case 'network:fetch':
        return policy.permissions.network &&
               this._isOriginAllowed(details.url, policy.apis.networkOrigins);
      
      case 'storage:read':
      case 'storage:write':
        return policy.permissions.storage &&
               this._isKeyAllowed(details.key, policy.apis.storageKeys);
      
      case 'audio:process':
        return policy.permissions.audio;
      
      case 'gpu:access':
        return policy.permissions.gpu;
      
      case 'wasm:instantiate':
        return policy.permissions.wasm;
      
      case 'worker:create':
        return policy.permissions.worker;
      
      case 'eventbus:publish':
      case 'eventbus:subscribe':
        return policy.permissions.eventBus &&
               this._isWhitelisted(details.eventType, policy.apis.eventTypes);
      
      case 'filesystem:access':
        return policy.permissions.fileSystem;
      
      default:
        return false;
    }
  }

  /**
   * Check if resource limits are satisfied
   * 
   * @private
   * @param {string} contextId - Context identifier
   * @param {SandboxPolicy} policy - Policy to check
   * @param {string} operation - Operation type
   * @param {Object} details - Operation details
   * @returns {boolean} Whether limits are satisfied
   */
  _checkResourceLimits(contextId, policy, operation, details) {
    const usage = this.resourceUsage.get(contextId);
    if (!usage) return false;

    // Check memory limit
    if (usage.memoryMB > policy.limits.maxMemoryMB) {
      return false;
    }

    // Check CPU time limit
    if (details.estimatedTimeMs && details.estimatedTimeMs > policy.limits.maxCpuTimeMs) {
      return false;
    }

    // Check network request limit
    if (operation === 'network:fetch' && 
        usage.activeNetworkRequests >= policy.limits.maxNetworkRequests) {
      return false;
    }

    // Check worker limit
    if (operation === 'worker:create' && 
        usage.activeWorkers >= policy.limits.maxWorkers) {
      return false;
    }

    // Check event rate limit
    if (operation.startsWith('eventbus:')) {
      const now = Date.now();
      const recentEvents = usage.eventTimestamps.filter(t => now - t < 1000);
      if (recentEvents.length >= policy.limits.maxEventRate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record a policy violation
   * 
   * @private
   * @param {string} contextId - Context identifier
   * @param {string} violationType - Type of violation
   * @param {string} resource - Resource accessed
   * @param {Object} context - Additional context
   */
  _recordViolation(contextId, violationType, resource, context) {
    const policyId = this.contextPolicies.get(contextId) || 'unknown';
    
    const violation = {
      policyId,
      contextId,
      violationType,
      resource,
      timestamp: new Date().toISOString(),
      context
    };

    this.violations.push(violation);
    
    // Log to console per MANDATORY RULES
    console.error('[SandboxPolicy] Violation detected:', violation);

    // Keep only last 1000 violations
    if (this.violations.length > 1000) {
      this.violations.shift();
    }
  }

  /**
   * Check if value matches whitelist
   * 
   * @private
   * @param {string} value - Value to check
   * @param {string[]} whitelist - Whitelist patterns
   * @returns {boolean} Whether value is whitelisted
   */
  _isWhitelisted(value, whitelist) {
    if (whitelist.includes('*')) return true;
    
    return whitelist.some(pattern => {
      if (pattern.endsWith('*')) {
        return value.startsWith(pattern.slice(0, -1));
      }
      return value === pattern;
    });
  }

  /**
   * Check if origin is allowed
   * 
   * @private
   * @param {string} url - URL to check
   * @param {string[]} allowedOrigins - Allowed origin patterns
   * @returns {boolean} Whether origin is allowed
   */
  _isOriginAllowed(url, allowedOrigins) {
    if (allowedOrigins.includes('*')) return true;
    
    try {
      const urlObj = new URL(url);
      const origin = urlObj.origin;
      
      return this._isWhitelisted(origin, allowedOrigins);
    } catch {
      return false;
    }
  }

  /**
   * Check if storage key is allowed
   * 
   * @private
   * @param {string} key - Storage key
   * @param {string[]} allowedKeys - Allowed key patterns
   * @returns {boolean} Whether key is allowed
   */
  _isKeyAllowed(key, allowedKeys) {
    return this._isWhitelisted(key, allowedKeys);
  }

  /**
   * Add whitelisted globals to sandbox
   * 
   * @private
   * @param {Object} sandbox - Sandbox object
   * @param {SandboxPolicy} policy - Policy
   */
  _addWhitelistedGlobals(sandbox, policy) {
    const allowAll = policy.apis.globalObjects.includes('*');
    
    if (allowAll || policy.apis.globalObjects.includes('Math')) {
      sandbox.Math = Math;
    }
    if (allowAll || policy.apis.globalObjects.includes('JSON')) {
      sandbox.JSON = JSON;
    }
    if (allowAll || policy.apis.globalObjects.includes('Array')) {
      sandbox.Array = Array;
    }
    if (allowAll || policy.apis.globalObjects.includes('Object')) {
      sandbox.Object = Object;
    }
    if (allowAll || policy.apis.globalObjects.includes('String')) {
      sandbox.String = String;
    }
    if (allowAll || policy.apis.globalObjects.includes('Number')) {
      sandbox.Number = Number;
    }
    if (allowAll || policy.apis.globalObjects.includes('Float32Array')) {
      sandbox.Float32Array = Float32Array;
    }
    if (allowAll || policy.apis.globalObjects.includes('Float64Array')) {
      sandbox.Float64Array = Float64Array;
    }
  }

  /**
   * Add proxied APIs with permission checks
   * 
   * @private
   * @param {Object} sandbox - Sandbox object
   * @param {string} contextId - Context identifier
   * @param {SandboxPolicy} policy - Policy
   */
  _addProxiedAPIs(sandbox, contextId, policy) {
    // Add fetch proxy if network is allowed
    if (policy.permissions.network) {
      sandbox.fetch = (url, options) => {
        if (!this.checkPermission(contextId, 'network:fetch', { url })) {
          return Promise.reject(new Error('Network access denied'));
        }
        
        const usage = this.resourceUsage.get(contextId);
        usage.activeNetworkRequests++;
        
        return fetch(url, options).finally(() => {
          usage.activeNetworkRequests--;
        });
      };
    }

    // Add storage proxy if storage is allowed
    if (policy.permissions.storage) {
      sandbox.storage = {
        get: (key) => {
          if (!this.checkPermission(contextId, 'storage:read', { key })) {
            throw new Error('Storage access denied');
          }
          return localStorage.getItem(key);
        },
        set: (key, value) => {
          if (!this.checkPermission(contextId, 'storage:write', { key })) {
            throw new Error('Storage access denied');
          }
          localStorage.setItem(key, value);
        }
      };
    }
  }

  /**
   * Create initial resource usage tracker
   * 
   * @private
   * @returns {Object} Resource usage object
   */
  _createResourceUsage() {
    return {
      memoryMB: 0,
      activeNetworkRequests: 0,
      activeWorkers: 0,
      eventTimestamps: []
    };
  }

  /**
   * Validate policy structure
   * 
   * @private
   * @param {SandboxPolicy} policy - Policy to validate
   * @throws {Error} If policy is invalid
   */
  _validatePolicy(policy) {
    if (!policy.id || typeof policy.id !== 'string') {
      throw new Error('Policy must have a valid id');
    }
    if (!policy.permissions || typeof policy.permissions !== 'object') {
      throw new Error('Policy must have permissions object');
    }
    if (!policy.limits || typeof policy.limits !== 'object') {
      throw new Error('Policy must have limits object');
    }
    if (!policy.apis || typeof policy.apis !== 'object') {
      throw new Error('Policy must have apis object');
    }
  }

  /**
   * Get all violations for a context
   * 
   * @param {string} contextId - Context identifier
   * @returns {ViolationReport[]} Violations
   */
  getViolations(contextId) {
    return this.violations.filter(v => v.contextId === contextId);
  }

  /**
   * Clear violations for a context
   * 
   * @param {string} contextId - Context identifier
   */
  clearViolations(contextId) {
    this.violations = this.violations.filter(v => v.contextId !== contextId);
  }

  /**
   * Get resource usage for a context
   * 
   * @param {string} contextId - Context identifier
   * @returns {Object|null} Resource usage
   */
  getResourceUsage(contextId) {
    return this.resourceUsage.get(contextId) || null;
  }
}

// Global singleton instance
const sandboxPolicyManager = new SandboxPolicyManager();

export {
  SandboxPolicyManager,
  sandboxPolicyManager,
  PREDEFINED_POLICIES
};