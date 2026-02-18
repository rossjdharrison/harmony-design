/**
 * Spacing Scale Tokens
 * 4px base unit with consistent scale for layout and component spacing
 * 
 * Scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24
 * Base unit: 4px
 * 
 * Usage:
 * - 0: No spacing (for resets)
 * - 1-3: Micro spacing (inside components, between text and icons)
 * - 4-6: Small spacing (component padding, inline gaps)
 * - 8-12: Medium spacing (between components, section padding)
 * - 16-24: Large spacing (page sections, major layout gaps)
 * 
 * @module tokens/spacing
 * @see {@link file://../DESIGN_SYSTEM.md#spacing-scale}
 */

/**
 * Spacing scale with 4px base unit
 * All values in pixels
 * @type {Object.<string, number>}
 */
export const spacing = {
  0: 0,      // No spacing
  1: 4,      // 4px - Micro
  2: 8,      // 8px - Micro
  3: 12,     // 12px - Micro
  4: 16,     // 16px - Small
  5: 20,     // 20px - Small
  6: 24,     // 24px - Small
  8: 32,     // 32px - Medium
  10: 40,    // 40px - Medium
  12: 48,    // 48px - Medium
  16: 64,    // 64px - Large
  20: 80,    // 80px - Large
  24: 96,    // 96px - Large
};

/**
 * Semantic spacing tokens mapped to scale values
 * Use these for consistent component spacing
 * @type {Object.<string, number>}
 */
export const semanticSpacing = {
  // Component internal spacing
  componentPaddingTiny: spacing[1],      // 4px
  componentPaddingSmall: spacing[2],     // 8px
  componentPaddingMedium: spacing[4],    // 16px
  componentPaddingLarge: spacing[6],     // 24px
  
  // Gap between elements
  gapTiny: spacing[1],                   // 4px
  gapSmall: spacing[2],                  // 8px
  gapMedium: spacing[4],                 // 16px
  gapLarge: spacing[6],                  // 24px
  gapXLarge: spacing[8],                 // 32px
  
  // Section spacing
  sectionGapSmall: spacing[8],           // 32px
  sectionGapMedium: spacing[12],         // 48px
  sectionGapLarge: spacing[16],          // 64px
  sectionGapXLarge: spacing[20],         // 80px
  
  // Layout margins
  layoutMarginSmall: spacing[4],         // 16px
  layoutMarginMedium: spacing[8],        // 32px
  layoutMarginLarge: spacing[12],        // 48px
  layoutMarginXLarge: spacing[16],       // 64px
};

/**
 * Get spacing value by scale key
 * @param {number|string} scale - Scale key (0-24)
 * @returns {number} Spacing value in pixels
 * @throws {Error} If scale key is invalid
 */
export function getSpacing(scale) {
  const value = spacing[scale];
  if (value === undefined) {
    throw new Error(`Invalid spacing scale: ${scale}. Valid scales: ${Object.keys(spacing).join(', ')}`);
  }
  return value;
}

/**
 * Get semantic spacing value by name
 * @param {string} name - Semantic spacing name
 * @returns {number} Spacing value in pixels
 * @throws {Error} If semantic name is invalid
 */
export function getSemanticSpacing(name) {
  const value = semanticSpacing[name];
  if (value === undefined) {
    throw new Error(`Invalid semantic spacing: ${name}. Valid names: ${Object.keys(semanticSpacing).join(', ')}`);
  }
  return value;
}

/**
 * Convert spacing value to CSS custom property string
 * @param {number|string} scale - Scale key
 * @returns {string} CSS value (e.g., "16px")
 */
export function spacingToCss(scale) {
  return `${getSpacing(scale)}px`;
}

/**
 * Generate CSS custom properties for spacing scale
 * @returns {string} CSS custom properties block
 */
export function generateSpacingCssVars() {
  const vars = Object.entries(spacing)
    .map(([key, value]) => `  --spacing-${key}: ${value}px;`)
    .join('\n');
  
  const semanticVars = Object.entries(semanticSpacing)
    .map(([key, value]) => `  --spacing-${key}: ${value}px;`)
    .join('\n');
  
  return `:root {\n${vars}\n\n${semanticVars}\n}`;
}