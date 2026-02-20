/**
 * @fileoverview Form Submission Handler Web Component
 * @module components/form-submission-handler
 * 
 * Declarative form submission handler that wraps forms and manages
 * submission lifecycle, loading states, and error display.
 * 
 * Related Documentation: harmony-design/DESIGN_SYSTEM.md#Form-Submission-Handler
 * 
 * @example
 * <form-submission-handler
 *   endpoint="/api/submit"
 *   method="POST"
 *   timeout="10000">
 *   <form slot="form">
 *     <input name="email" type="email" required>
 *     <button type="submit">Submit</button>
 *   </form>
 *   <div slot="loading">Submitting...</div>
 *   <div slot="error"></div>
 *   <div slot="success">Success!</div>
 * </form-submission-handler>
 */

import { useFormSubmissionForComponent } from '../hooks/useFormSubmission.js';

/**
 * Form Submission Handler Component
 * Manages form submission with loading, error, and success states
 * 
 * @class FormSubmissionHandler
 * @extends HTMLElement
 * 
 * @attr {string} endpoint - API endpoint URL
 * @attr {string} method - HTTP method (default: POST)
 * @attr {string} timeout - Submission timeout in ms (default: 30000)
 * @attr {string} event-namespace - EventBus namespace (default: form)
 * @attr {boolean} prevent-default - Prevent default form submission (default: true)
 * @attr {boolean} reset-on-success - Reset form on success (default: false)
 * 
 * @slot form - Form element to manage
 * @slot loading - Loading state content
 * @slot error - Error state content
 * @slot success - Success state content
 * 
 * @fires {CustomEvent} submit-start - Fired when submission starts
 * @fires {CustomEvent} submit-success - Fired when submission succeeds
 * @fires {CustomEvent} submit-error - Fired when submission fails
 * @fires {CustomEvent} submission-state-change - Fired on any state change
 */
