/**
 * @fileoverview Border Radius Scale Tokens
 * @module tokens/border-radius
 * 
 * Provides border radius values for the Harmony Design System.
 * Scale: none(0), sm(2), default(4), md(6), lg(8), xl(12), full(9999)
 * 
 * Usage:
 * ```javascript
 * import { borderRadius } from './tokens/border-radius.js';
 * element.style.borderRadius = `${borderRadius.md}px`;
 * ```
 * 
 * @see {@link ../DESIGN_SYSTEM.md#border-radius-scale}
 */

/**
 * Border radius scale tokens
 * @typedef {Object} BorderRadiusScale
 * @property {number} none - No border radius (0px) - sharp corners
 * @property {number} sm - Small radius (2px) - subtle rounding
 * @property {number} default - Default radius (4px) - standard UI elements
 * @property {number} md - Medium radius (6px) - cards, panels
 * @property {number} lg - Large radius (8px) - prominent elements
 * @property {number} xl - Extra large radius (12px) - hero elements
 * @property {number} full - Full radius (9999px) - pills, circles
 */

/**
 * Border radius scale for UI elements
 * @type {BorderRadiusScale}
 */
export const borderRadius = {
  none: 0,
  sm: 2,
  default: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999
};

/**
 * CSS custom properties for border radius
 * Can be injected into document for global use
 * @type {Object.<string, string>}
 */
export const borderRadiusVars = {
  '--border-radius-none': `${borderRadius.none}px`,
  '--border-radius-sm': `${borderRadius.sm}px`,
  '--border-radius-default': `${borderRadius.default}px`,
  '--border-radius-md': `${borderRadius.md}px`,
  '--border-radius-lg': `${borderRadius.lg}px`,
  '--border-radius-xl': `${borderRadius.xl}px`,
  '--border-radius-full': `${borderRadius.full}px`
};

/**
 * Injects border radius CSS custom properties into document
 * Call once during app initialization
 * @returns {void}
 */
export function injectBorderRadiusVars() {
  const root = document.documentElement;
  Object.entries(borderRadiusVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

/**
 * Gets border radius value by name
 * @param {keyof BorderRadiusScale} name - Border radius token name
 * @returns {number} Border radius value in pixels
 * @throws {Error} If border radius name is invalid
 */
export function getBorderRadius(name) {
  if (!(name in borderRadius)) {
    throw new Error(`Invalid border radius name: ${name}. Valid options: ${Object.keys(borderRadius).join(', ')}`);
  }
  return borderRadius[name];
}

/**
 * Gets CSS border radius string
 * @param {keyof BorderRadiusScale} name - Border radius token name
 * @returns {string} CSS border radius value (e.g., "4px")
 */
export function getBorderRadiusCSS(name) {
  return `${getBorderRadius(name)}px`;
}