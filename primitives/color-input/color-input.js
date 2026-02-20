/**
 * @fileoverview ColorInput primitive component supporting hex, RGB, and HSL formats
 * @module primitives/color-input
 * 
 * Provides a color input control that accepts multiple format inputs:
 * - Hex: #RRGGBB or #RGB
 * - RGB: rgb(r, g, b) or r, g, b
 * - HSL: hsl(h, s%, l%) or h, s%, l%
 * 
 * Events published:
 * - color-input:changed { hex, rgb, hsl, source }
 * - color-input:format-changed { format }
 * - color-input:invalid { value, reason }
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#color-input}
 */

/**
 * ColorInput Web Component
 * Supports hex, RGB, and HSL color input formats with automatic conversion
 * 
 * @extends HTMLElement
 * 
 * @attr {string} value - Current color value in any supported format
 * @attr {string} format - Display format: 'hex', 'rgb', or 'hsl' (default: 'hex')
 * @attr {boolean} disabled - Whether the input is disabled
 * @attr {string} label - Label text for the input
 * 
 * @fires color-input:changed - When color value changes
 * @fires color-input:format-changed - When display format changes
 * @fires color-input:invalid - When invalid color value is entered
 * 
 * @example
 * <color-input value="#ff5733" format="hex" label="Background Color"></color-input>
 */
class ColorInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._color = { r: 255, g: 87, b: 51 }; // Default color
    this._format = 'hex';
    this._disabled = false;
    this._label = '';
  }

  static get observedAttributes() {
    return ['value', 'format', 'disabled', 'label'];
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    this.detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'value':
        this.setValue(newValue);
        break;
      case 'format':
        this._format = newValue || 'hex';
        this.render();
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        this.render();
        break;
      case 'label':
        this._label = newValue || '';
        this.render();
        break;
    }
  }

  /**
   * Sets the color value from any supported format
   * @param {string} value - Color value in hex, RGB, or HSL format
   * @private
   */
  setValue(value) {
    if (!value) return;

    const parsed = this.parseColor(value);
    if (parsed) {
      this._color = parsed;
      this.render();
      this.dispatchColorChanged('input');
    } else {
      this.dispatchInvalidColor(value, 'Unrecognized color format');
    }
  }

  /**
   * Parses color string into RGB object
   * @param {string} value - Color string in any supported format
   * @returns {{r: number, g: number, b: number}|null} RGB color object or null if invalid
   * @private
   */
  parseColor(value) {
    const trimmed = value.trim();

    // Try hex format
    if (trimmed.startsWith('#')) {
      return this.parseHex(trimmed);
    }

    // Try RGB format
    if (trimmed.startsWith('rgb')) {
      return this.parseRGB(trimmed);
    }

    // Try HSL format
    if (trimmed.startsWith('hsl')) {
      return this.parseHSL(trimmed);
    }

    // Try bare RGB values (e.g., "255, 87, 51")
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => parseInt(p.trim(), 10));
      if (parts.length === 3 && parts.every(p => p >= 0 && p <= 255)) {
        return { r: parts[0], g: parts[1], b: parts[2] };
      }
    }

    return null;
  }

  /**
   * Parses hex color string
   * @param {string} hex - Hex color string (#RGB or #RRGGBB)
   * @returns {{r: number, g: number, b: number}|null}
   * @private
   */
  parseHex(hex) {
    const cleaned = hex.replace('#', '');
    
    if (cleaned.length === 3) {
      const r = parseInt(cleaned[0] + cleaned[0], 16);
      const g = parseInt(cleaned[1] + cleaned[1], 16);
      const b = parseInt(cleaned[2] + cleaned[2], 16);
      return { r, g, b };
    }
    
    if (cleaned.length === 6) {
      const r = parseInt(cleaned.substring(0, 2), 16);
      const g = parseInt(cleaned.substring(2, 4), 16);
      const b = parseInt(cleaned.substring(4, 6), 16);
      return { r, g, b };
    }

    return null;
  }

  /**
   * Parses RGB color string
   * @param {string} rgb - RGB color string (rgb(r, g, b))
   * @returns {{r: number, g: number, b: number}|null}
   * @private
   */
  parseRGB(rgb) {
    const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        return { r, g, b };
      }
    }
    return null;
  }

  /**
   * Parses HSL color string
   * @param {string} hsl - HSL color string (hsl(h, s%, l%))
   * @returns {{r: number, g: number, b: number}|null}
   * @private
   */
  parseHSL(hsl) {
    const match = hsl.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
    if (match) {
      const h = parseInt(match[1], 10);
      const s = parseInt(match[2], 10);
      const l = parseInt(match[3], 10);
      
      if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
        return this.hslToRgb(h, s, l);
      }
    }
    return null;
  }

  /**
   * Converts HSL to RGB
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {{r: number, g: number, b: number}}
   * @private
   */
  hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

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
   * Converts RGB to HSL
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {{h: number, s: number, l: number}}
   * @private
   */
  rgbToHsl(r, g, b) {
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
   * Formats color as hex string
   * @returns {string} Hex color string
   * @private
   */
  toHex() {
    const { r, g, b } = this._color;
    const hex = (n) => n.toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }

  /**
   * Formats color as RGB string
   * @returns {string} RGB color string
   * @private
   */
  toRGB() {
    const { r, g, b } = this._color;
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Formats color as HSL string
   * @returns {string} HSL color string
   * @private
   */
  toHSL() {
    const { r, g, b } = this._color;
    const { h, s, l } = this.rgbToHsl(r, g, b);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  /**
   * Gets formatted color string based on current format
   * @returns {string} Formatted color string
   * @private
   */
  getFormattedValue() {
    switch (this._format) {
      case 'rgb': return this.toRGB();
      case 'hsl': return this.toHSL();
      default: return this.toHex();
    }
  }

  /**
   * Dispatches color changed event
   * @param {string} source - Source of change ('input', 'picker', 'format')
   * @private
   */
  dispatchColorChanged(source) {
    const event = new CustomEvent('color-input:changed', {
      bubbles: true,
      composed: true,
      detail: {
        hex: this.toHex(),
        rgb: this.toRGB(),
        hsl: this.toHSL(),
        source
      }
    });
    this.dispatchEvent(event);
  }

  /**
   * Dispatches invalid color event
   * @param {string} value - Invalid value
   * @param {string} reason - Reason for invalidity
   * @private
   */
  dispatchInvalidColor(value, reason) {
    const event = new CustomEvent('color-input:invalid', {
      bubbles: true,
      composed: true,
      detail: { value, reason }
    });
    this.dispatchEvent(event);
  }

  /**
   * Dispatches format changed event
   * @param {string} format - New format
   * @private
   */
  dispatchFormatChanged(format) {
    const event = new CustomEvent('color-input:format-changed', {
      bubbles: true,
      composed: true,
      detail: { format }
    });
    this.dispatchEvent(event);
  }

  /**
   * Handles input value changes
   * @param {Event} e - Input event
   * @private
   */
  handleInput(e) {
    const value = e.target.value;
    const parsed = this.parseColor(value);
    
    if (parsed) {
      this._color = parsed;
      this.updateColorPreview();
      this.dispatchColorChanged('input');
    }
  }

  /**
   * Handles color picker changes
   * @param {Event} e - Input event from color picker
   * @private
   */
  handlePickerChange(e) {
    const hex = e.target.value;
    const parsed = this.parseHex(hex);
    
    if (parsed) {
      this._color = parsed;
      this.updateTextInput();
      this.dispatchColorChanged('picker');
    }
  }

  /**
   * Handles format selector changes
   * @param {Event} e - Change event from format selector
   * @private
   */
  handleFormatChange(e) {
    this._format = e.target.value;
    this.updateTextInput();
    this.dispatchFormatChanged(this._format);
  }

  /**
   * Updates color preview swatch
   * @private
   */
  updateColorPreview() {
    const swatch = this.shadowRoot.querySelector('.color-swatch');
    if (swatch) {
      swatch.style.backgroundColor = this.toHex();
    }
  }

  /**
   * Updates text input with current color in selected format
   * @private
   */
  updateTextInput() {
    const input = this.shadowRoot.querySelector('.color-text-input');
    if (input) {
      input.value = this.getFormattedValue();
    }
  }

  /**
   * Attaches event listeners
   * @private
   */
  attachEventListeners() {
    const textInput = this.shadowRoot.querySelector('.color-text-input');
    const picker = this.shadowRoot.querySelector('.color-picker');
    const formatSelector = this.shadowRoot.querySelector('.format-selector');

    if (textInput) {
      textInput.addEventListener('input', this.handleInput.bind(this));
    }
    if (picker) {
      picker.addEventListener('input', this.handlePickerChange.bind(this));
    }
    if (formatSelector) {
      formatSelector.addEventListener('change', this.handleFormatChange.bind(this));
    }
  }

  /**
   * Detaches event listeners
   * @private
   */
  detachEventListeners() {
    const textInput = this.shadowRoot.querySelector('.color-text-input');
    const picker = this.shadowRoot.querySelector('.color-picker');
    const formatSelector = this.shadowRoot.querySelector('.format-selector');

    if (textInput) {
      textInput.removeEventListener('input', this.handleInput.bind(this));
    }
    if (picker) {
      picker.removeEventListener('input', this.handlePickerChange.bind(this));
    }
    if (formatSelector) {
      formatSelector.removeEventListener('change', this.handleFormatChange.bind(this));
    }
  }

  /**
   * Renders the component
   * @private
   */
  render() {
    const formattedValue = this.getFormattedValue();
    const hexValue = this.toHex();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
        }

        .color-input-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .label {
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-picker {
          width: 40px;
          height: 40px;
          border: 2px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .color-picker:hover:not(:disabled) {
          border-color: #999;
        }

        .color-picker:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .color-swatch {
          width: 40px;
          height: 40px;
          border: 2px solid #ddd;
          border-radius: 4px;
          background-color: ${hexValue};
          transition: transform 0.2s;
        }

        .color-text-input {
          flex: 1;
          padding: 8px 12px;
          border: 2px solid #ddd;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .color-text-input:focus {
          outline: none;
          border-color: #4a90e2;
        }

        .color-text-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .format-selector {
          padding: 8px 12px;
          border: 2px solid #ddd;
          border-radius: 4px;
          background-color: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .format-selector:focus {
          outline: none;
          border-color: #4a90e2;
        }

        .format-selector:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      </style>

      <div class="color-input-container">
        ${this._label ? `<div class="label">${this._label}</div>` : ''}
        <div class="input-row">
          <input 
            type="color" 
            class="color-picker" 
            value="${hexValue}"
            ${this._disabled ? 'disabled' : ''}
          />
          <div class="color-swatch"></div>
          <input 
            type="text" 
            class="color-text-input" 
            value="${formattedValue}"
            ${this._disabled ? 'disabled' : ''}
          />
          <select class="format-selector" ${this._disabled ? 'disabled' : ''}>
            <option value="hex" ${this._format === 'hex' ? 'selected' : ''}>HEX</option>
            <option value="rgb" ${this._format === 'rgb' ? 'selected' : ''}>RGB</option>
            <option value="hsl" ${this._format === 'hsl' ? 'selected' : ''}>HSL</option>
          </select>
        </div>
      </div>
    `;
  }
}

customElements.define('color-input', ColorInput);

export { ColorInput };