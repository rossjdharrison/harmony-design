/**
 * @fileoverview GPU Performance Benchmark Suite
 * @module performance/gpu-benchmark-suite
 * 
 * Provides comprehensive GPU performance benchmarking for WebGPU operations,
 * including buffer transfers, compute shader execution, and audio processing.
 * 
 * Vision Alignment: GPU-First Audio
 * - Measures GPU buffer allocation and transfer performance
 * - Benchmarks compute shader execution for audio processing
 * - Validates SharedArrayBuffer transfer latency
 * 
 * Performance Targets:
 * - Buffer allocation: <1ms for 50MB
 * - Buffer transfer: <2ms for audio frame (128 samples)
 * - Compute shader dispatch: <0.5ms
 * - End-to-end audio latency: <10ms
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#gpu-performance-benchmarking}
 */

/**
 * @typedef {Object} BenchmarkResult
 * @property {string} name - Benchmark name
 * @property {number} duration - Duration in milliseconds
 * @property {number} iterations - Number of iterations
 * @property {number} avgDuration - Average duration per iteration
 * @property {number} minDuration - Minimum duration
 * @property {number} maxDuration - Maximum duration
 * @property {boolean} passed - Whether benchmark met performance target
 * @property {number} target - Target duration in milliseconds
 * @property {Object<string, any>} metadata - Additional benchmark metadata
 */

/**
 * @typedef {Object} BenchmarkSuiteConfig
 * @property {number} warmupIterations - Number of warmup iterations (default: 10)
 * @property {number} benchmarkIterations - Number of benchmark iterations (default: 100)
 * @property {boolean} logResults - Whether to log results to console (default: true)
 * @property {boolean} includeMemoryStats - Whether to include memory statistics (default: true)
 */

/**
 * GPU Performance Benchmark Suite
 * 
 * Measures GPU performance for audio processing operations.
 * All benchmarks validate against Harmony performance budgets.
 * 
 * @class
 */
export class GPUBenchmarkSuite {
  /**
   * @param {BenchmarkSuiteConfig} config - Benchmark configuration
   */
  constructor(config = {}) {
    this.config = {
      warmupIterations: config.warmupIterations ?? 10,
      benchmarkIterations: config.benchmarkIterations ?? 100,
      logResults: config.logResults ?? true,
      includeMemoryStats: config.includeMemoryStats ?? true,
    };

    /** @type {GPUDevice | null} */
    this.device = null;

    /** @type {BenchmarkResult[]} */
    this.results = [];

    /** @type {boolean} */
    this.initialized = false;
  }

