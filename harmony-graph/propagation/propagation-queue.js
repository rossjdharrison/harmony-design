/**
 * @fileoverview PropagationQueue - Priority queue for pending graph events
 * 
 * Processes events in priority order (highest first) to ensure critical
 * events are handled before lower-priority ones. Uses a binary heap for
 * efficient O(log n) insertion and O(1) priority access.
 * 
 * @module harmony-graph/propagation/propagation-queue
 * @see DESIGN_SYSTEM.md#graph-event-propagation
 */

/**
 * Priority levels for event propagation
 * Higher number = higher priority
 * @enum {number}
 */
export const EventPriority = {
  CRITICAL: 100,    // System-critical events (errors, shutdowns)
  HIGH: 75,         // User-initiated actions (clicks, commands)
  NORMAL: 50,       // Standard propagation events
  LOW: 25,          // Background updates
  IDLE: 0           // Deferred/batched updates
};

/**
 * Queued event wrapper with priority and metadata
 * @typedef {Object} QueuedEvent
 * @property {Object} event - The event envelope to propagate
 * @property {number} priority - Priority level (0-100)
 * @property {number} timestamp - Enqueue timestamp (ms)
 * @property {string} sourceNodeId - Originating node ID
 * @property {number} queueIndex - Heap position (internal)
 */

/**
 * Priority queue for graph event propagation
 * 
 * Uses binary min-heap (inverted for max priority) to efficiently
 * process highest priority events first. Supports priority updates
 * and time-based aging to prevent starvation.
 * 
 * Performance:
 * - Enqueue: O(log n)
 * - Dequeue: O(log n)
 * - Peek: O(1)
 * - Update Priority: O(log n)
 * 
 * @class
 */
