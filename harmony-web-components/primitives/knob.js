/**
 * @fileoverview Knob primitive component with rotary control
 * @module primitives/knob
 * 
 * Provides a circular rotary control for parameter adjustment.
 * Supports mouse drag and wheel interactions with configurable range.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#primitives-knob
 */

/**
 * Knob primitive web component
 * 
 * @fires knob-change - Dispatched when value changes via user interaction
 * @fires knob-input - Dispatched continuously during drag interaction
 * 
 * @example
 * <harmony-knob-primitive 
 *   value="0.5" 
 *   min="0" 
 *   max="1" 
 *   size="64">
 * </harmony-knob-primitive>
 */
class HarmonyKnobPrimitive extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'min', 'max', 'size', 'disabled', 'step'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._value = 0.5;
    this._min = 0;
    this._max = 1;
    this._size = 64;
    this._disabled = false;
    this._step = 0.01;
    this._isDragging = false;
    this._startY = 0;
    this._startValue = 0;
    
    // Rotation range: -135° to +135° (270° total)
    this._minAngle = -135;
    this._maxAngle = 135;
    
    this._render();
    this._attachEventListeners();
  }

  connectedCallback() {
    this._updateKnobRotation();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'value':
        this._value = this._clamp(parseFloat(newValue) || 0);
        this._updateKnobRotation();
        break;
      case 'min':
        this._min = parseFloat(newValue) || 0;
        this._value = this._clamp(this._value);
        this._updateKnobRotation();
        break;
      case 'max':
        this._max = parseFloat(newValue) || 1;
        this._value = this._clamp(this._value);
        this._updateKnobRotation();
        break;
      case 'size':
        this._size = parseInt(newValue) || 64;
        this._updateSize();
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        this._updateDisabledState();
        break;
      case 'step':
        this._step = parseFloat(newValue) || 0.01;
        break;
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          user-select: none;
          -webkit-user-select: none;
        }
        
        .knob-container {
          position: relative;
          cursor: pointer;
          touch-action: none;
        }
        
        .knob-container:focus {
          outline: 2px solid var(--harmony-focus-color, #4A9EFF);
          outline-offset: 2px;
          border-radius: 50%;
        }
        
        .knob-container.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .knob-track {
          fill: none;
          stroke: var(--harmony-knob-track-color, #2A2A2A);
          stroke-width: 4;
        }
        
        .knob-arc {
          fill: none;
          stroke: var(--harmony-knob-arc-color, #4A9EFF);
          stroke-width: 4;
          stroke-linecap: round;
          transition: stroke 0.15s ease;
        }
        
        .knob-body {
          fill: var(--harmony-knob-body-color, #1A1A1A);
          stroke: var(--harmony-knob-border-color, #3A3A3A);
          stroke-width: 2;
          transition: fill 0.15s ease;
        }
        
        .knob-container:hover:not(.disabled) .knob-body {
          fill: var(--harmony-knob-body-hover-color, #252525);
        }
        
        .knob-container:active:not(.disabled) .knob-body,
        .knob-container.dragging .knob-body {
          fill: var(--harmony-knob-body-active-color, #2A2A2A);
        }
        
        .knob-indicator {
          fill: var(--harmony-knob-indicator-color, #FFFFFF);
          transition: fill 0.15s ease;
        }
        
        .knob-pointer {
          transform-origin: center;
          transition: transform 0.05s ease-out;
        }
        
        .knob-container.dragging .knob-pointer {
          transition: none;
        }
      </style>
      
      <div class="knob-container" tabindex="0" role="slider" 
           aria-valuemin="${this._min}" 
           aria-valuemax="${this._max}" 
           aria-valuenow="${this._value}">
        <svg class="knob-svg" width="${this._size}" height="${this._size}">
          <!-- Background track -->
          <circle class="knob-track" 
                  cx="${this._size / 2}" 
                  cy="${this._size / 2}" 
                  r="${this._size / 2 - 6}" />
          
          <!-- Value arc -->
          <path class="knob-arc" d="" />
          
          <!-- Knob body -->
          <circle class="knob-body" 
                  cx="${this._size / 2}" 
                  cy="${this._size / 2}" 
                  r="${this._size / 2 - 10}" />
          
          <!-- Rotating pointer group -->
          <g class="knob-pointer">
            <line class="knob-indicator" 
                  x1="${this._size / 2}" 
                  y1="${this._size / 2 - (this._size / 2 - 16)}" 
                  x2="${this._size / 2}" 
                  y2="${this._size / 2 - (this._size / 2 - 24)}" 
                  stroke-width="3" 
                  stroke-linecap="round" />
          </g>
        </svg>
      </div>
    `;
  }

  _attachEventListeners() {
    const container = this.shadowRoot.querySelector('.knob-container');
    
    container.addEventListener('mousedown', this._onMouseDown.bind(this));
    container.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    container.addEventListener('keydown', this._onKeyDown.bind(this));
    
    // Global listeners for drag (attached on mousedown)
    this._onMouseMoveBound = this._onMouseMove.bind(this);
    this._onMouseUpBound = this._onMouseUp.bind(this);
  }

  _onMouseDown(e) {
    if (this._disabled) return;
    
    e.preventDefault();
    this._isDragging = true;
    this._startY = e.clientY;
    this._startValue = this._value;
    
    const container = this.shadowRoot.querySelector('.knob-container');
    container.classList.add('dragging');
    
    document.addEventListener('mousemove', this._onMouseMoveBound);
    document.addEventListener('mouseup', this._onMouseUpBound);
  }

  _onMouseMove(e) {
    if (!this._isDragging) return;
    
    const deltaY = this._startY - e.clientY;
    const sensitivity = 0.005;
    const range = this._max - this._min;
    const delta = deltaY * sensitivity * range;
    
    const newValue = this._clamp(this._startValue + delta);
    const steppedValue = this._applyStep(newValue);
    
    if (steppedValue !== this._value) {
      this._value = steppedValue;
      this._updateKnobRotation();
      this._dispatchEvent('knob-input', { value: this._value });
    }
  }

  _onMouseUp() {
    if (!this._isDragging) return;
    
    this._isDragging = false;
    const container = this.shadowRoot.querySelector('.knob-container');
    container.classList.remove('dragging');
    
    document.removeEventListener('mousemove', this._onMouseMoveBound);
    document.removeEventListener('mouseup', this._onMouseUpBound);
    
    this._dispatchEvent('knob-change', { value: this._value });
  }

  _onWheel(e) {
    if (this._disabled) return;
    
    e.preventDefault();
    
    const delta = -Math.sign(e.deltaY) * this._step;
    const newValue = this._clamp(this._value + delta);
    
    if (newValue !== this._value) {
      this._value = newValue;
      this._updateKnobRotation();
      this._dispatchEvent('knob-input', { value: this._value });
      this._dispatchEvent('knob-change', { value: this._value });
    }
  }

  _onKeyDown(e) {
    if (this._disabled) return;
    
    let handled = false;
    let delta = 0;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        delta = this._step;
        handled = true;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        delta = -this._step;
        handled = true;
        break;
      case 'Home':
        this._value = this._min;
        handled = true;
        break;
      case 'End':
        this._value = this._max;
        handled = true;
        break;
    }
    
    if (handled) {
      e.preventDefault();
      
      if (delta !== 0) {
        this._value = this._clamp(this._value + delta);
      }
      
      this._updateKnobRotation();
      this._dispatchEvent('knob-input', { value: this._value });
      this._dispatchEvent('knob-change', { value: this._value });
    }
  }

  _updateKnobRotation() {
    const normalized = (this._value - this._min) / (this._max - this._min);
    const angle = this._minAngle + (normalized * (this._maxAngle - this._minAngle));
    
    const pointer = this.shadowRoot.querySelector('.knob-pointer');
    if (pointer) {
      pointer.style.transform = `rotate(${angle}deg)`;
      pointer.style.transformOrigin = `${this._size / 2}px ${this._size / 2}px`;
    }
    
    // Update arc
    this._updateArc(normalized);
    
    // Update ARIA
    const container = this.shadowRoot.querySelector('.knob-container');
    if (container) {
      container.setAttribute('aria-valuenow', this._value);
    }
  }

  _updateArc(normalized) {
    const arc = this.shadowRoot.querySelector('.knob-arc');
    if (!arc) return;
    
    const centerX = this._size / 2;
    const centerY = this._size / 2;
    const radius = this._size / 2 - 6;
    
    const startAngle = this._minAngle * Math.PI / 180;
    const endAngle = (this._minAngle + (normalized * (this._maxAngle - this._minAngle))) * Math.PI / 180;
    
    const startX = centerX + radius * Math.sin(startAngle);
    const startY = centerY - radius * Math.cos(startAngle);
    const endX = centerX + radius * Math.sin(endAngle);
    const endY = centerY - radius * Math.cos(endAngle);
    
    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;
    
    const pathData = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
    arc.setAttribute('d', pathData);
  }

  _updateSize() {
    const svg = this.shadowRoot.querySelector('.knob-svg');
    const track = this.shadowRoot.querySelector('.knob-track');
    const body = this.shadowRoot.querySelector('.knob-body');
    const indicator = this.shadowRoot.querySelector('.knob-indicator');
    
    if (svg) {
      svg.setAttribute('width', this._size);
      svg.setAttribute('height', this._size);
    }
    
    const center = this._size / 2;
    
    if (track) {
      track.setAttribute('cx', center);
      track.setAttribute('cy', center);
      track.setAttribute('r', this._size / 2 - 6);
    }
    
    if (body) {
      body.setAttribute('cx', center);
      body.setAttribute('cy', center);
      body.setAttribute('r', this._size / 2 - 10);
    }
    
    if (indicator) {
      indicator.setAttribute('x1', center);
      indicator.setAttribute('y1', center - (this._size / 2 - 16));
      indicator.setAttribute('x2', center);
      indicator.setAttribute('y2', center - (this._size / 2 - 24));
    }
    
    this._updateKnobRotation();
  }

  _updateDisabledState() {
    const container = this.shadowRoot.querySelector('.knob-container');
    if (container) {
      container.classList.toggle('disabled', this._disabled);
      container.tabIndex = this._disabled ? -1 : 0;
    }
  }

  _clamp(value) {
    return Math.max(this._min, Math.min(this._max, value));
  }

  _applyStep(value) {
    if (this._step <= 0) return value;
    return Math.round(value / this._step) * this._step;
  }

  _dispatchEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true
    }));
  }

  // Public API
  get value() {
    return this._value;
  }

  set value(val) {
    this.setAttribute('value', val);
  }

  get min() {
    return this._min;
  }

  set min(val) {
    this.setAttribute('min', val);
  }

  get max() {
    return this._max;
  }

  set max(val) {
    this.setAttribute('max', val);
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

customElements.define('harmony-knob-primitive', HarmonyKnobPrimitive);