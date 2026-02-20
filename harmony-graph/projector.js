/**
 * @fileoverview Projector: Projects specific fields from query results
 * @module harmony-graph/projector
 * 
 * Implements field projection for query results, allowing selection of specific
 * properties from nodes and edges. Supports dot notation for nested properties,
 * computed fields, and field aliasing.
 * 
 * Related Documentation: {@link file://./DESIGN_SYSTEM.md#graph-query-system}
 * Related Files:
 * - {@link file://./harmony-graph/query-executor.js} - Query execution
 * - {@link file://./harmony-graph/aggregator.js} - Result aggregation
 * - {@link file://./harmony-graph/filter-expression.js} - Result filtering
 * 
 * Performance Budget:
 * - Projection: <1ms per 1000 results
 * - Memory: O(n*m) where n=results, m=projected fields
 * 
 * @example
 * const projector = new Projector();
 * const results = projector.project(queryResults, {
 *   fields: ['id', 'properties.name', 'properties.email'],
 *   aliases: { 'properties.name': 'name', 'properties.email': 'email' }
 * });
 */

/**
 * @typedef {Object} ProjectionSpec
 * @property {string[]} fields - Fields to project (supports dot notation)
 * @property {Object<string, string>} [aliases] - Field name aliases
 * @property {Object<string, Function>} [computed] - Computed field functions
 * @property {boolean} [includeMetadata] - Include metadata fields (_type, _id)
 */

/**
 * @typedef {Object} ProjectionResult
 * @property {Array<Object>} data - Projected data
 * @property {string[]} fields - List of projected field names
 * @property {number} count - Number of results
 * @property {number} projectionTimeMs - Time taken for projection
 */

/**
 * Projects specific fields from query results
 */
export class Projector {
  constructor() {
    /** @type {Map<string, Function>} */
    this.fieldAccessorCache = new Map();
  }

  /**
   * Projects fields from query results
   * @param {Array<Object>} results - Query results to project
   * @param {ProjectionSpec} spec - Projection specification
   * @returns {ProjectionResult} Projected results
   */
  project(results, spec) {
    const startTime = performance.now();

    if (!Array.isArray(results)) {
      throw new Error('Results must be an array');
    }

    if (!spec || !spec.fields || !Array.isArray(spec.fields)) {
      throw new Error('Projection spec must include fields array');
    }

    const projectedData = results.map(item => 
      this._projectItem(item, spec)
    );

    const projectionTimeMs = performance.now() - startTime;

    return {
      data: projectedData,
      fields: this._getOutputFieldNames(spec),
      count: projectedData.length,
      projectionTimeMs
    };
  }

  /**
   * Projects fields from a single item
   * @private
   * @param {Object} item - Item to project
   * @param {ProjectionSpec} spec - Projection specification
   * @returns {Object} Projected item
   */
  _projectItem(item, spec) {
    const projected = {};

    // Include metadata if requested
    if (spec.includeMetadata) {
      if (item._type) projected._type = item._type;
      if (item._id) projected._id = item._id;
    }

    // Project regular fields
    for (const field of spec.fields) {
      const value = this._getFieldValue(item, field);
      const outputName = spec.aliases?.[field] || field;
      projected[outputName] = value;
    }

    // Add computed fields
    if (spec.computed) {
      for (const [fieldName, computeFn] of Object.entries(spec.computed)) {
        try {
          projected[fieldName] = computeFn(item, projected);
        } catch (error) {
          console.warn(`Error computing field ${fieldName}:`, error);
          projected[fieldName] = null;
        }
      }
    }

    return projected;
  }

  /**
   * Gets a field value from an item using dot notation
   * @private
   * @param {Object} item - Item to get value from
   * @param {string} fieldPath - Field path (supports dot notation)
   * @returns {*} Field value or undefined
   */
  _getFieldValue(item, fieldPath) {
    // Check cache for accessor function
    let accessor = this.fieldAccessorCache.get(fieldPath);
    
    if (!accessor) {
      accessor = this._createFieldAccessor(fieldPath);
      this.fieldAccessorCache.set(fieldPath, accessor);
    }

    return accessor(item);
  }

  /**
   * Creates a field accessor function for a given path
   * @private
   * @param {string} fieldPath - Field path (supports dot notation)
   * @returns {Function} Accessor function
   */
  _createFieldAccessor(fieldPath) {
    const parts = fieldPath.split('.');
    
    return (item) => {
      let value = item;
      for (const part of parts) {
        if (value === null || value === undefined) {
          return undefined;
        }
        value = value[part];
      }
      return value;
    };
  }

  /**
   * Gets the list of output field names after aliasing
   * @private
   * @param {ProjectionSpec} spec - Projection specification
   * @returns {string[]} Output field names
   */
  _getOutputFieldNames(spec) {
    const fields = [...spec.fields];
    
    if (spec.aliases) {
      for (let i = 0; i < fields.length; i++) {
        if (spec.aliases[fields[i]]) {
          fields[i] = spec.aliases[fields[i]];
        }
      }
    }

    if (spec.computed) {
      fields.push(...Object.keys(spec.computed));
    }

    if (spec.includeMetadata) {
      fields.unshift('_type', '_id');
    }

    return fields;
  }

