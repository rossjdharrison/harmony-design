/**
 * @fileoverview E2E accessibility tests for primitive components
 * @module tests/e2e/accessibility/test-primitives
 * 
 * Tests all primitive components for WCAG 2.1 AA compliance.
 * 
 * @see DESIGN_SYSTEM.md#primitives
 * @see DESIGN_SYSTEM.md#accessibility-testing
 */

import { test, expect } from '@playwright/test';
import { injectAxe, testComponent, assertAccessible, generateReport, saveReport } from './axe-runner.js';

/**
 * List of primitive components to test
 */
const primitives = [
  { selector: 'button', type: 'button' },
  { selector: 'input[type="text"]', type: 'input' },
  { selector: 'input[type="checkbox"]', type: 'checkbox' },
  { selector: 'input[type="radio"]', type: 'radio' },
  { selector: 'select', type: 'select' },
  { selector: 'textarea', type: 'textarea' }
];

test.describe('Primitive Components Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to primitives test page
    await page.goto('/test-pages/primitives.html');
    
    // Inject axe-core
    await injectAxe(page);
  });

  test('button primitive should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'button', 'button', true);
    assertAccessible(result);
    
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test('text input primitive should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'input[type="text"]', 'input', true);
    assertAccessible(result);
    
    expect(result.passed).toBe(true);
  });

  test('checkbox primitive should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'input[type="checkbox"]', 'checkbox', true);
    assertAccessible(result);
    
    expect(result.passed).toBe(true);
  });

  test('radio button primitive should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'input[type="radio"]', 'radio', true);
    assertAccessible(result);
    
    expect(result.passed).toBe(true);
  });

  test('select primitive should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'select', 'select', true);
    assertAccessible(result);
    
    expect(result.passed).toBe(true);
  });

  test('textarea primitive should be accessible', async ({ page }) => {
    const result = await testComponent(page, 'textarea', 'textarea', true);
    assertAccessible(result);
    
    expect(result.passed).toBe(true);
  });

  test('all primitives accessibility report', async ({ page }) => {
    const results = [];
    
    for (const primitive of primitives) {
      const result = await testComponent(page, primitive.selector, primitive.type, true);
      results.push(result);
    }
    
    const report = generateReport(results);
    
    // Save report
    await saveReport(report, 'reports/accessibility/primitives-report.json');
    
    // Assert overall pass rate
    expect(report.summary.passed).toBe(report.summary.total);
  });
});

test.describe('Primitive Components Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-pages/primitives.html');
    await injectAxe(page);
  });

  test('button should be keyboard accessible', async ({ page }) => {
    const button = page.locator('button').first();
    
    // Focus with tab
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    
    // Activate with Enter
    let clicked = false;
    await button.evaluate(btn => {
      btn.addEventListener('click', () => clicked = true);
    });
    await page.keyboard.press('Enter');
    
    // Run accessibility check on focused element
    const result = await testComponent(page, 'button:focus', 'button');
    assertAccessible(result);
  });

  test('form controls should have proper focus order', async ({ page }) => {
    const focusableElements = [
      'input[type="text"]',
      'input[type="checkbox"]',
      'input[type="radio"]',
      'select',
      'textarea',
      'button'
    ];
    
    for (let i = 0; i < focusableElements.length; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        return document.activeElement.tagName.toLowerCase() +
          (document.activeElement.type ? `[type="${document.activeElement.type}"]` : '');
      });
      
      // Verify focus order matches DOM order
      expect(focused).toContain(focusableElements[i].split('[')[0]);
    }
  });
});

test.describe('Primitive Components Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-pages/primitives.html');
    await injectAxe(page);
  });

  test('button should have accessible name', async ({ page }) => {
    const button = page.locator('button').first();
    const name = await button.getAttribute('aria-label') || await button.textContent();
    
    expect(name).toBeTruthy();
    expect(name.length).toBeGreaterThan(0);
  });

  test('input should have associated label', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    const id = await input.getAttribute('id');
    
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toBeVisible();
    } else {
      const ariaLabel = await input.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('checkbox should announce state', async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]').first();
    
    // Check for proper ARIA attributes
    const role = await checkbox.getAttribute('role') || 'checkbox';
    expect(role).toBe('checkbox');
    
    const checked = await checkbox.isChecked();
    const ariaChecked = await checkbox.getAttribute('aria-checked');
    
    if (ariaChecked !== null) {
      expect(ariaChecked).toBe(checked.toString());
    }
  });
});