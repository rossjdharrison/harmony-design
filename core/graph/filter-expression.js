/**
 * @fileoverview FilterExpression: Filter nodes/edges by property predicates
 * 
 * Provides a declarative system for filtering graph elements based on property
 * values, supporting comparison operators, logical operators, and complex predicates.
 * 
 * Performance targets:
 * - Filter evaluation: <1ms per 1000 elements
 * - Memory overhead: <100 bytes per filter expression
 * 
 * Related: harmony-design/DESIGN_SYSTEM.md#graph-query-system
 * 
 * @module core/graph/filter-expression
 */

/**
 * Comparison operators for property predicates
 * @enum {string}
 */
export const ComparisonOperator = {
  EQUALS: 'eq',
  NOT_EQUALS: 'ne',
  GREATER_THAN: 'gt',
  GREATER_THAN_OR_EQUAL: 'gte',
  LESS_THAN: 'lt',
  LESS_THAN_OR_EQUAL: 'lte',
  IN: 'in',
  NOT_IN: 'not_in',
  CONTAINS: 'contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  MATCHES: 'matches', // regex match
  EXISTS: 'exists',
  NOT_EXISTS: 'not_exists'
};

/**
 * Logical operators for combining predicates
 * @enum {string}
 */
export const LogicalOperator = {
  AND: 'and',
  OR: 'or',
  NOT: 'not'
};

/**
 * Base class for filter expressions
 * @abstract
 */
export class FilterExpression {
  /**
   * Evaluate the filter against an element
   * @param {Object} element - Node or edge to filter
   * @returns {boolean} True if element matches filter
   * @abstract
   */
  evaluate(element) {
    throw new Error('FilterExpression.evaluate must be implemented by subclass');
  }

  /**
   * Get filter complexity score for optimization
   * @returns {number} Complexity score (higher = more expensive)
   */
  getComplexity() {
    return 1;
  }

  /**
   * Convert filter to serializable JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    throw new Error('FilterExpression.toJSON must be implemented by subclass');
  }

  /**
   * Create filter from JSON representation
   * @param {Object} json - JSON representation
   * @returns {FilterExpression} Filter instance
   */
  static fromJSON(json) {
    switch (json.type) {
      case 'property':
        return PropertyPredicate.fromJSON(json);
      case 'logical':
        return LogicalExpression.fromJSON(json);
      case 'composite':
        return CompositeFilter.fromJSON(json);
      default:
        throw new Error(`Unknown filter type: ${json.type}`);
    }
  }
}

/**
 * Property predicate for comparing element properties
 */
export class PropertyPredicate extends FilterExpression {
  /**
   * @param {string} property - Property path (supports dot notation)
   * @param {ComparisonOperator} operator - Comparison operator
   * @param {*} value - Value to compare against
   */
  constructor(property, operator, value) {
    super();
    this.property = property;
    this.operator = operator;
    this.value = value;
  }

  /**
   * Get property value from element using dot notation
   * @private
   * @param {Object} element - Element to extract from
   * @returns {*} Property value or undefined
   */
  _getPropertyValue(element) {
    const parts = this.property.split('.');
    let current = element;
    
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    
    return current;
  }

  /**
   * @override
   */
  evaluate(element) {
    const actualValue = this._getPropertyValue(element);
    
    switch (this.operator) {
      case ComparisonOperator.EQUALS:
        return actualValue === this.value;
      
      case ComparisonOperator.NOT_EQUALS:
        return actualValue !== this.value;
      
      case ComparisonOperator.GREATER_THAN:
        return actualValue > this.value;
      
      case ComparisonOperator.GREATER_THAN_OR_EQUAL:
        return actualValue >= this.value;
      
      case ComparisonOperator.LESS_THAN:
        return actualValue < this.value;
      
      case ComparisonOperator.LESS_THAN_OR_EQUAL:
        return actualValue <= this.value;
      
      case ComparisonOperator.IN:
        return Array.isArray(this.value) && this.value.includes(actualValue);
      
      case ComparisonOperator.NOT_IN:
        return Array.isArray(this.value) && !this.value.includes(actualValue);
      
      case ComparisonOperator.CONTAINS:
        if (typeof actualValue === 'string') {
          return actualValue.includes(this.value);
        }
        if (Array.isArray(actualValue)) {
          return actualValue.includes(this.value);
        }
        return false;
      
      case ComparisonOperator.STARTS_WITH:
        return typeof actualValue === 'string' && actualValue.startsWith(this.value);
      
      case ComparisonOperator.ENDS_WITH:
        return typeof actualValue === 'string' && actualValue.endsWith(this.value);
      
      case ComparisonOperator.MATCHES:
        if (typeof actualValue !== 'string') return false;
        const regex = new RegExp(this.value);
        return regex.test(actualValue);
      
      case ComparisonOperator.EXISTS:
        return actualValue !== undefined && actualValue !== null;
      
      case ComparisonOperator.NOT_EXISTS:
        return actualValue === undefined || actualValue === null;
      
      default:
        throw new Error(`Unknown operator: ${this.operator}`);
    }
  }

  /**
   * @override
   */
  getComplexity() {
    // Regex matching is most expensive
    if (this.operator === ComparisonOperator.MATCHES) return 10;
    // String operations are moderately expensive
    if ([ComparisonOperator.CONTAINS, ComparisonOperator.STARTS_WITH, 
         ComparisonOperator.ENDS_WITH].includes(this.operator)) return 3;
    // Simple comparisons are cheap
    return 1;
  }

  /**
   * @override
   */
  toJSON() {
    return {
      type: 'property',
      property: this.property,
      operator: this.operator,
      value: this.value
    };
  }

  /**
   * @override
   */
  static fromJSON(json) {
    return new PropertyPredicate(json.property, json.operator, json.value);
  }
}

/**
 * Logical expression for combining multiple filters
 */
export class LogicalExpression extends FilterExpression {
  /**
   * @param {LogicalOperator} operator - Logical operator
   * @param {FilterExpression[]} operands - Filter expressions to combine
   */
  constructor(operator, operands) {
    super();
    this.operator = operator;
    this.operands = operands;
  }

  /**
   * @override
   */
  evaluate(element) {
    switch (this.operator) {
      case LogicalOperator.AND:
        return this.operands.every(operand => operand.evaluate(element));
      
      case LogicalOperator.OR:
        return this.operands.some(operand => operand.evaluate(element));
      
      case LogicalOperator.NOT:
        if (this.operands.length !== 1) {
          throw new Error('NOT operator requires exactly one operand');
        }
        return !this.operands[0].evaluate(element);
      
      default:
        throw new Error(`Unknown logical operator: ${this.operator}`);
    }
  }

  /**
   * @override
   */
  getComplexity() {
    const operandComplexity = this.operands.reduce(
      (sum, op) => sum + op.getComplexity(), 
      0
    );
    return operandComplexity + 1;
  }

  /**
   * @override
   */
  toJSON() {
    return {
      type: 'logical',
      operator: this.operator,
      operands: this.operands.map(op => op.toJSON())
    };
  }

  /**
   * @override
   */
  static fromJSON(json) {
    const operands = json.operands.map(op => FilterExpression.fromJSON(op));
    return new LogicalExpression(json.operator, operands);
  }
}

/**
 * Composite filter combining multiple filters with optimization
 */
export class CompositeFilter extends FilterExpression {
  /**
   * @param {FilterExpression[]} filters - Filters to combine
   * @param {boolean} optimizeOrder - Whether to optimize filter order
   */
  constructor(filters, optimizeOrder = true) {
    super();
    this.filters = optimizeOrder ? this._optimizeFilters(filters) : filters;
  }

