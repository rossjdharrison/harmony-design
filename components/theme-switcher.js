/**
 * @fileoverview Theme Switcher Component
 * @module components/theme-switcher
 * 
 * Web component for switching between theme variants including high contrast.
 * Persists user preference to localStorage.
 * 
 * @see {@link ../DESIGN_SYSTEM.md#theme-switcher}
 */

import { 
  applyHighContrastTheme, 
  removeHighContrastTheme,
  prefersHighContrast 
} from '../tokens/high-contrast-theme.js';

/**
 * Theme Switcher Web Component
 * @class ThemeSwitcherComponent
 * @extends HTMLElement
 * 
 * @example
 * <theme-switcher></theme-switcher>
 */
class ThemeSwitcherComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentTheme = 'default';
  }

  connectedCallback() {
    this.render();
    this.loadSavedTheme();
    this.attachEventListeners();
  }

  /**
   * Load saved theme preference from localStorage
   * @private
   */
  loadSavedTheme() {
    const saved = localStorage.getItem('harmony-theme');
    
    if (saved) {
      this.setTheme(saved);
    } else if (prefersHighContrast()) {
      // Auto-apply if system preference detected
      this.setTheme('high-contrast');
    }
  }

  /**
   * Set active theme
   * @param {string} theme - Theme ID ('default' or 'high-contrast')
   */
  setTheme(theme) {
    this._currentTheme = theme;
    
    if (theme === 'high-contrast') {
      applyHighContrastTheme();
    } else {
      removeHighContrastTheme();
    }
    
    // Save preference
    localStorage.setItem('harmony-theme', theme);
    
    // Update UI
    this.updateUI();
    
    // Publish event via EventBus if available
    if (window.EventBus) {
      window.EventBus.publish({
        type: 'theme.changed',
        payload: { theme }
      });
    }
  }

  /**
   * Update component UI to reflect current theme
   * @private
   */
  updateUI() {
    const buttons = this.shadowRoot.querySelectorAll('button');
    buttons.forEach(button => {
      const isActive = button.dataset.theme === this._currentTheme;
      button.setAttribute('aria-pressed', isActive);
      button.classList.toggle('active', isActive);
    });
  }

  /**
   * Attach event listeners to theme buttons
   * @private
   */
  attachEventListeners() {
    const buttons = this.shadowRoot.querySelectorAll('button');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const theme = button.dataset.theme;
        this.setTheme(theme);
      });
    });
  }

  /**
   * Render component UI
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        .theme-switcher {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background-color: var(--bg-secondary, #f5f5f5);
          border-radius: 0.25rem;
          border: 1px solid var(--border-default, #ccc);
        }

        button {
          padding: 0.5rem 1rem;
          background-color: var(--bg-primary, #fff);
          color: var(--fg-primary, #000);
          border: 2px solid var(--border-default, #ccc);
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 200ms ease-in-out;
        }

        button:hover {
          background-color: var(--bg-hover, #e0e0e0);
          border-color: var(--border-hover, #999);
        }

        button:focus {
          outline: 3px solid var(--focus-color, #00f);
          outline-offset: 2px;
        }

        button.active {
          background-color: var(--accent-primary, #007bff);
          color: #fff;
          border-color: var(--accent-primary, #007bff);
          font-weight: 700;
        }

        button.active:hover {
          background-color: var(--accent-dark, #0056b3);
        }

        /* High contrast mode styles */
        [data-theme="high-contrast"] .theme-switcher {
          background-color: var(--hc-bg-secondary);
          border-color: var(--hc-border-default);
        }

        [data-theme="high-contrast"] button {
          background-color: var(--hc-bg-primary);
          color: var(--hc-fg-primary);
          border-color: var(--hc-border-default);
          border-width: var(--hc-border-width-medium);
        }

        [data-theme="high-contrast"] button:hover {
          background-color: var(--hc-interactive-hover);
          border-color: var(--hc-accent-primary);
        }

        [data-theme="high-contrast"] button.active {
          background-color: var(--hc-accent-primary);
          color: var(--hc-bg-primary);
          border-color: var(--hc-accent-primary);
        }

        .icon {
          display: inline-block;
          width: 1em;
          height: 1em;
          margin-right: 0.25em;
          vertical-align: middle;
        }
      </style>

      <div class="theme-switcher" role="group" aria-label="Theme selection">
        <button 
          data-theme="default" 
          aria-pressed="true"
          aria-label="Default theme">
          <span class="icon">☀️</span>
          Default
        </button>
        <button 
          data-theme="high-contrast" 
          aria-pressed="false"
          aria-label="High contrast theme">
          <span class="icon">◐</span>
          High Contrast
        </button>
      </div>
    `;
  }
}

// Register custom element
if (!customElements.get('theme-switcher')) {
  customElements.define('theme-switcher', ThemeSwitcherComponent);
}

export { ThemeSwitcherComponent };