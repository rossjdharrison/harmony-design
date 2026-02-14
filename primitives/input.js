/**
 * Input Primitive Component
 * 
 * A foundational input component using design tokens for colors.
 * Supports multiple states including focus, error, and disabled.
 * 
 * @module primitives/input
 * @see {@link ../DESIGN_SYSTEM.md#primitives-input}
 */

import { colors } from '../tokens/colors.js';

/**
 * Custom input element with design token integration
 * @extends HTMLElement
 */
class HarmonyInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['value', 'placeholder', 'disabled', 'error', 'type'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.shadowRoot && oldValue !== newValue) {
      if (name === 'value') {
        const input = this.shadowRoot.querySelector('input');
        if (input && input.value !== newValue) {
          input.value = newValue || '';
        }
      } else {
        this.render();
      }
    }
  }

  /**
   * Setup event listeners for input interactions
   * @private
   */
  setupEventListeners() {
    const input = this.shadowRoot.querySelector('input');
    if (!input) return;

    input.addEventListener('input', (e) => {
      this.setAttribute('value', e.target.value);
      
      // Publish event via EventBus pattern
      this.dispatchEvent(new CustomEvent('harmony-input-change', {
        bubbles: true,
        composed: true,
        detail: { value: e.target.value }
      }));
    });

    input.addEventListener('focus', () => {
      this.dispatchEvent(new CustomEvent('harmony-input-focus', {
        bubbles: true,
        composed: true
      }));
    });

    input.addEventListener('blur', () => {
      this.dispatchEvent(new CustomEvent('harmony-input-blur', {
        bubbles: true,
        composed: true
      }));
    });
  }

  /**
   * Render the input with design tokens
   * @private
   */
  render() {
    const value = this.getAttribute('value') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const disabled = this.hasAttribute('disabled');
    const error = this.hasAttribute('error');
    const type = this.getAttribute('type') || 'text';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: 100%;
        }

        .input-wrapper {
          position: relative;
          width: 100%;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 12px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 16px;
          border-radius: 4px;
          transition: all 150ms ease-in-out;
          outline: none;
          
          /* Default state - uses border and background tokens */
          background-color: ${colors.ui.background.primary};
          color: ${colors.ui.text.primary};
          border: 2px solid ${colors.ui.border.main};
        }

        /* Hover state - uses darker border token */
        input:hover:not(:disabled) {
          border-color: ${colors.ui.border.dark};
        }

        /* Focus state - uses focus ring token */
        input:focus {
          border-color: ${colors.ui.focus.ring};
          box-shadow: 0 0 0 3px ${colors.ui.focus.ringAlpha};
        }

        /* Error state - uses semantic error tokens */
        input.error {
          border-color: ${colors.semantic.error.main};
        }

        input.error:focus {
          border-color: ${colors.semantic.error.main};
          box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.3);
        }

        /* Disabled state - uses disabled text and secondary background tokens */
        input:disabled {
          cursor: not-allowed;
          background-color: ${colors.ui.background.secondary};
          color: ${colors.ui.text.disabled};
          border-color: ${colors.ui.border.light};
        }

        /* Placeholder styling - uses secondary text token */
        input::placeholder {
          color: ${colors.ui.text.secondary};
        }

        input:disabled::placeholder {
          color: ${colors.ui.text.disabled};
        }
      </style>
      <div class="input-wrapper">
        <input
          type="${type}"
          value="${value}"
          placeholder="${placeholder}"
          ${disabled ? 'disabled' : ''}
          class="${error ? 'error' : ''}"
          part="input"
        />
      </div>
    `;

    // Re-setup listeners after render
    this.setupEventListeners();
  }
}

customElements.define('harmony-input', HarmonyInput);

export { HarmonyInput };