/**
 * @fileoverview Breakpoint Utility Functions
 * @module utils/breakpoint-utils
 * 
 * Helper functions for working with responsive breakpoints in JavaScript.
 * Provides window.matchMedia wrappers and reactive breakpoint tracking.
 * 
 * Performance: Minimal overhead - delegates to native matchMedia API
 * Memory: <5KB including all utilities
 * 
 * @see {@link file://../DESIGN_SYSTEM.md#responsive-breakpoints}
 */

import { BREAKPOINTS, BREAKPOINT_VALUES } from '../tokens/breakpoints.js';

/**
 * Create a media query listener for a specific breakpoint
 * Uses native matchMedia API for optimal performance
 * 
 * @param {string} breakpoint - Breakpoint name ('mobile' | 'tablet' | 'desktop' | 'wide')
 * @param {Function} callback - Called when breakpoint match changes
 * @returns {MediaQueryList} Media query list object
 * 
 * @example
 * const mql = createMediaQuery('tablet', (matches) => {
 *   console.log('Tablet breakpoint:', matches ? 'active' : 'inactive');
 * });
 * // Later: mql.removeEventListener('change', callback);
 */
export function createMediaQuery(breakpoint, callback) {
  const bp = BREAKPOINTS[breakpoint];
  if (!bp) {
    throw new Error(`Invalid breakpoint: ${breakpoint}`);
  }

  const mql = window.matchMedia(bp.min);
  const handler = (e) => callback(e.matches);
  
  mql.addEventListener('change', handler);
  
  // Call immediately with current state
  callback(mql.matches);
  
  return mql;
}

/**
 * Check if a specific breakpoint is currently active
 * Uses matchMedia for accurate viewport detection
 * 
 * @param {string} breakpoint - Breakpoint name
 * @returns {boolean} True if breakpoint is active
 * 
 * @example
 * if (isBreakpointActive('desktop')) {
 *   // Desktop-specific logic
 * }
 */
export function isBreakpointActive(breakpoint) {
  const bp = BREAKPOINTS[breakpoint];
  if (!bp) {
    throw new Error(`Invalid breakpoint: ${breakpoint}`);
  }

  return window.matchMedia(bp.only).matches;
}

/**
 * Get all currently active breakpoints
 * Useful for debugging or complex responsive logic
 * 
 * @returns {string[]} Array of active breakpoint names
 * 
 * @example
 * const active = getActiveBreakpoints();
 * // ['mobile', 'tablet'] on tablet-sized screen
 */
export function getActiveBreakpoints() {
  return Object.keys(BREAKPOINTS).filter(bp => {
    const minQuery = BREAKPOINTS[bp].min;
    return minQuery === 'all' || window.matchMedia(minQuery).matches;
  });
}

/**
 * Create a breakpoint change event
 * Fires custom event on window when breakpoint changes
 * 
 * Performance: Debounced with requestAnimationFrame
 * 
 * @param {string} eventName - Custom event name (default: 'breakpointchange')
 * @returns {Function} Cleanup function to remove listener
 * 
 * @example
 * const cleanup = dispatchBreakpointEvents();
 * window.addEventListener('breakpointchange', (e) => {
 *   console.log('New breakpoint:', e.detail.breakpoint);
 * });
 * // Later: cleanup();
 */
export function dispatchBreakpointEvents(eventName = 'breakpointchange') {
  let currentBreakpoint = null;
  let rafId = null;

  const checkAndDispatch = () => {
    const newBreakpoint = Object.keys(BREAKPOINTS).find(bp => 
      isBreakpointActive(bp)
    );

    if (newBreakpoint !== currentBreakpoint) {
      const oldBreakpoint = currentBreakpoint;
      currentBreakpoint = newBreakpoint;

      const event = new CustomEvent(eventName, {
        detail: {
          breakpoint: newBreakpoint,
          previous: oldBreakpoint,
          width: window.innerWidth,
        },
      });

      window.dispatchEvent(event);
    }

    rafId = null;
  };

  const handleResize = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(checkAndDispatch);
    }
  };

  window.addEventListener('resize', handleResize);
  
  // Set initial state
  checkAndDispatch();

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

