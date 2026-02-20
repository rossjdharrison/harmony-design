/**
 * @fileoverview Duplicate Code Audit Tool
 * Identifies duplicate implementations across modules in the Harmony Design System.
 * 
 * Vision Alignment: Supports code quality and maintainability for all system components.
 * 
 * Usage: node scripts/audit-duplicate-code.js [--threshold=3] [--min-lines=5] [--output=report]
 * 
 * @module scripts/audit-duplicate-code
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Configuration for duplicate detection
 * @typedef {Object} AuditConfig
 * @property {number} minLines - Minimum lines to consider as duplicate
 * @property {number} threshold - Minimum similarity threshold (0-1)
 * @property {string[]} excludeDirs - Directories to exclude from scan
 * @property {string[]} extensions - File extensions to scan
 * @property {string} outputFormat - Output format: 'console', 'json', 'markdown'
 */

/**
 * Represents a code block that may be duplicated
 * @typedef {Object} CodeBlock
 * @property {string} file - File path
 * @property {number} startLine - Starting line number
 * @property {number} endLine - Ending line number
 * @property {string} content - Code content
 * @property {string} hash - Content hash for comparison
 * @property {string} normalizedHash - Normalized content hash (ignoring whitespace/comments)
 */

/**
 * Duplicate detection result
 * @typedef {Object} DuplicateGroup
 * @property {string} hash - Hash identifying this duplicate group
 * @property {number} instances - Number of duplicate instances
 * @property {number} lines - Number of lines duplicated
 * @property {CodeBlock[]} locations - All locations of this duplicate
 * @property {number} severity - Severity score (higher = more critical)
 */

class DuplicateCodeAuditor {
  /**
   * @param {AuditConfig} config - Audit configuration
   */
  constructor(config = {}) {
    this.config = {
      minLines: config.minLines || 5,
      threshold: config.threshold || 3, // Minimum number of duplicates
      excludeDirs: config.excludeDirs || [
        'node_modules',
        'dist',
        'build',
        '.git',
        'coverage',
        'docs-backup-20260215-110945',
        'public',
        '.next',
        '.vscode',
        '.storybook'
      ],
      extensions: config.extensions || ['.js', '.ts', '.jsx', '.tsx', '.mjs'],
      outputFormat: config.outputFormat || 'console'
    };

    this.files = [];
    this.codeBlocks = [];
    this.duplicates = [];
  }

  /**
   * Run the complete audit process
   * @param {string} rootDir - Root directory to scan
   * @returns {Promise<DuplicateGroup[]>}
   */
  async run(rootDir = '.') {
    console.log('🔍 Starting Duplicate Code Audit...\n');
    
    // Step 1: Discover files
    console.log('📁 Discovering files...');
    this.files = this.discoverFiles(rootDir);
    console.log(`   Found ${this.files.length} files to analyze\n`);

    // Step 2: Extract code blocks
    console.log('📝 Extracting code blocks...');
    this.codeBlocks = this.extractCodeBlocks();
    console.log(`   Extracted ${this.codeBlocks.length} code blocks\n`);

    // Step 3: Find duplicates
    console.log('🔎 Identifying duplicates...');
    this.duplicates = this.findDuplicates();
    console.log(`   Found ${this.duplicates.length} duplicate groups\n`);

    // Step 4: Generate report
    this.generateReport();

    return this.duplicates;
  }

  /**
   * Recursively discover files to analyze
   * @param {string} dir - Directory to scan
   * @param {string[]} fileList - Accumulated file list
   * @returns {string[]}
   */
  discoverFiles(dir, fileList = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative('.', fullPath);

      // Skip excluded directories
      if (entry.isDirectory()) {
        if (!this.config.excludeDirs.some(excluded => 
          relativePath.includes(excluded) || entry.name === excluded
        )) {
          this.discoverFiles(fullPath, fileList);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.config.extensions.includes(ext)) {
          fileList.push(fullPath);
        }
      }
    }

