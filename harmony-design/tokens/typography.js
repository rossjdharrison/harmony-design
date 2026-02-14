/**
 * @fileoverview Typography design tokens for Harmony Design System
 * Defines font families, sizes, weights, and line heights.
 * See DESIGN_SYSTEM.md#design-tokens for usage patterns.
 */

/**
 * Font family tokens
 * System font stacks for optimal performance
 * @type {Object.<string, string>}
 */
export const fontFamilies = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  display: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

/**
 * Font size tokens
 * Based on modular scale with 1.25 ratio
 * @type {Object.<string, string>}
 */
export const fontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  md: '1rem',       // 16px (base)
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  xxl: '1.5rem',    // 24px
  xxxl: '2rem',     // 32px
  display1: '2.5rem',   // 40px
  display2: '3rem',     // 48px
  display3: '3.5rem',   // 56px
};

/**
 * Font weight tokens
 * Standard weight values for web fonts
 * @type {Object.<string, number>}
 */
export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/**
 * Line height tokens
 * Relative values for optimal readability
 * @type {Object.<string, number>}
 */
export const lineHeights = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
};

/**
 * Letter spacing tokens
 * Subtle adjustments for different font sizes
 * @type {Object.<string, string>}
 */
export const letterSpacing = {
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
};

/**
 * Semantic typography tokens
 * Pre-configured text styles for common use cases
 * @type {Object.<string, Object>}
 */
export const textStyles = {
  displayLarge: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.display3,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  displayMedium: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.display2,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  displaySmall: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.display1,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.normal,
  },
  headingLarge: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.normal,
  },
  headingMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  headingSmall: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodyLarge: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  bodyMedium: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodySmall: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wide,
  },
  code: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
};