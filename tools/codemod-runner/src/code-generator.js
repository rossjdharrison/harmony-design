/**
 * @fileoverview Code Generator - AST to source code
 * Part of Harmony Design System - Codemod Runner
 * 
 * Generates source code from Abstract Syntax Trees after transformation.
 * 
 * @module tools/codemod-runner/code-generator
 * @see {@link ../../DESIGN_SYSTEM.md#codemod-runner}
 */

import { NodeType } from './ast-parser.js';

/**
 * Code generator that converts AST back to source code
 */
export class CodeGenerator {
  /**
   * @param {Object} options - Generator options
   * @param {number} [options.indent=2] - Indentation size
   * @param {boolean} [options.semicolons=true] - Add semicolons
   * @param {string} [options.quotes='single'] - Quote style ('single' or 'double')
   */
  constructor(options = {}) {
    this.indent = options.indent || 2;
    this.semicolons = options.semicolons !== false;
    this.quotes = options.quotes || 'single';
    this.indentLevel = 0;
  }

  /**
   * Get quote character
   * @returns {string}
   */
  getQuote() {
    return this.quotes === 'single' ? "'" : '"';
  }

  /**
   * Get current indentation
   * @returns {string}
   */
  getIndent() {
    return ' '.repeat(this.indentLevel * this.indent);
  }

  /**
   * Increase indentation
   */
  increaseIndent() {
    this.indentLevel++;
  }

  /**
   * Decrease indentation
   */
  decreaseIndent() {
    this.indentLevel--;
  }

  /**
   * Generate import declaration
   * @param {Object} node - Import declaration node
   * @returns {string}
   */
  generateImportDeclaration(node) {
    let code = 'import ';

    if (node.specifiers && node.specifiers.length > 0) {
      const defaultImport = node.specifiers.find(s => s.type === 'ImportDefaultSpecifier');
      const namedImports = node.specifiers.filter(s => s.type === 'ImportSpecifier');

      if (defaultImport) {
        code += defaultImport.local.name;
        if (namedImports.length > 0) {
          code += ', ';
        }
      }

      if (namedImports.length > 0) {
        code += '{ ';
        code += namedImports.map(spec => {
          if (spec.imported.name === spec.local.name) {
            return spec.local.name;
          }
          return `${spec.imported.name} as ${spec.local.name}`;
        }).join(', ');
        code += ' }';
      }

      code += ' from ';
    }

    const quote = this.getQuote();
    code += `${quote}${node.source.value}${quote}`;

    if (this.semicolons) {
      code += ';';
    }

    return code;
  }

  /**
   * Generate export declaration
   * @param {Object} node - Export declaration node
   * @returns {string}
   */
  generateExportDeclaration(node) {
    let code = 'export ';

    if (node.default) {
      code += 'default ';
      if (node.declaration) {
        code += node.declaration.value || '';
      }
    } else if (node.specifiers && node.specifiers.length > 0) {
      code += '{ ';
      code += node.specifiers.map(spec => spec.exported.name).join(', ');
      code += ' }';
    }

    if (this.semicolons) {
      code += ';';
    }

    return code;
  }

  /**
   * Generate identifier
   * @param {Object} node - Identifier node
   * @returns {string}
   */
  generateIdentifier(node) {
    return node.name;
  }

  /**
   * Generate literal
   * @param {Object} node - Literal node
   * @returns {string}
   */
  generateLiteral(node) {
    if (typeof node.value === 'string') {
      const quote = this.getQuote();
      return `${quote}${node.value}${quote}`;
    }
    return String(node.value);
  }

  /**
   * Generate code from AST node
   * @param {Object} node - AST node
   * @returns {string}
   */
  generate(node) {
    if (!node) {
      return '';
    }

    switch (node.type) {
      case NodeType.PROGRAM:
        return node.body.map(stmt => this.generate(stmt)).join('\n');

      case NodeType.IMPORT_DECLARATION:
        return this.generateImportDeclaration(node);

      case NodeType.EXPORT_DECLARATION:
        return this.generateExportDeclaration(node);

      case NodeType.IDENTIFIER:
        return this.generateIdentifier(node);

      case NodeType.LITERAL:
        return this.generateLiteral(node);

      default:
        // For unsupported nodes, return empty string
        return '';
    }
  }
}

/**
 * Generate source code from AST
 * @param {Object} ast - Abstract Syntax Tree
 * @param {Object} [options] - Generator options
 * @returns {string} Generated source code
 */
export function generate(ast, options) {
  const generator = new CodeGenerator(options);
  return generator.generate(ast);
}