/**
 * @fileoverview Unhandled Rejection Tracker
 * Captures and logs unhandled promise rejections with context and stack traces.
 * Integrates with structured logger for consistent error reporting.
 * 
 * @module core/unhandled-rejection-tracker
 * @see DESIGN_SYSTEM.md#error-handling
 */

import { StructuredLogger } from './structured-logger.js';

/**
 * @typedef {Object} RejectionEvent
 * @property {Promise} promise - The rejected promise
 * @property {*} reason - The rejection reason
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} stack - Stack trace if available
 * @property {boolean} handled - Whether the rejection was later handled
 */

/**
 * @typedef {Object} TrackerConfig
 * @property {boolean} [enabled=true] - Whether tracking is enabled
 * @property {boolean} [logToConsole=true] - Log to console in addition to structured logger
 * @property {boolean} [captureStackTrace=true] - Capture stack traces for rejections
 * @property {number} [maxStoredRejections=100] - Maximum number of rejections to store
 * @property {Function} [onRejection] - Custom callback for rejections
 * @property {boolean} [preventDefaultHandler=false] - Prevent default browser handling
 */

/**
 * Tracks unhandled promise rejections across the application.
 * Provides centralized error monitoring and reporting.
 * 
 * @class UnhandledRejectionTracker
 * @example
 * const tracker = new UnhandledRejectionTracker({
 *   enabled: true,
 *   logToConsole: true,
 *   onRejection: (event) => {
 *     // Send to error monitoring service
 *     errorService.report(event);
 *   }
 * });
 * tracker.start();
 */
export class UnhandledRejectionTracker {
  /**
   * @param {TrackerConfig} [config={}] - Tracker configuration
   */
  constructor(config = {}) {
    this.config = {
      enabled: true,
      logToConsole: true,
      captureStackTrace: true,
      maxStoredRejections: 100,
      onRejection: null,
      preventDefaultHandler: false,
      ...config
    };

    /** @type {RejectionEvent[]} */
    this.rejections = [];

    /** @type {WeakMap<Promise, RejectionEvent>} */
    this.rejectionMap = new WeakMap();

    /** @type {boolean} */
    this.isTracking = false;

    /** @type {StructuredLogger} */
    this.logger = new StructuredLogger('UnhandledRejectionTracker');

    // Bind event handlers
    this._handleUnhandledRejection = this._handleUnhandledRejection.bind(this);
    this._handleRejectionHandled = this._handleRejectionHandled.bind(this);
  }

  /**
   * Start tracking unhandled rejections.
   * Attaches event listeners to window.
   * 
   * @returns {void}
   */
  start() {
    if (this.isTracking) {
      this.logger.warn('Tracker already started');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('Tracker is disabled');
      return;
    }

    window.addEventListener('unhandledrejection', this._handleUnhandledRejection);
    window.addEventListener('rejectionhandled', this._handleRejectionHandled);

    this.isTracking = true;
    this.logger.info('Started tracking unhandled rejections');
  }

  /**
   * Stop tracking unhandled rejections.
   * Removes event listeners from window.
   * 
   * @returns {void}
   */
  stop() {
    if (!this.isTracking) {
      this.logger.warn('Tracker not started');
      return;
    }

    window.removeEventListener('unhandledrejection', this._handleUnhandledRejection);
    window.removeEventListener('rejectionhandled', this._handleRejectionHandled);

    this.isTracking = false;
    this.logger.info('Stopped tracking unhandled rejections');
  }

  /**
   * Handle unhandled rejection event.
   * 
   * @private
   * @param {PromiseRejectionEvent} event - Browser rejection event
   * @returns {void}
   */
  _handleUnhandledRejection(event) {
    const rejectionEvent = this._createRejectionEvent(event.promise, event.reason);

    // Store rejection
    this.rejections.push(rejectionEvent);
    this.rejectionMap.set(event.promise, rejectionEvent);

    // Enforce max storage limit
    if (this.rejections.length > this.config.maxStoredRejections) {
      this.rejections.shift();
    }

    // Log rejection
    this._logRejection(rejectionEvent);

    // Call custom handler
    if (typeof this.config.onRejection === 'function') {
      try {
        this.config.onRejection(rejectionEvent);
      } catch (error) {
        this.logger.error('Error in custom rejection handler', { error });
      }
    }

    // Prevent default browser handling if configured
    if (this.config.preventDefaultHandler) {
      event.preventDefault();
    }
  }

