/**
 * @fileoverview Spacing design tokens for Harmony Design System
 * Provides consistent spacing scale across all components.
 * See DESIGN_SYSTEM.md#design-tokens for usage patterns.
 */

/**
 * Base spacing unit in pixels
 * All spacing values are multiples of this base
 * @type {number}
 */
export const BASE_SPACING_UNIT = 4;

/**
 * Spacing scale tokens
 * Uses t-shirt sizing for semantic naming
 * @type {Object.<string, string>}
 */
export const spacing = {
  none: '0',
  xxxs: `${BASE_SPACING_UNIT * 0.5}px`,  // 2px
  xxs: `${BASE_SPACING_UNIT}px`,         // 4px
  xs: `${BASE_SPACING_UNIT * 2}px`,      // 8px
  sm: `${BASE_SPACING_UNIT * 3}px`,      // 12px
  md: `${BASE_SPACING_UNIT * 4}px`,      // 16px
  lg: `${BASE_SPACING_UNIT * 6}px`,      // 24px
  xl: `${BASE_SPACING_UNIT * 8}px`,      // 32px
  xxl: `${BASE_SPACING_UNIT * 12}px`,    // 48px
  xxxl: `${BASE_SPACING_UNIT * 16}px`,   // 64px
};

/**
 * Component-specific spacing tokens
 * Semantic names for common spacing patterns
 * @type {Object.<string, string>}
 */
export const componentSpacing = {
  // Padding
  paddingTight: spacing.xs,
  paddingDefault: spacing.md,
  paddingLoose: spacing.lg,
  
  // Margins
  marginTight: spacing.sm,
  marginDefault: spacing.md,
  marginLoose: spacing.xl,
  
  // Gaps (for flex/grid)
  gapTight: spacing.xs,
  gapDefault: spacing.md,
  gapLoose: spacing.lg,
  
  // Insets
  insetTight: spacing.sm,
  insetDefault: spacing.md,
  insetLoose: spacing.lg,
};