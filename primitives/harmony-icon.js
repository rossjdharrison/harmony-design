/**
 * @fileoverview Icon Component - Renders icons from SVG sprite
 * @module primitives/harmony-icon
 * 
 * Renders icons from an SVG sprite sheet using <use> element.
 * Supports sizing, color theming, and accessibility.
 * 
 * @example
 * <harmony-icon icon="play" size="24"></harmony-icon>
 * <harmony-icon icon="pause" size="32" color="var(--color-primary)"></harmony-icon>
 * 
 * @see DESIGN_SYSTEM.md#icon-component
 */

/**
 * HarmonyIcon - Web Component for rendering SVG icons from sprite
 * 
 * @class HarmonyIcon
 * @extends HTMLElement
 * 
 * @attr {string} icon - Icon identifier from sprite (e.g., "play", "pause")
 * @attr {string} size - Icon size in pixels (default: 24)
 * @attr {string} color - Icon color (default: currentColor)
 * @attr {string} label - Accessible label for screen readers
 * @attr {string} sprite - Path to sprite file (default: /assets/icons.svg)
 * 
 * @fires icon-load - Dispatched when icon loads successfully
 * @fires icon-error - Dispatched when icon fails to load
 */
class HarmonyIcon extends HTMLElement {
  static get observedAttributes() {
    return ['icon', 'size', 'color', 'label', 'sprite'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Default values
    this._icon = '';
    this._size = 24;
    this._color = 'currentColor';
    this._label = '';
    this._sprite = '/assets/icons.svg';
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'icon':
        this._icon = newValue || '';
        break;
      case 'size':
        this._size = parseInt(newValue, 10) || 24;
        break;
      case 'color':
        this._color = newValue || 'currentColor';
        break;
      case 'label':
        this._label = newValue || '';
        break;
      case 'sprite':
        this._sprite = newValue || '/assets/icons.svg';
        break;
    }

    if (this.isConnected) {
      this._render();
    }
  }

  /**
   * Renders the icon component
   * @private
   */
  _render() {
    const hasLabel = this._label && this._label.trim() !== '';
    const role = hasLabel ? 'img' : 'presentation';
    const ariaLabel = hasLabel ? this._label : null;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
        }

        svg {
          width: 100%;
          height: 100%;
          fill: var(--icon-color, currentColor);
          display: block;
        }

        :host([hidden]) {
          display: none;
        }

        /* Performance optimization - use GPU compositing */
        svg {
          will-change: transform;
          transform: translateZ(0);
        }
      </style>
      <svg
        width="${this._size}"
        height="${this._size}"
        role="${role}"
        ${ariaLabel ? `aria-label="${ariaLabel}"` : 'aria-hidden="true"'}
        part="icon"
      >
        <use href="${this._sprite}#${this._icon}"></use>
      </svg>
    `;

    // Update CSS custom property for color
    this.style.setProperty('--icon-color', this._color);

    // Dispatch load event
    this._dispatchLoadEvent();
  }

  /**
   * Dispatches icon load event
   * @private
   */
  _dispatchLoadEvent() {
    // Check if icon exists in sprite (basic check)
    const use = this.shadowRoot.querySelector('use');
    if (use) {
      use.addEventListener('load', () => {
        this.dispatchEvent(new CustomEvent('icon-load', {
          bubbles: true,
          composed: true,
          detail: { icon: this._icon }
        }));
      }, { once: true });

      use.addEventListener('error', () => {
        this.dispatchEvent(new CustomEvent('icon-error', {
          bubbles: true,
          composed: true,
          detail: { 
            icon: this._icon,
            message: `Failed to load icon: ${this._icon}`
          }
        }));
        console.error(`[HarmonyIcon] Failed to load icon: ${this._icon} from ${this._sprite}`);
      }, { once: true });
    }
  }

  /**
   * Gets the current icon identifier
   * @returns {string}
   */
  get icon() {
    return this._icon;
  }

  /**
   * Sets the icon identifier
   * @param {string} value
   */
  set icon(value) {
    this.setAttribute('icon', value);
  }

  /**
   * Gets the current size
   * @returns {number}
   */
  get size() {
    return this._size;
  }

  /**
   * Sets the size
   * @param {number} value
   */
  set size(value) {
    this.setAttribute('size', value.toString());
  }

  /**
   * Gets the current color
   * @returns {string}
   */
  get color() {
    return this._color;
  }

  /**
   * Sets the color
   * @param {string} value
   */
  set color(value) {
    this.setAttribute('color', value);
  }

  /**
   * Gets the accessible label
   * @returns {string}
   */
  get label() {
    return this._label;
  }

  /**
   * Sets the accessible label
   * @param {string} value
   */
  set label(value) {
    this.setAttribute('label', value);
  }

  /**
   * Gets the sprite path
   * @returns {string}
   */
  get sprite() {
    return this._sprite;
  }

  /**
   * Sets the sprite path
   * @param {string} value
   */
  set sprite(value) {
    this.setAttribute('sprite', value);
  }
}

// Register the custom element
customElements.define('harmony-icon', HarmonyIcon);

export { HarmonyIcon };