    return fileList;
  }

  /**
   * Extract code blocks from all files
   * @returns {CodeBlock[]}
   */
  extractCodeBlocks() {
    const blocks = [];

    for (const file of this.files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        // Extract blocks using sliding window
        for (let i = 0; i < lines.length - this.config.minLines + 1; i++) {
          for (let size = this.config.minLines; size <= Math.min(50, lines.length - i); size++) {
            const blockLines = lines.slice(i, i + size);
            const blockContent = blockLines.join('\n');

            // Skip blocks that are mostly comments or whitespace
            if (this.isSignificantCode(blockContent)) {
              blocks.push({
                file: path.relative('.', file),
                startLine: i + 1,
                endLine: i + size,
                content: blockContent,
                hash: this.hashContent(blockContent),
                normalizedHash: this.hashContent(this.normalizeCode(blockContent))
              });
            }
          }
        }
      } catch (error) {
        console.warn(`   ⚠️  Could not read ${file}: ${error.message}`);
      }
    }

    return blocks;
  }

  /**
   * Check if code block is significant (not just comments/whitespace)
   * @param {string} code - Code to check
   * @returns {boolean}
   */
  isSignificantCode(code) {
    const withoutComments = code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*/g, '') // Remove line comments
      .trim();

    const significantLines = withoutComments
      .split('\n')
      .filter(line => line.trim().length > 0)
      .length;

    return significantLines >= this.config.minLines * 0.5; // At least 50% significant
  }

  /**
   * Normalize code for comparison (remove whitespace, comments)
   * @param {string} code - Code to normalize
   * @returns {string}
   */
  normalizeCode(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*/g, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Generate hash for code content
   * @param {string} content - Content to hash
   * @returns {string}
   */
  hashContent(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Find duplicate code blocks
   * @returns {DuplicateGroup[]}
   */
  findDuplicates() {
    const hashMap = new Map();

    // Group blocks by normalized hash
    for (const block of this.codeBlocks) {
      const hash = block.normalizedHash;
      if (!hashMap.has(hash)) {
        hashMap.set(hash, []);
      }
      hashMap.get(hash).push(block);
    }

    // Filter groups with enough duplicates
    const duplicateGroups = [];
    for (const [hash, blocks] of hashMap.entries()) {
      if (blocks.length >= this.config.threshold) {
        // Calculate severity based on duplication factor and size
        const lines = blocks[0].content.split('\n').length;
        const severity = blocks.length * lines;

        duplicateGroups.push({
          hash,
          instances: blocks.length,
          lines,
          locations: blocks,
          severity
        });
      }
    }

    // Sort by severity (most critical first)
    return duplicateGroups.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Generate audit report
   */
  generateReport() {
    if (this.config.outputFormat === 'json') {
      this.generateJSONReport();
    } else if (this.config.outputFormat === 'markdown') {
      this.generateMarkdownReport();
    } else {
      this.generateConsoleReport();
    }
  }

  /**
   * Generate console report
   */
  generateConsoleReport() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                  DUPLICATE CODE AUDIT REPORT              ');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (this.duplicates.length === 0) {
      console.log('✅ No significant duplicates found!\n');
      return;
    }

    console.log(`Found ${this.duplicates.length} duplicate groups\n`);

    // Calculate statistics
    const totalDuplicateLines = this.duplicates.reduce(
      (sum, dup) => sum + (dup.lines * (dup.instances - 1)),
      0
    );

    console.log('📊 Summary:');
    console.log(`   Total duplicate groups: ${this.duplicates.length}`);
    console.log(`   Total wasted lines: ${totalDuplicateLines}`);
    console.log(`   Files analyzed: ${this.files.length}`);
    console.log(`   Code blocks extracted: ${this.codeBlocks.length}\n`);

    // Show top duplicates
    console.log('🔴 Top Duplicate Groups (by severity):\n');

    this.duplicates.slice(0, 10).forEach((dup, index) => {
      console.log(`${index + 1}. Severity: ${dup.severity} | ${dup.instances} instances | ${dup.lines} lines`);
      console.log(`   Locations:`);
      dup.locations.forEach(loc => {
        console.log(`   - ${loc.file}:${loc.startLine}-${loc.endLine}`);
      });
      console.log();
    });

    // Recommendations
    console.log('💡 Recommendations:\n');
    this.generateRecommendations();
  }

  /**
   * Generate JSON report
   */
  generateJSONReport() {
    const report = {
      summary: {
        duplicateGroups: this.duplicates.length,
        filesAnalyzed: this.files.length,
        codeBlocksExtracted: this.codeBlocks.length,
        totalWastedLines: this.duplicates.reduce(
          (sum, dup) => sum + (dup.lines * (dup.instances - 1)),
          0
        )
      },
      duplicates: this.duplicates.map(dup => ({
        severity: dup.severity,
        instances: dup.instances,
        lines: dup.lines,
        locations: dup.locations.map(loc => ({
          file: loc.file,
          startLine: loc.startLine,
          endLine: loc.endLine
        }))
      })),
      timestamp: new Date().toISOString()
    };

    const outputPath = path.join('reports', 'duplicate-code-audit.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved to: ${outputPath}`);
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport() {
    const totalWastedLines = this.duplicates.reduce(
      (sum, dup) => sum + (dup.lines * (dup.instances - 1)),
      0
    );

    let markdown = '# Duplicate Code Audit Report\n\n';
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += '## Summary\n\n';
    markdown += `- **Duplicate Groups:** ${this.duplicates.length}\n`;
    markdown += `- **Files Analyzed:** ${this.files.length}\n`;
    markdown += `- **Total Wasted Lines:** ${totalWastedLines}\n\n`;

    markdown += '## Top Duplicates\n\n';

    this.duplicates.slice(0, 20).forEach((dup, index) => {
      markdown += `### ${index + 1}. Severity: ${dup.severity}\n\n`;
      markdown += `- **Instances:** ${dup.instances}\n`;
      markdown += `- **Lines:** ${dup.lines}\n`;
      markdown += `- **Locations:**\n`;
      dup.locations.forEach(loc => {
        markdown += `  - \`${loc.file}:${loc.startLine}-${loc.endLine}\`\n`;
      });
      markdown += '\n';
    });

    markdown += '## Recommendations\n\n';
    markdown += this.generateRecommendationsMarkdown();

    const outputPath = path.join('reports', 'duplicate-code-audit.md');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, markdown);
    console.log(`📄 Markdown report saved to: ${outputPath}`);
  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations() {
    const recommendations = [];

    // Analyze patterns in duplicates
    const fileGroups = new Map();
    this.duplicates.forEach(dup => {
      dup.locations.forEach(loc => {
        const dir = path.dirname(loc.file);
        if (!fileGroups.has(dir)) {
          fileGroups.set(dir, 0);
        }
        fileGroups.set(dir, fileGroups.get(dir) + 1);
      });
    });

    // Top directories with duplicates
    const topDirs = Array.from(fileGroups.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log('1. Focus refactoring efforts on these directories:');
    topDirs.forEach(([dir, count]) => {
      console.log(`   - ${dir} (${count} duplicates)`);
    });
    console.log();

    console.log('2. Common refactoring strategies:');
    console.log('   - Extract shared utility functions to core/utils/');
    console.log('   - Create base classes for common component patterns');
    console.log('   - Use mixins or composition for shared behaviors');
    console.log('   - Consider creating a shared primitives library');
    console.log();

    console.log('3. Next steps:');
    console.log('   - Review top 5 duplicate groups manually');
    console.log('   - Create refactoring tasks for high-severity duplicates');
    console.log('   - Set up pre-commit hooks to prevent new duplicates');
    console.log('   - Run this audit regularly (weekly recommended)');
    console.log();
  }

  /**
   * Generate recommendations in markdown format
   * @returns {string}
   */
  generateRecommendationsMarkdown() {
    let md = '';

    const fileGroups = new Map();
    this.duplicates.forEach(dup => {
      dup.locations.forEach(loc => {
        const dir = path.dirname(loc.file);
        if (!fileGroups.has(dir)) {
          fileGroups.set(dir, 0);
        }
        fileGroups.set(dir, fileGroups.get(dir) + 1);
      });
    });

    const topDirs = Array.from(fileGroups.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    md += '### Focus Areas\n\n';
    topDirs.forEach(([dir, count]) => {
      md += `- **${dir}** - ${count} duplicates\n`;
    });
    md += '\n';

    md += '### Refactoring Strategies\n\n';
    md += '1. Extract shared utility functions to `core/utils/`\n';
    md += '2. Create base classes for common component patterns\n';
    md += '3. Use mixins or composition for shared behaviors\n';
    md += '4. Consider creating a shared primitives library\n\n';

    md += '### Next Steps\n\n';
    md += '1. Review top 5 duplicate groups manually\n';
    md += '2. Create refactoring tasks for high-severity duplicates\n';
    md += '3. Set up pre-commit hooks to prevent new duplicates\n';
    md += '4. Run this audit regularly (weekly recommended)\n';

    return md;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};

  args.forEach(arg => {
    if (arg.startsWith('--threshold=')) {
      config.threshold = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--min-lines=')) {
      config.minLines = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--output=')) {
      config.outputFormat = arg.split('=')[1];
    }
  });

  const auditor = new DuplicateCodeAuditor(config);
  auditor.run('.').catch(error => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
}

module.exports = { DuplicateCodeAuditor };