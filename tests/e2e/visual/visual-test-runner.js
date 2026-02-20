/**
 * @fileoverview Visual Test Runner - Coordinates screenshot capture and comparison
 * @module tests/e2e/visual/visual-test-runner
 * 
 * Implements screenshot-based visual regression testing for UI consistency.
 * See DESIGN_SYSTEM.md § Testing Strategy > Visual Regression
 * 
 * Performance: Uses Web Workers for image diff computation
 * Storage: Baseline images in tests/e2e/visual/baselines/
 */

import { PixelDiff } from './pixel-diff.js';
import { ScreenshotCapture } from './screenshot-capture.js';
import { VisualReport } from './visual-report.js';

/**
 * Visual test runner configuration
 * @typedef {Object} VisualTestConfig
 * @property {number} threshold - Pixel difference threshold (0-1)
 * @property {string} baselineDir - Directory for baseline screenshots
 * @property {string} actualDir - Directory for actual screenshots
 * @property {string} diffDir - Directory for diff images
 * @property {boolean} updateBaselines - Whether to update baselines on failure
 * @property {Array<string>} viewports - Viewport sizes to test
 */

export class VisualTestRunner {
  /**
   * @param {VisualTestConfig} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      threshold: config.threshold || 0.001, // 0.1% difference allowed
      baselineDir: config.baselineDir || 'tests/e2e/visual/baselines',
      actualDir: config.actualDir || 'tests/e2e/visual/actual',
      diffDir: config.diffDir || 'tests/e2e/visual/diffs',
      updateBaselines: config.updateBaselines || false,
      viewports: config.viewports || [
        '1920x1080', // Desktop
        '1366x768',  // Laptop
        '768x1024',  // Tablet
        '375x667'    // Mobile
      ],
      ...config
    };

    this.capture = new ScreenshotCapture();
    this.differ = new PixelDiff();
    this.reporter = new VisualReport();
    
    this.results = [];
    this.startTime = null;
  }

  /**
   * Run visual tests for a suite
   * @param {Array<Object>} tests - Test definitions
   * @returns {Promise<Object>} Test results
   */
  async runSuite(tests) {
    this.startTime = performance.now();
    this.results = [];

    console.log(`🎨 Starting visual test suite: ${tests.length} tests`);

    for (const test of tests) {
      await this.runTest(test);
    }

    const duration = performance.now() - this.startTime;
    return this.generateReport(duration);
  }

  /**
   * Run a single visual test
   * @param {Object} test - Test definition
   * @returns {Promise<Object>} Test result
   */
  async runTest(test) {
    const { name, url, selector, waitFor, viewports } = test;
    const testViewports = viewports || this.config.viewports;

    console.log(`  Testing: ${name}`);

    const testResults = [];

    for (const viewport of testViewports) {
      const result = await this.runTestAtViewport(test, viewport);
      testResults.push(result);
    }

    const overallResult = {
      name,
      url,
      selector,
      viewports: testResults,
      passed: testResults.every(r => r.passed),
      timestamp: new Date().toISOString()
    };

    this.results.push(overallResult);
    return overallResult;
  }

  /**
   * Run test at specific viewport
   * @param {Object} test - Test definition
   * @param {string} viewport - Viewport size (e.g., '1920x1080')
   * @returns {Promise<Object>} Viewport test result
   */
  async runTestAtViewport(test, viewport) {
    const { name, url, selector, waitFor, maskSelectors } = test;
    const [width, height] = viewport.split('x').map(Number);

    // Set viewport
    await this.setViewport(width, height);

    // Navigate to URL
    await this.navigate(url);

    // Wait for element if specified
    if (waitFor) {
      await this.waitForSelector(waitFor);
    }

    // Capture screenshot
    const filename = this.getFilename(name, viewport);
    const actualPath = `${this.config.actualDir}/${filename}`;
    
    const screenshot = await this.capture.captureElement(selector, {
      maskSelectors: maskSelectors || []
    });

    // Save actual screenshot
    await this.saveScreenshot(actualPath, screenshot);

    // Load baseline
    const baselinePath = `${this.config.baselineDir}/${filename}`;
    const baseline = await this.loadScreenshot(baselinePath);

    if (!baseline) {
      // No baseline exists - save current as baseline
      await this.saveScreenshot(baselinePath, screenshot);
      return {
        viewport,
        status: 'baseline-created',
        passed: true,
        message: 'Baseline screenshot created'
      };
    }

    // Compare screenshots
    const diffResult = await this.differ.compare(baseline, screenshot, {
      threshold: this.config.threshold
    });

    const passed = diffResult.difference <= this.config.threshold;

    if (!passed) {
      // Save diff image
      const diffPath = `${this.config.diffDir}/${filename}`;
      await this.saveScreenshot(diffPath, diffResult.diffImage);

      if (this.config.updateBaselines) {
        await this.saveScreenshot(baselinePath, screenshot);
      }
    }

    return {
      viewport,
      status: passed ? 'passed' : 'failed',
      passed,
      difference: diffResult.difference,
      diffPixels: diffResult.diffPixels,
      totalPixels: diffResult.totalPixels,
      threshold: this.config.threshold,
      actualPath,
      baselinePath,
      diffPath: passed ? null : `${this.config.diffDir}/${filename}`
    };
  }

