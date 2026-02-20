/**
 * @fileoverview Responsive Token System - Token values that vary by breakpoint automatically
 * @module tokens/responsive-tokens
 * 
 * Provides a system for defining design tokens that automatically adapt to different
 * breakpoints, enabling responsive design at the token level.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#responsive-tokens}
 */

/**
 * Default breakpoints for responsive tokens
 * @const {Object.<string, number>}
 */
export const DEFAULT_BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Responsive token definition
 * @typedef {Object} ResponsiveToken
 * @property {string} name - Token name (e.g., 'spacing-page-margin')
 * @property {Object.<string, string|number>} values - Values per breakpoint
 * @property {string} [unit=''] - CSS unit to append (e.g., 'px', 'rem')
 * @property {string} [fallback] - Fallback value for unsupported browsers
 */

/**
 * Responsive token registry
 * @type {Map<string, ResponsiveToken>}
 */
const tokenRegistry = new Map();

/**
 * Current active breakpoint
 * @type {string}
 */
let currentBreakpoint = 'xs';

/**
 * Breakpoint change listeners
 * @type {Set<Function>}
 */
const breakpointListeners = new Set();

/**
 * Register a responsive token
 * @param {ResponsiveToken} token - Token definition
 * @throws {Error} If token name is invalid or already registered
 */
export function registerResponsiveToken(token) {
  if (!token.name || typeof token.name !== 'string') {
    throw new Error('Token name must be a non-empty string');
  }
  
  if (!token.values || typeof token.values !== 'object') {
    throw new Error('Token values must be an object mapping breakpoints to values');
  }
  
  if (tokenRegistry.has(token.name)) {
    console.warn(`Responsive token "${token.name}" is already registered. Overwriting.`);
  }
  
  tokenRegistry.set(token.name, {
    name: token.name,
    values: token.values,
    unit: token.unit || '',
    fallback: token.fallback,
  });
}

/**
 * Register multiple responsive tokens
 * @param {ResponsiveToken[]} tokens - Array of token definitions
 */
export function registerResponsiveTokens(tokens) {
  if (!Array.isArray(tokens)) {
    throw new Error('Tokens must be an array');
  }
  
  tokens.forEach(token => registerResponsiveToken(token));
}

/**
 * Get token value for current breakpoint
 * @param {string} tokenName - Name of the token
 * @param {string} [breakpoint] - Specific breakpoint (defaults to current)
 * @returns {string|null} Token value with unit, or null if not found
 */
export function getResponsiveTokenValue(tokenName, breakpoint = currentBreakpoint) {
  const token = tokenRegistry.get(tokenName);
  
  if (!token) {
    console.warn(`Responsive token "${tokenName}" not found`);
    return null;
  }
  
  // Get value for exact breakpoint or fall back to nearest smaller breakpoint
  const breakpointKeys = Object.keys(DEFAULT_BREAKPOINTS).sort(
    (a, b) => DEFAULT_BREAKPOINTS[a] - DEFAULT_BREAKPOINTS[b]
  );
  
  const targetIndex = breakpointKeys.indexOf(breakpoint);
  
  for (let i = targetIndex; i >= 0; i--) {
    const bp = breakpointKeys[i];
    if (token.values[bp] !== undefined) {
      return `${token.values[bp]}${token.unit}`;
    }
  }
  
  return token.fallback || null;
}

/**
 * Generate CSS custom properties for all registered tokens
 * @param {string} [breakpoint] - Specific breakpoint (defaults to current)
 * @returns {string} CSS custom properties as a string
 */
export function generateCSSCustomProperties(breakpoint = currentBreakpoint) {
  const properties = [];
  
  tokenRegistry.forEach((token) => {
    const value = getResponsiveTokenValue(token.name, breakpoint);
    if (value !== null) {
      properties.push(`  --${token.name}: ${value};`);
    }
  });
  
  return properties.join('\n');
}

/**
 * Generate complete CSS with media queries for all breakpoints
 * @param {string} [selector=':root'] - CSS selector to apply properties to
 * @returns {string} Complete CSS with media queries
 */
