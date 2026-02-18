/**
 * Typography Tokens
 * Font size scale and typography-related design tokens
 * 
 * Font Size Scale:
 * - xs: 10px - Extra small text (captions, labels)
 * - sm: 12px - Small text (secondary info)
 * - base: 14px - Base text size (body text)
 * - md: 16px - Medium text (emphasis)
 * - lg: 18px - Large text (subheadings)
 * - xl: 20px - Extra large (headings)
 * - 2xl: 24px - 2x extra large (section titles)
 * - 3xl: 30px - 3x extra large (page titles)
 * 
 * @module tokens/typography
 * @see {@link file://../DESIGN_SYSTEM.md#typography-tokens Typography Tokens Documentation}
 */

export const typography = {
  fontSize: {
    xs: '10px',
    sm: '12px',
    base: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px'
  },
  
  // Line heights optimized for each font size
  lineHeight: {
    xs: '14px',    // 1.4 ratio
    sm: '16px',    // 1.33 ratio
    base: '20px',  // 1.43 ratio
    md: '24px',    // 1.5 ratio
    lg: '26px',    // 1.44 ratio
    xl: '28px',    // 1.4 ratio
    '2xl': '32px', // 1.33 ratio
    '3xl': '38px'  // 1.27 ratio
  },
  
  // Font weights for hierarchy
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  
  // Letter spacing adjustments
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em'
  }
};

/**
 * Get font size token value
 * @param {string} size - Size key (xs, sm, base, md, lg, xl, 2xl, 3xl)
 * @returns {string} Font size in pixels
 */
export function getFontSize(size) {
  return typography.fontSize[size] || typography.fontSize.base;
}

/**
 * Get line height for font size
 * @param {string} size - Size key matching fontSize
 * @returns {string} Line height in pixels
 */
export function getLineHeight(size) {
  return typography.lineHeight[size] || typography.lineHeight.base;
}

/**
 * Get complete text style object
 * @param {string} size - Size key
 * @param {string} [weight='normal'] - Font weight key
 * @param {string} [spacing='normal'] - Letter spacing key
 * @returns {Object} Style object with fontSize, lineHeight, fontWeight, letterSpacing
 */
export function getTextStyle(size, weight = 'normal', spacing = 'normal') {
  return {
    fontSize: getFontSize(size),
    lineHeight: getLineHeight(size),
    fontWeight: typography.fontWeight[weight] || typography.fontWeight.normal,
    letterSpacing: typography.letterSpacing[spacing] || typography.letterSpacing.normal
  };
}