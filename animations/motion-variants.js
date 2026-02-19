/**
 * @fileoverview Motion Variants - Reusable animation variants for Harmony Design System
 * @module animations/motion-variants
 * 
 * Provides standardized animation variants that maintain 60fps performance (16ms budget).
 * All animations use GPU-accelerated properties (transform, opacity) and respect
 * user's prefers-reduced-motion settings.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#motion-variants}
 */

/**
 * @typedef {Object} AnimationConfig
 * @property {number} duration - Animation duration in milliseconds
 * @property {string} easing - CSS easing function
 * @property {number} [delay=0] - Animation delay in milliseconds
 * @property {string} [fill='both'] - Animation fill mode
 */

/**
 * @typedef {Object} MotionVariant
 * @property {Keyframe[]} keyframes - Web Animations API keyframes
 * @property {AnimationConfig} config - Animation configuration
 */

/**
 * Default animation durations (in milliseconds)
 * Tuned for perceived smoothness while respecting 16ms render budget
 */
export const DURATIONS = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800
};

/**
 * Standard easing functions
 * Using CSS cubic-bezier for predictable GPU acceleration
 */
export const EASINGS = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Approximates spring physics
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

/**
 * Checks if user prefers reduced motion
 * @returns {boolean} True if reduced motion is preferred
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Creates a reduced motion version of animation config
 * @param {AnimationConfig} config - Original animation config
 * @returns {AnimationConfig} Reduced motion config (instant duration, no easing)
 */
function reduceMotion(config) {
  return {
    ...config,
    duration: 0,
    easing: EASINGS.linear
  };
}

/**
 * Fade In Variant
 * Animates element from transparent to opaque
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.normal] - Animation duration
 * @param {string} [options.easing=EASINGS.easeOut] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.from=0] - Starting opacity (0-1)
 * @param {number} [options.to=1] - Ending opacity (0-1)
 * @returns {MotionVariant} Animation variant
 */
export function fadeIn(options = {}) {
  const {
    duration = DURATIONS.normal,
    easing = EASINGS.easeOut,
    delay = 0,
    from = 0,
    to = 1
  } = options;

  const keyframes = [
    { opacity: from },
    { opacity: to }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Fade Out Variant
 * Animates element from opaque to transparent
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.normal] - Animation duration
 * @param {string} [options.easing=EASINGS.easeIn] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.from=1] - Starting opacity (0-1)
 * @param {number} [options.to=0] - Ending opacity (0-1)
 * @returns {MotionVariant} Animation variant
 */
export function fadeOut(options = {}) {
  const {
    duration = DURATIONS.normal,
    easing = EASINGS.easeIn,
    delay = 0,
    from = 1,
    to = 0
  } = options;

  const keyframes = [
    { opacity: from },
    { opacity: to }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Slide Up Variant
 * Animates element sliding upward with fade in
 * Uses transform for GPU acceleration
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.normal] - Animation duration
 * @param {string} [options.easing=EASINGS.easeOut] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.distance=20] - Distance to slide in pixels
 * @param {number} [options.fromOpacity=0] - Starting opacity (0-1)
 * @param {number} [options.toOpacity=1] - Ending opacity (0-1)
 * @returns {MotionVariant} Animation variant
 */
export function slideUp(options = {}) {
  const {
    duration = DURATIONS.normal,
    easing = EASINGS.easeOut,
    delay = 0,
    distance = 20,
    fromOpacity = 0,
    toOpacity = 1
  } = options;

  const keyframes = [
    { 
      transform: `translateY(${distance}px)`,
      opacity: fromOpacity
    },
    { 
      transform: 'translateY(0)',
      opacity: toOpacity
    }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Slide Down Variant
 * Animates element sliding downward with fade in
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.normal] - Animation duration
 * @param {string} [options.easing=EASINGS.easeOut] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.distance=20] - Distance to slide in pixels
 * @param {number} [options.fromOpacity=0] - Starting opacity (0-1)
 * @param {number} [options.toOpacity=1] - Ending opacity (0-1)
 * @returns {MotionVariant} Animation variant
 */
