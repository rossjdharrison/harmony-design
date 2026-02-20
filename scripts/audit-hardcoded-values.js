/**
 * @fileoverview Hardcode Audit Tool
 * Identifies hardcoded values across the codebase that should be tokenized or configurable.
 * 
 * Scans for:
 * - Magic numbers (dimensions, durations, opacities, etc.)
 * - Color values (hex, rgb, hsl)
 * - Font sizes and families
 * - Z-index values
 * - Timing values
 * - URLs and endpoints
 * - String literals that should be i18n
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#hardcode-audit
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

/**
 * Hardcode patterns to detect
 */
const PATTERNS = {
  // Color values
  hexColors: {
    regex: /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g,
    description: 'Hex color values',
    severity: 'high',
    suggestion: 'Use design tokens from tokens/ directory'
  },
  rgbColors: {
    regex: /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,
    description: 'RGB color values',
    severity: 'high',
    suggestion: 'Use design tokens from tokens/ directory'
  },
  rgbaColors: {
    regex: /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g,
    description: 'RGBA color values',
    severity: 'high',
    suggestion: 'Use design tokens from tokens/ directory'
  },
  hslColors: {
    regex: /hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)/g,
    description: 'HSL color values',
    severity: 'high',
    suggestion: 'Use design tokens from tokens/ directory'
  },
  
  // Dimensions
  pxValues: {
    regex: /\b\d+px\b/g,
    description: 'Pixel values',
    severity: 'medium',
    suggestion: 'Use spacing tokens or CSS variables'
  },
  remValues: {
    regex: /\b\d+\.?\d*rem\b/g,
    description: 'REM values',
    severity: 'low',
    suggestion: 'Verify against spacing scale'
  },
  
  // Font properties
  fontSizes: {
    regex: /font-size:\s*\d+\.?\d*(px|rem|em)/g,
    description: 'Font size values',
    severity: 'high',
    suggestion: 'Use typography tokens'
  },
  fontWeights: {
    regex: /font-weight:\s*\d{3}/g,
    description: 'Font weight values',
    severity: 'medium',
    suggestion: 'Use typography tokens'
  },
  fontFamilies: {
    regex: /font-family:\s*['"][^'"]+['"]/g,
    description: 'Font family declarations',
    severity: 'medium',
    suggestion: 'Use typography tokens'
  },
  
  // Timing and animation
  transitionDurations: {
    regex: /transition(-duration)?:\s*\d+\.?\d*(ms|s)/g,
    description: 'Transition duration values',
    severity: 'medium',
    suggestion: 'Use animation tokens'
  },
  animationDurations: {
    regex: /animation(-duration)?:\s*\d+\.?\d*(ms|s)/g,
    description: 'Animation duration values',
    severity: 'medium',
    suggestion: 'Use animation tokens'
  },
  timeoutDelays: {
    regex: /setTimeout\([^,]+,\s*\d+\)/g,
    description: 'setTimeout with hardcoded delay',
    severity: 'low',
    suggestion: 'Consider using named constants'
  },
  
  // Z-index
  zIndexValues: {
    regex: /z-index:\s*\d+/g,
    description: 'Z-index values',
    severity: 'high',
    suggestion: 'Use z-index scale from design tokens'
  },
  
  // Opacity
  opacityValues: {
    regex: /opacity:\s*0?\.\d+/g,
    description: 'Opacity values',
    severity: 'medium',
    suggestion: 'Use opacity tokens'
  },
  
  // URLs and endpoints
  httpUrls: {
    regex: /['"]https?:\/\/[^'"]+['"]/g,
    description: 'HTTP/HTTPS URLs',
    severity: 'high',
    suggestion: 'Move to configuration file'
  },
  apiEndpoints: {
    regex: /\/api\/[a-z-/]+/g,
    description: 'API endpoint paths',
    severity: 'medium',
    suggestion: 'Move to API configuration'
  },
  
  // Magic numbers in JavaScript
  magicNumbers: {
    regex: /(?<![\d.])\b\d{2,}\b(?![\d.])/g,
    description: 'Potential magic numbers',
    severity: 'low',
    suggestion: 'Consider using named constants'
  },
  
  // Border radius
  borderRadius: {
    regex: /border-radius:\s*\d+\.?\d*(px|rem|em)/g,
    description: 'Border radius values',
    severity: 'medium',
    suggestion: 'Use border-radius tokens'
  },
  
  // Box shadows
  boxShadows: {
    regex: /box-shadow:\s*[^;]+/g,
    description: 'Box shadow declarations',
    severity: 'medium',
    suggestion: 'Use elevation tokens'
  }
};

