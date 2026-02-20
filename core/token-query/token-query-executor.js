/**
 * @fileoverview Token Query Executor
 * Executes parsed queries against the token graph
 * @module core/token-query/token-query-executor
 */

import { TypeNavigator } from '../type-navigator.js';

/**
 * Query executor for design tokens
 */
export class TokenQueryExecutor {
  /**
   * @param {Object} tokenGraph - Token graph instance
   * @param {TypeNavigator} typeNavigator - Type navigator instance
   */
  constructor(tokenGraph, typeNavigator) {
    this.tokenGraph = tokenGraph;
    this.typeNavigator = typeNavigator;
    this.queryHandlers = this._initializeQueryHandlers();
  }
  
  /**
   * Initialize query handler functions
   * @returns {Object} Map of query names to handler functions
   * @private
   */
  _initializeQueryHandlers() {
    return {
      token: this._executeTokenQuery.bind(this),
      tokens: this._executeTokensQuery.bind(this),
      tokensByPath: this._executeTokensByPathQuery.bind(this),
      relatedTokens: this._executeRelatedTokensQuery.bind(this),
      tokenUsage: this._executeTokenUsageQuery.bind(this),
      tokenDerivatives: this._executeTokenDerivativesQuery.bind(this)
    };
  }
  
  /**
   * Execute a parsed query
   * @param {Object} parsedQuery - Parsed query object
   * @returns {Promise<any>} Query result
   */
  async execute(parsedQuery) {
    const handler = this.queryHandlers[parsedQuery.name];
    
    if (!handler) {
      throw new Error(`No handler for query: ${parsedQuery.name}`);
    }
    
    const rawResult = await handler(parsedQuery.arguments);
    return this._selectFields(rawResult, parsedQuery.fields);
  }
  
  /**
   * Execute token query (single token by ID)
   * @param {Object} args - Query arguments
   * @returns {Promise<Object|null>} Token object or null
   * @private
   */
  async _executeTokenQuery(args) {
    return this.typeNavigator.query({
      type: 'Token',
      filter: { id: args.id }
    }).then(results => results[0] || null);
  }
  
  /**
   * Execute tokens query (multiple tokens with filters)
   * @param {Object} args - Query arguments
   * @returns {Promise<Array<Object>>} Array of token objects
   * @private
   */
  async _executeTokensQuery(args) {
    const filter = {};
    
    if (args.type) filter.type = args.type;
    if (args.category) filter.category = args.category;
    if (args.tags) {
      filter.tags = { $in: args.tags };
    }
    if (args.search) {
      filter.$or = [
        { name: { $regex: args.search, $options: 'i' } },
        { path: { $regex: args.search, $options: 'i' } },
        { 'metadata.description': { $regex: args.search, $options: 'i' } }
      ];
    }
    
    let results = await this.typeNavigator.query({
      type: 'Token',
      filter
    });
    
    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || results.length;
    
    return results.slice(offset, offset + limit);
  }
  
  /**
   * Execute tokensByPath query (tokens matching path pattern)
   * @param {Object} args - Query arguments
   * @returns {Promise<Array<Object>>} Array of token objects
   * @private
   */
  async _executeTokensByPathQuery(args) {
    const pathPattern = args.path.replace(/\*/g, '.*');
    
    return this.typeNavigator.query({
      type: 'Token',
      filter: {
        path: { $regex: `^${pathPattern}$` }
      }
    });
  }
  
  /**
   * Execute relatedTokens query (tokens related to a given token)
   * @param {Object} args - Query arguments
   * @returns {Promise<Array<Object>>} Array of related token objects
   * @private
   */
  async _executeRelatedTokensQuery(args) {
    const token = await this._executeTokenQuery({ id: args.id });
    
    if (!token) {
      return [];
    }
    
    const relationships = token.relationships || [];
    const depth = args.depth || 1;
    const relationshipType = args.relationshipType;
    
    const relatedIds = new Set();
    const visited = new Set([args.id]);
    
    await this._traverseRelationships(
      token,
      relationshipType,
      depth,
      visited,
      relatedIds
    );
    
    // Fetch all related tokens
    const relatedTokens = await Promise.all(
      Array.from(relatedIds).map(id => this._executeTokenQuery({ id }))
    );
    
    return relatedTokens.filter(Boolean);
  }
  
