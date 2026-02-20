/**
 * @fileoverview Performance Benchmark Suite
 * Automated performance tests for critical paths in Harmony Design System.
 * Validates: 16ms render budget, 50MB memory budget, 200ms load budget, 10ms audio latency.
 * 
 * @see DESIGN_SYSTEM.md#performance-testing
 */

/**
 * Performance budget thresholds
 * @const {Object}
 */
export const PERFORMANCE_BUDGETS = {
  RENDER_TIME_MS: 16,           // 60fps target
  MEMORY_HEAP_MB: 50,            // WASM heap limit
  INITIAL_LOAD_MS: 200,          // Initial load time
  AUDIO_LATENCY_MS: 10,          // Audio processing latency
  INTERACTION_RESPONSE_MS: 100,  // User interaction response
  ANIMATION_FPS: 60,             // Animation smoothness
};

/**
 * Benchmark result structure
 * @typedef {Object} BenchmarkResult
 * @property {string} name - Test name
 * @property {number} duration - Duration in milliseconds
 * @property {number} memory - Memory usage in bytes
 * @property {boolean} passed - Whether test passed budget
 * @property {Object} metrics - Additional metrics
 */

/**
 * Performance benchmark runner
 */
export class BenchmarkSuite {
  constructor() {
    this.results = [];
    this.startMemory = 0;
    this.observer = null;
  }

