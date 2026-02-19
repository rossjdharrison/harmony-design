/**
 * @fileoverview Harmony Icon Component - Unified icon rendering with Lucide + custom audio extensions
 * @module components/controls/harmony-icon
 * 
 * Renders icons from:
 * 1. Lucide icon library (standard UI icons)
 * 2. Custom audio extensions (audio-specific icons)
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#Icon-System} for usage guidelines
 * @see {@link ../../tokens/icons/lucide-audio-extensions.js} for custom icons
 */

import { LUCIDE_AUDIO_EXTENSIONS, isAudioExtension } from '../../tokens/icons/lucide-audio-extensions.js';

/**
 * @typedef {Object} IconOptions
 * @property {string} name - Icon name (from Lucide or audio extensions)
 * @property {string} [size='24'] - Icon size in pixels
 * @property {string} [stroke='currentColor'] - Stroke color
 * @property {string} [strokeWidth='2'] - Stroke width
 * @property {string} [class=''] - Additional CSS classes
 */

/**
 * HarmonyIcon Web Component
 * 
 * @example
 * ```html
 * <!-- Standard Lucide icon -->
 * <harmony-icon name="play" size="24"></harmony-icon>
 * 
 * <!-- Custom audio extension icon -->
 * <harmony-icon name="audio-bus" size="32" stroke="#00ff00"></harmony-icon>
 * ```
 * 
 * @extends HTMLElement
 */
export class HarmonyIcon extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'size', 'stroke', 'stroke-width', 'class'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Get icon SVG path
   * @private
   * @returns {string|null} SVG path or null
   */
  _getIconPath() {
    const iconName = this.getAttribute('name');
    if (!iconName) return null;

    // Check custom audio extensions first
    if (isAudioExtension(iconName)) {
      return LUCIDE_AUDIO_EXTENSIONS[iconName];
    }

    // Check if lucide is available globally
    if (typeof lucide !== 'undefined' && lucide.icons && lucide.icons[iconName]) {
      return this._lucideToPath(lucide.icons[iconName]);
    }

    console.warn(`Icon "${iconName}" not found in Lucide or audio extensions`);
    return null;
  }

  /**
   * Convert Lucide icon object to path string
   * @private
   * @param {Object} iconData - Lucide icon data
   * @returns {string} SVG path string
   */
  _lucideToPath(iconData) {
    if (Array.isArray(iconData)) {
      return iconData.join('');
    }
    return iconData;
  }

  render() {
    const name = this.getAttribute('name');
    const size = this.getAttribute('size') || '24';
    const stroke = this.getAttribute('stroke') || 'currentColor';
    const strokeWidth = this.getAttribute('stroke-width') || '2';
    const className = this.getAttribute('class') || '';

    const path = this._getIconPath();

    if (!path) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .icon-error {
            width: ${size}px;
            height: ${size}px;
            background: var(--color-error-500, #ef4444);
            border-radius: 2px;
          }
        </style>
        <div class="icon-error" title="Icon not found: ${name}"></div>
      `;
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${size}px;
          height: ${size}px;
        }
        svg {
          width: 100%;
          height: 100%;
        }
      </style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${size}"
        height="${size}"
        viewBox="0 0 24 24"
        fill="none"
        stroke="${stroke}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="${className}"
        part="icon"
      >${path}</svg>
    `;
  }
}

customElements.define('harmony-icon', HarmonyIcon);