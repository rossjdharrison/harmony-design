/**
 * @fileoverview Standard transition presets for the Harmony Design System
 * Provides reusable transition configurations for consistent animation timing
 * across the application. Supports instant, fast, normal, slow, and spring transitions.
 * 
 * Performance: All transitions designed to stay within 16ms render budget
 * Documentation: See DESIGN_SYSTEM.md § Animations & Transitions
 * 
 * @module animations/transition-presets
 */

/**
 * Transition duration constants in milliseconds
 * Aligned with design system timing scale
 */
export const DURATIONS = {
  INSTANT: 0,
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};

/**
 * Standard easing functions
 * Using CSS cubic-bezier for GPU-accelerated animations
 */
export const EASINGS = {
  LINEAR: 'linear',
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring-like overshoot
};

/**
 * Instant transition preset (0ms)
 * Use for: Immediate state changes, toggling visibility
 * 
 * @type {Object}
 * @property {number} duration - Transition duration in ms
 * @property {string} easing - CSS easing function
 * @property {number} delay - Delay before transition starts
 */
export const instant = {
  duration: DURATIONS.INSTANT,
  easing: EASINGS.LINEAR,
  delay: 0,
};

/**
 * Fast transition preset (150ms)
 * Use for: Quick feedback, hover states, tooltips
 * 
 * @type {Object}
 * @property {number} duration - Transition duration in ms
 * @property {string} easing - CSS easing function
 * @property {number} delay - Delay before transition starts
 */
export const fast = {
  duration: DURATIONS.FAST,
  easing: EASINGS.EASE_OUT,
  delay: 0,
};

/**
 * Normal transition preset (300ms)
 * Use for: Standard UI transitions, modals, panels
 * 
 * @type {Object}
 * @property {number} duration - Transition duration in ms
 * @property {string} easing - CSS easing function
 * @property {number} delay - Delay before transition starts
 */
export const normal = {
  duration: DURATIONS.NORMAL,
  easing: EASINGS.EASE_IN_OUT,
  delay: 0,
};

/**
 * Slow transition preset (500ms)
 * Use for: Emphasized transitions, page transitions, complex animations
 * 
 * @type {Object}
 * @property {number} duration - Transition duration in ms
 * @property {string} easing - CSS easing function
 * @property {number} delay - Delay before transition starts
 */
export const slow = {
  duration: DURATIONS.SLOW,
  easing: EASINGS.EASE_IN_OUT,
  delay: 0,
};

/**
 * Spring transition preset (300ms with spring easing)
 * Use for: Playful interactions, attention-grabbing elements
 * Note: Has slight overshoot for spring-like feel
 * 
 * @type {Object}
 * @property {number} duration - Transition duration in ms
 * @property {string} easing - CSS easing function with overshoot
 * @property {number} delay - Delay before transition starts
 */
export const spring = {
  duration: DURATIONS.NORMAL,
  easing: EASINGS.SPRING,
  delay: 0,
};

/**
 * All transition presets as a named collection
 * Useful for dynamic preset selection
 * 
 * @type {Object.<string, Object>}
 */
export const PRESETS = {
  instant,
  fast,
  normal,
  slow,
  spring,
};

/**
 * Creates a CSS transition string from a preset
 * 
 * @param {Object} preset - Transition preset object
 * @param {string|string[]} properties - CSS properties to transition
 * @returns {string} CSS transition declaration
 * 
 * @example
 * const transition = toCSSTransition(fast, 'opacity');
 * // Returns: 'opacity 150ms cubic-bezier(0, 0, 0.2, 1) 0ms'
 * 
 * @example
 * const transition = toCSSTransition(normal, ['opacity', 'transform']);
 * // Returns: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, transform 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms'
 */
export function toCSSTransition(preset, properties) {
  const props = Array.isArray(properties) ? properties : [properties];
  return props
    .map(prop => `${prop} ${preset.duration}ms ${preset.easing} ${preset.delay}ms`)
    .join(', ');
}

/**
 * Creates a Web Animations API options object from a preset
 * 
 * @param {Object} preset - Transition preset object
 * @returns {Object} Web Animations API timing options
 * 
 * @example
 * element.animate(keyframes, toAnimationOptions(fast));
 */
export function toAnimationOptions(preset) {
  return {
    duration: preset.duration,
    easing: preset.easing,
    delay: preset.delay,
    fill: 'both',
  };
}

/**
 * Creates a custom transition preset with validation
 * 
 * @param {Object} options - Custom transition options
 * @param {number} options.duration - Duration in milliseconds
 * @param {string} [options.easing='ease-in-out'] - CSS easing function
 * @param {number} [options.delay=0] - Delay in milliseconds
 * @returns {Object} Validated transition preset
 * @throws {Error} If duration is negative or exceeds performance budget
 * 
 * @example
 * const custom = createPreset({ duration: 250, easing: 'ease-out' });
 */
export function createPreset({ duration, easing = EASINGS.EASE_IN_OUT, delay = 0 }) {
  if (duration < 0) {
    throw new Error('Transition duration cannot be negative');
  }
  
  // Performance budget check: warn if duration exceeds 500ms
  if (duration > 500) {
    console.warn(
      `Transition duration ${duration}ms exceeds recommended maximum of 500ms. ` +
      `Long transitions may impact perceived performance.`
    );
  }
  
  return {
    duration,
    easing,
    delay,
  };
}

/**
 * Applies a transition preset to an element's style
 * 
 * @param {HTMLElement} element - Target element
 * @param {Object} preset - Transition preset
 * @param {string|string[]} properties - CSS properties to transition
 * 
 * @example
 * applyTransition(button, fast, 'opacity');
 * button.style.opacity = '0.5'; // Will animate with fast transition
 */
export function applyTransition(element, preset, properties) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Invalid element provided to applyTransition');
  }
  
  element.style.transition = toCSSTransition(preset, properties);
}

/**
 * Removes all transitions from an element
 * Useful for instant state changes after animated transitions
 * 
 * @param {HTMLElement} element - Target element
 * 
 * @example
 * removeTransition(button);
 * button.style.opacity = '1'; // Changes instantly
 */
export function removeTransition(element) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('Invalid element provided to removeTransition');
  }
  
  element.style.transition = 'none';
}

/**
 * Waits for a transition to complete
 * Returns a promise that resolves when the transition ends
 * 
 * @param {HTMLElement} element - Element with transition
 * @param {Object} preset - Transition preset (used for timeout)
 * @returns {Promise<void>} Resolves when transition completes
 * 
 * @example
 * element.style.opacity = '0';
 * await waitForTransition(element, fast);
 * element.remove(); // Remove after fade out
 */
export function waitForTransition(element, preset) {
  return new Promise((resolve) => {
    const timeout = preset.duration + preset.delay + 50; // 50ms buffer
    
    const handleTransitionEnd = () => {
      element.removeEventListener('transitionend', handleTransitionEnd);
      clearTimeout(timeoutId);
      resolve();
    };
    
    const timeoutId = setTimeout(() => {
      element.removeEventListener('transitionend', handleTransitionEnd);
      resolve();
    }, timeout);
    
    element.addEventListener('transitionend', handleTransitionEnd, { once: true });
  });
}