/**
 * @fileoverview PriorityQueue: Priority-based execution queue
 * 
 * A min-heap based priority queue for managing execution order of tasks.
 * Lower priority values are dequeued first (higher priority).
 * 
 * Performance:
 * - enqueue: O(log n)
 * - dequeue: O(log n)
 * - peek: O(1)
 * - size: O(1)
 * 
 * Memory: O(n) where n is number of items
 * 
 * Related: harmony-design/DESIGN_SYSTEM.md#priority-queue
 * 
 * @module core/priority-queue
 */

/**
 * @typedef {Object} PriorityQueueItem
 * @property {number} priority - Priority value (lower = higher priority)
 * @property {*} data - The item data
 * @property {number} insertionOrder - Insertion order for stable sorting
 */

/**
 * Priority queue implementation using a binary min-heap.
 * Provides efficient priority-based task scheduling for the execution system.
 * 
 * @class PriorityQueue
 * @example
 * const queue = new PriorityQueue();
 * queue.enqueue({ task: 'render' }, 1);
 * queue.enqueue({ task: 'compute' }, 5);
 * queue.enqueue({ task: 'critical' }, 0);
 * 
 * console.log(queue.dequeue()); // { task: 'critical' }
 * console.log(queue.peek()); // { task: 'render' }
 */
export class PriorityQueue {
  /**
   * Creates a new PriorityQueue
   * @param {Function} [comparator] - Optional custom comparator function
   */
  constructor(comparator = null) {
    /** @private @type {PriorityQueueItem[]} */
    this._heap = [];
    
    /** @private @type {number} */
    this._insertionCounter = 0;
    
    /** @private @type {Function} */
    this._comparator = comparator || this._defaultComparator;
  }

  /**
   * Default comparator: compares by priority, then by insertion order for stability
   * @private
   * @param {PriorityQueueItem} a - First item
   * @param {PriorityQueueItem} b - Second item
   * @returns {number} Comparison result
   */
  _defaultComparator(a, b) {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Stable sort: maintain insertion order for equal priorities
    return a.insertionOrder - b.insertionOrder;
  }

  /**
   * Get parent index in heap
   * @private
   * @param {number} index - Child index
   * @returns {number} Parent index
   */
  _parent(index) {
    return Math.floor((index - 1) / 2);
  }

  /**
   * Get left child index in heap
   * @private
   * @param {number} index - Parent index
   * @returns {number} Left child index
   */
  _leftChild(index) {
    return 2 * index + 1;
  }

  /**
   * Get right child index in heap
   * @private
   * @param {number} index - Parent index
   * @returns {number} Right child index
   */
  _rightChild(index) {
    return 2 * index + 2;
  }

  /**
   * Swap two elements in the heap
   * @private
   * @param {number} i - First index
   * @param {number} j - Second index
   */
  _swap(i, j) {
    const temp = this._heap[i];
    this._heap[i] = this._heap[j];
    this._heap[j] = temp;
  }

  /**
   * Bubble up element to maintain heap property
   * @private
   * @param {number} index - Starting index
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = this._parent(index);
      if (this._comparator(this._heap[index], this._heap[parentIndex]) >= 0) {
        break;
      }
      this._swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * Bubble down element to maintain heap property
   * @private
   * @param {number} index - Starting index
   */
  _bubbleDown(index) {
    const length = this._heap.length;
    
    while (true) {
      let minIndex = index;
      const leftIndex = this._leftChild(index);
      const rightIndex = this._rightChild(index);

      if (leftIndex < length && 
          this._comparator(this._heap[leftIndex], this._heap[minIndex]) < 0) {
        minIndex = leftIndex;
      }

      if (rightIndex < length && 
          this._comparator(this._heap[rightIndex], this._heap[minIndex]) < 0) {
        minIndex = rightIndex;
      }

      if (minIndex === index) {
        break;
      }

      this._swap(index, minIndex);
      index = minIndex;
    }
  }

  /**
   * Add an item to the queue with a priority
   * @param {*} data - The data to enqueue
   * @param {number} priority - Priority value (lower = higher priority)
   * @returns {void}
   * @throws {Error} If priority is not a valid number
   */
  enqueue(data, priority) {
    if (typeof priority !== 'number' || isNaN(priority)) {
      throw new Error('Priority must be a valid number');
    }

    const item = {
      priority,
      data,
      insertionOrder: this._insertionCounter++
    };

    this._heap.push(item);
    this._bubbleUp(this._heap.length - 1);
  }

