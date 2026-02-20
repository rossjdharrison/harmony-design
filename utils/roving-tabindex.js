/**
 * @fileoverview Roving Tabindex Manager
 * 
 * Implements the roving tabindex pattern for composite widgets.
 * Manages focus within a group of interactive elements using arrow keys.
 * 
 * Pattern: Only one element in the group has tabindex="0", all others have tabindex="-1".
 * Arrow keys move focus between elements, updating tabindex values accordingly.
 * 
 * Supports:
 * - Horizontal navigation (Left/Right arrows)
 * - Vertical navigation (Up/Down arrows)
 * - Grid navigation (2D arrow key movement)
 * - Wrap-around or boundary stopping
 * - Home/End key support
 * - Automatic focus management
 * 
 * @see https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex
 * @see DESIGN_SYSTEM.md#roving-tabindex
 */

/**
 * @typedef {Object} RovingTabindexOptions
 * @property {'horizontal' | 'vertical' | 'grid' | 'both'} direction - Navigation direction
 * @property {boolean} wrap - Whether to wrap around at boundaries (default: true)
 * @property {boolean} homeEndKeys - Enable Home/End key support (default: true)
 * @property {string} itemSelector - CSS selector for focusable items (default: '[role="tab"], [role="menuitem"], [role="option"], button:not([disabled]), a[href]')
 * @property {number} gridColumns - Number of columns for grid navigation (required if direction is 'grid')
 * @property {(element: HTMLElement) => boolean} isDisabled - Function to check if item is disabled
 * @property {(index: number, element: HTMLElement) => void} onFocusChange - Callback when focus changes
 */

/**
 * Roving Tabindex Manager
 * Manages keyboard navigation within a composite widget
 */
export class RovingTabindexManager {
  /**
   * @param {HTMLElement} container - Container element for the composite widget
   * @param {RovingTabindexOptions} options - Configuration options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      direction: 'horizontal',
      wrap: true,
      homeEndKeys: true,
      itemSelector: '[role="tab"], [role="menuitem"], [role="option"], button:not([disabled]), a[href]',
      gridColumns: null,
      isDisabled: (element) => element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true',
      onFocusChange: null,
      ...options
    };

    this.currentIndex = -1;
    this.items = [];
    this.keydownHandler = this.handleKeydown.bind(this);
    this.focusinHandler = this.handleFocusin.bind(this);

    this.initialize();
  }

  /**
   * Initialize the roving tabindex manager
   * @private
   */
  initialize() {
    this.updateItems();
    this.setupInitialTabindex();
    this.attachEventListeners();
  }

  /**
   * Update the list of focusable items
   * @private
   */
  updateItems() {
    this.items = Array.from(
      this.container.querySelectorAll(this.options.itemSelector)
    ).filter(item => {
      // Exclude items that are not visible or are nested in other roving tabindex containers
      const isVisible = item.offsetParent !== null;
      const isNested = item.closest('[data-roving-tabindex]') !== this.container;
      return isVisible && !isNested;
    });
  }

  /**
   * Set up initial tabindex values
   * @private
   */
  setupInitialTabindex() {
    if (this.items.length === 0) return;

    // Find the currently focused or selected item
    let initialIndex = this.items.findIndex(item => 
      item.hasAttribute('data-selected') || 
      item.getAttribute('aria-selected') === 'true' ||
      item === document.activeElement
    );

    // Default to first non-disabled item
    if (initialIndex === -1) {
      initialIndex = this.items.findIndex(item => !this.options.isDisabled(item));
    }

    if (initialIndex === -1) initialIndex = 0;

    this.setFocusableItem(initialIndex);
  }

  /**
   * Attach event listeners
   * @private
   */
  attachEventListeners() {
    this.container.addEventListener('keydown', this.keydownHandler);
    this.container.addEventListener('focusin', this.focusinHandler);
    this.container.setAttribute('data-roving-tabindex', '');
  }

  /**
   * Detach event listeners
   * @private
   */
  detachEventListeners() {
    this.container.removeEventListener('keydown', this.keydownHandler);
    this.container.removeEventListener('focusin', this.focusinHandler);
    this.container.removeAttribute('data-roving-tabindex');
  }

