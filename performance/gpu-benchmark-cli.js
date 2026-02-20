/**
 * @fileoverview GPU Benchmark Suite CLI Runner
 * @module performance/gpu-benchmark-cli
 * 
 * Command-line interface for running GPU performance benchmarks.
 * Can be executed in Node.js with WebGPU support or in a browser context.
 * 
 * Usage:
 *   node performance/gpu-benchmark-cli.js [--output results.json] [--iterations 100]
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#gpu-performance-benchmarking}
 */

import { GPUBenchmarkSuite } from './gpu-benchmark-suite.js';

/**
 * Parse command-line arguments
 * 
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = {
    output: null,
    iterations: 100,
    warmup: 10,
    help: false,
  };

  if (typeof process !== 'undefined' && process.argv) {
    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      
      if (arg === '--help' || arg === '-h') {
        args.help = true;
      } else if (arg === '--output' || arg === '-o') {
        args.output = process.argv[++i];
      } else if (arg === '--iterations' || arg === '-i') {
        args.iterations = parseInt(process.argv[++i], 10);
      } else if (arg === '--warmup' || arg === '-w') {
        args.warmup = parseInt(process.argv[++i], 10);
      }
    }
  }

  return args;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
GPU Performance Benchmark Suite

Usage:
  node performance/gpu-benchmark-cli.js [options]

Options:
  -h, --help                Show this help message
  -o, --output <file>       Save results to JSON file
  -i, --iterations <num>    Number of benchmark iterations (default: 100)
  -w, --warmup <num>        Number of warmup iterations (default: 10)

Examples:
  node performance/gpu-benchmark-cli.js
  node performance/gpu-benchmark-cli.js --output results.json --iterations 200
  `);
}

/**
 * Main execution function
 */
async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  console.log('Initializing GPU Benchmark Suite...\n');

  const suite = new GPUBenchmarkSuite({
    warmupIterations: args.warmup,
    benchmarkIterations: args.iterations,
    logResults: true,
    includeMemoryStats: true,
  });

  const initialized = await suite.initialize();
  if (!initialized) {
    console.error('Failed to initialize GPU. WebGPU may not be available.');
    process.exit(1);
  }

  console.log('Running benchmarks...\n');

  const results = await suite.runAll();

  if (args.output) {
    const json = suite.exportJSON();
    
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Node.js environment
      const fs = await import('fs');
      fs.writeFileSync(args.output, json);
      console.log(`\nResults saved to ${args.output}`);
    } else {
      // Browser environment
      console.log('\nResults JSON:');
      console.log(json);
    }
  }

  suite.destroy();

  // Check if any tests failed
  const failedTests = results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.error(`\n${failedTests.length} benchmark(s) failed to meet performance targets.`);
    if (typeof process !== 'undefined') {
      process.exit(1);
    }
  }
}

// Run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('gpu-benchmark-cli')) {
  main().catch(error => {
    console.error('Benchmark suite error:', error);
    if (typeof process !== 'undefined') {
      process.exit(1);
    }
  });
}

export { main };