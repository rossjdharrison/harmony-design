/**
 * @fileoverview Style Dictionary Transform for Figma Format
 * @module tools/style-dictionary/figma-transform
 * 
 * Transforms design tokens into Figma-compatible JSON format.
 * Figma expects specific structures for colors, typography, spacing, etc.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#style-dictionary-figma-transform}
 */

/**
 * Converts hex color to RGB object for Figma
 * @param {string} hex - Hex color string (e.g., "#FF0000")
 * @returns {{r: number, g: number, b: number, a: number}} RGB object with values 0-1
 */
function hexToFigmaRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  const a = cleanHex.length === 8 ? parseInt(cleanHex.substring(6, 8), 16) / 255 : 1;
  
  return { r, g, b, a };
}

/**
 * Converts RGBA string to Figma RGB object
 * @param {string} rgba - RGBA string (e.g., "rgba(255, 0, 0, 0.5)")
 * @returns {{r: number, g: number, b: number, a: number}} RGB object with values 0-1
 */
function rgbaToFigmaRgb(rgba) {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) {
    throw new Error(`Invalid RGBA string: ${rgba}`);
  }
  
  return {
    r: parseInt(match[1], 10) / 255,
    g: parseInt(match[2], 10) / 255,
    b: parseInt(match[3], 10) / 255,
    a: match[4] ? parseFloat(match[4]) : 1
  };
}

/**
 * Converts any color format to Figma RGB object
 * @param {string} color - Color in any format (hex, rgba, rgb)
 * @returns {{r: number, g: number, b: number, a: number}} RGB object with values 0-1
 */
function colorToFigmaRgb(color) {
  if (typeof color !== 'string') {
    throw new Error(`Color must be a string, got ${typeof color}`);
  }
  
  if (color.startsWith('#')) {
    return hexToFigmaRgb(color);
  } else if (color.startsWith('rgb')) {
    return rgbaToFigmaRgb(color);
  }
  
  throw new Error(`Unsupported color format: ${color}`);
}

/**
 * Converts pixel value to number
 * @param {string|number} value - Value with or without 'px' suffix
 * @returns {number} Numeric value
 */
function pxToNumber(value) {
  if (typeof value === 'number') {
    return value;
  }
  return parseFloat(String(value).replace('px', ''));
}

/**
 * Transforms a color token to Figma format
 * @param {Object} token - Style Dictionary token object
 * @returns {Object} Figma-formatted color token
 */
function transformColorToken(token) {
  return {
    name: token.name,
    type: 'color',
    value: colorToFigmaRgb(token.value),
    description: token.comment || token.description || ''
  };
}

/**
 * Transforms a typography token to Figma format
 * @param {Object} token - Style Dictionary token object
 * @returns {Object} Figma-formatted typography token
 */
function transformTypographyToken(token) {
  const value = token.value;
  
  return {
    name: token.name,
    type: 'typography',
    value: {
      fontFamily: value.fontFamily || 'Inter',
      fontSize: pxToNumber(value.fontSize || 16),
      fontWeight: typeof value.fontWeight === 'string' 
        ? parseInt(value.fontWeight, 10) 
        : value.fontWeight || 400,
      lineHeight: value.lineHeight 
        ? (typeof value.lineHeight === 'string' && value.lineHeight.includes('%')
          ? parseFloat(value.lineHeight) / 100
          : pxToNumber(value.lineHeight))
        : 1.5,
      letterSpacing: value.letterSpacing ? pxToNumber(value.letterSpacing) : 0,
      textTransform: value.textTransform || 'none'
    },
    description: token.comment || token.description || ''
  };
}

/**
 * Transforms a spacing token to Figma format
 * @param {Object} token - Style Dictionary token object
 * @returns {Object} Figma-formatted spacing token
 */
function transformSpacingToken(token) {
  return {
    name: token.name,
    type: 'spacing',
    value: pxToNumber(token.value),
    description: token.comment || token.description || ''
  };
}