export function generateResponsiveCSS(selector = ':root') {
  const breakpointKeys = Object.keys(DEFAULT_BREAKPOINTS).sort(
    (a, b) => DEFAULT_BREAKPOINTS[a] - DEFAULT_BREAKPOINTS[b]
  );
  
  const cssBlocks = [];
  
  // Base styles (mobile-first)
  cssBlocks.push(`${selector} {\n${generateCSSCustomProperties('xs')}\n}`);
  
  // Media queries for larger breakpoints
  for (let i = 1; i < breakpointKeys.length; i++) {
    const bp = breakpointKeys[i];
    const minWidth = DEFAULT_BREAKPOINTS[bp];
    const properties = generateCSSCustomProperties(bp);
    
    if (properties.trim()) {
      cssBlocks.push(
        `@media (min-width: ${minWidth}px) {\n  ${selector} {\n${properties}\n  }\n}`
      );
    }
  }
  
  return cssBlocks.join('\n\n');
}

/**
 * Detect current breakpoint based on window width
 * @returns {string} Current breakpoint name
 */
export function detectCurrentBreakpoint() {
  if (typeof window === 'undefined') {
    return 'xs';
  }
  
  const width = window.innerWidth;
  const breakpointKeys = Object.keys(DEFAULT_BREAKPOINTS).sort(
    (a, b) => DEFAULT_BREAKPOINTS[b] - DEFAULT_BREAKPOINTS[a]
  );
  
  for (const bp of breakpointKeys) {
    if (width >= DEFAULT_BREAKPOINTS[bp]) {
      return bp;
    }
  }
  
  return 'xs';
}

/**
 * Update current breakpoint and notify listeners
 * @param {string} breakpoint - New breakpoint
 */
function updateCurrentBreakpoint(breakpoint) {
  if (breakpoint !== currentBreakpoint) {
    const previousBreakpoint = currentBreakpoint;
    currentBreakpoint = breakpoint;
    
    breakpointListeners.forEach(listener => {
      try {
        listener(currentBreakpoint, previousBreakpoint);
      } catch (error) {
        console.error('Error in breakpoint listener:', error);
      }
    });
  }
}

/**
 * Subscribe to breakpoint changes
 * @param {Function} listener - Callback function (newBreakpoint, oldBreakpoint) => void
 * @returns {Function} Unsubscribe function
 */
export function onBreakpointChange(listener) {
  if (typeof listener !== 'function') {
    throw new Error('Listener must be a function');
  }
  
  breakpointListeners.add(listener);
  
  return () => {
    breakpointListeners.delete(listener);
  };
}

/**
 * Initialize responsive token system
 * Sets up resize listener and injects CSS
 * @param {Object} [options] - Configuration options
 * @param {string} [options.selector=':root'] - CSS selector for custom properties
 * @param {boolean} [options.autoInject=true] - Automatically inject CSS
 */
export function initResponsiveTokens(options = {}) {
  const { selector = ':root', autoInject = true } = options;
  
  // Detect initial breakpoint
  currentBreakpoint = detectCurrentBreakpoint();
  
  // Set up resize listener with debounce
  if (typeof window !== 'undefined') {
    let resizeTimeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newBreakpoint = detectCurrentBreakpoint();
        updateCurrentBreakpoint(newBreakpoint);
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
  }
  
  // Auto-inject CSS if requested
  if (autoInject && typeof document !== 'undefined') {
    injectResponsiveCSS(selector);
  }
}

/**
 * Inject responsive CSS into the document
 * @param {string} [selector=':root'] - CSS selector for custom properties
 * @returns {HTMLStyleElement} The injected style element
 */
export function injectResponsiveCSS(selector = ':root') {
  if (typeof document === 'undefined') {
    throw new Error('Cannot inject CSS in non-browser environment');
  }
  
  // Remove existing responsive token styles
  const existing = document.getElementById('responsive-tokens-styles');
  if (existing) {
    existing.remove();
  }
  
  const style = document.createElement('style');
  style.id = 'responsive-tokens-styles';
  style.textContent = generateResponsiveCSS(selector);
  
  document.head.appendChild(style);
  
  return style;
}

/**
 * Get all registered token names
 * @returns {string[]} Array of token names
 */
export function getRegisteredTokenNames() {
  return Array.from(tokenRegistry.keys());
}

/**
 * Get token definition
 * @param {string} tokenName - Name of the token
 * @returns {ResponsiveToken|null} Token definition or null if not found
 */
export function getTokenDefinition(tokenName) {
  return tokenRegistry.get(tokenName) || null;
}

/**
 * Clear all registered tokens
 */
export function clearTokenRegistry() {
  tokenRegistry.clear();
}

/**
 * Get current breakpoint
 * @returns {string} Current breakpoint name
 */
export function getCurrentBreakpoint() {
  return currentBreakpoint;
}