/**
 * @fileoverview Dialog.Trigger - Trigger button for dialog
 * @module primitives/compound-dialog/dialog-trigger
 * 
 * Button that opens the dialog when clicked.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#compound-patterns}
 */

/**
 * DialogTrigger Web Component
 * 
 * Trigger element that opens the dialog when activated.
 * Automatically finds parent dialog-root and triggers open.
 * 
 * @element dialog-trigger
 * 
 * @fires dialog-trigger-click - Bubbles to dialog-root to trigger open
 * 
 * @example
 * <dialog-trigger>Open Dialog</dialog-trigger>
 */
class DialogTrigger extends HTMLElement {
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
    this.dispatchEvent(new CustomEvent('dialog-trigger-click', {
      bubbles: true,
      composed: true,
      detail: { trigger: this }
    }));
  }
}

customElements.define('dialog-trigger', DialogTrigger);

export default DialogTrigger;