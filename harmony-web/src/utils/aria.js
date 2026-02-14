/**
 * ARIA Utilities for Harmony Design System
 * 
 * Provides helper functions for managing ARIA attributes and roles
 * across all components to ensure accessibility compliance.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module utils/aria
 */

/**
 * Sets ARIA role on an element
 * @param {HTMLElement} element - Target element
 * @param {string} role - ARIA role
 */
export function setRole(element, role) {
  if (element && role) {
    element.setAttribute('role', role);
  }
}

/**
 * Sets ARIA label on an element
 * @param {HTMLElement} element - Target element
 * @param {string} label - Accessible label
 */
export function setLabel(element, label) {
  if (element && label) {
    element.setAttribute('aria-label', label);
  }
}

/**
 * Sets ARIA labelledby on an element
 * @param {HTMLElement} element - Target element
 * @param {string} id - ID of labelling element
 */
export function setLabelledBy(element, id) {
  if (element && id) {
    element.setAttribute('aria-labelledby', id);
  }
}

/**
 * Sets ARIA describedby on an element
 * @param {HTMLElement} element - Target element
 * @param {string} id - ID of describing element
 */
export function setDescribedBy(element, id) {
  if (element && id) {
    element.setAttribute('aria-describedby', id);
  }
}

/**
 * Sets ARIA pressed state for toggle buttons
 * @param {HTMLElement} element - Target element
 * @param {boolean} pressed - Pressed state
 */
export function setPressed(element, pressed) {
  if (element) {
    element.setAttribute('aria-pressed', String(pressed));
  }
}

/**
 * Sets ARIA checked state for checkboxes and radio buttons
 * @param {HTMLElement} element - Target element
 * @param {boolean} checked - Checked state
 */
export function setChecked(element, checked) {
  if (element) {
    element.setAttribute('aria-checked', String(checked));
  }
}

/**
 * Sets ARIA disabled state
 * @param {HTMLElement} element - Target element
 * @param {boolean} disabled - Disabled state
 */
export function setDisabled(element, disabled) {
  if (element) {
    element.setAttribute('aria-disabled', String(disabled));
    if (disabled) {
      element.setAttribute('tabindex', '-1');
    } else {
      element.setAttribute('tabindex', '0');
    }
  }
}

/**
 * Sets ARIA value attributes for sliders and progress bars
 * @param {HTMLElement} element - Target element
 * @param {number} value - Current value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 */
export function setValueRange(element, value, min, max) {
  if (element) {
    element.setAttribute('aria-valuenow', String(value));
    element.setAttribute('aria-valuemin', String(min));
    element.setAttribute('aria-valuemax', String(max));
  }
}

/**
 * Sets ARIA valuetext for human-readable value description
 * @param {HTMLElement} element - Target element
 * @param {string} text - Human-readable value
 */
export function setValueText(element, text) {
  if (element && text) {
    element.setAttribute('aria-valuetext', text);
  }
}

/**
 * Sets ARIA live region properties
 * @param {HTMLElement} element - Target element
 * @param {string} politeness - 'polite' | 'assertive' | 'off'
 * @param {boolean} atomic - Whether to present entire region
 */
export function setLiveRegion(element, politeness = 'polite', atomic = false) {
  if (element) {
    element.setAttribute('aria-live', politeness);
    element.setAttribute('aria-atomic', String(atomic));
  }
}

/**
 * Sets ARIA expanded state for collapsible elements
 * @param {HTMLElement} element - Target element
 * @param {boolean} expanded - Expanded state
 */
export function setExpanded(element, expanded) {
  if (element) {
    element.setAttribute('aria-expanded', String(expanded));
  }
}

/**
 * Sets ARIA controls relationship
 * @param {HTMLElement} element - Controlling element
 * @param {string} id - ID of controlled element
 */
export function setControls(element, id) {
  if (element && id) {
    element.setAttribute('aria-controls', id);
  }
}

/**
 * Sets ARIA orientation for sliders and scrollbars
 * @param {HTMLElement} element - Target element
 * @param {string} orientation - 'horizontal' | 'vertical'
 */
export function setOrientation(element, orientation) {
  if (element && (orientation === 'horizontal' || orientation === 'vertical')) {
    element.setAttribute('aria-orientation', orientation);
  }
}

/**
 * Announces a message to screen readers using live region
 * @param {string} message - Message to announce
 * @param {string} politeness - 'polite' | 'assertive'
 */
export function announce(message, politeness = 'polite') {
  const announcer = getOrCreateAnnouncer();
  announcer.setAttribute('aria-live', politeness);
  announcer.textContent = message;
  
  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

/**
 * Gets or creates the global ARIA live region announcer
 * @returns {HTMLElement} Announcer element
 */
function getOrCreateAnnouncer() {
  let announcer = document.getElementById('harmony-aria-announcer');
  
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'harmony-aria-announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    
    // Add screen-reader-only styles
    const style = document.createElement('style');
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(announcer);
  }
  
  return announcer;
}

/**
 * Creates a unique ID for ARIA relationships
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'harmony') {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}