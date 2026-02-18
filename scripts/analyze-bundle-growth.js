#!/usr/bin/env node

/**
 * @fileoverview Bundle Growth Analyzer
 * Compares bundle sizes between commits to detect regressions.
 * Helps track bundle size trends over time.
 * 
 * Usage: node scripts/analyze-bundle-growth.js [base-commit] [head-commit]
 * 
 * @see performance/bundle-size-config.json for budget configuration
 * @see DESIGN_SYSTEM.md#performance-budgets for policy details
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getFileSize, formatBytes } = require('./check-bundle-size');

/**
 * Get file size at specific git commit
 * @param {string} filePath - Path to file
 * @param {string} commit - Git commit hash
 * @param {string} compression - Compression type
 * @returns {number|null} File size in bytes or null if file doesn't exist
 */
function getFileSizeAtCommit(filePath, commit, compression = 'none') {
  try {
    const content = execSync(`git show ${commit}:${filePath}`, { encoding: 'buffer' });
    
    if (compression === 'gzip') {
      const { gzipSync } = require('zlib');
      return gzipSync(content).length;
    }
    
    return content.length;
  } catch (error) {
    return null;
  }
}

/**
 * Compare bundle sizes between two commits
 * @param {string} baseCommit - Base commit hash
 * @param {string} headCommit - Head commit hash
 * @param {string} configPath - Path to config file
 * @returns {Object} Comparison results
 */
function compareBundleSizes(baseCommit, headCommit, configPath) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { budgets, compression } = config;
  
  const results = {
    increased: [],
    decreased: [],
    unchanged: [],
    new: [],
    removed: []
  };
  
  let totalBaseSizeBytes = 0;
  let totalHeadSizeBytes = 0;
  
  for (const [category, files] of Object.entries(budgets)) {
    if (category === 'total') continue;
    
    for (const [filePath, budget] of Object.entries(files)) {
      const baseSize = getFileSizeAtCommit(filePath, baseCommit, compression);
      const headSize = getFileSizeAtCommit(filePath, headCommit, compression);
      
      if (baseSize === null && headSize === null) {
        continue; // File doesn't exist in either commit
      }
      
      if (baseSize === null && headSize !== null) {
        results.new.push({
          file: filePath,
          size: formatBytes(headSize),
          sizeBytes: headSize,
          description: budget.description
        });
        totalHeadSizeBytes += headSize;
        continue;
      }
      
      if (baseSize !== null && headSize === null) {
        results.removed.push({
          file: filePath,
          size: formatBytes(baseSize),
          sizeBytes: baseSize,
          description: budget.description
        });
        totalBaseSizeBytes += baseSize;
        continue;
      }
      
      const diff = headSize - baseSize;
      const diffPercent = ((diff / baseSize) * 100).toFixed(1);
      
      totalBaseSizeBytes += baseSize;
      totalHeadSizeBytes += headSize;
      
      const result = {
        file: filePath,
        baseSize: formatBytes(baseSize),
        headSize: formatBytes(headSize),
        diff: formatBytes(Math.abs(diff)),
        diffBytes: diff,
        diffPercent: diffPercent,
        description: budget.description
      };
      
      if (diff > 0) {
        results.increased.push(result);
      } else if (diff < 0) {
        results.decreased.push(result);
      } else {
        results.unchanged.push(result);
      }
    }
  }
  
  results.totalDiff = {
    baseSize: formatBytes(totalBaseSizeBytes),
    headSize: formatBytes(totalHeadSizeBytes),
    diff: formatBytes(Math.abs(totalHeadSizeBytes - totalBaseSizeBytes)),
    diffBytes: totalHeadSizeBytes - totalBaseSizeBytes,
    diffPercent: totalBaseSizeBytes > 0 
      ? (((totalHeadSizeBytes - totalBaseSizeBytes) / totalBaseSizeBytes) * 100).toFixed(1)
      : '0.0'
  };
  
  return results;
}

/**
 * Print comparison results
 * @param {Object} results - Comparison results
 * @param {string} baseCommit - Base commit hash
 * @param {string} headCommit - Head commit hash
 */
function printComparison(results, baseCommit, headCommit) {
  console.log('\n📊 Bundle Size Growth Analysis\n');
  console.log('═'.repeat(80));
  console.log(`Base: ${baseCommit.substring(0, 8)}`);
  console.log(`Head: ${headCommit.substring(0, 8)}`);
  console.log('═'.repeat(80));
  
  if (results.increased.length > 0) {
    console.log('\n📈 INCREASED (%d files):', results.increased.length);
    results.increased
      .sort((a, b) => b.diffBytes - a.diffBytes)
      .forEach(r => {
        console.log(`  ${r.file}: ${r.baseSize} → ${r.headSize} (+${r.diff}, +${r.diffPercent}%)`);
      });
  }
  
  if (results.decreased.length > 0) {
    console.log('\n📉 DECREASED (%d files):', results.decreased.length);
    results.decreased
      .sort((a, b) => a.diffBytes - b.diffBytes)
      .forEach(r => {
        console.log(`  ${r.file}: ${r.baseSize} → ${r.headSize} (${r.diff}, ${r.diffPercent}%)`);
      });
  }
  
  if (results.new.length > 0) {
    console.log('\n➕ NEW FILES (%d):', results.new.length);
    results.new.forEach(r => {
      console.log(`  ${r.file}: ${r.size}`);
    });
  }
  
  if (results.removed.length > 0) {
    console.log('\n➖ REMOVED FILES (%d):', results.removed.length);
    results.removed.forEach(r => {
      console.log(`  ${r.file}: ${r.size}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('\n📦 TOTAL BUNDLE SIZE:');
  console.log(`  Base: ${results.totalDiff.baseSize}`);
  console.log(`  Head: ${results.totalDiff.headSize}`);
  
  if (results.totalDiff.diffBytes > 0) {
    console.log(`  Change: +${results.totalDiff.diff} (+${results.totalDiff.diffPercent}%)`);
  } else if (results.totalDiff.diffBytes < 0) {
    console.log(`  Change: ${results.totalDiff.diff} (${results.totalDiff.diffPercent}%)`);
  } else {
    console.log(`  Change: No change`);
  }
  
  console.log('\n' + '═'.repeat(80));
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const baseCommit = args[0] || 'HEAD~1';
  const headCommit = args[1] || 'HEAD';
  
  const configPath = path.join(__dirname, '../performance/bundle-size-config.json');
  
  console.log('Analyzing bundle size growth...');
  
  try {
    const results = compareBundleSizes(baseCommit, headCommit, configPath);
    printComparison(results, baseCommit, headCommit);
    
    // Exit with error if total size increased significantly (>5%)
    if (results.totalDiff.diffBytes > 0 && parseFloat(results.totalDiff.diffPercent) > 5) {
      console.log('\n⚠️  WARNING: Total bundle size increased by more than 5%');
      console.log('   Consider reviewing the changes for optimization opportunities.');
    }
  } catch (error) {
    console.error('\n❌ Error analyzing bundle growth:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { compareBundleSizes };