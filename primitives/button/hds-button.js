/**
 * @fileoverview Button primitive component with toggle/momentary modes
 * See harmony-design/DESIGN_SYSTEM.md#button-primitive for usage and design notes
 */

/**
 * Button primitive web component supporting toggle and momentary interaction modes.
 * 
 * @element hds-button
 * 
 * @attr {string} mode - Interaction mode: "momentary" (default) or "toggle"
 * @attr {boolean} pressed - Whether button is in pressed state (toggle mode only)
 * @attr {boolean} disabled - Whether button is disabled
 * @attr {string} variant - Visual variant: "primary", "secondary", "tertiary" (default: "primary")
 * @attr {string} size - Size variant: "small", "medium" (default), "large"
 * 
 * @fires button-press - Fired when button is pressed (both modes)
 * @fires button-release - Fired when button is released (momentary mode only)
 * @fires button-toggle - Fired when button toggles state (toggle mode only)
 * 
 * @example
 * <!-- Momentary button (default) -->
 * <hds-button>Click Me</hds-button>
 * 
 * @example
 * <!-- Toggle button -->
 * <hds-button mode="toggle" pressed>Mute</hds-button>
 */
class HdsButton extends HTMLElement {
  static get observedAttributes() {
    return ['mode', 'pressed', 'disabled', 'variant', 'size'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._mode = 'momentary';
    this._pressed = false;
    this._disabled = false;
    this._variant = 'primary';
    this._size = 'medium';
    
    // Event handlers bound to this instance
    this._handlePointerDown = this._handlePointerDown.bind(this);
    this._handlePointerUp = this._handlePointerUp.bind(this);
    this._handlePointerLeave = this._handlePointerLeave.bind(this);
    this._handleClick = this._handleClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
    
    // Make button focusable
    if (!this.hasAttribute('tabindex') && !this._disabled) {
      this.setAttribute('tabindex', '0');
    }
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'mode':
        this._mode = newValue === 'toggle' ? 'toggle' : 'momentary';
        break;
      case 'pressed':
        this._pressed = newValue !== null;
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        if (this._disabled) {
          this.setAttribute('tabindex', '-1');
        } else if (!this.hasAttribute('tabindex')) {
          this.setAttribute('tabindex', '0');
        }
        break;
      case 'variant':
        this._variant = ['primary', 'secondary', 'tertiary'].includes(newValue) 
          ? newValue 
          : 'primary';
        break;
      case 'size':
        this._size = ['small', 'medium', 'large'].includes(newValue) 
          ? newValue 
          : 'medium';
        break;
    }
    
    this._updateState();
  }

  /**
   * Render the button's shadow DOM structure and styles
   * @private
   */
  _render() {
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

        button {
          all: unset;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 500;
          cursor: pointer;
          user-select: none;
          border-radius: 8px;
          transition: background-color 120ms ease-out, 
                      transform 80ms ease-out,
                      box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), 
                      0 0 0 1px rgba(102, 126, 234, 0);
        }
        
