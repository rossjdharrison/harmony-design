/**
 * Primary Color Palette
 * 
 * Provides programmatic access to primary color tokens with 11-shade scale.
 * Colors are perceptually uniform and follow WCAG contrast guidelines.
 * 
 * @module tokens/colors/primary
 * @see {@link ../../DESIGN_SYSTEM.md#color-tokens}
 * 
 * @example
 * import { primaryColors, getPrimaryColor } from './tokens/colors/primary.js';
 * 
 * // Get specific shade
 * const brandColor = getPrimaryColor(500);
 * 
 * // Get semantic color
 * const buttonBg = primaryColors.semantic.background.default;
 */

/**
 * Primary color scale with 11 shades (50-950)
 * @type {Object<string, string>}
 */
export const primaryScale = {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
  950: '#082f49'
};

/**
 * Semantic mappings for primary colors
 * Maps functional roles to specific shades
 * @type {Object}
 */
export const primarySemantic = {
  background: {
    subtle: primaryScale[50],
    muted: primaryScale[100],
    default: primaryScale[500],
    hover: primaryScale[600],
    active: primaryScale[700]
  },
  border: {
    subtle: primaryScale[200],
    default: primaryScale[300],
    strong: primaryScale[400]
  },
  text: {
    subtle: primaryScale[600],
    default: primaryScale[700],
    strong: primaryScale[800],
    onPrimary: '#ffffff'
  },
  icon: {
    subtle: primaryScale[400],
    default: primaryScale[500],
    strong: primaryScale[600]
  }
};

/**
 * Complete primary color system
 * @type {Object}
 */
export const primaryColors = {
  scale: primaryScale,
  semantic: primarySemantic
};

/**
 * Get a specific shade from the primary scale
 * @param {number} shade - Shade value (50, 100, 200, ..., 950)
 * @returns {string} Hex color value
 * @throws {Error} If shade is invalid
 * 
 * @example
 * const color = getPrimaryColor(500); // '#0ea5e9'
 */
export function getPrimaryColor(shade) {
  if (!primaryScale[shade]) {
    throw new Error(`Invalid primary shade: ${shade}. Valid values: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`);
  }
  return primaryScale[shade];
}

/**
 * Get a semantic primary color
 * @param {string} category - Category (background, border, text, icon)
 * @param {string} variant - Variant (subtle, default, strong, etc.)
 * @returns {string} Hex color value
 * @throws {Error} If category or variant is invalid
 * 
 * @example
 * const bgColor = getPrimarySemanticColor('background', 'default');
 */
export function getPrimarySemanticColor(category, variant) {
  if (!primarySemantic[category]) {
    throw new Error(`Invalid category: ${category}. Valid: background, border, text, icon`);
  }
  if (!primarySemantic[category][variant]) {
    throw new Error(`Invalid variant: ${variant} for category: ${category}`);
  }
  return primarySemantic[category][variant];
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color value
 * @returns {{r: number, g: number, b: number}} RGB values (0-255)
 * 
 * @example
 * const rgb = hexToRgb('#0ea5e9'); // {r: 14, g: 165, b: 233}
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance for WCAG contrast calculations
 * @param {string} hex - Hex color value
 * @returns {number} Relative luminance (0-1)
 */
export function getRelativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate WCAG contrast ratio between two colors
 * @param {string} color1 - First hex color
 * @param {string} color2 - Second hex color
 * @returns {number} Contrast ratio (1-21)
 * 
 * @example
 * const ratio = getContrastRatio('#0ea5e9', '#ffffff'); // ~3.2
 */
export function getContrastRatio(color1, color2) {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standard
 * @param {string} foreground - Foreground hex color
 * @param {string} background - Background hex color
 * @param {boolean} largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} True if meets WCAG AA
 */
export function meetsWCAG_AA(foreground, background, largeText = false) {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color combination meets WCAG AAA standard
 * @param {string} foreground - Foreground hex color
 * @param {string} background - Background hex color
 * @param {boolean} largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} True if meets WCAG AAA
 */
export function meetsWCAG_AAA(foreground, background, largeText = false) {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}