  /**
   * Initialize GPU device for benchmarking
   * 
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    if (!navigator.gpu) {
      console.error('[GPUBenchmarkSuite] WebGPU not supported');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.error('[GPUBenchmarkSuite] No GPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice();
      this.initialized = true;

      if (this.config.logResults) {
        console.log('[GPUBenchmarkSuite] Initialized with GPU:', adapter.info);
      }

      return true;
    } catch (error) {
      console.error('[GPUBenchmarkSuite] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Run all benchmarks in the suite
   * 
   * @returns {Promise<BenchmarkResult[]>} Array of benchmark results
   */
  async runAll() {
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        return [];
      }
    }

    this.results = [];

    // Buffer allocation benchmarks
    await this.benchmarkBufferAllocation(1024, 'Buffer Allocation 1KB', 1);
    await this.benchmarkBufferAllocation(1024 * 128, 'Buffer Allocation 128KB (audio frame)', 2);
    await this.benchmarkBufferAllocation(1024 * 1024, 'Buffer Allocation 1MB', 5);
    await this.benchmarkBufferAllocation(1024 * 1024 * 50, 'Buffer Allocation 50MB (heap limit)', 1000);

    // Buffer transfer benchmarks
    await this.benchmarkBufferTransfer(128 * 4, 'Buffer Transfer 128 samples (float32)', 2);
    await this.benchmarkBufferTransfer(1024 * 4, 'Buffer Transfer 1K samples', 2);
    await this.benchmarkBufferTransfer(1024 * 128 * 4, 'Buffer Transfer 128KB', 5);

    // Compute shader benchmarks
    await this.benchmarkComputeShader(128, 'Compute Shader 128 samples', 0.5);
    await this.benchmarkComputeShader(1024, 'Compute Shader 1K samples', 1);
    await this.benchmarkComputeShader(1024 * 16, 'Compute Shader 16K samples', 2);

    // SharedArrayBuffer benchmarks
    await this.benchmarkSharedArrayBuffer(128 * 4, 'SharedArrayBuffer Transfer 128 samples', 0.1);
    await this.benchmarkSharedArrayBuffer(1024 * 4, 'SharedArrayBuffer Transfer 1K samples', 0.5);

    // End-to-end audio processing benchmark
    await this.benchmarkAudioProcessing('End-to-End Audio Processing', 10);

    if (this.config.logResults) {
      this.printResults();
    }

    return this.results;
  }

  /**
   * Benchmark GPU buffer allocation
   * 
   * @param {number} sizeBytes - Buffer size in bytes
   * @param {string} name - Benchmark name
   * @param {number} targetMs - Target duration in milliseconds
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkBufferAllocation(sizeBytes, name, targetMs) {
    const durations = [];

    // Warmup
    for (let i = 0; i < this.config.warmupIterations; i++) {
      const buffer = this.device.createBuffer({
        size: sizeBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      buffer.destroy();
    }

    // Benchmark
    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      const start = performance.now();
      
      const buffer = this.device.createBuffer({
        size: sizeBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      
      const end = performance.now();
      durations.push(end - start);
      
      buffer.destroy();
    }

    const result = this._createResult(name, durations, targetMs, {
      sizeBytes,
      sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
    });

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark GPU buffer transfer (CPU → GPU)
   * 
   * @param {number} sizeBytes - Buffer size in bytes
   * @param {string} name - Benchmark name
   * @param {number} targetMs - Target duration in milliseconds
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkBufferTransfer(sizeBytes, name, targetMs) {
    const durations = [];
    const data = new Float32Array(sizeBytes / 4);
    
    // Fill with test data
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin(i * 0.1);
    }

    const buffer = this.device.createBuffer({
      size: sizeBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Warmup
    for (let i = 0; i < this.config.warmupIterations; i++) {
      this.device.queue.writeBuffer(buffer, 0, data);
    }

    // Benchmark
    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      const start = performance.now();
      
      this.device.queue.writeBuffer(buffer, 0, data);
      await this.device.queue.onSubmittedWorkDone();
      
      const end = performance.now();
      durations.push(end - start);
    }

    buffer.destroy();

    const result = this._createResult(name, durations, targetMs, {
      sizeBytes,
      samples: data.length,
    });

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark compute shader execution
   * 
   * @param {number} workgroupSize - Number of samples to process
   * @param {string} name - Benchmark name
   * @param {number} targetMs - Target duration in milliseconds
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkComputeShader(workgroupSize, name, targetMs) {
    const durations = [];

    // Simple audio gain shader
    const shaderCode = `
      @group(0) @binding(0) var<storage, read> input: array<f32>;
      @group(0) @binding(1) var<storage, read_write> output: array<f32>;
      @group(0) @binding(2) var<uniform> gain: f32;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index < arrayLength(&input)) {
          output[index] = input[index] * gain;
        }
      }
    `;

    const shaderModule = this.device.createShaderModule({ code: shaderCode });

    const inputBuffer = this.device.createBuffer({
      size: workgroupSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const outputBuffer = this.device.createBuffer({
      size: workgroupSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const gainBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(gainBuffer, 0, new Float32Array([0.5]));

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: gainBuffer } },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    const pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    // Warmup
    for (let i = 0; i < this.config.warmupIterations; i++) {
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(workgroupSize / 64));
      passEncoder.end();
      this.device.queue.submit([commandEncoder.finish()]);
    }

    await this.device.queue.onSubmittedWorkDone();

    // Benchmark
    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      const start = performance.now();
      
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(workgroupSize / 64));
      passEncoder.end();
      this.device.queue.submit([commandEncoder.finish()]);
      await this.device.queue.onSubmittedWorkDone();
      
      const end = performance.now();
      durations.push(end - start);
    }

    inputBuffer.destroy();
    outputBuffer.destroy();
    gainBuffer.destroy();

    const result = this._createResult(name, durations, targetMs, {
      workgroupSize,
      workgroups: Math.ceil(workgroupSize / 64),
    });

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark SharedArrayBuffer transfer
   * 
   * @param {number} sizeBytes - Buffer size in bytes
   * @param {string} name - Benchmark name
   * @param {number} targetMs - Target duration in milliseconds
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkSharedArrayBuffer(sizeBytes, name, targetMs) {
    const durations = [];

    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('[GPUBenchmarkSuite] SharedArrayBuffer not available');
      const result = {
        name,
        duration: 0,
        iterations: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        passed: false,
        target: targetMs,
        metadata: { error: 'SharedArrayBuffer not available' },
      };
      this.results.push(result);
      return result;
    }

    const sab = new SharedArrayBuffer(sizeBytes);
    const view = new Float32Array(sab);

    // Warmup
    for (let i = 0; i < this.config.warmupIterations; i++) {
      for (let j = 0; j < view.length; j++) {
        view[j] = Math.sin(j * 0.1);
      }
    }

    // Benchmark
    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      const start = performance.now();
      
      for (let j = 0; j < view.length; j++) {
        view[j] = Math.sin(j * 0.1);
      }
      
      const end = performance.now();
      durations.push(end - start);
    }

    const result = this._createResult(name, durations, targetMs, {
      sizeBytes,
      samples: view.length,
    });

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark end-to-end audio processing pipeline
   * 
   * @param {string} name - Benchmark name
   * @param {number} targetMs - Target duration in milliseconds
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkAudioProcessing(name, targetMs) {
    const durations = [];
    const sampleCount = 128; // Standard audio frame size

    // Create buffers for audio pipeline
    const inputBuffer = this.device.createBuffer({
      size: sampleCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const outputBuffer = this.device.createBuffer({
      size: sampleCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const readBuffer = this.device.createBuffer({
      size: sampleCount * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Simple processing shader
    const shaderCode = `
      @group(0) @binding(0) var<storage, read> input: array<f32>;
      @group(0) @binding(1) var<storage, read_write> output: array<f32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index < arrayLength(&input)) {
          // Simple processing: normalize and apply gain
          output[index] = clamp(input[index] * 0.8, -1.0, 1.0);
        }
      }
    `;

    const shaderModule = this.device.createShaderModule({ code: shaderCode });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });

    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    const pipeline = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    const inputData = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      inputData[i] = Math.sin(i * 0.1);
    }

    // Warmup
    for (let i = 0; i < this.config.warmupIterations; i++) {
      this.device.queue.writeBuffer(inputBuffer, 0, inputData);
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(sampleCount / 64));
      passEncoder.end();
      commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, sampleCount * 4);
      this.device.queue.submit([commandEncoder.finish()]);
    }

    await this.device.queue.onSubmittedWorkDone();

    // Benchmark
    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      const start = performance.now();
      
      // 1. Upload input data
      this.device.queue.writeBuffer(inputBuffer, 0, inputData);
      
      // 2. Process on GPU
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(sampleCount / 64));
      passEncoder.end();
      
      // 3. Copy result back
      commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, sampleCount * 4);
      this.device.queue.submit([commandEncoder.finish()]);
      
      // 4. Wait for completion
      await this.device.queue.onSubmittedWorkDone();
      
      const end = performance.now();
      durations.push(end - start);
    }

    inputBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    const result = this._createResult(name, durations, targetMs, {
      sampleCount,
      pipelineStages: ['upload', 'compute', 'download', 'sync'],
    });

    this.results.push(result);
    return result;
  }

  /**
   * Create benchmark result from duration measurements
   * 
   * @private
   * @param {string} name - Benchmark name
   * @param {number[]} durations - Array of duration measurements
   * @param {number} targetMs - Target duration in milliseconds
   * @param {Object<string, any>} metadata - Additional metadata
   * @returns {BenchmarkResult}
   */
  _createResult(name, durations, targetMs, metadata = {}) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const passed = avgDuration <= targetMs;

    return {
      name,
      duration: durations.reduce((a, b) => a + b, 0),
      iterations: durations.length,
      avgDuration,
      minDuration,
      maxDuration,
      passed,
      target: targetMs,
      metadata: {
        ...metadata,
        ...(this.config.includeMemoryStats ? this._getMemoryStats() : {}),
      },
    };
  }

  /**
   * Get current memory statistics
   * 
   * @private
   * @returns {Object<string, any>}
   */
  _getMemoryStats() {
    if (performance.memory) {
      return {
        usedJSHeapSize: (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB',
        totalJSHeapSize: (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2) + ' MB',
        jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2) + ' MB',
      };
    }
    return {};
  }

  /**
   * Print benchmark results to console
   */
  printResults() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          GPU Performance Benchmark Results                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    let passCount = 0;
    let failCount = 0;

    for (const result of this.results) {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
      
      console.log(`${statusColor}${status}\x1b[0m ${result.name}`);
      console.log(`  Average: ${result.avgDuration.toFixed(3)}ms (target: ${result.target}ms)`);
      console.log(`  Range: ${result.minDuration.toFixed(3)}ms - ${result.maxDuration.toFixed(3)}ms`);
      console.log(`  Iterations: ${result.iterations}`);
      
      if (Object.keys(result.metadata).length > 0) {
        console.log(`  Metadata:`, result.metadata);
      }
      
      console.log('');

      if (result.passed) {
        passCount++;
      } else {
        failCount++;
      }
    }

    const totalTests = passCount + failCount;
    const passRate = ((passCount / totalTests) * 100).toFixed(1);

    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Summary: ${passCount}/${totalTests} passed (${passRate}%)`);
    console.log('─────────────────────────────────────────────────────────────\n');
  }

  /**
   * Export results as JSON
   * 
   * @returns {string} JSON string of results
   */
  exportJSON() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
    }, null, 2);
  }

  /**
   * Clean up GPU resources
   */
  destroy() {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.initialized = false;
  }
}