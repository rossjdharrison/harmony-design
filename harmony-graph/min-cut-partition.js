/**
 * @fileoverview MinCutPartition: Minimize edges crossing partition boundaries
 * 
 * Implements minimum cut algorithms for graph partitioning:
 * - Stoer-Wagner algorithm for global minimum cut
 * - Karger's randomized algorithm for probabilistic min-cut
 * - Multi-way partitioning with iterative min-cuts
 * 
 * Performance targets:
 * - O(V³) for Stoer-Wagner on dense graphs
 * - O(E log V) for Karger's algorithm
 * - Maximum 16ms per frame for interactive partitioning
 * 
 * Related: See DESIGN_SYSTEM.md § Graph Algorithms → Partitioning
 * 
 * @module harmony-graph/min-cut-partition
 */

/**
 * Result of a minimum cut partition operation
 * @typedef {Object} MinCutResult
 * @property {Set<string>} partition1 - First partition node IDs
 * @property {Set<string>} partition2 - Second partition node IDs
 * @property {number} cutWeight - Total weight of edges crossing partition
 * @property {Array<{from: string, to: string, weight: number}>} cutEdges - Edges crossing partition
 * @property {string} algorithm - Algorithm used ('stoer-wagner' | 'karger')
 * @property {number} computeTimeMs - Time taken to compute
 */

/**
 * Configuration for min-cut partitioning
 * @typedef {Object} MinCutConfig
 * @property {string} algorithm - Algorithm to use ('stoer-wagner' | 'karger' | 'auto')
 * @property {number} [kargerIterations=100] - Number of iterations for Karger's algorithm
 * @property {boolean} [balanceConstraint=false] - Enforce balanced partition sizes
 * @property {number} [balanceTolerance=0.2] - Tolerance for balance constraint (0.0-1.0)
 * @property {number} [timeBudgetMs=15] - Maximum time budget per operation
 * @property {Function} [edgeWeight] - Custom edge weight function (edge) => number
 */

/**
 * MinCutPartitioner: Finds minimum cut partitions in graphs
 * 
 * Uses Stoer-Wagner for exact solutions and Karger's for large graphs.
 * Supports weighted edges and balance constraints.
 * 
 * @example
 * const partitioner = new MinCutPartitioner(graph, {
 *   algorithm: 'stoer-wagner',
 *   balanceConstraint: true
 * });
 * const result = partitioner.partition();
 * console.log(`Cut weight: ${result.cutWeight}`);
 */
export class MinCutPartitioner {
  /**
   * @param {Object} graph - Graph to partition
   * @param {MinCutConfig} config - Partitioning configuration
   */
  constructor(graph, config = {}) {
    this.graph = graph;
    this.config = {
      algorithm: 'auto',
      kargerIterations: 100,
      balanceConstraint: false,
      balanceTolerance: 0.2,
      timeBudgetMs: 15,
      edgeWeight: (edge) => edge.weight || 1,
      ...config
    };
    
    this.startTime = 0;
    this.nodeCount = 0;
    this.edgeCount = 0;
  }

  /**
   * Compute minimum cut partition
   * @returns {MinCutResult}
   */
  partition() {
    this.startTime = performance.now();
    
    // Build adjacency structure
    const adjacency = this._buildAdjacency();
    this.nodeCount = adjacency.size;
    this.edgeCount = this._countEdges(adjacency);
    
    // Select algorithm
    const algorithm = this._selectAlgorithm();
    
    let result;
    if (algorithm === 'stoer-wagner') {
      result = this._stoerWagner(adjacency);
    } else {
      result = this._karger(adjacency);
    }
    
    // Apply balance constraint if needed
    if (this.config.balanceConstraint && !this._isBalanced(result)) {
      result = this._rebalancePartition(result, adjacency);
    }
    
    const computeTimeMs = performance.now() - this.startTime;
    
    return {
      ...result,
      algorithm,
      computeTimeMs
    };
  }

  /**
   * Multi-way partition into k partitions
   * @param {number} k - Number of partitions
   * @returns {Array<Set<string>>} Array of partition node sets
   */
  partitionMultiWay(k) {
    if (k < 2) {
      throw new Error('k must be at least 2');
    }
    
    const adjacency = this._buildAdjacency();
    const partitions = [new Set(adjacency.keys())];
    
    // Iteratively split partitions using min-cut
    while (partitions.length < k) {
      // Find largest partition
      let largestIdx = 0;
      let largestSize = 0;
      
      partitions.forEach((partition, idx) => {
        if (partition.size > largestSize) {
          largestSize = partition.size;
          largestIdx = idx;
        }
      });
      
      // Split largest partition
      const subgraph = this._extractSubgraph(adjacency, partitions[largestIdx]);
      const result = this._stoerWagner(subgraph);
      
      // Replace largest partition with two new partitions
      partitions.splice(largestIdx, 1, result.partition1, result.partition2);
      
      // Check time budget
      if (performance.now() - this.startTime > this.config.timeBudgetMs) {
        console.warn(`MinCutPartitioner: Time budget exceeded, returning ${partitions.length} partitions`);
        break;
      }
    }
    
    return partitions;
  }

