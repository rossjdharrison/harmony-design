/**
 * @fileoverview Gesture Animations: Hover, tap, drag gesture animation configs
 * @module animations/gesture-animations
 * 
 * Provides animation configurations for common user gesture interactions.
 * Optimized for 60fps performance (16ms render budget).
 * 
 * Related: animations/motion-variants.js, animations/transition-presets.js
 * Documentation: DESIGN_SYSTEM.md § Animations > Gesture Animations
 */

import { TRANSITION_PRESETS } from './transition-presets.js';

/**
 * Hover gesture animation configurations
 * Applied when pointer enters/leaves interactive elements
 * 
 * @type {Object.<string, {enter: Object, exit: Object}>}
 */
export const HOVER_ANIMATIONS = {
  // Subtle scale increase for buttons and cards
  scale: {
    enter: {
      transform: 'scale(1.05)',
      transition: TRANSITION_PRESETS.snappy
    },
    exit: {
      transform: 'scale(1)',
      transition: TRANSITION_PRESETS.snappy
    }
  },

  // Lift effect with shadow for elevated components
  lift: {
    enter: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: TRANSITION_PRESETS.smooth
    },
    exit: {
      transform: 'translateY(0)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      transition: TRANSITION_PRESETS.smooth
    }
  },

  // Brightness change for media elements
  brighten: {
    enter: {
      filter: 'brightness(1.1)',
      transition: TRANSITION_PRESETS.instant
    },
    exit: {
      filter: 'brightness(1)',
      transition: TRANSITION_PRESETS.smooth
    }
  },

  // Underline expansion for text links
  underline: {
    enter: {
      textDecoration: 'underline',
      textUnderlineOffset: '4px',
      transition: TRANSITION_PRESETS.snappy
    },
    exit: {
      textDecoration: 'none',
      transition: TRANSITION_PRESETS.snappy
    }
  },

  // Glow effect for primary actions
  glow: {
    enter: {
      boxShadow: '0 0 16px var(--color-primary-alpha-50)',
      transition: TRANSITION_PRESETS.smooth
    },
    exit: {
      boxShadow: 'none',
      transition: TRANSITION_PRESETS.smooth
    }
  }
};

/**
 * Tap/Click gesture animation configurations
 * Applied during active press state
 * 
 * @type {Object.<string, {press: Object, release: Object}>}
 */
export const TAP_ANIMATIONS = {
  // Scale down for tactile feedback
  shrink: {
    press: {
      transform: 'scale(0.95)',
      transition: TRANSITION_PRESETS.instant
    },
    release: {
      transform: 'scale(1)',
      transition: TRANSITION_PRESETS.snappy
    }
  },

  // Push down effect for buttons
  push: {
    press: {
      transform: 'translateY(2px)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
      transition: TRANSITION_PRESETS.instant
    },
    release: {
      transform: 'translateY(0)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      transition: TRANSITION_PRESETS.snappy
    }
  },

  // Ripple effect (requires additional element)
  ripple: {
    press: {
      opacity: 1,
      transform: 'scale(0)',
      transition: TRANSITION_PRESETS.instant
    },
    release: {
      opacity: 0,
      transform: 'scale(4)',
      transition: TRANSITION_PRESETS.smooth
    }
  },

  // Brightness flash for immediate feedback
  flash: {
    press: {
      filter: 'brightness(0.9)',
      transition: TRANSITION_PRESETS.instant
    },
    release: {
      filter: 'brightness(1)',
      transition: TRANSITION_PRESETS.snappy
    }
  }
};

/**
 * Drag gesture animation configurations
 * Applied during drag operations (faders, knobs, timeline)
 * 
 * @type {Object.<string, Object>}
 */
export const DRAG_ANIMATIONS = {
  // Cursor changes and visual feedback
  active: {
    cursor: 'grabbing',
    userSelect: 'none',
    transition: TRANSITION_PRESETS.instant
  },

  // Elevation during drag
  elevated: {
    transform: 'scale(1.05)',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
    transition: TRANSITION_PRESETS.instant
  },

  // Subtle glow for draggable items
  dragging: {
    opacity: 0.8,
    filter: 'brightness(1.1)',
    transition: TRANSITION_PRESETS.instant
  },

  // Ghost/placeholder for drag source
  ghost: {
    opacity: 0.4,
    pointerEvents: 'none',
    transition: TRANSITION_PRESETS.instant
  },

  // Drop target highlight
  dropTarget: {
    backgroundColor: 'var(--color-primary-alpha-10)',
    outline: '2px dashed var(--color-primary)',
    outlineOffset: '2px',
    transition: TRANSITION_PRESETS.snappy
  }
};

/**
 * Combined gesture state machine
 * Tracks current gesture state and applies appropriate animations
 * 
 * @type {Object.<string, Object.<string, Object>>}
 */
export const GESTURE_STATES = {
  idle: {
    transform: 'none',
    opacity: 1,
    cursor: 'pointer'
  },
  hover: {
    // Applied from HOVER_ANIMATIONS based on component type
  },
  active: {
    // Applied from TAP_ANIMATIONS based on component type
  },
  dragging: {
    // Applied from DRAG_ANIMATIONS based on component type
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none',
    transition: TRANSITION_PRESETS.smooth
  }
};

