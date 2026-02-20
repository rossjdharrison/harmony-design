/**
 * @fileoverview Validated Input - Input with async server-side validation
 * @module components/validated-input
 * 
 * Web component that provides async validation with visual feedback.
 * Demonstrates async validator usage with debouncing and cancellation.
 * 
 * Performance: Debounces validation to respect 16ms render budget
 * Memory: Cleans up validators on disconnect
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#validated-input}
 * @see {@link file://../utils/validation/async-validator.js}
 */

import { createAsyncValidator } from '../utils/validation/async-validator.js';

/**
 * Validated input component with async server-side validation
 * 
 * @element validated-input
 * 
 * @attr {string} name - Input name
 * @attr {string} label - Input label
 * @attr {string} placeholder - Input placeholder
 * @attr {string} value - Input value
 * @attr {string} endpoint - Validation endpoint URL
 * @attr {number} debounce - Debounce delay in ms (default: 300)
 * @attr {boolean} required - Whether input is required
 * @attr {boolean} disabled - Whether input is disabled
 * @attr {boolean} validate-on-blur - Validate immediately on blur (default: true)
 * 
 * @fires validation-start - Fired when validation starts
 * @fires validation-success - Fired when validation succeeds
 * @fires validation-error - Fired when validation fails
 * @fires input - Fired when input value changes
 * @fires change - Fired when input value is committed
 * 
 * @csspart container - Container element
 * @csspart label - Label element
 * @csspart input - Input element
 * @csspart error - Error message element
 * @csspart spinner - Loading spinner element
 * 
 * @cssprop --validated-input-border-color - Border color
 * @cssprop --validated-input-border-color-error - Error border color
 * @cssprop --validated-input-border-color-success - Success border color
 * @cssprop --validated-input-focus-color - Focus outline color
 * 
 * @example
 * <validated-input
 *   name="username"
 *   label="Username"
 *   endpoint="/api/validate/username"
 *   debounce="500"
 *   required
 * ></validated-input>
 */
