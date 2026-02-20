/**
 * @fileoverview PatternMatcher - Match subgraph patterns (like Cypher MATCH)
 * Implements pattern matching for graph queries, supporting node patterns,
 * relationship patterns, and path patterns similar to Cypher's MATCH clause.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#graph-pattern-matching
 */

/**
 * @typedef {Object} NodePattern
 * @property {string} [variable] - Variable name to bind matched node
 * @property {string[]} [labels] - Labels the node must have
 * @property {Object<string, any>} [properties] - Properties the node must match
 */

/**
 * @typedef {Object} RelationshipPattern
 * @property {string} [variable] - Variable name to bind matched relationship
 * @property {string[]} [types] - Relationship types to match
 * @property {Object<string, any>} [properties] - Properties the relationship must match
 * @property {string} direction - Direction: 'out', 'in', or 'both'
 * @property {number} [minHops] - Minimum hops for variable-length patterns
 * @property {number} [maxHops] - Maximum hops for variable-length patterns
 */

/**
 * @typedef {Object} PathPattern
 * @property {NodePattern} start - Starting node pattern
 * @property {Array<{rel: RelationshipPattern, node: NodePattern}>} segments - Path segments
 */

/**
 * @typedef {Object} MatchResult
 * @property {Map<string, any>} bindings - Variable bindings from pattern match
 * @property {number} score - Match quality score for ranking
 */

/**
 * PatternMatcher class for matching subgraph patterns
 * Supports Cypher-like pattern matching with nodes, relationships, and paths
 */
export class PatternMatcher {
  /**
   * @param {Object} graph - Graph instance to match against
   */
  constructor(graph) {
    /** @type {Object} */
    this.graph = graph;
    
    /** @type {Map<string, Function>} */
    this.propertyComparators = new Map();
    
    /** @type {number} */
    this.maxResultsPerPattern = 10000;
    
    this._initializeComparators();
  }

  /**
   * Initialize property comparison functions
   * @private
   */
  _initializeComparators() {
    this.propertyComparators.set('eq', (a, b) => a === b);
    this.propertyComparators.set('neq', (a, b) => a !== b);
    this.propertyComparators.set('gt', (a, b) => a > b);
    this.propertyComparators.set('gte', (a, b) => a >= b);
    this.propertyComparators.set('lt', (a, b) => a < b);
    this.propertyComparators.set('lte', (a, b) => a <= b);
    this.propertyComparators.set('contains', (a, b) => 
      typeof a === 'string' && a.includes(b)
    );
    this.propertyComparators.set('startsWith', (a, b) => 
      typeof a === 'string' && a.startsWith(b)
    );
    this.propertyComparators.set('endsWith', (a, b) => 
      typeof a === 'string' && a.endsWith(b)
    );
    this.propertyComparators.set('regex', (a, b) => 
      typeof a === 'string' && new RegExp(b).test(a)
    );
  }

