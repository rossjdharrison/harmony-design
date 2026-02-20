/**
 * @fileoverview ARIA Validator - Runtime validation of ARIA usage
 * 
 * Provides comprehensive runtime validation of ARIA attributes, roles, and states
 * to ensure accessibility compliance and catch common mistakes.
 * 
 * Related: utils/accessible-names.js, utils/description-provider.js
 * Documentation: See DESIGN_SYSTEM.md § ARIA Validator
 * 
 * @module utils/aria-validator
 */

/**
 * Valid ARIA roles organized by category
 * @const {Object<string, string[]>}
 */
const ARIA_ROLES = {
  widget: [
    'button', 'checkbox', 'gridcell', 'link', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'option', 'progressbar', 'radio', 'scrollbar', 'searchbox',
    'slider', 'spinbutton', 'switch', 'tab', 'tabpanel', 'textbox', 'treeitem'
  ],
  composite: [
    'combobox', 'grid', 'listbox', 'menu', 'menubar', 'radiogroup', 'tablist',
    'tree', 'treegrid'
  ],
  document: [
    'article', 'definition', 'directory', 'document', 'feed', 'figure', 'group',
    'heading', 'img', 'list', 'listitem', 'math', 'none', 'note', 'presentation',
    'region', 'separator', 'table', 'term', 'toolbar', 'tooltip'
  ],
  landmark: [
    'banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation',
    'region', 'search'
  ],
  live: [
    'alert', 'log', 'marquee', 'status', 'timer'
  ],
  window: [
    'alertdialog', 'dialog'
  ]
};

/**
 * All valid ARIA roles (flattened)
 * @const {Set<string>}
 */
const ALL_ROLES = new Set(
  Object.values(ARIA_ROLES).flat()
);

/**
 * Valid ARIA properties and states
 * @const {Set<string>}
 */
const ARIA_ATTRIBUTES = new Set([
  // Widget attributes
  'aria-autocomplete', 'aria-checked', 'aria-disabled', 'aria-errormessage',
  'aria-expanded', 'aria-haspopup', 'aria-hidden', 'aria-invalid', 'aria-label',
  'aria-level', 'aria-modal', 'aria-multiline', 'aria-multiselectable',
  'aria-orientation', 'aria-placeholder', 'aria-pressed', 'aria-readonly',
  'aria-required', 'aria-selected', 'aria-sort', 'aria-valuemax', 'aria-valuemin',
  'aria-valuenow', 'aria-valuetext',
  
  // Live region attributes
  'aria-live', 'aria-relevant', 'aria-atomic', 'aria-busy',
  
  // Drag-and-drop attributes
  'aria-dropeffect', 'aria-grabbed',
  
  // Relationship attributes
  'aria-activedescendant', 'aria-colcount', 'aria-colindex', 'aria-colspan',
  'aria-controls', 'aria-describedby', 'aria-details', 'aria-flowto',
  'aria-labelledby', 'aria-owns', 'aria-posinset', 'aria-rowcount', 'aria-rowindex',
  'aria-rowspan', 'aria-setsize',
  
  // Additional attributes
  'aria-current', 'aria-keyshortcuts', 'aria-roledescription'
]);

/**
 * Required ARIA attributes for specific roles
 * @const {Object<string, string[]>}
 */
const REQUIRED_ATTRIBUTES = {
  checkbox: ['aria-checked'],
  combobox: ['aria-expanded', 'aria-controls'],
  gridcell: ['aria-colindex', 'aria-rowindex'],
  option: ['aria-selected'],
  radio: ['aria-checked'],
  scrollbar: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  slider: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  spinbutton: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
  switch: ['aria-checked'],
  tab: ['aria-selected'],
  treeitem: ['aria-selected']
};

/**
 * Roles that prohibit accessible names
 * @const {Set<string>}
 */
const ROLES_PROHIBITING_NAMES = new Set([
  'none', 'presentation'
]);

/**
 * Roles that require accessible names
 * @const {Set<string>}
 */
const ROLES_REQUIRING_NAMES = new Set([
  'button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch',
  'slider', 'spinbutton', 'textbox', 'searchbox', 'combobox'
]);

/**
 * Valid values for specific ARIA attributes
 * @const {Object<string, string[]|Function>}
 */
