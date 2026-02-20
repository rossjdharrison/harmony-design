/**
 * @fileoverview Menu.Item - Individual menu item for compound menu pattern
 * @module primitives/menu/menu-item
 * 
 * Individual selectable menu item.
 * Registers itself with parent Menu.Root for keyboard navigation.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#compound-menu-pattern}
 */

/**
 * Menu.Item Web Component
 * 
 * Individual selectable menu item.
 * Must be child of harmony-menu-content.
 * 
 * @element harmony-menu-item
 * 
 * @attr {string} value - Item value (for selection events)
 * @attr {boolean} disabled - Whether item is disabled
 * @attr {boolean} danger - Whether item represents dangerous action
 * 
 * @fires menu:item-click - Fired when item is clicked
 * 
 * @example
 * <harmony-menu-item value="delete" danger>Delete</harmony-menu-item>
 */
class MenuItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private @type {MenuRoot|null} */
    this._root = null;
  }

  static get observedAttributes() {
    return ['disabled', 'danger'];
  }

  connectedCallback() {
    this.findRoot();
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.unregisterItem(this);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.render();
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
        this._root.registerItem(this);
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!this._root) {
      console.warn('MenuItem must be descendant of harmony-menu-root');
    }
  }

  /**
   * Render shadow DOM
   * @private
   */
  render() {
    const disabled = this.hasAttribute('disabled');
    const danger = this.hasAttribute('danger');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.25rem;
          color: var(--color-text, #000000);
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.5;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.1s ease;
        }
        
        .item:hover {
          background: var(--color-surface-hover, #f5f5f5);
        }
        
        .item:focus {
          outline: none;
          background: var(--color-surface-hover, #f5f5f5);
        }
        
        .item:active {
          background: var(--color-surface-active, #e8e8e8);
        }
        
        /* Disabled state */
        :host([disabled]) .item {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
        
        /* Danger variant */
        :host([danger]) .item {
          color: var(--color-danger, #dc2626);
        }
        
        :host([danger]) .item:hover {
          background: var(--color-danger-surface, #fee2e2);
        }
        
        ::slotted(*) {
          flex: 1;
        }
      </style>
      <div
        class="item"
        role="menuitem"
        tabindex="${disabled ? '-1' : '0'}"
        aria-disabled="${disabled}"
      >
        <slot></slot>
      </div>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    const item = this.shadowRoot.querySelector('.item');
    
    item.addEventListener('click', (e) => {
      if (this.hasAttribute('disabled')) return;
      
      e.stopPropagation();
      
      this.dispatchEvent(new CustomEvent('menu:item-click', {
        bubbles: true,
        composed: true,
        detail: {
          item: this,
          value: this.getAttribute('value') || this.textContent?.trim()
        }
      }));
    });
    
    item.addEventListener('keydown', (e) => {
      if (this.hasAttribute('disabled')) return;
      
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  }

  /**
   * Focus item
   */
  focus() {
    const item = this.shadowRoot?.querySelector('.item');
    item?.focus();
  }
}

customElements.define('harmony-menu-item', MenuItem);

export { MenuItem };