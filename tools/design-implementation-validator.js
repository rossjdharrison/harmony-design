/**
 * @fileoverview Design-Implementation Validator - Visual regression testing tool
 * Compares rendered components against design specifications (.pen files)
 * 
 * @see DESIGN_SYSTEM.md#visual-regression-testing
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} passed - Whether validation passed
 * @property {number} similarity - Similarity score (0-1)
 * @property {Array<string>} differences - List of detected differences
 * @property {string} componentId - Component identifier
 * @property {string} timestamp - ISO timestamp of validation
 */

/**
 * @typedef {Object} DesignSpec
 * @property {string} componentId - Component identifier
 * @property {Object} expectedStyles - Expected CSS properties
 * @property {Object} expectedDimensions - Expected width/height
 * @property {Array<string>} states - States to validate (default, hover, focus, etc.)
 */

/**
 * Design-Implementation Validator
 * Performs visual regression testing by comparing rendered components
 * against design specifications
 */
export class DesignImplementationValidator {
  constructor() {
    /** @type {Map<string, DesignSpec>} */
    this.designSpecs = new Map();
    
    /** @type {Array<ValidationResult>} */
    this.validationHistory = [];
    
    /** @type {number} */
    this.similarityThreshold = 0.95; // 95% similarity required
    
    /** @type {HTMLCanvasElement} */
    this.canvas = document.createElement('canvas');
    
    /** @type {CanvasRenderingContext2D} */
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Register a design specification for a component
   * @param {string} componentId - Component identifier
   * @param {DesignSpec} spec - Design specification
   */
  registerDesignSpec(componentId, spec) {
    this.designSpecs.set(componentId, {
      componentId,
      ...spec,
      states: spec.states || ['default', 'hover', 'focus', 'active', 'disabled']
    });
  }

  /**
   * Validate a component against its design specification
   * @param {HTMLElement} component - Component to validate
   * @param {string} componentId - Component identifier
   * @param {string} state - Component state to validate
   * @returns {Promise<ValidationResult>}
   */
  async validateComponent(component, componentId, state = 'default') {
    const startTime = performance.now();
    
    const spec = this.designSpecs.get(componentId);
    if (!spec) {
      throw new Error(`No design spec registered for component: ${componentId}`);
    }

    const differences = [];
    
    // Apply state if needed
    await this._applyState(component, state);
    
    // Wait for any transitions to complete
    await this._waitForStability(component);
    
    // Validate styles
    const styleValidation = this._validateStyles(component, spec.expectedStyles);
    if (!styleValidation.passed) {
      differences.push(...styleValidation.differences);
    }
    
    // Validate dimensions
    const dimensionValidation = this._validateDimensions(component, spec.expectedDimensions);
    if (!dimensionValidation.passed) {
      differences.push(...dimensionValidation.differences);
    }
    
    // Calculate visual similarity if baseline exists
    let similarity = 1.0;
    if (spec.baseline) {
      similarity = await this._calculateVisualSimilarity(component, spec.baseline);
      if (similarity < this.similarityThreshold) {
        differences.push(`Visual similarity ${(similarity * 100).toFixed(2)}% below threshold ${(this.similarityThreshold * 100)}%`);
      }
    }
    
    const result = {
      passed: differences.length === 0 && similarity >= this.similarityThreshold,
      similarity,
      differences,
      componentId,
      state,
      timestamp: new Date().toISOString(),
      duration: performance.now() - startTime
    };
    
    this.validationHistory.push(result);
    
    return result;
  }

  /**
   * Validate all states of a component
   * @param {HTMLElement} component - Component to validate
   * @param {string} componentId - Component identifier
   * @returns {Promise<Array<ValidationResult>>}
   */
  async validateAllStates(component, componentId) {
    const spec = this.designSpecs.get(componentId);
    if (!spec) {
      throw new Error(`No design spec registered for component: ${componentId}`);
    }

    const results = [];
    for (const state of spec.states) {
      const result = await this.validateComponent(component, componentId, state);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Capture baseline image for a component
   * @param {HTMLElement} component - Component to capture
   * @param {string} componentId - Component identifier
   * @param {string} state - Component state
   * @returns {Promise<ImageData>}
   */
  async captureBaseline(component, componentId, state = 'default') {
    await this._applyState(component, state);
    await this._waitForStability(component);
    
    const imageData = await this._captureComponentImage(component);
    
    const spec = this.designSpecs.get(componentId);
    if (spec) {
      spec.baseline = spec.baseline || {};
      spec.baseline[state] = imageData;
    }
    
    return imageData;
  }

  /**
   * Apply a state to a component
   * @private
   * @param {HTMLElement} component - Component to modify
   * @param {string} state - State to apply
   */
  async _applyState(component, state) {
    switch (state) {
      case 'hover':
        component.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        break;
      case 'focus':
        component.focus();
        break;
      case 'active':
        component.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        break;
      case 'disabled':
        component.setAttribute('disabled', '');
        break;
      case 'default':
      default:
        // Reset to default state
        component.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        component.blur();
        component.removeAttribute('disabled');
        break;
    }
    
    // Allow a frame for state to apply
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  /**
   * Wait for component to be visually stable (animations complete)
   * @private
   * @param {HTMLElement} component - Component to check
   * @param {number} timeout - Maximum wait time in ms
   */
  async _waitForStability(component, timeout = 1000) {
    const startTime = Date.now();
    let previousImage = null;
    
    while (Date.now() - startTime < timeout) {
      const currentImage = await this._captureComponentImage(component);
      
      if (previousImage) {
        const similarity = this._compareImageData(previousImage, currentImage);
        if (similarity > 0.999) { // 99.9% similar = stable
          return;
        }
      }
      
      previousImage = currentImage;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Validate component styles against specification
   * @private
   * @param {HTMLElement} component - Component to validate
   * @param {Object} expectedStyles - Expected CSS properties
   * @returns {{passed: boolean, differences: Array<string>}}
   */
  _validateStyles(component, expectedStyles) {
    if (!expectedStyles) {
      return { passed: true, differences: [] };
    }

    const differences = [];
    const computedStyle = window.getComputedStyle(component);
    
    for (const [property, expectedValue] of Object.entries(expectedStyles)) {
      const actualValue = computedStyle.getPropertyValue(property);
      
      if (!this._compareStyleValues(actualValue, expectedValue, property)) {
        differences.push(
          `Style mismatch: ${property} - expected "${expectedValue}", got "${actualValue}"`
        );
      }
    }
    
    return {
      passed: differences.length === 0,
      differences
    };
  }

  /**
   * Validate component dimensions against specification
   * @private
   * @param {HTMLElement} component - Component to validate
   * @param {Object} expectedDimensions - Expected dimensions
   * @returns {{passed: boolean, differences: Array<string>}}
   */
  _validateDimensions(component, expectedDimensions) {
    if (!expectedDimensions) {
      return { passed: true, differences: [] };
    }

    const differences = [];
    const rect = component.getBoundingClientRect();
    
    if (expectedDimensions.width !== undefined) {
      const tolerance = expectedDimensions.widthTolerance || 1;
      if (Math.abs(rect.width - expectedDimensions.width) > tolerance) {
        differences.push(
          `Width mismatch: expected ${expectedDimensions.width}px, got ${rect.width}px`
        );
      }
    }
    
    if (expectedDimensions.height !== undefined) {
      const tolerance = expectedDimensions.heightTolerance || 1;
      if (Math.abs(rect.height - expectedDimensions.height) > tolerance) {
        differences.push(
          `Height mismatch: expected ${expectedDimensions.height}px, got ${rect.height}px`
        );
      }
    }
    
    return {
      passed: differences.length === 0,
      differences
    };
  }

  /**
   * Capture component as image data
   * @private
   * @param {HTMLElement} component - Component to capture
   * @returns {Promise<ImageData>}
   */
  async _captureComponentImage(component) {
    const rect = component.getBoundingClientRect();
    
    this.canvas.width = Math.ceil(rect.width);
    this.canvas.height = Math.ceil(rect.height);
    
    // Draw component to canvas
    // Note: This is a simplified implementation. For production, consider using
    // html2canvas or similar library for more accurate rendering
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // For shadow DOM components, we need to capture the rendered output
    const computedStyle = window.getComputedStyle(component);
    this.ctx.fillStyle = computedStyle.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Calculate visual similarity between component and baseline
   * @private
   * @param {HTMLElement} component - Component to compare
   * @param {Object} baseline - Baseline images by state
   * @returns {Promise<number>} Similarity score (0-1)
   */
  async _calculateVisualSimilarity(component, baseline) {
    const currentImage = await this._captureComponentImage(component);
    const baselineImage = baseline.default || baseline;
    
    if (!baselineImage) {
      return 1.0; // No baseline to compare against
    }
    
    return this._compareImageData(currentImage, baselineImage);
  }

  /**
   * Compare two ImageData objects
   * @private
   * @param {ImageData} image1 - First image
   * @param {ImageData} image2 - Second image
   * @returns {number} Similarity score (0-1)
   */
  _compareImageData(image1, image2) {
    if (image1.width !== image2.width || image1.height !== image2.height) {
      return 0;
    }
    
    const data1 = image1.data;
    const data2 = image2.data;
    let differences = 0;
    
    for (let i = 0; i < data1.length; i += 4) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
      const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
      const aDiff = Math.abs(data1[i + 3] - data2[i + 3]);
      
      differences += (rDiff + gDiff + bDiff + aDiff) / (255 * 4);
    }
    
    const totalPixels = data1.length / 4;
    return 1 - (differences / totalPixels);
  }

  /**
   * Compare style values with tolerance for numeric values
   * @private
   * @param {string} actual - Actual value
   * @param {string} expected - Expected value
   * @param {string} property - CSS property name
   * @returns {boolean} Whether values match
   */
  _compareStyleValues(actual, expected, property) {
    // Normalize values
    actual = actual.trim();
    expected = expected.trim();
    
    if (actual === expected) {
      return true;
    }
    
    // For numeric values, allow small tolerance
    const numericProperties = ['width', 'height', 'font-size', 'line-height'];
    if (numericProperties.some(prop => property.includes(prop))) {
      const actualNum = parseFloat(actual);
      const expectedNum = parseFloat(expected);
      if (!isNaN(actualNum) && !isNaN(expectedNum)) {
        return Math.abs(actualNum - expectedNum) < 1; // 1px tolerance
      }
    }
    
    // For colors, normalize and compare
    if (property.includes('color') || property.includes('background')) {
      return this._compareColors(actual, expected);
    }
    
    return false;
  }

  /**
   * Compare color values (handles different formats)
   * @private
   * @param {string} color1 - First color
   * @param {string} color2 - Second color
   * @returns {boolean} Whether colors match
   */
  _compareColors(color1, color2) {
    const rgb1 = this._parseColor(color1);
    const rgb2 = this._parseColor(color2);
    
    if (!rgb1 || !rgb2) {
      return color1 === color2;
    }
    
    // Allow small tolerance for color differences
    return Math.abs(rgb1.r - rgb2.r) <= 2 &&
           Math.abs(rgb1.g - rgb2.g) <= 2 &&
           Math.abs(rgb1.b - rgb2.b) <= 2 &&
           Math.abs(rgb1.a - rgb2.a) <= 0.01;
  }

  /**
   * Parse color string to RGBA values
   * @private
   * @param {string} color - Color string
   * @returns {{r: number, g: number, b: number, a: number}|null}
   */
  _parseColor(color) {
    // Create temporary element to parse color
    const temp = document.createElement('div');
    temp.style.color = color;
    document.body.appendChild(temp);
    const computed = window.getComputedStyle(temp).color;
    document.body.removeChild(temp);
    
    const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] ? parseFloat(match[4]) : 1
      };
    }
    
    return null;
  }

  /**
   * Generate validation report
   * @param {Array<ValidationResult>} results - Validation results
   * @returns {string} HTML report
   */
  generateReport(results = this.validationHistory) {
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const passRate = results.length > 0 ? (passed / results.length * 100).toFixed(2) : 0;
    
    let html = `
      <div class="validation-report">
        <h2>Design-Implementation Validation Report</h2>
        <div class="summary">
          <div class="stat">
            <span class="label">Total Tests:</span>
            <span class="value">${results.length}</span>
          </div>
          <div class="stat">
            <span class="label">Passed:</span>
            <span class="value passed">${passed}</span>
          </div>
          <div class="stat">
            <span class="label">Failed:</span>
            <span class="value failed">${failed}</span>
          </div>
          <div class="stat">
            <span class="label">Pass Rate:</span>
            <span class="value">${passRate}%</span>
          </div>
        </div>
        <div class="results">
    `;
    
    for (const result of results) {
      const statusClass = result.passed ? 'passed' : 'failed';
      html += `
        <div class="result ${statusClass}">
          <div class="result-header">
            <span class="component-id">${result.componentId}</span>
            <span class="state">${result.state}</span>
            <span class="status">${result.passed ? '✓ PASSED' : '✗ FAILED'}</span>
          </div>
          <div class="result-details">
            <div class="similarity">Similarity: ${(result.similarity * 100).toFixed(2)}%</div>
            ${result.differences.length > 0 ? `
              <div class="differences">
                <strong>Differences:</strong>
                <ul>
                  ${result.differences.map(diff => `<li>${diff}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            <div class="meta">
              <span>Duration: ${result.duration.toFixed(2)}ms</span>
              <span>Timestamp: ${result.timestamp}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  }

  /**
   * Export validation results as JSON
   * @returns {string} JSON string
   */
  exportResults() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      similarityThreshold: this.similarityThreshold,
      results: this.validationHistory
    }, null, 2);
  }

  /**
   * Clear validation history
   */
  clearHistory() {
    this.validationHistory = [];
  }
}