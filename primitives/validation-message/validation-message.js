/**
 * @fileoverview ValidationMessage Web Component
 * Displays validation feedback with appropriate styling and icons.
 * Part of UI-Layer Validation system for immediate user feedback.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#ui-layer-validation}
 */

/**
 * ValidationMessage component displays validation feedback to users.
 * Supports error, warning, success, and info severity levels.
 * 
 * @class ValidationMessage
 * @extends HTMLElement
 * 
 * @attr {string} severity - Validation severity: 'error' | 'warning' | 'success' | 'info'
 * @attr {string} message - Validation message text
 * @attr {boolean} visible - Controls visibility
 * 
 * @example
 * <validation-message severity="error" message="Email is required"></validation-message>
 */
class ValidationMessage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['severity', 'message', 'visible'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Gets icon for severity level
   * @private
   * @param {string} severity - Severity level
   * @returns {string} SVG icon markup
   */
  getIcon(severity) {
    const icons = {
      error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm1 12H7v-2h2v2zm0-3H7V4h2v5z"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8.982 1.566a1.13 1.13 0 00-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5a.905.905 0 01.9.995l-.35 3.507a.552.552 0 01-1.1 0L7.1 5.995A.905.905 0 018 5zm.002 6a1 1 0 110 2 1 1 0 010-2z"/></svg>',
      success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.97 4.97a.75.75 0 00-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 00-1.06 1.06L6.97 11.03a.75.75 0 001.079-.02l3.992-4.99a.75.75 0 00-.01-1.05z"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zm.93 4.588l-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533l1.002-4.705zM8 1.5a1 1 0 100 2 1 1 0 000-2z"/></svg>'
    };
    return icons[severity] || icons.info;
  }

  render() {
    const severity = this.getAttribute('severity') || 'info';
    const message = this.getAttribute('message') || '';
    const visible = this.hasAttribute('visible');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
          font-size: var(--font-size-sm, 0.875rem);
          line-height: 1.5;
        }

        :host([hidden]) {
          display: none;
        }

        .validation-message {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: var(--border-radius-sm, 4px);
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 200ms ease-out, transform 200ms ease-out;
        }

        .validation-message.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .validation-message.error {
          color: var(--color-error-text, #dc2626);
          background: var(--color-error-bg, #fef2f2);
          border: 1px solid var(--color-error-border, #fecaca);
        }

        .validation-message.warning {
          color: var(--color-warning-text, #d97706);
          background: var(--color-warning-bg, #fffbeb);
          border: 1px solid var(--color-warning-border, #fde68a);
        }

        .validation-message.success {
          color: var(--color-success-text, #059669);
          background: var(--color-success-bg, #f0fdf4);
          border: 1px solid var(--color-success-border, #bbf7d0);
        }

        .validation-message.info {
          color: var(--color-info-text, #0284c7);
          background: var(--color-info-bg, #f0f9ff);
          border: 1px solid var(--color-info-border, #bae6fd);
        }

        .icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          margin-top: 0.125rem;
        }

        .message {
          flex: 1;
          word-break: break-word;
        }
      </style>
      <div class="validation-message ${severity} ${visible ? 'visible' : ''}" role="alert" aria-live="polite">
        <span class="icon">${this.getIcon(severity)}</span>
        <span class="message">${message}</span>
      </div>
    `;
  }
}

customElements.define('validation-message', ValidationMessage);

export { ValidationMessage };