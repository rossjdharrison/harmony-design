/**
 * @fileoverview Harmony Text Component - Styled text primitive with semantic variants
 * @module primitives/harmony-text
 * 
 * Semantic variants: heading (h1-h6), body (large, default, small), label, caption
 * 
 * Performance: Uses CSS containment and will-change hints for optimal rendering
 * Accessibility: Proper semantic HTML elements, respects user font preferences
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#text-component}
 */

/**
 * HarmonyText - Styled text component with semantic variants
 * 
 * @example
 * <harmony-text variant="h1">Main Heading</harmony-text>
 * <harmony-text variant="body">Regular paragraph text</harmony-text>
 * <harmony-text variant="label" weight="semibold">Form Label</harmony-text>
 * <harmony-text variant="caption" color="secondary">Helper text</harmony-text>
 * 
 * @fires harmony-text:mounted - When component is connected to DOM
 * 
 * @attr {string} variant - Text variant: h1, h2, h3, h4, h5, h6, body-large, body, body-small, label, caption
 * @attr {string} weight - Font weight: light, regular, medium, semibold, bold
 * @attr {string} align - Text alignment: left, center, right, justify
 * @attr {string} color - Color variant: primary, secondary, tertiary, error, success, warning
 * @attr {string} as - Override semantic element (use sparingly for accessibility)
 * @attr {boolean} truncate - Enable single-line truncation with ellipsis
 * @attr {boolean} mono - Use monospace font family
 */
