/**
 * @fileoverview BalancedPartition: Partition graph into subgraphs with balanced node counts
 * @module harmony-graph/balanced-partition
 * 
 * Implements graph partitioning algorithms that divide a graph into k partitions
 * while attempting to balance the number of nodes in each partition and minimize
 * edge cuts between partitions.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#graph-algorithms-balanced-partition
 */

/**
 * @typedef {Object} Partition
 * @property {string} id - Partition identifier
 * @property {Set<string>} nodes - Node IDs in this partition
 * @property {number} edgeCut - Number of edges crossing partition boundaries
 */

/**
 * @typedef {Object} PartitionResult
 * @property {Partition[]} partitions - Array of partitions
 * @property {number} totalEdgeCut - Total edges crossing partition boundaries
 * @property {number} balance - Balance metric (0=perfect, higher=worse)
 * @property {Map<string, string>} nodeToPartition - Maps node ID to partition ID
 */

/**
 * @typedef {Object} PartitionOptions
 * @property {number} numPartitions - Number of partitions to create (default: 2)
 * @property {number} maxImbalance - Maximum allowed imbalance ratio (default: 1.1)
 * @property {string} strategy - Partitioning strategy: 'greedy', 'bfs', 'random' (default: 'greedy')
 * @property {string} [seedNode] - Starting node for BFS-based strategies
 */

/**
 * BalancedPartition algorithm implementation
 * Partitions graph into k subgraphs with balanced node counts
 */
export class BalancedPartition {
  /**
   * @param {Object} graph - Graph structure with nodes and edges
   * @param {Map<string, Object>} graph.nodes - Map of node ID to node data
   * @param {Map<string, Set<string>>} graph.adjacency - Adjacency list representation
   */
  constructor(graph) {
    if (!graph || !graph.nodes || !graph.adjacency) {
      throw new Error('BalancedPartition requires graph with nodes and adjacency');
    }
    
    this.graph = graph;
    this.nodes = graph.nodes;
    this.adjacency = graph.adjacency;
  }

  /**
   * Partition the graph into k balanced subgraphs
   * 
   * @param {PartitionOptions} options - Partitioning options
   * @returns {PartitionResult} Partitioning result with balance metrics
   * 
   * @example
   * const partitioner = new BalancedPartition(graph);
   * const result = partitioner.partition({ numPartitions: 4, strategy: 'greedy' });
   * console.log(`Created ${result.partitions.length} partitions with balance ${result.balance}`);
   */
  partition(options = {}) {
    const {
      numPartitions = 2,
      maxImbalance = 1.1,
      strategy = 'greedy',
      seedNode = null
    } = options;

    if (numPartitions < 1) {
      throw new Error('numPartitions must be at least 1');
    }

    if (numPartitions > this.nodes.size) {
      throw new Error(`Cannot create ${numPartitions} partitions from ${this.nodes.size} nodes`);
    }

    // Select partitioning strategy
    let partitions;
    switch (strategy) {
      case 'greedy':
        partitions = this._greedyPartition(numPartitions, maxImbalance);
        break;
      case 'bfs':
        partitions = this._bfsPartition(numPartitions, seedNode);
        break;
      case 'random':
        partitions = this._randomPartition(numPartitions);
        break;
      default:
        throw new Error(`Unknown partitioning strategy: ${strategy}`);
    }

    // Calculate metrics
    const nodeToPartition = new Map();
    partitions.forEach(partition => {
      partition.nodes.forEach(nodeId => {
        nodeToPartition.set(nodeId, partition.id);
      });
    });

    const totalEdgeCut = this._calculateEdgeCut(partitions, nodeToPartition);
    const balance = this._calculateBalance(partitions);

    // Update partition edge cuts
    partitions.forEach(partition => {
      partition.edgeCut = this._calculatePartitionEdgeCut(partition, nodeToPartition);
    });

    return {
      partitions,
      totalEdgeCut,
      balance,
      nodeToPartition
    };
  }

