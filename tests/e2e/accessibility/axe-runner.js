/**
 * @fileoverview Axe-core test runner for E2E accessibility tests
 * @module tests/e2e/accessibility/axe-runner
 * 
 * Provides utilities to run axe-core accessibility checks in browser context.
 * Integrates with Playwright for automated testing.
 * 
 * @see DESIGN_SYSTEM.md#accessibility-testing
 */

import { axeConfig, getConfigForComponent, checkViolationThreshold, severityLevels } from './axe-config.js';

/**
 * Inject axe-core into the page context
 * Downloads from CDN to avoid npm dependency in runtime
 * 
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function injectAxe(page) {
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
  });
  
  // Wait for axe to be available
  await page.waitForFunction(() => typeof window.axe !== 'undefined');
}

/**
 * Run axe-core accessibility checks on the current page
 * 
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} [config] - Axe configuration (defaults to standard config)
 * @param {string} [context='html'] - CSS selector or context to test
 * @returns {Promise<Object>} Axe results object
 */
export async function runAxe(page, config = axeConfig, context = 'html') {
  const results = await page.evaluate(([ctx, cfg]) => {
    return window.axe.run(ctx, cfg);
  }, [context, config]);
  
  return results;
}

/**
 * Run accessibility checks on a specific component
 * 
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} selector - CSS selector for component
 * @param {string} [componentType] - Component type for exception rules
 * @param {boolean} [strict=false] - Use strict configuration
 * @returns {Promise<Object>} Test results with violations
 */
export async function testComponent(page, selector, componentType = null, strict = false) {
  // Wait for component to be ready
  await page.waitForSelector(selector, { state: 'attached' });
  
  // Get configuration
  const config = componentType 
    ? getConfigForComponent(componentType, strict)
    : axeConfig;
  
  // Run axe on component
  const results = await runAxe(page, config, selector);
  
  return {
    selector,
    componentType,
    passed: results.violations.length === 0,
    violations: results.violations,
    passes: results.passes,
    incomplete: results.incomplete,
    timestamp: new Date().toISOString()
  };
}

/**
 * Run accessibility checks on all components on a page
 * 
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Array<{selector: string, type?: string}>} components - Components to test
 * @returns {Promise<Array<Object>>} Array of test results
 */
export async function testAllComponents(page, components) {
  const results = [];
  
  for (const component of components) {
    const result = await testComponent(
      page,
      component.selector,
      component.type,
      component.strict || false
    );
    results.push(result);
  }
  
  return results;
}

/**
 * Format violation for readable output
 * 
 * @param {Object} violation - Axe violation object
 * @returns {string} Formatted violation message
 */
export function formatViolation(violation) {
  const nodes = violation.nodes.map(node => {
    return `    - ${node.html}\n      ${node.failureSummary}`;
  }).join('\n');
  
  return `
  [${violation.impact.toUpperCase()}] ${violation.id}: ${violation.description}
  Help: ${violation.helpUrl}
  Affected elements (${violation.nodes.length}):
${nodes}
  `;
}

/**
 * Generate accessibility test report
 * 
 * @param {Array<Object>} results - Array of test results
 * @returns {Object} Report summary
 */
export function generateReport(results) {
  const totalTests = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = totalTests - passed;
  
  const allViolations = results.flatMap(r => r.violations);
  const violationsBySeverity = {
    critical: allViolations.filter(v => v.impact === 'critical').length,
    serious: allViolations.filter(v => v.impact === 'serious').length,
    moderate: allViolations.filter(v => v.impact === 'moderate').length,
    minor: allViolations.filter(v => v.impact === 'minor').length
  };
  
  return {
    summary: {
      total: totalTests,
      passed,
      failed,
      passRate: ((passed / totalTests) * 100).toFixed(2) + '%'
    },
    violations: {
      total: allViolations.length,
      bySeverity: violationsBySeverity
    },
    results,
    timestamp: new Date().toISOString()
  };
}

/**
 * Assert that accessibility test passed
 * Throws if violations exceed threshold
 * 
 * @param {Object} result - Test result object
 * @param {number} [maxSeverity] - Maximum acceptable severity
 * @throws {Error} If test failed
 */
export function assertAccessible(result, maxSeverity = severityLevels.moderate) {
  if (result.violations.length === 0) {
    return;
  }
  
  const withinThreshold = checkViolationThreshold(result.violations, maxSeverity);
  
  if (!withinThreshold) {
    const formatted = result.violations.map(formatViolation).join('\n');
    throw new Error(
      `Accessibility violations found in ${result.selector}:\n${formatted}`
    );
  }
}

/**
 * Save report to file
 * 
 * @param {Object} report - Report object from generateReport
 * @param {string} filepath - Path to save report
 * @returns {Promise<void>}
 */
export async function saveReport(report, filepath) {
  const fs = await import('fs/promises');
  await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf-8');
}