export function slideDown(options = {}) {
  const {
    duration = DURATIONS.normal,
    easing = EASINGS.easeOut,
    delay = 0,
    distance = 20,
    fromOpacity = 0,
    toOpacity = 1
  } = options;

  const keyframes = [
    { 
      transform: `translateY(-${distance}px)`,
      opacity: fromOpacity
    },
    { 
      transform: 'translateY(0)',
      opacity: toOpacity
    }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Slide Left Variant
 * Animates element sliding from right to left with fade in
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.normal] - Animation duration
 * @param {string} [options.easing=EASINGS.easeOut] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.distance=20] - Distance to slide in pixels
 * @param {number} [options.fromOpacity=0] - Starting opacity (0-1)
 * @param {number} [options.toOpacity=1] - Ending opacity (0-1)
 * @returns {MotionVariant} Animation variant
 */
export function slideLeft(options = {}) {
  const {
    duration = DURATIONS.normal,
    easing = EASINGS.easeOut,
    delay = 0,
    distance = 20,
    fromOpacity = 0,
    toOpacity = 1
  } = options;

  const keyframes = [
    { 
      transform: `translateX(${distance}px)`,
      opacity: fromOpacity
    },
    { 
      transform: 'translateX(0)',
      opacity: toOpacity
    }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Slide Right Variant
 * Animates element sliding from left to right with fade in
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.normal] - Animation duration
 * @param {string} [options.easing=EASINGS.easeOut] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.distance=20] - Distance to slide in pixels
 * @param {number} [options.fromOpacity=0] - Starting opacity (0-1)
 * @param {number} [options.toOpacity=1] - Ending opacity (0-1)
 * @returns {MotionVariant} Animation variant
 */
export function slideRight(options = {}) {
  const {
    duration = DURATIONS.normal,
    easing = EASINGS.easeOut,
    delay = 0,
    distance = 20,
    fromOpacity = 0,
    toOpacity = 1
  } = options;

  const keyframes = [
    { 
      transform: `translateX(-${distance}px)`,
      opacity: fromOpacity
    },
    { 
      transform: 'translateX(0)',
      opacity: toOpacity
    }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Scale Variant
 * Animates element scaling with fade
 * Uses transform: scale() for GPU acceleration
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.normal] - Animation duration
 * @param {string} [options.easing=EASINGS.easeOut] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.from=0.8] - Starting scale (0-1+)
 * @param {number} [options.to=1] - Ending scale (0-1+)
 * @param {number} [options.fromOpacity=0] - Starting opacity (0-1)
 * @param {number} [options.toOpacity=1] - Ending opacity (0-1)
 * @returns {MotionVariant} Animation variant
 */
export function scale(options = {}) {
  const {
    duration = DURATIONS.normal,
    easing = EASINGS.easeOut,
    delay = 0,
    from = 0.8,
    to = 1,
    fromOpacity = 0,
    toOpacity = 1
  } = options;

  const keyframes = [
    { 
      transform: `scale(${from})`,
      opacity: fromOpacity
    },
    { 
      transform: `scale(${to})`,
      opacity: toOpacity
    }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Spring Variant
 * Animates element with spring-like physics simulation
 * Uses spring easing for natural bounce effect
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.slow] - Animation duration
 * @param {string} [options.easing=EASINGS.spring] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.fromScale=0.8] - Starting scale (0-1+)
 * @param {number} [options.toScale=1] - Ending scale (0-1+)
 * @param {number} [options.fromOpacity=0] - Starting opacity (0-1)
 * @param {number} [options.toOpacity=1] - Ending opacity (0-1)
 * @returns {MotionVariant} Animation variant
 */
