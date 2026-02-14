/**
 * ARIA Enhancement for Meter Component
 * 
 * Adds proper ARIA attributes and roles to Meter primitive.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/primitives/Meter.aria
 */

import { 
  setRole, 
  setLabel, 
  setValueRange, 
  setValueText,
  setLiveRegion 
} from '../../utils/aria.js';

/**
 * Enhances Meter with ARIA attributes
 * @param {HTMLElement} meter - Meter element
 * @param {Object} options - ARIA options
 * @param {string} options.label - Accessible label
 * @param {number} options.value - Current value
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {string} options.valueText - Human-readable value
 * @param {boolean} options.live - Whether to announce changes
 */
export function enhanceMeterAria(meter, options = {}) {
  // Set meter role (for read-only gauges)
  setRole(meter, 'meter');
  
  // Set label
  if (options.label) {
    setLabel(meter, options.label);
  }
  
  // Set value range
  const value = options.value ?? 0;
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  setValueRange(meter, value, min, max);
  
  // Set human-readable value text
  if (options.valueText) {
    setValueText(meter, options.valueText);
  }
  
  // Set live region for dynamic meters (e.g., audio level)
  if (options.live) {
    setLiveRegion(meter, 'polite', false);
  }
  
  // Meters are not interactive, no tabindex needed
  meter.setAttribute('tabindex', '-1');
}

/**
 * Updates ARIA value attributes for meter
 * @param {HTMLElement} meter - Meter element
 * @param {number} value - New value
 * @param {string} valueText - Human-readable value (optional)
 */
export function updateMeterValue(meter, value, valueText) {
  const min = parseFloat(meter.getAttribute('aria-valuemin')) || 0;
  const max = parseFloat(meter.getAttribute('aria-valuemax')) || 100;
  setValueRange(meter, value, min, max);
  
  if (valueText) {
    setValueText(meter, valueText);
  }
}