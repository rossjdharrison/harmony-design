/**
 * @fileoverview axe-core setup and configuration for accessibility testing
 * @module tests/accessibility/axe-setup
 * 
 * Configures axe-core for automated accessibility testing across all components.
 * See DESIGN_SYSTEM.md § Accessibility Testing for usage patterns.
 */

/**
 * Default axe-core configuration for Harmony Design System
 * @type {Object}
 */
export const axeConfig = {
  rules: {
    // WCAG 2.1 Level AA compliance
    'color-contrast': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'duplicate-id': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'html-has-lang': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'meta-viewport': { enabled: true },
    'region': { enabled: true },
    'tabindex': { enabled: true },
    'valid-lang': { enabled: true }
  }
};

/**
 * Loads axe-core library from CDN
 * @returns {Promise<void>}
 */
export async function loadAxeCore() {
  if (window.axe) {
    return; // Already loaded
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load axe-core'));
    document.head.appendChild(script);
  });
}

/**
 * Runs axe-core accessibility tests on a given element
 * @param {HTMLElement} element - Element to test
 * @param {Object} [options={}] - Additional axe options
 * @returns {Promise<Object>} Test results
 */
export async function runAxeTests(element, options = {}) {
  if (!window.axe) {
    await loadAxeCore();
  }

  const config = {
    ...axeConfig,
    ...options
  };

  try {
    const results = await window.axe.run(element, config);
    return results;
  } catch (error) {
    console.error('axe-core test failed:', error);
    throw error;
  }
}

/**
 * Formats axe-core results for readable output
 * @param {Object} results - axe-core results object
 * @returns {string} Formatted results
 */
export function formatAxeResults(results) {
  const { violations, passes, incomplete } = results;
  
  let output = '\n=== Accessibility Test Results ===\n\n';
  
  output += `✓ Passed: ${passes.length} rules\n`;
  output += `✗ Violations: ${violations.length} rules\n`;
  output += `⚠ Incomplete: ${incomplete.length} rules\n\n`;

  if (violations.length > 0) {
    output += '--- VIOLATIONS ---\n';
    violations.forEach(violation => {
      output += `\n${violation.id}: ${violation.help}\n`;
      output += `  Impact: ${violation.impact}\n`;
      output += `  Description: ${violation.description}\n`;
      output += `  Affected nodes: ${violation.nodes.length}\n`;
      violation.nodes.forEach((node, idx) => {
        output += `    ${idx + 1}. ${node.html}\n`;
        output += `       ${node.failureSummary}\n`;
      });
    });
  }

  if (incomplete.length > 0) {
    output += '\n--- INCOMPLETE (Manual Review Needed) ---\n';
    incomplete.forEach(item => {
      output += `\n${item.id}: ${item.help}\n`;
      output += `  Affected nodes: ${item.nodes.length}\n`;
    });
  }

  return output;
}

/**
 * Asserts that axe-core tests pass with no violations
 * @param {Object} results - axe-core results object
 * @throws {Error} If violations are found
 */
export function assertNoViolations(results) {
  if (results.violations.length > 0) {
    const formatted = formatAxeResults(results);
    throw new Error(`Accessibility violations found:\n${formatted}`);
  }
}