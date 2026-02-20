/**
 * Container Query Polyfill
 * 
 * Provides fallback support for @container queries in browsers that don't
 * support native container queries. Uses ResizeObserver to monitor container
 * sizes and apply appropriate classes.
 * 
 * Performance: Uses ResizeObserver with debouncing to minimize layout thrashing
 * Memory: Maintains WeakMap of observers to prevent memory leaks
 * 
 * @see DESIGN_SYSTEM.md#container-query-primitives
 */

/**
 * Container query breakpoints (in pixels)
 * @const {Object<string, number>}
 */
const BREAKPOINTS = {
  xs: 0,
  sm: 320,
  md: 640,
  lg: 960,
  xl: 1280
};

/**
 * Container query manager
 * Handles polyfill logic and native feature detection
 */
class ContainerQueryManager {
  /**
   * @constructor
   */
  constructor() {
    /** @type {boolean} */
    this.hasNativeSupport = this.detectNativeSupport();
    
    /** @type {WeakMap<Element, ResizeObserver>} */
    this.observers = new WeakMap();
    
    /** @type {WeakMap<Element, number>} */
    this.rafIds = new WeakMap();
    
    /** @type {WeakMap<Element, string>} */
    this.lastBreakpoint = new WeakMap();
    
    if (!this.hasNativeSupport) {
      console.info('[ContainerQuery] Using polyfill mode');
    }
  }

  /**
   * Detects if browser supports native container queries
   * @returns {boolean} True if native support is available
   */
  detectNativeSupport() {
    if (typeof CSS === 'undefined' || !CSS.supports) {
      return false;
    }
    
    // Check for container-type support
    return CSS.supports('container-type: inline-size');
  }

  /**
   * Observes a container element and applies appropriate classes
   * @param {Element} element - Container element to observe
   * @param {Object} options - Configuration options
   * @param {string} [options.name] - Named container identifier
   * @param {Function} [options.onChange] - Callback when breakpoint changes
   */
  observe(element, options = {}) {
    if (this.hasNativeSupport) {
      // Native support available, no polyfill needed
      return;
    }

    if (!element || !(element instanceof Element)) {
      console.error('[ContainerQuery] Invalid element provided');
      return;
    }

    // Clean up existing observer if any
    this.unobserve(element);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.handleResize(entry.target, entry.contentRect, options);
      }
    });

    observer.observe(element);
    this.observers.set(element, observer);

    // Initial measurement
    const rect = element.getBoundingClientRect();
    this.handleResize(element, rect, options);
  }

  /**
   * Handles resize events with RAF debouncing
   * @param {Element} element - Container element
   * @param {DOMRectReadOnly} rect - Element dimensions
   * @param {Object} options - Configuration options
   * @private
   */
  handleResize(element, rect, options) {
    // Cancel pending RAF if exists
    const existingRaf = this.rafIds.get(element);
    if (existingRaf) {
      cancelAnimationFrame(existingRaf);
    }

    // Schedule update for next frame
    const rafId = requestAnimationFrame(() => {
      this.updateBreakpointClasses(element, rect.width, options);
      this.rafIds.delete(element);
    });

    this.rafIds.set(element, rafId);
  }

  /**
   * Updates breakpoint classes on element
   * @param {Element} element - Container element
   * @param {number} width - Container width in pixels
   * @param {Object} options - Configuration options
   * @private
   */
  updateBreakpointClasses(element, width, options) {
    const currentBreakpoint = this.getBreakpoint(width);
    const lastBreakpoint = this.lastBreakpoint.get(element);

    // No change, skip update
    if (currentBreakpoint === lastBreakpoint) {
      return;
    }

    // Remove old breakpoint classes
    if (lastBreakpoint) {
      element.classList.remove(`hds-cq-${lastBreakpoint}`);
      if (options.name) {
        element.classList.remove(`hds-cq-${lastBreakpoint}@${options.name}`);
      }
    }

    // Add new breakpoint class
    element.classList.add(`hds-cq-${currentBreakpoint}`);
    if (options.name) {
      element.classList.add(`hds-cq-${currentBreakpoint}@${options.name}`);
    }

    // Add all smaller breakpoint classes (mobile-first approach)
    const breakpointKeys = Object.keys(BREAKPOINTS);
    const currentIndex = breakpointKeys.indexOf(currentBreakpoint);
    
    for (let i = 0; i <= currentIndex; i++) {
      const bp = breakpointKeys[i];
      element.classList.add(`hds-cq-${bp}`);
      if (options.name) {
        element.classList.add(`hds-cq-${bp}@${options.name}`);
      }
    }

    // Remove larger breakpoint classes
    for (let i = currentIndex + 1; i < breakpointKeys.length; i++) {
      const bp = breakpointKeys[i];
      element.classList.remove(`hds-cq-${bp}`);
      if (options.name) {
        element.classList.remove(`hds-cq-${bp}@${options.name}`);
      }
    }

    this.lastBreakpoint.set(element, currentBreakpoint);

    // Trigger callback if provided
    if (options.onChange && typeof options.onChange === 'function') {
      options.onChange(currentBreakpoint, width);
    }
  }

  /**
   * Determines breakpoint for given width
   * @param {number} width - Container width in pixels
   * @returns {string} Breakpoint identifier (xs, sm, md, lg, xl)
   * @private
   */
  getBreakpoint(width) {
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  }

  /**
   * Stops observing a container element
   * @param {Element} element - Container element to stop observing
   */
  unobserve(element) {
    const observer = this.observers.get(element);
    if (observer) {
      observer.disconnect();
      this.observers.delete(element);
    }

    const rafId = this.rafIds.get(element);
    if (rafId) {
      cancelAnimationFrame(rafId);
      this.rafIds.delete(element);
    }

    this.lastBreakpoint.delete(element);
  }

  /**
   * Observes all container elements in the document
   * @param {Document|Element} root - Root element to search within
   */
  observeAll(root = document) {
    const containers = root.querySelectorAll('[class*="hds-container"]');
    
    containers.forEach((container) => {
      const classList = Array.from(container.classList);
      
      // Extract container name if it exists
      const namedClass = classList.find(cls => cls.startsWith('hds-container--'));
      const name = namedClass ? namedClass.replace('hds-container--', '') : undefined;
      
      this.observe(container, { name });
    });
  }

  /**
   * Disconnects all observers and cleans up
   */
  destroy() {
    // Note: WeakMaps don't have iteration, so we can't manually clean up
    // Observers will be garbage collected when elements are removed
    this.observers = new WeakMap();
    this.rafIds = new WeakMap();
    this.lastBreakpoint = new WeakMap();
  }
}

// Create singleton instance
const containerQueryManager = new ContainerQueryManager();

/**
 * Initializes container query polyfill
 * Automatically called on DOMContentLoaded
 */
function initContainerQueryPolyfill() {
  containerQueryManager.observeAll();
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContainerQueryPolyfill);
} else {
  initContainerQueryPolyfill();
}

// Export for manual usage
if (typeof window !== 'undefined') {
  window.HarmonyContainerQuery = {
    manager: containerQueryManager,
    observe: (element, options) => containerQueryManager.observe(element, options),
    unobserve: (element) => containerQueryManager.unobserve(element),
    observeAll: (root) => containerQueryManager.observeAll(root),
    hasNativeSupport: containerQueryManager.hasNativeSupport,
    BREAKPOINTS
  };
}

export { containerQueryManager, BREAKPOINTS, initContainerQueryPolyfill };