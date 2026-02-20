/**
 * @fileoverview Accordion Root Component - Container for accordion items
 * @module components/accordion/accordion-root
 * 
 * Compound component pattern for accessible accordion UI.
 * Manages state for multiple accordion items with single/multiple expansion modes.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#accordion-component}
 * 
 * @example
 * <harmony-accordion-root mode="single">
 *   <harmony-accordion-item value="item-1">
 *     <harmony-accordion-header>Header 1</harmony-accordion-header>
 *     <harmony-accordion-content>Content 1</harmony-accordion-content>
 *   </harmony-accordion-item>
 * </harmony-accordion-root>
 */

/**
 * Accordion Root Web Component
 * Provides context and state management for accordion items
 * 
 * @class AccordionRoot
 * @extends HTMLElement
 * 
 * @attr {string} mode - Expansion mode: "single" (default) or "multiple"
 * @attr {string} default-value - Initially expanded item value(s), comma-separated for multiple mode
 * @attr {boolean} collapsible - Allow closing all items in single mode (default: false)
 * 
 * @fires accordion:change - Dispatched when expanded state changes
 * @listens accordion:item:toggle - Internal event from accordion items
 */
class AccordionRoot extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Set<string>} */
    this._expandedItems = new Set();
    
    /** @type {Map<string, HTMLElement>} */
    this._items = new Map();
    
    this._boundHandleToggle = this._handleItemToggle.bind(this);
  }

  static get observedAttributes() {
    return ['mode', 'default-value', 'collapsible'];
  }

  connectedCallback() {
    this._render();
    this._setupEventListeners();
    this._initializeDefaultValues();
    this._registerItems();
    
    // Publish component ready event
    this._publishEvent('accordion:root:ready', {
      mode: this.mode,
      itemCount: this._items.size
    });
  }

  disconnectedCallback() {
    this.removeEventListener('accordion:item:toggle', this._boundHandleToggle);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'mode' && this._expandedItems.size > 1 && newValue === 'single') {
      // When switching to single mode, keep only first expanded item
      const [firstExpanded] = this._expandedItems;
      this._expandedItems.clear();
      if (firstExpanded) {
        this._expandedItems.add(firstExpanded);
      }
      this._updateItemStates();
    }
  }

  /**
   * Get expansion mode
   * @returns {string} "single" or "multiple"
   */
  get mode() {
    return this.getAttribute('mode') || 'single';
  }

  /**
   * Set expansion mode
   * @param {string} value - "single" or "multiple"
   */
  set mode(value) {
    this.setAttribute('mode', value);
  }

  /**
   * Get collapsible flag
   * @returns {boolean}
   */
  get collapsible() {
    return this.hasAttribute('collapsible');
  }

  /**
   * Set collapsible flag
   * @param {boolean} value
   */
  set collapsible(value) {
    if (value) {
      this.setAttribute('collapsible', '');
    } else {
      this.removeAttribute('collapsible');
    }
  }

  /**
   * Get currently expanded item values
   * @returns {string[]}
   */
  get value() {
    return Array.from(this._expandedItems);
  }

  /**
   * Set expanded item values
   * @param {string|string[]} value - Item value(s) to expand
   */
  set value(value) {
    const values = Array.isArray(value) ? value : [value];
    this._expandedItems.clear();
    
    if (this.mode === 'single') {
      if (values.length > 0) {
        this._expandedItems.add(values[0]);
      }
    } else {
      values.forEach(v => this._expandedItems.add(v));
    }
    
    this._updateItemStates();
  }

  /**
   * Render shadow DOM
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --accordion-border-color: var(--harmony-border-default, #e5e7eb);
          --accordion-border-width: 1px;
        }

        .accordion-root {
          border: var(--accordion-border-width) solid var(--accordion-border-color);
          border-radius: var(--harmony-radius-md, 8px);
          overflow: hidden;
        }

        ::slotted(harmony-accordion-item:not(:last-child)) {
          border-bottom: var(--accordion-border-width) solid var(--accordion-border-color);
        }
      </style>
      <div class="accordion-root" role="region">
        <slot></slot>
      </div>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    this.addEventListener('accordion:item:toggle', this._boundHandleToggle);
  }

  /**
   * Initialize default expanded values
   * @private
   */
  _initializeDefaultValues() {
    const defaultValue = this.getAttribute('default-value');
    if (defaultValue) {
      const values = defaultValue.split(',').map(v => v.trim()).filter(Boolean);
      if (this.mode === 'single' && values.length > 0) {
        this._expandedItems.add(values[0]);
      } else if (this.mode === 'multiple') {
        values.forEach(v => this._expandedItems.add(v));
      }
    }
  }

  /**
   * Register child accordion items
   * @private
   */
  _registerItems() {
    const items = this.querySelectorAll('harmony-accordion-item');
    items.forEach(item => {
      const value = item.getAttribute('value');
      if (value) {
        this._items.set(value, item);
        item._setExpanded(this._expandedItems.has(value));
      }
    });
  }

  /**
   * Handle item toggle event
   * @private
   * @param {CustomEvent} event
   */
  _handleItemToggle(event) {
    event.stopPropagation();
    
    const { value, expanded } = event.detail;
    
    if (this.mode === 'single') {
      if (expanded) {
        // Expand this item, collapse others
        this._expandedItems.clear();
        this._expandedItems.add(value);
      } else {
        // Collapse this item if collapsible
        if (this.collapsible) {
          this._expandedItems.delete(value);
        } else {
          // Don't allow collapsing in non-collapsible single mode
          return;
        }
      }
    } else {
      // Multiple mode
      if (expanded) {
        this._expandedItems.add(value);
      } else {
        this._expandedItems.delete(value);
      }
    }

    this._updateItemStates();
    this._notifyChange();
  }

  /**
   * Update all item expanded states
   * @private
   */
  _updateItemStates() {
    this._items.forEach((item, value) => {
      item._setExpanded(this._expandedItems.has(value));
    });
  }

  /**
   * Notify change event
   * @private
   */
  _notifyChange() {
    const changeEvent = new CustomEvent('accordion:change', {
      detail: {
        value: this.value,
        mode: this.mode
      },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(changeEvent);
    
    this._publishEvent('accordion:value:changed', {
      value: this.value,
      mode: this.mode
    });
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} type - Event type
   * @param {Object} payload - Event payload
   */
  _publishEvent(type, payload) {
    if (window.EventBus) {
      window.EventBus.publish({
        type,
        source: 'accordion-root',
        payload,
        timestamp: Date.now()
      });
    }
  }
}

customElements.define('harmony-accordion-root', AccordionRoot);

export { AccordionRoot };