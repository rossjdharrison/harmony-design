/**
 * @fileoverview Minimal Zod-like validation library for runtime validation
 * @module core/validation/zod-lite
 * 
 * Provides a lightweight, zero-dependency validation system following Zod's API patterns.
 * Used for runtime validation of events, tokens, and component properties.
 * 
 * Related: See DESIGN_SYSTEM.md § Validation System
 */

/**
 * Base validation error class
 */
export class ValidationError extends Error {
  constructor(message, path = [], issues = []) {
    super(message);
    this.name = 'ValidationError';
    this.path = path;
    this.issues = issues;
  }
}

/**
 * Base schema class
 */
class Schema {
  constructor() {
    this._optional = false;
    this._nullable = false;
    this._default = undefined;
  }

  /**
   * Parse and validate data, throwing on error
   * @param {*} data - Data to validate
   * @returns {*} Validated data
   * @throws {ValidationError}
   */
  parse(data) {
    const result = this.safeParse(data);
    if (!result.success) {
      throw new ValidationError(
        `Validation failed: ${result.error.issues.map(i => i.message).join(', ')}`,
        [],
        result.error.issues
      );
    }
    return result.data;
  }

  /**
   * Parse and validate data, returning result object
   * @param {*} data - Data to validate
   * @returns {{success: boolean, data?: *, error?: {issues: Array}}}
   */
  safeParse(data) {
    // Handle optional
    if (data === undefined && this._optional) {
      return { success: true, data: this._default };
    }

    // Handle nullable
    if (data === null && this._nullable) {
      return { success: true, data: null };
    }

    return this._validate(data);
  }

  /**
   * Internal validation method - override in subclasses
   * @protected
   */
  _validate(data) {
    return { success: true, data };
  }

  /**
   * Mark schema as optional
   */
  optional() {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._optional = true;
    return clone;
  }

  /**
   * Mark schema as nullable
   */
  nullable() {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._nullable = true;
    return clone;
  }

  /**
   * Set default value for optional fields
   */
  default(value) {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._optional = true;
    clone._default = value;
    return clone;
  }
}

/**
 * String schema
 */
class StringSchema extends Schema {
  constructor() {
    super();
    this._minLength = null;
    this._maxLength = null;
    this._pattern = null;
  }

  _validate(data) {
    if (typeof data !== 'string') {
      return {
        success: false,
        error: { issues: [{ message: 'Expected string', path: [] }] }
      };
    }

    if (this._minLength !== null && data.length < this._minLength) {
      return {
        success: false,
        error: { issues: [{ message: `String must be at least ${this._minLength} characters`, path: [] }] }
      };
    }

    if (this._maxLength !== null && data.length > this._maxLength) {
      return {
        success: false,
        error: { issues: [{ message: `String must be at most ${this._maxLength} characters`, path: [] }] }
      };
    }

    if (this._pattern && !this._pattern.test(data)) {
      return {
        success: false,
        error: { issues: [{ message: 'String does not match pattern', path: [] }] }
      };
    }

    return { success: true, data };
  }

  min(length) {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._minLength = length;
    return clone;
  }

  max(length) {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._maxLength = length;
    return clone;
  }

  regex(pattern) {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._pattern = pattern;
    return clone;
  }
}

/**
 * Number schema
 */
class NumberSchema extends Schema {
  constructor() {
    super();
    this._min = null;
    this._max = null;
    this._integer = false;
  }

  _validate(data) {
    if (typeof data !== 'number' || isNaN(data)) {
      return {
        success: false,
        error: { issues: [{ message: 'Expected number', path: [] }] }
      };
    }

    if (this._integer && !Number.isInteger(data)) {
      return {
        success: false,
        error: { issues: [{ message: 'Expected integer', path: [] }] }
      };
    }

    if (this._min !== null && data < this._min) {
      return {
        success: false,
        error: { issues: [{ message: `Number must be at least ${this._min}`, path: [] }] }
      };
    }

    if (this._max !== null && data > this._max) {
      return {
        success: false,
        error: { issues: [{ message: `Number must be at most ${this._max}`, path: [] }] }
      };
    }

    return { success: true, data };
  }

  min(value) {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._min = value;
    return clone;
  }

  max(value) {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._max = value;
    return clone;
  }

  int() {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._integer = true;
    return clone;
  }
}

/**
 * Boolean schema
 */