class HarmonyText extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {string} Current variant */
    this._variant = 'body';
    
    /** @type {string} Current font weight */
    this._weight = 'regular';
    
    /** @type {string} Text alignment */
    this._align = 'left';
    
    /** @type {string} Color variant */
    this._color = 'primary';
    
    /** @type {boolean} Truncation enabled */
    this._truncate = false;
    
    /** @type {boolean} Monospace font */
    this._mono = false;
  }

  /**
   * Observed attributes for change detection
   * @returns {string[]} List of observed attribute names
   */
  static get observedAttributes() {
    return ['variant', 'weight', 'align', 'color', 'as', 'truncate', 'mono'];
  }

  /**
   * Map variant to semantic HTML element
   * @param {string} variant - Text variant
   * @returns {string} HTML element tag name
   * @private
   */
  _getSemanticElement(variant) {
    const elementMap = {
      'h1': 'h1',
      'h2': 'h2',
      'h3': 'h3',
      'h4': 'h4',
      'h5': 'h5',
      'h6': 'h6',
      'body-large': 'p',
      'body': 'p',
      'body-small': 'p',
      'label': 'span',
      'caption': 'span'
    };
    
    return elementMap[variant] || 'span';
  }

  /**
   * Get CSS variables for typography tokens
   * @returns {string} CSS custom properties
   * @private
   */
  _getTypographyTokens() {
    return `
      --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Courier New', monospace;
      
      --font-size-h1: 2.5rem;
      --font-size-h2: 2rem;
      --font-size-h3: 1.5rem;
      --font-size-h4: 1.25rem;
      --font-size-h5: 1.125rem;
      --font-size-h6: 1rem;
      --font-size-body-large: 1.125rem;
      --font-size-body: 1rem;
      --font-size-body-small: 0.875rem;
      --font-size-label: 0.875rem;
      --font-size-caption: 0.75rem;
      
      --font-weight-light: 300;
      --font-weight-regular: 400;
      --font-weight-medium: 500;
      --font-weight-semibold: 600;
      --font-weight-bold: 700;
      
      --line-height-tight: 1.2;
      --line-height-normal: 1.5;
      --line-height-relaxed: 1.75;
      
      --letter-spacing-tight: -0.02em;
      --letter-spacing-normal: 0;
      --letter-spacing-wide: 0.02em;
      
      --color-text-primary: #1a1a1a;
      --color-text-secondary: #666666;
      --color-text-tertiary: #999999;
      --color-text-error: #d32f2f;
      --color-text-success: #388e3c;
      --color-text-warning: #f57c00;
    `;
  }

  /**
   * Render component styles
   * @returns {string} CSS styles
   * @private
   */
  _getStyles() {
    return `
      :host {
        ${this._getTypographyTokens()}
        display: block;
        contain: layout style;
      }

      :host([hidden]) {
        display: none;
      }

      .text {
        margin: 0;
        padding: 0;
        font-family: var(--font-family-base);
        color: var(--color-text-primary);
        text-align: left;
      }

      /* Monospace font */
      :host([mono]) .text {
        font-family: var(--font-family-mono);
      }

      /* Variants - Font Size & Line Height */
      .text.h1 {
        font-size: var(--font-size-h1);
        line-height: var(--line-height-tight);
        letter-spacing: var(--letter-spacing-tight);
        font-weight: var(--font-weight-bold);
      }

      .text.h2 {
        font-size: var(--font-size-h2);
        line-height: var(--line-height-tight);
        letter-spacing: var(--letter-spacing-tight);
        font-weight: var(--font-weight-bold);
      }

      .text.h3 {
        font-size: var(--font-size-h3);
        line-height: var(--line-height-tight);
        font-weight: var(--font-weight-semibold);
      }

      .text.h4 {
        font-size: var(--font-size-h4);
        line-height: var(--line-height-normal);
        font-weight: var(--font-weight-semibold);
      }

      .text.h5 {
        font-size: var(--font-size-h5);
        line-height: var(--line-height-normal);
        font-weight: var(--font-weight-semibold);
      }

      .text.h6 {
        font-size: var(--font-size-h6);
        line-height: var(--line-height-normal);
        font-weight: var(--font-weight-semibold);
      }

      .text.body-large {
        font-size: var(--font-size-body-large);
        line-height: var(--line-height-normal);
      }

      .text.body {
        font-size: var(--font-size-body);
        line-height: var(--line-height-normal);
      }

      .text.body-small {
        font-size: var(--font-size-body-small);
        line-height: var(--line-height-normal);
      }

      .text.label {
        font-size: var(--font-size-label);
        line-height: var(--line-height-normal);
        font-weight: var(--font-weight-medium);
      }

      .text.caption {
        font-size: var(--font-size-caption);
        line-height: var(--line-height-relaxed);
      }

      /* Font Weights */
      .text.weight-light { font-weight: var(--font-weight-light); }
      .text.weight-regular { font-weight: var(--font-weight-regular); }
      .text.weight-medium { font-weight: var(--font-weight-medium); }
      .text.weight-semibold { font-weight: var(--font-weight-semibold); }
      .text.weight-bold { font-weight: var(--font-weight-bold); }

      /* Text Alignment */
      .text.align-left { text-align: left; }
      .text.align-center { text-align: center; }
      .text.align-right { text-align: right; }
      .text.align-justify { text-align: justify; }

      /* Color Variants */
      .text.color-primary { color: var(--color-text-primary); }
      .text.color-secondary { color: var(--color-text-secondary); }
      .text.color-tertiary { color: var(--color-text-tertiary); }
      .text.color-error { color: var(--color-text-error); }
      .text.color-success { color: var(--color-text-success); }
      .text.color-warning { color: var(--color-text-warning); }

      /* Truncation */
      .text.truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        :host {
          --color-text-primary: #ffffff;
          --color-text-secondary: #b3b3b3;
          --color-text-tertiary: #808080;
          --color-text-error: #ef5350;
          --color-text-success: #66bb6a;
          --color-text-warning: #ffa726;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .text {
          transition: none;
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .text {
          font-weight: var(--font-weight-medium);
        }
      }
    `;
  }

  /**
   * Render component HTML
   * @private
   */
  _render() {
    const variant = this.getAttribute('variant') || 'body';
    const weight = this.getAttribute('weight') || 'regular';
    const align = this.getAttribute('align') || 'left';
    const color = this.getAttribute('color') || 'primary';
    const customElement = this.getAttribute('as');
    const truncate = this.hasAttribute('truncate');
    
    const element = customElement || this._getSemanticElement(variant);
    
    const classes = [
      'text',
      variant,
      `weight-${weight}`,
      `align-${align}`,
      `color-${color}`,
      truncate ? 'truncate' : ''
    ].filter(Boolean).join(' ');

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <${element} class="${classes}" part="text">
        <slot></slot>
      </${element}>
    `;
  }

  /**
   * Called when component is connected to DOM
   */
  connectedCallback() {
    this._render();
    
    // Dispatch mounted event for debugging/testing
    this.dispatchEvent(new CustomEvent('harmony-text:mounted', {
      bubbles: true,
      composed: true,
      detail: {
        variant: this.getAttribute('variant') || 'body',
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Called when observed attribute changes
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.shadowRoot) {
      this._render();
    }
  }
}

// Register custom element
if (!customElements.get('harmony-text')) {
  customElements.define('harmony-text', HarmonyText);
}

export default HarmonyText;