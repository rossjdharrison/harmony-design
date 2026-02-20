/**
 * @fileoverview Color Swatches Component - Preset color palette with recent colors
 * @module components/color-swatches
 * 
 * Provides a visual color picker with:
 * - Preset color palette (material design inspired)
 * - Recent colors tracking (localStorage persistence)
 * - Keyboard navigation support
 * - Accessible color selection
 * 
 * Events:
 * - color-selected: Fired when a color is selected
 * 
 * Performance targets:
 * - Render: <16ms per frame
 * - Memory: <1MB for component instance
 * - Initial paint: <50ms
 * 
 * @see ../../DESIGN_SYSTEM.md#color-swatches
 */

const PRESET_COLORS = [
  // Reds
  '#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C',
  // Pinks
  '#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#C2185B', '#AD1457', '#880E4F',
  // Purples
  '#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#6A1B9A', '#4A148C',
  // Deep Purples
  '#EDE7F6', '#D1C4E9', '#B39DDB', '#9575CD', '#7E57C2', '#673AB7', '#5E35B1', '#512DA8', '#4527A0', '#311B92',
  // Indigos
  '#E8EAF6', '#C5CAE9', '#9FA8DA', '#7986CB', '#5C6BC0', '#3F51B5', '#3949AB', '#303F9F', '#283593', '#1A237E',
  // Blues
  '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1',
  // Light Blues
  '#E1F5FE', '#B3E5FC', '#81D4FA', '#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5', '#0288D1', '#0277BD', '#01579B',
  // Cyans
  '#E0F7FA', '#B2EBF2', '#80DEEA', '#4DD0E1', '#26C6DA', '#00BCD4', '#00ACC1', '#0097A7', '#00838F', '#006064',
  // Teals
  '#E0F2F1', '#B2DFDB', '#80CBC4', '#4DB6AC', '#26A69A', '#009688', '#00897B', '#00796B', '#00695C', '#004D40',
  // Greens
  '#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20',
  // Light Greens
  '#F1F8E9', '#DCEDC8', '#C5E1A5', '#AED581', '#9CCC65', '#8BC34A', '#7CB342', '#689F38', '#558B2F', '#33691E',
  // Limes
  '#F9FBE7', '#F0F4C3', '#E6EE9C', '#DCE775', '#D4E157', '#CDDC39', '#C0CA33', '#AFB42B', '#9E9D24', '#827717',
  // Yellows
  '#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#FBC02D', '#F9A825', '#F57F17',
  // Ambers
  '#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F', '#FFCA28', '#FFC107', '#FFB300', '#FFA000', '#FF8F00', '#FF6F00',
  // Oranges
  '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#F57C00', '#EF6C00', '#E65100',
  // Deep Oranges
  '#FBE9E7', '#FFCCBC', '#FFAB91', '#FF8A65', '#FF7043', '#FF5722', '#F4511E', '#E64A19', '#D84315', '#BF360C',
  // Browns
  '#EFEBE9', '#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63', '#795548', '#6D4C41', '#5D4037', '#4E342E', '#3E2723',
  // Greys
  '#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161', '#424242', '#212121',
  // Blue Greys
  '#ECEFF1', '#CFD8DC', '#B0BEC5', '#90A4AE', '#78909C', '#607D8B', '#546E7A', '#455A64', '#37474F', '#263238',
];

const RECENT_COLORS_KEY = 'harmony-color-swatches-recent';
const MAX_RECENT_COLORS = 10;

class ColorSwatchesComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {string[]} */
    this._recentColors = this._loadRecentColors();
    
    /** @type {number} */
    this._focusedIndex = -1;
    
    /** @type {string} */
    this._selectedColor = '';
    
    this._handleSwatchClick = this._handleSwatchClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  /**
   * Load recent colors from localStorage
   * @returns {string[]}
   * @private
   */
  _loadRecentColors() {
    try {
      const stored = localStorage.getItem(RECENT_COLORS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_COLORS) : [];
      }
    } catch (error) {
      console.warn('Failed to load recent colors:', error);
    }
    return [];
  }

  /**
   * Save recent colors to localStorage
   * @private
   */
  _saveRecentColors() {
    try {
      localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(this._recentColors));
    } catch (error) {
      console.warn('Failed to save recent colors:', error);
    }
  }

  /**
   * Add a color to recent colors
   * @param {string} color - Hex color code
   * @private
   */
  _addRecentColor(color) {
    const upperColor = color.toUpperCase();
    
    // Remove if already exists
    this._recentColors = this._recentColors.filter(c => c !== upperColor);
    
    // Add to front
    this._recentColors.unshift(upperColor);
    
    // Limit to MAX_RECENT_COLORS
    if (this._recentColors.length > MAX_RECENT_COLORS) {
      this._recentColors = this._recentColors.slice(0, MAX_RECENT_COLORS);
    }
    
    this._saveRecentColors();
  }

  /**
   * Handle swatch click
   * @param {MouseEvent} event
   * @private
   */
  _handleSwatchClick(event) {
    const swatch = event.target.closest('.swatch');
    if (!swatch) return;

    const color = swatch.dataset.color;
    if (!color) return;

    this._selectColor(color);
  }

  /**
   * Select a color
   * @param {string} color - Hex color code
   * @private
   */
  _selectColor(color) {
    this._selectedColor = color;
    this._addRecentColor(color);
    
    // Update UI
    this.render();
    
    // Dispatch event
    this.dispatchEvent(new CustomEvent('color-selected', {
      detail: { color },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event
   * @private
   */
  _handleKeyDown(event) {
    const swatches = Array.from(this.shadowRoot.querySelectorAll('.swatch'));
    if (swatches.length === 0) return;

    const swatchesPerRow = 10;
    let newIndex = this._focusedIndex;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        newIndex = Math.min(this._focusedIndex + 1, swatches.length - 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = Math.max(this._focusedIndex - 1, 0);
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(this._focusedIndex + swatchesPerRow, swatches.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(this._focusedIndex - swatchesPerRow, 0);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this._focusedIndex >= 0 && this._focusedIndex < swatches.length) {
          const color = swatches[this._focusedIndex].dataset.color;
          if (color) this._selectColor(color);
        }
        return;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = swatches.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== this._focusedIndex) {
      this._focusedIndex = newIndex;
      swatches[newIndex].focus();
    }
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this.shadowRoot.addEventListener('click', this._handleSwatchClick);
    this.shadowRoot.addEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    this.shadowRoot.removeEventListener('click', this._handleSwatchClick);
    this.shadowRoot.removeEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Get contrast color for text (black or white)
   * @param {string} hexColor - Hex color code
   * @returns {string}
   * @private
   */
  _getContrastColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  /**
   * Render the component
   */
  render() {
    const startTime = performance.now();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
          font-size: var(--font-size-sm, 14px);
        }

        .container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-title {
          font-size: var(--font-size-xs, 12px);
          font-weight: 600;
          color: var(--color-text-secondary, #666);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
        }

        .swatches-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 4px;
        }

        .recent-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 4px;
        }

        .swatch {
          aspect-ratio: 1;
          border: 2px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
          position: relative;
          outline: none;
        }

        .swatch:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          z-index: 1;
        }

        .swatch:focus {
          border-color: var(--color-primary, #2196F3);
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
          z-index: 2;
        }

        .swatch.selected {
          border-color: var(--color-primary, #2196F3);
          box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
        }

        .swatch.selected::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 14px;
          font-weight: bold;
          color: var(--swatch-contrast-color);
        }

        .empty-recent {
          grid-column: 1 / -1;
          padding: 16px;
          text-align: center;
          color: var(--color-text-tertiary, #999);
          font-size: var(--font-size-xs, 12px);
        }

        /* Performance optimization: Use will-change for animated elements */
        .swatch:hover,
        .swatch:focus {
          will-change: transform;
        }
      </style>

      <div class="container" role="region" aria-label="Color swatches">
        ${this._recentColors.length > 0 ? `
          <div class="section">
            <h3 class="section-title">Recent Colors</h3>
            <div class="recent-grid" role="grid" aria-label="Recent colors">
              ${this._recentColors.map((color, index) => `
                <button
                  class="swatch ${color === this._selectedColor ? 'selected' : ''}"
                  data-color="${color}"
                  style="background-color: ${color}; --swatch-contrast-color: ${this._getContrastColor(color)};"
                  role="gridcell"
                  aria-label="Color ${color}"
                  tabindex="${index === 0 ? '0' : '-1'}"
                  title="${color}"
                ></button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="section">
          <h3 class="section-title">Color Palette</h3>
          <div class="swatches-grid" role="grid" aria-label="Preset color palette">
            ${PRESET_COLORS.map((color, index) => `
              <button
                class="swatch ${color === this._selectedColor ? 'selected' : ''}"
                data-color="${color}"
                style="background-color: ${color}; --swatch-contrast-color: ${this._getContrastColor(color)};"
                role="gridcell"
                aria-label="Color ${color}"
                tabindex="${this._recentColors.length === 0 && index === 0 ? '0' : '-1'}"
                title="${color}"
              ></button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`ColorSwatches render exceeded 16ms budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Get currently selected color
   * @returns {string}
   */
  getSelectedColor() {
    return this._selectedColor;
  }

  /**
   * Set selected color programmatically
   * @param {string} color - Hex color code
   */
  setSelectedColor(color) {
    this._selectedColor = color;
    this.render();
  }

  /**
   * Clear recent colors
   */
  clearRecentColors() {
    this._recentColors = [];
    this._saveRecentColors();
    this.render();
  }

  /**
   * Get recent colors
   * @returns {string[]}
   */
  getRecentColors() {
    return [...this._recentColors];
  }
}

customElements.define('harmony-color-swatches', ColorSwatchesComponent);

export default ColorSwatchesComponent;