/**
 * Apply gesture animation to element
 * Handles transition between gesture states with proper cleanup
 * 
 * @param {HTMLElement} element - Target element
 * @param {string} gestureType - 'hover' | 'tap' | 'drag'
 * @param {string} variant - Animation variant name
 * @param {string} state - 'enter' | 'exit' | 'press' | 'release' | 'active'
 * @returns {void}
 * 
 * @example
 * applyGestureAnimation(button, 'hover', 'scale', 'enter');
 * applyGestureAnimation(button, 'tap', 'shrink', 'press');
 */
export function applyGestureAnimation(element, gestureType, variant, state) {
  if (!element) return;

  let animationConfig;
  
  switch (gestureType) {
    case 'hover':
      animationConfig = HOVER_ANIMATIONS[variant]?.[state];
      break;
    case 'tap':
      animationConfig = TAP_ANIMATIONS[variant]?.[state];
      break;
    case 'drag':
      animationConfig = DRAG_ANIMATIONS[variant];
      break;
    default:
      console.warn(`Unknown gesture type: ${gestureType}`);
      return;
  }

  if (!animationConfig) {
    console.warn(`Animation config not found: ${gestureType}.${variant}.${state}`);
    return;
  }

  // Apply styles with performance optimization
  requestAnimationFrame(() => {
    Object.entries(animationConfig).forEach(([property, value]) => {
      element.style[property] = value;
    });
  });
}

/**
 * Create gesture animation controller for an element
 * Returns object with methods to handle gesture lifecycle
 * 
 * @param {HTMLElement} element - Target element
 * @param {Object} config - Animation configuration
 * @param {string} [config.hover] - Hover variant name
 * @param {string} [config.tap] - Tap variant name
 * @param {string} [config.drag] - Drag variant name
 * @param {boolean} [config.disabled=false] - Disabled state
 * @returns {Object} Controller with gesture methods
 * 
 * @example
 * const controller = createGestureController(button, {
 *   hover: 'scale',
 *   tap: 'shrink'
 * });
 * button.addEventListener('mouseenter', controller.onHoverEnter);
 * button.addEventListener('mouseleave', controller.onHoverExit);
 */
export function createGestureController(element, config) {
  const { hover, tap, drag, disabled = false } = config;
  
  let currentState = disabled ? 'disabled' : 'idle';
  let isDragging = false;

  return {
    onHoverEnter() {
      if (disabled || isDragging) return;
      currentState = 'hover';
      if (hover) {
        applyGestureAnimation(element, 'hover', hover, 'enter');
      }
    },

    onHoverExit() {
      if (disabled || isDragging) return;
      currentState = 'idle';
      if (hover) {
        applyGestureAnimation(element, 'hover', hover, 'exit');
      }
    },

    onTapPress() {
      if (disabled) return;
      currentState = 'active';
      if (tap) {
        applyGestureAnimation(element, 'tap', tap, 'press');
      }
    },

    onTapRelease() {
      if (disabled) return;
      currentState = 'idle';
      if (tap) {
        applyGestureAnimation(element, 'tap', tap, 'release');
      }
    },

    onDragStart() {
      if (disabled) return;
      isDragging = true;
      currentState = 'dragging';
      if (drag) {
        applyGestureAnimation(element, 'drag', drag, 'active');
      }
    },

    onDragEnd() {
      if (disabled) return;
      isDragging = false;
      currentState = 'idle';
      // Reset to idle state
      element.style.transform = '';
      element.style.cursor = '';
    },

    setDisabled(isDisabled) {
      disabled = isDisabled;
      currentState = isDisabled ? 'disabled' : 'idle';
      
      if (isDisabled) {
        Object.entries(GESTURE_STATES.disabled).forEach(([property, value]) => {
          element.style[property] = value;
        });
      } else {
        // Reset to idle
        element.style.opacity = '';
        element.style.cursor = '';
        element.style.pointerEvents = '';
      }
    },

    getCurrentState() {
      return currentState;
    },

    destroy() {
      // Cleanup: remove all inline styles
      element.style.transform = '';
      element.style.opacity = '';
      element.style.cursor = '';
      element.style.transition = '';
    }
  };
}

/**
 * Attach gesture animations to element with auto-cleanup
 * Convenience function that sets up all event listeners
 * 
 * @param {HTMLElement} element - Target element
 * @param {Object} config - Animation configuration
 * @returns {Function} Cleanup function to remove listeners
 * 
 * @example
 * const cleanup = attachGestureAnimations(button, {
 *   hover: 'lift',
 *   tap: 'shrink'
 * });
 * // Later: cleanup();
 */
export function attachGestureAnimations(element, config) {
  const controller = createGestureController(element, config);

  // Add event listeners
  element.addEventListener('mouseenter', controller.onHoverEnter);
  element.addEventListener('mouseleave', controller.onHoverExit);
  element.addEventListener('mousedown', controller.onTapPress);
  element.addEventListener('mouseup', controller.onTapRelease);
  
  if (config.drag) {
    element.addEventListener('dragstart', controller.onDragStart);
    element.addEventListener('dragend', controller.onDragEnd);
  }

  // Return cleanup function
  return () => {
    element.removeEventListener('mouseenter', controller.onHoverEnter);
    element.removeEventListener('mouseleave', controller.onHoverExit);
    element.removeEventListener('mousedown', controller.onTapPress);
    element.removeEventListener('mouseup', controller.onTapRelease);
    
    if (config.drag) {
      element.removeEventListener('dragstart', controller.onDragStart);
      element.removeEventListener('dragend', controller.onDragEnd);
    }
    
    controller.destroy();
  };
}