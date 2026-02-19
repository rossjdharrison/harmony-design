/**
 * @fileoverview ShortestPath: Dijkstra and A* algorithms for weighted graph navigation
 * 
 * Provides optimal path finding in weighted graphs:
 * - Dijkstra: Guaranteed shortest path when all weights are non-negative
 * - A*: Heuristic-guided search for faster pathfinding with admissible heuristics
 * 
 * Performance targets:
 * - O(E log V) time complexity for Dijkstra
 * - Better than Dijkstra for A* with good heuristics
 * - Memory efficient with minimal allocations
 * 
 * @see DESIGN_SYSTEM.md#shortest-path-algorithms
 */

/**
 * @typedef {Object} PathResult
 * @property {string[]} path - Ordered array of node IDs from start to end
 * @property {number} cost - Total cost of the path
 * @property {number} nodesExplored - Number of nodes visited during search
 * @property {Map<string, number>} distances - Distance to each explored node
 * @property {Map<string, string|null>} previous - Previous node in optimal path
 */

/**
 * @typedef {Object} WeightedEdge
 * @property {string} from - Source node ID
 * @property {string} to - Target node ID
 * @property {number} weight - Edge weight (must be non-negative for Dijkstra)
 */

/**
 * @typedef {function(string, string): number} HeuristicFunction
 * Estimates cost from current node to goal. Must be admissible (never overestimate).
 */

/**
 * Priority queue entry for pathfinding
 * @private
 */
class PathNode {
  /**
   * @param {string} id - Node identifier
   * @param {number} priority - Priority value (lower = higher priority)
   * @param {number} cost - Actual cost from start
   */
  constructor(id, priority, cost) {
    this.id = id;
    this.priority = priority;
    this.cost = cost;
  }
}

/**
 * Min-heap priority queue optimized for pathfinding
 * @private
 */
class PathPriorityQueue {
  constructor() {
    /** @type {PathNode[]} */
    this.heap = [];
    /** @type {Map<string, number>} */
    this.positions = new Map();
  }

  /**
   * @param {string} id
   * @param {number} priority
   * @param {number} cost
   */
  enqueue(id, priority, cost) {
    const node = new PathNode(id, priority, cost);
    this.heap.push(node);
    const index = this.heap.length - 1;
    this.positions.set(id, index);
    this._bubbleUp(index);
  }

  /**
   * @returns {PathNode|null}
   */
  dequeue() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) {
      const node = this.heap.pop();
      this.positions.delete(node.id);
      return node;
    }

    const min = this.heap[0];
    const last = this.heap.pop();
    this.heap[0] = last;
    this.positions.delete(min.id);
    this.positions.set(last.id, 0);
    this._bubbleDown(0);
    return min;
  }

  /**
   * Update priority if node exists and new priority is lower
   * @param {string} id
   * @param {number} newPriority
   * @param {number} newCost
   * @returns {boolean} True if updated
   */
  decreasePriority(id, newPriority, newCost) {
    const index = this.positions.get(id);
    if (index === undefined) return false;

    const node = this.heap[index];
    if (newPriority >= node.priority) return false;

    node.priority = newPriority;
    node.cost = newCost;
    this._bubbleUp(index);
    return true;
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  contains(id) {
    return this.positions.has(id);
  }

  /**
   * @returns {boolean}
   */
  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * @returns {number}
   */
  size() {
    return this.heap.length;
  }

  /**
   * @private
   * @param {number} index
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].priority >= this.heap[parentIndex].priority) break;

      this._swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * @private
   * @param {number} index
   */
  _bubbleDown(index) {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && 
          this.heap[leftChild].priority < this.heap[minIndex].priority) {
        minIndex = leftChild;
      }

      if (rightChild < this.heap.length && 
          this.heap[rightChild].priority < this.heap[minIndex].priority) {
        minIndex = rightChild;
      }

      if (minIndex === index) break;

      this._swap(index, minIndex);
      index = minIndex;
    }
  }

  /**
   * @private
   * @param {number} i
   * @param {number} j
   */
  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
    this.positions.set(this.heap[i].id, i);
    this.positions.set(this.heap[j].id, j);
  }
}

/**
 * Dijkstra's algorithm for finding shortest path in weighted graph
 * 
 * Guarantees optimal solution when all edge weights are non-negative.
 * Time complexity: O((V + E) log V) with binary heap
 * Space complexity: O(V)
 * 
 * @param {WeightedEdge[]} edges - Graph edges with weights
 * @param {string} start - Starting node ID
 * @param {string} end - Target node ID
 * @returns {PathResult|null} Path result or null if no path exists
 * 
 * @example
 * const edges = [
 *   { from: 'A', to: 'B', weight: 4 },
 *   { from: 'A', to: 'C', weight: 2 },
 *   { from: 'C', to: 'B', weight: 1 }
 * ];
 * const result = dijkstra(edges, 'A', 'B');
 * // result.path = ['A', 'C', 'B']
 * // result.cost = 3
 */
