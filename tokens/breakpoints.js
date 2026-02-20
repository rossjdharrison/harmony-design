/**
 * @fileoverview Responsive Breakpoint System
 * @module tokens/breakpoints
 * 
 * Defines breakpoints for responsive design across mobile, tablet, desktop, and wide screens.
 * Follows mobile-first approach with min-width media queries.
 * 
 * Performance: Zero runtime cost - compile-time constants only
 * Memory: ~1KB when imported
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#responsive-breakpoints}
 */

/**
 * Breakpoint token definitions
 * Mobile-first approach: styles cascade upward from smallest to largest
 * 
 * @typedef {Object} Breakpoint
 * @property {number} value - Breakpoint value in pixels
 * @property {string} min - CSS min-width media query
 * @property {string} max - CSS max-width media query (up to next breakpoint)
 * @property {string} only - CSS media query for this breakpoint range only
 * @property {string} label - Human-readable label
 */

/**
 * Core breakpoint values (in pixels)
 * Based on common device widths and design system requirements
 * 
 * @constant
 * @type {Object.<string, number>}
 */
export const BREAKPOINT_VALUES = Object.freeze({
  mobile: 0,      // 0px - Mobile-first baseline
  tablet: 768,    // 768px - iPad portrait, small tablets
  desktop: 1024,  // 1024px - iPad landscape, laptops
  wide: 1440,     // 1440px - Desktop monitors, large screens
});

/**
 * Breakpoint labels for documentation and debugging
 * 
 * @constant
 * @type {Object.<string, string>}
 */
export const BREAKPOINT_LABELS = Object.freeze({
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
  wide: 'Wide',
});

/**
 * Generate min-width media query
 * 
 * @param {number} width - Breakpoint width in pixels
 * @returns {string} CSS media query string
 */
const minWidth = (width) => width === 0 ? 'all' : `(min-width: ${width}px)`;

/**
 * Generate max-width media query
 * Uses width - 0.02px to avoid overlap with min-width queries
 * 
 * @param {number} width - Breakpoint width in pixels
 * @returns {string} CSS media query string
 */
const maxWidth = (width) => `(max-width: ${width - 0.02}px)`;

/**
 * Generate range media query (between two breakpoints)
 * 
 * @param {number} minW - Minimum width in pixels
 * @param {number} maxW - Maximum width in pixels
 * @returns {string} CSS media query string
 */
const rangeQuery = (minW, maxW) => 
  minW === 0 
    ? maxWidth(maxW)
    : `${minWidth(minW)} and ${maxWidth(maxW)}`;

/**
 * Complete breakpoint definitions with media queries
 * 
 * @constant
 * @type {Object.<string, Breakpoint>}
 */
export const BREAKPOINTS = Object.freeze({
  mobile: {
    value: BREAKPOINT_VALUES.mobile,
    min: minWidth(BREAKPOINT_VALUES.mobile),
    max: maxWidth(BREAKPOINT_VALUES.tablet),
    only: rangeQuery(BREAKPOINT_VALUES.mobile, BREAKPOINT_VALUES.tablet),
    label: BREAKPOINT_LABELS.mobile,
  },
  tablet: {
    value: BREAKPOINT_VALUES.tablet,
    min: minWidth(BREAKPOINT_VALUES.tablet),
    max: maxWidth(BREAKPOINT_VALUES.desktop),
    only: rangeQuery(BREAKPOINT_VALUES.tablet, BREAKPOINT_VALUES.desktop),
    label: BREAKPOINT_LABELS.tablet,
  },
  desktop: {
    value: BREAKPOINT_VALUES.desktop,
    min: minWidth(BREAKPOINT_VALUES.desktop),
    max: maxWidth(BREAKPOINT_VALUES.wide),
    only: rangeQuery(BREAKPOINT_VALUES.desktop, BREAKPOINT_VALUES.wide),
    label: BREAKPOINT_LABELS.desktop,
  },
  wide: {
    value: BREAKPOINT_VALUES.wide,
    min: minWidth(BREAKPOINT_VALUES.wide),
    max: null, // No upper limit for wide screens
    only: minWidth(BREAKPOINT_VALUES.wide),
    label: BREAKPOINT_LABELS.wide,
  },
});

