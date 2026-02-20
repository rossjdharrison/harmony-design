/**
 * @fileoverview Critical Path Benchmarks
 * Defines and runs benchmarks for critical user paths in the design system.
 * 
 * Critical paths:
 * - Initial page load
 * - Component mounting
 * - Event propagation
 * - Audio processing
 * - Graph traversal
 * - WASM module execution
 * 
 * @see DESIGN_SYSTEM.md#performance-testing
 */

import { BenchmarkSuite, PERFORMANCE_BUDGETS } from './benchmark-suite.js';

/**
 * Critical path benchmark configurations
 */
export const CRITICAL_PATHS = {
  INITIAL_LOAD: 'Initial Load',
  COMPONENT_MOUNT: 'Component Mount',
  EVENT_PROPAGATION: 'Event Propagation',
  AUDIO_PROCESSING: 'Audio Processing',
  GRAPH_TRAVERSAL: 'Graph Traversal',
  WASM_EXECUTION: 'WASM Execution',
  USER_INTERACTION: 'User Interaction'
};

/**
 * Run all critical path benchmarks
 * @param {Object} context - Test context with required instances
 * @returns {Promise<Object>} Benchmark results
 */
export async function runCriticalPathBenchmarks(context = {}) {
  const suite = new BenchmarkSuite();
  await suite.initialize();

  console.log('🚀 Running Critical Path Benchmarks...');

  // 1. Initial Load Path
  await benchmarkInitialLoad(suite);

  // 2. Component Mount Path
  if (context.components) {
    await benchmarkComponentMount(suite, context.components);
  }

  // 3. Event Propagation Path
  if (context.eventBus) {
    await benchmarkEventPropagation(suite, context.eventBus);
  }

  // 4. Audio Processing Path
  if (context.audioProcessor) {
    await benchmarkAudioProcessing(suite, context.audioProcessor);
  }

  // 5. Graph Traversal Path
  if (context.typeNavigator) {
    await benchmarkGraphTraversal(suite, context.typeNavigator);
  }

  // 6. WASM Execution Path
  if (context.wasmModules) {
    await benchmarkWASMExecution(suite, context.wasmModules);
  }

  // 7. User Interaction Path
  await benchmarkUserInteraction(suite);

  suite.printReport();
  return suite.generateReport();
}

/**
 * Benchmark initial load performance
 * @param {BenchmarkSuite} suite - Benchmark suite instance
 */
async function benchmarkInitialLoad(suite) {
  console.log('📦 Benchmarking Initial Load...');

  // Measure resource loading
  if (performance.timing) {
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;

    suite.results.push({
      name: 'Initial Load: Total',
      duration: loadTime,
      memory: 0,
      passed: loadTime <= PERFORMANCE_BUDGETS.INITIAL_LOAD_MS,
      metrics: {
        loadTime,
        domReady,
        budget: PERFORMANCE_BUDGETS.INITIAL_LOAD_MS
      }
    });
  }

  // Measure script parsing
  const scriptEntries = performance.getEntriesByType('resource')
    .filter(entry => entry.initiatorType === 'script');
  
  const totalScriptTime = scriptEntries.reduce((sum, entry) => sum + entry.duration, 0);

  suite.results.push({
    name: 'Initial Load: Scripts',
    duration: totalScriptTime,
    memory: 0,
    passed: totalScriptTime <= PERFORMANCE_BUDGETS.INITIAL_LOAD_MS * 0.5,
    metrics: {
      scriptCount: scriptEntries.length,
      totalTime: totalScriptTime,
      avgTime: totalScriptTime / scriptEntries.length
    }
  });
}

/**
 * Benchmark component mounting
 * @param {BenchmarkSuite} suite - Benchmark suite instance
 * @param {Object} components - Component constructors
 */
async function benchmarkComponentMount(suite, components) {
  console.log('🧩 Benchmarking Component Mount...');

  for (const [name, ComponentClass] of Object.entries(components)) {
    await suite.benchmarkComponentRender(name, () => {
      return new ComponentClass();
    });
  }
}

/**
 * Benchmark event propagation
 * @param {BenchmarkSuite} suite - Benchmark suite instance
 * @param {Object} eventBus - EventBus instance
 */
