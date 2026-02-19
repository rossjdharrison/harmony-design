/**
 * @fileoverview FocusRing Atom - Animated focus indicator following design system focus tokens
 * @module primitives/focus-ring
 * 
 * Provides accessible, animated focus indicators that follow WCAG 2.4.7 guidelines.
 * Supports multiple focus styles (outline, ring, glow) with smooth animations.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Focus Management
 * Related Files:
 * - core/focus-tracker.js - Focus state management
 * - tokens/focus.json - Focus design tokens
 */

/**
 * @typedef {Object} FocusRingConfig
 * @property {'outline'|'ring'|'glow'|'none'} style - Focus ring style
 * @property {number} width - Ring width in pixels (default: 2)
 * @property {number} offset - Offset from element in pixels (default: 2)
 * @property {string} color - Focus ring color (default: from tokens)
 * @property {number} animationDuration - Animation duration in ms (default: 200)
 * @property {boolean} visible - Whether ring is currently visible
 * @property {boolean} animated - Whether to animate transitions
 */

/**
 * HarmonyFocusRing - Animated focus indicator component
 * 
 * @class
 * @extends HTMLElement
 * 
 * @example
 * <!-- Basic usage -->
 * <harmony-focus-ring style="outline">
 *   <button>Focusable Element</button>
 * </harmony-focus-ring>
 * 
 * @example
 * <!-- Custom configuration -->
 * <harmony-focus-ring 
 *   style="ring" 
 *   width="3" 
 *   offset="4"
 *   color="var(--focus-color-primary)">
 *   <input type="text" />
 * </harmony-focus-ring>
 * 
 * @fires focus-ring-shown - When focus ring becomes visible
 * @fires focus-ring-hidden - When focus ring becomes hidden
 */
