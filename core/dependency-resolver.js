/**
 * @fileoverview DependencyResolver - Resolves and bundles all dependencies for isolated execution
 * 
 * Analyzes node graphs, WASM modules, and resources to create self-contained execution bundles.
 * Ensures all dependencies are tracked, resolved, and packaged for edge execution.
 * 
 * Related:
 * - bounded-contexts/wasm-edge-executor/edge-binary-format.js (binary format for bundles)
 * - core/node-code-bundle.js (node logic packaging)
 * - See DESIGN_SYSTEM.md § Dependency Resolution
 * 
 * Performance Budget: Resolution must complete within 100ms for typical graphs
 * Memory Budget: Dependency graph metadata < 5MB
 * 
 * @module core/dependency-resolver
 */

/**
 * Dependency types tracked by the resolver
 * @enum {string}
 */
export const DependencyType = {
  WASM_MODULE: 'wasm_module',
  NODE_CODE: 'node_code',
  SHADER: 'shader',
  AUDIO_PROCESSOR: 'audio_processor',
  SCHEMA: 'schema',
  RESOURCE: 'resource',
  EVENT_HANDLER: 'event_handler'
};

/**
 * Resolution status for dependencies
 * @enum {string}
 */
export const ResolutionStatus = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  FAILED: 'failed',
  CACHED: 'cached'
};

/**
 * @typedef {Object} Dependency
 * @property {string} id - Unique identifier for the dependency
 * @property {DependencyType} type - Type of dependency
 * @property {string} source - Source path or identifier
 * @property {string[]} dependsOn - IDs of dependencies this depends on
 * @property {ResolutionStatus} status - Current resolution status
 * @property {ArrayBuffer|string|null} content - Resolved content
 * @property {number} size - Size in bytes
 * @property {string} hash - Content hash for caching
 * @property {Object} metadata - Additional metadata
 */

/**
 * @typedef {Object} DependencyBundle
 * @property {string} bundleId - Unique bundle identifier
 * @property {Dependency[]} dependencies - All resolved dependencies
 * @property {Map<string, number>} index - Fast lookup by dependency ID
 * @property {number} totalSize - Total bundle size in bytes
 * @property {string[]} entryPoints - Entry point dependency IDs
 * @property {Object} manifest - Bundle manifest metadata
 */

/**
 * DependencyResolver - Resolves and bundles dependencies for isolated execution
 * 
 * Algorithm:
 * 1. Analyze graph/module to discover all dependencies
 * 2. Build dependency tree with transitive dependencies
 * 3. Resolve each dependency (fetch, compile, validate)
 * 4. Create topologically sorted bundle
 * 5. Generate manifest with metadata
 * 
 * @class
 */
export class DependencyResolver {
  constructor() {
    /** @type {Map<string, Dependency>} */
    this.dependencies = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.dependencyGraph = new Map();
    
    /** @type {Map<string, ArrayBuffer>} */
    this.cache = new Map();
    
    /** @type {Set<string>} */
    this.resolving = new Set();
    
    this.maxBundleSize = 50 * 1024 * 1024; // 50MB limit
    this.resolutionTimeout = 30000; // 30s timeout
  }

