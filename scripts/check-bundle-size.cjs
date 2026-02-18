#!/usr/bin/env node

/**
 * @fileoverview Bundle Size Checker
 * Enforces performance budgets by checking file sizes against configured limits.
 * Runs in CI to prevent bundle size regressions.
 * 
 * @see performance/bundle-size-config.json for budget configuration
 * @see DESIGN_SYSTEM.md#performance-budgets for policy details
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

/**
 * Parse size string to bytes
 * @param {string} sizeStr - Size string like "10kb", "1MB"
 * @returns {number} Size in bytes
 */
function parseSizeToBytes(sizeStr) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }
  
  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file size with optional compression
 * @param {string} filePath - Path to file
 * @param {string} compression - Compression type ('gzip' or 'none')
 * @returns {number} File size in bytes
 */
function getFileSize(filePath, compression = 'none') {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath);
  
  if (compression === 'gzip') {
    return gzipSync(content).length;
  }
  
  return content.length;
}

/**
 * Check if file path matches ignore patterns
 * @param {string} filePath - Path to check
 * @param {string[]} ignorePatterns - Patterns to ignore
 * @returns {boolean} True if should be ignored
 */
function shouldIgnore(filePath, ignorePatterns) {
  return ignorePatterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(filePath);
  });
}

/**
 * Expand glob patterns to file paths
 * @param {string} pattern - File pattern (may contain *)
 * @param {string} baseDir - Base directory
 * @returns {string[]} Matched file paths
 */
function expandPattern(pattern, baseDir) {
  if (!pattern.includes('*')) {
    return [path.join(baseDir, pattern)];
  }
  
  const parts = pattern.split('/');
  const dirParts = parts.slice(0, -1);
  const filePattern = parts[parts.length - 1];
  
  const dir = path.join(baseDir, ...dirParts);
  
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const regex = new RegExp('^' + filePattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  const files = fs.readdirSync(dir);
  
  return files
    .filter(file => regex.test(file))
    .map(file => path.join(dir, file));
}

/**
 * Check bundle sizes against budgets
 * @param {string} configPath - Path to config file
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Object} Check results
 */
function checkBundleSizes(configPath, baseDir) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const { budgets, thresholds, compression, ignorePatterns } = config;
  
  const results = {
    passed: [],
    warnings: [],
    errors: [],
    missing: []
  };
  
  let totalSize = 0;
  let totalBudget = 0;
  
  // Check individual file budgets
  for (const [category, files] of Object.entries(budgets)) {
    if (category === 'total') continue;
    
    for (const [filePath, budget] of Object.entries(files)) {
      if (shouldIgnore(filePath, ignorePatterns)) {
        continue;
      }
      
      const expandedPaths = expandPattern(filePath, baseDir);
      
      if (expandedPaths.length === 0) {
        results.missing.push({
          category,
          file: filePath,
          description: budget.description
        });
        continue;
      }
      
      for (const fullPath of expandedPaths) {
        const size = getFileSize(fullPath, compression);
        
        if (size === null) {
          results.missing.push({
            category,
            file: path.relative(baseDir, fullPath),
            description: budget.description
          });
          continue;
        }
        
        const maxSize = parseSizeToBytes(budget.maxSize);
        const warningThreshold = maxSize * thresholds.warning;
        
        totalSize += size;
        totalBudget += maxSize;
        
        const result = {
          category,
          file: path.relative(baseDir, fullPath),
          size: formatBytes(size),
          sizeBytes: size,
          budget: budget.maxSize,
          budgetBytes: maxSize,
          percentage: ((size / maxSize) * 100).toFixed(1),
          description: budget.description
        };
        
        if (size > maxSize) {
          results.errors.push(result);
        } else if (size > warningThreshold) {
          results.warnings.push(result);
        } else {
          results.passed.push(result);
        }
      }
    }
  }
  
  // Check total bundle budget if configured
  if (budgets.total && budgets.total.fullBundle) {
    const maxTotal = parseSizeToBytes(budgets.total.fullBundle.maxSize);
    const warningThreshold = maxTotal * thresholds.warning;
    
    const totalResult = {
      category: 'total',
      file: 'Full Bundle',
      size: formatBytes(totalSize),
      sizeBytes: totalSize,
      budget: budgets.total.fullBundle.maxSize,
      budgetBytes: maxTotal,
      percentage: ((totalSize / maxTotal) * 100).toFixed(1),
      description: budgets.total.fullBundle.description
    };
    
    if (totalSize > maxTotal) {
      results.errors.push(totalResult);
    } else if (totalSize > warningThreshold) {
      results.warnings.push(totalResult);
    } else {
      results.passed.push(totalResult);
    }
  }
  
  return results;
}

/**
 * Print results to console
 * @param {Object} results - Check results
 */
function printResults(results) {
  console.log('\n📦 Bundle Size Check Results\n');
  console.log('═'.repeat(80));
  
  if (results.passed.length > 0) {
    console.log('\n✅ PASSED (%d files):', results.passed.length);
    results.passed.forEach(r => {
      console.log(`  ${r.file}: ${r.size} / ${r.budget} (${r.percentage}%)`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (%d files):', results.warnings.length);
    results.warnings.forEach(r => {
      console.log(`  ${r.file}: ${r.size} / ${r.budget} (${r.percentage}%) - ${r.description}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS (%d files):', results.errors.length);
    results.errors.forEach(r => {
      const overage = formatBytes(r.sizeBytes - r.budgetBytes);
      console.log(`  ${r.file}: ${r.size} / ${r.budget} (${r.percentage}%) - OVER by ${overage}`);
      console.log(`     ${r.description}`);
    });
  }
  
  if (results.missing.length > 0) {
    console.log('\n⚠️  MISSING FILES (%d files):', results.missing.length);
    results.missing.forEach(r => {
      console.log(`  ${r.file} - ${r.description}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  
  const totalChecked = results.passed.length + results.warnings.length + results.errors.length;
  console.log(`\nTotal files checked: ${totalChecked}`);
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Warnings: ${results.warnings.length}`);
  console.log(`Errors: ${results.errors.length}`);
  console.log(`Missing: ${results.missing.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Bundle size check FAILED - files exceed budget');
    console.log('   Please reduce bundle size or update budget configuration.');
    return false;
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Bundle size check passed with warnings');
    console.log('   Consider optimizing files approaching budget limits.');
  } else {
    console.log('\n✅ Bundle size check PASSED');
  }
  
  return true;
}

/**
 * Main execution
 */
function main() {
  const configPath = path.join(__dirname, '../performance/bundle-size-config.json');
  const baseDir = path.join(__dirname, '..');
  
  console.log('Checking bundle sizes...');
  console.log(`Config: ${configPath}`);
  console.log(`Base directory: ${baseDir}`);
  
  try {
    const results = checkBundleSizes(configPath, baseDir);
    const success = printResults(results);
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error checking bundle sizes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { checkBundleSizes, parseSizeToBytes, formatBytes };