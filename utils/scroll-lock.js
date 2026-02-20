/**
 * @fileoverview Scroll Lock Utility
 * @module utils/scroll-lock
 * 
 * Prevents body scrolling when modals or overlays are open.
 * Handles multiple overlapping locks (nested modals) and preserves scroll position.
 * 
 * Performance: O(1) lock/unlock operations
 * Memory: ~1KB overhead for state tracking
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#scroll-lock}
 */

/**
 * @typedef {Object} ScrollLockState
 * @property {number} count - Number of active locks
 * @property {number} scrollY - Preserved scroll position
 * @property {string} originalOverflow - Original body overflow style
 * @property {string} originalPosition - Original body position style
 * @property {string} originalTop - Original body top style
 * @property {string} originalWidth - Original body width style
 */

/** @type {ScrollLockState} */
const state = {
  count: 0,
  scrollY: 0,
  originalOverflow: '',
  originalPosition: '',
  originalTop: '',
  originalWidth: ''
};

/**
 * Locks body scroll and preserves current scroll position.
 * Safe to call multiple times - uses reference counting for nested locks.
 * 
 * Strategy:
 * 1. Save current scroll position
 * 2. Set body to fixed position at negative top offset
 * 3. Prevent width change from scrollbar removal
 * 4. Increment lock counter
 * 
 * @returns {void}
 * 
 * @example
 * // In modal open handler
 * lockScroll();
 * modal.showModal();
 */
export function lockScroll() {
  // Increment lock count
  state.count++;
  
  // Already locked - just increment counter
  if (state.count > 1) {
    return;
  }
  
  // First lock - save state and apply lock
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  
  // Save current scroll position
  state.scrollY = window.scrollY;
  
  // Save original styles
  state.originalOverflow = document.body.style.overflow;
  state.originalPosition = document.body.style.position;
  state.originalTop = document.body.style.top;
  state.originalWidth = document.body.style.width;
  
  // Apply lock styles
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${state.scrollY}px`;
  document.body.style.width = '100%';
  
  // Compensate for scrollbar width to prevent layout shift
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

/**
 * Unlocks body scroll and restores scroll position.
 * Uses reference counting - only unlocks when all locks are released.
 * 
 * Strategy:
 * 1. Decrement lock counter
 * 2. If counter reaches 0, restore original styles
 * 3. Restore scroll position
 * 
 * @returns {void}
 * 
 * @example
 * // In modal close handler
 * modal.close();
 * unlockScroll();
 */
export function unlockScroll() {
  // Decrement lock count
  state.count = Math.max(0, state.count - 1);
  
  // Still locked by other modals
  if (state.count > 0) {
    return;
  }
  
  // Last lock released - restore state
  document.body.style.overflow = state.originalOverflow;
  document.body.style.position = state.originalPosition;
  document.body.style.top = state.originalTop;
  document.body.style.width = state.originalWidth;
  document.body.style.paddingRight = '';
  
  // Restore scroll position
  window.scrollTo(0, state.scrollY);
  
  // Reset state
  state.scrollY = 0;
  state.originalOverflow = '';
  state.originalPosition = '';
  state.originalTop = '';
  state.originalWidth = '';
}

/**
 * Checks if scroll is currently locked.
 * 
 * @returns {boolean} True if scroll is locked
 * 
 * @example
 * if (isScrollLocked()) {
 *   console.log('Scroll is currently locked');
 * }
 */
export function isScrollLocked() {
  return state.count > 0;
}

/**
 * Gets the current lock count (number of active locks).
 * Useful for debugging nested modal scenarios.
 * 
 * @returns {number} Number of active locks
 * 
 * @example
 * console.log(`Active locks: ${getLockCount()}`);
 */
export function getLockCount() {
  return state.count;
}

/**
 * Force unlocks all scroll locks.
 * USE WITH CAUTION - only for cleanup in error scenarios.
 * 
 * @returns {void}
 * 
 * @example
 * // Emergency cleanup
 * window.addEventListener('error', () => {
 *   forceUnlock();
 * });
 */
export function forceUnlock() {
  if (state.count === 0) {
    return;
  }
  
  // Restore state
  document.body.style.overflow = state.originalOverflow;
  document.body.style.position = state.originalPosition;
  document.body.style.top = state.originalTop;
  document.body.style.width = state.originalWidth;
  document.body.style.paddingRight = '';
  
  // Restore scroll position
  window.scrollTo(0, state.scrollY);
  
  // Reset state completely
  state.count = 0;
  state.scrollY = 0;
  state.originalOverflow = '';
  state.originalPosition = '';
  state.originalTop = '';
  state.originalWidth = '';
}

/**
 * Creates a scoped scroll lock that automatically unlocks on cleanup.
 * Useful with component lifecycle hooks.
 * 
 * @returns {Function} Cleanup function that unlocks scroll
 * 
 * @example
 * // In component connected callback
 * const unlock = createScrollLock();
 * 
 * // In component disconnected callback
 * unlock();
 */
export function createScrollLock() {
  lockScroll();
  return unlockScroll;
}