  /**
   * Analyze a node graph to discover all dependencies
   * 
   * @param {Object} graph - Node graph to analyze
   * @returns {Promise<string[]>} Array of discovered dependency IDs
   */
  async analyzeGraph(graph) {
    const discoveredDeps = [];
    
    if (!graph || !graph.nodes) {
      console.warn('[DependencyResolver] Invalid graph structure');
      return discoveredDeps;
    }

    for (const node of graph.nodes) {
      // Node code dependency
      if (node.code || node.codeUrl) {
        const depId = this._createDependencyId(DependencyType.NODE_CODE, node.id);
        discoveredDeps.push(depId);
        
        this.dependencies.set(depId, {
          id: depId,
          type: DependencyType.NODE_CODE,
          source: node.codeUrl || `inline:${node.id}`,
          dependsOn: [],
          status: ResolutionStatus.PENDING,
          content: node.code || null,
          size: 0,
          hash: '',
          metadata: { nodeId: node.id, nodeType: node.type }
        });
      }

      // WASM module dependency
      if (node.wasmModule) {
        const depId = this._createDependencyId(DependencyType.WASM_MODULE, node.wasmModule);
        discoveredDeps.push(depId);
        
        this.dependencies.set(depId, {
          id: depId,
          type: DependencyType.WASM_MODULE,
          source: node.wasmModule,
          dependsOn: [],
          status: ResolutionStatus.PENDING,
          content: null,
          size: 0,
          hash: '',
          metadata: { nodeId: node.id }
        });
      }

      // Shader dependency (for GPU nodes)
      if (node.shader) {
        const depId = this._createDependencyId(DependencyType.SHADER, node.shader);
        discoveredDeps.push(depId);
        
        this.dependencies.set(depId, {
          id: depId,
          type: DependencyType.SHADER,
          source: node.shader,
          dependsOn: [],
          status: ResolutionStatus.PENDING,
          content: null,
          size: 0,
          hash: '',
          metadata: { nodeId: node.id }
        });
      }

      // Audio processor dependency
      if (node.audioProcessor) {
        const depId = this._createDependencyId(DependencyType.AUDIO_PROCESSOR, node.audioProcessor);
        discoveredDeps.push(depId);
        
        this.dependencies.set(depId, {
          id: depId,
          type: DependencyType.AUDIO_PROCESSOR,
          source: node.audioProcessor,
          dependsOn: [],
          status: ResolutionStatus.PENDING,
          content: null,
          size: 0,
          hash: '',
          metadata: { nodeId: node.id }
        });
      }
    }

    return discoveredDeps;
  }

  /**
   * Resolve all dependencies and create a bundle
   * 
   * @param {string[]} entryPoints - Entry point dependency IDs
   * @returns {Promise<DependencyBundle>} Resolved dependency bundle
   */
  async resolveAndBundle(entryPoints) {
    const startTime = performance.now();
    
    // Build complete dependency tree
    const allDeps = await this._buildDependencyTree(entryPoints);
    
    // Resolve each dependency
    const resolvedDeps = [];
    for (const depId of allDeps) {
      const dep = await this._resolveDependency(depId);
      if (dep) {
        resolvedDeps.push(dep);
      }
    }

    // Topological sort for correct loading order
    const sortedDeps = this._topologicalSort(resolvedDeps);

    // Calculate total size
    const totalSize = sortedDeps.reduce((sum, dep) => sum + dep.size, 0);
    
    if (totalSize > this.maxBundleSize) {
      throw new Error(`Bundle size ${totalSize} exceeds maximum ${this.maxBundleSize}`);
    }

    // Create bundle
    const bundle = {
      bundleId: this._generateBundleId(),
      dependencies: sortedDeps,
      index: this._buildIndex(sortedDeps),
      totalSize,
      entryPoints,
      manifest: this._generateManifest(sortedDeps, entryPoints)
    };

    const elapsed = performance.now() - startTime;
    console.log(`[DependencyResolver] Bundled ${sortedDeps.length} dependencies in ${elapsed.toFixed(2)}ms`);

    return bundle;
  }

  /**
   * Build complete dependency tree with transitive dependencies
   * 
   * @private
   * @param {string[]} entryPoints - Entry point dependency IDs
   * @returns {Promise<string[]>} All dependency IDs in tree
   */
  async _buildDependencyTree(entryPoints) {
    const visited = new Set();
    const queue = [...entryPoints];

    while (queue.length > 0) {
      const depId = queue.shift();
      
      if (visited.has(depId)) continue;
      visited.add(depId);

      const dep = this.dependencies.get(depId);
      if (!dep) {
        console.warn(`[DependencyResolver] Unknown dependency: ${depId}`);
        continue;
      }

      // Add transitive dependencies to queue
      for (const childId of dep.dependsOn) {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      }
    }

    return Array.from(visited);
  }