class BooleanSchema extends Schema {
  _validate(data) {
    if (typeof data !== 'boolean') {
      return {
        success: false,
        error: { issues: [{ message: 'Expected boolean', path: [] }] }
      };
    }
    return { success: true, data };
  }
}

/**
 * Literal schema
 */
class LiteralSchema extends Schema {
  constructor(value) {
    super();
    this._value = value;
  }

  _validate(data) {
    if (data !== this._value) {
      return {
        success: false,
        error: { issues: [{ message: `Expected literal value: ${this._value}`, path: [] }] }
      };
    }
    return { success: true, data };
  }
}

/**
 * Enum schema
 */
class EnumSchema extends Schema {
  constructor(values) {
    super();
    this._values = values;
  }

  _validate(data) {
    if (!this._values.includes(data)) {
      return {
        success: false,
        error: { issues: [{ message: `Expected one of: ${this._values.join(', ')}`, path: [] }] }
      };
    }
    return { success: true, data };
  }
}

/**
 * Object schema
 */
class ObjectSchema extends Schema {
  constructor(shape) {
    super();
    this._shape = shape;
    this._strict = false;
  }

  _validate(data) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return {
        success: false,
        error: { issues: [{ message: 'Expected object', path: [] }] }
      };
    }

    const result = {};
    const issues = [];

    // Validate each field in shape
    for (const [key, schema] of Object.entries(this._shape)) {
      const fieldResult = schema.safeParse(data[key]);
      if (!fieldResult.success) {
        issues.push(...fieldResult.error.issues.map(issue => ({
          ...issue,
          path: [key, ...issue.path]
        })));
      } else {
        result[key] = fieldResult.data;
      }
    }

    // In strict mode, check for extra keys
    if (this._strict) {
      const extraKeys = Object.keys(data).filter(key => !(key in this._shape));
      if (extraKeys.length > 0) {
        issues.push({
          message: `Unexpected keys: ${extraKeys.join(', ')}`,
          path: []
        });
      }
    }

    if (issues.length > 0) {
      return { success: false, error: { issues } };
    }

    return { success: true, data: result };
  }

  strict() {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._strict = true;
    return clone;
  }
}

/**
 * Array schema
 */
class ArraySchema extends Schema {
  constructor(itemSchema) {
    super();
    this._itemSchema = itemSchema;
    this._minLength = null;
    this._maxLength = null;
  }

  _validate(data) {
    if (!Array.isArray(data)) {
      return {
        success: false,
        error: { issues: [{ message: 'Expected array', path: [] }] }
      };
    }

    if (this._minLength !== null && data.length < this._minLength) {
      return {
        success: false,
        error: { issues: [{ message: `Array must have at least ${this._minLength} items`, path: [] }] }
      };
    }

    if (this._maxLength !== null && data.length > this._maxLength) {
      return {
        success: false,
        error: { issues: [{ message: `Array must have at most ${this._maxLength} items`, path: [] }] }
      };
    }

    const result = [];
    const issues = [];

    for (let i = 0; i < data.length; i++) {
      const itemResult = this._itemSchema.safeParse(data[i]);
      if (!itemResult.success) {
        issues.push(...itemResult.error.issues.map(issue => ({
          ...issue,
          path: [i, ...issue.path]
        })));
      } else {
        result.push(itemResult.data);
      }
    }

    if (issues.length > 0) {
      return { success: false, error: { issues } };
    }

    return { success: true, data: result };
  }

  min(length) {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._minLength = length;
    return clone;
  }

  max(length) {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._maxLength = length;
    return clone;
  }
}

/**
 * Union schema
 */
class UnionSchema extends Schema {
  constructor(schemas) {
    super();
    this._schemas = schemas;
  }

  _validate(data) {
    const allIssues = [];

    for (const schema of this._schemas) {
      const result = schema.safeParse(data);
      if (result.success) {
        return result;
      }
      allIssues.push(...result.error.issues);
    }

    return {
      success: false,
      error: {
        issues: [{
          message: 'Data does not match any union member',
          path: [],
          unionIssues: allIssues
        }]
      }
    };
  }
}

/**
 * Main z object with factory methods
 */
export const z = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  literal: (value) => new LiteralSchema(value),
  enum: (values) => new EnumSchema(values),
  object: (shape) => new ObjectSchema(shape),
  array: (itemSchema) => new ArraySchema(itemSchema),
  union: (schemas) => new UnionSchema(schemas),
};