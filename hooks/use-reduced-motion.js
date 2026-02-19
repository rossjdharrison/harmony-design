/**
 * @fileoverview useReducedMotion Hook - Respects prefers-reduced-motion media query
 * @module hooks/use-reduced-motion
 * 
 * Provides a reactive way to detect and respond to user's motion preferences.
 * Respects the prefers-reduced-motion media query for accessibility.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#accessibility-motion-preferences}
 */

/**
 * Creates a reactive hook for detecting reduced motion preferences
 * 
 * @returns {Object} Hook API
 * @returns {boolean} .prefersReducedMotion - Current reduced motion preference
 * @returns {Function} .subscribe - Subscribe to preference changes
 * @returns {Function} .cleanup - Cleanup listener
 * 
 * @example
 * const motionHook = useReducedMotion();
 * 
 * // Check current preference
 * if (motionHook.prefersReducedMotion) {
 *   element.style.transition = 'none';
 * }
 * 
 * // Subscribe to changes
 * const unsubscribe = motionHook.subscribe((prefersReduced) => {
 *   console.log('Motion preference changed:', prefersReduced);
 * });
 * 
 * // Cleanup when done
 * unsubscribe();
 * motionHook.cleanup();
 */
export function useReducedMotion() {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const subscribers = new Set();
  
  let currentPreference = mediaQuery.matches;

  /**
   * Handle media query changes
   * @param {MediaQueryListEvent} event - Media query change event
   */
  function handleChange(event) {
    currentPreference = event.matches;
    
    // Notify all subscribers
    subscribers.forEach(callback => {
      try {
        callback(currentPreference);
      } catch (error) {
        console.error('[useReducedMotion] Subscriber callback error:', error);
      }
    });
  }

  // Add listener (supports both old and new API)
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
  }

  return {
    /**
     * Current reduced motion preference
     * @type {boolean}
     */
    get prefersReducedMotion() {
      return currentPreference;
    },

    /**
     * Subscribe to preference changes
     * @param {Function} callback - Called when preference changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
      if (typeof callback !== 'function') {
        console.error('[useReducedMotion] Subscribe requires a callback function');
        return () => {};
      }

      subscribers.add(callback);

      // Return unsubscribe function
      return () => {
        subscribers.delete(callback);
      };
    },

    /**
     * Cleanup all listeners and subscribers
     */
    cleanup() {
      subscribers.clear();
      
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    }
  };
}

/**
 * Singleton instance for global access
 * Useful when you need a single source of truth across components
 */
let globalInstance = null;

/**
 * Get or create global singleton instance
 * @returns {Object} Global hook instance
 * 
 * @example
 * const motion = getGlobalReducedMotion();
 * if (motion.prefersReducedMotion) {
 *   // Disable animations
 * }
 */
export function getGlobalReducedMotion() {
  if (!globalInstance) {
    globalInstance = useReducedMotion();
  }
  return globalInstance;
}

/**
 * Helper function to get animation duration based on reduced motion preference
 * @param {number} normalDuration - Duration in ms for normal motion
 * @param {number} [reducedDuration=0] - Duration in ms for reduced motion (default: 0)
 * @returns {number} Appropriate duration based on user preference
 * 
 * @example
 * const duration = getAnimationDuration(300, 50);
 * element.style.transitionDuration = `${duration}ms`;
 */
export function getAnimationDuration(normalDuration, reducedDuration = 0) {
  const motion = getGlobalReducedMotion();
  return motion.prefersReducedMotion ? reducedDuration : normalDuration;
}

/**
 * Helper function to apply conditional animation class
 * @param {HTMLElement} element - Target element
 * @param {string} animationClass - Class to apply for animations
 * @param {string} [reducedClass=''] - Class to apply for reduced motion
 * 
 * @example
 * applyConditionalAnimation(button, 'fade-in', 'instant-appear');
 */
export function applyConditionalAnimation(element, animationClass, reducedClass = '') {
  const motion = getGlobalReducedMotion();
  
  if (motion.prefersReducedMotion && reducedClass) {
    element.classList.add(reducedClass);
    element.classList.remove(animationClass);
  } else if (!motion.prefersReducedMotion) {
    element.classList.add(animationClass);
    element.classList.remove(reducedClass);
  }
}