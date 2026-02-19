/**
 * @fileoverview DependencyResolver - Resolves execution order respecting all dependencies
 * 
 * Uses Kahn's algorithm via TopologicalSort to determine safe execution order.
 * Detects circular dependencies and provides detailed error information.
 * 
 * @module harmony-graph/dependency-resolver
 * @see harmony-design/DESIGN_SYSTEM.md#dependency-resolver
 */

import { TopologicalSort } from './topological-sort.js';
import { DependencyTracker } from './dependency-tracker.js';

/**
 * @typedef {Object} ResolutionResult
 * @property {boolean} success - Whether resolution succeeded
 * @property {string[]} order - Execution order (empty if failed)
 * @property {string[][]} cycles - Detected cycles (empty if none)
 * @property {Map<string, string[]>} dependencies - Dependency map used
 * @property {string[]} errors - Error messages
 */

/**
 * @typedef {Object} DependencyNode
 * @property {string} id - Node identifier
 * @property {string[]} dependencies - IDs this node depends on
 * @property {*} [data] - Optional node data
 */

/**
 * Resolves execution order for nodes with dependencies.
 * 
 * Features:
 * - Topological sort for dependency ordering
 * - Circular dependency detection
 * - Missing dependency validation
 * - Batch resolution with shared state
 * - Incremental resolution for dynamic graphs
 * 
 * @class
 * @example
 * const resolver = new DependencyResolver();
 * 
 * // Simple resolution
 * const result = resolver.resolve([
 *   { id: 'a', dependencies: [] },
 *   { id: 'b', dependencies: ['a'] },
 *   { id: 'c', dependencies: ['a', 'b'] }
 * ]);
 * 
 * if (result.success) {
 *   result.order.forEach(id => execute(id));
 * } else {
 *   console.error('Cycles:', result.cycles);
 * }
 * 
 * @example
 * // With DependencyTracker integration
 * const tracker = new DependencyTracker();
 * tracker.addNode('a');
 * tracker.addNode('b', ['a']);
 * 
 * const resolver = new DependencyResolver();
 * const result = resolver.resolveFromTracker(tracker);
 */
export class DependencyResolver {
  constructor() {
    /**
     * @private
     * @type {TopologicalSort}
     */
    this._sorter = new TopologicalSort();
    
    /**
     * @private
     * @type {Map<string, DependencyNode>}
     */
    this._nodeCache = new Map();
    
    /**
     * @private
     * @type {number}
     */
    this._resolutionCount = 0;
  }

  /**
   * Resolves execution order for array of nodes.
   * 
   * @param {DependencyNode[]} nodes - Nodes to resolve
   * @returns {ResolutionResult} Resolution result
   */
  resolve(nodes) {
    this._resolutionCount++;
    
    const errors = [];
    const nodeMap = new Map();
    const dependencyMap = new Map();
    
    // Build node map
    for (const node of nodes) {
      if (!node.id) {
        errors.push('Node missing id');
        continue;
      }
      
      if (nodeMap.has(node.id)) {
        errors.push(`Duplicate node id: ${node.id}`);
        continue;
      }
      
      nodeMap.set(node.id, node);
      dependencyMap.set(node.id, node.dependencies || []);
    }
    
    // Validate dependencies exist
    for (const [nodeId, deps] of dependencyMap.entries()) {
      for (const depId of deps) {
        if (!nodeMap.has(depId)) {
          errors.push(`Node '${nodeId}' depends on missing node '${depId}'`);
        }
      }
    }
    
    // Early exit on validation errors
    if (errors.length > 0) {
      return {
        success: false,
        order: [],
        cycles: [],
        dependencies: dependencyMap,
        errors
      };
    }
    
    // Build graph for topological sort
    const graph = new Map();
    for (const [nodeId, deps] of dependencyMap.entries()) {
      graph.set(nodeId, deps);
    }
    
    // Perform topological sort
    const sortResult = this._sorter.sort(graph);
    
    if (sortResult.hasCycle) {
      return {
        success: false,
        order: [],
        cycles: sortResult.cycles,
        dependencies: dependencyMap,
        errors: [`Circular dependencies detected: ${sortResult.cycles.length} cycle(s)`]
      };
    }
    
    return {
      success: true,
      order: sortResult.order,
      cycles: [],
      dependencies: dependencyMap,
      errors: []
    };
  }

  /**
   * Resolves execution order from DependencyTracker.
   * 
   * @param {DependencyTracker} tracker - Dependency tracker
   * @returns {ResolutionResult} Resolution result
   */
  resolveFromTracker(tracker) {
    const nodes = [];
    
    for (const [nodeId, deps] of tracker.getDependencies().entries()) {
      nodes.push({
        id: nodeId,
        dependencies: Array.from(deps)
      });
    }
    
    return this.resolve(nodes);
  }

  /**
   * Resolves execution order from dependency map.
   * 
   * @param {Map<string, string[]>} dependencyMap - Map of node ID to dependency IDs
   * @returns {ResolutionResult} Resolution result
   */
  resolveFromMap(dependencyMap) {
    const nodes = [];
    
    for (const [nodeId, deps] of dependencyMap.entries()) {
      nodes.push({
        id: nodeId,
        dependencies: Array.isArray(deps) ? deps : Array.from(deps)
      });
    }
    
    return this.resolve(nodes);
  }

