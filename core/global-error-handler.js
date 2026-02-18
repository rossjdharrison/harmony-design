/**
 * @fileoverview Global Error Handler with Toast Notifications
 * @module core/global-error-handler
 * 
 * Provides centralized error handling with toast notifications.
 * Integrates with EventBus for error propagation and logging.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Error Handling
 */

import { EventBus } from './event-bus.js';

/**
 * @typedef {Object} ErrorContext
 * @property {string} source - Source component or module
 * @property {string} operation - Operation being performed
 * @property {*} [metadata] - Additional context data
 * @property {number} timestamp - Error timestamp
 */

/**
 * @typedef {Object} ErrorToastOptions
 * @property {'error'|'warning'|'info'} severity - Toast severity level
 * @property {number} [duration] - Toast duration in ms (0 = persistent)
 * @property {boolean} [dismissible] - Can user dismiss the toast
 * @property {Function} [onAction] - Optional action callback
 * @property {string} [actionLabel] - Label for action button
 */

/**
 * Global error handler with toast notification system.
 * Captures unhandled errors, logs them, and displays user-friendly toasts.
 * 
 * @class GlobalErrorHandler
 */
class GlobalErrorHandler {
  constructor() {
    /** @type {EventBus} */
    this.eventBus = null;
    
    /** @type {Map<string, number>} */
    this.errorCounts = new Map();
    
    /** @type {Set<string>} */
    this.suppressedErrors = new Set();
    
    /** @type {number} */
    this.maxErrorsPerType = 5;
    
    /** @type {number} */
    this.errorResetInterval = 60000; // 1 minute
    
    /** @type {boolean} */
    this.initialized = false;

    /** @type {Array<{error: Error, context: ErrorContext}>} */
    this.errorHistory = [];
    
    /** @type {number} */
    this.maxHistorySize = 100;
  }

  /**
   * Initialize the global error handler
   * @param {EventBus} eventBus - EventBus instance for error propagation
   */
  initialize(eventBus) {
    if (this.initialized) {
      console.warn('[GlobalErrorHandler] Already initialized');
      return;
    }

    this.eventBus = eventBus;
    this.setupErrorListeners();
    this.setupErrorResetTimer();
    this.initialized = true;

    console.log('[GlobalErrorHandler] Initialized');
  }

