/**
 * @fileoverview License Checker - Ensures all dependencies have approved licenses
 * @module security/license-checker
 * 
 * This module verifies that all npm dependencies (both production and dev)
 * use licenses that are approved for the Harmony Design System.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Security & Compliance
 */

/**
 * List of approved open-source licenses for Harmony Design System
 * @const {string[]}
 */
const APPROVED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense',
  '0BSD',
  'BlueOak-1.0.0',
  'Python-2.0', // For Python dev tools
];

/**
 * Licenses that require additional review or have restrictions
 * @const {string[]}
 */
const REVIEW_REQUIRED_LICENSES = [
  'GPL-2.0',
  'GPL-3.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'AGPL-3.0',
  'MPL-2.0',
  'EPL-1.0',
  'EPL-2.0',
  'CDDL-1.0',
  'CDDL-1.1',
];

/**
 * Licenses that are explicitly prohibited
 * @const {string[]}
 */
const PROHIBITED_LICENSES = [
  'UNLICENSED',
  'PROPRIETARY',
  'COMMERCIAL',
];

/**
 * Known exceptions - packages that have special license considerations
 * @const {Object.<string, string>}
 */
const LICENSE_EXCEPTIONS = {
  // Example: 'package-name': 'Reason for exception'
};

/**
 * Represents a dependency's license information
 * @typedef {Object} DependencyLicense
 * @property {string} name - Package name
 * @property {string} version - Package version
 * @property {string|string[]} license - License identifier(s)
 * @property {string} path - Path to package
 * @property {boolean} isDev - Whether this is a dev dependency
 */

/**
 * License check result
 * @typedef {Object} LicenseCheckResult
 * @property {boolean} passed - Whether all licenses are approved
 * @property {DependencyLicense[]} approved - Dependencies with approved licenses
 * @property {DependencyLicense[]} needsReview - Dependencies needing review
 * @property {DependencyLicense[]} prohibited - Dependencies with prohibited licenses
 * @property {DependencyLicense[]} unknown - Dependencies with unknown/missing licenses
 * @property {string[]} errors - Error messages encountered
 */

/**
 * Normalizes license identifiers to standard SPDX format
 * @param {string|Object|string[]} license - Raw license data from package.json
 * @returns {string[]} Normalized license identifiers
 */
function normalizeLicense(license) {
  if (!license) {
    return ['UNKNOWN'];
  }

  // Handle string format
  if (typeof license === 'string') {
    // Remove common prefixes and clean up
    const cleaned = license
      .replace(/^SEE LICENSE IN .*$/i, 'CUSTOM')
      .replace(/\(|\)/g, '')
      .trim();
    
    // Handle OR/AND expressions
    if (cleaned.includes(' OR ')) {
      return cleaned.split(' OR ').map(l => l.trim());
    }
    if (cleaned.includes(' AND ')) {
      return cleaned.split(' AND ').map(l => l.trim());
    }
    
    return [cleaned];
  }

  // Handle object format { type: "MIT", url: "..." }
  if (typeof license === 'object' && license.type) {
    return normalizeLicense(license.type);
  }

  // Handle array format
  if (Array.isArray(license)) {
    return license.flatMap(l => normalizeLicense(l));
  }

  return ['UNKNOWN'];
}

/**
 * Categorizes a license into approved/review/prohibited/unknown
 * @param {string} license - License identifier
 * @returns {'approved'|'review'|'prohibited'|'unknown'} Category
 */
function categorizeLicense(license) {
  const normalized = license.toUpperCase();

  if (APPROVED_LICENSES.some(approved => normalized.includes(approved.toUpperCase()))) {
    return 'approved';
  }

  if (REVIEW_REQUIRED_LICENSES.some(review => normalized.includes(review.toUpperCase()))) {
    return 'review';
  }

  if (PROHIBITED_LICENSES.some(prohibited => normalized.includes(prohibited.toUpperCase()))) {
    return 'prohibited';
  }

  if (normalized === 'UNKNOWN' || normalized === 'CUSTOM') {
    return 'unknown';
  }

  return 'unknown';
}

/**
 * Reads package.json and extracts dependency information
 * @param {string} packageJsonPath - Path to package.json
 * @returns {Promise<Object>} Package.json contents
 */
