/**
 * @fileoverview WASMMemoryManager - Shared memory allocation for graph data structures
 * 
 * Manages SharedArrayBuffer allocation for efficient data transfer between
 * JavaScript and WASM bounded contexts. Implements memory pooling and region
 * management to stay within the 50MB WASM heap budget.
 * 
 * Memory Layout:
 * - Header (64 bytes): Metadata about allocations
 * - Pool regions: Fixed-size blocks for graph nodes/edges
 * - Dynamic region: Variable-size allocations for large graphs
 * 
 * Performance Constraints:
 * - Maximum 50MB total WASM heap (MANDATORY RULE)
 * - Zero-copy data transfer using SharedArrayBuffer
 * - Lock-free allocation for single-threaded contexts
 * 
 * Related: harmony-graph/*, bounded-contexts/*, DESIGN_SYSTEM.md#memory-management
 * 
 * @module core/wasm-memory-manager
 */

/**
 * Memory region types for different graph data structures
 * @enum {number}
 */
export const MemoryRegionType = {
  GRAPH_NODES: 0,      // Node data (id, type, metadata)
  GRAPH_EDGES: 1,      // Edge data (source, target, weight)
  ADJACENCY_LIST: 2,   // Adjacency list indices
  TRAVERSAL_STATE: 3,  // BFS/DFS visitor state
  PARTITION_DATA: 4,   // Graph partition metadata
  DYNAMIC: 5           // Variable-size allocations
};

/**
 * Memory allocation block descriptor
 * @typedef {Object} MemoryBlock
 * @property {number} offset - Byte offset in SharedArrayBuffer
 * @property {number} size - Size in bytes
 * @property {MemoryRegionType} type - Region type
 * @property {boolean} inUse - Whether block is currently allocated
 * @property {number} refCount - Reference count for shared allocations
 */

/**
 * WASMMemoryManager - Manages shared memory for graph data structures
 * 
 * @class
 * @example
 * const memManager = new WASMMemoryManager({ maxHeapSize: 50 * 1024 * 1024 });
 * const nodeBlock = memManager.allocate(1024 * 1024, MemoryRegionType.GRAPH_NODES);
 * const nodeArray = new Uint32Array(nodeBlock.buffer, nodeBlock.offset, nodeBlock.size / 4);
 * // ... use nodeArray for graph operations
 * memManager.free(nodeBlock);
 */
export class WASMMemoryManager {
  /**
   * @param {Object} config - Configuration options
   * @param {number} [config.maxHeapSize=52428800] - Maximum heap size (50MB default)
   * @param {number} [config.nodePoolSize=8388608] - Node pool size (8MB default)
   * @param {number} [config.edgePoolSize=16777216] - Edge pool size (16MB default)
   * @param {number} [config.blockAlignment=8] - Memory alignment in bytes
   */
  constructor(config = {}) {
    this.maxHeapSize = config.maxHeapSize || 50 * 1024 * 1024; // 50MB limit
    this.nodePoolSize = config.nodePoolSize || 8 * 1024 * 1024; // 8MB
    this.edgePoolSize = config.edgePoolSize || 16 * 1024 * 1024; // 16MB
    this.blockAlignment = config.blockAlignment || 8;
    
    // Header size: 64 bytes for metadata
    this.headerSize = 64;
    
    // Calculate total initial size
    const initialSize = this.headerSize + 
                        this.nodePoolSize + 
                        this.edgePoolSize + 
                        (10 * 1024 * 1024); // 10MB for other regions
    
    if (initialSize > this.maxHeapSize) {
      throw new Error(`Initial memory layout exceeds max heap size: ${initialSize} > ${this.maxHeapSize}`);
    }
    
    // Create SharedArrayBuffer for cross-context sharing
    this.buffer = new SharedArrayBuffer(this.maxHeapSize);
    
    // Initialize memory regions
    this.regions = new Map();
    this.freeBlocks = new Map(); // type -> array of free blocks
    this.allocatedBlocks = new Map(); // blockId -> MemoryBlock
    
    this._initializeRegions();
    this._initializeHeader();
    
    // Statistics for monitoring
    this.stats = {
      totalAllocated: 0,
      peakAllocated: 0,
      allocationCount: 0,
      freeCount: 0,
      fragmentationRatio: 0
    };
    
    this._blockIdCounter = 0;
    
    console.log('[WASMMemoryManager] Initialized with max heap:', this.maxHeapSize, 'bytes');
  }
  
