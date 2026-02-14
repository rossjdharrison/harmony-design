/**
 * @fileoverview DesignTokenNode type definition for design tokens (colors, spacing, typography)
 * @module harmony-design/types/DesignTokenNode
 * 
 * Design tokens are the visual design atoms of the design system—the smallest
 * indivisible elements like colors, spacing values, and typography settings.
 * 
 * Related documentation: See DESIGN_SYSTEM.md § Design Tokens
 */

/**
 * Token category enumeration
 * @enum {string}
 */
export const TokenCategory = {
  COLOR: 'color',
  SPACING: 'spacing',
  TYPOGRAPHY: 'typography'
};

/**
 * Color token subcategories
 * @enum {string}
 */
export const ColorTokenType = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  ACCENT: 'accent',
  NEUTRAL: 'neutral',
  SEMANTIC: 'semantic', // success, error, warning, info
  SURFACE: 'surface',
  TEXT: 'text',
  BORDER: 'border'
};

/**
 * Spacing token subcategories
 * @enum {string}
 */
export const SpacingTokenType = {
  SCALE: 'scale', // 0, 1, 2, 3, 4, 5, 6, 7, 8
  COMPONENT: 'component', // button-padding, card-gap, etc.
  LAYOUT: 'layout' // container-width, grid-gap, etc.
};

/**
 * Typography token subcategories
 * @enum {string}
 */
export const TypographyTokenType = {
  FONT_FAMILY: 'font-family',
  FONT_SIZE: 'font-size',
  FONT_WEIGHT: 'font-weight',
  LINE_HEIGHT: 'line-height',
  LETTER_SPACING: 'letter-spacing',
  TEXT_STYLE: 'text-style' // Complete style presets (h1, body, caption, etc.)
};

/**
 * Design token metadata
 * @typedef {Object} TokenMetadata
 * @property {string} description - Human-readable description of the token's purpose
 * @property {string[]} [aliases] - Alternative names for this token
 * @property {string} [deprecated] - Deprecation message if token is being phased out
 * @property {string} [replacedBy] - Token ID that replaces this deprecated token
 * @property {Object.<string, string>} [tags] - Additional categorization tags
 */

/**
 * Color token value specification
 * @typedef {Object} ColorTokenValue
 * @property {string} hex - Hexadecimal color value (e.g., "#FF5733")
 * @property {string} [rgb] - RGB representation (e.g., "rgb(255, 87, 51)")
 * @property {string} [hsl] - HSL representation (e.g., "hsl(12, 100%, 60%)")
 * @property {number} [alpha] - Optional alpha channel (0-1)
 */

/**
 * Spacing token value specification
 * @typedef {Object} SpacingTokenValue
 * @property {number} value - Numeric value
 * @property {string} unit - CSS unit (px, rem, em, etc.)
 * @property {string} computed - Full CSS value (e.g., "16px", "1rem")
 */

/**
 * Typography token value specification
 * @typedef {Object} TypographyTokenValue
 * @property {string} [fontFamily] - Font family stack
 * @property {string} [fontSize] - Font size with unit
 * @property {string|number} [fontWeight] - Font weight (normal, bold, 100-900)
 * @property {string|number} [lineHeight] - Line height (unitless or with unit)
 * @property {string} [letterSpacing] - Letter spacing with unit
 * @property {string} [textTransform] - Text transformation (none, uppercase, etc.)
 */

/**
 * DesignTokenNode represents a single design token in the design system
 * @typedef {Object} DesignTokenNode
 * @property {string} id - Unique identifier (e.g., "color.primary.500", "spacing.scale.4")
 * @property {string} name - Display name (e.g., "Primary 500", "Spacing Scale 4")
 * @property {TokenCategory} category - Token category
 * @property {string} type - Specific token type within category
 * @property {ColorTokenValue|SpacingTokenValue|TypographyTokenValue|string|number} value - Token value
 * @property {TokenMetadata} metadata - Additional metadata
 * @property {string} [reference] - Reference to another token ID (for aliases/themes)
 * @property {number} version - Token version for change tracking
 * @property {number} createdAt - Creation timestamp
 * @property {number} updatedAt - Last update timestamp
 */

/**
 * Creates a new DesignTokenNode
 * @param {Object} config - Token configuration
 * @param {string} config.id - Unique identifier
 * @param {string} config.name - Display name
 * @param {TokenCategory} config.category - Token category
 * @param {string} config.type - Specific token type
 * @param {*} config.value - Token value
 * @param {TokenMetadata} [config.metadata] - Additional metadata
 * @param {string} [config.reference] - Reference to another token
 * @returns {DesignTokenNode} New token node
 */
