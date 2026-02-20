/**
 * @fileoverview GraphIndex - Index nodes by property for fast lookup
 * @module harmony-graph/graph-index
 * 
 * Provides efficient property-based indexing for graph nodes to enable
 * O(1) lookup by property values instead of O(n) graph traversal.
 * 
 * Performance targets:
 * - Index creation: < 5ms per 1000 nodes
 * - Lookup: O(1) average case
 * - Memory overhead: < 10% of graph size
 * 
 * @see DESIGN_SYSTEM.md#graph-index
 */

/**
 * @typedef {Object} IndexEntry
 * @property {string} nodeId - The node identifier
 * @property {any} value - The indexed property value
 * @property {number} timestamp - When this entry was indexed
 */

/**
 * @typedef {Object} IndexStats
 * @property {number} totalEntries - Total number of indexed entries
 * @property {number} uniqueValues - Number of unique values
 * @property {number} lastUpdated - Timestamp of last index update
 * @property {number} buildTimeMs - Time taken to build index in milliseconds
 */

/**
 * GraphIndex - Maintains property-based indexes for fast node lookup
 * 
 * Supports multiple index types:
 * - Exact match: Fast lookup by exact property value
 * - Range: Efficient range queries for numeric/date properties
 * - Full-text: Token-based search for string properties
 * 
 * Memory budget: Maximum 50MB total across all indexes
 * 
 * @class
 */
export class GraphIndex {
  /**
   * @param {Object} options - Index configuration
   * @param {number} [options.maxMemoryMB=10] - Maximum memory budget in MB
   * @param {boolean} [options.autoRebuild=true] - Auto-rebuild on graph changes
   * @param {number} [options.rebuildThreshold=100] - Changes before rebuild
   */
  constructor(options = {}) {
    /** @private */
    this.maxMemoryBytes = (options.maxMemoryMB || 10) * 1024 * 1024;
    
    /** @private */
    this.autoRebuild = options.autoRebuild !== false;
    
    /** @private */
    this.rebuildThreshold = options.rebuildThreshold || 100;
    
    /** @private @type {Map<string, Map<any, Set<string>>>} */
    this.exactIndexes = new Map();
    
    /** @private @type {Map<string, Array<{value: number, nodeId: string}>>} */
    this.rangeIndexes = new Map();
    
    /** @private @type {Map<string, Map<string, Set<string>>>} */
    this.tokenIndexes = new Map();
    
    /** @private @type {Map<string, IndexStats>} */
    this.stats = new Map();
    
    /** @private */
    this.changeCount = 0;
    
    /** @private */
    this.memoryUsage = 0;
  }

  /**
   * Create an exact-match index on a property
   * 
   * @param {string} propertyName - Property to index
   * @param {Array<Object>} nodes - Nodes to index
   * @returns {IndexStats} Statistics about the created index
   * @throws {Error} If memory budget exceeded
   */
  createExactIndex(propertyName, nodes) {
    const startTime = performance.now();
    const index = new Map();
    
    for (const node of nodes) {
      if (!node.id || !(propertyName in node.properties)) {
        continue;
      }
      
      const value = node.properties[propertyName];
      
      if (!index.has(value)) {
        index.set(value, new Set());
      }
      
      index.get(value).add(node.id);
    }
    
    // Estimate memory usage
    const estimatedMemory = this._estimateMapMemory(index);
    
    if (this.memoryUsage + estimatedMemory > this.maxMemoryBytes) {
      throw new Error(
        `Memory budget exceeded: ${this.memoryUsage + estimatedMemory} > ${this.maxMemoryBytes}`
      );
    }
    
    this.exactIndexes.set(propertyName, index);
    this.memoryUsage += estimatedMemory;
    
    const buildTime = performance.now() - startTime;
    const stats = {
      totalEntries: nodes.length,
      uniqueValues: index.size,
      lastUpdated: Date.now(),
      buildTimeMs: buildTime
    };
    
    this.stats.set(propertyName, stats);
    
    return stats;
  }

  /**
   * Create a range index for numeric/date properties
   * 
   * @param {string} propertyName - Property to index
   * @param {Array<Object>} nodes - Nodes to index
   * @returns {IndexStats} Statistics about the created index
   * @throws {Error} If property values are not numeric
   */
  createRangeIndex(propertyName, nodes) {
    const startTime = performance.now();
    const entries = [];
    
    for (const node of nodes) {
      if (!node.id || !(propertyName in node.properties)) {
        continue;
      }
      
      const value = node.properties[propertyName];
      
      if (typeof value !== 'number' && !(value instanceof Date)) {
        throw new Error(
          `Range index requires numeric or date values, got ${typeof value}`
        );
      }
      
      entries.push({
        value: value instanceof Date ? value.getTime() : value,
        nodeId: node.id
      });
    }
    
    // Sort for efficient range queries
    entries.sort((a, b) => a.value - b.value);
    
    const estimatedMemory = entries.length * 24; // Rough estimate
    
    if (this.memoryUsage + estimatedMemory > this.maxMemoryBytes) {
      throw new Error(
        `Memory budget exceeded: ${this.memoryUsage + estimatedMemory} > ${this.maxMemoryBytes}`
      );
    }
    
    this.rangeIndexes.set(propertyName, entries);
    this.memoryUsage += estimatedMemory;
    
    const buildTime = performance.now() - startTime;
    const stats = {
      totalEntries: entries.length,
      uniqueValues: new Set(entries.map(e => e.value)).size,
      lastUpdated: Date.now(),
      buildTimeMs: buildTime
    };
    
    this.stats.set(`${propertyName}:range`, stats);
    
    return stats;
  }

