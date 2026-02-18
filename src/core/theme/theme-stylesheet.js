/**
 * @fileoverview Theme Stylesheet Manager
 * 
 * Manages dynamic theme stylesheets with CSS custom properties.
 * Integrates with ThemeProvider to apply theme changes to the document.
 * 
 * See: DESIGN_SYSTEM.md#theme-stylesheet
 * 
 * @module harmony-design/core/theme/theme-stylesheet
 */

import { generateCSSProperties, injectCSSProperties, removeCSSProperties } from './css-properties.js';

/**
 * Theme stylesheet manager class
 * Handles injection and removal of theme-specific CSS custom properties
 */
export class ThemeStylesheet {
  /**
   * @param {Object} options - Configuration options
   * @param {Object} options.lightTokens - Light theme design tokens
   * @param {Object} options.darkTokens - Dark theme design tokens
   * @param {string} [options.rootSelector=':root'] - Root CSS selector
   * @param {string} [options.darkSelector='[data-theme="dark"]'] - Dark theme selector
   */
  constructor(options = {}) {
    this.lightTokens = options.lightTokens || {};
    this.darkTokens = options.darkTokens || {};
    this.rootSelector = options.rootSelector || ':root';
    this.darkSelector = options.darkSelector || '[data-theme="dark"]';
    this.injected = false;
  }

  /**
   * Injects theme stylesheets into the document
   * Creates CSS custom properties for both light and dark themes
   * 
   * @returns {Object} Object containing both style elements
   */
  inject() {
    if (this.injected) {
      console.warn('[ThemeStylesheet] Already injected, skipping');
      return;
    }

    const lightStyle = injectCSSProperties(this.lightTokens, this.rootSelector);
    const darkStyle = injectCSSProperties(this.darkTokens, this.darkSelector);

    this.injected = true;

    return {
      light: lightStyle,
      dark: darkStyle
    };
  }

  /**
   * Removes theme stylesheets from the document
   */
  remove() {
    if (!this.injected) {
      return;
    }

    removeCSSProperties(this.rootSelector);
    removeCSSProperties(this.darkSelector);

    this.injected = false;
  }

  /**
   * Updates theme tokens and re-injects stylesheets
   * 
   * @param {Object} options - New token options
   * @param {Object} [options.lightTokens] - New light theme tokens
   * @param {Object} [options.darkTokens] - New dark theme tokens
   */
  update(options = {}) {
    if (options.lightTokens) {
      this.lightTokens = options.lightTokens;
    }

    if (options.darkTokens) {
      this.darkTokens = options.darkTokens;
    }

    if (this.injected) {
      this.remove();
      this.inject();
    }
  }

  /**
   * Generates CSS string for both themes (for SSR or static generation)
   * 
   * @returns {string} Complete CSS with both theme variants
   */
  toCSS() {
    const lightCSS = `${this.rootSelector} {\n${generateCSSProperties(this.lightTokens)}\n}`;
    const darkCSS = `${this.darkSelector} {\n${generateCSSProperties(this.darkTokens)}\n}`;
    
    return `${lightCSS}\n\n${darkCSS}`;
  }

  /**
   * Exports theme stylesheet to a file (for build-time generation)
   * 
   * @returns {Blob} CSS file blob
   */
  toBlob() {
    const css = this.toCSS();
    return new Blob([css], { type: 'text/css' });
  }
}

/**
 * Creates and injects a theme stylesheet from design tokens
 * 
 * @param {Object} lightTokens - Light theme tokens
 * @param {Object} darkTokens - Dark theme tokens
 * @returns {ThemeStylesheet} Theme stylesheet instance
 * 
 * @example
 * import { createThemeStylesheet } from './theme-stylesheet.js';
 * import { lightTheme, darkTheme } from './tokens.js';
 * 
 * const stylesheet = createThemeStylesheet(lightTheme, darkTheme);
 */
export function createThemeStylesheet(lightTokens, darkTokens) {
  const stylesheet = new ThemeStylesheet({ lightTokens, darkTokens });
  stylesheet.inject();
  return stylesheet;
}