  /**
   * Build adjacency list with edge weights
   * @private
   * @returns {Map<string, Map<string, number>>}
   */
  _buildAdjacency() {
    const adjacency = new Map();
    
    // Initialize all nodes
    if (this.graph.nodes) {
      this.graph.nodes.forEach(node => {
        const nodeId = node.id || node;
        if (!adjacency.has(nodeId)) {
          adjacency.set(nodeId, new Map());
        }
      });
    }
    
    // Add edges
    if (this.graph.edges) {
      this.graph.edges.forEach(edge => {
        const from = edge.from || edge.source;
        const to = edge.to || edge.target;
        const weight = this.config.edgeWeight(edge);
        
        if (!adjacency.has(from)) {
          adjacency.set(from, new Map());
        }
        if (!adjacency.has(to)) {
          adjacency.set(to, new Map());
        }
        
        // Undirected graph
        adjacency.get(from).set(to, weight);
        adjacency.get(to).set(from, weight);
      });
    }
    
    return adjacency;
  }

  /**
   * Count total edges in adjacency structure
   * @private
   * @param {Map<string, Map<string, number>>} adjacency
   * @returns {number}
   */
  _countEdges(adjacency) {
    let count = 0;
    adjacency.forEach(neighbors => {
      count += neighbors.size;
    });
    return count / 2; // Undirected graph
  }

  /**
   * Select algorithm based on graph size and configuration
   * @private
   * @returns {string}
   */
  _selectAlgorithm() {
    if (this.config.algorithm !== 'auto') {
      return this.config.algorithm;
    }
    
    // Use Stoer-Wagner for small graphs (< 100 nodes)
    // Use Karger for large graphs
    return this.nodeCount < 100 ? 'stoer-wagner' : 'karger';
  }

  /**
   * Stoer-Wagner algorithm for exact minimum cut
   * @private
   * @param {Map<string, Map<string, number>>} adjacency
   * @returns {MinCutResult}
   */
  _stoerWagner(adjacency) {
    // Work with a mutable copy
    const graph = new Map();
    adjacency.forEach((neighbors, node) => {
      graph.set(node, new Map(neighbors));
    });
    
    let globalMinCut = Infinity;
    let globalPartition = null;
    const nodes = Array.from(graph.keys());
    
    // Contracted nodes tracking
    const contractions = new Map();
    nodes.forEach(node => contractions.set(node, new Set([node])));
    
    while (graph.size > 1) {
      // Minimum cut phase
      const { cut, s, t } = this._minCutPhase(graph);
      
      if (cut < globalMinCut) {
        globalMinCut = cut;
        globalPartition = {
          partition1: new Set(contractions.get(t)),
          partition2: new Set()
        };
        
        // Other partition is all other nodes
        contractions.forEach((contracted, node) => {
          if (node !== t) {
            contracted.forEach(n => globalPartition.partition2.add(n));
          }
        });
      }
      
      // Contract s and t
      this._contractNodes(graph, contractions, s, t);
      
      // Check time budget
      if (performance.now() - this.startTime > this.config.timeBudgetMs) {
        console.warn('MinCutPartitioner: Time budget exceeded in Stoer-Wagner');
        break;
      }
    }
    
    // Compute cut edges and weight
    const { cutEdges, cutWeight } = this._computeCutEdges(
      globalPartition.partition1,
      globalPartition.partition2,
      adjacency
    );
    
    return {
      partition1: globalPartition.partition1,
      partition2: globalPartition.partition2,
      cutWeight,
      cutEdges
    };
  }