class ValidatedInput extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'disabled', 'endpoint', 'debounce', 'required'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._validator = null;
    this._value = '';
    this._validationState = {
      validating: false,
      valid: false,
      error: null
    };
  }

  connectedCallback() {
    this.render();
    this.setupValidator();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    if (this._validator) {
      this._validator.cancel();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'value') {
      this._value = newValue || '';
      const input = this.shadowRoot.querySelector('input');
      if (input && input.value !== this._value) {
        input.value = this._value;
      }
    } else if (name === 'endpoint' || name === 'debounce') {
      this.setupValidator();
    }
    
    this.render();
  }

  /**
   * Sets up the async validator
   * @private
   */
  setupValidator() {
    // Cancel existing validator
    if (this._validator) {
      this._validator.cancel();
    }

    const endpoint = this.getAttribute('endpoint');
    if (!endpoint) return;

    const debounceMs = parseInt(this.getAttribute('debounce') || '300', 10);
    const validateOnBlur = this.hasAttribute('validate-on-blur') 
      ? this.getAttribute('validate-on-blur') !== 'false'
      : true;

    this._validator = createAsyncValidator(
      async (value, signal) => {
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set('value', value);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal
        });
        
        if (!response.ok) {
          throw new Error(`Validation failed: ${response.status}`);
        }
        
        return response.json();
      },
      { debounceMs, validateOnBlur }
    );

    // Subscribe to validation state changes
    this._validator.subscribe((state) => {
      this._validationState = state;
      this.updateValidationUI();
      
      if (state.validating) {
        this.dispatchEvent(new CustomEvent('validation-start', {
          detail: { value: this._value }
        }));
      } else if (state.valid) {
        this.dispatchEvent(new CustomEvent('validation-success', {
          detail: { value: this._value, data: state.data }
        }));
      } else if (state.error) {
        this.dispatchEvent(new CustomEvent('validation-error', {
          detail: { value: this._value, error: state.error }
        }));
      }
    });
  }

  /**
   * Attaches event listeners
   * @private
   */
  attachEventListeners() {
    const input = this.shadowRoot.querySelector('input');
    if (!input) return;

    input.addEventListener('input', (e) => {
      this._value = e.target.value;
      this.setAttribute('value', this._value);
      
      // Validate if validator is set up
      if (this._validator && this._value) {
        this._validator.validate(this._value);
      } else if (!this._value) {
        // Clear validation state when empty
        this._validationState = { validating: false, valid: false, error: null };
        this.updateValidationUI();
      }
      
      this.dispatchEvent(new CustomEvent('input', {
        detail: { value: this._value },
        bubbles: true
      }));
    });

    input.addEventListener('blur', () => {
      if (this._validator && this._value && this._validator.options.validateOnBlur) {
        this._validator.validate(this._value, { immediate: true });
      }
      
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: this._value },
        bubbles: true
      }));
    });
  }

  /**
   * Updates validation UI state
   * @private
   */
  updateValidationUI() {
    const container = this.shadowRoot.querySelector('.validated-input');
    const input = this.shadowRoot.querySelector('input');
    const error = this.shadowRoot.querySelector('.error');
    const spinner = this.shadowRoot.querySelector('.spinner');

    if (!container) return;

    // Update classes
    container.classList.toggle('validating', this._validationState.validating);
    container.classList.toggle('valid', this._validationState.valid);
    container.classList.toggle('invalid', !this._validationState.valid && !!this._validationState.error);

    // Update ARIA attributes
    if (input) {
      input.setAttribute('aria-invalid', !this._validationState.valid && !!this._validationState.error);
      if (this._validationState.error) {
        input.setAttribute('aria-describedby', 'error-message');
      } else {
        input.removeAttribute('aria-describedby');
      }
    }

    // Update error message
    if (error) {
      error.textContent = this._validationState.error || '';
      error.style.display = this._validationState.error ? 'block' : 'none';
    }

    // Update spinner
    if (spinner) {
      spinner.style.display = this._validationState.validating ? 'block' : 'none';
    }
  }

  /**
   * Validates the current value immediately
   * @returns {Promise<boolean>} Validation result
   */
  async validate() {
    if (!this._validator || !this._value) {
      return !this.hasAttribute('required') || !!this._value;
    }

    try {
      const result = await this._validator.validate(this._value, { immediate: true });
      return result.valid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the current value
   * @returns {string} Current value
   */
  get value() {
    return this._value;
  }

  /**
   * Sets the value
   * @param {string} value - New value
   */
  set value(value) {
    this.setAttribute('value', value);
  }

  /**
   * Renders the component
   * @private
   */
  render() {
    const name = this.getAttribute('name') || '';
    const label = this.getAttribute('label') || '';
    const placeholder = this.getAttribute('placeholder') || '';
    const required = this.hasAttribute('required');
    const disabled = this.hasAttribute('disabled');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .validated-input {
          position: relative;
          margin-bottom: 1rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--validated-input-label-color, #333);
        }

        .required {
          color: var(--validated-input-required-color, #e53e3e);
          margin-left: 0.25rem;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        input {
          flex: 1;
          padding: 0.5rem 2.5rem 0.5rem 0.75rem;
          border: 2px solid var(--validated-input-border-color, #cbd5e0);
          border-radius: 0.375rem;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          width: 100%;
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: var(--validated-input-focus-color, #4299e1);
          box-shadow: 0 0 0 3px var(--validated-input-focus-shadow, rgba(66, 153, 225, 0.1));
        }

        input:disabled {
          background-color: var(--validated-input-disabled-bg, #f7fafc);
          cursor: not-allowed;
        }

        .validated-input.validating input {
          border-color: var(--validated-input-validating-color, #4299e1);
        }

        .validated-input.valid input {
          border-color: var(--validated-input-border-color-success, #48bb78);
        }

        .validated-input.invalid input {
          border-color: var(--validated-input-border-color-error, #e53e3e);
        }

        .icon {
          position: absolute;
          right: 0.75rem;
          width: 1.25rem;
          height: 1.25rem;
          pointer-events: none;
        }

        .spinner {
          display: none;
          border: 2px solid var(--validated-input-spinner-bg, #e2e8f0);
          border-top-color: var(--validated-input-spinner-color, #4299e1);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .check-icon {
          display: none;
          color: var(--validated-input-success-color, #48bb78);
        }

        .validated-input.valid .check-icon {
          display: block;
        }

        .error {
          display: none;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: var(--validated-input-error-color, #e53e3e);
        }
      </style>

      <div class="validated-input" part="container">
        ${label ? `
          <label part="label">
            ${label}
            ${required ? '<span class="required">*</span>' : ''}
          </label>
        ` : ''}
        
        <div class="input-wrapper">
          <input
            part="input"
            type="text"
            name="${name}"
            value="${this._value}"
            placeholder="${placeholder}"
            ${required ? 'required' : ''}
            ${disabled ? 'disabled' : ''}
            aria-label="${label || name}"
          />
          
          <div class="icon spinner" part="spinner"></div>
          
          <svg class="icon check-icon" part="check-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
        </div>
        
        <div class="error" part="error" id="error-message" role="alert"></div>
      </div>
    `;
  }
}

customElements.define('validated-input', ValidatedInput);

export { ValidatedInput };