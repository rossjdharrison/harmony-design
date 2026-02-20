/**
 * @fileoverview Error Boundary Web Component
 * @module components/error-boundary-component
 * 
 * Web Component wrapper that provides error boundary functionality.
 * Can be used declaratively in HTML to wrap other components.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Error Handling
 * Related Code: See core/error-boundary.js for ErrorBoundary class
 * 
 * @example
 * <error-boundary fallback-message="Something went wrong">
 *   <my-component></my-component>
 * </error-boundary>
 */

import { ErrorBoundary } from '../core/error-boundary.js';

/**
 * Error Boundary Web Component
 * Wraps child components and catches their errors
 * 
 * @element error-boundary
 * 
 * @attr {string} fallback-message - Custom error message
 * @attr {boolean} show-stack - Whether to show component stack in UI
 * @attr {number} reset-timeout - Time before reset (ms)
 * 
 * @slot default - Components to protect with error boundary
 * 
 * @fires error-caught - Dispatched when error is caught
 * @fires error-reset - Dispatched when boundary resets
 */
export class ErrorBoundaryComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Create error boundary instance
    this.boundary = new ErrorBoundary({
      fallback: this.createFallback.bind(this),
      onError: this.onErrorCaught.bind(this),
      resetTimeout: parseInt(this.getAttribute('reset-timeout')) || 5000,
    });

    this.hasError = false;
    this.observer = null;
  }

  /**
   * Observed attributes
   * @returns {string[]} Attribute names to observe
   */
  static get observedAttributes() {
    return ['fallback-message', 'show-stack', 'reset-timeout'];
  }

  /**
   * Component connected to DOM
   */
  connectedCallback() {
    this.render();
    this.setupErrorMonitoring();
  }

  /**
   * Component disconnected from DOM
   */
  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * Attribute changed handler
   * @param {string} name - Attribute name
   * @param {string} oldValue - Old value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && !this.hasError) {
      this.render();
    }
  }

  /**
   * Create custom fallback UI
   * @param {Error} error - The error
   * @param {Object} errorInfo - Error context
   * @returns {string} Fallback HTML
   */
  createFallback(error, errorInfo) {
    const message = this.getAttribute('fallback-message') || 'An error occurred';
    const showStack = this.hasAttribute('show-stack');

    return `
      <style>
        .error-boundary-fallback {
          padding: 1rem;
          border: 2px solid var(--color-error, #dc2626);
          border-radius: 0.5rem;
          background: var(--color-error-bg, #fef2f2);
          color: var(--color-error-text, #991b1b);
          font-family: var(--font-family, system-ui, -apple-system, sans-serif);
        }

        .error-boundary-fallback h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .error-boundary-fallback p {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
        }

        .error-boundary-fallback details {
          margin-top: 0.5rem;
          font-size: 0.75rem;
        }

        .error-boundary-fallback summary {
          cursor: pointer;
          font-weight: 500;
        }

        .error-boundary-fallback code {
          display: block;
          margin-top: 0.25rem;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 0.25rem;
          font-family: monospace;
          overflow-x: auto;
        }

        .error-boundary-fallback button {
          margin-top: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--color-error, #dc2626);
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .error-boundary-fallback button:hover {
          background: var(--color-error-hover, #b91c1c);
        }
      </style>
      <div class="error-boundary-fallback" role="alert">
        <h3>⚠️ ${this.escapeHtml(message)}</h3>
        <p><strong>Error:</strong> ${this.escapeHtml(error.message)}</p>
        ${showStack && errorInfo.componentStack ? `
          <details>
            <summary>Component Stack</summary>
            <code>${this.escapeHtml(errorInfo.componentStack)}</code>
          </details>
        ` : ''}
        <button onclick="this.getRootNode().host.retry()">Retry</button>
      </div>
    `;
  }

  /**
   * Escape HTML
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Error caught handler
   * @param {Error} error - The error
   * @param {Object} errorInfo - Error context
   */
  onErrorCaught(error, errorInfo) {
    this.hasError = true;

    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('error-caught', {
      detail: { error, errorInfo },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Set up error monitoring for slotted content
   */
  setupErrorMonitoring() {
    // Monitor slot changes
    const slot = this.shadowRoot.querySelector('slot');
    
    slot.addEventListener('slotchange', () => {
      const elements = slot.assignedElements();
      
      // Watch for errors in slotted elements
      elements.forEach(element => {
        this.monitorElement(element);
      });
    });
  }

  /**
   * Monitor an element for errors
   * @param {HTMLElement} element - Element to monitor
   */
  monitorElement(element) {
    // Wrap custom element lifecycle methods
    if (element.tagName.includes('-')) {
      const originalConnected = element.connectedCallback;
      if (originalConnected) {
        element.connectedCallback = () => {
          try {
            originalConnected.call(element);
          } catch (error) {
            this.boundary.handleError(error, element, 'mount');
          }
        };
      }
    }

    // Monitor child additions
    if (!this.observer) {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node instanceof HTMLElement && node.tagName.includes('-')) {
              this.monitorElement(node);
            }
          });
        });
      });
    }

    this.observer.observe(element, { childList: true, subtree: true });
  }

  /**
   * Retry after error
   */
  retry() {
    this.hasError = false;
    this.boundary.reset();
    this.render();

    this.dispatchEvent(new CustomEvent('error-reset', {
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Render component
   */
  render() {
    if (this.hasError) {
      return; // Fallback already rendered by boundary
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }
}

// Register component
customElements.define('error-boundary', ErrorBoundaryComponent);