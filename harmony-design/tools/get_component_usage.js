/**
 * @fileoverview Tool to find where a component is used across the design system
 * Queries the component graph to trace usage relationships
 * See: harmony-design/DESIGN_SYSTEM.md#component-usage-analysis
 */

import { TypeNavigator } from '../core/type-navigator.js';
import { EventBus } from '../core/event-bus.js';

/**
 * Finds all places where a component is used
 * @class GetComponentUsageTool
 */
export class GetComponentUsageTool {
  constructor() {
    this.typeNavigator = new TypeNavigator();
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Finds usage of a component by querying the graph
   * @param {string} componentId - The component identifier to search for
   * @returns {Promise<ComponentUsageResult>}
   */
  async findUsage(componentId) {
    if (!componentId || typeof componentId !== 'string') {
      throw new Error('Component ID must be a non-empty string');
    }

    const startTime = performance.now();
    
    try {
      // Query the graph for relationships where this component is used
      const usages = await this.typeNavigator.query({
        type: 'find_component_usage',
        componentId: componentId
      });

      const result = {
        componentId,
        usageCount: usages.length,
        usedIn: this._categorizeUsages(usages),
        executionTime: performance.now() - startTime
      };

      // Publish result event
      this.eventBus.publish({
        type: 'ComponentUsageFound',
        payload: result,
        source: 'GetComponentUsageTool'
      });

      return result;
    } catch (error) {
      console.error('[GetComponentUsageTool] Error finding usage:', {
        componentId,
        error: error.message
      });
      
      this.eventBus.publish({
        type: 'ComponentUsageError',
        payload: {
          componentId,
          error: error.message
        },
        source: 'GetComponentUsageTool'
      });
      
      throw error;
    }
  }

  /**
   * Categorizes usages by type (component, template, implementation)
   * @private
   * @param {Array} usages - Raw usage data from graph
   * @returns {CategorizedUsages}
   */
  _categorizeUsages(usages) {
    const categorized = {
      components: [],
      templates: [],
      implementations: [],
      designTokens: []
    };

    for (const usage of usages) {
      switch (usage.nodeType) {
        case 'ComponentNode':
          categorized.components.push({
            id: usage.id,
            name: usage.name,
            path: usage.path,
            relationship: usage.relationship
          });
          break;
        
        case 'ImplementationNode':
          categorized.implementations.push({
            id: usage.id,
            filePath: usage.filePath,
            language: usage.language,
            lineNumber: usage.lineNumber
          });
          break;
        
        case 'DesignTokenNode':
          categorized.designTokens.push({
            id: usage.id,
            tokenName: usage.name,
            tokenType: usage.tokenType
          });
          break;
        
        default:
          // Template or other node types
          if (usage.nodeType.includes('Template')) {
            categorized.templates.push({
              id: usage.id,
              name: usage.name,
              path: usage.path
            });
          }
      }
    }

    return categorized;
  }

  /**
   * Finds usage with depth (recursive usage tree)
   * @param {string} componentId - The component identifier
   * @param {number} maxDepth - Maximum depth to traverse (default: 3)
   * @returns {Promise<UsageTree>}
   */
  async findUsageTree(componentId, maxDepth = 3) {
    const visited = new Set();
    
    const traverse = async (id, depth) => {
      if (depth > maxDepth || visited.has(id)) {
        return null;
      }
      
      visited.add(id);
      
      const usage = await this.findUsage(id);
      const children = [];
      
      // Recursively find usages of components that use this one
      for (const component of usage.usedIn.components) {
        const childTree = await traverse(component.id, depth + 1);
        if (childTree) {
          children.push(childTree);
        }
      }
      
      return {
        componentId: id,
        depth,
        usage,
        children
      };
    };
    
    return traverse(componentId, 0);
  }

  /**
   * Generates a usage report in markdown format
   * @param {string} componentId - The component identifier
   * @returns {Promise<string>} Markdown formatted report
   */
  async generateReport(componentId) {
    const usage = await this.findUsage(componentId);
    
    let report = `# Component Usage Report\n\n`;
    report += `**Component:** \`${componentId}\`\n`;
    report += `**Total Usages:** ${usage.usageCount}\n`;
    report += `**Analysis Time:** ${usage.executionTime.toFixed(2)}ms\n\n`;
    
    if (usage.usedIn.components.length > 0) {
      report += `## Used in Components (${usage.usedIn.components.length})\n\n`;
      for (const comp of usage.usedIn.components) {
        report += `- **${comp.name}** (\`${comp.id}\`)\n`;
        report += `  - Path: ${comp.path}\n`;
        report += `  - Relationship: ${comp.relationship}\n\n`;
      }
    }
    
    if (usage.usedIn.implementations.length > 0) {
      report += `## Implementation References (${usage.usedIn.implementations.length})\n\n`;
      for (const impl of usage.usedIn.implementations) {
        report += `- **${impl.filePath}**\n`;
        report += `  - Language: ${impl.language}\n`;
        if (impl.lineNumber) {
          report += `  - Line: ${impl.lineNumber}\n`;
        }
        report += `\n`;
      }
    }
    
    if (usage.usedIn.templates.length > 0) {
      report += `## Used in Templates (${usage.usedIn.templates.length})\n\n`;
      for (const template of usage.usedIn.templates) {
        report += `- **${template.name}** (\`${template.id}\`)\n`;
        report += `  - Path: ${template.path}\n\n`;
      }
    }
    
    if (usage.usedIn.designTokens.length > 0) {
      report += `## Related Design Tokens (${usage.usedIn.designTokens.length})\n\n`;
      for (const token of usage.usedIn.designTokens) {
        report += `- **${token.tokenName}** (${token.tokenType})\n`;
      }
    }
    
    if (usage.usageCount === 0) {
      report += `## No Usages Found\n\n`;
      report += `This component is not currently used anywhere in the design system.\n`;
      report += `It may be a candidate for removal or is newly created.\n`;
    }
    
    return report;
  }
}

/**
 * @typedef {Object} ComponentUsageResult
 * @property {string} componentId - The component identifier
 * @property {number} usageCount - Total number of usages found
 * @property {CategorizedUsages} usedIn - Usages categorized by type
 * @property {number} executionTime - Query execution time in ms
 */

/**
 * @typedef {Object} CategorizedUsages
 * @property {Array<ComponentUsage>} components - Components using this component
 * @property {Array<TemplateUsage>} templates - Templates using this component
 * @property {Array<ImplementationUsage>} implementations - Implementation files
 * @property {Array<TokenUsage>} designTokens - Related design tokens
 */

/**
 * @typedef {Object} ComponentUsage
 * @property {string} id - Component identifier
 * @property {string} name - Component name
 * @property {string} path - Component path
 * @property {string} relationship - Type of relationship (contains, references, etc.)
 */

/**
 * @typedef {Object} ImplementationUsage
 * @property {string} id - Implementation node identifier
 * @property {string} filePath - Path to implementation file
 * @property {string} language - Programming language
 * @property {number} [lineNumber] - Line number where used
 */

/**
 * @typedef {Object} TemplateUsage
 * @property {string} id - Template identifier
 * @property {string} name - Template name
 * @property {string} path - Template path
 */

/**
 * @typedef {Object} TokenUsage
 * @property {string} id - Token identifier
 * @property {string} tokenName - Token name
 * @property {string} tokenType - Token type (color, spacing, etc.)
 */

/**
 * @typedef {Object} UsageTree
 * @property {string} componentId - Component identifier
 * @property {number} depth - Depth in the tree
 * @property {ComponentUsageResult} usage - Usage information
 * @property {Array<UsageTree>} children - Child nodes in usage tree
 */