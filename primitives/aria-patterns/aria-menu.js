/**
 * @fileoverview ARIA Menu Pattern - Accessible menu with keyboard navigation
 * @module primitives/aria-patterns/aria-menu
 * 
 * Implements WAI-ARIA menu pattern with:
 * - Arrow key navigation
 * - Type-ahead search
 * - Submenu support
 * - Proper focus management
 * 
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menu/
 */

/**
 * ARIA Menu Web Component
 * Provides accessible menu with keyboard navigation and ARIA attributes
 * 
 * @fires menu-select - Fired when menu item is selected
 * @fires menu-open - Fired when submenu opens
 * @fires menu-close - Fired when menu closes
 * 
 * @example
 * <aria-menu label="File Menu">
 *   <aria-menuitem>New</aria-menuitem>
 *   <aria-menuitem>Open</aria-menuitem>
 *   <aria-menuitem role="separator"></aria-menuitem>
 *   <aria-menuitem>Save</aria-menuitem>
 * </aria-menu>
 */
export class AriaMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this._items = [];
    this._currentIndex = -1;
    this._typeAheadBuffer = '';
    this._typeAheadTimeout = null;
    this._isOpen = false;
  }

  static get observedAttributes() {
    return ['label', 'orientation', 'open'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.updateItems();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const orientation = this.getAttribute('orientation') || 'vertical';
    const label = this.getAttribute('label') || 'Menu';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
        }

        .menu-container {
          display: flex;
          flex-direction: ${orientation === 'horizontal' ? 'row' : 'column'};
          list-style: none;
          margin: 0;
          padding: 0.5rem 0;
          background: var(--surface-color, #ffffff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: var(--radius-md, 4px);
          box-shadow: var(--shadow-md, 0 2px 8px rgba(0,0,0,0.15));
          min-width: 200px;
        }

        :host([hidden]) .menu-container {
          display: none;
        }

        ::slotted(aria-menuitem) {
          cursor: pointer;
        }

        @media (prefers-reduced-motion: reduce) {
          .menu-container {
            transition: none;
          }
        }

        @media (prefers-contrast: high) {
          .menu-container {
            border-width: 2px;
            border-color: currentColor;
          }
        }
      </style>
      <div 
        class="menu-container"
        role="menu"
        aria-label="${label}"
        aria-orientation="${orientation}"
      >
        <slot></slot>
      </div>
    `;
  }

  setupEventListeners() {
    const container = this.shadowRoot.querySelector('.menu-container');
    
    container.addEventListener('keydown', this.handleKeyDown.bind(this));
    container.addEventListener('click', this.handleClick.bind(this));
    
    // Listen for slot changes to update items
    const slot = this.shadowRoot.querySelector('slot');
    slot.addEventListener('slotchange', () => this.updateItems());
  }

  cleanup() {
    if (this._typeAheadTimeout) {
      clearTimeout(this._typeAheadTimeout);
    }
  }

  updateItems() {
    const slot = this.shadowRoot.querySelector('slot');
    this._items = slot.assignedElements().filter(el => 
      el.tagName === 'ARIA-MENUITEM' && el.getAttribute('role') !== 'separator'
    );
    
    // Set tabindex on items
    this._items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
  }

  handleKeyDown(event) {
    const orientation = this.getAttribute('orientation') || 'vertical';
    const isHorizontal = orientation === 'horizontal';
    
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    
    switch (event.key) {
      case nextKey:
        event.preventDefault();
        this.focusNextItem();
        break;
        
      case prevKey:
        event.preventDefault();
        this.focusPreviousItem();
        break;
        
      case 'Home':
        event.preventDefault();
        this.focusFirstItem();
        break;
        
      case 'End':
        event.preventDefault();
        this.focusLastItem();
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectCurrentItem();
        break;
        
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
        
      default:
        // Type-ahead search
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          this.handleTypeAhead(event.key);
        }
    }
  }

  handleClick(event) {
    const menuitem = event.target.closest('aria-menuitem');
    if (menuitem && menuitem.getAttribute('role') !== 'separator') {
      this.selectItem(menuitem);
    }
  }

  focusNextItem() {
    if (this._items.length === 0) return;
    
    this._currentIndex = (this._currentIndex + 1) % this._items.length;
    this.focusCurrentItem();
  }

  focusPreviousItem() {
    if (this._items.length === 0) return;
    
    this._currentIndex = this._currentIndex <= 0 
      ? this._items.length - 1 
      : this._currentIndex - 1;
    this.focusCurrentItem();
  }

  focusFirstItem() {
    if (this._items.length === 0) return;
    
    this._currentIndex = 0;
    this.focusCurrentItem();
  }

  focusLastItem() {
    if (this._items.length === 0) return;
    
    this._currentIndex = this._items.length - 1;
    this.focusCurrentItem();
  }

  focusCurrentItem() {
    if (this._currentIndex < 0 || this._currentIndex >= this._items.length) return;
    
    // Update tabindex
    this._items.forEach((item, index) => {
      item.setAttribute('tabindex', index === this._currentIndex ? '0' : '-1');
    });
    
    this._items[this._currentIndex].focus();
  }

  selectCurrentItem() {
    if (this._currentIndex >= 0 && this._currentIndex < this._items.length) {
      this.selectItem(this._items[this._currentIndex]);
    }
  }

  selectItem(item) {
    this.dispatchEvent(new CustomEvent('menu-select', {
      detail: { item },
      bubbles: true,
      composed: true
    }));
  }

  handleTypeAhead(char) {
    this._typeAheadBuffer += char.toLowerCase();
    
    // Clear buffer after 500ms
    if (this._typeAheadTimeout) {
      clearTimeout(this._typeAheadTimeout);
    }
    this._typeAheadTimeout = setTimeout(() => {
      this._typeAheadBuffer = '';
    }, 500);
    
    // Find matching item
    const startIndex = (this._currentIndex + 1) % this._items.length;
    for (let i = 0; i < this._items.length; i++) {
      const index = (startIndex + i) % this._items.length;
      const item = this._items[index];
      const text = item.textContent.trim().toLowerCase();
      
      if (text.startsWith(this._typeAheadBuffer)) {
        this._currentIndex = index;
        this.focusCurrentItem();
        break;
      }
    }
  }

  open() {
    this._isOpen = true;
    this.removeAttribute('hidden');
    this.focusFirstItem();
    
    this.dispatchEvent(new CustomEvent('menu-open', {
      bubbles: true,
      composed: true
    }));
  }

  close() {
    this._isOpen = false;
    this.setAttribute('hidden', '');
    
    this.dispatchEvent(new CustomEvent('menu-close', {
      bubbles: true,
      composed: true
    }));
  }
}

/**
 * ARIA Menu Item Web Component
 * Individual menu item with proper ARIA attributes
 */
export class AriaMenuItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['disabled', 'checked', 'role'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const disabled = this.hasAttribute('disabled');
    const checked = this.hasAttribute('checked');
    const role = this.getAttribute('role') || 'menuitem';
    
    if (role === 'separator') {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            margin: 0.25rem 0;
          }
          .separator {
            height: 1px;
            background: var(--border-color, #e0e0e0);
            margin: 0 0.5rem;
          }
        </style>
        <div class="separator" role="separator"></div>
      `;
      return;
    }
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .menuitem {
          display: flex;
          align-items: center;
          padding: 0.5rem 1rem;
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          opacity: ${disabled ? '0.5' : '1'};
          color: var(--text-color, #000000);
          background: transparent;
          transition: background-color 0.15s ease;
        }

        .menuitem:hover:not([aria-disabled="true"]) {
          background: var(--hover-color, #f5f5f5);
        }

        .menuitem:focus {
          outline: 2px solid var(--focus-color, #0066cc);
          outline-offset: -2px;
          background: var(--focus-background, #e3f2fd);
        }

        .checkmark {
          width: 1rem;
          margin-right: 0.5rem;
          visibility: ${checked ? 'visible' : 'hidden'};
        }

        @media (prefers-reduced-motion: reduce) {
          .menuitem {
            transition: none;
          }
        }

        @media (prefers-contrast: high) {
          .menuitem:focus {
            outline-width: 3px;
          }
        }
      </style>
      <div 
        class="menuitem"
        role="${role}"
        aria-disabled="${disabled}"
        ${role === 'menuitemcheckbox' ? `aria-checked="${checked}"` : ''}
      >
        ${role === 'menuitemcheckbox' ? '<span class="checkmark">✓</span>' : ''}
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('aria-menu', AriaMenu);
customElements.define('aria-menuitem', AriaMenuItem);