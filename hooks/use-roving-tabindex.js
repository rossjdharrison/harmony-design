/**
 * @fileoverview Use Roving Tabindex Hook
 * 
 * Provides a composable way to add roving tabindex behavior to components.
 * Integrates with the RovingTabindexManager for consistent keyboard navigation.
 * 
 * @see DESIGN_SYSTEM.md#roving-tabindex
 */

import { RovingTabindexManager } from '../utils/roving-tabindex.js';

/**
 * Hook to add roving tabindex behavior to a container element
 * 
 * @param {Object} config
 * @param {() => HTMLElement} config.containerRef - Function that returns the container element
 * @param {import('../utils/roving-tabindex.js').RovingTabindexOptions} config.options - Roving tabindex options
 * @param {Array<any>} config.dependencies - Array of dependencies that trigger refresh
 * @returns {Object} Manager interface
 * 
 * @example
 * const manager = useRovingTabindex({
 *   containerRef: () => this.shadowRoot.querySelector('.toolbar'),
 *   options: {
 *     direction: 'horizontal',
 *     wrap: true
 *   },
 *   dependencies: [this.items]
 * });
 * 
 * // Later, when items change:
 * manager.refresh();
 */
export function useRovingTabindex({ containerRef, options = {}, dependencies = [] }) {
  let manager = null;
  let previousDeps = null;

  /**
   * Initialize or update the manager
   */
  const initialize = () => {
    const container = containerRef();
    if (!container) {
      console.warn('[useRovingTabindex] Container element not found');
      return;
    }

    // Check if dependencies changed
    const depsChanged = !previousDeps || 
      dependencies.some((dep, i) => dep !== previousDeps[i]);

    if (manager && depsChanged) {
      manager.refresh();
    } else if (!manager) {
      manager = new RovingTabindexManager(container, options);
    }

    previousDeps = [...dependencies];
  };

  /**
   * Clean up the manager
   */
  const cleanup = () => {
    if (manager) {
      manager.destroy();
      manager = null;
    }
  };

  return {
    /**
     * Initialize the roving tabindex manager
     */
    init: initialize,

    /**
     * Refresh the item list
     */
    refresh: () => {
      if (manager) {
        manager.refresh();
      } else {
        initialize();
      }
    },

    /**
     * Focus the first item
     */
    focusFirst: () => {
      if (manager) {
        manager.focusFirst();
      }
    },

    /**
     * Focus the last item
     */
    focusLast: () => {
      if (manager) {
        manager.focusLast();
      }
    },

    /**
     * Focus a specific item by index
     * @param {number} index
     */
    focusItem: (index) => {
      if (manager) {
        manager.focusItem(index);
      }
    },

    /**
     * Clean up
     */
    destroy: cleanup,

    /**
     * Get the manager instance
     */
    getManager: () => manager
  };
}