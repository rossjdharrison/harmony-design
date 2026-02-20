/**
 * @fileoverview UI Layer Validation Utilities
 * @module core/validation/ui-validators
 * 
 * Provides reusable validation functions for UI components.
 * All validators are synchronous and designed for <16ms execution.
 * 
 * Related Documentation:
 * - docs/architecture/validation-architecture.md
 */

/**
 * Validates that a value is not empty
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {{valid: boolean, error?: string}}
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      error: `${fieldName} is required`
    };
  }
  return { valid: true };
}

/**
 * Validates that a number is within a specified range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {string} fieldName - Name of the field for error messages
 * @returns {{valid: boolean, error?: string}}
 */
export function validateRange(value, min, max, fieldName) {
  if (isNaN(value)) {
    return {
      valid: false,
      error: `${fieldName} must be a number`
    };
  }
  
  if (value < min || value > max) {
    return {
      valid: false,
      error: `${fieldName} must be between ${min} and ${max}`
    };
  }
  
  return { valid: true };
}

/**
 * Validates that a string matches a pattern
 * @param {string} value - Value to validate
 * @param {RegExp|string} pattern - Pattern to match against
 * @param {string} fieldName - Name of the field for error messages
 * @returns {{valid: boolean, error?: string}}
 */
export function validatePattern(value, pattern, fieldName) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  
  if (!regex.test(value)) {
    return {
      valid: false,
      error: `${fieldName} format is invalid`
    };
  }
  
  return { valid: true };
}

/**
 * Validates email format
 * @param {string} value - Email to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateEmail(value) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validatePattern(value, emailPattern, 'Email');
}

/**
 * Validates tempo value (20-999 BPM)
 * @param {number} value - Tempo value to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTempo(value) {
  return validateRange(value, 20, 999, 'Tempo');
}

/**
 * Validates time signature format (e.g., "4/4", "3/4")
 * @param {string} value - Time signature to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTimeSignature(value) {
  const pattern = /^\d+\/\d+$/;
  return validatePattern(value, pattern, 'Time signature');
}

/**
 * Validates track name
 * @param {string} value - Track name to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTrackName(value) {
  const required = validateRequired(value, 'Track name');
  if (!required.valid) return required;
  
  if (value.length > 100) {
    return {
      valid: false,
      error: 'Track name must be 100 characters or less'
    };
  }
  
  return { valid: true };
}

/**
 * Validates gain/volume value (-60 to +12 dB)
 * @param {number} value - Gain value to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateGain(value) {
  return validateRange(value, -60, 12, 'Gain');
}

/**
 * Validates pan value (-100 to +100)
 * @param {number} value - Pan value to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validatePan(value) {
  return validateRange(value, -100, 100, 'Pan');
}

/**
 * Composite validator that runs multiple validators
 * @param {*} value - Value to validate
 * @param {Array<Function>} validators - Array of validator functions
 * @returns {{valid: boolean, errors?: Array<string>}}
 */
export function validateComposite(value, validators) {
  const errors = [];
  
  for (const validator of validators) {
    const result = validator(value);
    if (!result.valid) {
      errors.push(result.error);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
}

/**
 * Creates a debounced validator for expensive validations
 * @param {Function} validator - Validator function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced validator
 */
export function createDebouncedValidator(validator, delay = 300) {
  let timeoutId = null;
  
  return function(value, callback) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      const result = validator(value);
      callback(result);
    }, delay);
  };
}