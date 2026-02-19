/**
 * @fileoverview Harmony Spinner - Loading indicator atom with size variants
 * @module primitives/spinner
 * 
 * Spinner component provides visual feedback during loading states.
 * Supports multiple size variants and follows design system tokens.
 * 
 * Related documentation: DESIGN_SYSTEM.md § Primitives > Spinner
 * 
 * @example
 * <harmony-spinner size="medium"></harmony-spinner>
 * <harmony-spinner size="small" aria-label="Loading content"></harmony-spinner>
 */

/**
 * HarmonySpinner - Loading indicator web component
 * 
 * @class HarmonySpinner
 * @extends HTMLElement
 * 
 * @attr {string} size - Size variant: 'small' | 'medium' | 'large' (default: 'medium')
 * @attr {string} aria-label - Accessible label for screen readers
 * 
 * @fires spinner-mounted - Dispatched when component is connected to DOM
 * 
 * Performance:
 * - Uses CSS animations (GPU-accelerated)
 * - Shadow DOM for style encapsulation
 * - No JavaScript animation loops
 * - Target: 60fps animation performance
 */
class HarmonySpinner extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   * @returns {string[]} List of observed attribute names
   */
  static get observedAttributes() {
    return ['size', 'aria-label'];
  }

  /**
   * Size configuration mapping
   * @private
   */
  static #sizeConfig = {
    small: {
      diameter: '16px',
      borderWidth: '2px'
    },
    medium: {
      diameter: '32px',
      borderWidth: '3px'
    },
    large: {
      diameter: '48px',
      borderWidth: '4px'
    }
  };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._mounted = false;
  }

  /**
   * Component lifecycle - connected to DOM
   * Initializes component and dispatches mounted event
   */
  connectedCallback() {
    this._render();
    this._mounted = true;
    
    // Publish mounted event to EventBus pattern
    this.dispatchEvent(new CustomEvent('spinner-mounted', {
      bubbles: true,
      composed: true,
      detail: {
        size: this.size,
        timestamp: performance.now()
      }
    }));
  }

  /**
   * Component lifecycle - attribute changed
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) {
      this._render();
    }
  }

  /**
   * Get current size variant
   * @returns {string} Size variant
   */
  get size() {
    const size = this.getAttribute('size') || 'medium';
    return HarmonySpinner.#sizeConfig[size] ? size : 'medium';
  }

  /**
   * Set size variant
   * @param {string} value - Size variant
   */
  set size(value) {
    if (HarmonySpinner.#sizeConfig[value]) {
      this.setAttribute('size', value);
    }
  }

  /**
   * Render component to shadow DOM
   * @private
   */
  _render() {
    const size = this.size;
    const config = HarmonySpinner.#sizeConfig[size];
    const ariaLabel = this.getAttribute('aria-label') || 'Loading';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          contain: layout style paint;
        }

        .spinner {
          width: ${config.diameter};
          height: ${config.diameter};
          border: ${config.borderWidth} solid var(--color-border-subtle, #e0e0e0);
          border-top-color: var(--color-primary, #0066cc);
          border-radius: 50%;
          animation: spinner-rotate 0.8s linear infinite;
          will-change: transform;
        }

        @keyframes spinner-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation-duration: 2s;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .spinner {
            border-color: CanvasText;
            border-top-color: Highlight;
          }
        }
      </style>
      <div 
        class="spinner" 
        role="status" 
        aria-label="${ariaLabel}"
        aria-live="polite"
      ></div>
    `;
  }
}

// Register custom element
if (!customElements.get('harmony-spinner')) {
  customElements.define('harmony-spinner', HarmonySpinner);
}

export { HarmonySpinner };