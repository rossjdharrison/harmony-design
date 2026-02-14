/**
 * ARIA Enhancement for Slider Component
 * 
 * Adds proper ARIA attributes and roles to Slider primitive.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/primitives/Slider.aria
 */

import { 
  setRole, 
  setLabel, 
  setValueRange, 
  setValueText, 
  setOrientation,
  setDisabled 
} from '../../utils/aria.js';

/**
 * Enhances Slider with ARIA attributes
 * @param {HTMLElement} slider - Slider element
 * @param {Object} options - ARIA options
 * @param {string} options.label - Accessible label
 * @param {number} options.value - Current value
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {string} options.valueText - Human-readable value
 * @param {string} options.orientation - 'horizontal' | 'vertical'
 * @param {boolean} options.disabled - Disabled state
 */
export function enhanceSliderAria(slider, options = {}) {
  // Set slider role
  setRole(slider, 'slider');
  
  // Set label
  if (options.label) {
    setLabel(slider, options.label);
  }
  
  // Set value range
  const value = options.value ?? 0;
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  setValueRange(slider, value, min, max);
  
  // Set human-readable value text
  if (options.valueText) {
    setValueText(slider, options.valueText);
  }
  
  // Set orientation
  setOrientation(slider, options.orientation || 'horizontal');
  
  // Set disabled state
  if (typeof options.disabled === 'boolean') {
    setDisabled(slider, options.disabled);
  }
  
  // Ensure keyboard accessibility
  if (!slider.hasAttribute('tabindex')) {
    slider.setAttribute('tabindex', '0');
  }
}

/**
 * Updates ARIA value attributes for slider
 * @param {HTMLElement} slider - Slider element
 * @param {number} value - New value
 * @param {string} valueText - Human-readable value (optional)
 */
export function updateSliderValue(slider, value, valueText) {
  const min = parseFloat(slider.getAttribute('aria-valuemin')) || 0;
  const max = parseFloat(slider.getAttribute('aria-valuemax')) || 100;
  setValueRange(slider, value, min, max);
  
  if (valueText) {
    setValueText(slider, valueText);
  }
}