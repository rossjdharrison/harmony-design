/**
 * @fileoverview DispatchRouter - Routes code bundles to appropriate execution targets
 * 
 * Routes code bundles based on:
 * - Bundle characteristics (dependencies, size, complexity)
 * - Target availability (WebWorker, SharedWorker, main thread)
 * - Performance constraints (render budget, memory budget)
 * - Current system load
 * 
 * Part of the WASM Edge Executor bounded context.
 * See DESIGN_SYSTEM.md § WASM Edge Executor for architecture overview.
 * 
 * @module bounded-contexts/wasm-edge-executor/dispatch-router
 */

import { DispatchProtocol } from './dispatch-protocol.js';
import { DispatchTarget } from './dispatch-target.js';

/**
 * Routing strategy for code bundle execution
 * @typedef {'main-thread' | 'web-worker' | 'shared-worker' | 'auto'} RoutingStrategy
 */

/**
 * Routing decision with rationale
 * @typedef {Object} RoutingDecision
 * @property {DispatchTarget} target - Selected execution target
 * @property {RoutingStrategy} strategy - Strategy used for routing
 * @property {string} rationale - Human-readable explanation
 * @property {number} estimatedLatency - Estimated execution latency (ms)
 * @property {number} estimatedMemory - Estimated memory usage (bytes)
 */

/**
 * Bundle characteristics for routing decisions
 * @typedef {Object} BundleCharacteristics
 * @property {number} size - Bundle size in bytes
 * @property {number} complexity - Complexity score (0-100)
 * @property {string[]} dependencies - List of dependency identifiers
 * @property {boolean} requiresGPU - Whether GPU access is needed
 * @property {boolean} requiresSharedMemory - Whether SharedArrayBuffer is needed
 * @property {number} priority - Execution priority (0-10, higher = more urgent)
 */

/**
 * System load metrics for routing decisions
 * @typedef {Object} SystemLoad
 * @property {number} cpuUsage - CPU usage percentage (0-100)
 * @property {number} memoryUsage - Memory usage in bytes
 * @property {number} activeWorkers - Number of active workers
 * @property {number} pendingTasks - Number of pending tasks
 */

/**
 * Routes code bundles to appropriate execution targets
 * 
 * Implements intelligent routing based on:
 * - Bundle size and complexity
 * - Available execution targets
 * - Current system load
 * - Performance constraints
 * 
 * Performance Targets:
 * - Routing decision: < 1ms
 * - Memory overhead: < 1MB
 * 
 * @class DispatchRouter
 */
export class DispatchRouter {
  /**
   * Creates a new DispatchRouter
   * @param {Object} options - Configuration options
   * @param {RoutingStrategy} [options.defaultStrategy='auto'] - Default routing strategy
   * @param {number} [options.workerPoolSize=4] - Maximum number of workers
   * @param {number} [options.mainThreadThreshold=10] - Max complexity for main thread (0-100)
   * @param {number} [options.sharedWorkerThreshold=50] - Min complexity for shared worker (0-100)
   */
  constructor(options = {}) {
    this.defaultStrategy = options.defaultStrategy || 'auto';
    this.workerPoolSize = options.workerPoolSize || 4;
    this.mainThreadThreshold = options.mainThreadThreshold || 10;
    this.sharedWorkerThreshold = options.sharedWorkerThreshold || 50;

    /** @type {Map<string, DispatchTarget>} */
    this.targets = new Map();

    /** @type {Map<string, BundleCharacteristics>} */
    this.bundleCache = new Map();

    /** @type {SystemLoad} */
    this.systemLoad = {
      cpuUsage: 0,
      memoryUsage: 0,
      activeWorkers: 0,
      pendingTasks: 0
    };

    // Performance monitoring
    this.routingDecisions = 0;
    this.totalRoutingTime = 0;

    this._initializeTargets();
  }

  /**
   * Initializes available execution targets
   * @private
   */
  _initializeTargets() {
    // Main thread target (always available)
    this.targets.set('main-thread', new DispatchTarget({
      type: 'main-thread',
      maxConcurrency: 1
    }));

    // Web Worker pool
    if (typeof Worker !== 'undefined') {
      for (let i = 0; i < this.workerPoolSize; i++) {
        const target = new DispatchTarget({
          type: 'web-worker',
          workerId: `worker-${i}`,
          maxConcurrency: 1
        });
        this.targets.set(`web-worker-${i}`, target);
      }
    }

    // Shared Worker (if available and supported)
    if (typeof SharedWorker !== 'undefined') {
      this.targets.set('shared-worker', new DispatchTarget({
        type: 'shared-worker',
        maxConcurrency: 10 // Shared workers can handle multiple connections
      }));
    }
  }

