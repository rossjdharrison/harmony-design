/**
 * @fileoverview Select.Root - Root container for compound select pattern
 * @module components/primitives/select/select-root
 * 
 * Provides context and coordination for Select.Trigger, Select.Content, and Select.Option.
 * Manages selection state, keyboard navigation, and accessibility.
 * 
 * @see {@link ../../../../DESIGN_SYSTEM.md#compound-select-pattern}
 * 
 * Performance Budget:
 * - Render: <1ms (context provider only)
 * - Memory: <5KB per instance
 * 
 * Accessibility:
 * - ARIA role: combobox (on trigger)
 * - Keyboard: Arrow keys, Enter, Escape, Home, End
 * - Screen reader: Announces selected value and list state
 */

/**
 * SelectRoot - Root component for compound select pattern
 * 
 * @class SelectRoot
 * @extends HTMLElement
 * 
 * @attr {string} value - Currently selected value
 * @attr {boolean} disabled - Whether select is disabled
 * @attr {boolean} required - Whether selection is required
 * @attr {string} name - Form field name
 * 
 * @fires select:change - Fired when selection changes {detail: {value, label}}
 * @fires select:open - Fired when dropdown opens
 * @fires select:close - Fired when dropdown closes
 * 
 * @example
 * <select-root value="option1">
 *   <select-trigger>Choose...</select-trigger>
 *   <select-content>
 *     <select-option value="option1">Option 1</select-option>
 *     <select-option value="option2">Option 2</select-option>
 *   </select-content>
 * </select-root>
 */
