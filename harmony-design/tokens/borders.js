/**
 * @fileoverview Border design tokens for Harmony Design System
 * Defines border widths, radii, and styles.
 * See DESIGN_SYSTEM.md#design-tokens for usage patterns.
 */

/**
 * Border width tokens
 * Standard border thickness values
 * @type {Object.<string, string>}
 */
export const borderWidth = {
  none: '0',
  thin: '1px',
  medium: '2px',
  thick: '4px',
};

/**
 * Border radius tokens
 * Consistent corner rounding values
 * @type {Object.<string, string>}
 */
export const borderRadius = {
  none: '0',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  xxl: '16px',
  full: '9999px',
};

/**
 * Border style tokens
 * Standard border styles
 * @type {Object.<string, string>}
 */
export const borderStyle = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  none: 'none',
};