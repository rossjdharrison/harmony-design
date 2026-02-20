/**
 * @fileoverview Select.Trigger - Trigger button for select dropdown
 * @module components/primitives/select/select-trigger
 * 
 * Button that displays current selection and opens/closes dropdown.
 * 
 * @see {@link ../../../../DESIGN_SYSTEM.md#compound-select-pattern}
 * 
 * Performance Budget:
 * - Render: <1ms
 * - Memory: <2KB per instance
 */

/**
 * SelectTrigger - Trigger button for select dropdown
 * 
 * @class SelectTrigger
 * @extends HTMLElement
 * 
 * @attr {string} placeholder - Placeholder text when no selection
 * @attr {boolean} disabled - Whether trigger is disabled
 * 
 * @fires select:trigger-click - Fired when trigger is clicked
 * 
 * @example
 * <select-trigger placeholder="Select an option...">
 *   Current Selection
 * </select-trigger>
 */
class SelectTrigger extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private @type {SelectRoot|null} */
    this._context = null;
    
    /** @private @type {boolean} */
    this._open = false;
    
    /** @private @type {string} */
    this._label = '';
  }

  static get observedAttributes() {
    return ['placeholder', 'disabled'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.render();
  }

  /**
   * Render shadow DOM structure
   * @private
   */
  render() {
    const placeholder = this.getAttribute('placeholder') || 'Select...';
    const disabled = this.hasAttribute('disabled');
    const label = this._label || this.textContent || placeholder;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
          background: var(--color-surface, white);
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: var(--radius-md, 0.375rem);
          cursor: pointer;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          color: var(--color-text, #1f2937);
          transition: all 0.15s ease;
          user-select: none;
        }

        .trigger:hover:not(:disabled) {
          border-color: var(--color-border-hover, #9ca3af);
          background: var(--color-surface-hover, #f9fafb);
        }

        .trigger:focus {
          outline: 2px solid var(--color-primary, #3b82f6);
          outline-offset: 2px;
        }

        .trigger:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .trigger[aria-expanded="true"] {
          border-color: var(--color-primary, #3b82f6);
        }

        .label {
          flex: 1;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .label.placeholder {
          color: var(--color-text-muted, #6b7280);
        }

        .icon {
          margin-left: var(--spacing-2, 0.5rem);
          width: 1em;
          height: 1em;
          transition: transform 0.2s ease;
        }

        .trigger[aria-expanded="true"] .icon {
          transform: rotate(180deg);
        }
      </style>
      <button
        class="trigger"
        part="trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded="${this._open}"
        aria-label="Select option"
        ${disabled ? 'disabled' : ''}
        tabindex="0"
      >
        <span class="label ${!this._label ? 'placeholder' : ''}" part="label">
          ${label}
        </span>
        <svg class="icon" part="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    const button = this.shadowRoot.querySelector('.trigger');
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.hasAttribute('disabled')) {
        this.dispatchEvent(new CustomEvent('select:trigger-click', {
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  /**
   * Set context (parent SelectRoot)
   * @param {SelectRoot} context
   */
  setContext(context) {
    this._context = context;
  }

  /**
   * Set open state
   * @param {boolean} open
   */
  setOpen(open) {
    this._open = open;
    const button = this.shadowRoot.querySelector('.trigger');
    if (button) {
      button.setAttribute('aria-expanded', open);
    }
  }

  /**
   * Set label (selected option text)
   * @param {string} label
   */
  setLabel(label) {
    this._label = label;
    this.render();
  }

  /**
   * Set disabled state
   * @param {boolean} disabled
   */
  setDisabled(disabled) {
    if (disabled) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }
}

customElements.define('select-trigger', SelectTrigger);

export { SelectTrigger };