        button:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 
                      0 0 0 2px rgba(102, 126, 234, 0.4);
          transform: translateY(-1px);
        }
        
        button:active:not(:disabled) {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 
                      0 0 0 2px rgba(102, 126, 234, 0.6);
          transform: translateY(0);
        }

        /* Size variants */
        button.small {
          padding: 6px 12px;
          font-size: 13px;
          line-height: 16px;
          min-height: 28px;
        }

        button.medium {
          padding: 10px 20px;
          font-size: 14px;
          line-height: 20px;
          min-height: 40px;
        }

        button.large {
          padding: 14px 28px;
          font-size: 16px;
          line-height: 24px;
          min-height: 52px;
        }

        /* Primary variant */
        button.primary {
          background-color: #2563eb;
          color: #ffffff;
        }

        button.primary:hover:not(:disabled) {
          background-color: #1d4ed8;
        }

        button.primary:active:not(:disabled),
        button.primary.pressed {
          background-color: #1e40af;
          transform: scale(0.98);
        }

        /* Secondary variant */
        button.secondary {
          background-color: #e5e7eb;
          color: #1f2937;
        }

        button.secondary:hover:not(:disabled) {
          background-color: #d1d5db;
        }

        button.secondary:active:not(:disabled),
        button.secondary.pressed {
          background-color: #9ca3af;
          transform: scale(0.98);
        }

        /* Tertiary variant */
        button.tertiary {
          background-color: transparent;
          color: #2563eb;
          border: 1px solid #2563eb;
        }

        button.tertiary:hover:not(:disabled) {
          background-color: #eff6ff;
        }

        button.tertiary:active:not(:disabled),
        button.tertiary.pressed {
          background-color: #dbeafe;
          transform: scale(0.98);
        }

        /* Focus state */
        button:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        /* Disabled state */
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Pressed state indicator for toggle mode */
        button.pressed::before {
          content: '';
          position: absolute;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.1);
          pointer-events: none;
        }

        /* Slot content */
        ::slotted(*) {
          pointer-events: none;
        }
      </style>
      <button 
        part="button"
        class="${this._variant} ${this._size} ${this._pressed ? 'pressed' : ''}"
        ?disabled="${this._disabled}"
        aria-pressed="${this._mode === 'toggle' ? this._pressed : undefined}"
      >
        <slot></slot>
      </button>
    `;
  }

  /**
   * Update button state after attribute changes
   * @private
   */
  _updateState() {
    const button = this.shadowRoot.querySelector('button');
    if (!button) return;

    button.className = `${this._variant} ${this._size} ${this._pressed ? 'pressed' : ''}`;
    button.disabled = this._disabled;
    
    if (this._mode === 'toggle') {
      button.setAttribute('aria-pressed', this._pressed);
    } else {
      button.removeAttribute('aria-pressed');
    }
  }

  /**
   * Attach event listeners to button
   * @private
   */
  _attachEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    if (!button) return;

    button.addEventListener('pointerdown', this._handlePointerDown);
    button.addEventListener('pointerup', this._handlePointerUp);
    button.addEventListener('pointerleave', this._handlePointerLeave);
    button.addEventListener('click', this._handleClick);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('keyup', this._handleKeyUp);
  }

  /**
   * Detach event listeners from button
   * @private
   */
  _detachEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    if (!button) return;

    button.removeEventListener('pointerdown', this._handlePointerDown);
    button.removeEventListener('pointerup', this._handlePointerUp);
    button.removeEventListener('pointerleave', this._handlePointerLeave);
    button.removeEventListener('click', this._handleClick);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('keyup', this._handleKeyUp);
  }

  /**
   * Handle pointer down event
   * @private
   */
  _handlePointerDown(event) {
    if (this._disabled) return;
    
    // Visual feedback for momentary mode
    if (this._mode === 'momentary') {
      const button = this.shadowRoot.querySelector('button');
      button.classList.add('pressed');
    }
  }

  /**
   * Handle pointer up event
   * @private
   */
  _handlePointerUp(event) {
    if (this._disabled) return;
    
    // Remove visual feedback for momentary mode
    if (this._mode === 'momentary') {
      const button = this.shadowRoot.querySelector('button');
      button.classList.remove('pressed');
    }
  }

  /**
   * Handle pointer leave event
   * @private
   */
  _handlePointerLeave(event) {
    if (this._disabled) return;
    
    // Remove visual feedback for momentary mode if pointer leaves
    if (this._mode === 'momentary') {
      const button = this.shadowRoot.querySelector('button');
      button.classList.remove('pressed');
    }
  }

  /**
   * Handle click event
   * @private
   */
  _handleClick(event) {
    if (this._disabled) return;

    if (this._mode === 'toggle') {
      // Toggle mode: flip pressed state
      this._pressed = !this._pressed;
      this.setAttribute('pressed', this._pressed ? '' : null);
      
      this._dispatchButtonEvent('button-toggle', {
        pressed: this._pressed
      });
    } else {
      // Momentary mode: emit press and release
      this._dispatchButtonEvent('button-press', {});
      
      // Release event fired after a microtask to ensure proper ordering
      Promise.resolve().then(() => {
        this._dispatchButtonEvent('button-release', {});
      });
    }
  }

  /**
   * Handle key down event (Space/Enter)
   * @private
   */
  _handleKeyDown(event) {
    if (this._disabled) return;
    
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      
      if (this._mode === 'momentary') {
        const button = this.shadowRoot.querySelector('button');
        button.classList.add('pressed');
        
        this._dispatchButtonEvent('button-press', {});
      }
    }
  }

  /**
   * Handle key up event (Space/Enter)
   * @private
   */
  _handleKeyUp(event) {
    if (this._disabled) return;
    
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      
      if (this._mode === 'toggle') {
        this._pressed = !this._pressed;
        this.setAttribute('pressed', this._pressed ? '' : null);
        
        this._dispatchButtonEvent('button-toggle', {
          pressed: this._pressed
        });
      } else {
        const button = this.shadowRoot.querySelector('button');
        button.classList.remove('pressed');
        
        this._dispatchButtonEvent('button-release', {});
      }
    }
  }

  /**
   * Dispatch a custom button event
   * @private
   * @param {string} eventType - Type of event to dispatch
   * @param {Object} detail - Event detail payload
   */
  _dispatchButtonEvent(eventType, detail) {
    const event = new CustomEvent(eventType, {
      detail: {
        ...detail,
        mode: this._mode,
        variant: this._variant,
        size: this._size,
        timestamp: performance.now()
      },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
    
    // Log to console for debugging
    console.debug(`[hds-button] ${eventType}`, event.detail);
  }

  /**
   * Programmatically press the button (momentary mode only)
   * @public
   */
  press() {
    if (this._disabled || this._mode !== 'momentary') return;
    
    this._dispatchButtonEvent('button-press', {});
  }

  /**
   * Programmatically release the button (momentary mode only)
   * @public
   */
  release() {
    if (this._disabled || this._mode !== 'momentary') return;
    
    this._dispatchButtonEvent('button-release', {});
  }

  /**
   * Programmatically toggle the button (toggle mode only)
   * @public
   */
  toggle() {
    if (this._disabled || this._mode !== 'toggle') return;
    
    this._pressed = !this._pressed;
    this.setAttribute('pressed', this._pressed ? '' : null);
    
    this._dispatchButtonEvent('button-toggle', {
      pressed: this._pressed
    });
  }
}

// Register the custom element
customElements.define('hds-button', HdsButton);

export { HdsButton };