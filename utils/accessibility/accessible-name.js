/**
 * @fileoverview Accessible Name Computation Utility
 * 
 * Implements WCAG's Accessible Name and Description Computation specification
 * to calculate the accessible name for DOM elements.
 * 
 * Specification: https://www.w3.org/TR/accname-1.2/
 * 
 * The accessible name is the text alternative for an element that is used by
 * assistive technologies (like screen readers) to identify and describe the element.
 * 
 * Computation follows this priority order:
 * 1. aria-labelledby (references to other elements)
 * 2. aria-label (direct label text)
 * 3. Native label mechanisms (label element, alt attribute, etc.)
 * 4. Text content (for certain roles)
 * 5. title attribute (fallback)
 * 
 * Performance: O(n) where n is DOM tree depth for referenced elements
 * Memory: O(1) - uses visited set to prevent infinite recursion
 * 
 * Related: harmony-design/DESIGN_SYSTEM.md § Accessibility
 * 
 * @module utils/accessibility/accessible-name
 */

/**
 * Context object passed through recursive computation
 * @typedef {Object} ComputationContext
 * @property {Set<Element>} visited - Elements already visited (prevents cycles)
 * @property {boolean} isRecursive - Whether this is a recursive call
 * @property {boolean} includeHidden - Whether to include hidden elements
 */

/**
 * Computes the accessible name for a given element according to WCAG specification.
 * 
 * This is the main entry point for accessible name computation.
 * 
 * @param {Element} element - The DOM element to compute the name for
 * @param {Object} [options={}] - Computation options
 * @param {boolean} [options.includeHidden=false] - Include hidden elements in computation
 * @returns {string} The computed accessible name (trimmed, whitespace normalized)
 * 
 * @example
 * // Button with aria-label
 * const button = document.querySelector('button[aria-label="Close"]');
 * computeAccessibleName(button); // Returns: "Close"
 * 
 * @example
 * // Input with label
 * const input = document.querySelector('#email');
 * computeAccessibleName(input); // Returns: "Email address"
 */
export function computeAccessibleName(element, options = {}) {
  if (!element || !(element instanceof Element)) {
    return '';
  }

  const context = {
    visited: new Set(),
    isRecursive: false,
    includeHidden: options.includeHidden || false
  };

  const name = computeAccessibleNameInternal(element, context);
  return normalizeWhitespace(name);
}

/**
 * Internal recursive computation function.
 * 
 * @param {Element} element - Element to compute name for
 * @param {ComputationContext} context - Computation context
 * @returns {string} Computed name (may contain unnormalized whitespace)
 * @private
 */
function computeAccessibleNameInternal(element, context) {
  // Prevent infinite recursion
  if (context.visited.has(element)) {
    return '';
  }
  context.visited.add(element);

  // Check if element is hidden and we should skip it
  if (!context.includeHidden && isElementHidden(element)) {
    return '';
  }

  // Step 1: aria-labelledby (highest priority)
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const name = computeNameFromLabelledBy(labelledBy, context);
    if (name) return name;
  }

  // Step 2: aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  // Step 3: Native label mechanisms (element-specific)
  const nativeName = computeNativeName(element, context);
  if (nativeName) {
    return nativeName;
  }

  // Step 4: Text content (for certain roles/elements)
  if (shouldUseTextContent(element)) {
    const textName = computeTextContent(element, context);
    if (textName) return textName;
  }

  // Step 5: title attribute (fallback)
  const title = element.getAttribute('title');
  if (title && title.trim()) {
    return title.trim();
  }

  return '';
}

/**
 * Computes name from aria-labelledby attribute.
 * 
 * @param {string} labelledBy - Space-separated list of element IDs
 * @param {ComputationContext} context - Computation context
 * @returns {string} Computed name from referenced elements
 * @private
 */
