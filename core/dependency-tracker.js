/**
 * @fileoverview DependencyTracker - Auto-discovers which nodes depend on which for invalidation
 * 
 * The DependencyTracker monitors node connections and data flow to build a dependency graph.
 * When a node changes, it can efficiently determine which downstream nodes need invalidation.
 * 
 * Key features:
 * - Automatic dependency discovery through edge analysis
 * - Bidirectional dependency mapping (dependents and dependencies)
 * - Transitive dependency resolution
 * - Cycle detection to prevent infinite invalidation loops
 * - Memory-efficient storage using WeakMaps where possible
 * 
 * Performance targets:
 * - Dependency lookup: O(1) for direct dependencies
 * - Transitive resolution: O(n) where n is dependency depth
 * - Memory overhead: <100 bytes per node
 * 
 * Related: reactive-node.js, computed-edge.js, propagation-queue.js
 * See: DESIGN_SYSTEM.md § Graph Engine - Dependency Management
 * 
 * @module core/dependency-tracker
 */

/**
 * Represents a dependency relationship between nodes
 * @typedef {Object} DependencyRelation
 * @property {string} sourceId - Node that provides data
 * @property {string} targetId - Node that depends on data
 * @property {string} edgeId - Edge connecting the nodes
 * @property {string} [dataKey] - Specific data key being tracked (optional)
 * @property {number} timestamp - When dependency was established
 */

/**
 * Result of transitive dependency resolution
 * @typedef {Object} TransitiveDependencies
 * @property {Set<string>} direct - Immediate dependents
 * @property {Set<string>} transitive - All downstream dependents
 * @property {number} depth - Maximum dependency chain depth
 * @property {boolean} hasCycle - Whether a cycle was detected
 */

/**
 * Configuration for dependency tracking behavior
 * @typedef {Object} DependencyTrackerConfig
 * @property {boolean} trackTransitive - Whether to compute transitive closures
 * @property {number} maxDepth - Maximum depth for transitive resolution (default: 50)
 * @property {boolean} detectCycles - Whether to detect and warn about cycles
 * @property {boolean} autoCleanup - Whether to cleanup orphaned dependencies
 */

/**
 * DependencyTracker auto-discovers and tracks node dependencies
 * 
 * Maintains bidirectional maps of dependencies:
 * - Forward map: node -> nodes that depend on it
 * - Reverse map: node -> nodes it depends on
 * 
 * @class
 */
export class DependencyTracker {
  /**
   * @param {DependencyTrackerConfig} [config={}] - Configuration options
   */
  constructor(config = {}) {
    /** @type {DependencyTrackerConfig} */
    this.config = {
      trackTransitive: true,
      maxDepth: 50,
      detectCycles: true,
      autoCleanup: true,
      ...config
    };

    /**
     * Forward map: nodeId -> Set of nodes that depend on it
     * @type {Map<string, Set<string>>}
     * @private
     */
    this._dependents = new Map();

    /**
     * Reverse map: nodeId -> Set of nodes it depends on
     * @type {Map<string, Set<string>>}
     * @private
     */
    this._dependencies = new Map();

    /**
     * Edge metadata for dependency relationships
     * @type {Map<string, DependencyRelation>}
     * @private
     */
    this._relations = new Map();

    /**
     * Cache for transitive dependency computations
     * @type {Map<string, TransitiveDependencies>}
     * @private
     */
    this._transitiveCache = new Map();

    /**
     * Timestamp of last modification for cache invalidation
     * @type {number}
     * @private
     */
    this._lastModified = Date.now();

    /**
     * Known cycles in the dependency graph
     * @type {Set<string>}
     * @private
     */
    this._knownCycles = new Set();
  }

  /**
   * Register a dependency relationship between nodes
   * 
   * @param {string} sourceId - Node providing data
   * @param {string} targetId - Node consuming data
   * @param {string} edgeId - Edge connecting them
   * @param {string} [dataKey] - Optional specific data key
   * @returns {boolean} True if dependency was added (false if duplicate)
   */
  addDependency(sourceId, targetId, edgeId, dataKey = null) {
    if (!sourceId || !targetId || !edgeId) {
      console.warn('[DependencyTracker] Invalid dependency parameters', {
        sourceId,
        targetId,
        edgeId
      });
      return false;
    }

    // Prevent self-dependencies
    if (sourceId === targetId) {
      console.warn('[DependencyTracker] Self-dependency detected', { sourceId });
      return false;
    }

    // Initialize sets if needed
    if (!this._dependents.has(sourceId)) {
      this._dependents.set(sourceId, new Set());
    }
    if (!this._dependencies.has(targetId)) {
      this._dependencies.set(targetId, new Set());
    }

    // Check if already exists
    const relationKey = this._makeRelationKey(sourceId, targetId, edgeId, dataKey);
    if (this._relations.has(relationKey)) {
      return false;
    }

    // Add bidirectional links
    this._dependents.get(sourceId).add(targetId);
    this._dependencies.get(targetId).add(sourceId);

    // Store relation metadata
    this._relations.set(relationKey, {
      sourceId,
      targetId,
      edgeId,
      dataKey,
      timestamp: Date.now()
    });

    // Invalidate caches
    this._invalidateCaches();

    // Check for cycles if enabled
    if (this.config.detectCycles) {
      this._detectCycle(targetId);
    }

    return true;
  }

