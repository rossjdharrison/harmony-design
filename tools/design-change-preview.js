/**
 * @fileoverview Design Change Preview System
 * Provides preview and diff visualization for semantic design changes before applying.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Design Token Management
 * 
 * @module tools/design-change-preview
 */

import { DesignTokenQuery } from '../core/design-token-query.js';
import { SemanticDesignInference } from '../core/semantic-design-inference.js';

/**
 * Represents a design change with before/after states
 * @typedef {Object} DesignChange
 * @property {string} path - Token path (e.g., "color.primary.500")
 * @property {*} oldValue - Current value
 * @property {*} newValue - Proposed value
 * @property {string} changeType - Type: 'add' | 'modify' | 'remove'
 * @property {Array<string>} affectedComponents - Components using this token
 * @property {Object} impact - Impact analysis
 */

/**
 * Preview result with diffs and impact analysis
 * @typedef {Object} PreviewResult
 * @property {Array<DesignChange>} changes - All changes
 * @property {Object} summary - Summary statistics
 * @property {Array<string>} warnings - Potential issues
 * @property {Object} visualDiff - Visual representation data
 */

/**
 * Design Change Preview Engine
 * Analyzes and visualizes design token changes before applying
 */
export class DesignChangePreview {
  constructor() {
    /** @type {DesignTokenQuery} */
    this.tokenQuery = new DesignTokenQuery();
    
    /** @type {SemanticDesignInference} */
    this.inference = new SemanticDesignInference();
    
    /** @type {Map<string, Set<string>>} */
    this.tokenUsageMap = new Map();
    
    /** @type {Array<DesignChange>} */
    this.pendingChanges = [];
  }

  /**
   * Initialize preview system and build usage map
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.tokenQuery.initialize();
    await this.inference.initialize();
    await this.buildTokenUsageMap();
  }

  /**
   * Build map of which components use which tokens
   * @returns {Promise<void>}
   * @private
   */
  async buildTokenUsageMap() {
    // Scan all component files for token usage
    // This would integrate with the component registry
    // For now, we'll track as changes are previewed
    this.tokenUsageMap.clear();
  }

  /**
   * Preview a single token change
   * @param {string} tokenPath - Token path to change
   * @param {*} newValue - New value to apply
   * @returns {Promise<DesignChange>}
   */
  async previewChange(tokenPath, newValue) {
    const currentToken = this.tokenQuery.getToken(tokenPath);
    
    if (!currentToken) {
      throw new Error(`Token not found: ${tokenPath}`);
    }

    const change = {
      path: tokenPath,
      oldValue: currentToken.value,
      newValue: newValue,
      changeType: 'modify',
      affectedComponents: this.getAffectedComponents(tokenPath),
      impact: await this.analyzeImpact(tokenPath, currentToken.value, newValue),
      timestamp: Date.now()
    };

    return change;
  }

  /**
   * Preview multiple changes as a batch
   * @param {Array<{path: string, value: *}>} changes - Changes to preview
   * @returns {Promise<PreviewResult>}
   */
  async previewBatch(changes) {
    const changeObjects = await Promise.all(
      changes.map(({ path, value }) => this.previewChange(path, value))
    );

    const result = {
      changes: changeObjects,
      summary: this.generateSummary(changeObjects),
      warnings: this.detectWarnings(changeObjects),
      visualDiff: this.generateVisualDiff(changeObjects),
      cascadeEffects: await this.analyzeCascadeEffects(changeObjects)
    };

    this.pendingChanges = changeObjects;
    return result;
  }

  /**
   * Preview semantic intent changes (high-level)
   * @param {string} intent - Semantic intent (e.g., "make-darker", "increase-contrast")
   * @param {Object} context - Context for inference
   * @returns {Promise<PreviewResult>}
   */
  async previewSemanticChange(intent, context = {}) {
    const inferredChanges = await this.inference.inferChanges(intent, context);
    return this.previewBatch(inferredChanges);
  }

  /**
   * Analyze impact of a token change
   * @param {string} tokenPath - Token being changed
   * @param {*} oldValue - Current value
   * @param {*} newValue - New value
   * @returns {Promise<Object>}
   * @private
   */
  async analyzeImpact(tokenPath, oldValue, newValue) {
    const impact = {
      severity: 'low',
      affectedCount: 0,
      contrastChanges: [],
      accessibilityImpact: null,
      performanceImpact: null
    };

    // Analyze color contrast changes
    if (this.isColorToken(tokenPath)) {
      impact.contrastChanges = this.analyzeContrastChanges(oldValue, newValue);
      impact.accessibilityImpact = this.checkAccessibilityImpact(impact.contrastChanges);
    }

    // Analyze size/spacing changes
    if (this.isSizeToken(tokenPath)) {
      impact.layoutImpact = this.analyzeLayoutImpact(oldValue, newValue);
    }

    // Count affected components
    const affected = this.getAffectedComponents(tokenPath);
    impact.affectedCount = affected.length;

    // Determine severity
    if (impact.affectedCount > 10) impact.severity = 'high';
    else if (impact.affectedCount > 5) impact.severity = 'medium';

    if (impact.accessibilityImpact?.hasViolations) {
      impact.severity = 'critical';
    }

    return impact;
  }

