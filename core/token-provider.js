/**
 * @fileoverview Token Context Provider - Manages theme state and token resolution
 * @module core/token-provider
 * 
 * Provides centralized token management with:
 * - Theme state management (light/dark/custom)
 * - Token resolution with fallbacks
 * - Context propagation to child components
 * - Theme switching and persistence
 * 
 * @see DESIGN_SYSTEM.md#token-context-provider
 */

import { EventBus } from './event-bus.js';
import { getToken } from '../tokens/token-accessor.js';

/**
 * @typedef {Object} TokenContext
 * @property {string} theme - Current theme name ('light' | 'dark' | custom)
 * @property {Function} getToken - Token resolution function
 * @property {Function} setTheme - Theme setter function
 * @property {Map<string, any>} overrides - Token overrides
 */

/**
 * TokenProvider Web Component
 * Provides token context to all descendant components
 * 
 * @example
 * <harmony-token-provider theme="dark">
 *   <my-component></my-component>
 * </harmony-token-provider>
 * 
 * @fires theme-changed - When theme is switched
 * @fires tokens-updated - When token overrides are applied
 */
class TokenProvider extends HTMLElement {
  /**
   * @private
   * @type {TokenContext}
   */
  #context;

  /**
   * @private
   * @type {Map<string, any>}
   */
  #overrides;

  /**
   * @private
   * @type {string}
   */
  #currentTheme;

  /**
   * @private
   * @type {EventBus}
   */
  #eventBus;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this.#overrides = new Map();
    this.#currentTheme = 'light';
    this.#eventBus = EventBus.getInstance();
    
