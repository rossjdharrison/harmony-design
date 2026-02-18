/**
 * @fileoverview Border Width Design Tokens
 * @module tokens/border-width
 * 
 * Defines standardized border width values for the Harmony Design System.
 * These tokens provide semantic naming for border widths used across components.
 * 
 * Scale:
 * - none: 0px - No border
 * - thin: 1px - Subtle borders, dividers
 * - default: 2px - Standard borders, focus indicators
 * - thick: 3px - Emphasis borders, selected states
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Border Width Tokens
 */

/**
 * Border width token definitions
 * @const {Object<string, string>}
 */
export const borderWidth = {
  none: '0px',
  thin: '1px',
  default: '2px',
  thick: '3px'
};

/**
 * CSS custom property names for border width tokens
 * @const {Object<string, string>}
 */
export const borderWidthVars = {
  none: '--border-width-none',
  thin: '--border-width-thin',
  default: '--border-width-default',
  thick: '--border-width-thick'
};

/**
 * Generates CSS custom properties for border width tokens
 * @returns {string} CSS variable definitions
 */
export function generateBorderWidthCSS() {
  return Object.entries(borderWidth)
    .map(([key, value]) => `  ${borderWidthVars[key]}: ${value};`)
    .join('\n');
}

/**
 * Gets a border width value by token name
 * @param {string} tokenName - The token name (none, thin, default, thick)
 * @returns {string} The border width value in pixels
 * @throws {Error} If token name is invalid
 */
export function getBorderWidth(tokenName) {
  if (!borderWidth[tokenName]) {
    throw new Error(`Invalid border width token: ${tokenName}. Valid tokens: ${Object.keys(borderWidth).join(', ')}`);
  }
  return borderWidth[tokenName];
}

/**
 * Gets the CSS variable reference for a border width token
 * @param {string} tokenName - The token name (none, thin, default, thick)
 * @returns {string} CSS variable reference (e.g., 'var(--border-width-thin)')
 * @throws {Error} If token name is invalid
 */
export function getBorderWidthVar(tokenName) {
  if (!borderWidthVars[tokenName]) {
    throw new Error(`Invalid border width token: ${tokenName}. Valid tokens: ${Object.keys(borderWidthVars).join(', ')}`);
  }
  return `var(${borderWidthVars[tokenName]})`;
}

/**
 * Validates if a value matches a border width token
 * @param {string} value - The value to validate
 * @returns {boolean} True if value matches a token
 */
export function isValidBorderWidth(value) {
  return Object.values(borderWidth).includes(value);
}