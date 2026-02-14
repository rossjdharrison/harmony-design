/**
 * ARIA Enhancement for Toggle Component
 * 
 * Adds proper ARIA attributes and roles to Toggle primitive.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/primitives/Toggle.aria
 */

import { setRole, setLabel, setChecked, setDisabled } from '../../utils/aria.js';

/**
 * Enhances Toggle with ARIA attributes
 * @param {HTMLElement} toggle - Toggle element
 * @param {Object} options - ARIA options
 * @param {string} options.label - Accessible label
 * @param {boolean} options.checked - Checked state
 * @param {boolean} options.disabled - Disabled state
 */
export function enhanceToggleAria(toggle, options = {}) {
  // Set switch role (more appropriate than checkbox for toggle)
  setRole(toggle, 'switch');
  
  // Set label
  if (options.label) {
    setLabel(toggle, options.label);
  }
  
  // Set checked state
  setChecked(toggle, options.checked || false);
  
  // Set disabled state
  if (typeof options.disabled === 'boolean') {
    setDisabled(toggle, options.disabled);
  }
  
  // Ensure keyboard accessibility
  if (!toggle.hasAttribute('tabindex')) {
    toggle.setAttribute('tabindex', '0');
  }
}

/**
 * Updates ARIA checked state for toggle
 * @param {HTMLElement} toggle - Toggle element
 * @param {boolean} checked - New checked state
 */
export function updateToggleChecked(toggle, checked) {
  setChecked(toggle, checked);
}