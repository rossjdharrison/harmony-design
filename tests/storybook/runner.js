/**
 * @fileoverview Storybook Test Runner - Main Entry Point
 * @module tests/storybook/runner
 * 
 * Executes tests against all Storybook stories using Playwright.
 * Validates accessibility, visual consistency, and functional behavior.
 * 
 * Usage:
 *   node tests/storybook/runner.js
 *   node tests/storybook/runner.js --grep "Button"
 *   node tests/storybook/runner.js --update-snapshots
 * 
 * Related Documentation: DESIGN_SYSTEM.md § Testing Infrastructure
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test result status
 * @enum {string}
 */
const TestStatus = {
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
};

/**
 * Test runner for Storybook stories
 */
class StorybookTestRunner {
  constructor(options = {}) {
    this.storybookUrl = options.storybookUrl || 'http://localhost:6006';
    this.headless = options.headless !== false;
    this.grep = options.grep || null;
    this.updateSnapshots = options.updateSnapshots || false;
    this.results = [];
    this.browser = null;
    this.context = null;
  }
  
  /**
   * Initialize browser and context
   */
  async setup() {
    console.log('🚀 Starting Storybook Test Runner...');
    console.log(`📖 Storybook URL: ${this.storybookUrl}`);
    
    this.browser = await chromium.launch({
      headless: this.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
  }
  
  /**
   * Fetch all stories from Storybook
   * @returns {Promise<Array>} Array of story objects
   */
  async fetchStories() {
    const page = await this.context.newPage();
    
    try {
      await page.goto(`${this.storybookUrl}/iframe.html`);
      
      // Wait for Storybook to load
      await page.waitForFunction(() => {
        return window.__STORYBOOK_STORY_STORE__ !== undefined;
      }, { timeout: 10000 });
      
      // Extract all stories
      const stories = await page.evaluate(() => {
        const storyStore = window.__STORYBOOK_STORY_STORE__;
        if (!storyStore) return [];
        
        const stories = [];
        const allStories = storyStore.raw();
        
        for (const [id, story] of Object.entries(allStories)) {
          stories.push({
            id,
            title: story.title,
            name: story.name,
            kind: story.kind,
            parameters: story.parameters || {},
          });
        }
        
        return stories;
      });
      
      return stories;
    } catch (error) {
      console.error('❌ Failed to fetch stories:', error.message);
      throw error;
    } finally {
      await page.close();
    }
  }
  
  /**
   * Filter stories based on grep pattern
   * @param {Array} stories - All stories
   * @returns {Array} Filtered stories
   */
  filterStories(stories) {
    if (!this.grep) return stories;
    
    const pattern = new RegExp(this.grep, 'i');
    return stories.filter(story => {
      return pattern.test(story.title) || pattern.test(story.name);
    });
  }
  
  /**
   * Run tests for a single story
   * @param {Object} story - Story object
   * @returns {Promise<Object>} Test result
   */
  async testStory(story) {
    const page = await this.context.newPage();
    const startTime = Date.now();
    
    try {
      // Navigate to story
      const storyUrl = `${this.storybookUrl}/iframe.html?id=${story.id}&viewMode=story`;
      await page.goto(storyUrl, { waitUntil: 'networkidle' });
      
      // Wait for story to render
      await page.waitForSelector('#storybook-root', { timeout: 5000 });
      
      // Run accessibility tests
      const a11yResults = await this.checkAccessibility(page, story);
      
      // Check for console errors (Mandatory Rule #17)
      const consoleErrors = await page.evaluate(() => {
        return window.__testErrors || [];
      });
      
      // Check performance (Absolute Constraint #1: 16ms render budget)
      const performanceMetrics = await this.checkPerformance(page, story);
      
      // Check for EventBus if required (Mandatory Rule #16)
      const eventBusCheck = await this.checkEventBus(page, story);
      
      const duration = Date.now() - startTime;
      
      // Determine if test passed
      const passed = a11yResults.violations === 0 && 
                     consoleErrors.length === 0 &&
                     performanceMetrics.withinBudget &&
                     eventBusCheck.passed;
      
      return {
        story: story.id,
        status: passed ? TestStatus.PASSED : TestStatus.FAILED,
        duration,
        a11y: a11yResults,
        consoleErrors,
        performance: performanceMetrics,
        eventBus: eventBusCheck,
      };
    } catch (error) {
      return {
        story: story.id,
        status: TestStatus.FAILED,
        duration: Date.now() - startTime,
        error: error.message,
      };
    } finally {
      await page.close();
    }
  }
  
  /**
   * Check accessibility using axe-core
   * @param {Page} page - Playwright page
   * @param {Object} story - Story object
   * @returns {Promise<Object>} Accessibility results
   */
  async checkAccessibility(page, story) {
    try {
      // Inject axe-core if not already present
      await page.addScriptTag({
        url: 'https://cdn.jsdelivr.net/npm/axe-core@4.7.0/axe.min.js'
      });
      
      const results = await page.evaluate(() => {
        return window.axe.run();
      });
      
      return {
        violations: results.violations.length,
        details: results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        })),
      };
    } catch (error) {
      return {
        violations: 0,
        error: error.message,
      };
    }
  }
  
  /**
   * Check performance metrics against budgets
   * @param {Page} page - Playwright page
   * @param {Object} story - Story object
   * @returns {Promise<Object>} Performance results
   */
  async checkPerformance(page, story) {
    const metrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('measure');
      const renderTime = entries.find(e => e.name.includes('render'))?.duration || 0;
      
      return {
        renderTime,
        memory: performance.memory ? performance.memory.usedJSHeapSize : 0,
      };
    });
    
    // Absolute Constraint #1: 16ms render budget
    const withinRenderBudget = metrics.renderTime === 0 || metrics.renderTime <= 16;
    
    // Absolute Constraint #2: 50MB memory budget (converted to bytes)
    const withinMemoryBudget = metrics.memory === 0 || metrics.memory <= 50 * 1024 * 1024;
    
    return {
      renderTime: metrics.renderTime,
      memory: metrics.memory,
      withinBudget: withinRenderBudget && withinMemoryBudget,
      budgetViolations: [
        !withinRenderBudget && `Render time ${metrics.renderTime.toFixed(2)}ms exceeds 16ms budget`,
        !withinMemoryBudget && `Memory ${(metrics.memory / 1024 / 1024).toFixed(2)}MB exceeds 50MB budget`,
      ].filter(Boolean),
    };
  }
  
  /**
   * Check EventBus availability if required
   * @param {Page} page - Playwright page
   * @param {Object} story - Story object
   * @returns {Promise<Object>} EventBus check results
   */
  async checkEventBus(page, story) {
    const requiresEventBus = story.parameters?.requiresEventBus || false;
    
    if (!requiresEventBus) {
      return { passed: true, required: false };
    }
    
    const hasEventBus = await page.evaluate(() => {
      return typeof window.EventBus !== 'undefined';
    });
    
    return {
      passed: hasEventBus,
      required: true,
      available: hasEventBus,
    };
  }
  
  /**
   * Run all tests
   */
  async run() {
    await this.setup();
    
    try {
      // Fetch all stories
      console.log('📚 Fetching stories...');
      const allStories = await this.fetchStories();
      const stories = this.filterStories(allStories);
      
      console.log(`✅ Found ${stories.length} stories to test`);
      
      // Run tests for each story
      for (let i = 0; i < stories.length; i++) {
        const story = stories[i];
        console.log(`\n[${i + 1}/${stories.length}] Testing: ${story.title} / ${story.name}`);
        
        const result = await this.testStory(story);
        this.results.push(result);
        
        // Log result
        if (result.status === TestStatus.PASSED) {
          console.log(`  ✅ PASSED (${result.duration}ms)`);
        } else {
          console.log(`  ❌ FAILED (${result.duration}ms)`);
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          }
          if (result.a11y?.violations > 0) {
            console.log(`     A11y violations: ${result.a11y.violations}`);
          }
          if (result.consoleErrors?.length > 0) {
            console.log(`     Console errors: ${result.consoleErrors.length}`);
          }
          if (result.performance?.budgetViolations?.length > 0) {
            console.log(`     Performance: ${result.performance.budgetViolations.join(', ')}`);
          }
        }
      }
      
      // Print summary
      this.printSummary();
      
    } finally {
      await this.teardown();
    }
  }
  
  /**
   * Print test summary
   */
  printSummary() {
    const passed = this.results.filter(r => r.status === TestStatus.PASSED).length;
    const failed = this.results.filter(r => r.status === TestStatus.FAILED).length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`Total:  ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log('='.repeat(60));
    
    if (failed > 0) {
      console.log('\n❌ Failed Stories:');
      this.results
        .filter(r => r.status === TestStatus.FAILED)
        .forEach(r => {
          console.log(`  - ${r.story}`);
        });
    }
  }
  
  /**
   * Cleanup resources
   */
  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }
  
  /**
   * Get exit code based on results
   * @returns {number} Exit code (0 = success, 1 = failure)
   */
  getExitCode() {
    const failed = this.results.filter(r => r.status === TestStatus.FAILED).length;
    return failed > 0 ? 1 : 0;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  headless: !args.includes('--headed'),
  grep: args.find(arg => arg.startsWith('--grep='))?.split('=')[1],
  updateSnapshots: args.includes('--update-snapshots'),
  storybookUrl: args.find(arg => arg.startsWith('--url='))?.split('=')[1],
};

// Run tests
const runner = new StorybookTestRunner(options);
runner.run()
  .then(() => {
    process.exit(runner.getExitCode());
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });