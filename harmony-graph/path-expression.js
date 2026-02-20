/**
 * @fileoverview PathExpression - Express path patterns for graph traversal
 * 
 * Supports patterns like:
 * - A->B: Direct edge from A to B
 * - A->B->C: Path through B
 * - A->*->C: Any intermediate node
 * - A->**->C: Any path length (0 or more hops)
 * - A-[type]->B: Edge with specific type
 * - A<->B: Bidirectional edge
 * 
 * Part of Harmony Design System graph query engine.
 * See DESIGN_SYSTEM.md § Graph Query Engine
 * 
 * @module harmony-graph/path-expression
 */

/**
 * Direction of edge traversal
 * @typedef {'outgoing' | 'incoming' | 'bidirectional'} EdgeDirection
 */

/**
 * Represents a single step in a path pattern
 * @typedef {Object} PathStep
 * @property {string} nodePattern - Node pattern (* for any, ** for any length)
 * @property {EdgeDirection} direction - Direction of traversal
 * @property {string|null} edgeType - Edge type constraint (null for any)
 * @property {Object<string, any>} nodeConstraints - Additional node property constraints
 * @property {Object<string, any>} edgeConstraints - Additional edge property constraints
 * @property {number|null} minHops - Minimum hops for variable length (** pattern)
 * @property {number|null} maxHops - Maximum hops for variable length (** pattern)
 */

/**
 * Parsed path expression
 * @typedef {Object} ParsedPathExpression
 * @property {PathStep[]} steps - Ordered steps in the path
 * @property {string} rawPattern - Original pattern string
 * @property {boolean} isVariableLength - Whether pattern includes variable length segments
 */

/**
 * PathExpression parser and matcher
 * Converts string patterns into structured path queries
 */
export class PathExpression {
  /**
   * Create a new PathExpression
   * @param {string} pattern - Path pattern string (e.g., "A->B->*->C")
   */
  constructor(pattern) {
    /** @type {string} */
    this.pattern = pattern;
    
    /** @type {ParsedPathExpression|null} */
    this.parsed = null;
    
    /** @type {Error|null} */
    this.parseError = null;
    
    this._parse();
  }