  /**
   * Greedy partitioning: Assign nodes to partitions to minimize edge cuts
   * while maintaining balance
   * 
   * @private
   * @param {number} numPartitions - Number of partitions
   * @param {number} maxImbalance - Maximum imbalance ratio
   * @returns {Partition[]} Array of partitions
   */
  _greedyPartition(numPartitions, maxImbalance) {
    const partitions = Array.from({ length: numPartitions }, (_, i) => ({
      id: `partition-${i}`,
      nodes: new Set(),
      edgeCut: 0
    }));

    const targetSize = Math.ceil(this.nodes.size / numPartitions);
    const maxSize = Math.ceil(targetSize * maxImbalance);
    const assigned = new Set();
    const nodeIds = Array.from(this.nodes.keys());

    // Start with a seed node in each partition
    for (let i = 0; i < numPartitions && i < nodeIds.length; i++) {
      const nodeId = nodeIds[i];
      partitions[i].nodes.add(nodeId);
      assigned.add(nodeId);
    }

    // Greedily assign remaining nodes
    while (assigned.size < this.nodes.size) {
      let bestNode = null;
      let bestPartition = null;
      let bestScore = -Infinity;

      // Find unassigned node with best score
      for (const nodeId of nodeIds) {
        if (assigned.has(nodeId)) continue;

        // Try each partition
        for (const partition of partitions) {
          if (partition.nodes.size >= maxSize) continue;

          // Score = internal edges - external edges
          const score = this._calculateNodeScore(nodeId, partition, assigned);
          
          if (score > bestScore) {
            bestScore = score;
            bestNode = nodeId;
            bestPartition = partition;
          }
        }
      }

      // Assign best node to best partition
      if (bestNode && bestPartition) {
        bestPartition.nodes.add(bestNode);
        assigned.add(bestNode);
      } else {
        // No valid assignment found, assign to smallest partition
        const smallest = partitions.reduce((min, p) => 
          p.nodes.size < min.nodes.size ? p : min
        );
        const remaining = nodeIds.find(id => !assigned.has(id));
        if (remaining) {
          smallest.nodes.add(remaining);
          assigned.add(remaining);
        } else {
          break;
        }
      }
    }

    return partitions;
  }

