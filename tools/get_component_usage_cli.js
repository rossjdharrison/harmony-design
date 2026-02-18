/**
 * @fileoverview CLI wrapper for get_component_usage tool
 * Allows command-line usage analysis of components
 * See: harmony-design/DESIGN_SYSTEM.md#component-usage-cli
 */

import { GetComponentUsageTool } from './get_component_usage.js';

/**
 * CLI interface for component usage tool
 * @class GetComponentUsageCLI
 */
class GetComponentUsageCLI {
  constructor() {
    this.tool = new GetComponentUsageTool();
  }

  /**
   * Parses command line arguments
   * @returns {CLIOptions}
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const options = {
      componentId: null,
      format: 'text',
      depth: 3,
      outputFile: null,
      tree: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--format':
        case '-f':
          options.format = args[++i];
          break;
        
        case '--depth':
        case '-d':
          options.depth = parseInt(args[++i], 10);
          break;
        
        case '--output':
        case '-o':
          options.outputFile = args[++i];
          break;
        
        case '--tree':
        case '-t':
          options.tree = true;
          break;
        
        case '--help':
        case '-h':
          this.printHelp();
          process.exit(0);
          break;
        
        default:
          if (!options.componentId) {
            options.componentId = arg;
          }
      }
    }

    return options;
  }

  /**
   * Prints help information
   */
  printHelp() {
    console.log(`
Component Usage Tool - Find where components are used

Usage:
  node get_component_usage_cli.js <component-id> [options]

Options:
  -f, --format <type>     Output format: text, json, markdown (default: text)
  -d, --depth <number>    Maximum depth for tree traversal (default: 3)
  -o, --output <file>     Write output to file instead of stdout
  -t, --tree              Show usage tree instead of flat list
  -h, --help              Show this help message

Examples:
  node get_component_usage_cli.js Button
  node get_component_usage_cli.js Button --format json
  node get_component_usage_cli.js Button --tree --depth 5
  node get_component_usage_cli.js Button --format markdown -o report.md
    `);
  }

  /**
   * Formats output based on format type
   * @param {ComponentUsageResult|UsageTree} data - Usage data
   * @param {string} format - Output format
   * @returns {string}
   */
  formatOutput(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'markdown':
        if (data.usage) {
          // It's a tree, generate report for root
          return this.tool.generateReport(data.componentId);
        }
        return this.tool.generateReport(data.componentId);
      
      case 'text':
      default:
        return this.formatText(data);
    }
  }

  /**
   * Formats output as plain text
   * @param {ComponentUsageResult|UsageTree} data - Usage data
   * @returns {string}
   */
  formatText(data) {
    if (data.usage) {
      // It's a usage tree
      return this.formatTree(data);
    }

    let output = `Component Usage: ${data.componentId}\n`;
    output += `Total Usages: ${data.usageCount}\n`;
    output += `Analysis Time: ${data.executionTime.toFixed(2)}ms\n\n`;

    if (data.usedIn.components.length > 0) {
      output += `Used in Components (${data.usedIn.components.length}):\n`;
      for (const comp of data.usedIn.components) {
        output += `  - ${comp.name} (${comp.id}) [${comp.relationship}]\n`;
      }
      output += '\n';
    }

    if (data.usedIn.implementations.length > 0) {
      output += `Implementation References (${data.usedIn.implementations.length}):\n`;
      for (const impl of data.usedIn.implementations) {
        output += `  - ${impl.filePath}`;
        if (impl.lineNumber) {
          output += `:${impl.lineNumber}`;
        }
        output += '\n';
      }
      output += '\n';
    }

    if (data.usedIn.templates.length > 0) {
      output += `Used in Templates (${data.usedIn.templates.length}):\n`;
      for (const template of data.usedIn.templates) {
        output += `  - ${template.name} (${template.id})\n`;
      }
      output += '\n';
    }

    if (data.usageCount === 0) {
      output += 'No usages found.\n';
    }

    return output;
  }

  /**
   * Formats usage tree as text
   * @param {UsageTree} tree - Usage tree
   * @param {string} indent - Current indentation
   * @returns {string}
   */
  formatTree(tree, indent = '') {
    let output = `${indent}${tree.componentId} (${tree.usage.usageCount} usages)\n`;
    
    for (const child of tree.children) {
      output += this.formatTree(child, indent + '  ');
    }
    
    return output;
  }

  /**
   * Runs the CLI tool
   */
  async run() {
    try {
      const options = this.parseArgs();

      if (!options.componentId) {
        console.error('Error: Component ID is required');
        this.printHelp();
        process.exit(1);
      }

      let result;
      if (options.tree) {
        result = await this.tool.findUsageTree(options.componentId, options.depth);
      } else {
        result = await this.tool.findUsage(options.componentId);
      }

      const output = await this.formatOutput(result, options.format);

      if (options.outputFile) {
        const fs = await import('fs');
        fs.writeFileSync(options.outputFile, output, 'utf8');
        console.log(`Output written to ${options.outputFile}`);
      } else {
        console.log(output);
      }

      process.exit(0);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

/**
 * @typedef {Object} CLIOptions
 * @property {string} componentId - Component to analyze
 * @property {string} format - Output format (text, json, markdown)
 * @property {number} depth - Maximum tree depth
 * @property {string} outputFile - Output file path
 * @property {boolean} tree - Show usage tree
 */

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new GetComponentUsageCLI();
  cli.run();
}

export { GetComponentUsageCLI };