  /**
   * Resolve a single dependency
   * 
   * @private
   * @param {string} depId - Dependency ID to resolve
   * @returns {Promise<Dependency|null>} Resolved dependency or null on failure
   */
  async _resolveDependency(depId) {
    const dep = this.dependencies.get(depId);
    if (!dep) return null;

    // Check if already resolved
    if (dep.status === ResolutionStatus.RESOLVED) {
      return dep;
    }

    // Check cache
    const cached = this.cache.get(depId);
    if (cached) {
      dep.content = cached;
      dep.status = ResolutionStatus.CACHED;
      dep.size = cached.byteLength || cached.length;
      return dep;
    }

    // Prevent circular resolution
    if (this.resolving.has(depId)) {
      throw new Error(`Circular dependency detected: ${depId}`);
    }

    this.resolving.add(depId);

    try {
      // Resolve based on type
      switch (dep.type) {
        case DependencyType.WASM_MODULE:
          await this._resolveWasmModule(dep);
          break;
        case DependencyType.NODE_CODE:
          await this._resolveNodeCode(dep);
          break;
        case DependencyType.SHADER:
          await this._resolveShader(dep);
          break;
        case DependencyType.AUDIO_PROCESSOR:
          await this._resolveAudioProcessor(dep);
          break;
        default:
          await this._resolveGeneric(dep);
      }

      // Calculate hash
      dep.hash = await this._calculateHash(dep.content);
      
      // Cache resolved content
      this.cache.set(depId, dep.content);
      
      dep.status = ResolutionStatus.RESOLVED;
      return dep;

    } catch (error) {
      console.error(`[DependencyResolver] Failed to resolve ${depId}:`, error);
      dep.status = ResolutionStatus.FAILED;
      return null;
    } finally {
      this.resolving.delete(depId);
    }
  }

