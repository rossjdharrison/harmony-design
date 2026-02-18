/**
 * Design Tokens Index
 * Central export point for all design tokens
 * 
 * @module tokens
 * @see {@link file://../DESIGN_SYSTEM.md#design-tokens Design Tokens Documentation}
 */

export { colors, getColor, getColorWithAlpha } from './colors.js';
export { spacing, getSpacing } from './spacing.js';
export { typography, getFontSize, getLineHeight, getTextStyle } from './typography.js';

/**
 * All tokens in a single object for convenience
 */
export const tokens = {
  colors: null,      // Lazy loaded
  spacing: null,     // Lazy loaded
  typography: null   // Lazy loaded
};

// Lazy load tokens on first access
Object.defineProperty(tokens, 'colors', {
  get() {
    const { colors } = require('./colors.js');
    return colors;
  }
});

Object.defineProperty(tokens, 'spacing', {
  get() {
    const { spacing } = require('./spacing.js');
    return spacing;
  }
});

Object.defineProperty(tokens, 'typography', {
  get() {
    const { typography } = require('./typography.js');
    return typography;
  }
});