export function dijkstra(edges, start, end) {
  // Build adjacency list
  const graph = buildAdjacencyList(edges);

  // Initialize data structures
  const distances = new Map();
  const previous = new Map();
  const queue = new PathPriorityQueue();
  let nodesExplored = 0;

  // Initialize start node
  distances.set(start, 0);
  previous.set(start, null);
  queue.enqueue(start, 0, 0);

  // Main algorithm loop
  while (!queue.isEmpty()) {
    const current = queue.dequeue();
    nodesExplored++;

    // Found target
    if (current.id === end) {
      return {
        path: reconstructPath(previous, start, end),
        cost: current.cost,
        nodesExplored,
        distances,
        previous
      };
    }

    // Skip if we've found a better path already
    if (current.cost > (distances.get(current.id) || Infinity)) {
      continue;
    }

    // Explore neighbors
    const neighbors = graph.get(current.id) || [];
    for (const { to, weight } of neighbors) {
      const newCost = current.cost + weight;
      const oldCost = distances.get(to);

      if (oldCost === undefined || newCost < oldCost) {
        distances.set(to, newCost);
        previous.set(to, current.id);

        if (queue.contains(to)) {
          queue.decreasePriority(to, newCost, newCost);
        } else {
          queue.enqueue(to, newCost, newCost);
        }
      }
    }
  }

  // No path found
  return null;
}

/**
 * A* algorithm for finding shortest path with heuristic guidance
 * 
 * More efficient than Dijkstra when a good heuristic is available.
 * Heuristic must be admissible (never overestimate) for optimality guarantee.
 * 
 * Time complexity: O((V + E) log V) worst case, often much better
 * Space complexity: O(V)
 * 
 * @param {WeightedEdge[]} edges - Graph edges with weights
 * @param {string} start - Starting node ID
 * @param {string} end - Target node ID
 * @param {HeuristicFunction} heuristic - Admissible heuristic function
 * @returns {PathResult|null} Path result or null if no path exists
 * 
 * @example
 * // Manhattan distance heuristic for grid
 * const heuristic = (from, to) => {
 *   const [x1, y1] = from.split(',').map(Number);
 *   const [x2, y2] = to.split(',').map(Number);
 *   return Math.abs(x2 - x1) + Math.abs(y2 - y1);
 * };
 * const result = aStar(edges, '0,0', '5,5', heuristic);
 */
export function aStar(edges, start, end, heuristic) {
  // Validate heuristic
  if (typeof heuristic !== 'function') {
    throw new Error('A* requires a heuristic function');
  }

  // Build adjacency list
  const graph = buildAdjacencyList(edges);

  // Initialize data structures
  const gScore = new Map(); // Actual cost from start
  const fScore = new Map(); // Estimated total cost (g + h)
  const previous = new Map();
  const queue = new PathPriorityQueue();
  let nodesExplored = 0;

  // Initialize start node
  gScore.set(start, 0);
  const h = heuristic(start, end);
  fScore.set(start, h);
  previous.set(start, null);
  queue.enqueue(start, h, 0);

  // Main algorithm loop
  while (!queue.isEmpty()) {
    const current = queue.dequeue();
    nodesExplored++;

    // Found target
    if (current.id === end) {
      return {
        path: reconstructPath(previous, start, end),
        cost: current.cost,
        nodesExplored,
        distances: gScore,
        previous
      };
    }

    // Skip if we've found a better path already
    if (current.cost > (gScore.get(current.id) || Infinity)) {
      continue;
    }

    // Explore neighbors
    const neighbors = graph.get(current.id) || [];
    for (const { to, weight } of neighbors) {
      const tentativeGScore = current.cost + weight;
      const oldGScore = gScore.get(to);

      if (oldGScore === undefined || tentativeGScore < oldGScore) {
        gScore.set(to, tentativeGScore);
        previous.set(to, current.id);
        
        const h = heuristic(to, end);
        const f = tentativeGScore + h;
        fScore.set(to, f);

        if (queue.contains(to)) {
          queue.decreasePriority(to, f, tentativeGScore);
        } else {
          queue.enqueue(to, f, tentativeGScore);
        }
      }
    }
  }

  // No path found
  return null;
}

/**
 * Find all shortest paths from a single source (Single-Source Shortest Path)
 * 
 * Computes shortest paths from start node to all reachable nodes.
 * Useful for computing distance maps or routing tables.
 * 
 * @param {WeightedEdge[]} edges - Graph edges with weights
 * @param {string} start - Starting node ID
 * @returns {Object} Object with distances and previous maps
 * 
 * @example
 * const result = singleSourceShortestPaths(edges, 'A');
 * const distanceToB = result.distances.get('B');
 * const pathToB = reconstructPath(result.previous, 'A', 'B');
 */
