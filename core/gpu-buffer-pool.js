/**
 * @fileoverview GPU Buffer Pool Management
 * 
 * Implements efficient buffer reuse for WebGPU operations to minimize allocation overhead.
 * Buffers are pooled by size and usage flags, with automatic cleanup of unused buffers.
 * 
 * Architecture:
 * - Size-based pooling: Buffers grouped by size buckets (powers of 2)
 * - Usage-based pooling: Separate pools per GPUBufferUsageFlags combination
 * - LRU eviction: Least recently used buffers are freed when pool exceeds limits
 * - Automatic growth: Pool grows on demand, shrinks during idle periods
 * 
 * Performance targets:
 * - Buffer acquisition: < 1ms (reuse) vs ~5ms (allocation)
 * - Memory overhead: < 10MB for typical workloads
 * - Fragmentation: < 5% wasted space
 * 
 * Related:
 * - core/webgpu-device.js: Device initialization
 * - core/compute-shader-pipeline.js: Shader compilation
 * - DESIGN_SYSTEM.md#gpu-buffer-pool-management
 * 
 * @module core/gpu-buffer-pool
 */

/**
 * Buffer pool entry metadata
 * @typedef {Object} PooledBuffer
 * @property {GPUBuffer} buffer - The GPU buffer instance
 * @property {number} size - Buffer size in bytes
 * @property {number} usage - GPUBufferUsageFlags bitmask
 * @property {number} lastUsed - Timestamp of last acquisition
 * @property {boolean} inUse - Whether buffer is currently acquired
 * @property {string} label - Debug label for the buffer
 */

/**
 * Pool configuration options
 * @typedef {Object} BufferPoolConfig
 * @property {number} [maxPoolSize=100] - Maximum buffers per pool
 * @property {number} [maxTotalMemory=50*1024*1024] - Max total memory (50MB default)
 * @property {number} [evictionThreshold=0.8] - Trigger cleanup at this utilization
 * @property {number} [minBufferSize=256] - Minimum buffer size to pool
 * @property {number} [maxBufferSize=16*1024*1024] - Maximum buffer size to pool (16MB)
 * @property {number} [idleTimeout=5000] - Release unused buffers after ms
 * @property {boolean} [enableMetrics=true] - Track pool statistics
 */

/**
 * Pool statistics for monitoring
 * @typedef {Object} PoolStatistics
 * @property {number} totalBuffers - Total buffers across all pools
 * @property {number} totalMemory - Total memory allocated in bytes
 * @property {number} activeBuffers - Currently acquired buffers
 * @property {number} hits - Successful buffer reuses
 * @property {number} misses - New buffer allocations
 * @property {number} evictions - Buffers freed due to pressure
 * @property {Map<number, number>} sizeDistribution - Buffers per size bucket
 * @property {Map<number, number>} usageDistribution - Buffers per usage type
 */

export class GPUBufferPool {
  /**
   * @param {GPUDevice} device - WebGPU device instance
   * @param {BufferPoolConfig} [config={}] - Pool configuration
   */
  constructor(device, config = {}) {
    if (!device) {
      throw new Error('GPUBufferPool requires a valid GPUDevice');
    }

    this.device = device;
    this.config = {
      maxPoolSize: 100,
      maxTotalMemory: 50 * 1024 * 1024, // 50MB
      evictionThreshold: 0.8,
      minBufferSize: 256,
      maxBufferSize: 16 * 1024 * 1024, // 16MB
      idleTimeout: 5000,
      enableMetrics: true,
      ...config
    };

    // Map of usage flags -> size bucket -> buffer array
    // Usage key format: "usage_<flags>"
    // Size bucket: next power of 2 >= requested size
    /** @type {Map<string, Map<number, PooledBuffer[]>>} */
    this.pools = new Map();

    /** @type {PoolStatistics} */
    this.stats = {
      totalBuffers: 0,
      totalMemory: 0,
      activeBuffers: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      sizeDistribution: new Map(),
      usageDistribution: new Map()
    };

    // Idle cleanup timer
    this.cleanupTimer = null;
    this.startIdleCleanup();
  }

