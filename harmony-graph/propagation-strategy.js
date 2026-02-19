/**
 * @fileoverview PropagationStrategy: Configurable strategies for event propagation
 * 
 * Provides different algorithms for traversing the graph during event propagation:
 * - Breadth-First: Process all nodes at current depth before moving deeper
 * - Depth-First: Follow each path to completion before exploring alternatives
 * - Priority-Weighted: Process nodes based on priority scores
 * 
 * Related: harmony-graph/propagation-queue.js, harmony-graph/event-envelope.js
 * Documentation: See DESIGN_SYSTEM.md § Graph Event System → Propagation Strategies
 * 
 * @module harmony-graph/propagation-strategy
 */

/**
 * @typedef {Object} PropagationNode
 * @property {string} nodeId - Node identifier
 * @property {number} depth - Distance from source node
 * @property {number} priority - Node priority score
 * @property {EventEnvelope} envelope - Event envelope to propagate
 * @property {string[]} path - Path from source to this node
 */

/**
 * @typedef {Object} StrategyMetrics
 * @property {number} nodesProcessed - Total nodes processed
 * @property {number} maxDepth - Maximum depth reached
 * @property {number} avgProcessingTime - Average time per node (ms)
 * @property {number} totalTime - Total propagation time (ms)
 */

/**
 * Base class for propagation strategies
 * @abstract
 */
export class PropagationStrategy {
  constructor() {
    if (new.target === PropagationStrategy) {
      throw new TypeError('Cannot instantiate abstract PropagationStrategy');
    }
    
    /** @type {StrategyMetrics} */
    this.metrics = {
      nodesProcessed: 0,
      maxDepth: 0,
      avgProcessingTime: 0,
      totalTime: 0
    };
    
    this._startTime = 0;
    this._processingTimes = [];
  }

  /**
   * Initialize strategy with source node and event
   * @param {string} sourceNodeId - Starting node
   * @param {EventEnvelope} envelope - Event envelope
   * @abstract
   */
  initialize(sourceNodeId, envelope) {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Get next node to process
   * @returns {PropagationNode|null} Next node or null if complete
   * @abstract
   */
  next() {
    throw new Error('next() must be implemented by subclass');
  }

  /**
   * Add child nodes to propagation queue
   * @param {PropagationNode} parent - Parent node
   * @param {string[]} childIds - Child node IDs
   * @param {number[]} priorities - Child priorities (optional)
   * @abstract
   */
  addChildren(parent, childIds, priorities = []) {
    throw new Error('addChildren() must be implemented by subclass');
  }

  /**
   * Check if propagation is complete
   * @returns {boolean} True if no more nodes to process
   * @abstract
   */
  isComplete() {
    throw new Error('isComplete() must be implemented by subclass');
  }

  /**
   * Reset strategy state
   */
  reset() {
    this.metrics = {
      nodesProcessed: 0,
      maxDepth: 0,
      avgProcessingTime: 0,
      totalTime: 0
    };
    this._startTime = 0;
    this._processingTimes = [];
  }

  /**
   * Get current metrics
   * @returns {StrategyMetrics} Current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Record node processing start
   * @protected
   */
  _recordProcessingStart() {
    if (this._startTime === 0) {
      this._startTime = performance.now();
    }
    return performance.now();
  }

  /**
   * Record node processing end
   * @param {number} startTime - Processing start time
   * @protected
   */
  _recordProcessingEnd(startTime) {
    const duration = performance.now() - startTime;
    this._processingTimes.push(duration);
    this.metrics.nodesProcessed++;
    
    // Update average
    const sum = this._processingTimes.reduce((a, b) => a + b, 0);
    this.metrics.avgProcessingTime = sum / this._processingTimes.length;
    
    // Update total time
    this.metrics.totalTime = performance.now() - this._startTime;
  }

  /**
   * Update max depth if needed
   * @param {number} depth - Current depth
   * @protected
   */
  _updateMaxDepth(depth) {
    if (depth > this.metrics.maxDepth) {
      this.metrics.maxDepth = depth;
    }
  }
}

/**
 * Breadth-First propagation strategy
 * Processes all nodes at current depth before moving deeper
 */
export class BreadthFirstStrategy extends PropagationStrategy {
  constructor() {
    super();
    /** @type {PropagationNode[]} */
    this._queue = [];
    /** @type {Set<string>} */
    this._visited = new Set();
  }

