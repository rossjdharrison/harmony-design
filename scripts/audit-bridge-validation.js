/**
 * @fileoverview Audit script to identify bridge validation anti-patterns
 * @module scripts/audit-bridge-validation
 * 
 * Scans Rust WASM bridge files for validation logic that should be moved
 * to bounded contexts.
 * 
 * Usage:
 *   node scripts/audit-bridge-validation.js
 * 
 * Related: docs/bridge-validation-antipattern.md
 */

const fs = require('fs');
const path = require('path');

/**
 * Anti-pattern indicators in bridge layer
 */
const VALIDATION_PATTERNS = [
  // Direct validation checks
  /if\s+.*\.(is_empty|len)\(\)/,
  /if\s+.*(<|>|<=|>=|==|!=)\s*\d+/,
  /if\s+!.*\.is_valid/,
  
  // Error returns with validation messages
  /return\s+Err\(.*".*must.*"\)/,
  /return\s+Err\(.*".*invalid.*"\)/i,
  /return\s+Err\(.*".*required.*"\)/i,
  
  // Explicit validation function calls
  /validate_.*\(/,
  /is_valid_.*\(/,
  /check_.*\(/,
];

/**
 * Allowed patterns (not anti-patterns)
 */
const ALLOWED_PATTERNS = [
  // Deserialization errors (OK)
  /serde_json::from_str/,
  /serde_json::to_string/,
  
  // Type conversion errors (OK)
  /\.parse\(\)/,
];

/**
 * Scans a Rust file for bridge validation anti-patterns
 * @param {string} filePath - Path to Rust file
 * @returns {Array<Object>} Array of findings
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];
  
  // Check if this is a bridge file
  const isBridge = content.includes('#[wasm_bindgen]') || 
                   filePath.includes('bridge') ||
                   filePath.includes('wasm');
  
  if (!isBridge) {
    return findings;
  }
  
  lines.forEach((line, index) => {
    // Skip if line contains allowed patterns
    if (ALLOWED_PATTERNS.some(pattern => pattern.test(line))) {
      return;
    }
    
    // Check for validation patterns
    VALIDATION_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        findings.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          pattern: pattern.toString(),
          severity: 'warning'
        });
      }
    });
  });
  
  return findings;
}

/**
 * Recursively finds all Rust files
 * @param {string} dir - Directory to search
 * @param {Array<string>} files - Accumulator for file paths
 * @returns {Array<string>} Array of file paths
 */
function findRustFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip target and node_modules
      if (entry.name !== 'target' && entry.name !== 'node_modules') {
        findRustFiles(fullPath, files);
      }
    } else if (entry.name.endsWith('.rs')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Main audit function
 */
function auditBridgeValidation() {
  console.log('🔍 Auditing for bridge validation anti-patterns...\n');
  
  const searchDirs = [
    'harmony-core',
    'harmony-schemas',
    'bounded-contexts',
    'src'
  ];
  
  let allFindings = [];
  
  for (const dir of searchDirs) {
    const rustFiles = findRustFiles(dir);
    
    for (const file of rustFiles) {
      const findings = scanFile(file);
      allFindings = allFindings.concat(findings);
    }
  }
  
  // Report findings
  if (allFindings.length === 0) {
    console.log('✅ No bridge validation anti-patterns found!\n');
    return;
  }
  
  console.log(`⚠️  Found ${allFindings.length} potential anti-patterns:\n`);
  
  // Group by file
  const byFile = {};
  allFindings.forEach(finding => {
    if (!byFile[finding.file]) {
      byFile[finding.file] = [];
    }
    byFile[finding.file].push(finding);
  });
  
  // Print report
  Object.entries(byFile).forEach(([file, findings]) => {
    console.log(`📄 ${file}`);
    findings.forEach(finding => {
      console.log(`   Line ${finding.line}: ${finding.code}`);
    });
    console.log('');
  });
  
  console.log('📖 See docs/bridge-validation-antipattern.md for migration guide\n');
}

// Run audit
auditBridgeValidation();