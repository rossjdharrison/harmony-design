/**
 * @fileoverview Token Hook - Runtime token access with theme awareness
 * @module core/token-hook
 * 
 * Provides useToken() hook for accessing design tokens with:
 * - Theme awareness (light/dark/high-contrast)
 * - Reactive updates when theme changes
 * - CSS custom property integration
 * - Type-safe token access
 * - Performance-optimized caching
 * 
 * Related: DESIGN_SYSTEM.md § Token System, § Theme System
 */

import { EventBus } from './event-bus.js';

/**
 * Token cache for performance optimization
 * @type {Map<string, Map<string, string>>}
 */
const tokenCache = new Map();

/**
 * Active theme tracking
 * @type {string}
 */
let currentTheme = 'light';

/**
 * Token subscribers for reactive updates
 * @type {Map<string, Set<Function>>}
 */
const tokenSubscribers = new Map();

/**
 * Initialize token system and listen for theme changes
 */
function initializeTokenSystem() {
  // Listen for theme change events
  EventBus.subscribe('ThemeChanged', (event) => {
    const oldTheme = currentTheme;
    currentTheme = event.payload.theme;
    
    // Clear cache for old theme
    tokenCache.delete(oldTheme);
    
    // Notify all subscribers
    tokenSubscribers.forEach((subscribers, tokenPath) => {
      const newValue = getTokenValue(tokenPath);
      subscribers.forEach(callback => callback(newValue));
    });
  });

  // Detect initial theme from document
  const html = document.documentElement;
  if (html.hasAttribute('data-theme')) {
    currentTheme = html.getAttribute('data-theme');
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    currentTheme = 'dark';
  }

  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!html.hasAttribute('data-theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        if (newTheme !== currentTheme) {
          EventBus.publish({
            type: 'ThemeChanged',
            source: 'system',
            payload: { theme: newTheme, previous: currentTheme }
          });
        }
      }
    });
  }
}

/**
 * Get computed CSS custom property value
 * @param {string} propertyName - CSS custom property name (with or without --)
 * @returns {string} Computed value
 */
