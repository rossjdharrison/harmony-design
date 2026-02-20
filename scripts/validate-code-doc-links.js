/**
 * @fileoverview Validates code-to-doc reference pattern compliance
 * @see {@link file://./DESIGN_SYSTEM.md#documentation Documentation Standards}
 * @module scripts/validate-code-doc-links
 * 
 * Checks:
 * 1. All JS files have @fileoverview
 * 2. All JS files have at least one @see link to DESIGN_SYSTEM.md
 * 3. All @see anchors exist in DESIGN_SYSTEM.md
 * 4. All referenced code files in DESIGN_SYSTEM.md exist
 */

import { readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';

const DESIGN_SYSTEM_PATH = 'DESIGN_SYSTEM.md';
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.storybook/**',
  'coverage/**',
  'reports/**'
];

/**
 * Extracts @see links from file content
 * @param {string} content - File content
 * @returns {Array<{anchor: string, text: string}>}
 */
function extractSeeLinks(content) {
  const seeRegex = /@see\s+{@link\s+file:\/\/\.\/DESIGN_SYSTEM\.md#([\w-]+)\s+([^}]+)}/g;
  const links = [];
  let match;
  
  while ((match = seeRegex.exec(content)) !== null) {
    links.push({
      anchor: match[1],
      text: match[2]
    });
  }
  
  return links;
}

/**
 * Extracts anchors from DESIGN_SYSTEM.md
 * @param {string} content - Markdown content
 * @returns {Set<string>}
 */
function extractAnchors(content) {
  const anchors = new Set();
  
  // Explicit anchors: {#anchor-name}
  const explicitRegex = /\{#([\w-]+)\}/g;
  let match;
  while ((match = explicitRegex.exec(content)) !== null) {
    anchors.add(match[1]);
  }
  
  // Auto-generated anchors from headers
  const headerRegex = /^#+\s+(.+?)(?:\s+\{#[\w-]+\})?$/gm;
  while ((match = headerRegex.exec(content)) !== null) {
    const header = match[1].trim();
    const autoAnchor = header
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    anchors.add(autoAnchor);
  }
  
  return anchors;
}

/**
 * Extracts code file references from DESIGN_SYSTEM.md
 * @param {string} content - Markdown content
 * @returns {Array<string>}
 */
function extractCodeReferences(content) {
  const references = [];
  const linkRegex = /\[`([^`]+)`\]\(\.\/([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    references.push(match[2]);
  }
  
  return references;
}

/**
 * Validates a single JavaScript file
 * @param {string} filePath - Path to JS file
 * @param {Set<string>} validAnchors - Valid anchors from DESIGN_SYSTEM.md
 * @returns {Object} Validation result
 */
function validateFile(filePath, validAnchors) {
  const content = readFileSync(filePath, 'utf-8');
  const issues = [];
  
  // Check for @fileoverview
  if (!content.includes('@fileoverview')) {
    issues.push('Missing @fileoverview');
  }
  
  // Extract and validate @see links
  const seeLinks = extractSeeLinks(content);
  
  if (seeLinks.length === 0) {
    issues.push('Missing @see link to DESIGN_SYSTEM.md');
  }
  
  for (const link of seeLinks) {
    if (!validAnchors.has(link.anchor)) {
      issues.push(`Invalid anchor: #${link.anchor}`);
    }
  }
  
  return {
    path: filePath,
    valid: issues.length === 0,
    issues,
    linkCount: seeLinks.length
  };
}

/**
 * Main validation function
 */
async function validate() {
  console.log('🔍 Validating code-to-doc reference pattern...\n');
  
  // Load DESIGN_SYSTEM.md
  if (!existsSync(DESIGN_SYSTEM_PATH)) {
    console.error('❌ DESIGN_SYSTEM.md not found!');
    process.exit(1);
  }
  
  const designSystemContent = readFileSync(DESIGN_SYSTEM_PATH, 'utf-8');
  const validAnchors = extractAnchors(designSystemContent);
  
  console.log(`📖 Found ${validAnchors.size} valid anchors in DESIGN_SYSTEM.md\n`);
  
  // Find all JavaScript files
  const jsFiles = await glob('**/*.js', {
    ignore: EXCLUDE_PATTERNS
  });
  
  console.log(`📁 Found ${jsFiles.length} JavaScript files to validate\n`);
  
  // Validate each file
  const results = jsFiles.map(file => validateFile(file, validAnchors));
  
  // Report results
  const validFiles = results.filter(r => r.valid);
  const invalidFiles = results.filter(r => !r.valid);
  
  console.log(`✅ Valid files: ${validFiles.length}`);
  console.log(`❌ Invalid files: ${invalidFiles.length}\n`);
  
  if (invalidFiles.length > 0) {
    console.log('Issues found:\n');
    for (const result of invalidFiles) {
      console.log(`📄 ${result.path}`);
      for (const issue of result.issues) {
        console.log(`   - ${issue}`);
      }
      console.log('');
    }
  }
  
  // Validate reverse references (doc → code)
  console.log('🔗 Validating reverse references (doc → code)...\n');
  const codeReferences = extractCodeReferences(designSystemContent);
  const missingFiles = codeReferences.filter(ref => !existsSync(ref));
  
  if (missingFiles.length > 0) {
    console.log('❌ Referenced files not found:');
    for (const file of missingFiles) {
      console.log(`   - ${file}`);
    }
    console.log('');
  } else {
    console.log('✅ All referenced files exist\n');
  }
  
  // Summary
  const totalIssues = invalidFiles.length + missingFiles.length;
  
  if (totalIssues === 0) {
    console.log('🎉 All validations passed!');
    process.exit(0);
  } else {
    console.log(`⚠️  Found ${totalIssues} total issues`);
    process.exit(1);
  }
}

// Run validation
validate().catch(err => {
  console.error('Error during validation:', err);
  process.exit(1);
});