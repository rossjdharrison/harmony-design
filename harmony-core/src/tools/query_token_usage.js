/**
 * @fileoverview Query Token Usage Tool - Implements "where used" analysis for design tokens
 * 
 * Enables impact analysis by tracking which components, compositions, and styles
 * use specific design tokens. Critical for understanding the ripple effects of token changes.
 * 
 * Related documentation: harmony-design/DESIGN_SYSTEM.md § Token Impact Analysis
 * 
 * @module tools/query_token_usage
 */

import { TypeNavigator } from '../type_navigator.js';

/**
 * Token usage record structure
 * @typedef {Object} TokenUsage
 * @property {string} token - Token identifier (e.g., "color.primary.500")
 * @property {string} usedBy - Component/file identifier
 * @property {string} usageType - Type of usage: "style" | "composition" | "theme" | "animation"
 * @property {string} location - Specific location within the file
 * @property {number} lineNumber - Line number where token is used
 * @property {string} context - Surrounding code context
 */

/**
 * Impact analysis result
 * @typedef {Object} ImpactAnalysis
 * @property {string} token - Token being analyzed
 * @property {number} totalUsages - Total number of usages found
 * @property {Array<string>} affectedComponents - List of component IDs affected
 * @property {Array<TokenUsage>} usages - Detailed usage records
 * @property {Object<string, number>} usageByType - Count of usages by type
 * @property {string} severity - Impact severity: "low" | "medium" | "high" | "critical"
 */

/**
 * Query token usage across the design system
 * Implements "where used" functionality for token impact analysis
 * 
 * @class QueryTokenUsage
 */
export class QueryTokenUsage {
  /**
   * @param {TypeNavigator} typeNavigator - Type navigation system
   */
  constructor(typeNavigator) {
    if (!(typeNavigator instanceof TypeNavigator)) {
      throw new Error('QueryTokenUsage requires TypeNavigator instance');
    }
    this.typeNavigator = typeNavigator;
    this.usageCache = new Map();
    this.lastIndexTime = null;
  }

