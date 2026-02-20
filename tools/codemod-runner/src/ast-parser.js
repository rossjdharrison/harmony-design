/**
 * @fileoverview AST Parser for JavaScript/TypeScript code transformation
 * Part of Harmony Design System - Codemod Runner
 * 
 * Provides parsing capabilities for source code into Abstract Syntax Trees
 * without relying on external npm dependencies at runtime.
 * 
 * @module tools/codemod-runner/ast-parser
 */

/**
 * Token types for lexical analysis
 * @enum {string}
 */
export const TokenType = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  OPERATOR: 'OPERATOR',
  PUNCTUATION: 'PUNCTUATION',
  COMMENT: 'COMMENT',
  WHITESPACE: 'WHITESPACE',
  EOF: 'EOF'
};

/**
 * AST Node types
 * @enum {string}
 */
export const NodeType = {
  PROGRAM: 'Program',
  IMPORT_DECLARATION: 'ImportDeclaration',
  EXPORT_DECLARATION: 'ExportDeclaration',
  FUNCTION_DECLARATION: 'FunctionDeclaration',
  CLASS_DECLARATION: 'ClassDeclaration',
  VARIABLE_DECLARATION: 'VariableDeclaration',
  IDENTIFIER: 'Identifier',
  LITERAL: 'Literal',
  CALL_EXPRESSION: 'CallExpression',
  MEMBER_EXPRESSION: 'MemberExpression',
  ARROW_FUNCTION: 'ArrowFunctionExpression',
  BLOCK_STATEMENT: 'BlockStatement',
  EXPRESSION_STATEMENT: 'ExpressionStatement'
};

/**
 * Simple lexer for JavaScript tokenization
 */
export class Lexer {
  /**
   * @param {string} source - Source code to tokenize
   */
  constructor(source) {
    this.source = source;
    this.position = 0;
    this.line = 1;
    this.column = 1;
  }

  /**
   * Get current character
   * @returns {string|null}
   */
  current() {
    return this.position < this.source.length ? this.source[this.position] : null;
  }

