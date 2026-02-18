/**
 * @fileoverview Test runner for component accessibility testing
 * @module tests/accessibility/component-test-runner
 * 
 * Provides utilities to test individual components and component states.
 * See DESIGN_SYSTEM.md § Accessibility Testing for examples.
 */

import { runAxeTests, formatAxeResults, assertNoViolations } from './axe-setup.js';

/**
 * Test a component in all its states
 * @param {string} componentName - Name of the component
 * @param {Function} setupFn - Function that returns component element
 * @param {Array<Object>} states - Array of state configurations
 * @returns {Promise<Object>} Test results summary
 */
export async function testComponentStates(componentName, setupFn, states) {
  const results = {
    component: componentName,
    states: [],
    passed: 0,
    failed: 0
  };

  for (const state of states) {
    const { name, setup } = state;
    
    // Create container
    const container = document.createElement('div');
    container.id = 'axe-test-container';
    document.body.appendChild(container);

    try {
      // Setup component
      const component = setupFn();
      container.appendChild(component);

      // Apply state
      if (setup) {
        await setup(component);
      }

      // Wait for component to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Run axe tests
      const axeResults = await runAxeTests(container);
      
      const stateResult = {
        name,
        violations: axeResults.violations.length,
        passes: axeResults.passes.length,
        incomplete: axeResults.incomplete.length,
        details: axeResults
      };

      results.states.push(stateResult);

      if (axeResults.violations.length === 0) {
        results.passed++;
        console.log(`✓ ${componentName} [${name}]: PASSED`);
      } else {
        results.failed++;
        console.error(`✗ ${componentName} [${name}]: FAILED`);
        console.error(formatAxeResults(axeResults));
      }

    } catch (error) {
      results.failed++;
      console.error(`✗ ${componentName} [${name}]: ERROR`, error);
      results.states.push({
        name,
        error: error.message
      });
    } finally {
      // Cleanup
      document.body.removeChild(container);
    }
  }

  return results;
}

/**
 * Test a single component instance
 * @param {string} componentName - Name of the component
 * @param {HTMLElement} component - Component element to test
 * @returns {Promise<Object>} Test results
 */
export async function testComponent(componentName, component) {
  const container = document.createElement('div');
  container.id = 'axe-test-container';
  document.body.appendChild(container);

  try {
    container.appendChild(component);
    
    // Wait for component to render
    await new Promise(resolve => setTimeout(resolve, 100));

    const results = await runAxeTests(container);
    
    console.log(`Testing ${componentName}...`);
    if (results.violations.length === 0) {
      console.log(`✓ ${componentName}: PASSED`);
    } else {
      console.error(`✗ ${componentName}: FAILED`);
      console.error(formatAxeResults(results));
    }

    return results;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Batch test multiple components
 * @param {Array<Object>} components - Array of {name, element} objects
 * @returns {Promise<Object>} Summary results
 */
export async function testComponentBatch(components) {
  const summary = {
    total: components.length,
    passed: 0,
    failed: 0,
    components: []
  };

  for (const { name, element } of components) {
    try {
      const results = await testComponent(name, element);
      
      const componentResult = {
        name,
        violations: results.violations.length,
        passes: results.passes.length
      };

      summary.components.push(componentResult);

      if (results.violations.length === 0) {
        summary.passed++;
      } else {
        summary.failed++;
      }
    } catch (error) {
      summary.failed++;
      summary.components.push({
        name,
        error: error.message
      });
    }
  }

  console.log('\n=== Test Summary ===');
  console.log(`Total: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);

  return summary;
}