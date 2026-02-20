/**
 * Bundle Size Tests
 * 
 * Tests that verify:
 * - Bundle size limits are not exceeded
 * - Tree-shaking is working effectively
 * - Dead code elimination is functioning
 * - Code splitting is optimal
 * 
 * @module tests/performance/bundle-size
 */

import { test, expect } from '@playwright/test';
import { readFileSync, statSync, readdirSync } from 'fs';
import { join, extname } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

/**
 * Bundle size limits (in bytes)
 * Aligned with .github/performance-budget.json
 */
const BUNDLE_SIZE_LIMITS = {
  // Core system bundles
  'harmony-core': {
    raw: 50 * 1024, // 50KB
    gzip: 15 * 1024, // 15KB
    brotli: 12 * 1024, // 12KB
  },
  'harmony-ui': {
    raw: 100 * 1024, // 100KB
    gzip: 30 * 1024, // 30KB
    brotli: 25 * 1024, // 25KB
  },
  'harmony-graph': {
    raw: 150 * 1024, // 150KB
    gzip: 45 * 1024, // 45KB
    brotli: 38 * 1024, // 38KB
  },
  // WASM modules
  'wasm-modules': {
    raw: 500 * 1024, // 500KB total
    gzip: 150 * 1024, // 150KB
    brotli: 120 * 1024, // 120KB
  },
  // Individual components (per component)
  'component': {
    raw: 10 * 1024, // 10KB
    gzip: 3 * 1024, // 3KB
    brotli: 2.5 * 1024, // 2.5KB
  },
  // Total application bundle
  'total': {
    raw: 800 * 1024, // 800KB
    gzip: 240 * 1024, // 240KB
    brotli: 200 * 1024, // 200KB
  },
};

/**
 * Get file size in different compression formats
 * @param {string} filePath - Path to file
 * @returns {{raw: number, gzip: number, brotli: number}}
 */
function getFileSizes(filePath) {
  const content = readFileSync(filePath);
  return {
    raw: content.length,
    gzip: gzipSync(content).length,
    brotli: brotliCompressSync(content).length,
  };
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Calculate percentage of limit used
 * @param {number} actual - Actual size
 * @param {number} limit - Size limit
 * @returns {number}
 */
function percentageUsed(actual, limit) {
  return ((actual / limit) * 100).toFixed(1);
}

/**
 * Find all JavaScript files in a directory
 * @param {string} dir - Directory path
 * @param {string[]} extensions - File extensions to include
 * @returns {string[]}
 */
function findFiles(dir, extensions = ['.js', '.mjs']) {
  const files = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, tests, and hidden directories
        if (!entry.name.startsWith('.') && 
            entry.name !== 'node_modules' && 
            entry.name !== 'tests' &&
            entry.name !== 'test-pages') {
          files.push(...findFiles(fullPath, extensions));
        }
      } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    console.warn(`Cannot read directory: ${dir}`);
  }
  
  return files;
}

/**
 * Analyze tree-shaking effectiveness by checking for unused exports
 * @param {string} filePath - Path to JavaScript file
 * @returns {{exports: string[], imports: string[], unused: string[]}}
 */
function analyzeTreeShaking(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  
  // Find all exports
  const exportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  const namedExportRegex = /export\s*{\s*([^}]+)\s*}/g;
  const exports = new Set();
  
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.add(match[1]);
  }
  
  while ((match = namedExportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0]);
    names.forEach(name => exports.add(name));
  }
  
  // Find all imports of this module's exports (simplified check)
  const importRegex = /import\s*{\s*([^}]+)\s*}\s*from/g;
  const imports = new Set();
  
  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => n.trim());
    names.forEach(name => imports.add(name));
  }
  
  return {
    exports: Array.from(exports),
    imports: Array.from(imports),
    unused: Array.from(exports).filter(exp => !content.includes(`${exp}(`)),
  };
}

/**
 * Check for dead code patterns
 * @param {string} filePath - Path to JavaScript file
 * @returns {string[]} - Array of potential dead code issues
 */
