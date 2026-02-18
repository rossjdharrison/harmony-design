/**
 * @fileoverview Token-Component Matrix - Maps which tokens each component uses
 * @module docs/tokens/token-component-matrix
 * 
 * Provides runtime analysis and documentation of token usage across components.
 * Scans component source code and runtime styles to identify token dependencies.
 * 
 * Related documentation: DESIGN_SYSTEM.md § Token System
 */

/**
 * Component token usage data structure
 * @typedef {Object} ComponentTokenUsage
 * @property {string} componentName - Name of the component
 * @property {string} filePath - Path to component file
 * @property {string[]} colorTokens - Color tokens used
 * @property {string[]} spacingTokens - Spacing tokens used
 * @property {string[]} typographyTokens - Typography tokens used
 * @property {string[]} shadowTokens - Shadow tokens used
 * @property {string[]} transitionTokens - Transition tokens used
 * @property {string[]} borderTokens - Border tokens used
 */

/**
 * Token-Component Matrix analyzer
 * Scans components to identify token usage patterns
 */
export class TokenComponentMatrix {
  constructor() {
    /** @type {Map<string, ComponentTokenUsage>} */
    this.componentUsage = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.tokenToComponents = new Map();
    
    this.initialized = false;
  }

  /**
   * Initialize the matrix by analyzing all components
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    // Scan all registered components
    await this.scanComponents();
    
    // Build reverse index (token -> components)
    this.buildTokenIndex();
    
    this.initialized = true;
  }

  /**
   * Scan all Web Components for token usage
   * @returns {Promise<void>}
   */
  async scanComponents() {
    const components = [
      { name: 'harmony-fader', path: '../../components/controls/harmony-fader.js' },
      { name: 'harmony-toggle', path: '../../controls/harmony-toggle/harmony-toggle.js' },
      { name: 'harmony-clip', path: '../../components/composites/clip/clip.js' },
      { name: 'harmony-transport-bar', path: '../../components/composites/transport-bar/transport-bar.js' },
      { name: 'harmony-theme-switcher', path: '../../components/theme-switcher/theme-switcher.js' },
      { name: 'token-provider', path: '../../core/token-provider.js' }
    ];

    for (const component of components) {
      try {
        const usage = await this.analyzeComponent(component.name, component.path);
        this.componentUsage.set(component.name, usage);
      } catch (error) {
        console.warn(`Failed to analyze component ${component.name}:`, error);
      }
    }
  }

  /**
   * Analyze a single component for token usage
   * @param {string} componentName - Name of the component
   * @param {string} filePath - Path to component file
   * @returns {Promise<ComponentTokenUsage>}
   */
  async analyzeComponent(componentName, filePath) {
    const usage = {
      componentName,
      filePath,
      colorTokens: [],
      spacingTokens: [],
      typographyTokens: [],
      shadowTokens: [],
      transitionTokens: [],
      borderTokens: []
    };

    try {
      // Try to get the actual component instance
      const element = document.createElement(componentName);
      if (element.shadowRoot || customElements.get(componentName)) {
        document.body.appendChild(element);
        
        // Analyze computed styles
        const styles = window.getComputedStyle(element);
        this.extractTokensFromStyles(styles, usage);
        
        // Analyze shadow DOM if available
        if (element.shadowRoot) {
          this.analyzeShadowDOM(element.shadowRoot, usage);
        }
        
        document.body.removeChild(element);
      }
    } catch (error) {
      console.warn(`Runtime analysis failed for ${componentName}, using static analysis`, error);
    }

    // Also perform static analysis by pattern matching
    await this.staticAnalysis(filePath, usage);

    return usage;
  }

