/**
 * @fileoverview Theme Switcher UI Component
 * @module harmony-design/components/theme-switcher
 * 
 * Provides a UI control for switching between light and dark themes.
 * Integrates with ThemeProvider context and publishes theme change events.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#theme-switcher-component}
 */

/**
 * Theme Switcher Web Component
 * 
 * A toggle button that switches between light and dark themes.
 * Uses shadow DOM for encapsulation and publishes events via EventBus.
 * 
 * @example
 * <theme-switcher variant="toggle"></theme-switcher>
 * <theme-switcher variant="dropdown"></theme-switcher>
 * 
 * @fires theme-change-requested - Published when user requests theme change
 */
class ThemeSwitcher extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentTheme = 'light';
    this._variant = 'toggle';
  }

  static get observedAttributes() {
    return ['variant', 'disabled'];
  }

  connectedCallback() {
    this._variant = this.getAttribute('variant') || 'toggle';
    this._render();
    this._attachEventListeners();
    this._subscribeToThemeChanges();
  }

  disconnectedCallback() {
    this._unsubscribeFromThemeChanges();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'variant') {
        this._variant = newValue || 'toggle';
      }
      this._render();
    }
  }

  /**
   * Renders the component based on current variant
   * @private
   */
  _render() {
    const isDisabled = this.hasAttribute('disabled');
    
    if (this._variant === 'dropdown') {
      this._renderDropdown(isDisabled);
    } else {
      this._renderToggle(isDisabled);
    }
  }

  /**
   * Renders toggle button variant
   * @private
   * @param {boolean} isDisabled
   */
  _renderToggle(isDisabled) {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          --toggle-width: 48px;
          --toggle-height: 24px;
          --toggle-padding: 2px;
        }

        .toggle-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm, 8px);
        }

        .toggle-button {
          position: relative;
          width: var(--toggle-width);
          height: var(--toggle-height);
          background: var(--color-surface-secondary, #e5e7eb);
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: calc(var(--toggle-height) / 2);
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          outline: none;
        }

        .toggle-button:hover:not(:disabled) {
          background: var(--color-surface-tertiary, #d1d5db);
        }

        .toggle-button:focus-visible {
          outline: 2px solid var(--color-primary, #3b82f6);
          outline-offset: 2px;
        }

        .toggle-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-slider {
          position: absolute;
          top: var(--toggle-padding);
          left: var(--toggle-padding);
          width: calc(var(--toggle-height) - var(--toggle-padding) * 2);
          height: calc(var(--toggle-height) - var(--toggle-padding) * 2);
          background: var(--color-text-primary, #1f2937);
          border-radius: 50%;
          transition: transform 0.2s ease, background-color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .toggle-button[data-theme="dark"] .toggle-slider {
          transform: translateX(calc(var(--toggle-width) - var(--toggle-height)));
          background: var(--color-text-primary, #f9fafb);
        }

        .icon {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }

        .label {
          font-family: var(--font-family-base, system-ui, sans-serif);
          font-size: var(--font-size-sm, 14px);
          color: var(--color-text-secondary, #6b7280);
          user-select: none;
        }
      </style>

      <div class="toggle-container">
        <button 
          class="toggle-button" 
          type="button"
          role="switch"
          aria-checked="${this._currentTheme === 'dark'}"
          aria-label="Toggle theme"
          data-theme="${this._currentTheme}"
          ${isDisabled ? 'disabled' : ''}
        >
          <span class="toggle-slider">
            ${this._currentTheme === 'dark' ? this._getMoonIcon() : this._getSunIcon()}
          </span>
        </button>
        <span class="label">${this._currentTheme === 'dark' ? 'Dark' : 'Light'}</span>
      </div>
    `;
  }

  /**
   * Renders dropdown variant
   * @private
   * @param {boolean} isDisabled
   */
  _renderDropdown(isDisabled) {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        .dropdown-container {
          position: relative;
          display: inline-block;
        }

        .dropdown-select {
          padding: var(--spacing-xs, 4px) var(--spacing-md, 12px);
          font-family: var(--font-family-base, system-ui, sans-serif);
          font-size: var(--font-size-sm, 14px);
          color: var(--color-text-primary, #1f2937);
          background: var(--color-surface-primary, #ffffff);
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: var(--border-radius-md, 6px);
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .dropdown-select:hover:not(:disabled) {
          border-color: var(--color-border-hover, #9ca3af);
        }

        .dropdown-select:focus {
          border-color: var(--color-primary, #3b82f6);
          box-shadow: 0 0 0 3px var(--color-primary-alpha, rgba(59, 130, 246, 0.1));
        }

        .dropdown-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        option {
          padding: var(--spacing-sm, 8px);
        }
      </style>

      <div class="dropdown-container">
        <select 
          class="dropdown-select" 
          aria-label="Select theme"
          ${isDisabled ? 'disabled' : ''}
        >
          <option value="light" ${this._currentTheme === 'light' ? 'selected' : ''}>☀️ Light</option>
          <option value="dark" ${this._currentTheme === 'dark' ? 'selected' : ''}>🌙 Dark</option>
        </select>
      </div>
    `;
  }

  /**
   * Returns sun icon SVG
   * @private
   * @returns {string}
   */
  _getSunIcon() {
    return `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/>
      </svg>
    `;
  }

  /**
   * Returns moon icon SVG
   * @private
   * @returns {string}
   */
  _getMoonIcon() {
    return `
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    `;
  }

  /**
   * Attaches event listeners to interactive elements
   * @private
   */
  _attachEventListeners() {
    if (this._variant === 'dropdown') {
      const select = this.shadowRoot.querySelector('.dropdown-select');
      select?.addEventListener('change', (e) => this._handleThemeChange(e.target.value));
    } else {
      const button = this.shadowRoot.querySelector('.toggle-button');
      button?.addEventListener('click', () => {
        const newTheme = this._currentTheme === 'light' ? 'dark' : 'light';
        this._handleThemeChange(newTheme);
      });
    }
  }

  /**
   * Handles theme change requests
   * @private
   * @param {string} newTheme
   */
  _handleThemeChange(newTheme) {
    if (this.hasAttribute('disabled')) {
      return;
    }

    this._currentTheme = newTheme;
    this._publishThemeChangeEvent(newTheme);
    this._render();
    this._attachEventListeners();
  }

  /**
   * Publishes theme change event via EventBus
   * @private
   * @param {string} theme
   */
  _publishThemeChangeEvent(theme) {
    const event = new CustomEvent('theme-change-requested', {
      detail: { theme },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);

    // Also publish via EventBus if available
    if (window.EventBus) {
      window.EventBus.publish({
        type: 'ThemeChangeRequested',
        payload: { theme },
        source: 'theme-switcher'
      });
    }
  }

  /**
   * Subscribes to theme change events from ThemeProvider
   * @private
   */
  _subscribeToThemeChanges() {
    if (window.EventBus) {
      this._unsubscribe = window.EventBus.subscribe('ThemeChanged', (event) => {
        if (event.payload?.theme && event.payload.theme !== this._currentTheme) {
          this._currentTheme = event.payload.theme;
          this._render();
          this._attachEventListeners();
        }
      });
    }

    // Also listen for custom events
    this._themeChangeHandler = (e) => {
      if (e.detail?.theme && e.detail.theme !== this._currentTheme) {
        this._currentTheme = e.detail.theme;
        this._render();
        this._attachEventListeners();
      }
    };
    document.addEventListener('theme-changed', this._themeChangeHandler);
  }

  /**
   * Unsubscribes from theme change events
   * @private
   */
  _unsubscribeFromThemeChanges() {
    if (this._unsubscribe) {
      this._unsubscribe();
    }
    if (this._themeChangeHandler) {
      document.removeEventListener('theme-changed', this._themeChangeHandler);
    }
  }

  /**
   * Sets the current theme programmatically
   * @public
   * @param {string} theme - 'light' or 'dark'
   */
  setTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      this._currentTheme = theme;
      this._render();
      this._attachEventListeners();
    }
  }

  /**
   * Gets the current theme
   * @public
   * @returns {string}
   */
  getTheme() {
    return this._currentTheme;
  }
}

customElements.define('theme-switcher', ThemeSwitcher);