/**
 * GPU Test Runner
 * 
 * Provides infrastructure for running WebGPU compute shader tests.
 * Handles device initialization, buffer management, and test isolation.
 * 
 * @module tests/gpu/gpu-test-runner
 * @see {@link ../../DESIGN_SYSTEM.md#gpu-shader-testing}
 */

export class GPUTestRunner {
  constructor() {
    /** @type {GPUDevice | null} */
    this.device = null;
    
    /** @type {GPUAdapter | null} */
    this.adapter = null;
    
    /** @type {Array<{name: string, result: 'pass' | 'fail' | 'skip', duration: number, error?: string}>} */
    this.results = [];
    
    /** @type {Map<string, number>} */
    this.performanceBaselines = new Map();
  }

  /**
   * Initialize WebGPU device for testing
   * @returns {Promise<boolean>} True if initialization succeeded
   */
  async initialize() {
    if (!navigator.gpu) {
      console.error('WebGPU not supported');
      return false;
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter();
      if (!this.adapter) {
        console.error('Failed to get GPU adapter');
        return false;
      }

      this.device = await this.adapter.requestDevice();
      if (!this.device) {
        console.error('Failed to get GPU device');
        return false;
      }

      // Handle device lost
      this.device.lost.then((info) => {
        console.error(`GPU device lost: ${info.message}`);
      });

      console.log('GPU test runner initialized');
      console.log(`Adapter: ${this.adapter.name || 'Unknown'}`);
      console.log(`Limits:`, this.device.limits);

      return true;
    } catch (error) {
      console.error('GPU initialization failed:', error);
      return false;
    }
  }