export class PropagationQueue {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.maxSize=10000] - Maximum queue size
   * @param {number} [options.agingInterval=1000] - Priority aging interval (ms)
   * @param {number} [options.agingBoost=1] - Priority boost per aging cycle
   * @param {boolean} [options.enableAging=true] - Enable priority aging
   */
  constructor(options = {}) {
    /** @private @type {QueuedEvent[]} */
    this._heap = [];
    
    /** @private @type {Map<string, number>} */
    this._eventIndexMap = new Map();
    
    /** @private @type {number} */
    this._maxSize = options.maxSize || 10000;
    
    /** @private @type {number} */
    this._agingInterval = options.agingInterval || 1000;
    
    /** @private @type {number} */
    this._agingBoost = options.agingBoost || 1;
    
    /** @private @type {boolean} */
    this._enableAging = options.enableAging !== false;
    
    /** @private @type {number|null} */
    this._agingTimer = null;
    
    /** @private @type {number} */
    this._enqueueCount = 0;
    
    /** @private @type {number} */
    this._dequeueCount = 0;
    
    /** @private @type {number} */
    this._droppedCount = 0;
    
    if (this._enableAging) {
      this._startAging();
    }
  }
  
  /**
   * Enqueue an event with priority
   * @param {Object} event - Event envelope to queue
   * @param {number} [priority=EventPriority.NORMAL] - Priority level
   * @param {string} [sourceNodeId='unknown'] - Source node ID
   * @returns {boolean} True if enqueued, false if queue full
   */
  enqueue(event, priority = EventPriority.NORMAL, sourceNodeId = 'unknown') {
    if (this._heap.length >= this._maxSize) {
      this._droppedCount++;
      console.warn('[PropagationQueue] Queue full, dropping event', {
        eventId: event.id,
        priority,
        queueSize: this._heap.length
      });
      return false;
    }
    
    const queuedEvent = {
      event,
      priority,
      timestamp: performance.now(),
      sourceNodeId,
      queueIndex: this._heap.length
    };
    
    this._heap.push(queuedEvent);
    this._eventIndexMap.set(event.id, this._heap.length - 1);
    this._bubbleUp(this._heap.length - 1);
    this._enqueueCount++;
    
    return true;
  }
  
  /**
   * Dequeue highest priority event
   * @returns {Object|null} Event envelope or null if empty
   */
  dequeue() {
    if (this._heap.length === 0) {
      return null;
    }
    
    const queuedEvent = this._heap[0];
    const lastEvent = this._heap.pop();
    
    this._eventIndexMap.delete(queuedEvent.event.id);
    
    if (this._heap.length > 0 && lastEvent) {
      this._heap[0] = lastEvent;
      this._heap[0].queueIndex = 0;
      this._eventIndexMap.set(lastEvent.event.id, 0);
      this._bubbleDown(0);
    }
    
    this._dequeueCount++;
    return queuedEvent.event;
  }
  
  /**
   * Peek at highest priority event without removing
   * @returns {Object|null} Event envelope or null if empty
   */
  peek() {
    return this._heap.length > 0 ? this._heap[0].event : null;
  }
  
  /**
   * Update priority of queued event
   * @param {string} eventId - Event ID to update
   * @param {number} newPriority - New priority level
   * @returns {boolean} True if updated, false if not found
   */
  updatePriority(eventId, newPriority) {
    const index = this._eventIndexMap.get(eventId);
    if (index === undefined) {
      return false;
    }
    
    const oldPriority = this._heap[index].priority;
    this._heap[index].priority = newPriority;
    
    if (newPriority > oldPriority) {
      this._bubbleUp(index);
    } else if (newPriority < oldPriority) {
      this._bubbleDown(index);
    }
    
    return true;
  }
  
  /**
   * Check if event is in queue
   * @param {string} eventId - Event ID to check
   * @returns {boolean} True if queued
   */
  has(eventId) {
    return this._eventIndexMap.has(eventId);
  }
  
  /**
   * Get current queue size
   * @returns {number} Number of queued events
   */
  get size() {
    return this._heap.length;
  }
  
  /**
   * Check if queue is empty
   * @returns {boolean} True if empty
   */
  get isEmpty() {
    return this._heap.length === 0;
  }
  
  /**
   * Check if queue is full
   * @returns {boolean} True if at max size
   */
  get isFull() {
    return this._heap.length >= this._maxSize;
  }
  
  /**
   * Clear all queued events
   */
  clear() {
    this._heap = [];
    this._eventIndexMap.clear();
  }
  
  /**
   * Get queue statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const priorities = this._heap.map(qe => qe.priority);
    const ages = this._heap.map(qe => performance.now() - qe.timestamp);
    
    return {
      size: this._heap.length,
      maxSize: this._maxSize,
      enqueueCount: this._enqueueCount,
      dequeueCount: this._dequeueCount,
      droppedCount: this._droppedCount,
      avgPriority: priorities.length > 0 
        ? priorities.reduce((a, b) => a + b, 0) / priorities.length 
        : 0,
      maxAge: ages.length > 0 ? Math.max(...ages) : 0,
      avgAge: ages.length > 0 
        ? ages.reduce((a, b) => a + b, 0) / ages.length 
        : 0
    };
  }
  
  /**
   * Bubble element up to maintain heap property
   * @private
   * @param {number} index - Element index
   */
  _bubbleUp(index) {
    const element = this._heap[index];
    
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this._heap[parentIndex];
      
      // Max heap: parent priority should be >= child priority
      if (parent.priority >= element.priority) {
        break;
      }
      
      // Swap with parent
      this._heap[index] = parent;
      parent.queueIndex = index;
      this._eventIndexMap.set(parent.event.id, index);
      
      index = parentIndex;
    }
    
    this._heap[index] = element;
    element.queueIndex = index;
    this._eventIndexMap.set(element.event.id, index);
  }
  
  /**
   * Bubble element down to maintain heap property
   * @private
   * @param {number} index - Element index
   */
  _bubbleDown(index) {
    const element = this._heap[index];
    const length = this._heap.length;
    
    while (true) {
      const leftIndex = 2 * index + 1;
      const rightIndex = 2 * index + 2;
      let maxIndex = index;
      
      // Find child with highest priority
      if (leftIndex < length && 
          this._heap[leftIndex].priority > this._heap[maxIndex].priority) {
        maxIndex = leftIndex;
      }
      
      if (rightIndex < length && 
          this._heap[rightIndex].priority > this._heap[maxIndex].priority) {
        maxIndex = rightIndex;
      }
      
      // If current element has highest priority, we're done
      if (maxIndex === index) {
        break;
      }
      
      // Swap with highest priority child
      const child = this._heap[maxIndex];
      this._heap[index] = child;
      child.queueIndex = index;
      this._eventIndexMap.set(child.event.id, index);
      
      index = maxIndex;
    }
    
    this._heap[index] = element;
    element.queueIndex = index;
    this._eventIndexMap.set(element.event.id, index);
  }
  
  /**
   * Start priority aging to prevent starvation
   * @private
   */
  _startAging() {
    this._agingTimer = setInterval(() => {
      this._ageEvents();
    }, this._agingInterval);
  }
  
  /**
   * Age events by boosting priority of old events
   * @private
   */
  _ageEvents() {
    if (this._heap.length === 0) return;
    
    const now = performance.now();
    let needsRebuild = false;
    
    for (let i = 0; i < this._heap.length; i++) {
      const queuedEvent = this._heap[i];
      const age = now - queuedEvent.timestamp;
      
      // Boost priority for events older than aging interval
      if (age >= this._agingInterval) {
        const oldPriority = queuedEvent.priority;
        queuedEvent.priority = Math.min(
          EventPriority.CRITICAL,
          queuedEvent.priority + this._agingBoost
        );
        
        if (queuedEvent.priority !== oldPriority) {
          needsRebuild = true;
        }
      }
    }
    
    // Rebuild heap if priorities changed
    if (needsRebuild) {
      this._rebuildHeap();
    }
  }
  
  /**
   * Rebuild heap from scratch (heapify)
   * @private
   */
  _rebuildHeap() {
    // Start from last non-leaf node and bubble down
    for (let i = Math.floor(this._heap.length / 2) - 1; i >= 0; i--) {
      this._bubbleDown(i);
    }
  }
  
  /**
   * Stop priority aging and cleanup
   */
  dispose() {
    if (this._agingTimer !== null) {
      clearInterval(this._agingTimer);
      this._agingTimer = null;
    }
    this.clear();
  }
}