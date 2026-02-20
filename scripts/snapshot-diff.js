#!/usr/bin/env node

/**
 * @fileoverview Snapshot Diff Viewer
 * Generates a visual diff report for snapshot changes.
 * 
 * Usage:
 *   node scripts/snapshot-diff.js [options]
 * 
 * Options:
 *   --output <path>  Output HTML report path (default: reports/snapshot-diff.html)
 *   --json           Output JSON format instead of HTML
 * 
 * @see DESIGN_SYSTEM.md#testing-snapshot-management
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SNAPSHOT_DIR = path.join(__dirname, '../tests/__snapshots__');
const VISUAL_SNAPSHOT_DIR = path.join(__dirname, '../tests/__visual_snapshots__');
const DEFAULT_OUTPUT = path.join(__dirname, '../reports/snapshot-diff.html');

/**
 * Get snapshot changes from git
 * @returns {Array<Object>} List of changed snapshots
 */
function getSnapshotChanges() {
  try {
    const gitStatus = execSync(
      'git status --porcelain tests/__snapshots__ tests/__visual_snapshots__',
      { encoding: 'utf-8' }
    );

    if (!gitStatus.trim()) {
      return [];
    }

    const changes = [];
    const lines = gitStatus.trim().split('\n');

    lines.forEach((line) => {
      const status = line.substring(0, 2).trim();
      const filePath = line.substring(3);

      changes.push({
        status: getStatusLabel(status),
        file: filePath,
        type: filePath.includes('__visual_snapshots__') ? 'visual' : 'text',
      });
    });

    return changes;
  } catch (error) {
    console.error('Error getting snapshot changes:', error.message);
    return [];
  }
}

/**
 * Get human-readable status label
 * @param {string} status - Git status code
 * @returns {string} Status label
 */
function getStatusLabel(status) {
  switch (status) {
    case 'A':
    case '??':
      return 'added';
    case 'M':
      return 'modified';
    case 'D':
      return 'deleted';
    default:
      return 'unknown';
  }
}

/**
 * Generate HTML report
 * @param {Array<Object>} changes - Snapshot changes
 * @param {string} outputPath - Output file path
 */
function generateHTMLReport(changes, outputPath) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Snapshot Diff Report - Harmony Design System</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 1rem;
      font-size: 2rem;
    }
    .summary {
      display: flex;
      gap: 2rem;
      margin: 2rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .summary-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .summary-count {
      font-size: 2rem;
      font-weight: bold;
      color: #2c3e50;
    }
    .summary-label {
      font-size: 0.875rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .changes-list {
      list-style: none;
    }
    .change-item {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .change-item:last-child {
      border-bottom: none;
    }
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-added {
      background: #d4edda;
      color: #155724;
    }
    .status-modified {
      background: #fff3cd;
      color: #856404;
    }
    .status-deleted {
      background: #f8d7da;
      color: #721c24;
    }
    .file-path {
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: #495057;
      flex: 1;
    }
    .type-badge {
      padding: 0.25rem 0.5rem;
      background: #e9ecef;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #495057;
    }
    .no-changes {
      text-align: center;
      padding: 3rem;
      color: #666;
    }
    .timestamp {
      text-align: center;
      margin-top: 2rem;
      color: #999;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Snapshot Diff Report</h1>
    <p>Harmony Design System - Test Snapshot Changes</p>
    
    ${
      changes.length > 0
        ? `
    <div class="summary">
      <div class="summary-item">
        <div class="summary-count">${changes.length}</div>
        <div class="summary-label">Total Changes</div>
      </div>
      <div class="summary-item">
        <div class="summary-count">${changes.filter((c) => c.status === 'added').length}</div>
        <div class="summary-label">Added</div>
      </div>
      <div class="summary-item">
        <div class="summary-count">${changes.filter((c) => c.status === 'modified').length}</div>
        <div class="summary-label">Modified</div>
      </div>
      <div class="summary-item">
        <div class="summary-count">${changes.filter((c) => c.status === 'deleted').length}</div>
        <div class="summary-label">Deleted</div>
      </div>
    </div>
    
    <ul class="changes-list">
      ${changes
        .map(
          (change) => `
        <li class="change-item">
          <span class="status-badge status-${change.status}">${change.status}</span>
          <span class="file-path">${change.file}</span>
          <span class="type-badge">${change.type}</span>
        </li>
      `
        )
        .join('')}
    </ul>
    `
        : `
    <div class="no-changes">
      <p>No snapshot changes detected.</p>
    </div>
    `
    }
    
    <div class="timestamp">
      Generated: ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`✓ Report generated: ${outputPath}`);
}

/**
 * Generate JSON report
 * @param {Array<Object>} changes - Snapshot changes
 * @param {string} outputPath - Output file path
 */
function generateJSONReport(changes, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    totalChanges: changes.length,
    added: changes.filter((c) => c.status === 'added').length,
    modified: changes.filter((c) => c.status === 'modified').length,
    deleted: changes.filter((c) => c.status === 'deleted').length,
    changes,
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✓ Report generated: ${outputPath}`);
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  let outputPath = DEFAULT_OUTPUT;
  let jsonFormat = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
        outputPath = args[++i];
        break;
      case '--json':
        jsonFormat = true;
        if (outputPath === DEFAULT_OUTPUT) {
          outputPath = path.join(__dirname, '../reports/snapshot-diff.json');
        }
        break;
      case '--help':
        console.log(`
Snapshot Diff Viewer for Harmony Design System

Usage:
  node scripts/snapshot-diff.js [options]

Options:
  --output <path>  Output report path
  --json           Output JSON format instead of HTML
  --help           Show this help message
        `);
        process.exit(0);
        break;
    }
  }

  console.log('Generating snapshot diff report...');

  const changes = getSnapshotChanges();

  if (jsonFormat) {
    generateJSONReport(changes, outputPath);
  } else {
    generateHTMLReport(changes, outputPath);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getSnapshotChanges, generateHTMLReport, generateJSONReport };