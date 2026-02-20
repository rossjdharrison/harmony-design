/**
 * @fileoverview useValidationDebounce Hook
 * @module hooks/useValidationDebounce
 * 
 * React-like hook pattern for validation debouncing in Web Components.
 * Provides configurable debounce for async validation with automatic cleanup.
 * 
 * Related: DESIGN_SYSTEM.md § Validation System, § Form Components
 */

import { ValidationDebouncer } from '../utils/validationDebouncer.js';

/**
 * @typedef {Object} ValidationDebounceOptions
 * @property {number} delay - Debounce delay in milliseconds (default: 300)
 * @property {boolean} leading - Execute on leading edge (default: false)
 * @property {boolean} trailing - Execute on trailing edge (default: true)
 * @property {number} maxWait - Maximum time to wait before forcing execution
 * @property {boolean} cache - Enable result caching (default: true)
 * @property {ValidationDebouncer} debouncer - Use custom debouncer instance
 */

/**
 * @typedef {Object} ValidationDebounceResult
 * @property {Function} validate - Debounced validation function
 * @property {Function} cancel - Cancel pending validation
 * @property {Function} flush - Flush pending validation immediately
 * @property {Function} clearCache - Clear cached results
 * @property {Function} getMetrics - Get performance metrics
 * @property {ValidationDebouncer} debouncer - Debouncer instance
 */

/**
 * Create validation debounce hook for a component
 * @param {string} componentId - Unique component identifier
 * @param {Function} validator - Async validation function
 * @param {ValidationDebounceOptions} options - Configuration options
 * @returns {ValidationDebounceResult} Validation debounce utilities
 */
export function useValidationDebounce(componentId, validator, options = {}) {
  const {
    delay = 300,
    leading = false,
    trailing = true,
    maxWait = null,
    cache = true,
    debouncer = null
  } = options;

  // Use provided debouncer or create new one
  const debouncerInstance = debouncer || new ValidationDebouncer({
    delay,
    leading,
    trailing,
    maxWait
  });

  /**
   * Debounced validation function
   * @param {string} fieldId - Field identifier
   * @param {*} value - Value to validate
   * @returns {Promise<*>} Validation result
   */
  const validate = async (fieldId, value) => {
    const fullFieldId = `${componentId}:${fieldId}`;
    
    return debouncerInstance.debounce(
      fullFieldId,
      value,
      validator,
      { delay, leading, trailing, maxWait }
    );
  };

  /**
   * Cancel pending validation
   * @param {string} fieldId - Field identifier
   */
  const cancel = (fieldId) => {
    const fullFieldId = `${componentId}:${fieldId}`;
    debouncerInstance.cancel(fullFieldId);
  };

  /**
   * Flush pending validation immediately
   * @param {string} fieldId - Field identifier
   * @returns {Promise<*>|null} Validation promise if exists
   */
  const flush = (fieldId) => {
    const fullFieldId = `${componentId}:${fieldId}`;
    return debouncerInstance.flush(fullFieldId);
  };

  /**
   * Clear cached results
   * @param {string} fieldId - Optional field to clear
   */
  const clearCache = (fieldId = null) => {
    if (fieldId) {
      const fullFieldId = `${componentId}:${fieldId}`;
      debouncerInstance.clearCache(fullFieldId);
    } else {
      debouncerInstance.clearCache(componentId);
    }
  };

  /**
   * Get performance metrics
   * @returns {Object} Metrics object
   */
  const getMetrics = () => {
    return debouncerInstance.getMetrics();
  };

  // Cleanup function for component disconnection
  const cleanup = () => {
    // Cancel all pending validations for this component
    for (const [fieldId] of debouncerInstance.pendingRequests.entries()) {
      if (fieldId.startsWith(`${componentId}:`)) {
        debouncerInstance.cancel(fieldId);
      }
    }
    
    // Clear cache if not sharing debouncer
    if (!debouncer) {
      debouncerInstance.clearCache();
    }
  };

  return {
    validate,
    cancel,
    flush,
    clearCache,
    getMetrics,
    cleanup,
    debouncer: debouncerInstance
  };
}

/**
 * Create multi-field validation debouncer
 * Manages debouncing for multiple fields with individual configurations
 * @param {string} formId - Unique form identifier
 * @param {Object<string, ValidationDebounceOptions>} fieldConfigs - Per-field configurations
 * @returns {Object} Multi-field validation utilities
 */
export function useMultiFieldValidationDebounce(formId, fieldConfigs = {}) {
  const debouncer = new ValidationDebouncer();
  const validators = new Map();

  /**
   * Register validator for a field
   * @param {string} fieldId - Field identifier
   * @param {Function} validator - Async validation function
   * @param {ValidationDebounceOptions} config - Field-specific config
   */
  const registerValidator = (fieldId, validator, config = {}) => {
    validators.set(fieldId, { validator, config });
  };

  /**
   * Validate a field
   * @param {string} fieldId - Field identifier
   * @param {*} value - Value to validate
   * @returns {Promise<*>} Validation result
   */
  const validate = async (fieldId, value) => {
    const validatorConfig = validators.get(fieldId);
    if (!validatorConfig) {
      throw new Error(`No validator registered for field: ${fieldId}`);
    }

    const fullFieldId = `${formId}:${fieldId}`;
    const config = { ...fieldConfigs[fieldId], ...validatorConfig.config };

    return debouncer.debounce(
      fullFieldId,
      value,
      validatorConfig.validator,
      config
    );
  };

  /**
   * Validate all fields
   * @param {Object<string, *>} values - Field values
   * @returns {Promise<Object<string, *>>} Validation results
   */
  const validateAll = async (values) => {
    const results = {};
    const promises = [];

    for (const [fieldId, value] of Object.entries(values)) {
      if (validators.has(fieldId)) {
        promises.push(
          validate(fieldId, value)
            .then(result => { results[fieldId] = result; })
            .catch(error => { results[fieldId] = { error: error.message }; })
        );
      }
    }

    await Promise.all(promises);
    return results;
  };

  /**
   * Cancel validation for specific field or all fields
   * @param {string} fieldId - Optional field identifier
   */
  const cancel = (fieldId = null) => {
    if (fieldId) {
      debouncer.cancel(`${formId}:${fieldId}`);
    } else {
      debouncer.cancelAll();
    }
  };

  /**
   * Cleanup all validators
   */
  const cleanup = () => {
    debouncer.cancelAll();
    debouncer.clearCache();
    validators.clear();
  };

  return {
    registerValidator,
    validate,
    validateAll,
    cancel,
    cleanup,
    getMetrics: () => debouncer.getMetrics(),
    debouncer
  };
}