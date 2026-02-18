/**
 * @fileoverview ThemeProvider Web Component with Context API
 * Manages theme state and provides it to child components via context.
 * See harmony-design/DESIGN_SYSTEM.md#theme-provider for usage.
 * 
 * @performance Target: <1ms context updates, <16ms theme switches
 * @memory Minimal overhead, shared token references
 */

/**
 * @typedef {Object} ThemeContext
 * @property {'light'|'dark'} mode - Current theme mode
 * @property {Object} tokens - Design tokens for current theme
 * @property {Function} setMode - Function to change theme mode
 * @property {Function} getToken - Function to retrieve specific token
 */

/**
 * ThemeProvider Web Component
 * Provides theme context to all descendant components via custom events and attributes.
 * 
 * @example
 * <harmony-theme-provider mode="light">
 *   <your-component></your-component>
 * </harmony-theme-provider>
 * 
 * @fires theme-changed - Dispatched when theme mode changes
 * @fires theme-ready - Dispatched when theme is initialized
 */
class ThemeProvider extends HTMLElement {
  /**
   * @private
   * @type {string}
   */
  #mode = 'light';

  /**
   * @private
   * @type {Object}
   */
  #tokens = {};

  /**
   * @private
   * @type {Set<Function>}
   */
  #subscribers = new Set();

  /**
   * @private
   * @type {MutationObserver}
   */
  #observer = null;

  static get observedAttributes() {
    return ['mode', 'persist'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Load persisted theme preference if available
    this.#loadPersistedTheme();
    
    // Initialize tokens
    this.#loadTokens();
  }

  connectedCallback() {
    this.#render();
    this.#setupSystemThemeListener();
    this.#observeDescendants();
    
    // Notify children that theme is ready
    this.#notifyThemeReady();
    
    // Apply theme to document root
    this.#applyThemeToRoot();
  }

  disconnectedCallback() {
    if (this.#observer) {
      this.#observer.disconnect();
    }
    this.#subscribers.clear();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'mode' && oldValue !== newValue) {
      this.#setMode(newValue);
    }
  }

  /**
   * Gets the current theme mode
   * @returns {'light'|'dark'}
   */
  get mode() {
    return this.#mode;
  }

  /**
   * Sets the theme mode
   * @param {'light'|'dark'} value
   */
  set mode(value) {
    if (value === 'light' || value === 'dark') {
      this.setAttribute('mode', value);
    }
  }

  /**
   * Gets the current theme tokens
   * @returns {Object}
   */
  get tokens() {
    return { ...this.#tokens };
  }

  /**
   * Retrieves a specific token value by path
   * @param {string} path - Dot-notation path (e.g., 'colors.primary')
   * @returns {*} Token value or undefined
   */
  getToken(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.#tokens);
  }

  /**
   * Subscribes to theme changes
   * @param {Function} callback - Called with ThemeContext when theme changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.#subscribers.add(callback);
    
    // Immediately notify with current context
    callback(this.#getContext());
    
    return () => {
      this.#subscribers.delete(callback);
    };
  }

  /**
   * @private
   * Loads persisted theme from localStorage
   */
  #loadPersistedTheme() {
    if (!this.hasAttribute('persist')) return;
    
    try {
      const stored = localStorage.getItem('harmony-theme-mode');
      if (stored === 'light' || stored === 'dark') {
        this.#mode = stored;
      }
    } catch (e) {
      console.warn('ThemeProvider: Could not load persisted theme', e);
    }
  }

  /**
   * @private
   * Persists theme to localStorage
   */
  #persistTheme() {
    if (!this.hasAttribute('persist')) return;
    
    try {
      localStorage.setItem('harmony-theme-mode', this.#mode);
    } catch (e) {
      console.warn('ThemeProvider: Could not persist theme', e);
    }
  }