  /**
   * Remove a dependency relationship
   * 
   * @param {string} sourceId - Node providing data
   * @param {string} targetId - Node consuming data
   * @param {string} edgeId - Edge connecting them
   * @param {string} [dataKey] - Optional specific data key
   * @returns {boolean} True if dependency was removed
   */
  removeDependency(sourceId, targetId, edgeId, dataKey = null) {
    const relationKey = this._makeRelationKey(sourceId, targetId, edgeId, dataKey);
    
    if (!this._relations.has(relationKey)) {
      return false;
    }

    // Remove from bidirectional maps
    const dependents = this._dependents.get(sourceId);
    if (dependents) {
      dependents.delete(targetId);
      if (dependents.size === 0 && this.config.autoCleanup) {
        this._dependents.delete(sourceId);
      }
    }

    const dependencies = this._dependencies.get(targetId);
    if (dependencies) {
      dependencies.delete(sourceId);
      if (dependencies.size === 0 && this.config.autoCleanup) {
        this._dependencies.delete(targetId);
      }
    }

    // Remove relation
    this._relations.delete(relationKey);

    // Invalidate caches
    this._invalidateCaches();

    return true;
  }

  /**
   * Get all nodes that directly depend on the given node
   * 
   * @param {string} nodeId - Node to query
   * @returns {Set<string>} Set of dependent node IDs
   */
  getDependents(nodeId) {
    return new Set(this._dependents.get(nodeId) || []);
  }

  /**
   * Get all nodes that the given node directly depends on
   * 
   * @param {string} nodeId - Node to query
   * @returns {Set<string>} Set of dependency node IDs
   */
  getDependencies(nodeId) {
    return new Set(this._dependencies.get(nodeId) || []);
  }

  /**
   * Get all transitive dependencies (full downstream tree)
   * 
   * @param {string} nodeId - Node to query
   * @returns {TransitiveDependencies} Direct and transitive dependents
   */
  getTransitiveDependents(nodeId) {
    // Check cache first
    const cached = this._transitiveCache.get(nodeId);
    if (cached) {
      return cached;
    }

    const direct = this.getDependents(nodeId);
    const transitive = new Set(direct);
    const visited = new Set([nodeId]);
    let maxDepth = 0;
    let hasCycle = false;

    // BFS to find all transitive dependents
    const queue = Array.from(direct).map(id => ({ id, depth: 1 }));

    while (queue.length > 0) {
      const { id, depth } = queue.shift();

      if (depth > this.config.maxDepth) {
        console.warn('[DependencyTracker] Max depth exceeded', {
          nodeId,
          depth,
          maxDepth: this.config.maxDepth
        });
        break;
      }

      maxDepth = Math.max(maxDepth, depth);

      if (visited.has(id)) {
        hasCycle = true;
        continue;
      }

      visited.add(id);

      const dependents = this._dependents.get(id);
      if (dependents) {
        for (const dependentId of dependents) {
          transitive.add(dependentId);
          queue.push({ id: dependentId, depth: depth + 1 });
        }
      }
    }

    const result = {
      direct,
      transitive,
      depth: maxDepth,
      hasCycle
    };

    // Cache if transitive tracking enabled
    if (this.config.trackTransitive) {
      this._transitiveCache.set(nodeId, result);
    }

    return result;
  }

  /**
   * Get all dependency relations for a specific edge
   * 
   * @param {string} edgeId - Edge to query
   * @returns {DependencyRelation[]} Array of relations using this edge
   */
  getRelationsByEdge(edgeId) {
    const relations = [];
    for (const relation of this._relations.values()) {
      if (relation.edgeId === edgeId) {
        relations.push({ ...relation });
      }
    }
    return relations;
  }

