/**
 * @fileoverview Iterator-based graph traversal with visitor pattern
 * Implements BFS and DFS algorithms that yield nodes lazily for memory efficiency
 * @module harmony-graph/graph-traversal
 */

/**
 * Visitor pattern interface for graph traversal
 * @typedef {Object} TraversalVisitor
 * @property {function(any, number): boolean|void} onVisit - Called when visiting a node. Return false to stop traversal.
 * @property {function(any, any): void} [onEdge] - Optional callback for edges
 * @property {function(): void} [onComplete] - Optional callback when traversal completes
 */

/**
 * Graph interface for traversal
 * @typedef {Object} TraversableGraph
 * @property {function(any): any[]} getNeighbors - Get neighbors of a node
 * @property {function(any): boolean} hasNode - Check if node exists
 */

/**
 * Breadth-First Search iterator
 * Yields nodes in BFS order, lazily computing the traversal
 * @class
 */
export class BFSIterator {
  /**
   * @param {TraversableGraph} graph - Graph to traverse
   * @param {any} startNode - Starting node
   * @param {TraversalVisitor} [visitor] - Optional visitor for callbacks
   */
  constructor(graph, startNode, visitor = null) {
    this.graph = graph;
    this.startNode = startNode;
    this.visitor = visitor;
    this.visited = new Set();
    this.queue = [];
    this.initialized = false;
    this.stopped = false;
  }

  /**
   * Initialize the traversal state
   * @private
   */
  _initialize() {
    if (!this.initialized) {
      this.queue.push({ node: this.startNode, depth: 0 });
      this.initialized = true;
    }
  }

  /**
   * Iterator protocol implementation
   * @returns {Iterator<{node: any, depth: number}>}
   */
  [Symbol.iterator]() {
    return this;
  }

  /**
   * Get next node in BFS order
   * @returns {{value: {node: any, depth: number}, done: boolean}}
   */
  next() {
    this._initialize();

    while (this.queue.length > 0 && !this.stopped) {
      const current = this.queue.shift();
      const { node, depth } = current;

      // Skip if already visited
      if (this.visited.has(node)) {
        continue;
      }

      this.visited.add(node);

      // Call visitor if provided
      if (this.visitor?.onVisit) {
        const shouldContinue = this.visitor.onVisit(node, depth);
        if (shouldContinue === false) {
          this.stopped = true;
          this.visitor.onComplete?.();
          return { value: current, done: false };
        }
      }

      // Enqueue neighbors
      if (this.graph.hasNode(node)) {
        const neighbors = this.graph.getNeighbors(node);
        for (const neighbor of neighbors) {
          if (!this.visited.has(neighbor)) {
            this.queue.push({ node: neighbor, depth: depth + 1 });
            
            // Call edge visitor if provided
            this.visitor?.onEdge?.(node, neighbor);
          }
        }
      }

      return { value: current, done: false };
    }

    // Traversal complete
    if (!this.stopped) {
      this.visitor?.onComplete?.();
    }
    return { done: true };
  }

  /**
   * Reset iterator to start over
   */
  reset() {
    this.visited.clear();
    this.queue = [];
    this.initialized = false;
    this.stopped = false;
  }
}

/**
 * Depth-First Search iterator
 * Yields nodes in DFS order, lazily computing the traversal
 * @class
 */
export class DFSIterator {
  /**
   * @param {TraversableGraph} graph - Graph to traverse
   * @param {any} startNode - Starting node
   * @param {TraversalVisitor} [visitor] - Optional visitor for callbacks
   */
  constructor(graph, startNode, visitor = null) {
    this.graph = graph;
    this.startNode = startNode;
    this.visitor = visitor;
    this.visited = new Set();
    this.stack = [];
    this.initialized = false;
    this.stopped = false;
  }

  /**
   * Initialize the traversal state
   * @private
   */
  _initialize() {
    if (!this.initialized) {
      this.stack.push({ node: this.startNode, depth: 0 });
      this.initialized = true;
    }
  }

  /**
   * Iterator protocol implementation
   * @returns {Iterator<{node: any, depth: number}>}
   */
  [Symbol.iterator]() {
    return this;
  }

  /**
   * Get next node in DFS order
   * @returns {{value: {node: any, depth: number}, done: boolean}}
   */
  next() {
    this._initialize();

    while (this.stack.length > 0 && !this.stopped) {
      const current = this.stack.pop();
      const { node, depth } = current;

      // Skip if already visited
      if (this.visited.has(node)) {
        continue;
      }

      this.visited.add(node);

      // Call visitor if provided
      if (this.visitor?.onVisit) {
        const shouldContinue = this.visitor.onVisit(node, depth);
        if (shouldContinue === false) {
          this.stopped = true;
          this.visitor.onComplete?.();
          return { value: current, done: false };
        }
      }

      // Push neighbors onto stack (in reverse for left-to-right traversal)
      if (this.graph.hasNode(node)) {
        const neighbors = this.graph.getNeighbors(node);
        for (let i = neighbors.length - 1; i >= 0; i--) {
          const neighbor = neighbors[i];
          if (!this.visited.has(neighbor)) {
            this.stack.push({ node: neighbor, depth: depth + 1 });
            
            // Call edge visitor if provided
            this.visitor?.onEdge?.(node, neighbor);
          }
        }
      }

      return { value: current, done: false };
    }

    // Traversal complete
    if (!this.stopped) {
      this.visitor?.onComplete?.();
    }
    return { done: true };
  }

