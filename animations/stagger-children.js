/**
 * @fileoverview Stagger Children Utility
 * @module animations/stagger-children
 * 
 * Provides utilities for creating staggered animations on child elements.
 * Useful for list animations, cascading reveals, and sequential transitions.
 * 
 * Performance: Uses requestAnimationFrame and GPU-accelerated properties.
 * Respects prefers-reduced-motion.
 * 
 * Related: See DESIGN_SYSTEM.md § Animations > Stagger Children
 * Related: animations/motion-variants.js for base animation variants
 * Related: animations/transition-presets.js for timing functions
 */

import { MOTION_VARIANTS } from './motion-variants.js';
import { TRANSITION_PRESETS } from './transition-presets.js';

/**
 * @typedef {Object} StaggerConfig
 * @property {number} [delay=50] - Delay between each child animation in milliseconds
 * @property {string} [direction='forward'] - Animation direction: 'forward' | 'reverse' | 'center-out' | 'edges-in'
 * @property {string} [variant='fadeInUp'] - Motion variant to apply from MOTION_VARIANTS
 * @property {string} [preset='smooth'] - Transition preset from TRANSITION_PRESETS
 * @property {number} [duration=300] - Duration of each child animation in milliseconds
 * @property {boolean} [respectReducedMotion=true] - Whether to respect prefers-reduced-motion
 * @property {Function} [onChildStart] - Callback when each child animation starts
 * @property {Function} [onChildComplete] - Callback when each child animation completes
 * @property {Function} [onComplete] - Callback when all animations complete
 */

/**
 * Checks if user prefers reduced motion
 * @returns {boolean} True if reduced motion is preferred
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Calculates stagger order based on direction
 * @param {number} index - Child index
 * @param {number} total - Total number of children
 * @param {string} direction - Stagger direction
 * @returns {number} Calculated order for stagger
 */
function calculateStaggerOrder(index, total, direction) {
  switch (direction) {
    case 'reverse':
      return total - index - 1;
    case 'center-out': {
      const center = Math.floor(total / 2);
      return Math.abs(index - center);
    }
    case 'edges-in': {
      const center = Math.floor(total / 2);
      return center - Math.abs(index - center);
    }
    case 'forward':
    default:
      return index;
  }
}

/**
 * Applies staggered animation to child elements
 * @param {HTMLElement} container - Parent container element
 * @param {StaggerConfig} config - Stagger configuration
 * @returns {Promise<void>} Resolves when all animations complete
 */
export async function staggerChildren(container, config = {}) {
  const {
    delay = 50,
    direction = 'forward',
    variant = 'fadeInUp',
    preset = 'smooth',
    duration = 300,
    respectReducedMotion = true,
    onChildStart,
    onChildComplete,
    onComplete
  } = config;

  // Check for reduced motion preference
  if (respectReducedMotion && prefersReducedMotion()) {
    // Skip animations but ensure elements are visible
    const children = Array.from(container.children);
    children.forEach(child => {
      child.style.opacity = '1';
      child.style.transform = 'none';
    });
    if (onComplete) onComplete();
    return Promise.resolve();
  }

  const children = Array.from(container.children);
  const total = children.length;

  if (total === 0) {
    if (onComplete) onComplete();
    return Promise.resolve();
  }

  // Get motion variant and transition preset
  const motionVariant = MOTION_VARIANTS[variant] || MOTION_VARIANTS.fadeInUp;
  const transition = TRANSITION_PRESETS[preset] || TRANSITION_PRESETS.smooth;

  // Create animation promises for all children
  const animationPromises = children.map((child, index) => {
    return new Promise(resolve => {
      const order = calculateStaggerOrder(index, total, direction);
      const staggerDelay = order * delay;

      // Apply initial state
      Object.assign(child.style, {
        ...motionVariant.initial,
        transition: 'none'
      });

      // Force reflow to ensure initial state is applied
      child.offsetHeight;

      // Schedule animation
      setTimeout(() => {
        if (onChildStart) onChildStart(child, index);

        // Apply transition
        child.style.transition = `all ${duration}ms ${transition}`;

        // Apply animate state
        requestAnimationFrame(() => {
          Object.assign(child.style, motionVariant.animate);

          // Listen for transition end
          const handleTransitionEnd = (e) => {
            if (e.target === child && e.propertyName === 'opacity') {
              child.removeEventListener('transitionend', handleTransitionEnd);
              if (onChildComplete) onChildComplete(child, index);
              resolve();
            }
          };

          child.addEventListener('transitionend', handleTransitionEnd);

          // Fallback timeout in case transitionend doesn't fire
          setTimeout(() => {
            child.removeEventListener('transitionend', handleTransitionEnd);
            resolve();
          }, duration + 50);
        });
      }, staggerDelay);
    });
  });

  // Wait for all animations to complete
  await Promise.all(animationPromises);
  if (onComplete) onComplete();
}

