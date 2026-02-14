/**
 * Motion utilities for Harmony Design System
 * Provides reduced motion support respecting user preferences
 * @module utils/motion
 * @see harmony-design/DESIGN_SYSTEM.md#reduced-motion-support
 */

/**
 * Checks if user prefers reduced motion
 * @returns {boolean} True if reduced motion is preferred
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Gets animation duration based on user preference
 * @param {number} normalDuration - Duration in ms for normal motion
 * @param {number} [reducedDuration=0] - Duration in ms for reduced motion (default: instant)
 * @returns {number} Appropriate duration in ms
 */
export function getAnimationDuration(normalDuration, reducedDuration = 0) {
  return prefersReducedMotion() ? reducedDuration : normalDuration;
}

/**
 * Gets easing function based on user preference
 * @param {string} normalEasing - Easing for normal motion (e.g., 'ease-out')
 * @param {string} [reducedEasing='linear'] - Easing for reduced motion
 * @returns {string} Appropriate easing function
 */
export function getAnimationEasing(normalEasing, reducedEasing = 'linear') {
  return prefersReducedMotion() ? reducedEasing : normalEasing;
}

/**
 * Creates a media query listener for reduced motion changes
 * @param {Function} callback - Called when preference changes with boolean parameter
 * @returns {Function} Cleanup function to remove listener
 */
export function onReducedMotionChange(callback) {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  const handler = (event) => {
    callback(event.matches);
  };
  
  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
  
  // Fallback for older browsers
  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
}

/**
 * CSS custom properties for motion
 * Applied to :root for consistent animation behavior
 */
export const MOTION_CSS_VARS = {
  '--motion-duration-instant': '0ms',
  '--motion-duration-fast': '150ms',
  '--motion-duration-normal': '250ms',
  '--motion-duration-slow': '400ms',
  '--motion-easing-standard': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  '--motion-easing-decelerate': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  '--motion-easing-accelerate': 'cubic-bezier(0.4, 0.0, 1, 1)',
};

/**
 * CSS custom properties for reduced motion
 * Override normal motion when user prefers reduced motion
 */
export const REDUCED_MOTION_CSS_VARS = {
  '--motion-duration-fast': '0ms',
  '--motion-duration-normal': '0ms',
  '--motion-duration-slow': '50ms', // Slight duration for state changes
  '--motion-easing-standard': 'linear',
  '--motion-easing-decelerate': 'linear',
  '--motion-easing-accelerate': 'linear',
};

/**
 * Applies motion CSS variables to document root
 * Automatically updates when user preference changes
 */
export function initializeMotionSupport() {
  const root = document.documentElement;
  
  // Apply base motion variables
  Object.entries(MOTION_CSS_VARS).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // Apply reduced motion overrides if needed
  const applyReducedMotion = (isReduced) => {
    if (isReduced) {
      Object.entries(REDUCED_MOTION_CSS_VARS).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      Object.entries(MOTION_CSS_VARS).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      root.removeAttribute('data-reduced-motion');
    }
  };
  
  // Initial application
  applyReducedMotion(prefersReducedMotion());
  
  // Listen for changes
  return onReducedMotionChange(applyReducedMotion);
}

/**
 * Web Animations API helper with reduced motion support
 * @param {Element} element - Element to animate
 * @param {Keyframe[]} keyframes - Animation keyframes
 * @param {KeyframeAnimationOptions} options - Animation options
 * @returns {Animation} Web Animation instance
 */
export function animate(element, keyframes, options) {
  const duration = typeof options.duration === 'number'
    ? getAnimationDuration(options.duration)
    : options.duration;
  
  const easing = typeof options.easing === 'string'
    ? getAnimationEasing(options.easing)
    : options.easing;
  
  return element.animate(keyframes, {
    ...options,
    duration,
    easing,
  });
}

/**
 * Transition helper for CSS transitions with reduced motion support
 * @param {Element} element - Element to transition
 * @param {Object} styles - CSS properties to transition
 * @param {Object} options - Transition options
 * @param {number} options.duration - Duration in ms
 * @param {string} [options.easing='ease'] - Easing function
 * @param {Function} [options.onComplete] - Callback when transition completes
 * @returns {Promise<void>} Resolves when transition completes
 */
export function transition(element, styles, options = {}) {
  const duration = getAnimationDuration(options.duration || 250);
  const easing = getAnimationEasing(options.easing || 'ease');
  
  return new Promise((resolve) => {
    if (duration === 0) {
      // Apply styles immediately for reduced motion
      Object.entries(styles).forEach(([prop, value]) => {
        element.style[prop] = value;
      });
      if (options.onComplete) options.onComplete();
      resolve();
      return;
    }
    
    // Set transition properties
    const properties = Object.keys(styles).join(', ');
    element.style.transition = `${properties} ${duration}ms ${easing}`;
    
    // Handle transition end
    const handleTransitionEnd = (event) => {
      if (event.target === element) {
        element.removeEventListener('transitionend', handleTransitionEnd);
        element.style.transition = '';
        if (options.onComplete) options.onComplete();
        resolve();
      }
    };
    
    element.addEventListener('transitionend', handleTransitionEnd);
    
    // Apply styles to trigger transition
    requestAnimationFrame(() => {
      Object.entries(styles).forEach(([prop, value]) => {
        element.style[prop] = value;
      });
    });
  });
}