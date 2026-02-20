/**
 * @fileoverview ValidationForm Web Component
 * Form container that coordinates validation across multiple inputs.
 * Provides form-level validation and submission handling.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#ui-layer-validation}
 */

import '../../primitives/validated-input/validated-input.js';

/**
 * ValidationForm component manages form validation state.
 * Coordinates validation across child validated-input components.
 * 
 * @class ValidationForm
 * @extends HTMLElement
 * 
 * @attr {string} name - Form name
 * @attr {string} validation-mode - 'blur' | 'change' | 'submit' (default: 'submit')
 * 
 * @fires form-submit - When form is submitted with valid data
 * @fires form-invalid - When form submission fails validation
 * @fires form-validation-change - When form validation state changes
 * 
 * @example
 * <validation-form name="signup" validation-mode="blur">
 *   <validated-input name="email" label="Email" type="email" required></validated-input>
 *   <validated-input name="password" label="Password" type="password" required minlength="8"></validated-input>
 *   <button type="submit">Sign Up</button>
 * </validation-form>
 */
class ValidationForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._fieldStates = new Map();
  }

  static get observedAttributes() {
    return ['name', 'validation-mode'];
  }

  connectedCallback() {
    this.render();
    this.setupFormValidation();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Sets up form validation and event handling
   * @private
   */
  setupFormValidation() {
    const form = this.shadowRoot.querySelector('form');
    if (!form) return;

    // Prevent default form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Listen for validation changes from child inputs
    this.addEventListener('validation-change', (e) => {
      if (e.target.tagName === 'VALIDATED-INPUT') {
        this.updateFieldState(e.detail);
      }
    });

    // Listen for input changes
    this.addEventListener('input-change', (e) => {
      if (e.target.tagName === 'VALIDATED-INPUT') {
        this.updateFieldValue(e.detail);
      }
    });

    // Apply validation mode to child inputs
    this.applyValidationMode();
  }

  /**
   * Applies validation mode to all child validated-input elements
   * @private
   */
  applyValidationMode() {
    const mode = this.getAttribute('validation-mode') || 'submit';
    const inputs = this.querySelectorAll('validated-input');
    
    inputs.forEach(input => {
      if (!input.hasAttribute('validation-mode')) {
        input.setAttribute('validation-mode', mode);
      }
    });
  }

  /**
   * Updates field validation state
   * @private
   * @param {Object} detail - Validation change detail
   */
  updateFieldState(detail) {
    this._fieldStates.set(detail.name, {
      valid: detail.valid,
      message: detail.message,
      severity: detail.severity
    });

    this.publishFormValidationChange();
  }

  /**
   * Updates field value
   * @private
   * @param {Object} detail - Input change detail
   */
  updateFieldValue(detail) {
    const state = this._fieldStates.get(detail.name) || {};
    this._fieldStates.set(detail.name, {
      ...state,
      value: detail.value
    });
  }

  /**
   * Handles form submission
   * @private
   */
  handleSubmit() {
    const validationMode = this.getAttribute('validation-mode');
    
    // If in submit mode, validate all fields now
    if (validationMode === 'submit') {
      this.validateAllFields();
    }

    // Check if form is valid
    if (this.isFormValid()) {
      const formData = this.getFormData();
      this.publishFormSubmit(formData);
    } else {
      this.publishFormInvalid();
    }
  }

  /**
   * Validates all child validated-input elements
   * @private
   */
  validateAllFields() {
    const inputs = this.querySelectorAll('validated-input');
    inputs.forEach(input => {
      if (typeof input.validate === 'function') {
        input.validate();
      }
    });
  }

  /**
   * Checks if form is valid
   * @public
   * @returns {boolean} Form validity
   */
  isFormValid() {
    for (const [name, state] of this._fieldStates) {
      if (state.valid === false) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets form data as object
   * @public
   * @returns {Object} Form data
   */
  getFormData() {
    const data = {};
    for (const [name, state] of this._fieldStates) {
      data[name] = state.value || '';
    }
    return data;
  }

  /**
   * Gets validation errors
   * @public
   * @returns {Array} Array of validation errors
   */
  getValidationErrors() {
    const errors = [];
    for (const [name, state] of this._fieldStates) {
      if (!state.valid && state.message) {
        errors.push({
          field: name,
          message: state.message,
          severity: state.severity
        });
      }
    }
    return errors;
  }

  /**
   * Resets form to initial state
   * @public
   */
  reset() {
    const form = this.shadowRoot.querySelector('form');
    if (form) {
      form.reset();
    }
    this._fieldStates.clear();
    this.publishFormValidationChange();
  }

  /**
   * Publishes form submit event
   * @private
   * @param {Object} formData - Form data
   */
  publishFormSubmit(formData) {
    this.dispatchEvent(new CustomEvent('form-submit', {
      bubbles: true,
      composed: true,
      detail: {
        formName: this.getAttribute('name'),
        data: formData
      }
    }));
  }

  /**
   * Publishes form invalid event
   * @private
   */
  publishFormInvalid() {
    this.dispatchEvent(new CustomEvent('form-invalid', {
      bubbles: true,
      composed: true,
      detail: {
        formName: this.getAttribute('name'),
        errors: this.getValidationErrors()
      }
    }));
  }

  /**
   * Publishes form validation change event
   * @private
   */
  publishFormValidationChange() {
    this.dispatchEvent(new CustomEvent('form-validation-change', {
      bubbles: true,
      composed: true,
      detail: {
        formName: this.getAttribute('name'),
        valid: this.isFormValid(),
        fieldCount: this._fieldStates.size,
        errors: this.getValidationErrors()
      }
    }));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
        }

        form {
          display: contents;
        }
      </style>
      <form>
        <slot></slot>
      </form>
    `;
  }
}

customElements.define('validation-form', ValidationForm);

export { ValidationForm };