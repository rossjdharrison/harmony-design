/**
 * @fileoverview Animation design tokens for Harmony Design System
 * Defines timing, easing, and duration values for consistent motion.
 * See DESIGN_SYSTEM.md#design-tokens for usage patterns.
 */

/**
 * Duration tokens
 * Standard animation durations in milliseconds
 * @type {Object.<string, string>}
 */
export const duration = {
  instant: '0ms',
  fast: '150ms',
  normal: '250ms',
  slow: '350ms',
  slower: '500ms',
};

/**
 * Easing function tokens
 * Cubic bezier curves for natural motion
 * @type {Object.<string, string>}
 */
export const easing = {
  linear: 'cubic-bezier(0, 0, 1, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
};

/**
 * Transition tokens
 * Pre-configured transitions for common properties
 * @type {Object.<string, string>}
 */
export const transitions = {
  // Standard transitions
  all: `all ${duration.normal} ${easing.easeInOut}`,
  color: `color ${duration.fast} ${easing.easeInOut}`,
  background: `background-color ${duration.fast} ${easing.easeInOut}`,
  border: `border-color ${duration.fast} ${easing.easeInOut}`,
  opacity: `opacity ${duration.fast} ${easing.easeInOut}`,
  transform: `transform ${duration.normal} ${easing.easeOut}`,
  shadow: `box-shadow ${duration.normal} ${easing.easeInOut}`,
  
  // Combined transitions
  colorAndBackground: `color ${duration.fast} ${easing.easeInOut}, background-color ${duration.fast} ${easing.easeInOut}`,
  transformAndOpacity: `transform ${duration.normal} ${easing.easeOut}, opacity ${duration.fast} ${easing.easeInOut}`,
};

/**
 * Animation presets
 * Keyframe animation configurations
 * @type {Object.<string, Object>}
 */
export const animations = {
  fadeIn: {
    keyframes: 'fadeIn',
    duration: duration.normal,
    easing: easing.easeOut,
    fillMode: 'forwards',
  },
  fadeOut: {
    keyframes: 'fadeOut',
    duration: duration.normal,
    easing: easing.easeIn,
    fillMode: 'forwards',
  },
  slideInUp: {
    keyframes: 'slideInUp',
    duration: duration.normal,
    easing: easing.easeOut,
    fillMode: 'forwards',
  },
  slideInDown: {
    keyframes: 'slideInDown',
    duration: duration.normal,
    easing: easing.easeOut,
    fillMode: 'forwards',
  },
  scaleIn: {
    keyframes: 'scaleIn',
    duration: duration.fast,
    easing: easing.easeOut,
    fillMode: 'forwards',
  },
  spin: {
    keyframes: 'spin',
    duration: '1000ms',
    easing: easing.linear,
    iterationCount: 'infinite',
  },
};