export function spring(options = {}) {
  const {
    duration = DURATIONS.slow,
    easing = EASINGS.spring,
    delay = 0,
    fromScale = 0.8,
    toScale = 1,
    fromOpacity = 0,
    toOpacity = 1
  } = options;

  const keyframes = [
    { 
      transform: `scale(${fromScale})`,
      opacity: fromOpacity
    },
    { 
      transform: `scale(${toScale})`,
      opacity: toOpacity
    }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Bounce Variant
 * Animates element with bounce effect
 * 
 * @param {Object} options - Animation options
 * @param {number} [options.duration=DURATIONS.slow] - Animation duration
 * @param {string} [options.easing=EASINGS.bounce] - Easing function
 * @param {number} [options.delay=0] - Animation delay
 * @param {number} [options.fromScale=0] - Starting scale (0-1+)
 * @param {number} [options.toScale=1] - Ending scale (0-1+)
 * @returns {MotionVariant} Animation variant
 */
export function bounce(options = {}) {
  const {
    duration = DURATIONS.slow,
    easing = EASINGS.bounce,
    delay = 0,
    fromScale = 0,
    toScale = 1
  } = options;

  const keyframes = [
    { transform: `scale(${fromScale})` },
    { transform: `scale(${toScale})` }
  ];

  const config = {
    duration,
    easing,
    delay,
    fill: 'both'
  };

  return {
    keyframes,
    config: prefersReducedMotion() ? reduceMotion(config) : config
  };
}

/**
 * Applies a motion variant to an element
 * Returns Animation instance for control (play, pause, cancel, etc.)
 * 
 * @param {HTMLElement} element - Target element
 * @param {MotionVariant} variant - Motion variant to apply
 * @returns {Animation} Web Animations API Animation instance
 * 
 * @example
 * const element = document.querySelector('.my-element');
 * const animation = applyMotion(element, fadeIn({ duration: 300 }));
 * animation.onfinish = () => console.log('Animation complete');
 */
export function applyMotion(element, variant) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('applyMotion: element must be a valid HTMLElement');
  }

  if (!variant || !variant.keyframes || !variant.config) {
    throw new Error('applyMotion: variant must have keyframes and config');
  }

  return element.animate(variant.keyframes, variant.config);
}

/**
 * Stagger animation helper
 * Applies motion variant to multiple elements with incremental delays
 * 
 * @param {HTMLElement[]} elements - Array of elements to animate
 * @param {MotionVariant} variant - Motion variant to apply
 * @param {number} [staggerDelay=50] - Delay between each element in ms
 * @returns {Animation[]} Array of Animation instances
 * 
 * @example
 * const items = document.querySelectorAll('.list-item');
 * staggerMotion(Array.from(items), slideUp(), 100);
 */
export function staggerMotion(elements, variant, staggerDelay = 50) {
  if (!Array.isArray(elements)) {
    throw new Error('staggerMotion: elements must be an array');
  }

  return elements.map((element, index) => {
    const staggeredVariant = {
      keyframes: variant.keyframes,
      config: {
        ...variant.config,
        delay: (variant.config.delay || 0) + (index * staggerDelay)
      }
    };
    return applyMotion(element, staggeredVariant);
  });
}

/**
 * Sequence animation helper
 * Chains multiple animations on same element
 * 
 * @param {HTMLElement} element - Target element
 * @param {MotionVariant[]} variants - Array of motion variants to apply in sequence
 * @returns {Promise<void>} Resolves when all animations complete
 * 
 * @example
 * await sequenceMotion(element, [
 *   fadeIn({ duration: 200 }),
 *   scale({ from: 1, to: 1.1, duration: 100 }),
 *   scale({ from: 1.1, to: 1, duration: 100 })
 * ]);
 */
export async function sequenceMotion(element, variants) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('sequenceMotion: element must be a valid HTMLElement');
  }

  if (!Array.isArray(variants)) {
    throw new Error('sequenceMotion: variants must be an array');
  }

  for (const variant of variants) {
    const animation = applyMotion(element, variant);
    await animation.finished;
  }
}

/**
 * Parallel animation helper
 * Runs multiple animations simultaneously
 * 
 * @param {HTMLElement} element - Target element
 * @param {MotionVariant[]} variants - Array of motion variants to apply in parallel
 * @returns {Promise<void>} Resolves when all animations complete
 * 
 * @example
 * await parallelMotion(element, [
 *   fadeIn({ duration: 300 }),
 *   slideUp({ duration: 300 })
 * ]);
 */
export async function parallelMotion(element, variants) {
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('parallelMotion: element must be a valid HTMLElement');
  }

  if (!Array.isArray(variants)) {
    throw new Error('parallelMotion: variants must be an array');
  }

  const animations = variants.map(variant => applyMotion(element, variant));
  await Promise.all(animations.map(anim => anim.finished));
}