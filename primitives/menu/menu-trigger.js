/**
 * @fileoverview Menu.Trigger - Trigger button for compound menu pattern
 * @module primitives/menu/menu-trigger
 * 
 * Button that opens/closes the menu when clicked.
 * Registers itself with parent Menu.Root for state management.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#compound-menu-pattern}
 */

/**
 * Menu.Trigger Web Component
 * 
 * Trigger button for opening/closing menu.
 * Must be child of harmony-menu-root.
 * 
 * @element harmony-menu-trigger
 * 
 * @attr {string} variant - Button variant: 'primary' | 'secondary' | 'ghost'
 * 
 * @example
 * <harmony-menu-trigger>Open Menu</harmony-menu-trigger>
 */
class MenuTrigger extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private @type {MenuRoot|null} */
    this._root = null;
  }

  connectedCallback() {
    this.findRoot();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Find parent Menu.Root
   * @private
   */
  findRoot() {
    let parent = this.parentElement;
    while (parent) {
      if (parent.tagName === 'HARMONY-MENU-ROOT') {
        this._root = parent;
        this._root.registerTrigger(this);
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!this._root) {
      console.warn('MenuTrigger must be child of harmony-menu-root');
    }
  }

  /**
   * Render shadow DOM
   * @private
   */
  render() {
    const variant = this.getAttribute('variant') || 'secondary';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        
        button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 0.25rem;
          background: var(--color-surface, #ffffff);
          color: var(--color-text, #000000);
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.5;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }
        
        button:hover {
          background: var(--color-surface-hover, #f5f5f5);
          border-color: var(--color-border-hover, #d0d0d0);
        }
        
        button:focus-visible {
          outline: 2px solid var(--color-focus, #0066cc);
          outline-offset: 2px;
        }
        
        button:active {
          background: var(--color-surface-active, #e8e8e8);
        }
        
        button[aria-expanded="true"] {
          background: var(--color-surface-active, #e8e8e8);
          border-color: var(--color-border-active, #c0c0c0);
        }
        
        .icon {
          width: 1rem;
          height: 1rem;
          transition: transform 0.15s ease;
        }
        
        button[aria-expanded="true"] .icon {
          transform: rotate(180deg);
        }
        
        /* Variant styles */
        :host([variant="primary"]) button {
          background: var(--color-primary, #0066cc);
          color: var(--color-on-primary, #ffffff);
          border-color: var(--color-primary, #0066cc);
        }
        
        :host([variant="primary"]) button:hover {
          background: var(--color-primary-hover, #0052a3);
          border-color: var(--color-primary-hover, #0052a3);
        }
        
        :host([variant="ghost"]) button {
          background: transparent;
          border-color: transparent;
        }
        
        :host([variant="ghost"]) button:hover {
          background: var(--color-surface-hover, #f5f5f5);
        }
      </style>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <slot></slot>
        <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4z"/>
        </svg>
      </button>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('menu:trigger-click', {
        bubbles: true,
        composed: true
      }));
    });
  }

  /**
   * Set aria-expanded attribute
   * @param {string} value
   */
  setAttribute(name, value) {
    super.setAttribute(name, value);
    
    if (name === 'aria-expanded') {
      const button = this.shadowRoot?.querySelector('button');
      if (button) {
        button.setAttribute('aria-expanded', value);
      }
    }
  }

  /**
   * Focus trigger
   */
  focus() {
    const button = this.shadowRoot?.querySelector('button');
    button?.focus();
  }
}

customElements.define('harmony-menu-trigger', MenuTrigger);

export { MenuTrigger };