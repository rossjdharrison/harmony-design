/**
 * @fileoverview Safe Renderer - Render user content with automatic escaping
 * @module utils/safe-renderer
 * 
 * Provides safe rendering utilities that automatically escape user-generated content
 * to prevent XSS attacks. Works in conjunction with xss-filter.js for comprehensive
 * protection.
 * 
 * Related: DESIGN_SYSTEM.md § Security > Safe Rendering
 * Related: utils/xss-filter.js
 */

import { filterDangerousHTML } from './xss-filter.js';

/**
 * HTML entity map for escaping
 * @const {Object<string, string>}
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escapes HTML entities in a string to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML rendering
 * @example
 * escapeHTML('<script>alert("xss")</script>') // '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHTML(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text.replace(/[&<>"'\/]/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Escapes HTML attributes to prevent attribute-based XSS
 * @param {string} value - Attribute value to escape
 * @returns {string} Escaped attribute value
 * @example
 * escapeAttribute('onclick="alert(1)"') // Safe escaped version
 */
export function escapeAttribute(value) {
  if (typeof value !== 'string') {
    return '';
  }
  
  // More aggressive escaping for attributes
  return value
    .replace(/[&<>"'\/=`]/g, (char) => {
      const code = char.charCodeAt(0);
      return `&#x${code.toString(16)};`;
    });
}

/**
 * Escapes JavaScript strings to prevent script injection
 * @param {string} text - Text to escape for JS context
 * @returns {string} Escaped text safe for JS strings
 * @example
 * escapeJS('"; alert(1); "') // Safe escaped version
 */
export function escapeJS(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\//g, '\\/')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E');
}

/**
 * Escapes CSS values to prevent CSS injection
 * @param {string} value - CSS value to escape
 * @returns {string} Escaped CSS value
 * @example
 * escapeCSS('red; background: url(javascript:alert(1))') // Safe escaped version
 */
export function escapeCSS(value) {
  if (typeof value !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous CSS constructs
  return value
    .replace(/[<>"'`]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/expression\(/gi, '')
    .replace(/import/gi, '')
    .replace(/@import/gi, '')
    .replace(/url\(/gi, '');
}

/**
 * Rendering context types
 * @enum {string}
 */
export const RenderContext = {
  HTML: 'html',
  ATTRIBUTE: 'attribute',
  JS: 'js',
  CSS: 'css',
  URL: 'url',
};

/**
 * Renders user content safely based on context
 * @param {string} content - User-generated content to render
 * @param {RenderContext} context - Rendering context
 * @returns {string} Safely escaped content
 * @example
 * renderSafe('<b>Hello</b>', RenderContext.HTML) // '&lt;b&gt;Hello&lt;/b&gt;'
 */
export function renderSafe(content, context = RenderContext.HTML) {
  if (typeof content !== 'string') {
    return '';
  }
  
  switch (context) {
    case RenderContext.HTML:
      return escapeHTML(content);
    case RenderContext.ATTRIBUTE:
      return escapeAttribute(content);
    case RenderContext.JS:
      return escapeJS(content);
    case RenderContext.CSS:
      return escapeCSS(content);
    case RenderContext.URL:
      return encodeURIComponent(content);
    default:
      return escapeHTML(content);
  }
}

/**
 * Renders rich HTML content with sanitization (allows safe subset of HTML)
 * Uses xss-filter.js for comprehensive filtering
 * @param {string} html - HTML content to render
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized HTML safe for rendering
 * @example
 * renderRichHTML('<p>Hello <script>alert(1)</script></p>') // '<p>Hello </p>'
 */
export function renderRichHTML(html, options = {}) {
  if (typeof html !== 'string') {
    return '';
  }
  
  return filterDangerousHTML(html, options);
}

/**
 * Safely sets text content on a DOM element
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content to set
 * @throws {TypeError} If element is not an HTMLElement
 * @example
 * setTextContent(divElement, userInput);
 */
export function setTextContent(element, text) {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('First argument must be an HTMLElement');
  }
  
  // textContent is safe - it doesn't parse HTML
  element.textContent = text || '';
}

/**
 * Safely sets HTML content on a DOM element with automatic sanitization
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content to set
 * @param {Object} options - Sanitization options
 * @throws {TypeError} If element is not an HTMLElement
 * @example
 * setHTMLContent(divElement, userHTML, { allowedTags: ['p', 'b', 'i'] });
 */
export function setHTMLContent(element, html, options = {}) {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('First argument must be an HTMLElement');
  }
  
  const sanitized = renderRichHTML(html, options);
  element.innerHTML = sanitized;
}

/**
 * Safely sets an attribute on a DOM element
 * @param {HTMLElement} element - Target element
 * @param {string} name - Attribute name
 * @param {string} value - Attribute value
 * @throws {TypeError} If element is not an HTMLElement
 * @throws {Error} If attribute name is dangerous
 * @example
 * setAttribute(element, 'data-user-id', userId);
 */
export function setAttribute(element, name, value) {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('First argument must be an HTMLElement');
  }
  
  // Prevent setting dangerous attributes
  const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'];
  if (dangerousAttrs.includes(name.toLowerCase())) {
    throw new Error(`Attribute "${name}" is not allowed for security reasons`);
  }
  
  // Prevent javascript: URLs
  if (name.toLowerCase() === 'href' || name.toLowerCase() === 'src') {
    if (value && value.trim().toLowerCase().startsWith('javascript:')) {
      throw new Error('javascript: URLs are not allowed');
    }
  }
  
  element.setAttribute(name, escapeAttribute(value));
}

/**
 * Creates a safe template literal tag for HTML
 * Automatically escapes interpolated values
 * @param {TemplateStringsArray} strings - Template strings
 * @param {...any} values - Values to interpolate
 * @returns {string} Safe HTML string
 * @example
 * const name = '<script>alert(1)</script>';
 * const html = safeHTML`<div>Hello ${name}</div>`;
 * // Returns: '<div>Hello &lt;script&gt;alert(1)&lt;/script&gt;</div>'
 */
export function safeHTML(strings, ...values) {
  let result = strings[0];
  
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    
    // Check if value is explicitly marked as safe (from renderRichHTML)
    if (value && typeof value === 'object' && value.__isSafeHTML) {
      result += value.html;
    } else {
      result += escapeHTML(String(value));
    }
    
    result += strings[i + 1];
  }
  
  return result;
}

