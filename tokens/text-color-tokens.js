/**
 * @fileoverview Text Color Tokens - Semantic color tokens for text elements
 * @module tokens/text-color-tokens
 * 
 * Provides semantic text color tokens that reference base color tokens.
 * These tokens ensure consistent text colors across the design system.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Text Color Tokens
 * 
 * @example
 * // Usage in CSS custom properties
 * element.style.color = 'var(--text-primary)';
 * 
 * @example
 * // Usage in JavaScript
 * import { TEXT_COLOR_TOKENS } from './tokens/text-color-tokens.js';
 * element.style.color = TEXT_COLOR_TOKENS['text-primary'].light;
 */

/**
 * Text color token definitions
 * @typedef {Object} TextColorToken
 * @property {string} light - Light theme color value
 * @property {string} dark - Dark theme color value
 * @property {string} description - Token purpose and usage guidance
 * @property {string} cssVar - CSS custom property name
 */

/**
 * Text Color Tokens
 * Semantic tokens for text colors across different UI contexts
 * 
 * @type {Object.<string, TextColorToken>}
 */
export const TEXT_COLOR_TOKENS = {
  'text-primary': {
    light: 'rgb(17, 24, 39)',      // gray-900 equivalent - primary text
    dark: 'rgb(249, 250, 251)',     // gray-50 equivalent - primary text on dark
    description: 'Primary text color for body copy, headings, and main content',
    cssVar: '--text-primary'
  },
  
  'text-secondary': {
    light: 'rgb(75, 85, 99)',       // gray-600 equivalent - secondary text
    dark: 'rgb(209, 213, 219)',     // gray-300 equivalent - secondary text on dark
    description: 'Secondary text color for supporting content, labels, and less prominent text',
    cssVar: '--text-secondary'
  },
  
  'text-tertiary': {
    light: 'rgb(156, 163, 175)',    // gray-400 equivalent - tertiary text
    dark: 'rgb(107, 114, 128)',     // gray-500 equivalent - tertiary text on dark
    description: 'Tertiary text color for placeholder text, hints, and minimal emphasis content',
    cssVar: '--text-tertiary'
  },
  
  'text-disabled': {
    light: 'rgb(209, 213, 219)',    // gray-300 equivalent - disabled text
    dark: 'rgb(75, 85, 99)',        // gray-600 equivalent - disabled text on dark
    description: 'Disabled text color for inactive or unavailable content',
    cssVar: '--text-disabled'
  },
  
  'text-inverse': {
    light: 'rgb(255, 255, 255)',    // white - text on dark backgrounds
    dark: 'rgb(17, 24, 39)',        // gray-900 equivalent - text on light backgrounds in dark mode
    description: 'Inverse text color for text on contrasting backgrounds (e.g., white text on dark buttons)',
    cssVar: '--text-inverse'
  }
};

/**
 * Generate CSS custom properties for text color tokens
 * @param {('light'|'dark')} theme - Theme variant
 * @returns {string} CSS custom property declarations
 */
export function generateTextColorCSS(theme = 'light') {
  return Object.entries(TEXT_COLOR_TOKENS)
    .map(([key, token]) => `  ${token.cssVar}: ${token[theme]};`)
    .join('\n');
}

/**
 * Get text color token value for current theme
 * @param {string} tokenName - Token name (e.g., 'text-primary')
 * @param {('light'|'dark')} theme - Theme variant
 * @returns {string|null} Color value or null if token not found
 */
export function getTextColor(tokenName, theme = 'light') {
  const token = TEXT_COLOR_TOKENS[tokenName];
  return token ? token[theme] : null;
}

/**
 * Validate text color token name
 * @param {string} tokenName - Token name to validate
 * @returns {boolean} True if token exists
 */
export function isValidTextColorToken(tokenName) {
  return tokenName in TEXT_COLOR_TOKENS;
}

/**
 * Get all text color token names
 * @returns {string[]} Array of token names
 */
export function getTextColorTokenNames() {
  return Object.keys(TEXT_COLOR_TOKENS);
}

/**
 * Apply text color tokens to document root
 * @param {('light'|'dark')} theme - Theme variant to apply
 * @param {HTMLElement} [root=document.documentElement] - Root element to apply tokens to
 */
export function applyTextColorTokens(theme = 'light', root = document.documentElement) {
  Object.entries(TEXT_COLOR_TOKENS).forEach(([key, token]) => {
    root.style.setProperty(token.cssVar, token[theme]);
  });
}