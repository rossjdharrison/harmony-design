/**
 * @fileoverview ExecutionTargetSelector - Chooses optimal execution target
 * @module harmony-graph/execution-target-selector
 * 
 * Analyzes workload characteristics and system capabilities to select the
 * optimal execution target: main thread, web worker, WASM, or GPU.
 * 
 * Performance Targets:
 * - Decision time: <1ms per node
 * - GPU detection: <5ms
 * - WASM capability check: <2ms
 * 
 * @see DESIGN_SYSTEM.md#execution-target-selector
 */

/**
 * @typedef {'main' | 'worker' | 'wasm' | 'gpu'} ExecutionTarget
 */

/**
 * @typedef {Object} WorkloadCharacteristics
 * @property {number} complexity - Computational complexity score (0-100)
 * @property {number} dataSize - Size of data in bytes
 * @property {boolean} isParallelizable - Can work be parallelized
 * @property {boolean} requiresDOM - Needs DOM access
 * @property {boolean} isAudioProcessing - Audio workload
 * @property {number} latencyRequirement - Max acceptable latency in ms
 * @property {string} workloadType - Type: 'compute', 'audio', 'render', 'query'
 */

/**
 * @typedef {Object} TargetCapabilities
 * @property {boolean} hasWorkers - Web Workers available
 * @property {boolean} hasWASM - WebAssembly available
 * @property {boolean} hasGPU - WebGPU available
 * @property {boolean} hasSharedArrayBuffer - SharedArrayBuffer available
 * @property {number} cpuCores - Number of logical CPU cores
 * @property {number} availableMemory - Available memory estimate in MB
 */

/**
 * @typedef {Object} TargetSelection
 * @property {ExecutionTarget} target - Selected execution target
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} reason - Human-readable reason for selection
 * @property {Object.<ExecutionTarget, number>} scores - Scores for all targets
 */

/**
 * ExecutionTargetSelector selects optimal execution target based on workload
 * characteristics and system capabilities.
 * 
 * Selection Strategy:
 * 1. GPU: High-complexity parallel compute, audio processing with low latency
 * 2. WASM: Medium-high complexity, large data, no DOM access needed
 * 3. Worker: Medium complexity, parallelizable, no DOM access
 * 4. Main: Low complexity, requires DOM, or when other targets unavailable
 */
export class ExecutionTargetSelector {
  /**
   * @param {Object} options - Configuration options
   * @param {boolean} [options.enableGPU=true] - Enable GPU target selection
   * @param {boolean} [options.enableWASM=true] - Enable WASM target selection
   * @param {boolean} [options.enableWorkers=true] - Enable Worker target selection
   * @param {number} [options.gpuComplexityThreshold=70] - Min complexity for GPU
   * @param {number} [options.wasmComplexityThreshold=40] - Min complexity for WASM
   * @param {number} [options.workerComplexityThreshold=20] - Min complexity for Worker
   */
  constructor(options = {}) {
    this.config = {
      enableGPU: options.enableGPU !== false,
      enableWASM: options.enableWASM !== false,
      enableWorkers: options.enableWorkers !== false,
      gpuComplexityThreshold: options.gpuComplexityThreshold || 70,
      wasmComplexityThreshold: options.wasmComplexityThreshold || 40,
      workerComplexityThreshold: options.workerComplexityThreshold || 20,
    };

    /** @type {TargetCapabilities|null} */
    this.capabilities = null;
    
    /** @type {Promise<TargetCapabilities>|null} */
    this.capabilitiesPromise = null;
  }

  /**
   * Initialize and detect system capabilities
   * @returns {Promise<TargetCapabilities>}
   */
  async detectCapabilities() {
    if (this.capabilities) {
      return this.capabilities;
    }

    if (this.capabilitiesPromise) {
      return this.capabilitiesPromise;
    }

    this.capabilitiesPromise = this._performDetection();
    this.capabilities = await this.capabilitiesPromise;
    return this.capabilities;
  }