/**
 * Get current active breakpoint based on window width
 * Useful for JavaScript-based responsive logic
 * 
 * Performance: O(1) - simple comparison chain
 * 
 * @param {number} [width=window.innerWidth] - Width to check (defaults to current window width)
 * @returns {string} Active breakpoint name ('mobile' | 'tablet' | 'desktop' | 'wide')
 * 
 * @example
 * const currentBreakpoint = getCurrentBreakpoint();
 * if (currentBreakpoint === 'mobile') {
 *   // Mobile-specific logic
 * }
 */
export function getCurrentBreakpoint(width = window.innerWidth) {
  if (width >= BREAKPOINT_VALUES.wide) return 'wide';
  if (width >= BREAKPOINT_VALUES.desktop) return 'desktop';
  if (width >= BREAKPOINT_VALUES.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Check if current viewport matches a breakpoint
 * 
 * @param {string} breakpoint - Breakpoint name to check
 * @param {number} [width=window.innerWidth] - Width to check
 * @returns {boolean} True if viewport matches breakpoint
 * 
 * @example
 * if (matchesBreakpoint('desktop')) {
 *   // Desktop-specific logic
 * }
 */
export function matchesBreakpoint(breakpoint, width = window.innerWidth) {
  return getCurrentBreakpoint(width) === breakpoint;
}

/**
 * Check if current viewport is at or above a breakpoint
 * 
 * @param {string} breakpoint - Minimum breakpoint name
 * @param {number} [width=window.innerWidth] - Width to check
 * @returns {boolean} True if viewport is at or above breakpoint
 * 
 * @example
 * if (isBreakpointUp('tablet')) {
 *   // Tablet and above logic
 * }
 */
export function isBreakpointUp(breakpoint, width = window.innerWidth) {
  return width >= BREAKPOINT_VALUES[breakpoint];
}

/**
 * Check if current viewport is below a breakpoint
 * 
 * @param {string} breakpoint - Maximum breakpoint name
 * @param {number} [width=window.innerWidth] - Width to check
 * @returns {boolean} True if viewport is below breakpoint
 * 
 * @example
 * if (isBreakpointDown('tablet')) {
 *   // Mobile-only logic
 * }
 */
export function isBreakpointDown(breakpoint, width = window.innerWidth) {
  return width < BREAKPOINT_VALUES[breakpoint];
}

/**
 * Create a ResizeObserver that fires when breakpoint changes
 * Debounced to avoid excessive callbacks during resize
 * 
 * Performance: Debounced with requestAnimationFrame for 60fps
 * 
 * @param {Function} callback - Called with new breakpoint name when it changes
 * @returns {Object} Object with observe() and disconnect() methods
 * 
 * @example
 * const observer = createBreakpointObserver((breakpoint) => {
 *   console.log('Breakpoint changed to:', breakpoint);
 * });
 * observer.observe();
 * // Later: observer.disconnect();
 */
export function createBreakpointObserver(callback) {
  let currentBreakpoint = getCurrentBreakpoint();
  let rafId = null;

  const checkBreakpoint = () => {
    const newBreakpoint = getCurrentBreakpoint();
    if (newBreakpoint !== currentBreakpoint) {
      currentBreakpoint = newBreakpoint;
      callback(newBreakpoint);
    }
    rafId = null;
  };

  const handleResize = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(checkBreakpoint);
    }
  };

  return {
    observe() {
      window.addEventListener('resize', handleResize);
      // Call immediately to set initial state
      callback(currentBreakpoint);
    },
    disconnect() {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}

/**
 * Export all breakpoint tokens as CSS custom properties
 * For use in CSS files via @import
 * 
 * @returns {string} CSS custom property declarations
 */
export function toCSS() {
  return `
:root {
  --breakpoint-mobile: ${BREAKPOINT_VALUES.mobile}px;
  --breakpoint-tablet: ${BREAKPOINT_VALUES.tablet}px;
  --breakpoint-desktop: ${BREAKPOINT_VALUES.desktop}px;
  --breakpoint-wide: ${BREAKPOINT_VALUES.wide}px;
}
`.trim();
}