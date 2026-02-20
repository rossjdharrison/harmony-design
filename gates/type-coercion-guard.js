/**
 * @fileoverview Type Coercion Guard - Safe type coercion with explicit allow-lists
 * 
 * Provides controlled type coercion with explicit allow-lists to prevent
 * unexpected type conversions that can lead to bugs or security issues.
 * 
 * @module gates/type-coercion-guard
 * @see DESIGN_SYSTEM.md#type-coercion-guard
 */

/**
 * @typedef {Object} CoercionRule
 * @property {string} from - Source type
 * @property {string} to - Target type
 * @property {Function} coerce - Coercion function
 * @property {Function} [validate] - Optional validation function
 */

/**
 * @typedef {Object} CoercionResult
 * @property {boolean} success - Whether coercion succeeded
 * @property {*} value - Coerced value (if successful)
 * @property {string} [error] - Error message (if failed)
 * @property {string} fromType - Original type
 * @property {string} toType - Target type
 */

/**
 * Type Coercion Guard
 * 
 * Manages safe type coercion with explicit allow-lists.
 * Only registered coercion paths are allowed.
 * 
 * @class TypeCoercionGuard
 */
export class TypeCoercionGuard {
  constructor() {
    /** @type {Map<string, CoercionRule>} */
    this.rules = new Map();
    
    /** @type {Set<string>} */
    this.allowedCoercions = new Set();
    
    this._initializeDefaultRules();
  }

