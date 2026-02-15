/**
 * @fileoverview Accessibility Quality Gate
 * Validates that components meet accessibility standards.
 * 
 * Requirements:
 * - ARIA attributes present
 * - Keyboard navigation support
 * - Focus management
 * - Color contrast ratios
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#quality-gates
 */

/**
 * Accessibility gate validator
 * @class AccessibilityGate
 */
export class AccessibilityGate {
  constructor() {
    this.results = [];
  }

  /**
   * Validates ARIA attributes
   * @param {HTMLElement} element - Element to validate
   * @returns {Object} Validation result
   */
  validateAria(element) {
    const hasRole = element.hasAttribute('role');
    const hasLabel = element.hasAttribute('aria-label') || 
                     element.hasAttribute('aria-labelledby');
    
    const passed = hasRole || hasLabel;
    const result = {
      gate: 'accessibility-aria',
      passed,
      element: element.tagName,
      message: passed 
        ? 'ARIA attributes present' 
        : 'Missing required ARIA attributes (role or label)'
    };
    this.results.push(result);
    return result;
  }

  /**
   * Validates keyboard navigation
   * @param {HTMLElement} element - Element to validate
   * @returns {Object} Validation result
   */
  validateKeyboard(element) {
    const isInteractive = element.matches('button, a, input, select, textarea, [tabindex]');
    const tabIndex = element.getAttribute('tabindex');
    const isFocusable = isInteractive && (tabIndex === null || parseInt(tabIndex) >= 0);
    
    const passed = !isInteractive || isFocusable;
    const result = {
      gate: 'accessibility-keyboard',
      passed,
      element: element.tagName,
      message: passed 
        ? 'Keyboard navigation supported' 
        : 'Interactive element not keyboard accessible'
    };
    this.results.push(result);
    return result;
  }

  /**
   * Validates color contrast
   * @param {string} foreground - Foreground color (hex)
   * @param {string} background - Background color (hex)
   * @returns {Object} Validation result
   */
  validateContrast(foreground, background) {
    const ratio = this._calculateContrastRatio(foreground, background);
    const passed = ratio >= 4.5; // WCAG AA standard
    
    const result = {
      gate: 'accessibility-contrast',
      passed,
      ratio: ratio.toFixed(2),
      message: passed 
        ? `Contrast ratio ${ratio.toFixed(2)}:1 meets WCAG AA` 
        : `Contrast ratio ${ratio.toFixed(2)}:1 below 4.5:1 minimum`
    };
    this.results.push(result);
    return result;
  }

  /**
   * Calculates contrast ratio between two colors
   * @private
   * @param {string} fg - Foreground color
   * @param {string} bg - Background color
   * @returns {number} Contrast ratio
   */
  _calculateContrastRatio(fg, bg) {
    const l1 = this._getLuminance(fg);
    const l2 = this._getLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Gets relative luminance of a color
   * @private
   * @param {string} color - Hex color
   * @returns {number} Luminance value
   */
  _getLuminance(color) {
    const rgb = this._hexToRgb(color);
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Converts hex color to RGB
   * @private
   * @param {string} hex - Hex color
   * @returns {Array<number>} RGB values
   */
  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  /**
   * Gets all validation results
   * @returns {Array} All results
   */
  getResults() {
    return this.results;
  }

  /**
   * Checks if all gates passed
   * @returns {boolean} True if all passed
   */
  allPassed() {
    return this.results.every(r => r.passed);
  }

  /**
   * Resets validation results
   */
  reset() {
    this.results = [];
  }
}