/**
 * @fileoverview Reduced Motion Mode - Respects prefers-reduced-motion and provides alternatives
 * @module utils/reduced-motion
 * 
 * Provides utilities for detecting user motion preferences and applying appropriate
 * animation alternatives. Ensures accessibility for users with vestibular disorders.
 * 
 * Related: animations/motion-variants.js, animations/transition-presets.js
 * Documentation: DESIGN_SYSTEM.md#reduced-motion-mode
 */

/**
 * Motion preference states
 * @enum {string}
 */
export const MotionPreference = {
  NO_PREFERENCE: 'no-preference',
  REDUCE: 'reduce',
};

/**
 * Animation alternatives for reduced motion
 * @enum {string}
 */
export const MotionAlternative = {
  NONE: 'none',
  FADE: 'fade',
  INSTANT: 'instant',
  MINIMAL: 'minimal',
};

/**
 * Detects if user prefers reduced motion
 * @returns {boolean} True if reduced motion is preferred
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Creates a media query listener for motion preference changes
 * @param {Function} callback - Called when preference changes
 * @returns {Function} Cleanup function to remove listener
 */
export function watchMotionPreference(callback) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  const handler = (event) => {
    callback(event.matches ? MotionPreference.REDUCE : MotionPreference.NO_PREFERENCE);
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
 * Gets appropriate animation duration based on motion preference
 * @param {number} defaultDuration - Default duration in milliseconds
 * @param {number} [reducedDuration=0] - Duration for reduced motion (default: 0)
 * @returns {number} Appropriate duration
 */
export function getMotionDuration(defaultDuration, reducedDuration = 0) {
  return prefersReducedMotion() ? reducedDuration : defaultDuration;
}

/**
 * Gets appropriate animation alternative based on motion preference
 * @param {string} defaultAnimation - Default animation name/type
 * @param {string} [alternative=MotionAlternative.FADE] - Alternative for reduced motion
 * @returns {string} Appropriate animation type
 */
export function getMotionAlternative(defaultAnimation, alternative = MotionAlternative.FADE) {
  return prefersReducedMotion() ? alternative : defaultAnimation;
}

/**
 * Applies reduced motion styles to an element
 * @param {HTMLElement} element - Target element
 * @param {Object} options - Configuration options
 * @param {boolean} [options.disableTransitions=true] - Disable CSS transitions
 * @param {boolean} [options.disableAnimations=true] - Disable CSS animations
 * @param {boolean} [options.disableScrollBehavior=true] - Disable smooth scroll
 */
export function applyReducedMotion(element, options = {}) {
  const {
    disableTransitions = true,
    disableAnimations = true,
    disableScrollBehavior = true,
  } = options;
  
  if (!element || !prefersReducedMotion()) {
    return;
  }
  
  if (disableTransitions) {
    element.style.transition = 'none';
  }
  
  if (disableAnimations) {
    element.style.animation = 'none';
  }
  
  if (disableScrollBehavior) {
    element.style.scrollBehavior = 'auto';
  }
}

/**
 * Creates a motion-safe animation configuration
 * @param {Object} config - Animation configuration
 * @param {number} config.duration - Animation duration in ms
 * @param {string} config.easing - Animation easing function
 * @param {Object} [config.transform] - Transform properties
 * @param {Object} [config.reducedMotion] - Reduced motion alternatives
 * @returns {Object} Motion-safe configuration
 */
export function createMotionSafeConfig(config) {
  if (!prefersReducedMotion()) {
    return config;
  }
  
  const reduced = config.reducedMotion || {};
  
  return {
    duration: reduced.duration !== undefined ? reduced.duration : 0,
    easing: reduced.easing || 'linear',
    transform: reduced.transform || {},
    opacity: reduced.opacity !== undefined ? reduced.opacity : config.opacity,
  };
}

/**
 * Web Animations API wrapper with reduced motion support
 * @param {HTMLElement} element - Target element
 * @param {Array<Object>} keyframes - Animation keyframes
 * @param {Object} options - Animation options
 * @returns {Animation|null} Animation instance or null if reduced motion
 */
export function animateWithMotionSupport(element, keyframes, options) {
  if (!element || !element.animate) {
    return null;
  }
  
  if (prefersReducedMotion()) {
    // Apply final state immediately
    const finalKeyframe = keyframes[keyframes.length - 1];
    Object.assign(element.style, finalKeyframe);
    return null;
  }
  
  return element.animate(keyframes, options);
}

/**
 * Transition helper with reduced motion support
 * @param {HTMLElement} element - Target element
 * @param {Object} properties - CSS properties to transition
 * @param {number} duration - Transition duration in ms
 * @param {string} [easing='ease'] - Easing function
 * @returns {Promise<void>} Resolves when transition completes
 */
export function transitionWithMotionSupport(element, properties, duration, easing = 'ease') {
  if (!element) {
    return Promise.resolve();
  }
  
  if (prefersReducedMotion()) {
    // Apply properties immediately
    Object.assign(element.style, properties);
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    const transitionProps = Object.keys(properties).join(', ');
    element.style.transition = `${transitionProps} ${duration}ms ${easing}`;
    
    const handleTransitionEnd = () => {
      element.removeEventListener('transitionend', handleTransitionEnd);
      resolve();
    };
    
    element.addEventListener('transitionend', handleTransitionEnd);
    Object.assign(element.style, properties);
    
    // Fallback timeout
    setTimeout(() => {
      element.removeEventListener('transitionend', handleTransitionEnd);
      resolve();
    }, duration + 50);
  });
}

/**
 * Scroll helper with reduced motion support
 * @param {HTMLElement|Window} target - Scroll target
 * @param {Object} options - Scroll options
 * @param {number} [options.top] - Vertical scroll position
 * @param {number} [options.left] - Horizontal scroll position
 * @param {string} [options.behavior='smooth'] - Scroll behavior
 */
export function scrollWithMotionSupport(target, options) {
  if (!target) {
    return;
  }
  
  const scrollOptions = {
    ...options,
    behavior: prefersReducedMotion() ? 'auto' : (options.behavior || 'smooth'),
  };
  
  if (target.scrollTo) {
    target.scrollTo(scrollOptions);
  }
}

/**
 * Global reduced motion class manager
 * Adds/removes class on document root based on preference
 */
export class ReducedMotionManager {
  constructor() {
    this.className = 'prefers-reduced-motion';
    this.cleanup = null;
    this.initialized = false;
  }
  
  /**
   * Initializes the manager and starts watching preferences
   */
  init() {
    if (this.initialized) {
      return;
    }
    
    this.updateClass();
    this.cleanup = watchMotionPreference(() => this.updateClass());
    this.initialized = true;
  }
  
  /**
   * Updates the document root class based on current preference
   */
  updateClass() {
    if (typeof document === 'undefined') {
      return;
    }
    
    const root = document.documentElement;
    if (prefersReducedMotion()) {
      root.classList.add(this.className);
    } else {
      root.classList.remove(this.className);
    }
  }
  
  /**
   * Cleans up listeners and removes class
   */
  destroy() {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
    
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove(this.className);
    }
    
    this.initialized = false;
  }
}

// Singleton instance
let managerInstance = null;

/**
 * Gets or creates the global reduced motion manager
 * @returns {ReducedMotionManager} Manager instance
 */
export function getReducedMotionManager() {
  if (!managerInstance) {
    managerInstance = new ReducedMotionManager();
  }
  return managerInstance;
}

/**
 * Initializes global reduced motion support
 * Should be called once during app initialization
 */
export function initReducedMotionSupport() {
  const manager = getReducedMotionManager();
  manager.init();
}