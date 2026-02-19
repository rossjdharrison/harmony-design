/**
 * @fileoverview WASMNodeRegistry JavaScript Interface
 * @module harmony-graph/wasm-node-registry
 * 
 * Provides a JavaScript interface to the WASM-based node type registry.
 * Manages loading, caching, and accessing node type metadata for graph processing.
 * 
 * Performance targets:
 * - Registry initialization: < 10ms
 * - Node type lookup: < 0.1ms
 * - Memory overhead: < 5MB
 * 
 * Related documentation: See DESIGN_SYSTEM.md § Graph Engine § Node Registry
 * Related code: bounded-contexts/wasm-node-registry/src/lib.rs
 */

/**
 * @typedef {Object} NodeTypeMetadata
 * @property {string} type_id - Unique identifier (e.g., "audio.gain")
 * @property {string} display_name - Human-readable name
 * @property {string} category - Category for organization
 * @property {PortDefinition[]} inputs - Input port definitions
 * @property {PortDefinition[]} outputs - Output port definitions
 * @property {ParameterDefinition[]} parameters - Parameter definitions
 * @property {string} wasm_function - WASM function name
 * @property {number} memory_requirement - Memory needed in bytes
 * @property {boolean} is_parallel_safe - Can execute in parallel
 * @property {string} version - Version string
 */

/**
 * @typedef {Object} PortDefinition
 * @property {string} name - Port name
 * @property {string} data_type - "audio"|"midi"|"control"|"event"
 * @property {boolean} is_required - Whether port must be connected
 */

/**
 * @typedef {Object} ParameterDefinition
 * @property {string} name - Parameter name
 * @property {string} data_type - "float"|"int"|"bool"|"string"|"enum"
 * @property {string} default_value - Default value as string
 * @property {number} [min_value] - Minimum value (numeric types)
 * @property {number} [max_value] - Maximum value (numeric types)
 * @property {string[]} [enum_values] - Valid values (enum type)
 */

/**
 * JavaScript wrapper for the WASM node registry
 */
export class WASMNodeRegistry {
  /**
   * @private
   * @type {Object|null}
   */
  #wasmInstance = null;

  /**
   * @private
   * @type {boolean}
   */
  #initialized = false;

  /**
   * @private
   * @type {Map<string, NodeTypeMetadata>}
   */
  #cache = new Map();

  /**
   * Create a new WASMNodeRegistry instance
   */
  constructor() {
    this.#cache = new Map();
  }

  /**
   * Initialize the WASM module
   * @param {string} [wasmPath] - Path to the WASM file
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   */
  async initialize(wasmPath = '/bounded-contexts/wasm-node-registry/pkg/wasm_node_registry_bg.wasm') {
    if (this.#initialized) {
      return;
    }

    try {
      const startTime = performance.now();

      // Dynamic import of the WASM module
      const wasmModule = await import(wasmPath.replace('.wasm', '.js'));
      await wasmModule.default();

      this.#wasmInstance = new wasmModule.WASMNodeRegistry();
      this.#initialized = true;

      const duration = performance.now() - startTime;
      console.log(`[WASMNodeRegistry] Initialized in ${duration.toFixed(2)}ms`);

      // Publish initialization event
      this.#publishEvent('WASMNodeRegistryInitialized', { duration });
    } catch (error) {
      console.error('[WASMNodeRegistry] Initialization failed:', error);
      throw new Error(`Failed to initialize WASM node registry: ${error.message}`);
    }
  }

  /**
   * Register a new node type
   * @param {NodeTypeMetadata} metadata - Node type metadata
   * @returns {boolean} True if registered, false if already exists
   * @throws {Error} If not initialized or validation fails
   */
  register(metadata) {
    this.#ensureInitialized();
    this.#validateMetadata(metadata);

    try {
      const json = JSON.stringify(metadata);
      const result = this.#wasmInstance.register(json);

      if (result) {
        // Update local cache
        this.#cache.set(metadata.type_id, metadata);

        // Publish registration event
        this.#publishEvent('NodeTypeRegistered', {
          type_id: metadata.type_id,
          category: metadata.category
        });
      }