function checkDeadCode(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const issues = [];
  
  // Check for unreachable code after return
  if (/return\s*;?\s*\n\s*\w/.test(content)) {
    issues.push('Unreachable code after return statement');
  }
  
  // Check for unused variables (basic check)
  const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;
  let match;
  while ((match = varRegex.exec(content)) !== null) {
    const varName = match[1];
    const occurrences = (content.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
    if (occurrences === 1) {
      issues.push(`Potentially unused variable: ${varName}`);
    }
  }
  
  // Check for empty functions
  if (/function\s+\w+\s*\([^)]*\)\s*{\s*}/.test(content)) {
    issues.push('Empty function definition');
  }
  
  return issues;
}

test.describe('Bundle Size Limits', () => {
  test('harmony-core bundle size within limits', async () => {
    const coreFiles = findFiles('core');
    let totalRaw = 0;
    let totalGzip = 0;
    let totalBrotli = 0;
    
    for (const file of coreFiles) {
      const sizes = getFileSizes(file);
      totalRaw += sizes.raw;
      totalGzip += sizes.gzip;
      totalBrotli += sizes.brotli;
    }
    
    const limits = BUNDLE_SIZE_LIMITS['harmony-core'];
    
    console.log(`harmony-core bundle sizes:
      Raw: ${formatBytes(totalRaw)} (${percentageUsed(totalRaw, limits.raw)}% of limit)
      Gzip: ${formatBytes(totalGzip)} (${percentageUsed(totalGzip, limits.gzip)}% of limit)
      Brotli: ${formatBytes(totalBrotli)} (${percentageUsed(totalBrotli, limits.brotli)}% of limit)`);
    
    expect(totalRaw).toBeLessThanOrEqual(limits.raw);
    expect(totalGzip).toBeLessThanOrEqual(limits.gzip);
    expect(totalBrotli).toBeLessThanOrEqual(limits.brotli);
  });
  
  test('harmony-ui bundle size within limits', async () => {
    const uiFiles = [
      ...findFiles('components'),
      ...findFiles('primitives'),
      ...findFiles('organisms'),
    ];
    
    let totalRaw = 0;
    let totalGzip = 0;
    let totalBrotli = 0;
    
    for (const file of uiFiles) {
      const sizes = getFileSizes(file);
      totalRaw += sizes.raw;
      totalGzip += sizes.gzip;
      totalBrotli += sizes.brotli;
    }
    
    const limits = BUNDLE_SIZE_LIMITS['harmony-ui'];
    
    console.log(`harmony-ui bundle sizes:
      Raw: ${formatBytes(totalRaw)} (${percentageUsed(totalRaw, limits.raw)}% of limit)
      Gzip: ${formatBytes(totalGzip)} (${percentageUsed(totalGzip, limits.gzip)}% of limit)
      Brotli: ${formatBytes(totalBrotli)} (${percentageUsed(totalBrotli, limits.brotli)}% of limit)`);
    
    expect(totalRaw).toBeLessThanOrEqual(limits.raw);
    expect(totalGzip).toBeLessThanOrEqual(limits.gzip);
    expect(totalBrotli).toBeLessThanOrEqual(limits.brotli);
  });
  
  test('harmony-graph bundle size within limits', async () => {
    const graphFiles = findFiles('harmony-graph');
    let totalRaw = 0;
    let totalGzip = 0;
    let totalBrotli = 0;
    
    for (const file of graphFiles) {
      const sizes = getFileSizes(file);
      totalRaw += sizes.raw;
      totalGzip += sizes.gzip;
      totalBrotli += sizes.brotli;
    }
    
    const limits = BUNDLE_SIZE_LIMITS['harmony-graph'];
    
    console.log(`harmony-graph bundle sizes:
      Raw: ${formatBytes(totalRaw)} (${percentageUsed(totalRaw, limits.raw)}% of limit)
      Gzip: ${formatBytes(totalGzip)} (${percentageUsed(totalGzip, limits.gzip)}% of limit)
      Brotli: ${formatBytes(totalBrotli)} (${percentageUsed(totalBrotli, limits.brotli)}% of limit)`);
    
    expect(totalRaw).toBeLessThanOrEqual(limits.raw);
    expect(totalGzip).toBeLessThanOrEqual(limits.gzip);
    expect(totalBrotli).toBeLessThanOrEqual(limits.brotli);
  });
  
  test('WASM modules bundle size within limits', async () => {
    const wasmFiles = findFiles('bounded-contexts').filter(f => f.endsWith('.wasm'));
    let totalRaw = 0;
    let totalGzip = 0;
    let totalBrotli = 0;
    
    for (const file of wasmFiles) {
      try {
        const sizes = getFileSizes(file);
        totalRaw += sizes.raw;
        totalGzip += sizes.gzip;
        totalBrotli += sizes.brotli;
      } catch (error) {
        console.warn(`Could not read WASM file: ${file}`);
      }
    }
    
    const limits = BUNDLE_SIZE_LIMITS['wasm-modules'];
    
    console.log(`WASM modules bundle sizes:
      Raw: ${formatBytes(totalRaw)} (${percentageUsed(totalRaw, limits.raw)}% of limit)
      Gzip: ${formatBytes(totalGzip)} (${percentageUsed(totalGzip, limits.gzip)}% of limit)
      Brotli: ${formatBytes(totalBrotli)} (${percentageUsed(totalBrotli, limits.brotli)}% of limit)`);
    
    if (wasmFiles.length > 0) {
      expect(totalRaw).toBeLessThanOrEqual(limits.raw);
      expect(totalGzip).toBeLessThanOrEqual(limits.gzip);
      expect(totalBrotli).toBeLessThanOrEqual(limits.brotli);
    }
  });
  
  test('individual component sizes within limits', async () => {
    const componentFiles = [
      ...findFiles('components'),
      ...findFiles('primitives'),
    ];
    
    const limits = BUNDLE_SIZE_LIMITS['component'];
    const oversizedComponents = [];
    
    for (const file of componentFiles) {
      const sizes = getFileSizes(file);
      
      if (sizes.raw > limits.raw || 
          sizes.gzip > limits.gzip || 
          sizes.brotli > limits.brotli) {
        oversizedComponents.push({
          file,
          sizes,
          limits,
        });
      }
    }
    
    if (oversizedComponents.length > 0) {
      console.log('Oversized components:');
      oversizedComponents.forEach(({ file, sizes }) => {
        console.log(`  ${file}:
          Raw: ${formatBytes(sizes.raw)} (${percentageUsed(sizes.raw, limits.raw)}%)
          Gzip: ${formatBytes(sizes.gzip)} (${percentageUsed(sizes.gzip, limits.gzip)}%)
          Brotli: ${formatBytes(sizes.brotli)} (${percentageUsed(sizes.brotli, limits.brotli)}%)`);
      });
    }
    
    expect(oversizedComponents).toHaveLength(0);
  });
});