function computeNameFromLabelledBy(labelledBy, context) {
  const ids = labelledBy.trim().split(/\s+/);
  const names = [];

  for (const id of ids) {
    const referencedElement = document.getElementById(id);
    if (referencedElement) {
      const recursiveContext = {
        ...context,
        isRecursive: true
      };
      const name = computeAccessibleNameInternal(referencedElement, recursiveContext);
      if (name) {
        names.push(name);
      }
    }
  }

  return names.join(' ');
}

/**
 * Computes name using native HTML labeling mechanisms.
 * 
 * @param {Element} element - Element to compute name for
 * @param {ComputationContext} context - Computation context
 * @returns {string} Name from native mechanisms, or empty string
 * @private
 */
function computeNativeName(element, context) {
  const tagName = element.tagName.toLowerCase();

  // Input elements: check for associated label
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    // Check for label element
    const labelElement = findLabelForElement(element);
    if (labelElement) {
      return computeTextContent(labelElement, context);
    }

    // For input type="button", "submit", "reset" - use value attribute
    if (tagName === 'input') {
      const type = element.getAttribute('type')?.toLowerCase();
      if (type === 'button' || type === 'submit' || type === 'reset') {
        const value = element.getAttribute('value');
        if (value) return value;
        
        // Default button text for submit/reset
        if (type === 'submit') return 'Submit';
        if (type === 'reset') return 'Reset';
      }

      // For input type="image" - use alt attribute
      if (type === 'image') {
        const alt = element.getAttribute('alt');
        if (alt) return alt;
      }
    }

    // Placeholder as last resort for inputs (not ideal per spec, but practical)
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && !context.isRecursive) {
      return placeholder;
    }
  }

  // Image elements: alt attribute
  if (tagName === 'img') {
    const alt = element.getAttribute('alt');
    return alt !== null ? alt : '';
  }

  // Area elements: alt attribute
  if (tagName === 'area') {
    const alt = element.getAttribute('alt');
    if (alt) return alt;
  }

  // Fieldset: legend element
  if (tagName === 'fieldset') {
    const legend = element.querySelector('legend');
    if (legend) {
      return computeTextContent(legend, context);
    }
  }

  // Figure: figcaption element
  if (tagName === 'figure') {
    const figcaption = element.querySelector('figcaption');
    if (figcaption) {
      return computeTextContent(figcaption, context);
    }
  }

  // Table: caption element
  if (tagName === 'table') {
    const caption = element.querySelector('caption');
    if (caption) {
      return computeTextContent(caption, context);
    }
  }

  return '';
}

/**
 * Finds the label element associated with an input/textarea/select.
 * 
 * @param {Element} element - Form control element
 * @returns {Element|null} Associated label element, or null
 * @private
 */
function findLabelForElement(element) {
  // Check for wrapping label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel;
  }

  // Check for label with matching 'for' attribute
  const id = element.getAttribute('id');
  if (id) {
    return document.querySelector(`label[for="${CSS.escape(id)}"]`);
  }

  return null;
}

/**
 * Determines if an element's text content should be used for its accessible name.
 * 
 * @param {Element} element - Element to check
 * @returns {boolean} True if text content should be used
 * @private
 */
function shouldUseTextContent(element) {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');

  // Elements that typically use their text content as accessible name
  const textContentElements = new Set([
    'button',
    'a',
    'summary',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ]);

  // Roles that use text content
  const textContentRoles = new Set([
    'button',
    'link',
    'menuitem',
    'tab',
    'treeitem',
    'option'
  ]);

  return textContentElements.has(tagName) || 
         (role && textContentRoles.has(role));
}

/**
 * Computes text content for an element, excluding hidden elements.
 * 
 * @param {Element} element - Element to get text from
 * @param {ComputationContext} context - Computation context
 * @returns {string} Text content
 * @private
 */
function computeTextContent(element, context) {
  const parts = [];

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Skip hidden elements
      if (!context.includeHidden && isElementHidden(node)) {
        continue;
      }

      // For alt text on images within the element
      if (node.tagName.toLowerCase() === 'img') {
        const alt = node.getAttribute('alt');
        if (alt !== null) {
          parts.push(alt);
          continue;
        }
      }

      // Recursively get text from child elements
      const childContext = { ...context };
      parts.push(computeTextContent(node, childContext));
    }
  }

  return parts.join(' ');
}