  /**
   * Create a token-based full-text index for string properties
   * 
   * @param {string} propertyName - Property to index
   * @param {Array<Object>} nodes - Nodes to index
   * @param {Object} options - Tokenization options
   * @param {boolean} [options.caseSensitive=false] - Case-sensitive tokenization
   * @param {number} [options.minTokenLength=2] - Minimum token length
   * @returns {IndexStats} Statistics about the created index
   */
  createTokenIndex(propertyName, nodes, options = {}) {
    const startTime = performance.now();
    const { caseSensitive = false, minTokenLength = 2 } = options;
    const index = new Map();
    
    for (const node of nodes) {
      if (!node.id || !(propertyName in node.properties)) {
        continue;
      }
      
      const value = node.properties[propertyName];
      
      if (typeof value !== 'string') {
        continue;
      }
      
      const tokens = this._tokenize(value, caseSensitive, minTokenLength);
      
      for (const token of tokens) {
        if (!index.has(token)) {
          index.set(token, new Set());
        }
        
        index.get(token).add(node.id);
      }
    }
    
    const estimatedMemory = this._estimateMapMemory(index);
    
    if (this.memoryUsage + estimatedMemory > this.maxMemoryBytes) {
      throw new Error(
        `Memory budget exceeded: ${this.memoryUsage + estimatedMemory} > ${this.maxMemoryBytes}`
      );
    }
    
    this.tokenIndexes.set(propertyName, index);
    this.memoryUsage += estimatedMemory;
    
    const buildTime = performance.now() - startTime;
    const stats = {
      totalEntries: nodes.length,
      uniqueValues: index.size,
      lastUpdated: Date.now(),
      buildTimeMs: buildTime
    };
    
    this.stats.set(`${propertyName}:token`, stats);
    
    return stats;
  }

  /**
   * Lookup nodes by exact property value
   * 
   * @param {string} propertyName - Property to query
   * @param {any} value - Value to match
   * @returns {Set<string>} Set of matching node IDs
   */
  lookupExact(propertyName, value) {
    const index = this.exactIndexes.get(propertyName);
    
    if (!index) {
      throw new Error(`No exact index exists for property: ${propertyName}`);
    }
    
    return index.get(value) || new Set();
  }

  /**
   * Lookup nodes by range query
   * 
   * @param {string} propertyName - Property to query
   * @param {number} minValue - Minimum value (inclusive)
   * @param {number} maxValue - Maximum value (inclusive)
   * @returns {Array<string>} Array of matching node IDs
   */
  lookupRange(propertyName, minValue, maxValue) {
    const index = this.rangeIndexes.get(propertyName);
    
    if (!index) {
      throw new Error(`No range index exists for property: ${propertyName}`);
    }
    
    // Binary search for start and end positions
    const startIdx = this._binarySearchStart(index, minValue);
    const endIdx = this._binarySearchEnd(index, maxValue);
    
    const results = [];
    for (let i = startIdx; i <= endIdx; i++) {
      results.push(index[i].nodeId);
    }
    
    return results;
  }

  /**
   * Lookup nodes by token search
   * 
   * @param {string} propertyName - Property to query
   * @param {string} searchText - Text to search for
   * @param {Object} options - Search options
   * @param {boolean} [options.caseSensitive=false] - Case-sensitive search
   * @param {number} [options.minTokenLength=2] - Minimum token length
   * @returns {Set<string>} Set of matching node IDs (intersection of all tokens)
   */
  lookupTokens(propertyName, searchText, options = {}) {
    const { caseSensitive = false, minTokenLength = 2 } = options;
    const index = this.tokenIndexes.get(propertyName);
    
    if (!index) {
      throw new Error(`No token index exists for property: ${propertyName}`);
    }
    
    const tokens = this._tokenize(searchText, caseSensitive, minTokenLength);
    
    if (tokens.length === 0) {
      return new Set();
    }
    
    // Start with first token's results
    let results = index.get(tokens[0]) || new Set();
    
    // Intersect with remaining tokens
    for (let i = 1; i < tokens.length; i++) {
      const tokenResults = index.get(tokens[i]) || new Set();
      results = new Set([...results].filter(id => tokenResults.has(id)));
    }
    
    return results;
  }

