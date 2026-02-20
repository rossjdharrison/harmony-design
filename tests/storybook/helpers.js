/**
 * @fileoverview Storybook Test Helpers
 * @module tests/storybook/helpers
 * 
 * Helper functions for testing Storybook stories.
 * Provides utilities for common test scenarios.
 * 
 * Related Documentation: DESIGN_SYSTEM.md § Testing Infrastructure
 */

/**
 * Wait for element to be visible and stable
 * @param {Page} page - Playwright page
 * @param {string} selector - CSS selector
 * @param {Object} options - Wait options
 * @returns {Promise<ElementHandle>}
 */
export async function waitForStableElement(page, selector, options = {}) {
  const timeout = options.timeout || 5000;
  const stability = options.stability || 100; // ms to wait for stability
  
  await page.waitForSelector(selector, { timeout, state: 'visible' });
  
  // Wait for element to stop moving (animations complete)
  let lastPosition = null;
  let stableTime = 0;
  const startTime = Date.now();
  
  while (stableTime < stability) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`);
    }
    
    const position = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }, selector);
    
    if (lastPosition && 
        position.x === lastPosition.x && 
        position.y === lastPosition.y &&
        position.width === lastPosition.width &&
        position.height === lastPosition.height) {
      stableTime += 50;
    } else {
      stableTime = 0;
    }
    
    lastPosition = position;
    await page.waitForTimeout(50);
  }
  
  return page.$(selector);
}

/**
 * Test all interactive states of a component
 * @param {Page} page - Playwright page
 * @param {string} selector - Component selector
 * @returns {Promise<Object>} State test results
 */
export async function testInteractiveStates(page, selector) {
  const results = {
    default: false,
    hover: false,
    focus: false,
    active: false,
    disabled: false,
  };
  
  // Test default state
  const element = await page.$(selector);
  if (element) {
    results.default = true;
  }
  
  // Test hover state
  await element.hover();
  await page.waitForTimeout(100);
  const hoverState = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return window.getComputedStyle(el).getPropertyValue('cursor');
  }, selector);
  results.hover = hoverState !== 'default';
  
  // Test focus state
  await element.focus();
  await page.waitForTimeout(100);
  const focusedElement = await page.evaluate(() => {
    return document.activeElement?.tagName;
  });
  results.focus = focusedElement !== 'BODY';
  
  // Test active state (click and hold)
  await element.click();
  results.active = true;
  
  // Test disabled state if attribute exists
  const hasDisabled = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el.hasAttribute('disabled') || el.hasAttribute('aria-disabled');
  }, selector);
  results.disabled = hasDisabled;
  
  return results;
}

/**
 * Measure render performance
 * @param {Page} page - Playwright page
 * @param {Function} action - Action to measure
 * @returns {Promise<Object>} Performance metrics
 */
export async function measurePerformance(page, action) {
  // Start performance measurement
  await page.evaluate(() => {
    performance.mark('test-start');
  });
  
  // Execute action
  await action();
  
  // End measurement
  const metrics = await page.evaluate(() => {
    performance.mark('test-end');
    performance.measure('test-duration', 'test-start', 'test-end');
    
    const measure = performance.getEntriesByName('test-duration')[0];
    const memory = performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
    } : null;
    
    return {
      duration: measure.duration,
      memory,
    };
  });
  
  return metrics;
}

/**
 * Check if component respects shadow DOM encapsulation
 * @param {Page} page - Playwright page
 * @param {string} selector - Component selector
 * @returns {Promise<boolean>}
 */
export async function checkShadowDOMEncapsulation(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    
    // Check if component uses shadow DOM
    if (!el.shadowRoot) {
      console.warn(`Component ${sel} does not use shadow DOM`);
      return false;
    }
    
    // Check if styles are encapsulated
    const shadowStyles = el.shadowRoot.querySelectorAll('style');
    return shadowStyles.length > 0;
  }, selector);
}

/**
 * Verify EventBus integration
 * @param {Page} page - Playwright page
 * @param {string} eventType - Expected event type
 * @returns {Promise<Object>} Event verification result
 */
export async function verifyEventBusIntegration(page, eventType) {
  // Set up event listener
  await page.evaluate((type) => {
    window.__testEventReceived = false;
    window.__testEventPayload = null;
    
    if (window.EventBus) {
      window.EventBus.subscribe(type, (payload) => {
        window.__testEventReceived = true;
        window.__testEventPayload = payload;
      });
    }
  }, eventType);
  
  // Return verification function
  return {
    async wasReceived() {
      return await page.evaluate(() => window.__testEventReceived);
    },
    async getPayload() {
      return await page.evaluate(() => window.__testEventPayload);
    },
  };
}

/**
 * Take screenshot with consistent settings
 * @param {Page} page - Playwright page
 * @param {string} name - Screenshot name
 * @param {Object} options - Screenshot options
 * @returns {Promise<Buffer>}
 */
export async function takeScreenshot(page, name, options = {}) {
  const element = options.selector ? await page.$(options.selector) : null;
  
  const screenshotOptions = {
    path: options.path || `tests/screenshots/${name}.png`,
    fullPage: options.fullPage || false,
    omitBackground: options.omitBackground || false,
  };
  
  if (element) {
    return await element.screenshot(screenshotOptions);
  } else {
    return await page.screenshot(screenshotOptions);
  }
}

/**
 * Check for memory leaks
 * @param {Page} page - Playwright page
 * @param {Function} action - Action to repeat
 * @param {number} iterations - Number of iterations
 * @returns {Promise<Object>} Memory leak detection result
 */
export async function checkMemoryLeaks(page, action, iterations = 10) {
  const measurements = [];
  
  for (let i = 0; i < iterations; i++) {
    await action();
    
    const memory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return null;
    });
    
    if (memory !== null) {
      measurements.push(memory);
    }
    
    // Force garbage collection if possible
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    await page.waitForTimeout(100);
  }
  
  if (measurements.length === 0) {
    return { detected: false, reason: 'Memory API not available' };
  }
  
  // Check if memory consistently increases
  const firstHalf = measurements.slice(0, Math.floor(measurements.length / 2));
  const secondHalf = measurements.slice(Math.floor(measurements.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const increase = secondAvg - firstAvg;
  const percentIncrease = (increase / firstAvg) * 100;
  
  // Consider it a leak if memory increases by more than 20%
  const detected = percentIncrease > 20;
  
  return {
    detected,
    measurements,
    increase,
    percentIncrease,
  };
}