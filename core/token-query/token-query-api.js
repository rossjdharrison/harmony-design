/**
 * @fileoverview Token Query API
 * Main API interface for querying design tokens
 * @module core/token-query/token-query-api
 */

import { TokenQuerySchema } from './token-query-schema.js';
import { parseQuery, validateQuery } from './token-query-parser.js';
import { TokenQueryExecutor } from './token-query-executor.js';

/**
 * Token Query API - GraphQL-like interface for design tokens
 */
export class TokenQueryAPI {
  /**
   * @param {Object} tokenGraph - Token graph instance
   * @param {TypeNavigator} typeNavigator - Type navigator instance
   */
  constructor(tokenGraph, typeNavigator) {
    this.schema = TokenQuerySchema;
    this.executor = new TokenQueryExecutor(tokenGraph, typeNavigator);
  }
  
  /**
   * Execute a query string
   * @param {string} queryString - GraphQL-like query string
   * @returns {Promise<any>} Query result
   * @throws {Error} If query is invalid or execution fails
   * 
   * @example
   * const result = await api.query(`
   *   tokens(type: color, limit: 10) {
   *     id
   *     name
   *     value
   *     metadata {
   *       description
   *       tags
   *     }
   *   }
   * `);
   */
  async query(queryString) {
    try {
      // Parse query
      const parsedQuery = parseQuery(queryString);
      
      // Validate against schema
      validateQuery(parsedQuery, this.schema);
      
      // Execute query
      const result = await this.executor.execute(parsedQuery);
      
      return {
        data: result,
        errors: null
      };
    } catch (error) {
      console.error('[TokenQueryAPI] Query execution failed:', error);
      return {
        data: null,
        errors: [{ message: error.message, stack: error.stack }]
      };
    }
  }
  
  /**
   * Execute multiple queries in batch
   * @param {Array<string>} queries - Array of query strings
   * @returns {Promise<Array<Object>>} Array of query results
   */
  async batchQuery(queries) {
    return Promise.all(queries.map(q => this.query(q)));
  }
  
  /**
   * Get schema documentation
   * @returns {Object} Schema definition
   */
  getSchema() {
    return this.schema;
  }
  
  /**
   * Introspect available queries
   * @returns {Object} Query definitions
   */
  introspectQueries() {
    return this.schema.queries;
  }
  
  /**
   * Introspect available types
   * @returns {Object} Type definitions
   */
  introspectTypes() {
    return this.schema.types;
  }
}