  /**
   * Perform actual capability detection
   * @private
   * @returns {Promise<TargetCapabilities>}
   */
  async _performDetection() {
    const startTime = performance.now();

    const capabilities = {
      hasWorkers: typeof Worker !== 'undefined',
      hasWASM: typeof WebAssembly !== 'undefined',
      hasGPU: false,
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      cpuCores: navigator.hardwareConcurrency || 4,
      availableMemory: this._estimateAvailableMemory(),
    };

    // Detect WebGPU (target: <5ms)
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        capabilities.hasGPU = adapter !== null;
      } catch (err) {
        console.warn('WebGPU detection failed:', err);
        capabilities.hasGPU = false;
      }
    }

    const detectionTime = performance.now() - startTime;
    if (detectionTime > 5) {
      console.warn(`Capability detection took ${detectionTime.toFixed(2)}ms (target: <5ms)`);
    }

    return capabilities;
  }

  /**
   * Estimate available memory
   * @private
   * @returns {number} Estimated memory in MB
   */
  _estimateAvailableMemory() {
    // Use performance.memory if available (Chrome)
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
      const limitMB = performance.memory.jsHeapSizeLimit / (1024 * 1024);
      return Math.max(0, limitMB - usedMB);
    }

    // Conservative estimate for other browsers
    return 100; // Assume 100MB available
  }

  /**
   * Choose optimal execution target for given workload
   * @param {WorkloadCharacteristics} workload - Workload characteristics
   * @returns {Promise<TargetSelection>}
   */
  async chooseTarget(workload) {
    const startTime = performance.now();

    // Ensure capabilities are detected
    const capabilities = await this.detectCapabilities();

    // Calculate scores for each target
    const scores = {
      main: this._scoreMainThread(workload, capabilities),
      worker: this._scoreWorker(workload, capabilities),
      wasm: this._scoreWASM(workload, capabilities),
      gpu: this._scoreGPU(workload, capabilities),
    };

    // Select target with highest score
    let bestTarget = 'main';
    let bestScore = scores.main;

    for (const [target, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    }

    const confidence = this._calculateConfidence(bestScore, scores);
    const reason = this._generateReason(bestTarget, workload, capabilities);

    const decisionTime = performance.now() - startTime;
    if (decisionTime > 1) {
      console.warn(`Target selection took ${decisionTime.toFixed(2)}ms (target: <1ms)`);
    }

    return {
      target: bestTarget,
      confidence,
      reason,
      scores,
    };
  }

  /**
   * Score main thread execution
   * @private
   * @param {WorkloadCharacteristics} workload
   * @param {TargetCapabilities} capabilities
   * @returns {number} Score (0-100)
   */
  _scoreMainThread(workload, capabilities) {
    let score = 50; // Baseline: always available

    // Main thread is best for DOM-dependent work
    if (workload.requiresDOM) {
      score += 40;
    }

    // Penalize for high complexity
    if (workload.complexity > 30) {
      score -= workload.complexity * 0.5;
    }

    // Low complexity is fine on main thread
    if (workload.complexity < 20) {
      score += 20;
    }

    // Penalize for large data (blocks main thread)
    if (workload.dataSize > 1024 * 1024) { // >1MB
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score web worker execution
   * @private
   * @param {WorkloadCharacteristics} workload
   * @param {TargetCapabilities} capabilities
   * @returns {number} Score (0-100)
   */
  _scoreWorker(workload, capabilities) {
    if (!this.config.enableWorkers || !capabilities.hasWorkers) {
      return 0;
    }

    let score = 30; // Baseline for worker availability

    // DOM access prevents worker usage
    if (workload.requiresDOM) {
      return 0;
    }

    // Good for medium complexity
    if (workload.complexity >= this.config.workerComplexityThreshold &&
        workload.complexity < this.config.wasmComplexityThreshold) {
      score += 30;
    }

    // Bonus for parallelizable work
    if (workload.isParallelizable) {
      score += 20;
    }

    // Good for moderate data sizes
    if (workload.dataSize > 100 * 1024 && workload.dataSize < 10 * 1024 * 1024) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score WASM execution
   * @private
   * @param {WorkloadCharacteristics} workload
   * @param {TargetCapabilities} capabilities
   * @returns {number} Score (0-100)
   */
  _scoreWASM(workload, capabilities) {
    if (!this.config.enableWASM || !capabilities.hasWASM) {
      return 0;
    }

    let score = 40; // Baseline for WASM availability

    // DOM access prevents WASM usage
    if (workload.requiresDOM) {
      return 0;
    }

    // Excellent for high complexity compute
    if (workload.complexity >= this.config.wasmComplexityThreshold) {
      score += 40;
    }

    // Great for large data processing
    if (workload.dataSize > 1 * 1024 * 1024) { // >1MB
      score += 20;
    }

    // Bonus for specific workload types
    if (workload.workloadType === 'compute' || workload.workloadType === 'query') {
      score += 15;
    }

    // Check memory constraints (WASM heap budget: 50MB)
    const estimatedMemoryMB = workload.dataSize / (1024 * 1024);
    if (estimatedMemoryMB > 50) {
      score -= 30; // Exceeds WASM heap budget
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score GPU execution
   * @private
   * @param {WorkloadCharacteristics} workload
   * @param {TargetCapabilities} capabilities
   * @returns {number} Score (0-100)
   */
  _scoreGPU(workload, capabilities) {
    if (!this.config.enableGPU || !capabilities.hasGPU) {
      return 0;
    }

    let score = 35; // Baseline for GPU availability

    // DOM access prevents GPU usage
    if (workload.requiresDOM) {
      return 0;
    }

    // Excellent for very high complexity parallel work
    if (workload.complexity >= this.config.gpuComplexityThreshold &&
        workload.isParallelizable) {
      score += 50;
    }

    // Audio processing with low latency requirement
    if (workload.isAudioProcessing && workload.latencyRequirement <= 10) {
      score += 45;
    }

    // Great for audio workloads in general
    if (workload.workloadType === 'audio') {
      score += 30;
    }

    // Bonus for very large parallel data
    if (workload.dataSize > 10 * 1024 * 1024 && workload.isParallelizable) {
      score += 20;
    }

    // Requires SharedArrayBuffer for audio
    if (workload.isAudioProcessing && !capabilities.hasSharedArrayBuffer) {
      score -= 40;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate confidence in selection
   * @private
   * @param {number} bestScore - Best target score
   * @param {Object.<ExecutionTarget, number>} allScores - All scores
   * @returns {number} Confidence (0-1)
   */
  _calculateConfidence(bestScore, allScores) {
    const scores = Object.values(allScores).sort((a, b) => b - a);
    const secondBest = scores[1] || 0;
    
    // High confidence if best score significantly higher than second best
    const margin = bestScore - secondBest;
    const confidence = Math.min(1, margin / 50 + 0.5);
    
    return confidence;
  }

  /**
   * Generate human-readable reason for selection
   * @private
   * @param {ExecutionTarget} target - Selected target
   * @param {WorkloadCharacteristics} workload
   * @param {TargetCapabilities} capabilities
   * @returns {string} Reason
   */
  _generateReason(target, workload, capabilities) {
    switch (target) {
      case 'gpu':
        if (workload.isAudioProcessing) {
          return 'GPU selected for audio processing with low-latency requirement';
        }
        return 'GPU selected for high-complexity parallel computation';

      case 'wasm':
        if (workload.complexity >= this.config.wasmComplexityThreshold) {
          return 'WASM selected for high-complexity computation';
        }
        return 'WASM selected for large data processing';

      case 'worker':
        if (workload.isParallelizable) {
          return 'Worker selected for parallelizable medium-complexity work';
        }
        return 'Worker selected to offload work from main thread';

      case 'main':
        if (workload.requiresDOM) {
          return 'Main thread required for DOM access';
        }
        if (workload.complexity < this.config.workerComplexityThreshold) {
          return 'Main thread sufficient for low-complexity work';
        }
        return 'Main thread selected (other targets unavailable or unsuitable)';

      default:
        return 'Main thread selected as fallback';
    }
  }

  /**
   * Get current capabilities without re-detection
   * @returns {TargetCapabilities|null}
   */
  getCapabilities() {
    return this.capabilities;
  }

  /**
   * Force re-detection of capabilities
   * @returns {Promise<TargetCapabilities>}
   */
  async refreshCapabilities() {
    this.capabilities = null;
    this.capabilitiesPromise = null;
    return this.detectCapabilities();
  }
}