class SelectRoot extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private @type {string|null} */
    this._value = null;
    
    /** @private @type {boolean} */
    this._open = false;
    
    /** @private @type {SelectTrigger|null} */
    this._trigger = null;
    
    /** @private @type {SelectContent|null} */
    this._content = null;
    
    /** @private @type {SelectOption[]} */
    this._options = [];
    
    /** @private @type {number} */
    this._focusedIndex = -1;
    
    /** @private @type {AbortController} */
    this._abortController = new AbortController();
  }

  static get observedAttributes() {
    return ['value', 'disabled', 'required', 'name'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.discoverChildren();
    
    // Publish component ready event
    this.publishEvent('select:ready', {
      id: this.id,
      value: this._value
    });
  }

  disconnectedCallback() {
    this._abortController.abort();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'value':
        this._value = newValue;
        this.updateSelectedOption();
        break;
      case 'disabled':
        this.updateDisabledState();
        break;
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
          font-family: var(--font-family-base, system-ui, sans-serif);
          font-size: var(--font-size-base, 1rem);
          line-height: var(--line-height-base, 1.5);
        }

        :host([disabled]) {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .select-root {
          position: relative;
          width: 100%;
        }

        ::slotted(select-trigger) {
          display: block;
        }

        ::slotted(select-content) {
          position: absolute;
          z-index: var(--z-index-dropdown, 1000);
        }
      </style>
      <div class="select-root" part="root">
        <slot></slot>
      </div>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    const signal = this._abortController.signal;

    // Listen for trigger clicks
    this.addEventListener('select:trigger-click', (e) => {
      e.stopPropagation();
      this.toggle();
    }, { signal });

    // Listen for option selection
    this.addEventListener('select:option-select', (e) => {
      e.stopPropagation();
      this.selectOption(e.detail.value, e.detail.label);
    }, { signal });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target) && this._open) {
        this.close();
      }
    }, { signal });

    // Keyboard navigation
    this.addEventListener('keydown', this.handleKeyDown.bind(this), { signal });
  }

  /**
   * Discover child components
   * @private
   */
  discoverChildren() {
    // Use setTimeout to ensure children are connected
    setTimeout(() => {
      this._trigger = this.querySelector('select-trigger');
      this._content = this.querySelector('select-content');
      this._options = Array.from(this.querySelectorAll('select-option'));
      
      if (this._trigger) {
        this._trigger.setContext(this);
      }
      
      if (this._content) {
        this._content.setContext(this);
      }
      
      this._options.forEach(option => {
        option.setContext(this);
      });
      
      // Set initial value if specified
      if (this._value) {
        this.updateSelectedOption();
      }
    }, 0);
  }

  /**
   * Handle keyboard navigation
   * @private
   * @param {KeyboardEvent} e
   */
  handleKeyDown(e) {
    if (this.hasAttribute('disabled')) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this._open) {
          this.open();
        } else {
          this.focusNextOption();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!this._open) {
          this.open();
        } else {
          this.focusPreviousOption();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this._open && this._focusedIndex >= 0) {
          const option = this._options[this._focusedIndex];
          this.selectOption(option.value, option.textContent);
        } else {
          this.toggle();
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
      case 'Home':
        e.preventDefault();
        if (this._open) {
          this.focusFirstOption();
        }
        break;
      case 'End':
        e.preventDefault();
        if (this._open) {
          this.focusLastOption();
        }
        break;
    }
  }

  /**
   * Open dropdown
   */
  open() {
    if (this.hasAttribute('disabled') || this._open) return;
    
    this._open = true;
    
    if (this._content) {
      this._content.show();
    }
    
    if (this._trigger) {
      this._trigger.setOpen(true);
    }
    
    // Focus current selection or first option
    const selectedIndex = this._options.findIndex(opt => opt.value === this._value);
    this._focusedIndex = selectedIndex >= 0 ? selectedIndex : 0;
    this.updateFocusedOption();
    
    this.publishEvent('select:open', { value: this._value });
  }

  /**
   * Close dropdown
   */
  close() {
    if (!this._open) return;
    
    this._open = false;
    
    if (this._content) {
      this._content.hide();
    }
    
    if (this._trigger) {
      this._trigger.setOpen(false);
    }
    
    this._focusedIndex = -1;
    this.updateFocusedOption();
    
    this.publishEvent('select:close', { value: this._value });
  }

  /**
   * Toggle dropdown
   */
  toggle() {
    if (this._open) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Select an option
   * @param {string} value
   * @param {string} label
   */
  selectOption(value, label) {
    const oldValue = this._value;
    this._value = value;
    this.setAttribute('value', value);
    
    this.updateSelectedOption();
    this.close();
    
    if (this._trigger) {
      this._trigger.setLabel(label);
    }
    
    this.publishEvent('select:change', {
      value,
      label,
      oldValue
    });
    
    // Dispatch native change event for form integration
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Update selected option state
   * @private
   */
  updateSelectedOption() {
    this._options.forEach(option => {
      option.setSelected(option.value === this._value);
    });
  }

  /**
   * Update disabled state
   * @private
   */
  updateDisabledState() {
    const disabled = this.hasAttribute('disabled');
    
    if (this._trigger) {
      this._trigger.setDisabled(disabled);
    }
    
    if (disabled && this._open) {
      this.close();
    }
  }

  /**
   * Focus next option
   * @private
   */
  focusNextOption() {
    if (this._options.length === 0) return;
    this._focusedIndex = (this._focusedIndex + 1) % this._options.length;
    this.updateFocusedOption();
  }

  /**
   * Focus previous option
   * @private
   */
  focusPreviousOption() {
    if (this._options.length === 0) return;
    this._focusedIndex = this._focusedIndex <= 0 ? this._options.length - 1 : this._focusedIndex - 1;
    this.updateFocusedOption();
  }

  /**
   * Focus first option
   * @private
   */
  focusFirstOption() {
    if (this._options.length === 0) return;
    this._focusedIndex = 0;
    this.updateFocusedOption();
  }

  /**
   * Focus last option
   * @private
   */
  focusLastOption() {
    if (this._options.length === 0) return;
    this._focusedIndex = this._options.length - 1;
    this.updateFocusedOption();
  }

  /**
   * Update focused option visual state
   * @private
   */
  updateFocusedOption() {
    this._options.forEach((option, index) => {
      option.setFocused(index === this._focusedIndex);
    });
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} type
   * @param {object} detail
   */
  publishEvent(type, detail) {
    this.dispatchEvent(new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail
    }));
  }

  /**
   * Get current value
   * @returns {string|null}
   */
  get value() {
    return this._value;
  }

  /**
   * Set current value
   * @param {string} value
   */
  set value(value) {
    this.setAttribute('value', value);
  }

  /**
   * Get open state
   * @returns {boolean}
   */
  get open() {
    return this._open;
  }
}

customElements.define('select-root', SelectRoot);

export { SelectRoot };