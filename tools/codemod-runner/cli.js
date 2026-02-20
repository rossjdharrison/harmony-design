/**
 * Codemod Runner CLI
 * Command line interface for running AST transformations
 * 
 * Usage: node cli.js --transform=<name> --path=<target>
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#codemod-runner
 */

import { runCodemod } from './src/runner.js';
import { parseArgs } from './src/arg-parser.js';

/**
 * Main CLI entry point
 */
async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    
    if (!args.transform || !args.path) {
      console.error('❌ Error: --transform and --path are required');
      printHelp();
      process.exit(1);
    }
    
    console.log('🔧 Harmony Codemod Runner');
    console.log(`   Transform: ${args.transform}`);
    console.log(`   Path: ${args.path}`);
    console.log(`   Dry Run: ${args.dryRun ? 'Yes' : 'No'}`);
    console.log('');
    
    const result = await runCodemod({
      transformName: args.transform,
      targetPath: args.path,
      dryRun: args.dryRun,
      verbose: args.verbose
    });
    
    console.log('');
    console.log('✅ Transformation complete');
    console.log(`   Files scanned: ${result.scanned}`);
    console.log(`   Files modified: ${result.modified}`);
    console.log(`   Files skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Harmony Codemod Runner - AST transformation tool

Usage:
  node cli.js --transform=<name> --path=<target> [options]

Required:
  --transform=<name>    Name of transform (from transforms/ directory)
  --path=<target>       Target file or directory path

Options:
  --dry-run            Preview changes without writing
  --verbose            Show detailed output
  --help               Show this help message

Examples:
  node cli.js --transform=add-jsdoc --path=components/
  node cli.js --transform=update-event-pattern --path=primitives/ --dry-run
  `);
}

main();