/**
 * Checks if an element is hidden from assistive technologies.
 * 
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is hidden
 * @private
 */
function isElementHidden(element) {
  // aria-hidden="true"
  if (element.getAttribute('aria-hidden') === 'true') {
    return true;
  }

  // CSS display: none or visibility: hidden
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return true;
  }

  // Hidden attribute
  if (element.hasAttribute('hidden')) {
    return true;
  }

  return false;
}

/**
 * Normalizes whitespace in a string (collapse multiple spaces, trim).
 * 
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 * @private
 */
function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Computes the accessible description for an element.
 * 
 * Similar to accessible name computation but follows different priority:
 * 1. aria-describedby
 * 2. title attribute (if not used for name)
 * 
 * @param {Element} element - Element to compute description for
 * @param {Object} [options={}] - Computation options
 * @returns {string} The computed accessible description
 * 
 * @example
 * const input = document.querySelector('#password');
 * computeAccessibleDescription(input); // Returns: "Must be at least 8 characters"
 */
export function computeAccessibleDescription(element, options = {}) {
  if (!element || !(element instanceof Element)) {
    return '';
  }

  const context = {
    visited: new Set(),
    isRecursive: false,
    includeHidden: options.includeHidden || false
  };

  // Step 1: aria-describedby
  const describedBy = element.getAttribute('aria-describedby');
  if (describedBy) {
    const description = computeNameFromLabelledBy(describedBy, context);
    if (description) {
      return normalizeWhitespace(description);
    }
  }

  // Step 2: title attribute (if not used for accessible name)
  const name = computeAccessibleName(element, options);
  const title = element.getAttribute('title');
  if (title && title.trim() && title.trim() !== name) {
    return title.trim();
  }

  return '';
}

/**
 * Validates if an element has a sufficient accessible name.
 * 
 * @param {Element} element - Element to validate
 * @param {Object} [options={}] - Validation options
 * @param {number} [options.minLength=1] - Minimum acceptable name length
 * @returns {Object} Validation result with isValid and message
 * 
 * @example
 * const button = document.querySelector('button');
 * const result = validateAccessibleName(button);
 * if (!result.isValid) {
 *   console.warn(result.message);
 * }
 */
export function validateAccessibleName(element, options = {}) {
  const minLength = options.minLength || 1;
  const name = computeAccessibleName(element);

  if (!name || name.length < minLength) {
    return {
      isValid: false,
      message: `Element lacks sufficient accessible name (found: "${name}", minimum length: ${minLength})`,
      element,
      computedName: name
    };
  }

  return {
    isValid: true,
    message: 'Element has valid accessible name',
    element,
    computedName: name
  };
}

/**
 * Finds all elements in a document/subtree that lack accessible names.
 * 
 * Useful for accessibility auditing.
 * 
 * @param {Element|Document} [root=document] - Root element to search from
 * @returns {Array<Object>} Array of elements with validation results
 * 
 * @example
 * const issues = findElementsWithoutAccessibleNames();
 * issues.forEach(issue => {
 *   console.warn('Missing accessible name:', issue.element, issue.role);
 * });
 */
export function findElementsWithoutAccessibleNames(root = document) {
  // Elements that require accessible names
  const selectors = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'textarea',
    'select',
    'img',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="tab"]',
    '[role="menuitem"]'
  ];

  const elements = root.querySelectorAll(selectors.join(', '));
  const issues = [];

  for (const element of elements) {
    const result = validateAccessibleName(element);
    if (!result.isValid) {
      issues.push({
        element,
        role: element.getAttribute('role') || element.tagName.toLowerCase(),
        computedName: result.computedName,
        message: result.message
      });
    }
  }

  return issues;
}