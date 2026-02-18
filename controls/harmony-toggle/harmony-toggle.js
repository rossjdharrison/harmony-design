/**
 * HarmonyToggle - Control component wrapping button primitive
 * 
 * A toggle button control that wraps the button primitive with state management,
 * event publishing, and integration with the Harmony Design System.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#controls-layer
 * @see harmony-design/primitives/button/button.js
 * 
 * @fires harmony-toggle-changed - Published when toggle state changes
 * 
 * @example
 * <harmony-toggle
 *   label="Mute"
 *   pressed="false"
 *   variant="primary"
 *   disabled="false">
 * </harmony-toggle>
 */
class HarmonyToggle extends HTMLElement {
  /**
   * @private
   * @type {ShadowRoot}
   */
  #shadow;

  /**
   * @private
   * @type {HTMLElement|null}
   */
  #button;

  /**
   * @private
   * @type {boolean}
   */
  #pressed = false;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  /**
   * Observed attributes for reactive updates
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['label', 'pressed', 'variant', 'disabled', 'size'];
  }

  /**
   * Lifecycle: Connected to DOM
   */
  connectedCallback() {
    this.#render();
    this.#attachEventListeners();
  }

  /**
   * Lifecycle: Attribute changed
   * @param {string} name
   * @param {string|null} oldValue
   * @param {string|null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'pressed') {
      this.#pressed = newValue === 'true';
    }

    if (this.#button) {
      this.#updateButton();
    }
  }

  /**
   * Lifecycle: Disconnected from DOM
   */
  disconnectedCallback() {
    this.#detachEventListeners();
  }

  /**
   * Render the component structure
   * @private
   */
  #render() {
    const label = this.getAttribute('label') || 'Toggle';
    const pressed = this.getAttribute('pressed') === 'true';
    const variant = this.getAttribute('variant') || 'secondary';
    const disabled = this.hasAttribute('disabled');
    const size = this.getAttribute('size') || 'medium';

    this.#pressed = pressed;

    this.#shadow.innerHTML = `
      <style>
        :host {
          display: inline-block;
          --toggle-transition-duration: 150ms;
        }

        .toggle-container {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        harmony-button {
          transition: all var(--toggle-transition-duration) ease-out;
        }

        /* Pressed state visual feedback */
        harmony-button[pressed="true"] {
          transform: scale(0.95);
        }

        /* Focus visible styles */
        harmony-button:focus-visible {
          outline: 2px solid var(--harmony-color-focus, #0066cc);
          outline-offset: 2px;
        }

        /* Disabled state */
        :host([disabled]) {
          opacity: 0.5;
          pointer-events: none;
        }
      </style>

      <div class="toggle-container">
        <harmony-button
          label="${label}"
          variant="${variant}"
          size="${size}"
          pressed="${pressed}"
          ${disabled ? 'disabled' : ''}
          role="switch"
          aria-checked="${pressed}">
        </harmony-button>
      </div>
    `;

    this.#button = this.#shadow.querySelector('harmony-button');
  }

  /**
   * Update button attributes
   * @private
   */
  #updateButton() {
    if (!this.#button) return;

    const label = this.getAttribute('label') || 'Toggle';
    const variant = this.getAttribute('variant') || 'secondary';
    const disabled = this.hasAttribute('disabled');
    const size = this.getAttribute('size') || 'medium';

    this.#button.setAttribute('label', label);
    this.#button.setAttribute('variant', variant);
    this.#button.setAttribute('size', size);
    this.#button.setAttribute('pressed', this.#pressed.toString());
    this.#button.setAttribute('aria-checked', this.#pressed.toString());

    if (disabled) {
      this.#button.setAttribute('disabled', '');
    } else {
      this.#button.removeAttribute('disabled');
    }
  }

  /**
   * Attach event listeners
   * @private
   */
  #attachEventListeners() {
    if (this.#button) {
      this.#button.addEventListener('click', this.#handleClick);
    }
  }

  /**
   * Detach event listeners
   * @private
   */
  #detachEventListeners() {
    if (this.#button) {
      this.#button.removeEventListener('click', this.#handleClick);
    }
  }

  /**
   * Handle button click
   * @private
   * @param {Event} event
   */
  #handleClick = (event) => {
    event.preventDefault();
    
    if (this.hasAttribute('disabled')) {
      return;
    }

    this.toggle();
  };

  /**
   * Toggle the pressed state
   * @public
   */
  toggle() {
    this.#pressed = !this.#pressed;
    this.setAttribute('pressed', this.#pressed.toString());
    this.#updateButton();
    this.#publishChange();
  }

  /**
   * Set pressed state
   * @public
   * @param {boolean} pressed
   */
  setPressed(pressed) {
    this.#pressed = Boolean(pressed);
    this.setAttribute('pressed', this.#pressed.toString());
    this.#updateButton();
    this.#publishChange();
  }

  /**
   * Get pressed state
   * @public
   * @returns {boolean}
   */
  getPressed() {
    return this.#pressed;
  }

  /**
   * Publish change event to EventBus
   * @private
   */
  #publishChange() {
    const event = new CustomEvent('harmony-toggle-changed', {
      detail: {
        pressed: this.#pressed,
        label: this.getAttribute('label'),
        timestamp: Date.now()
      },
      bubbles: true,
      composed: true
    });

    this.dispatchEvent(event);

    // Publish to EventBus if available
    if (window.EventBus) {
      window.EventBus.publish('harmony-toggle-changed', {
        pressed: this.#pressed,
        label: this.getAttribute('label'),
        componentId: this.id || 'unnamed-toggle',
        timestamp: Date.now()
      });
    }
  }
}

// Register the custom element
if (!customElements.get('harmony-toggle')) {
  customElements.define('harmony-toggle', HarmonyToggle);
}

export default HarmonyToggle;