  /**
   * Remove and return the highest priority item
   * @returns {*} The data of the highest priority item, or undefined if empty
   */
  dequeue() {
    if (this._heap.length === 0) {
      return undefined;
    }

    if (this._heap.length === 1) {
      return this._heap.pop().data;
    }

    const result = this._heap[0].data;
    this._heap[0] = this._heap.pop();
    this._bubbleDown(0);

    return result;
  }

  /**
   * View the highest priority item without removing it
   * @returns {*} The data of the highest priority item, or undefined if empty
   */
  peek() {
    return this._heap.length > 0 ? this._heap[0].data : undefined;
  }

  /**
   * Get the priority of the highest priority item
   * @returns {number|undefined} The priority value, or undefined if empty
   */
  peekPriority() {
    return this._heap.length > 0 ? this._heap[0].priority : undefined;
  }

  /**
   * Get the number of items in the queue
   * @returns {number} Queue size
   */
  get size() {
    return this._heap.length;
  }

  /**
   * Check if the queue is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this._heap.length === 0;
  }

  /**
   * Remove all items from the queue
   * @returns {void}
   */
  clear() {
    this._heap = [];
    this._insertionCounter = 0;
  }

  /**
   * Get all items as an array (for debugging/inspection)
   * Items are returned in heap order, not priority order
   * @returns {Array<{priority: number, data: *}>} Array of items
   */
  toArray() {
    return this._heap.map(item => ({
      priority: item.priority,
      data: item.data
    }));
  }

  /**
   * Get all items sorted by priority
   * @returns {Array<{priority: number, data: *}>} Sorted array of items
   */
  toSortedArray() {
    return [...this._heap]
      .sort(this._comparator)
      .map(item => ({
        priority: item.priority,
        data: item.data
      }));
  }

  /**
   * Create a PriorityQueue from an array of items
   * @param {Array<{data: *, priority: number}>} items - Items to add
   * @param {Function} [comparator] - Optional custom comparator
   * @returns {PriorityQueue} New priority queue
   */
  static from(items, comparator = null) {
    const queue = new PriorityQueue(comparator);
    for (const item of items) {
      queue.enqueue(item.data, item.priority);
    }
    return queue;
  }

  /**
   * Drain the queue, calling a function for each item in priority order
   * @param {Function} fn - Function to call with each item's data
   * @returns {void}
   */
  drain(fn) {
    while (!this.isEmpty()) {
      fn(this.dequeue());
    }
  }

  /**
   * Update the priority of an item (requires equality check)
   * This is O(n) operation - use sparingly
   * @param {*} data - The data to find (uses === comparison)
   * @param {number} newPriority - New priority value
   * @returns {boolean} True if item was found and updated
   */
  updatePriority(data, newPriority) {
    const index = this._heap.findIndex(item => item.data === data);
    
    if (index === -1) {
      return false;
    }

    const oldPriority = this._heap[index].priority;
    this._heap[index].priority = newPriority;

    if (newPriority < oldPriority) {
      this._bubbleUp(index);
    } else if (newPriority > oldPriority) {
      this._bubbleDown(index);
    }

    return true;
  }

  /**
   * Remove a specific item from the queue
   * This is O(n) operation - use sparingly
   * @param {*} data - The data to remove (uses === comparison)
   * @returns {boolean} True if item was found and removed
   */
  remove(data) {
    const index = this._heap.findIndex(item => item.data === data);
    
    if (index === -1) {
      return false;
    }

    if (index === this._heap.length - 1) {
      this._heap.pop();
      return true;
    }

    this._heap[index] = this._heap.pop();
    
    // Try both directions since we don't know which way to go
    const parent = this._parent(index);
    if (index > 0 && this._comparator(this._heap[index], this._heap[parent]) < 0) {
      this._bubbleUp(index);
    } else {
      this._bubbleDown(index);
    }

    return true;
  }
}

/**
 * Create a max-heap priority queue (higher priority values dequeued first)
 * @param {Function} [customComparator] - Optional additional comparator
 * @returns {PriorityQueue} Max-heap priority queue
 */
export function createMaxPriorityQueue(customComparator = null) {
  const maxComparator = (a, b) => {
    if (customComparator) {
      return customComparator(b, a);
    }
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Reversed for max-heap
    }
    return a.insertionOrder - b.insertionOrder;
  };
  
  return new PriorityQueue(maxComparator);
}