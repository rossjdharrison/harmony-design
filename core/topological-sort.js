/**
 * @fileoverview TopologicalSort: Kahn's algorithm for DAG ordering with cycle detection
 * 
 * Implements Kahn's algorithm for topological sorting of directed acyclic graphs (DAGs).
 * Detects cycles by tracking in-degree and identifying nodes that cannot be processed.
 * 
 * Key Features:
 * - O(V + E) time complexity
 * - Cycle detection via remaining nodes with non-zero in-degree
 * - Multiple valid orderings possible (returns one valid ordering)
 * - Supports partial ordering (processes subgraphs)
 * 
 * Related: See DESIGN_SYSTEM.md § Graph Engine - Topological Ordering
 * Related: core/graph-traversal.js for BFS/DFS traversal
 * Related: core/dependency-tracker.js for dependency analysis
 * 
 * @module core/topological-sort
 */

/**
 * Result of topological sort operation
 * @typedef {Object} TopologicalSortResult
 * @property {boolean} isDAG - True if graph is a DAG (no cycles)
 * @property {string[]} order - Topologically sorted node IDs (empty if cycles exist)
 * @property {string[]} cycleNodes - Node IDs involved in cycles (empty if no cycles)
 * @property {Map<string, number>} inDegrees - Final in-degree count for each node
 */

/**
 * Edge representation for topological sort
 * @typedef {Object} Edge
 * @property {string} from - Source node ID
 * @property {string} to - Target node ID
 */

/**
 * TopologicalSort implements Kahn's algorithm for DAG ordering
 * 
 * Algorithm:
 * 1. Calculate in-degree for all nodes (number of incoming edges)
 * 2. Add all nodes with in-degree 0 to queue
 * 3. While queue not empty:
 *    a. Remove node from queue, add to result
 *    b. For each outgoing edge, decrement target in-degree
 *    c. If target in-degree becomes 0, add to queue
 * 4. If all nodes processed, graph is DAG; otherwise, cycle exists
 * 
 * Performance:
 * - Time: O(V + E) where V = nodes, E = edges
 * - Space: O(V) for in-degree map and queue
 * 
 * @example
 * const sorter = new TopologicalSort();
 * const result = sorter.sort(nodes, edges);
 * if (result.isDAG) {
 *   console.log('Valid ordering:', result.order);
 * } else {
 *   console.error('Cycle detected in nodes:', result.cycleNodes);
 * }
 */
export class TopologicalSort {
  constructor() {
    /** @type {Map<string, number>} In-degree count for each node */
    this.inDegrees = new Map();
    
    /** @type {Map<string, string[]>} Adjacency list: node -> outgoing neighbors */
    this.adjacencyList = new Map();
    
    /** @type {Set<string>} All node IDs in graph */
    this.allNodes = new Set();
  }

  /**
   * Perform topological sort using Kahn's algorithm
   * 
   * @param {string[]} nodes - Array of node IDs
   * @param {Edge[]} edges - Array of directed edges
   * @returns {TopologicalSortResult} Sort result with ordering or cycle info
   */
  sort(nodes, edges) {
    this._initialize(nodes, edges);
    
    const queue = [];
    const order = [];
    
    // Step 1: Find all nodes with in-degree 0
    for (const nodeId of this.allNodes) {
      if (this.inDegrees.get(nodeId) === 0) {
        queue.push(nodeId);
      }
    }
    
    // Step 2: Process nodes in topological order
    while (queue.length > 0) {
      const nodeId = queue.shift();
      order.push(nodeId);
      
      // Step 3: Reduce in-degree of neighbors
      const neighbors = this.adjacencyList.get(nodeId) || [];
      for (const neighborId of neighbors) {
        const newInDegree = this.inDegrees.get(neighborId) - 1;
        this.inDegrees.set(neighborId, newInDegree);
        
        if (newInDegree === 0) {
          queue.push(neighborId);
        }
      }
    }
    
    // Step 4: Check if all nodes were processed
    const isDAG = order.length === this.allNodes.size;
    const cycleNodes = isDAG ? [] : this._findCycleNodes();
    
    return {
      isDAG,
      order: isDAG ? order : [],
      cycleNodes,
      inDegrees: new Map(this.inDegrees)
    };
  }

  /**
   * Initialize data structures for sorting
   * 
   * @private
   * @param {string[]} nodes - Array of node IDs
   * @param {Edge[]} edges - Array of directed edges
   */
  _initialize(nodes, edges) {
    this.inDegrees.clear();
    this.adjacencyList.clear();
    this.allNodes.clear();
    
    // Initialize all nodes with in-degree 0
    for (const nodeId of nodes) {
      this.allNodes.add(nodeId);
      this.inDegrees.set(nodeId, 0);
      this.adjacencyList.set(nodeId, []);
    }
    
    // Build adjacency list and calculate in-degrees
    for (const edge of edges) {
      const { from, to } = edge;
      
      // Add nodes if not already present (handles implicit nodes in edges)
      if (!this.allNodes.has(from)) {
        this.allNodes.add(from);
        this.inDegrees.set(from, 0);
        this.adjacencyList.set(from, []);
      }
      if (!this.allNodes.has(to)) {
        this.allNodes.add(to);
        this.inDegrees.set(to, 0);
        this.adjacencyList.set(to, []);
      }
      
      // Add edge to adjacency list
      this.adjacencyList.get(from).push(to);
      
      // Increment in-degree of target node
      this.inDegrees.set(to, this.inDegrees.get(to) + 1);
    }
  }

