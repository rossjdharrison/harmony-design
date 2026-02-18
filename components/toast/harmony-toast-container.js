/**
 * @fileoverview Toast Container Component
 * @module components/toast/harmony-toast-container
 * 
 * Container for displaying toast notifications.
 * Manages toast lifecycle, positioning, and animations.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Toast Notifications
 */

/**
 * @typedef {Object} ToastConfig
 * @property {string} message - Toast message
 * @property {'error'|'warning'|'info'|'success'} [severity='info'] - Severity level
 * @property {number} [duration=5000] - Duration in ms (0 = persistent)
 * @property {boolean} [dismissible=true] - Can user dismiss
 * @property {Function} [onAction] - Action callback
 * @property {string} [actionLabel] - Action button label
 */

/**
 * Toast container web component
 * @class HarmonyToastContainer
 * @extends HTMLElement
 */
class HarmonyToastContainer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Array<{id: string, config: ToastConfig, element: HTMLElement}>} */
    this.toasts = [];
    
    /** @type {number} */
    this.nextId = 0;
    
    /** @type {number} */
    this.maxToasts = 5;
  }

  connectedCallback() {
    this.render();
    this.setupStyles();
  }

  /**
   * Render the toast container
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <div class="toast-container" role="region" aria-live="polite" aria-label="Notifications">
        <!-- Toasts will be inserted here -->
      </div>
    `;
  }

  /**
   * Setup component styles
   * @private
   */
  setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      }

      .toast-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 300px;
        max-width: 400px;
      }

      .toast {
        pointer-events: auto;
        background: var(--surface-color, #2a2a2a);
        color: var(--text-color, #ffffff);
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        animation: slideIn 0.3s ease-out;
        transform-origin: top right;
      }

      .toast.removing {
        animation: slideOut 0.3s ease-in forwards;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }

      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
        to {
          opacity: 0;
          transform: translateX(100%) scale(0.9);
        }
      }

      .toast-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .toast-content {
        flex: 1;
        min-width: 0;
      }

      .toast-message {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
      }

      .toast-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .toast-button {
        background: transparent;
        border: 1px solid currentColor;
        color: inherit;
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .toast-button:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .toast-close {
        flex-shrink: 0;
        background: transparent;
        border: none;
        color: inherit;
        padding: 0;
        width: 20px;
        height: 20px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .toast-close:hover {
        opacity: 1;
      }

      /* Severity styles */
      .toast.error {
        border-left: 4px solid #ef4444;
      }

      .toast.warning {
        border-left: 4px solid #f59e0b;
      }

      .toast.success {
        border-left: 4px solid #10b981;
      }

      .toast.info {
        border-left: 4px solid #3b82f6;
      }

      .toast-icon.error { color: #ef4444; }
      .toast-icon.warning { color: #f59e0b; }
      .toast-icon.success { color: #10b981; }
      .toast-icon.info { color: #3b82f6; }
    `;
    this.shadowRoot.appendChild(style);
  }

  /**
   * Show a toast notification
   * @param {ToastConfig} config - Toast configuration
   * @returns {string} Toast ID
   */
  showToast(config) {
    // Remove oldest toast if at max capacity
    if (this.toasts.length >= this.maxToasts) {
      this.removeToast(this.toasts[0].id);
    }

    const id = `toast-${this.nextId++}`;
    const element = this.createToastElement(id, config);
    
    const container = this.shadowRoot.querySelector('.toast-container');
    container.appendChild(element);

    this.toasts.push({ id, config, element });

    // Auto-dismiss if duration specified
    if (config.duration && config.duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, config.duration);
    }

    return id;
  }

  /**
   * Create toast DOM element
   * @private
   * @param {string} id - Toast ID
   * @param {ToastConfig} config - Toast configuration
   * @returns {HTMLElement} Toast element
   */
  createToastElement(id, config) {
    const toast = document.createElement('div');
    toast.className = `toast ${config.severity || 'info'}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('data-toast-id', id);

    const icon = this.getIconForSeverity(config.severity || 'info');
    
    toast.innerHTML = `
      <div class="toast-icon ${config.severity || 'info'}">
        ${icon}
      </div>
      <div class="toast-content">
        <p class="toast-message">${this.escapeHtml(config.message)}</p>
        ${config.onAction && config.actionLabel ? `
          <div class="toast-actions">
            <button class="toast-button toast-action">${this.escapeHtml(config.actionLabel)}</button>
          </div>
        ` : ''}
      </div>
      ${config.dismissible !== false ? `
        <button class="toast-close" aria-label="Close notification">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="5" x2="15" y2="15"/>
            <line x1="15" y1="5" x2="5" y2="15"/>
          </svg>
        </button>
      ` : ''}
    `;

    // Setup event listeners
    if (config.dismissible !== false) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.removeToast(id));
    }

    if (config.onAction) {
      const actionBtn = toast.querySelector('.toast-action');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          config.onAction();
          this.removeToast(id);
        });
      }
    }

    return toast;
  }

  /**
   * Get icon SVG for severity level
   * @private
   * @param {string} severity - Severity level
   * @returns {string} SVG markup
   */
  getIconForSeverity(severity) {
    const icons = {
      error: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="10" y1="6" x2="10" y2="11" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="14" r="1"/></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2L2 16h16L10 2z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="10" y1="8" x2="10" y2="12" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="14" r="1"/></svg>',
      success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><path d="M6 10l3 3 5-6"/></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="7" r="1"/><line x1="10" y1="9" x2="10" y2="14" stroke="currentColor" stroke-width="2"/></svg>'
    };
    return icons[severity] || icons.info;
  }

  /**
   * Remove a toast by ID
   * @param {string} id - Toast ID
   */
  removeToast(id) {
    const toastIndex = this.toasts.findIndex(t => t.id === id);
    if (toastIndex === -1) return;

    const toast = this.toasts[toastIndex];
    toast.element.classList.add('removing');

    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      this.toasts.splice(toastIndex, 1);
    }, 300); // Match animation duration
  }

  /**
   * Clear all toasts
   */
  clearAll() {
    this.toasts.forEach(toast => {
      this.removeToast(toast.id);
    });
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('harmony-toast-container', HarmonyToastContainer);

export { HarmonyToastContainer };