const ARIA_ATTRIBUTE_VALUES = {
  'aria-autocomplete': ['none', 'inline', 'list', 'both'],
  'aria-checked': ['true', 'false', 'mixed'],
  'aria-current': ['page', 'step', 'location', 'date', 'time', 'true', 'false'],
  'aria-dropeffect': ['copy', 'execute', 'link', 'move', 'none', 'popup'],
  'aria-haspopup': ['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'],
  'aria-invalid': ['true', 'false', 'grammar', 'spelling'],
  'aria-live': ['off', 'polite', 'assertive'],
  'aria-orientation': ['horizontal', 'vertical', 'undefined'],
  'aria-pressed': ['true', 'false', 'mixed'],
  'aria-relevant': ['additions', 'removals', 'text', 'all'],
  'aria-sort': ['ascending', 'descending', 'none', 'other'],
  'aria-disabled': ['true', 'false'],
  'aria-expanded': ['true', 'false'],
  'aria-hidden': ['true', 'false'],
  'aria-modal': ['true', 'false'],
  'aria-multiline': ['true', 'false'],
  'aria-multiselectable': ['true', 'false'],
  'aria-readonly': ['true', 'false'],
  'aria-required': ['true', 'false'],
  'aria-selected': ['true', 'false'],
  'aria-atomic': ['true', 'false'],
  'aria-busy': ['true', 'false'],
  'aria-grabbed': ['true', 'false']
};

/**
 * Validation error types
 * @enum {string}
 */
const ErrorType = {
  INVALID_ROLE: 'invalid-role',
  INVALID_ATTRIBUTE: 'invalid-attribute',
  INVALID_VALUE: 'invalid-value',
  MISSING_REQUIRED: 'missing-required',
  MISSING_NAME: 'missing-name',
  PROHIBITED_NAME: 'prohibited-name',
  INVALID_REFERENCE: 'invalid-reference',
  CONFLICTING_ATTRIBUTES: 'conflicting-attributes'
};

/**
 * @typedef {Object} ValidationError
 * @property {ErrorType} type - Error type
 * @property {string} message - Human-readable error message
 * @property {Element} element - Element with the error
 * @property {string} [attribute] - Attribute name (if applicable)
 * @property {string} [value] - Attribute value (if applicable)
 * @property {string} severity - 'error' or 'warning'
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {ValidationError[]} errors - Array of validation errors
 * @property {ValidationError[]} warnings - Array of validation warnings
 */

/**
 * ARIA Validator class
 * Provides runtime validation of ARIA usage
 */