async function benchmarkEventPropagation(suite, eventBus) {
  console.log('📡 Benchmarking Event Propagation...');

  await suite.benchmarkEventBus(eventBus);

  // Test event chain
  let chainComplete = false;
  const chainHandler1 = () => eventBus.publish('chain.step2', {});
  const chainHandler2 = () => eventBus.publish('chain.step3', {});
  const chainHandler3 = () => { chainComplete = true; };

  eventBus.subscribe('chain.step1', chainHandler1);
  eventBus.subscribe('chain.step2', chainHandler2);
  eventBus.subscribe('chain.step3', chainHandler3);

  await suite.runBenchmark(
    'EventBus: Event Chain',
    () => {
      chainComplete = false;
      eventBus.publish('chain.step1', {});
      return new Promise(resolve => {
        const check = () => {
          if (chainComplete) resolve();
          else setTimeout(check, 0);
        };
        check();
      });
    },
    { iterations: 100, budget: 5 }
  );

  eventBus.unsubscribe('chain.step1', chainHandler1);
  eventBus.unsubscribe('chain.step2', chainHandler2);
  eventBus.unsubscribe('chain.step3', chainHandler3);
}

/**
 * Benchmark audio processing
 * @param {BenchmarkSuite} suite - Benchmark suite instance
 * @param {Object} audioProcessor - Audio processor instance
 */
async function benchmarkAudioProcessing(suite, audioProcessor) {
  console.log('🎵 Benchmarking Audio Processing...');

  // Simple gain processor
  const gainProcessor = (input, output) => {
    const gain = 0.5;
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] * gain;
    }
  };

  await suite.benchmarkAudioProcessing('Gain', gainProcessor);

  // Filter processor
  const filterProcessor = (input, output) => {
    let prev = 0;
    const alpha = 0.1;
    for (let i = 0; i < input.length; i++) {
      output[i] = alpha * input[i] + (1 - alpha) * prev;
      prev = output[i];
    }
  };

  await suite.benchmarkAudioProcessing('Low-Pass Filter', filterProcessor);
}

/**
 * Benchmark graph traversal
 * @param {BenchmarkSuite} suite - Benchmark suite instance
 * @param {Object} typeNavigator - TypeNavigator instance
 */
async function benchmarkGraphTraversal(suite, typeNavigator) {
  console.log('🕸️ Benchmarking Graph Traversal...');

  // Simple queries
  await suite.benchmarkTypeNavigator(typeNavigator, 'type:Component');
  await suite.benchmarkTypeNavigator(typeNavigator, 'tag:primitive');
  
  // Complex queries
  await suite.benchmarkTypeNavigator(
    typeNavigator,
    'type:Component AND tag:interactive'
  );
}

/**
 * Benchmark WASM execution
 * @param {BenchmarkSuite} suite - Benchmark suite instance
 * @param {Object} wasmModules - WASM module instances
 */
async function benchmarkWASMExecution(suite, wasmModules) {
  console.log('⚡ Benchmarking WASM Execution...');

  for (const [name, module] of Object.entries(wasmModules)) {
    if (module.benchmark) {
      await suite.benchmarkWASM(name, module.benchmark, {});
    }
  }
}

/**
 * Benchmark user interaction
 * @param {BenchmarkSuite} suite - Benchmark suite instance
 */
async function benchmarkUserInteraction(suite) {
  console.log('👆 Benchmarking User Interaction...');

  // Click response
  const button = document.createElement('button');
  button.textContent = 'Test';
  document.body.appendChild(button);

  let clickHandled = false;
  button.addEventListener('click', () => { clickHandled = true; });

  await suite.runBenchmark(
    'User Interaction: Click Response',
    () => {
      clickHandled = false;
      button.click();
      return Promise.resolve();
    },
    {
      iterations: 100,
      budget: PERFORMANCE_BUDGETS.INTERACTION_RESPONSE_MS
    }
  );

  document.body.removeChild(button);

  // Input response
  const input = document.createElement('input');
  document.body.appendChild(input);

  let inputHandled = false;
  input.addEventListener('input', () => { inputHandled = true; });

  await suite.runBenchmark(
    'User Interaction: Input Response',
    () => {
      inputHandled = false;
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      return Promise.resolve();
    },
    {
      iterations: 100,
      budget: PERFORMANCE_BUDGETS.INTERACTION_RESPONSE_MS
    }
  );

  document.body.removeChild(input);
}