  /**
   * Acquire a buffer from the pool or allocate a new one
   * 
   * @param {number} size - Required buffer size in bytes
   * @param {GPUBufferUsageFlags} usage - Buffer usage flags
   * @param {string} [label='pooled-buffer'] - Debug label
   * @returns {GPUBuffer} Acquired buffer (may be larger than requested)
   */
  acquire(size, usage, label = 'pooled-buffer') {
    // Validate inputs
    if (size <= 0) {
      throw new Error(`Invalid buffer size: ${size}`);
    }
    if (!Number.isInteger(usage) || usage <= 0) {
      throw new Error(`Invalid buffer usage flags: ${usage}`);
    }

    // Check if size is within pooling range
    if (size < this.config.minBufferSize || size > this.config.maxBufferSize) {
      // Allocate directly without pooling
      return this.allocateBuffer(size, usage, label);
    }

    const bucket = this.getSizeBucket(size);
    const usageKey = this.getUsageKey(usage);

    // Try to reuse from pool
    const pooledBuffer = this.findAvailableBuffer(usageKey, bucket);
    
    if (pooledBuffer) {
      pooledBuffer.inUse = true;
      pooledBuffer.lastUsed = performance.now();
      this.stats.activeBuffers++;
      this.stats.hits++;
      
      if (this.config.enableMetrics) {
        console.debug(`[BufferPool] Reused buffer: ${bucket} bytes, usage: ${usage}`);
      }
      
      return pooledBuffer.buffer;
    }

    // No available buffer, allocate new one
    this.stats.misses++;
    
    // Check memory pressure before allocating
    if (this.shouldEvict()) {
      this.evictLRU();
    }

    const buffer = this.allocateBuffer(bucket, usage, label);
    const entry = {
      buffer,
      size: bucket,
      usage,
      lastUsed: performance.now(),
      inUse: true,
      label
    };

    // Add to pool
    this.addToPool(usageKey, bucket, entry);
    this.stats.activeBuffers++;
    this.stats.totalBuffers++;
    this.stats.totalMemory += bucket;

    // Update distributions
    this.stats.sizeDistribution.set(
      bucket,
      (this.stats.sizeDistribution.get(bucket) || 0) + 1
    );
    this.stats.usageDistribution.set(
      usage,
      (this.stats.usageDistribution.get(usage) || 0) + 1
    );

    if (this.config.enableMetrics) {
      console.debug(`[BufferPool] Allocated new buffer: ${bucket} bytes, usage: ${usage}`);
    }

    return buffer;
  }