  /**
   * Update index when a node is added or modified
   * 
   * @param {Object} node - The node that changed
   * @param {string} propertyName - Property that changed
   */
  updateNode(node, propertyName) {
    this.changeCount++;
    
    // Update exact index if exists
    if (this.exactIndexes.has(propertyName)) {
      const index = this.exactIndexes.get(propertyName);
      const value = node.properties[propertyName];
      
      if (!index.has(value)) {
        index.set(value, new Set());
      }
      
      index.get(value).add(node.id);
    }
    
    // Check if rebuild needed
    if (this.autoRebuild && this.changeCount >= this.rebuildThreshold) {
      // Emit event for rebuild (handled by graph manager)
      this._emitRebuildNeeded();
    }
  }

  /**
   * Remove a node from all indexes
   * 
   * @param {string} nodeId - Node to remove
   */
  removeNode(nodeId) {
    this.changeCount++;
    
    // Remove from exact indexes
    for (const [, index] of this.exactIndexes) {
      for (const [, nodeSet] of index) {
        nodeSet.delete(nodeId);
      }
    }
    
    // Remove from range indexes
    for (const [propName, entries] of this.rangeIndexes) {
      const filtered = entries.filter(e => e.nodeId !== nodeId);
      this.rangeIndexes.set(propName, filtered);
    }
    
    // Remove from token indexes
    for (const [, index] of this.tokenIndexes) {
      for (const [, nodeSet] of index) {
        nodeSet.delete(nodeId);
      }
    }
  }

  /**
   * Get statistics for an index
   * 
   * @param {string} propertyName - Property name
   * @returns {IndexStats|null} Index statistics or null if not found
   */
  getStats(propertyName) {
    return this.stats.get(propertyName) || null;
  }

  /**
   * Get memory usage in bytes
   * 
   * @returns {number} Current memory usage
   */
  getMemoryUsage() {
    return this.memoryUsage;
  }

  /**
   * Clear all indexes
   */
  clear() {
    this.exactIndexes.clear();
    this.rangeIndexes.clear();
    this.tokenIndexes.clear();
    this.stats.clear();
    this.memoryUsage = 0;
    this.changeCount = 0;
  }

  /**
   * Tokenize text for full-text search
   * 
   * @private
   * @param {string} text - Text to tokenize
   * @param {boolean} caseSensitive - Case-sensitive tokenization
   * @param {number} minLength - Minimum token length
   * @returns {Array<string>} Array of tokens
   */
  _tokenize(text, caseSensitive, minLength) {
    let normalized = caseSensitive ? text : text.toLowerCase();
    
    // Split on non-alphanumeric characters
    const tokens = normalized.split(/[^a-z0-9]+/);
    
    // Filter by minimum length
    return tokens.filter(token => token.length >= minLength);
  }

  /**
   * Binary search for range start position
   * 
   * @private
   * @param {Array} entries - Sorted entries
   * @param {number} value - Value to search for
   * @returns {number} Start index
   */
  _binarySearchStart(entries, value) {
    let left = 0;
    let right = entries.length - 1;
    let result = entries.length;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      
      if (entries[mid].value >= value) {
        result = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    
    return result;
  }

  /**
   * Binary search for range end position
   * 
   * @private
   * @param {Array} entries - Sorted entries
   * @param {number} value - Value to search for
   * @returns {number} End index
   */
  _binarySearchEnd(entries, value) {
    let left = 0;
    let right = entries.length - 1;
    let result = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      
      if (entries[mid].value <= value) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return result;
  }

  /**
   * Estimate memory usage of a Map
   * 
   * @private
   * @param {Map} map - Map to estimate
   * @returns {number} Estimated bytes
   */
  _estimateMapMemory(map) {
    let bytes = 0;
    
    for (const [key, value] of map) {
      // Key size
      bytes += typeof key === 'string' ? key.length * 2 : 8;
      
      // Value size (Set of strings)
      if (value instanceof Set) {
        for (const item of value) {
          bytes += typeof item === 'string' ? item.length * 2 : 8;
        }
        bytes += value.size * 8; // Set overhead
      }
    }
    
    bytes += map.size * 32; // Map overhead
    
    return bytes;
  }

  /**
   * Emit rebuild needed event
   * 
   * @private
   */
  _emitRebuildNeeded() {
    if (typeof window !== 'undefined' && window.EventBus) {
      window.EventBus.publish('graph:index:rebuild-needed', {
        changeCount: this.changeCount,
        timestamp: Date.now()
      });
    }
    
    this.changeCount = 0;
  }
}

/**
 * Create a GraphIndex instance with default configuration
 * 
 * @param {Object} options - Index configuration
 * @returns {GraphIndex} New index instance
 */
export function createGraphIndex(options = {}) {
  return new GraphIndex(options);
}