  /**
   * Parse the pattern string into structured steps
   * @private
   */
  _parse() {
    try {
      const steps = [];
      const pattern = this.pattern.trim();
      
      if (!pattern) {
        throw new Error('Empty path pattern');
      }

      // Split by arrows while preserving arrow types
      // Regex matches: ->, <-, <->, -[type]->
      const tokens = this._tokenize(pattern);
      
      let currentNode = null;
      let expectNode = true;
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        if (expectNode) {
          currentNode = this._parseNodePattern(token);
          expectNode = false;
        } else {
          // This is an arrow token
          const arrow = this._parseArrowPattern(token);
          const nextNode = tokens[i + 1];
          
          if (!nextNode) {
            throw new Error(`Expected node after arrow at position ${i}`);
          }
          
          const targetNode = this._parseNodePattern(nextNode);
          
          steps.push({
            nodePattern: currentNode.pattern,
            direction: arrow.direction,
            edgeType: arrow.edgeType,
            nodeConstraints: currentNode.constraints,
            edgeConstraints: arrow.constraints,
            minHops: currentNode.minHops,
            maxHops: currentNode.maxHops
          });
          
          currentNode = targetNode;
          expectNode = false;
          i++; // Skip next token (already processed)
        }
      }
      
      // Add final node as a step with no outgoing edge
      if (currentNode) {
        steps.push({
          nodePattern: currentNode.pattern,
          direction: 'outgoing',
          edgeType: null,
          nodeConstraints: currentNode.constraints,
          edgeConstraints: {},
          minHops: currentNode.minHops,
          maxHops: currentNode.maxHops
        });
      }
      
      this.parsed = {
        steps,
        rawPattern: this.pattern,
        isVariableLength: steps.some(s => s.maxHops !== null && s.maxHops > 1)
      };
      
    } catch (error) {
      this.parseError = error;
      console.error('[PathExpression] Parse error:', error.message, 'Pattern:', this.pattern);
    }
  }

  /**
   * Tokenize pattern into nodes and arrows
   * @private
   * @param {string} pattern - Pattern string
   * @returns {string[]} Tokens
   */
  _tokenize(pattern) {
    const tokens = [];
    let current = '';
    let inBrackets = false;
    
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      
      if (char === '[') {
        inBrackets = true;
        current += char;
      } else if (char === ']') {
        inBrackets = false;
        current += char;
      } else if (char === '-' || char === '<' || char === '>') {
        if (!inBrackets) {
          // Start of arrow
          if (current.trim()) {
            tokens.push(current.trim());
            current = '';
          }
          
          // Collect full arrow
          let arrow = char;
          while (i + 1 < pattern.length && 
                 (pattern[i + 1] === '-' || pattern[i + 1] === '>' || 
                  pattern[i + 1] === '<' || pattern[i + 1] === '[')) {
            i++;
            arrow += pattern[i];
            
            // Handle edge type in brackets
            if (pattern[i] === '[') {
              inBrackets = true;
              while (i + 1 < pattern.length && pattern[i + 1] !== ']') {
                i++;
                arrow += pattern[i];
              }
              if (i + 1 < pattern.length) {
                i++;
                arrow += pattern[i]; // closing ]
                inBrackets = false;
              }
            }
          }
          
          tokens.push(arrow);
        } else {
          current += char;
        }
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      tokens.push(current.trim());
    }
    
    return tokens;
  }

  /**
   * Parse node pattern token
   * @private
   * @param {string} token - Node token
   * @returns {Object} Parsed node info
   */
  _parseNodePattern(token) {
    const result = {
      pattern: token,
      constraints: {},
      minHops: null,
      maxHops: null
    };
    
    // Check for variable length pattern (**)
    if (token === '**') {
      result.pattern = '*';
      result.minHops = 0;
      result.maxHops = Infinity;
    } else if (token.startsWith('**{')) {
      // Variable length with bounds: **{1,3}
      const match = token.match(/\*\*\{(\d+),(\d+|\*)\}/);
      if (match) {
        result.pattern = '*';
        result.minHops = parseInt(match[1], 10);
        result.maxHops = match[2] === '*' ? Infinity : parseInt(match[2], 10);
      }
    }
    
    // Parse constraints: NodeType{prop:value}
    const constraintMatch = token.match(/^([^{]+)\{(.+)\}$/);
    if (constraintMatch) {
      result.pattern = constraintMatch[1];
      const constraintStr = constraintMatch[2];
      
      // Simple key:value parser
      const pairs = constraintStr.split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          // Try to parse as JSON value
          try {
            result.constraints[key] = JSON.parse(value);
          } catch {
            result.constraints[key] = value;
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Parse arrow pattern token
   * @private
   * @param {string} token - Arrow token
   * @returns {Object} Parsed arrow info
   */
  _parseArrowPattern(token) {
    const result = {
      direction: 'outgoing',
      edgeType: null,
      constraints: {}
    };
    
    // Determine direction
    if (token.startsWith('<-') && token.endsWith('->')) {
      result.direction = 'bidirectional';
    } else if (token.startsWith('<-')) {
      result.direction = 'incoming';
    } else {
      result.direction = 'outgoing';
    }
    
    // Extract edge type from brackets: -[type]->
    const typeMatch = token.match(/\[([^\]]+)\]/);
    if (typeMatch) {
      const typeSpec = typeMatch[1];
      
      // Check for constraints: type{prop:value}
      const constraintMatch = typeSpec.match(/^([^{]+)\{(.+)\}$/);
      if (constraintMatch) {
        result.edgeType = constraintMatch[1].trim();
        const constraintStr = constraintMatch[2];
        
        const pairs = constraintStr.split(',');
        for (const pair of pairs) {
          const [key, value] = pair.split(':').map(s => s.trim());
          if (key && value) {
            try {
              result.constraints[key] = JSON.parse(value);
            } catch {
              result.constraints[key] = value;
            }
          }
        }
      } else {
        result.edgeType = typeSpec.trim();
      }
    }
    
    return result;
  }

  /**
   * Check if pattern parsed successfully
   * @returns {boolean} True if valid
   */
  isValid() {
    return this.parsed !== null && this.parseError === null;
  }

  /**
   * Get parsed steps
   * @returns {PathStep[]|null} Parsed steps or null if invalid
   */
  getSteps() {
    return this.parsed?.steps || null;
  }

  /**
   * Get parse error if any
   * @returns {Error|null} Parse error or null
   */
  getError() {
    return this.parseError;
  }

  /**
   * Check if pattern includes variable length segments
   * @returns {boolean} True if variable length
   */
  isVariableLength() {
    return this.parsed?.isVariableLength || false;
  }

  /**
   * Convert to string representation
   * @returns {string} Pattern string
   */
  toString() {
    return this.pattern;
  }

  /**
   * Create PathExpression from pattern string
   * @param {string} pattern - Pattern string
   * @returns {PathExpression} New PathExpression instance
   */
  static from(pattern) {
    return new PathExpression(pattern);
  }

  /**
   * Validate pattern syntax without creating instance
   * @param {string} pattern - Pattern to validate
   * @returns {{valid: boolean, error: string|null}} Validation result
   */
  static validate(pattern) {
    const expr = new PathExpression(pattern);
    return {
      valid: expr.isValid(),
      error: expr.getError()?.message || null
    };
  }
}

/**
 * Builder for constructing path expressions programmatically
 */
export class PathExpressionBuilder {
  constructor() {
    /** @type {string[]} */
    this.parts = [];
  }

  /**
   * Add a node to the path
   * @param {string} pattern - Node pattern (* for any)
   * @param {Object<string, any>} [constraints] - Node constraints
   * @returns {PathExpressionBuilder} This builder for chaining
   */
  node(pattern, constraints = {}) {
    let nodeStr = pattern;
    
    if (Object.keys(constraints).length > 0) {
      const constraintPairs = Object.entries(constraints)
        .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
        .join(',');
      nodeStr = `${pattern}{${constraintPairs}}`;
    }
    
    this.parts.push(nodeStr);
    return this;
  }

  /**
   * Add an outgoing edge
   * @param {string|null} [edgeType] - Edge type constraint
   * @param {Object<string, any>} [constraints] - Edge constraints
   * @returns {PathExpressionBuilder} This builder for chaining
   */
  to(edgeType = null, constraints = {}) {
    let arrow = '->';
    
    if (edgeType || Object.keys(constraints).length > 0) {
      let spec = edgeType || '';
      
      if (Object.keys(constraints).length > 0) {
        const constraintPairs = Object.entries(constraints)
          .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
          .join(',');
        spec = `${spec}{${constraintPairs}}`;
      }
      
      arrow = `-[${spec}]->`;
    }
    
    this.parts.push(arrow);
    return this;
  }

  /**
   * Add an incoming edge
   * @param {string|null} [edgeType] - Edge type constraint
   * @param {Object<string, any>} [constraints] - Edge constraints
   * @returns {PathExpressionBuilder} This builder for chaining
   */
  from(edgeType = null, constraints = {}) {
    let arrow = '<-';
    
    if (edgeType || Object.keys(constraints).length > 0) {
      let spec = edgeType || '';
      
      if (Object.keys(constraints).length > 0) {
        const constraintPairs = Object.entries(constraints)
          .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
          .join(',');
        spec = `${spec}{${constraintPairs}}`;
      }
      
      arrow = `<-[${spec}]-`;
    }
    
    this.parts.push(arrow);
    return this;
  }

  /**
   * Add a bidirectional edge
   * @param {string|null} [edgeType] - Edge type constraint
   * @param {Object<string, any>} [constraints] - Edge constraints
   * @returns {PathExpressionBuilder} This builder for chaining
   */
  both(edgeType = null, constraints = {}) {
    let arrow = '<->';
    
    if (edgeType || Object.keys(constraints).length > 0) {
      let spec = edgeType || '';
      
      if (Object.keys(constraints).length > 0) {
        const constraintPairs = Object.entries(constraints)
          .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
          .join(',');
        spec = `${spec}{${constraintPairs}}`;
      }
      
      arrow = `<-[${spec}]->`;
    }
    
    this.parts.push(arrow);
    return this;
  }

  /**
   * Add any intermediate node (wildcard)
   * @returns {PathExpressionBuilder} This builder for chaining
   */
  any() {
    this.parts.push('*');
    return this;
  }

  /**
   * Add variable length path segment
   * @param {number} [minHops=0] - Minimum hops
   * @param {number} [maxHops=Infinity] - Maximum hops
   * @returns {PathExpressionBuilder} This builder for chaining
   */
  anyPath(minHops = 0, maxHops = Infinity) {
    if (maxHops === Infinity) {
      this.parts.push('**');
    } else {
      this.parts.push(`**{${minHops},${maxHops}}`);
    }
    return this;
  }

  /**
   * Build the PathExpression
   * @returns {PathExpression} Built expression
   */
  build() {
    const pattern = this.parts.join('');
    return new PathExpression(pattern);
  }

  /**
   * Get pattern string without building
   * @returns {string} Pattern string
   */
  toString() {
    return this.parts.join('');
  }
}

// Performance tracking
const perfMetrics = {
  parseCount: 0,
  parseTimeTotal: 0,
  
  recordParse(duration) {
    this.parseCount++;
    this.parseTimeTotal += duration;
  },
  
  getAverageParseTime() {
    return this.parseCount > 0 ? this.parseTimeTotal / this.parseCount : 0;
  },
  
  reset() {
    this.parseCount = 0;
    this.parseTimeTotal = 0;
  }
};

// Export for testing/monitoring
export { perfMetrics };