/**
 * @fileoverview NodeCodeBundle - Packages node logic as self-contained executable bundles
 * 
 * Self-contained bundles include:
 * - Node binary representation (from NodeBinaryFormat)
 * - Executable logic/WASM module
 * - Property schemas and validation
 * - Dependencies and imports
 * - Metadata for execution context
 * 
 * Related: harmony-graph/node-binary-format.js, bounded-contexts/wasm-node-registry/
 * See: DESIGN_SYSTEM.md § Node Execution Model
 * 
 * @module harmony-graph/node-code-bundle
 */

/**
 * Bundle format version for compatibility checking
 * @const {number}
 */
const BUNDLE_FORMAT_VERSION = 1;

/**
 * Bundle type identifiers
 * @enum {number}
 */
export const BundleType = {
  JAVASCRIPT: 0,
  WASM: 1,
  HYBRID: 2, // JS + WASM
  GPU_SHADER: 3
};

/**
 * Bundle execution context requirements
 * @enum {number}
 */
export const ExecutionContext = {
  MAIN_THREAD: 0,
  WORKER: 1,
  AUDIO_WORKLET: 2,
  GPU_COMPUTE: 3
};

/**
 * Creates a self-contained executable bundle for a node
 * 
 * Bundle structure:
 * - Header: version, type, context requirements
 * - Metadata: node type, dependencies, capabilities
 * - Binary: node data (from NodeBinaryFormat)
 * - Code: executable logic (JS/WASM)
 * - Schema: property validation rules
 * - Resources: additional assets (shaders, etc.)
 * 
 * @class NodeCodeBundle
 */
export class NodeCodeBundle {
  /**
   * @param {Object} config - Bundle configuration
   * @param {string} config.nodeType - Type identifier for the node
   * @param {BundleType} config.bundleType - Type of executable code
   * @param {ExecutionContext} config.executionContext - Required execution context
   * @param {ArrayBuffer} config.nodeBinary - Binary node data (from NodeBinaryFormat)
   * @param {ArrayBuffer|string} config.code - Executable code (WASM or JS source)
   * @param {Object} config.schema - Property schema for validation
   * @param {string[]} [config.dependencies=[]] - Required dependencies
   * @param {Object} [config.metadata={}] - Additional metadata
   */
  constructor(config) {
    this.version = BUNDLE_FORMAT_VERSION;
    this.nodeType = config.nodeType;
    this.bundleType = config.bundleType;
    this.executionContext = config.executionContext;
    this.nodeBinary = config.nodeBinary;
    this.code = config.code;
    this.schema = config.schema;
    this.dependencies = config.dependencies || [];
    this.metadata = config.metadata || {};
    
    // Compute bundle hash for integrity checking
    this.hash = this._computeHash();
  }

