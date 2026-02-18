/**
 * @fileoverview Fader primitive component with linear control
 * @see harmony-design/DESIGN_SYSTEM.md#fader-primitive
 */

/**
 * Fader primitive component providing linear slider control
 * 
 * @class FaderComponent
 * @extends HTMLElement
 * 
 * @attr {number} value - Current fader value (0.0 to 1.0)
 * @attr {number} min - Minimum value (default: 0.0)
 * @attr {number} max - Maximum value (default: 1.0)
 * @attr {number} step - Step increment (default: 0.01)
 * @attr {string} orientation - 'vertical' or 'horizontal' (default: 'vertical')
 * @attr {boolean} disabled - Whether the fader is disabled
 * @attr {string} label - Accessible label for the fader
 * 
 * @fires fader-change - Dispatched when value changes
 * @fires fader-input - Dispatched during drag (continuous)
 * 
 * @example
 * <harmony-fader 
 *   value="0.75" 
 *   label="Volume"
 *   orientation="vertical">
 * </harmony-fader>
 */
class FaderComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._value = 0.5;
    this._min = 0.0;
    this._max = 1.0;
    this._step = 0.01;
    this._orientation = 'vertical';
    this._disabled = false;
    this._isDragging = false;
    this._startY = 0;
    this._startX = 0;
    this._startValue = 0;
    
    // Bind event handlers
    this._handlePointerDown = this._handlePointerDown.bind(this);
    this._handlePointerMove = this._handlePointerMove.bind(this);
    this._handlePointerUp = this._handlePointerUp.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleWheel = this._handleWheel.bind(this);
  }

  static get observedAttributes() {
    return ['value', 'min', 'max', 'step', 'orientation', 'disabled', 'label'];
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
      case 'orientation':
        this._orientation = newValue === 'horizontal' ? 'horizontal' : 'vertical';
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        break;
      case 'label':
        // Update aria-label
        break;
    }

    this.render();
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
    }
  }

  /**
   * Clamp value to min/max range and apply step
   * @private
   * @param {number} val
   * @returns {number}
   */
  _clamp(val) {
    const stepped = Math.round(val / this._step) * this._step;
    return Math.max(this._min, Math.min(this._max, stepped));
  }

  /**
   * Convert value to percentage (0-100)
   * @private
   * @returns {number}
   */
  _valueToPercent() {
    const range = this._max - this._min;
    return ((this._value - this._min) / range) * 100;
  }

  /**
   * Convert percentage to value
   * @private
   * @param {number} percent - 0 to 100
   * @returns {number}
   */
  _percentToValue(percent) {
    const range = this._max - this._min;
    return this._min + (percent / 100) * range;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    const track = this.shadowRoot.querySelector('.fader-track');
    const thumb = this.shadowRoot.querySelector('.fader-thumb');
    
    if (track && thumb) {
      thumb.addEventListener('pointerdown', this._handlePointerDown);
      thumb.addEventListener('keydown', this._handleKeyDown);
      track.addEventListener('pointerdown', this._handlePointerDown);
      track.addEventListener('wheel', this._handleWheel, { passive: false });
    }
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const track = this.shadowRoot.querySelector('.fader-track');
    const thumb = this.shadowRoot.querySelector('.fader-thumb');
    
    if (track && thumb) {
      thumb.removeEventListener('pointerdown', this._handlePointerDown);
      thumb.removeEventListener('keydown', this._handleKeyDown);
      track.removeEventListener('pointerdown', this._handlePointerDown);
      track.removeEventListener('wheel', this._handleWheel);
    }
    
    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
  }

  /**
   * Handle pointer down event
   * @private
   * @param {PointerEvent} e
   */
  _handlePointerDown(e) {
    if (this._disabled) return;

    e.preventDefault();
    this._isDragging = true;
    
    const track = this.shadowRoot.querySelector('.fader-track');
    const rect = track.getBoundingClientRect();
    
    this._startY = e.clientY;
    this._startX = e.clientX;
    this._startValue = this._value;

    // If clicking on track (not thumb), jump to that position
    if (e.target.classList.contains('fader-track')) {
      this._updateValueFromPosition(e.clientX, e.clientY, rect);
      this._emitChangeEvent();
    }

    document.addEventListener('pointermove', this._handlePointerMove);
    document.addEventListener('pointerup', this._handlePointerUp);
    
    const thumb = this.shadowRoot.querySelector('.fader-thumb');
    thumb.setPointerCapture(e.pointerId);
  }

  /**
   * Handle pointer move event
   * @private
   * @param {PointerEvent} e
   */
  _handlePointerMove(e) {
    if (!this._isDragging || this._disabled) return;

    e.preventDefault();
    
    const track = this.shadowRoot.querySelector('.fader-track');
    const rect = track.getBoundingClientRect();
    
    this._updateValueFromPosition(e.clientX, e.clientY, rect);
    this._emitInputEvent();
  }

  /**
   * Handle pointer up event
   * @private
   * @param {PointerEvent} e
   */
  _handlePointerUp(e) {
    if (!this._isDragging) return;

    this._isDragging = false;
    this._emitChangeEvent();
    
    document.removeEventListener('pointermove', this._handlePointerMove);
    document.removeEventListener('pointerup', this._handlePointerUp);
  }

  /**
   * Update value from pointer position
   * @private
   * @param {number} clientX
   * @param {number} clientY
   * @param {DOMRect} rect
   */
  _updateValueFromPosition(clientX, clientY, rect) {
    let percent;
    
    if (this._orientation === 'vertical') {
      // Vertical: bottom = 0%, top = 100%
      const relativeY = rect.bottom - clientY;
      percent = (relativeY / rect.height) * 100;
    } else {
      // Horizontal: left = 0%, right = 100%
      const relativeX = clientX - rect.left;
      percent = (relativeX / rect.width) * 100;
    }
    
    percent = Math.max(0, Math.min(100, percent));
    const newValue = this._clamp(this._percentToValue(percent));
    
    if (newValue !== this._value) {
      this._value = newValue;
      this.render();
    }
  }

  /**
   * Handle keyboard navigation
   * @private
   * @param {KeyboardEvent} e
   */
  _handleKeyDown(e) {
    if (this._disabled) return;

    let handled = false;
    const largeStep = this._step * 10;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        this.value = this._value + this._step;
        handled = true;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        this.value = this._value - this._step;
        handled = true;
        break;
      case 'PageUp':
        this.value = this._value + largeStep;
        handled = true;
        break;
      case 'PageDown':
        this.value = this._value - largeStep;
        handled = true;
        break;
      case 'Home':
        this.value = this._min;
        handled = true;
        break;
      case 'End':
        this.value = this._max;
        handled = true;
        break;
    }

    if (handled) {
      e.preventDefault();
      this._emitChangeEvent();
    }
  }

  /**
   * Handle mouse wheel
   * @private
   * @param {WheelEvent} e
   */
  _handleWheel(e) {
    if (this._disabled) return;

    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -this._step : this._step;
    this.value = this._value + delta;
    this._emitChangeEvent();
  }

  /**
   * Emit input event (during drag)
   * @private
   */
  _emitInputEvent() {
    this.dispatchEvent(new CustomEvent('fader-input', {
      detail: { value: this._value },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Emit change event (after interaction complete)
   * @private
   */
  _emitChangeEvent() {
    this.dispatchEvent(new CustomEvent('fader-change', {
      detail: { value: this._value },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Render the component
   */
  render() {
    const percent = this._valueToPercent();
    const label = this.getAttribute('label') || 'Fader';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          --fader-width: 40px;
          --fader-height: 200px;
          --track-color: #2a2a2a;
          --fill-color: #4a9eff;
          --thumb-color: #ffffff;
          --thumb-size: 20px;
          --track-thickness: 4px;
        }

        :host([orientation="horizontal"]) {
          --fader-width: 200px;
          --fader-height: 40px;
        }

        .fader-container {
          position: relative;
          width: var(--fader-width);
          height: var(--fader-height);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fader-track {
          position: absolute;
          background: var(--track-color);
          border-radius: calc(var(--track-thickness) / 2);
          cursor: pointer;
        }

        :host([orientation="vertical"]) .fader-track {
          width: var(--track-thickness);
          height: 100%;
          left: 50%;
          transform: translateX(-50%);
        }

        :host([orientation="horizontal"]) .fader-track {
          height: var(--track-thickness);
          width: 100%;
          top: 50%;
          transform: translateY(-50%);
        }

        .fader-fill {
          position: absolute;
          background: var(--fill-color);
          border-radius: calc(var(--track-thickness) / 2);
          pointer-events: none;
        }

        :host([orientation="vertical"]) .fader-fill {
          width: var(--track-thickness);
          left: 50%;
          transform: translateX(-50%);
          bottom: 0;
          height: ${percent}%;
        }

        :host([orientation="horizontal"]) .fader-fill {
          height: var(--track-thickness);
          top: 50%;
          transform: translateY(-50%);
          left: 0;
          width: ${percent}%;
        }

        .fader-thumb {
          position: absolute;
          width: var(--thumb-size);
          height: var(--thumb-size);
          background: var(--thumb-color);
          border-radius: 50%;
          cursor: grab;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          transition: transform 0.1s ease;
        }

        .fader-thumb:hover {
          transform: scale(1.1);
        }

        .fader-thumb:active {
          cursor: grabbing;
          transform: scale(1.05);
        }

        .fader-thumb:focus {
          outline: 2px solid var(--fill-color);
          outline-offset: 2px;
        }

        :host([orientation="vertical"]) .fader-thumb {
          left: 50%;
          transform: translateX(-50%);
          bottom: calc(${percent}% - var(--thumb-size) / 2);
        }

        :host([orientation="horizontal"]) .fader-thumb {
          top: 50%;
          transform: translateY(-50%);
          left: calc(${percent}% - var(--thumb-size) / 2);
        }

        :host([disabled]) .fader-container {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :host([disabled]) .fader-track,
        :host([disabled]) .fader-thumb {
          cursor: not-allowed;
          pointer-events: none;
        }
      </style>
      
      <div class="fader-container">
        <div class="fader-track" role="slider" 
             aria-label="${label}"
             aria-valuemin="${this._min}"
             aria-valuemax="${this._max}"
             aria-valuenow="${this._value}"
             aria-disabled="${this._disabled}"
             aria-orientation="${this._orientation}">
          <div class="fader-fill"></div>
        </div>
        <div class="fader-thumb" 
             tabindex="${this._disabled ? -1 : 0}"
             role="button"
             aria-label="${label} thumb">
        </div>
      </div>
    `;

    // Reattach listeners after render
    if (this.isConnected) {
      this._detachEventListeners();
      this._attachEventListeners();
    }
  }
}

// Register the custom element
customElements.define('harmony-fader', FaderComponent);

export { FaderComponent };