export function singleSourceShortestPaths(edges, start) {
  const graph = buildAdjacencyList(edges);
  const distances = new Map();
  const previous = new Map();
  const queue = new PathPriorityQueue();

  distances.set(start, 0);
  previous.set(start, null);
  queue.enqueue(start, 0, 0);

  while (!queue.isEmpty()) {
    const current = queue.dequeue();

    if (current.cost > (distances.get(current.id) || Infinity)) {
      continue;
    }

    const neighbors = graph.get(current.id) || [];
    for (const { to, weight } of neighbors) {
      const newCost = current.cost + weight;
      const oldCost = distances.get(to);

      if (oldCost === undefined || newCost < oldCost) {
        distances.set(to, newCost);
        previous.set(to, current.id);

        if (queue.contains(to)) {
          queue.decreasePriority(to, newCost, newCost);
        } else {
          queue.enqueue(to, newCost, newCost);
        }
      }
    }
  }

  return { distances, previous };
}

/**
 * Build adjacency list representation from edge list
 * @private
 * @param {WeightedEdge[]} edges
 * @returns {Map<string, Array<{to: string, weight: number}>>}
 */
function buildAdjacencyList(edges) {
  const graph = new Map();

  for (const edge of edges) {
    if (edge.weight < 0) {
      console.warn(`Negative weight detected: ${edge.from} -> ${edge.to} (${edge.weight})`);
    }

    if (!graph.has(edge.from)) {
      graph.set(edge.from, []);
    }
    graph.get(edge.from).push({ to: edge.to, weight: edge.weight });
  }

  return graph;
}

/**
 * Reconstruct path from previous pointers
 * @private
 * @param {Map<string, string|null>} previous
 * @param {string} start
 * @param {string} end
 * @returns {string[]}
 */
function reconstructPath(previous, start, end) {
  const path = [];
  let current = end;

  while (current !== null) {
    path.unshift(current);
    current = previous.get(current);
  }

  return path[0] === start ? path : [];
}

/**
 * Common heuristic functions for A*
 */
export const Heuristics = {
  /**
   * Euclidean distance (straight-line distance)
   * Admissible for any-direction movement
   * 
   * @param {Object} positions - Map of node IDs to {x, y} coordinates
   * @returns {HeuristicFunction}
   */
  euclidean(positions) {
    return (from, to) => {
      const fromPos = positions[from];
      const toPos = positions[to];
      if (!fromPos || !toPos) return 0;
      
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      return Math.sqrt(dx * dx + dy * dy);
    };
  },

  /**
   * Manhattan distance (taxicab distance)
   * Admissible for 4-directional movement
   * 
   * @param {Object} positions - Map of node IDs to {x, y} coordinates
   * @returns {HeuristicFunction}
   */
  manhattan(positions) {
    return (from, to) => {
      const fromPos = positions[from];
      const toPos = positions[to];
      if (!fromPos || !toPos) return 0;
      
      return Math.abs(toPos.x - fromPos.x) + Math.abs(toPos.y - fromPos.y);
    };
  },

  /**
   * Chebyshev distance (chessboard distance)
   * Admissible for 8-directional movement
   * 
   * @param {Object} positions - Map of node IDs to {x, y} coordinates
   * @returns {HeuristicFunction}
   */
  chebyshev(positions) {
    return (from, to) => {
      const fromPos = positions[from];
      const toPos = positions[to];
      if (!fromPos || !toPos) return 0;
      
      return Math.max(
        Math.abs(toPos.x - fromPos.x),
        Math.abs(toPos.y - fromPos.y)
      );
    };
  },

  /**
   * Zero heuristic (reduces A* to Dijkstra)
   * Always admissible but provides no guidance
   * 
   * @returns {HeuristicFunction}
   */
  zero() {
    return () => 0;
  }
};

/**
 * Validate that a heuristic is admissible
 * Checks if h(n) <= actual shortest path cost for sample nodes
 * 
 * @param {WeightedEdge[]} edges
 * @param {HeuristicFunction} heuristic
 * @param {string[]} sampleNodes - Nodes to test
 * @param {string} goal - Goal node
 * @returns {boolean} True if heuristic appears admissible
 */
export function validateHeuristic(edges, heuristic, sampleNodes, goal) {
  for (const node of sampleNodes) {
    const h = heuristic(node, goal);
    const result = dijkstra(edges, node, goal);
    
    if (result && h > result.cost) {
      console.warn(
        `Heuristic may not be admissible: h(${node}) = ${h} > actual cost ${result.cost}`
      );
      return false;
    }
  }
  return true;
}