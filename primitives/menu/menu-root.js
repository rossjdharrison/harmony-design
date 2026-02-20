/**
 * @fileoverview Menu.Root - Root container for compound menu pattern
 * @module primitives/menu/menu-root
 * 
 * Manages shared state for Menu.Trigger, Menu.Content, and Menu.Item children.
 * Provides context for positioning, open/close state, and keyboard navigation.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#compound-menu-pattern}
 */

/**
 * Menu.Root Web Component
 * 
 * Provides context and state management for compound menu pattern.
 * Children components (Menu.Trigger, Menu.Content, Menu.Item) access shared state
 * through the root's public API.
 * 
 * @element harmony-menu-root
 * 
 * @attr {string} placement - Menu placement: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
 * @attr {boolean} open - Controlled open state (optional)
 * @attr {boolean} disabled - Whether menu is disabled
 * 
 * @fires menu:open - Fired when menu opens
 * @fires menu:close - Fired when menu closes
 * @fires menu:item-select - Fired when menu item is selected
 * 
 * @example
 * <harmony-menu-root placement="bottom-start">
 *   <harmony-menu-trigger>Open Menu</harmony-menu-trigger>
 *   <harmony-menu-content>
 *     <harmony-menu-item>Item 1</harmony-menu-item>
 *     <harmony-menu-item>Item 2</harmony-menu-item>
 *   </harmony-menu-content>
 * </harmony-menu-root>
 */
class MenuRoot extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private @type {boolean} */
    this._isOpen = false;
    
    /** @private @type {HTMLElement|null} */
    this._trigger = null;
    
    /** @private @type {HTMLElement|null} */
    this._content = null;
    
    /** @private @type {HTMLElement[]} */
    this._items = [];
    
    /** @private @type {number} */
    this._focusedIndex = -1;
    
    /** @private @type {AbortController|null} */
    this._abortController = null;
  }

  static get observedAttributes() {
    return ['placement', 'open', 'disabled'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'open') {
      const shouldOpen = newValue !== null;
      if (shouldOpen !== this._isOpen) {
        shouldOpen ? this.open() : this.close();
      }
    }
    
    if (name === 'disabled' && newValue !== null) {
      this.close();
    }
  }

  /**
   * Render shadow DOM structure
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
        }
        
        :host([disabled]) {
          pointer-events: none;
          opacity: 0.5;
        }
        
        ::slotted(*) {
          /* Allow children to style themselves */
        }
      </style>
      <slot></slot>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    this.addEventListener('menu:trigger-click', this.handleTriggerClick.bind(this));
    this.addEventListener('menu:item-click', this.handleItemClick.bind(this));
  }

  /**
   * Register trigger component
   * @param {HTMLElement} trigger
   */
  registerTrigger(trigger) {
    this._trigger = trigger;
  }

  /**
   * Register content component
   * @param {HTMLElement} content
   */
  registerContent(content) {
    this._content = content;
  }

  /**
   * Register menu item
   * @param {HTMLElement} item
   */
  registerItem(item) {
    if (!this._items.includes(item)) {
      this._items.push(item);
    }
  }

  /**
   * Unregister menu item
   * @param {HTMLElement} item
   */
  unregisterItem(item) {
    const index = this._items.indexOf(item);
    if (index > -1) {
      this._items.splice(index, 1);
    }
  }

  /**
   * Handle trigger click
   * @private
   * @param {CustomEvent} event
   */
  handleTriggerClick(event) {
    event.stopPropagation();
    if (this.hasAttribute('disabled')) return;
    
    this.toggle();
  }

  /**
   * Handle item click
   * @private
   * @param {CustomEvent} event
   */
  handleItemClick(event) {
    event.stopPropagation();
    
    const { item, value } = event.detail;
    
    this.dispatchEvent(new CustomEvent('menu:item-select', {
      bubbles: true,
      composed: true,
      detail: { item, value }
    }));
    
    this.close();
  }

  /**
   * Open menu
   */
  open() {
    if (this._isOpen || this.hasAttribute('disabled')) return;
    
    this._isOpen = true;
    
    if (this._content) {
      this._content.show();
      this.positionContent();
    }
    
    if (this._trigger) {
      this._trigger.setAttribute('aria-expanded', 'true');
    }
    
    this.setupGlobalListeners();
    
    this.dispatchEvent(new CustomEvent('menu:open', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Close menu
   */
  close() {
    if (!this._isOpen) return;
    
    this._isOpen = false;
    this._focusedIndex = -1;
    
    if (this._content) {
      this._content.hide();
    }
    
    if (this._trigger) {
      this._trigger.setAttribute('aria-expanded', 'false');
      this._trigger.focus();
    }
    
    this.cleanup();
    
    this.dispatchEvent(new CustomEvent('menu:close', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Toggle menu open/close
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Position content relative to trigger
   * @private
   */
  positionContent() {
    if (!this._trigger || !this._content) return;
    
    const placement = this.getAttribute('placement') || 'bottom-start';
    const triggerRect = this._trigger.getBoundingClientRect();
    const contentElement = this._content.getContentElement();
    
    if (!contentElement) return;
    
    // Reset position
    contentElement.style.position = 'absolute';
    contentElement.style.top = '';
    contentElement.style.left = '';
    contentElement.style.right = '';
    contentElement.style.bottom = '';
    
    // Apply placement
    switch (placement) {
      case 'bottom-start':
        contentElement.style.top = `${triggerRect.height}px`;
        contentElement.style.left = '0';
        break;
      case 'bottom-end':
        contentElement.style.top = `${triggerRect.height}px`;
        contentElement.style.right = '0';
        break;
      case 'top-start':
        contentElement.style.bottom = `${triggerRect.height}px`;
        contentElement.style.left = '0';
        break;
      case 'top-end':
        contentElement.style.bottom = `${triggerRect.height}px`;
        contentElement.style.right = '0';
        break;
    }
  }

  /**
   * Setup global event listeners for closing menu
   * @private
   */
  setupGlobalListeners() {
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) {
        this.close();
      }
    }, { signal, capture: true });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.focusNextItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.focusPreviousItem();
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.focusFirstItem();
      } else if (e.key === 'End') {
        e.preventDefault();
        this.focusLastItem();
      }
    }, { signal });
  }

  /**
   * Focus next menu item
   * @private
   */
  focusNextItem() {
    if (this._items.length === 0) return;
    
    this._focusedIndex = (this._focusedIndex + 1) % this._items.length;
    this._items[this._focusedIndex]?.focus();
  }

  /**
   * Focus previous menu item
   * @private
   */
  focusPreviousItem() {
    if (this._items.length === 0) return;
    
    this._focusedIndex = this._focusedIndex <= 0 
      ? this._items.length - 1 
      : this._focusedIndex - 1;
    this._items[this._focusedIndex]?.focus();
  }

  /**
   * Focus first menu item
   * @private
   */
  focusFirstItem() {
    if (this._items.length === 0) return;
    
    this._focusedIndex = 0;
    this._items[0]?.focus();
  }

  /**
   * Focus last menu item
   * @private
   */
  focusLastItem() {
    if (this._items.length === 0) return;
    
    this._focusedIndex = this._items.length - 1;
    this._items[this._focusedIndex]?.focus();
  }

  /**
   * Cleanup event listeners
   * @private
   */
  cleanup() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }

  /**
   * Check if menu is open
   * @returns {boolean}
   */
  isOpen() {
    return this._isOpen;
  }
}

customElements.define('harmony-menu-root', MenuRoot);

export { MenuRoot };