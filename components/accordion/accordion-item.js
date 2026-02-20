/**
 * @fileoverview Accordion Item Component - Individual accordion item container
 * @module components/accordion/accordion-item
 * 
 * Represents a single item in an accordion with header and content.
 * Must be used within harmony-accordion-root.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#accordion-component}
 * 
 * @example
 * <harmony-accordion-item value="item-1">
 *   <harmony-accordion-header>Click me</harmony-accordion-header>
 *   <harmony-accordion-content>Hidden content</harmony-accordion-content>
 * </harmony-accordion-item>
 */

/**
 * Accordion Item Web Component
 * Container for accordion header and content
 * 
 * @class AccordionItem
 * @extends HTMLElement
 * 
 * @attr {string} value - Unique identifier for this item (required)
 * @attr {boolean} disabled - Disable item interaction
 * 
 * @fires accordion:item:toggle - Internal event for root component
 */
class AccordionItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._expanded = false;
    
    this._boundHandleHeaderClick = this._handleHeaderClick.bind(this);
  }

  static get observedAttributes() {
    return ['value', 'disabled'];
  }

  connectedCallback() {
    this._render();
    this._setupEventListeners();
  }

  disconnectedCallback() {
    const header = this.querySelector('harmony-accordion-header');
    if (header) {
      header.removeEventListener('accordion:header:click', this._boundHandleHeaderClick);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'disabled') {
      this._updateDisabledState();
    }
  }

  /**
   * Get item value
   * @returns {string}
   */
  get value() {
    return this.getAttribute('value') || '';
  }

  /**
   * Set item value
   * @param {string} value
   */
  set value(value) {
    this.setAttribute('value', value);
  }

  /**
   * Get disabled state
   * @returns {boolean}
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  /**
   * Set disabled state
   * @param {boolean} value
   */
  set disabled(value) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /**
   * Get expanded state
   * @returns {boolean}
   */
  get expanded() {
    return this._expanded;
  }

  /**
   * Set expanded state (internal use by root)
   * @private
   * @param {boolean} value
   */
  _setExpanded(value) {
    if (this._expanded === value) return;
    
    this._expanded = value;
    this._updateExpandedState();
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
          --accordion-item-bg: var(--harmony-bg-primary, #ffffff);
        }

        :host([disabled]) {
          opacity: 0.5;
          pointer-events: none;
        }

        .accordion-item {
          background: var(--accordion-item-bg);
        }

        ::slotted(harmony-accordion-header) {
          cursor: pointer;
        }

        ::slotted(harmony-accordion-content) {
          display: none;
        }

        :host([data-expanded]) ::slotted(harmony-accordion-content) {
          display: block;
        }
      </style>
      <div class="accordion-item">
        <slot name="header">
          <slot></slot>
        </slot>
      </div>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for header clicks
    this.addEventListener('accordion:header:click', this._boundHandleHeaderClick);
  }

  /**
   * Handle header click
   * @private
   * @param {CustomEvent} event
   */
  _handleHeaderClick(event) {
    event.stopPropagation();
    
    if (this.disabled) return;
    
    // Toggle expanded state
    const newExpanded = !this._expanded;
    
    // Notify root component
    const toggleEvent = new CustomEvent('accordion:item:toggle', {
      detail: {
        value: this.value,
        expanded: newExpanded
      },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(toggleEvent);
  }

  /**
   * Update expanded state visually
   * @private
   */
  _updateExpandedState() {
    if (this._expanded) {
      this.setAttribute('data-expanded', '');
    } else {
      this.removeAttribute('data-expanded');
    }
    
    // Update header
    const header = this.querySelector('harmony-accordion-header');
    if (header) {
      header._setExpanded(this._expanded);
    }
    
    // Update content
    const content = this.querySelector('harmony-accordion-content');
    if (content) {
      content._setExpanded(this._expanded);
    }
  }

  /**
   * Update disabled state
   * @private
   */
  _updateDisabledState() {
    const header = this.querySelector('harmony-accordion-header');
    if (header) {
      header.disabled = this.disabled;
    }
  }
}

customElements.define('harmony-accordion-item', AccordionItem);

export { AccordionItem };