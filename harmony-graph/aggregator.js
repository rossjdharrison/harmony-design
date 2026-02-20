/**
 * @fileoverview Aggregator - Aggregate query results (count, sum, avg, group by)
 * @module harmony-graph/aggregator
 * 
 * Provides aggregation operations for query results including:
 * - COUNT: Count matching nodes/edges
 * - SUM: Sum numeric properties
 * - AVG: Calculate average of numeric properties
 * - MIN/MAX: Find minimum/maximum values
 * - GROUP BY: Group results by property values
 * 
 * Related: See DESIGN_SYSTEM.md § Graph Query System
 */

/**
 * @typedef {Object} AggregationSpec
 * @property {'count'|'sum'|'avg'|'min'|'max'|'collect'} operation - Aggregation operation
 * @property {string} [property] - Property to aggregate (not needed for count)
 * @property {string} [alias] - Output alias for the aggregated value
 */

/**
 * @typedef {Object} GroupBySpec
 * @property {string[]} keys - Properties to group by
 * @property {AggregationSpec[]} aggregations - Aggregations to apply per group
 */

/**
 * @typedef {Object} AggregationResult
 * @property {*} value - Aggregated value
 * @property {number} count - Number of items aggregated
 * @property {Object} [groups] - Grouped results (if group by was used)
 */

/**
 * Aggregator for query results
 * Supports standard aggregation operations and grouping
 */
export class Aggregator {
  constructor() {
    /** @type {Map<string, Function>} */
    this.operations = new Map([
      ['count', this._count.bind(this)],
      ['sum', this._sum.bind(this)],
      ['avg', this._avg.bind(this)],
      ['min', this._min.bind(this)],
      ['max', this._max.bind(this)],
      ['collect', this._collect.bind(this)]
    ]);
  }

  /**
   * Aggregate a set of results
   * @param {Array<Object>} results - Query results to aggregate
   * @param {AggregationSpec} spec - Aggregation specification
   * @returns {AggregationResult} Aggregation result
   */
  aggregate(results, spec) {
    if (!results || results.length === 0) {
      return this._emptyResult(spec.operation);
    }

    const operation = this.operations.get(spec.operation);
    if (!operation) {
      throw new Error(`Unknown aggregation operation: ${spec.operation}`);
    }

    const value = operation(results, spec.property);
    
    return {
      value,
      count: results.length,
      operation: spec.operation,
      property: spec.property,
      alias: spec.alias || `${spec.operation}_${spec.property || 'result'}`
    };
  }

  /**
   * Aggregate with grouping
   * @param {Array<Object>} results - Query results to aggregate
   * @param {GroupBySpec} spec - Group by specification
   * @returns {Map<string, Object>} Grouped aggregation results
   */
  groupBy(results, spec) {
    if (!results || results.length === 0) {
      return new Map();
    }

    if (!spec.keys || spec.keys.length === 0) {
      throw new Error('Group by requires at least one key');
    }

    // Group results by key combination
    const groups = new Map();
    
    for (const item of results) {
      const groupKey = this._makeGroupKey(item, spec.keys);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey).push(item);
    }

    // Apply aggregations to each group
    const aggregatedGroups = new Map();
    
    for (const [groupKey, groupItems] of groups) {
      const groupResult = {
        key: this._parseGroupKey(groupKey, spec.keys),
        count: groupItems.length,
        aggregations: {}
      };

      // Apply each aggregation to the group
      for (const aggSpec of spec.aggregations) {
        const result = this.aggregate(groupItems, aggSpec);
        const alias = aggSpec.alias || `${aggSpec.operation}_${aggSpec.property || 'result'}`;
        groupResult.aggregations[alias] = result.value;
      }

      aggregatedGroups.set(groupKey, groupResult);
    }

