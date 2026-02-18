/**
 * @fileoverview Error Boundary Component
 * 
 * Provides error catching and fallback UI for component crashes.
 * Implements error boundary pattern using vanilla Web Components.
 * 
 * @module components/error-boundary
 * @see {@link ../../DESIGN_SYSTEM.md#error-handling Error Handling Section}
 */

/**
 * Error Boundary Web Component
 * 
 * Catches JavaScript errors in child components and displays fallback UI.
 * Logs error details for debugging and monitoring.
 * 
 * @class ErrorBoundary
 * @extends HTMLElement
 * 
 * @example
 * <error-boundary>
 *   <my-component></my-component>
 * </error-boundary>
 * 
 * @example
 * <error-boundary fallback-title="Oops!" fallback-message="Something went wrong.">
 *   <my-component></my-component>
 * </error-boundary>
 */
class ErrorBoundary extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hasError = false;
    this._error = null;
    this._errorInfo = null;
    this._originalContent = null;
  }

  static get observedAttributes() {
    return ['fallback-title', 'fallback-message', 'show-details'];
  }

  connectedCallback() {
    this._originalContent = this.innerHTML;
    this._setupErrorHandling();
    this._render();
  }

  disconnectedCallback() {
    this._teardownErrorHandling();
  }

  /**
   * Set up global error handling for child components
   * @private
   */
  _setupErrorHandling() {
    // Capture errors from child components
    this._errorHandler = (event) => {
      // Check if error originated from this boundary's children
      if (this.contains(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        this._handleError(event.error, event);
      }
    };

    // Capture unhandled promise rejections
    this._rejectionHandler = (event) => {
      if (this.contains(event.target)) {
        event.preventDefault();
        this._handleError(event.reason, event);
      }
    };

    window.addEventListener('error', this._errorHandler, true);
    window.addEventListener('unhandledrejection', this._rejectionHandler, true);

    // Wrap custom element lifecycle callbacks
    this._wrapChildComponents();
  }

  /**
   * Remove error handlers
   * @private
   */
  _teardownErrorHandling() {
    window.removeEventListener('error', this._errorHandler, true);
    window.removeEventListener('unhandledrejection', this._rejectionHandler, true);
  }

  /**
   * Wrap child component methods to catch errors
   * @private
   */
  _wrapChildComponents() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName.includes('-')) {
            this._wrapComponentLifecycle(node);
          }
        });
      });
    });

    observer.observe(this, { childList: true, subtree: true });
    this._mutationObserver = observer;

    // Wrap existing children
    this.querySelectorAll('*').forEach((child) => {
      if (child.tagName.includes('-')) {
        this._wrapComponentLifecycle(child);
      }
    });
  }

  /**
   * Wrap individual component lifecycle methods
   * @param {HTMLElement} component - Component to wrap
   * @private
   */
  _wrapComponentLifecycle(component) {
    const lifecycleMethods = [
      'connectedCallback',
      'disconnectedCallback',
      'attributeChangedCallback',
      'adoptedCallback'
    ];

    lifecycleMethods.forEach((method) => {
      if (typeof component[method] === 'function') {
        const original = component[method];
        component[method] = (...args) => {
          try {
            return original.apply(component, args);
          } catch (error) {
            this._handleError(error, { component, method });
          }
        };
      }
    });
  }

  /**
   * Handle caught error
   * @param {Error} error - The error that was caught
   * @param {Object} errorInfo - Additional error context
   * @private
   */
  _handleError(error, errorInfo) {
    this._hasError = true;
    this._error = error;
    this._errorInfo = errorInfo;

    // Log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Publish error event to EventBus if available
    if (window.EventBus) {
      window.EventBus.publish('component:error', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        component: this.tagName.toLowerCase(),
        timestamp: Date.now(),
        info: errorInfo
      });
    }

    // Render fallback UI
    this._render();
  }

  /**
   * Reset error boundary state
   * @public
   */
  reset() {
    this._hasError = false;
    this._error = null;
    this._errorInfo = null;
    this._render();
  }

  /**
   * Render component
   * @private
   */
  _render() {
    const showDetails = this.getAttribute('show-details') === 'true';

    if (this._hasError) {
      this.shadowRoot.innerHTML = this._renderFallback(showDetails);
      this._attachEventListeners();
    } else {
      this.shadowRoot.innerHTML = this._renderNormal();
    }
  }

  /**
   * Render normal state (slot for children)
   * @returns {string} HTML template
   * @private
   */
  _renderNormal() {
    return `
      <style>
        :host {
          display: block;
        }
      </style>
      <slot></slot>
    `;
  }

  /**
   * Render fallback error UI
   * @param {boolean} showDetails - Whether to show error details
   * @returns {string} HTML template
   * @private
   */
  _renderFallback(showDetails) {
    const title = this.getAttribute('fallback-title') || 'Something went wrong';
    const message = this.getAttribute('fallback-message') || 
      'An error occurred while rendering this component.';

    return `
      <style>
        :host {
          display: block;
        }

        .error-boundary {
          padding: var(--spacing-4, 1rem);
          background: var(--color-error-surface, #fef2f2);
          border: 1px solid var(--color-error-border, #fecaca);
          border-radius: var(--radius-2, 0.375rem);
          color: var(--color-error-text, #991b1b);
        }

        .error-boundary__title {
          margin: 0 0 var(--spacing-2, 0.5rem) 0;
          font-size: var(--font-size-lg, 1.125rem);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-error-heading, #7f1d1d);
        }

        .error-boundary__message {
          margin: 0 0 var(--spacing-3, 0.75rem) 0;
          font-size: var(--font-size-base, 1rem);
          line-height: var(--line-height-relaxed, 1.625);
        }

        .error-boundary__actions {
          display: flex;
          gap: var(--spacing-2, 0.5rem);
          margin-top: var(--spacing-3, 0.75rem);
        }

        .error-boundary__button {
          padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
          background: var(--color-error-button, #dc2626);
          color: white;
          border: none;
          border-radius: var(--radius-1, 0.25rem);
          font-size: var(--font-size-sm, 0.875rem);
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .error-boundary__button:hover {
          background: var(--color-error-button-hover, #b91c1c);
        }

        .error-boundary__button--secondary {
          background: var(--color-gray-200, #e5e7eb);
          color: var(--color-gray-900, #111827);
        }

        .error-boundary__button--secondary:hover {
          background: var(--color-gray-300, #d1d5db);
        }

        .error-boundary__details {
          margin-top: var(--spacing-4, 1rem);
          padding: var(--spacing-3, 0.75rem);
          background: var(--color-gray-50, #f9fafb);
          border-radius: var(--radius-1, 0.25rem);
          font-family: var(--font-mono, monospace);
          font-size: var(--font-size-xs, 0.75rem);
          overflow-x: auto;
        }

        .error-boundary__stack {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--color-gray-700, #374151);
        }
      </style>

      <div class="error-boundary">
        <h2 class="error-boundary__title">${this._escapeHtml(title)}</h2>
        <p class="error-boundary__message">${this._escapeHtml(message)}</p>
        
        <div class="error-boundary__actions">
          <button class="error-boundary__button" data-action="reset">
            Try Again
          </button>
          <button class="error-boundary__button error-boundary__button--secondary" data-action="toggle-details">
            ${showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        ${showDetails && this._error ? `
          <div class="error-boundary__details">
            <pre class="error-boundary__stack">${this._escapeHtml(this._error.stack || this._error.message)}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Attach event listeners to fallback UI
   * @private
   */
  _attachEventListeners() {
    const resetButton = this.shadowRoot.querySelector('[data-action="reset"]');
    const detailsButton = this.shadowRoot.querySelector('[data-action="toggle-details"]');

    if (resetButton) {
      resetButton.addEventListener('click', () => this.reset());
    }

    if (detailsButton) {
      detailsButton.addEventListener('click', () => {
        const currentState = this.getAttribute('show-details') === 'true';
        this.setAttribute('show-details', String(!currentState));
      });
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   * @private
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._render();
    }
  }
}

// Register custom element
customElements.define('error-boundary', ErrorBoundary);

export { ErrorBoundary };