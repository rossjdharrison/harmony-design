/**
 * @fileoverview Hook for async validation with server-side validation
 * @module hooks/useAsyncValidator
 * 
 * React-like hook pattern for async validation in Web Components.
 * Manages validation state, debouncing, and lifecycle.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#async-validation}
 * @see {@link file://../utils/validation/async-validator.js}
 */

import { createAsyncValidator } from '../utils/validation/async-validator.js';

/**
 * @typedef {Object} UseAsyncValidatorResult
 * @property {Function} validate - Validate function
 * @property {Function} cancel - Cancel pending validation
 * @property {Function} clearCache - Clear validation cache
 * @property {boolean} validating - Whether validation is in progress
 * @property {boolean} valid - Current validation state
 * @property {string} [error] - Current error message
 * @property {*} [data] - Additional validation data
 */

/**
 * Hook for async validation with automatic lifecycle management
 * 
 * @param {Function} validateFn - Async validation function
 * @param {Object} [options={}] - Validator options
 * @param {HTMLElement} element - Web component element for lifecycle
 * @returns {UseAsyncValidatorResult} Validator state and methods
 * 
 * @example
 * class ValidatedInput extends HTMLElement {
 *   connectedCallback() {
 *     this.validator = useAsyncValidator(
 *       async (value) => {
 *         const response = await fetch(`/api/validate?value=${value}`);
 *         return response.json();
 *       },
 *       { debounceMs: 500 },
 *       this
 *     );
 *     
 *     this.input.addEventListener('input', (e) => {
 *       this.validator.validate(e.target.value);
 *     });
 *   }
 * }
 */
export function useAsyncValidator(validateFn, options = {}, element) {
  // Create validator instance
  const validator = createAsyncValidator(validateFn, options);
  
  // State
  const state = {
    validating: false,
    valid: false,
    error: null,
    data: null
  };
  
  // Subscribe to validator state changes
  const unsubscribe = validator.subscribe((newState) => {
    Object.assign(state, newState);
    
    // Trigger re-render if element has render method
    if (element && typeof element.render === 'function') {
      element.render();
    }
    
    // Dispatch state change event
    if (element) {
      element.dispatchEvent(new CustomEvent('validation-state-change', {
        detail: newState,
        bubbles: false
      }));
    }
  });
  
  // Cleanup on disconnect
  if (element) {
    const originalDisconnected = element.disconnectedCallback;
    element.disconnectedCallback = function() {
      validator.cancel();
      unsubscribe();
      if (originalDisconnected) {
        originalDisconnected.call(this);
      }
    };
  }
  
  return {
    validate: validator.validate.bind(validator),
    cancel: validator.cancel.bind(validator),
    clearCache: validator.clearCache.bind(validator),
    get validating() { return state.validating; },
    get valid() { return state.valid; },
    get error() { return state.error; },
    get data() { return state.data; }
  };
}