async function readPackageJson(packageJsonPath) {
  const fs = await import('fs/promises');
  const content = await fs.readFile(packageJsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Resolves the actual installed package information from node_modules
 * @param {string} packageName - Name of the package
 * @param {string} nodeModulesPath - Path to node_modules directory
 * @returns {Promise<Object|null>} Package info or null if not found
 */
async function resolvePackageInfo(packageName, nodeModulesPath) {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  try {
    // Handle scoped packages
    const packagePath = path.join(nodeModulesPath, packageName, 'package.json');
    const content = await fs.readFile(packagePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

/**
 * Checks licenses for all dependencies in package.json
 * @param {string} projectRoot - Root directory of the project
 * @returns {Promise<LicenseCheckResult>} License check results
 */
async function checkLicenses(projectRoot = '.') {
  const path = await import('path');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const nodeModulesPath = path.join(projectRoot, 'node_modules');

  const result = {
    passed: false,
    approved: [],
    needsReview: [],
    prohibited: [],
    unknown: [],
    errors: [],
  };

  try {
    const packageJson = await readPackageJson(packageJsonPath);
    
    // Combine dependencies and devDependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const devDepNames = new Set(Object.keys(packageJson.devDependencies || {}));

    // Check each dependency
    for (const [name, version] of Object.entries(allDeps)) {
      try {
        const pkgInfo = await resolvePackageInfo(name, nodeModulesPath);
        
        if (!pkgInfo) {
          result.errors.push(`Could not find package info for ${name}`);
          continue;
        }

        const licenses = normalizeLicense(pkgInfo.license);
        const isDev = devDepNames.has(name);

        const depLicense = {
          name,
          version: pkgInfo.version || version,
          license: licenses.length === 1 ? licenses[0] : licenses,
          path: path.join(nodeModulesPath, name),
          isDev,
        };

        // Check if there's an exception
        if (LICENSE_EXCEPTIONS[name]) {
          depLicense.exception = LICENSE_EXCEPTIONS[name];
          result.approved.push(depLicense);
          continue;
        }

        // Categorize based on all licenses (for OR expressions, any approved is OK)
        const categories = licenses.map(l => categorizeLicense(l));
        
        if (categories.includes('prohibited')) {
          result.prohibited.push(depLicense);
        } else if (categories.includes('review')) {
          result.needsReview.push(depLicense);
        } else if (categories.includes('unknown')) {
          result.unknown.push(depLicense);
        } else if (categories.every(c => c === 'approved')) {
          result.approved.push(depLicense);
        } else {
          result.unknown.push(depLicense);
        }
      } catch (err) {
        result.errors.push(`Error checking ${name}: ${err.message}`);
      }
    }

    // Determine if check passed
    result.passed = 
      result.prohibited.length === 0 && 
      result.unknown.length === 0 &&
      result.errors.length === 0;

  } catch (err) {
    result.errors.push(`Fatal error: ${err.message}`);
  }

  return result;
}

/**
 * Formats license check results as a human-readable report
 * @param {LicenseCheckResult} result - Check results
 * @returns {string} Formatted report
 */
function formatReport(result) {
  const lines = [];
  
  lines.push('╔═══════════════════════════════════════════════════════════╗');
  lines.push('║         LICENSE CHECKER - DEPENDENCY REPORT              ║');
  lines.push('╚═══════════════════════════════════════════════════════════╝');
  lines.push('');

  // Summary
  lines.push(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push(`Total Dependencies: ${result.approved.length + result.needsReview.length + result.prohibited.length + result.unknown.length}`);
  lines.push(`  ✅ Approved: ${result.approved.length}`);
  lines.push(`  ⚠️  Needs Review: ${result.needsReview.length}`);
  lines.push(`  ❌ Prohibited: ${result.prohibited.length}`);
  lines.push(`  ❓ Unknown: ${result.unknown.length}`);
  lines.push('');

  // Prohibited licenses (critical)
  if (result.prohibited.length > 0) {
    lines.push('❌ PROHIBITED LICENSES:');
    lines.push('─'.repeat(60));
    for (const dep of result.prohibited) {
      const licenseStr = Array.isArray(dep.license) ? dep.license.join(' OR ') : dep.license;
      lines.push(`  ${dep.name}@${dep.version}`);
      lines.push(`    License: ${licenseStr}`);
      lines.push(`    Type: ${dep.isDev ? 'devDependency' : 'dependency'}`);
      lines.push('');
    }
  }

  // Unknown licenses
  if (result.unknown.length > 0) {
    lines.push('❓ UNKNOWN/UNLICENSED:');
    lines.push('─'.repeat(60));
    for (const dep of result.unknown) {
      const licenseStr = Array.isArray(dep.license) ? dep.license.join(' OR ') : dep.license;
      lines.push(`  ${dep.name}@${dep.version}`);
      lines.push(`    License: ${licenseStr}`);
      lines.push(`    Type: ${dep.isDev ? 'devDependency' : 'dependency'}`);
      lines.push('');
    }
  }

  // Needs review
  if (result.needsReview.length > 0) {
    lines.push('⚠️  NEEDS REVIEW:');
    lines.push('─'.repeat(60));
    for (const dep of result.needsReview) {
      const licenseStr = Array.isArray(dep.license) ? dep.license.join(' OR ') : dep.license;
      lines.push(`  ${dep.name}@${dep.version}`);
      lines.push(`    License: ${licenseStr}`);
      lines.push(`    Type: ${dep.isDev ? 'devDependency' : 'dependency'}`);
      lines.push('');
    }
  }

  // Errors
  if (result.errors.length > 0) {
    lines.push('⚠️  ERRORS:');
    lines.push('─'.repeat(60));
    for (const error of result.errors) {
      lines.push(`  ${error}`);
    }
    lines.push('');
  }

  // Approved summary (only counts, not full list)
  if (result.approved.length > 0) {
    lines.push(`✅ ${result.approved.length} dependencies have approved licenses`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exports license data to JSON format
 * @param {LicenseCheckResult} result - Check results
 * @param {string} outputPath - Path to write JSON file
 * @returns {Promise<void>}
 */
async function exportToJson(result, outputPath) {
  const fs = await import('fs/promises');
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf-8');
}

// Export for use as module
export {
  checkLicenses,
  formatReport,
  exportToJson,
  APPROVED_LICENSES,
  REVIEW_REQUIRED_LICENSES,
  PROHIBITED_LICENSES,
};

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectRoot = process.argv[2] || '.';
  
  checkLicenses(projectRoot)
    .then(result => {
      console.log(formatReport(result));
      
      // Export JSON if requested
      if (process.argv.includes('--json')) {
        const jsonPath = process.argv[process.argv.indexOf('--json') + 1] || 'license-report.json';
        return exportToJson(result, jsonPath).then(() => {
          console.log(`\n📄 JSON report saved to: ${jsonPath}`);
          return result;
        });
      }
      
      return result;
    })
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}