  /**
   * Run a single shader test case
   * @param {ShaderTestCase} testCase - Test case to run
   * @returns {Promise<{result: 'pass' | 'fail' | 'skip', duration: number, error?: string}>}
   */
  async runTest(testCase) {
    if (!this.device) {
      return { result: 'skip', duration: 0, error: 'GPU not initialized' };
    }

    const startTime = performance.now();

    try {
      // Create shader module
      const shaderModule = this.device.createShaderModule({
        label: testCase.name,
        code: testCase.shaderCode
      });

      // Check for shader compilation errors
      const compilationInfo = await shaderModule.getCompilationInfo();
      if (compilationInfo.messages.some(m => m.type === 'error')) {
        const errors = compilationInfo.messages
          .filter(m => m.type === 'error')
          .map(m => m.message)
          .join('\n');
        return { result: 'fail', duration: performance.now() - startTime, error: `Shader compilation failed:\n${errors}` };
      }

      // Create compute pipeline
      const pipeline = this.device.createComputePipeline({
        label: testCase.name,
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: testCase.entryPoint || 'main'
        }
      });

      // Create input buffers
      const inputBuffers = testCase.createInputBuffers(this.device);

      // Create output buffer
      const outputBuffer = this.device.createBuffer({
        label: `${testCase.name}-output`,
        size: testCase.outputSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
      });

      // Create staging buffer for reading results
      const stagingBuffer = this.device.createBuffer({
        label: `${testCase.name}-staging`,
        size: testCase.outputSize,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
      });

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        label: testCase.name,
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          ...inputBuffers.map((buffer, index) => ({
            binding: index,
            resource: { buffer }
          })),
          {
            binding: inputBuffers.length,
            resource: { buffer: outputBuffer }
          }
        ]
      });

      // Record and submit compute pass
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(...testCase.workgroups);
      passEncoder.end();

      // Copy output to staging buffer
      commandEncoder.copyBufferToBuffer(
        outputBuffer, 0,
        stagingBuffer, 0,
        testCase.outputSize
      );

      this.device.queue.submit([commandEncoder.finish()]);

      // Read results
      await stagingBuffer.mapAsync(GPUMapMode.READ);
      const outputData = new Uint8Array(stagingBuffer.getMappedRange()).slice();
      stagingBuffer.unmap();

      // Validate results
      const validation = testCase.validate(outputData);

      // Cleanup
      inputBuffers.forEach(buffer => buffer.destroy());
      outputBuffer.destroy();
      stagingBuffer.destroy();

      const duration = performance.now() - startTime;

      if (!validation.passed) {
        return { result: 'fail', duration, error: validation.error };
      }

      // Check performance budget if specified
      if (testCase.performanceBudget && duration > testCase.performanceBudget) {
        return { 
          result: 'fail', 
          duration, 
          error: `Performance budget exceeded: ${duration.toFixed(2)}ms > ${testCase.performanceBudget}ms` 
        };
      }

      return { result: 'pass', duration };

    } catch (error) {
      const duration = performance.now() - startTime;
      return { result: 'fail', duration, error: error.message };
    }
  }

  /**
   * Run a suite of tests
   * @param {Array<ShaderTestCase>} testCases - Array of test cases
   * @returns {Promise<{passed: number, failed: number, skipped: number, results: Array}>}
   */
  async runSuite(testCases) {
    this.results = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`Running ${testCases.length} GPU shader tests...`);

    for (const testCase of testCases) {
      console.log(`  ${testCase.name}...`);
      const result = await this.runTest(testCase);
      
      this.results.push({
        name: testCase.name,
        ...result
      });

      if (result.result === 'pass') {
        passed++;
        console.log(`    ✓ PASS (${result.duration.toFixed(2)}ms)`);
      } else if (result.result === 'fail') {
        failed++;
        console.error(`    ✗ FAIL (${result.duration.toFixed(2)}ms)`);
        if (result.error) {
          console.error(`      ${result.error}`);
        }
      } else {
        skipped++;
        console.warn(`    ⊘ SKIP (${result.error})`);
      }
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);

    return {
      passed,
      failed,
      skipped,
      results: this.results
    };
  }

  /**
   * Load performance baselines from storage
   * @param {string} baselineFile - Path to baseline JSON file
   * @returns {Promise<void>}
   */
  async loadBaselines(baselineFile) {
    try {
      const response = await fetch(baselineFile);
      const baselines = await response.json();
      this.performanceBaselines = new Map(Object.entries(baselines));
      console.log(`Loaded ${this.performanceBaselines.size} performance baselines`);
    } catch (error) {
      console.warn('Could not load performance baselines:', error.message);
    }
  }

  /**
   * Compare current results against baselines
   * @param {number} regressionThreshold - Percentage threshold for regression (default 5%)
   * @returns {{regressions: Array<{name: string, baseline: number, current: number, change: number}>}}
   */
  compareToBaseline(regressionThreshold = 5) {
    const regressions = [];

    for (const result of this.results) {
      if (result.result !== 'pass') continue;

      const baseline = this.performanceBaselines.get(result.name);
      if (!baseline) continue;

      const change = ((result.duration - baseline) / baseline) * 100;
      if (change > regressionThreshold) {
        regressions.push({
          name: result.name,
          baseline,
          current: result.duration,
          change
        });
      }
    }

    return { regressions };
  }

  /**
   * Generate performance report
   * @returns {string} Markdown-formatted report
   */
  generateReport() {
    let report = '# GPU Shader Test Report\n\n';
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Total Tests**: ${this.results.length}\n`;
    report += `**Passed**: ${this.results.filter(r => r.result === 'pass').length}\n`;
    report += `**Failed**: ${this.results.filter(r => r.result === 'fail').length}\n`;
    report += `**Skipped**: ${this.results.filter(r => r.result === 'skip').length}\n\n`;

    report += '## Test Results\n\n';
    report += '| Test | Result | Duration | Notes |\n';
    report += '|------|--------|----------|-------|\n';

    for (const result of this.results) {
      const status = result.result === 'pass' ? '✓' : result.result === 'fail' ? '✗' : '⊘';
      const duration = result.duration.toFixed(2);
      const notes = result.error ? result.error.substring(0, 50) : '';
      report += `| ${result.name} | ${status} | ${duration}ms | ${notes} |\n`;
    }

    // Performance comparison
    const comparison = this.compareToBaseline();
    if (comparison.regressions.length > 0) {
      report += '\n## Performance Regressions\n\n';
      report += '| Test | Baseline | Current | Change |\n';
      report += '|------|----------|---------|--------|\n';
      for (const reg of comparison.regressions) {
        report += `| ${reg.name} | ${reg.baseline.toFixed(2)}ms | ${reg.current.toFixed(2)}ms | +${reg.change.toFixed(1)}% |\n`;
      }
    }

    return report;
  }

  /**
   * Cleanup and destroy GPU resources
   */
  async cleanup() {
    if (this.device) {
      this.device.destroy();
      this.device = null;
    }
    this.adapter = null;
    console.log('GPU test runner cleaned up');
  }
}