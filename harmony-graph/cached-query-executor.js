/**
 * @fileoverview Cached Query Executor
 * @module harmony-graph/cached-query-executor
 * 
 * High-level wrapper for executing graph queries with automatic caching.
 * Handles cache key generation, dependency tracking, and result storage.
 * 
 * @see DESIGN_SYSTEM.md#cached-query-executor
 */

import { getQueryCache } from './query-result-cache.js';

/**
 * Query options
 * @typedef {Object} QueryOptions
 * @property {boolean} useCache - Whether to use cache (default: true)
 * @property {number} ttl - Custom TTL in milliseconds
 * @property {boolean} forceRefresh - Force cache refresh (default: false)
 */

/**
 * Cached Query Executor
 * Wraps query functions with automatic caching
 */
export class CachedQueryExecutor {
  /**
   * @param {QueryResultCache} [cache] - Cache instance (uses global if not provided)
   */
  constructor(cache = null) {
    this.cache = cache || getQueryCache();
  }

  /**
   * Execute query with caching
   * @template T
   * @param {string} queryType - Type of query (for cache key)
   * @param {Object} params - Query parameters
   * @param {Function} queryFn - Function that executes the query
   * @param {Function} [dependencyFn] - Function that returns dependencies
   * @param {QueryOptions} [options] - Query options
   * @returns {Promise<T>} Query result
   */
  async execute(queryType, params, queryFn, dependencyFn = null, options = {}) {
    const useCache = options.useCache !== false;
    const forceRefresh = options.forceRefresh === true;

    // Generate cache key
    const cacheKey = this.cache.generateKey(queryType, params);

    // Check cache (unless force refresh)
    if (useCache && !forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Execute query
    const result = await queryFn(params);

    // Store in cache
    if (useCache) {
      const dependencies = dependencyFn ? dependencyFn(params, result) : {};
      this.cache.set(cacheKey, result, dependencies, options.ttl);
    }

    return result;
  }

  /**
   * Execute synchronous query with caching
   * @template T
   * @param {string} queryType - Type of query
   * @param {Object} params - Query parameters
   * @param {Function} queryFn - Synchronous query function
   * @param {Function} [dependencyFn] - Function that returns dependencies
   * @param {QueryOptions} [options] - Query options
   * @returns {T} Query result
   */
  executeSync(queryType, params, queryFn, dependencyFn = null, options = {}) {
    const useCache = options.useCache !== false;
    const forceRefresh = options.forceRefresh === true;

    const cacheKey = this.cache.generateKey(queryType, params);

    if (useCache && !forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const result = queryFn(params);

    if (useCache) {
      const dependencies = dependencyFn ? dependencyFn(params, result) : {};
      this.cache.set(cacheKey, result, dependencies, options.ttl);
    }

    return result;
  }

  /**
   * Invalidate cache for specific query
   * @param {string} queryType - Type of query
   * @param {Object} params - Query parameters
   */
  invalidate(queryType, params) {
    const cacheKey = this.cache.generateKey(queryType, params);
    this.cache.delete(cacheKey);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }
}

/**
 * Common dependency extractors for graph queries
 */
export const DependencyExtractors = {
  /**
   * Extract node dependencies from query result
   * @param {Object} params - Query parameters
   * @param {Object} result - Query result
   * @returns {Object} Dependencies
   */
  fromNodeIds(params, result) {
    const nodes = new Set();
    
    if (params.nodeId) {
      nodes.add(params.nodeId);
    }
    if (params.nodeIds) {
      params.nodeIds.forEach(id => nodes.add(id));
    }
    if (result && result.nodes) {
      result.nodes.forEach(node => nodes.add(node.id));
    }
    
    return { nodes: Array.from(nodes), edges: [] };
  },

  /**
   * Extract edge dependencies from query result
   * @param {Object} params - Query parameters
   * @param {Object} result - Query result
   * @returns {Object} Dependencies
   */
  fromEdgeIds(params, result) {
    const edges = new Set();
    
    if (params.edgeId) {
      edges.add(params.edgeId);
    }
    if (params.edgeIds) {
      params.edgeIds.forEach(id => edges.add(id));
    }
    if (result && result.edges) {
      result.edges.forEach(edge => edges.add(edge.id));
    }
    
    return { nodes: [], edges: Array.from(edges) };
  },

  /**
   * Extract both node and edge dependencies
   * @param {Object} params - Query parameters
   * @param {Object} result - Query result
   * @returns {Object} Dependencies
   */
  fromGraph(params, result) {
    const nodes = new Set();
    const edges = new Set();
    
    if (params.nodeId) nodes.add(params.nodeId);
    if (params.nodeIds) params.nodeIds.forEach(id => nodes.add(id));
    if (params.edgeId) edges.add(params.edgeId);
    if (params.edgeIds) params.edgeIds.forEach(id => edges.add(id));
    
    if (result) {
      if (result.nodes) {
        result.nodes.forEach(node => nodes.add(node.id));
      }
      if (result.edges) {
        result.edges.forEach(edge => edges.add(edge.id));
      }
    }
    
    return {
      nodes: Array.from(nodes),
      edges: Array.from(edges),
    };
  },

  /**
   * Extract dependencies from path query
   * @param {Object} params - Query parameters (sourceId, targetId)
   * @param {Object} result - Path result with nodes and edges
   * @returns {Object} Dependencies
   */
  fromPath(params, result) {
    const nodes = new Set([params.sourceId, params.targetId]);
    const edges = new Set();
    
    if (result && result.path) {
      result.path.nodes?.forEach(node => nodes.add(node.id));
      result.path.edges?.forEach(edge => edges.add(edge.id));
    }
    
    return {
      nodes: Array.from(nodes),
      edges: Array.from(edges),
    };
  },
};

// Global executor instance
let globalExecutor = null;

/**
 * Get or create global executor instance
 * @returns {CachedQueryExecutor} Global executor
 */
export function getQueryExecutor() {
  if (!globalExecutor) {
    globalExecutor = new CachedQueryExecutor();
  }
  return globalExecutor;
}