#!/usr/bin/env node

/**
 * @fileoverview Snapshot Update Script
 * Updates visual regression test snapshots for the Harmony Design System.
 * 
 * Usage:
 *   node scripts/update-snapshots.js [options]
 * 
 * Options:
 *   --component <name>  Update snapshots for specific component only
 *   --suite <name>      Update snapshots for specific test suite
 *   --interactive       Review each snapshot change before updating
 *   --clean             Remove orphaned snapshots
 * 
 * @see DESIGN_SYSTEM.md#testing-snapshot-management
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Configuration for snapshot management
 */
const CONFIG = {
  snapshotDir: path.join(__dirname, '../tests/__snapshots__'),
  visualSnapshotDir: path.join(__dirname, '../tests/__visual_snapshots__'),
  componentTestDir: path.join(__dirname, '../tests/components'),
  e2eTestDir: path.join(__dirname, '../tests/e2e'),
  backupDir: path.join(__dirname, '../tests/__snapshot_backups__'),
};

/**
 * Parse command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    component: null,
    suite: null,
    interactive: false,
    clean: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--component':
        options.component = args[++i];
        break;
      case '--suite':
        options.suite = args[++i];
        break;
      case '--interactive':
        options.interactive = true;
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Snapshot Update Script for Harmony Design System

Usage:
  node scripts/update-snapshots.js [options]

Options:
  --component <name>  Update snapshots for specific component only
  --suite <name>      Update snapshots for specific test suite
  --interactive       Review each snapshot change before updating
  --clean             Remove orphaned snapshots
  --help              Show this help message

Examples:
  # Update all snapshots
  node scripts/update-snapshots.js

  # Update snapshots for button component
  node scripts/update-snapshots.js --component button

  # Interactive update with review
  node scripts/update-snapshots.js --interactive

  # Clean orphaned snapshots
  node scripts/update-snapshots.js --clean
  `);
}

/**
 * Create backup of existing snapshots
 */
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(CONFIG.backupDir, timestamp);

  console.log('Creating snapshot backup...');

  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }

  if (fs.existsSync(CONFIG.snapshotDir)) {
    execSync(`xcopy "${CONFIG.snapshotDir}" "${backupPath}\\snapshots" /E /I /Q`, {
      stdio: 'inherit',
      shell: 'cmd.exe',
    });
  }

  if (fs.existsSync(CONFIG.visualSnapshotDir)) {
    execSync(`xcopy "${CONFIG.visualSnapshotDir}" "${backupPath}\\visual_snapshots" /E /I /Q`, {
      stdio: 'inherit',
      shell: 'cmd.exe',
    });
  }

  console.log(`✓ Backup created at: ${backupPath}`);
  return backupPath;
}

/**
 * Update snapshots using test runner
 * @param {Object} options - Update options
 */
function updateSnapshots(options) {
  console.log('Updating snapshots...');

  let command = 'npm test -- --updateSnapshot';

  if (options.component) {
    command += ` --testNamePattern="${options.component}"`;
  }

  if (options.suite) {
    command += ` --testPathPattern="${options.suite}"`;
  }

  try {
    execSync(command, { stdio: 'inherit' });
    console.log('✓ Snapshots updated successfully');
  } catch (error) {
    console.error('✗ Failed to update snapshots');
    process.exit(1);
  }
}

/**
 * Clean orphaned snapshots
 */
function cleanOrphanedSnapshots() {
  console.log('Cleaning orphaned snapshots...');

  try {
    execSync('npm test -- --clearCache', { stdio: 'inherit' });
    console.log('✓ Orphaned snapshots cleaned');
  } catch (error) {
    console.error('✗ Failed to clean snapshots');
    process.exit(1);
  }
}

/**
 * Show snapshot diff summary
 */
function showDiffSummary() {
  console.log('\nSnapshot Update Summary:');
  console.log('─'.repeat(60));

  try {
    const gitStatus = execSync('git status --porcelain tests/__snapshots__', {
      encoding: 'utf-8',
    });

    if (!gitStatus.trim()) {
      console.log('No snapshots changed.');
      return;
    }

    const lines = gitStatus.trim().split('\n');
    let added = 0;
    let modified = 0;
    let deleted = 0;

    lines.forEach((line) => {
      const status = line.substring(0, 2).trim();
      if (status === 'A' || status === '??') added++;
      else if (status === 'M') modified++;
      else if (status === 'D') deleted++;
    });

    console.log(`Added:    ${added}`);
    console.log(`Modified: ${modified}`);
    console.log(`Deleted:  ${deleted}`);
    console.log('─'.repeat(60));
  } catch (error) {
    // Git not available or not a git repo
    console.log('Unable to generate diff summary');
  }
}

/**
 * Main execution
 */
function main() {
  console.log('Harmony Design System - Snapshot Update Script');
  console.log('═'.repeat(60));

  const options = parseArgs();

  // Create backup before updating
  const backupPath = createBackup();

  // Clean orphaned snapshots if requested
  if (options.clean) {
    cleanOrphanedSnapshots();
  }

  // Update snapshots
  updateSnapshots(options);

  // Show summary
  showDiffSummary();

  console.log('\n✓ Snapshot update complete');
  console.log(`  Backup location: ${backupPath}`);
  console.log('\nNext steps:');
  console.log('  1. Review snapshot changes: git diff tests/__snapshots__');
  console.log('  2. Commit if changes are correct: git add tests/__snapshots__');
  console.log('  3. Restore from backup if needed: node scripts/restore-snapshots.js');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { createBackup, updateSnapshots, cleanOrphanedSnapshots };