      return result;
    } catch (error) {
      console.error(`[WASMNodeRegistry] Registration failed for ${metadata.type_id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a node type
   * @param {string} typeId - Node type identifier
   * @returns {boolean} True if unregistered, false if not found
   */
  unregister(typeId) {
    this.#ensureInitialized();

    const result = this.#wasmInstance.unregister(typeId);

    if (result) {
      // Update local cache
      this.#cache.delete(typeId);

      // Publish unregistration event
      this.#publishEvent('NodeTypeUnregistered', { type_id: typeId });
    }

    return result;
  }

  /**
   * Get metadata for a specific node type
   * @param {string} typeId - Node type identifier
   * @returns {NodeTypeMetadata|null} Metadata or null if not found
   */
  get(typeId) {
    this.#ensureInitialized();

    // Check cache first
    if (this.#cache.has(typeId)) {
      return this.#cache.get(typeId);
    }

    try {
      const json = this.#wasmInstance.get(typeId);
      const metadata = JSON.parse(json);

      // Update cache
      this.#cache.set(typeId, metadata);

      return metadata;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a node type is registered
   * @param {string} typeId - Node type identifier
   * @returns {boolean} True if registered
   */
  has(typeId) {
    this.#ensureInitialized();
    return this.#wasmInstance.has(typeId);
  }

  /**
   * Get all registered node type IDs
   * @returns {string[]} Array of type IDs
   */
  listAll() {
    this.#ensureInitialized();
    const json = this.#wasmInstance.list_all();
    return JSON.parse(json);
  }

  /**
   * Get all node types in a specific category
   * @param {string} category - Category name
   * @returns {string[]} Array of type IDs in category
   */
  listByCategory(category) {
    this.#ensureInitialized();
    const json = this.#wasmInstance.list_by_category(category);
    return JSON.parse(json);
  }

  /**
   * Get all categories
   * @returns {string[]} Array of category names
   */
  listCategories() {
    this.#ensureInitialized();
    const json = this.#wasmInstance.list_categories();
    return JSON.parse(json);
  }

  /**
   * Get total memory requirement for all registered nodes
   * @returns {number} Total memory in bytes
   */
  getTotalMemory() {
    this.#ensureInitialized();
    return this.#wasmInstance.get_total_memory();
  }

  /**
   * Get registry statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    this.#ensureInitialized();
    const json = this.#wasmInstance.get_stats();
    return JSON.parse(json);
  }

  /**
   * Clear all registered node types
   */
  clear() {
    this.#ensureInitialized();
    this.#wasmInstance.clear();
    this.#cache.clear();

    this.#publishEvent('NodeRegistryCleared', {});
  }

  /**
   * Ensure the registry is initialized
   * @private
   * @throws {Error} If not initialized
   */
  #ensureInitialized() {
    if (!this.#initialized) {
      throw new Error('WASMNodeRegistry not initialized. Call initialize() first.');
    }
  }

  /**
   * Validate node type metadata
   * @private
   * @param {NodeTypeMetadata} metadata - Metadata to validate
   * @throws {Error} If validation fails
   */
  #validateMetadata(metadata) {
    if (!metadata.type_id || typeof metadata.type_id !== 'string') {
      throw new Error('Invalid type_id: must be a non-empty string');
    }

    if (!metadata.display_name || typeof metadata.display_name !== 'string') {
      throw new Error('Invalid display_name: must be a non-empty string');
    }

    if (!metadata.category || typeof metadata.category !== 'string') {
      throw new Error('Invalid category: must be a non-empty string');
    }

    if (!Array.isArray(metadata.inputs)) {
      throw new Error('Invalid inputs: must be an array');
    }

    if (!Array.isArray(metadata.outputs)) {
      throw new Error('Invalid outputs: must be an array');
    }

    if (!Array.isArray(metadata.parameters)) {
      throw new Error('Invalid parameters: must be an array');
    }

    if (!metadata.wasm_function || typeof metadata.wasm_function !== 'string') {
      throw new Error('Invalid wasm_function: must be a non-empty string');
    }

    if (typeof metadata.memory_requirement !== 'number' || metadata.memory_requirement < 0) {
      throw new Error('Invalid memory_requirement: must be a non-negative number');
    }

    if (typeof metadata.is_parallel_safe !== 'boolean') {
      throw new Error('Invalid is_parallel_safe: must be a boolean');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      throw new Error('Invalid version: must be a non-empty string');
    }
  }

  /**
   * Publish an event to the EventBus
   * @private
   * @param {string} eventType - Event type
   * @param {Object} payload - Event payload
   */
  #publishEvent(eventType, payload) {
    const eventBus = document.querySelector('event-bus-component');
    if (eventBus) {
      eventBus.publish(eventType, {
        source: 'WASMNodeRegistry',
        timestamp: Date.now(),
        ...payload
      });
    }
  }
}

/**
 * Singleton instance of the registry
 * @type {WASMNodeRegistry|null}
 */
let registryInstance = null;

/**
 * Get the singleton registry instance
 * @returns {WASMNodeRegistry} The registry instance
 */
export function getRegistry() {
  if (!registryInstance) {
    registryInstance = new WASMNodeRegistry();
  }
  return registryInstance;
}