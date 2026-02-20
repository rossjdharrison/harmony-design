/**
 * @fileoverview ValidatedInput Web Component
 * Input field with built-in validation and immediate feedback.
 * Integrates with validation rules and displays validation messages.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#ui-layer-validation}
 */

import '../validation-message/validation-message.js';

/**
 * ValidatedInput component provides real-time validation feedback.
 * Publishes validation events via EventBus for BC integration.
 * 
 * @class ValidatedInput
 * @extends HTMLElement
 * 
 * @attr {string} name - Input name
 * @attr {string} label - Input label
 * @attr {string} type - Input type (text, email, number, etc.)
 * @attr {string} value - Input value
 * @attr {string} placeholder - Placeholder text
 * @attr {boolean} required - Required field
 * @attr {string} pattern - Validation pattern (regex)
 * @attr {string} min - Minimum value (for number/date)
 * @attr {string} max - Maximum value (for number/date)
 * @attr {number} minlength - Minimum length
 * @attr {number} maxlength - Maximum length
 * @attr {boolean} disabled - Disabled state
 * @attr {string} validation-mode - 'blur' | 'change' | 'submit' (default: 'blur')
 * 
 * @fires validation-change - When validation state changes
 * @fires input-change - When input value changes
 * 
 * @example
 * <validated-input 
 *   name="email" 
 *   label="Email Address" 
 *   type="email" 
 *   required
 *   validation-mode="change">
 * </validated-input>
 */
class ValidatedInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._validationRules = [];
    this._validationState = {
      valid: true,
      message: '',
      severity: 'info'
    };
  }

  static get observedAttributes() {
    return [
      'name', 'label', 'type', 'value', 'placeholder', 
      'required', 'pattern', 'min', 'max', 'minlength', 
      'maxlength', 'disabled', 'validation-mode'
    ];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.buildValidationRules();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'value') {
        this.updateInputValue(newValue);
      } else {
        this.render();
        if (['required', 'pattern', 'min', 'max', 'minlength', 'maxlength'].includes(name)) {
          this.buildValidationRules();
        }
      }
    }
  }

  /**
   * Sets up event listeners for validation
   * @private
   */
  setupEventListeners() {
    const input = this.shadowRoot.querySelector('input');
    if (!input) return;

    const validationMode = this.getAttribute('validation-mode') || 'blur';

    input.addEventListener('blur', () => {
      if (validationMode === 'blur' || validationMode === 'submit') {
        this.validate();
      }
    });

    input.addEventListener('input', (e) => {
      this.setAttribute('value', e.target.value);
      this.publishInputChange(e.target.value);

      if (validationMode === 'change') {
        this.validate();
      }
    });

    input.addEventListener('focus', () => {
      this.shadowRoot.querySelector('.input-wrapper')?.classList.add('focused');
    });

    input.addEventListener('blur', () => {
      this.shadowRoot.querySelector('.input-wrapper')?.classList.remove('focused');
    });
  }

  /**
   * Builds validation rules from attributes
   * @private
   */
  buildValidationRules() {
    this._validationRules = [];

    if (this.hasAttribute('required')) {
      this._validationRules.push({
        name: 'required',
        validate: (value) => value && value.trim().length > 0,
        message: `${this.getAttribute('label') || 'This field'} is required`
      });
    }

    const type = this.getAttribute('type');
    if (type === 'email') {
      this._validationRules.push({
        name: 'email',
        validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Please enter a valid email address'
      });
    }

    const pattern = this.getAttribute('pattern');
    if (pattern) {
      this._validationRules.push({
        name: 'pattern',
        validate: (value) => !value || new RegExp(pattern).test(value),
        message: 'Please match the requested format'
      });
    }

    const minlength = this.getAttribute('minlength');
    if (minlength) {
      this._validationRules.push({
        name: 'minlength',
        validate: (value) => !value || value.length >= parseInt(minlength),
        message: `Minimum length is ${minlength} characters`
      });
    }

    const maxlength = this.getAttribute('maxlength');
    if (maxlength) {
      this._validationRules.push({
        name: 'maxlength',
        validate: (value) => !value || value.length <= parseInt(maxlength),
        message: `Maximum length is ${maxlength} characters`
      });
    }

    const min = this.getAttribute('min');
    if (min && (type === 'number' || type === 'date')) {
      this._validationRules.push({
        name: 'min',
        validate: (value) => !value || parseFloat(value) >= parseFloat(min),
        message: `Minimum value is ${min}`
      });
    }

    const max = this.getAttribute('max');
    if (max && (type === 'number' || type === 'date')) {
      this._validationRules.push({
        name: 'max',
        validate: (value) => !value || parseFloat(value) <= parseFloat(max),
        message: `Maximum value is ${max}`
      });
    }
  }

  /**
   * Validates current input value
   * @public
   * @returns {boolean} Validation result
   */
  validate() {
    const input = this.shadowRoot.querySelector('input');
    if (!input) return true;

    const value = input.value;

    for (const rule of this._validationRules) {
      if (!rule.validate(value)) {
        this.setValidationState(false, rule.message, 'error');
        return false;
      }
    }

    this.setValidationState(true, '', 'success');
    return true;
  }

  /**
   * Sets validation state and updates UI
   * @private
   * @param {boolean} valid - Validation result
   * @param {string} message - Validation message
   * @param {string} severity - Message severity
   */
  setValidationState(valid, message, severity) {
    this._validationState = { valid, message, severity };

    const wrapper = this.shadowRoot.querySelector('.input-wrapper');
    const validationMsg = this.shadowRoot.querySelector('validation-message');

    if (wrapper) {
      wrapper.classList.toggle('invalid', !valid);
      wrapper.classList.toggle('valid', valid && message);
    }

    if (validationMsg) {
      if (message) {
        validationMsg.setAttribute('severity', severity);
        validationMsg.setAttribute('message', message);
        validationMsg.setAttribute('visible', '');
      } else {
        validationMsg.removeAttribute('visible');
      }
    }

    this.publishValidationChange();
  }

  /**
   * Updates input value programmatically
   * @private
   * @param {string} value - New value
   */
  updateInputValue(value) {
    const input = this.shadowRoot.querySelector('input');
    if (input && input.value !== value) {
      input.value = value || '';
    }
  }

  /**
   * Publishes validation change event
   * @private
   */
  publishValidationChange() {
    this.dispatchEvent(new CustomEvent('validation-change', {
      bubbles: true,
      composed: true,
      detail: {
        name: this.getAttribute('name'),
        valid: this._validationState.valid,
        message: this._validationState.message,
        severity: this._validationState.severity
      }
    }));
  }

  /**
   * Publishes input change event
   * @private
   * @param {string} value - New value
   */
  publishInputChange(value) {
    this.dispatchEvent(new CustomEvent('input-change', {
      bubbles: true,
      composed: true,
      detail: {
        name: this.getAttribute('name'),
        value: value
      }
    }));
  }

  /**
   * Gets current validation state
   * @public
   * @returns {Object} Validation state
   */
  getValidationState() {
    return { ...this._validationState };
  }

  render() {
    const name = this.getAttribute('name') || '';
    const label = this.getAttribute('label') || '';
    const type = this.getAttribute('type') || 'text';
    const value = this.getAttribute('value') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const required = this.hasAttribute('required');
    const disabled = this.hasAttribute('disabled');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .label {
          font-size: var(--font-size-sm, 0.875rem);
          font-weight: 500;
          color: var(--color-text-primary, #1f2937);
        }

        .label.required::after {
          content: ' *';
          color: var(--color-error-text, #dc2626);
        }

        .input-wrapper {
          position: relative;
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: var(--border-radius-md, 6px);
          background: var(--color-bg-input, #ffffff);
          transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
        }

        .input-wrapper.focused {
          border-color: var(--color-primary, #3b82f6);
          box-shadow: 0 0 0 3px var(--color-primary-alpha, rgba(59, 130, 246, 0.1));
        }

        .input-wrapper.invalid {
          border-color: var(--color-error-border, #fca5a5);
        }

        .input-wrapper.invalid.focused {
          box-shadow: 0 0 0 3px var(--color-error-alpha, rgba(220, 38, 38, 0.1));
        }

        .input-wrapper.valid {
          border-color: var(--color-success-border, #86efac);
        }

        input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: var(--font-size-base, 1rem);
          color: var(--color-text-primary, #1f2937);
          outline: none;
          box-sizing: border-box;
        }

        input::placeholder {
          color: var(--color-text-placeholder, #9ca3af);
        }

        input:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        validation-message {
          margin-top: 0.25rem;
        }
      </style>
      <div class="field">
        ${label ? `<label class="label ${required ? 'required' : ''}">${label}</label>` : ''}
        <div class="input-wrapper">
          <input
            type="${type}"
            name="${name}"
            value="${value}"
            placeholder="${placeholder}"
            ${required ? 'required' : ''}
            ${disabled ? 'disabled' : ''}
          />
        </div>
        <validation-message></validation-message>
      </div>
    `;
  }
}

customElements.define('validated-input', ValidatedInput);

export { ValidatedInput };