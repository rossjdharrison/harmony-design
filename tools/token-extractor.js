/**
 * Design Tokens Extraction Tool
 * 
 * Extracts design tokens from .pen files and converts them to CSS custom properties.
 * Supports colors, typography, spacing, and other design primitives.
 * 
 * @module tools/token-extractor
 * @see DESIGN_SYSTEM.md#design-tokens
 */

import { TokenSchemas } from '../core/validation/token-schemas.js';

/**
 * Extracts design tokens from a .pen file and converts to CSS custom properties
 * 
 * @class TokenExtractor
 * @example
 * const extractor = new TokenExtractor();
 * const css = await extractor.extractFromFile('tokens/colors.pen');
 * console.log(css); // :root { --color-primary: #007bff; ... }
 */
export class TokenExtractor {
  constructor() {
    this.tokenSchemas = TokenSchemas;
  }

  /**
   * Extracts tokens from a .pen file
   * 
   * @param {string} filePath - Path to the .pen file
   * @returns {Promise<string>} CSS custom properties
   * @throws {Error} If file cannot be read or parsed
   */
  async extractFromFile(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load .pen file: ${filePath}`);
      }
      const penContent = await response.json();
      return this.extractFromPenData(penContent);
    } catch (error) {
      console.error(`[TokenExtractor] Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Extracts tokens from parsed .pen data
   * 
   * @param {Object} penData - Parsed .pen file content
   * @returns {string} CSS custom properties
   */
  extractFromPenData(penData) {
    const tokens = this.parseTokens(penData);
    return this.generateCSS(tokens);
  }

  /**
   * Parses tokens from .pen data structure
   * 
   * @param {Object} penData - Parsed .pen file content
   * @returns {Object} Normalized token structure
   * @private
   */
  parseTokens(penData) {
    const tokens = {
      colors: {},
      typography: {},
      spacing: {},
      shadows: {},
      borders: {},
      radii: {},
      transitions: {},
      zIndices: {}
    };

    // Extract color tokens
    if (penData.colors) {
      tokens.colors = this.parseColorTokens(penData.colors);
    }

    // Extract typography tokens
    if (penData.typography) {
      tokens.typography = this.parseTypographyTokens(penData.typography);
    }

    // Extract spacing tokens
    if (penData.spacing) {
      tokens.spacing = this.parseSpacingTokens(penData.spacing);
    }

    // Extract shadow tokens
    if (penData.shadows) {
      tokens.shadows = this.parseShadowTokens(penData.shadows);
    }

    // Extract border tokens
    if (penData.borders) {
      tokens.borders = this.parseBorderTokens(penData.borders);
    }

    // Extract border radius tokens
    if (penData.radii || penData.borderRadius) {
      tokens.radii = this.parseRadiusTokens(penData.radii || penData.borderRadius);
    }

    // Extract transition tokens
    if (penData.transitions) {
      tokens.transitions = this.parseTransitionTokens(penData.transitions);
    }

    // Extract z-index tokens
    if (penData.zIndices || penData.zIndex) {
      tokens.zIndices = this.parseZIndexTokens(penData.zIndices || penData.zIndex);
    }

    return tokens;
  }

  /**
   * Parses color tokens from .pen data
   * 
   * @param {Object} colorData - Color data from .pen file
   * @returns {Object} Normalized color tokens
   * @private
   */
  parseColorTokens(colorData) {
    const colors = {};
    
    for (const [key, value] of Object.entries(colorData)) {
      if (typeof value === 'string') {
        colors[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested color objects (e.g., primary: { base, light, dark })
        for (const [subKey, subValue] of Object.entries(value)) {
          colors[`${key}-${subKey}`] = subValue;
        }
      }
    }

    return colors;
  }

  /**
   * Parses typography tokens from .pen data
   * 
   * @param {Object} typographyData - Typography data from .pen file
   * @returns {Object} Normalized typography tokens
   * @private
   */
  parseTypographyTokens(typographyData) {
    const typography = {};

    for (const [key, value] of Object.entries(typographyData)) {
      if (typeof value === 'object' && value !== null) {
        // Handle typography objects with multiple properties
        if (value.fontSize) typography[`${key}-font-size`] = value.fontSize;
        if (value.fontWeight) typography[`${key}-font-weight`] = value.fontWeight;
        if (value.lineHeight) typography[`${key}-line-height`] = value.lineHeight;
        if (value.letterSpacing) typography[`${key}-letter-spacing`] = value.letterSpacing;
        if (value.fontFamily) typography[`${key}-font-family`] = value.fontFamily;
      } else {
        typography[key] = value;
      }
    }

    return typography;
  }

  /**
   * Parses spacing tokens from .pen data
   * 
   * @param {Object} spacingData - Spacing data from .pen file
   * @returns {Object} Normalized spacing tokens
   * @private
   */
  parseSpacingTokens(spacingData) {
    const spacing = {};

    for (const [key, value] of Object.entries(spacingData)) {
      spacing[key] = typeof value === 'number' ? `${value}px` : value;
    }

    return spacing;
  }

  /**
   * Parses shadow tokens from .pen data
   * 
   * @param {Object} shadowData - Shadow data from .pen file
   * @returns {Object} Normalized shadow tokens
   * @private
   */
  parseShadowTokens(shadowData) {
    const shadows = {};

    for (const [key, value] of Object.entries(shadowData)) {
      if (typeof value === 'object' && value !== null) {
        // Convert shadow object to CSS shadow string
        const { x = 0, y = 0, blur = 0, spread = 0, color = 'rgba(0,0,0,0.1)' } = value;
        shadows[key] = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
      } else {
        shadows[key] = value;
      }
    }

    return shadows;
  }

  /**
   * Parses border tokens from .pen data
   * 
   * @param {Object} borderData - Border data from .pen file
   * @returns {Object} Normalized border tokens
   * @private
   */
  parseBorderTokens(borderData) {
    const borders = {};

    for (const [key, value] of Object.entries(borderData)) {
      if (typeof value === 'object' && value !== null) {
        const { width = '1px', style = 'solid', color = 'currentColor' } = value;
        borders[key] = `${width} ${style} ${color}`;
      } else {
        borders[key] = value;
      }
    }

    return borders;
  }

  /**
   * Parses border radius tokens from .pen data
   * 
   * @param {Object} radiusData - Radius data from .pen file
   * @returns {Object} Normalized radius tokens
   * @private
   */
  parseRadiusTokens(radiusData) {
    const radii = {};

    for (const [key, value] of Object.entries(radiusData)) {
      radii[key] = typeof value === 'number' ? `${value}px` : value;
    }

    return radii;
  }

  /**
   * Parses transition tokens from .pen data
   * 
   * @param {Object} transitionData - Transition data from .pen file
   * @returns {Object} Normalized transition tokens
   * @private
   */
  parseTransitionTokens(transitionData) {
    const transitions = {};

    for (const [key, value] of Object.entries(transitionData)) {
      if (typeof value === 'object' && value !== null) {
        const { property = 'all', duration = '200ms', timing = 'ease', delay = '0ms' } = value;
        transitions[key] = `${property} ${duration} ${timing} ${delay}`;
      } else {
        transitions[key] = value;
      }
    }

    return transitions;
  }

  /**
   * Parses z-index tokens from .pen data
   * 
   * @param {Object} zIndexData - Z-index data from .pen file
   * @returns {Object} Normalized z-index tokens
   * @private
   */
  parseZIndexTokens(zIndexData) {
    const zIndices = {};

    for (const [key, value] of Object.entries(zIndexData)) {
      zIndices[key] = value;
    }

    return zIndices;
  }

  /**
   * Generates CSS custom properties from tokens
   * 
   * @param {Object} tokens - Normalized token structure
   * @returns {string} CSS custom properties
   * @private
   */
  generateCSS(tokens) {
    const lines = [':root {'];

    // Generate color properties
    if (Object.keys(tokens.colors).length > 0) {
      lines.push('  /* Colors */');
      for (const [key, value] of Object.entries(tokens.colors)) {
        lines.push(`  --color-${this.kebabCase(key)}: ${value};`);
      }
      lines.push('');
    }

    // Generate typography properties
    if (Object.keys(tokens.typography).length > 0) {
      lines.push('  /* Typography */');
      for (const [key, value] of Object.entries(tokens.typography)) {
        lines.push(`  --typography-${this.kebabCase(key)}: ${value};`);
      }
      lines.push('');
    }

    // Generate spacing properties
    if (Object.keys(tokens.spacing).length > 0) {
      lines.push('  /* Spacing */');
      for (const [key, value] of Object.entries(tokens.spacing)) {
        lines.push(`  --spacing-${this.kebabCase(key)}: ${value};`);
      }
      lines.push('');
    }

    // Generate shadow properties
    if (Object.keys(tokens.shadows).length > 0) {
      lines.push('  /* Shadows */');
      for (const [key, value] of Object.entries(tokens.shadows)) {
        lines.push(`  --shadow-${this.kebabCase(key)}: ${value};`);
      }
      lines.push('');
    }

    // Generate border properties
    if (Object.keys(tokens.borders).length > 0) {
      lines.push('  /* Borders */');
      for (const [key, value] of Object.entries(tokens.borders)) {
        lines.push(`  --border-${this.kebabCase(key)}: ${value};`);
      }
      lines.push('');
    }

    // Generate radius properties
    if (Object.keys(tokens.radii).length > 0) {
      lines.push('  /* Border Radius */');
      for (const [key, value] of Object.entries(tokens.radii)) {
        lines.push(`  --radius-${this.kebabCase(key)}: ${value};`);
      }
      lines.push('');
    }

    // Generate transition properties
    if (Object.keys(tokens.transitions).length > 0) {
      lines.push('  /* Transitions */');
      for (const [key, value] of Object.entries(tokens.transitions)) {
        lines.push(`  --transition-${this.kebabCase(key)}: ${value};`);
      }
      lines.push('');
    }

    // Generate z-index properties
    if (Object.keys(tokens.zIndices).length > 0) {
      lines.push('  /* Z-Indices */');
      for (const [key, value] of Object.entries(tokens.zIndices)) {
        lines.push(`  --z-index-${this.kebabCase(key)}: ${value};`);
      }
      lines.push('');
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Converts string to kebab-case
   * 
   * @param {string} str - String to convert
   * @returns {string} Kebab-cased string
   * @private
   */
  kebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Validates extracted tokens against schema
   * 
   * @param {Object} tokens - Tokens to validate
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateTokens(tokens) {
    // Validate color tokens
    if (tokens.colors) {
      for (const [key, value] of Object.entries(tokens.colors)) {
        if (!this.isValidColor(value)) {
          throw new Error(`Invalid color token: ${key} = ${value}`);
        }
      }
    }

    return true;
  }

  /**
   * Validates if a string is a valid CSS color
   * 
   * @param {string} color - Color string to validate
   * @returns {boolean} True if valid
   * @private
   */
  isValidColor(color) {
    // Basic validation for hex, rgb, rgba, hsl, hsla, and named colors
    const colorRegex = /^(#[0-9a-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-z]+)$/i;
    return colorRegex.test(color);
  }
}

/**
 * CLI interface for token extraction
 * 
 * @param {string[]} args - Command line arguments
 * @returns {Promise<void>}
 */
export async function main(args) {
  if (args.length < 1) {
    console.error('Usage: node token-extractor.js <input.pen> [output.css]');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || inputFile.replace('.pen', '.css');

  try {
    const extractor = new TokenExtractor();
    const css = await extractor.extractFromFile(inputFile);
    
    // In Node.js environment
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const fs = await import('fs');
      fs.writeFileSync(outputFile, css);
      console.log(`✓ Tokens extracted to ${outputFile}`);
    } else {
      // In browser environment
      console.log(css);
    }
  } catch (error) {
    console.error('✗ Extraction failed:', error.message);
    process.exit(1);
  }
}

// Run CLI if invoked directly
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}