  /**
   * Reset iterator to start over
   */
  reset() {
    this.visited.clear();
    this.stack = [];
    this.initialized = false;
    this.stopped = false;
  }
}

/**
 * High-level graph traversal utility
 * Provides convenient methods for common traversal patterns
 * @class
 */
export class GraphTraversal {
  /**
   * @param {TraversableGraph} graph - Graph to traverse
   */
  constructor(graph) {
    this.graph = graph;
  }

  /**
   * Create a BFS iterator from a starting node
   * @param {any} startNode - Starting node
   * @param {TraversalVisitor} [visitor] - Optional visitor
   * @returns {BFSIterator}
   */
  bfs(startNode, visitor = null) {
    return new BFSIterator(this.graph, startNode, visitor);
  }

  /**
   * Create a DFS iterator from a starting node
   * @param {any} startNode - Starting node
   * @param {TraversalVisitor} [visitor] - Optional visitor
   * @returns {DFSIterator}
   */
  dfs(startNode, visitor = null) {
    return new DFSIterator(this.graph, startNode, visitor);
  }

  /**
   * Find a node matching a predicate using BFS
   * @param {any} startNode - Starting node
   * @param {function(any): boolean} predicate - Test function
   * @returns {any|null} - Found node or null
   */
  findBFS(startNode, predicate) {
    const iterator = new BFSIterator(this.graph, startNode);
    for (const { node } of iterator) {
      if (predicate(node)) {
        return node;
      }
    }
    return null;
  }

  /**
   * Find a node matching a predicate using DFS
   * @param {any} startNode - Starting node
   * @param {function(any): boolean} predicate - Test function
   * @returns {any|null} - Found node or null
   */
  findDFS(startNode, predicate) {
    const iterator = new DFSIterator(this.graph, startNode);
    for (const { node } of iterator) {
      if (predicate(node)) {
        return node;
      }
    }
    return null;
  }

  /**
   * Collect all reachable nodes from start using BFS
   * @param {any} startNode - Starting node
   * @param {number} [maxDepth] - Optional max depth
   * @returns {any[]} - Array of reachable nodes
   */
  collectBFS(startNode, maxDepth = Infinity) {
    const nodes = [];
    const iterator = new BFSIterator(this.graph, startNode, {
      onVisit: (node, depth) => {
        if (depth > maxDepth) return false;
        nodes.push(node);
        return true;
      }
    });
    
    // Consume iterator
    for (const _ of iterator) { /* consume */ }
    
    return nodes;
  }

  /**
   * Collect all reachable nodes from start using DFS
   * @param {any} startNode - Starting node
   * @param {number} [maxDepth] - Optional max depth
   * @returns {any[]} - Array of reachable nodes
   */
  collectDFS(startNode, maxDepth = Infinity) {
    const nodes = [];
    const iterator = new DFSIterator(this.graph, startNode, {
      onVisit: (node, depth) => {
        if (depth > maxDepth) return false;
        nodes.push(node);
        return true;
      }
    });
    
    // Consume iterator
    for (const _ of iterator) { /* consume */ }
    
    return nodes;
  }

  /**
   * Check if a path exists between two nodes using BFS
   * @param {any} startNode - Starting node
   * @param {any} targetNode - Target node
   * @returns {boolean}
   */
  hasPath(startNode, targetNode) {
    return this.findBFS(startNode, node => node === targetNode) !== null;
  }

  /**
   * Find shortest path between two nodes using BFS
   * @param {any} startNode - Starting node
   * @param {any} targetNode - Target node
   * @returns {any[]|null} - Path as array of nodes, or null if no path
   */
  shortestPath(startNode, targetNode) {
    const parent = new Map();
    parent.set(startNode, null);
    
    const visitor = {
      onVisit: (node) => {
        if (node === targetNode) {
          return false; // Stop traversal
        }
        return true;
      },
      onEdge: (from, to) => {
        if (!parent.has(to)) {
          parent.set(to, from);
        }
      }
    };

    const iterator = new BFSIterator(this.graph, startNode, visitor);
    
    // Consume iterator
    for (const _ of iterator) { /* consume */ }

    // Reconstruct path if target was reached
    if (!parent.has(targetNode)) {
      return null;
    }

    const path = [];
    let current = targetNode;
    while (current !== null) {
      path.unshift(current);
      current = parent.get(current);
    }

    return path;
  }

  /**
   * Get all nodes at a specific depth from start
   * @param {any} startNode - Starting node
   * @param {number} targetDepth - Target depth
   * @returns {any[]} - Nodes at target depth
   */
  nodesAtDepth(startNode, targetDepth) {
    const nodes = [];
    const iterator = new BFSIterator(this.graph, startNode, {
      onVisit: (node, depth) => {
        if (depth === targetDepth) {
          nodes.push(node);
        }
        return depth <= targetDepth;
      }
    });
    
    // Consume iterator
    for (const _ of iterator) { /* consume */ }
    
    return nodes;
  }
}