  /**
   * Single phase of Stoer-Wagner algorithm
   * @private
   * @param {Map<string, Map<string, number>>} graph
   * @returns {{cut: number, s: string, t: string}}
   */
  _minCutPhase(graph) {
    const nodes = Array.from(graph.keys());
    const inA = new Set();
    const weights = new Map();
    
    // Initialize weights
    nodes.forEach(node => weights.set(node, 0));
    
    let s = null;
    let t = null;
    
    // Add nodes to A in order of maximum weight
    while (inA.size < nodes.length) {
      // Find node with maximum weight to A
      let maxWeight = -Infinity;
      let maxNode = null;
      
      weights.forEach((weight, node) => {
        if (!inA.has(node) && weight > maxWeight) {
          maxWeight = weight;
          maxNode = node;
        }
      });
      
      s = t;
      t = maxNode;
      inA.add(maxNode);
      
      // Update weights
      const neighbors = graph.get(maxNode);
      if (neighbors) {
        neighbors.forEach((weight, neighbor) => {
          if (!inA.has(neighbor)) {
            weights.set(neighbor, weights.get(neighbor) + weight);
          }
        });
      }
    }
    
    const cut = weights.get(t);
    return { cut, s, t };
  }

  /**
   * Contract two nodes in graph
   * @private
   * @param {Map<string, Map<string, number>>} graph
   * @param {Map<string, Set<string>>} contractions
   * @param {string} s
   * @param {string} t
   */
  _contractNodes(graph, contractions, s, t) {
    const sNeighbors = graph.get(s);
    const tNeighbors = graph.get(t);
    
    // Merge t's neighbors into s
    tNeighbors.forEach((weight, neighbor) => {
      if (neighbor !== s) {
        const currentWeight = sNeighbors.get(neighbor) || 0;
        sNeighbors.set(neighbor, currentWeight + weight);
        
        // Update reverse edge
        const neighborEdges = graph.get(neighbor);
        neighborEdges.delete(t);
        neighborEdges.set(s, currentWeight + weight);
      }
    });
    
    // Remove self-loop
    sNeighbors.delete(t);
    
    // Update contractions
    contractions.get(s).forEach(node => contractions.get(t).add(node));
    
    // Remove t
    graph.delete(t);
  }

  /**
   * Karger's randomized min-cut algorithm
   * @private
   * @param {Map<string, Map<string, number>>} adjacency
   * @returns {MinCutResult}
   */
  _karger(adjacency) {
    let bestCut = Infinity;
    let bestPartition = null;
    
    for (let iter = 0; iter < this.config.kargerIterations; iter++) {
      const result = this._kargerIteration(adjacency);
      
      if (result.cutWeight < bestCut) {
        bestCut = result.cutWeight;
        bestPartition = result;
      }
      
      // Check time budget
      if (performance.now() - this.startTime > this.config.timeBudgetMs) {
        console.warn('MinCutPartitioner: Time budget exceeded in Karger');
        break;
      }
    }
    
    return bestPartition;
  }

  /**
   * Single iteration of Karger's algorithm
   * @private
   * @param {Map<string, Map<string, number>>} adjacency
   * @returns {MinCutResult}
   */
  _kargerIteration(adjacency) {
    // Create mutable copy
    const graph = new Map();
    adjacency.forEach((neighbors, node) => {
      graph.set(node, new Map(neighbors));
    });
    
    const contractions = new Map();
    graph.forEach((_, node) => contractions.set(node, new Set([node])));
    
    // Contract until 2 nodes remain
    while (graph.size > 2) {
      // Pick random edge
      const edge = this._pickRandomEdge(graph);
      if (!edge) break;
      
      this._contractNodes(graph, contractions, edge.from, edge.to);
    }
    
    // Remaining two nodes are the partition
    const [node1, node2] = Array.from(graph.keys());
    const partition1 = contractions.get(node1);
    const partition2 = contractions.get(node2);
    
    // Compute cut edges and weight
    const { cutEdges, cutWeight } = this._computeCutEdges(
      partition1,
      partition2,
      adjacency
    );
    
    return {
      partition1,
      partition2,
      cutWeight,
      cutEdges
    };
  }

  /**
   * Pick random edge from graph
   * @private
   * @param {Map<string, Map<string, number>>} graph
   * @returns {{from: string, to: string, weight: number}|null}
   */
  _pickRandomEdge(graph) {
    const edges = [];
    
    graph.forEach((neighbors, from) => {
      neighbors.forEach((weight, to) => {
        // Only add each edge once (from < to)
        if (from < to) {
          edges.push({ from, to, weight });
        }
      });
    });
    
    if (edges.length === 0) return null;
    
    const randomIdx = Math.floor(Math.random() * edges.length);
    return edges[randomIdx];
  }