    return aggregatedGroups;
  }

  /**
   * Apply multiple aggregations to results
   * @param {Array<Object>} results - Query results
   * @param {AggregationSpec[]} specs - Array of aggregation specifications
   * @returns {Object} Object with each aggregation result
   */
  multiAggregate(results, specs) {
    const aggregations = {};

    for (const spec of specs) {
      const result = this.aggregate(results, spec);
      const alias = spec.alias || `${spec.operation}_${spec.property || 'result'}`;
      aggregations[alias] = result.value;
    }

    return {
      count: results.length,
      aggregations
    };
  }

  /**
   * Count operation
   * @private
   */
  _count(results, property) {
    if (!property) {
      return results.length;
    }

    // Count non-null values of property
    return results.filter(item => {
      const value = this._getProperty(item, property);
      return value !== null && value !== undefined;
    }).length;
  }

  /**
   * Sum operation
   * @private
   */
  _sum(results, property) {
    if (!property) {
      throw new Error('Sum operation requires a property');
    }

    let sum = 0;
    let count = 0;

    for (const item of results) {
      const value = this._getProperty(item, property);
      if (typeof value === 'number' && !isNaN(value)) {
        sum += value;
        count++;
      }
    }

    return count === 0 ? null : sum;
  }

  /**
   * Average operation
   * @private
   */
  _avg(results, property) {
    if (!property) {
      throw new Error('Avg operation requires a property');
    }

    const sum = this._sum(results, property);
    if (sum === null) {
      return null;
    }

    const count = results.filter(item => {
      const value = this._getProperty(item, property);
      return typeof value === 'number' && !isNaN(value);
    }).length;

    return count === 0 ? null : sum / count;
  }

  /**
   * Minimum operation
   * @private
   */
  _min(results, property) {
    if (!property) {
      throw new Error('Min operation requires a property');
    }

    let min = null;

    for (const item of results) {
      const value = this._getProperty(item, property);
      if (typeof value === 'number' && !isNaN(value)) {
        if (min === null || value < min) {
          min = value;
        }
      }
    }

    return min;
  }

  /**
   * Maximum operation
   * @private
   */
  _max(results, property) {
    if (!property) {
      throw new Error('Max operation requires a property');
    }

    let max = null;

    for (const item of results) {
      const value = this._getProperty(item, property);
      if (typeof value === 'number' && !isNaN(value)) {
        if (max === null || value > max) {
          max = value;
        }
      }
    }

    return max;
  }

  /**
   * Collect operation - collect all values into array
   * @private
   */
  _collect(results, property) {
    if (!property) {
      return results;
    }

    return results
      .map(item => this._getProperty(item, property))
      .filter(value => value !== null && value !== undefined);
  }

  /**
   * Get property value from item (supports nested properties)
   * @private
   */
  _getProperty(item, property) {
    if (!property) {
      return item;
    }

    // Support nested properties like "properties.weight"
    const parts = property.split('.');
    let value = item;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Create a group key from item and key properties
   * @private
   */
  _makeGroupKey(item, keys) {
    const values = keys.map(key => {
      const value = this._getProperty(item, key);
      return value === null || value === undefined ? '__null__' : String(value);
    });
    return values.join('|');
  }

  /**
   * Parse group key back into object
   * @private
   */
  _parseGroupKey(groupKey, keys) {
    const values = groupKey.split('|');
    const result = {};

    for (let i = 0; i < keys.length; i++) {
      const value = values[i];
      result[keys[i]] = value === '__null__' ? null : value;
    }

    return result;
  }

  /**
   * Get empty result for operation
   * @private
   */
  _emptyResult(operation) {
    const emptyValues = {
      count: 0,
      sum: null,
      avg: null,
      min: null,
      max: null,
      collect: []
    };

    return {
      value: emptyValues[operation] ?? null,
      count: 0,
      operation
    };
  }

  /**
   * Validate aggregation specification
   * @param {AggregationSpec} spec - Specification to validate
   * @returns {boolean} True if valid
   * @throws {Error} If specification is invalid
   */
  validateSpec(spec) {
    if (!spec.operation) {
      throw new Error('Aggregation spec requires operation');
    }

    if (!this.operations.has(spec.operation)) {
      throw new Error(`Unknown operation: ${spec.operation}`);
    }

    const requiresProperty = ['sum', 'avg', 'min', 'max'];
    if (requiresProperty.includes(spec.operation) && !spec.property) {
      throw new Error(`Operation ${spec.operation} requires a property`);
    }

    return true;
  }

  /**
   * Validate group by specification
   * @param {GroupBySpec} spec - Specification to validate
   * @returns {boolean} True if valid
   * @throws {Error} If specification is invalid
   */
  validateGroupBySpec(spec) {
    if (!spec.keys || !Array.isArray(spec.keys) || spec.keys.length === 0) {
      throw new Error('Group by spec requires at least one key');
    }

    if (!spec.aggregations || !Array.isArray(spec.aggregations)) {
      throw new Error('Group by spec requires aggregations array');
    }

    for (const aggSpec of spec.aggregations) {
      this.validateSpec(aggSpec);
    }

    return true;
  }
}

/**
 * Create a new aggregator instance
 * @returns {Aggregator}
 */
export function createAggregator() {
  return new Aggregator();
}