/**
 * @fileoverview GPUSyncBarrier: Synchronization points between GPU compute and CPU logic
 * 
 * Manages synchronization barriers for coordinating GPU compute operations with CPU logic.
 * Ensures data consistency when transferring results from GPU back to CPU memory.
 * 
 * Key Features:
 * - Fence-based synchronization for GPU command completion
 * - Query sets for timing and performance measurement
 * - Async/await pattern for CPU-side waiting
 * - Multiple barrier types (compute, transfer, render)
 * - Timeout handling for hung operations
 * 
 * Performance Targets:
 * - Barrier overhead: <1ms per sync point
 * - Query resolution: <0.5ms
 * - Maximum concurrent barriers: 32
 * 
 * Related Files:
 * - ../bounded-contexts/wasm-bridge/wasm-bridge.js - WASM/GPU coordination
 * - ./gpu-memory-pool.js - GPU memory management
 * - ../core/event-bus.js - Event-driven coordination
 * 
 * @see DESIGN_SYSTEM.md#gpu-sync-barrier
 */

/**
 * @typedef {Object} BarrierConfig
 * @property {string} id - Unique barrier identifier
 * @property {'compute'|'transfer'|'render'} type - Barrier type
 * @property {number} [timeout=5000] - Timeout in milliseconds
 * @property {boolean} [measureTiming=false] - Enable GPU timing queries
 */

/**
 * @typedef {Object} BarrierResult
 * @property {string} id - Barrier identifier
 * @property {boolean} completed - Whether barrier completed successfully
 * @property {number} duration - Duration in milliseconds (if timing enabled)
 * @property {boolean} timedOut - Whether barrier timed out
 * @property {Error} [error] - Error if barrier failed
 */

/**
 * GPUSyncBarrier manages synchronization between GPU and CPU operations
 */
class GPUSyncBarrier {
  /**
   * @param {GPUDevice} device - WebGPU device
   */
  constructor(device) {
    if (!device) {
      throw new Error('GPUSyncBarrier requires a valid GPUDevice');
    }

    /** @type {GPUDevice} */
    this.device = device;

    /** @type {Map<string, Promise<BarrierResult>>} */
    this.activeBarriers = new Map();

    /** @type {Map<string, GPUQuerySet>} */
    this.querySets = new Map();

    /** @type {Map<string, GPUBuffer>} */
    this.queryBuffers = new Map();

    /** @type {number} */
    this.maxConcurrentBarriers = 32;

    /** @type {number} */
    this.barrierCount = 0;

    // Performance tracking
    this.stats = {
      totalBarriers: 0,
      completedBarriers: 0,
      timedOutBarriers: 0,
      averageDuration: 0,
      maxDuration: 0
    };
  }

  /**
   * Create a synchronization barrier
   * @param {BarrierConfig} config - Barrier configuration
   * @returns {Promise<BarrierResult>} Barrier result promise
   */
  async createBarrier(config) {
    const {
      id = `barrier-${this.barrierCount++}`,
      type = 'compute',
      timeout = 5000,
      measureTiming = false
    } = config;

    // Check concurrent barrier limit
    if (this.activeBarriers.size >= this.maxConcurrentBarriers) {
      throw new Error(`Maximum concurrent barriers (${this.maxConcurrentBarriers}) exceeded`);
    }

    // Create barrier promise
    const barrierPromise = this._executeBarrier(id, type, timeout, measureTiming);
    this.activeBarriers.set(id, barrierPromise);

    // Cleanup on completion
    barrierPromise.finally(() => {
      this.activeBarriers.delete(id);
      this._cleanupBarrierResources(id);
    });

    this.stats.totalBarriers++;

    return barrierPromise;
  }