test.describe('Tree-Shaking Effectiveness', () => {
  test('core modules have no unused exports', async () => {
    const coreFiles = findFiles('core');
    const modulesWithUnused = [];
    
    for (const file of coreFiles) {
      const analysis = analyzeTreeShaking(file);
      
      if (analysis.unused.length > 0) {
        modulesWithUnused.push({
          file,
          unused: analysis.unused,
        });
      }
    }
    
    if (modulesWithUnused.length > 0) {
      console.log('Modules with potentially unused exports:');
      modulesWithUnused.forEach(({ file, unused }) => {
        console.log(`  ${file}: ${unused.join(', ')}`);
      });
    }
    
    // This is a warning, not a hard failure, as static analysis is imperfect
    expect(modulesWithUnused.length).toBeLessThan(coreFiles.length * 0.1); // Less than 10% of files
  });
  
  test('component modules export only used functionality', async () => {
    const componentFiles = findFiles('components');
    const inefficientModules = [];
    
    for (const file of componentFiles) {
      const analysis = analyzeTreeShaking(file);
      const exportRatio = analysis.exports.length / Math.max(1, analysis.imports.length);
      
      // Flag modules that export significantly more than they import (potential tree-shaking issue)
      if (exportRatio > 5 && analysis.exports.length > 10) {
        inefficientModules.push({
          file,
          exports: analysis.exports.length,
          imports: analysis.imports.length,
          ratio: exportRatio.toFixed(2),
        });
      }
    }
    
    if (inefficientModules.length > 0) {
      console.log('Modules with high export/import ratio:');
      inefficientModules.forEach(({ file, exports, imports, ratio }) => {
        console.log(`  ${file}: ${exports} exports / ${imports} imports (ratio: ${ratio})`);
      });
    }
    
    expect(inefficientModules.length).toBeLessThan(componentFiles.length * 0.2); // Less than 20%
  });
  
  test('no circular dependencies in core modules', async () => {
    const coreFiles = findFiles('core');
    const dependencies = new Map();
    
    // Build dependency graph
    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf-8');
      const imports = [];
      
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          imports.push(importPath);
        }
      }
      
      dependencies.set(file, imports);
    }
    
    // Check for circular dependencies (simplified)
    const circularDeps = [];
    for (const [file, imports] of dependencies) {
      for (const imp of imports) {
        const importedDeps = dependencies.get(imp) || [];
        if (importedDeps.some(d => d.includes(file))) {
          circularDeps.push(`${file} <-> ${imp}`);
        }
      }
    }
    
    if (circularDeps.length > 0) {
      console.log('Circular dependencies detected:');
      circularDeps.forEach(dep => console.log(`  ${dep}`));
    }
    
    expect(circularDeps).toHaveLength(0);
  });
});

