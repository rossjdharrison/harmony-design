/**
 * @fileoverview Material-style ripple effect atom component
 * @module primitives/harmony-ripple
 * 
 * Provides an animated ripple effect for user interactions following Material Design principles.
 * Optimized for 60fps performance with GPU acceleration.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#ripple-atom} for usage documentation
 * 
 * Performance targets:
 * - Animation: 60fps (16ms budget per frame)
 * - Memory: <1MB per instance
 * - GPU-accelerated transforms
 */

/**
 * Material-style ripple effect component
 * 
 * @class HarmonyRipple
 * @extends HTMLElement
 * 
 * @example
 * ```html
 * <harmony-ripple color="rgba(255,255,255,0.3)" duration="600"></harmony-ripple>
 * ```
 * 
 * @fires ripple-start - Emitted when ripple animation begins
 * @fires ripple-end - Emitted when ripple animation completes
 * 
 * @attr {string} color - Ripple color (default: rgba(255,255,255,0.3))
 * @attr {number} duration - Animation duration in ms (default: 600)
 * @attr {boolean} centered - Center ripple instead of origin point (default: false)
 * @attr {boolean} unbounded - Allow ripple to extend beyond container (default: false)
 * @attr {boolean} disabled - Disable ripple effect (default: false)
 */
class HarmonyRipple extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Set<HTMLElement>} Active ripple elements */
    this._activeRipples = new Set();
    
    /** @type {number} Animation frame ID for cleanup */
    this._animationFrameId = null;
    
    /** @type {boolean} Component mounted state */
    this._mounted = false;
  }

  static get observedAttributes() {
    return ['color', 'duration', 'centered', 'unbounded', 'disabled'];
  }

  connectedCallback() {
    this._mounted = true;
    this._render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._mounted = false;
    this._detachEventListeners();
    this._clearAllRipples();
    
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._mounted) {
      this._render();
    }
  }

  /**
   * Render component template and styles
   * @private
   */
  _render() {
    const color = this.getAttribute('color') || 'rgba(255, 255, 255, 0.3)';
    const duration = this.getAttribute('duration') || '600';
    const unbounded = this.hasAttribute('unbounded');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: ${unbounded ? 'visible' : 'hidden'};
          border-radius: inherit;
          contain: layout style paint;
        }

        :host([disabled]) {
          display: none;
        }

        .ripple-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          border-radius: inherit;
        }

        .ripple {
          position: absolute;
          border-radius: 50%;
          background-color: ${color};
          transform: scale(0);
          opacity: 1;
          pointer-events: none;
          will-change: transform, opacity;
        }

        .ripple.animating {
          animation: ripple-expand ${duration}ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes ripple-expand {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        /* GPU acceleration hint */
        .ripple {
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      </style>
      <div class="ripple-container" part="container"></div>
    `;
  }

  /**
   * Attach event listeners for ripple triggers
   * @private
   */
  _attachEventListeners() {
    // Listen on parent element for interaction events
    const parent = this.parentElement;
    if (!parent) return;

    this._boundHandlePointerDown = this._handlePointerDown.bind(this);
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);

    parent.addEventListener('pointerdown', this._boundHandlePointerDown);
    parent.addEventListener('keydown', this._boundHandleKeyDown);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const parent = this.parentElement;
    if (!parent) return;

    if (this._boundHandlePointerDown) {
      parent.removeEventListener('pointerdown', this._boundHandlePointerDown);
    }
    if (this._boundHandleKeyDown) {
      parent.removeEventListener('keydown', this._boundHandleKeyDown);
    }
  }

  /**
   * Handle pointer down events
   * @private
   * @param {PointerEvent} event
   */
  _handlePointerDown(event) {
    if (this.hasAttribute('disabled')) return;
    
    const rect = this.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.createRipple(x, y);
  }

  /**
   * Handle keyboard events (Space/Enter)
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    if (this.hasAttribute('disabled')) return;
    
    if (event.key === ' ' || event.key === 'Enter') {
      // Center ripple for keyboard activation
      const rect = this.getBoundingClientRect();
      const x = rect.width / 2;
      const y = rect.height / 2;
      
      this.createRipple(x, y);
    }
  }

  /**
   * Create and animate a ripple at the specified position
   * @public
   * @param {number} x - X coordinate relative to component
   * @param {number} y - Y coordinate relative to component
   * @returns {HTMLElement} The created ripple element
   */
  createRipple(x, y) {
    const container = this.shadowRoot.querySelector('.ripple-container');
    if (!container) return null;

    const rect = this.getBoundingClientRect();
    const centered = this.hasAttribute('centered');
    const duration = parseInt(this.getAttribute('duration') || '600', 10);

    // Calculate ripple size to cover entire container
    const rippleX = centered ? rect.width / 2 : x;
    const rippleY = centered ? rect.height / 2 : y;
    
    const maxDistanceX = Math.max(rippleX, rect.width - rippleX);
    const maxDistanceY = Math.max(rippleY, rect.height - rippleY);
    const rippleSize = Math.sqrt(maxDistanceX ** 2 + maxDistanceY ** 2) * 2;

    // Create ripple element
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.width = `${rippleSize}px`;
    ripple.style.height = `${rippleSize}px`;
    ripple.style.left = `${rippleX - rippleSize / 2}px`;
    ripple.style.top = `${rippleY - rippleSize / 2}px`;

    container.appendChild(ripple);
    this._activeRipples.add(ripple);

    // Emit start event
    this.dispatchEvent(new CustomEvent('ripple-start', {
      bubbles: true,
      composed: true,
      detail: { x: rippleX, y: rippleY, size: rippleSize }
    }));

    // Trigger animation on next frame
    this._animationFrameId = requestAnimationFrame(() => {
      ripple.classList.add('animating');
    });

    // Remove ripple after animation completes
    setTimeout(() => {
      this._removeRipple(ripple);
    }, duration);

    return ripple;
  }

  /**
   * Remove a specific ripple element
   * @private
   * @param {HTMLElement} ripple
   */
  _removeRipple(ripple) {
    if (!ripple || !ripple.parentElement) return;

    this._activeRipples.delete(ripple);
    ripple.remove();

    // Emit end event
    this.dispatchEvent(new CustomEvent('ripple-end', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Clear all active ripples
   * @private
   */
  _clearAllRipples() {
    this._activeRipples.forEach(ripple => {
      ripple.remove();
    });
    this._activeRipples.clear();
  }

  /**
   * Programmatically trigger a centered ripple
   * @public
   */
  trigger() {
    const rect = this.getBoundingClientRect();
    this.createRipple(rect.width / 2, rect.height / 2);
  }

  /**
   * Clear all active ripples immediately
   * @public
   */
  clear() {
    this._clearAllRipples();
  }
}

// Register custom element
if (!customElements.get('harmony-ripple')) {
  customElements.define('harmony-ripple', HarmonyRipple);
}

export { HarmonyRipple };