  /**
   * Traverse token relationships recursively
   * @param {Object} token - Current token
   * @param {string|null} relationshipType - Filter by relationship type
   * @param {number} depth - Remaining depth
   * @param {Set} visited - Visited token IDs
   * @param {Set} relatedIds - Accumulated related token IDs
   * @private
   */
  async _traverseRelationships(token, relationshipType, depth, visited, relatedIds) {
    if (depth === 0) return;
    
    const relationships = token.relationships || [];
    
    for (const rel of relationships) {
      if (relationshipType && rel.type !== relationshipType) {
        continue;
      }
      
      const targetId = rel.target?.id || rel.target;
      
      if (!visited.has(targetId)) {
        visited.add(targetId);
        relatedIds.add(targetId);
        
        if (depth > 1) {
          const targetToken = await this._executeTokenQuery({ id: targetId });
          if (targetToken) {
            await this._traverseRelationships(
              targetToken,
              relationshipType,
              depth - 1,
              visited,
              relatedIds
            );
          }
        }
      }
    }
  }
  
  /**
   * Execute tokenUsage query (components using a token)
   * @param {Object} args - Query arguments
   * @returns {Promise<Array<string>>} Array of component names
   * @private
   */
  async _executeTokenUsageQuery(args) {
    const token = await this._executeTokenQuery({ id: args.id });
    return token?.usedBy || [];
  }
  
  /**
   * Execute tokenDerivatives query (tokens derived from a given token)
   * @param {Object} args - Query arguments
   * @returns {Promise<Array<Object>>} Array of derivative token objects
   * @private
   */
  async _executeTokenDerivativesQuery(args) {
    const token = await this._executeTokenQuery({ id: args.id });
    
    if (!token) {
      return [];
    }
    
    if (args.recursive) {
      // Recursively find all derivatives
      const allDerivatives = [];
      const visited = new Set([args.id]);
      
      await this._findDerivativesRecursive(token, visited, allDerivatives);
      return allDerivatives;
    } else {
      // Direct derivatives only
      return token.derivatives || [];
    }
  }
  
  /**
   * Find derivatives recursively
   * @param {Object} token - Current token
   * @param {Set} visited - Visited token IDs
   * @param {Array} allDerivatives - Accumulated derivatives
   * @private
   */
  async _findDerivativesRecursive(token, visited, allDerivatives) {
    const derivatives = token.derivatives || [];
    
    for (const derivative of derivatives) {
      const derivativeId = derivative.id || derivative;
      
      if (!visited.has(derivativeId)) {
        visited.add(derivativeId);
        
        const derivativeToken = await this._executeTokenQuery({ id: derivativeId });
        if (derivativeToken) {
          allDerivatives.push(derivativeToken);
          await this._findDerivativesRecursive(derivativeToken, visited, allDerivatives);
        }
      }
    }
  }
  
  /**
   * Select requested fields from result
   * @param {any} result - Raw query result
   * @param {Array<Object>} fields - Requested fields
   * @returns {any} Filtered result
   * @private
   */
  _selectFields(result, fields) {
    if (!result) return result;
    
    if (Array.isArray(result)) {
      return result.map(item => this._selectFields(item, fields));
    }
    
    if (typeof result !== 'object') {
      return result;
    }
    
    const selected = {};
    
    for (const field of fields) {
      if (field.fields) {
        // Nested field selection
        selected[field.name] = this._selectFields(result[field.name], field.fields);
      } else {
        // Simple field
        selected[field.name] = result[field.name];
      }
    }
    
    return selected;
  }
}