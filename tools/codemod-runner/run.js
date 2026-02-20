/**
 * Codemod Runner Entry Point
 * 
 * Executes AST transformations across the codebase for bulk updates.
 * Supports dry-run mode, selective transforms, and detailed reporting.
 * 
 * @module tools/codemod-runner
 */

import { parseArgs } from './src/cli-parser.js';
import { CodemodRunner } from './src/runner.js';
import { Reporter } from './src/reporter.js';
import { loadTransform } from './src/transform-loader.js';

/**
 * Main execution function
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.transform) {
    console.error('Error: --transform is required');
    printHelp();
    process.exit(1);
  }

  if (!args.path) {
    console.error('Error: --path is required');
    printHelp();
    process.exit(1);
  }

  const reporter = new Reporter({
    verbose: args.verbose,
    dryRun: args.dryRun
  });

  try {
    // Load the transform
    const transform = await loadTransform(args.transform);
    
    // Create runner
    const runner = new CodemodRunner({
      transform,
      dryRun: args.dryRun,
      reporter,
      extensions: args.extensions || ['.js', '.ts'],
      exclude: args.exclude || ['node_modules', 'dist', '.git']
    });

    // Execute transformation
    reporter.start();
    await runner.run(args.path);
    reporter.finish();

  } catch (error) {
    console.error('Codemod execution failed:', error.message);
    if (args.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
Codemod Runner - AST Transformation Tool

Usage:
  node tools/codemod-runner/run.js [options]

Options:
  --transform=<name>    Transform to apply (required)
  --path=<path>         Target path (file or directory, required)
  --dry-run            Preview changes without writing
  --verbose            Show detailed output
  --extensions=<list>   File extensions to process (default: .js,.ts)
  --exclude=<list>      Directories to exclude (default: node_modules,dist,.git)
  --help               Show this help

Examples:
  node tools/codemod-runner/run.js --transform=update-event-pattern --path=components
  node tools/codemod-runner/run.js --transform=add-jsdoc --path=components/Button.js --dry-run
  `);
}

// Execute
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});