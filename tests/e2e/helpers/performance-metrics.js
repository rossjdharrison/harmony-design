/**
 * @fileoverview Performance measurement helpers for E2E tests
 * @module tests/e2e/helpers/performance-metrics
 */

/**
 * Measure page load performance
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<Object>} Performance metrics
 */
export async function measurePageLoad(page) {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
    };
  });
  
  return metrics;
}

/**
 * Measure frame render time
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {Function} action - Action to perform
 * @returns {Promise<number>} Frame time in ms
 */
export async function measureFrameTime(page, action) {
  await page.evaluate(() => {
    window.__frameStart = performance.now();
    requestAnimationFrame(() => {
      window.__frameEnd = performance.now();
    });
  });
  
  await action();
  
  const frameTime = await page.evaluate(() => {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        resolve(window.__frameEnd - window.__frameStart);
      });
    });
  });
  
  return frameTime;
}

/**
 * Measure memory usage
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<Object>} Memory metrics
 */
export async function measureMemory(page) {
  const memory = await page.evaluate(async () => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    }
    
    // Try performance.measureUserAgentSpecificMemory if available
    if (performance.measureUserAgentSpecificMemory) {
      try {
        const measurement = await performance.measureUserAgentSpecificMemory();
        return {
          bytes: measurement.bytes,
          breakdown: measurement.breakdown,
        };
      } catch (e) {
        return null;
      }
    }
    
    return null;
  });
  
  return memory;
}

/**
 * Monitor EventBus activity
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<void>}
 */
export async function startEventBusMonitoring(page) {
  await page.evaluate(() => {
    window.__eventBusLog = [];
    const originalPublish = window.EventBus?.publish;
    
    if (originalPublish) {
      window.EventBus.publish = function(...args) {
        window.__eventBusLog.push({
          timestamp: performance.now(),
          type: args[0],
          payload: args[1],
        });
        return originalPublish.apply(this, args);
      };
    }
  });
}

/**
 * Get EventBus activity log
 * @param {import('@playwright/test').Page} page - Playwright page
 * @returns {Promise<Array>} Event log
 */
export async function getEventBusLog(page) {
  return await page.evaluate(() => window.__eventBusLog || []);
}

/**
 * Assert performance budget
 * @param {Object} metrics - Performance metrics
 * @param {Object} budgets - Budget constraints
 * @throws {Error} If budget exceeded
 */
export function assertPerformanceBudget(metrics, budgets) {
  const violations = [];
  
  if (budgets.loadTime && metrics.totalLoadTime > budgets.loadTime) {
    violations.push(`Load time ${metrics.totalLoadTime}ms exceeds budget ${budgets.loadTime}ms`);
  }
  
  if (budgets.frameTime && metrics.frameTime > budgets.frameTime) {
    violations.push(`Frame time ${metrics.frameTime}ms exceeds budget ${budgets.frameTime}ms`);
  }
  
  if (budgets.memory && metrics.usedJSHeapSize > budgets.memory) {
    violations.push(`Memory ${metrics.usedJSHeapSize} bytes exceeds budget ${budgets.memory} bytes`);
  }
  
  if (violations.length > 0) {
    throw new Error(`Performance budget violations:\n${violations.join('\n')}`);
  }
}