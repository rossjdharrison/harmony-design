/**
 * @fileoverview Icon Atom Component - SVG icon wrapper with size and color variants
 * 
 * Provides a standardized way to render Lucide icons with consistent sizing,
 * coloring, and accessibility features. Icons are loaded dynamically from
 * Lucide CDN to avoid bundling all icons.
 * 
 * Performance: Icons are cached after first load. Render budget: <1ms per icon.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#icon-atom} for design documentation
 */

/**
 * Icon sizes mapped to pixel dimensions
 * @type {Object.<string, number>}
 */
const ICON_SIZES = {
  'xs': 12,
  'sm': 16,
  'md': 20,
  'lg': 24,
  'xl': 32,
  'xxl': 48
};

/**
 * Icon color variants mapped to CSS custom properties
 * @type {Object.<string, string>}
 */
const ICON_COLORS = {
  'primary': 'var(--color-primary, #3b82f6)',
  'secondary': 'var(--color-secondary, #64748b)',
  'success': 'var(--color-success, #10b981)',
  'warning': 'var(--color-warning, #f59e0b)',
  'error': 'var(--color-error, #ef4444)',
  'muted': 'var(--color-text-muted, #94a3b8)',
  'inherit': 'currentColor'
};

/**
 * Cache for loaded icon SVG strings
 * @type {Map<string, string>}
 */
const iconCache = new Map();

/**
 * HarmonyIcon - SVG icon wrapper component
 * 
 * @element harmony-icon
 * 
 * @attr {string} name - Lucide icon name (e.g., "play", "pause", "volume-2")
 * @attr {string} size - Size variant: xs, sm, md, lg, xl, xxl (default: md)
 * @attr {string} color - Color variant: primary, secondary, success, warning, error, muted, inherit (default: inherit)
 * @attr {string} label - Accessible label for screen readers (optional, uses name if not provided)
 * @attr {boolean} decorative - If true, hides from screen readers (aria-hidden="true")
 * 
 * @fires icon-load - Dispatched when icon SVG is successfully loaded
 * @fires icon-error - Dispatched when icon fails to load
 * 
 * @example
 * <harmony-icon name="play" size="lg" color="primary" label="Play audio"></harmony-icon>
 * <harmony-icon name="settings" size="md" color="muted" decorative></harmony-icon>
 */
