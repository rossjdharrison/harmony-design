/**
 * @fileoverview Easing Tokens - Animation timing functions for the Harmony Design System
 * @module tokens/easing
 * 
 * Provides predefined easing curves for consistent animation timing across the system.
 * Includes linear, standard CSS easing functions, and spring-based presets.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#easing-tokens} for usage guidelines
 */

/**
 * Easing function tokens for animations and transitions
 * @constant {Object} EASING
 * @property {string} linear - No acceleration, constant speed
 * @property {string} easeIn - Slow start, accelerating
 * @property {string} easeOut - Fast start, decelerating
 * @property {string} easeInOut - Slow start and end, fast middle
 * @property {Object} spring - Spring-based easing presets
 * @property {string} spring.gentle - Subtle spring effect (low bounce)
 * @property {string} spring.default - Standard spring effect (medium bounce)
 * @property {string} spring.bouncy - Pronounced spring effect (high bounce)
 * @property {string} spring.snappy - Quick, tight spring (minimal bounce)
 */
export const EASING = Object.freeze({
  // Standard CSS easing functions
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Spring-based presets using cubic-bezier approximations
  spring: Object.freeze({
    gentle: 'cubic-bezier(0.25, 0.1, 0.25, 1)',      // Subtle overshoot
    default: 'cubic-bezier(0.34, 1.56, 0.64, 1)',    // Medium bounce
    bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // High bounce
    snappy: 'cubic-bezier(0.5, 1.25, 0.75, 1.25)',   // Quick, tight
  }),
});

/**
 * Get easing function by name with fallback
 * @param {string} easingName - Name of easing function (e.g., 'easeOut', 'spring.bouncy')
 * @returns {string} CSS easing function value
 * @example
 * const easing = getEasing('easeOut'); // 'cubic-bezier(0, 0, 0.2, 1)'
 * const spring = getEasing('spring.bouncy'); // 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
 */
export function getEasing(easingName) {
  if (easingName.startsWith('spring.')) {
    const springType = easingName.split('.')[1];
    return EASING.spring[springType] || EASING.easeOut;
  }
  return EASING[easingName] || EASING.easeOut;
}

/**
 * Apply easing to element's transition property
 * @param {HTMLElement} element - Target element
 * @param {string} easingName - Name of easing function
 * @param {string} [property='all'] - CSS property to transition
 * @param {number} [duration=300] - Duration in milliseconds
 * @example
 * applyEasing(button, 'spring.bouncy', 'transform', 400);
 */
export function applyEasing(element, easingName, property = 'all', duration = 300) {
  const easing = getEasing(easingName);
  element.style.transition = `${property} ${duration}ms ${easing}`;
}

/**
 * Create CSS custom properties for easing tokens
 * @returns {string} CSS custom property declarations
 * @example
 * const cssVars = createEasingCSSVariables();
 * // Returns: '--easing-linear: linear; --easing-ease-in: cubic-bezier(...); ...'
 */
export function createEasingCSSVariables() {
  const vars = [
    `--easing-linear: ${EASING.linear}`,
    `--easing-ease-in: ${EASING.easeIn}`,
    `--easing-ease-out: ${EASING.easeOut}`,
    `--easing-ease-in-out: ${EASING.easeInOut}`,
    `--easing-spring-gentle: ${EASING.spring.gentle}`,
    `--easing-spring-default: ${EASING.spring.default}`,
    `--easing-spring-bouncy: ${EASING.spring.bouncy}`,
    `--easing-spring-snappy: ${EASING.spring.snappy}`,
  ];
  return vars.join(';\n  ') + ';';
}

// Auto-register CSS custom properties on module load
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `:root {\n  ${createEasingCSSVariables()}\n}`;
  document.head.appendChild(style);
}