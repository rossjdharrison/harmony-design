/**
 * Spacing Scale Type Definitions
 * @module tokens/spacing
 */

/**
 * Valid spacing scale keys
 */
export type SpacingScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;

/**
 * Spacing scale values in pixels
 */
export const spacing: Record<SpacingScale, number>;

/**
 * Semantic spacing token names
 */
export type SemanticSpacingName =
  | 'componentPaddingTiny'
  | 'componentPaddingSmall'
  | 'componentPaddingMedium'
  | 'componentPaddingLarge'
  | 'gapTiny'
  | 'gapSmall'
  | 'gapMedium'
  | 'gapLarge'
  | 'gapXLarge'
  | 'sectionGapSmall'
  | 'sectionGapMedium'
  | 'sectionGapLarge'
  | 'sectionGapXLarge'
  | 'layoutMarginSmall'
  | 'layoutMarginMedium'
  | 'layoutMarginLarge'
  | 'layoutMarginXLarge';

/**
 * Semantic spacing tokens mapped to scale values
 */
export const semanticSpacing: Record<SemanticSpacingName, number>;

/**
 * Get spacing value by scale key
 */
export function getSpacing(scale: SpacingScale | string): number;

/**
 * Get semantic spacing value by name
 */
export function getSemanticSpacing(name: SemanticSpacingName): number;

/**
 * Convert spacing value to CSS string
 */
export function spacingToCss(scale: SpacingScale | string): string;

/**
 * Generate CSS custom properties for spacing scale
 */
export function generateSpacingCssVars(): string;