  /**
   * Resolves execution order for subset of nodes.
   * Only includes specified nodes and their dependencies.
   * 
   * @param {DependencyNode[]} allNodes - All available nodes
   * @param {string[]} targetIds - IDs of nodes to execute
   * @returns {ResolutionResult} Resolution result
   */
  resolveSubset(allNodes, targetIds) {
    const nodeMap = new Map();
    for (const node of allNodes) {
      nodeMap.set(node.id, node);
    }
    
    const required = new Set();
    const toProcess = [...targetIds];
    
    // Find all required dependencies
    while (toProcess.length > 0) {
      const nodeId = toProcess.shift();
      
      if (required.has(nodeId)) {
        continue;
      }
      
      const node = nodeMap.get(nodeId);
      if (!node) {
        continue;
      }
      
      required.add(nodeId);
      
      if (node.dependencies) {
        toProcess.push(...node.dependencies);
      }
    }
    
    // Resolve only required nodes
    const subsetNodes = allNodes.filter(node => required.has(node.id));
    return this.resolve(subsetNodes);
  }

  /**
   * Finds all nodes that depend on given node (reverse dependencies).
   * 
   * @param {DependencyNode[]} nodes - All nodes
   * @param {string} nodeId - Node to find dependents for
   * @returns {string[]} IDs of nodes that depend on this node
   */
  findDependents(nodes, nodeId) {
    const dependents = [];
    
    for (const node of nodes) {
      if (node.dependencies && node.dependencies.includes(nodeId)) {
        dependents.push(node.id);
      }
    }
    
    return dependents;
  }

  /**
   * Finds all transitive dependencies of a node.
   * 
   * @param {DependencyNode[]} nodes - All nodes
   * @param {string} nodeId - Node to find dependencies for
   * @returns {string[]} All transitive dependency IDs
   */
  findAllDependencies(nodes, nodeId) {
    const nodeMap = new Map();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }
    
    const allDeps = new Set();
    const toProcess = [nodeId];
    const processed = new Set();
    
    while (toProcess.length > 0) {
      const currentId = toProcess.shift();
      
      if (processed.has(currentId)) {
        continue;
      }
      
      processed.add(currentId);
      
      const node = nodeMap.get(currentId);
      if (!node || !node.dependencies) {
        continue;
      }
      
      for (const depId of node.dependencies) {
        allDeps.add(depId);
        toProcess.push(depId);
      }
    }
    
    return Array.from(allDeps);
  }

  /**
   * Validates that adding a new dependency would not create a cycle.
   * 
   * @param {DependencyNode[]} nodes - Existing nodes
   * @param {string} fromId - Node that would depend on toId
   * @param {string} toId - Node that fromId would depend on
   * @returns {{ valid: boolean, reason?: string }} Validation result
   */
  validateNewDependency(nodes, fromId, toId) {
    // Check if adding this dependency would create a cycle
    const allDeps = this.findAllDependencies(nodes, toId);
    
    if (allDeps.includes(fromId)) {
      return {
        valid: false,
        reason: `Would create cycle: ${toId} already depends on ${fromId}`
      };
    }
    
    return { valid: true };
  }

  /**
   * Resolves execution order in batches (layers).
   * Nodes in same layer have no dependencies on each other.
   * 
   * @param {DependencyNode[]} nodes - Nodes to resolve
   * @returns {{ success: boolean, layers: string[][], errors: string[] }} Batched result
   */
  resolveInLayers(nodes) {
    const result = this.resolve(nodes);
    
    if (!result.success) {
      return {
        success: false,
        layers: [],
        errors: result.errors
      };
    }
    
    // Build reverse dependency map
    const dependents = new Map();
    for (const node of nodes) {
      dependents.set(node.id, []);
    }
    
    for (const node of nodes) {
      if (node.dependencies) {
        for (const depId of node.dependencies) {
          if (dependents.has(depId)) {
            dependents.get(depId).push(node.id);
          }
        }
      }
    }
    
    // Build layers
    const layers = [];
    const processed = new Set();
    const remaining = new Set(result.order);
    
    while (remaining.size > 0) {
      const layer = [];
      
      for (const nodeId of remaining) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;
        
        // Can execute if all dependencies processed
        const deps = node.dependencies || [];
        const canExecute = deps.every(depId => processed.has(depId));
        
        if (canExecute) {
          layer.push(nodeId);
        }
      }
      
      if (layer.length === 0) {
        // Should not happen if topological sort succeeded
        return {
          success: false,
          layers: [],
          errors: ['Failed to build layers - possible bug']
        };
      }
      
      layers.push(layer);
      
      for (const nodeId of layer) {
        processed.add(nodeId);
        remaining.delete(nodeId);
      }
    }
    
    return {
      success: true,
      layers,
      errors: []
    };
  }

  /**
   * Gets statistics about resolver usage.
   * 
   * @returns {{ resolutionCount: number, cacheSize: number }} Statistics
   */
  getStats() {
    return {
      resolutionCount: this._resolutionCount,
      cacheSize: this._nodeCache.size
    };
  }

  /**
   * Clears internal caches.
   */
  clearCache() {
    this._nodeCache.clear();
  }
}