  /**
   * Initialize memory regions with fixed layouts
   * @private
   */
  _initializeRegions() {
    let offset = this.headerSize;
    
    // Node pool region
    this.regions.set(MemoryRegionType.GRAPH_NODES, {
      offset,
      size: this.nodePoolSize,
      type: MemoryRegionType.GRAPH_NODES
    });
    this.freeBlocks.set(MemoryRegionType.GRAPH_NODES, [{
      offset,
      size: this.nodePoolSize,
      inUse: false
    }]);
    offset += this.nodePoolSize;
    
    // Edge pool region
    this.regions.set(MemoryRegionType.GRAPH_EDGES, {
      offset,
      size: this.edgePoolSize,
      type: MemoryRegionType.GRAPH_EDGES
    });
    this.freeBlocks.set(MemoryRegionType.GRAPH_EDGES, [{
      offset,
      size: this.edgePoolSize,
      inUse: false
    }]);
    offset += this.edgePoolSize;
    
    // Smaller regions for other data structures
    const smallRegionSize = 2 * 1024 * 1024; // 2MB each
    
    [MemoryRegionType.ADJACENCY_LIST, 
     MemoryRegionType.TRAVERSAL_STATE, 
     MemoryRegionType.PARTITION_DATA].forEach(type => {
      this.regions.set(type, {
        offset,
        size: smallRegionSize,
        type
      });
      this.freeBlocks.set(type, [{
        offset,
        size: smallRegionSize,
        inUse: false
      }]);
      offset += smallRegionSize;
    });
    
    // Dynamic region for variable allocations
    const dynamicSize = this.maxHeapSize - offset;
    this.regions.set(MemoryRegionType.DYNAMIC, {
      offset,
      size: dynamicSize,
      type: MemoryRegionType.DYNAMIC
    });
    this.freeBlocks.set(MemoryRegionType.DYNAMIC, [{
      offset,
      size: dynamicSize,
      inUse: false
    }]);
  }
  
  /**
   * Initialize header with metadata
   * @private
   */
  _initializeHeader() {
    const header = new Uint32Array(this.buffer, 0, this.headerSize / 4);
    header[0] = 0x57415348; // Magic number: 'WASH' (WASM Harmony)
    header[1] = 1; // Version
    header[2] = this.maxHeapSize;
    header[3] = Date.now() & 0xFFFFFFFF; // Initialization timestamp
  }
  
  /**
   * Allocate memory block for graph data
   * 
   * @param {number} size - Size in bytes (will be aligned)
   * @param {MemoryRegionType} type - Region type
   * @returns {Object} Allocation descriptor { id, buffer, offset, size, type }
   * @throws {Error} If allocation fails (out of memory or exceeds budget)
   */
  allocate(size, type) {
    // Align size to block alignment
    const alignedSize = Math.ceil(size / this.blockAlignment) * this.blockAlignment;
    
    // Check if allocation would exceed budget
    if (this.stats.totalAllocated + alignedSize > this.maxHeapSize) {
      throw new Error(`Allocation would exceed max heap size: ${this.stats.totalAllocated + alignedSize} > ${this.maxHeapSize}`);
    }
    
    // Find suitable free block
    const freeList = this.freeBlocks.get(type);
    if (!freeList) {
      throw new Error(`Invalid memory region type: ${type}`);
    }
    
    const blockIndex = freeList.findIndex(block => !block.inUse && block.size >= alignedSize);
    
    if (blockIndex === -1) {
      // Try to compact and retry
      this._compactRegion(type);
      const retryIndex = freeList.findIndex(block => !block.inUse && block.size >= alignedSize);
      
      if (retryIndex === -1) {
        throw new Error(`Out of memory in region ${type}: requested ${alignedSize} bytes`);
      }
    }
    
    const freeBlock = freeList[blockIndex >= 0 ? blockIndex : 0];
    
    // Split block if larger than needed
    const remainingSize = freeBlock.size - alignedSize;
    const allocatedBlock = {
      offset: freeBlock.offset,
      size: alignedSize,
      type,
      inUse: true,
      refCount: 1
    };
    
    if (remainingSize > 0) {
      freeBlock.offset += alignedSize;
      freeBlock.size = remainingSize;
    } else {
      freeList.splice(blockIndex, 1);
    }
    
    // Create allocation descriptor
    const blockId = ++this._blockIdCounter;
    this.allocatedBlocks.set(blockId, allocatedBlock);
    
    // Update statistics
    this.stats.totalAllocated += alignedSize;
    this.stats.peakAllocated = Math.max(this.stats.peakAllocated, this.stats.totalAllocated);
    this.stats.allocationCount++;
    
    console.log(`[WASMMemoryManager] Allocated ${alignedSize} bytes in region ${type}, block ID: ${blockId}`);
    
    return {
      id: blockId,
      buffer: this.buffer,
      offset: allocatedBlock.offset,
      size: alignedSize,
      type
    };
  }
  
