/**
 * Codemod Runner - Main orchestration
 * Coordinates file scanning, parsing, transformation, and writing
 * 
 * Performance: Processes up to 4 files concurrently
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#codemod-runner
 */

import { scanFiles } from './file-scanner.js';
import { loadTransform } from './transform-loader.js';
import { parseFile } from './parser.js';
import { writeFile } from './writer.js';

/**
 * Run codemod transformation
 * @param {Object} options - Configuration options
 * @param {string} options.transformName - Transform to apply
 * @param {string} options.targetPath - Target file or directory
 * @param {boolean} [options.dryRun=false] - Preview without writing
 * @param {boolean} [options.verbose=false] - Detailed logging
 * @returns {Promise<Object>} Results summary
 */
export async function runCodemod(options) {
  const { transformName, targetPath, dryRun = false, verbose = false } = options;
  
  // Load transform function
  const transform = await loadTransform(transformName);
  
  // Scan for files
  const files = await scanFiles(targetPath);
  
  if (verbose) {
    console.log(`Found ${files.length} files to process`);
  }
  
  const results = {
    scanned: files.length,
    modified: 0,
    skipped: 0,
    errors: 0
  };
  
  // Process files with concurrency limit
  const concurrency = 4;
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    await Promise.all(
      batch.map(file => processFile(file, transform, dryRun, verbose, results))
    );
  }
  
  return results;
}

/**
 * Process single file
 * @param {string} filePath - File to process
 * @param {Function} transform - Transform function
 * @param {boolean} dryRun - Preview mode
 * @param {boolean} verbose - Detailed logging
 * @param {Object} results - Results accumulator
 */
async function processFile(filePath, transform, dryRun, verbose, results) {
  try {
    // Parse file to AST
    const { ast, originalCode } = await parseFile(filePath);
    
    // Apply transformation
    const modifiedAst = await transform(ast, filePath);
    
    // Check if modified
    if (!modifiedAst || modifiedAst === ast) {
      results.skipped++;
      if (verbose) {
        console.log(`⊘ Skipped: ${filePath}`);
      }
      return;
    }
    
    // Write back (unless dry run)
    if (!dryRun) {
      await writeFile(filePath, modifiedAst);
    }
    
    results.modified++;
    
    if (verbose || dryRun) {
      console.log(`${dryRun ? '🔍' : '✓'} ${dryRun ? 'Would modify' : 'Modified'}: ${filePath}`);
    }
    
  } catch (error) {
    results.errors++;
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}