  /**
   * Extract tokens from computed styles
   * @param {CSSStyleDeclaration} styles - Computed styles
   * @param {ComponentTokenUsage} usage - Usage object to populate
   */
  extractTokensFromStyles(styles, usage) {
    // Check for CSS custom properties (tokens)
    const properties = Array.from(styles);
    
    for (const prop of properties) {
      const value = styles.getPropertyValue(prop);
      
      // Look for var(--token-name) references
      const tokenMatches = value.matchAll(/var\(--([^)]+)\)/g);
      for (const match of tokenMatches) {
        const tokenName = `--${match[1]}`;
        this.categorizeToken(tokenName, usage);
      }
    }
  }

  /**
   * Analyze shadow DOM for token usage
   * @param {ShadowRoot} shadowRoot - Shadow root to analyze
   * @param {ComponentTokenUsage} usage - Usage object to populate
   */
  analyzeShadowDOM(shadowRoot, usage) {
    // Get all stylesheets in shadow DOM
    const styleSheets = Array.from(shadowRoot.styleSheets || []);
    
    for (const sheet of styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          if (rule.style) {
            this.extractTokensFromStyles(rule.style, usage);
          }
        }
      } catch (error) {
        // Cross-origin stylesheets may throw
        console.debug('Could not access stylesheet:', error);
      }
    }

    // Also check inline styles
    const elements = shadowRoot.querySelectorAll('*');
    for (const el of elements) {
      if (el.style) {
        this.extractTokensFromStyles(el.style, usage);
      }
    }
  }

  /**
   * Perform static analysis on component source code
   * @param {string} filePath - Path to component file
   * @param {ComponentTokenUsage} usage - Usage object to populate
   * @returns {Promise<void>}
   */
  async staticAnalysis(filePath, usage) {
    try {
      const response = await fetch(filePath);
      const source = await response.text();
      
      // Find all var(--token-name) references
      const tokenMatches = source.matchAll(/var\(--([^)]+)\)/g);
      for (const match of tokenMatches) {
        const tokenName = `--${match[1]}`;
        this.categorizeToken(tokenName, usage);
      }

      // Find direct token references (e.g., getToken('color-primary'))
      const directMatches = source.matchAll(/getToken\(['"]([^'"]+)['"]\)/g);
      for (const match of directMatches) {
        const tokenName = `--${match[1]}`;
        this.categorizeToken(tokenName, usage);
      }
    } catch (error) {
      console.warn(`Static analysis failed for ${filePath}:`, error);
    }
  }

  /**
   * Categorize a token into the appropriate category
   * @param {string} tokenName - Token name (with -- prefix)
   * @param {ComponentTokenUsage} usage - Usage object to populate
   */
  categorizeToken(tokenName, usage) {
    // Remove duplicates
    if (tokenName.includes('color') || tokenName.includes('bg') || tokenName.includes('text')) {
      if (!usage.colorTokens.includes(tokenName)) {
        usage.colorTokens.push(tokenName);
      }
    } else if (tokenName.includes('spacing') || tokenName.includes('padding') || tokenName.includes('margin') || tokenName.includes('gap')) {
      if (!usage.spacingTokens.includes(tokenName)) {
        usage.spacingTokens.push(tokenName);
      }
    } else if (tokenName.includes('font') || tokenName.includes('text') || tokenName.includes('line-height')) {
      if (!usage.typographyTokens.includes(tokenName)) {
        usage.typographyTokens.push(tokenName);
      }
    } else if (tokenName.includes('shadow')) {
      if (!usage.shadowTokens.includes(tokenName)) {
        usage.shadowTokens.push(tokenName);
      }
    } else if (tokenName.includes('transition') || tokenName.includes('duration') || tokenName.includes('easing')) {
      if (!usage.transitionTokens.includes(tokenName)) {
        usage.transitionTokens.push(tokenName);
      }
    } else if (tokenName.includes('border') || tokenName.includes('radius')) {
      if (!usage.borderTokens.includes(tokenName)) {
        usage.borderTokens.push(tokenName);
      }
    }
  }

  /**
   * Build reverse index from tokens to components
   */
  buildTokenIndex() {
    this.tokenToComponents.clear();

    for (const [componentName, usage] of this.componentUsage) {
      const allTokens = [
        ...usage.colorTokens,
        ...usage.spacingTokens,
        ...usage.typographyTokens,
        ...usage.shadowTokens,
        ...usage.transitionTokens,
        ...usage.borderTokens
      ];

      for (const token of allTokens) {
        if (!this.tokenToComponents.has(token)) {
          this.tokenToComponents.set(token, new Set());
        }
        this.tokenToComponents.get(token).add(componentName);
      }
    }
  }

  /**
   * Get all components that use a specific token
   * @param {string} tokenName - Token name to query
   * @returns {string[]} Array of component names
   */
  getComponentsUsingToken(tokenName) {
    const components = this.tokenToComponents.get(tokenName);
    return components ? Array.from(components) : [];
  }

  /**
   * Get all tokens used by a specific component
   * @param {string} componentName - Component name to query
   * @returns {ComponentTokenUsage|null} Token usage data
   */
  getTokensUsedByComponent(componentName) {
    return this.componentUsage.get(componentName) || null;
  }

  /**
   * Get the complete matrix as a data structure
   * @returns {Object} Matrix data
   */
  getMatrix() {
    const matrix = {
      components: {},
      tokens: {},
      stats: {
        totalComponents: this.componentUsage.size,
        totalTokens: this.tokenToComponents.size,
        avgTokensPerComponent: 0
      }
    };

    // Component-centric view
    for (const [name, usage] of this.componentUsage) {
      matrix.components[name] = usage;
    }

    // Token-centric view
    for (const [token, components] of this.tokenToComponents) {
      matrix.tokens[token] = Array.from(components);
    }

    // Calculate stats
    let totalTokenCount = 0;
    for (const usage of this.componentUsage.values()) {
      totalTokenCount += 
        usage.colorTokens.length +
        usage.spacingTokens.length +
        usage.typographyTokens.length +
        usage.shadowTokens.length +
        usage.transitionTokens.length +
        usage.borderTokens.length;
    }
    matrix.stats.avgTokensPerComponent = 
      this.componentUsage.size > 0 ? (totalTokenCount / this.componentUsage.size).toFixed(2) : 0;

    return matrix;
  }

  /**
   * Export matrix to JSON
   * @returns {string} JSON string
   */
  exportJSON() {
    return JSON.stringify(this.getMatrix(), null, 2);
  }

  /**
   * Export matrix to CSV
   * @returns {string} CSV string
   */
  exportCSV() {
    const rows = [
      ['Component', 'Token Category', 'Token Name', 'File Path']
    ];

    for (const [componentName, usage] of this.componentUsage) {
      const addRows = (category, tokens) => {
        for (const token of tokens) {
          rows.push([componentName, category, token, usage.filePath]);
        }
      };

      addRows('Color', usage.colorTokens);
      addRows('Spacing', usage.spacingTokens);
      addRows('Typography', usage.typographyTokens);
      addRows('Shadow', usage.shadowTokens);
      addRows('Transition', usage.transitionTokens);
      addRows('Border', usage.borderTokens);
    }

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Export matrix to Markdown table
   * @returns {string} Markdown string
   */
  exportMarkdown() {
    let md = '# Token-Component Matrix\n\n';
    md += `Generated: ${new Date().toISOString()}\n\n`;
    
    const matrix = this.getMatrix();
    md += `## Statistics\n\n`;
    md += `- Total Components: ${matrix.stats.totalComponents}\n`;
    md += `- Total Unique Tokens: ${matrix.stats.totalTokens}\n`;
    md += `- Average Tokens per Component: ${matrix.stats.avgTokensPerComponent}\n\n`;

    md += '## Component Token Usage\n\n';
    
    for (const [componentName, usage] of this.componentUsage) {
      md += `### ${componentName}\n\n`;
      md += `**File:** \`${usage.filePath}\`\n\n`;
      
      if (usage.colorTokens.length > 0) {
        md += `**Colors:** ${usage.colorTokens.map(t => `\`${t}\``).join(', ')}\n\n`;
      }
      if (usage.spacingTokens.length > 0) {
        md += `**Spacing:** ${usage.spacingTokens.map(t => `\`${t}\``).join(', ')}\n\n`;
      }
      if (usage.typographyTokens.length > 0) {
        md += `**Typography:** ${usage.typographyTokens.map(t => `\`${t}\``).join(', ')}\n\n`;
      }
      if (usage.shadowTokens.length > 0) {
        md += `**Shadows:** ${usage.shadowTokens.map(t => `\`${t}\``).join(', ')}\n\n`;
      }
      if (usage.transitionTokens.length > 0) {
        md += `**Transitions:** ${usage.transitionTokens.map(t => `\`${t}\``).join(', ')}\n\n`;
      }
      if (usage.borderTokens.length > 0) {
        md += `**Borders:** ${usage.borderTokens.map(t => `\`${t}\``).join(', ')}\n\n`;
      }
    }

    md += '## Token Usage by Token\n\n';
    md += '| Token | Used By Components |\n';
    md += '|-------|-------------------|\n';
    
    for (const [token, components] of this.tokenToComponents) {
      md += `| \`${token}\` | ${Array.from(components).join(', ')} |\n`;
    }

    return md;
  }
}

// Export singleton instance
export const tokenComponentMatrix = new TokenComponentMatrix();