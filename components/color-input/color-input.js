/**
 * @fileoverview Color Input Component
 * @module components/color-input
 * 
 * Color input with Hex, RGB, and HSL format switching.
 * Supports multiple input formats with real-time conversion.
 * 
 * Related documentation: DESIGN_SYSTEM.md § Color Input Component
 * 
 * @fires color-change - Emitted when color value changes
 * @fires format-change - Emitted when format is switched
 */

/**
 * Color Input Web Component
 * Provides input fields for color values in Hex, RGB, and HSL formats
 * with automatic conversion between formats.
 * 
 * @class ColorInputComponent
 * @extends HTMLElement
 * 
 * @example
 * <color-input 
 *   value="#ff5733" 
 *   format="hex"
 *   label="Background Color">
 * </color-input>
 */
class ColorInputComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._color = { r: 255, g: 87, b: 51 }; // Default color
    this._format = 'hex'; // 'hex', 'rgb', 'hsl'
    this._disabled = false;
  }

  static get observedAttributes() {
    return ['value', 'format', 'label', 'disabled'];
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'value':
        this.parseColorValue(newValue);
        break;
      case 'format':
        this._format = newValue || 'hex';
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        break;
    }

    if (this.shadowRoot) {
      this.render();
    }
  }

  /**
   * Parse color value from string
   * @param {string} value - Color value in any supported format
   */
  parseColorValue(value) {
    if (!value) return;

    if (value.startsWith('#')) {
      this._color = this.hexToRgb(value);
    } else if (value.startsWith('rgb')) {
      this._color = this.parseRgbString(value);
    } else if (value.startsWith('hsl')) {
      const hsl = this.parseHslString(value);
      this._color = this.hslToRgb(hsl);
    }
  }

  /**
   * Convert hex color to RGB
   * @param {string} hex - Hex color string
   * @returns {{r: number, g: number, b: number}}
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Convert RGB to hex
   * @param {{r: number, g: number, b: number}} rgb - RGB color object
   * @returns {string} Hex color string
   */
  rgbToHex({ r, g, b }) {
    const toHex = (n) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Convert RGB to HSL
   * @param {{r: number, g: number, b: number}} rgb - RGB color object
   * @returns {{h: number, s: number, l: number}}
   */
  rgbToHsl({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /**
   * Convert HSL to RGB
   * @param {{h: number, s: number, l: number}} hsl - HSL color object
   * @returns {{r: number, g: number, b: number}}
   */
  hslToRgb({ h, s, l }) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * Parse RGB string
   * @param {string} str - RGB string (e.g., "rgb(255, 87, 51)")
   * @returns {{r: number, g: number, b: number}}
   */
  parseRgbString(str) {
    const match = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return match ? {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Parse HSL string
   * @param {string} str - HSL string (e.g., "hsl(9, 100%, 60%)")
   * @returns {{h: number, s: number, l: number}}
   */
  parseHslString(str) {
    const match = str.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    return match ? {
      h: parseInt(match[1], 10),
      s: parseInt(match[2], 10),
      l: parseInt(match[3], 10)
    } : { h: 0, s: 0, l: 0 };
  }

  /**
   * Get current color value in specified format
   * @param {string} format - Target format ('hex', 'rgb', 'hsl')
   * @returns {string} Color value in specified format
   */
  getColorValue(format = this._format) {
    switch (format) {
      case 'hex':
        return this.rgbToHex(this._color);
      case 'rgb':
        return `rgb(${this._color.r}, ${this._color.g}, ${this._color.b})`;
      case 'hsl':
        const hsl = this.rgbToHsl(this._color);
        return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      default:
        return this.rgbToHex(this._color);
    }
  }

  /**
   * Render component
   */
  render() {
    const label = this.getAttribute('label') || 'Color';
    const hsl = this.rgbToHsl(this._color);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          --color-input-border: #d1d5db;
          --color-input-focus: #3b82f6;
          --color-input-bg: #ffffff;
          --color-input-text: #1f2937;
          --color-input-disabled: #9ca3af;
        }

        .color-input-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .color-input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .color-input-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-input-text);
        }

        .format-switcher {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          border-radius: 6px;
          padding: 2px;
        }

        .format-button {
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 500;
          border: none;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        .format-button:hover:not(:disabled) {
          background: #e5e7eb;
          color: var(--color-input-text);
        }

        .format-button.active {
          background: var(--color-input-bg);
          color: var(--color-input-text);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .format-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .color-input-fields {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .color-preview {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 2px solid var(--color-input-border);
          cursor: pointer;
          transition: border-color 0.15s ease;
          background-image: 
            linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
            linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
            linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
          background-size: 8px 8px;
          background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
          position: relative;
        }

        .color-preview-inner {
          width: 100%;
          height: 100%;
          border-radius: 6px;
          background-color: ${this.rgbToHex(this._color)};
        }

        .color-preview:hover {
          border-color: var(--color-input-focus);
        }

        .color-preview:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .input-fields {
          flex: 1;
          display: grid;
          gap: 8px;
        }

        .input-fields.hex {
          grid-template-columns: 1fr;
        }

        .input-fields.rgb,
        .input-fields.hsl {
          grid-template-columns: repeat(3, 1fr);
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .input-label {
          font-size: 11px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-field {
          width: 100%;
          padding: 8px 10px;
          font-size: 14px;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          border: 1px solid var(--color-input-border);
          border-radius: 6px;
          background: var(--color-input-bg);
          color: var(--color-input-text);
          transition: all 0.15s ease;
          box-sizing: border-box;
        }

        .input-field:hover:not(:disabled) {
          border-color: #9ca3af;
        }

        .input-field:focus {
          outline: none;
          border-color: var(--color-input-focus);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .input-field:disabled {
          background: #f3f4f6;
          color: var(--color-input-disabled);
          cursor: not-allowed;
        }

        .input-field.error {
          border-color: #ef4444;
        }

        .input-field.error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        @media (prefers-color-scheme: dark) {
          :host {
            --color-input-border: #374151;
            --color-input-bg: #1f2937;
            --color-input-text: #f9fafb;
            --color-input-disabled: #6b7280;
          }

          .format-switcher {
            background: #374151;
          }

          .format-button:hover:not(:disabled) {
            background: #4b5563;
          }

          .input-field:disabled {
            background: #374151;
          }
        }
      </style>

      <div class="color-input-container">
        <div class="color-input-header">
          <label class="color-input-label">${label}</label>
          <div class="format-switcher">
            <button 
              class="format-button ${this._format === 'hex' ? 'active' : ''}" 
              data-format="hex"
              ${this._disabled ? 'disabled' : ''}>
              HEX
            </button>
            <button 
              class="format-button ${this._format === 'rgb' ? 'active' : ''}" 
              data-format="rgb"
              ${this._disabled ? 'disabled' : ''}>
              RGB
            </button>
            <button 
              class="format-button ${this._format === 'hsl' ? 'active' : ''}" 
              data-format="hsl"
              ${this._disabled ? 'disabled' : ''}>
              HSL
            </button>
          </div>
        </div>

        <div class="color-input-fields">
          <div class="color-preview" ${this._disabled ? 'disabled' : ''}>
            <div class="color-preview-inner"></div>
          </div>

          ${this.renderInputFields(hsl)}
        </div>
      </div>
    `;
  }

  /**
   * Render input fields based on current format
   * @param {{h: number, s: number, l: number}} hsl - HSL color object
   * @returns {string} HTML string for input fields
   */
  renderInputFields(hsl) {
    switch (this._format) {
      case 'hex':
        return `
          <div class="input-fields hex">
            <div class="input-group">
              <label class="input-label">Hex</label>
              <input 
                type="text" 
                class="input-field hex-input" 
                value="${this.rgbToHex(this._color)}"
                placeholder="#000000"
                maxlength="7"
                ${this._disabled ? 'disabled' : ''}>
            </div>
          </div>
        `;

      case 'rgb':
        return `
          <div class="input-fields rgb">
            <div class="input-group">
              <label class="input-label">R</label>
              <input 
                type="number" 
                class="input-field rgb-r-input" 
                value="${this._color.r}"
                min="0"
                max="255"
                ${this._disabled ? 'disabled' : ''}>
            </div>
            <div class="input-group">
              <label class="input-label">G</label>
              <input 
                type="number" 
                class="input-field rgb-g-input" 
                value="${this._color.g}"
                min="0"
                max="255"
                ${this._disabled ? 'disabled' : ''}>
            </div>
            <div class="input-group">
              <label class="input-label">B</label>
              <input 
                type="number" 
                class="input-field rgb-b-input" 
                value="${this._color.b}"
                min="0"
                max="255"
                ${this._disabled ? 'disabled' : ''}>
            </div>
          </div>
        `;

      case 'hsl':
        return `
          <div class="input-fields hsl">
            <div class="input-group">
              <label class="input-label">H</label>
              <input 
                type="number" 
                class="input-field hsl-h-input" 
                value="${hsl.h}"
                min="0"
                max="360"
                ${this._disabled ? 'disabled' : ''}>
            </div>
            <div class="input-group">
              <label class="input-label">S</label>
              <input 
                type="number" 
                class="input-field hsl-s-input" 
                value="${hsl.s}"
                min="0"
                max="100"
                ${this._disabled ? 'disabled' : ''}>
            </div>
            <div class="input-group">
              <label class="input-label">L</label>
              <input 
                type="number" 
                class="input-field hsl-l-input" 
                value="${hsl.l}"
                min="0"
                max="100"
                ${this._disabled ? 'disabled' : ''}>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.shadowRoot.addEventListener('click', this.handleFormatSwitch.bind(this));
    this.shadowRoot.addEventListener('input', this.handleInput.bind(this));
    this.shadowRoot.addEventListener('change', this.handleChange.bind(this));
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    this.shadowRoot.removeEventListener('click', this.handleFormatSwitch.bind(this));
    this.shadowRoot.removeEventListener('input', this.handleInput.bind(this));
    this.shadowRoot.removeEventListener('change', this.handleChange.bind(this));
  }

  /**
   * Handle format switch button clicks
   * @param {Event} event - Click event
   */
  handleFormatSwitch(event) {
    const button = event.target.closest('.format-button');
    if (!button || button.disabled) return;

    const newFormat = button.dataset.format;
    if (newFormat && newFormat !== this._format) {
      this._format = newFormat;
      this.setAttribute('format', newFormat);
      this.render();
      this.attachEventListeners();

      this.dispatchEvent(new CustomEvent('format-change', {
        detail: { format: newFormat },
        bubbles: true,
        composed: true
      }));
    }
  }

  /**
   * Handle input changes (real-time)
   * @param {Event} event - Input event
   */
  handleInput(event) {
    const input = event.target;
    if (!input.classList.contains('input-field')) return;

    this.updateColorFromInput(input);
  }

  /**
   * Handle input change (on blur/enter)
   * @param {Event} event - Change event
   */
  handleChange(event) {
    const input = event.target;
    if (!input.classList.contains('input-field')) return;

    this.updateColorFromInput(input);
    this.emitColorChange();
  }

  /**
   * Update color from input field
   * @param {HTMLInputElement} input - Input element
   */
  updateColorFromInput(input) {
    try {
      switch (this._format) {
        case 'hex':
          if (input.classList.contains('hex-input')) {
            let hex = input.value.trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
              this._color = this.hexToRgb(hex);
              input.classList.remove('error');
              this.updatePreview();
            } else {
              input.classList.add('error');
            }
          }
          break;

        case 'rgb':
          if (input.classList.contains('rgb-r-input')) {
            this._color.r = this.clamp(parseInt(input.value, 10), 0, 255);
          } else if (input.classList.contains('rgb-g-input')) {
            this._color.g = this.clamp(parseInt(input.value, 10), 0, 255);
          } else if (input.classList.contains('rgb-b-input')) {
            this._color.b = this.clamp(parseInt(input.value, 10), 0, 255);
          }
          input.classList.remove('error');
          this.updatePreview();
          break;

        case 'hsl':
          let h, s, l;
          const currentHsl = this.rgbToHsl(this._color);
          
          if (input.classList.contains('hsl-h-input')) {
            h = this.clamp(parseInt(input.value, 10), 0, 360);
            s = currentHsl.s;
            l = currentHsl.l;
          } else if (input.classList.contains('hsl-s-input')) {
            h = currentHsl.h;
            s = this.clamp(parseInt(input.value, 10), 0, 100);
            l = currentHsl.l;
          } else if (input.classList.contains('hsl-l-input')) {
            h = currentHsl.h;
            s = currentHsl.s;
            l = this.clamp(parseInt(input.value, 10), 0, 100);
          }
          
          this._color = this.hslToRgb({ h, s, l });
          input.classList.remove('error');
          this.updatePreview();
          break;
      }
    } catch (error) {
      input.classList.add('error');
      console.error('Color input error:', error);
    }
  }

  /**
   * Clamp value between min and max
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, isNaN(value) ? min : value));
  }

  /**
   * Update color preview
   */
  updatePreview() {
    const preview = this.shadowRoot.querySelector('.color-preview-inner');
    if (preview) {
      preview.style.backgroundColor = this.rgbToHex(this._color);
    }
  }

  /**
   * Emit color change event
   */
  emitColorChange() {
    this.dispatchEvent(new CustomEvent('color-change', {
      detail: {
        value: this.getColorValue(),
        rgb: { ...this._color },
        hex: this.rgbToHex(this._color),
        hsl: this.rgbToHsl(this._color)
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Get current color value
   * @returns {string} Color value in current format
   */
  get value() {
    return this.getColorValue();
  }

  /**
   * Set color value
   * @param {string} value - Color value in any supported format
   */
  set value(value) {
    this.setAttribute('value', value);
  }

  /**
   * Get current format
   * @returns {string} Current format ('hex', 'rgb', 'hsl')
   */
  get format() {
    return this._format;
  }

  /**
   * Set format
   * @param {string} format - Format to set
   */
  set format(format) {
    this.setAttribute('format', format);
  }
}

// Register custom element
customElements.define('color-input', ColorInputComponent);

export default ColorInputComponent;