  /**
   * Optimize filter order by complexity (cheap filters first)
   * @private
   * @param {FilterExpression[]} filters - Filters to optimize
   * @returns {FilterExpression[]} Optimized filters
   */
  _optimizeFilters(filters) {
    return [...filters].sort((a, b) => a.getComplexity() - b.getComplexity());
  }

  /**
   * @override
   */
  evaluate(element) {
    // Short-circuit on first failure (AND semantics)
    return this.filters.every(filter => filter.evaluate(element));
  }

  /**
   * @override
   */
  getComplexity() {
    return this.filters.reduce((sum, f) => sum + f.getComplexity(), 0);
  }

  /**
   * @override
   */
  toJSON() {
    return {
      type: 'composite',
      filters: this.filters.map(f => f.toJSON())
    };
  }

  /**
   * @override
   */
  static fromJSON(json) {
    const filters = json.filters.map(f => FilterExpression.fromJSON(f));
    return new CompositeFilter(filters, false); // Already optimized
  }
}

/**
 * Filter builder for fluent API
 */
export class FilterBuilder {
  constructor() {
    this.filters = [];
  }

  /**
   * Add property predicate
   * @param {string} property - Property path
   * @param {ComparisonOperator} operator - Comparison operator
   * @param {*} value - Value to compare
   * @returns {FilterBuilder} This builder for chaining
   */
  where(property, operator, value) {
    this.filters.push(new PropertyPredicate(property, operator, value));
    return this;
  }

  /**
   * Add equals predicate (shorthand)
   * @param {string} property - Property path
   * @param {*} value - Value to compare
   * @returns {FilterBuilder} This builder for chaining
   */
  equals(property, value) {
    return this.where(property, ComparisonOperator.EQUALS, value);
  }

  /**
   * Add AND logical expression
   * @param {...FilterExpression} filters - Filters to combine with AND
   * @returns {FilterBuilder} This builder for chaining
   */
  and(...filters) {
    this.filters.push(new LogicalExpression(LogicalOperator.AND, filters));
    return this;
  }

  /**
   * Add OR logical expression
   * @param {...FilterExpression} filters - Filters to combine with OR
   * @returns {FilterBuilder} This builder for chaining
   */
  or(...filters) {
    this.filters.push(new LogicalExpression(LogicalOperator.OR, filters));
    return this;
  }

  /**
   * Add NOT logical expression
   * @param {FilterExpression} filter - Filter to negate
   * @returns {FilterBuilder} This builder for chaining
   */
  not(filter) {
    this.filters.push(new LogicalExpression(LogicalOperator.NOT, [filter]));
    return this;
  }

  /**
   * Build final filter expression
   * @returns {FilterExpression} Composite filter
   */
  build() {
    if (this.filters.length === 0) {
      throw new Error('No filters added to builder');
    }
    if (this.filters.length === 1) {
      return this.filters[0];
    }
    return new CompositeFilter(this.filters);
  }
}

/**
 * Apply filter to collection of elements
 * @param {FilterExpression} filter - Filter to apply
 * @param {Iterable} elements - Elements to filter
 * @returns {Array} Filtered elements
 */
export function applyFilter(filter, elements) {
  const results = [];
  for (const element of elements) {
    if (filter.evaluate(element)) {
      results.push(element);
    }
  }
  return results;
}

/**
 * Create filter from simple object notation
 * @param {Object} spec - Filter specification
 * @returns {FilterExpression} Filter expression
 * @example
 * createFilter({ type: 'AudioNode', 'properties.gain': { gte: 0.5 } })
 */
export function createFilter(spec) {
  const builder = new FilterBuilder();
  
  for (const [key, value] of Object.entries(spec)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Object with operators: { gte: 0.5, lte: 1.0 }
      for (const [op, val] of Object.entries(value)) {
        builder.where(key, op, val);
      }
    } else {
      // Simple equality: { type: 'AudioNode' }
      builder.equals(key, value);
    }
  }
  
  return builder.build();
}