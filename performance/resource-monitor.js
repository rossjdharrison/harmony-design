/**
 * @fileoverview ResourceMonitor - Tracks CPU, memory, and GPU utilization
 * @module performance/resource-monitor
 * 
 * Monitors system resources and publishes metrics via EventBus.
 * Provides real-time tracking of:
 * - CPU utilization (via performance.now() deltas)
 * - Memory usage (heap size, used JS heap)
 * - GPU utilization (via WebGPU query sets when available)
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#resource-monitoring}
 */

/**
 * @typedef {Object} ResourceMetrics
 * @property {number} timestamp - Measurement timestamp (ms since epoch)
 * @property {CPUMetrics} cpu - CPU utilization metrics
 * @property {MemoryMetrics} memory - Memory usage metrics
 * @property {GPUMetrics} gpu - GPU utilization metrics
 */

/**
 * @typedef {Object} CPUMetrics
 * @property {number} utilization - CPU utilization percentage (0-100)
 * @property {number} frameTime - Last frame time in ms
 * @property {number} averageFrameTime - Average frame time over sample window
 */

/**
 * @typedef {Object} MemoryMetrics
 * @property {number} usedJSHeapSize - Used JavaScript heap size in bytes
 * @property {number} totalJSHeapSize - Total JavaScript heap size in bytes
 * @property {number} jsHeapSizeLimit - JavaScript heap size limit in bytes
 * @property {number} utilizationPercent - Memory utilization percentage
 */

/**
 * @typedef {Object} GPUMetrics
 * @property {boolean} available - Whether GPU metrics are available
 * @property {number} utilization - GPU utilization percentage (0-100)
 * @property {number} memoryUsed - GPU memory used in bytes
 * @property {number} memoryTotal - Total GPU memory in bytes
 */

/**
 * ResourceMonitor tracks system resource utilization
 * Publishes metrics via EventBus at configurable intervals
 */