    this.#context = {
      theme: this.#currentTheme,
      getToken: this.#resolveToken.bind(this),
      setTheme: this.#setTheme.bind(this),
      overrides: this.#overrides
    };
  }

  static get observedAttributes() {
    return ['theme', 'persist'];
  }

  connectedCallback() {
    this.#render();
    this.#loadPersistedTheme();
    this.#setupEventListeners();
    this.#provideContext();
    
    // Emit initial context availability
    this.#eventBus.publish({
      type: 'token-context-ready',
      source: 'TokenProvider',
      payload: {
        theme: this.#currentTheme,
        timestamp: Date.now()
      }
    });
  }

  disconnectedCallback() {
    this.#cleanupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'theme':
        if (newValue) {
          this.#setTheme(newValue);
        }
        break;
      case 'persist':
        if (newValue !== null && this.#currentTheme) {
          this.#persistTheme(this.#currentTheme);
        }
        break;
    }
  }

  /**
   * Resolve a token value with fallback chain
   * @private
   * @param {string} tokenPath - Token path (e.g., 'color.primary.500')
   * @param {any} [fallback] - Fallback value if token not found
   * @returns {any} Resolved token value
   */
  #resolveToken(tokenPath, fallback) {
    // Check overrides first
    if (this.#overrides.has(tokenPath)) {
      return this.#overrides.get(tokenPath);
    }

    // Resolve from token system with theme context
    const themedPath = `${this.#currentTheme}.${tokenPath}`;
    let value = getToken(themedPath);
    
    // If themed token not found, try base token
    if (value === undefined) {
      value = getToken(tokenPath);
    }

    // Return fallback if still undefined
    return value !== undefined ? value : fallback;
  }

  /**
   * Set the current theme
   * @private
   * @param {string} themeName - Theme name to activate
   */
  #setTheme(themeName) {
    const oldTheme = this.#currentTheme;
    this.#currentTheme = themeName;
    this.#context.theme = themeName;

    // Update CSS custom properties on host
    this.#applyThemeProperties();

    // Persist if enabled
    if (this.hasAttribute('persist')) {
      this.#persistTheme(themeName);
    }

    // Notify descendants
    this.dispatchEvent(new CustomEvent('theme-changed', {
      detail: {
        oldTheme,
        newTheme: themeName,
        timestamp: Date.now()
      },
      bubbles: true,
      composed: true
    }));

    // Publish to EventBus
    this.#eventBus.publish({
      type: 'theme-changed',
      source: 'TokenProvider',
      payload: {
        oldTheme,
        newTheme: themeName,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Apply theme as CSS custom properties
   * @private
   */
  #applyThemeProperties() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --current-theme: ${this.#currentTheme};
        display: contents;
      }
    `;
    
    // Clear existing theme styles
    const oldStyle = this.shadowRoot.querySelector('style.theme-properties');
    if (oldStyle) {
      oldStyle.remove();
    }
    
    style.classList.add('theme-properties');
    this.shadowRoot.appendChild(style);
  }

  /**
   * Set token override
   * @param {string} tokenPath - Token path to override
   * @param {any} value - Override value
   */
  setTokenOverride(tokenPath, value) {
    this.#overrides.set(tokenPath, value);
    
    this.dispatchEvent(new CustomEvent('tokens-updated', {
      detail: {
        tokenPath,
        value,
        timestamp: Date.now()
      },
      bubbles: true,
      composed: true
    }));

    this.#eventBus.publish({
      type: 'token-override-set',
      source: 'TokenProvider',
      payload: {
        tokenPath,
        value,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Clear token override
   * @param {string} tokenPath - Token path to clear
   */
  clearTokenOverride(tokenPath) {
    const existed = this.#overrides.delete(tokenPath);
    
    if (existed) {
      this.dispatchEvent(new CustomEvent('tokens-updated', {
        detail: {
          tokenPath,
          cleared: true,
          timestamp: Date.now()
        },
        bubbles: true,
        composed: true
      }));

      this.#eventBus.publish({
        type: 'token-override-cleared',
        source: 'TokenProvider',
        payload: {
          tokenPath,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Clear all token overrides
   */
  clearAllOverrides() {
    this.#overrides.clear();
    
    this.dispatchEvent(new CustomEvent('tokens-updated', {
      detail: {
        allCleared: true,
        timestamp: Date.now()
      },
      bubbles: true,
      composed: true
    }));

    this.#eventBus.publish({
      type: 'all-token-overrides-cleared',
      source: 'TokenProvider',
      payload: {
        timestamp: Date.now()
      }
    });
  }

  /**
   * Get current token context
   * @returns {TokenContext} Current context
   */
  getContext() {
    return this.#context;
  }

  /**
   * Provide context to child components via custom property
   * @private
   */
  #provideContext() {
    // Store context on element for child access
    this.__tokenContext = this.#context;
  }

  /**
   * Load persisted theme from localStorage
   * @private
   */
  #loadPersistedTheme() {
    if (!this.hasAttribute('persist')) return;

    try {
      const stored = localStorage.getItem('harmony-theme');
      if (stored) {
        this.#setTheme(stored);
      }
    } catch (error) {
      console.warn('[TokenProvider] Failed to load persisted theme:', error);
    }
  }

  /**
   * Persist theme to localStorage
   * @private
   * @param {string} themeName - Theme to persist
   */
  #persistTheme(themeName) {
    try {
      localStorage.setItem('harmony-theme', themeName);
    } catch (error) {
      console.warn('[TokenProvider] Failed to persist theme:', error);
    }
  }

  /**
   * Setup EventBus listeners
   * @private
   */
  #setupEventListeners() {
    this.#eventBus.subscribe('set-theme', (event) => {
      if (event.payload?.theme) {
        this.#setTheme(event.payload.theme);
      }
    });

    this.#eventBus.subscribe('set-token-override', (event) => {
      const { tokenPath, value } = event.payload || {};
      if (tokenPath !== undefined) {
        this.setTokenOverride(tokenPath, value);
      }
    });

    this.#eventBus.subscribe('clear-token-override', (event) => {
      const { tokenPath } = event.payload || {};
      if (tokenPath) {
        this.clearTokenOverride(tokenPath);
      }
    });
  }

  /**
   * Cleanup EventBus listeners
   * @private
   */
  #cleanupEventListeners() {
    // EventBus handles cleanup automatically on component destruction
  }

  /**
   * Render component template
   * @private
   */
  #render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }
}

/**
 * Find nearest TokenProvider ancestor
 * @param {HTMLElement} element - Starting element
 * @returns {TokenProvider|null} Nearest provider or null
 */
export function findTokenProvider(element) {
  let current = element;
  
  while (current) {
    if (current.__tokenContext) {
      return current;
    }
    current = current.parentElement || current.getRootNode()?.host;
  }
  
  return null;
}

/**
 * Get token context from nearest provider
 * @param {HTMLElement} element - Starting element
 * @returns {TokenContext|null} Token context or null
 */
export function getTokenContext(element) {
  const provider = findTokenProvider(element);
  return provider?.__tokenContext || null;
}

// Register custom element
customElements.define('harmony-token-provider', TokenProvider);

export { TokenProvider };