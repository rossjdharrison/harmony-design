/**
 * @fileoverview CSS Custom Properties Generator
 * 
 * Converts design tokens into CSS custom properties (CSS variables) for use in
 * stylesheets. This enables theme switching at runtime and provides a bridge
 * between the JavaScript token system and CSS.
 * 
 * See: DESIGN_SYSTEM.md#css-custom-properties
 * 
 * @module harmony-design/core/theme/css-properties
 */

/**
 * Flattens a nested token object into dot-notation keys
 * 
 * @param {Object} obj - Nested token object
 * @param {string} prefix - Current key prefix
 * @returns {Object} Flattened object with dot-notation keys
 * 
 * @example
 * flattenTokens({ color: { primary: '#000' } })
 * // Returns: { 'color.primary': '#000' }
 */
function flattenTokens(obj, prefix = '') {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenTokens(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

/**
 * Converts dot-notation token key to CSS custom property name
 * 
 * @param {string} key - Token key in dot notation
 * @returns {string} CSS custom property name
 * 
 * @example
 * tokenKeyToCSSVar('color.primary.base')
 * // Returns: '--color-primary-base'
 */
function tokenKeyToCSSVar(key) {
  return `--${key.replace(/\./g, '-')}`;
}

/**
 * Generates CSS custom property declarations from design tokens
 * 
 * @param {Object} tokens - Design token object
 * @returns {string} CSS custom property declarations
 * 
 * @example
 * generateCSSProperties({ color: { primary: '#000' } })
 * // Returns: '--color-primary: #000;'
 */
export function generateCSSProperties(tokens) {
  const flattened = flattenTokens(tokens);
  const declarations = [];
  
  for (const [key, value] of Object.entries(flattened)) {
    const cssVar = tokenKeyToCSSVar(key);
    declarations.push(`  ${cssVar}: ${value};`);
  }
  
  return declarations.join('\n');
}

/**
 * Injects CSS custom properties into the document root
 * 
 * @param {Object} tokens - Design token object
 * @param {string} [selector=':root'] - CSS selector for property scope
 * @returns {HTMLStyleElement} The created style element
 * 
 * @example
 * injectCSSProperties(lightTokens, ':root')
 * injectCSSProperties(darkTokens, '[data-theme="dark"]')
 */
export function injectCSSProperties(tokens, selector = ':root') {
  const properties = generateCSSProperties(tokens);
  const css = `${selector} {\n${properties}\n}`;
  
  const styleId = `harmony-theme-${selector.replace(/[^\w-]/g, '')}`;
  let styleElement = document.getElementById(styleId);
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  styleElement.textContent = css;
  return styleElement;
}

/**
 * Gets the current value of a CSS custom property
 * 
 * @param {string} propertyName - CSS custom property name (with or without --)
 * @param {Element} [element=document.documentElement] - Element to query
 * @returns {string} The property value
 * 
 * @example
 * getCSSProperty('--color-primary')
 * getCSSProperty('color.primary') // Auto-converts to --color-primary
 */
export function getCSSProperty(propertyName, element = document.documentElement) {
  const cssVar = propertyName.startsWith('--') 
    ? propertyName 
    : tokenKeyToCSSVar(propertyName);
  
  return getComputedStyle(element).getPropertyValue(cssVar).trim();
}

/**
 * Sets a CSS custom property value
 * 
 * @param {string} propertyName - CSS custom property name
 * @param {string} value - Property value
 * @param {Element} [element=document.documentElement] - Element to update
 * 
 * @example
 * setCSSProperty('--color-primary', '#ff0000')
 * setCSSProperty('color.primary', '#ff0000') // Auto-converts
 */
export function setCSSProperty(propertyName, value, element = document.documentElement) {
  const cssVar = propertyName.startsWith('--') 
    ? propertyName 
    : tokenKeyToCSSVar(propertyName);
  
  element.style.setProperty(cssVar, value);
}

/**
 * Removes CSS custom properties from the document
 * 
 * @param {string} [selector=':root'] - CSS selector that was used for injection
 */
export function removeCSSProperties(selector = ':root') {
  const styleId = `harmony-theme-${selector.replace(/[^\w-]/g, '')}`;
  const styleElement = document.getElementById(styleId);
  
  if (styleElement) {
    styleElement.remove();
  }
}

/**
 * Creates a scoped CSS property map for a component
 * 
 * @param {Object} tokens - Design token object
 * @returns {Map<string, string>} Map of CSS variable names to values
 * 
 * @example
 * const cssVars = createCSSPropertyMap(tokens);
 * cssVars.get('--color-primary') // Returns token value
 */
export function createCSSPropertyMap(tokens) {
  const flattened = flattenTokens(tokens);
  const map = new Map();
  
  for (const [key, value] of Object.entries(flattened)) {
    const cssVar = tokenKeyToCSSVar(key);
    map.set(cssVar, value);
  }
  
  return map;
}