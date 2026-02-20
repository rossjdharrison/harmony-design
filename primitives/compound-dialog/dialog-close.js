/**
 * @fileoverview Dialog.Close - Close button for dialog
 * @module primitives/compound-dialog/dialog-close
 * 
 * Button that closes the dialog when clicked.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#compound-patterns}
 */

/**
 * DialogClose Web Component
 * 
 * Close button that dismisses the dialog when activated.
 * Automatically finds parent dialog-root and triggers close.
 * 
 * @element dialog-close
 * 
 * @fires dialog-close-click - Bubbles to dialog-root to trigger close
 * 
 * @example
 * <dialog-close>Close</dialog-close>
 * <dialog-close aria-label="Close dialog">×</dialog-close>
 */
class DialogClose extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this._handleClick = this._handleClick.bind(this);
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this._handleClick);
    
    // Set ARIA attributes
    this.setAttribute('role', 'button');
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Close dialog');
    }
    
    // Handle keyboard activation
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._handleClick(e);
      }
    });
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          cursor: pointer;
          user-select: none;
        }
        
        :host(:focus) {
          outline: 2px solid var(--focus-color, #0066cc);
          outline-offset: 2px;
        }
        
        :host(:active) {
          transform: scale(0.98);
        }
      </style>
      <slot></slot>
    `;
  }

  /**
   * Handles click event
   * @param {Event} event
   * @private
   */
  _handleClick(event) {
    // Dispatch event that bubbles to dialog-root
    this.dispatchEvent(new CustomEvent('dialog-close-click', {
      bubbles: true,
      composed: true,
      detail: { closeButton: this }
    }));
  }
}

customElements.define('dialog-close', DialogClose);

export default DialogClose;