/**
 * Creates a reusable stagger controller for dynamic lists
 * @param {HTMLElement} container - Parent container element
 * @param {StaggerConfig} config - Stagger configuration
 * @returns {Object} Controller with methods to animate children
 */
export function createStaggerController(container, config = {}) {
  let isAnimating = false;
  let animationPromise = null;

  return {
    /**
     * Animates current children
     * @returns {Promise<void>}
     */
    async animate() {
      if (isAnimating) {
        return animationPromise;
      }

      isAnimating = true;
      animationPromise = staggerChildren(container, config)
        .finally(() => {
          isAnimating = false;
          animationPromise = null;
        });

      return animationPromise;
    },

    /**
     * Animates only new children (useful for dynamic lists)
     * @param {number} startIndex - Index to start animating from
     * @returns {Promise<void>}
     */
    async animateFrom(startIndex) {
      const children = Array.from(container.children).slice(startIndex);
      if (children.length === 0) return Promise.resolve();

      // Create temporary container for new children
      const tempContainer = document.createElement('div');
      tempContainer.style.display = 'contents';
      children.forEach(child => tempContainer.appendChild(child));

      const result = await staggerChildren(tempContainer, config);
      
      // Move children back to original container
      children.forEach(child => container.appendChild(child));

      return result;
    },

    /**
     * Resets all children to initial state
     */
    reset() {
      const variant = config.variant || 'fadeInUp';
      const motionVariant = MOTION_VARIANTS[variant] || MOTION_VARIANTS.fadeInUp;
      
      Array.from(container.children).forEach(child => {
        Object.assign(child.style, {
          ...motionVariant.initial,
          transition: 'none'
        });
      });
    },

    /**
     * Checks if animation is currently running
     * @returns {boolean}
     */
    get isAnimating() {
      return isAnimating;
    }
  };
}

/**
 * Web Component wrapper for stagger children functionality
 * Usage: <stagger-children delay="50" direction="forward" variant="fadeInUp">
 *          <div>Item 1</div>
 *          <div>Item 2</div>
 *        </stagger-children>
 */
export class StaggerChildren extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._controller = null;
    this._observer = null;
  }

  static get observedAttributes() {
    return ['delay', 'direction', 'variant', 'preset', 'duration', 'auto'];
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ::slotted(*) {
          display: block;
        }
      </style>
      <slot></slot>
    `;

    // Wait for slotted content
    requestAnimationFrame(() => {
      this._initializeController();

      // Auto-animate if specified
      if (this.hasAttribute('auto')) {
        this.animate();
      }

      // Observe for new children if auto is enabled
      if (this.hasAttribute('auto')) {
        this._observeChildren();
      }
    });
  }

  disconnectedCallback() {
    if (this._observer) {
      this._observer.disconnect();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this._controller) {
      this._initializeController();
    }
  }

  _initializeController() {
    const config = {
      delay: parseInt(this.getAttribute('delay') || '50', 10),
      direction: this.getAttribute('direction') || 'forward',
      variant: this.getAttribute('variant') || 'fadeInUp',
      preset: this.getAttribute('preset') || 'smooth',
      duration: parseInt(this.getAttribute('duration') || '300', 10),
      respectReducedMotion: !this.hasAttribute('no-reduced-motion')
    };

    this._controller = createStaggerController(this, config);
  }

  _observeChildren() {
    if (this._observer) {
      this._observer.disconnect();
    }

    this._observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Animate from the first new child
          const children = Array.from(this.children);
          const firstNewIndex = children.indexOf(mutation.addedNodes[0]);
          if (firstNewIndex !== -1) {
            this._controller.animateFrom(firstNewIndex);
          }
        }
      }
    });

    this._observer.observe(this, { childList: true });
  }

  /**
   * Manually trigger animation
   * @returns {Promise<void>}
   */
  async animate() {
    if (this._controller) {
      return this._controller.animate();
    }
  }

  /**
   * Reset to initial state
   */
  reset() {
    if (this._controller) {
      this._controller.reset();
    }
  }
}

// Register custom element
if (!customElements.get('stagger-children')) {
  customElements.define('stagger-children', StaggerChildren);
}