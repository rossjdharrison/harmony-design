/**
 * Theme Inheritance Context - Manages theme composition and inheritance
 * @module contexts/ThemeInheritanceContext
 * 
 * Provides runtime theme switching with base + brand-specific overrides.
 * Supports nested theme contexts for component-level customization.
 * 
 * Related: tokens/base-theme.js, tokens/brand-themes.js
 */

import { baseTheme, composeTheme } from '../tokens/base-theme.js';
import { getTheme, darkThemeOverrides } from '../tokens/brand-themes.js';

/**
 * Theme Inheritance Context Web Component
 * 
 * Usage:
 * <theme-inheritance-context brand="harmony" dark-mode>
 *   <your-components></your-components>
 * </theme-inheritance-context>
 * 
 * @fires theme-changed - When theme is updated
 */
class ThemeInheritanceContext extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Current theme state
    this._brand = 'harmony';
    this._darkMode = false;
    this._customOverrides = {};
    this._composedTheme = null;
    
    // Parent theme context (for nesting)
    this._parentContext = null;
  }
  
  static get observedAttributes() {
    return ['brand', 'dark-mode'];
  }
  
  connectedCallback() {
    this.render();
    this._findParentContext();
    this._composeTheme();
    this._applyTheme();
    
    // Listen for theme changes from parent
    this.addEventListener('theme-inherited', this._handleParentThemeChange.bind(this));
  }
  
  disconnectedCallback() {
    this.removeEventListener('theme-inherited', this._handleParentThemeChange.bind(this));
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'brand') {
      this._brand = newValue || 'harmony';
      this._composeTheme();
      this._applyTheme();
    }
    
    if (name === 'dark-mode') {
      this._darkMode = this.hasAttribute('dark-mode');
      this._composeTheme();
      this._applyTheme();
    }
  }
  
  /**
   * Find parent theme context for inheritance
   * @private
   */
  _findParentContext() {
    let parent = this.parentElement;
    
    while (parent) {
      if (parent.tagName === 'THEME-INHERITANCE-CONTEXT') {
        this._parentContext = parent;
        break;
      }
      parent = parent.parentElement;
    }
  }
  
  /**
   * Handle theme changes from parent context
   * @private
   */
  _handleParentThemeChange(event) {
    event.stopPropagation();
    this._composeTheme();
    this._applyTheme();
  }
  
  /**
   * Compose theme from parent + brand + custom overrides
   * @private
   */
  _composeTheme() {
    let theme = baseTheme;
    
    // Inherit from parent if exists
    if (this._parentContext && this._parentContext.getTheme) {
      theme = this._parentContext.getTheme();
    }
    
    // Apply brand theme
    const brandTheme = getTheme(this._brand, this._darkMode);
    theme = composeTheme(brandTheme);
    
    // Apply custom overrides
    if (Object.keys(this._customOverrides).length > 0) {
      theme = composeTheme(this._customOverrides);
    }
    
    this._composedTheme = theme;
  }
  
  /**
   * Apply theme to CSS custom properties
   * @private
   */
  _applyTheme() {
    if (!this._composedTheme) return;
    
    const cssVars = this._generateCSSVariables(this._composedTheme);
    
    // Apply to host element
    Object.entries(cssVars).forEach(([key, value]) => {
      this.style.setProperty(key, value);
    });
    
    // Notify children of theme change
    this.dispatchEvent(new CustomEvent('theme-inherited', {
      bubbles: true,
      composed: false,
      detail: { theme: this._composedTheme },
    }));
    
    // Notify external listeners
    this.dispatchEvent(new CustomEvent('theme-changed', {
      bubbles: true,
      composed: true,
      detail: {
        brand: this._brand,
        darkMode: this._darkMode,
        theme: this._composedTheme,
      },
    }));
  }
  
  /**
   * Convert theme object to CSS custom properties
   * @private
   * @param {Object} theme - Theme object
   * @param {string} prefix - Variable prefix
   * @returns {Object} CSS variable map
   */
  _generateCSSVariables(theme, prefix = '--theme') {
    const vars = {};
    
    const flatten = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}-${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newPath);
        } else {
          vars[`${prefix}-${newPath}`] = value;
        }
      }
    };
    
    flatten(theme);
    return vars;
  }
  
  /**
   * Get current composed theme
   * @returns {Object} Current theme
   */
  getTheme() {
    return this._composedTheme || baseTheme;
  }
  
  /**
   * Set custom theme overrides
   * @param {Object} overrides - Custom token overrides
   */
  setOverrides(overrides) {
    this._customOverrides = overrides;
    this._composeTheme();
    this._applyTheme();
  }
  
  /**
   * Merge additional overrides with existing ones
   * @param {Object} overrides - Additional overrides
   */
  mergeOverrides(overrides) {
    this._customOverrides = composeTheme(this._customOverrides, overrides);
    this._composeTheme();
    this._applyTheme();
  }
  
  /**
   * Clear custom overrides
   */
  clearOverrides() {
    this._customOverrides = {};
    this._composeTheme();
    this._applyTheme();
  }
  
  /**
   * Switch to a different brand
   * @param {string} brandName - Brand identifier
   */
  setBrand(brandName) {
    this.setAttribute('brand', brandName);
  }
  
  /**
   * Toggle dark mode
   * @param {boolean} enabled - Dark mode state
   */
  setDarkMode(enabled) {
    if (enabled) {
      this.setAttribute('dark-mode', '');
    } else {
      this.removeAttribute('dark-mode');
    }
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }
}

customElements.define('theme-inheritance-context', ThemeInheritanceContext);

export { ThemeInheritanceContext };