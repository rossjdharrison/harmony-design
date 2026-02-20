/**
 * @fileoverview Toast Notification Component
 * @module components/toast-notification
 * 
 * Displays temporary notification messages with configurable severity levels.
 * Supports auto-dismiss, manual dismiss, and action buttons.
 * 
 * @see DESIGN_SYSTEM.md#user-error-feedback-ui
 */

/**
 * Toast notification severity levels
 * @enum {string}
 */
const ToastSeverity = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

/**
 * Toast Notification Web Component
 * 
 * @fires toast-dismissed - When toast is dismissed by user or timeout
 * @fires toast-action - When action button is clicked
 * 
 * @example
 * ```html
 * <toast-notification 
 *   severity="error" 
 *   message="Failed to save changes"
 *   action-label="Retry"
 *   duration="5000">
 * </toast-notification>
 * ```
 */
class ToastNotification extends HTMLElement {
  static get observedAttributes() {
    return ['severity', 'message', 'action-label', 'duration', 'dismissible'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._timeoutId = null;
    this._startTime = null;
    this._remainingTime = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.startAutoDissmiss();
  }

  disconnectedCallback() {
    this.clearAutoDissmiss();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Renders the toast notification
   * Performance target: <1ms render time
   */
  render() {
    const severity = this.getAttribute('severity') || ToastSeverity.INFO;
    const message = this.getAttribute('message') || '';
    const actionLabel = this.getAttribute('action-label');
    const dismissible = this.hasAttribute('dismissible') ? this.getAttribute('dismissible') !== 'false' : true;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          min-width: 300px;
          max-width: 500px;
          margin-bottom: 8px;
          animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        :host([hidden]) {
          display: none;
        }

        .toast {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: var(--toast-bg, #fff);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-left: 4px solid var(--toast-accent);
          position: relative;
          overflow: hidden;
        }

        .toast::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--toast-accent);
          transform-origin: left;
          animation: progress var(--toast-duration, 5000ms) linear;
        }

        .toast.paused::before {
          animation-play-state: paused;
        }

        .icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          margin-top: 2px;
        }

        .content {
          flex: 1;
          min-width: 0;
        }

        .message {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-primary, #1a1a1a);
          word-wrap: break-word;
        }

        .actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .action-btn {
          padding: 4px 12px;
          font-size: 13px;
          font-weight: 500;
          background: transparent;
          border: 1px solid var(--toast-accent);
          color: var(--toast-accent);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: var(--toast-accent);
          color: white;
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        .dismiss-btn {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          padding: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
          margin-top: 2px;
        }

        .dismiss-btn:hover {
          opacity: 1;
        }

        .dismiss-btn svg {
          width: 100%;
          height: 100%;
        }

        /* Severity variants */
        :host([severity="info"]) {
          --toast-accent: #2196F3;
        }

        :host([severity="success"]) {
          --toast-accent: #4CAF50;
        }

        :host([severity="warning"]) {
          --toast-accent: #FF9800;
        }

        :host([severity="error"]) {
          --toast-accent: #F44336;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        :host(.dismissing) {
          animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      </style>

      <div class="toast" role="alert" aria-live="polite">
        <div class="icon">${this.getIcon(severity)}</div>
        <div class="content">
          <p class="message">${this.escapeHtml(message)}</p>
          ${actionLabel ? `
            <div class="actions">
              <button class="action-btn" data-action="primary">${this.escapeHtml(actionLabel)}</button>
            </div>
          ` : ''}
        </div>
        ${dismissible ? `
          <button class="dismiss-btn" aria-label="Dismiss notification">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Gets the icon SVG for a given severity level
   * @param {string} severity - Toast severity
   * @returns {string} SVG markup
   */
  getIcon(severity) {
    const icons = {
      info: `<svg viewBox="0 0 24 24" fill="#2196F3">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>`,
      success: `<svg viewBox="0 0 24 24" fill="#4CAF50">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="#FF9800">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>`,
      error: `<svg viewBox="0 0 24 24" fill="#F44336">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>`
    };
    return icons[severity] || icons.info;
  }

  /**
   * Escapes HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sets up event listeners for user interactions
   */
  setupEventListeners() {
    const toast = this.shadowRoot.querySelector('.toast');
    const dismissBtn = this.shadowRoot.querySelector('.dismiss-btn');
    const actionBtn = this.shadowRoot.querySelector('.action-btn');

    // Pause auto-dismiss on hover
    toast?.addEventListener('mouseenter', () => {
      this.pauseAutoDissmiss();
      toast.classList.add('paused');
    });

    toast?.addEventListener('mouseleave', () => {
      this.resumeAutoDissmiss();
      toast.classList.remove('paused');
    });

    // Dismiss button
    dismissBtn?.addEventListener('click', () => {
      this.dismiss();
    });

    // Action button
    actionBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('toast-action', {
        bubbles: true,
        composed: true,
        detail: { message: this.getAttribute('message') }
      }));
      this.dismiss();
    });
  }

  /**
   * Starts the auto-dismiss timer
   */
  startAutoDissmiss() {
    const duration = parseInt(this.getAttribute('duration') || '5000', 10);
    if (duration > 0) {
      this._remainingTime = duration;
      this._startTime = Date.now();
      this._timeoutId = setTimeout(() => this.dismiss(), duration);
      
      // Set CSS variable for progress animation
      this.style.setProperty('--toast-duration', `${duration}ms`);
    }
  }

  /**
   * Pauses the auto-dismiss timer
   */
  pauseAutoDissmiss() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._remainingTime -= (Date.now() - this._startTime);
    }
  }

  /**
   * Resumes the auto-dismiss timer
   */
  resumeAutoDissmiss() {
    if (this._remainingTime > 0) {
      this._startTime = Date.now();
      this._timeoutId = setTimeout(() => this.dismiss(), this._remainingTime);
    }
  }

  /**
   * Clears the auto-dismiss timer
   */
  clearAutoDissmiss() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  /**
   * Dismisses the toast with animation
   */
  dismiss() {
    this.clearAutoDissmiss();
    this.classList.add('dismissing');
    
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('toast-dismissed', {
        bubbles: true,
        composed: true,
        detail: { message: this.getAttribute('message') }
      }));
      this.remove();
    }, 300);
  }
}

customElements.define('toast-notification', ToastNotification);

export { ToastNotification, ToastSeverity };