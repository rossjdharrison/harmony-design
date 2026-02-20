/**
 * @fileoverview Master benchmark runner that executes all benchmark suites
 * @module performance/benchmarks/run-all-benchmarks
 */

import { runWasmBenchmarks } from './run-wasm-benchmarks.js';
import { runRenderBenchmarks } from './run-render-benchmarks.js';
import { runAudioBenchmarks } from './run-audio-benchmarks.js';
import { saveResults } from './utils/results-storage.js';

/**
 * Run all benchmark suites
 * @returns {Promise<Object>} Combined results from all suites
 */
async function runAllBenchmarks() {
  console.log('🏁 Starting all benchmark suites...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    suites: {}
  };
  
  try {
    // Run WASM benchmarks
    console.log('📦 Running WASM benchmarks...');
    results.suites.wasm = await runWasmBenchmarks();
    console.log('✅ WASM benchmarks complete\n');
  } catch (error) {
    console.error('❌ WASM benchmarks failed:', error.message);
    results.suites.wasm = { error: error.message };
  }
  
  try {
    // Run render benchmarks
    console.log('🎨 Running render benchmarks...');
    results.suites.render = await runRenderBenchmarks();
    console.log('✅ Render benchmarks complete\n');
  } catch (error) {
    console.error('❌ Render benchmarks failed:', error.message);
    results.suites.render = { error: error.message };
  }
  
  try {
    // Run audio benchmarks
    console.log('🔊 Running audio benchmarks...');
    results.suites.audio = await runAudioBenchmarks();
    console.log('✅ Audio benchmarks complete\n');
  } catch (error) {
    console.error('❌ Audio benchmarks failed:', error.message);
    results.suites.audio = { error: error.message };
  }
  
  // Save combined results
  await saveResults(results, 'all-benchmarks');
  
  console.log('🏁 All benchmarks complete');
  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBenchmarks()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runAllBenchmarks };