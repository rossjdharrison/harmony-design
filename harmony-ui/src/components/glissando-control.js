/**
 * @fileoverview Web Component for glissando-based parameter control.
 * Provides a visual control surface with glissando gesture detection.
 * See harmony-design/DESIGN_SYSTEM.md#glissando-control for usage.
 * 
 * @module components/glissando-control
 */

import { GlissandoDetector } from '../gestures/glissando-detector.js';

/**
 * Visual control surface with glissando gesture detection.
 * Displays current value and responds to mouse/touch gestures.
 * 
 * @element glissando-control
 * 
 * @attr {string} direction - Movement direction: 'horizontal', 'vertical', 'both'
 * @attr {number} value - Current value (within min-max range)
 * @attr {number} min - Minimum value (default: 0)
 * @attr {number} max - Maximum value (default: 100)
 * @attr {number} sensitivity - Movement sensitivity (default: 1.0)
 * @attr {number} steps - Number of discrete steps (0 = continuous)
 * @attr {string} label - Control label text
 * @attr {boolean} disabled - Whether control is disabled
 * 
 * @fires glissando-change - Fired when value changes
 * @fires glissando-start - Fired when gesture starts
 * @fires glissando-end - Fired when gesture ends
 * 
 * @example
 * <glissando-control
 *   direction="vertical"
 *   value="50"
 *   min="0"
 *   max="100"
 *   label="Volume"
 * ></glissando-control>
 */
export class GlissandoControl extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._detector = null;
    this._value = 0;
  }

  static get observedAttributes() {
    return ['direction', 'value', 'min', 'max', 'sensitivity', 'steps', 'label', 'disabled'];
  }

  connectedCallback() {
    this._render();
    this._initializeDetector();
  }

  disconnectedCallback() {
    if (this._detector) {
      this._detector.destroy();
      this._detector = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'value') {
      this._value = parseFloat(newValue) || 0;
      if (this._detector) {
        this._detector.setValue(this._value);
      }
      this._updateDisplay();
    } else if (name === 'disabled') {
      this._updateDisabledState();
    } else {
      // Reinitialize detector for other config changes
      if (this._detector) {
        this._detector.destroy();
        this._initializeDetector();
      }
    }
  }

  /**
   * Renders the component template.
   * @private
   */
  _render() {
    const direction = this.getAttribute('direction') || 'vertical';
    const label = this.getAttribute('label') || '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          --control-size: 120px;
          --control-bg: #2a2a2a;
          --control-fg: #4a9eff;
          --control-border: #3a3a3a;
          --control-text: #e0e0e0;
          --control-disabled: #1a1a1a;
        }

        .container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .label {
          font-size: 12px;
          color: var(--control-text);
          font-weight: 500;
        }

        .control-surface {
          width: var(--control-size);
          height: var(--control-size);
          background: var(--control-bg);
          border: 2px solid var(--control-border);
          border-radius: 8px;
          position: relative;
          cursor: ns-resize;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .control-surface.horizontal {
          cursor: ew-resize;
        }

        .control-surface.both {
          cursor: move;
        }

        .control-surface:hover:not(.disabled) {
          border-color: var(--control-fg);
        }

        .control-surface.active {
          border-color: var(--control-fg);
          box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.2);
        }

        .control-surface.disabled {
          background: var(--control-disabled);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .value-indicator {
          position: absolute;
          background: var(--control-fg);
          transition: all 0.1s ease-out;
        }

        .value-indicator.vertical {
          left: 0;
          right: 0;
          bottom: 0;
          height: 0%;
        }

        .value-indicator.horizontal {
          top: 0;
          bottom: 0;
          left: 0;
          width: 0%;
        }

        .value-display {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          font-weight: 600;
          color: var(--control-text);
          pointer-events: none;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .control-surface.disabled .value-display {
          opacity: 0.5;
        }
      </style>

      <div class="container">
        ${label ? `<div class="label">${label}</div>` : ''}
        <div class="control-surface ${direction}" part="surface">
          <div class="value-indicator ${direction}" part="indicator"></div>
          <div class="value-display" part="display">0</div>
        </div>
      </div>
    `;

    this._updateDisplay();
    this._updateDisabledState();
  }

  /**
   * Initializes the glissando detector.
   * @private
   */
  _initializeDetector() {
    const surface = this.shadowRoot.querySelector('.control-surface');
    if (!surface) return;

    const direction = this.getAttribute('direction') || 'vertical';
    const min = parseFloat(this.getAttribute('min')) || 0;
    const max = parseFloat(this.getAttribute('max')) || 100;
    const sensitivity = parseFloat(this.getAttribute('sensitivity')) || 1.0;
    const steps = parseInt(this.getAttribute('steps')) || 0;

    this._value = parseFloat(this.getAttribute('value')) || min;

    this._detector = new GlissandoDetector(surface, {
      direction,
      range: [min, max],
      sensitivity,
      steps,
      snapToSteps: steps > 0
    });

    this._detector.setValue(this._value);

    this._detector.on('glissando', (event) => {
      if (this.hasAttribute('disabled')) return;

      this._value = event.value;
      this._updateDisplay();

      // Update surface state
      if (event.phase === 'start') {
        surface.classList.add('active');
        this.dispatchEvent(new CustomEvent('glissando-start', {
          detail: { value: event.value },
          bubbles: true,
          composed: true
        }));
      } else if (event.phase === 'end') {
        surface.classList.remove('active');
        this.dispatchEvent(new CustomEvent('glissando-end', {
          detail: { value: event.value },
          bubbles: true,
          composed: true
        }));
      }

      // Emit change event
      this.dispatchEvent(new CustomEvent('glissando-change', {
        detail: {
          value: event.value,
          phase: event.phase,
          velocity: event.velocity
        },
        bubbles: true,
        composed: true
      }));
    });
  }

  /**
   * Updates the visual display of current value.
   * @private
   */
  _updateDisplay() {
    const indicator = this.shadowRoot.querySelector('.value-indicator');
    const display = this.shadowRoot.querySelector('.value-display');
    if (!indicator || !display) return;

    const min = parseFloat(this.getAttribute('min')) || 0;
    const max = parseFloat(this.getAttribute('max')) || 100;
    const range = max - min;
    const percentage = ((this._value - min) / range) * 100;

    const direction = this.getAttribute('direction') || 'vertical';
    if (direction === 'vertical') {
      indicator.style.height = `${percentage}%`;
    } else if (direction === 'horizontal') {
      indicator.style.width = `${percentage}%`;
    }

    // Format display value
    const steps = parseInt(this.getAttribute('steps')) || 0;
    const displayValue = steps > 0 ? Math.round(this._value) : this._value.toFixed(1);
    display.textContent = displayValue;
  }

  /**
   * Updates disabled state styling.
   * @private
   */
  _updateDisabledState() {
    const surface = this.shadowRoot.querySelector('.control-surface');
    if (!surface) return;

    if (this.hasAttribute('disabled')) {
      surface.classList.add('disabled');
    } else {
      surface.classList.remove('disabled');
    }
  }

  /**
   * Gets the current value.
   * @returns {number}
   */
  get value() {
    return this._value;
  }

  /**
   * Sets the current value.
   * @param {number} val
   */
  set value(val) {
    const min = parseFloat(this.getAttribute('min')) || 0;
    const max = parseFloat(this.getAttribute('max')) || 100;
    this._value = Math.max(min, Math.min(max, val));
    this.setAttribute('value', this._value.toString());
  }
}

customElements.define('glissando-control', GlissandoControl);