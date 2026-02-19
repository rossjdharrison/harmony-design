#!/usr/bin/env node

/**
 * @fileoverview Validate ESLint configuration and run linting
 * @module scripts/validate-eslint
 * 
 * This script validates the ESLint configuration and runs linting
 * on the codebase. It's used in CI/CD pipelines and pre-commit hooks.
 * 
 * Usage:
 *   node scripts/validate-eslint.js [--fix]
 * 
 * @see {@link ../DESIGN_SYSTEM.md#code-quality Code Quality Standards}
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Check if ESLint configuration is valid
 * 
 * @returns {Promise<boolean>} True if configuration is valid
 */
async function validateConfig() {
  console.log('🔍 Validating ESLint configuration...');
  
  const configPaths = [
    '.eslintrc.json',
    'config/eslint.config.js',
    'config/eslint-a11y-rules.js',
  ];

  for (const path of configPaths) {
    if (!existsSync(path)) {
      console.error(`❌ Missing configuration file: ${path}`);
      return false;
    }
  }

  console.log('✅ ESLint configuration files found');
  return true;
}

/**
 * Run ESLint on the codebase
 * 
 * @param {boolean} fix - Whether to auto-fix issues
 * @returns {Promise<{success: boolean, errors: number, warnings: number}>}
 */
async function runLint(fix = false) {
  console.log(`\n🔍 Running ESLint${fix ? ' with auto-fix' : ''}...`);
  
  const patterns = [
    'components/**/*.js',
    'primitives/**/*.js',
    'organisms/**/*.js',
    'templates/**/*.js',
    'utils/**/*.js',
    'core/**/*.js',
    'hooks/**/*.js',
    'contexts/**/*.js',
    'controls/**/*.js',
    'web/**/*.js',
  ];

  const fixFlag = fix ? '--fix' : '';
  const command = `npx eslint ${patterns.join(' ')} ${fixFlag} --format stylish`;

  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) {
      console.log(stdout);
    }
    
    // Parse output for errors and warnings
    const errorMatch = stdout.match(/(\d+)\s+error/);
    const warningMatch = stdout.match(/(\d+)\s+warning/);
    
    const errors = errorMatch ? parseInt(errorMatch[1], 10) : 0;
    const warnings = warningMatch ? parseInt(warningMatch[1], 10) : 0;

    if (errors === 0 && warnings === 0) {
      console.log('\n✅ No linting issues found!');
      return { success: true, errors: 0, warnings: 0 };
    } else {
      console.log(`\n⚠️  Found ${errors} errors and ${warnings} warnings`);
      return { success: errors === 0, errors, warnings };
    }
  } catch (error) {
    console.error('❌ ESLint failed:', error.message);
    return { success: false, errors: -1, warnings: -1 };
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ESLint Validation for Harmony Design System');
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Validate configuration
  const configValid = await validateConfig();
  if (!configValid) {
    console.error('\n❌ Configuration validation failed');
    process.exit(1);
  }

  // Step 2: Run linting
  const { success, errors, warnings } = await runLint(shouldFix);

  // Step 3: Report results
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Errors:   ${errors}`);
  console.log(`  Warnings: ${warnings}`);
  console.log(`  Status:   ${success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (!success) {
    console.error('💡 Tip: Run with --fix to auto-fix some issues');
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}