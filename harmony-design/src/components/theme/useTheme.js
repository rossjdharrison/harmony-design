/**
 * @fileoverview Hook-like utility for accessing theme context in Web Components
 * Provides a convenient API for components to consume theme context.
 * See harmony-design/DESIGN_SYSTEM.md#using-theme-context for usage.
 * 
 * @performance Target: <0.5ms context access
 */

/**
 * @typedef {Object} ThemeHook
 * @property {'light'|'dark'} mode - Current theme mode
 * @property {Object} tokens - Design tokens for current theme
 * @property {Function} setMode - Function to change theme mode
 * @property {Function} getToken - Function to retrieve specific token
 * @property {Function} cleanup - Function to cleanup subscriptions
 */

/**
 * Connects a Web Component to the nearest ThemeProvider
 * Call this in connectedCallback() and store the returned cleanup function
 * to call in disconnectedCallback()
 * 
 * @param {HTMLElement} component - The component to connect
 * @param {Function} onThemeChange - Callback when theme changes
 * @returns {ThemeHook} Theme context and cleanup function
 * 
 * @example
 * class MyComponent extends HTMLElement {
 *   #themeCleanup = null;
 * 
 *   connectedCallback() {
 *     const theme = useTheme(this, (context) => {
 *       this.style.color = context.tokens.colors.text;
 *     });
 *     this.#themeCleanup = theme.cleanup;
 *   }
 * 
 *   disconnectedCallback() {
 *     this.#themeCleanup?.();
 *   }
 * }
 */
export function useTheme(component, onThemeChange) {
  const provider = findThemeProvider(component);
  
  if (!provider) {
    console.warn('useTheme: No ThemeProvider found in component tree', component);
    return createFallbackTheme();
  }

  // Subscribe to theme changes
  const unsubscribe = provider.subscribe(onThemeChange);
  
  return {
    mode: provider.mode,
    tokens: provider.tokens,
    setMode: (mode) => provider.mode = mode,
    getToken: (path) => provider.getToken(path),
    cleanup: unsubscribe,
  };
}

/**
 * Finds the nearest ThemeProvider ancestor
 * @param {HTMLElement} element
 * @returns {ThemeProvider|null}
 */
function findThemeProvider(element) {
  let current = element.parentElement;
  
  while (current) {
    if (current.tagName === 'HARMONY-THEME-PROVIDER') {
      return current;
    }
    
    // Check in shadow DOM host
    if (current.getRootNode() instanceof ShadowRoot) {
      current = current.getRootNode().host;
    } else {
      current = current.parentElement;
    }
  }
  
  return null;
}

/**
 * Creates a fallback theme when no provider is found
 * @returns {ThemeHook}
 */
function createFallbackTheme() {
  const fallbackTokens = {
    colors: {
      primary: '#0066cc',
      secondary: '#6c757d',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#212529',
      textSecondary: '#6c757d',
      border: '#dee2e6',
      error: '#dc3545',
      success: '#28a745',
      warning: '#ffc107',
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
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
    },
  };

  return {
    mode: 'light',
    tokens: fallbackTokens,
    setMode: () => console.warn('useTheme: Cannot set mode without ThemeProvider'),
    getToken: (path) => path.split('.').reduce((obj, key) => obj?.[key], fallbackTokens),
    cleanup: () => {},
  };
}