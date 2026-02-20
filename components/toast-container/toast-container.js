/**
 * @fileoverview Toast Container Component
 * @module components/toast-container
 * 
 * Container for managing multiple toast notifications.
 * Handles positioning, stacking, and queue management.
 * 
 * @see DESIGN_SYSTEM.md#user-error-feedback-ui
 */

import '../toast-notification/toast-notification.js';

/**
 * Toast Container Web Component
 * 
 * Manages a queue of toast notifications with configurable positioning.
 * Automatically removes dismissed toasts and enforces max visible count.
 * 
 * @example
 * ```html
 * <toast-container position="top-right" max-toasts="5"></toast-container>
 * ```
 */
class ToastContainer extends HTMLElement {
  static get observedAttributes() {
    return ['position', 'max-toasts'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._toastQueue = [];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Renders the toast container
   */
  render() {
    const position = this.getAttribute('position') || 'top-right';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 10000;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        :host([position="top-right"]) {
          top: 16px;
          right: 16px;
        }

        :host([position="top-left"]) {
          top: 16px;
          left: 16px;
        }

        :host([position="top-center"]) {
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
        }

        :host([position="bottom-right"]) {
          bottom: 16px;
          right: 16px;
          flex-direction: column-reverse;
        }

        :host([position="bottom-left"]) {
          bottom: 16px;
          left: 16px;
          flex-direction: column-reverse;
        }

        :host([position="bottom-center"]) {
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          flex-direction: column-reverse;
        }

        ::slotted(*) {
          pointer-events: auto;
        }

        @media (max-width: 640px) {
          :host {
            left: 8px !important;
            right: 8px !important;
            transform: none !important;
          }
        }
      </style>

      <slot></slot>
    `;
  }

  /**
   * Sets up event listeners for toast management
   */
  setupEventListeners() {
    // Listen for toast-dismissed events
    this.addEventListener('toast-dismissed', (e) => {
      this.removeToast(e.target);
    });
  }

  /**
   * Adds a new toast notification
   * @param {Object} config - Toast configuration
   * @param {string} config.severity - Toast severity level
   * @param {string} config.message - Toast message
   * @param {string} [config.actionLabel] - Optional action button label
   * @param {number} [config.duration=5000] - Auto-dismiss duration in ms
   * @param {boolean} [config.dismissible=true] - Whether toast can be manually dismissed
   * @returns {HTMLElement} The created toast element
   */
  addToast(config) {
    const maxToasts = parseInt(this.getAttribute('max-toasts') || '5', 10);
    
    // Remove oldest toast if at capacity
    if (this.children.length >= maxToasts) {
      const oldestToast = this.children[0];
      oldestToast?.dismiss?.();
    }

    const toast = document.createElement('toast-notification');
    toast.setAttribute('severity', config.severity || 'info');
    toast.setAttribute('message', config.message || '');
    
    if (config.actionLabel) {
      toast.setAttribute('action-label', config.actionLabel);
    }
    
    if (config.duration !== undefined) {
      toast.setAttribute('duration', config.duration.toString());
    }
    
    if (config.dismissible === false) {
      toast.setAttribute('dismissible', 'false');
    }

    // Add to queue
    this._toastQueue.push(toast);
    this.appendChild(toast);

    return toast;
  }

  /**
   * Removes a toast from the container
   * @param {HTMLElement} toast - Toast element to remove
   */
  removeToast(toast) {
    const index = this._toastQueue.indexOf(toast);
    if (index > -1) {
      this._toastQueue.splice(index, 1);
    }
  }

  /**
   * Clears all toasts
   */
  clearAll() {
    this._toastQueue.forEach(toast => {
      toast.dismiss?.();
    });
    this._toastQueue = [];
  }

  /**
   * Shows an info toast
   * @param {string} message - Toast message
   * @param {Object} [options] - Additional options
   * @returns {HTMLElement} The created toast element
   */
  info(message, options = {}) {
    return this.addToast({ ...options, message, severity: 'info' });
  }

  /**
   * Shows a success toast
   * @param {string} message - Toast message
   * @param {Object} [options] - Additional options
   * @returns {HTMLElement} The created toast element
   */
  success(message, options = {}) {
    return this.addToast({ ...options, message, severity: 'success' });
  }

  /**
   * Shows a warning toast
   * @param {string} message - Toast message
   * @param {Object} [options] - Additional options
   * @returns {HTMLElement} The created toast element
   */
  warning(message, options = {}) {
    return this.addToast({ ...options, message, severity: 'warning' });
  }

  /**
   * Shows an error toast
   * @param {string} message - Toast message
   * @param {Object} [options] - Additional options
   * @returns {HTMLElement} The created toast element
   */
  error(message, options = {}) {
    return this.addToast({ ...options, message, severity: 'error' });
  }
}

customElements.define('toast-container', ToastContainer);

export { ToastContainer };