export function createDesignTokenNode(config) {
  const now = Date.now();
  
  return {
    id: config.id,
    name: config.name,
    category: config.category,
    type: config.type,
    value: config.value,
    metadata: config.metadata || { description: '' },
    reference: config.reference || null,
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Validates a DesignTokenNode structure
 * @param {DesignTokenNode} token - Token to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateDesignTokenNode(token) {
  const errors = [];
  
  if (!token.id || typeof token.id !== 'string') {
    errors.push('Token must have a valid string id');
  }
  
  if (!token.name || typeof token.name !== 'string') {
    errors.push('Token must have a valid string name');
  }
  
  if (!Object.values(TokenCategory).includes(token.category)) {
    errors.push(`Token category must be one of: ${Object.values(TokenCategory).join(', ')}`);
  }
  
  if (!token.type || typeof token.type !== 'string') {
    errors.push('Token must have a valid type');
  }
  
  if (token.value === undefined || token.value === null) {
    errors.push('Token must have a value');
  }
  
  // Category-specific validation
  if (token.category === TokenCategory.COLOR && typeof token.value === 'object') {
    if (!token.value.hex) {
      errors.push('Color token must have a hex value');
    }
  }
  
  if (token.category === TokenCategory.SPACING && typeof token.value === 'object') {
    if (typeof token.value.value !== 'number' || !token.value.unit) {
      errors.push('Spacing token must have numeric value and unit');
    }
  }
  
  if (!token.metadata || typeof token.metadata !== 'object') {
    errors.push('Token must have metadata object');
  }
  
  if (typeof token.version !== 'number' || token.version < 1) {
    errors.push('Token must have valid version number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Resolves a token reference to its actual value
 * @param {DesignTokenNode} token - Token to resolve
 * @param {Map<string, DesignTokenNode>} tokenRegistry - Registry of all tokens
 * @returns {*} Resolved value
 */
export function resolveTokenValue(token, tokenRegistry) {
  if (!token.reference) {
    return token.value;
  }
  
  const referencedToken = tokenRegistry.get(token.reference);
  if (!referencedToken) {
    console.warn(`Token reference not found: ${token.reference}`);
    return token.value;
  }
  
  // Recursively resolve if referenced token also has a reference
  return resolveTokenValue(referencedToken, tokenRegistry);
}

/**
 * Converts a token value to CSS custom property format
 * @param {DesignTokenNode} token - Token to convert
 * @returns {string} CSS custom property value
 */
export function tokenToCSSValue(token) {
  const value = token.value;
  
  switch (token.category) {
    case TokenCategory.COLOR:
      if (typeof value === 'object' && value.hex) {
        return value.alpha !== undefined 
          ? `${value.hex}${Math.round(value.alpha * 255).toString(16).padStart(2, '0')}`
          : value.hex;
      }
      return String(value);
      
    case TokenCategory.SPACING:
      if (typeof value === 'object' && value.computed) {
        return value.computed;
      }
      return String(value);
      
    case TokenCategory.TYPOGRAPHY:
      if (typeof value === 'object') {
        // For text-style presets, return the most commonly used property
        return value.fontSize || value.fontFamily || JSON.stringify(value);
      }
      return String(value);
      
    default:
      return String(value);
  }
}

/**
 * Generates CSS custom property name from token ID
 * @param {string} tokenId - Token identifier
 * @returns {string} CSS custom property name (e.g., "--color-primary-500")
 */
export function tokenIdToCSSVar(tokenId) {
  return `--${tokenId.replace(/\./g, '-')}`;
}

/**
 * Creates a color token
 * @param {string} id - Token ID
 * @param {string} name - Display name
 * @param {string} hex - Hex color value
 * @param {Object} [options] - Additional options
 * @returns {DesignTokenNode} Color token
 */
export function createColorToken(id, name, hex, options = {}) {
  return createDesignTokenNode({
    id,
    name,
    category: TokenCategory.COLOR,
    type: options.type || ColorTokenType.PRIMARY,
    value: {
      hex,
      alpha: options.alpha
    },
    metadata: {
      description: options.description || '',
      tags: options.tags
    }
  });
}

/**
 * Creates a spacing token
 * @param {string} id - Token ID
 * @param {string} name - Display name
 * @param {number} value - Numeric value
 * @param {string} unit - CSS unit
 * @param {Object} [options] - Additional options
 * @returns {DesignTokenNode} Spacing token
 */
export function createSpacingToken(id, name, value, unit, options = {}) {
  return createDesignTokenNode({
    id,
    name,
    category: TokenCategory.SPACING,
    type: options.type || SpacingTokenType.SCALE,
    value: {
      value,
      unit,
      computed: `${value}${unit}`
    },
    metadata: {
      description: options.description || '',
      tags: options.tags
    }
  });
}

/**
 * Creates a typography token
 * @param {string} id - Token ID
 * @param {string} name - Display name
 * @param {TypographyTokenValue} value - Typography values
 * @param {Object} [options] - Additional options
 * @returns {DesignTokenNode} Typography token
 */
export function createTypographyToken(id, name, value, options = {}) {
  return createDesignTokenNode({
    id,
    name,
    category: TokenCategory.TYPOGRAPHY,
    type: options.type || TypographyTokenType.TEXT_STYLE,
    value,
    metadata: {
      description: options.description || '',
      tags: options.tags
    }
  });
}