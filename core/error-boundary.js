/**
 * @fileoverview Global Error Boundary System
 * @module core/error-boundary
 * 
 * Provides error boundary functionality for Web Components and vanilla JS components.
 * Catches errors during rendering, logs them with context, and displays fallback UI.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Error Handling
 * 
 * @example
 * // Wrap a component with error boundary
 * const boundary = new ErrorBoundary({
 *   fallback: (error) => `<div>Error: ${error.message}</div>`,
 *   onError: (error, errorInfo) => console.error(error)
 * });
 * boundary.wrap(myComponent);
 */

/**
 * Error information context
 * @typedef {Object} ErrorInfo
 * @property {string} componentStack - Component hierarchy where error occurred
 * @property {string} timestamp - ISO timestamp of error
 * @property {string} [componentName] - Name of component that errored
 * @property {Object} [props] - Component props at time of error
 * @property {string} phase - Lifecycle phase: 'mount', 'update', 'render', 'unmount'
 */

/**
 * Error boundary configuration
 * @typedef {Object} ErrorBoundaryConfig
 * @property {Function} [fallback] - Function that returns fallback HTML string
 * @property {Function} [onError] - Error handler callback
 * @property {boolean} [logToConsole=true] - Whether to log errors to console
 * @property {boolean} [captureStack=true] - Whether to capture component stack
 * @property {number} [resetTimeout=5000] - Time before allowing retry (ms)
 */

/**
 * Global Error Boundary Class
 * Provides error catching and recovery for components
 */
export class ErrorBoundary {
  /**
   * @param {ErrorBoundaryConfig} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      fallback: config.fallback || this.defaultFallback,
      onError: config.onError || null,
      logToConsole: config.logToConsole !== false,
      captureStack: config.captureStack !== false,
      resetTimeout: config.resetTimeout || 5000,
    };

    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    this.resetTimer = null;
    this.wrappedComponents = new WeakMap();
  }

  /**
   * Default fallback UI renderer
   * @param {Error} error - The error that occurred
   * @param {ErrorInfo} errorInfo - Additional error context
   * @returns {string} HTML string for fallback UI
   */
  defaultFallback(error, errorInfo) {
    return `
      <div class="error-boundary-fallback" role="alert" style="
        padding: 1rem;
        margin: 1rem 0;
        border: 2px solid #dc2626;
        border-radius: 0.5rem;
        background: #fef2f2;
        color: #991b1b;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.125rem; font-weight: 600;">
          ⚠️ Component Error
        </h3>
        <p style="margin: 0 0 0.5rem 0; font-size: 0.875rem;">
          <strong>Message:</strong> ${this.escapeHtml(error.message)}
        </p>
        ${errorInfo.componentName ? `
          <p style="margin: 0 0 0.5rem 0; font-size: 0.875rem;">
            <strong>Component:</strong> ${this.escapeHtml(errorInfo.componentName)}
          </p>
        ` : ''}
        <p style="margin: 0; font-size: 0.75rem; color: #7f1d1d;">
          Check console for details. This component will retry automatically.
        </p>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS in error messages
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Capture component stack trace
   * @param {HTMLElement} element - Element where error occurred
   * @returns {string} Component stack string
   */
  captureComponentStack(element) {
    const stack = [];
    let current = element;

    while (current && stack.length < 10) {
      const tagName = current.tagName?.toLowerCase();
      const id = current.id ? `#${current.id}` : '';
      const classes = current.className ? `.${current.className.split(' ').join('.')}` : '';
      
      if (tagName) {
        stack.push(`${tagName}${id}${classes}`);
      }

      current = current.parentElement || current.getRootNode()?.host;
    }