class FormSubmissionHandler extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._handler = null;
    this._form = null;
    this._boundSubmitHandler = this._handleFormSubmit.bind(this);
  }

  static get observedAttributes() {
    return ['endpoint', 'method', 'timeout', 'event-namespace', 'prevent-default', 'reset-on-success'];
  }

  connectedCallback() {
    this._render();
    this._setupFormHandler();
  }

  disconnectedCallback() {
    this._cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._render();
      if (this._handler) {
        this._setupFormHandler();
      }
    }
  }

  /**
   * Render component template
   * @private
   */
  _render() {
    const styles = `
      :host {
        display: block;
        position: relative;
      }

      .form-container {
        position: relative;
      }

      .state-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.9);
        z-index: 10;
      }

      .state-overlay.visible {
        display: flex;
      }

      .loading-container,
      .error-container,
      .success-container {
        display: none;
      }

      .loading-container.visible,
      .error-container.visible,
      .success-container.visible {
        display: block;
      }

      ::slotted(form) {
        transition: opacity 0.2s ease;
      }

      :host([submitting]) ::slotted(form) {
        opacity: 0.6;
        pointer-events: none;
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="form-container">
        <slot name="form"></slot>
        
        <div class="state-overlay" part="overlay">
          <div class="loading-container" part="loading">
            <slot name="loading">
              <span>Submitting...</span>
            </slot>
          </div>
        </div>
      </div>
      
      <div class="error-container" part="error">
        <slot name="error"></slot>
      </div>
      
      <div class="success-container" part="success">
        <slot name="success"></slot>
      </div>
    `;
  }

  /**
   * Setup form submission handler
   * @private
   */
  _setupFormHandler() {
    this._cleanup();

    const endpoint = this.getAttribute('endpoint');
    const method = this.getAttribute('method') || 'POST';
    const timeout = parseInt(this.getAttribute('timeout') || '30000', 10);
    const eventNamespace = this.getAttribute('event-namespace') || 'form';
    const resetOnSuccess = this.hasAttribute('reset-on-success');

    // Get form element from slot
    const formSlot = this.shadowRoot.querySelector('slot[name="form"]');
    const assignedElements = formSlot.assignedElements();
    this._form = assignedElements.find(el => el.tagName === 'FORM');

    if (!this._form) {
      console.warn('FormSubmissionHandler: No form element found in slot');
      return;
    }

    // Create submission handler
    this._handler = useFormSubmissionForComponent(this, {
      onSubmit: async (formData) => {
        if (endpoint) {
          return this._submitToEndpoint(endpoint, method, formData);
        } else {
          // Custom submission via event
          return this._submitViaEvent(formData);
        }
      },
      onSuccess: (result) => {
        if (resetOnSuccess && this._form) {
          this._form.reset();
        }
      },
      timeout,
      eventNamespace
    });

    // Attach form submit listener
    this._form.addEventListener('submit', this._boundSubmitHandler);
  }

  /**
   * Handle form submit event
   * @private
   * @param {Event} event - Submit event
   */
  _handleFormSubmit(event) {
    const preventDefault = this.hasAttribute('prevent-default') || this.hasAttribute('endpoint');
    
    if (preventDefault) {
      event.preventDefault();
    }

    const formData = new FormData(this._form);
    const data = Object.fromEntries(formData.entries());

    this._handler.submit(data).catch(error => {
      // Error already handled by handler
      console.error('FormSubmissionHandler: Submission failed:', error);
    });
  }

  /**
   * Submit to API endpoint
   * @private
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Form data
   * @returns {Promise<*>} Response data
   */
  async _submitToEndpoint(endpoint, method, data) {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Submit via custom event (for custom handlers)
   * @private
   * @param {Object} data - Form data
   * @returns {Promise<*>} Result from event handler
   */
  async _submitViaEvent(data) {
    return new Promise((resolve, reject) => {
      const event = new CustomEvent('custom-submit', {
        detail: { data, resolve, reject },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);

      // If no handler resolves within 100ms, reject
      setTimeout(() => {
        reject(new Error('No custom submit handler responded'));
      }, 100);
    });
  }

  /**
   * Handle submission state changes
   * @param {Object} state - Submission state
   */
  onSubmissionStateChange(state) {
    const overlay = this.shadowRoot.querySelector('.state-overlay');
    const loadingContainer = this.shadowRoot.querySelector('.loading-container');
    const errorContainer = this.shadowRoot.querySelector('.error-container');
    const successContainer = this.shadowRoot.querySelector('.success-container');

    // Update submitting attribute
    if (state.isSubmitting) {
      this.setAttribute('submitting', '');
    } else {
      this.removeAttribute('submitting');
    }

    // Show/hide loading overlay
    if (state.isSubmitting) {
      overlay.classList.add('visible');
      loadingContainer.classList.add('visible');
    } else {
      overlay.classList.remove('visible');
      loadingContainer.classList.remove('visible');
    }

    // Show/hide error
    if (state.error) {
      errorContainer.classList.add('visible');
      const errorSlot = errorContainer.querySelector('slot');
      if (errorSlot.assignedElements().length === 0) {
        errorContainer.textContent = state.error.message;
      }
    } else {
      errorContainer.classList.remove('visible');
    }

    // Show/hide success
    if (state.isSuccess) {
      successContainer.classList.add('visible');
    } else {
      successContainer.classList.remove('visible');
    }
  }

  /**
   * Cleanup resources
   * @private
   */
  _cleanup() {
    if (this._form && this._boundSubmitHandler) {
      this._form.removeEventListener('submit', this._boundSubmitHandler);
    }
    if (this._handler) {
      this._handler.destroy();
      this._handler = null;
    }
    this._form = null;
  }

  /**
   * Programmatically submit the form
   * @returns {Promise<*>} Submission result
   */
  submit() {
    if (!this._handler || !this._form) {
      return Promise.reject(new Error('Handler not initialized'));
    }

    const formData = new FormData(this._form);
    const data = Object.fromEntries(formData.entries());
    return this._handler.submit(data);
  }

  /**
   * Reset submission state
   */
  reset() {
    if (this._handler) {
      this._handler.reset();
    }
    if (this._form) {
      this._form.reset();
    }
  }
}

customElements.define('form-submission-handler', FormSubmissionHandler);

export { FormSubmissionHandler };