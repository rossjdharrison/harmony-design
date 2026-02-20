/**
 * @fileoverview AST Transformer for code modifications
 * Part of Harmony Design System - Codemod Runner
 * 
 * Provides transformation capabilities for modifying Abstract Syntax Trees
 * and generating modified source code.
 * 
 * @module tools/codemod-runner/ast-transformer
 * @see {@link ../../DESIGN_SYSTEM.md#codemod-runner}
 */

import { NodeType } from './ast-parser.js';

/**
 * Visitor pattern for AST traversal
 */
export class ASTVisitor {
  constructor() {
    this.visitors = {};
  }

  /**
   * Register visitor for node type
   * @param {string} nodeType - AST node type
   * @param {Function} callback - Visitor callback
   */
  visit(nodeType, callback) {
    this.visitors[nodeType] = callback;
  }

  /**
   * Traverse AST and apply visitors
   * @param {Object} node - AST node
   * @param {Object} [parent] - Parent node
   * @returns {Object} Transformed node
   */
  traverse(node, parent = null) {
    if (!node || typeof node !== 'object') {
      return node;
    }

    // Apply visitor if registered
    if (this.visitors[node.type]) {
      const result = this.visitors[node.type](node, parent);
      if (result !== undefined) {
        node = result;
      }
    }

    // Recursively traverse children
    for (const key in node) {
      if (key === 'type' || key === 'loc' || key === 'range') {
        continue;
      }

      if (Array.isArray(node[key])) {
        node[key] = node[key].map(child => this.traverse(child, node));
      } else if (typeof node[key] === 'object' && node[key] !== null) {
        node[key] = this.traverse(node[key], node);
      }
    }

    return node;
  }
}

/**
 * AST Transformer with common transformation patterns
 */
export class ASTTransformer {
  /**
   * @param {Object} ast - Abstract Syntax Tree
   */
  constructor(ast) {
    this.ast = ast;
    this.changes = [];
  }

  /**
   * Transform import paths
   * @param {Function} transformer - Function that takes old path and returns new path
   * @returns {ASTTransformer} For chaining
   */
  transformImportPaths(transformer) {
    const visitor = new ASTVisitor();
    
    visitor.visit(NodeType.IMPORT_DECLARATION, (node) => {
      if (node.source && node.source.value) {
        const oldPath = node.source.value;
        const newPath = transformer(oldPath);
        
        if (newPath !== oldPath) {
          this.changes.push({
            type: 'import-path',
            old: oldPath,
            new: newPath,
            node
          });
          
          node.source.value = newPath;
        }
      }
      return node;
    });

    this.ast = visitor.traverse(this.ast);
    return this;
  }

  /**
   * Replace npm imports with relative paths
   * @param {Object} mapping - Map of npm package to relative path
   * @returns {ASTTransformer} For chaining
   */
  replaceNpmImports(mapping) {
    return this.transformImportPaths((path) => {
      // Check if it's an npm import (not starting with . or /)
      if (!path.startsWith('.') && !path.startsWith('/')) {
        // Check if we have a mapping for this package
        for (const [npmPackage, relativePath] of Object.entries(mapping)) {
          if (path === npmPackage || path.startsWith(npmPackage + '/')) {
            // Replace package name with relative path
            return path.replace(npmPackage, relativePath);
          }
        }
      }
      return path;
    });
  }

  /**
   * Rename identifiers
   * @param {Object} mapping - Map of old name to new name
   * @returns {ASTTransformer} For chaining
   */
  renameIdentifiers(mapping) {
    const visitor = new ASTVisitor();
    
    visitor.visit(NodeType.IDENTIFIER, (node) => {
      if (mapping[node.name]) {
        this.changes.push({
          type: 'identifier',
          old: node.name,
          new: mapping[node.name],
          node
        });
        
        node.name = mapping[node.name];
      }
      return node;
    });

    this.ast = visitor.traverse(this.ast);
    return this;
  }

  /**
   * Add import statement
   * @param {Object} importSpec - Import specification
   * @param {string} importSpec.source - Import source path
   * @param {Array<string>} [importSpec.specifiers] - Named imports
   * @param {string} [importSpec.default] - Default import name
   * @returns {ASTTransformer} For chaining
   */
  addImport(importSpec) {
    const importNode = {
      type: NodeType.IMPORT_DECLARATION,
      specifiers: [],
      source: {
        type: NodeType.LITERAL,
        value: importSpec.source
      }
    };

    if (importSpec.default) {
      importNode.specifiers.push({
        type: 'ImportDefaultSpecifier',
        local: {
          type: NodeType.IDENTIFIER,
          name: importSpec.default
        }
      });
    }

    if (importSpec.specifiers) {
      importSpec.specifiers.forEach(name => {
        importNode.specifiers.push({
          type: 'ImportSpecifier',
          imported: { type: NodeType.IDENTIFIER, name },
          local: { type: NodeType.IDENTIFIER, name }
        });
      });
    }

    // Add to beginning of program body
    if (this.ast.type === NodeType.PROGRAM) {
      this.ast.body.unshift(importNode);
      this.changes.push({
        type: 'add-import',
        import: importSpec
      });
    }

    return this;
  }

  /**
   * Remove import statement
   * @param {string} source - Import source to remove
   * @returns {ASTTransformer} For chaining
   */
  removeImport(source) {
    if (this.ast.type === NodeType.PROGRAM) {
      const originalLength = this.ast.body.length;
      
      this.ast.body = this.ast.body.filter(node => {
        if (node.type === NodeType.IMPORT_DECLARATION && node.source.value === source) {
          this.changes.push({
            type: 'remove-import',
            source
          });
          return false;
        }
        return true;
      });

      if (this.ast.body.length < originalLength) {
        this.changes.push({
          type: 'remove-import',
          source,
          removed: originalLength - this.ast.body.length
        });
      }
    }

    return this;
  }

  /**
   * Apply custom visitor
   * @param {ASTVisitor} visitor - Custom visitor
   * @returns {ASTTransformer} For chaining
   */
  applyVisitor(visitor) {
    this.ast = visitor.traverse(this.ast);
    return this;
  }

  /**
   * Get transformed AST
   * @returns {Object}
   */
  getAST() {
    return this.ast;
  }

  /**
   * Get list of changes made
   * @returns {Array<Object>}
   */
  getChanges() {
    return this.changes;
  }
}

/**
 * Create transformer from AST
 * @param {Object} ast - Abstract Syntax Tree
 * @returns {ASTTransformer}
 */
export function createTransformer(ast) {
  return new ASTTransformer(ast);
}