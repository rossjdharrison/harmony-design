/**
 * @fileoverview React-style hook for focus trap management
 * @module hooks/use-focus-trap
 * 
 * Provides a convenient hook-style API for using focus traps in components.
 * While not React, follows hook patterns for consistency.
 * 
 * @see DESIGN_SYSTEM.md#focus-management-system
 */

import focusManager from '../utils/focus-manager.js';

/**
 * Create a focus trap for a container element
 * @param {HTMLElement} containerRef - Container element reference
 * @param {Object} [options] - Focus trap options
 * @param {HTMLElement} [options.initialFocus] - Initial focus element
 * @param {boolean} [options.loop=true] - Loop focus
 * @param {Function} [options.onEscape] - Escape handler
 * @param {boolean} [options.allowOutsideClick=false] - Allow outside clicks
 * @returns {Object} - Focus trap control object
 */
export function useFocusTrap(containerRef, options = {}) {
  let trap = null;

  /**
   * Initialize the trap
   */
  const initialize = () => {
    if (!containerRef) {
      console.warn('[useFocusTrap] No container provided');
      return;
    }

    trap = focusManager.createTrap({
      container: containerRef,
      ...options,
    });
  };

  /**
   * Activate the focus trap
   * @returns {boolean}
   */
  const activate = () => {
    if (!trap) {
      initialize();
    }
    return trap ? trap.activate() : false;
  };

  /**
   * Deactivate the focus trap
   * @param {Object} [deactivateOptions] - Deactivation options
   * @returns {boolean}
   */
  const deactivate = (deactivateOptions) => {
    return trap ? trap.deactivate(deactivateOptions) : false;
  };

  /**
   * Check if trap is active
   * @returns {boolean}
   */
  const isActive = () => {
    return trap ? trap.isActive : false;
  };

  /**
   * Cleanup
   */
  const cleanup = () => {
    if (trap && trap.isActive) {
      trap.deactivate();
    }
    trap = null;
  };

  return {
    activate,
    deactivate,
    isActive,
    cleanup,
  };
}

/**
 * Create a focus restore point
 * @returns {Object} - Focus restore control object
 */
export function useFocusRestore() {
  let restoreElement = null;

  /**
   * Save current focus
   */
  const save = () => {
    restoreElement = document.activeElement;
  };

  /**
   * Restore saved focus
   * @returns {boolean}
   */
  const restore = () => {
    if (restoreElement && document.contains(restoreElement)) {
      return focusManager.focus(restoreElement, { source: 'restore-hook' });
    }
    return false;
  };

  /**
   * Clear saved focus
   */
  const clear = () => {
    restoreElement = null;
  };

  return {
    save,
    restore,
    clear,
  };
}

/**
 * Programmatic focus control
 * @returns {Object} - Focus control object
 */
export function useFocus() {
  /**
   * Focus an element
   * @param {HTMLElement|string} target - Target element or selector
   * @param {Object} [options] - Focus options
   * @returns {boolean}
   */
  const focus = (target, options) => {
    return focusManager.focus(target, options);
  };

  /**
   * Get focusable elements
   * @param {HTMLElement} [container] - Container to search
   * @returns {HTMLElement[]}
   */
  const getFocusable = (container) => {
    return focusManager.getFocusableElements(container);
  };

  /**
   * Check if element is focusable
   * @param {HTMLElement} element - Element to check
   * @returns {boolean}
   */
  const isFocusable = (element) => {
    return focusManager.isFocusable(element);
  };

  return {
    focus,
    getFocusable,
    isFocusable,
  };
}