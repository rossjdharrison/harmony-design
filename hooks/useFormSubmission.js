/**
 * @fileoverview Form Submission Handler Hook
 * @module hooks/useFormSubmission
 * 
 * Manages form submission lifecycle with loading states, error handling,
 * and success callbacks. Follows EventBus pattern for async operations.
 * 
 * Related Documentation: harmony-design/DESIGN_SYSTEM.md#Form-Submission-Handler
 * 
 * @example
 * const handler = useFormSubmission({
 *   onSubmit: async (data) => { ... },
 *   onSuccess: (result) => { ... },
 *   onError: (error) => { ... }
 * });
 * 
 * handler.submit(formData);
 */

/**
 * @typedef {Object} FormSubmissionState
 * @property {boolean} isSubmitting - Whether form is currently submitting
 * @property {boolean} isSuccess - Whether last submission succeeded
 * @property {Error|null} error - Last submission error if any
 * @property {*} data - Last successful submission result
 * @property {number|null} submittedAt - Timestamp of last submission
 */

/**
 * @typedef {Object} FormSubmissionOptions
 * @property {Function} onSubmit - Async function to handle form submission
 * @property {Function} [onSuccess] - Success callback
 * @property {Function} [onError] - Error callback
 * @property {Function} [onValidate] - Validation function before submit
 * @property {number} [timeout] - Submission timeout in ms (default: 30000)
 * @property {boolean} [preventDuplicateSubmit] - Prevent duplicate submissions (default: true)
 * @property {string} [eventNamespace] - EventBus namespace for events (default: 'form')
 */

/**
 * @typedef {Object} FormSubmissionHandler
 * @property {Function} submit - Submit the form
 * @property {Function} reset - Reset submission state
 * @property {FormSubmissionState} state - Current submission state
 * @property {Function} destroy - Cleanup handler
 */

/**
 * Creates a form submission handler with state management
 * 
 * @param {FormSubmissionOptions} options - Configuration options
 * @returns {FormSubmissionHandler} Form submission handler
 */
export function useFormSubmission(options) {
  const {
    onSubmit,
    onSuccess,
    onError,
    onValidate,
    timeout = 30000,
    preventDuplicateSubmit = true,
    eventNamespace = 'form'
  } = options;

  if (typeof onSubmit !== 'function') {
    throw new Error('useFormSubmission: onSubmit must be a function');
  }

  // Internal state
  const state = {
    isSubmitting: false,
    isSuccess: false,
    error: null,
    data: null,
    submittedAt: null
  };

  // State change listeners
  const listeners = new Set();
  let abortController = null;

  /**
   * Notify all listeners of state change
   * @private
   */
  function notifyListeners() {
    listeners.forEach(listener => {
      try {
        listener({ ...state });
      } catch (err) {
        console.error('useFormSubmission: Listener error:', err);
      }
    });
  }

  /**
   * Update state and notify listeners
   * @private
   * @param {Partial<FormSubmissionState>} updates - State updates
   */
  function updateState(updates) {
    Object.assign(state, updates);
    notifyListeners();
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} eventType - Event type
   * @param {*} payload - Event payload
   */
  function publishEvent(eventType, payload) {
    if (typeof window !== 'undefined' && window.EventBus) {
      try {
        window.EventBus.publish(`${eventNamespace}.${eventType}`, payload);
      } catch (err) {
        console.error(`useFormSubmission: Failed to publish ${eventType}:`, err);
      }
    }
  }

  /**
   * Submit the form
   * 
   * @param {*} formData - Form data to submit
   * @returns {Promise<*>} Submission result
   */
  async function submit(formData) {
    // Prevent duplicate submissions
    if (preventDuplicateSubmit && state.isSubmitting) {
      console.warn('useFormSubmission: Submission already in progress');
      return Promise.reject(new Error('Submission already in progress'));
    }

    // Validate before submitting
    if (onValidate) {
      try {
        const validationResult = await onValidate(formData);
        if (validationResult === false) {
          const validationError = new Error('Validation failed');
          updateState({ error: validationError });
          publishEvent('validationFailed', { formData, error: validationError });
          return Promise.reject(validationError);
        }
      } catch (validationError) {
        updateState({ error: validationError });
        publishEvent('validationFailed', { formData, error: validationError });
        if (onError) {
          onError(validationError);
        }
        return Promise.reject(validationError);
      }
    }

    // Create abort controller for timeout
    abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      if (abortController) {
        abortController.abort();
      }
    }, timeout);

    // Update state to submitting
    updateState({
      isSubmitting: true,
      isSuccess: false,
      error: null,
      submittedAt: Date.now()
    });

    publishEvent('submitStart', { formData });

    try {
      // Execute submission with timeout
      const result = await Promise.race([
        onSubmit(formData, { signal: abortController.signal }),
        new Promise((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Form submission timeout'));
          });
        })
      ]);

      clearTimeout(timeoutId);

      // Update state to success
      updateState({
        isSubmitting: false,
        isSuccess: true,
        error: null,
        data: result
      });

      publishEvent('submitSuccess', { formData, result });

      // Call success callback
      if (onSuccess) {
        try {
          onSuccess(result);
        } catch (callbackError) {
          console.error('useFormSubmission: Success callback error:', callbackError);
        }
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      // Update state to error
      updateState({
        isSubmitting: false,
        isSuccess: false,
        error
      });

      publishEvent('submitError', { formData, error: error.message });

      // Call error callback
      if (onError) {
        try {
          onError(error);
        } catch (callbackError) {
          console.error('useFormSubmission: Error callback error:', callbackError);
        }
      }

      throw error;

    } finally {
      abortController = null;
    }
  }

  /**
   * Reset submission state
   */
  function reset() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    updateState({
      isSubmitting: false,
      isSuccess: false,
      error: null,
      data: null,
      submittedAt: null
    });

    publishEvent('reset', {});
  }

  /**
   * Subscribe to state changes
   * 
   * @param {Function} listener - State change listener
   * @returns {Function} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.add(listener);
    // Immediately call with current state
    listener({ ...state });
    
    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Cleanup handler
   */
  function destroy() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    listeners.clear();
  }

  return {
    submit,
    reset,
    subscribe,
    destroy,
    get state() {
      return { ...state };
    }
  };
}

/**
 * Create a form submission handler for Web Components
 * Integrates with component lifecycle and shadow DOM
 * 
 * @param {HTMLElement} component - Web component instance
 * @param {FormSubmissionOptions} options - Configuration options
 * @returns {FormSubmissionHandler} Form submission handler
 */
export function useFormSubmissionForComponent(component, options) {
  const handler = useFormSubmission(options);
  
  // Auto-cleanup on disconnect
  const originalDisconnectedCallback = component.disconnectedCallback;
  component.disconnectedCallback = function() {
    handler.destroy();
    if (originalDisconnectedCallback) {
      originalDisconnectedCallback.call(this);
    }
  };

  // Subscribe to state changes and update component
  handler.subscribe((state) => {
    if (component.onSubmissionStateChange) {
      component.onSubmissionStateChange(state);
    }
    
    // Dispatch custom event for external listeners
    component.dispatchEvent(new CustomEvent('submission-state-change', {
      detail: state,
      bubbles: true,
      composed: true
    }));
  });

  return handler;
}