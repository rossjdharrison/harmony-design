/**
 * @fileoverview Pending State Indicator - Visual feedback for optimistic updates
 * @module primitives/pending-state-indicator
 * 
 * Provides visual indication when operations are in a pending/optimistic state.
 * Integrates with optimistic mutation system to show user feedback.
 * 
 * Performance targets:
 * - Animation: 60fps (16ms per frame)
 * - Memory: < 1MB per instance
 * - Render: < 5ms initial paint
 * 
 * @see ../../DESIGN_SYSTEM.md#pending-state-indicator
 * @see ../state-machine/optimistic-mutation-wrapper.js
 */

/**
 * @typedef {Object} PendingStateConfig
 * @property {'spinner'|'pulse'|'shimmer'|'dot'} variant - Visual style variant
 * @property {'small'|'medium'|'large'} size - Indicator size
 * @property {string} [color] - Custom color (CSS color value)
 * @property {number} [duration] - Animation duration in ms (default: 1000)
 * @property {string} [label] - Accessible label for screen readers
 * @property {boolean} [overlay] - Show as overlay on parent element
 */

/**
 * Pending State Indicator Web Component
 * 
 * Visual indicator for pending optimistic updates with multiple style variants.
 * Automatically manages animation lifecycle and accessibility.
 * 
 * @example
 * ```html
 * <pending-state-indicator 
 *   variant="spinner" 
 *   size="medium"
 *   label="Saving changes">
 * </pending-state-indicator>
 * ```
 * 
 * @example
 * ```javascript
 * const indicator = document.createElement('pending-state-indicator');
 * indicator.setAttribute('variant', 'pulse');
 * indicator.setAttribute('size', 'small');
 * indicator.show();
 * // Later...
 * indicator.hide();
 * ```
 */
class PendingStateIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private {boolean} */
    this._visible = false;
    
    /** @private {number|null} */
    this._animationFrame = null;
    
    /** @private {number} */
    this._startTime = 0;
  }

  /**
   * Observed attributes for reactive updates
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['variant', 'size', 'color', 'duration', 'label', 'overlay', 'visible'];
  }

  /**
   * Component connected to DOM
   * @private
   */
  connectedCallback() {
    this._render();
    if (this.hasAttribute('visible')) {
      this.show();
    }
  }

  /**
   * Component disconnected from DOM
   * @private
   */
  disconnectedCallback() {
    this._stopAnimation();
  }

  /**
   * Attribute changed callback
   * @param {string} name - Attribute name
   * @param {string|null} oldValue - Previous value
   * @param {string|null} newValue - New value
   * @private
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'visible') {
        if (newValue !== null) {
          this.show();
        } else {
          this.hide();
        }
      } else {
        this._render();
      }
    }
  }

  /**
   * Get current variant
   * @returns {string}
   */
  get variant() {
    return this.getAttribute('variant') || 'spinner';
  }

  /**
   * Set variant
   * @param {string} value - Variant name
   */
  set variant(value) {
    this.setAttribute('variant', value);
  }

  /**
   * Get current size
   * @returns {string}
   */
  get size() {
    return this.getAttribute('size') || 'medium';
  }

  /**
   * Set size
   * @param {string} value - Size name
   */
  set size(value) {
    this.setAttribute('size', value);
  }

  /**
   * Get custom color
   * @returns {string|null}
   */
  get color() {
    return this.getAttribute('color');
  }

  /**
   * Set custom color
   * @param {string} value - CSS color value
   */
  set color(value) {
    this.setAttribute('color', value);
  }

  /**
   * Get animation duration
   * @returns {number}
   */
  get duration() {
    return parseInt(this.getAttribute('duration') || '1000', 10);
  }

  /**
   * Set animation duration
   * @param {number} value - Duration in ms
   */
  set duration(value) {
    this.setAttribute('duration', String(value));
  }

  /**
   * Get accessible label
   * @returns {string}
   */
  get label() {
    return this.getAttribute('label') || 'Loading';
  }

  /**
   * Set accessible label
   * @param {string} value - Label text
   */
  set label(value) {
    this.setAttribute('label', value);
  }

  /**
   * Check if overlay mode
   * @returns {boolean}
   */
  get overlay() {
    return this.hasAttribute('overlay');
  }

  /**
   * Set overlay mode
   * @param {boolean} value - Enable overlay
   */
  set overlay(value) {
    if (value) {
      this.setAttribute('overlay', '');
    } else {
      this.removeAttribute('overlay');
    }
  }

  /**
   * Show the indicator
   * @public
   */
  show() {
    if (this._visible) return;
    
    this._visible = true;
    this.setAttribute('visible', '');
    this._startTime = performance.now();
    this._startAnimation();
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('pending-start', {
      bubbles: true,
      composed: true,
      detail: { timestamp: this._startTime }
    }));
  }

  /**
   * Hide the indicator
   * @public
   */
  hide() {
    if (!this._visible) return;
    
    this._visible = false;
    this.removeAttribute('visible');
    this._stopAnimation();
    
    // Dispatch event
    const duration = performance.now() - this._startTime;
    this.dispatchEvent(new CustomEvent('pending-end', {
      bubbles: true,
      composed: true,
      detail: { duration }
    }));
  }

  /**
   * Toggle visibility
   * @public
   */
  toggle() {
    if (this._visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Start animation loop
   * @private
   */
  _startAnimation() {
    if (this.variant === 'spinner' || this.variant === 'pulse') {
      // CSS animations handle these variants
      return;
    }
    
    // For custom animations, use requestAnimationFrame
    const animate = () => {
      if (!this._visible) return;
      
      // Animation logic here if needed
      this._animationFrame = requestAnimationFrame(animate);
    };
    
    this._animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Stop animation loop
   * @private
   */
  _stopAnimation() {
    if (this._animationFrame !== null) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Render component
   * @private
   */
  _render() {
    const variant = this.variant;
    const size = this.size;
    const color = this.color || 'var(--harmony-color-primary, #0066cc)';
    const duration = this.duration;
    const label = this.label;
    const overlay = this.overlay;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
          box-sizing: border-box;
        }

        :host([hidden]) {
          display: none;
        }

        :host(:not([visible])) .indicator {
          opacity: 0;
          pointer-events: none;
        }

        .container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :host([overlay]) .container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(2px);
          z-index: 1000;
        }

        .indicator {
          opacity: 1;
          transition: opacity 200ms ease-in-out;
          will-change: opacity;
        }

        /* Size variants */
        .size-small {
          width: 16px;
          height: 16px;
        }

        .size-medium {
          width: 24px;
          height: 24px;
        }

        .size-large {
          width: 32px;
          height: 32px;
        }

        /* Spinner variant */
        .variant-spinner {
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-top-color: ${color};
          border-radius: 50%;
          animation: spin ${duration}ms linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Pulse variant */
        .variant-pulse {
          background: ${color};
          border-radius: 50%;
          animation: pulse ${duration}ms ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }

        /* Shimmer variant */
        .variant-shimmer {
          background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.1) 0%,
            ${color} 50%,
            rgba(0, 0, 0, 0.1) 100%
          );
          background-size: 200% 100%;
          border-radius: 4px;
          animation: shimmer ${duration}ms linear infinite;
        }

        @keyframes shimmer {
          to { background-position: -200% 0; }
        }

        /* Dot variant */
        .variant-dot {
          display: flex;
          gap: 4px;
          align-items: center;
          justify-content: center;
        }

        .dot {
          width: 25%;
          height: 25%;
          background: ${color};
          border-radius: 50%;
          animation: dot-bounce ${duration}ms ease-in-out infinite;
        }

        .dot:nth-child(2) {
          animation-delay: ${duration / 3}ms;
        }

        .dot:nth-child(3) {
          animation-delay: ${duration / 3 * 2}ms;
        }

        @keyframes dot-bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        /* Accessibility */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* Performance optimizations */
        .indicator {
          contain: layout style paint;
          content-visibility: auto;
        }
      </style>
      
      <div class="container">
        <div 
          class="indicator variant-${variant} size-${size}"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          ${variant === 'dot' ? `
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          ` : ''}
          <span class="sr-only">${label}</span>
        </div>
      </div>
    `;
  }
}

// Register custom element
if (!customElements.get('pending-state-indicator')) {
  customElements.define('pending-state-indicator', PendingStateIndicator);
}

export { PendingStateIndicator };