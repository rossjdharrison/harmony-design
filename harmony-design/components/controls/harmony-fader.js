/**
 * @fileoverview HarmonyFader - Control component wrapping fader primitive
 * 
 * This component provides a complete fader control with label, value display,
 * and event handling. It wraps the harmony-fader-primitive and adds:
 * - Label support
 * - Value formatting and display
 * - Event bus integration
 * - Accessibility enhancements
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#harmony-fader
 * 
 * @module components/controls/harmony-fader
 */

/**
 * HarmonyFader - Complete fader control component
 * 
 * Wraps harmony-fader-primitive with label, value display, and event handling.
 * Publishes FaderChanged events to EventBus when value changes.
 * 
 * @element harmony-fader
 * 
 * @attr {string} label - Display label for the fader
 * @attr {number} value - Current value (0-100)
 * @attr {number} min - Minimum value (default: 0)
 * @attr {number} max - Maximum value (default: 100)
 * @attr {string} unit - Unit to display (e.g., "dB", "%")
 * @attr {boolean} disabled - Whether the fader is disabled
 * @attr {string} channel-id - Channel identifier for event publishing
 * 
 * @fires {CustomEvent} fader-changed - Emitted when value changes
 * @fires {CustomEvent} fader-input - Emitted during drag (real-time)
 * 
 * @example
 * <harmony-fader 
 *   label="Master Volume" 
 *   value="75" 
 *   unit="dB"
 *   channel-id="master">
 * </harmony-fader>
 */
class HarmonyFader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._value = 75;
    this._min = 0;
    this._max = 100;
    this._label = '';
    this._unit = '';
    this._disabled = false;
    this._channelId = '';
  }

  static get observedAttributes() {
    return ['label', 'value', 'min', 'max', 'unit', 'disabled', 'channel-id'];
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'label':
        this._label = newValue || '';
        break;
      case 'value':
        this._value = parseFloat(newValue) || 0;
        break;
      case 'min':
        this._min = parseFloat(newValue) || 0;
        break;
      case 'max':
        this._max = parseFloat(newValue) || 100;
        break;
      case 'unit':
        this._unit = newValue || '';
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        break;
      case 'channel-id':
        this._channelId = newValue || '';
        break;
    }

    if (this.shadowRoot.firstChild) {
      this.render();
    }
  }

  /**
   * Render the component
   * @private
   */
  render() {
    const formattedValue = this._formatValue(this._value);
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --fader-width: 60px;
          --fader-height: 200px;
          --label-color: #e0e0e0;
          --value-color: #ffffff;
          --disabled-opacity: 0.5;
        }

        :host([disabled]) {
          opacity: var(--disabled-opacity);
          pointer-events: none;
        }

        .fader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: var(--fader-width);
        }

        .fader-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--label-color);
          text-align: center;
          width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          user-select: none;
        }

        .fader-wrapper {
          position: relative;
          width: 100%;
          height: var(--fader-height);
        }

        harmony-fader-primitive {
          width: 100%;
          height: 100%;
        }

        .fader-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--value-color);
          text-align: center;
          min-height: 20px;
          user-select: none;
          font-variant-numeric: tabular-nums;
        }

        /* Focus styles for accessibility */
        :host(:focus-within) .fader-wrapper {
          outline: 2px solid #4a9eff;
          outline-offset: 2px;
          border-radius: 4px;
        }
      </style>

      <div class="fader-container">
        ${this._label ? `<div class="fader-label">${this._escapeHtml(this._label)}</div>` : ''}
        
        <div class="fader-wrapper">
          <harmony-fader-primitive
            value="${this._value}"
            min="${this._min}"
            max="${this._max}"
            ${this._disabled ? 'disabled' : ''}
            aria-label="${this._label || 'Fader'}"
            aria-valuemin="${this._min}"
            aria-valuemax="${this._max}"
            aria-valuenow="${this._value}"
            aria-valuetext="${formattedValue}"
            role="slider"
            tabindex="${this._disabled ? '-1' : '0'}">
          </harmony-fader-primitive>
        </div>

        <div class="fader-value">${formattedValue}</div>
      </div>
    `;
  }

  /**
   * Attach event listeners to the primitive
   * @private
   */
  _attachEventListeners() {
    this._handlePrimitiveChange = this._handlePrimitiveChange.bind(this);
    this._handlePrimitiveInput = this._handlePrimitiveInput.bind(this);

    const primitive = this.shadowRoot.querySelector('harmony-fader-primitive');
    if (primitive) {
      primitive.addEventListener('change', this._handlePrimitiveChange);
      primitive.addEventListener('input', this._handlePrimitiveInput);
    }
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const primitive = this.shadowRoot.querySelector('harmony-fader-primitive');
    if (primitive) {
      primitive.removeEventListener('change', this._handlePrimitiveChange);
      primitive.removeEventListener('input', this._handlePrimitiveInput);
    }
  }

  /**
   * Handle change event from primitive (committed value)
   * @private
   * @param {CustomEvent} event
   */
  _handlePrimitiveChange(event) {
    const newValue = event.detail.value;
    this._value = newValue;
    
    // Update value display
    const valueDisplay = this.shadowRoot.querySelector('.fader-value');
    if (valueDisplay) {
      valueDisplay.textContent = this._formatValue(newValue);
    }

    // Publish to EventBus
    this._publishToEventBus('FaderChanged', {
      channelId: this._channelId,
      value: newValue,
      min: this._min,
      max: this._max,
      normalized: (newValue - this._min) / (this._max - this._min)
    });

    // Emit custom event
    this.dispatchEvent(new CustomEvent('fader-changed', {
      detail: {
        value: newValue,
        channelId: this._channelId
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle input event from primitive (real-time updates during drag)
   * @private
   * @param {CustomEvent} event
   */
  _handlePrimitiveInput(event) {
    const newValue = event.detail.value;
    
    // Update value display in real-time
    const valueDisplay = this.shadowRoot.querySelector('.fader-value');
    if (valueDisplay) {
      valueDisplay.textContent = this._formatValue(newValue);
    }

    // Emit custom event for real-time updates
    this.dispatchEvent(new CustomEvent('fader-input', {
      detail: {
        value: newValue,
        channelId: this._channelId
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} eventType
   * @param {object} payload
   */
  _publishToEventBus(eventType, payload) {
    if (typeof window.EventBus !== 'undefined' && window.EventBus.publish) {
      try {
        window.EventBus.publish(eventType, payload);
      } catch (error) {
        console.error(`[HarmonyFader] Failed to publish ${eventType}:`, error);
      }
    }
  }

  /**
   * Format value for display
   * @private
   * @param {number} value
   * @returns {string}
   */
  _formatValue(value) {
    const formatted = value.toFixed(1);
    return this._unit ? `${formatted}${this._unit}` : formatted;
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text
   * @returns {string}
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get current value
   * @returns {number}
   */
  get value() {
    return this._value;
  }

  /**
   * Set value programmatically
   * @param {number} val
   */
  set value(val) {
    this.setAttribute('value', val);
  }

  /**
   * Get channel ID
   * @returns {string}
   */
  get channelId() {
    return this._channelId;
  }

  /**
   * Set channel ID
   * @param {string} id
   */
  set channelId(id) {
    this.setAttribute('channel-id', id);
  }
}

customElements.define('harmony-fader', HarmonyFader);

export default HarmonyFader;