  /**
   * Set viewport size
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   * @returns {Promise<void>}
   */
  async setViewport(width, height) {
    // In browser environment, resize window
    if (typeof window !== 'undefined') {
      window.resizeTo(width, height);
      // Wait for resize to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Navigate to URL
   * @param {string} url - URL to navigate to
   * @returns {Promise<void>}
   */
  async navigate(url) {
    if (typeof window !== 'undefined') {
      window.location.href = url;
      // Wait for navigation
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve, { once: true });
        }
      });
    }
  }

  /**
   * Wait for selector to appear
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<Element>}
   */
  async waitForSelector(selector, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  /**
   * Generate filename for screenshot
   * @param {string} testName - Test name
   * @param {string} viewport - Viewport size
   * @returns {string} Filename
   */
  getFilename(testName, viewport) {
    const safeName = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const safeViewport = viewport.replace('x', '-');
    return `${safeName}-${safeViewport}.png`;
  }

  /**
   * Save screenshot to file
   * @param {string} path - File path
   * @param {ImageData|Blob} screenshot - Screenshot data
   * @returns {Promise<void>}
   */
  async saveScreenshot(path, screenshot) {
    // In Node.js environment with fs module
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const fs = await import('fs');
      const buffer = screenshot instanceof Blob 
        ? Buffer.from(await screenshot.arrayBuffer())
        : this.imageDataToBuffer(screenshot);
      
      await fs.promises.mkdir(path.substring(0, path.lastIndexOf('/')), { recursive: true });
      await fs.promises.writeFile(path, buffer);
    }
  }

  /**
   * Load screenshot from file
   * @param {string} path - File path
   * @returns {Promise<ImageData|null>} Screenshot data or null if not found
   */
  async loadScreenshot(path) {
    try {
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        const fs = await import('fs');
        const buffer = await fs.promises.readFile(path);
        return this.bufferToImageData(buffer);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
    return null;
  }

  /**
   * Convert ImageData to Buffer
   * @param {ImageData} imageData - Image data
   * @returns {Buffer} PNG buffer
   */
  imageDataToBuffer(imageData) {
    // This would use a PNG encoder in real implementation
    // For now, return raw RGBA data
    return Buffer.from(imageData.data.buffer);
  }

  /**
   * Convert Buffer to ImageData
   * @param {Buffer} buffer - PNG buffer
   * @returns {ImageData} Image data
   */
  bufferToImageData(buffer) {
    // This would use a PNG decoder in real implementation
    // For now, assume raw RGBA data
    const data = new Uint8ClampedArray(buffer);
    const width = Math.sqrt(data.length / 4);
    const height = width;
    return new ImageData(data, width, height);
  }

  /**
   * Generate test report
   * @param {number} duration - Test duration in ms
   * @returns {Object} Test report
   */
  generateReport(duration) {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;

    const report = {
      summary: {
        total: this.results.length,
        passed,
        failed,
        duration: Math.round(duration),
        timestamp: new Date().toISOString()
      },
      results: this.results
    };

    this.reporter.generate(report);

    console.log(`\n✅ Visual tests complete: ${passed}/${this.results.length} passed`);
    if (failed > 0) {
      console.log(`❌ ${failed} tests failed`);
    }

    return report;
  }
}