  /**
   * Routes a code bundle to the appropriate execution target
   * 
   * @param {Object} bundle - Code bundle to route
   * @param {string} bundle.hash - Content hash of the bundle
   * @param {string} bundle.code - Executable code
   * @param {Object} bundle.manifest - Bundle manifest
   * @param {RoutingStrategy} [strategy] - Override default strategy
   * @returns {Promise<RoutingDecision>} Routing decision with target
   * @throws {Error} If no suitable target is available
   */
  async route(bundle, strategy = this.defaultStrategy) {
    const startTime = performance.now();

    try {
      // Extract bundle characteristics
      const characteristics = this._analyzeBundle(bundle);

      // Update system load
      this._updateSystemLoad();

      // Make routing decision
      const decision = this._makeRoutingDecision(characteristics, strategy);

      // Record metrics
      const routingTime = performance.now() - startTime;
      this.routingDecisions++;
      this.totalRoutingTime += routingTime;

      // Validate routing time against performance budget (< 1ms)
      if (routingTime > 1) {
        console.warn(`[DispatchRouter] Routing decision took ${routingTime.toFixed(2)}ms (target: < 1ms)`);
      }

      return decision;
    } catch (error) {
      console.error('[DispatchRouter] Routing failed:', error);
      throw new Error(`Failed to route bundle: ${error.message}`);
    }
  }

  /**
   * Analyzes bundle characteristics for routing decisions
   * 
   * @param {Object} bundle - Code bundle
   * @returns {BundleCharacteristics} Bundle characteristics
   * @private
   */
  _analyzeBundle(bundle) {
    // Check cache first
    if (this.bundleCache.has(bundle.hash)) {
      return this.bundleCache.get(bundle.hash);
    }

    const manifest = bundle.manifest || {};
    
    const characteristics = {
      size: bundle.code.length,
      complexity: this._calculateComplexity(bundle),
      dependencies: manifest.dependencies || [],
      requiresGPU: manifest.requiresGPU || false,
      requiresSharedMemory: manifest.requiresSharedMemory || false,
      priority: manifest.priority || 5
    };

    // Cache for future use
    this.bundleCache.set(bundle.hash, characteristics);

    return characteristics;
  }

  /**
   * Calculates bundle complexity score (0-100)
   * 
   * Factors:
   * - Code size
   * - Number of dependencies
   * - GPU requirements
   * - Shared memory requirements
   * 
   * @param {Object} bundle - Code bundle
   * @returns {number} Complexity score (0-100)
   * @private
   */
  _calculateComplexity(bundle) {
    const manifest = bundle.manifest || {};
    let complexity = 0;

    // Size factor (0-30 points)
    const sizeKB = bundle.code.length / 1024;
    complexity += Math.min(30, sizeKB / 10);

    // Dependency factor (0-30 points)
    const depCount = (manifest.dependencies || []).length;
    complexity += Math.min(30, depCount * 3);

    // GPU requirement (20 points)
    if (manifest.requiresGPU) {
      complexity += 20;
    }

    // Shared memory requirement (20 points)
    if (manifest.requiresSharedMemory) {
      complexity += 20;
    }

    return Math.min(100, Math.round(complexity));
  }

  /**
   * Makes routing decision based on characteristics and strategy
   * 
   * @param {BundleCharacteristics} characteristics - Bundle characteristics
   * @param {RoutingStrategy} strategy - Routing strategy
   * @returns {RoutingDecision} Routing decision
   * @private
   */
  _makeRoutingDecision(characteristics, strategy) {
    if (strategy === 'auto') {
      return this._autoRoute(characteristics);
    }

    // Explicit strategy
    const targetType = strategy;
    const target = this._selectTarget(targetType, characteristics);

    if (!target) {
      throw new Error(`No available target for strategy: ${strategy}`);
    }

    return {
      target,
      strategy,
      rationale: `Explicit strategy: ${strategy}`,
      estimatedLatency: this._estimateLatency(target, characteristics),
      estimatedMemory: characteristics.size * 2 // Rough estimate: 2x code size
    };
  }

  /**
   * Automatically routes based on bundle characteristics and system load
   * 
   * Routing Logic:
   * - Low complexity (< 10) + low load → main thread
   * - High complexity (> 50) + shared worker available → shared worker
   * - Medium complexity → web worker
   * - Fallback → main thread
   * 
   * @param {BundleCharacteristics} characteristics - Bundle characteristics
   * @returns {RoutingDecision} Routing decision
   * @private
   */
  _autoRoute(characteristics) {
    // GPU or shared memory requirements → shared worker preferred
    if (characteristics.requiresGPU || characteristics.requiresSharedMemory) {
      const sharedWorker = this.targets.get('shared-worker');
      if (sharedWorker && sharedWorker.isAvailable()) {
        return {
          target: sharedWorker,
          strategy: 'auto',
          rationale: 'Requires GPU/shared memory → shared worker',
          estimatedLatency: this._estimateLatency(sharedWorker, characteristics),
          estimatedMemory: characteristics.size * 2
        };
      }
    }

    // Low complexity + low system load → main thread
    if (characteristics.complexity < this.mainThreadThreshold && 
        this.systemLoad.cpuUsage < 50 && 
        this.systemLoad.pendingTasks < 3) {
      const mainThread = this.targets.get('main-thread');
      return {
        target: mainThread,
        strategy: 'auto',
        rationale: `Low complexity (${characteristics.complexity}) + low load → main thread`,
        estimatedLatency: this._estimateLatency(mainThread, characteristics),
        estimatedMemory: characteristics.size * 2
      };
    }

    // High complexity → shared worker if available
    if (characteristics.complexity > this.sharedWorkerThreshold) {
      const sharedWorker = this.targets.get('shared-worker');
      if (sharedWorker && sharedWorker.isAvailable()) {
        return {
          target: sharedWorker,
          strategy: 'auto',
          rationale: `High complexity (${characteristics.complexity}) → shared worker`,
          estimatedLatency: this._estimateLatency(sharedWorker, characteristics),
          estimatedMemory: characteristics.size * 2
        };
      }
    }

    // Medium complexity → web worker (least loaded)
    const webWorker = this._selectLeastLoadedWorker();
    if (webWorker) {
      return {
        target: webWorker,
        strategy: 'auto',
        rationale: `Medium complexity (${characteristics.complexity}) → web worker`,
        estimatedLatency: this._estimateLatency(webWorker, characteristics),
        estimatedMemory: characteristics.size * 2
      };
    }

    // Fallback → main thread
    const mainThread = this.targets.get('main-thread');
    return {
      target: mainThread,
      strategy: 'auto',
      rationale: 'Fallback: no workers available → main thread',
      estimatedLatency: this._estimateLatency(mainThread, characteristics),
      estimatedMemory: characteristics.size * 2
    };
  }