  /**
   * @inheritdoc
   */
  initialize(sourceNodeId, envelope) {
    this.reset();
    this._queue = [];
    this._visited = new Set();
    
    this._queue.push({
      nodeId: sourceNodeId,
      depth: 0,
      priority: 0,
      envelope,
      path: [sourceNodeId]
    });
  }

  /**
   * @inheritdoc
   */
  next() {
    if (this._queue.length === 0) {
      return null;
    }

    const startTime = this._recordProcessingStart();
    const node = this._queue.shift(); // FIFO for breadth-first
    
    this._visited.add(node.nodeId);
    this._updateMaxDepth(node.depth);
    this._recordProcessingEnd(startTime);
    
    return node;
  }

  /**
   * @inheritdoc
   */
  addChildren(parent, childIds, priorities = []) {
    childIds.forEach((childId, index) => {
      // Skip if already visited (cycle detection)
      if (this._visited.has(childId) || parent.path.includes(childId)) {
        return;
      }

      this._queue.push({
        nodeId: childId,
        depth: parent.depth + 1,
        priority: priorities[index] || 0,
        envelope: parent.envelope,
        path: [...parent.path, childId]
      });
    });
  }

  /**
   * @inheritdoc
   */
  isComplete() {
    return this._queue.length === 0;
  }

  /**
   * @inheritdoc
   */
  reset() {
    super.reset();
    this._queue = [];
    this._visited = new Set();
  }
}

/**
 * Depth-First propagation strategy
 * Follows each path to completion before exploring alternatives
 */
export class DepthFirstStrategy extends PropagationStrategy {
  constructor() {
    super();
    /** @type {PropagationNode[]} */
    this._stack = [];
    /** @type {Set<string>} */
    this._visited = new Set();
  }

  /**
   * @inheritdoc
   */
  initialize(sourceNodeId, envelope) {
    this.reset();
    this._stack = [];
    this._visited = new Set();
    
    this._stack.push({
      nodeId: sourceNodeId,
      depth: 0,
      priority: 0,
      envelope,
      path: [sourceNodeId]
    });
  }

  /**
   * @inheritdoc
   */
  next() {
    if (this._stack.length === 0) {
      return null;
    }

    const startTime = this._recordProcessingStart();
    const node = this._stack.pop(); // LIFO for depth-first
    
    this._visited.add(node.nodeId);
    this._updateMaxDepth(node.depth);
    this._recordProcessingEnd(startTime);
    
    return node;
  }

  /**
   * @inheritdoc
   */
  addChildren(parent, childIds, priorities = []) {
    // Add in reverse order so first child is processed first (stack behavior)
    for (let i = childIds.length - 1; i >= 0; i--) {
      const childId = childIds[i];
      
      // Skip if already visited (cycle detection)
      if (this._visited.has(childId) || parent.path.includes(childId)) {
        continue;
      }

      this._stack.push({
        nodeId: childId,
        depth: parent.depth + 1,
        priority: priorities[i] || 0,
        envelope: parent.envelope,
        path: [...parent.path, childId]
      });
    }
  }

  /**
   * @inheritdoc
   */
  isComplete() {
    return this._stack.length === 0;
  }

  /**
   * @inheritdoc
   */
  reset() {
    super.reset();
    this._stack = [];
    this._visited = new Set();
  }
}

/**
 * Priority-Weighted propagation strategy
 * Processes nodes based on priority scores, highest first
 */
export class PriorityWeightedStrategy extends PropagationStrategy {
  constructor() {
    super();
    /** @type {PropagationNode[]} */
    this._heap = [];
    /** @type {Set<string>} */
    this._visited = new Set();
  }

