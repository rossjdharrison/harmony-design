/**
 * @fileoverview ARIA Dialog Pattern - Accessible modal dialog
 * @module primitives/aria-patterns/aria-dialog
 * 
 * Implements WAI-ARIA dialog pattern with:
 * - Focus trap
 * - Escape key to close
 * - Backdrop click to close (optional)
 * - Proper ARIA attributes
 * - Return focus on close
 * 
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 */

/**
 * ARIA Dialog Web Component
 * Provides accessible modal dialog with focus management
 * 
 * @fires dialog-open - Fired when dialog opens
 * @fires dialog-close - Fired when dialog closes
 * 
 * @example
 * <aria-dialog label="Confirm Action" modal>
 *   <h2 slot="title">Are you sure?</h2>
 *   <p>This action cannot be undone.</p>
 *   <div slot="actions">
 *     <button>Cancel</button>
 *     <button>Confirm</button>
 *   </div>
 * </aria-dialog>
 */
export class AriaDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this._previousFocus = null;
    this._focusableElements = [];
    this._isOpen = false;
  }

  static get observedAttributes() {
    return ['open', 'modal', 'label', 'close-on-backdrop'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    
    if (this.hasAttribute('open')) {
      this.open();
    }
  }

  disconnectedCallback() {
    this.cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'open') {
        newValue !== null ? this.open() : this.close();
      } else {
        this.render();
      }
    }
  }

  render() {
    const modal = this.hasAttribute('modal');
    const label = this.getAttribute('label') || 'Dialog';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;
        }

        :host([open]) {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          animation: fadeIn 0.2s ease;
        }

        .dialog {
          position: relative;
          background: var(--surface-color, #ffffff);
          border-radius: var(--radius-lg, 8px);
          box-shadow: var(--shadow-xl, 0 8px 24px rgba(0,0,0,0.2));
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
        }

        .dialog-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color, #e0e0e0);
        }

        .dialog-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color, #000000);
        }

        .dialog-content {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .dialog-actions {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color, #e0e0e0);
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--radius-sm, 4px);
          color: var(--text-secondary, #666666);
        }

        .close-button:hover {
          background: var(--hover-color, #f5f5f5);
        }

        .close-button:focus {
          outline: 2px solid var(--focus-color, #0066cc);
          outline-offset: 2px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .backdrop,
          .dialog {
            animation: none;
          }
        }

        @media (prefers-contrast: high) {
          .dialog {
            border: 2px solid currentColor;
          }
        }

        @media (max-width: 640px) {
          .dialog {
            max-width: 95vw;
            max-height: 95vh;
          }
        }
      </style>
      <div class="backdrop" aria-hidden="true"></div>
      <div 
        class="dialog"
        role="${modal ? 'dialog' : 'dialog'}"
        aria-modal="${modal}"
        aria-label="${label}"
        aria-labelledby="dialog-title"
      >
        <button 
          class="close-button" 
          aria-label="Close dialog"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="dialog-header">
          <h2 class="dialog-title" id="dialog-title">
            <slot name="title">${label}</slot>
          </h2>
        </div>
        <div class="dialog-content">
          <slot></slot>
        </div>
        <div class="dialog-actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const backdrop = this.shadowRoot.querySelector('.backdrop');
    const closeButton = this.shadowRoot.querySelector('.close-button');
    
    backdrop.addEventListener('click', () => {
      if (this.hasAttribute('close-on-backdrop')) {
        this.close();
      }
    });
    
    closeButton.addEventListener('click', () => this.close());
    
    this.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  cleanup() {
    if (this._isOpen) {
      this.restoreFocus();
    }
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    
    if (event.key === 'Tab') {
      this.handleTabKey(event);
    }
  }

  handleTabKey(event) {
    const focusableElements = this.getFocusableElements();
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement || 
          this.shadowRoot.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement || 
          this.shadowRoot.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  getFocusableElements() {
    const dialog = this.shadowRoot.querySelector('.dialog');
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    
    const shadowElements = Array.from(dialog.querySelectorAll(selector));
    const slotElements = Array.from(this.querySelectorAll(selector));
    
    return [...shadowElements, ...slotElements];
  }

  open() {
    if (this._isOpen) return;
    
    this._isOpen = true;
    this._previousFocus = document.activeElement;
    
    this.setAttribute('open', '');
    
    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusableElements = this.getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    });
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    this.dispatchEvent(new CustomEvent('dialog-open', {
      bubbles: true,
      composed: true
    }));
  }

  close() {
    if (!this._isOpen) return;
    
    this._isOpen = false;
    this.removeAttribute('open');
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    this.restoreFocus();
    
    this.dispatchEvent(new CustomEvent('dialog-close', {
      bubbles: true,
      composed: true
    }));
  }

  restoreFocus() {
    if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
      this._previousFocus.focus();
    }
    this._previousFocus = null;
  }
}

customElements.define('aria-dialog', AriaDialog);