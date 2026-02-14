/**
 * @fileoverview Knob primitive component with rotary control
 * Provides a circular rotary control for continuous value adjustment.
 * See harmony-design/DESIGN_SYSTEM.md#knob-primitive for usage patterns.
 * 
 * @module primitives/knob
 */

/**
 * Knob component - rotary control for continuous value adjustment
 * 
 * @class HarmonyKnob
 * @extends HTMLElement
 * 
 * @attr {number} value - Current value (0-1 range)
 * @attr {number} min - Minimum value (default: 0)
 * @attr {number} max - Maximum value (default: 1)
 * @attr {number} step - Step increment (default: 0.01)
 * @attr {boolean} disabled - Disabled state
 * @attr {string} label - Accessible label
 * @attr {number} sensitivity - Rotation sensitivity (default: 0.005)
 * 
 * @fires knob-change - Dispatched when value changes
 * @fires knob-input - Dispatched during drag (high frequency)
 * 
 * @example
 * <harmony-knob value="0.5" label="Volume" min="0" max="1"></harmony-knob>
 */
class HarmonyKnob extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._value = 0.5;
    this._min = 0;
    this._max = 1;
    this._step = 0.01;
    this._disabled = false;
    this._sensitivity = 0.005;
    this._isDragging = false;
    this._startY = 0;
    this._startValue = 0;
    
    // Bind event handlers
    this._handlePointerDown = this._handlePointerDown.bind(this);
    this._handlePointerMove = this._handlePointerMove.bind(this);
    this._handlePointerUp = this._handlePointerUp.bind(this);
    this._handleWheel = this._handleWheel.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }
  
  static get observedAttributes() {
    return ['value', 'min', 'max', 'step', 'disabled', 'label', 'sensitivity'];
  }
  
  connectedCallback() {
    this._render();
    this._attachEventListeners();
  }
  
  disconnectedCallback() {
    this._detachEventListeners();
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'value':
        this._value = this._clamp(parseFloat(newValue) || 0);
        break;
      case 'min':
        this._min = parseFloat(newValue) || 0;
        this._value = this._clamp(this._value);
        break;
      case 'max':
        this._max = parseFloat(newValue) || 1;
        this._value = this._clamp(this._value);
        break;
      case 'step':
        this._step = parseFloat(newValue) || 0.01;
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        break;
      case 'sensitivity':
        this._sensitivity = parseFloat(newValue) || 0.005;
        break;
    }
    
    if (this.shadowRoot.querySelector('.knob')) {
      this._updateKnob();
    }
  }
  
  /**
   * Get current value
   * @returns {number}
   */
  get value() {
    return this._value;
  }
  
  /**
   * Set current value
   * @param {number} val
   */
  set value(val) {
    const newValue = this._clamp(parseFloat(val) || 0);
    if (newValue !== this._value) {
      this._value = newValue;
      this.setAttribute('value', String(newValue));
      this._updateKnob();
    }
  }
  
  /**
   * Clamp value to min/max range and apply step
   * @private
   * @param {number} val
   * @returns {number}
   */
  _clamp(val) {
    let clamped = Math.max(this._min, Math.min(this._max, val));
    // Apply step
    const steps = Math.round((clamped - this._min) / this._step);
    clamped = this._min + steps * this._step;
    // Prevent floating point issues
    return parseFloat(clamped.toFixed(10));
  }
  
  /**
   * Convert value to rotation angle (0-270 degrees)
   * @private
   * @returns {number}
   */
  _valueToAngle() {
    const normalized = (this._value - this._min) / (this._max - this._min);
    return normalized * 270 - 135; // -135 to +135 degrees
  }
  
  /**
   * Render component
   * @private
   */
  _render() {
    const label = this.getAttribute('label') || 'Knob';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: 64px;
          height: 64px;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }
        
        .knob-container {
          position: relative;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        
        :host([disabled]) .knob-container {
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .knob {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          box-shadow: 
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          transition: box-shadow 0.15s ease;
        }
        
        .knob:hover:not([disabled]) {
          box-shadow: 
            0 2px 12px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
        
        .knob:active:not([disabled]),
        .knob.dragging {
          box-shadow: 
            0 1px 4px rgba(0, 0, 0, 0.4),
            inset 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .knob-track {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .knob-indicator {
          position: absolute;
          top: 8px;
          left: 50%;
          width: 3px;
          height: 16px;
          margin-left: -1.5px;
          background: #4a9eff;
          border-radius: 2px;
          transform-origin: center 24px;
          transition: background 0.15s ease;
          box-shadow: 0 0 4px rgba(74, 158, 255, 0.5);
        }
        
        :host([disabled]) .knob-indicator {
          background: #666;
          box-shadow: none;
        }
        
        .knob:focus-visible {
          outline: 2px solid #4a9eff;
          outline-offset: 2px;
        }
        
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      </style>
      
      <div class="knob-container">
        <div 
          class="knob" 
          role="slider"
          aria-label="${label}"
          aria-valuemin="${this._min}"
          aria-valuemax="${this._max}"
          aria-valuenow="${this._value}"
          aria-disabled="${this._disabled}"
          tabindex="${this._disabled ? '-1' : '0'}"
        >
          <div class="knob-track"></div>
          <div class="knob-indicator"></div>
        </div>
        <span class="sr-only">${label}: ${this._value.toFixed(2)}</span>
      </div>
    `;
    
    this._updateKnob();
  }
  
  /**
   * Update knob visual state
   * @private
   */
  _updateKnob() {
    const indicator = this.shadowRoot.querySelector('.knob-indicator');
    const knob = this.shadowRoot.querySelector('.knob');
    const srOnly = this.shadowRoot.querySelector('.sr-only');
    
    if (indicator) {
      const angle = this._valueToAngle();
      indicator.style.transform = `rotate(${angle}deg)`;
    }
    
    if (knob) {
      knob.setAttribute('aria-valuenow', String(this._value));
      knob.setAttribute('aria-disabled', String(this._disabled));
      knob.setAttribute('tabindex', this._disabled ? '-1' : '0');
    }
    
    if (srOnly) {
      const label = this.getAttribute('label') || 'Knob';
      srOnly.textContent = `${label}: ${this._value.toFixed(2)}`;
    }
  }
  
  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    const knob = this.shadowRoot.querySelector('.knob');
    if (knob) {
      knob.addEventListener('pointerdown', this._handlePointerDown);
      knob.addEventListener('wheel', this._handleWheel, { passive: false });
      knob.addEventListener('keydown', this._handleKeyDown);
    }
  }
  
  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const knob = this.shadowRoot.querySelector('.knob');
    if (knob) {
      knob.removeEventListener('pointerdown', this._handlePointerDown);
      knob.removeEventListener('wheel', this._handleWheel);
      knob.removeEventListener('keydown', this._handleKeyDown);
    }
    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
  }
  
  /**
   * Handle pointer down
   * @private
   * @param {PointerEvent} e
   */
  _handlePointerDown(e) {
    if (this._disabled) return;
    
    e.preventDefault();
    this._isDragging = true;
    this._startY = e.clientY;
    this._startValue = this._value;
    
    const knob = this.shadowRoot.querySelector('.knob');
    knob.classList.add('dragging');
    knob.setPointerCapture(e.pointerId);
    
    document.addEventListener('pointermove', this._handlePointerMove);
    document.addEventListener('pointerup', this._handlePointerUp);
  }
  
  /**
   * Handle pointer move
   * @private
   * @param {PointerEvent} e
   */
  _handlePointerMove(e) {
    if (!this._isDragging || this._disabled) return;
    
    e.preventDefault();
    
    // Calculate delta (inverted: drag up = increase)
    const deltaY = this._startY - e.clientY;
    const deltaValue = deltaY * this._sensitivity * (this._max - this._min);
    const newValue = this._clamp(this._startValue + deltaValue);
    
    if (newValue !== this._value) {
      this._value = newValue;
      this.setAttribute('value', String(newValue));
      this._updateKnob();
      
      // Dispatch high-frequency input event
      this.dispatchEvent(new CustomEvent('knob-input', {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }
  }
  
  /**
   * Handle pointer up
   * @private
   * @param {PointerEvent} e
   */
  _handlePointerUp(e) {
    if (!this._isDragging) return;
    
    this._isDragging = false;
    
    const knob = this.shadowRoot.querySelector('.knob');
    knob.classList.remove('dragging');
    
    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
    
    // Dispatch change event on release
    this.dispatchEvent(new CustomEvent('knob-change', {
      detail: { value: this._value },
      bubbles: true,
      composed: true
    }));
  }
  
  /**
   * Handle wheel events
   * @private
   * @param {WheelEvent} e
   */
  _handleWheel(e) {
    if (this._disabled) return;
    
    e.preventDefault();
    
    const delta = -Math.sign(e.deltaY) * this._step;
    const newValue = this._clamp(this._value + delta);
    
    if (newValue !== this._value) {
      this._value = newValue;
      this.setAttribute('value', String(newValue));
      this._updateKnob();
      
      this.dispatchEvent(new CustomEvent('knob-change', {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }
  }
  
  /**
   * Handle keyboard events
   * @private
   * @param {KeyboardEvent} e
   */
  _handleKeyDown(e) {
    if (this._disabled) return;
    
    let delta = 0;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        delta = this._step;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        delta = -this._step;
        break;
      case 'PageUp':
        delta = this._step * 10;
        break;
      case 'PageDown':
        delta = -this._step * 10;
        break;
      case 'Home':
        delta = this._min - this._value;
        break;
      case 'End':
        delta = this._max - this._value;
        break;
      default:
        return;
    }
    
    e.preventDefault();
    
    const newValue = this._clamp(this._value + delta);
    
    if (newValue !== this._value) {
      this._value = newValue;
      this.setAttribute('value', String(newValue));
      this._updateKnob();
      
      this.dispatchEvent(new CustomEvent('knob-change', {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }
  }
}

customElements.define('harmony-knob', HarmonyKnob);

export { HarmonyKnob };