  /**
   * Find all usages of a specific token
   * 
   * @param {string} tokenId - Token identifier to search for
   * @param {Object} options - Query options
   * @param {boolean} options.includeIndirect - Include indirect usages (tokens that reference this token)
   * @param {Array<string>} options.filterByType - Filter by usage type
   * @param {boolean} options.useCache - Use cached results if available
   * @returns {Promise<ImpactAnalysis>} Impact analysis results
   */
  async findTokenUsages(tokenId, options = {}) {
    const {
      includeIndirect = false,
      filterByType = null,
      useCache = true
    } = options;

    const cacheKey = `${tokenId}:${includeIndirect}:${filterByType?.join(',')}`;
    
    if (useCache && this.usageCache.has(cacheKey)) {
      const cached = this.usageCache.get(cacheKey);
      // Cache valid for 5 minutes
      if (Date.now() - cached.timestamp < 300000) {
        return cached.result;
      }
    }

    const usages = await this._searchTokenUsages(tokenId, filterByType);
    
    if (includeIndirect) {
      const indirectUsages = await this._findIndirectUsages(tokenId);
      usages.push(...indirectUsages);
    }

    const result = this._buildImpactAnalysis(tokenId, usages);
    
    this.usageCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Search for direct token usages in components and styles
   * 
   * @private
   * @param {string} tokenId - Token to search for
   * @param {Array<string>|null} filterByType - Optional type filter
   * @returns {Promise<Array<TokenUsage>>} Found usages
   */
  async _searchTokenUsages(tokenId, filterByType) {
    const usages = [];
    
    // Query components that might use this token
    const components = await this.typeNavigator.queryByType('Component');
    
    for (const component of components) {
      const componentUsages = await this._scanComponentForToken(
        component,
        tokenId,
        filterByType
      );
      usages.push(...componentUsages);
    }

    // Query style definitions
    const styles = await this.typeNavigator.queryByType('StyleDefinition');
    
    for (const style of styles) {
      const styleUsages = await this._scanStyleForToken(
        style,
        tokenId,
        filterByType
      );
      usages.push(...styleUsages);
    }

    return usages;
  }

  /**
   * Scan a component for token usage
   * 
   * @private
   * @param {Object} component - Component to scan
   * @param {string} tokenId - Token to search for
   * @param {Array<string>|null} filterByType - Optional type filter
   * @returns {Promise<Array<TokenUsage>>} Found usages
   */
  async _scanComponentForToken(component, tokenId, filterByType) {
    const usages = [];
    const componentId = component.id || component.name;

    // Check component styles
    if (component.styles && this._shouldCheckType('style', filterByType)) {
      const styleUsages = this._findTokenInStyles(
        component.styles,
        tokenId,
        componentId
      );
      usages.push(...styleUsages);
    }

    // Check component theme
    if (component.theme && this._shouldCheckType('theme', filterByType)) {
      const themeUsages = this._findTokenInTheme(
        component.theme,
        tokenId,
        componentId
      );
      usages.push(...themeUsages);
    }

    // Check animations
    if (component.animations && this._shouldCheckType('animation', filterByType)) {
      const animationUsages = this._findTokenInAnimations(
        component.animations,
        tokenId,
        componentId
      );
      usages.push(...animationUsages);
    }

    // Check composition rules
    if (component.composition && this._shouldCheckType('composition', filterByType)) {
      const compositionUsages = this._findTokenInComposition(
        component.composition,
        tokenId,
        componentId
      );
      usages.push(...compositionUsages);
    }

    return usages;
  }

  /**
   * Scan a style definition for token usage
   * 
   * @private
   * @param {Object} style - Style definition to scan
   * @param {string} tokenId - Token to search for
   * @param {Array<string>|null} filterByType - Optional type filter
   * @returns {Promise<Array<TokenUsage>>} Found usages
   */
  async _scanStyleForToken(style, tokenId, filterByType) {
    if (!this._shouldCheckType('style', filterByType)) {
      return [];
    }

    const usages = [];
    const styleId = style.id || style.selector;

    // Check CSS properties
    if (style.properties) {
      for (const [property, value] of Object.entries(style.properties)) {
        if (this._valueReferencesToken(value, tokenId)) {
          usages.push({
            token: tokenId,
            usedBy: styleId,
            usageType: 'style',
            location: `property: ${property}`,
            lineNumber: style.lineNumber || 0,
            context: `${property}: ${value}`
          });
        }
      }
    }

    return usages;
  }

  /**
   * Find token references in component styles
   * 
   * @private
   * @param {Object|string} styles - Style object or CSS string
   * @param {string} tokenId - Token to search for
   * @param {string} componentId - Component identifier
   * @returns {Array<TokenUsage>} Found usages
   */
  _findTokenInStyles(styles, tokenId, componentId) {
    const usages = [];

    if (typeof styles === 'string') {
      // Parse CSS string for token references
      const matches = this._findTokenReferencesInCSS(styles, tokenId);
      for (const match of matches) {
        usages.push({
          token: tokenId,
          usedBy: componentId,
          usageType: 'style',
          location: 'inline styles',
          lineNumber: match.line,
          context: match.context
        });
      }
    } else if (typeof styles === 'object') {
      // Check style object properties
      for (const [key, value] of Object.entries(styles)) {
        if (this._valueReferencesToken(value, tokenId)) {
          usages.push({
            token: tokenId,
            usedBy: componentId,
            usageType: 'style',
            location: `style.${key}`,
            lineNumber: 0,
            context: `${key}: ${value}`
          });
        }
      }
    }

    return usages;
  }

  /**
   * Find token references in theme configuration
   * 
   * @private
   * @param {Object} theme - Theme configuration
   * @param {string} tokenId - Token to search for
   * @param {string} componentId - Component identifier
   * @returns {Array<TokenUsage>} Found usages
   */
  _findTokenInTheme(theme, tokenId, componentId) {
    const usages = [];

    const checkThemeObject = (obj, path = 'theme') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = `${path}.${key}`;
        
        if (typeof value === 'object' && value !== null) {
          checkThemeObject(value, currentPath);
        } else if (this._valueReferencesToken(value, tokenId)) {
          usages.push({
            token: tokenId,
            usedBy: componentId,
            usageType: 'theme',
            location: currentPath,
            lineNumber: 0,
            context: `${key}: ${value}`
          });
        }
      }
    };

