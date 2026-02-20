/**
 * @fileoverview Convert hardcode audit JSON to CSV format
 * Useful for analysis in spreadsheet applications
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#hardcode-audit
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Convert JSON report to CSV
 * @param {Object} jsonReport - JSON report data
 * @returns {string} CSV content
 */
function jsonToCsv(jsonReport) {
  const rows = [];
  
  // Header
  rows.push([
    'File',
    'Line',
    'Pattern',
    'Description',
    'Severity',
    'Value',
    'Line Content',
    'Suggestion'
  ].join(','));
  
  // Data rows
  for (const result of jsonReport.results) {
    for (const finding of result.findings) {
      rows.push([
        `"${result.file}"`,
        finding.line,
        finding.pattern,
        `"${finding.description}"`,
        finding.severity,
        `"${finding.value.replace(/"/g, '""')}"`,
        `"${finding.lineContent.replace(/"/g, '""')}"`,
        `"${finding.suggestion}"`
      ].join(','));
    }
  }
  
  return rows.join('\n');
}

/**
 * Main conversion function
 */
function convertToCSV() {
  const jsonPath = 'reports/audits/hardcode-audit-latest.json';
  const csvPath = 'reports/audits/hardcode-audit-latest.csv';
  
  console.log('📊 Converting JSON report to CSV...\n');
  
  const jsonReport = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  const csv = jsonToCsv(jsonReport);
  
  writeFileSync(csvPath, csv);
  
  console.log(`✅ CSV report generated: ${csvPath}\n`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  convertToCSV();
}

export { jsonToCsv, convertToCSV };