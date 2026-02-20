/**
 * @fileoverview Popover Trigger Component
 * @module components/primitives/popover/PopoverTrigger
 * 
 * Interactive element that toggles popover visibility.
 * Must be used within PopoverRoot.
 * 
 * Related: DESIGN_SYSTEM.md § Compound Components > Popover Pattern
 */

/**
 * PopoverTrigger Web Component
 * 
 * Button or interactive element that triggers popover open/close.
 * Automatically registers with parent PopoverRoot.
 * 
 * @element harmony-popover-trigger
 * 
 * @attr {string} as - Element type to render (button|div) (default: button)
 * 
 * @example
 * <harmony-popover-trigger>
 *   <button>Open Popover</button>
 * </harmony-popover-trigger>
 */
class PopoverTrigger extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._isOpen = false;
  }

  connectedCallback() {
    this.render();
    this.registerWithRoot();
    this.setupEventListeners();
  }

  render() {
    const elementType = this.getAttribute('as') || 'button';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        .trigger {
          all: unset;
          cursor: pointer;
          user-select: none;
        }

        .trigger[data-state="open"] {
          /* Styles when popover is open */
        }

        .trigger:focus-visible {
          outline: 2px solid var(--harmony-color-focus, #0066cc);
          outline-offset: 2px;
        }

        .trigger:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      </style>
      <${elementType} 
        class="trigger" 
        part="trigger"
        data-state="${this._isOpen ? 'open' : 'closed'}"
        aria-haspopup="dialog"
        aria-expanded="${this._isOpen}"
      >
        <slot></slot>
      </${elementType}>
    `;
  }

  setupEventListeners() {
    const trigger = this.shadowRoot.querySelector('.trigger');
    
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('popover-trigger-click', {
        bubbles: true,
        composed: true
      }));
    });

    // Listen for state changes from root
    this.addEventListener('popover-state-change', (e) => {
      this._isOpen = e.detail.isOpen;
      this.updateState();
    });
  }

  /**
   * Registers this trigger with parent PopoverRoot
   * @private
   */
  registerWithRoot() {
    this.dispatchEvent(new CustomEvent('popover-trigger-register', {
      bubbles: true,
      composed: true,
      detail: { element: this }
    }));
  }

  /**
   * Updates trigger state attributes
   * @private
   */
  updateState() {
    const trigger = this.shadowRoot.querySelector('.trigger');
    if (trigger) {
      trigger.setAttribute('data-state', this._isOpen ? 'open' : 'closed');
      trigger.setAttribute('aria-expanded', this._isOpen);
    }
  }
}

customElements.define('harmony-popover-trigger', PopoverTrigger);

export default PopoverTrigger;