  /**
   * Handle keydown events
   * @private
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    const { direction, homeEndKeys, gridColumns } = this.options;

    let handled = false;
    let newIndex = this.currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        if (direction === 'horizontal' || direction === 'both' || direction === 'grid') {
          newIndex = this.getNextIndex(1);
          handled = true;
        }
        break;

      case 'ArrowLeft':
        if (direction === 'horizontal' || direction === 'both' || direction === 'grid') {
          newIndex = this.getNextIndex(-1);
          handled = true;
        }
        break;

      case 'ArrowDown':
        if (direction === 'vertical' || direction === 'both') {
          newIndex = this.getNextIndex(1);
          handled = true;
        } else if (direction === 'grid' && gridColumns) {
          newIndex = this.getNextIndex(gridColumns);
          handled = true;
        }
        break;

      case 'ArrowUp':
        if (direction === 'vertical' || direction === 'both') {
          newIndex = this.getNextIndex(-1);
          handled = true;
        } else if (direction === 'grid' && gridColumns) {
          newIndex = this.getNextIndex(-gridColumns);
          handled = true;
        }
        break;

      case 'Home':
        if (homeEndKeys) {
          newIndex = this.getFirstEnabledIndex();
          handled = true;
        }
        break;

      case 'End':
        if (homeEndKeys) {
          newIndex = this.getLastEnabledIndex();
          handled = true;
        }
        break;

      default:
        break;
    }

    if (handled && newIndex !== this.currentIndex) {
      event.preventDefault();
      event.stopPropagation();
      this.focusItem(newIndex);
    }
  }

  /**
   * Handle focusin events to sync tabindex state
   * @private
   * @param {FocusEvent} event
   */
  handleFocusin(event) {
    const target = event.target;
    const index = this.items.indexOf(target);

    if (index !== -1 && index !== this.currentIndex) {
      this.setFocusableItem(index);
    }
  }

  /**
   * Get the next valid index
   * @private
   * @param {number} delta - Direction and amount to move
   * @returns {number} Next valid index
   */
  getNextIndex(delta) {
    if (this.items.length === 0) return -1;

    let newIndex = this.currentIndex + delta;
    const maxAttempts = this.items.length;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Handle wrapping or boundaries
      if (newIndex < 0) {
        newIndex = this.options.wrap ? this.items.length - 1 : 0;
      } else if (newIndex >= this.items.length) {
        newIndex = this.options.wrap ? 0 : this.items.length - 1;
      }

      // Check if item is enabled
      if (!this.options.isDisabled(this.items[newIndex])) {
        return newIndex;
      }

      // Move to next item
      newIndex += delta > 0 ? 1 : -1;
      attempts++;
    }

    // No enabled items found, return current index
    return this.currentIndex;
  }

  /**
   * Get the first enabled item index
   * @private
   * @returns {number}
   */
  getFirstEnabledIndex() {
    return this.items.findIndex(item => !this.options.isDisabled(item));
  }

  /**
   * Get the last enabled item index
   * @private
   * @returns {number}
   */
  getLastEnabledIndex() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (!this.options.isDisabled(this.items[i])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Set which item is focusable (has tabindex="0")
   * @private
   * @param {number} index
   */
  setFocusableItem(index) {
    if (index < 0 || index >= this.items.length) return;

    // Update tabindex for all items
    this.items.forEach((item, i) => {
      item.setAttribute('tabindex', i === index ? '0' : '-1');
    });

    this.currentIndex = index;

    // Call callback if provided
    if (this.options.onFocusChange) {
      this.options.onFocusChange(index, this.items[index]);
    }
  }

  /**
   * Focus an item by index
   * @param {number} index
   */
  focusItem(index) {
    if (index < 0 || index >= this.items.length) return;

    this.setFocusableItem(index);
    this.items[index].focus();
  }

  /**
   * Focus the first item
   */
  focusFirst() {
    const index = this.getFirstEnabledIndex();
    if (index !== -1) {
      this.focusItem(index);
    }
  }

  /**
   * Focus the last item
   */
  focusLast() {
    const index = this.getLastEnabledIndex();
    if (index !== -1) {
      this.focusItem(index);
    }
  }

  /**
   * Refresh the item list and update tabindex
   * Call this when items are added/removed dynamically
   */
  refresh() {
    const previousItem = this.items[this.currentIndex];
    this.updateItems();

    // Try to maintain focus on the same element
    if (previousItem) {
      const newIndex = this.items.indexOf(previousItem);
      if (newIndex !== -1) {
        this.setFocusableItem(newIndex);
        return;
      }
    }

    // Otherwise, reset to first item
    this.setupInitialTabindex();
  }

  /**
   * Destroy the manager and clean up
   */
  destroy() {
    this.detachEventListeners();
    this.items = [];
    this.currentIndex = -1;
  }
}

/**
 * Create a roving tabindex manager for a container
 * @param {HTMLElement} container
 * @param {RovingTabindexOptions} options
 * @returns {RovingTabindexManager}
 */
export function createRovingTabindex(container, options) {
  return new RovingTabindexManager(container, options);
}