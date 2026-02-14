/**
 * ARIA Enhancement for Knob Component
 * 
 * Adds proper ARIA attributes and roles to Knob primitive.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/primitives/Knob.aria
 */

import { 
  setRole, 
  setLabel, 
  setValueRange, 
  setValueText,
  setDisabled 
} from '../../utils/aria.js';

/**
 * Enhances Knob with ARIA attributes
 * @param {HTMLElement} knob - Knob element
 * @param {Object} options - ARIA options
 * @param {string} options.label - Accessible label
 * @param {number} options.value - Current value
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {string} options.valueText - Human-readable value
 * @param {boolean} options.disabled - Disabled state
 */
export function enhanceKnobAria(knob, options = {}) {
  // Set slider role (knob is a rotary slider)
  setRole(knob, 'slider');
  
  // Set label
  if (options.label) {
    setLabel(knob, options.label);
  }
  
  // Set value range
  const value = options.value ?? 0;
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  setValueRange(knob, value, min, max);
  
  // Set human-readable value text
  if (options.valueText) {
    setValueText(knob, options.valueText);
  }
  
  // Set disabled state
  if (typeof options.disabled === 'boolean') {
    setDisabled(knob, options.disabled);
  }
  
  // Ensure keyboard accessibility
  if (!knob.hasAttribute('tabindex')) {
    knob.setAttribute('tabindex', '0');
  }
}

/**
 * Updates ARIA value attributes for knob
 * @param {HTMLElement} knob - Knob element
 * @param {number} value - New value
 * @param {string} valueText - Human-readable value (optional)
 */
export function updateKnobValue(knob, value, valueText) {
  const min = parseFloat(knob.getAttribute('aria-valuemin')) || 0;
  const max = parseFloat(knob.getAttribute('aria-valuemax')) || 100;
  setValueRange(knob, value, min, max);
  
  if (valueText) {
    setValueText(knob, valueText);
  }
}