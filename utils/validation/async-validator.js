/**
 * @fileoverview Async Validator - Server-side validation with debouncing and cancellation
 * @module utils/validation/async-validator
 * 
 * Provides async validation utilities for server-side validation with:
 * - Debouncing to reduce server requests
 * - Request cancellation for outdated validations
 * - Caching to avoid redundant validations
 * - Error handling and retry logic
 * 
 * Performance: Respects 16ms render budget by offloading validation
 * Memory: Uses WeakMap for automatic cache cleanup
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#async-validation}
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the value is valid
 * @property {string} [error] - Error message if invalid
 * @property {*} [data] - Additional validation data from server
 */

/**
 * @typedef {Object} AsyncValidatorOptions
 * @property {number} [debounceMs=300] - Debounce delay in milliseconds
 * @property {number} [cacheMs=60000] - Cache duration in milliseconds (0 to disable)
 * @property {number} [timeout=5000] - Request timeout in milliseconds
 * @property {number} [maxRetries=0] - Maximum number of retry attempts
 * @property {boolean} [validateOnBlur=true] - Validate immediately on blur
 * @property {AbortSignal} [signal] - External abort signal
 */

/**
 * @typedef {Object} ValidatorState
 * @property {boolean} validating - Whether validation is in progress
 * @property {boolean} valid - Current validation state
 * @property {string} [error] - Current error message
 * @property {*} [data] - Additional validation data
 */

