/**
 * @fileoverview Screenshot Capture - Captures screenshots of elements
 * @module tests/e2e/visual/screenshot-capture
 * 
 * Handles screenshot capture with element selection, masking, and preprocessing.
 * See DESIGN_SYSTEM.md § Testing Strategy > Visual Regression > Screenshot Capture
 */

export class ScreenshotCapture {
  constructor() {
    this.canvas = null;
    this.context = null;
  }

  /**
   * Capture screenshot of element
   * @param {string|Element} target - CSS selector or element
   * @param {Object} options - Capture options
   * @returns {Promise<ImageData>} Screenshot image data
   */
  async captureElement(target, options = {}) {
    const element = typeof target === 'string' 
      ? document.querySelector(target)
      : target;

    if (!element) {
      throw new Error(`Element not found: ${target}`);
    }

    const {
      maskSelectors = [],
      removeSelectors = [],
      waitForAnimations = true,
      waitForFonts = true,
      scale = 1
    } = options;

    // Wait for animations to complete
    if (waitForAnimations) {
      await this.waitForAnimations(element);
    }

    // Wait for fonts to load
    if (waitForFonts) {
      await document.fonts.ready;
    }

    // Get element bounds
    const rect = element.getBoundingClientRect();
    const width = Math.ceil(rect.width * scale);
    const height = Math.ceil(rect.height * scale);

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.context = this.canvas.getContext('2d');

    // Apply scaling
    this.context.scale(scale, scale);

    // Capture element
    await this.drawElement(element, rect, maskSelectors, removeSelectors);

    // Get image data
    const imageData = this.context.getImageData(0, 0, width, height);

    return imageData;
  }

  /**
   * Draw element to canvas
   * @param {Element} element - Element to draw
   * @param {DOMRect} rect - Element bounds
   * @param {Array<string>} maskSelectors - Selectors to mask
   * @param {Array<string>} removeSelectors - Selectors to remove
   * @returns {Promise<void>}
   */
  async drawElement(element, rect, maskSelectors, removeSelectors) {
    // Clone element to avoid modifying DOM
    const clone = element.cloneNode(true);
    
    // Remove elements
    removeSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Apply masks
    maskSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => {
        el.style.backgroundColor = '#000';
        el.style.color = '#000';
      });
    });

    // Convert to SVG foreignObject for rendering
    const svg = this.elementToSVG(clone, rect);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    // Load and draw image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    this.context.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
  }

  /**
   * Convert element to SVG
   * @param {Element} element - Element to convert
   * @param {DOMRect} rect - Element bounds
   * @returns {string} SVG string
   */
  elementToSVG(element, rect) {
    const styles = this.getComputedStyles(element);
    const html = element.outerHTML;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">
            <style>${styles}</style>
            ${html}
          </div>
        </foreignObject>
      </svg>
    `;
  }

  /**
   * Get computed styles for element and children
   * @param {Element} element - Root element
   * @returns {string} CSS string
   */
  getComputedStyles(element) {
    const styles = [];
    const elements = [element, ...element.querySelectorAll('*')];

    elements.forEach((el, index) => {
      const computed = window.getComputedStyle(el);
      const selector = this.generateSelector(el, index);
      
      const cssText = Array.from(computed)
        .map(prop => `${prop}: ${computed.getPropertyValue(prop)}`)
        .join('; ');

      styles.push(`${selector} { ${cssText} }`);
    });

    return styles.join('\n');
  }

  /**
   * Generate CSS selector for element
   * @param {Element} element - Element
   * @param {number} index - Element index
   * @returns {string} CSS selector
   */
  generateSelector(element, index) {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      return `.${element.className.split(' ').join('.')}`;
    }
    return `*:nth-child(${index + 1})`;
  }

  /**
   * Wait for animations to complete
   * @param {Element} element - Element to check
   * @returns {Promise<void>}
   */
  async waitForAnimations(element) {
    const animations = element.getAnimations({ subtree: true });
    
    if (animations.length === 0) {
      return;
    }

    await Promise.all(
      animations.map(animation => animation.finished)
    );

    // Wait one frame for any post-animation updates
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  /**
   * Capture full page screenshot
   * @param {Object} options - Capture options
   * @returns {Promise<ImageData>} Screenshot image data
   */
  async captureFullPage(options = {}) {
    const { scale = 1 } = options;

    const width = Math.ceil(document.documentElement.scrollWidth * scale);
    const height = Math.ceil(document.documentElement.scrollHeight * scale);

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.context = this.canvas.getContext('2d');

    this.context.scale(scale, scale);

    // Capture viewport-by-viewport
    const viewportHeight = window.innerHeight;
    const scrollSteps = Math.ceil(height / viewportHeight);

    for (let i = 0; i < scrollSteps; i++) {
      window.scrollTo(0, i * viewportHeight);
      await new Promise(resolve => setTimeout(resolve, 100));

      const rect = new DOMRect(0, i * viewportHeight, window.innerWidth, viewportHeight);
      await this.drawElement(document.body, rect, [], []);
    }

    const imageData = this.context.getImageData(0, 0, width, height);
    return imageData;
  }
}