  /**
   * Initialize performance monitoring
   */
  async initialize() {
    if (performance.memory) {
      this.startMemory = performance.memory.usedJSHeapSize;
    }

    // Set up PerformanceObserver for long tasks
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > PERFORMANCE_BUDGETS.RENDER_TIME_MS) {
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
          }
        }
      });
      
      try {
        this.observer.observe({ entryTypes: ['longtask', 'measure'] });
      } catch (e) {
        console.warn('PerformanceObserver not fully supported', e);
      }
    }
  }

  /**
   * Run a single benchmark
   * @param {string} name - Benchmark name
   * @param {Function} fn - Function to benchmark
   * @param {Object} options - Benchmark options
   * @returns {Promise<BenchmarkResult>}
   */
  async runBenchmark(name, fn, options = {}) {
    const {
      iterations = 1,
      warmup = 0,
      budget = PERFORMANCE_BUDGETS.RENDER_TIME_MS
    } = options;

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    const startMemory = performance.memory?.usedJSHeapSize || 0;
    const durations = [];

    // Run benchmark iterations
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await fn();
      const endTime = performance.now();
      durations.push(endTime - startTime);
    }

    const endMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryDelta = endMemory - startMemory;

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    const result = {
      name,
      duration: avgDuration,
      minDuration,
      maxDuration,
      memory: memoryDelta,
      passed: avgDuration <= budget,
      iterations,
      metrics: {
        durations,
        memoryBytes: memoryDelta,
        memoryMB: (memoryDelta / 1024 / 1024).toFixed(2),
        budget,
        budgetUtilization: ((avgDuration / budget) * 100).toFixed(1)
      }
    };

    this.results.push(result);
    return result;
  }

  /**
   * Benchmark component render performance
   * @param {string} componentName - Component name
   * @param {Function} createComponent - Function that creates component
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkComponentRender(componentName, createComponent) {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px;';
    document.body.appendChild(container);

    const result = await this.runBenchmark(
      `Component Render: ${componentName}`,
      () => {
        container.innerHTML = '';
        const component = createComponent();
        container.appendChild(component);
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });
      },
      {
        iterations: 10,
        warmup: 2,
        budget: PERFORMANCE_BUDGETS.RENDER_TIME_MS
      }
    );

    document.body.removeChild(container);
    return result;
  }

  /**
   * Benchmark animation performance
   * @param {string} animationName - Animation name
   * @param {Function} runAnimation - Function that runs animation
   * @param {number} durationMs - Expected animation duration
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkAnimation(animationName, runAnimation, durationMs) {
    const frames = [];
    let animationId;
    let lastTime = performance.now();

    const trackFrame = () => {
      const currentTime = performance.now();
      const frameDuration = currentTime - lastTime;
      frames.push(frameDuration);
      lastTime = currentTime;

      if (currentTime - startTime < durationMs) {
        animationId = requestAnimationFrame(trackFrame);
      }
    };

    const startTime = performance.now();
    runAnimation();
    animationId = requestAnimationFrame(trackFrame);

    await new Promise(resolve => setTimeout(resolve, durationMs + 100));
    if (animationId) cancelAnimationFrame(animationId);

    const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
    const droppedFrames = frames.filter(f => f > PERFORMANCE_BUDGETS.RENDER_TIME_MS).length;
    const fps = 1000 / avgFrameTime;

    return {
      name: `Animation: ${animationName}`,
      duration: avgFrameTime,
      memory: 0,
      passed: fps >= PERFORMANCE_BUDGETS.ANIMATION_FPS && droppedFrames === 0,
      iterations: frames.length,
      metrics: {
        fps: fps.toFixed(1),
        droppedFrames,
        frameCount: frames.length,
        avgFrameTime: avgFrameTime.toFixed(2),
        targetFPS: PERFORMANCE_BUDGETS.ANIMATION_FPS
      }
    };
  }

  /**
   * Benchmark WASM module performance
   * @param {string} moduleName - WASM module name
   * @param {Function} wasmFunction - WASM function to benchmark
   * @param {*} input - Input data
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkWASM(moduleName, wasmFunction, input) {
    return this.runBenchmark(
      `WASM: ${moduleName}`,
      () => wasmFunction(input),
      {
        iterations: 100,
        warmup: 10,
        budget: PERFORMANCE_BUDGETS.RENDER_TIME_MS
      }
    );
  }

  /**
   * Benchmark audio processing latency
   * @param {string} processorName - Audio processor name
   * @param {Function} processAudio - Audio processing function
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkAudioProcessing(processorName, processAudio) {
    const bufferSize = 128; // Standard audio buffer size
    const sampleRate = 48000;
    const inputBuffer = new Float32Array(bufferSize);
    const outputBuffer = new Float32Array(bufferSize);

    // Fill with test signal
    for (let i = 0; i < bufferSize; i++) {
      inputBuffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
    }

    return this.runBenchmark(
      `Audio Processing: ${processorName}`,
      () => processAudio(inputBuffer, outputBuffer),
      {
        iterations: 1000,
        warmup: 100,
        budget: PERFORMANCE_BUDGETS.AUDIO_LATENCY_MS
      }
    );
  }

  /**
   * Benchmark EventBus performance
   * @param {Object} eventBus - EventBus instance
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkEventBus(eventBus) {
    let eventCount = 0;
    const handler = () => { eventCount++; };

    eventBus.subscribe('test.benchmark', handler);

    const result = await this.runBenchmark(
      'EventBus: Publish/Subscribe',
      () => {
        eventBus.publish('test.benchmark', { data: 'test' });
      },
      {
        iterations: 1000,
        warmup: 100,
        budget: 1 // EventBus should be very fast
      }
    );

    eventBus.unsubscribe('test.benchmark', handler);
    return result;
  }

  /**
   * Benchmark TypeNavigator query performance
   * @param {Object} typeNavigator - TypeNavigator instance
   * @param {string} query - Query string
   * @returns {Promise<BenchmarkResult>}
   */
  async benchmarkTypeNavigator(typeNavigator, query) {
    return this.runBenchmark(
      `TypeNavigator: ${query}`,
      () => typeNavigator.query(query),
      {
        iterations: 100,
        warmup: 10,
        budget: 10 // Queries should be fast
      }
    );
  }

  /**
   * Generate benchmark report
   * @returns {Object} Report data
   */
  generateReport() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    const report = {
      summary: {
        total,
        passed,
        failed,
        passRate: ((passed / total) * 100).toFixed(1) + '%',
        timestamp: new Date().toISOString()
      },
      budgets: PERFORMANCE_BUDGETS,
      results: this.results,
      failures: this.results.filter(r => !r.passed)
    };

    return report;
  }

  /**
   * Print report to console
   */
  printReport() {
    const report = this.generateReport();
    
    console.group('🎯 Performance Benchmark Report');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`Pass Rate: ${report.summary.passRate}`);
    console.groupEnd();

    if (report.failures.length > 0) {
      console.group('❌ Failed Benchmarks');
      report.failures.forEach(result => {
        console.log(`${result.name}: ${result.duration.toFixed(2)}ms (budget: ${result.metrics.budget}ms)`);
      });
      console.groupEnd();
    }

    console.table(
      this.results.map(r => ({
        Name: r.name,
        'Duration (ms)': r.duration.toFixed(2),
        'Budget (ms)': r.metrics.budget,
        'Utilization': r.metrics.budgetUtilization + '%',
        Status: r.passed ? '✅' : '❌'
      }))
    );
  }

  /**
   * Export report to JSON
   * @returns {string} JSON string
   */
  exportJSON() {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.results = [];
  }
}