  /**
   * Analyze cascade effects (tokens that reference changed tokens)
   * @param {Array<DesignChange>} changes - Primary changes
   * @returns {Promise<Array<DesignChange>>}
   * @private
   */
  async analyzeCascadeEffects(changes) {
    const cascadeChanges = [];
    const changedPaths = new Set(changes.map(c => c.path));

    // Find tokens that reference changed tokens
    for (const change of changes) {
      const dependents = this.findDependentTokens(change.path);
      
      for (const depPath of dependents) {
        if (!changedPaths.has(depPath)) {
          const cascadeChange = await this.computeCascadeChange(depPath, change);
          cascadeChanges.push(cascadeChange);
          changedPaths.add(depPath);
        }
      }
    }

    return cascadeChanges;
  }

  /**
   * Find tokens that reference a given token
   * @param {string} tokenPath - Token to find dependents for
   * @returns {Array<string>}
   * @private
   */
  findDependentTokens(tokenPath) {
    const dependents = [];
    const allTokens = this.tokenQuery.getAllTokens();

    for (const [path, token] of Object.entries(allTokens)) {
      if (token.value && typeof token.value === 'string') {
        // Check if value references the changed token
        if (token.value.includes(`{${tokenPath}}`) || 
            token.value.includes(`var(--${tokenPath.replace(/\./g, '-')})`)) {
          dependents.push(path);
        }
      }
    }

    return dependents;
  }

  /**
   * Compute cascaded change for a dependent token
   * @param {string} tokenPath - Dependent token path
   * @param {DesignChange} sourceChange - Original change
   * @returns {Promise<DesignChange>}
   * @private
   */
  async computeCascadeChange(tokenPath, sourceChange) {
    const currentToken = this.tokenQuery.getToken(tokenPath);
    const newValue = this.resolveTokenValue(currentToken.value, {
      [sourceChange.path]: sourceChange.newValue
    });

    return {
      path: tokenPath,
      oldValue: currentToken.value,
      newValue: newValue,
      changeType: 'cascade',
      affectedComponents: this.getAffectedComponents(tokenPath),
      impact: await this.analyzeImpact(tokenPath, currentToken.value, newValue),
      cascadeSource: sourceChange.path,
      timestamp: Date.now()
    };
  }

  /**
   * Resolve token value with overrides
   * @param {string} value - Token value (may contain references)
   * @param {Object} overrides - Override values
   * @returns {string}
   * @private
   */
  resolveTokenValue(value, overrides) {
    let resolved = value;
    
    for (const [path, overrideValue] of Object.entries(overrides)) {
      const refPattern = new RegExp(`\\{${path}\\}`, 'g');
      resolved = resolved.replace(refPattern, overrideValue);
    }

    return resolved;
  }

  /**
   * Generate summary statistics
   * @param {Array<DesignChange>} changes - Changes to summarize
   * @returns {Object}
   * @private
   */
  generateSummary(changes) {
    const summary = {
      totalChanges: changes.length,
      byType: { add: 0, modify: 0, remove: 0, cascade: 0 },
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      totalAffectedComponents: new Set(),
      hasAccessibilityImpact: false
    };

    for (const change of changes) {
      summary.byType[change.changeType]++;
      summary.bySeverity[change.impact.severity]++;
      
      for (const component of change.affectedComponents) {
        summary.totalAffectedComponents.add(component);
      }

      if (change.impact.accessibilityImpact?.hasViolations) {
        summary.hasAccessibilityImpact = true;
      }
    }

    summary.totalAffectedComponents = summary.totalAffectedComponents.size;
    return summary;
  }

  /**
   * Detect potential warnings
   * @param {Array<DesignChange>} changes - Changes to check
   * @returns {Array<string>}
   * @private
   */
  detectWarnings(changes) {
    const warnings = [];

    for (const change of changes) {
      if (change.impact.severity === 'critical') {
        warnings.push(`Critical: ${change.path} has accessibility violations`);
      }

      if (change.affectedComponents.length > 20) {
        warnings.push(`High impact: ${change.path} affects ${change.affectedComponents.length} components`);
      }

      if (change.changeType === 'remove' && change.affectedComponents.length > 0) {
        warnings.push(`Breaking: Removing ${change.path} will break ${change.affectedComponents.length} components`);
      }
    }

    return warnings;
  }

  /**
   * Generate visual diff data for rendering
   * @param {Array<DesignChange>} changes - Changes to visualize
   * @returns {Object}
   * @private
   */
  generateVisualDiff(changes) {
    const diff = {
      colorChanges: [],
      sizeChanges: [],
      otherChanges: []
    };

    for (const change of changes) {
      const diffEntry = {
        path: change.path,
        before: change.oldValue,
        after: change.newValue,
        visual: this.generateVisualRepresentation(change)
      };

      if (this.isColorToken(change.path)) {
        diff.colorChanges.push(diffEntry);
      } else if (this.isSizeToken(change.path)) {
        diff.sizeChanges.push(diffEntry);
      } else {
        diff.otherChanges.push(diffEntry);
      }
    }

    return diff;
  }