  /**
   * Serializes bundle to binary format for storage/transmission
   * 
   * Binary layout:
   * [Header 32 bytes]
   *   - version: u32
   *   - bundleType: u8
   *   - executionContext: u8
   *   - nodeTypeLength: u16
   *   - nodeBinarySize: u32
   *   - codeSize: u32
   *   - schemaSize: u32
   *   - dependenciesCount: u16
   *   - metadataSize: u32
   *   - hash: u64
   * [NodeType string]
   * [NodeBinary data]
   * [Code data]
   * [Schema JSON]
   * [Dependencies JSON]
   * [Metadata JSON]
   * 
   * @returns {ArrayBuffer} Serialized bundle
   */
  serialize() {
    const encoder = new TextEncoder();
    
    // Encode string/JSON sections
    const nodeTypeBytes = encoder.encode(this.nodeType);
    const schemaBytes = encoder.encode(JSON.stringify(this.schema));
    const dependenciesBytes = encoder.encode(JSON.stringify(this.dependencies));
    const metadataBytes = encoder.encode(JSON.stringify(this.metadata));
    
    // Handle code based on type
    const codeBytes = typeof this.code === 'string' 
      ? encoder.encode(this.code)
      : new Uint8Array(this.code);
    
    // Calculate total size
    const headerSize = 32;
    const totalSize = headerSize 
      + nodeTypeBytes.byteLength
      + this.nodeBinary.byteLength
      + codeBytes.byteLength
      + schemaBytes.byteLength
      + dependenciesBytes.byteLength
      + metadataBytes.byteLength;
    
    // Allocate buffer
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    
    let offset = 0;
    
    // Write header
    view.setUint32(offset, this.version, true); offset += 4;
    view.setUint8(offset, this.bundleType); offset += 1;
    view.setUint8(offset, this.executionContext); offset += 1;
    view.setUint16(offset, nodeTypeBytes.byteLength, true); offset += 2;
    view.setUint32(offset, this.nodeBinary.byteLength, true); offset += 4;
    view.setUint32(offset, codeBytes.byteLength, true); offset += 4;
    view.setUint32(offset, schemaBytes.byteLength, true); offset += 4;
    view.setUint16(offset, this.dependencies.length, true); offset += 2;
    view.setUint32(offset, metadataBytes.byteLength, true); offset += 4;
    
    // Write hash (simplified - use first 8 bytes)
    const hashBytes = encoder.encode(this.hash.substring(0, 8));
    for (let i = 0; i < Math.min(8, hashBytes.length); i++) {
      view.setUint8(offset++, hashBytes[i]);
    }
    
    // Align to 32 bytes
    offset = headerSize;
    
    // Write node type
    bytes.set(nodeTypeBytes, offset);
    offset += nodeTypeBytes.byteLength;
    
    // Write node binary
    bytes.set(new Uint8Array(this.nodeBinary), offset);
    offset += this.nodeBinary.byteLength;
    
    // Write code
    bytes.set(codeBytes, offset);
    offset += codeBytes.byteLength;
    
    // Write schema
    bytes.set(schemaBytes, offset);
    offset += schemaBytes.byteLength;
    
    // Write dependencies
    bytes.set(dependenciesBytes, offset);
    offset += dependenciesBytes.byteLength;
    
    // Write metadata
    bytes.set(metadataBytes, offset);
    
    return buffer;
  }

  /**
   * Deserializes bundle from binary format
   * 
   * @param {ArrayBuffer} buffer - Serialized bundle data
   * @returns {NodeCodeBundle} Deserialized bundle instance
   * @throws {Error} If version mismatch or corrupted data
   */
  static deserialize(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder();
    
    let offset = 0;
    
    // Read header
    const version = view.getUint32(offset, true); offset += 4;
    if (version !== BUNDLE_FORMAT_VERSION) {
      throw new Error(`Bundle version mismatch: expected ${BUNDLE_FORMAT_VERSION}, got ${version}`);
    }
    
    const bundleType = view.getUint8(offset); offset += 1;
    const executionContext = view.getUint8(offset); offset += 1;
    const nodeTypeLength = view.getUint16(offset, true); offset += 2;
    const nodeBinarySize = view.getUint32(offset, true); offset += 4;
    const codeSize = view.getUint32(offset, true); offset += 4;
    const schemaSize = view.getUint32(offset, true); offset += 4;
    const dependenciesCount = view.getUint16(offset, true); offset += 2;
    const metadataSize = view.getUint32(offset, true); offset += 4;
    
    // Read hash for verification
    const storedHash = decoder.decode(bytes.slice(offset, offset + 8));
    offset = 32; // Skip to end of header
    
    // Read node type
    const nodeType = decoder.decode(bytes.slice(offset, offset + nodeTypeLength));
    offset += nodeTypeLength;
    
    // Read node binary
    const nodeBinary = buffer.slice(offset, offset + nodeBinarySize);
    offset += nodeBinarySize;
    
    // Read code
    const codeBytes = bytes.slice(offset, offset + codeSize);
    const code = bundleType === BundleType.WASM 
      ? codeBytes.buffer.slice(codeBytes.byteOffset, codeBytes.byteOffset + codeBytes.byteLength)
      : decoder.decode(codeBytes);
    offset += codeSize;
    
    // Read schema
    const schemaJson = decoder.decode(bytes.slice(offset, offset + schemaSize));
    const schema = JSON.parse(schemaJson);
    offset += schemaSize;
    
    // Read dependencies
    const dependenciesEnd = offset + buffer.byteLength - offset - metadataSize;
    const dependenciesJson = decoder.decode(bytes.slice(offset, dependenciesEnd));
    const dependencies = JSON.parse(dependenciesJson);
    offset = dependenciesEnd;
    
    // Read metadata
    const metadataJson = decoder.decode(bytes.slice(offset, offset + metadataSize));
    const metadata = JSON.parse(metadataJson);
    
    // Create bundle instance
    const bundle = new NodeCodeBundle({
      nodeType,
      bundleType,
      executionContext,
      nodeBinary,
      code,
      schema,
      dependencies,
      metadata
    });
    
    // Verify hash
    if (!bundle.hash.startsWith(storedHash)) {
      console.warn('Bundle hash mismatch - data may be corrupted');
    }
    
    return bundle;
  }

