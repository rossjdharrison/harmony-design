#!/usr/bin/env node

/**
 * @fileoverview CLI wrapper for license checker
 * @module scripts/check-licenses
 * 
 * Usage:
 *   node scripts/check-licenses.js
 *   node scripts/check-licenses.js --json reports/licenses.json
 *   node scripts/check-licenses.js --fail-on-review
 * 
 * Related: security/license-checker.js
 */

import { checkLicenses, formatReport, exportToJson } from '../security/license-checker.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  return {
    jsonOutput: args.includes('--json') ? args[args.indexOf('--json') + 1] : null,
    failOnReview: args.includes('--fail-on-review'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
License Checker - Harmony Design System

Usage:
  node scripts/check-licenses.js [options]

Options:
  --json <path>       Export results to JSON file
  --fail-on-review    Fail if any dependencies need review
  --verbose, -v       Show detailed output including approved licenses
  --help, -h          Show this help message

Exit Codes:
  0 - All licenses approved
  1 - Prohibited or unknown licenses found
  2 - Review required (only with --fail-on-review)

Examples:
  node scripts/check-licenses.js
  node scripts/check-licenses.js --json reports/licenses.json
  node scripts/check-licenses.js --fail-on-review --verbose
`);
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🔍 Checking dependency licenses...\n');

  try {
    const result = await checkLicenses(projectRoot);

    // Display report
    console.log(formatReport(result));

    // Verbose output - show approved licenses
    if (options.verbose && result.approved.length > 0) {
      console.log('\n✅ APPROVED LICENSES (detailed):');
      console.log('─'.repeat(60));
      for (const dep of result.approved) {
        const licenseStr = Array.isArray(dep.license) ? dep.license.join(' OR ') : dep.license;
        console.log(`  ${dep.name}@${dep.version}`);
        console.log(`    License: ${licenseStr}`);
        if (dep.exception) {
          console.log(`    Exception: ${dep.exception}`);
        }
        console.log('');
      }
    }

    // Export JSON if requested
    if (options.jsonOutput) {
      await exportToJson(result, options.jsonOutput);
      console.log(`\n📄 JSON report saved to: ${options.jsonOutput}`);
    }

    // Determine exit code
    let exitCode = 0;
    
    if (!result.passed) {
      exitCode = 1;
      console.error('\n❌ License check FAILED - prohibited or unknown licenses detected');
    } else if (options.failOnReview && result.needsReview.length > 0) {
      exitCode = 2;
      console.error('\n⚠️  License check FAILED - dependencies need review');
    } else {
      console.log('\n✅ License check PASSED - all dependencies approved');
    }

    process.exit(exitCode);

  } catch (err) {
    console.error('\n❌ Fatal error during license check:');
    console.error(err);
    process.exit(1);
  }
}

main();