/**
 * Button Primitive Component
 * 
 * A foundational button component using design tokens for colors.
 * Supports multiple variants and states.
 * 
 * @module primitives/button
 * @see {@link ../DESIGN_SYSTEM.md#primitives-button}
 */

import { colors } from '../tokens/colors.js';

/**
 * Custom button element with design token integration
 * @extends HTMLElement
 */
class HarmonyButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['variant', 'disabled', 'size'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) {
      this.render();
    }
  }

  /**
   * Setup event listeners for button interactions
   * @private
   */
  setupEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    if (!button) return;

    button.addEventListener('click', (e) => {
      if (this.hasAttribute('disabled')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Publish event via EventBus (if available)
      this.dispatchEvent(new CustomEvent('harmony-button-click', {
        bubbles: true,
        composed: true,
        detail: { variant: this.getAttribute('variant') }
      }));
    });
  }

  /**
   * Render the button with design tokens
   * @private
   */
  render() {
    const variant = this.getAttribute('variant') || 'primary';
    const size = this.getAttribute('size') || 'medium';
    const disabled = this.hasAttribute('disabled');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        button {
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 500;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 150ms ease-in-out;
          outline: none;
          position: relative;
        }

        /* Size variants using tokens */
        button.small {
          padding: 6px 12px;
          font-size: 14px;
        }

        button.medium {
          padding: 8px 16px;
          font-size: 16px;
        }

        button.large {
          padding: 12px 24px;
          font-size: 18px;
        }

        /* Primary variant - uses primary color tokens */
        button.primary {
          background-color: ${colors.primary[500]};
          color: ${colors.neutral[0]};
        }

        button.primary:hover:not(:disabled) {
          background-color: ${colors.primary[600]};
        }

        button.primary:active:not(:disabled) {
          background-color: ${colors.primary[700]};
        }

        button.primary:focus-visible {
          box-shadow: 0 0 0 3px ${colors.ui.focus.ringAlpha};
        }

        /* Secondary variant - uses secondary color tokens */
        button.secondary {
          background-color: ${colors.secondary[500]};
          color: ${colors.neutral[0]};
        }

        button.secondary:hover:not(:disabled) {
          background-color: ${colors.secondary[600]};
        }

        button.secondary:active:not(:disabled) {
          background-color: ${colors.secondary[700]};
        }

        button.secondary:focus-visible {
          box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.3);
        }

        /* Outline variant - uses border and text tokens */
        button.outline {
          background-color: transparent;
          color: ${colors.primary[500]};
          border: 2px solid ${colors.primary[500]};
        }

        button.outline:hover:not(:disabled) {
          background-color: ${colors.primary[50]};
        }

        button.outline:active:not(:disabled) {
          background-color: ${colors.primary[100]};
        }

        button.outline:focus-visible {
          box-shadow: 0 0 0 3px ${colors.ui.focus.ringAlpha};
        }

        /* Ghost variant - uses overlay tokens */
        button.ghost {
          background-color: transparent;
          color: ${colors.ui.text.primary};
        }

        button.ghost:hover:not(:disabled) {
          background-color: ${colors.ui.overlay.light};
        }

        button.ghost:active:not(:disabled) {
          background-color: ${colors.ui.overlay.main};
        }

        button.ghost:focus-visible {
          box-shadow: 0 0 0 3px ${colors.ui.overlay.main};
        }

        /* Disabled state - uses disabled text token */
        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          background-color: ${colors.neutral[300]};
          color: ${colors.ui.text.disabled};
        }

        button.outline:disabled {
          background-color: transparent;
          border-color: ${colors.ui.text.disabled};
          color: ${colors.ui.text.disabled};
        }

        button.ghost:disabled {
          background-color: transparent;
          color: ${colors.ui.text.disabled};
        }
      </style>
      <button 
        class="${variant} ${size}"
        ${disabled ? 'disabled' : ''}
        part="button"
      >
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('harmony-button', HarmonyButton);

export { HarmonyButton };