  /**
   * Execute barrier synchronization
   * @private
   * @param {string} id - Barrier ID
   * @param {string} type - Barrier type
   * @param {number} timeout - Timeout in ms
   * @param {boolean} measureTiming - Enable timing
   * @returns {Promise<BarrierResult>}
   */
  async _executeBarrier(id, type, timeout, measureTiming) {
    const startTime = performance.now();
    let querySet = null;
    let queryBuffer = null;
    let resolveBuffer = null;

    try {
      // Create timing query if requested
      if (measureTiming) {
        querySet = this.device.createQuerySet({
          type: 'timestamp',
          count: 2
        });
        this.querySets.set(id, querySet);

        queryBuffer = this.device.createBuffer({
          size: 16, // 2 timestamps * 8 bytes
          usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
        });
        this.queryBuffers.set(id, queryBuffer);

        resolveBuffer = this.device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
      }

      // Create command encoder for barrier
      const commandEncoder = this.device.createCommandEncoder({
        label: `barrier-${id}`
      });

      // Write start timestamp
      if (measureTiming && querySet) {
        commandEncoder.writeTimestamp(querySet, 0);
      }

      // Insert barrier based on type
      switch (type) {
        case 'compute':
          // Compute barrier - no-op pass to ensure compute completion
          commandEncoder.insertDebugMarker(`compute-barrier-${id}`);
          break;

        case 'transfer':
          // Transfer barrier - ensure buffer copies complete
          commandEncoder.insertDebugMarker(`transfer-barrier-${id}`);
          break;

        case 'render':
          // Render barrier - ensure render pass completion
          commandEncoder.insertDebugMarker(`render-barrier-${id}`);
          break;

        default:
          throw new Error(`Unknown barrier type: ${type}`);
      }

      // Write end timestamp
      if (measureTiming && querySet) {
        commandEncoder.writeTimestamp(querySet, 1);
        commandEncoder.resolveQuerySet(querySet, 0, 2, queryBuffer, 0);
        commandEncoder.copyBufferToBuffer(queryBuffer, 0, resolveBuffer, 0, 16);
      }

      // Submit commands
      const commandBuffer = commandEncoder.finish();
      this.device.queue.submit([commandBuffer]);

      // Wait for completion with timeout
      const completed = await this._waitWithTimeout(
        this.device.queue.onSubmittedWorkDone(),
        timeout
      );

      if (!completed) {
        this.stats.timedOutBarriers++;
        return {
          id,
          completed: false,
          duration: performance.now() - startTime,
          timedOut: true
        };
      }

      // Read timing data if available
      let gpuDuration = 0;
      if (measureTiming && resolveBuffer) {
        await resolveBuffer.mapAsync(GPUMapMode.READ);
        const timestamps = new BigInt64Array(resolveBuffer.getMappedRange());
        const startTimestamp = Number(timestamps[0]);
        const endTimestamp = Number(timestamps[1]);
        gpuDuration = (endTimestamp - startTimestamp) / 1_000_000; // Convert to ms
        resolveBuffer.unmap();
        resolveBuffer.destroy();
      }

      const duration = measureTiming ? gpuDuration : (performance.now() - startTime);

      // Update stats
      this.stats.completedBarriers++;
      this.stats.averageDuration = 
        (this.stats.averageDuration * (this.stats.completedBarriers - 1) + duration) / 
        this.stats.completedBarriers;
      this.stats.maxDuration = Math.max(this.stats.maxDuration, duration);

      return {
        id,
        completed: true,
        duration,
        timedOut: false
      };

    } catch (error) {
      console.error(`Barrier ${id} failed:`, error);
      return {
        id,
        completed: false,
        duration: performance.now() - startTime,
        timedOut: false,
        error
      };
    }
  }

  /**
   * Wait for promise with timeout
   * @private
   * @param {Promise} promise - Promise to wait for
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<boolean>} True if completed, false if timed out
   */
  async _waitWithTimeout(promise, timeout) {
    let timeoutId;
    
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve(false), timeout);
    });

    const result = await Promise.race([
      promise.then(() => true),
      timeoutPromise
    ]);

    clearTimeout(timeoutId);
    return result;
  }

  /**
   * Cleanup barrier resources
   * @private
   * @param {string} id - Barrier ID
   */
  _cleanupBarrierResources(id) {
    const querySet = this.querySets.get(id);
    if (querySet) {
      querySet.destroy();
      this.querySets.delete(id);
    }

    const queryBuffer = this.queryBuffers.get(id);
    if (queryBuffer) {
      queryBuffer.destroy();
      this.queryBuffers.delete(id);
    }
  }

  /**
   * Wait for all active barriers to complete
   * @param {number} [timeout=10000] - Timeout in ms
   * @returns {Promise<BarrierResult[]>} Results for all barriers
   */
  async waitAll(timeout = 10000) {
    if (this.activeBarriers.size === 0) {
      return [];
    }

    const barriers = Array.from(this.activeBarriers.values());
    
    try {
      const results = await Promise.race([
        Promise.all(barriers),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('waitAll timeout')), timeout)
        )
      ]);
      return results;
    } catch (error) {
      console.error('waitAll failed:', error);
      return Array.from(this.activeBarriers.keys()).map(id => ({
        id,
        completed: false,
        duration: 0,
        timedOut: true,
        error
      }));
    }
  }

  /**
   * Create a barrier for compute pass completion
   * @param {string} [id] - Optional barrier ID
   * @returns {Promise<BarrierResult>}
   */
  async syncCompute(id) {
    return this.createBarrier({
      id,
      type: 'compute',
      measureTiming: true
    });
  }

  /**
   * Create a barrier for transfer completion
   * @param {string} [id] - Optional barrier ID
   * @returns {Promise<BarrierResult>}
   */
  async syncTransfer(id) {
    return this.createBarrier({
      id,
      type: 'transfer',
      measureTiming: false
    });
  }

  /**
   * Create a barrier for render pass completion
   * @param {string} [id] - Optional barrier ID
   * @returns {Promise<BarrierResult>}
   */
  async syncRender(id) {
    return this.createBarrier({
      id,
      type: 'render',
      measureTiming: false
    });
  }

  /**
   * Get current statistics
   * @returns {Object} Current stats
   */
  getStats() {
    return {
      ...this.stats,
      activeBarriers: this.activeBarriers.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalBarriers: 0,
      completedBarriers: 0,
      timedOutBarriers: 0,
      averageDuration: 0,
      maxDuration: 0
    };
  }

  /**
   * Cleanup all resources
   */
  destroy() {
    // Wait for active barriers
    this.waitAll(1000).catch(() => {
      console.warn('Some barriers did not complete during destroy');
    });

    // Cleanup query resources
    for (const querySet of this.querySets.values()) {
      querySet.destroy();
    }
    this.querySets.clear();

    for (const buffer of this.queryBuffers.values()) {
      buffer.destroy();
    }
    this.queryBuffers.clear();

    this.activeBarriers.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GPUSyncBarrier };
}