  /**
   * Setup global error event listeners
   * @private
   */
  setupErrorListeners() {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        source: event.filename || 'unknown',
        operation: 'script-execution',
        metadata: {
          lineno: event.lineno,
          colno: event.colno,
          message: event.message
        },
        timestamp: Date.now()
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));

      this.handleError(error, {
        source: 'promise',
        operation: 'async-operation',
        metadata: { reason: event.reason },
        timestamp: Date.now()
      });
    });

    // Custom error events from EventBus
    if (this.eventBus) {
      this.eventBus.subscribe('error:*', (event) => {
        this.handleCustomError(event);
      });
    }
  }

  /**
   * Setup timer to reset error counts periodically
   * @private
   */
  setupErrorResetTimer() {
    setInterval(() => {
      this.errorCounts.clear();
      this.suppressedErrors.clear();
    }, this.errorResetInterval);
  }

  /**
   * Handle an error with context
   * @param {Error} error - The error object
   * @param {ErrorContext} context - Error context
   * @param {ErrorToastOptions} [toastOptions] - Toast display options
   */
  handleError(error, context, toastOptions = {}) {
    if (!error) return;

    const errorKey = this.getErrorKey(error, context);

    // Check if error should be suppressed
    if (this.shouldSuppressError(errorKey)) {
      console.warn('[GlobalErrorHandler] Suppressing repeated error:', errorKey);
      return;
    }

    // Increment error count
    this.incrementErrorCount(errorKey);

    // Add to history
    this.addToHistory(error, context);

    // Log to console
    this.logError(error, context);

    // Publish error event
    this.publishErrorEvent(error, context);

    // Show toast notification
    this.showErrorToast(error, context, toastOptions);
  }

  /**
   * Handle custom error events from EventBus
   * @private
   * @param {Object} event - Error event
   */
  handleCustomError(event) {
    const { error, context, toastOptions } = event.payload;
    this.handleError(error, context, toastOptions);
  }

  /**
   * Generate unique key for error tracking
   * @private
   * @param {Error} error - The error
   * @param {ErrorContext} context - Error context
   * @returns {string} Error key
   */
  getErrorKey(error, context) {
    return `${context.source}:${context.operation}:${error.name}:${error.message}`;
  }

  /**
   * Check if error should be suppressed
   * @private
   * @param {string} errorKey - Error key
   * @returns {boolean} True if should suppress
   */
  shouldSuppressError(errorKey) {
    if (this.suppressedErrors.has(errorKey)) {
      return true;
    }

    const count = this.errorCounts.get(errorKey) || 0;
    if (count >= this.maxErrorsPerType) {
      this.suppressedErrors.add(errorKey);
      return true;
    }

    return false;
  }

  /**
   * Increment error count for tracking
   * @private
   * @param {string} errorKey - Error key
   */
  incrementErrorCount(errorKey) {
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
  }

  /**
   * Add error to history
   * @private
   * @param {Error} error - The error
   * @param {ErrorContext} context - Error context
   */
  addToHistory(error, context) {
    this.errorHistory.push({ error, context });
    
    // Trim history if too large
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Log error to console with context
   * @private
   * @param {Error} error - The error
   * @param {ErrorContext} context - Error context
   */
  logError(error, context) {
    console.error(
      `[GlobalErrorHandler] Error in ${context.source} during ${context.operation}:`,
      {
        error,
        context,
        stack: error.stack,
        timestamp: new Date(context.timestamp).toISOString()
      }
    );
  }

  /**
   * Publish error event to EventBus
   * @private
   * @param {Error} error - The error
   * @param {ErrorContext} context - Error context
   */
  publishErrorEvent(error, context) {
    if (!this.eventBus) return;

    this.eventBus.publish({
      type: 'error:global',
      source: 'GlobalErrorHandler',
      payload: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context
      }
    });
  }

  /**
   * Show toast notification for error
   * @private
   * @param {Error} error - The error
   * @param {ErrorContext} context - Error context
   * @param {ErrorToastOptions} options - Toast options
   */
  showErrorToast(error, context, options = {}) {
    const toastElement = document.querySelector('harmony-toast-container');
    
    if (!toastElement) {
      console.warn('[GlobalErrorHandler] No toast container found');
      return;
    }

    const defaultOptions = {
      severity: 'error',
      duration: 5000,
      dismissible: true
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Create user-friendly message
    const message = this.createUserFriendlyMessage(error, context);

    toastElement.showToast({
      message,
      ...finalOptions
    });
  }

  /**
   * Create user-friendly error message
   * @private
   * @param {Error} error - The error
   * @param {ErrorContext} context - Error context
   * @returns {string} User-friendly message
   */
  createUserFriendlyMessage(error, context) {
    // Map technical errors to user-friendly messages
    const errorMessages = {
      'NetworkError': 'Network connection issue. Please check your connection.',
      'TypeError': 'An unexpected error occurred. Please try again.',
      'ReferenceError': 'An unexpected error occurred. Please refresh the page.',
      'AudioError': 'Audio processing error. Please check your audio settings.',
      'GraphError': 'Graph processing error. Please try again.',
      'ValidationError': 'Invalid input. Please check your data.'
    };

    return errorMessages[error.name] || `Error: ${error.message}`;
  }

  /**
   * Get error history
   * @returns {Array<{error: Error, context: ErrorContext}>} Error history
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getStatistics() {
    return {
      totalErrors: this.errorHistory.length,
      errorCounts: Object.fromEntries(this.errorCounts),
      suppressedErrors: Array.from(this.suppressedErrors)
    };
  }

  /**
   * Manually report an error with context
   * @param {Error} error - The error
   * @param {ErrorContext} context - Error context
   * @param {ErrorToastOptions} [toastOptions] - Toast options
   */
  reportError(error, context, toastOptions) {
    this.handleError(error, context, toastOptions);
  }
}

// Create singleton instance
const globalErrorHandler = new GlobalErrorHandler();

export { globalErrorHandler, GlobalErrorHandler };