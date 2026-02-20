#!/usr/bin/env node

/**
 * @fileoverview Snapshot Restore Script
 * Restores snapshots from a previous backup.
 * 
 * Usage:
 *   node scripts/restore-snapshots.js [backup-timestamp]
 * 
 * @see DESIGN_SYSTEM.md#testing-snapshot-management
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_DIR = path.join(__dirname, '../tests/__snapshot_backups__');
const SNAPSHOT_DIR = path.join(__dirname, '../tests/__snapshots__');
const VISUAL_SNAPSHOT_DIR = path.join(__dirname, '../tests/__visual_snapshots__');

/**
 * List available backups
 * @returns {Array<string>} List of backup timestamps
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((item) => {
      const itemPath = path.join(BACKUP_DIR, item);
      return fs.statSync(itemPath).isDirectory();
    })
    .sort()
    .reverse();
}

/**
 * Restore snapshots from backup
 * @param {string} backupTimestamp - Timestamp of backup to restore
 */
function restoreSnapshots(backupTimestamp) {
  const backupPath = path.join(BACKUP_DIR, backupTimestamp);

  if (!fs.existsSync(backupPath)) {
    console.error(`✗ Backup not found: ${backupPath}`);
    process.exit(1);
  }

  console.log(`Restoring snapshots from: ${backupTimestamp}`);

  // Remove current snapshots
  if (fs.existsSync(SNAPSHOT_DIR)) {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(VISUAL_SNAPSHOT_DIR)) {
    fs.rmSync(VISUAL_SNAPSHOT_DIR, { recursive: true, force: true });
  }

  // Restore from backup
  const snapshotBackup = path.join(backupPath, 'snapshots');
  const visualBackup = path.join(backupPath, 'visual_snapshots');

  if (fs.existsSync(snapshotBackup)) {
    execSync(`xcopy "${snapshotBackup}" "${SNAPSHOT_DIR}" /E /I /Q`, {
      stdio: 'inherit',
      shell: 'cmd.exe',
    });
  }

  if (fs.existsSync(visualBackup)) {
    execSync(`xcopy "${visualBackup}" "${VISUAL_SNAPSHOT_DIR}" /E /I /Q`, {
      stdio: 'inherit',
      shell: 'cmd.exe',
    });
  }

  console.log('✓ Snapshots restored successfully');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
Snapshot Restore Script for Harmony Design System

Usage:
  node scripts/restore-snapshots.js [backup-timestamp]

If no timestamp is provided, lists available backups.
    `);
    process.exit(0);
  }

  const backups = listBackups();

  if (backups.length === 0) {
    console.log('No backups available');
    process.exit(0);
  }

  if (args.length === 0) {
    console.log('Available backups:');
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup}`);
    });
    console.log('\nUsage: node scripts/restore-snapshots.js <backup-timestamp>');
    process.exit(0);
  }

  const backupTimestamp = args[0];
  restoreSnapshots(backupTimestamp);
}

if (require.main === module) {
  main();
}

module.exports = { listBackups, restoreSnapshots };