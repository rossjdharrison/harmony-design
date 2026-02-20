/**
 * Codemod Reporter
 * 
 * Reports transformation progress, changes, and statistics.
 * Supports verbose mode and dry-run previews.
 * 
 * @module tools/codemod-runner/reporter
 */

/**
 * Reporter
 */
export class Reporter {
  /**
   * @param {Object} options - Reporter options
   * @param {boolean} options.verbose - Verbose output
   * @param {boolean} options.dryRun - Dry run mode
   */
  constructor(options) {
    this.verbose = options.verbose;
    this.dryRun = options.dryRun;
    this.stats = {
      total: 0,
      modified: 0,
      skipped: 0,
      errors: 0
    };
    this.startTime = null;
  }

  /**
   * Start reporting
   */
  start() {
    this.startTime = Date.now();
    console.log(`\n🔄 Starting codemod ${this.dryRun ? '(DRY RUN)' : ''}...\n`);
  }

  /**
   * Report total files
   * 
   * @param {number} total - Total file count
   */
  reportTotal(total) {
    this.stats.total = total;
    console.log(`📁 Found ${total} files to process\n`);
  }

  /**
   * Report modified file
   * 
   * @param {string} filePath - File path
   */
  reportModified(filePath) {
    this.stats.modified++;
    console.log(`✅ Modified: ${filePath}`);
  }

  /**
   * Report skipped file
   * 
   * @param {string} filePath - File path
   */
  reportSkipped(filePath) {
    this.stats.skipped++;
    if (this.verbose) {
      console.log(`⏭️  Skipped: ${filePath}`);
    }
  }

  /**
   * Report error
   * 
   * @param {string} filePath - File path
   * @param {Error} error - Error object
   */
  reportError(filePath, error) {
    this.stats.errors++;
    console.error(`❌ Error in ${filePath}: ${error.message}`);
    if (this.verbose) {
      console.error(error.stack);
    }
  }

  /**
   * Report preview (dry run)
   * 
   * @param {string} filePath - File path
   * @param {string} oldSource - Original source
   * @param {string} newSource - New source
   */
  reportPreview(filePath, oldSource, newSource) {
    this.stats.modified++;
    console.log(`\n📝 Preview: ${filePath}`);
    
    if (this.verbose) {
      console.log('--- OLD ---');
      console.log(oldSource.substring(0, 200));
      console.log('--- NEW ---');
      console.log(newSource.substring(0, 200));
      console.log('---');
    }
  }

  /**
   * Finish reporting
   */
  finish() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Total files: ${this.stats.total}`);
    console.log(`   Modified: ${this.stats.modified}`);
    console.log(`   Skipped: ${this.stats.skipped}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Duration: ${duration}ms`);
    console.log('='.repeat(50) + '\n');

    if (this.dryRun) {
      console.log('ℹ️  This was a dry run. No files were modified.');
    } else if (this.stats.modified > 0) {
      console.log('✅ Codemod completed successfully!');
    } else {
      console.log('ℹ️  No files were modified.');
    }
  }
}