  /**
   * Initialize default safe coercion rules
   * @private
   */
  _initializeDefaultRules() {
    // String coercions
    this.registerRule('number', 'string', (value) => String(value));
    this.registerRule('boolean', 'string', (value) => String(value));
    this.registerRule('null', 'string', () => '');
    this.registerRule('undefined', 'string', () => '');
    
    // Number coercions (with validation)
    this.registerRule('string', 'number', 
      (value) => {
        const num = Number(value);
        if (Number.isNaN(num)) {
          throw new Error(`Cannot coerce "${value}" to number`);
        }
        return num;
      },
      (value) => value.trim() !== ''
    );
    
    this.registerRule('boolean', 'number', (value) => value ? 1 : 0);
    
    // Boolean coercions
    this.registerRule('string', 'boolean', (value) => {
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') return false;
      throw new Error(`Cannot coerce "${value}" to boolean`);
    });
    
    this.registerRule('number', 'boolean', (value) => value !== 0);
    
    // Array coercions
    this.registerRule('string', 'array', (value) => {
      if (value === '') return [];
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
          throw new Error('Not an array');
        }
        return parsed;
      } catch {
        // Fallback: split by comma
        return value.split(',').map(s => s.trim());
      }
    });
    
    // Object coercions
    this.registerRule('string', 'object', (value) => {
      if (value === '') return {};
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Not an object');
        }
        return parsed;
      } catch (error) {
        throw new Error(`Cannot coerce "${value}" to object: ${error.message}`);
      }
    });
    
    // Date coercions
    this.registerRule('string', 'date', (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Cannot coerce "${value}" to date`);
      }
      return date;
    });
    
    this.registerRule('number', 'date', (value) => new Date(value));
  }

  /**
   * Register a coercion rule
   * 
   * @param {string} fromType - Source type
   * @param {string} toType - Target type
   * @param {Function} coerceFn - Coercion function
   * @param {Function} [validateFn] - Optional validation function
   */
  registerRule(fromType, toType, coerceFn, validateFn = null) {
    const key = this._getRuleKey(fromType, toType);
    
    this.rules.set(key, {
      from: fromType,
      to: toType,
      coerce: coerceFn,
      validate: validateFn
    });
    
    this.allowedCoercions.add(key);
  }

  /**
   * Unregister a coercion rule
   * 
   * @param {string} fromType - Source type
   * @param {string} toType - Target type
   */
  unregisterRule(fromType, toType) {
    const key = this._getRuleKey(fromType, toType);
    this.rules.delete(key);
    this.allowedCoercions.delete(key);
  }

  /**
   * Check if a coercion is allowed
   * 
   * @param {string} fromType - Source type
   * @param {string} toType - Target type
   * @returns {boolean}
   */
  isCoercionAllowed(fromType, toType) {
    const key = this._getRuleKey(fromType, toType);
    return this.allowedCoercions.has(key);
  }

  /**
   * Get the type of a value
   * 
   * @param {*} value - Value to check
   * @returns {string} Type name
   * @private
   */
  _getType(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    return typeof value;
  }

  /**
   * Get rule key
   * 
   * @param {string} fromType - Source type
   * @param {string} toType - Target type
   * @returns {string}
   * @private
   */
  _getRuleKey(fromType, toType) {
    return `${fromType}→${toType}`;
  }

  /**
   * Coerce a value to a target type
   * 
   * @param {*} value - Value to coerce
   * @param {string} targetType - Target type
   * @returns {CoercionResult}
   */
  coerce(value, targetType) {
    const fromType = this._getType(value);
    
    // No coercion needed
    if (fromType === targetType) {
      return {
        success: true,
        value: value,
        fromType,
        toType: targetType
      };
    }
    
    const key = this._getRuleKey(fromType, targetType);
    const rule = this.rules.get(key);
    
    // Coercion not allowed
    if (!rule) {
      return {
        success: false,
        value: undefined,
        error: `Coercion from ${fromType} to ${targetType} is not allowed`,
        fromType,
        toType: targetType
      };
    }
    
    try {
      // Validate if validator exists
      if (rule.validate && !rule.validate(value)) {
        return {
          success: false,
          value: undefined,
          error: `Validation failed for ${fromType} to ${targetType} coercion`,
          fromType,
          toType: targetType
        };
      }
      
      // Perform coercion
      const coercedValue = rule.coerce(value);
      
      return {
        success: true,
        value: coercedValue,
        fromType,
        toType: targetType
      };
    } catch (error) {
      return {
        success: false,
        value: undefined,
        error: error.message,
        fromType,
        toType: targetType
      };
    }
  }

  /**
   * Coerce a value or throw on failure
   * 
   * @param {*} value - Value to coerce
   * @param {string} targetType - Target type
   * @returns {*} Coerced value
   * @throws {Error} If coercion fails
   */
  coerceOrThrow(value, targetType) {
    const result = this.coerce(value, targetType);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.value;
  }

  /**
   * Coerce a value with a fallback
   * 
   * @param {*} value - Value to coerce
   * @param {string} targetType - Target type
   * @param {*} fallback - Fallback value
   * @returns {*} Coerced value or fallback
   */
  coerceOrDefault(value, targetType, fallback) {
    const result = this.coerce(value, targetType);
    return result.success ? result.value : fallback;
  }

  /**
   * Coerce multiple values
   * 
   * @param {Array<{value: *, targetType: string}>} items - Items to coerce
   * @returns {Array<CoercionResult>}
   */
  coerceMany(items) {
    return items.map(({ value, targetType }) => this.coerce(value, targetType));
  }

  /**
   * Get all allowed coercion paths
   * 
   * @returns {Array<{from: string, to: string}>}
   */
  getAllowedCoercions() {
    return Array.from(this.allowedCoercions).map(key => {
      const [from, to] = key.split('→');
      return { from, to };
    });
  }

  /**
   * Clear all rules
   */
  clearRules() {
    this.rules.clear();
    this.allowedCoercions.clear();
  }

  /**
   * Reset to default rules
   */
  reset() {
    this.clearRules();
    this._initializeDefaultRules();
  }
}

// Global singleton instance
let globalGuard = null;

/**
 * Get the global TypeCoercionGuard instance
 * 
 * @returns {TypeCoercionGuard}
 */
export function getTypeCoercionGuard() {
  if (!globalGuard) {
    globalGuard = new TypeCoercionGuard();
  }
  return globalGuard;
}

/**
 * Coerce a value using the global guard
 * 
 * @param {*} value - Value to coerce
 * @param {string} targetType - Target type
 * @returns {CoercionResult}
 */
export function coerce(value, targetType) {
  return getTypeCoercionGuard().coerce(value, targetType);
}

/**
 * Coerce a value or throw using the global guard
 * 
 * @param {*} value - Value to coerce
 * @param {string} targetType - Target type
 * @returns {*} Coerced value
 * @throws {Error} If coercion fails
 */
export function coerceOrThrow(value, targetType) {
  return getTypeCoercionGuard().coerceOrThrow(value, targetType);
}

/**
 * Coerce a value with fallback using the global guard
 * 
 * @param {*} value - Value to coerce
 * @param {string} targetType - Target type
 * @param {*} fallback - Fallback value
 * @returns {*} Coerced value or fallback
 */
export function coerceOrDefault(value, targetType, fallback) {
  return getTypeCoercionGuard().coerceOrDefault(value, targetType, fallback);
}