test.describe('Dead Code Detection', () => {
  test('core modules have no obvious dead code', async () => {
    const coreFiles = findFiles('core');
    const filesWithIssues = [];
    
    for (const file of coreFiles) {
      const issues = checkDeadCode(file);
      
      if (issues.length > 0) {
        filesWithIssues.push({
          file,
          issues,
        });
      }
    }
    
    if (filesWithIssues.length > 0) {
      console.log('Files with potential dead code:');
      filesWithIssues.forEach(({ file, issues }) => {
        console.log(`  ${file}:`);
        issues.forEach(issue => console.log(`    - ${issue}`));
      });
    }
    
    // Warning threshold - some false positives expected
    expect(filesWithIssues.length).toBeLessThan(coreFiles.length * 0.15); // Less than 15%
  });
  
  test('component modules have no empty functions', async () => {
    const componentFiles = findFiles('components');
    const filesWithEmpty = [];
    
    for (const file of componentFiles) {
      const content = readFileSync(file, 'utf-8');
      
      if (/function\s+\w+\s*\([^)]*\)\s*{\s*}/.test(content)) {
        filesWithEmpty.push(file);
      }
    }
    
    if (filesWithEmpty.length > 0) {
      console.log('Files with empty functions:');
      filesWithEmpty.forEach(file => console.log(`  ${file}`));
    }
    
    expect(filesWithEmpty).toHaveLength(0);
  });
});

test.describe('Compression Effectiveness', () => {
  test('JavaScript files achieve good compression ratios', async () => {
    const allJsFiles = [
      ...findFiles('core'),
      ...findFiles('components'),
      ...findFiles('harmony-graph'),
    ];
    
    const poorCompression = [];
    
    for (const file of allJsFiles) {
      const sizes = getFileSizes(file);
      const gzipRatio = sizes.gzip / sizes.raw;
      const brotliRatio = sizes.brotli / sizes.raw;
      
      // Good compression should achieve at least 60% reduction
      if (gzipRatio > 0.4 || brotliRatio > 0.35) {
        poorCompression.push({
          file,
          gzipRatio: (gzipRatio * 100).toFixed(1),
          brotliRatio: (brotliRatio * 100).toFixed(1),
        });
      }
    }
    
    if (poorCompression.length > 0) {
      console.log('Files with poor compression ratios:');
      poorCompression.forEach(({ file, gzipRatio, brotliRatio }) => {
        console.log(`  ${file}: gzip ${gzipRatio}%, brotli ${brotliRatio}%`);
      });
    }
    
    // Allow some files to have poor compression (e.g., already compressed data)
    expect(poorCompression.length).toBeLessThan(allJsFiles.length * 0.1);
  });
  
  test('WASM files achieve acceptable compression', async () => {
    const wasmFiles = findFiles('bounded-contexts').filter(f => f.endsWith('.wasm'));
    const poorCompression = [];
    
    for (const file of wasmFiles) {
      try {
        const sizes = getFileSizes(file);
        const gzipRatio = sizes.gzip / sizes.raw;
        
        // WASM typically compresses less well than JS, expect 70-80% of original
        if (gzipRatio > 0.85) {
          poorCompression.push({
            file,
            gzipRatio: (gzipRatio * 100).toFixed(1),
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    if (poorCompression.length > 0) {
      console.log('WASM files with poor compression:');
      poorCompression.forEach(({ file, gzipRatio }) => {
        console.log(`  ${file}: gzip ${gzipRatio}%`);
      });
    }
    
    expect(poorCompression).toHaveLength(0);
  });
});