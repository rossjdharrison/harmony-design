/**
 * Touch-Friendly Button Component
 * Provides accessible button with appropriate touch targets (44px minimum)
 * Automatically adapts size based on pointer type (coarse vs fine)
 * @see DESIGN_SYSTEM.md#touch-friendly-variants
 */

class TouchButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['variant', 'size', 'disabled', 'icon-only', 'aria-label'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Renders the button with touch-friendly sizing
   * @private
   */
  render() {
    const variant = this.getAttribute('variant') || 'primary';
    const size = this.getAttribute('size') || 'comfortable';
    const disabled = this.hasAttribute('disabled');
    const iconOnly = this.hasAttribute('icon-only');
    const ariaLabel = this.getAttribute('aria-label') || '';

    this.shadowRoot.innerHTML = `
      <style>
        @import url('/styles/touch-friendly.css');

        :host {
          display: inline-block;
        }

        button {
          all: unset;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--target-spacing);
          border-radius: 8px;
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 500;
          transition: all 0.15s ease;
          cursor: pointer;
          position: relative;
          -webkit-tap-highlight-color: transparent;
        }

        /* Size variants */
        button.size-minimum {
          min-width: var(--touch-target-minimum);
          min-height: var(--touch-target-minimum);
          padding: var(--touch-spacing-minimum) calc(var(--touch-spacing-minimum) * 2);
          font-size: var(--touch-font-minimum);
        }

        button.size-comfortable {
          min-width: var(--touch-target-comfortable);
          min-height: var(--touch-target-comfortable);
          padding: var(--touch-spacing-comfortable) calc(var(--touch-spacing-comfortable) * 2);
          font-size: var(--touch-font-comfortable);
        }

        button.size-spacious {
          min-width: var(--touch-target-spacious);
          min-height: var(--touch-target-spacious);
          padding: var(--touch-spacing-spacious) calc(var(--touch-spacing-spacious) * 2);
          font-size: var(--touch-font-spacious);
        }

        /* Icon-only buttons are square */
        button.icon-only.size-minimum {
          width: var(--touch-target-minimum);
          height: var(--touch-target-minimum);
          padding: 0;
        }

        button.icon-only.size-comfortable {
          width: var(--touch-target-comfortable);
          height: var(--touch-target-comfortable);
          padding: 0;
        }

        button.icon-only.size-spacious {
          width: var(--touch-target-spacious);
          height: var(--touch-target-spacious);
          padding: 0;
        }

        /* Color variants */
        button.variant-primary {
          background: #0066cc;
          color: white;
        }

        button.variant-secondary {
          background: #6c757d;
          color: white;
        }

        button.variant-outline {
          background: transparent;
          color: #0066cc;
          border: 2px solid #0066cc;
        }

        button.variant-ghost {
          background: transparent;
          color: #333;
        }

        button.variant-danger {
          background: #dc3545;
          color: white;
        }

        /* Hover states (pointer devices only) */
        @media (hover: hover) {
          button.variant-primary:hover:not(:disabled) {
            background: #0052a3;
          }

          button.variant-secondary:hover:not(:disabled) {
            background: #5a6268;
          }

          button.variant-outline:hover:not(:disabled) {
            background: rgba(0, 102, 204, 0.1);
          }

          button.variant-ghost:hover:not(:disabled) {
            background: rgba(0, 0, 0, 0.05);
          }

          button.variant-danger:hover:not(:disabled) {
            background: #c82333;
          }
        }

        /* Active/pressed state */
        button:active:not(:disabled) {
          transform: scale(0.98);
        }

        /* Focus visible for keyboard navigation */
        button:focus-visible {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }

        /* Disabled state */
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Ripple effect container */
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          transform: scale(0);
          animation: ripple-animation 0.6s ease-out;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      </style>

      <button
        class="size-${size} variant-${variant} ${iconOnly ? 'icon-only' : ''}"
        ${disabled ? 'disabled' : ''}
        ${ariaLabel ? `aria-label="${ariaLabel}"` : ''}
        part="button"
      >
        <slot></slot>
      </button>
    `;
  }

  /**
   * Sets up event listeners for touch feedback
   * @private
   */
  setupEventListeners() {
    this._button = this.shadowRoot.querySelector('button');
    this._handleClick = this.handleClick.bind(this);
    this._handlePointerDown = this.handlePointerDown.bind(this);
    
    this._button.addEventListener('click', this._handleClick);
    this._button.addEventListener('pointerdown', this._handlePointerDown);
  }

  /**
   * Removes event listeners
   * @private
   */
  removeEventListeners() {
    if (this._button) {
      this._button.removeEventListener('click', this._handleClick);
      this._button.removeEventListener('pointerdown', this._handlePointerDown);
    }
  }

  /**
   * Handles click events and dispatches custom event
   * @param {Event} event - Click event
   * @private
   */
  handleClick(event) {
    if (this.hasAttribute('disabled')) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.dispatchEvent(new CustomEvent('touch-button-click', {
      bubbles: true,
      composed: true,
      detail: {
        timestamp: Date.now(),
        pointerType: event.pointerType
      }
    }));
  }

  /**
   * Creates ripple effect on touch/click
   * @param {PointerEvent} event - Pointer down event
   * @private
   */
  handlePointerDown(event) {
    if (this.hasAttribute('disabled')) return;

    const button = this._button;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }
}

customElements.define('touch-button', TouchButton);