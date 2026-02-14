/**
 * @fileoverview Harmony Button Primitive Component
 * Publishes events to EventBus following the event-driven architecture pattern.
 * See DESIGN_SYSTEM.md#event-bus-integration for details.
 * 
 * @performance Target: <1ms event dispatch
 * @memory Minimal footprint, no state retention
 */

/**
 * Harmony Button Web Component
 * Emits click events to EventBus for system-wide event handling
 * 
 * @element harmony-button
 * @attr {string} variant - Visual variant (primary, secondary, tertiary)
 * @attr {boolean} disabled - Disabled state
 * @attr {string} size - Size variant (small, medium, large)
 * 
 * @fires {CustomEvent} harmony-button-click - Local DOM event (for backward compatibility)
 * @publishes ButtonClicked - EventBus command event
 */
class HarmonyButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._boundHandleClick = this._handleClick.bind(this);
  }

  static get observedAttributes() {
    return ['variant', 'disabled', 'size'];
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Renders the button component with shadow DOM
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
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 150ms ease, transform 100ms ease;
          font-weight: 500;
          outline: none;
        }

        button:focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        button:active:not(:disabled) {
          transform: scale(0.98);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Size variants */
        .small {
          padding: 6px 12px;
          font-size: 13px;
        }

        .medium {
          padding: 8px 16px;
          font-size: 14px;
        }

        .large {
          padding: 12px 24px;
          font-size: 16px;
        }

        /* Visual variants */
        .primary {
          background-color: #0066cc;
          color: white;
        }

        .primary:hover:not(:disabled) {
          background-color: #0052a3;
        }

        .secondary {
          background-color: #e0e0e0;
          color: #333;
        }

        .secondary:hover:not(:disabled) {
          background-color: #d0d0d0;
        }

        .tertiary {
          background-color: transparent;
          color: #0066cc;
          border: 1px solid #0066cc;
        }

        .tertiary:hover:not(:disabled) {
          background-color: #f0f7ff;
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

  /**
   * Attaches event listeners to the button
   * @private
   */
  _attachEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    if (button) {
      button.addEventListener('click', this._boundHandleClick);
    }
  }

  /**
   * Detaches event listeners from the button
   * @private
   */
  _detachEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    if (button) {
      button.removeEventListener('click', this._boundHandleClick);
    }
  }

  /**
   * Handles button click events
   * Publishes to EventBus and emits CustomEvent for backward compatibility
   * @private
   * @param {MouseEvent} event - The click event
   */
  _handleClick(event) {
    if (this.hasAttribute('disabled')) {
      return;
    }

    const eventData = {
      componentId: this.id || 'anonymous-button',
      variant: this.getAttribute('variant') || 'primary',
      timestamp: Date.now(),
      metadata: {
        size: this.getAttribute('size') || 'medium',
        textContent: this.textContent.trim()
      }
    };

    // Publish to EventBus (primary integration point)
    try {
      if (window.EventBus) {
        window.EventBus.publish('ButtonClicked', eventData);
      } else {
        console.warn('EventBus not available. Button event not published to bus.', eventData);
      }
    } catch (error) {
      console.error('EventBus publish failed for ButtonClicked:', error, eventData);
    }

    // Emit CustomEvent for backward compatibility and local handling
    this.dispatchEvent(new CustomEvent('harmony-button-click', {
      detail: eventData,
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('harmony-button', HarmonyButton);