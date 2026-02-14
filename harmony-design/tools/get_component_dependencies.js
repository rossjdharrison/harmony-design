/**
 * get_component_dependencies Tool
 * 
 * Traces composition chains in the design system graph to understand
 * component dependencies and relationships.
 * 
 * @module tools/get_component_dependencies
 * @see harmony-design/DESIGN_SYSTEM.md#composition-tracing
 */

import { TypeNavigator } from '../core/type-navigator.js';

/**
 * Direction for dependency traversal
 * @typedef {'upstream' | 'downstream' | 'both'} TraversalDirection
 * - upstream: What does this component depend on (composed_of)
 * - downstream: What depends on this component (used_by)
 * - both: Full dependency graph
 */

/**
 * Options for dependency query
 * @typedef {Object} DependencyQueryOptions
 * @property {string} componentId - ID of the component to trace
 * @property {TraversalDirection} [direction='both'] - Traversal direction
 * @property {number} [maxDepth=10] - Maximum depth to traverse
 * @property {boolean} [includePatterns=false] - Include inherited patterns
 * @property {string[]} [edgeTypes=['composes_of']] - Edge types to follow
 */

/**
 * Dependency node in the result tree
 * @typedef {Object} DependencyNode
 * @property {string} id - Component ID
 * @property {string} name - Component name
 * @property {string} type - Component type (atom, molecule, organism, etc.)
 * @property {number} depth - Depth in dependency tree
 * @property {string} relationship - Relationship type (composes_of, inherits_pattern, etc.)
 * @property {DependencyNode[]} dependencies - Child dependencies
 */

/**
 * Result of dependency query
 * @typedef {Object} DependencyQueryResult
 * @property {string} rootComponentId - Root component queried
 * @property {TraversalDirection} direction - Direction traversed
 * @property {number} totalDependencies - Total unique dependencies found
 * @property {number} maxDepthReached - Maximum depth reached
 * @property {DependencyNode} tree - Dependency tree
 * @property {string[]} flatList - Flat list of all dependency IDs
 * @property {Object.<string, number>} depthMap - Map of component ID to minimum depth
 */

/**
 * Get component dependencies by tracing composition chains
 * 
 * @param {DependencyQueryOptions} options - Query options
 * @returns {Promise<DependencyQueryResult>} Dependency information
 * @throws {Error} If component not found or query fails
 * 
 * @example
 * // Get all dependencies of a button component
 * const deps = await getComponentDependencies({
 *   componentId: 'button-primary',
 *   direction: 'upstream',
 *   maxDepth: 5
 * });
 * 
 * @example
 * // Find what uses a specific atom
 * const usages = await getComponentDependencies({
 *   componentId: 'icon-base',
 *   direction: 'downstream',
 *   includePatterns: true
 * });
 */
export async function getComponentDependencies(options) {
  const {
    componentId,
    direction = 'both',
    maxDepth = 10,
    includePatterns = false,
    edgeTypes = ['composes_of']
  } = options;

  // Validate inputs
  if (!componentId) {
    throw new Error('componentId is required');
  }

  if (!['upstream', 'downstream', 'both'].includes(direction)) {
    throw new Error(`Invalid direction: ${direction}. Must be upstream, downstream, or both`);
  }

  if (maxDepth < 1) {
    throw new Error('maxDepth must be at least 1');
  }

  // Initialize TypeNavigator
  const navigator = new TypeNavigator();
  await navigator.initialize();

  // Verify root component exists
  const rootComponent = await navigator.getNodeById(componentId);
  if (!rootComponent) {
    throw new Error(`Component not found: ${componentId}`);
  }

  // Determine which edge types to follow
  const edgeTypesToFollow = [...edgeTypes];
  if (includePatterns) {
    edgeTypesToFollow.push('inherits_pattern');
  }

  // Track visited nodes to avoid cycles
  const visited = new Set();
  const depthMap = new Map();
  const flatList = new Set();

  /**
   * Recursively traverse dependencies
   * @param {string} nodeId - Current node ID
   * @param {number} currentDepth - Current depth
   * @param {string} relationshipType - Type of relationship to parent
   * @returns {Promise<DependencyNode>} Dependency node with children
   */
  async function traverse(nodeId, currentDepth, relationshipType = 'root') {
    // Check depth limit
    if (currentDepth > maxDepth) {
      return null;
    }

    // Get node data
    const node = await navigator.getNodeById(nodeId);
    if (!node) {
      return null;
    }

    // Track depth (use minimum depth if visited multiple times)
    if (!depthMap.has(nodeId) || depthMap.get(nodeId) > currentDepth) {
      depthMap.set(nodeId, currentDepth);
    }

    // Add to flat list
    flatList.add(nodeId);

    // Create node structure
    const dependencyNode = {
      id: nodeId,
      name: node.name || nodeId,
      type: node.type || 'unknown',
      depth: currentDepth,
      relationship: relationshipType,
      dependencies: []
    };

    // Avoid infinite cycles
    if (visited.has(nodeId)) {
      dependencyNode.cycleDetected = true;
      return dependencyNode;
    }

    visited.add(nodeId);

    // Get edges based on direction
    let edges = [];
    
    if (direction === 'upstream' || direction === 'both') {
      // Get outgoing edges (what this component depends on)
      const outgoing = await navigator.getOutgoingEdges(nodeId);
      edges = edges.concat(
        outgoing.filter(edge => edgeTypesToFollow.includes(edge.type))
      );
    }

    if (direction === 'downstream' || direction === 'both') {
      // Get incoming edges (what depends on this component)
      const incoming = await navigator.getIncomingEdges(nodeId);
      edges = edges.concat(
        incoming.filter(edge => edgeTypesToFollow.includes(edge.type))
      );
    }

    // Traverse dependencies
    for (const edge of edges) {
      // Determine target based on edge direction
      const targetId = edge.target === nodeId ? edge.source : edge.target;
      
      const childNode = await traverse(
        targetId,
        currentDepth + 1,
        edge.type
      );

      if (childNode) {
        dependencyNode.dependencies.push(childNode);
      }
    }

    visited.delete(nodeId); // Allow revisiting in different branches
    return dependencyNode;
  }

  // Build dependency tree
  const tree = await traverse(componentId, 0);

  // Calculate statistics
  const totalDependencies = flatList.size - 1; // Exclude root
  const maxDepthReached = Math.max(...Array.from(depthMap.values()));

  return {
    rootComponentId: componentId,
    direction,
    totalDependencies,
    maxDepthReached,
    tree,
    flatList: Array.from(flatList),
    depthMap: Object.fromEntries(depthMap)
  };
}

