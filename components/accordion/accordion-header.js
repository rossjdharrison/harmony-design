/**
 * @fileoverview Accordion Header Component - Clickable trigger for accordion item
 * @module components/accordion/accordion-header
 * 
 * Interactive header that toggles accordion item expansion.
 * Must be used within harmony-accordion-item.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#accordion-component}
 * 
 * @example
 * <harmony-accordion-header>
 *   <span>Click to expand</span>
 * </harmony-accordion-header>
 */

/**
 * Accordion Header Web Component
 * Clickable trigger for accordion expansion
 * 
 * @class AccordionHeader
 * @extends HTMLElement
 * 
 * @attr {boolean} disabled - Disable header interaction
 * 
 * @fires accordion:header:click - Internal event for item component
 */
class AccordionHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._expanded = false;
    
    this._boundHandleClick = this._handleClick.bind(this);
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
  }

  static get observedAttributes() {
    return ['disabled'];
  }

  connectedCallback() {
    this._render();
    this._setupEventListeners();
    this._setupAccessibility();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._boundHandleClick);
    this.removeEventListener('keydown', this._boundHandleKeyDown);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'disabled') {
      this._updateAccessibility();
    }
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
   * Set expanded state (internal use by item)
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
          --accordion-header-padding: var(--harmony-spacing-md, 16px);
          --accordion-header-bg: var(--harmony-bg-primary, #ffffff);
          --accordion-header-bg-hover: var(--harmony-bg-secondary, #f9fafb);
          --accordion-header-text: var(--harmony-text-primary, #111827);
          --accordion-icon-size: 20px;
          --accordion-transition: all 0.2s ease;
        }

        :host([disabled]) {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .accordion-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--accordion-header-padding);
          background: var(--accordion-header-bg);
          color: var(--accordion-header-text);
          cursor: pointer;
          user-select: none;
          transition: var(--accordion-transition);
          outline: none;
        }

        .accordion-header:hover:not([data-disabled]) {
          background: var(--accordion-header-bg-hover);
        }

        .accordion-header:focus-visible {
          outline: 2px solid var(--harmony-color-primary, #3b82f6);
          outline-offset: -2px;
        }

        .header-content {
          flex: 1;
          font-weight: 500;
        }

        .header-icon {
          width: var(--accordion-icon-size);
          height: var(--accordion-icon-size);
          transition: transform 0.2s ease;
          flex-shrink: 0;
          margin-left: var(--harmony-spacing-sm, 8px);
        }

        :host([data-expanded]) .header-icon {
          transform: rotate(180deg);
        }

        .chevron {
          display: block;
          width: 100%;
          height: 100%;
        }
      </style>
      <div 
        class="accordion-header" 
        role="button"
        tabindex="0"
        part="header"
      >
        <div class="header-content">
          <slot></slot>
        </div>
        <div class="header-icon">
          <svg class="chevron" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    this.addEventListener('click', this._boundHandleClick);
    this.addEventListener('keydown', this._boundHandleKeyDown);
  }

  /**
   * Setup accessibility attributes
   * @private
   */
  _setupAccessibility() {
    const header = this.shadowRoot.querySelector('.accordion-header');
    if (header) {
      header.setAttribute('aria-expanded', 'false');
      
      // Generate unique ID for content
      const item = this.closest('harmony-accordion-item');
      if (item) {
        const contentId = `accordion-content-${item.value || Math.random().toString(36).substr(2, 9)}`;
        header.setAttribute('aria-controls', contentId);
        
        // Set ID on content
        const content = item.querySelector('harmony-accordion-content');
        if (content) {
          content.id = contentId;
        }
      }
    }
  }

  /**
   * Handle click event
   * @private
   * @param {MouseEvent} event
   */
  _handleClick(event) {
    if (this.disabled) return;
    
    event.preventDefault();
    this._notifyToggle();
  }

  /**
   * Handle keyboard event
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    if (this.disabled) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._notifyToggle();
    }
  }

  /**
   * Notify toggle event
   * @private
   */
  _notifyToggle() {
    const clickEvent = new CustomEvent('accordion:header:click', {
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(clickEvent);
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
    
    this._updateAccessibility();
  }

  /**
   * Update accessibility attributes
   * @private
   */
  _updateAccessibility() {
    const header = this.shadowRoot.querySelector('.accordion-header');
    if (header) {
      header.setAttribute('aria-expanded', this._expanded.toString());
      header.setAttribute('aria-disabled', this.disabled.toString());
      
      if (this.disabled) {
        header.setAttribute('data-disabled', '');
        header.setAttribute('tabindex', '-1');
      } else {
        header.removeAttribute('data-disabled');
        header.setAttribute('tabindex', '0');
      }
    }
  }
}

customElements.define('harmony-accordion-header', AccordionHeader);

export { AccordionHeader };