    checkThemeObject(theme);
    return usages;
  }

  /**
   * Find token references in animations
   * 
   * @private
   * @param {Object|Array} animations - Animation definitions
   * @param {string} tokenId - Token to search for
   * @param {string} componentId - Component identifier
   * @returns {Array<TokenUsage>} Found usages
   */
  _findTokenInAnimations(animations, tokenId, componentId) {
    const usages = [];
    const animationArray = Array.isArray(animations) ? animations : [animations];

    for (const animation of animationArray) {
      if (animation.keyframes) {
        for (const [frame, properties] of Object.entries(animation.keyframes)) {
          for (const [prop, value] of Object.entries(properties)) {
            if (this._valueReferencesToken(value, tokenId)) {
              usages.push({
                token: tokenId,
                usedBy: componentId,
                usageType: 'animation',
                location: `animation.${animation.name}.${frame}.${prop}`,
                lineNumber: 0,
                context: `${prop}: ${value} (frame: ${frame})`
              });
            }
          }
        }
      }
    }

    return usages;
  }

  /**
   * Find token references in composition rules
   * 
   * @private
   * @param {Object} composition - Composition configuration
   * @param {string} tokenId - Token to search for
   * @param {string} componentId - Component identifier
   * @returns {Array<TokenUsage>} Found usages
   */
  _findTokenInComposition(composition, tokenId, componentId) {
    const usages = [];

    // Check spacing rules
    if (composition.spacing) {
      for (const [key, value] of Object.entries(composition.spacing)) {
        if (this._valueReferencesToken(value, tokenId)) {
          usages.push({
            token: tokenId,
            usedBy: componentId,
            usageType: 'composition',
            location: `composition.spacing.${key}`,
            lineNumber: 0,
            context: `${key}: ${value}`
          });
        }
      }
    }

    // Check layout constraints
    if (composition.constraints) {
      for (const [key, value] of Object.entries(composition.constraints)) {
        if (this._valueReferencesToken(value, tokenId)) {
          usages.push({
            token: tokenId,
            usedBy: componentId,
            usageType: 'composition',
            location: `composition.constraints.${key}`,
            lineNumber: 0,
            context: `${key}: ${value}`
          });
        }
      }
    }

    return usages;
  }

  /**
   * Find indirect token usages (tokens that reference the target token)
   * 
   * @private
   * @param {string} tokenId - Token to search for
   * @returns {Promise<Array<TokenUsage>>} Indirect usages
   */
  async _findIndirectUsages(tokenId) {
    const indirectUsages = [];
    
    // Query all tokens
    const tokens = await this.typeNavigator.queryByType('DesignToken');
    
    for (const token of tokens) {
      if (token.id === tokenId) continue;
      
      // Check if this token references the target token
      if (token.value && this._valueReferencesToken(token.value, tokenId)) {
        // Recursively find usages of this token
        const transitiveUsages = await this.findTokenUsages(token.id, {
          includeIndirect: false,
          useCache: true
        });
        
        // Mark these as indirect
        for (const usage of transitiveUsages.usages) {
          indirectUsages.push({
            ...usage,
            indirect: true,
            viaToken: token.id
          });
        }
      }
    }

    return indirectUsages;
  }

  /**
   * Check if a value references a specific token
   * 
   * @private
   * @param {*} value - Value to check
   * @param {string} tokenId - Token identifier
   * @returns {boolean} True if value references the token
   */
  _valueReferencesToken(value, tokenId) {
    if (typeof value !== 'string') return false;
    
    // Check for various token reference formats
    const patterns = [
      `var(--${tokenId})`,
      `token(${tokenId})`,
      `{${tokenId}}`,
      `$${tokenId}`,
      tokenId
    ];

    return patterns.some(pattern => value.includes(pattern));
  }

  /**
   * Find token references in CSS string
   * 
   * @private
   * @param {string} css - CSS string to search
   * @param {string} tokenId - Token to search for
   * @returns {Array<{line: number, context: string}>} Found references
   */
  _findTokenReferencesInCSS(css, tokenId) {
    const matches = [];
    const lines = css.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this._valueReferencesToken(line, tokenId)) {
        matches.push({
          line: i + 1,
          context: line.trim()
        });
      }
    }

    return matches;
  }

  /**
   * Check if a usage type should be checked based on filter
   * 
   * @private
   * @param {string} type - Usage type to check
   * @param {Array<string>|null} filter - Type filter
   * @returns {boolean} True if type should be checked
   */
  _shouldCheckType(type, filter) {
    if (!filter || filter.length === 0) return true;
    return filter.includes(type);
  }

  /**
   * Build comprehensive impact analysis from usage records
   * 
   * @private
   * @param {string} tokenId - Token being analyzed
   * @param {Array<TokenUsage>} usages - Usage records
   * @returns {ImpactAnalysis} Complete impact analysis
   */
  _buildImpactAnalysis(tokenId, usages) {
    const affectedComponents = new Set();
    const usageByType = {};

    for (const usage of usages) {
      affectedComponents.add(usage.usedBy);
      usageByType[usage.usageType] = (usageByType[usage.usageType] || 0) + 1;
    }

    const severity = this._calculateImpactSeverity(
      usages.length,
      affectedComponents.size
    );

    return {
      token: tokenId,
      totalUsages: usages.length,
      affectedComponents: Array.from(affectedComponents),
      usages,
      usageByType,
      severity
    };
  }

  /**
   * Calculate impact severity based on usage metrics
   * 
   * @private
   * @param {number} totalUsages - Total number of usages
   * @param {number} componentCount - Number of affected components
   * @returns {string} Severity level
   */
  _calculateImpactSeverity(totalUsages, componentCount) {
    if (componentCount >= 20 || totalUsages >= 50) return 'critical';
    if (componentCount >= 10 || totalUsages >= 25) return 'high';
    if (componentCount >= 5 || totalUsages >= 10) return 'medium';
    return 'low';
  }

  /**
   * Clear usage cache
   * Useful when design system has been updated
   */
  clearCache() {
    this.usageCache.clear();
    this.lastIndexTime = null;
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.usageCache.size,
      lastIndexTime: this.lastIndexTime
    };
  }
}