  /**
   * Remove all dependencies for a node (when node is deleted)
   * 
   * @param {string} nodeId - Node to remove
   * @returns {number} Number of relations removed
   */
  removeNode(nodeId) {
    let count = 0;

    // Remove as source (all dependents)
    const dependents = this._dependents.get(nodeId);
    if (dependents) {
      for (const targetId of dependents) {
        // Find and remove all relations
        for (const [key, relation] of this._relations.entries()) {
          if (relation.sourceId === nodeId && relation.targetId === targetId) {
            this._relations.delete(key);
            count++;
          }
        }

        // Remove from reverse map
        const deps = this._dependencies.get(targetId);
        if (deps) {
          deps.delete(nodeId);
        }
      }
      this._dependents.delete(nodeId);
    }

    // Remove as target (all dependencies)
    const dependencies = this._dependencies.get(nodeId);
    if (dependencies) {
      for (const sourceId of dependencies) {
        // Find and remove all relations
        for (const [key, relation] of this._relations.entries()) {
          if (relation.sourceId === sourceId && relation.targetId === nodeId) {
            this._relations.delete(key);
            count++;
          }
        }

        // Remove from forward map
        const deps = this._dependents.get(sourceId);
        if (deps) {
          deps.delete(nodeId);
        }
      }
      this._dependencies.delete(nodeId);
    }

    // Invalidate caches
    this._invalidateCaches();

    return count;
  }

  /**
   * Check if nodeB depends on nodeA (directly or transitively)
   * 
   * @param {string} nodeA - Potential dependency
   * @param {string} nodeB - Potential dependent
   * @returns {boolean} True if nodeB depends on nodeA
   */
  hasDependency(nodeA, nodeB) {
    const transitive = this.getTransitiveDependents(nodeA);
    return transitive.transitive.has(nodeB);
  }

  /**
   * Get statistics about the dependency graph
   * 
   * @returns {Object} Statistics object
   */
  getStats() {
    const nodeCount = new Set([
      ...this._dependents.keys(),
      ...this._dependencies.keys()
    ]).size;

    let totalDependents = 0;
    let maxDependents = 0;
    for (const deps of this._dependents.values()) {
      totalDependents += deps.size;
      maxDependents = Math.max(maxDependents, deps.size);
    }

    return {
      nodeCount,
      relationCount: this._relations.size,
      totalDependents,
      avgDependentsPerNode: nodeCount > 0 ? totalDependents / nodeCount : 0,
      maxDependents,
      cacheSize: this._transitiveCache.size,
      knownCycles: this._knownCycles.size,
      lastModified: this._lastModified
    };
  }

  /**
   * Clear all dependency tracking data
   */
  clear() {
    this._dependents.clear();
    this._dependencies.clear();
    this._relations.clear();
    this._transitiveCache.clear();
    this._knownCycles.clear();
    this._lastModified = Date.now();
  }

  /**
   * Create a unique key for a dependency relation
   * 
   * @private
   * @param {string} sourceId - Source node
   * @param {string} targetId - Target node
   * @param {string} edgeId - Edge ID
   * @param {string|null} dataKey - Optional data key
   * @returns {string} Unique relation key
   */
  _makeRelationKey(sourceId, targetId, edgeId, dataKey) {
    return dataKey
      ? `${sourceId}:${targetId}:${edgeId}:${dataKey}`
      : `${sourceId}:${targetId}:${edgeId}`;
  }

  /**
   * Invalidate all caches after modification
   * 
   * @private
   */
  _invalidateCaches() {
    this._transitiveCache.clear();
    this._lastModified = Date.now();
  }

  /**
   * Detect if adding a dependency would create a cycle
   * 
   * @private
   * @param {string} startNode - Node to check from
   * @returns {boolean} True if cycle detected
   */
  _detectCycle(startNode) {
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycleDFS = (nodeId) => {
      if (recursionStack.has(nodeId)) {
        this._knownCycles.add(nodeId);
        console.warn('[DependencyTracker] Cycle detected', {
          node: nodeId,
          stack: Array.from(recursionStack)
        });
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const dependencies = this._dependencies.get(nodeId);
      if (dependencies) {
        for (const depId of dependencies) {
          if (hasCycleDFS(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    return hasCycleDFS(startNode);
  }

  /**
   * Export dependency graph for visualization or debugging
   * 
   * @returns {Object} Serializable graph structure
   */
  export() {
    const nodes = new Set([
      ...this._dependents.keys(),
      ...this._dependencies.keys()
    ]);

    const edges = Array.from(this._relations.values()).map(rel => ({
      source: rel.sourceId,
      target: rel.targetId,
      edge: rel.edgeId,
      dataKey: rel.dataKey,
      timestamp: rel.timestamp
    }));

    return {
      nodes: Array.from(nodes),
      edges,
      stats: this.getStats(),
      timestamp: Date.now()
    };
  }
}

/**
 * Create a dependency tracker with default configuration
 * 
 * @param {DependencyTrackerConfig} [config] - Optional configuration
 * @returns {DependencyTracker} New tracker instance
 */
export function createDependencyTracker(config) {
  return new DependencyTracker(config);
}