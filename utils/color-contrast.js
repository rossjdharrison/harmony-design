/**
 * Color Contrast Validation Utilities
 * 
 * Provides utilities for validating color contrast ratios according to WCAG 2.1
 * accessibility guidelines. Ensures minimum 4.5:1 contrast ratio for normal text
 * and 3:1 for large text (18pt+ or 14pt+ bold).
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#color-contrast-validation
 * 
 * @module utils/color-contrast
 */

/**
 * Converts a hex color to RGB components
 * @param {string} hex - Hex color string (#RGB or #RRGGBB)
 * @returns {{r: number, g: number, b: number}} RGB components (0-255)
 */
export function hexToRgb(hex) {
  const cleaned = hex.replace('#', '');
  
  let r, g, b;
  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  }
  
  return { r, g, b };
}

/**
 * Converts RGB color to relative luminance
 * Formula from WCAG 2.1 specification
 * @param {{r: number, g: number, b: number}} rgb - RGB components (0-255)
 * @returns {number} Relative luminance (0-1)
 */
export function rgbToLuminance(rgb) {
  const { r, g, b } = rgb;
  
  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is lighter
 * @param {string} color1 - First color (hex format)
 * @param {string} color2 - Second color (hex format)
 * @returns {number} Contrast ratio (1-21)
 */
export function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const lum1 = rgbToLuminance(rgb1);
  const lum2 = rgbToLuminance(rgb2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Validates if contrast ratio meets WCAG AA standards
 * @param {number} ratio - Contrast ratio to validate
 * @param {boolean} [isLargeText=false] - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} True if contrast meets minimum requirements
 */
export function meetsWCAGAA(ratio, isLargeText = false) {
  const minimumRatio = isLargeText ? 3.0 : 4.5;
  return ratio >= minimumRatio;
}

/**
 * Validates if contrast ratio meets WCAG AAA standards
 * @param {number} ratio - Contrast ratio to validate
 * @param {boolean} [isLargeText=false] - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} True if contrast meets AAA requirements
 */
export function meetsWCAGAAA(ratio, isLargeText = false) {
  const minimumRatio = isLargeText ? 4.5 : 7.0;
  return ratio >= minimumRatio;
}

/**
 * Validates color pair and returns detailed results
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @param {boolean} [isLargeText=false] - Whether text is large
 * @returns {{ratio: number, passAA: boolean, passAAA: boolean, level: string}}
 */
export function validateColorPair(foreground, background, isLargeText = false) {
  const ratio = getContrastRatio(foreground, background);
  const passAA = meetsWCAGAA(ratio, isLargeText);
  const passAAA = meetsWCAGAAA(ratio, isLargeText);
  
  let level = 'FAIL';
  if (passAAA) level = 'AAA';
  else if (passAA) level = 'AA';
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    passAA,
    passAAA,
    level
  };
}