  /**
   * Resolve WASM module dependency
   * 
   * @private
   * @param {Dependency} dep - Dependency to resolve
   */
  async _resolveWasmModule(dep) {
    if (dep.content) {
      dep.size = dep.content.byteLength;
      return;
    }

    // Fetch WASM module
    const response = await fetch(dep.source);
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM module: ${response.statusText}`);
    }

    dep.content = await response.arrayBuffer();
    dep.size = dep.content.byteLength;

    // Validate WASM format
    const magic = new Uint8Array(dep.content, 0, 4);
    if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6D) {
      throw new Error('Invalid WASM magic number');
    }
  }

  /**
   * Resolve node code dependency
   * 
   * @private
   * @param {Dependency} dep - Dependency to resolve
   */
  async _resolveNodeCode(dep) {
    if (dep.content) {
      dep.size = dep.content.length;
      return;
    }

    if (dep.source.startsWith('inline:')) {
      throw new Error('Inline code must be provided in content field');
    }

    // Fetch node code
    const response = await fetch(dep.source);
    if (!response.ok) {
      throw new Error(`Failed to fetch node code: ${response.statusText}`);
    }

    dep.content = await response.text();
    dep.size = dep.content.length;
  }

  /**
   * Resolve shader dependency
   * 
   * @private
   * @param {Dependency} dep - Dependency to resolve
   */
  async _resolveShader(dep) {
    if (dep.content) {
      dep.size = dep.content.length;
      return;
    }

    // Fetch shader code
    const response = await fetch(dep.source);
    if (!response.ok) {
      throw new Error(`Failed to fetch shader: ${response.statusText}`);
    }

    dep.content = await response.text();
    dep.size = dep.content.length;

    // Basic WGSL validation
    if (!dep.content.includes('@vertex') && !dep.content.includes('@compute')) {
      console.warn(`[DependencyResolver] Shader ${dep.id} missing entry point`);
    }
  }

  /**
   * Resolve audio processor dependency
   * 
   * @private
   * @param {Dependency} dep - Dependency to resolve
   */
  async _resolveAudioProcessor(dep) {
    if (dep.content) {
      dep.size = dep.content.length;
      return;
    }

    // Fetch audio processor code
    const response = await fetch(dep.source);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio processor: ${response.statusText}`);
    }

    dep.content = await response.text();
    dep.size = dep.content.length;
  }

  /**
   * Resolve generic dependency
   * 
   * @private
   * @param {Dependency} dep - Dependency to resolve
   */
  async _resolveGeneric(dep) {
    const response = await fetch(dep.source);
    if (!response.ok) {
      throw new Error(`Failed to fetch dependency: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text')) {
      dep.content = await response.text();
      dep.size = dep.content.length;
    } else {
      dep.content = await response.arrayBuffer();
      dep.size = dep.content.byteLength;
    }
  }

  /**
   * Topological sort of dependencies for correct loading order
   * 
   * @private
   * @param {Dependency[]} deps - Dependencies to sort
   * @returns {Dependency[]} Sorted dependencies
   */
  _topologicalSort(deps) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (dep) => {
      if (visited.has(dep.id)) return;
      if (visiting.has(dep.id)) {
        throw new Error(`Circular dependency detected: ${dep.id}`);
      }

      visiting.add(dep.id);

      for (const childId of dep.dependsOn) {
        const childDep = deps.find(d => d.id === childId);
        if (childDep) {
          visit(childDep);
        }
      }

      visiting.delete(dep.id);
      visited.add(dep.id);
      sorted.push(dep);
    };

    for (const dep of deps) {
      visit(dep);
    }

    return sorted;
  }

  /**
   * Build fast lookup index
   * 
   * @private
   * @param {Dependency[]} deps - Dependencies to index
   * @returns {Map<string, number>} Index map
   */
  _buildIndex(deps) {
    const index = new Map();
    deps.forEach((dep, i) => {
      index.set(dep.id, i);
    });
    return index;
  }

  /**
   * Generate bundle manifest
   * 
   * @private
   * @param {Dependency[]} deps - Dependencies in bundle
   * @param {string[]} entryPoints - Entry point IDs
   * @returns {Object} Manifest metadata
   */
  _generateManifest(deps, entryPoints) {
    return {
      version: '1.0.0',
      created: new Date().toISOString(),
      entryPoints,
      dependencyCount: deps.length,
      typeBreakdown: this._getTypeBreakdown(deps),
      totalSize: deps.reduce((sum, dep) => sum + dep.size, 0),
      hashes: deps.map(dep => ({ id: dep.id, hash: dep.hash }))
    };
  }

  /**
   * Get breakdown of dependencies by type
   * 
   * @private
   * @param {Dependency[]} deps - Dependencies to analyze
   * @returns {Object} Type breakdown
   */
  _getTypeBreakdown(deps) {
    const breakdown = {};
    for (const dep of deps) {
      breakdown[dep.type] = (breakdown[dep.type] || 0) + 1;
    }
    return breakdown;
  }

  /**
   * Calculate content hash
   * 
   * @private
   * @param {ArrayBuffer|string} content - Content to hash
   * @returns {Promise<string>} Hash string
   */
  async _calculateHash(content) {
    const encoder = new TextEncoder();
    const data = typeof content === 'string' 
      ? encoder.encode(content)
      : new Uint8Array(content);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create dependency ID
   * 
   * @private
   * @param {DependencyType} type - Dependency type
   * @param {string} identifier - Unique identifier
   * @returns {string} Dependency ID
   */
  _createDependencyId(type, identifier) {
    return `${type}:${identifier}`;
  }

  /**
   * Generate unique bundle ID
   * 
   * @private
   * @returns {string} Bundle ID
   */
  _generateBundleId() {
    return `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[DependencyResolver] Cache cleared');
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    let totalSize = 0;
    for (const content of this.cache.values()) {
      totalSize += content.byteLength || content.length;
    }

    return {
      entries: this.cache.size,
      totalSize,
      averageSize: this.cache.size > 0 ? totalSize / this.cache.size : 0
    };
  }
}

/**
 * Singleton instance for global use
 */
export const dependencyResolver = new DependencyResolver();