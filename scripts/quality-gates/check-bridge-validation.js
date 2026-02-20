/**
 * @fileoverview Quality gate to prevent bridge validation anti-pattern
 * @module scripts/quality-gates/check-bridge-validation
 * 
 * This quality gate fails the build if validation logic is detected in
 * WASM bridge files.
 * 
 * Exit codes:
 *   0 - Pass (no bridge validation found)
 *   1 - Fail (bridge validation detected)
 * 
 * Related: docs/bridge-validation-antipattern.md
 */

import fs from 'fs';
import path from 'path';

/**
 * High-confidence validation patterns (definitely anti-patterns)
 */
const FORBIDDEN_PATTERNS = [
  {
    pattern: /if\s+.*\.is_empty\(\)\s*{[\s\S]*?return\s+Err/,
    message: 'Empty check with error return in bridge',
    confidence: 'high'
  },
  {
    pattern: /if\s+.*\.len\(\)\s*[<>=]=?\s*\d+\s*{[\s\S]*?return\s+Err/,
    message: 'Length validation in bridge',
    confidence: 'high'
  },
  {
    pattern: /fn\s+validate_[a-z_]+\s*\([^)]*\)\s*->\s*Result/,
    message: 'Validation function in bridge file',
    confidence: 'high'
  },
  {
    pattern: /return\s+Err\([^)]*"[^"]*(?:must|invalid|required|cannot)[^"]*"\)/i,
    message: 'Validation error message in bridge',
    confidence: 'medium'
  }
];

/**
 * Safe patterns (not anti-patterns)
 */
const SAFE_PATTERNS = [
  /serde_json::from_str/,  // Deserialization
  /serde_json::to_string/, // Serialization
  /JsValue::from/,         // Type conversion
];

/**
 * Checks if a line is part of a safe operation
 * @param {string} line - Code line to check
 * @returns {boolean} True if safe
 */
function isSafeLine(line) {
  return SAFE_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Scans a file for bridge validation anti-patterns
 * @param {string} filePath - Path to file
 * @returns {Array<Object>} Violations found
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  // Only check files that are likely bridge files
  const isBridge = content.includes('#[wasm_bindgen]') ||
                   filePath.includes('bridge') ||
                   filePath.includes('wasm_');
  
  if (!isBridge) {
    return violations;
  }
  
  // Check each forbidden pattern
  FORBIDDEN_PATTERNS.forEach(({ pattern, message, confidence }) => {
    const matches = content.match(pattern);
    
    if (matches) {
      // Find line number
      const lines = content.split('\n');
      const matchLine = lines.findIndex(line => 
        pattern.test(line) && !isSafeLine(line)
      );
      
      if (matchLine !== -1) {
        violations.push({
          file: filePath,
          line: matchLine + 1,
          message,
          confidence,
          code: lines[matchLine].trim()
        });
      }
    }
  });
  
  return violations;
}

/**
 * Recursively finds Rust files
 * @param {string} dir - Directory to search
 * @returns {Array<string>} File paths
 */
function findRustFiles(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && entry.name !== 'target' && entry.name !== 'node_modules') {
      files.push(...findRustFiles(fullPath));
    } else if (entry.name.endsWith('.rs')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Main quality gate check
 */
function checkBridgeValidation() {
  console.log('🔍 Quality Gate: Bridge Validation Check\n');
  
  const searchDirs = [
    'harmony-core',
    'harmony-schemas', 
    'bounded-contexts',
    'src'
  ];
  
  let allViolations = [];
  
  for (const dir of searchDirs) {
    const files = findRustFiles(dir);
    
    for (const file of files) {
      const violations = scanFile(file);
      allViolations = allViolations.concat(violations);
    }
  }
  
  // Report results
  if (allViolations.length === 0) {
    console.log('✅ PASS: No bridge validation anti-patterns detected\n');
    process.exit(0);
  }
  
  console.error('❌ FAIL: Bridge validation anti-patterns detected\n');
  
  // Group by confidence
  const highConfidence = allViolations.filter(v => v.confidence === 'high');
  const mediumConfidence = allViolations.filter(v => v.confidence === 'medium');
  
  if (highConfidence.length > 0) {
    console.error('🚨 High Confidence Violations:\n');
    highConfidence.forEach(v => {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`  ${v.message}`);
      console.error(`  ${v.code}\n`);
    });
  }
  
  if (mediumConfidence.length > 0) {
    console.error('⚠️  Medium Confidence Violations:\n');
    mediumConfidence.forEach(v => {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`  ${v.message}`);
      console.error(`  ${v.code}\n`);
    });
  }
  
  console.error('📖 Migration Guide: docs/bridge-validation-antipattern.md');
  console.error('🔧 Move validation to bounded contexts or UI components\n');
  
  process.exit(1);
}

// Run check
checkBridgeValidation();