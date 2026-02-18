/**
 * Design Token Registry
 * Central export point for all design tokens
 * 
 * @module tokens
 * @see {@link file://../DESIGN_SYSTEM.md#design-tokens}
 */

import { colors, primaryScale, neutralScale, accentColors, alphaColors } from './colors.js';
import { spacing, semanticSpacing, getSpacing, getSemanticSpacing, spacingToCss, generateSpacingCssVars } from './spacing.js';

/**
 * All design tokens organized by category
 * @type {Object}
 */
export const tokens = {
  colors: {
    primary: primaryScale,
    neutral: neutralScale,
    accent: accentColors,
    alpha: alphaColors,
    ...colors,
  },
  spacing: {
    scale: spacing,
    semantic: semanticSpacing,
  },
};

/**
 * Token accessor with validation and fallback
 * @param {string} path - Dot-notation path to token (e.g., 'colors.primary.500')
 * @param {*} fallback - Fallback value if token not found
 * @returns {*} Token value or fallback
 */
export function getToken(path, fallback = null) {
  const parts = path.split('.');
  let value = tokens;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      console.warn(`Token not found: ${path}, using fallback:`, fallback);
      return fallback;
    }
  }
  
  return value;
}

/**
 * Check if a token exists
 * @param {string} path - Dot-notation path to token
 * @returns {boolean} True if token exists
 */
export function hasToken(path) {
  const parts = path.split('.');
  let value = tokens;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return false;
    }
  }
  
  return true;
}

/**
 * Generate all CSS custom properties
 * @returns {string} Complete CSS custom properties block
 */
export function generateAllCssVars() {
  // Import color CSS generation when available
  const colorVars = '/* Color variables will be generated here */';
  const spacingVars = generateSpacingCssVars();
  
  return `${colorVars}\n\n${spacingVars}`;
}

// Re-export for convenience
export { colors, primaryScale, neutralScale, accentColors, alphaColors };
export { spacing, semanticSpacing, getSpacing, getSemanticSpacing, spacingToCss, generateSpacingCssVars };
export { getToken as default };