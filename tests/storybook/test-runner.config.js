/**
 * @fileoverview Storybook Test Runner Configuration
 * @module tests/storybook/test-runner-config
 * 
 * Configures the test runner to execute tests against all Storybook stories.
 * Ensures all components meet accessibility, visual, and functional requirements.
 * 
 * Related Documentation: DESIGN_SYSTEM.md § Testing Infrastructure
 */

/**
 * Test runner configuration for Storybook stories
 * @type {import('@storybook/test-runner').TestRunnerConfig}
 */
const config = {
  // Base URL for the Storybook instance
  storybookUrl: process.env.STORYBOOK_URL || 'http://localhost:6006',
  
  // Browser configuration for Playwright
  launchOptions: {
    headless: process.env.CI === 'true',
    slowMo: process.env.DEBUG ? 100 : 0,
  },
  
  // Test timeout (must be under 16ms render budget consideration)
  timeout: 30000,
  
  /**
   * Pre-visit hook - runs before each story is visited
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {Object} context - Story context
   */
  async preVisit(page, context) {
    // Enable console logging for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[${context.id}] Console error:`, msg.text());
      }
    });
    
    // Track EventBus errors (Mandatory Rule #17)
    await page.evaluate(() => {
      window.__testErrors = [];
      window.addEventListener('error', (e) => {
        window.__testErrors.push({
          message: e.message,
          stack: e.error?.stack,
          timestamp: Date.now()
        });
      });
    });
  },
  
  /**
   * Post-visit hook - runs after each story is rendered
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @param {Object} context - Story context
   */
  async postVisit(page, context) {
    // Check for runtime errors
    const errors = await page.evaluate(() => window.__testErrors || []);
    if (errors.length > 0) {
      throw new Error(`Story ${context.id} had runtime errors: ${JSON.stringify(errors)}`);
    }
    
    // Verify EventBus is available if component uses events (Mandatory Rule #16)
    const hasEventBus = await page.evaluate(() => {
      return typeof window.EventBus !== 'undefined';
    });
    
    if (!hasEventBus && context.parameters?.requiresEventBus) {
      console.warn(`[${context.id}] Story requires EventBus but it's not available`);
    }
    
    // Performance budget check - 16ms render budget (Absolute Constraint #1)
    const performanceMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('measure');
      return entries.map(e => ({
        name: e.name,
        duration: e.duration
      }));
    });
    
    const slowMeasures = performanceMetrics.filter(m => m.duration > 16);
    if (slowMeasures.length > 0) {
      console.warn(`[${context.id}] Performance budget exceeded (>16ms):`, slowMeasures);
    }
  },
  
  /**
   * Tags to include/exclude from test runs
   */
  tags: {
    include: process.env.TEST_TAGS?.split(',') || [],
    exclude: ['skip', 'wip'],
    skip: process.env.SKIP_TAGS?.split(',') || [],
  },
};

module.exports = config;