  /**
   * Validates bundle integrity and requirements
   * 
   * @returns {Object} Validation result
   * @returns {boolean} result.valid - Whether bundle is valid
   * @returns {string[]} result.errors - Validation errors if any
   */
  validate() {
    const errors = [];
    
    // Check required fields
    if (!this.nodeType) {
      errors.push('Missing nodeType');
    }
    
    if (this.bundleType === undefined) {
      errors.push('Missing bundleType');
    }
    
    if (this.executionContext === undefined) {
      errors.push('Missing executionContext');
    }
    
    if (!this.nodeBinary || this.nodeBinary.byteLength === 0) {
      errors.push('Missing or empty nodeBinary');
    }
    
    if (!this.code || (typeof this.code === 'string' && this.code.length === 0)) {
      errors.push('Missing or empty code');
    }
    
    if (!this.schema) {
      errors.push('Missing schema');
    }
    
    // Validate WASM if applicable
    if (this.bundleType === BundleType.WASM || this.bundleType === BundleType.HYBRID) {
      if (!(this.code instanceof ArrayBuffer)) {
        errors.push('WASM bundle requires ArrayBuffer code');
      } else {
        // Check WASM magic number
        const magic = new Uint32Array(this.code.slice(0, 4))[0];
        if (magic !== 0x6d736100) { // '\0asm'
          errors.push('Invalid WASM magic number');
        }
      }
    }
    
    // Validate dependencies exist
    if (this.dependencies.length > 0) {
      // Note: Actual dependency resolution happens at load time
      this.metadata.hasDependencies = true;
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extracts executable code for instantiation
   * 
   * @param {Object} [options={}] - Extraction options
   * @param {boolean} [options.compile=true] - Whether to compile WASM
   * @returns {Promise<Function|WebAssembly.Module>} Executable code
   */
  async extractExecutable(options = {}) {
    const { compile = true } = options;
    
    switch (this.bundleType) {
      case BundleType.JAVASCRIPT:
        // Create function from source
        // Note: In production, use safer evaluation methods
        return new Function('return ' + this.code)();
      
      case BundleType.WASM:
        if (compile) {
          return await WebAssembly.compile(this.code);
        }
        return this.code;
      
      case BundleType.HYBRID:
        // Return both JS and WASM components
        const jsCode = this.metadata.jsCode || '';
        const wasmModule = compile 
          ? await WebAssembly.compile(this.code)
          : this.code;
        
        return {
          js: new Function('return ' + jsCode)(),
          wasm: wasmModule
        };
      
      case BundleType.GPU_SHADER:
        // Return shader source
        return typeof this.code === 'string' 
          ? this.code 
          : new TextDecoder().decode(this.code);
      
      default:
        throw new Error(`Unknown bundle type: ${this.bundleType}`);
    }
  }

  /**
   * Computes hash for bundle integrity checking
   * Simple hash - in production use crypto.subtle.digest
   * 
   * @private
   * @returns {string} Hash string
   */
  _computeHash() {
    const str = this.nodeType + this.bundleType + this.executionContext;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Creates a minimal bundle for testing
   * 
   * @param {string} nodeType - Node type identifier
   * @returns {NodeCodeBundle} Test bundle
   */
  static createTestBundle(nodeType = 'test-node') {
    const encoder = new TextEncoder();
    
    // Minimal node binary (just a header)
    const nodeBinary = new ArrayBuffer(16);
    const nodeView = new DataView(nodeBinary);
    nodeView.setUint32(0, 1, true); // version
    nodeView.setUint32(4, 0, true); // node id
    
    // Simple JS code
    const code = `
      function process(inputs, outputs, params) {
        // Simple pass-through
        outputs[0] = inputs[0];
        return true;
      }
      return { process };
    `;
    
    // Basic schema
    const schema = {
      inputs: [{ name: 'input', type: 'signal' }],
      outputs: [{ name: 'output', type: 'signal' }],
      properties: {}
    };
    
    return new NodeCodeBundle({
      nodeType,
      bundleType: BundleType.JAVASCRIPT,
      executionContext: ExecutionContext.WORKER,
      nodeBinary,
      code,
      schema,
      dependencies: [],
      metadata: { test: true }
    });
  }
}

/**
 * Bundle registry for managing loaded bundles
 * Singleton pattern for global access
 * 
 * @class BundleRegistry
 */
export class BundleRegistry {
  constructor() {
    if (BundleRegistry.instance) {
      return BundleRegistry.instance;
    }
    
    /** @type {Map<string, NodeCodeBundle>} */
    this.bundles = new Map();
    
    /** @type {Map<string, Promise<any>>} */
    this.loadingPromises = new Map();
    
    BundleRegistry.instance = this;
  }

  /**
   * Registers a bundle in the registry
   * 
   * @param {string} bundleId - Unique bundle identifier
   * @param {NodeCodeBundle} bundle - Bundle to register
   * @throws {Error} If bundle validation fails
   */
  register(bundleId, bundle) {
    const validation = bundle.validate();
    if (!validation.valid) {
      throw new Error(`Bundle validation failed: ${validation.errors.join(', ')}`);
    }
    
    this.bundles.set(bundleId, bundle);
    console.log(`[BundleRegistry] Registered bundle: ${bundleId} (${bundle.nodeType})`);
  }

  /**
   * Retrieves a bundle from the registry
   * 
   * @param {string} bundleId - Bundle identifier
   * @returns {NodeCodeBundle|null} Bundle or null if not found
   */
  get(bundleId) {
    return this.bundles.get(bundleId) || null;
  }

  /**
   * Checks if a bundle is registered
   * 
   * @param {string} bundleId - Bundle identifier
   * @returns {boolean} Whether bundle exists
   */
  has(bundleId) {
    return this.bundles.has(bundleId);
  }

  /**
   * Loads and registers a bundle from URL
   * 
   * @param {string} bundleId - Unique identifier for the bundle
   * @param {string} url - URL to fetch bundle from
   * @returns {Promise<NodeCodeBundle>} Loaded bundle
   */
  async load(bundleId, url) {
    // Check if already loaded
    if (this.bundles.has(bundleId)) {
      return this.bundles.get(bundleId);
    }
    
    // Check if currently loading
    if (this.loadingPromises.has(bundleId)) {
      return this.loadingPromises.get(bundleId);
    }
    
    // Start loading
    const loadPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch bundle: ${response.statusText}`);
        }
        
        const buffer = await response.arrayBuffer();
        const bundle = NodeCodeBundle.deserialize(buffer);
        
        this.register(bundleId, bundle);
        return bundle;
      } finally {
        this.loadingPromises.delete(bundleId);
      }
    })();
    
    this.loadingPromises.set(bundleId, loadPromise);
    return loadPromise;
  }

  /**
   * Unregisters a bundle
   * 
   * @param {string} bundleId - Bundle identifier
   * @returns {boolean} Whether bundle was removed
   */
  unregister(bundleId) {
    return this.bundles.delete(bundleId);
  }

  /**
   * Clears all registered bundles
   */
  clear() {
    this.bundles.clear();
    this.loadingPromises.clear();
    console.log('[BundleRegistry] Cleared all bundles');
  }

  /**
   * Gets all registered bundle IDs
   * 
   * @returns {string[]} Array of bundle IDs
   */
  getBundleIds() {
    return Array.from(this.bundles.keys());
  }

  /**
   * Gets bundles by execution context
   * 
   * @param {ExecutionContext} context - Execution context to filter by
   * @returns {Map<string, NodeCodeBundle>} Filtered bundles
   */
  getBundlesByContext(context) {
    const filtered = new Map();
    for (const [id, bundle] of this.bundles.entries()) {
      if (bundle.executionContext === context) {
        filtered.set(id, bundle);
      }
    }
    return filtered;
  }
}

// Export singleton instance
export const bundleRegistry = new BundleRegistry();