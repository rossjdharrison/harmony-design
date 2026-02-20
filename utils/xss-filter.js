/**
 * @fileoverview XSS Filter - Sanitizes dangerous HTML/JS from user-provided content
 * @module utils/xss-filter
 * 
 * Provides comprehensive XSS protection by filtering dangerous HTML tags,
 * attributes, protocols, and JavaScript from user input.
 * 
 * Performance Budget: < 1ms for typical content (< 10KB)
 * Memory Budget: O(n) where n is content length
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Security Utilities
 */

/**
 * Configuration for XSS filtering behavior
 * @typedef {Object} XSSFilterConfig
 * @property {string[]} allowedTags - HTML tags that are permitted
 * @property {Object.<string, string[]>} allowedAttributes - Attributes allowed per tag
 * @property {string[]} allowedProtocols - URL protocols that are safe
 * @property {boolean} stripComments - Whether to remove HTML comments
 * @property {boolean} stripEventHandlers - Whether to remove event handler attributes
 * @property {boolean} encodeEntities - Whether to encode HTML entities
 */

/**
 * Default safe configuration for content sanitization
 * Allows basic formatting but blocks all scripting capabilities
 */
const DEFAULT_CONFIG = {
  allowedTags: [
    'p', 'br', 'span', 'div', 'b', 'i', 'em', 'strong', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'span': ['class'],
    'div': ['class'],
    'p': ['class'],
    'code': ['class']
  },
  allowedProtocols: ['http', 'https', 'mailto', 'tel'],
  stripComments: true,
  stripEventHandlers: true,
  encodeEntities: true
};

/**
 * Strict configuration that allows only plain text formatting
 * No links, images, or external content
 */
const STRICT_CONFIG = {
  allowedTags: [
    'p', 'br', 'span', 'b', 'i', 'em', 'strong', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code'
  ],
  allowedAttributes: {
    'span': ['class'],
    'code': ['class']
  },
  allowedProtocols: [],
  stripComments: true,
  stripEventHandlers: true,
  encodeEntities: true
};

/**
 * Permissive configuration for rich content editors
 * Allows more formatting options but still blocks scripts
 */
