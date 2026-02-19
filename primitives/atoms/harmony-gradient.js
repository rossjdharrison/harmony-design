/**
 * @fileoverview Harmony Gradient Atom
 * @module primitives/atoms/harmony-gradient
 * 
 * Configurable gradient background component supporting linear, radial, and conic gradients.
 * Provides declarative API for gradient configuration with CSS custom properties.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#gradient-atom}
 * 
 * Performance considerations:
 * - Uses CSS gradients (GPU-accelerated)
 * - No JavaScript animation loop
 * - Shadow DOM for style encapsulation
 * 
 * @example
 * <harmony-gradient 
 *   type="linear" 
 *   angle="45deg"
 *   stops='[{"color": "#ff0000", "position": "0%"}, {"color": "#0000ff", "position": "100%"}]'>
 * </harmony-gradient>
 */

/**
 * HarmonyGradient - Configurable gradient background atom
 * 
 * @class HarmonyGradient
 * @extends HTMLElement
 * 
 * @attr {string} type - Gradient type: "linear", "radial", or "conic" (default: "linear")
 * @attr {string} angle - Angle for linear/conic gradients (default: "180deg")
 * @attr {string} shape - Shape for radial gradients: "circle" or "ellipse" (default: "ellipse")
 * @attr {string} position - Position of gradient center (default: "center center")
 * @attr {string} stops - JSON array of color stops with color and position
 * @attr {string} size - Size for radial gradients: "closest-side", "farthest-side", etc.
 * 
 * @fires gradient-ready - Dispatched when gradient is rendered
 * @fires gradient-error - Dispatched when gradient configuration is invalid
 */
class HarmonyGradient extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Default gradient stops
    this._stops = [
      { color: 'var(--gradient-start, #667eea)', position: '0%' },
      { color: 'var(--gradient-end, #764ba2)', position: '100%' }
    ];
  }

  static get observedAttributes() {
    return ['type', 'angle', 'shape', 'position', 'stops', 'size'];
  }

  connectedCallback() {
    this._render();
    this._dispatchReady();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'stops') {
        this._parseStops(newValue);
      }
      this._render();
    }
  }

  /**
   * Parse color stops from JSON string
   * @private
   * @param {string} stopsJson - JSON array of color stops
   */
  _parseStops(stopsJson) {
    try {
      const parsed = JSON.parse(stopsJson);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        this._stops = parsed;
      } else {
        this._dispatchError('Stops must be an array with at least 2 color stops');
      }
    } catch (e) {
      this._dispatchError(`Invalid stops JSON: ${e.message}`);
    }
  }

  /**
   * Build gradient CSS string based on type and configuration
   * @private
   * @returns {string} CSS gradient value
   */
  _buildGradient() {
    const type = this.getAttribute('type') || 'linear';
    const stopsString = this._stops
      .map(stop => `${stop.color} ${stop.position}`)
      .join(', ');

    switch (type) {
      case 'linear':
        return this._buildLinearGradient(stopsString);
      case 'radial':
        return this._buildRadialGradient(stopsString);
      case 'conic':
        return this._buildConicGradient(stopsString);
      default:
        this._dispatchError(`Unknown gradient type: ${type}`);
        return this._buildLinearGradient(stopsString);
    }
  }

  /**
   * Build linear gradient CSS
   * @private
   * @param {string} stopsString - Formatted color stops
   * @returns {string} CSS linear-gradient value
   */
  _buildLinearGradient(stopsString) {
    const angle = this.getAttribute('angle') || '180deg';
    return `linear-gradient(${angle}, ${stopsString})`;
  }

  /**
   * Build radial gradient CSS
   * @private
   * @param {string} stopsString - Formatted color stops
   * @returns {string} CSS radial-gradient value
   */
  _buildRadialGradient(stopsString) {
    const shape = this.getAttribute('shape') || 'ellipse';
    const size = this.getAttribute('size') || 'farthest-corner';
    const position = this.getAttribute('position') || 'center center';
    return `radial-gradient(${shape} ${size} at ${position}, ${stopsString})`;
  }

  /**
   * Build conic gradient CSS
   * @private
   * @param {string} stopsString - Formatted color stops
   * @returns {string} CSS conic-gradient value
   */
  _buildConicGradient(stopsString) {
    const angle = this.getAttribute('angle') || '0deg';
    const position = this.getAttribute('position') || 'center center';
    return `conic-gradient(from ${angle} at ${position}, ${stopsString})`;
  }

  /**
   * Render component with current configuration
   * @private
   */
  _render() {
    const gradient = this._buildGradient();
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          min-height: var(--gradient-min-height, 100px);
          position: relative;
          contain: layout style paint;
        }

        .gradient-container {
          width: 100%;
          height: 100%;
          background: ${gradient};
          border-radius: var(--gradient-radius, 0);
          transition: background var(--gradient-transition, 0.3s ease);
        }

        /* Support for content overlay */
        ::slotted(*) {
          position: relative;
          z-index: 1;
        }
      </style>
      <div class="gradient-container">
        <slot></slot>
      </div>
    `;
  }

  /**
   * Dispatch gradient-ready event
   * @private
   */
  _dispatchReady() {
    this.dispatchEvent(new CustomEvent('gradient-ready', {
      bubbles: true,
      composed: true,
      detail: {
        type: this.getAttribute('type') || 'linear',
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Dispatch gradient-error event
   * @private
   * @param {string} message - Error message
   */
  _dispatchError(message) {
    console.error(`[HarmonyGradient] ${message}`);
    this.dispatchEvent(new CustomEvent('gradient-error', {
      bubbles: true,
      composed: true,
      detail: {
        message,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Programmatically update gradient stops
   * @public
   * @param {Array<{color: string, position: string}>} stops - Array of color stops
   */
  setStops(stops) {
    if (!Array.isArray(stops) || stops.length < 2) {
      this._dispatchError('setStops requires an array with at least 2 stops');
      return;
    }
    this._stops = stops;
    this._render();
  }

  /**
   * Get current gradient configuration
   * @public
   * @returns {Object} Current gradient configuration
   */
  getConfig() {
    return {
      type: this.getAttribute('type') || 'linear',
      angle: this.getAttribute('angle') || '180deg',
      shape: this.getAttribute('shape') || 'ellipse',
      position: this.getAttribute('position') || 'center center',
      size: this.getAttribute('size') || 'farthest-corner',
      stops: this._stops
    };
  }
}

customElements.define('harmony-gradient', HarmonyGradient);

export { HarmonyGradient };