/**
 * File extensions to scan
 */
const SCAN_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.vue', '.svelte'];

/**
 * Directories to exclude from scanning
 */
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  'reports',
  'docs-backup-20260215-110945'
];

/**
 * Files to exclude from scanning
 */
const EXCLUDE_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.min.js',
  '.bundle.js'
];

/**
 * Recursively scan directory for files
 * @param {string} dir - Directory to scan
 * @param {string[]} fileList - Accumulated file list
 * @returns {string[]} List of file paths
 */
function scanDirectory(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        scanDirectory(filePath, fileList);
      }
    } else {
      const ext = extname(file);
      const shouldExclude = EXCLUDE_FILES.some(pattern => file.includes(pattern));
      
      if (SCAN_EXTENSIONS.includes(ext) && !shouldExclude) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

/**
 * Scan a file for hardcoded values
 * @param {string} filePath - Path to file
 * @returns {Object} Findings for this file
 */
function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const findings = [];
  
  for (const [patternName, pattern] of Object.entries(PATTERNS)) {
    const matches = content.matchAll(pattern.regex);
    
    for (const match of matches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const line = content.split('\n')[lineNumber - 1];
      
      findings.push({
        pattern: patternName,
        value: match[0],
        line: lineNumber,
        lineContent: line.trim(),
        description: pattern.description,
        severity: pattern.severity,
        suggestion: pattern.suggestion
      });
    }
  }
  
  return {
    file: filePath,
    findings
  };
}

/**
 * Generate audit report
 * @param {Object[]} results - Scan results
 * @returns {string} Formatted report
 */
function generateReport(results) {
  const timestamp = new Date().toISOString();
  let report = `# Hardcode Audit Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `## Summary\n\n`;
  
  // Calculate statistics
  const totalFiles = results.length;
  const filesWithFindings = results.filter(r => r.findings.length > 0).length;
  const totalFindings = results.reduce((sum, r) => sum + r.findings.length, 0);
  
  const severityCounts = {
    high: 0,
    medium: 0,
    low: 0
  };
  
  const patternCounts = {};
  
  for (const result of results) {
    for (const finding of result.findings) {
      severityCounts[finding.severity]++;
      patternCounts[finding.pattern] = (patternCounts[finding.pattern] || 0) + 1;
    }
  }
  
  report += `- **Total Files Scanned:** ${totalFiles}\n`;
  report += `- **Files with Findings:** ${filesWithFindings}\n`;
  report += `- **Total Findings:** ${totalFindings}\n\n`;
  
  report += `### By Severity\n\n`;
  report += `- 🔴 **High:** ${severityCounts.high}\n`;
  report += `- 🟡 **Medium:** ${severityCounts.medium}\n`;
  report += `- 🟢 **Low:** ${severityCounts.low}\n\n`;
  
  report += `### By Pattern Type\n\n`;
  const sortedPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [pattern, count] of sortedPatterns) {
    report += `- **${pattern}:** ${count}\n`;
  }
  
  report += `\n## Detailed Findings\n\n`;
  
  // Group by severity
  const bySeverity = {
    high: [],
    medium: [],
    low: []
  };
  
  for (const result of results) {
    if (result.findings.length === 0) continue;
    
    for (const finding of result.findings) {
      bySeverity[finding.severity].push({
        ...finding,
        file: result.file
      });
    }
  }
  
  // Report high severity first
  for (const severity of ['high', 'medium', 'low']) {
    if (bySeverity[severity].length === 0) continue;
    
    const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
    report += `### ${icon} ${severity.toUpperCase()} Severity\n\n`;
    
    // Group by pattern
    const byPattern = {};
    for (const finding of bySeverity[severity]) {
      if (!byPattern[finding.pattern]) {
        byPattern[finding.pattern] = [];
      }
      byPattern[finding.pattern].push(finding);
    }
    
    for (const [pattern, findings] of Object.entries(byPattern)) {
      const patternInfo = PATTERNS[pattern];
      report += `#### ${patternInfo.description}\n\n`;
      report += `**Suggestion:** ${patternInfo.suggestion}\n\n`;
      report += `**Occurrences:** ${findings.length}\n\n`;
      
      // Show first 10 examples
      const examples = findings.slice(0, 10);
      for (const finding of examples) {
        report += `- \`${relative('.', finding.file)}\`:${finding.line}\n`;
        report += `  \`\`\`\n  ${finding.lineContent}\n  \`\`\`\n`;
      }
      
      if (findings.length > 10) {
        report += `\n*...and ${findings.length - 10} more occurrences*\n`;
      }
      
      report += `\n`;
    }
  }
  
  report += `## Recommendations\n\n`;
  report += `1. **High Priority**: Address high-severity findings first, especially colors and z-index values\n`;
  report += `2. **Create Tokens**: Establish design tokens for commonly used values\n`;
  report += `3. **Configuration**: Move URLs and API endpoints to configuration files\n`;
  report += `4. **Constants**: Replace magic numbers with named constants\n`;
  report += `5. **Documentation**: Update DESIGN_SYSTEM.md with token usage guidelines\n\n`;
  
  report += `## Next Steps\n\n`;
  report += `1. Review high-severity findings and create token migration plan\n`;
  report += `2. Establish design token structure if not already present\n`;
  report += `3. Create codemods to automate token migration where possible\n`;
  report += `4. Update component guidelines to prevent new hardcoded values\n`;
  
  return report;
}

