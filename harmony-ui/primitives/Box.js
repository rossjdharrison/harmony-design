/**
 * @fileoverview Polymorphic Box Component
 * @module harmony-ui/primitives/Box
 * 
 * A flexible container component that can render as any HTML element via the "as" prop.
 * Provides a foundation for building layout primitives and other components.
 * 
 * Performance considerations:
 * - Uses shadow DOM for style encapsulation
 * - Minimal DOM operations for sub-16ms render budget
 * - CSS custom properties for themeable styling
 * 
 * @see {@link ../../../../DESIGN_SYSTEM.md#polymorphic-box}
 */

/**
 * PolymorphicBox Web Component
 * 
 * @class PolymorphicBox
 * @extends HTMLElement
 * 
 * @attr {string} as - The HTML element to render as (default: 'div')
 * @attr {string} padding - Padding value using design tokens
 * @attr {string} margin - Margin value using design tokens
 * @attr {string} display - CSS display property
 * @attr {string} flex-direction - CSS flex-direction (when display="flex")
 * @attr {string} align-items - CSS align-items
 * @attr {string} justify-content - CSS justify-content
 * @attr {string} gap - Gap between children using design tokens
 * @attr {string} width - Width value
 * @attr {string} height - Height value
 * @attr {string} background - Background color using design tokens
 * @attr {string} border - Border value using design tokens
 * @attr {string} border-radius - Border radius using design tokens
 * 
 * @example
 * <harmony-box as="section" padding="space-4" display="flex" gap="space-2">
 *   <p>Content here</p>
 * </harmony-box>
 * 
 * @example
 * // Create programmatically
 * const box = document.createElement('harmony-box');
 * box.setAttribute('as', 'article');
 * box.setAttribute('padding', 'space-3');
 * box.textContent = 'Dynamic content';
 */
class PolymorphicBox extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   * @static
   * @returns {string[]} List of observed attribute names
   */
  static get observedAttributes() {
    return [
      'as',
      'padding',
      'margin',
      'display',
      'flex-direction',
      'align-items',
      'justify-content',
      'gap',
      'width',
      'height',
      'background',
      'border',
      'border-radius'
    ];
  }

  /**
   * Creates an instance of PolymorphicBox
   * @constructor
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private {HTMLElement|null} The actual rendered element */
    this._renderedElement = null;
    
    /** @private {string} The current element tag name */
    this._currentTag = 'div';
  }

  /**
   * Lifecycle: Component connected to DOM
   * Initializes the component and renders initial state
   */
  connectedCallback() {
    this._render();
  }

  /**
   * Lifecycle: Attribute changed
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'as' && this._renderedElement) {
      // If the element type changes, we need to re-render completely
      this._render();
    } else if (this._renderedElement) {
      // For style changes, just update the styles
      this._updateStyles();
    }
  }

  /**
   * Renders the component structure
   * @private
   */
  _render() {
    const startTime = performance.now();
    
    // Get the desired element tag
    const tag = this.getAttribute('as') || 'div';
    
    // If tag hasn't changed and element exists, just update styles
    if (this._currentTag === tag && this._renderedElement) {
      this._updateStyles();
      return;
    }
    
    // Clear shadow root
    this.shadowRoot.innerHTML = '';
    
    // Create style element
    const style = document.createElement('style');
    style.textContent = this._getStyles();
    this.shadowRoot.appendChild(style);
    
    // Create the actual element
    this._currentTag = tag;
    this._renderedElement = document.createElement(tag);
    this._renderedElement.className = 'box';
    
    // Apply initial styles
    this._updateStyles();
    
    // Add slot for content projection
    const slot = document.createElement('slot');
    this._renderedElement.appendChild(slot);
    
    this.shadowRoot.appendChild(this._renderedElement);
    
    // Performance check
    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`[PolymorphicBox] Render exceeded 16ms budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Updates styles on the rendered element based on current attributes
   * @private
   */
  _updateStyles() {
    if (!this._renderedElement) return;
    
    const styles = {};
    
    // Map attributes to CSS properties
    const padding = this.getAttribute('padding');
    if (padding) styles.padding = `var(--${padding}, ${padding})`;
    
    const margin = this.getAttribute('margin');
    if (margin) styles.margin = `var(--${margin}, ${margin})`;
    
    const display = this.getAttribute('display');
    if (display) styles.display = display;
    
    const flexDirection = this.getAttribute('flex-direction');
    if (flexDirection) styles.flexDirection = flexDirection;
    
    const alignItems = this.getAttribute('align-items');
    if (alignItems) styles.alignItems = alignItems;
    
    const justifyContent = this.getAttribute('justify-content');
    if (justifyContent) styles.justifyContent = justifyContent;
    
    const gap = this.getAttribute('gap');
    if (gap) styles.gap = `var(--${gap}, ${gap})`;
    
    const width = this.getAttribute('width');
    if (width) styles.width = width;
    
    const height = this.getAttribute('height');
    if (height) styles.height = height;
    
    const background = this.getAttribute('background');
    if (background) styles.background = `var(--${background}, ${background})`;
    
    const border = this.getAttribute('border');
    if (border) styles.border = `var(--${border}, ${border})`;
    
    const borderRadius = this.getAttribute('border-radius');
    if (borderRadius) styles.borderRadius = `var(--${borderRadius}, ${borderRadius})`;
    
    // Apply styles
    Object.assign(this._renderedElement.style, styles);
  }

  /**
   * Returns the component styles
   * @private
   * @returns {string} CSS styles
   */
  _getStyles() {
    return `
      :host {
        display: contents;
      }
      
      .box {
        box-sizing: border-box;
      }
      
      /* Default spacing tokens */
      :host {
        --space-1: 0.25rem;
        --space-2: 0.5rem;
        --space-3: 0.75rem;
        --space-4: 1rem;
        --space-5: 1.25rem;
        --space-6: 1.5rem;
        --space-8: 2rem;
        --space-10: 2.5rem;
        --space-12: 3rem;
        --space-16: 4rem;
      }
      
      /* Default border radius tokens */
      :host {
        --radius-sm: 0.125rem;
        --radius-md: 0.25rem;
        --radius-lg: 0.5rem;
        --radius-xl: 1rem;
        --radius-full: 9999px;
      }
    `;
  }

  /**
   * Gets the rendered element for programmatic access
   * @returns {HTMLElement|null} The rendered element
   */
  getElement() {
    return this._renderedElement;
  }

  /**
   * Sets multiple style properties at once
   * @param {Object} styles - Object with style properties
   * @example
   * box.setStyles({ padding: 'space-4', display: 'flex' });
   */
  setStyles(styles) {
    Object.entries(styles).forEach(([key, value]) => {
      // Convert camelCase to kebab-case
      const attrName = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
      this.setAttribute(attrName, value);
    });
  }
}

// Register the custom element
if (!customElements.get('harmony-box')) {
  customElements.define('harmony-box', PolymorphicBox);
}

export default PolymorphicBox;