/**
 * @fileoverview HarmonyKnob control component wrapping knob primitive
 * @module controls/harmony-knob
 * 
 * Control-level knob component that integrates with the Harmony Design System.
 * Wraps the knob primitive with label, value display, and event bus integration.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#controls-harmony-knob
 */

import '../primitives/knob.js';

/**
 * HarmonyKnob control web component
 * 
 * @fires harmony-knob-change - Published to EventBus when value changes
 * 
 * @example
 * <harmony-knob 
 *   label="Volume" 
 *   parameter-id="master-volume"
 *   value="0.75" 
 *   min="0" 
 *   max="1"
 *   unit="dB"
 *   format-fn="dbFormat">
 * </harmony-knob>
 */
class HarmonyKnob extends HTMLElement {
  static get observedAttributes() {
    return [
      'label',
      'parameter-id',
      'value',
      'min',
      'max',
      'size',
      'disabled',
      'step',
      'unit',
      'format-fn',
      'show-value'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._label = '';
    this._parameterId = '';
    this._value = 0.5;
    this._min = 0;
    this._max = 1;
    this._size = 64;
    this._disabled = false;
    this._step = 0.01;
    this._unit = '';
    this._formatFn = null;
    this._showValue = true;
    
    this._render();
  }

  connectedCallback() {
    this._attachEventListeners();
    this._updateDisplay();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'label':
        this._label = newValue || '';
        this._updateLabel();
        break;
      case 'parameter-id':
        this._parameterId = newValue || '';
        break;
      case 'value':
        this._value = parseFloat(newValue) || 0;
        this._updatePrimitiveValue();
        this._updateDisplay();
        break;
      case 'min':
        this._min = parseFloat(newValue) || 0;
        this._updatePrimitiveValue();
        break;
      case 'max':
        this._max = parseFloat(newValue) || 1;
        this._updatePrimitiveValue();
        break;
      case 'size':
        this._size = parseInt(newValue) || 64;
        this._updatePrimitiveValue();
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        this._updatePrimitiveValue();
        break;
      case 'step':
        this._step = parseFloat(newValue) || 0.01;
        this._updatePrimitiveValue();
        break;
      case 'unit':
        this._unit = newValue || '';
        this._updateDisplay();
        break;
      case 'format-fn':
        this._formatFn = newValue ? window[newValue] : null;
        this._updateDisplay();
        break;
      case 'show-value':
        this._showValue = newValue !== 'false';
        this._updateValueVisibility();
        break;
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-family: var(--harmony-font-family, system-ui, -apple-system, sans-serif);
          color: var(--harmony-text-color, #E0E0E0);
        }
        
        .knob-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--harmony-label-color, #B0B0B0);
          text-align: center;
          user-select: none;
        }
        
        .knob-wrapper {
          position: relative;
        }
        
        .knob-value {
          margin-top: 4px;
          font-size: 13px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: var(--harmony-value-color, #FFFFFF);
          text-align: center;
          min-width: 48px;
          user-select: none;
        }
        
        .knob-value.hidden {
          display: none;
        }
        
        :host([disabled]) {
          opacity: 0.5;
          pointer-events: none;
        }
      </style>
      
      <div class="knob-label">${this._label}</div>
      <div class="knob-wrapper">
        <harmony-knob-primitive
          value="${this._value}"
          min="${this._min}"
          max="${this._max}"
          size="${this._size}"
          step="${this._step}"
          ${this._disabled ? 'disabled' : ''}>
        </harmony-knob-primitive>
      </div>
      <div class="knob-value">${this._formatValue(this._value)}</div>
    `;
  }

  _attachEventListeners() {
    const primitive = this.shadowRoot.querySelector('harmony-knob-primitive');
    if (primitive) {
      primitive.addEventListener('knob-input', this._onKnobInput.bind(this));
      primitive.addEventListener('knob-change', this._onKnobChange.bind(this));
    }
  }

  _detachEventListeners() {
    const primitive = this.shadowRoot.querySelector('harmony-knob-primitive');
    if (primitive) {
      primitive.removeEventListener('knob-input', this._onKnobInput.bind(this));
      primitive.removeEventListener('knob-change', this._onKnobChange.bind(this));
    }
  }

  _onKnobInput(e) {
    this._value = e.detail.value;
    this._updateDisplay();
    
    // Publish input event to EventBus (continuous updates)
    this._publishToEventBus('harmony-knob-input', {
      parameterId: this._parameterId,
      value: this._value,
      label: this._label
    });
  }

  _onKnobChange(e) {
    this._value = e.detail.value;
    this._updateDisplay();
    
    // Publish change event to EventBus (final value)
    this._publishToEventBus('harmony-knob-change', {
      parameterId: this._parameterId,
      value: this._value,
      label: this._label
    });
    
    // Also dispatch local event
    this.dispatchEvent(new CustomEvent('harmony-knob-change', {
      detail: {
        parameterId: this._parameterId,
        value: this._value,
        label: this._label
      },
      bubbles: true,
      composed: true
    }));
  }

  _updatePrimitiveValue() {
    const primitive = this.shadowRoot.querySelector('harmony-knob-primitive');
    if (!primitive) return;
    
    primitive.setAttribute('value', this._value);
    primitive.setAttribute('min', this._min);
    primitive.setAttribute('max', this._max);
    primitive.setAttribute('size', this._size);
    primitive.setAttribute('step', this._step);
    
    if (this._disabled) {
      primitive.setAttribute('disabled', '');
    } else {
      primitive.removeAttribute('disabled');
    }
  }

  _updateLabel() {
    const label = this.shadowRoot.querySelector('.knob-label');
    if (label) {
      label.textContent = this._label;
    }
  }

  _updateDisplay() {
    const valueDisplay = this.shadowRoot.querySelector('.knob-value');
    if (valueDisplay) {
      valueDisplay.textContent = this._formatValue(this._value);
    }
  }

  _updateValueVisibility() {
    const valueDisplay = this.shadowRoot.querySelector('.knob-value');
    if (valueDisplay) {
      valueDisplay.classList.toggle('hidden', !this._showValue);
    }
  }

  _formatValue(value) {
    if (this._formatFn && typeof this._formatFn === 'function') {
      return this._formatFn(value);
    }
    
    // Default formatting: 2 decimal places
    let formatted = value.toFixed(2);
    
    // Add unit if specified
    if (this._unit) {
      formatted += ` ${this._unit}`;
    }
    
    return formatted;
  }

  _publishToEventBus(eventType, payload) {
    const eventBus = document.querySelector('harmony-event-bus');
    if (eventBus && typeof eventBus.publish === 'function') {
      try {
        eventBus.publish({
          type: eventType,
          source: 'harmony-knob',
          timestamp: Date.now(),
          payload
        });
      } catch (error) {
        console.error(`[HarmonyKnob] Failed to publish ${eventType}:`, error);
      }
    }
  }

  // Public API
  get value() {
    return this._value;
  }

  set value(val) {
    this.setAttribute('value', val);
  }

  get parameterId() {
    return this._parameterId;
  }

  set parameterId(val) {
    this.setAttribute('parameter-id', val);
  }

  get label() {
    return this._label;
  }

  set label(val) {
    this.setAttribute('label', val);
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(val) {
    if (val) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }
}

customElements.define('harmony-knob', HarmonyKnob);