  /**
   * Free previously allocated memory block
   * 
   * @param {Object} allocation - Allocation descriptor from allocate()
   */
  free(allocation) {
    const block = this.allocatedBlocks.get(allocation.id);
    
    if (!block) {
      console.warn(`[WASMMemoryManager] Attempted to free unknown block: ${allocation.id}`);
      return;
    }
    
    // Decrement reference count
    block.refCount--;
    
    if (block.refCount > 0) {
      return; // Still referenced elsewhere
    }
    
    // Mark as free
    block.inUse = false;
    this.allocatedBlocks.delete(allocation.id);
    
    // Return to free list
    const freeList = this.freeBlocks.get(block.type);
    freeList.push({
      offset: block.offset,
      size: block.size,
      inUse: false
    });
    
    // Sort free list by offset for coalescing
    freeList.sort((a, b) => a.offset - b.offset);
    
    // Coalesce adjacent free blocks
    this._coalesceBlocks(block.type);
    
    // Update statistics
    this.stats.totalAllocated -= block.size;
    this.stats.freeCount++;
    
    console.log(`[WASMMemoryManager] Freed ${block.size} bytes from region ${block.type}, block ID: ${allocation.id}`);
  }
  
  /**
   * Increment reference count for shared allocation
   * 
   * @param {Object} allocation - Allocation descriptor
   */
  addRef(allocation) {
    const block = this.allocatedBlocks.get(allocation.id);
    if (block) {
      block.refCount++;
    }
  }
  
  /**
   * Coalesce adjacent free blocks in a region
   * @private
   * @param {MemoryRegionType} type - Region type
   */
  _coalesceBlocks(type) {
    const freeList = this.freeBlocks.get(type);
    
    for (let i = 0; i < freeList.length - 1; i++) {
      const current = freeList[i];
      const next = freeList[i + 1];
      
      if (current.offset + current.size === next.offset) {
        // Adjacent blocks - merge them
        current.size += next.size;
        freeList.splice(i + 1, 1);
        i--; // Recheck current position
      }
    }
  }
  
  /**
   * Compact a memory region to reduce fragmentation
   * @private
   * @param {MemoryRegionType} type - Region type
   */
  _compactRegion(type) {
    // For now, just coalesce - full compaction would require moving allocations
    this._coalesceBlocks(type);
    
    // Calculate fragmentation ratio
    const freeList = this.freeBlocks.get(type);
    const totalFree = freeList.reduce((sum, block) => sum + block.size, 0);
    const largestFree = Math.max(...freeList.map(block => block.size), 0);
    
    this.stats.fragmentationRatio = totalFree > 0 ? 1 - (largestFree / totalFree) : 0;
  }
  
  /**
   * Get memory statistics
   * 
   * @returns {Object} Memory statistics
   */
  getStats() {
    return {
      ...this.stats,
      utilizationPercent: (this.stats.totalAllocated / this.maxHeapSize) * 100,
      availableBytes: this.maxHeapSize - this.stats.totalAllocated
    };
  }
  
  /**
   * Get SharedArrayBuffer for cross-context sharing
   * 
   * @returns {SharedArrayBuffer} The underlying buffer
   */
  getBuffer() {
    return this.buffer;
  }
  
  /**
   * Create a typed array view for a specific allocation
   * 
   * @param {Object} allocation - Allocation descriptor
   * @param {Function} TypedArrayConstructor - Typed array constructor (Uint32Array, Float32Array, etc.)
   * @returns {TypedArray} Typed array view
   */
  createView(allocation, TypedArrayConstructor = Uint32Array) {
    const bytesPerElement = TypedArrayConstructor.BYTES_PER_ELEMENT;
    const length = Math.floor(allocation.size / bytesPerElement);
    
    return new TypedArrayConstructor(allocation.buffer, allocation.offset, length);
  }
  
  /**
   * Reset all allocations (for testing/cleanup)
   * WARNING: Invalidates all existing allocations
   */
  reset() {
    this.allocatedBlocks.clear();
    this.stats = {
      totalAllocated: 0,
      peakAllocated: 0,
      allocationCount: 0,
      freeCount: 0,
      fragmentationRatio: 0
    };
    
    this._initializeRegions();
    this._initializeHeader();
    
    console.log('[WASMMemoryManager] Reset complete');
  }
}

/**
 * Global singleton instance for shared memory management
 * @type {WASMMemoryManager|null}
 */
let globalMemoryManager = null;

/**
 * Get or create global memory manager instance
 * 
 * @param {Object} [config] - Configuration (only used on first call)
 * @returns {WASMMemoryManager} Global instance
 */
export function getMemoryManager(config) {
  if (!globalMemoryManager) {
    globalMemoryManager = new WASMMemoryManager(config);
  }
  return globalMemoryManager;
}

/**
 * Reset global memory manager (for testing)
 */
export function resetGlobalMemoryManager() {
  if (globalMemoryManager) {
    globalMemoryManager.reset();
    globalMemoryManager = null;
  }
}