  /**
   * Match a pattern against the graph
   * @param {PathPattern} pattern - Pattern to match
   * @param {Object} [options] - Matching options
   * @param {number} [options.limit] - Maximum results to return
   * @param {number} [options.offset] - Number of results to skip
   * @param {Map<string, any>} [options.initialBindings] - Pre-bound variables
   * @returns {MatchResult[]} Array of match results
   */
  match(pattern, options = {}) {
    const startTime = performance.now();
    const limit = options.limit || this.maxResultsPerPattern;
    const offset = options.offset || 0;
    const initialBindings = options.initialBindings || new Map();

    try {
      // Find candidate starting nodes
      const startCandidates = this._findNodeCandidates(
        pattern.start, 
        initialBindings
      );

      const results = [];
      let skipped = 0;

      // For each starting node, try to match the full pattern
      for (const startNode of startCandidates) {
        if (results.length >= limit) break;

        const bindings = new Map(initialBindings);
        if (pattern.start.variable) {
          bindings.set(pattern.start.variable, startNode);
        }

        // Match remaining path segments
        const pathMatches = this._matchPathSegments(
          startNode,
          pattern.segments,
          bindings
        );

        for (const match of pathMatches) {
          if (results.length >= limit) break;
          
          if (skipped < offset) {
            skipped++;
            continue;
          }

          results.push({
            bindings: match,
            score: this._calculateMatchScore(match, pattern)
          });
        }
      }

      const duration = performance.now() - startTime;
      
      // Performance budget check: 16ms for interactive queries
      if (duration > 16 && results.length < 100) {
        console.warn(
          `PatternMatcher: Slow pattern match (${duration.toFixed(2)}ms) ` +
          `for ${results.length} results. Consider adding indexes.`
        );
      }

      return results;

    } catch (error) {
      console.error('PatternMatcher: Match failed', {
        pattern,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Find nodes matching a node pattern
   * @param {NodePattern} nodePattern - Node pattern to match
   * @param {Map<string, any>} bindings - Current variable bindings
   * @returns {Array<Object>} Matching nodes
   * @private
   */
  _findNodeCandidates(nodePattern, bindings) {
    // If variable already bound, return that node
    if (nodePattern.variable && bindings.has(nodePattern.variable)) {
      const node = bindings.get(nodePattern.variable);
      return this._matchesNodePattern(node, nodePattern) ? [node] : [];
    }

    // Use index if available for label queries
    if (nodePattern.labels && nodePattern.labels.length > 0) {
      const candidates = new Set();
      for (const label of nodePattern.labels) {
        const nodesWithLabel = this.graph.getNodesByLabel?.(label) || [];
        for (const node of nodesWithLabel) {
          candidates.add(node);
        }
      }
      
      // Filter by properties
      return Array.from(candidates).filter(node =>
        this._matchesNodePattern(node, nodePattern)
      );
    }

    // Fallback: scan all nodes
    const allNodes = this.graph.getAllNodes?.() || [];
    return allNodes.filter(node =>
      this._matchesNodePattern(node, nodePattern)
    );
  }

  /**
   * Check if a node matches a node pattern
   * @param {Object} node - Node to check
   * @param {NodePattern} pattern - Pattern to match against
   * @returns {boolean} True if node matches pattern
   * @private
   */
  _matchesNodePattern(node, pattern) {
    // Check labels
    if (pattern.labels && pattern.labels.length > 0) {
      const nodeLabels = new Set(node.labels || []);
      for (const label of pattern.labels) {
        if (!nodeLabels.has(label)) return false;
      }
    }

    // Check properties
    if (pattern.properties) {
      for (const [key, value] of Object.entries(pattern.properties)) {
        if (!this._matchesProperty(node.properties?.[key], value)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Match property value with pattern (supports operators)
   * @param {any} actual - Actual property value
   * @param {any} expected - Expected value or operator expression
   * @returns {boolean} True if property matches
   * @private
   */
  _matchesProperty(actual, expected) {
    // Direct equality
    if (typeof expected !== 'object' || expected === null) {
      return actual === expected;
    }

    // Operator-based comparison
    if (expected.$op && expected.$value !== undefined) {
      const comparator = this.propertyComparators.get(expected.$op);
      if (!comparator) {
        console.warn(`Unknown property operator: ${expected.$op}`);
        return false;
      }
      return comparator(actual, expected.$value);
    }

    // Deep equality for objects
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  /**
   * Match path segments starting from a node
   * @param {Object} currentNode - Current node in path
   * @param {Array} segments - Remaining path segments to match
   * @param {Map<string, any>} bindings - Current variable bindings
   * @returns {Array<Map<string, any>>} Array of binding maps for matches
   * @private
   */
  _matchPathSegments(currentNode, segments, bindings) {
    // Base case: no more segments
    if (segments.length === 0) {
      return [bindings];
    }

    const [firstSegment, ...remainingSegments] = segments;
    const results = [];

    // Handle variable-length relationships
    if (firstSegment.rel.minHops !== undefined || 
        firstSegment.rel.maxHops !== undefined) {
      const minHops = firstSegment.rel.minHops || 1;
      const maxHops = firstSegment.rel.maxHops || Infinity;
      
      const paths = this._findVariableLengthPaths(
        currentNode,
        firstSegment,
        minHops,
        maxHops,
        bindings
      );

      for (const { endNode, pathBindings } of paths) {
        const matches = this._matchPathSegments(
          endNode,
          remainingSegments,
          pathBindings
        );
        results.push(...matches);
      }

      return results;
    }

    // Single-hop relationship
    const edges = this._getMatchingEdges(currentNode, firstSegment.rel);

    for (const edge of edges) {
      const nextNode = this._getTargetNode(edge, firstSegment.rel.direction);
      
      if (!this._matchesNodePattern(nextNode, firstSegment.node)) {
        continue;
      }

      const newBindings = new Map(bindings);
      
      if (firstSegment.rel.variable) {
        newBindings.set(firstSegment.rel.variable, edge);
      }
      
      if (firstSegment.node.variable) {
        newBindings.set(firstSegment.node.variable, nextNode);
      }

      const matches = this._matchPathSegments(
        nextNode,
        remainingSegments,
        newBindings
      );
      
      results.push(...matches);
    }

    return results;
  }

  /**
   * Find variable-length paths
   * @param {Object} startNode - Starting node
   * @param {Object} segment - Path segment with variable-length relationship
   * @param {number} minHops - Minimum hops
   * @param {number} maxHops - Maximum hops
   * @param {Map<string, any>} bindings - Current bindings
   * @returns {Array<{endNode: Object, pathBindings: Map}>} Paths found
   * @private
   */
  _findVariableLengthPaths(startNode, segment, minHops, maxHops, bindings) {
    const results = [];
    const visited = new Set();
    const queue = [{ node: startNode, depth: 0, path: [] }];

    while (queue.length > 0) {
      const { node, depth, path } = queue.shift();
      
      const nodeKey = node.id || JSON.stringify(node);
      if (visited.has(nodeKey)) continue;
      visited.add(nodeKey);

      // Check if we've reached a valid endpoint
      if (depth >= minHops && depth <= maxHops) {
        if (this._matchesNodePattern(node, segment.node)) {
          const pathBindings = new Map(bindings);
          
          if (segment.rel.variable) {
            pathBindings.set(segment.rel.variable, path);
          }
          
          if (segment.node.variable) {
            pathBindings.set(segment.node.variable, node);
          }
          
          results.push({ endNode: node, pathBindings });
        }
      }

      // Continue exploring if we haven't hit max depth
      if (depth < maxHops) {
        const edges = this._getMatchingEdges(node, segment.rel);
        
        for (const edge of edges) {
          const nextNode = this._getTargetNode(edge, segment.rel.direction);
          queue.push({
            node: nextNode,
            depth: depth + 1,
            path: [...path, edge]
          });
        }
      }
    }

    return results;
  }

  /**
   * Get edges matching a relationship pattern
   * @param {Object} node - Node to get edges from
   * @param {RelationshipPattern} relPattern - Relationship pattern
   * @returns {Array<Object>} Matching edges
   * @private
   */
  _getMatchingEdges(node, relPattern) {
    let edges = [];

    if (relPattern.direction === 'out' || relPattern.direction === 'both') {
      edges.push(...(this.graph.getOutgoingEdges?.(node) || []));
    }

    if (relPattern.direction === 'in' || relPattern.direction === 'both') {
      edges.push(...(this.graph.getIncomingEdges?.(node) || []));
    }

    // Filter by type
    if (relPattern.types && relPattern.types.length > 0) {
      edges = edges.filter(edge =>
        relPattern.types.includes(edge.type)
      );
    }

    // Filter by properties
    if (relPattern.properties) {
      edges = edges.filter(edge => {
        for (const [key, value] of Object.entries(relPattern.properties)) {
          if (!this._matchesProperty(edge.properties?.[key], value)) {
            return false;
          }
        }
        return true;
      });
    }

    return edges;
  }

  /**
   * Get target node from edge based on direction
   * @param {Object} edge - Edge to traverse
   * @param {string} direction - Direction to traverse
   * @returns {Object} Target node
   * @private
   */
  _getTargetNode(edge, direction) {
    if (direction === 'out') {
      return edge.target;
    } else if (direction === 'in') {
      return edge.source;
    }
    // For 'both', prefer target
    return edge.target;
  }

  /**
   * Calculate match quality score
   * @param {Map<string, any>} bindings - Variable bindings
   * @param {PathPattern} pattern - Original pattern
   * @returns {number} Quality score (higher is better)
   * @private
   */
  _calculateMatchScore(bindings, pattern) {
    let score = 0;

    // More specific patterns score higher
    if (pattern.start.labels) {
      score += pattern.start.labels.length * 10;
    }

    if (pattern.start.properties) {
      score += Object.keys(pattern.start.properties).length * 5;
    }

    // Longer paths score higher (more specific)
    score += pattern.segments.length * 20;

    // Bound variables indicate more complete matches
    score += bindings.size * 2;

    return score;
  }

  /**
   * Match multiple patterns (equivalent to multiple MATCH clauses)
   * @param {PathPattern[]} patterns - Patterns to match
   * @param {Object} [options] - Matching options
   * @returns {MatchResult[]} Combined match results
   */
  matchMultiple(patterns, options = {}) {
    if (patterns.length === 0) return [];
    if (patterns.length === 1) return this.match(patterns[0], options);

    // Start with first pattern
    let results = this.match(patterns[0], { limit: Infinity });

    // Incrementally match remaining patterns with existing bindings
    for (let i = 1; i < patterns.length; i++) {
      const newResults = [];

      for (const result of results) {
        const matches = this.match(patterns[i], {
          initialBindings: result.bindings,
          limit: Infinity
        });

        for (const match of matches) {
          newResults.push({
            bindings: match.bindings,
            score: result.score + match.score
          });
        }
      }

      results = newResults;

      if (results.length === 0) break;
    }

    // Apply limit and offset
    const limit = options.limit || this.maxResultsPerPattern;
    const offset = options.offset || 0;

    return results
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);
  }

  /**
   * Set maximum results per pattern
   * @param {number} max - Maximum results
   */
  setMaxResults(max) {
    this.maxResultsPerPattern = max;
  }

  /**
   * Register custom property comparator
   * @param {string} name - Comparator name
   * @param {Function} fn - Comparator function (actual, expected) => boolean
   */
  registerComparator(name, fn) {
    this.propertyComparators.set(name, fn);
  }
}

/**
 * Create a node pattern
 * @param {string} [variable] - Variable name
 * @param {string[]} [labels] - Node labels
 * @param {Object} [properties] - Node properties
 * @returns {NodePattern} Node pattern
 */
export function nodePattern(variable, labels = [], properties = {}) {
  return { variable, labels, properties };
}

/**
 * Create a relationship pattern
 * @param {string} [variable] - Variable name
 * @param {string[]} [types] - Relationship types
 * @param {string} direction - Direction: 'out', 'in', or 'both'
 * @param {Object} [properties] - Relationship properties
 * @returns {RelationshipPattern} Relationship pattern
 */
export function relationshipPattern(
  variable,
  types = [],
  direction = 'out',
  properties = {}
) {
  return { variable, types, direction, properties };
}

/**
 * Create a path pattern
 * @param {NodePattern} start - Starting node pattern
 * @param {...Array} segments - Path segments as [rel, node] pairs
 * @returns {PathPattern} Path pattern
 */
export function pathPattern(start, ...segments) {
  const pathSegments = [];
  
  for (let i = 0; i < segments.length; i += 2) {
    if (i + 1 >= segments.length) {
      throw new Error('Path segments must be [rel, node] pairs');
    }
    pathSegments.push({
      rel: segments[i],
      node: segments[i + 1]
    });
  }

  return { start, segments: pathSegments };
}