  /**
   * @inheritdoc
   */
  initialize(sourceNodeId, envelope) {
    this.reset();
    this._heap = [];
    this._visited = new Set();
    
    this._heap.push({
      nodeId: sourceNodeId,
      depth: 0,
      priority: 0,
      envelope,
      path: [sourceNodeId]
    });
  }

  /**
   * @inheritdoc
   */
  next() {
    if (this._heap.length === 0) {
      return null;
    }

    const startTime = this._recordProcessingStart();
    
    // Extract max priority node
    const node = this._extractMax();
    
    this._visited.add(node.nodeId);
    this._updateMaxDepth(node.depth);
    this._recordProcessingEnd(startTime);
    
    return node;
  }

  /**
   * @inheritdoc
   */
  addChildren(parent, childIds, priorities = []) {
    childIds.forEach((childId, index) => {
      // Skip if already visited (cycle detection)
      if (this._visited.has(childId) || parent.path.includes(childId)) {
        return;
      }

      const priority = priorities[index] || 0;
      
      this._heap.push({
        nodeId: childId,
        depth: parent.depth + 1,
        priority,
        envelope: parent.envelope,
        path: [...parent.path, childId]
      });
      
      // Maintain heap property
      this._bubbleUp(this._heap.length - 1);
    });
  }

  /**
   * @inheritdoc
   */
  isComplete() {
    return this._heap.length === 0;
  }

  /**
   * @inheritdoc
   */
  reset() {
    super.reset();
    this._heap = [];
    this._visited = new Set();
  }

  /**
   * Extract maximum priority node from heap
   * @returns {PropagationNode} Max priority node
   * @private
   */
  _extractMax() {
    if (this._heap.length === 0) {
      return null;
    }

    const max = this._heap[0];
    const last = this._heap.pop();
    
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._bubbleDown(0);
    }
    
    return max;
  }

  /**
   * Bubble node up to maintain heap property
   * @param {number} index - Node index
   * @private
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this._heap[index].priority <= this._heap[parentIndex].priority) {
        break;
      }
      
      // Swap with parent
      [this._heap[index], this._heap[parentIndex]] = 
        [this._heap[parentIndex], this._heap[index]];
      
      index = parentIndex;
    }
  }

  /**
   * Bubble node down to maintain heap property
   * @param {number} index - Node index
   * @private
   */
  _bubbleDown(index) {
    const length = this._heap.length;
    
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;
      
      if (leftChild < length && 
          this._heap[leftChild].priority > this._heap[largest].priority) {
        largest = leftChild;
      }
      
      if (rightChild < length && 
          this._heap[rightChild].priority > this._heap[largest].priority) {
        largest = rightChild;
      }
      
      if (largest === index) {
        break;
      }
      
      // Swap with largest child
      [this._heap[index], this._heap[largest]] = 
        [this._heap[largest], this._heap[index]];
      
      index = largest;
    }
  }
}

/**
 * Factory for creating propagation strategies
 */
export class PropagationStrategyFactory {
  /**
   * Create strategy by name
   * @param {string} strategyName - Strategy name ('breadth-first', 'depth-first', 'priority-weighted')
   * @returns {PropagationStrategy} Strategy instance
   * @throws {Error} If strategy name is unknown
   */
  static create(strategyName) {
    switch (strategyName.toLowerCase()) {
      case 'breadth-first':
      case 'bfs':
        return new BreadthFirstStrategy();
      
      case 'depth-first':
      case 'dfs':
        return new DepthFirstStrategy();
      
      case 'priority-weighted':
      case 'priority':
        return new PriorityWeightedStrategy();
      
      default:
        throw new Error(`Unknown propagation strategy: ${strategyName}`);
    }
  }

  /**
   * Get list of available strategies
   * @returns {string[]} Available strategy names
   */
  static getAvailableStrategies() {
    return ['breadth-first', 'depth-first', 'priority-weighted'];
  }
}