  /**
   * Find nodes involved in cycles (nodes with non-zero in-degree after sort)
   * 
   * @private
   * @returns {string[]} Array of node IDs involved in cycles
   */
  _findCycleNodes() {
    const cycleNodes = [];
    for (const [nodeId, inDegree] of this.inDegrees) {
      if (inDegree > 0) {
        cycleNodes.push(nodeId);
      }
    }
    return cycleNodes;
  }

  /**
   * Sort subgraph starting from specified root nodes
   * 
   * Only includes nodes reachable from roots in the sort.
   * Useful for processing dependency chains or component hierarchies.
   * 
   * @param {string[]} nodes - Array of all node IDs
   * @param {Edge[]} edges - Array of directed edges
   * @param {string[]} roots - Array of root node IDs to start from
   * @returns {TopologicalSortResult} Sort result for reachable subgraph
   */
  sortFromRoots(nodes, edges, roots) {
    // Find all nodes reachable from roots
    const reachable = this._findReachableNodes(nodes, edges, roots);
    
    // Filter edges to only include those within reachable nodes
    const reachableEdges = edges.filter(edge => 
      reachable.has(edge.from) && reachable.has(edge.to)
    );
    
    // Sort the subgraph
    return this.sort(Array.from(reachable), reachableEdges);
  }

  /**
   * Find all nodes reachable from root nodes via BFS
   * 
   * @private
   * @param {string[]} nodes - Array of all node IDs
   * @param {Edge[]} edges - Array of directed edges
   * @param {string[]} roots - Array of root node IDs
   * @returns {Set<string>} Set of reachable node IDs
   */
  _findReachableNodes(nodes, edges, roots) {
    // Build adjacency list for traversal
    const adjacency = new Map();
    for (const nodeId of nodes) {
      adjacency.set(nodeId, []);
    }
    for (const edge of edges) {
      if (!adjacency.has(edge.from)) {
        adjacency.set(edge.from, []);
      }
      adjacency.get(edge.from).push(edge.to);
    }
    
    // BFS from roots
    const reachable = new Set(roots);
    const queue = [...roots];
    
    while (queue.length > 0) {
      const nodeId = queue.shift();
      const neighbors = adjacency.get(nodeId) || [];
      
      for (const neighborId of neighbors) {
        if (!reachable.has(neighborId)) {
          reachable.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
    
    return reachable;
  }

  /**
   * Detect if graph contains any cycles
   * 
   * Lightweight check without computing full ordering.
   * 
   * @param {string[]} nodes - Array of node IDs
   * @param {Edge[]} edges - Array of directed edges
   * @returns {boolean} True if graph contains cycles
   */
  hasCycles(nodes, edges) {
    const result = this.sort(nodes, edges);
    return !result.isDAG;
  }

  /**
   * Get all nodes with no dependencies (in-degree 0)
   * 
   * These are valid starting points for execution or processing.
   * 
   * @param {string[]} nodes - Array of node IDs
   * @param {Edge[]} edges - Array of directed edges
   * @returns {string[]} Array of node IDs with no incoming edges
   */
  getRootNodes(nodes, edges) {
    this._initialize(nodes, edges);
    
    const roots = [];
    for (const [nodeId, inDegree] of this.inDegrees) {
      if (inDegree === 0) {
        roots.push(nodeId);
      }
    }
    
    return roots;
  }

  /**
   * Get all nodes with no dependents (out-degree 0)
   * 
   * These are leaf nodes in the dependency graph.
   * 
   * @param {string[]} nodes - Array of node IDs
   * @param {Edge[]} edges - Array of directed edges
   * @returns {string[]} Array of node IDs with no outgoing edges
   */
  getLeafNodes(nodes, edges) {
    this._initialize(nodes, edges);
    
    const leaves = [];
    for (const [nodeId, neighbors] of this.adjacencyList) {
      if (neighbors.length === 0) {
        leaves.push(nodeId);
      }
    }
    
    return leaves;
  }
}

/**
 * Convenience function for one-off topological sort
 * 
 * @param {string[]} nodes - Array of node IDs
 * @param {Edge[]} edges - Array of directed edges
 * @returns {TopologicalSortResult} Sort result
 */
export function topologicalSort(nodes, edges) {
  const sorter = new TopologicalSort();
  return sorter.sort(nodes, edges);
}

/**
 * Convenience function for cycle detection
 * 
 * @param {string[]} nodes - Array of node IDs
 * @param {Edge[]} edges - Array of directed edges
 * @returns {boolean} True if graph contains cycles
 */
export function hasCycles(nodes, edges) {
  const sorter = new TopologicalSort();
  return sorter.hasCycles(nodes, edges);
}