/**
 * @fileoverview Harmony Tooltip - Floating hint with arrow, placement, and delay options
 * @module primitives/tooltip/harmony-tooltip
 * 
 * Performance Budget:
 * - Render: <16ms per frame (60fps)
 * - Memory: <1MB per instance
 * - Initial load: <50ms
 * 
 * Features:
 * - Multiple placement options (top, bottom, left, right)
 * - Configurable show/hide delays
 * - Arrow pointer with automatic positioning
 * - Automatic boundary detection and flip
 * - Keyboard accessible (ESC to close)
 * - GPU-accelerated animations
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#tooltip-atom}
 */

/**
 * @typedef {Object} TooltipPosition
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {string} placement - Final placement after boundary checks
 */

/**
 * HarmonyTooltip - Floating hint component with arrow and smart positioning
 * 
 * @class
 * @extends HTMLElement
 * 
 * @attr {string} text - Tooltip text content
 * @attr {string} placement - Preferred placement (top|bottom|left|right)
 * @attr {number} show-delay - Delay before showing (ms)
 * @attr {number} hide-delay - Delay before hiding (ms)
 * @attr {boolean} disabled - Disable tooltip
 * @attr {number} offset - Distance from target element (px)
 * 
 * @example
 * <button id="myButton">Hover me</button>
 * <harmony-tooltip 
 *   for="myButton"
 *   text="This is a helpful hint"
 *   placement="top"
 *   show-delay="500">
 * </harmony-tooltip>
 */
