/**
 * ARIA Enhancement for Button Component
 * 
 * Adds proper ARIA attributes and roles to Button primitive.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#accessibility
 * 
 * @module components/primitives/Button.aria
 */

import { setRole, setLabel, setPressed, setDisabled } from '../../utils/aria.js';

/**
 * Enhances Button with ARIA attributes
 * @param {HTMLElement} button - Button element
 * @param {Object} options - ARIA options
 * @param {string} options.label - Accessible label
 * @param {boolean} options.pressed - Pressed state (for toggle buttons)
 * @param {boolean} options.disabled - Disabled state
 */
export function enhanceButtonAria(button, options = {}) {
  // Set button role
  setRole(button, 'button');
  
  // Set label if provided
  if (options.label) {
    setLabel(button, options.label);
  }
  
  // Set pressed state for toggle buttons
  if (typeof options.pressed === 'boolean') {
    setPressed(button, options.pressed);
  }
  
  // Set disabled state
  if (typeof options.disabled === 'boolean') {
    setDisabled(button, options.disabled);
  }
  
  // Ensure keyboard accessibility
  if (!button.hasAttribute('tabindex')) {
    button.setAttribute('tabindex', '0');
  }
}

/**
 * Updates ARIA pressed state for toggle button
 * @param {HTMLElement} button - Button element
 * @param {boolean} pressed - New pressed state
 */
export function updateButtonPressed(button, pressed) {
  setPressed(button, pressed);
}

/**
 * Updates ARIA disabled state for button
 * @param {HTMLElement} button - Button element
 * @param {boolean} disabled - New disabled state
 */
export function updateButtonDisabled(button, disabled) {
  setDisabled(button, disabled);
}