export class AriaValidator {
  /**
   * Creates a new ARIA validator
   * @param {Object} options - Configuration options
   * @param {boolean} [options.strict=false] - Enable strict mode (warnings become errors)
   * @param {boolean} [options.checkReferences=true] - Validate ARIA reference attributes
   * @param {boolean} [options.checkNames=true] - Validate accessible names
   */
  constructor(options = {}) {
    this.strict = options.strict ?? false;
    this.checkReferences = options.checkReferences ?? true;
    this.checkNames = options.checkNames ?? true;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validates an element and its descendants
   * @param {Element} element - Element to validate
   * @returns {ValidationResult} Validation result
   */
  validate(element) {
    this.errors = [];
    this.warnings = [];

    this._validateElement(element);
    
    // Validate all descendants
    const descendants = element.querySelectorAll('[role], [aria-*]');
    descendants.forEach(el => this._validateElement(el));

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Validates a single element
   * @param {Element} element - Element to validate
   * @private
   */
  _validateElement(element) {
    const role = element.getAttribute('role');
    
    // Validate role
    if (role) {
      this._validateRole(element, role);
    }

    // Validate ARIA attributes
    const ariaAttrs = this._getAriaAttributes(element);
    ariaAttrs.forEach(attr => {
      this._validateAttribute(element, attr.name, attr.value, role);
    });

    // Check for required attributes
    if (role && REQUIRED_ATTRIBUTES[role]) {
      this._validateRequiredAttributes(element, role);
    }

    // Check accessible names
    if (this.checkNames && role) {
      this._validateAccessibleName(element, role);
    }

    // Check references
    if (this.checkReferences) {
      ariaAttrs.forEach(attr => {
        if (this._isReferenceAttribute(attr.name)) {
          this._validateReference(element, attr.name, attr.value);
        }
      });
    }
  }

  /**
   * Validates a role attribute
   * @param {Element} element - Element with role
   * @param {string} role - Role value
   * @private
   */
  _validateRole(element, role) {
    if (!ALL_ROLES.has(role)) {
      this._addError({
        type: ErrorType.INVALID_ROLE,
        message: `Invalid ARIA role: "${role}"`,
        element,
        attribute: 'role',
        value: role,
        severity: 'error'
      });
    }
  }

  /**
   * Validates an ARIA attribute
   * @param {Element} element - Element with attribute
   * @param {string} name - Attribute name
   * @param {string} value - Attribute value
   * @param {string|null} role - Element's role (if any)
   * @private
   */
  _validateAttribute(element, name, value, role) {
    // Check if attribute is valid
    if (!ARIA_ATTRIBUTES.has(name)) {
      this._addError({
        type: ErrorType.INVALID_ATTRIBUTE,
        message: `Invalid ARIA attribute: "${name}"`,
        element,
        attribute: name,
        value,
        severity: 'error'
      });
      return;
    }

    // Check if value is valid for this attribute
    const validValues = ARIA_ATTRIBUTE_VALUES[name];
    if (validValues && Array.isArray(validValues)) {
      if (!validValues.includes(value)) {
        this._addError({
          type: ErrorType.INVALID_VALUE,
          message: `Invalid value "${value}" for ${name}. Expected one of: ${validValues.join(', ')}`,
          element,
          attribute: name,
          value,
          severity: 'error'
        });
      }
    }

    // Check numeric values
    if (name.includes('value') && !name.includes('valuetext')) {
      if (isNaN(parseFloat(value))) {
        this._addError({
          type: ErrorType.INVALID_VALUE,
          message: `${name} must be a number, got "${value}"`,
          element,
          attribute: name,
          value,
          severity: 'error'
        });
      }
    }

    // Check conflicting attributes
    this._checkConflicts(element, name, value);
  }

  /**
   * Validates required attributes for a role
   * @param {Element} element - Element with role
   * @param {string} role - Role value
   * @private
   */
  _validateRequiredAttributes(element, role) {
    const required = REQUIRED_ATTRIBUTES[role];
    required.forEach(attr => {
      if (!element.hasAttribute(attr)) {
        this._addError({
          type: ErrorType.MISSING_REQUIRED,
          message: `Role "${role}" requires attribute "${attr}"`,
          element,
          attribute: attr,
          severity: 'error'
        });
      }
    });
  }

  /**
   * Validates accessible name requirements
   * @param {Element} element - Element to check
   * @param {string} role - Element's role
   * @private
   */
  _validateAccessibleName(element, role) {
    const hasName = element.hasAttribute('aria-label') ||
                   element.hasAttribute('aria-labelledby') ||
                   element.textContent.trim().length > 0;

    if (ROLES_REQUIRING_NAMES.has(role) && !hasName) {
      this._addWarning({
        type: ErrorType.MISSING_NAME,
        message: `Role "${role}" should have an accessible name`,
        element,
        severity: 'warning'
      });
    }

    if (ROLES_PROHIBITING_NAMES.has(role) && hasName) {
      this._addWarning({
        type: ErrorType.PROHIBITED_NAME,
        message: `Role "${role}" should not have an accessible name`,
        element,
        severity: 'warning'
      });
    }
  }

  /**
   * Validates ARIA reference attributes (aria-labelledby, aria-describedby, etc.)
   * @param {Element} element - Element with reference
   * @param {string} attr - Attribute name
   * @param {string} value - Space-separated IDs
   * @private
   */
  _validateReference(element, attr, value) {
    const ids = value.split(/\s+/).filter(id => id.length > 0);
    const root = element.getRootNode();
    
    ids.forEach(id => {
      const referenced = root.getElementById(id);
      if (!referenced) {
        this._addError({
          type: ErrorType.INVALID_REFERENCE,
          message: `${attr} references non-existent ID: "${id}"`,
          element,
          attribute: attr,
          value: id,
          severity: 'error'
        });
      }
    });
  }

  /**
   * Checks for conflicting ARIA attributes
   * @param {Element} element - Element to check
   * @param {string} name - Attribute being validated
   * @param {string} value - Attribute value
   * @private
   */
  _checkConflicts(element, name, value) {
    // aria-hidden="true" conflicts with focusable elements
    if (name === 'aria-hidden' && value === 'true') {
      const isFocusable = element.hasAttribute('tabindex') ||
                         ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
      if (isFocusable) {
        this._addWarning({
          type: ErrorType.CONFLICTING_ATTRIBUTES,
          message: 'aria-hidden="true" on focusable element creates accessibility issues',
          element,
          attribute: name,
          severity: 'warning'
        });
      }
    }

    // aria-label and aria-labelledby should not both be present
    if (name === 'aria-label' && element.hasAttribute('aria-labelledby')) {
      this._addWarning({
        type: ErrorType.CONFLICTING_ATTRIBUTES,
        message: 'Both aria-label and aria-labelledby present; aria-labelledby takes precedence',
        element,
        attribute: name,
        severity: 'warning'
      });
    }
  }

  /**
   * Gets all ARIA attributes from an element
   * @param {Element} element - Element to inspect
   * @returns {Array<{name: string, value: string}>} ARIA attributes
   * @private
   */
  _getAriaAttributes(element) {
    const attrs = [];
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('aria-')) {
        attrs.push({ name: attr.name, value: attr.value });
      }
    }
    return attrs;
  }