class HarmonyTooltip extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._targetElement = null;
    this._showTimeout = null;
    this._hideTimeout = null;
    this._isVisible = false;
    this._currentPlacement = 'top';
    
    // Bind methods
    this._handleMouseEnter = this._handleMouseEnter.bind(this);
    this._handleMouseLeave = this._handleMouseLeave.bind(this);
    this._handleFocus = this._handleFocus.bind(this);
    this._handleBlur = this._handleBlur.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._updatePosition = this._updatePosition.bind(this);
  }

  static get observedAttributes() {
    return ['text', 'placement', 'show-delay', 'hide-delay', 'disabled', 'offset', 'for'];
  }

  connectedCallback() {
    this._render();
    this._attachTarget();
    
    // Listen for window resize to reposition
    window.addEventListener('resize', this._updatePosition);
    window.addEventListener('scroll', this._updatePosition, true);
  }

  disconnectedCallback() {
    this._detachTarget();
    this._clearTimeouts();
    window.removeEventListener('resize', this._updatePosition);
    window.removeEventListener('scroll', this._updatePosition, true);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'for') {
      this._detachTarget();
      this._attachTarget();
    } else if (name === 'text') {
      this._updateContent();
    } else if (name === 'disabled' && newValue !== null) {
      this.hide();
    }
  }

  /**
   * Attach event listeners to target element
   * @private
   */
  _attachTarget() {
    const targetId = this.getAttribute('for');
    if (!targetId) {
      // If no 'for' attribute, use previous sibling
      this._targetElement = this.previousElementSibling;
    } else {
      this._targetElement = document.getElementById(targetId);
    }

    if (!this._targetElement) {
      console.warn('HarmonyTooltip: Target element not found', targetId);
      return;
    }

    this._targetElement.addEventListener('mouseenter', this._handleMouseEnter);
    this._targetElement.addEventListener('mouseleave', this._handleMouseLeave);
    this._targetElement.addEventListener('focus', this._handleFocus);
    this._targetElement.addEventListener('blur', this._handleBlur);
    this._targetElement.addEventListener('keydown', this._handleKeyDown);
    
    // Make target focusable if not already
    if (!this._targetElement.hasAttribute('tabindex') && 
        !['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(this._targetElement.tagName)) {
      this._targetElement.setAttribute('tabindex', '0');
    }
  }

  /**
   * Detach event listeners from target element
   * @private
   */
  _detachTarget() {
    if (!this._targetElement) return;

    this._targetElement.removeEventListener('mouseenter', this._handleMouseEnter);
    this._targetElement.removeEventListener('mouseleave', this._handleMouseLeave);
    this._targetElement.removeEventListener('focus', this._handleFocus);
    this._targetElement.removeEventListener('blur', this._handleBlur);
    this._targetElement.removeEventListener('keydown', this._handleKeyDown);
    
    this._targetElement = null;
  }

  /**
   * Handle mouse enter on target
   * @private
   */
  _handleMouseEnter() {
    if (this.hasAttribute('disabled')) return;
    this._scheduleShow();
  }

  /**
   * Handle mouse leave from target
   * @private
   */
  _handleMouseLeave() {
    this._scheduleHide();
  }

  /**
   * Handle focus on target
   * @private
   */
  _handleFocus() {
    if (this.hasAttribute('disabled')) return;
    this._scheduleShow();
  }

  /**
   * Handle blur on target
   * @private
   */
  _handleBlur() {
    this._scheduleHide();
  }

  /**
   * Handle keyboard events
   * @private
   * @param {KeyboardEvent} e
   */
  _handleKeyDown(e) {
    if (e.key === 'Escape' && this._isVisible) {
      this.hide();
    }
  }

  /**
   * Schedule tooltip to show after delay
   * @private
   */
  _scheduleShow() {
    this._clearTimeouts();
    const delay = parseInt(this.getAttribute('show-delay') || '0', 10);
    
    this._showTimeout = setTimeout(() => {
      this.show();
    }, delay);
  }

  /**
   * Schedule tooltip to hide after delay
   * @private
   */
  _scheduleHide() {
    this._clearTimeouts();
    const delay = parseInt(this.getAttribute('hide-delay') || '0', 10);
    
    this._hideTimeout = setTimeout(() => {
      this.hide();
    }, delay);
  }

  /**
   * Clear all pending timeouts
   * @private
   */
  _clearTimeouts() {
    if (this._showTimeout) {
      clearTimeout(this._showTimeout);
      this._showTimeout = null;
    }
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }
  }

  /**
   * Show the tooltip
   * @public
   */
  show() {
    if (this._isVisible || this.hasAttribute('disabled')) return;
    
    this._isVisible = true;
    this._updatePosition();
    
    const container = this.shadowRoot.querySelector('.tooltip-container');
    container.classList.add('visible');
    
    this.dispatchEvent(new CustomEvent('tooltip-show', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Hide the tooltip
   * @public
   */
  hide() {
    if (!this._isVisible) return;
    
    this._isVisible = false;
    const container = this.shadowRoot.querySelector('.tooltip-container');
    container.classList.remove('visible');
    
    this.dispatchEvent(new CustomEvent('tooltip-hide', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Calculate optimal tooltip position
   * @private
   * @returns {TooltipPosition}
   */
  _calculatePosition() {
    if (!this._targetElement) {
      return { x: 0, y: 0, placement: 'top' };
    }

    const targetRect = this._targetElement.getBoundingClientRect();
    const container = this.shadowRoot.querySelector('.tooltip-container');
    const tooltipRect = container.getBoundingClientRect();
    const offset = parseInt(this.getAttribute('offset') || '8', 10);
    const arrowSize = 6;
    
    let placement = this.getAttribute('placement') || 'top';
    let x = 0;
    let y = 0;

    // Calculate position based on placement
    switch (placement) {
      case 'top':
        x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        y = targetRect.top - tooltipRect.height - offset - arrowSize;
        break;
      case 'bottom':
        x = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        y = targetRect.bottom + offset + arrowSize;
        break;
      case 'left':
        x = targetRect.left - tooltipRect.width - offset - arrowSize;
        y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        break;
      case 'right':
        x = targetRect.right + offset + arrowSize;
        y = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        break;
    }

    // Boundary detection and flip
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    // Check if tooltip goes outside viewport and flip if needed
    if (placement === 'top' && y < padding) {
      placement = 'bottom';
      y = targetRect.bottom + offset + arrowSize;
    } else if (placement === 'bottom' && y + tooltipRect.height > viewportHeight - padding) {
      placement = 'top';
      y = targetRect.top - tooltipRect.height - offset - arrowSize;
    } else if (placement === 'left' && x < padding) {
      placement = 'right';
      x = targetRect.right + offset + arrowSize;
    } else if (placement === 'right' && x + tooltipRect.width > viewportWidth - padding) {
      placement = 'left';
      x = targetRect.left - tooltipRect.width - offset - arrowSize;
    }

    // Constrain to viewport
    x = Math.max(padding, Math.min(x, viewportWidth - tooltipRect.width - padding));
    y = Math.max(padding, Math.min(y, viewportHeight - tooltipRect.height - padding));

    return { x, y, placement };
  }

  /**
   * Update tooltip position
   * @private
   */
  _updatePosition() {
    if (!this._isVisible) return;

    const { x, y, placement } = this._calculatePosition();
    this._currentPlacement = placement;

    const container = this.shadowRoot.querySelector('.tooltip-container');
    container.style.transform = `translate(${x}px, ${y}px)`;
    container.setAttribute('data-placement', placement);
  }

  /**
   * Update tooltip text content
   * @private
   */
  _updateContent() {
    const content = this.shadowRoot.querySelector('.tooltip-content');
    if (content) {
      content.textContent = this.getAttribute('text') || '';
    }
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    const text = this.getAttribute('text') || '';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 10000;
          pointer-events: none;
        }

        .tooltip-container {
          position: absolute;
          top: 0;
          left: 0;
          opacity: 0;
          transform-origin: center;
          transition: opacity 0.2s ease, transform 0.2s ease;
          will-change: transform, opacity;
          pointer-events: none;
        }

        .tooltip-container.visible {
          opacity: 1;
        }

        .tooltip-content {
          background: var(--harmony-color-surface-elevated, #2a2a2a);
          color: var(--harmony-color-text-primary, #ffffff);
          padding: var(--harmony-spacing-xs, 6px) var(--harmony-spacing-sm, 12px);
          border-radius: var(--harmony-radius-sm, 4px);
          font-size: var(--harmony-font-size-sm, 13px);
          line-height: 1.4;
          max-width: 240px;
          word-wrap: break-word;
          box-shadow: var(--harmony-shadow-md, 0 4px 12px rgba(0, 0, 0, 0.3));
          position: relative;
        }

        .tooltip-arrow {
          position: absolute;
          width: 12px;
          height: 12px;
          background: var(--harmony-color-surface-elevated, #2a2a2a);
          transform: rotate(45deg);
        }

        /* Arrow positioning based on placement */
        .tooltip-container[data-placement="top"] .tooltip-arrow {
          bottom: -4px;
          left: 50%;
          margin-left: -6px;
        }

        .tooltip-container[data-placement="bottom"] .tooltip-arrow {
          top: -4px;
          left: 50%;
          margin-left: -6px;
        }

        .tooltip-container[data-placement="left"] .tooltip-arrow {
          right: -4px;
          top: 50%;
          margin-top: -6px;
        }

        .tooltip-container[data-placement="right"] .tooltip-arrow {
          left: -4px;
          top: 50%;
          margin-top: -6px;
        }

        /* Animation variants */
        .tooltip-container[data-placement="top"].visible {
          animation: slideInTop 0.2s ease;
        }

        .tooltip-container[data-placement="bottom"].visible {
          animation: slideInBottom 0.2s ease;
        }

        .tooltip-container[data-placement="left"].visible {
          animation: slideInLeft 0.2s ease;
        }

        .tooltip-container[data-placement="right"].visible {
          animation: slideInRight 0.2s ease;
        }

        @keyframes slideInTop {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInBottom {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(4px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .tooltip-container {
            transition: opacity 0.1s ease;
          }

          .tooltip-container[data-placement].visible {
            animation: none;
          }
        }
      </style>

      <div class="tooltip-container" data-placement="top">
        <div class="tooltip-content">${text}</div>
        <div class="tooltip-arrow"></div>
      </div>
    `;
  }
}

customElements.define('harmony-tooltip', HarmonyTooltip);

export default HarmonyTooltip;