/**
 * Find circular dependencies in composition chains
 * 
 * @param {string} componentId - Starting component ID
 * @returns {Promise<string[][]>} Array of circular dependency chains
 * 
 * @example
 * const cycles = await findCircularDependencies('button-primary');
 * // Returns: [['button-primary', 'icon', 'button-primary']]
 */
export async function findCircularDependencies(componentId) {
  const navigator = new TypeNavigator();
  await navigator.initialize();

  const cycles = [];
  const currentPath = [];
  const visited = new Set();

  /**
   * DFS to detect cycles
   * @param {string} nodeId - Current node
   */
  async function detectCycle(nodeId) {
    if (currentPath.includes(nodeId)) {
      // Found a cycle
      const cycleStart = currentPath.indexOf(nodeId);
      const cycle = currentPath.slice(cycleStart).concat(nodeId);
      cycles.push(cycle);
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    currentPath.push(nodeId);

    // Get outgoing composition edges
    const edges = await navigator.getOutgoingEdges(nodeId);
    const compositionEdges = edges.filter(e => e.type === 'composes_of');

    for (const edge of compositionEdges) {
      await detectCycle(edge.target);
    }

    currentPath.pop();
  }

  await detectCycle(componentId);
  return cycles;
}

/**
 * Get dependency statistics for a component
 * 
 * @param {string} componentId - Component ID
 * @returns {Promise<Object>} Dependency statistics
 * 
 * @example
 * const stats = await getDependencyStats('button-primary');
 * // Returns: { directDependencies: 3, totalDependencies: 8, dependents: 12 }
 */
export async function getDependencyStats(componentId) {
  const navigator = new TypeNavigator();
  await navigator.initialize();

  // Get direct dependencies (upstream)
  const outgoing = await navigator.getOutgoingEdges(componentId);
  const directDeps = outgoing.filter(e => e.type === 'composes_of');

  // Get total dependencies (recursive upstream)
  const upstreamResult = await getComponentDependencies({
    componentId,
    direction: 'upstream',
    maxDepth: 100
  });

  // Get dependents (downstream)
  const downstreamResult = await getComponentDependencies({
    componentId,
    direction: 'downstream',
    maxDepth: 100
  });

  return {
    directDependencies: directDeps.length,
    totalDependencies: upstreamResult.totalDependencies,
    dependents: downstreamResult.totalDependencies,
    maxDepth: upstreamResult.maxDepthReached
  };
}

/**
 * Find shortest path between two components
 * 
 * @param {string} fromId - Source component ID
 * @param {string} toId - Target component ID
 * @returns {Promise<string[]|null>} Shortest path or null if no path exists
 * 
 * @example
 * const path = await findShortestPath('button-primary', 'icon-base');
 * // Returns: ['button-primary', 'icon-wrapper', 'icon-base']
 */
export async function findShortestPath(fromId, toId) {
  const navigator = new TypeNavigator();
  await navigator.initialize();

  const queue = [[fromId]];
  const visited = new Set([fromId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === toId) {
      return path;
    }

    // Get all connected nodes
    const outgoing = await navigator.getOutgoingEdges(current);
    const compositionEdges = outgoing.filter(e => e.type === 'composes_of');

    for (const edge of compositionEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push([...path, edge.target]);
      }
    }
  }

  return null; // No path found
}