/**
 * Generate JSON report for programmatic consumption
 * @param {Object[]} results - Scan results
 * @returns {Object} Structured report data
 */
function generateJsonReport(results) {
  const timestamp = new Date().toISOString();
  
  const summary = {
    timestamp,
    totalFiles: results.length,
    filesWithFindings: results.filter(r => r.findings.length > 0).length,
    totalFindings: results.reduce((sum, r) => sum + r.findings.length, 0),
    bySeverity: { high: 0, medium: 0, low: 0 },
    byPattern: {}
  };
  
  for (const result of results) {
    for (const finding of result.findings) {
      summary.bySeverity[finding.severity]++;
      summary.byPattern[finding.pattern] = (summary.byPattern[finding.pattern] || 0) + 1;
    }
  }
  
  return {
    summary,
    patterns: PATTERNS,
    results: results.filter(r => r.findings.length > 0)
  };
}

/**
 * Main audit function
 */
function runAudit() {
  console.log('🔍 Starting hardcode audit...\n');
  
  const startTime = Date.now();
  const files = scanDirectory('.');
  
  console.log(`📁 Found ${files.length} files to scan\n`);
  
  const results = [];
  let processed = 0;
  
  for (const file of files) {
    const result = scanFile(file);
    results.push(result);
    processed++;
    
    if (processed % 100 === 0) {
      console.log(`   Processed ${processed}/${files.length} files...`);
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n✅ Scan complete in ${duration}s\n`);
  
  // Generate reports
  const markdownReport = generateReport(results);
  const jsonReport = generateJsonReport(results);
  
  // Write reports
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportDir = 'reports/audits';
  
  writeFileSync(
    join(reportDir, `hardcode-audit-${timestamp}.md`),
    markdownReport
  );
  
  writeFileSync(
    join(reportDir, `hardcode-audit-${timestamp}.json`),
    JSON.stringify(jsonReport, null, 2)
  );
  
  writeFileSync(
    join(reportDir, 'hardcode-audit-latest.md'),
    markdownReport
  );
  
  writeFileSync(
    join(reportDir, 'hardcode-audit-latest.json'),
    JSON.stringify(jsonReport, null, 2)
  );
  
  console.log(`📊 Reports generated:`);
  console.log(`   - ${reportDir}/hardcode-audit-${timestamp}.md`);
  console.log(`   - ${reportDir}/hardcode-audit-${timestamp}.json`);
  console.log(`   - ${reportDir}/hardcode-audit-latest.md`);
  console.log(`   - ${reportDir}/hardcode-audit-latest.json\n`);
  
  // Print summary
  console.log('📈 Summary:');
  console.log(`   Total Findings: ${jsonReport.summary.totalFindings}`);
  console.log(`   🔴 High: ${jsonReport.summary.bySeverity.high}`);
  console.log(`   🟡 Medium: ${jsonReport.summary.bySeverity.medium}`);
  console.log(`   🟢 Low: ${jsonReport.summary.bySeverity.low}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAudit();
}

export { runAudit, scanDirectory, scanFile, PATTERNS };