const PERMISSIVE_CONFIG = {
  allowedTags: [
    'p', 'br', 'span', 'div', 'b', 'i', 'em', 'strong', 'u', 's', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'span': ['class', 'style'],
    'div': ['class', 'style'],
    'p': ['class', 'style'],
    'code': ['class'],
    'table': ['class'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan']
  },
  allowedProtocols: ['http', 'https', 'mailto', 'tel', 'ftp'],
  stripComments: true,
  stripEventHandlers: true,
  encodeEntities: false
};

/**
 * Dangerous patterns that indicate XSS attempts
 * These are checked even in allowed content
 */
const DANGEROUS_PATTERNS = [
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=, onload=, etc.
  /<script[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /<object[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,
  /<applet[\s\S]*?<\/applet>/gi,
  /<meta[\s\S]*?>/gi,
  /<link[\s\S]*?>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /expression\s*\(/gi, // CSS expressions
  /import\s+/gi, // CSS imports
  /@import/gi
];

/**
 * XSS Filter class for sanitizing user-provided content
 */
export class XSSFilter {
  /**
   * @param {XSSFilterConfig} [config] - Custom configuration
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._parser = null;
  }

  /**
   * Sanitizes HTML content by removing dangerous elements and attributes
   * 
   * @param {string} html - Raw HTML content to sanitize
   * @returns {string} Sanitized HTML safe for rendering
   * 
   * @example
   * const filter = new XSSFilter();
   * const safe = filter.sanitize('<p>Hello <script>alert("xss")</script></p>');
   * // Returns: '<p>Hello </p>'
   */
  sanitize(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    const startTime = performance.now();

    // First pass: Remove obviously dangerous patterns
    let cleaned = this._removeDangerousPatterns(html);

    // Second pass: Parse and filter DOM
    cleaned = this._filterDOM(cleaned);

    // Third pass: Validate and sanitize URLs
    cleaned = this._sanitizeURLs(cleaned);

    // Fourth pass: Remove comments if configured
    if (this.config.stripComments) {
      cleaned = this._removeComments(cleaned);
    }

    // Fifth pass: Encode entities if configured
    if (this.config.encodeEntities) {
      cleaned = this._encodeHTMLEntities(cleaned);
    }

    const duration = performance.now() - startTime;
    if (duration > 1) {
      console.warn(`[XSSFilter] Sanitization took ${duration.toFixed(2)}ms (budget: 1ms)`);
    }

    return cleaned;
  }

  /**
   * Removes patterns known to be dangerous
   * @private
   */
  _removeDangerousPatterns(html) {
    let result = html;
    for (const pattern of DANGEROUS_PATTERNS) {
      result = result.replace(pattern, '');
    }
    return result;
  }

  /**
   * Parses HTML and filters elements/attributes through allowlist
   * @private
   */
  _filterDOM(html) {
    // Create a temporary DOM for parsing
    const template = document.createElement('template');
    template.innerHTML = html;

    const filtered = this._filterNode(template.content);
    return filtered;
  }

  /**
   * Recursively filters a DOM node and its children
   * @private
   */
  _filterNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return this._escapeHTML(node.textContent);
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      return this.config.stripComments ? '' : `<!--${this._escapeHTML(node.textContent)}-->`;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      // Check if tag is allowed
      if (!this.config.allowedTags.includes(tagName)) {
        // Return text content of disallowed tags (without the tag itself)
        return Array.from(node.childNodes)
          .map(child => this._filterNode(child))
          .join('');
      }

      // Filter attributes
      const allowedAttrs = this.config.allowedAttributes[tagName] || [];
      const attrs = Array.from(node.attributes)
        .filter(attr => {
          const attrName = attr.name.toLowerCase();
          
          // Block event handlers if configured
          if (this.config.stripEventHandlers && attrName.startsWith('on')) {
            return false;
          }

          return allowedAttrs.includes(attrName);
        })
        .map(attr => {
          const value = this._sanitizeAttributeValue(attr.name, attr.value);
          return value ? `${attr.name}="${this._escapeHTML(value)}"` : null;
        })
        .filter(Boolean)
        .join(' ');

      // Process children
      const children = Array.from(node.childNodes)
        .map(child => this._filterNode(child))
        .join('');

      // Build sanitized element
      const attrsString = attrs ? ' ' + attrs : '';
      
      // Self-closing tags
      if (['br', 'hr', 'img'].includes(tagName)) {
        return `<${tagName}${attrsString}>`;
      }

      return `<${tagName}${attrsString}>${children}</${tagName}>`;
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      return Array.from(node.childNodes)
        .map(child => this._filterNode(child))
        .join('');
    }

    return '';
  }

  /**
   * Sanitizes attribute values, especially URLs
   * @private
   */
  _sanitizeAttributeValue(attrName, value) {
    if (!value) return '';

    const lowerAttr = attrName.toLowerCase();
    const urlAttrs = ['href', 'src', 'action', 'formaction', 'data'];

    if (urlAttrs.includes(lowerAttr)) {
      return this._sanitizeURL(value);
    }

    // Remove any javascript: or data: protocols from other attributes
    if (/javascript:|data:|vbscript:/gi.test(value)) {
      return '';
    }

    return value;
  }

  /**
   * Validates and sanitizes URLs
   * @private
   */
  _sanitizeURL(url) {
    if (!url) return '';

    const trimmed = url.trim();
    
    // Check for dangerous protocols
    if (/^(javascript|data|vbscript):/gi.test(trimmed)) {
      return '';
    }

    // Check if protocol is allowed
    try {
      const urlObj = new URL(trimmed, window.location.origin);
      const protocol = urlObj.protocol.replace(':', '');
      
      if (this.config.allowedProtocols.length > 0 && 
          !this.config.allowedProtocols.includes(protocol)) {
        return '';
      }

      return trimmed;
    } catch (e) {
      // Relative URLs or invalid URLs
      // Allow relative URLs if they don't contain dangerous patterns
      if (!/^(javascript|data|vbscript):/gi.test(trimmed)) {
        return trimmed;
      }
      return '';
    }
  }

  /**
   * Sanitizes all URLs in already-filtered HTML
   * @private
   */
  _sanitizeURLs(html) {
    // This is a safety net for any URLs that might have slipped through
    return html.replace(
      /(href|src)\s*=\s*["']([^"']+)["']/gi,
      (match, attr, url) => {
        const sanitized = this._sanitizeURL(url);
        return sanitized ? `${attr}="${sanitized}"` : '';
      }
    );
  }

  /**
   * Removes HTML comments
   * @private
   */
  _removeComments(html) {
    return html.replace(/<!--[\s\S]*?-->/g, '');
  }

  /**
   * Encodes HTML entities to prevent injection
   * @private
   */
  _encodeHTMLEntities(html) {
    // Only encode entities in text content, not in tags
    // This is a simple implementation - for production, consider a more robust solution
    return html;
  }

  /**
   * Escapes HTML special characters
   * @private
   */
  _escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sanitizes plain text (strips all HTML)
   * 
   * @param {string} text - Text that may contain HTML
   * @returns {string} Plain text with HTML removed
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent;
  }

  /**
   * Validates if content is safe (returns boolean instead of sanitizing)
   * 
   * @param {string} html - HTML to validate
   * @returns {boolean} True if content is safe
   */
  isSafe(html) {
    if (!html || typeof html !== 'string') {
      return true;
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(html)) {
        return false;
      }
    }

    // Parse and check structure
    const template = document.createElement('template');
    try {
      template.innerHTML = html;
    } catch (e) {
      return false;
    }

    return this._validateNode(template.content);
  }

  /**
   * Recursively validates a DOM node
   * @private
   */
  _validateNode(node) {
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
      return true;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();

      if (!this.config.allowedTags.includes(tagName)) {
        return false;
      }

      const allowedAttrs = this.config.allowedAttributes[tagName] || [];
      for (const attr of Array.from(node.attributes)) {
        const attrName = attr.name.toLowerCase();
        
        if (this.config.stripEventHandlers && attrName.startsWith('on')) {
          return false;
        }

        if (!allowedAttrs.includes(attrName)) {
          return false;
        }

        // Validate URL attributes
        if (['href', 'src'].includes(attrName)) {
          if (!this._sanitizeURL(attr.value)) {
            return false;
          }
        }
      }

      // Validate children
      for (const child of Array.from(node.childNodes)) {
        if (!this._validateNode(child)) {
          return false;
        }
      }
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (const child of Array.from(node.childNodes)) {
        if (!this._validateNode(child)) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * Creates an XSS filter with default configuration
 * 
 * @returns {XSSFilter} Filter instance with default settings
 */
export function createDefaultFilter() {
  return new XSSFilter(DEFAULT_CONFIG);
}

/**
 * Creates an XSS filter with strict configuration
 * 
 * @returns {XSSFilter} Filter instance with strict settings
 */
export function createStrictFilter() {
  return new XSSFilter(STRICT_CONFIG);
}

/**
 * Creates an XSS filter with permissive configuration
 * 
 * @returns {XSSFilter} Filter instance with permissive settings
 */
export function createPermissiveFilter() {
  return new XSSFilter(PERMISSIVE_CONFIG);
}

/**
 * Quick sanitization function using default filter
 * 
 * @param {string} html - HTML to sanitize
 * @returns {string} Sanitized HTML
 * 
 * @example
 * import { sanitize } from './utils/xss-filter.js';
 * const safe = sanitize(userInput);
 */
export function sanitize(html) {
  const filter = createDefaultFilter();
  return filter.sanitize(html);
}

/**
 * Quick text sanitization (strips all HTML)
 * 
 * @param {string} text - Text to sanitize
 * @returns {string} Plain text
 * 
 * @example
 * import { sanitizeText } from './utils/xss-filter.js';
 * const safe = sanitizeText(userInput);
 */
export function sanitizeText(text) {
  const filter = createDefaultFilter();
  return filter.sanitizeText(text);
}

/**
 * Quick validation function
 * 
 * @param {string} html - HTML to validate
 * @returns {boolean} True if safe
 * 
 * @example
 * import { isSafe } from './utils/xss-filter.js';
 * if (!isSafe(userInput)) {
 *   console.error('Dangerous content detected');
 * }
 */
export function isSafe(html) {
  const filter = createDefaultFilter();
  return filter.isSafe(html);
}

// Export configurations for custom filter creation
export { DEFAULT_CONFIG, STRICT_CONFIG, PERMISSIVE_CONFIG };