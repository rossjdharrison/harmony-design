/**
 * @fileoverview Predefined responsive token sets for common design patterns
 * @module tokens/responsive-token-presets
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#responsive-tokens}
 */

/**
 * Responsive spacing tokens
 * @type {import('./responsive-tokens.js').ResponsiveToken[]}
 */
export const responsiveSpacingTokens = [
  {
    name: 'spacing-page-margin',
    values: {
      xs: 16,
      sm: 24,
      md: 32,
      lg: 48,
      xl: 64,
      '2xl': 80,
    },
    unit: 'px',
    fallback: '16px',
  },
  {
    name: 'spacing-section-gap',
    values: {
      xs: 32,
      sm: 48,
      md: 64,
      lg: 80,
      xl: 96,
      '2xl': 128,
    },
    unit: 'px',
    fallback: '32px',
  },
  {
    name: 'spacing-content-gap',
    values: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 40,
    },
    unit: 'px',
    fallback: '16px',
  },
  {
    name: 'spacing-grid-gap',
    values: {
      xs: 12,
      sm: 16,
      md: 20,
      lg: 24,
      xl: 32,
    },
    unit: 'px',
    fallback: '12px',
  },
];

/**
 * Responsive typography tokens
 * @type {import('./responsive-tokens.js').ResponsiveToken[]}
 */
export const responsiveTypographyTokens = [
  {
    name: 'font-size-h1',
    values: {
      xs: 32,
      sm: 40,
      md: 48,
      lg: 56,
      xl: 64,
      '2xl': 72,
    },
    unit: 'px',
    fallback: '32px',
  },
  {
    name: 'font-size-h2',
    values: {
      xs: 28,
      sm: 32,
      md: 36,
      lg: 40,
      xl: 48,
      '2xl': 56,
    },
    unit: 'px',
    fallback: '28px',
  },
  {
    name: 'font-size-h3',
    values: {
      xs: 24,
      sm: 28,
      md: 32,
      lg: 36,
      xl: 40,
    },
    unit: 'px',
    fallback: '24px',
  },
  {
    name: 'font-size-body',
    values: {
      xs: 14,
      sm: 15,
      md: 16,
      lg: 16,
      xl: 18,
    },
    unit: 'px',
    fallback: '14px',
  },
  {
    name: 'line-height-heading',
    values: {
      xs: 1.2,
      sm: 1.25,
      md: 1.3,
      lg: 1.3,
      xl: 1.35,
    },
    unit: '',
    fallback: '1.2',
  },
  {
    name: 'line-height-body',
    values: {
      xs: 1.5,
      sm: 1.55,
      md: 1.6,
      lg: 1.65,
      xl: 1.7,
    },
    unit: '',
    fallback: '1.5',
  },
];

/**
 * Responsive layout tokens
 * @type {import('./responsive-tokens.js').ResponsiveToken[]}
 */
export const responsiveLayoutTokens = [
  {
    name: 'layout-max-width',
    values: {
      xs: 100,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
    unit: 'px',
    fallback: '100%',
  },
  {
    name: 'layout-columns',
    values: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 12,
      xl: 12,
    },
    unit: '',
    fallback: '4',
  },
  {
    name: 'layout-sidebar-width',
    values: {
      xs: 0,
      sm: 0,
      md: 240,
      lg: 280,
      xl: 320,
    },
    unit: 'px',
    fallback: '0px',
  },
];

/**
 * Responsive component tokens
 * @type {import('./responsive-tokens.js').ResponsiveToken[]}
 */
export const responsiveComponentTokens = [
  {
    name: 'button-height',
    values: {
      xs: 36,
      sm: 40,
      md: 44,
      lg: 48,
    },
    unit: 'px',
    fallback: '36px',
  },
  {
    name: 'button-padding-x',
    values: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 28,
    },
    unit: 'px',
    fallback: '16px',
  },
  {
    name: 'input-height',
    values: {
      xs: 36,
      sm: 40,
      md: 44,
      lg: 48,
    },
    unit: 'px',
    fallback: '36px',
  },
  {
    name: 'card-padding',
    values: {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 40,
    },
    unit: 'px',
    fallback: '16px',
  },
  {
    name: 'modal-width',
    values: {
      xs: 90,
      sm: 80,
      md: 600,
      lg: 700,
      xl: 800,
    },
    unit: 'px',
    fallback: '90%',
  },
];

/**
 * All preset responsive tokens
 * @type {import('./responsive-tokens.js').ResponsiveToken[]}
 */
export const allPresetTokens = [
  ...responsiveSpacingTokens,
  ...responsiveTypographyTokens,
  ...responsiveLayoutTokens,
  ...responsiveComponentTokens,
];