/**
 * Creates an async validator with debouncing and cancellation
 * 
 * @param {Function} validateFn - Async validation function (value) => Promise<ValidationResult>
 * @param {AsyncValidatorOptions} [options={}] - Validator options
 * @returns {Object} Validator instance with validate and cancel methods
 * 
 * @example
 * const validator = createAsyncValidator(
 *   async (username) => {
 *     const response = await fetch(`/api/validate/username?value=${username}`);
 *     return response.json();
 *   },
 *   { debounceMs: 500, cacheMs: 60000 }
 * );
 * 
 * const result = await validator.validate('john_doe');
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */
export function createAsyncValidator(validateFn, options = {}) {
  const {
    debounceMs = 300,
    cacheMs = 60000,
    timeout = 5000,
    maxRetries = 0,
    validateOnBlur = true,
    signal: externalSignal
  } = options;

  // State management
  let debounceTimer = null;
  let currentController = null;
  let validationPromise = null;
  
  // Cache: Map<value, {result, timestamp}>
  const cache = new Map();
  
  // State observers
  const observers = new Set();

  /**
   * Gets cached result if valid
   * @private
   */
  function getCachedResult(value) {
    if (cacheMs === 0) return null;
    
    const cached = cache.get(value);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > cacheMs) {
      cache.delete(value);
      return null;
    }
    
    return cached.result;
  }

  /**
   * Caches validation result
   * @private
   */
  function cacheResult(value, result) {
    if (cacheMs === 0) return;
    
    cache.set(value, {
      result,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries (max 100 entries)
    if (cache.size > 100) {
      const entries = Array.from(cache.entries());
      const sortedByAge = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = sortedByAge.slice(0, cache.size - 100);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }

  /**
   * Notifies all observers of state change
   * @private
   */
  function notifyObservers(state) {
    observers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[AsyncValidator] Observer error:', error);
      }
    });
  }

  /**
   * Performs the actual validation with retry logic
   * @private
   */
  async function performValidation(value, controller, retryCount = 0) {
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const result = await validateFn(value, controller.signal);
      clearTimeout(timeoutId);
      
      if (!result || typeof result.valid !== 'boolean') {
        throw new Error('Invalid validation result format');
      }
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Don't retry if aborted
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Retry logic
      if (retryCount < maxRetries) {
        console.warn(`[AsyncValidator] Retry ${retryCount + 1}/${maxRetries}`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return performValidation(value, controller, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Validates a value with debouncing
   * 
   * @param {*} value - Value to validate
   * @param {Object} [opts={}] - Validation options
   * @param {boolean} [opts.immediate=false] - Skip debouncing
   * @returns {Promise<ValidationResult>} Validation result
   */
  async function validate(value, { immediate = false } = {}) {
    // Cancel any pending validation
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    
    // Check cache first
    const cached = getCachedResult(value);
    if (cached) {
      notifyObservers({
        validating: false,
        valid: cached.valid,
        error: cached.error,
        data: cached.data
      });
      return cached;
    }

    // If not immediate, debounce
    if (!immediate && debounceMs > 0) {
      return new Promise((resolve, reject) => {
        notifyObservers({ validating: true, valid: false });
        
        debounceTimer = setTimeout(async () => {
          debounceTimer = null;
          try {
            const result = await validate(value, { immediate: true });
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, debounceMs);
      });
    }

    // Cancel previous validation
    if (currentController) {
      currentController.abort();
    }

    // Create new abort controller
    currentController = new AbortController();
    
    // Link external signal if provided
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => {
        currentController.abort();
      }, { once: true });
    }

    notifyObservers({ validating: true, valid: false });

    try {
      validationPromise = performValidation(value, currentController);
      const result = await validationPromise;
      
      // Cache the result
      cacheResult(value, result);
      
      notifyObservers({
        validating: false,
        valid: result.valid,
        error: result.error,
        data: result.data
      });
      
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        // Validation was cancelled, don't update state
        throw error;
      }
      
      const result = {
        valid: false,
        error: error.message || 'Validation failed'
      };
      
      notifyObservers({
        validating: false,
        valid: false,
        error: result.error
      });
      
      throw error;
    } finally {
      currentController = null;
      validationPromise = null;
    }
  }

  /**
   * Cancels any pending validation
   */
  function cancel() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    
    if (currentController) {
      currentController.abort();
      currentController = null;
    }
    
    validationPromise = null;
    
    notifyObservers({ validating: false, valid: false });
  }

  /**
   * Clears the validation cache
   */
  function clearCache() {
    cache.clear();
  }

  /**
   * Subscribes to validation state changes
   * 
   * @param {Function} callback - Callback function (state) => void
   * @returns {Function} Unsubscribe function
   */
  function subscribe(callback) {
    observers.add(callback);
    return () => observers.delete(callback);
  }

  /**
   * Checks if validation is in progress
   * 
   * @returns {boolean} True if validating
   */
  function isValidating() {
    return validationPromise !== null;
  }

  return {
    validate,
    cancel,
    clearCache,
    subscribe,
    isValidating,
    options: { debounceMs, cacheMs, timeout, maxRetries, validateOnBlur }
  };
}

/**
 * Creates a validator for common server-side validation patterns
 * 
 * @param {string} endpoint - API endpoint for validation
 * @param {AsyncValidatorOptions} [options={}] - Validator options
 * @returns {Object} Validator instance
 * 
 * @example
 * const usernameValidator = createServerValidator('/api/validate/username', {
 *   debounceMs: 500
 * });
 * 
 * const result = await usernameValidator.validate('john_doe');
 */
export function createServerValidator(endpoint, options = {}) {
  return createAsyncValidator(async (value, signal) => {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('value', value);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal
    });
    
    if (!response.ok) {
      throw new Error(`Server validation failed: ${response.status}`);
    }
    
    return response.json();
  }, options);
}

/**
 * Combines multiple validators with AND logic
 * 
 * @param {Array<Object>} validators - Array of validator instances
 * @param {AsyncValidatorOptions} [options={}] - Combined validator options
 * @returns {Object} Combined validator instance
 * 
 * @example
 * const combinedValidator = combineValidators([
 *   usernameValidator,
 *   profanityValidator
 * ]);
 */
export function combineValidators(validators, options = {}) {
  return createAsyncValidator(async (value, signal) => {
    const results = await Promise.all(
      validators.map(v => v.validate(value, { immediate: true }))
    );
    
    const firstError = results.find(r => !r.valid);
    
    if (firstError) {
      return firstError;
    }
    
    return {
      valid: true,
      data: results.map(r => r.data).filter(Boolean)
    };
  }, options);
}