function getCSSCustomProperty(propertyName) {
  const name = propertyName.startsWith('--') ? propertyName : `--${propertyName}`;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Parse token path to CSS custom property name
 * @param {string} tokenPath - Token path (e.g., 'color.primary.500' or 'spacing.md')
 * @returns {string} CSS custom property name
 */
function tokenPathToCSSVar(tokenPath) {
  // Convert dot notation to kebab-case
  // color.primary.500 -> --color-primary-500
  return `--${tokenPath.replace(/\./g, '-')}`;
}

/**
 * Get token value from cache or compute it
 * @param {string} tokenPath - Token path
 * @returns {string} Token value
 */
function getTokenValue(tokenPath) {
  // Check cache first
  let themeCache = tokenCache.get(currentTheme);
  if (!themeCache) {
    themeCache = new Map();
    tokenCache.set(currentTheme, themeCache);
  }

  if (themeCache.has(tokenPath)) {
    return themeCache.get(tokenPath);
  }

  // Compute value from CSS custom property
  const cssVar = tokenPathToCSSVar(tokenPath);
  const value = getCSSCustomProperty(cssVar);

  // Cache the value
  themeCache.set(tokenPath, value);

  return value;
}

/**
 * Token hook for reactive token access
 * 
 * @param {string} tokenPath - Token path (e.g., 'color.primary.500', 'spacing.md')
 * @param {Object} options - Hook options
 * @param {Function} [options.onChange] - Callback when token value changes
 * @param {boolean} [options.reactive=true] - Enable reactive updates
 * @returns {Object} Token accessor object
 * 
 * @example
 * // Basic usage
 * const primaryColor = useToken('color.primary.500');
 * console.log(primaryColor.value); // '#0066cc'
 * 
 * @example
 * // Reactive usage in Web Component
 * class MyComponent extends HTMLElement {
 *   connectedCallback() {
 *     this.token = useToken('color.primary.500', {
 *       onChange: (newValue) => {
 *         this.style.backgroundColor = newValue;
 *       }
 *     });
 *   }
 * 
 *   disconnectedCallback() {
 *     this.token.unsubscribe();
 *   }
 * }
 * 
 * @example
 * // Multiple tokens
 * const tokens = useToken(['color.primary.500', 'spacing.md']);
 * console.log(tokens.values); // ['#0066cc', '16px']
 */
export function useToken(tokenPath, options = {}) {
  const { onChange, reactive = true } = options;

  // Handle array of token paths
  if (Array.isArray(tokenPath)) {
    const tokens = tokenPath.map(path => useToken(path, { reactive: false }));
    
    const result = {
      values: tokens.map(t => t.value),
      get(index) {
        return tokens[index]?.value;
      },
      unsubscribe() {
        tokens.forEach(t => t.unsubscribe());
      }
    };

    // Set up reactive updates for all tokens
    if (reactive && onChange) {
      tokens.forEach((token, index) => {
        const subscribers = tokenSubscribers.get(tokenPath[index]) || new Set();
        subscribers.add(() => {
          result.values = tokens.map(t => t.value);
          onChange(result.values);
        });
        tokenSubscribers.set(tokenPath[index], subscribers);
      });
    }

    return result;
  }

  // Single token path
  const value = getTokenValue(tokenPath);
  
  const result = {
    value,
    path: tokenPath,
    theme: currentTheme,
    cssVar: tokenPathToCSSVar(tokenPath),
    
    /**
     * Get raw CSS custom property name
     * @returns {string}
     */
    toCSSVar() {
      return this.cssVar;
    },
    
    /**
     * Get value as CSS var() reference
     * @returns {string}
     */
    toVarReference() {
      return `var(${this.cssVar})`;
    },
    
    /**
     * Unsubscribe from reactive updates
     */
    unsubscribe() {
      if (onChange) {
        const subscribers = tokenSubscribers.get(tokenPath);
        if (subscribers) {
          subscribers.delete(onChange);
          if (subscribers.size === 0) {
            tokenSubscribers.delete(tokenPath);
          }
        }
      }
    }
  };

  // Set up reactive updates
  if (reactive && onChange) {
    const subscribers = tokenSubscribers.get(tokenPath) || new Set();
    subscribers.add(onChange);
    tokenSubscribers.set(tokenPath, subscribers);
  }

  return result;
}

/**
 * Get multiple tokens at once (non-reactive)
 * @param {string[]} tokenPaths - Array of token paths
 * @returns {Object<string, string>} Map of token paths to values
 * 
 * @example
 * const tokens = getTokens(['color.primary.500', 'spacing.md']);
 * // { 'color.primary.500': '#0066cc', 'spacing.md': '16px' }
 */
export function getTokens(tokenPaths) {
  const result = {};
  tokenPaths.forEach(path => {
    result[path] = getTokenValue(path);
  });
  return result;
}

/**
 * Get current theme name
 * @returns {string} Current theme name
 */
export function getCurrentTheme() {
  return currentTheme;
}

/**
 * Clear token cache (useful for testing or force refresh)
 * @param {string} [theme] - Specific theme to clear, or all if not specified
 */
export function clearTokenCache(theme) {
  if (theme) {
    tokenCache.delete(theme);
  } else {
    tokenCache.clear();
  }
}

/**
 * Get all cached token values for current theme
 * @returns {Object<string, string>} All cached tokens
 */
export function getCachedTokens() {
  const themeCache = tokenCache.get(currentTheme);
  if (!themeCache) {
    return {};
  }
  return Object.fromEntries(themeCache);
}

/**
 * Prefetch tokens to warm the cache
 * @param {string[]} tokenPaths - Array of token paths to prefetch
 */
export function prefetchTokens(tokenPaths) {
  tokenPaths.forEach(path => getTokenValue(path));
}

// Initialize on module load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTokenSystem);
  } else {
    initializeTokenSystem();
  }
}

// Export for testing
export const __testing__ = {
  tokenCache,
  tokenSubscribers,
  setCurrentTheme: (theme) => { currentTheme = theme; },
  initializeTokenSystem
};