  /**
   * @private
   * Loads design tokens for current mode
   */
  #loadTokens() {
    // Default tokens structure
    // In production, these would be loaded from the design token system
    this.#tokens = {
      colors: {
        primary: this.#mode === 'light' ? '#0066cc' : '#4da6ff',
        secondary: this.#mode === 'light' ? '#6c757d' : '#adb5bd',
        background: this.#mode === 'light' ? '#ffffff' : '#1a1a1a',
        surface: this.#mode === 'light' ? '#f8f9fa' : '#2d2d2d',
        text: this.#mode === 'light' ? '#212529' : '#f8f9fa',
        textSecondary: this.#mode === 'light' ? '#6c757d' : '#adb5bd',
        border: this.#mode === 'light' ? '#dee2e6' : '#495057',
        error: this.#mode === 'light' ? '#dc3545' : '#ff6b6b',
        success: this.#mode === 'light' ? '#28a745' : '#51cf66',
        warning: this.#mode === 'light' ? '#ffc107' : '#ffd43b',
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          md: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          bold: '700',
        },
      },
      shadows: {
        sm: this.#mode === 'light' 
          ? '0 1px 2px rgba(0,0,0,0.05)' 
          : '0 1px 2px rgba(0,0,0,0.3)',
        md: this.#mode === 'light'
          ? '0 4px 6px rgba(0,0,0,0.1)'
          : '0 4px 6px rgba(0,0,0,0.4)',
        lg: this.#mode === 'light'
          ? '0 10px 15px rgba(0,0,0,0.1)'
          : '0 10px 15px rgba(0,0,0,0.5)',
      },
    };
  }

  /**
   * @private
   * Sets the theme mode and updates tokens
   * @param {'light'|'dark'} newMode
   */
  #setMode(newMode) {
    if (newMode !== 'light' && newMode !== 'dark') {
      console.error('ThemeProvider: Invalid mode', newMode);
      return;
    }

    const oldMode = this.#mode;
    if (oldMode === newMode) return;

    const startTime = performance.now();
    
    this.#mode = newMode;
    this.#loadTokens();
    this.#persistTheme();
    this.#applyThemeToRoot();
    this.#notifySubscribers();
    
    const duration = performance.now() - startTime;
    if (duration > 16) {
      console.warn(`ThemeProvider: Theme switch took ${duration.toFixed(2)}ms (target: <16ms)`);
    }

    this.dispatchEvent(new CustomEvent('theme-changed', {
      detail: {
        mode: this.#mode,
        tokens: this.tokens,
        previousMode: oldMode,
      },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * @private
   * Gets the current theme context
   * @returns {ThemeContext}
   */
  #getContext() {
    return {
      mode: this.#mode,
      tokens: this.tokens,
      setMode: (mode) => this.#setMode(mode),
      getToken: (path) => this.getToken(path),
    };
  }

  /**
   * @private
   * Notifies all subscribers of theme changes
   */
  #notifySubscribers() {
    const context = this.#getContext();
    this.#subscribers.forEach(callback => {
      try {
        callback(context);
      } catch (e) {
        console.error('ThemeProvider: Subscriber callback error', e);
      }
    });
  }

  /**
   * @private
   * Notifies that theme is ready
   */
  #notifyThemeReady() {
    this.dispatchEvent(new CustomEvent('theme-ready', {
      detail: this.#getContext(),
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * @private
   * Applies theme CSS custom properties to document root
   */
  #applyThemeToRoot() {
    const root = document.documentElement;
    
    // Set theme mode attribute
    root.setAttribute('data-theme', this.#mode);
    
    // Apply color tokens as CSS custom properties
    Object.entries(this.#tokens.colors).forEach(([key, value]) => {
      root.style.setProperty(`--harmony-color-${key}`, value);
    });
    
    // Apply spacing tokens
    Object.entries(this.#tokens.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--harmony-spacing-${key}`, value);
    });
    
    // Apply typography tokens
    root.style.setProperty('--harmony-font-family', this.#tokens.typography.fontFamily);
    Object.entries(this.#tokens.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--harmony-font-size-${key}`, value);
    });
    Object.entries(this.#tokens.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--harmony-font-weight-${key}`, value);
    });
    
    // Apply shadow tokens
    Object.entries(this.#tokens.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--harmony-shadow-${key}`, value);
    });
  }

  /**
   * @private
   * Sets up system theme preference listener
   */
  #setupSystemThemeListener() {
    if (!this.hasAttribute('system')) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!this.hasAttribute('mode')) {
        this.#setMode(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handler);
    
    // Initial check
    if (!this.hasAttribute('mode')) {
      this.#setMode(mediaQuery.matches ? 'dark' : 'light');
    }
  }

  /**
   * @private
   * Observes descendant elements for theme context requests
   */
  #observeDescendants() {
    this.#observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.#notifyElement(node);
          }
        });
      });
    });

    this.#observer.observe(this, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * @private
   * Notifies an element of the theme context
   * @param {Element} element
   */
  #notifyElement(element) {
    if (typeof element.onThemeChange === 'function') {
      element.onThemeChange(this.#getContext());
    }
  }

  /**
   * @private
   * Renders the component
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

// Register the custom element
if (!customElements.get('harmony-theme-provider')) {
  customElements.define('harmony-theme-provider', ThemeProvider);
}

export { ThemeProvider };