/**
 * Marks HTML as safe (already sanitized) to bypass escaping
 * Use with extreme caution - only for pre-sanitized content
 * @param {string} html - Pre-sanitized HTML
 * @returns {Object} Marked safe HTML object
 * @example
 * const sanitized = renderRichHTML(userHTML);
 * const safe = markSafe(sanitized);
 * const html = safeHTML`<div>${safe}</div>`; // Won't double-escape
 */
export function markSafe(html) {
  return {
    __isSafeHTML: true,
    html: html,
  };
}

/**
 * SafeRenderer class for managing safe rendering operations
 * Provides a consistent API for rendering user content
 */
export class SafeRenderer {
  /**
   * Creates a new SafeRenderer instance
   * @param {Object} options - Renderer options
   * @param {RenderContext} options.defaultContext - Default rendering context
   * @param {Object} options.sanitizeOptions - Default sanitization options
   */
  constructor(options = {}) {
    this.defaultContext = options.defaultContext || RenderContext.HTML;
    this.sanitizeOptions = options.sanitizeOptions || {};
  }
  
  /**
   * Renders content safely
   * @param {string} content - Content to render
   * @param {RenderContext} context - Optional context override
   * @returns {string} Safe content
   */
  render(content, context = this.defaultContext) {
    return renderSafe(content, context);
  }
  
  /**
   * Renders rich HTML content
   * @param {string} html - HTML to render
   * @param {Object} options - Optional options override
   * @returns {string} Sanitized HTML
   */
  renderHTML(html, options = this.sanitizeOptions) {
    return renderRichHTML(html, options);
  }
  
  /**
   * Updates an element's text content safely
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text content
   */
  updateText(element, text) {
    setTextContent(element, text);
  }
  
  /**
   * Updates an element's HTML content safely
   * @param {HTMLElement} element - Target element
   * @param {string} html - HTML content
   * @param {Object} options - Optional options override
   */
  updateHTML(element, html, options = this.sanitizeOptions) {
    setHTMLContent(element, html, options);
  }
  
  /**
   * Updates an element's attribute safely
   * @param {HTMLElement} element - Target element
   * @param {string} name - Attribute name
   * @param {string} value - Attribute value
   */
  updateAttribute(element, name, value) {
    setAttribute(element, name, value);
  }
}

/**
 * Creates a new SafeRenderer instance
 * @param {Object} options - Renderer options
 * @returns {SafeRenderer} New renderer instance
 * @example
 * const renderer = createSafeRenderer({ defaultContext: RenderContext.HTML });
 * renderer.updateText(element, userInput);
 */
export function createSafeRenderer(options = {}) {
  return new SafeRenderer(options);
}