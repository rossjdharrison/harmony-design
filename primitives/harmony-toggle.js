/**
 * @fileoverview Harmony Toggle Primitive Component
 * Publishes events to EventBus following the event-driven architecture pattern.
 * See DESIGN_SYSTEM.md#event-bus-integration for details.
 * 
 * @performance Target: <1ms event dispatch
 * @memory Minimal footprint, stores only checked state
 */

/**
 * Harmony Toggle Web Component
 * Emits toggle events to EventBus for system-wide event handling
 * 
 * @element harmony-toggle
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disabled state
 * @attr {string} size - Size variant (small, medium, large)
 * 
 * @fires {CustomEvent} harmony-toggle-change - Local DOM event (for backward compatibility)
 * @publishes ToggleChanged - EventBus command event
 */
class HarmonyToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._boundHandleChange = this._handleChange.bind(this);
  }

  static get observedAttributes() {
    return ['checked', 'disabled', 'size'];
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Gets the checked state
   * @returns {boolean}
   */
  get checked() {
    return this.hasAttribute('checked');
  }

  /**
   * Sets the checked state
   * @param {boolean} value
   */
  set checked(value) {
    if (value) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  /**
   * Renders the toggle component with shadow DOM
   * @private
   */
  render() {
    const size = this.getAttribute('size') || 'medium';
    const disabled = this.hasAttribute('disabled');
    const checked = this.hasAttribute('checked');

    // Size configurations
    const sizes = {
      small: { width: 32, height: 18, knobSize: 14 },
      medium: { width: 44, height: 24, knobSize: 20 },
      large: { width: 56, height: 30, knobSize: 26 }
    };

    const config = sizes[size] || sizes.medium;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        .toggle-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .toggle-track {
          position: relative;
          width: ${config.width}px;
          height: ${config.height}px;
          background-color: #ccc;
          border-radius: ${config.height / 2}px;
          cursor: pointer;
          transition: background-color 200ms ease;
          flex-shrink: 0;
        }

        .toggle-track.checked {
          background-color: #0066cc;
        }

        .toggle-track.disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .toggle-track:focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        .toggle-knob {
          position: absolute;
          top: ${(config.height - config.knobSize) / 2}px;
          left: ${(config.height - config.knobSize) / 2}px;
          width: ${config.knobSize}px;
          height: ${config.knobSize}px;
          background-color: white;
          border-radius: 50%;
          transition: transform 200ms ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-track.checked .toggle-knob {
          transform: translateX(${config.width - config.height}px);
        }

        .toggle-label {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          color: #333;
          user-select: none;
        }
      </style>
      <div class="toggle-wrapper">
        <div 
          class="toggle-track ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}"
          role="switch"
          aria-checked="${checked}"
          aria-disabled="${disabled}"
          tabindex="${disabled ? '-1' : '0'}"
          part="track"
        >
          <div class="toggle-knob" part="knob"></div>
        </div>
        <span class="toggle-label" part="label">
          <slot></slot>
        </span>
      </div>
    `;
  }

  /**
   * Attaches event listeners to the toggle
   * @private
   */
  _attachEventListeners() {
    const track = this.shadowRoot.querySelector('.toggle-track');
    if (track) {
      track.addEventListener('click', this._boundHandleChange);
      track.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this._boundHandleChange(e);
        }
      });
    }
  }

  /**
   * Detaches event listeners from the toggle
   * @private
   */
  _detachEventListeners() {
    const track = this.shadowRoot.querySelector('.toggle-track');
    if (track) {
      track.removeEventListener('click', this._boundHandleChange);
    }
  }

  /**
   * Handles toggle change events
   * Publishes to EventBus and emits CustomEvent for backward compatibility
   * @private
   * @param {Event} event - The change event
   */
  _handleChange(event) {
    if (this.hasAttribute('disabled')) {
      return;
    }

    const previousState = this.checked;
    this.checked = !previousState;

    const eventData = {
      componentId: this.id || 'anonymous-toggle',
      checked: this.checked,
      previousState: previousState,
      timestamp: Date.now(),
      metadata: {
        size: this.getAttribute('size') || 'medium',
        label: this.textContent.trim()
      }
    };

    // Publish to EventBus (primary integration point)
    try {
      if (window.EventBus) {
        window.EventBus.publish('ToggleChanged', eventData);
      } else {
        console.warn('EventBus not available. Toggle event not published to bus.', eventData);
      }
    } catch (error) {
      console.error('EventBus publish failed for ToggleChanged:', error, eventData);
    }

    // Emit CustomEvent for backward compatibility and local handling
    this.dispatchEvent(new CustomEvent('harmony-toggle-change', {
      detail: eventData,
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('harmony-toggle', HarmonyToggle);