  /**
   * BFS-based partitioning: Use breadth-first search to create contiguous partitions
   * 
   * @private
   * @param {number} numPartitions - Number of partitions
   * @param {string|null} seedNode - Starting node (or null for random)
   * @returns {Partition[]} Array of partitions
   */
  _bfsPartition(numPartitions, seedNode) {
    const partitions = Array.from({ length: numPartitions }, (_, i) => ({
      id: `partition-${i}`,
      nodes: new Set(),
      edgeCut: 0
    }));

    const targetSize = Math.ceil(this.nodes.size / numPartitions);
    const assigned = new Set();
    const nodeIds = Array.from(this.nodes.keys());

    // Select seed nodes
    const seeds = [];
    if (seedNode && this.nodes.has(seedNode)) {
      seeds.push(seedNode);
    } else {
      seeds.push(nodeIds[0]);
    }

    // Select additional seeds spread across graph
    while (seeds.length < numPartitions && assigned.size < this.nodes.size) {
      let maxDist = -1;
      let farthest = null;

      for (const nodeId of nodeIds) {
        if (seeds.includes(nodeId)) continue;
        
        const minDist = Math.min(...seeds.map(seed => 
          this._bfsDistance(seed, nodeId)
        ));
        
        if (minDist > maxDist) {
          maxDist = minDist;
          farthest = nodeId;
        }
      }

      if (farthest) {
        seeds.push(farthest);
      } else {
        break;
      }
    }

    // BFS from each seed to fill partitions
    for (let i = 0; i < seeds.length; i++) {
      const queue = [seeds[i]];
      const partition = partitions[i];

      while (queue.length > 0 && partition.nodes.size < targetSize) {
        const nodeId = queue.shift();
        
        if (assigned.has(nodeId)) continue;
        
        partition.nodes.add(nodeId);
        assigned.add(nodeId);

        // Add neighbors to queue
        const neighbors = this.adjacency.get(nodeId) || new Set();
        for (const neighbor of neighbors) {
          if (!assigned.has(neighbor) && !queue.includes(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }

    // Assign remaining nodes to smallest partition
    const remaining = nodeIds.filter(id => !assigned.has(id));
    remaining.forEach(nodeId => {
      const smallest = partitions.reduce((min, p) => 
        p.nodes.size < min.nodes.size ? p : min
      );
      smallest.nodes.add(nodeId);
    });

    return partitions;
  }

  /**
   * Random partitioning: Randomly assign nodes to partitions (baseline)
   * 
   * @private
   * @param {number} numPartitions - Number of partitions
   * @returns {Partition[]} Array of partitions
   */
  _randomPartition(numPartitions) {
    const partitions = Array.from({ length: numPartitions }, (_, i) => ({
      id: `partition-${i}`,
      nodes: new Set(),
      edgeCut: 0
    }));

    const nodeIds = Array.from(this.nodes.keys());
    const shuffled = this._shuffle(nodeIds);

    shuffled.forEach((nodeId, index) => {
      const partitionIndex = index % numPartitions;
      partitions[partitionIndex].nodes.add(nodeId);
    });

    return partitions;
  }

  /**
   * Calculate score for assigning a node to a partition
   * Higher score = more internal edges, fewer external edges
   * 
   * @private
   * @param {string} nodeId - Node to score
   * @param {Partition} partition - Target partition
   * @param {Set<string>} assigned - Already assigned nodes
   * @returns {number} Score value
   */
  _calculateNodeScore(nodeId, partition, assigned) {
    const neighbors = this.adjacency.get(nodeId) || new Set();
    let internalEdges = 0;
    let externalEdges = 0;

    for (const neighbor of neighbors) {
      if (!assigned.has(neighbor)) continue;
      
      if (partition.nodes.has(neighbor)) {
        internalEdges++;
      } else {
        externalEdges++;
      }
    }

    return internalEdges - externalEdges;
  }

  /**
   * Calculate BFS distance between two nodes
   * 
   * @private
   * @param {string} start - Start node
   * @param {string} end - End node
   * @returns {number} Distance (Infinity if unreachable)
   */
  _bfsDistance(start, end) {
    if (start === end) return 0;

    const queue = [[start, 0]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const [nodeId, dist] = queue.shift();
      const neighbors = this.adjacency.get(nodeId) || new Set();

      for (const neighbor of neighbors) {
        if (neighbor === end) return dist + 1;
        
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, dist + 1]);
        }
      }
    }

    return Infinity;
  }

  /**
   * Calculate total edge cut across all partitions
   * 
   * @private
   * @param {Partition[]} partitions - Array of partitions
   * @param {Map<string, string>} nodeToPartition - Node to partition mapping
   * @returns {number} Total edge cut count
   */
  _calculateEdgeCut(partitions, nodeToPartition) {
    let edgeCut = 0;

    for (const [nodeId, neighbors] of this.adjacency.entries()) {
      const nodePartition = nodeToPartition.get(nodeId);
      
      for (const neighbor of neighbors) {
        const neighborPartition = nodeToPartition.get(neighbor);
        
        if (nodePartition !== neighborPartition) {
          edgeCut++;
        }
      }
    }

    // Divide by 2 because each edge is counted twice
    return edgeCut / 2;
  }

  /**
   * Calculate edge cut for a specific partition
   * 
   * @private
   * @param {Partition} partition - Partition to analyze
   * @param {Map<string, string>} nodeToPartition - Node to partition mapping
   * @returns {number} Edge cut count for this partition
   */
  _calculatePartitionEdgeCut(partition, nodeToPartition) {
    let edgeCut = 0;

    for (const nodeId of partition.nodes) {
      const neighbors = this.adjacency.get(nodeId) || new Set();
      
      for (const neighbor of neighbors) {
        const neighborPartition = nodeToPartition.get(neighbor);
        
        if (neighborPartition !== partition.id) {
          edgeCut++;
        }
      }
    }

    return edgeCut;
  }

  /**
   * Calculate balance metric for partitions
   * 0 = perfectly balanced, higher = more imbalanced
   * 
   * @private
   * @param {Partition[]} partitions - Array of partitions
   * @returns {number} Balance metric
   */
  _calculateBalance(partitions) {
    const sizes = partitions.map(p => p.nodes.size);
    const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
    
    if (avgSize === 0) return 0;

    const variance = sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length;
    return Math.sqrt(variance) / avgSize;
  }

  /**
   * Fisher-Yates shuffle algorithm
   * 
   * @private
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  _shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Get partition statistics
   * 
   * @param {PartitionResult} result - Partition result
   * @returns {Object} Statistics object
   */
  static getStatistics(result) {
    const sizes = result.partitions.map(p => p.nodes.size);
    const edgeCuts = result.partitions.map(p => p.edgeCut);

    return {
      numPartitions: result.partitions.length,
      totalNodes: sizes.reduce((sum, s) => sum + s, 0),
      avgPartitionSize: sizes.reduce((sum, s) => sum + s, 0) / sizes.length,
      minPartitionSize: Math.min(...sizes),
      maxPartitionSize: Math.max(...sizes),
      totalEdgeCut: result.totalEdgeCut,
      avgEdgeCut: edgeCuts.reduce((sum, s) => sum + s, 0) / edgeCuts.length,
      balance: result.balance,
      balanceRatio: Math.max(...sizes) / Math.min(...sizes)
    };
  }
}