class HarmonyFocusRing extends HTMLElement {
  /**
   * Observed attributes for reactive updates
   * @static
   */
  static get observedAttributes() {
    return ['style', 'width', 'offset', 'color', 'animated', 'visible'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {FocusRingConfig} */
    this._config = {
      style: 'outline',
      width: 2,
      offset: 2,
      color: null, // Will use token default
      animationDuration: 200,
      visible: false,
      animated: true
    };

    /** @type {HTMLElement|null} */
    this._targetElement = null;
    
    /** @type {boolean} */
    this._isKeyboardFocus = false;

    this._handleFocusIn = this._handleFocusIn.bind(this);
    this._handleFocusOut = this._handleFocusOut.bind(this);
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  connectedCallback() {
    this._render();
    this._attachStyles();
    this._setupEventListeners();
    this._findTargetElement();
  }

  disconnectedCallback() {
    this._cleanupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'style':
        this._config.style = newValue || 'outline';
        break;
      case 'width':
        this._config.width = parseInt(newValue, 10) || 2;
        break;
      case 'offset':
        this._config.offset = parseInt(newValue, 10) || 2;
        break;
      case 'color':
        this._config.color = newValue;
        break;
      case 'animated':
        this._config.animated = newValue !== 'false';
        break;
      case 'visible':
        this._config.visible = newValue === 'true';
        break;
    }

    if (this.shadowRoot) {
      this._updateStyles();
    }
  }

  /**
   * Show the focus ring
   * @param {boolean} isKeyboard - Whether focus is from keyboard
   */
  show(isKeyboard = true) {
    this._isKeyboardFocus = isKeyboard;
    this._config.visible = true;
    this.setAttribute('visible', 'true');
    this._updateVisibility();
    
    this.dispatchEvent(new CustomEvent('focus-ring-shown', {
      bubbles: true,
      composed: true,
      detail: { isKeyboard }
    }));
  }

  /**
   * Hide the focus ring
   */
  hide() {
    this._config.visible = false;
    this.setAttribute('visible', 'false');
    this._updateVisibility();
    
    this.dispatchEvent(new CustomEvent('focus-ring-hidden', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Render component structure
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <div class="focus-ring-container">
        <div class="focus-ring" part="ring"></div>
        <div class="content">
          <slot></slot>
        </div>
      </div>
    `;
  }

  /**
   * Attach component styles
   * @private
   */
  _attachStyles() {
    const style = document.createElement('style');
    style.textContent = this._getStyles();
    this.shadowRoot.appendChild(style);
  }

  /**
   * Generate component styles
   * @private
   * @returns {string} CSS styles
   */
  _getStyles() {
    const {
      style: ringStyle,
      width,
      offset,
      color,
      animationDuration,
      animated
    } = this._config;

    const focusColor = color || 'var(--focus-color-primary, #0066cc)';
    const transition = animated ? `all ${animationDuration}ms ease-out` : 'none';

    return `
      :host {
        display: inline-block;
        position: relative;
        --focus-ring-color: ${focusColor};
        --focus-ring-width: ${width}px;
        --focus-ring-offset: ${offset}px;
        --focus-animation-duration: ${animationDuration}ms;
      }

      .focus-ring-container {
        position: relative;
        display: inline-block;
      }

      .focus-ring {
        position: absolute;
        top: calc(-1 * var(--focus-ring-offset));
        left: calc(-1 * var(--focus-ring-offset));
        right: calc(-1 * var(--focus-ring-offset));
        bottom: calc(-1 * var(--focus-ring-offset));
        pointer-events: none;
        opacity: 0;
        transform: scale(0.95);
        transition: ${transition};
        border-radius: inherit;
      }

      /* Outline style */
      :host([style="outline"]) .focus-ring {
        border: var(--focus-ring-width) solid var(--focus-ring-color);
        border-radius: 4px;
      }

      /* Ring style (rounded) */
      :host([style="ring"]) .focus-ring {
        border: var(--focus-ring-width) solid var(--focus-ring-color);
        border-radius: 50%;
      }

      /* Glow style (box-shadow) */
      :host([style="glow"]) .focus-ring {
        box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color),
                    0 0 8px 2px var(--focus-ring-color);
        border-radius: 4px;
      }

      /* None style (no visible ring, but still manages focus) */
      :host([style="none"]) .focus-ring {
        display: none;
      }

      /* Visible state */
      :host([visible="true"]) .focus-ring {
        opacity: 1;
        transform: scale(1);
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .focus-ring {
          border-width: calc(var(--focus-ring-width) + 1px);
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .focus-ring {
          transition: none;
        }
      }

      .content {
        position: relative;
        z-index: 1;
      }

      /* Ensure slotted content doesn't interfere */
      ::slotted(*) {
        outline: none !important;
      }
    `;
  }

  /**
   * Update styles dynamically
   * @private
   */
  _updateStyles() {
    const styleElement = this.shadowRoot.querySelector('style');
    if (styleElement) {
      styleElement.textContent = this._getStyles();
    }
  }

  /**
   * Update visibility state
   * @private
   */
  _updateVisibility() {
    const ring = this.shadowRoot.querySelector('.focus-ring');
    if (ring) {
      ring.style.opacity = this._config.visible ? '1' : '0';
      ring.style.transform = this._config.visible ? 'scale(1)' : 'scale(0.95)';
    }
  }

  /**
   * Find and store reference to target element
   * @private
   */
  _findTargetElement() {
    const slot = this.shadowRoot.querySelector('slot');
    if (slot) {
      const elements = slot.assignedElements();
      this._targetElement = elements[0] || null;
    }
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen on host element for slotted content
    this.addEventListener('focusin', this._handleFocusIn);
    this.addEventListener('focusout', this._handleFocusOut);
    this.addEventListener('mousedown', this._handleMouseDown);
    this.addEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Cleanup event listeners
   * @private
   */
  _cleanupEventListeners() {
    this.removeEventListener('focusin', this._handleFocusIn);
    this.removeEventListener('focusout', this._handleFocusOut);
    this.removeEventListener('mousedown', this._handleMouseDown);
    this.removeEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Handle focus in event
   * @private
   * @param {FocusEvent} event
   */
  _handleFocusIn(event) {
    // Show ring for keyboard focus
    this.show(this._isKeyboardFocus);
  }

  /**
   * Handle focus out event
   * @private
   * @param {FocusEvent} event
   */
  _handleFocusOut(event) {
    this.hide();
    this._isKeyboardFocus = false;
  }

  /**
   * Handle mouse down event
   * @private
   * @param {MouseEvent} event
   */
  _handleMouseDown(event) {
    // Mouse interaction - not keyboard focus
    this._isKeyboardFocus = false;
  }

  /**
   * Handle key down event
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    // Tab or arrow keys indicate keyboard navigation
    if (event.key === 'Tab' || event.key.startsWith('Arrow')) {
      this._isKeyboardFocus = true;
    }
  }
}

// Register custom element
customElements.define('harmony-focus-ring', HarmonyFocusRing);

export default HarmonyFocusRing;