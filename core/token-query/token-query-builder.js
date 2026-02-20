/**
 * @fileoverview Token Query Builder
 * Fluent API for building token queries programmatically
 * @module core/token-query/token-query-builder
 */

/**
 * Fluent query builder for design tokens
 * Provides a programmatic alternative to query strings
 */
export class TokenQueryBuilder {
  constructor() {
    this._queryName = null;
    this._arguments = {};
    this._fields = [];
  }
  
  /**
   * Set query name
   * @param {string} name - Query name (token, tokens, etc.)
   * @returns {TokenQueryBuilder} This builder for chaining
   */
  query(name) {
    this._queryName = name;
    return this;
  }
  
  /**
   * Add query argument
   * @param {string} name - Argument name
   * @param {any} value - Argument value
   * @returns {TokenQueryBuilder} This builder for chaining
   */
  arg(name, value) {
    this._arguments[name] = value;
    return this;
  }
  
  /**
   * Add multiple arguments
   * @param {Object} args - Arguments object
   * @returns {TokenQueryBuilder} This builder for chaining
   */
  args(args) {
    Object.assign(this._arguments, args);
    return this;
  }
  
  /**
   * Add field to selection
   * @param {string} name - Field name
   * @param {Function|null} nestedFn - Optional function to build nested fields
   * @returns {TokenQueryBuilder} This builder for chaining
   * 
   * @example
   * builder.field('metadata', (b) => {
   *   b.field('description');
   *   b.field('tags');
   * });
   */
  field(name, nestedFn = null) {
    if (nestedFn) {
      const nestedBuilder = new TokenQueryBuilder();
      nestedFn(nestedBuilder);
      this._fields.push({
        name,
        fields: nestedBuilder._fields
      });
    } else {
      this._fields.push({ name });
    }
    return this;
  }
  
  /**
   * Add multiple fields
   * @param {Array<string>} fields - Field names
   * @returns {TokenQueryBuilder} This builder for chaining
   */
  fields(...fields) {
    for (const field of fields) {
      this.field(field);
    }
    return this;
  }
  
  /**
   * Build query string
   * @returns {string} GraphQL-like query string
   */
  build() {
    if (!this._queryName) {
      throw new Error('Query name not set');
    }
    
    const argsString = this._buildArgumentsString();
    const fieldsString = this._buildFieldsString(this._fields, 1);
    
    return `${this._queryName}${argsString} {\n${fieldsString}\n}`;
  }
  
  /**
   * Build arguments string
   * @returns {string} Arguments string
   * @private
   */
  _buildArgumentsString() {
    const entries = Object.entries(this._arguments);
    
    if (entries.length === 0) {
      return '';
    }
    
    const args = entries.map(([key, value]) => {
      return `${key}: ${this._formatValue(value)}`;
    }).join(', ');
    
    return `(${args})`;
  }
  
  /**
   * Build fields string
   * @param {Array<Object>} fields - Fields array
   * @param {number} indent - Indentation level
   * @returns {string} Fields string
   * @private
   */
  _buildFieldsString(fields, indent) {
    const indentStr = '  '.repeat(indent);
    
    return fields.map(field => {
      if (field.fields) {
        const nested = this._buildFieldsString(field.fields, indent + 1);
        return `${indentStr}${field.name} {\n${nested}\n${indentStr}}`;
      }
      return `${indentStr}${field.name}`;
    }).join('\n');
  }
  
  /**
   * Format value for query string
   * @param {any} value - Value to format
   * @returns {string} Formatted value
   * @private
   */
  _formatValue(value) {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (Array.isArray(value)) {
      return `[${value.map(v => this._formatValue(v)).join(', ')}]`;
    }
    if (value === null) {
      return 'null';
    }
    return String(value);
  }
  
  /**
   * Create a new query builder
   * @returns {TokenQueryBuilder} New builder instance
   */
  static create() {
    return new TokenQueryBuilder();
  }
}