  /**
   * Advance to next character
   */
  advance() {
    if (this.current() === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.position++;
  }

  /**
   * Peek at next character without advancing
   * @returns {string|null}
   */
  peek() {
    return this.position + 1 < this.source.length ? this.source[this.position + 1] : null;
  }

  /**
   * Skip whitespace
   */
  skipWhitespace() {
    while (this.current() && /\s/.test(this.current())) {
      this.advance();
    }
  }

  /**
   * Read identifier or keyword
   * @returns {Object}
   */
  readIdentifier() {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    while (this.current() && /[a-zA-Z0-9_$]/.test(this.current())) {
      this.advance();
    }

    const value = this.source.substring(start, this.position);
    const keywords = ['import', 'export', 'from', 'function', 'class', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'default'];
    
    return {
      type: keywords.includes(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER,
      value,
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Read string literal
   * @param {string} quote - Quote character (' or ")
   * @returns {Object}
   */
  readString(quote) {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    this.advance(); // Skip opening quote
    
    while (this.current() && this.current() !== quote) {
      if (this.current() === '\\') {
        this.advance(); // Skip escape character
      }
      this.advance();
    }
    
    this.advance(); // Skip closing quote
    
    return {
      type: TokenType.STRING,
      value: this.source.substring(start, this.position),
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Read number literal
   * @returns {Object}
   */
  readNumber() {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    while (this.current() && /[0-9.]/.test(this.current())) {
      this.advance();
    }

    return {
      type: TokenType.NUMBER,
      value: this.source.substring(start, this.position),
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Read comment
   * @returns {Object}
   */
  readComment() {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    if (this.current() === '/' && this.peek() === '/') {
      // Single-line comment
      while (this.current() && this.current() !== '\n') {
        this.advance();
      }
    } else if (this.current() === '/' && this.peek() === '*') {
      // Multi-line comment
      this.advance(); // Skip /
      this.advance(); // Skip *
      
      while (this.current() && !(this.current() === '*' && this.peek() === '/')) {
        this.advance();
      }
      
      this.advance(); // Skip *
      this.advance(); // Skip /
    }

    return {
      type: TokenType.COMMENT,
      value: this.source.substring(start, this.position),
      line: startLine,
      column: startColumn
    };
  }

  /**
   * Get next token
   * @returns {Object}
   */
  nextToken() {
    this.skipWhitespace();

    if (!this.current()) {
      return { type: TokenType.EOF, value: '', line: this.line, column: this.column };
    }

    const char = this.current();

    // Comments
    if (char === '/' && (this.peek() === '/' || this.peek() === '*')) {
      return this.readComment();
    }

    // Strings
    if (char === '"' || char === "'" || char === '`') {
      return this.readString(char);
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      return this.readNumber();
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(char)) {
      return this.readIdentifier();
    }

    // Operators and punctuation
    const line = this.line;
    const column = this.column;
    const value = char;
    this.advance();

    const operators = ['+', '-', '*', '/', '=', '!', '<', '>', '&', '|', '?', ':'];
    const punctuation = ['{', '}', '[', ']', '(', ')', ';', ',', '.'];

    if (operators.includes(value)) {
      return { type: TokenType.OPERATOR, value, line, column };
    }

    if (punctuation.includes(value)) {
      return { type: TokenType.PUNCTUATION, value, line, column };
    }

    return { type: TokenType.PUNCTUATION, value, line, column };
  }

  /**
   * Tokenize entire source
   * @returns {Array<Object>}
   */
  tokenize() {
    const tokens = [];
    let token;

    do {
      token = this.nextToken();
      if (token.type !== TokenType.WHITESPACE) {
        tokens.push(token);
      }
    } while (token.type !== TokenType.EOF);

    return tokens;
  }
}

/**
 * Simple AST parser for JavaScript
 */
export class ASTParser {
  /**
   * @param {string} source - Source code to parse
   */
  constructor(source) {
    this.lexer = new Lexer(source);
    this.tokens = this.lexer.tokenize();
    this.position = 0;
  }

  /**
   * Get current token
   * @returns {Object|null}
   */
  current() {
    return this.position < this.tokens.length ? this.tokens[this.position] : null;
  }

  /**
   * Advance to next token
   */
  advance() {
    this.position++;
  }

  /**
   * Peek at next token
   * @returns {Object|null}
   */
  peek() {
    return this.position + 1 < this.tokens.length ? this.tokens[this.position + 1] : null;
  }

  /**
   * Expect specific token type and value
   * @param {string} type - Token type
   * @param {string} [value] - Optional token value
   * @returns {Object}
   * @throws {Error} If token doesn't match
   */
  expect(type, value) {
    const token = this.current();
    if (!token || token.type !== type || (value && token.value !== value)) {
      throw new Error(`Expected ${type}${value ? ` "${value}"` : ''} but got ${token ? token.value : 'EOF'}`);
    }
    this.advance();
    return token;
  }

  /**
   * Parse import declaration
   * @returns {Object}
   */
  parseImportDeclaration() {
    const node = {
      type: NodeType.IMPORT_DECLARATION,
      specifiers: [],
      source: null
    };

    this.expect(TokenType.KEYWORD, 'import');

    // Parse import specifiers
    if (this.current()?.type === TokenType.IDENTIFIER) {
      node.specifiers.push({
        type: 'ImportDefaultSpecifier',
        local: { type: NodeType.IDENTIFIER, name: this.current().value }
      });
      this.advance();
    } else if (this.current()?.value === '{') {
      this.advance(); // Skip {
      
      while (this.current()?.value !== '}') {
        const imported = this.expect(TokenType.IDENTIFIER);
        let local = imported;
        
        if (this.current()?.type === TokenType.KEYWORD && this.current()?.value === 'as') {
          this.advance();
          local = this.expect(TokenType.IDENTIFIER);
        }
        
        node.specifiers.push({
          type: 'ImportSpecifier',
          imported: { type: NodeType.IDENTIFIER, name: imported.value },
          local: { type: NodeType.IDENTIFIER, name: local.value }
        });
        
        if (this.current()?.value === ',') {
          this.advance();
        }
      }
      
      this.expect(TokenType.PUNCTUATION, '}');
    }

    this.expect(TokenType.KEYWORD, 'from');
    
    const source = this.expect(TokenType.STRING);
    node.source = {
      type: NodeType.LITERAL,
      value: source.value.slice(1, -1) // Remove quotes
    };

    if (this.current()?.value === ';') {
      this.advance();
    }

    return node;
  }

  /**
   * Parse export declaration
   * @returns {Object}
   */
  parseExportDeclaration() {
    const node = {
      type: NodeType.EXPORT_DECLARATION,
      declaration: null,
      specifiers: []
    };

    this.expect(TokenType.KEYWORD, 'export');

    if (this.current()?.type === TokenType.KEYWORD && this.current()?.value === 'default') {
      this.advance();
      node.default = true;
      // Parse what's being exported (simplified)
      node.declaration = { type: 'ExportDefault', value: this.current()?.value };
      this.advance();
    } else if (this.current()?.value === '{') {
      // Named exports
      this.advance();
      
      while (this.current()?.value !== '}') {
        const exported = this.expect(TokenType.IDENTIFIER);
        node.specifiers.push({
          type: 'ExportSpecifier',
          exported: { type: NodeType.IDENTIFIER, name: exported.value }
        });
        
        if (this.current()?.value === ',') {
          this.advance();
        }
      }
      
      this.expect(TokenType.PUNCTUATION, '}');
    }

    return node;
  }

  /**
   * Parse program (top-level)
   * @returns {Object}
   */
  parseProgram() {
    const node = {
      type: NodeType.PROGRAM,
      body: []
    };

    while (this.current() && this.current().type !== TokenType.EOF) {
      const token = this.current();

      // Skip comments
      if (token.type === TokenType.COMMENT) {
        this.advance();
        continue;
      }

      // Parse statements
      if (token.type === TokenType.KEYWORD) {
        if (token.value === 'import') {
          node.body.push(this.parseImportDeclaration());
        } else if (token.value === 'export') {
          node.body.push(this.parseExportDeclaration());
        } else {
          // Skip other statements for now
          this.advance();
        }
      } else {
        this.advance();
      }
    }

    return node;
  }

  /**
   * Parse source code into AST
   * @returns {Object}
   */
  parse() {
    return this.parseProgram();
  }
}

/**
 * Parse JavaScript source code into AST
 * @param {string} source - Source code
 * @returns {Object} AST representation
 */
export function parse(source) {
  const parser = new ASTParser(source);
  return parser.parse();
}