class ResourceMonitor {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.sampleInterval=1000] - Metrics sampling interval in ms
   * @param {number} [options.publishInterval=5000] - EventBus publish interval in ms
   * @param {number} [options.frameTimeSamples=60] - Number of frame times to average
   * @param {boolean} [options.enableGPU=true] - Enable GPU monitoring if available
   */
  constructor(options = {}) {
    this.sampleInterval = options.sampleInterval || 1000;
    this.publishInterval = options.publishInterval || 5000;
    this.frameTimeSamples = options.frameTimeSamples || 60;
    this.enableGPU = options.enableGPU !== false;

    // State
    this.isMonitoring = false;
    this.sampleTimer = null;
    this.publishTimer = null;
    this.lastFrameTime = performance.now();
    this.frameTimes = [];
    this.lastCPUTime = 0;
    this.gpuDevice = null;
    this.gpuQuerySet = null;

    // Metrics history
    this.metricsHistory = [];
    this.maxHistorySize = 100;

    // Performance budgets (from global policies)
    this.FRAME_BUDGET_MS = 16; // 60fps
    this.MEMORY_BUDGET_BYTES = 50 * 1024 * 1024; // 50MB

    // Bind methods
    this._sampleMetrics = this._sampleMetrics.bind(this);
    this._publishMetrics = this._publishMetrics.bind(this);
  }

  /**
   * Start monitoring resources
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isMonitoring) {
      console.warn('[ResourceMonitor] Already monitoring');
      return;
    }

    console.log('[ResourceMonitor] Starting resource monitoring');
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();

    // Initialize GPU monitoring if enabled
    if (this.enableGPU) {
      await this._initializeGPU();
    }

    // Start sampling timer
    this.sampleTimer = setInterval(this._sampleMetrics, this.sampleInterval);

    // Start publish timer
    this.publishTimer = setInterval(this._publishMetrics, this.publishInterval);

    // Take initial sample
    this._sampleMetrics();
  }

  /**
   * Stop monitoring resources
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[ResourceMonitor] Stopping resource monitoring');
    this.isMonitoring = false;

    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }

    if (this.publishTimer) {
      clearInterval(this.publishTimer);
      this.publishTimer = null;
    }

    this._cleanupGPU();
  }

  /**
   * Get current resource metrics
   * @returns {ResourceMetrics}
   */
  getCurrentMetrics() {
    const cpu = this._measureCPU();
    const memory = this._measureMemory();
    const gpu = this._measureGPU();

    return {
      timestamp: Date.now(),
      cpu,
      memory,
      gpu
    };
  }

  /**
   * Get metrics history
   * @param {number} [count] - Number of recent metrics to retrieve
   * @returns {ResourceMetrics[]}
   */
  getHistory(count) {
    if (count) {
      return this.metricsHistory.slice(-count);
    }
    return [...this.metricsHistory];
  }

  /**
   * Check if any resource exceeds budget
   * @returns {Object} Budget status
   */
  checkBudgets() {
    const metrics = this.getCurrentMetrics();
    
    return {
      frameTime: {
        budget: this.FRAME_BUDGET_MS,
        actual: metrics.cpu.frameTime,
        exceeded: metrics.cpu.frameTime > this.FRAME_BUDGET_MS
      },
      memory: {
        budget: this.MEMORY_BUDGET_BYTES,
        actual: metrics.memory.usedJSHeapSize,
        exceeded: metrics.memory.usedJSHeapSize > this.MEMORY_BUDGET_BYTES
      }
    };
  }

  /**
   * Initialize GPU monitoring
   * @private
   */
  async _initializeGPU() {
    if (!navigator.gpu) {
      console.log('[ResourceMonitor] WebGPU not available');
      return;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('[ResourceMonitor] No GPU adapter available');
        return;
      }

      this.gpuDevice = await adapter.requestDevice();
      
      // Create query set for timestamp queries if supported
      if (this.gpuDevice.features.has('timestamp-query')) {
        this.gpuQuerySet = this.gpuDevice.createQuerySet({
          type: 'timestamp',
          count: 2
        });
        console.log('[ResourceMonitor] GPU monitoring initialized');
      }
    } catch (error) {
      console.warn('[ResourceMonitor] Failed to initialize GPU monitoring:', error);
    }
  }

  /**
   * Cleanup GPU resources
   * @private
   */
  _cleanupGPU() {
    if (this.gpuQuerySet) {
      this.gpuQuerySet.destroy();
      this.gpuQuerySet = null;
    }
    
    if (this.gpuDevice) {
      this.gpuDevice.destroy();
      this.gpuDevice = null;
    }
  }

  /**
   * Sample metrics and store in history
   * @private
   */
  _sampleMetrics() {
    const metrics = this.getCurrentMetrics();
    
    this.metricsHistory.push(metrics);
    
    // Trim history to max size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // Check budgets and log warnings
    const budgets = this.checkBudgets();
    if (budgets.frameTime.exceeded) {
      console.warn(
        `[ResourceMonitor] Frame time budget exceeded: ${budgets.frameTime.actual.toFixed(2)}ms > ${budgets.frameTime.budget}ms`
      );
    }
    if (budgets.memory.exceeded) {
      console.warn(
        `[ResourceMonitor] Memory budget exceeded: ${(budgets.memory.actual / 1024 / 1024).toFixed(2)}MB > ${(budgets.memory.budget / 1024 / 1024).toFixed(2)}MB`
      );
    }
  }

  /**
   * Publish metrics to EventBus
   * @private
   */
  _publishMetrics() {
    if (!this.metricsHistory.length) {
      return;
    }

    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const budgetStatus = this.checkBudgets();

    // Publish to EventBus if available
    if (window.eventBus) {
      window.eventBus.publish({
        type: 'ResourceMetricsUpdated',
        source: 'ResourceMonitor',
        payload: {
          metrics: latestMetrics,
          budgets: budgetStatus,
          historySize: this.metricsHistory.length
        }
      });
    }
  }

  /**
   * Measure CPU utilization
   * @private
   * @returns {CPUMetrics}
   */
  _measureCPU() {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Store frame time
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.frameTimeSamples) {
      this.frameTimes.shift();
    }

    // Calculate average frame time
    const averageFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

    // Estimate CPU utilization based on frame time
    // If frame time exceeds budget, CPU is likely overloaded
    const utilization = Math.min(100, (averageFrameTime / this.FRAME_BUDGET_MS) * 100);

    return {
      utilization: Math.round(utilization * 100) / 100,
      frameTime: Math.round(frameTime * 100) / 100,
      averageFrameTime: Math.round(averageFrameTime * 100) / 100
    };
  }

  /**
   * Measure memory usage
   * @private
   * @returns {MemoryMetrics}
   */
  _measureMemory() {
    if (!performance.memory) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        utilizationPercent: 0
      };
    }

    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const utilizationPercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize,
      totalJSHeapSize,
      jsHeapSizeLimit,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100
    };
  }

  /**
   * Measure GPU utilization
   * @private
   * @returns {GPUMetrics}
   */
  _measureGPU() {
    if (!this.gpuDevice) {
      return {
        available: false,
        utilization: 0,
        memoryUsed: 0,
        memoryTotal: 0
      };
    }

    // GPU metrics are limited in WebGPU
    // We can only estimate based on query sets and adapter info
    // This is a placeholder for future implementation
    return {
      available: true,
      utilization: 0, // Not directly measurable in WebGPU
      memoryUsed: 0,  // Not directly measurable in WebGPU
      memoryTotal: 0  // Not directly measurable in WebGPU
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ResourceMonitor };
}