  /**
   * Handle rejection that was later handled.
   * 
   * @private
   * @param {PromiseRejectionEvent} event - Browser rejection event
   * @returns {void}
   */
  _handleRejectionHandled(event) {
    const rejectionEvent = this.rejectionMap.get(event.promise);

    if (rejectionEvent) {
      rejectionEvent.handled = true;
      this.logger.info('Previously unhandled rejection was handled', {
        reason: this._formatReason(event.reason),
        originalTimestamp: rejectionEvent.timestamp
      });
    }
  }

  /**
   * Create a rejection event object.
   * 
   * @private
   * @param {Promise} promise - The rejected promise
   * @param {*} reason - The rejection reason
   * @returns {RejectionEvent}
   */
  _createRejectionEvent(promise, reason) {
    const event = {
      promise,
      reason,
      timestamp: new Date().toISOString(),
      stack: null,
      handled: false
    };

    // Capture stack trace if enabled
    if (this.config.captureStackTrace) {
      event.stack = this._extractStackTrace(reason);
    }

    return event;
  }

  /**
   * Extract stack trace from rejection reason.
   * 
   * @private
   * @param {*} reason - The rejection reason
   * @returns {string|null}
   */
  _extractStackTrace(reason) {
    if (reason instanceof Error && reason.stack) {
      return reason.stack;
    }

    // Try to capture current stack
    if (Error.captureStackTrace) {
      const stackHolder = {};
      Error.captureStackTrace(stackHolder, this._handleUnhandledRejection);
      return stackHolder.stack || null;
    }

    // Fallback: create new Error for stack
    try {
      throw new Error('Stack trace');
    } catch (e) {
      return e.stack || null;
    }
  }

  /**
   * Log rejection event.
   * 
   * @private
   * @param {RejectionEvent} event - The rejection event
   * @returns {void}
   */
  _logRejection(event) {
    const logData = {
      reason: this._formatReason(event.reason),
      timestamp: event.timestamp,
      stack: event.stack
    };

    this.logger.error('Unhandled promise rejection', logData);

    // Also log to console if configured
    if (this.config.logToConsole) {
      console.error('Unhandled promise rejection:', event.reason);
      if (event.stack) {
        console.error('Stack trace:', event.stack);
      }
    }
  }

  /**
   * Format rejection reason for logging.
   * 
   * @private
   * @param {*} reason - The rejection reason
   * @returns {string}
   */
  _formatReason(reason) {
    if (reason instanceof Error) {
      return `${reason.name}: ${reason.message}`;
    }

    if (typeof reason === 'string') {
      return reason;
    }

    if (typeof reason === 'object' && reason !== null) {
      try {
        return JSON.stringify(reason);
      } catch {
        return String(reason);
      }
    }

    return String(reason);
  }

  /**
   * Get all tracked rejections.
   * 
   * @returns {RejectionEvent[]}
   */
  getRejections() {
    return [...this.rejections];
  }

  /**
   * Get unhandled rejections (not later handled).
   * 
   * @returns {RejectionEvent[]}
   */
  getUnhandledRejections() {
    return this.rejections.filter(r => !r.handled);
  }

  /**
   * Clear stored rejections.
   * 
   * @returns {void}
   */
  clearRejections() {
    this.rejections = [];
    this.logger.info('Cleared stored rejections');
  }

  /**
   * Get tracker statistics.
   * 
   * @returns {Object}
   */
  getStats() {
    return {
      total: this.rejections.length,
      unhandled: this.getUnhandledRejections().length,
      handled: this.rejections.filter(r => r.handled).length,
      isTracking: this.isTracking
    };
  }

  /**
   * Update tracker configuration.
   * 
   * @param {Partial<TrackerConfig>} config - Configuration updates
   * @returns {void}
   */
  updateConfig(config) {
    Object.assign(this.config, config);
    this.logger.info('Updated configuration', { config });
  }
}

// Create and export singleton instance
const defaultTracker = new UnhandledRejectionTracker();

// Auto-start in non-production environments
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
  defaultTracker.start();
}

export default defaultTracker;