  /**
   * Checks if an attribute is a reference attribute
   * @param {string} name - Attribute name
   * @returns {boolean} True if reference attribute
   * @private
   */
  _isReferenceAttribute(name) {
    return [
      'aria-labelledby',
      'aria-describedby',
      'aria-controls',
      'aria-owns',
      'aria-flowto',
      'aria-activedescendant',
      'aria-errormessage',
      'aria-details'
    ].includes(name);
  }

  /**
   * Adds an error to the errors list
   * @param {ValidationError} error - Error to add
   * @private
   */
  _addError(error) {
    this.errors.push(error);
    this._logError(error);
  }

  /**
   * Adds a warning (or error in strict mode)
   * @param {ValidationError} warning - Warning to add
   * @private
   */
  _addWarning(warning) {
    if (this.strict) {
      this._addError({ ...warning, severity: 'error' });
    } else {
      this.warnings.push(warning);
      this._logWarning(warning);
    }
  }

  /**
   * Logs an error to console
   * @param {ValidationError} error - Error to log
   * @private
   */
  _logError(error) {
    console.error('[ARIA Validator]', error.message, {
      element: error.element,
      attribute: error.attribute,
      value: error.value
    });
  }

  /**
   * Logs a warning to console
   * @param {ValidationError} warning - Warning to log
   * @private
   */
  _logWarning(warning) {
    console.warn('[ARIA Validator]', warning.message, {
      element: warning.element,
      attribute: warning.attribute,
      value: warning.value
    });
  }

  /**
   * Creates a validation report as a formatted string
   * @param {ValidationResult} result - Validation result
   * @returns {string} Formatted report
   */
  static formatReport(result) {
    let report = '=== ARIA Validation Report ===\n\n';
    
    if (result.valid) {
      report += '✓ No errors found\n';
    } else {
      report += `✗ ${result.errors.length} error(s) found\n\n`;
      
      result.errors.forEach((error, i) => {
        report += `Error ${i + 1}: ${error.message}\n`;
        report += `  Element: ${error.element.tagName}`;
        if (error.element.id) report += `#${error.element.id}`;
        if (error.element.className) report += `.${error.element.className}`;
        report += '\n';
        if (error.attribute) report += `  Attribute: ${error.attribute}\n`;
        if (error.value) report += `  Value: ${error.value}\n`;
        report += '\n';
      });
    }

    if (result.warnings.length > 0) {
      report += `⚠ ${result.warnings.length} warning(s)\n\n`;
      result.warnings.forEach((warning, i) => {
        report += `Warning ${i + 1}: ${warning.message}\n`;
        report += `  Element: ${warning.element.tagName}`;
        if (warning.element.id) report += `#${warning.element.id}`;
        if (warning.element.className) report += `.${warning.element.className}`;
        report += '\n\n';
      });
    }

    return report;
  }
}

/**
 * Validates ARIA usage on an element
 * Convenience function for one-off validation
 * 
 * @param {Element} element - Element to validate
 * @param {Object} [options] - Validation options
 * @returns {ValidationResult} Validation result
 */
export function validateAria(element, options = {}) {
  const validator = new AriaValidator(options);
  return validator.validate(element);
}

/**
 * Validates ARIA usage across entire document
 * 
 * @param {Object} [options] - Validation options
 * @returns {ValidationResult} Validation result
 */
export function validateDocument(options = {}) {
  const validator = new AriaValidator(options);
  return validator.validate(document.body);
}

/**
 * Sets up continuous ARIA validation with MutationObserver
 * Validates changes as they occur in the DOM
 * 
 * @param {Element} [root=document.body] - Root element to observe
 * @param {Object} [options] - Validation options
 * @returns {Function} Cleanup function to stop observation
 */
export function observeAriaChanges(root = document.body, options = {}) {
  const validator = new AriaValidator(options);
  
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      // Validate added nodes
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          validator.validate(node);
        }
      });

      // Validate attribute changes
      if (mutation.type === 'attributes') {
        const attrName = mutation.attributeName;
        if (attrName === 'role' || attrName.startsWith('aria-')) {
          validator.validate(mutation.target);
        }
      }
    });
  });

  observer.observe(root, {
    attributes: true,
    attributeFilter: ['role', ...Array.from(ARIA_ATTRIBUTES)],
    childList: true,
    subtree: true
  });

  return () => observer.disconnect();
}

// Export constants for external use
export { ErrorType, ARIA_ROLES, ARIA_ATTRIBUTES };