class HarmonyIcon extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private */
    this._iconName = '';
    
    /** @private */
    this._loading = false;
  }

  static get observedAttributes() {
    return ['name', 'size', 'color', 'label', 'decorative'];
  }

  connectedCallback() {
    this._render();
    this._loadIcon();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'name') {
      this._loadIcon();
    } else {
      this._updateStyles();
    }
  }

  /**
   * Renders the component structure
   * @private
   */
  _render() {
    const size = this.getAttribute('size') || 'md';
    const color = this.getAttribute('color') || 'inherit';
    const pixelSize = ICON_SIZES[size] || ICON_SIZES.md;
    const colorValue = ICON_COLORS[color] || ICON_COLORS.inherit;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${pixelSize}px;
          height: ${pixelSize}px;
          flex-shrink: 0;
          line-height: 1;
          vertical-align: middle;
        }

        .icon-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${colorValue};
        }

        .icon-container svg {
          width: 100%;
          height: 100%;
          display: block;
          stroke: currentColor;
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .loading {
          opacity: 0.5;
        }

        .error {
          color: var(--color-error, #ef4444);
        }
      </style>
      <div class="icon-container" role="img" aria-label="${this._getAriaLabel()}">
        <!-- Icon SVG will be inserted here -->
      </div>
    `;
  }

  /**
   * Updates only the dynamic styles without re-rendering
   * @private
   */
  _updateStyles() {
    const container = this.shadowRoot.querySelector('.icon-container');
    if (!container) return;

    const size = this.getAttribute('size') || 'md';
    const color = this.getAttribute('color') || 'inherit';
    const pixelSize = ICON_SIZES[size] || ICON_SIZES.md;
    const colorValue = ICON_COLORS[color] || ICON_COLORS.inherit;

    this.style.width = `${pixelSize}px`;
    this.style.height = `${pixelSize}px`;
    container.style.color = colorValue;

    // Update ARIA label
    const isDecorative = this.hasAttribute('decorative');
    if (isDecorative) {
      container.setAttribute('aria-hidden', 'true');
      container.removeAttribute('aria-label');
      container.removeAttribute('role');
    } else {
      container.removeAttribute('aria-hidden');
      container.setAttribute('role', 'img');
      container.setAttribute('aria-label', this._getAriaLabel());
    }
  }

  /**
   * Loads the icon SVG from Lucide CDN or cache
   * @private
   */
  async _loadIcon() {
    const iconName = this.getAttribute('name');
    if (!iconName || this._loading) return;

    this._iconName = iconName;
    const container = this.shadowRoot.querySelector('.icon-container');
    if (!container) return;

    // Check cache first
    if (iconCache.has(iconName)) {
      this._insertIcon(iconCache.get(iconName));
      return;
    }

    // Load from CDN
    this._loading = true;
    container.classList.add('loading');

    try {
      const response = await fetch(
        `https://unpkg.com/lucide-static@latest/icons/${iconName}.svg`,
        { 
          method: 'GET',
          cache: 'force-cache' // Leverage browser cache
        }
      );

      if (!response.ok) {
        throw new Error(`Icon "${iconName}" not found (HTTP ${response.status})`);
      }

      const svgText = await response.text();
      
      // Cache the result
      iconCache.set(iconName, svgText);
      
      this._insertIcon(svgText);
      
      // Dispatch success event
      this.dispatchEvent(new CustomEvent('icon-load', {
        bubbles: true,
        composed: true,
        detail: { name: iconName }
      }));

    } catch (error) {
      console.error(`[HarmonyIcon] Failed to load icon "${iconName}":`, error);
      container.classList.add('error');
      
      // Dispatch error event
      this.dispatchEvent(new CustomEvent('icon-error', {
        bubbles: true,
        composed: true,
        detail: { 
          name: iconName, 
          error: error.message 
        }
      }));

      // Show fallback
      this._insertFallback();
    } finally {
      this._loading = false;
      container.classList.remove('loading');
    }
  }

  /**
   * Inserts the loaded SVG into the container
   * @private
   * @param {string} svgText - The SVG markup as a string
   */
  _insertIcon(svgText) {
    const container = this.shadowRoot.querySelector('.icon-container');
    if (!container) return;

    container.innerHTML = svgText;
    container.classList.remove('error');
  }

  /**
   * Inserts a fallback icon when loading fails
   * @private
   */
  _insertFallback() {
    const container = this.shadowRoot.querySelector('.icon-container');
    if (!container) return;

    // Simple question mark fallback
    container.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
  }

  /**
   * Gets the appropriate ARIA label for the icon
   * @private
   * @returns {string}
   */
  _getAriaLabel() {
    const label = this.getAttribute('label');
    if (label) return label;

    // Generate readable label from icon name
    const name = this.getAttribute('name') || 'icon';
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Preloads an icon into the cache
   * @static
   * @param {string} iconName - Name of the Lucide icon to preload
   * @returns {Promise<void>}
   */
  static async preloadIcon(iconName) {
    if (iconCache.has(iconName)) return;

    try {
      const response = await fetch(
        `https://unpkg.com/lucide-static@latest/icons/${iconName}.svg`,
        { cache: 'force-cache' }
      );

      if (response.ok) {
        const svgText = await response.text();
        iconCache.set(iconName, svgText);
      }
    } catch (error) {
      console.warn(`[HarmonyIcon] Failed to preload icon "${iconName}":`, error);
    }
  }

  /**
   * Preloads multiple icons at once
   * @static
   * @param {string[]} iconNames - Array of icon names to preload
   * @returns {Promise<void>}
   */
  static async preloadIcons(iconNames) {
    await Promise.allSettled(
      iconNames.map(name => HarmonyIcon.preloadIcon(name))
    );
  }

  /**
   * Clears the icon cache
   * @static
   */
  static clearCache() {
    iconCache.clear();
  }

  /**
   * Gets the current cache size
   * @static
   * @returns {number}
   */
  static getCacheSize() {
    return iconCache.size;
  }
}

// Register the custom element
customElements.define('harmony-icon', HarmonyIcon);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HarmonyIcon, ICON_SIZES, ICON_COLORS };
}