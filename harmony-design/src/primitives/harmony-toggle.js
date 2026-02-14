/**
 * @fileoverview Harmony Toggle Primitive Component
 * Toggle/switch component that publishes events via EventBus.
 * See DESIGN_SYSTEM.md § Primitives > Toggle for usage.
 */

import eventBus from '../core/event-bus.js';
import { UI_EVENTS } from '../core/event-types.js';

/**
 * Harmony Toggle Web Component
 * @element harmony-toggle
 * 
 * @attr {boolean} checked - Whether toggle is checked
 * @attr {boolean} disabled - Whether toggle is disabled
 * @attr {string} label - Toggle label text
 * 
 * @fires harmony.ui.toggle.changed - When toggle state changes (via EventBus)
 * @fires harmony.ui.toggle.enabled - When toggle is turned on (via EventBus)
 * @fires harmony.ui.toggle.disabled - When toggle is turned off (via EventBus)
 */
class HarmonyToggle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['checked', 'disabled', 'label'];
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    this.detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Get checked state
   * @returns {boolean}
   */
  get checked() {
    return this.hasAttribute('checked');
  }

  /**
   * Set checked state
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
   * Get disabled state
   * @returns {boolean}
   */
  get disabled() {
    return this.hasAttribute('disabled');
  }

  /**
   * Get label text
   * @returns {string}
   */
  get label() {
    return this.getAttribute('label') || '';
  }

  /**
   * Render the component
   */
  render() {
    const checked = this.checked;
    const disabled = this.disabled;
    const label = this.label;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: var(--harmony-spacing-sm, 12px);
        }

        .toggle-container {
          display: inline-flex;
          align-items: center;
          gap: var(--harmony-spacing-sm, 12px);
          cursor: pointer;
        }

        .toggle-container.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-track {
          position: relative;
          width: 48px;
          height: 24px;
          background: var(--harmony-color-surface-variant, #e0e0e0);
          border-radius: 12px;
          transition: background 0.2s ease;
        }

        .toggle-track.checked {
          background: var(--harmony-color-primary, #007bff);
        }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: var(--harmony-color-on-primary, #ffffff);
          border-radius: 50%;
          transition: transform 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-track.checked .toggle-thumb {
          transform: translateX(24px);
        }

        .toggle-track:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px var(--harmony-color-focus-ring, rgba(0, 123, 255, 0.25));
        }

        .toggle-label {
          font-family: var(--harmony-font-family-base, system-ui, sans-serif);
          font-size: var(--harmony-font-size-base, 16px);
          color: var(--harmony-color-on-surface, #000000);
          user-select: none;
        }
      </style>
      <div class="toggle-container ${disabled ? 'disabled' : ''}">
        <div 
          class="toggle-track ${checked ? 'checked' : ''}" 
          role="switch" 
          aria-checked="${checked}"
          aria-label="${label || 'Toggle'}"
          tabindex="${disabled ? '-1' : '0'}"
        >
          <div class="toggle-thumb"></div>
        </div>
        ${label ? `<span class="toggle-label">${label}</span>` : ''}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this._track = this.shadowRoot.querySelector('.toggle-track');
    this._container = this.shadowRoot.querySelector('.toggle-container');
    
    if (this._track && this._container) {
      this._handleClick = this.handleClick.bind(this);
      this._handleKeyDown = this.handleKeyDown.bind(this);
      
      this._container.addEventListener('click', this._handleClick);
      this._track.addEventListener('keydown', this._handleKeyDown);
    }
  }

  /**
   * Detach event listeners
   */
  detachEventListeners() {
    if (this._container) {
      this._container.removeEventListener('click', this._handleClick);
    }
    if (this._track) {
      this._track.removeEventListener('keydown', this._handleKeyDown);
    }
  }

  /**
   * Handle click event
   * @param {Event} event
   */
  handleClick(event) {
    if (this.disabled) {
      return;
    }

    this.toggle();
  }

  /**
   * Handle keyboard event
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (this.disabled) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  }

  /**
   * Toggle the checked state
   */
  toggle() {
    const wasChecked = this.checked;
    this.checked = !wasChecked;
    const isChecked = this.checked;

    // Publish to EventBus
    eventBus.publish(UI_EVENTS.TOGGLE_CHANGED, 'harmony-toggle', {
      checked: isChecked,
      label: this.label,
      elementId: this.id || null,
      previousState: wasChecked
    });

    // Publish specific enable/disable events
    if (isChecked) {
      eventBus.publish(UI_EVENTS.TOGGLE_ENABLED, 'harmony-toggle', {
        label: this.label,
        elementId: this.id || null
      });
    } else {
      eventBus.publish(UI_EVENTS.TOGGLE_DISABLED, 'harmony-toggle', {
        label: this.label,
        elementId: this.id || null
      });
    }

    // Also dispatch CustomEvent for backward compatibility
    this.dispatchEvent(new CustomEvent('harmony-toggle-change', {
      bubbles: true,
      composed: true,
      detail: {
        checked: isChecked,
        label: this.label
      }
    }));
  }
}

customElements.define('harmony-toggle', HarmonyToggle);

export default HarmonyToggle;