  /**
   * Compute cut edges between two partitions
   * @private
   * @param {Set<string>} partition1
   * @param {Set<string>} partition2
   * @param {Map<string, Map<string, number>>} adjacency
   * @returns {{cutEdges: Array, cutWeight: number}}
   */
  _computeCutEdges(partition1, partition2, adjacency) {
    const cutEdges = [];
    let cutWeight = 0;
    
    partition1.forEach(node => {
      const neighbors = adjacency.get(node);
      if (!neighbors) return;
      
      neighbors.forEach((weight, neighbor) => {
        if (partition2.has(neighbor)) {
          cutEdges.push({ from: node, to: neighbor, weight });
          cutWeight += weight;
        }
      });
    });
    
    return { cutEdges, cutWeight };
  }

  /**
   * Check if partition is balanced
   * @private
   * @param {MinCutResult} result
   * @returns {boolean}
   */
  _isBalanced(result) {
    const size1 = result.partition1.size;
    const size2 = result.partition2.size;
    const total = size1 + size2;
    
    const ratio1 = size1 / total;
    const ratio2 = size2 / total;
    
    const idealRatio = 0.5;
    const tolerance = this.config.balanceTolerance;
    
    return Math.abs(ratio1 - idealRatio) <= tolerance &&
           Math.abs(ratio2 - idealRatio) <= tolerance;
  }

  /**
   * Rebalance partition by moving nodes
   * @private
   * @param {MinCutResult} result
   * @param {Map<string, Map<string, number>>} adjacency
   * @returns {MinCutResult}
   */
  _rebalancePartition(result, adjacency) {
    const partition1 = new Set(result.partition1);
    const partition2 = new Set(result.partition2);
    
    const total = partition1.size + partition2.size;
    const targetSize = Math.floor(total / 2);
    
    // Move nodes from larger to smaller partition
    while (Math.abs(partition1.size - targetSize) > 1) {
      const [larger, smaller] = partition1.size > partition2.size
        ? [partition1, partition2]
        : [partition2, partition1];
      
      // Find node with minimum cut increase
      let bestNode = null;
      let minIncrease = Infinity;
      
      larger.forEach(node => {
        const increase = this._computeMoveIncrease(node, larger, smaller, adjacency);
        if (increase < minIncrease) {
          minIncrease = increase;
          bestNode = node;
        }
      });
      
      if (bestNode) {
        larger.delete(bestNode);
        smaller.add(bestNode);
      } else {
        break;
      }
    }
    
    // Recompute cut edges and weight
    const { cutEdges, cutWeight } = this._computeCutEdges(
      partition1,
      partition2,
      adjacency
    );
    
    return {
      partition1,
      partition2,
      cutWeight,
      cutEdges
    };
  }

  /**
   * Compute increase in cut weight if node is moved
   * @private
   * @param {string} node
   * @param {Set<string>} from
   * @param {Set<string>} to
   * @param {Map<string, Map<string, number>>} adjacency
   * @returns {number}
   */
  _computeMoveIncrease(node, from, to, adjacency) {
    const neighbors = adjacency.get(node);
    if (!neighbors) return 0;
    
    let increase = 0;
    
    neighbors.forEach((weight, neighbor) => {
      if (from.has(neighbor)) {
        increase += weight; // New cut edge
      }
      if (to.has(neighbor)) {
        increase -= weight; // Removed cut edge
      }
    });
    
    return increase;
  }

  /**
   * Extract subgraph containing only specified nodes
   * @private
   * @param {Map<string, Map<string, number>>} adjacency
   * @param {Set<string>} nodes
   * @returns {Map<string, Map<string, number>>}
   */
  _extractSubgraph(adjacency, nodes) {
    const subgraph = new Map();
    
    nodes.forEach(node => {
      const neighbors = new Map();
      const originalNeighbors = adjacency.get(node);
      
      if (originalNeighbors) {
        originalNeighbors.forEach((weight, neighbor) => {
          if (nodes.has(neighbor)) {
            neighbors.set(neighbor, weight);
          }
        });
      }
      
      subgraph.set(node, neighbors);
    });
    
    return subgraph;
  }
}

/**
 * Utility function to partition graph with min-cut
 * @param {Object} graph - Graph to partition
 * @param {MinCutConfig} config - Configuration
 * @returns {MinCutResult}
 */
export function minCutPartition(graph, config = {}) {
  const partitioner = new MinCutPartitioner(graph, config);
  return partitioner.partition();
}

/**
 * Utility function for multi-way partitioning
 * @param {Object} graph - Graph to partition
 * @param {number} k - Number of partitions
 * @param {MinCutConfig} config - Configuration
 * @returns {Array<Set<string>>}
 */
export function multiWayPartition(graph, k, config = {}) {
  const partitioner = new MinCutPartitioner(graph, config);
  return partitioner.partitionMultiWay(k);
}