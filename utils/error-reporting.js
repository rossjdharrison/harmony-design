/**
 * @fileoverview Error Reporting Utilities
 * @module utils/error-reporting
 * 
 * Utilities for reporting and tracking errors in production.
 * Provides error aggregation, rate limiting, and remote logging.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Error Handling
 * Related Code: See core/error-boundary.js for error catching
 */

/**
 * Error report structure
 * @typedef {Object} ErrorReport
 * @property {string} message - Error message
 * @property {string} stack - Stack trace
 * @property {string} timestamp - ISO timestamp
 * @property {string} url - Page URL
 * @property {string} userAgent - Browser user agent
 * @property {Object} context - Additional context
 */

/**
 * Error Reporter Class
 * Aggregates and reports errors with rate limiting
 */
export class ErrorReporter {
  constructor(config = {}) {
    this.config = {
      endpoint: config.endpoint || null,
      maxReportsPerMinute: config.maxReportsPerMinute || 10,
      batchSize: config.batchSize || 5,
      batchInterval: config.batchInterval || 5000,
      includeUserAgent: config.includeUserAgent !== false,
      includeUrl: config.includeUrl !== false,
    };

    this.reports = [];
    this.reportCounts = new Map();
    this.batchTimer = null;
  }

  /**
   * Report an error
   * @param {Error} error - The error
   * @param {Object} context - Additional context
   */
  report(error, context = {}) {
    // Rate limiting
    const key = `${error.message}:${error.stack?.split('\n')[1] || ''}`;
    const now = Date.now();
    const count = this.reportCounts.get(key) || { count: 0, timestamp: now };

    // Reset count if minute has passed
    if (now - count.timestamp > 60000) {
      count.count = 0;
      count.timestamp = now;
    }

    // Check rate limit
    if (count.count >= this.config.maxReportsPerMinute) {
      console.warn('Error report rate limit exceeded:', key);
      return;
    }

    count.count++;
    this.reportCounts.set(key, count);

    // Create report
    const report = this.createReport(error, context);
    this.reports.push(report);

    // Batch or send immediately
    if (this.reports.length >= this.config.batchSize) {
      this.flush();
    } else {
      this.scheduleBatch();
    }
  }

  /**
   * Create error report object
   * @param {Error} error - The error
   * @param {Object} context - Additional context
   * @returns {ErrorReport} Error report
   */
  createReport(error, context) {
    return {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: this.config.includeUrl ? window.location.href : undefined,
      userAgent: this.config.includeUserAgent ? navigator.userAgent : undefined,
      context,
    };
  }

  /**
   * Schedule batch send
   */
  scheduleBatch() {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.flush();
    }, this.config.batchInterval);
  }

  /**
   * Flush pending reports
   */
  async flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.reports.length === 0) return;

    const batch = this.reports.splice(0, this.reports.length);

    if (this.config.endpoint) {
      try {
        await this.sendReports(batch);
      } catch (error) {
        console.error('Failed to send error reports:', error);
      }
    } else {
      // Log to console if no endpoint configured
      console.log('Error reports (no endpoint configured):', batch);
    }
  }

  /**
   * Send reports to endpoint
   * @param {ErrorReport[]} reports - Reports to send
   */
  async sendReports(reports) {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reports }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send reports: ${response.status}`);
    }
  }
}

/**
 * Global error reporter instance
 * @type {ErrorReporter}
 */
export const globalErrorReporter = new ErrorReporter();

/**
 * Install error reporter with error boundary
 * @param {ErrorBoundary} boundary - Error boundary instance
 * @param {ErrorReporter} reporter - Error reporter instance
 */
export function installErrorReporting(boundary, reporter = globalErrorReporter) {
  const originalOnError = boundary.config.onError;

  boundary.config.onError = (error, errorInfo) => {
    // Call original handler
    if (originalOnError) {
      originalOnError(error, errorInfo);
    }

    // Report error
    reporter.report(error, {
      componentStack: errorInfo.componentStack,
      componentName: errorInfo.componentName,
      phase: errorInfo.phase,
      props: errorInfo.props,
    });
  };
}