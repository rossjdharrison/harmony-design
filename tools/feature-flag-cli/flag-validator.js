/**
 * @fileoverview Flag Validator - Validates feature flag configurations
 * @module tools/feature-flag-cli/flag-validator
 * 
 * Validates feature flag configurations against schema rules.
 * Ensures flags have required fields and valid values.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Feature Flags
 */

/**
 * Feature flag validator
 */
class FlagValidator {
  /**
   * Valid flag types
   */
  static VALID_TYPES = ['boolean', 'string', 'number', 'object'];

  /**
   * Valid targeting operators
   */
  static VALID_OPERATORS = ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'in'];

  /**
   * Validate a single flag configuration
   * @param {string} name - Flag name
   * @param {Object} config - Flag configuration
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateFlag(name, config) {
    const errors = [];

    // Check required fields
    if (typeof config.enabled !== 'boolean') {
      errors.push(`${name}: 'enabled' must be a boolean`);
    }

    // Validate type
    if (config.type && !FlagValidator.VALID_TYPES.includes(config.type)) {
      errors.push(`${name}: invalid type '${config.type}'. Must be one of: ${FlagValidator.VALID_TYPES.join(', ')}`);
    }

    // Validate value matches type
    if (config.value !== undefined && config.type) {
      const valueType = typeof config.value;
      if (config.type === 'object' && valueType !== 'object') {
        errors.push(`${name}: value type mismatch. Expected object, got ${valueType}`);
      } else if (config.type !== 'object' && config.type !== valueType) {
        errors.push(`${name}: value type mismatch. Expected ${config.type}, got ${valueType}`);
      }
    }

    // Validate rollout configuration
    if (config.rollout) {
      const rolloutErrors = this.validateRollout(name, config.rollout);
      errors.push(...rolloutErrors);
    }

    // Validate targeting rules
    if (config.targeting) {
      const targetingErrors = this.validateTargeting(name, config.targeting);
      errors.push(...targetingErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate rollout configuration
   * @param {string} name - Flag name
   * @param {Object} rollout - Rollout configuration
   * @returns {string[]} Validation errors
   */
  validateRollout(name, rollout) {
    const errors = [];

    if (typeof rollout.percentage !== 'number') {
      errors.push(`${name}: rollout.percentage must be a number`);
    } else if (rollout.percentage < 0 || rollout.percentage > 100) {
      errors.push(`${name}: rollout.percentage must be between 0 and 100`);
    }

    if (rollout.strategy && !['percentage', 'userBased'].includes(rollout.strategy)) {
      errors.push(`${name}: invalid rollout.strategy '${rollout.strategy}'`);
    }

    return errors;
  }

  /**
   * Validate targeting rules
   * @param {string} name - Flag name
   * @param {Array} targeting - Targeting rules
   * @returns {string[]} Validation errors
   */
  validateTargeting(name, targeting) {
    const errors = [];

    if (!Array.isArray(targeting)) {
      errors.push(`${name}: targeting must be an array`);
      return errors;
    }

    targeting.forEach((rule, index) => {
      if (!rule.attribute) {
        errors.push(`${name}: targeting rule ${index} missing 'attribute'`);
      }

      if (!rule.operator) {
        errors.push(`${name}: targeting rule ${index} missing 'operator'`);
      } else if (!FlagValidator.VALID_OPERATORS.includes(rule.operator)) {
        errors.push(`${name}: targeting rule ${index} has invalid operator '${rule.operator}'`);
      }

      if (rule.value === undefined) {
        errors.push(`${name}: targeting rule ${index} missing 'value'`);
      }
    });

    return errors;
  }

  /**
   * Validate all flags
   * @param {Object} flags - All feature flags
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateAll(flags) {
    const allErrors = [];

    Object.entries(flags).forEach(([name, config]) => {
      const result = this.validateFlag(name, config);
      allErrors.push(...result.errors);
    });

    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }
}

module.exports = { FlagValidator };