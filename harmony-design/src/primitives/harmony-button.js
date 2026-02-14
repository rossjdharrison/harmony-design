/**
 * @fileoverview Harmony Button Primitive Component
 * Basic button component that publishes events via EventBus.
 * See DESIGN_SYSTEM.md § Primitives > Button for usage.
 */

import eventBus from '../core/event-bus.js';
import { UI_EVENTS } from '../core/event-types.js';

/**
 * Harmony Button Web Component
 * @element harmony-button
 * 
 * @attr {string} variant - Button style variant (primary|secondary|tertiary)
 * @attr {string} size - Button size (small|medium|large)
 * @attr {boolean} disabled - Whether button is disabled
 * @attr {string} label - Button text label
 * 
 * @fires harmony.ui.button.clicked - When button is clicked (via EventBus)
 */
class HarmonyButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isPressed = false;
  }

  static get observedAttributes() {
    return ['variant', 'size', 'disabled', 'label'];
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    this.detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Get button variant
   * @returns {string}
   */
  get variant() {
    return this.getAttribute('variant') || 'primary';
  }

  /**
   * Get button size
   * @returns {string}
   */
  get size() {
    return this.getAttribute('size') || 'medium';
  }

  /**
   * Get disabled state
   * @returns {boolean}
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  /**
   * Get button label
   * @returns {string}
   */
  get label() {
    return this.getAttribute('label') || '';
  }

  /**
   * Render the component
   */
  render() {
    const variant = this.variant;
    const size = this.size;
    const disabled = this.disabled;
    const label = this.label;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        button {
          font-family: var(--harmony-font-family-base, system-ui, sans-serif);
          font-weight: 500;
          border: none;
          border-radius: var(--harmony-radius-medium, 8px);
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          position: relative;
        }

        /* Size variants */
        button.small {
          padding: var(--harmony-spacing-xs, 8px) var(--harmony-spacing-sm, 12px);
          font-size: var(--harmony-font-size-sm, 14px);
          min-height: 32px;
        }

        button.medium {
          padding: var(--harmony-spacing-sm, 12px) var(--harmony-spacing-md, 16px);
          font-size: var(--harmony-font-size-base, 16px);
          min-height: 40px;
        }

        button.large {
          padding: var(--harmony-spacing-md, 16px) var(--harmony-spacing-lg, 24px);
          font-size: var(--harmony-font-size-lg, 18px);
          min-height: 48px;
        }

        /* Style variants */
        button.primary {
          background: var(--harmony-color-primary, #007bff);
          color: var(--harmony-color-on-primary, #ffffff);
        }

        button.primary:hover:not(:disabled) {
          background: var(--harmony-color-primary-hover, #0056b3);
        }

        button.primary:active:not(:disabled) {
          background: var(--harmony-color-primary-active, #004085);
          transform: translateY(1px);
        }

        button.secondary {
          background: var(--harmony-color-secondary, #6c757d);
          color: var(--harmony-color-on-secondary, #ffffff);
        }

        button.secondary:hover:not(:disabled) {
          background: var(--harmony-color-secondary-hover, #5a6268);
        }

        button.secondary:active:not(:disabled) {
          background: var(--harmony-color-secondary-active, #545b62);
          transform: translateY(1px);
        }

        button.tertiary {
          background: transparent;
          color: var(--harmony-color-primary, #007bff);
          border: 1px solid var(--harmony-color-border, #dee2e6);
        }

        button.tertiary:hover:not(:disabled) {
          background: var(--harmony-color-surface-hover, #f8f9fa);
        }

        button.tertiary:active:not(:disabled) {
          background: var(--harmony-color-surface-active, #e9ecef);
          transform: translateY(1px);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        button:focus-visible {
          box-shadow: 0 0 0 3px var(--harmony-color-focus-ring, rgba(0, 123, 255, 0.25));
        }
      </style>
      <button 
        class="${variant} ${size}" 
        ${disabled ? 'disabled' : ''}
        aria-label="${label}"
      >
        ${label}
      </button>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this._button = this.shadowRoot.querySelector('button');
    if (this._button) {
      this._handleClick = this.handleClick.bind(this);
      this._handleMouseDown = this.handleMouseDown.bind(this);
      this._handleMouseUp = this.handleMouseUp.bind(this);
      
      this._button.addEventListener('click', this._handleClick);
      this._button.addEventListener('mousedown', this._handleMouseDown);
      this._button.addEventListener('mouseup', this._handleMouseUp);
    }
  }

  /**
   * Detach event listeners
   */
  detachEventListeners() {
    if (this._button) {
      this._button.removeEventListener('click', this._handleClick);
      this._button.removeEventListener('mousedown', this._handleMouseDown);
      this._button.removeEventListener('mouseup', this._handleMouseUp);
    }
  }

  /**
   * Handle button click
   * @param {Event} event
   */
  handleClick(event) {
    if (this.disabled) {
      return;
    }

    // Publish to EventBus
    eventBus.publish(UI_EVENTS.BUTTON_CLICKED, 'harmony-button', {
      label: this.label,
      variant: this.variant,
      size: this.size,
      elementId: this.id || null
    });

    // Also dispatch CustomEvent for backward compatibility
    this.dispatchEvent(new CustomEvent('harmony-button-click', {
      bubbles: true,
      composed: true,
      detail: {
        label: this.label,
        variant: this.variant,
        size: this.size
      }
    }));
  }

  /**
   * Handle mouse down
   * @param {Event} event
   */
  handleMouseDown(event) {
    if (this.disabled) {
      return;
    }

    this._isPressed = true;
    
    eventBus.publish(UI_EVENTS.BUTTON_PRESSED, 'harmony-button', {
      label: this.label,
      elementId: this.id || null
    });
  }

  /**
   * Handle mouse up
   * @param {Event} event
   */
  handleMouseUp(event) {
    if (this.disabled || !this._isPressed) {
      return;
    }

    this._isPressed = false;
    
    eventBus.publish(UI_EVENTS.BUTTON_RELEASED, 'harmony-button', {
      label: this.label,
      elementId: this.id || null
    });
  }
}

customElements.define('harmony-button', HarmonyButton);

export default HarmonyButton;