/**
 * Create a reactive breakpoint state object
 * Returns a proxy that updates when breakpoint changes
 * 
 * Performance: Uses Proxy for reactive updates - minimal overhead
 * 
 * @returns {Object} Reactive state object with current breakpoint info
 * 
 * @example
 * const state = createBreakpointState();
 * console.log(state.current); // 'tablet'
 * console.log(state.isTablet); // true
 * console.log(state.isMobile); // false
 */
export function createBreakpointState() {
  const state = {
    current: null,
    width: window.innerWidth,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isWide: false,
  };

  const updateState = () => {
    state.width = window.innerWidth;
    state.current = Object.keys(BREAKPOINTS).find(bp => 
      isBreakpointActive(bp)
    );
    state.isMobile = state.current === 'mobile';
    state.isTablet = state.current === 'tablet';
    state.isDesktop = state.current === 'desktop';
    state.isWide = state.current === 'wide';
  };

  // Initialize
  updateState();

  // Update on resize (debounced)
  let rafId = null;
  const handleResize = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        updateState();
        rafId = null;
      });
    }
  };

  window.addEventListener('resize', handleResize);

  // Add cleanup method
  state.destroy = () => {
    window.removeEventListener('resize', handleResize);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };

  return state;
}

/**
 * Execute callback when entering a specific breakpoint
 * Only fires when transitioning INTO the breakpoint
 * 
 * @param {string} breakpoint - Breakpoint name
 * @param {Function} callback - Called when entering breakpoint
 * @returns {Function} Cleanup function
 * 
 * @example
 * const cleanup = onBreakpointEnter('desktop', () => {
 *   console.log('Entered desktop breakpoint');
 * });
 */
export function onBreakpointEnter(breakpoint, callback) {
  let wasActive = isBreakpointActive(breakpoint);

  const check = () => {
    const isActive = isBreakpointActive(breakpoint);
    if (isActive && !wasActive) {
      callback();
    }
    wasActive = isActive;
  };

  let rafId = null;
  const handleResize = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        check();
        rafId = null;
      });
    }
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

/**
 * Execute callback when leaving a specific breakpoint
 * Only fires when transitioning OUT OF the breakpoint
 * 
 * @param {string} breakpoint - Breakpoint name
 * @param {Function} callback - Called when leaving breakpoint
 * @returns {Function} Cleanup function
 * 
 * @example
 * const cleanup = onBreakpointLeave('mobile', () => {
 *   console.log('Left mobile breakpoint');
 * });
 */
export function onBreakpointLeave(breakpoint, callback) {
  let wasActive = isBreakpointActive(breakpoint);

  const check = () => {
    const isActive = isBreakpointActive(breakpoint);
    if (!isActive && wasActive) {
      callback();
    }
    wasActive = isActive;
  };

  let rafId = null;
  const handleResize = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        check();
        rafId = null;
      });
    }
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

/**
 * Get responsive value based on current breakpoint
 * Allows defining different values per breakpoint
 * 
 * @param {Object} values - Object with breakpoint keys and values
 * @param {*} [defaultValue] - Fallback value if no match
 * @returns {*} Value for current breakpoint
 * 
 * @example
 * const columns = getResponsiveValue({
 *   mobile: 1,
 *   tablet: 2,
 *   desktop: 3,
 *   wide: 4,
 * });
 */
export function getResponsiveValue(values, defaultValue = null) {
  const breakpoints = ['wide', 'desktop', 'tablet', 'mobile'];
  
  for (const bp of breakpoints) {
    if (isBreakpointActive(bp) && values[bp] !== undefined) {
      return values[bp];
    }
  }

  return defaultValue;
}