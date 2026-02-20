/**
 * @fileoverview E2E accessibility tests for complex components
 * @module tests/e2e/accessibility/test-components
 * 
 * Tests molecules and organisms for WCAG 2.1 AA compliance.
 * 
 * @see DESIGN_SYSTEM.md#molecules
 * @see DESIGN_SYSTEM.md#organisms
 * @see DESIGN_SYSTEM.md#accessibility-testing
 */

import { test, expect } from '@playwright/test';
import { injectAxe, testAllComponents, assertAccessible, generateReport, saveReport } from './axe-runner.js';

const components = [
  { selector: 'harmony-button', type: 'button' },
  { selector: 'harmony-input', type: 'input' },
  { selector: 'harmony-slider', type: 'custom-slider' },
  { selector: 'harmony-toggle', type: 'toggle' },
  { selector: 'event-bus-component', type: 'debug-panel' }
];

test.describe('Component Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-pages/components.html');
    await injectAxe(page);
  });

  test('harmony-button should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'harmony-button', 'button');
    assertAccessible(result);
    
    expect(result.passed).toBe(true);
  });

  test('harmony-input should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'harmony-input', 'input');
    assertAccessible(result);
    
    expect(result.passed).toBe(true);
  });

  test('harmony-slider should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'harmony-slider', 'custom-slider');
    assertAccessible(result);
    
    // Slider should have proper ARIA attributes
    const slider = page.locator('harmony-slider');
    await expect(slider).toHaveAttribute('role', 'slider');
    await expect(slider).toHaveAttribute('aria-valuemin');
    await expect(slider).toHaveAttribute('aria-valuemax');
    await expect(slider).toHaveAttribute('aria-valuenow');
  });

  test('harmony-toggle should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'harmony-toggle', 'toggle');
    assertAccessible(result);
    
    // Toggle should have switch role
    const toggle = page.locator('harmony-toggle');
    const role = await toggle.getAttribute('role');
    expect(role).toBe('switch');
  });

  test('all components accessibility report', async ({ page }) => {
    const results = await testAllComponents(page, components);
    const report = generateReport(results);
    
    await saveReport(report, 'reports/accessibility/components-report.json');
    
    // Log summary
    console.log('Accessibility Report:', report.summary);
    
    // Should have high pass rate
    const passRate = parseFloat(report.summary.passRate);
    expect(passRate).toBeGreaterThan(90);
  });
});

test.describe('Component States Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-pages/components.html');
    await injectAxe(page);
  });

  test('disabled button should be accessible', async ({ page }) => {
    const button = page.locator('harmony-button[disabled]');
    
    // Should have disabled state
    await expect(button).toHaveAttribute('disabled');
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    
    const result = await testComponent(page, 'harmony-button[disabled]', 'button');
    assertAccessible(result);
  });

  test('focused component should maintain accessibility', async ({ page }) => {
    const input = page.locator('harmony-input').first();
    await input.focus();
    
    // Check focus indicator visibility
    const focusVisible = await input.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });
    
    expect(focusVisible).toBe(true);
    
    const result = await testComponent(page, 'harmony-input:focus-visible', 'input');
    assertAccessible(result);
  });

  test('error state should be announced', async ({ page }) => {
    const input = page.locator('harmony-input[error]');
    
    // Should have error ARIA attributes
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    
    const errorId = await input.getAttribute('aria-describedby');
    if (errorId) {
      const errorMessage = page.locator(`#${errorId}`);
      await expect(errorMessage).toBeVisible();
    }
  });
});

test.describe('Component Interaction Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-pages/components.html');
    await injectAxe(page);
  });

  test('button click should be keyboard accessible', async ({ page }) => {
    const button = page.locator('harmony-button').first();
    
    await button.focus();
    await page.keyboard.press('Enter');
    
    // Verify click was triggered
    const clicked = await button.evaluate(btn => {
      return btn.hasAttribute('data-clicked');
    });
    
    expect(clicked).toBe(true);
  });

  test('slider should be keyboard operable', async ({ page }) => {
    const slider = page.locator('harmony-slider').first();
    
    await slider.focus();
    
    const initialValue = await slider.getAttribute('aria-valuenow');
    
    // Increase value with arrow key
    await page.keyboard.press('ArrowRight');
    
    const newValue = await slider.getAttribute('aria-valuenow');
    expect(parseFloat(newValue)).toBeGreaterThan(parseFloat(initialValue));
  });

  test('toggle should be keyboard operable', async ({ page }) => {
    const toggle = page.locator('harmony-toggle').first();
    
    await toggle.focus();
    
    const initialState = await toggle.getAttribute('aria-checked');
    
    // Toggle with Space key
    await page.keyboard.press('Space');
    
    const newState = await toggle.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });
});