  /**
   * Release a buffer back to the pool
   * 
   * @param {GPUBuffer} buffer - Buffer to release
   */
  release(buffer) {
    if (!buffer) {
      console.warn('[BufferPool] Attempted to release null buffer');
      return;
    }

    // Find the buffer in pools
    let found = false;
    
    for (const [usageKey, sizePools] of this.pools.entries()) {
      for (const [bucket, buffers] of sizePools.entries()) {
        const entry = buffers.find(b => b.buffer === buffer);
        if (entry) {
          if (!entry.inUse) {
            console.warn('[BufferPool] Buffer already released');
            return;
          }
          
          entry.inUse = false;
          entry.lastUsed = performance.now();
          this.stats.activeBuffers--;
          found = true;
          
          if (this.config.enableMetrics) {
            console.debug(`[BufferPool] Released buffer: ${bucket} bytes`);
          }
          
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      console.warn('[BufferPool] Buffer not found in pool, destroying directly');
      buffer.destroy();
    }
  }

  /**
   * Get the next power-of-2 size bucket for a requested size
   * 
   * @private
   * @param {number} size - Requested size
   * @returns {number} Bucket size (power of 2)
   */
  getSizeBucket(size) {
    // Round up to next power of 2
    return Math.pow(2, Math.ceil(Math.log2(size)));
  }

  /**
   * Generate usage key for pool indexing
   * 
   * @private
   * @param {GPUBufferUsageFlags} usage - Buffer usage flags
   * @returns {string} Usage key
   */
  getUsageKey(usage) {
    return `usage_${usage}`;
  }

  /**
   * Find an available buffer in the pool
   * 
   * @private
   * @param {string} usageKey - Usage pool key
   * @param {number} bucket - Size bucket
   * @returns {PooledBuffer|null} Available buffer or null
   */
  findAvailableBuffer(usageKey, bucket) {
    const sizePools = this.pools.get(usageKey);
    if (!sizePools) return null;

    const buffers = sizePools.get(bucket);
    if (!buffers || buffers.length === 0) return null;

    // Find first unused buffer
    return buffers.find(b => !b.inUse) || null;
  }

  /**
   * Add buffer entry to pool
   * 
   * @private
   * @param {string} usageKey - Usage pool key
   * @param {number} bucket - Size bucket
   * @param {PooledBuffer} entry - Buffer entry
   */
  addToPool(usageKey, bucket, entry) {
    if (!this.pools.has(usageKey)) {
      this.pools.set(usageKey, new Map());
    }

    const sizePools = this.pools.get(usageKey);
    if (!sizePools.has(bucket)) {
      sizePools.set(bucket, []);
    }

    sizePools.get(bucket).push(entry);
  }

  /**
   * Allocate a new GPU buffer
   * 
   * @private
   * @param {number} size - Buffer size
   * @param {GPUBufferUsageFlags} usage - Usage flags
   * @param {string} label - Debug label
   * @returns {GPUBuffer} Allocated buffer
   */
  allocateBuffer(size, usage, label) {
    try {
      return this.device.createBuffer({
        size,
        usage,
        label
      });
    } catch (error) {
      console.error('[BufferPool] Failed to allocate buffer:', error);
      throw new Error(`Buffer allocation failed: ${error.message}`);
    }
  }

  /**
   * Check if eviction should be triggered
   * 
   * @private
   * @returns {boolean} True if eviction needed
   */
  shouldEvict() {
    const memoryUtilization = this.stats.totalMemory / this.config.maxTotalMemory;
    const bufferUtilization = this.stats.totalBuffers / this.config.maxPoolSize;
    
    return memoryUtilization > this.config.evictionThreshold ||
           bufferUtilization > this.config.evictionThreshold;
  }

  /**
   * Evict least recently used buffers
   * 
   * @private
   */
  evictLRU() {
    const allBuffers = [];
    
    // Collect all unused buffers with timestamps
    for (const [usageKey, sizePools] of this.pools.entries()) {
      for (const [bucket, buffers] of sizePools.entries()) {
        for (const entry of buffers) {
          if (!entry.inUse) {
            allBuffers.push({ usageKey, bucket, entry });
          }
        }
      }
    }

    // Sort by last used time (oldest first)
    allBuffers.sort((a, b) => a.entry.lastUsed - b.entry.lastUsed);

    // Evict oldest 25% of unused buffers
    const evictCount = Math.ceil(allBuffers.length * 0.25);
    
    for (let i = 0; i < evictCount && i < allBuffers.length; i++) {
      const { usageKey, bucket, entry } = allBuffers[i];
      
      // Remove from pool
      const sizePools = this.pools.get(usageKey);
      const buffers = sizePools.get(bucket);
      const index = buffers.indexOf(entry);
      
      if (index !== -1) {
        buffers.splice(index, 1);
        entry.buffer.destroy();
        
        this.stats.totalBuffers--;
        this.stats.totalMemory -= entry.size;
        this.stats.evictions++;
        
        // Update distributions
        const sizeCount = this.stats.sizeDistribution.get(bucket) || 0;
        if (sizeCount > 1) {
          this.stats.sizeDistribution.set(bucket, sizeCount - 1);
        } else {
          this.stats.sizeDistribution.delete(bucket);
        }
        
        const usageCount = this.stats.usageDistribution.get(entry.usage) || 0;
        if (usageCount > 1) {
          this.stats.usageDistribution.set(entry.usage, usageCount - 1);
        } else {
          this.stats.usageDistribution.delete(entry.usage);
        }
      }
    }

    if (this.config.enableMetrics && evictCount > 0) {
      console.debug(`[BufferPool] Evicted ${evictCount} buffers (LRU)`);
    }
  }

  /**
   * Start idle cleanup timer
   * 
   * @private
   */
  startIdleCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleBuffers();
    }, this.config.idleTimeout);
  }

  /**
   * Clean up buffers that have been idle for too long
   * 
   * @private
   */
  cleanupIdleBuffers() {
    const now = performance.now();
    const idleThreshold = now - this.config.idleTimeout;
    let cleanedCount = 0;

    for (const [usageKey, sizePools] of this.pools.entries()) {
      for (const [bucket, buffers] of sizePools.entries()) {
        for (let i = buffers.length - 1; i >= 0; i--) {
          const entry = buffers[i];
          
          if (!entry.inUse && entry.lastUsed < idleThreshold) {
            buffers.splice(i, 1);
            entry.buffer.destroy();
            
            this.stats.totalBuffers--;
            this.stats.totalMemory -= entry.size;
            cleanedCount++;
            
            // Update distributions
            const sizeCount = this.stats.sizeDistribution.get(bucket) || 0;
            if (sizeCount > 1) {
              this.stats.sizeDistribution.set(bucket, sizeCount - 1);
            } else {
              this.stats.sizeDistribution.delete(bucket);
            }
            
            const usageCount = this.stats.usageDistribution.get(entry.usage) || 0;
            if (usageCount > 1) {
              this.stats.usageDistribution.set(entry.usage, usageCount - 1);
            } else {
              this.stats.usageDistribution.delete(entry.usage);
            }
          }
        }
        
        // Remove empty bucket
        if (buffers.length === 0) {
          sizePools.delete(bucket);
        }
      }
      
      // Remove empty usage pool
      if (sizePools.size === 0) {
        this.pools.delete(usageKey);
      }
    }

    if (this.config.enableMetrics && cleanedCount > 0) {
      console.debug(`[BufferPool] Cleaned up ${cleanedCount} idle buffers`);
    }
  }

  /**
   * Get current pool statistics
   * 
   * @returns {PoolStatistics} Current statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      sizeDistribution: new Map(this.stats.sizeDistribution),
      usageDistribution: new Map(this.stats.usageDistribution),
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memoryUtilization: this.stats.totalMemory / this.config.maxTotalMemory,
      bufferUtilization: this.stats.totalBuffers / this.config.maxPoolSize
    };
  }

  /**
   * Reset pool statistics
   */
  resetStatistics() {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  /**
   * Destroy all buffers and clean up
   */
  destroy() {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Destroy all buffers
    for (const [usageKey, sizePools] of this.pools.entries()) {
      for (const [bucket, buffers] of sizePools.entries()) {
        for (const entry of buffers) {
          entry.buffer.destroy();
        }
      }
    }

    // Clear pools
    this.pools.clear();

    // Reset stats
    this.stats.totalBuffers = 0;
    this.stats.totalMemory = 0;
    this.stats.activeBuffers = 0;
    this.stats.sizeDistribution.clear();
    this.stats.usageDistribution.clear();

    if (this.config.enableMetrics) {
      console.debug('[BufferPool] Destroyed');
    }
  }

  /**
   * Trim pool to reduce memory usage
   * Useful before low-priority operations or when memory pressure is detected
   * 
   * @param {number} [targetUtilization=0.5] - Target memory utilization (0-1)
   */
  trim(targetUtilization = 0.5) {
    const targetMemory = this.config.maxTotalMemory * targetUtilization;
    
    if (this.stats.totalMemory <= targetMemory) {
      return; // Already below target
    }

    const allBuffers = [];
    
    // Collect all unused buffers
    for (const [usageKey, sizePools] of this.pools.entries()) {
      for (const [bucket, buffers] of sizePools.entries()) {
        for (const entry of buffers) {
          if (!entry.inUse) {
            allBuffers.push({ usageKey, bucket, entry });
          }
        }
      }
    }

    // Sort by last used (oldest first)
    allBuffers.sort((a, b) => a.entry.lastUsed - b.entry.lastUsed);

    // Remove buffers until target is reached
    let freedMemory = 0;
    let freedCount = 0;
    
    for (const { usageKey, bucket, entry } of allBuffers) {
      if (this.stats.totalMemory - freedMemory <= targetMemory) {
        break;
      }

      const sizePools = this.pools.get(usageKey);
      const buffers = sizePools.get(bucket);
      const index = buffers.indexOf(entry);
      
      if (index !== -1) {
        buffers.splice(index, 1);
        entry.buffer.destroy();
        
        freedMemory += entry.size;
        freedCount++;
        
        this.stats.totalBuffers--;
        this.stats.totalMemory -= entry.size;
        
        // Update distributions
        const sizeCount = this.stats.sizeDistribution.get(bucket) || 0;
        if (sizeCount > 1) {
          this.stats.sizeDistribution.set(bucket, sizeCount - 1);
        } else {
          this.stats.sizeDistribution.delete(bucket);
        }
        
        const usageCount = this.stats.usageDistribution.get(entry.usage) || 0;
        if (usageCount > 1) {
          this.stats.usageDistribution.set(entry.usage, usageCount - 1);
        } else {
          this.stats.usageDistribution.delete(entry.usage);
        }
      }
    }

    if (this.config.enableMetrics && freedCount > 0) {
      console.debug(`[BufferPool] Trimmed ${freedCount} buffers, freed ${(freedMemory / 1024 / 1024).toFixed(2)}MB`);
    }
  }
}