  /**
   * Projects fields with wildcard support
   * @param {Array<Object>} results - Query results
   * @param {string[]} patterns - Field patterns (supports * wildcard)
   * @param {Object} [options] - Additional options
   * @returns {ProjectionResult} Projected results
   */
  projectWithPatterns(results, patterns, options = {}) {
    if (!Array.isArray(results) || results.length === 0) {
      return {
        data: [],
        fields: [],
        count: 0,
        projectionTimeMs: 0
      };
    }

    const startTime = performance.now();

    // Expand patterns based on first item structure
    const expandedFields = this._expandPatterns(results[0], patterns);

    const spec = {
      fields: expandedFields,
      aliases: options.aliases,
      computed: options.computed,
      includeMetadata: options.includeMetadata
    };

    const result = this.project(results, spec);
    result.projectionTimeMs = performance.now() - startTime;

    return result;
  }

  /**
   * Expands field patterns with wildcards
   * @private
   * @param {Object} sample - Sample object to extract fields from
   * @param {string[]} patterns - Field patterns
   * @returns {string[]} Expanded field list
   */
  _expandPatterns(sample, patterns) {
    const expanded = new Set();

    for (const pattern of patterns) {
      if (pattern === '*') {
        // Top-level wildcard
        Object.keys(sample).forEach(key => {
          if (!key.startsWith('_')) {
            expanded.add(key);
          }
        });
      } else if (pattern.includes('*')) {
        // Nested wildcard (e.g., properties.*)
        const parts = pattern.split('.');
        const wildcardIndex = parts.indexOf('*');
        const prefix = parts.slice(0, wildcardIndex).join('.');
        
        let obj = sample;
        for (const part of parts.slice(0, wildcardIndex)) {
          obj = obj?.[part];
        }

        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            if (!key.startsWith('_')) {
              const fullPath = prefix ? `${prefix}.${key}` : key;
              expanded.add(fullPath);
            }
          });
        }
      } else {
        // Regular field
        expanded.add(pattern);
      }
    }

    return Array.from(expanded);
  }

  /**
   * Projects fields and flattens nested structures
   * @param {Array<Object>} results - Query results
   * @param {Object} [options] - Projection options
   * @returns {ProjectionResult} Flattened projected results
   */
  projectFlattened(results, options = {}) {
    const startTime = performance.now();

    const flattenedData = results.map(item => 
      this._flattenItem(item, options.prefix || '', options.maxDepth || 3)
    );

    const fields = flattenedData.length > 0 
      ? Object.keys(flattenedData[0]) 
      : [];

    return {
      data: flattenedData,
      fields,
      count: flattenedData.length,
      projectionTimeMs: performance.now() - startTime
    };
  }

  /**
   * Flattens a nested item into a flat structure
   * @private
   * @param {Object} item - Item to flatten
   * @param {string} prefix - Current prefix for keys
   * @param {number} maxDepth - Maximum depth to flatten
   * @param {number} [currentDepth=0] - Current depth
   * @returns {Object} Flattened item
   */
  _flattenItem(item, prefix, maxDepth, currentDepth = 0) {
    const flattened = {};

    if (currentDepth >= maxDepth || typeof item !== 'object' || item === null) {
      return { [prefix]: item };
    }

    for (const [key, value] of Object.entries(item)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(
          flattened,
          this._flattenItem(value, newKey, maxDepth, currentDepth + 1)
        );
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Projects fields with type conversion
   * @param {Array<Object>} results - Query results
   * @param {Object<string, string>} typeMap - Field to type mapping
   * @param {ProjectionSpec} spec - Projection specification
   * @returns {ProjectionResult} Type-converted projected results
   */
  projectWithTypes(results, typeMap, spec) {
    const projected = this.project(results, spec);

    projected.data = projected.data.map(item => {
      const converted = { ...item };
      
      for (const [field, type] of Object.entries(typeMap)) {
        if (field in converted) {
          converted[field] = this._convertType(converted[field], type);
        }
      }

      return converted;
    });

    return projected;
  }

  /**
   * Converts a value to a specific type
   * @private
   * @param {*} value - Value to convert
   * @param {string} type - Target type
   * @returns {*} Converted value
   */
  _convertType(value, type) {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type.toLowerCase()) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'json':
        return typeof value === 'string' ? JSON.parse(value) : value;
      default:
        return value;
    }
  }

  /**
   * Clears the field accessor cache
   */
  clearCache() {
    this.fieldAccessorCache.clear();
  }
}

/**
 * Creates a projection specification builder
 * @returns {ProjectionBuilder} Builder instance
 */
export function createProjection() {
  return new ProjectionBuilder();
}

/**
 * Fluent builder for projection specifications
 */
export class ProjectionBuilder {
  constructor() {
    /** @type {ProjectionSpec} */
    this.spec = {
      fields: [],
      aliases: {},
      computed: {},
      includeMetadata: false
    };
  }

  /**
   * Adds fields to project
   * @param {...string} fields - Fields to add
   * @returns {ProjectionBuilder} This builder
   */
  fields(...fields) {
    this.spec.fields.push(...fields);
    return this;
  }

  /**
   * Adds a field alias
   * @param {string} field - Original field name
   * @param {string} alias - Alias name
   * @returns {ProjectionBuilder} This builder
   */
  alias(field, alias) {
    this.spec.aliases[field] = alias;
    return this;
  }

  /**
   * Adds a computed field
   * @param {string} name - Computed field name
   * @param {Function} computeFn - Compute function
   * @returns {ProjectionBuilder} This builder
   */
  computed(name, computeFn) {
    this.spec.computed[name] = computeFn;
    return this;
  }

  /**
   * Includes metadata fields
   * @returns {ProjectionBuilder} This builder
   */
  withMetadata() {
    this.spec.includeMetadata = true;
    return this;
  }

  /**
   * Builds the projection specification
   * @returns {ProjectionSpec} Projection specification
   */
  build() {
    return { ...this.spec };
  }
}