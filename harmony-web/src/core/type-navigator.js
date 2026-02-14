/**
 * @fileoverview TypeNavigator for type-safe data queries in Harmony Design System.
 * Provides compile-time type safety through generated schemas.
 * See DESIGN_SYSTEM.md#type-navigator for usage patterns.
 */

/**
 * @typedef {Object} QueryResult
 * @property {boolean} success - Whether query succeeded
 * @property {*} data - Query result data
 * @property {string} [error] - Error message if query failed
 */

/**
 * @typedef {Object} SchemaDefinition
 * @property {string} name - Schema name
 * @property {Object} fields - Field definitions
 * @property {Object} [methods] - Available query methods
 */

/**
 * Type-safe query interface for Harmony Design System.
 * Uses generated schemas from harmony-schemas for compile-time safety.
 * 
 * @class TypeNavigator
 * @example
 * // Query audio track metadata
 * const result = TypeNavigator.query('AudioTrack', { id: '123' })
 *   .select(['title', 'duration', 'artist'])
 *   .execute();
 */
class TypeNavigator {
  /**
   * Creates a TypeNavigator instance.
   * @constructor
   */
  constructor() {
    /** @private @type {Map<string, SchemaDefinition>} */
    this.schemas = new Map();
    
    /** @private @type {boolean} */
    this.strictMode = true;
  }

  /**
   * Registers a schema definition.
   * 
   * @param {string} schemaName - Name of the schema
   * @param {SchemaDefinition} definition - Schema definition
   * @throws {Error} If schema name already registered
   * 
   * @example
   * TypeNavigator.registerSchema('AudioTrack', {
   *   name: 'AudioTrack',
   *   fields: {
   *     id: { type: 'string', required: true },
   *     title: { type: 'string', required: true },
   *     duration: { type: 'number', required: true }
   *   }
   * });
   */
  registerSchema(schemaName, definition) {
    if (this.schemas.has(schemaName)) {
      throw new Error(`Schema ${schemaName} already registered`);
    }
    this.schemas.set(schemaName, definition);
  }

  /**
   * Creates a query builder for a schema.
   * 
   * @param {string} schemaName - Name of schema to query
   * @param {Object} [criteria={}] - Query criteria
   * @returns {QueryBuilder} Query builder instance
   * @throws {Error} If schema not found
   * 
   * @example
   * const query = TypeNavigator.query('AudioTrack', { artist: 'Beethoven' })
   *   .select(['title', 'duration'])
   *   .orderBy('title');
   */
  query(schemaName, criteria = {}) {
    if (!this.schemas.has(schemaName)) {
      throw new Error(`Schema ${schemaName} not found. Available schemas: ${Array.from(this.schemas.keys()).join(', ')}`);
    }

    return new QueryBuilder(schemaName, this.schemas.get(schemaName), criteria, this.strictMode);
  }

  /**
   * Validates data against a schema.
   * 
   * @param {string} schemaName - Name of schema
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result with success flag and errors
   * 
   * @example
   * const validation = TypeNavigator.validate('AudioTrack', {
   *   id: '123',
   *   title: 'Symphony No. 5'
   * });
   * if (!validation.success) {
   *   console.error('Validation errors:', validation.errors);
   * }
   */
  validate(schemaName, data) {
    if (!this.schemas.has(schemaName)) {
      return {
        success: false,
        errors: [`Schema ${schemaName} not found`]
      };
    }

    const schema = this.schemas.get(schemaName);
    const errors = [];

    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      if (fieldDef.required && !(fieldName in data)) {
        errors.push(`Required field ${fieldName} is missing`);
      }

      if (fieldName in data) {
        const value = data[fieldName];
        const expectedType = fieldDef.type;
        const actualType = typeof value;

        if (actualType !== expectedType) {
          errors.push(`Field ${fieldName} expected ${expectedType} but got ${actualType}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Gets schema definition.
   * 
   * @param {string} schemaName - Name of schema
   * @returns {SchemaDefinition|null} Schema definition or null if not found
   * 
   * @example
   * const schema = TypeNavigator.getSchema('AudioTrack');
   * console.log('Available fields:', Object.keys(schema.fields));
   */
  getSchema(schemaName) {
    return this.schemas.get(schemaName) || null;
  }

  /**
   * Lists all registered schemas.
   * 
   * @returns {Array<string>} Array of schema names
   * 
   * @example
   * const schemas = TypeNavigator.listSchemas();
   * console.log('Available schemas:', schemas);
   */
  listSchemas() {
    return Array.from(this.schemas.keys());
  }

  /**
   * Sets strict mode for type checking.
   * 
   * @param {boolean} enabled - Whether to enable strict mode
   * 
   * @example
   * TypeNavigator.setStrictMode(false); // Allow type coercion
   */
  setStrictMode(enabled) {
    this.strictMode = enabled;
  }
}

/**
 * Query builder for constructing type-safe queries.
 * 
 * @class QueryBuilder
 */
class QueryBuilder {
  /**
   * Creates a QueryBuilder instance.
   * @constructor
   * @param {string} schemaName - Schema name
   * @param {SchemaDefinition} schema - Schema definition
   * @param {Object} criteria - Query criteria
   * @param {boolean} strictMode - Strict type checking
   */
  constructor(schemaName, schema, criteria, strictMode) {
    /** @private */
    this.schemaName = schemaName;
    /** @private */
    this.schema = schema;
    /** @private */
    this.criteria = criteria;
    /** @private */
    this.strictMode = strictMode;
    /** @private */
    this.selectedFields = null;
    /** @private */
    this.orderByField = null;
    /** @private */
    this.orderDirection = 'asc';
    /** @private */
    this.limitValue = null;
  }

  /**
   * Selects specific fields to return.
   * 
   * @param {Array<string>} fields - Field names to select
   * @returns {QueryBuilder} This query builder for chaining
   * @throws {Error} If field not in schema
   * 
   * @example
   * query.select(['title', 'duration']);
   */
  select(fields) {
    if (this.strictMode) {
      for (const field of fields) {
        if (!(field in this.schema.fields)) {
          throw new Error(`Field ${field} not found in schema ${this.schemaName}`);
        }
      }
    }
    this.selectedFields = fields;
    return this;
  }

  /**
   * Orders results by a field.
   * 
   * @param {string} field - Field to order by
   * @param {string} [direction='asc'] - Sort direction ('asc' or 'desc')
   * @returns {QueryBuilder} This query builder for chaining
   * 
   * @example
   * query.orderBy('title', 'desc');
   */
  orderBy(field, direction = 'asc') {
    if (this.strictMode && !(field in this.schema.fields)) {
      throw new Error(`Field ${field} not found in schema ${this.schemaName}`);
    }
    this.orderByField = field;
    this.orderDirection = direction;
    return this;
  }

  /**
   * Limits number of results.
   * 
   * @param {number} limit - Maximum number of results
   * @returns {QueryBuilder} This query builder for chaining
   * 
   * @example
   * query.limit(10);
   */
  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  /**
   * Executes the query.
   * 
   * @returns {QueryResult} Query result
   * 
   * @example
   * const result = query.execute();
   * if (result.success) {
   *   console.log('Data:', result.data);
   * }
   */
  execute() {
    // This is a placeholder - actual implementation would query WASM modules
    return {
      success: true,
      data: null,
      query: {
        schema: this.schemaName,
        criteria: this.criteria,
        fields: this.selectedFields,
        orderBy: this.orderByField,
        orderDirection: this.orderDirection,
        limit: this.limitValue
      }
    };
  }
}

// Singleton instance
const typeNavigatorInstance = new TypeNavigator();

export default typeNavigatorInstance;