    return stack.join(' > ');
  }

  /**
   * Log error with full context
   * @param {Error} error - The error
   * @param {ErrorInfo} errorInfo - Error context
   */
  logError(error, errorInfo) {
    if (!this.config.logToConsole) return;

    console.group('🚨 Error Boundary Caught Error');
    console.error('Error:', error);
    console.log('Component Stack:', errorInfo.componentStack);
    console.log('Phase:', errorInfo.phase);
    console.log('Timestamp:', errorInfo.timestamp);
    
    if (errorInfo.componentName) {
      console.log('Component Name:', errorInfo.componentName);
    }
    
    if (errorInfo.props) {
      console.log('Props:', errorInfo.props);
    }
    
    if (error.stack) {
      console.log('Stack Trace:', error.stack);
    }
    
    console.groupEnd();
  }

  /**
   * Handle caught error
   * @param {Error} error - The error
   * @param {HTMLElement} element - Element where error occurred
   * @param {string} phase - Lifecycle phase
   * @param {Object} [additionalInfo] - Additional context
   */
  handleError(error, element, phase = 'render', additionalInfo = {}) {
    this.hasError = true;
    this.error = error;

    // Build error info
    this.errorInfo = {
      componentStack: this.config.captureStack ? this.captureComponentStack(element) : 'Stack capture disabled',
      timestamp: new Date().toISOString(),
      phase,
      componentName: element.tagName?.toLowerCase() || additionalInfo.componentName,
      props: additionalInfo.props,
    };

    // Log error
    this.logError(error, this.errorInfo);

    // Call custom error handler
    if (this.config.onError) {
      try {
        this.config.onError(error, this.errorInfo);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }

    // Render fallback
    this.renderFallback(element);

    // Schedule reset
    this.scheduleReset();
  }

  /**
   * Render fallback UI
   * @param {HTMLElement} element - Element to render fallback into
   */
  renderFallback(element) {
    try {
      const fallbackHtml = this.config.fallback(this.error, this.errorInfo);
      
      // If element has shadow root, render into it
      if (element.shadowRoot) {
        element.shadowRoot.innerHTML = fallbackHtml;
      } else {
        element.innerHTML = fallbackHtml;
      }
    } catch (fallbackError) {
      console.error('Error rendering fallback:', fallbackError);
      element.textContent = `Error: ${this.error.message}`;
    }
  }

  /**
   * Schedule automatic reset
   */
  scheduleReset() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.reset();
    }, this.config.resetTimeout);
  }

  /**
   * Reset error boundary state
   */
  reset() {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  /**
   * Wrap a Web Component class with error boundary
   * @param {Function} ComponentClass - Web Component class
   * @returns {Function} Wrapped component class
   */
  wrapComponent(ComponentClass) {
    const boundary = this;

    return class ErrorBoundaryWrapper extends ComponentClass {
      constructor() {
        super();
        boundary.wrappedComponents.set(this, boundary);
      }

      connectedCallback() {
        try {
          if (super.connectedCallback) {
            super.connectedCallback();
          }
        } catch (error) {
          boundary.handleError(error, this, 'mount');
        }
      }

      disconnectedCallback() {
        try {
          if (super.disconnectedCallback) {
            super.disconnectedCallback();
          }
        } catch (error) {
          boundary.handleError(error, this, 'unmount');
        }
      }

      attributeChangedCallback(name, oldValue, newValue) {
        try {
          if (super.attributeChangedCallback) {
            super.attributeChangedCallback(name, oldValue, newValue);
          }
        } catch (error) {
          boundary.handleError(error, this, 'update', { 
            props: { [name]: { old: oldValue, new: newValue } }
          });
        }
      }
    };
  }

  /**
   * Wrap a render function with error handling
   * @param {Function} renderFn - Render function to wrap
   * @param {HTMLElement} element - Target element
   * @returns {Function} Wrapped render function
   */
  wrapRender(renderFn, element) {
    const boundary = this;

    return function wrappedRender(...args) {
      try {
        return renderFn.apply(this, args);
      } catch (error) {
        boundary.handleError(error, element, 'render');
        return null;
      }
    };
  }
}

/**
 * Global error boundary instance
 * @type {ErrorBoundary}
 */
export const globalErrorBoundary = new ErrorBoundary({
  logToConsole: true,
  captureStack: true,
});

/**
 * Install global error handlers
 * Catches unhandled errors and promise rejections
 */
export function installGlobalErrorHandlers() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
    
    // Try to find the component that errored
    const target = event.target;
    if (target instanceof HTMLElement && target.tagName.includes('-')) {
      globalErrorBoundary.handleError(
        event.error || new Error(event.message),
        target,
        'runtime'
      );
    }
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Create error if reason is not an Error object
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    // Log with global boundary
    globalErrorBoundary.logError(error, {
      componentStack: 'Promise rejection (no component context)',
      timestamp: new Date().toISOString(),
      phase: 'async',
    });
  });
}

/**
 * Decorator for wrapping Web Component methods with error handling
 * @param {HTMLElement} target - Component instance
 * @param {string} propertyKey - Method name
 * @param {PropertyDescriptor} descriptor - Method descriptor
 * @returns {PropertyDescriptor} Modified descriptor
 */
export function catchErrors(target, propertyKey, descriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args) {
    try {
      return originalMethod.apply(this, args);
    } catch (error) {
      const boundary = globalErrorBoundary.wrappedComponents.get(this) || globalErrorBoundary;
      boundary.handleError(error, this, propertyKey);
      return null;
    }
  };

  return descriptor;
}