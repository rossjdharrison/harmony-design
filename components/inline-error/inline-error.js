/**
 * @fileoverview Inline Error Message Component
 * @module components/inline-error
 * 
 * Displays contextual error messages inline with form fields or content.
 * Supports error descriptions and recovery suggestions.
 * 
 * @see DESIGN_SYSTEM.md#user-error-feedback-ui
 */

/**
 * Inline Error Web Component
 * 
 * Shows error messages with optional recovery suggestions inline with content.
 * 
 * @fires error-action - When a recovery action is clicked
 * 
 * @example
 * ```html
 * <inline-error 
 *   message="Invalid email address"
 *   suggestion="Please enter a valid email in the format: user@example.com">
 * </inline-error>
 * ```
 */
class InlineError extends HTMLElement {
  static get observedAttributes() {
    return ['message', 'suggestion', 'action-label', 'visible'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
   * Renders the inline error message
   */
  render() {
    const message = this.getAttribute('message') || '';
    const suggestion = this.getAttribute('suggestion');
    const actionLabel = this.getAttribute('action-label');
    const visible = this.hasAttribute('visible') ? this.getAttribute('visible') !== 'false' : true;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: ${visible ? 'block' : 'none'};
          margin-top: 4px;
          animation: fadeIn 0.2s ease-out;
        }

        :host([hidden]) {
          display: none;
        }

        .error-container {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 12px;
          background: var(--error-bg, #FEE);
          border: 1px solid var(--error-border, #F44336);
          border-radius: 4px;
        }

        .icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          margin-top: 1px;
        }

        .content {
          flex: 1;
          min-width: 0;
        }

        .message {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--error-color, #D32F2F);
          line-height: 1.4;
        }

        .suggestion {
          margin: 0;
          font-size: 13px;
          color: var(--error-text, #666);
          line-height: 1.5;
        }

        .action {
          margin-top: 8px;
        }

        .action-btn {
          padding: 4px 12px;
          font-size: 13px;
          font-weight: 500;
          background: transparent;
          border: 1px solid var(--error-color, #D32F2F);
          color: var(--error-color, #D32F2F);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: var(--error-color, #D32F2F);
          color: white;
        }

        .action-btn:active {
          transform: scale(0.95);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      </style>

      <div class="error-container" role="alert" aria-live="polite">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="#D32F2F">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div class="content">
          <p class="message">${this.escapeHtml(message)}</p>
          ${suggestion ? `<p class="suggestion">${this.escapeHtml(suggestion)}</p>` : ''}
          ${actionLabel ? `
            <div class="action">
              <button class="action-btn">${this.escapeHtml(actionLabel)}</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
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
   * Sets up event listeners
   */
  setupEventListeners() {
    const actionBtn = this.shadowRoot.querySelector('.action-btn');
    
    actionBtn?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('error-action', {
        bubbles: true,
        composed: true,
        detail: { 
          message: this.getAttribute('message'),
          action: this.getAttribute('action-label')
        }
      }));
    });
  }

  /**
   * Shows the error message
   */
  show() {
    this.setAttribute('visible', 'true');
  }

  /**
   * Hides the error message
   */
  hide() {
    this.setAttribute('visible', 'false');
  }
}

customElements.define('inline-error', InlineError);

export { InlineError };