/**
 * Transforms a shadow token to Figma format
 * @param {Object} token - Style Dictionary token object
 * @returns {Object} Figma-formatted shadow token
 */
function transformShadowToken(token) {
  const value = token.value;
  
  // Parse shadow string if needed
  let shadowObj = value;
  if (typeof value === 'string') {
    // Parse CSS shadow string: "0px 2px 4px rgba(0,0,0,0.1)"
    const match = value.match(/(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)?\s*(.*)/);
    if (match) {
      shadowObj = {
        x: pxToNumber(match[1]),
        y: pxToNumber(match[2]),
        blur: pxToNumber(match[3]),
        spread: match[4] ? pxToNumber(match[4]) : 0,
        color: match[5] || 'rgba(0,0,0,0.1)'
      };
    }
  }
  
  return {
    name: token.name,
    type: 'shadow',
    value: {
      x: shadowObj.x || 0,
      y: shadowObj.y || 0,
      blur: shadowObj.blur || 0,
      spread: shadowObj.spread || 0,
      color: colorToFigmaRgb(shadowObj.color || 'rgba(0,0,0,0.1)')
    },
    description: token.comment || token.description || ''
  };
}

/**
 * Transforms a border radius token to Figma format
 * @param {Object} token - Style Dictionary token object
 * @returns {Object} Figma-formatted radius token
 */
function transformRadiusToken(token) {
  return {
    name: token.name,
    type: 'radius',
    value: pxToNumber(token.value),
    description: token.comment || token.description || ''
  };
}

/**
 * Main transform function for converting tokens to Figma format
 * @param {Object} dictionary - Style Dictionary object with all tokens
 * @returns {Object} Figma-formatted token collection
 */
export function transformToFigma(dictionary) {
  const figmaTokens = {
    version: '1.0',
    tokens: {
      colors: [],
      typography: [],
      spacing: [],
      shadows: [],
      radii: []
    }
  };
  
  // Iterate through all tokens
  dictionary.allTokens.forEach(token => {
    try {
      const path = token.path.join('.');
      
      // Determine token type and transform accordingly
      if (path.includes('color') || token.type === 'color') {
        figmaTokens.tokens.colors.push(transformColorToken(token));
      } else if (path.includes('typography') || path.includes('font') || token.type === 'typography') {
        figmaTokens.tokens.typography.push(transformTypographyToken(token));
      } else if (path.includes('spacing') || path.includes('space') || token.type === 'spacing') {
        figmaTokens.tokens.spacing.push(transformSpacingToken(token));
      } else if (path.includes('shadow') || token.type === 'shadow') {
        figmaTokens.tokens.shadows.push(transformShadowToken(token));
      } else if (path.includes('radius') || path.includes('border-radius') || token.type === 'radius') {
        figmaTokens.tokens.radii.push(transformRadiusToken(token));
      }
    } catch (error) {
      console.error(`Error transforming token ${token.name}:`, error);
    }
  });
  
  return figmaTokens;
}

/**
 * Style Dictionary formatter for Figma
 * @param {Object} options - Formatter options
 * @returns {string} Formatted JSON string
 */
export function figmaFormatter({ dictionary, file }) {
  const figmaTokens = transformToFigma(dictionary);
  return JSON.stringify(figmaTokens, null, 2);
}

/**
 * Register the Figma format with Style Dictionary
 * @param {Object} StyleDictionary - Style Dictionary instance
 */
export function registerFigmaFormat(StyleDictionary) {
  StyleDictionary.registerFormat({
    name: 'figma/json',
    formatter: figmaFormatter
  });
}

// Export utilities for testing
export const utils = {
  hexToFigmaRgb,
  rgbaToFigmaRgb,
  colorToFigmaRgb,
  pxToNumber,
  transformColorToken,
  transformTypographyToken,
  transformSpacingToken,
  transformShadowToken,
  transformRadiusToken
};