  /**
   * Selects a specific target type
   * 
   * @param {string} targetType - Target type
   * @param {BundleCharacteristics} characteristics - Bundle characteristics
   * @returns {DispatchTarget|null} Selected target or null
   * @private
   */
  _selectTarget(targetType, characteristics) {
    if (targetType === 'main-thread') {
      return this.targets.get('main-thread');
    }

    if (targetType === 'shared-worker') {
      const target = this.targets.get('shared-worker');
      return target && target.isAvailable() ? target : null;
    }

    if (targetType === 'web-worker') {
      return this._selectLeastLoadedWorker();
    }

    return null;
  }

  /**
   * Selects the least loaded web worker
   * 
   * @returns {DispatchTarget|null} Least loaded worker or null
   * @private
   */
  _selectLeastLoadedWorker() {
    let leastLoaded = null;
    let minLoad = Infinity;

    for (const [key, target] of this.targets.entries()) {
      if (key.startsWith('web-worker-') && target.isAvailable()) {
        const load = target.getCurrentLoad();
        if (load < minLoad) {
          minLoad = load;
          leastLoaded = target;
        }
      }
    }

    return leastLoaded;
  }

  /**
   * Estimates execution latency for target and bundle
   * 
   * @param {DispatchTarget} target - Execution target
   * @param {BundleCharacteristics} characteristics - Bundle characteristics
   * @returns {number} Estimated latency in milliseconds
   * @private
   */
  _estimateLatency(target, characteristics) {
    // Base latency by target type
    const baseLatency = {
      'main-thread': 0,
      'web-worker': 2,
      'shared-worker': 5
    };

    const base = baseLatency[target.type] || 0;

    // Add complexity factor (complexity / 10 ms)
    const complexityLatency = characteristics.complexity / 10;

    // Add current load factor
    const loadLatency = target.getCurrentLoad() * 0.5;

    return base + complexityLatency + loadLatency;
  }

  /**
   * Updates system load metrics
   * @private
   */
  _updateSystemLoad() {
    // Count active workers
    let activeWorkers = 0;
    let pendingTasks = 0;

    for (const target of this.targets.values()) {
      if (target.type !== 'main-thread' && target.getCurrentLoad() > 0) {
        activeWorkers++;
      }
      pendingTasks += target.getPendingTaskCount();
    }

    this.systemLoad.activeWorkers = activeWorkers;
    this.systemLoad.pendingTasks = pendingTasks;

    // Estimate CPU usage (rough heuristic)
    this.systemLoad.cpuUsage = Math.min(100, (activeWorkers / this.workerPoolSize) * 100);

    // Memory usage would require performance.memory API (non-standard)
    if (performance.memory) {
      this.systemLoad.memoryUsage = performance.memory.usedJSHeapSize;
    }
  }

  /**
   * Gets current system load metrics
   * @returns {SystemLoad} Current system load
   */
  getSystemLoad() {
    this._updateSystemLoad();
    return { ...this.systemLoad };
  }

  /**
   * Gets routing performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      routingDecisions: this.routingDecisions,
      averageRoutingTime: this.routingDecisions > 0 
        ? this.totalRoutingTime / this.routingDecisions 
        : 0,
      activeTargets: Array.from(this.targets.values()).filter(t => t.isAvailable()).length,
      totalTargets: this.targets.size,
      systemLoad: this.getSystemLoad()
    };
  }

  /**
   * Resets routing metrics
   */
  resetMetrics() {
    this.routingDecisions = 0;
    this.totalRoutingTime = 0;
  }

  /**
   * Clears bundle cache
   */
  clearCache() {
    this.bundleCache.clear();
  }

  /**
   * Shuts down all targets and cleans up resources
   */
  async shutdown() {
    for (const target of this.targets.values()) {
      await target.shutdown();
    }
    this.targets.clear();
    this.bundleCache.clear();
  }
}