/**
 * @fileoverview Date Input Component - Text input with date parsing and formatting
 * @module primitives/date-input
 * 
 * Provides a text input that accepts various date formats and normalizes them.
 * Supports keyboard input, validation, and custom formatting.
 * 
 * Events Published:
 * - date-input:change - When a valid date is entered
 * - date-input:invalid - When an invalid date is entered
 * - date-input:clear - When the input is cleared
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#date-input}
 */

/**
 * Date Input Web Component
 * 
 * @class DateInputComponent
 * @extends HTMLElement
 * 
 * @attr {string} value - ISO date string (YYYY-MM-DD)
 * @attr {string} format - Display format (default: 'MM/DD/YYYY')
 * @attr {string} placeholder - Placeholder text
 * @attr {boolean} disabled - Disabled state
 * @attr {boolean} required - Required field
 * @attr {string} min - Minimum date (ISO format)
 * @attr {string} max - Maximum date (ISO format)
 * @attr {string} locale - Locale for date parsing (default: 'en-US')
 * 
 * @example
 * <date-input 
 *   value="2024-03-15" 
 *   format="DD/MM/YYYY"
 *   placeholder="Enter date"
 *   required>
 * </date-input>
 */
class DateInputComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._value = null; // Date object
    this._displayValue = '';
    this._isValid = true;
    this._format = 'MM/DD/YYYY';
    this._locale = 'en-US';
    
    // Performance tracking
    this._renderStart = 0;
  }

  static get observedAttributes() {
    return ['value', 'format', 'placeholder', 'disabled', 'required', 'min', 'max', 'locale'];
  }

  connectedCallback() {
    this._renderStart = performance.now();
    this._render();
    this._attachEventListeners();
    
    const renderTime = performance.now() - this._renderStart;
    if (renderTime > 16) {
      console.warn(`[DateInput] Render exceeded 16ms budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'value':
        this._setValue(newValue);
        break;
      case 'format':
        this._format = newValue || 'MM/DD/YYYY';
        this._updateDisplayValue();
        break;
      case 'locale':
        this._locale = newValue || 'en-US';
        break;
      case 'placeholder':
      case 'disabled':
      case 'required':
      case 'min':
      case 'max':
        this._updateInputAttributes();
        break;
    }
  }

  /**
   * Set date value from ISO string
   * @private
   * @param {string} isoString - ISO date string (YYYY-MM-DD)
   */
  _setValue(isoString) {
    if (!isoString) {
      this._value = null;
      this._displayValue = '';
      this._updateInput();
      return;
    }

    const date = this._parseISODate(isoString);
    if (date) {
      this._value = date;
      this._updateDisplayValue();
    }
  }

  /**
   * Parse ISO date string to Date object
   * @private
   * @param {string} isoString - ISO date string
   * @returns {Date|null}
   */
  _parseISODate(isoString) {
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (isNaN(date.getTime())) return null;
    return date;
  }

  /**
   * Update display value based on current date and format
   * @private
   */
  _updateDisplayValue() {
    if (!this._value) {
      this._displayValue = '';
    } else {
      this._displayValue = this._formatDate(this._value, this._format);
    }
    this._updateInput();
  }

  /**
   * Format date according to format string
   * @private
   * @param {Date} date - Date to format
   * @param {string} format - Format string
   * @returns {string}
   */
  _formatDate(date, format) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return format
      .replace('DD', String(day).padStart(2, '0'))
      .replace('D', String(day))
      .replace('MM', String(month).padStart(2, '0'))
      .replace('M', String(month))
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2));
  }

  /**
   * Parse user input to Date object
   * Supports multiple formats: MM/DD/YYYY, DD-MM-YYYY, YYYY.MM.DD, etc.
   * @private
   * @param {string} input - User input string
   * @returns {Date|null}
   */
  _parseUserInput(input) {
    if (!input || !input.trim()) return null;

    const cleaned = input.trim();
    
    // Try ISO format first
    const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return this._createDate(parseInt(year), parseInt(month), parseInt(day));
    }

    // Try various separators
    const separators = ['/', '-', '.', ' '];
    for (const sep of separators) {
      const parts = cleaned.split(sep);
      if (parts.length === 3) {
        const date = this._parseThreePartDate(parts);
        if (date) return date;
      }
    }

    // Try natural language parsing (basic)
    const naturalDate = this._parseNaturalLanguage(cleaned);
    if (naturalDate) return naturalDate;

    return null;
  }

  /**
   * Parse three-part date (handles different orderings)
   * @private
   * @param {string[]} parts - Array of three date parts
   * @returns {Date|null}
   */
  _parseThreePartDate(parts) {
    const nums = parts.map(p => parseInt(p, 10));
    if (nums.some(n => isNaN(n))) return null;

    // If first part is 4 digits, assume YYYY-MM-DD
    if (nums[0] > 1000) {
      return this._createDate(nums[0], nums[1], nums[2]);
    }

    // If last part is 4 digits, assume MM-DD-YYYY or DD-MM-YYYY
    if (nums[2] > 1000) {
      // Use locale to determine order
      if (this._locale.startsWith('en-US')) {
        return this._createDate(nums[2], nums[0], nums[1]); // MM/DD/YYYY
      } else {
        return this._createDate(nums[2], nums[1], nums[0]); // DD/MM/YYYY
      }
    }

    // Assume current century for 2-digit years
    const year = nums[2] < 100 ? 2000 + nums[2] : nums[2];
    
    if (this._locale.startsWith('en-US')) {
      return this._createDate(year, nums[0], nums[1]); // MM/DD/YY
    } else {
      return this._createDate(year, nums[1], nums[0]); // DD/MM/YY
    }
  }

  /**
   * Parse natural language date inputs
   * @private
   * @param {string} input - Natural language input
   * @returns {Date|null}
   */
  _parseNaturalLanguage(input) {
    const lower = input.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (lower === 'today') return today;
    
    if (lower === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    if (lower === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }

    return null;
  }

  /**
   * Create date with validation
   * @private
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {number} day - Day
   * @returns {Date|null}
   */
  _createDate(year, month, day) {
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1900 || year > 2100) return null;

    const date = new Date(year, month - 1, day);
    
    // Validate that date components match (handles invalid dates like Feb 31)
    if (date.getFullYear() !== year || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day) {
      return null;
    }

    return date;
  }

  /**
   * Validate date against min/max constraints
   * @private
   * @param {Date} date - Date to validate
   * @returns {boolean}
   */
  _validateDateRange(date) {
    if (!date) return false;

    const min = this.getAttribute('min');
    if (min) {
      const minDate = this._parseISODate(min);
      if (minDate && date < minDate) return false;
    }

    const max = this.getAttribute('max');
    if (max) {
      const maxDate = this._parseISODate(max);
      if (maxDate && date > maxDate) return false;
    }

    return true;
  }

  /**
   * Convert Date to ISO string (YYYY-MM-DD)
   * @private
   * @param {Date} date - Date to convert
   * @returns {string}
   */
  _toISOString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Handle input change
   * @private
   * @param {Event} event - Input event
   */
  _handleInput(event) {
    const input = event.target.value;
    
    if (!input || !input.trim()) {
      this._value = null;
      this._isValid = !this.hasAttribute('required');
      this._updateValidationState();
      this._publishEvent('date-input:clear', { source: this.id || 'date-input' });
      return;
    }

    const parsedDate = this._parseUserInput(input);
    
    if (parsedDate && this._validateDateRange(parsedDate)) {
      this._value = parsedDate;
      this._isValid = true;
      this._updateValidationState();
      
      const isoValue = this._toISOString(parsedDate);
      this.setAttribute('value', isoValue);
      
      this._publishEvent('date-input:change', {
        value: isoValue,
        date: parsedDate,
        source: this.id || 'date-input'
      });
    } else {
      this._isValid = false;
      this._updateValidationState();
      
      this._publishEvent('date-input:invalid', {
        input: input,
        source: this.id || 'date-input'
      });
    }
  }

  /**
   * Handle input blur - format the date
   * @private
   */
  _handleBlur() {
    if (this._value && this._isValid) {
      this._updateDisplayValue();
    }
  }

  /**
   * Update input element value
   * @private
   */
  _updateInput() {
    const input = this.shadowRoot.querySelector('input');
    if (input) {
      input.value = this._displayValue;
    }
  }

  /**
   * Update input attributes
   * @private
   */
  _updateInputAttributes() {
    const input = this.shadowRoot.querySelector('input');
    if (!input) return;

    const placeholder = this.getAttribute('placeholder');
    if (placeholder) {
      input.placeholder = placeholder;
    } else {
      input.placeholder = this._format.toLowerCase();
    }

    input.disabled = this.hasAttribute('disabled');
    input.required = this.hasAttribute('required');
  }

  /**
   * Update validation state visual feedback
   * @private
   */
  _updateValidationState() {
    const input = this.shadowRoot.querySelector('input');
    if (!input) return;

    if (this._isValid) {
      input.classList.remove('invalid');
      input.classList.add('valid');
    } else {
      input.classList.remove('valid');
      input.classList.add('invalid');
    }
  }

  /**
   * Publish event to EventBus
   * @private
   * @param {string} eventType - Event type
   * @param {Object} payload - Event payload
   */
  _publishEvent(eventType, payload) {
    const event = new CustomEvent('eventbus:publish', {
      bubbles: true,
      composed: true,
      detail: {
        type: eventType,
        payload: payload,
        timestamp: Date.now()
      }
    });
    this.dispatchEvent(event);
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    const input = this.shadowRoot.querySelector('input');
    if (!input) return;

    this._boundHandleInput = this._handleInput.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);

    input.addEventListener('input', this._boundHandleInput);
    input.addEventListener('blur', this._boundHandleBlur);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const input = this.shadowRoot.querySelector('input');
    if (!input) return;

    if (this._boundHandleInput) {
      input.removeEventListener('input', this._boundHandleInput);
    }
    if (this._boundHandleBlur) {
      input.removeEventListener('blur', this._boundHandleBlur);
    }
  }

  /**
   * Render component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: system-ui, -apple-system, sans-serif;
          --input-border-color: #cbd5e0;
          --input-focus-color: #4299e1;
          --input-error-color: #f56565;
          --input-success-color: #48bb78;
          --input-bg: #ffffff;
          --input-text: #2d3748;
          --input-placeholder: #a0aec0;
        }

        .date-input-wrapper {
          position: relative;
          display: inline-block;
          width: 100%;
        }

        input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 1rem;
          line-height: 1.5;
          color: var(--input-text);
          background-color: var(--input-bg);
          border: 1px solid var(--input-border-color);
          border-radius: 0.25rem;
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
          box-sizing: border-box;
        }

        input::placeholder {
          color: var(--input-placeholder);
        }

        input:focus {
          outline: none;
          border-color: var(--input-focus-color);
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        }

        input:disabled {
          background-color: #edf2f7;
          cursor: not-allowed;
          opacity: 0.6;
        }

        input.invalid {
          border-color: var(--input-error-color);
        }

        input.invalid:focus {
          box-shadow: 0 0 0 3px rgba(245, 101, 101, 0.1);
        }

        input.valid:not(:placeholder-shown) {
          border-color: var(--input-success-color);
        }

        .icon {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          width: 1.25rem;
          height: 1.25rem;
          color: var(--input-placeholder);
        }
      </style>
      <div class="date-input-wrapper">
        <input 
          type="text" 
          placeholder="${this._format.toLowerCase()}"
          value="${this._displayValue}"
          ${this.hasAttribute('disabled') ? 'disabled' : ''}
          ${this.hasAttribute('required') ? 'required' : ''}
        />
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    `;
  }

  /**
   * Public API: Get current date value
   * @returns {Date|null}
   */
  getDate() {
    return this._value;
  }

  /**
   * Public API: Get ISO string value
   * @returns {string|null}
   */
  getValue() {
    return this._value ? this._toISOString(this._value) : null;
  }

  /**
   * Public API: Set date value
   * @param {Date|string} value - Date object or ISO string
   */
  setDate(value) {
    if (value instanceof Date) {
      this._value = value;
      this._updateDisplayValue();
      this.setAttribute('value', this._toISOString(value));
    } else if (typeof value === 'string') {
      this._setValue(value);
    }
  }

  /**
   * Public API: Clear date value
   */
  clear() {
    this._value = null;
    this._displayValue = '';
    this._isValid = !this.hasAttribute('required');
    this._updateInput();
    this._updateValidationState();
    this.removeAttribute('value');
  }

  /**
   * Public API: Validate current value
   * @returns {boolean}
   */
  validate() {
    if (this.hasAttribute('required') && !this._value) {
      this._isValid = false;
      this._updateValidationState();
      return false;
    }

    if (this._value && !this._validateDateRange(this._value)) {
      this._isValid = false;
      this._updateValidationState();
      return false;
    }

    this._isValid = true;
    this._updateValidationState();
    return true;
  }
}

customElements.define('date-input', DateInputComponent);

export { DateInputComponent };