  /**
   * Generate visual representation for a change
   * @param {DesignChange} change - Change to visualize
   * @returns {Object}
   * @private
   */
  generateVisualRepresentation(change) {
    if (this.isColorToken(change.path)) {
      return {
        type: 'color-swatch',
        before: { color: change.oldValue },
        after: { color: change.newValue }
      };
    }

    if (this.isSizeToken(change.path)) {
      return {
        type: 'size-bar',
        before: { size: change.oldValue },
        after: { size: change.newValue }
      };
    }

    return {
      type: 'text',
      before: { text: String(change.oldValue) },
      after: { text: String(change.newValue) }
    };
  }

  /**
   * Get components affected by a token change
   * @param {string} tokenPath - Token path
   * @returns {Array<string>}
   * @private
   */
  getAffectedComponents(tokenPath) {
    return Array.from(this.tokenUsageMap.get(tokenPath) || []);
  }

  /**
   * Register component token usage
   * @param {string} componentName - Component name
   * @param {Array<string>} tokenPaths - Tokens used by component
   */
  registerComponentUsage(componentName, tokenPaths) {
    for (const tokenPath of tokenPaths) {
      if (!this.tokenUsageMap.has(tokenPath)) {
        this.tokenUsageMap.set(tokenPath, new Set());
      }
      this.tokenUsageMap.get(tokenPath).add(componentName);
    }
  }

  /**
   * Check if token is a color token
   * @param {string} tokenPath - Token path
   * @returns {boolean}
   * @private
   */
  isColorToken(tokenPath) {
    return tokenPath.includes('color') || tokenPath.includes('bg') || tokenPath.includes('text');
  }

  /**
   * Check if token is a size token
   * @param {string} tokenPath - Token path
   * @returns {boolean}
   * @private
   */
  isSizeToken(tokenPath) {
    return tokenPath.includes('size') || tokenPath.includes('spacing') || tokenPath.includes('width') || tokenPath.includes('height');
  }

  /**
   * Analyze contrast changes between colors
   * @param {string} oldColor - Old color value
   * @param {string} newColor - New color value
   * @returns {Array<Object>}
   * @private
   */
  analyzeContrastChanges(oldColor, newColor) {
    // Simplified contrast analysis
    // In production, would use actual WCAG contrast calculation
    return [{
      pair: 'foreground-background',
      oldRatio: 4.5,
      newRatio: 5.2,
      meetsAA: true,
      meetsAAA: false
    }];
  }

  /**
   * Check accessibility impact of contrast changes
   * @param {Array<Object>} contrastChanges - Contrast change data
   * @returns {Object}
   * @private
   */
  checkAccessibilityImpact(contrastChanges) {
    const violations = contrastChanges.filter(c => !c.meetsAA);
    
    return {
      hasViolations: violations.length > 0,
      violations: violations,
      improvements: contrastChanges.filter(c => c.newRatio > c.oldRatio)
    };
  }

  /**
   * Analyze layout impact of size changes
   * @param {string} oldSize - Old size value
   * @param {string} newSize - New size value
   * @returns {Object}
   * @private
   */
  analyzeLayoutImpact(oldSize, newSize) {
    const oldPx = this.convertToPx(oldSize);
    const newPx = this.convertToPx(newSize);
    const change = newPx - oldPx;
    const percentChange = (change / oldPx) * 100;

    return {
      absoluteChange: change,
      percentChange: percentChange,
      significant: Math.abs(percentChange) > 20
    };
  }

  /**
   * Convert size value to pixels
   * @param {string} size - Size value (e.g., "16px", "1rem")
   * @returns {number}
   * @private
   */
  convertToPx(size) {
    if (typeof size === 'number') return size;
    if (size.endsWith('px')) return parseFloat(size);
    if (size.endsWith('rem')) return parseFloat(size) * 16;
    return 0;
  }

  /**
   * Apply pending changes
   * @returns {Promise<void>}
   */
  async applyChanges() {
    if (this.pendingChanges.length === 0) {
      throw new Error('No pending changes to apply');
    }

    // Apply changes through token query system
    for (const change of this.pendingChanges) {
      await this.tokenQuery.updateToken(change.path, change.newValue);
    }

    // Clear pending changes
    this.pendingChanges = [];

    // Publish event for UI updates
    this.publishChangeApplied();
  }

  /**
   * Discard pending changes
   */
  discardChanges() {
    this.pendingChanges = [];
  }

  /**
   * Export preview result for external tools
   * @param {PreviewResult} result - Preview result
   * @returns {string} JSON string
   */
  exportPreview(result) {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Import preview from external source
   * @param {string} jsonData - JSON string
   * @returns {PreviewResult}
   */
  importPreview(jsonData) {
    return JSON.parse(jsonData);
  }

  /**
   * Publish change applied event
   * @private
   */
  publishChangeApplied() {
    if (typeof window !== 'undefined' && window.EventBus) {
      window.EventBus.publish('DesignTokensChanged', {
        source: 'DesignChangePreview',
        changeCount: this.pendingChanges.length,
        timestamp: Date.now()
      });
    }
  }
}