/**
 * @fileoverview Custom Style Dictionary Transforms
 * Provides specialized transformations for design tokens
 * 
 * @see DESIGN_SYSTEM.md#design-tokens
 */

/**
 * Transform pixel values to rem units
 * @param {Object} token - Token object with value
 * @returns {string} Transformed value in rem
 */
export function pxToRem(token) {
  const baseFont = 16;
  if (typeof token.value === 'string' && token.value.endsWith('px')) {
    const pxValue = parseFloat(token.value);
    return `${(pxValue / baseFont).toFixed(4)}rem`;
  }
  return token.value;
}

/**
 * Transform color values to rgba format
 * @param {Object} token - Token object with color value
 * @returns {string} RGBA color string
 */
export function colorToRgba(token) {
  if (typeof token.value === 'string' && token.value.startsWith('#')) {
    const hex = token.value.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return token.value;
}

/**
 * Transform duration values to milliseconds
 * @param {Object} token - Token object with duration value
 * @returns {string} Duration in milliseconds
 */
export function durationToMs(token) {
  if (typeof token.value === 'string') {
    if (token.value.endsWith('s') && !token.value.endsWith('ms')) {
      const seconds = parseFloat(token.value);
      return `${seconds * 1000}ms`;
    }
  }
  return token.value;
}

/**
 * Transform font weight names to numeric values
 * @param {Object} token - Token object with font weight
 * @returns {number|string} Numeric font weight
 */
export function fontWeightToNumber(token) {
  const weights = {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900
  };
  
  if (typeof token.value === 'string') {
    const normalized = token.value.toLowerCase();
    return weights[normalized] || token.value;
  }
  
  return token.value;
}

/**
 * Transform shadow values to CSS box-shadow format
 * @param {Object} token - Token object with shadow properties
 * @returns {string} CSS box-shadow value
 */
export function shadowToCss(token) {
  if (typeof token.value === 'object') {
    const { x = 0, y = 0, blur = 0, spread = 0, color = '#000000', alpha = 1 } = token.value;
    return `${x}px ${y}px ${blur}px ${spread}px rgba(${hexToRgb(color)}, ${alpha})`;
  }
  return token.value;
}

/**
 * Helper: Convert hex color to RGB components
 * @param {string} hex - Hex color string
 * @returns {string} RGB components as comma-separated string
 */
function hexToRgb(hex) {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * Transform spacing values with consistent units
 * @param {Object} token - Token object with spacing value
 * @returns {string} Transformed spacing value
 */
export function spacingTransform(token) {
  if (typeof token.value === 'number') {
    return `${token.value}px`;
  }
  return token.value;
}

/**
 * Transform border radius to ensure consistent format
 * @param {Object} token - Token object with border radius
 * @returns {string} Formatted border radius
 */
export function borderRadiusTransform(token) {
  if (typeof token.value === 'number') {
    return `${token.value}px`;
  }
  if (typeof token.value === 'string' && token.value === 'circle') {
    return '50%';
  }
  return token.value;
}

/**
 * Transform z-index values to ensure proper layering
 * @param {Object} token - Token object with z-index
 * @returns {number} Z-index value
 */
export function zIndexTransform(token) {
  const layers = {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    'modal-backdrop': 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070
  };
  
  if (typeof token.value === 'string') {
    return layers[token.value] || parseInt(token.value, 10);
  }
  
  return token.value;
}

/**
 * Registry of all custom transforms
 */
export const transformRegistry = {
  'size/pxToRem': {
    type: 'value',
    matcher: (token) => token.type === 'dimension' || token.attributes?.category === 'size',
    transformer: pxToRem
  },
  
  'color/rgba': {
    type: 'value',
    matcher: (token) => token.type === 'color',
    transformer: colorToRgba
  },
  
  'time/ms': {
    type: 'value',
    matcher: (token) => token.type === 'duration',
    transformer: durationToMs
  },
  
  'font/weight': {
    type: 'value',
    matcher: (token) => token.type === 'fontWeight',
    transformer: fontWeightToNumber
  },
  
  'shadow/css': {
    type: 'value',
    matcher: (token) => token.type === 'shadow',
    transformer: shadowToCss
  },
  
  'spacing/px': {
    type: 'value',
    matcher: (token) => token.type === 'spacing',
    transformer: spacingTransform
  },
  
  'border/radius': {
    type: 'value',
    matcher: (token) => token.type === 'borderRadius',
    transformer: borderRadiusTransform
  },
  
  'layer/zIndex': {
    type: 'value',
    matcher: (token) => token.type === 'zIndex',
    transformer: zIndexTransform
  }
};