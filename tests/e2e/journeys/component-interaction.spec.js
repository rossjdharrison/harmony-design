/**
 * @fileoverview E2E tests for component interaction journeys
 * @module tests/e2e/journeys/component-interaction
 */

import { test, expect } from '@playwright/test';
import { 
  measurePageLoad, 
  measureFrameTime,
  assertPerformanceBudget,
  startEventBusMonitoring,
  getEventBusLog
} from '../helpers/performance-metrics.js';
import {
  waitForComponent,
  clickInShadow,
  typeInShadow,
  waitForEvent
} from '../helpers/component-helpers.js';

test.describe('Component Interaction Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-pages/component-showcase.html');
    await startEventBusMonitoring(page);
  });

  test('User interacts with button and sees feedback', async ({ page }) => {
    // Wait for button component
    await waitForComponent(page, 'harmony-button');
    
    // Measure frame time during interaction
    const frameTime = await measureFrameTime(page, async () => {
      await clickInShadow(page, 'harmony-button', 'button');
    });
    
    // Wait for event
    const event = await waitForEvent(page, 'button:click');
    expect(event).toBeDefined();
    
    // Assert performance
    assertPerformanceBudget({ frameTime }, { frameTime: 16 });
    
    // Verify EventBus activity
    const eventLog = await getEventBusLog(page);
    expect(eventLog.some(e => e.type === 'button:click')).toBe(true);
  });

  test('User fills form and submits', async ({ page }) => {
    await page.goto('/test-pages/form-demo.html');
    
    // Wait for form components
    await waitForComponent(page, 'harmony-input');
    await waitForComponent(page, 'harmony-button');
    
    // Fill form fields
    await typeInShadow(page, 'harmony-input[name="username"]', 'input', 'testuser');
    await typeInShadow(page, 'harmony-input[name="email"]', 'input', 'test@example.com');
    
    // Submit form
    await clickInShadow(page, 'harmony-button[type="submit"]', 'button');
    
    // Wait for form submission event
    const submitEvent = await waitForEvent(page, 'form:submit');
    expect(submitEvent.username).toBe('testuser');
    expect(submitEvent.email).toBe('test@example.com');
  });

  test('User navigates through tabs', async ({ page }) => {
    await page.goto('/test-pages/tabs-demo.html');
    
    await waitForComponent(page, 'harmony-tabs');
    
    // Click second tab
    await clickInShadow(page, 'harmony-tabs', '[role="tab"]:nth-child(2)');
    
    // Verify tab change event
    const tabEvent = await waitForEvent(page, 'tabs:change');
    expect(tabEvent.index).toBe(1);
    
    // Verify active tab
    const activeTab = await page.evaluate(() => {
      const tabs = document.querySelector('harmony-tabs');
      return tabs.activeTab;
    });
    expect(activeTab).toBe(1);
  });

  test('User opens and closes modal', async ({ page }) => {
    await page.goto('/test-pages/modal-demo.html');
    
    // Open modal
    await clickInShadow(page, 'harmony-button[data-action="open-modal"]', 'button');
    await waitForComponent(page, 'harmony-modal');
    
    // Verify modal opened
    const openEvent = await waitForEvent(page, 'modal:open');
    expect(openEvent).toBeDefined();
    
    // Close modal
    await clickInShadow(page, 'harmony-modal', '[data-action="close"]');
    
    // Verify modal closed
    const closeEvent = await waitForEvent(page, 'modal:close');
    expect(closeEvent).toBeDefined();
  });

  test('User interacts with slider', async ({ page }) => {
    await page.goto('/test-pages/slider-demo.html');
    
    await waitForComponent(page, 'harmony-slider');
    
    // Drag slider
    const slider = await page.locator('harmony-slider');
    const box = await slider.boundingBox();
    
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
    await page.mouse.up();
    
    // Verify slider change event
    const changeEvent = await waitForEvent(page, 'slider:change');
    expect(changeEvent.value).toBeGreaterThan(50);
    expect(changeEvent.value).toBeLessThan(100);
  });
});