/**
 * @fileoverview Polymorphic Button Component
 * @module components/polymorphic/PolymorphicButton
 * 
 * A button component that can render as different HTML elements using the "as" prop.
 * Supports rendering as <button>, <a>, or any custom element while maintaining
 * button semantics and accessibility.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Polymorphic Components
 * 
 * @example
 * // Render as button (default)
 * <harmony-polymorphic-button>Click me</harmony-polymorphic-button>
 * 
 * @example
 * // Render as anchor link
 * <harmony-polymorphic-button as="a" href="/path">Link Button</harmony-polymorphic-button>
 * 
 * @example
 * // Render as custom element
 * <harmony-polymorphic-button as="custom-element">Custom</harmony-polymorphic-button>
 */

/**
 * PolymorphicButton Web Component
 * 
 * Provides a button that can morph into different HTML elements while maintaining
 * consistent styling and behavior patterns. Handles accessibility attributes,
 * event delegation, and proper semantic structure.
 * 
 * Performance Budget:
 * - Render time: < 2ms (within 16ms frame budget)
 * - Memory footprint: < 5KB per instance
 * 
 * @class PolymorphicButton
 * @extends HTMLElement
 */
class PolymorphicButton extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   * @returns {string[]} List of attributes to observe
   */
  static get observedAttributes() {
    return [
      'as',
      'variant',
      'size',
      'disabled',
      'href',
      'target',
      'rel',
      'type',
      'aria-label',
      'aria-pressed',
      'aria-expanded'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /**
     * @private
     * @type {HTMLElement|null}
     */
    this._renderedElement = null;

    /**
     * @private
     * @type {boolean}
     */
    this._isInitialized = false;
  }

  connectedCallback() {
    if (!this._isInitialized) {
      this._render();
      this._attachEventListeners();
      this._isInitialized = true;
    }
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  /**
   * Handles attribute changes
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._isInitialized) return;
    
    if (oldValue !== newValue) {
      // If 'as' changes, we need to re-render the entire component
      if (name === 'as') {
        this._render();
        this._attachEventListeners();
      } else {
        this._updateAttribute(name, newValue);
      }
    }
  }

  /**
   * Renders the component structure
   * @private
   */
  _render() {
    const startTime = performance.now();
    
    const elementType = this.getAttribute('as') || 'button';
    const variant = this.getAttribute('variant') || 'primary';
    const size = this.getAttribute('size') || 'medium';
    const disabled = this.hasAttribute('disabled');

    // Create the polymorphic element
    const element = document.createElement(elementType);
    element.classList.add('button');
    element.classList.add(`button--${variant}`);
    element.classList.add(`button--${size}`);
    
    if (disabled) {
      element.classList.add('button--disabled');
    }

    // Set appropriate attributes based on element type
    this._applyAttributes(element, elementType);

    // Slot for content
    const slot = document.createElement('slot');
    element.appendChild(slot);

    // Clear and update shadow DOM
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(this._createStyles());
    this.shadowRoot.appendChild(element);

    this._renderedElement = element;

    // Performance tracking
    const renderTime = performance.now() - startTime;
    if (renderTime > 2) {
      console.warn(`PolymorphicButton render exceeded budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Applies appropriate attributes to the rendered element
   * @private
   * @param {HTMLElement} element - The element to apply attributes to
   * @param {string} elementType - The type of element being rendered
   */
  _applyAttributes(element, elementType) {
    const disabled = this.hasAttribute('disabled');

    if (elementType === 'button') {
      element.setAttribute('type', this.getAttribute('type') || 'button');
      if (disabled) {
        element.setAttribute('disabled', '');
      }
    } else if (elementType === 'a') {
      const href = this.getAttribute('href');
      const target = this.getAttribute('target');
      const rel = this.getAttribute('rel');

      if (href) {
        element.setAttribute('href', href);
      }
      if (target) {
        element.setAttribute('target', target);
        // Security: Add rel="noopener noreferrer" for external links
        if (target === '_blank' && !rel) {
          element.setAttribute('rel', 'noopener noreferrer');
        }
      }
      if (rel) {
        element.setAttribute('rel', rel);
      }
      if (disabled) {
        element.setAttribute('aria-disabled', 'true');
        element.setAttribute('tabindex', '-1');
      }
    } else {
      // Custom element
      if (disabled) {
        element.setAttribute('aria-disabled', 'true');
        element.setAttribute('tabindex', '-1');
      } else {
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
      }
    }

    // Apply ARIA attributes
    const ariaLabel = this.getAttribute('aria-label');
    const ariaPressed = this.getAttribute('aria-pressed');
    const ariaExpanded = this.getAttribute('aria-expanded');

    if (ariaLabel) {
      element.setAttribute('aria-label', ariaLabel);
    }
    if (ariaPressed !== null) {
      element.setAttribute('aria-pressed', ariaPressed);
    }
    if (ariaExpanded !== null) {
      element.setAttribute('aria-expanded', ariaExpanded);
    }
  }

  /**
   * Updates a single attribute on the rendered element
   * @private
   * @param {string} name - Attribute name
   * @param {string|null} value - Attribute value
   */
  _updateAttribute(name, value) {
    if (!this._renderedElement) return;

    const elementType = this.getAttribute('as') || 'button';

    switch (name) {
      case 'variant':
        this._renderedElement.className = this._renderedElement.className
          .replace(/button--\w+(?=\s|$)/g, '')
          .trim();
        this._renderedElement.classList.add('button');
        this._renderedElement.classList.add(`button--${value || 'primary'}`);
        this._renderedElement.classList.add(`button--${this.getAttribute('size') || 'medium'}`);
        break;

      case 'size':
        this._renderedElement.className = this._renderedElement.className
          .replace(/button--\w+(?=\s|$)/g, '')
          .trim();
        this._renderedElement.classList.add('button');
        this._renderedElement.classList.add(`button--${this.getAttribute('variant') || 'primary'}`);
        this._renderedElement.classList.add(`button--${value || 'medium'}`);
        break;

      case 'disabled':
        if (value !== null) {
          this._renderedElement.classList.add('button--disabled');
          if (elementType === 'button') {
            this._renderedElement.setAttribute('disabled', '');
          } else {
            this._renderedElement.setAttribute('aria-disabled', 'true');
            this._renderedElement.setAttribute('tabindex', '-1');
          }
        } else {
          this._renderedElement.classList.remove('button--disabled');
          if (elementType === 'button') {
            this._renderedElement.removeAttribute('disabled');
          } else {
            this._renderedElement.removeAttribute('aria-disabled');
            this._renderedElement.setAttribute('tabindex', '0');
          }
        }
        break;

      case 'href':
        if (elementType === 'a' && value) {
          this._renderedElement.setAttribute('href', value);
        }
        break;

      case 'target':
        if (elementType === 'a' && value) {
          this._renderedElement.setAttribute('target', value);
        }
        break;

      case 'rel':
        if (elementType === 'a' && value) {
          this._renderedElement.setAttribute('rel', value);
        }
        break;

      case 'type':
        if (elementType === 'button' && value) {
          this._renderedElement.setAttribute('type', value);
        }
        break;

      case 'aria-label':
      case 'aria-pressed':
      case 'aria-expanded':
        if (value !== null) {
          this._renderedElement.setAttribute(name, value);
        } else {
          this._renderedElement.removeAttribute(name);
        }
        break;
    }
  }

  /**
   * Attaches event listeners to the rendered element
   * @private
   */
  _attachEventListeners() {
    if (!this._renderedElement) return;

    const elementType = this.getAttribute('as') || 'button';

    // Handle click events
    this._handleClick = this._onClick.bind(this);
    this._renderedElement.addEventListener('click', this._handleClick);

    // Handle keyboard events for custom elements
    if (elementType !== 'button' && elementType !== 'a') {
      this._handleKeydown = this._onKeydown.bind(this);
      this._renderedElement.addEventListener('keydown', this._handleKeydown);
    }
  }

  /**
   * Detaches event listeners
   * @private
   */
  _detachEventListeners() {
    if (this._renderedElement) {
      if (this._handleClick) {
        this._renderedElement.removeEventListener('click', this._handleClick);
      }
      if (this._handleKeydown) {
        this._renderedElement.removeEventListener('keydown', this._handleKeydown);
      }
    }
  }

  /**
   * Handles click events
   * @private
   * @param {MouseEvent} event - Click event
   */
  _onClick(event) {
    const disabled = this.hasAttribute('disabled');
    
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Dispatch custom event for application logic
    this.dispatchEvent(new CustomEvent('button-click', {
      bubbles: true,
      composed: true,
      detail: {
        originalEvent: event,
        elementType: this.getAttribute('as') || 'button'
      }
    }));
  }

  /**
   * Handles keyboard events for custom elements
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _onKeydown(event) {
    const disabled = this.hasAttribute('disabled');
    
    if (disabled) {
      return;
    }

    // Space or Enter should trigger button action
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this._renderedElement.click();
    }
  }

  /**
   * Creates component styles
   * @private
   * @returns {HTMLStyleElement} Style element
   */
  _createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
        font-weight: 500;
        line-height: 1.5;
        text-align: center;
        text-decoration: none;
        white-space: nowrap;
        vertical-align: middle;
        user-select: none;
        border: 1px solid transparent;
        border-radius: var(--border-radius-md, 4px);
        cursor: pointer;
        transition: all 0.2s ease-in-out;
        outline: none;
      }

      .button:focus-visible {
        outline: 2px solid var(--color-focus, #0066cc);
        outline-offset: 2px;
      }

      /* Sizes */
      .button--small {
        padding: 0.25rem 0.75rem;
        font-size: 0.875rem;
        min-height: 2rem;
      }

      .button--medium {
        padding: 0.5rem 1rem;
        font-size: 1rem;
        min-height: 2.5rem;
      }

      .button--large {
        padding: 0.75rem 1.5rem;
        font-size: 1.125rem;
        min-height: 3rem;
      }

      /* Variants */
      .button--primary {
        color: var(--color-button-primary-text, #ffffff);
        background-color: var(--color-button-primary-bg, #0066cc);
        border-color: var(--color-button-primary-border, #0066cc);
      }

      .button--primary:hover:not(.button--disabled) {
        background-color: var(--color-button-primary-hover-bg, #0052a3);
        border-color: var(--color-button-primary-hover-border, #0052a3);
      }

      .button--primary:active:not(.button--disabled) {
        background-color: var(--color-button-primary-active-bg, #003d7a);
        border-color: var(--color-button-primary-active-border, #003d7a);
      }

      .button--secondary {
        color: var(--color-button-secondary-text, #0066cc);
        background-color: var(--color-button-secondary-bg, transparent);
        border-color: var(--color-button-secondary-border, #0066cc);
      }

      .button--secondary:hover:not(.button--disabled) {
        background-color: var(--color-button-secondary-hover-bg, #e6f2ff);
        border-color: var(--color-button-secondary-hover-border, #0052a3);
      }

      .button--secondary:active:not(.button--disabled) {
        background-color: var(--color-button-secondary-active-bg, #cce5ff);
        border-color: var(--color-button-secondary-active-border, #003d7a);
      }

      .button--ghost {
        color: var(--color-button-ghost-text, #333333);
        background-color: var(--color-button-ghost-bg, transparent);
        border-color: var(--color-button-ghost-border, transparent);
      }

      .button--ghost:hover:not(.button--disabled) {
        background-color: var(--color-button-ghost-hover-bg, #f5f5f5);
      }

      .button--ghost:active:not(.button--disabled) {
        background-color: var(--color-button-ghost-active-bg, #e0e0e0);
      }

      .button--danger {
        color: var(--color-button-danger-text, #ffffff);
        background-color: var(--color-button-danger-bg, #dc3545);
        border-color: var(--color-button-danger-border, #dc3545);
      }

      .button--danger:hover:not(.button--disabled) {
        background-color: var(--color-button-danger-hover-bg, #c82333);
        border-color: var(--color-button-danger-hover-border, #c82333);
      }

      .button--danger:active:not(.button--disabled) {
        background-color: var(--color-button-danger-active-bg, #bd2130);
        border-color: var(--color-button-danger-active-border, #bd2130);
      }

      /* Disabled state */
      .button--disabled {
        opacity: 0.6;
        cursor: not-allowed;
        pointer-events: none;
      }

      /* Link-specific styles */
      a.button {
        text-decoration: none;
      }

      a.button[aria-disabled="true"] {
        pointer-events: none;
      }
    `;
    return style;
  }

  /**
   * Public API: Programmatically trigger button click
   * @public
   */
  click() {
    if (this._renderedElement && !this.hasAttribute('disabled')) {
      this._renderedElement.click();
    }
  }

  /**
   * Public API: Focus the button
   * @public
   */
  focus() {
    if (this._renderedElement) {
      this._renderedElement.focus();
    }
  }

  /**
   * Public API: Blur the button
   * @public
   */
  blur() {
    if (this._renderedElement) {
      this._renderedElement.blur();
    }
  }
}

// Register the custom element
if (!customElements.get('harmony-polymorphic-button')) {
  customElements.define('harmony-polymorphic-button', PolymorphicButton);
}

export default PolymorphicButton;