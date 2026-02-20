/**
 * @fileoverview WindowCalculator - Low-level utility for calculating visible windows in virtualized lists
 * @module primitives/windowing/WindowCalculator
 * 
 * Provides core window calculation logic for virtualization. Used by VirtualList, VirtualTable,
 * and custom virtualization implementations.
 * 
 * Performance targets:
 * - Window calculation: <1ms
 * - Supports variable item sizes
 * - Minimal memory allocation
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#windowing-primitives}
 */

/**
 * @typedef {Object} WindowConfig
 * @property {number} scrollTop - Current scroll position
 * @property {number} containerHeight - Height of visible container
 * @property {number} totalItems - Total number of items
 * @property {number} overscan - Number of items to render outside visible area
 * @property {Function|number} itemSize - Item size function or fixed size
 */

/**
 * @typedef {Object} WindowResult
 * @property {number} startIndex - First visible item index
 * @property {number} endIndex - Last visible item index (exclusive)
 * @property {number} offsetBefore - Padding before first rendered item
 * @property {number} offsetAfter - Padding after last rendered item
 * @property {number} totalHeight - Total scrollable height
 */

/**
 * WindowCalculator - Calculates visible window for virtualized rendering
 * 
 * @class
 * @example
 * const calculator = new WindowCalculator();
 * const window = calculator.calculate({
 *   scrollTop: 1000,
 *   containerHeight: 600,
 *   totalItems: 10000,
 *   overscan: 3,
 *   itemSize: 50
 * });
 */
export class WindowCalculator {
  constructor() {
    /** @private */
    this._cache = new Map();
    
    /** @private */
    this._cacheMaxSize = 100;
  }

  /**
   * Calculate visible window with fixed item sizes
   * 
   * @param {WindowConfig} config - Window configuration
   * @returns {WindowResult} Calculated window
   */
  calculate(config) {
    const {
      scrollTop,
      containerHeight,
      totalItems,
      overscan = 0,
      itemSize
    } = config;

    if (typeof itemSize === 'number') {
      return this._calculateFixed(scrollTop, containerHeight, totalItems, overscan, itemSize);
    } else {
      return this._calculateVariable(scrollTop, containerHeight, totalItems, overscan, itemSize);
    }
  }

  /**
   * Calculate window for fixed-size items (optimized)
   * 
   * @private
   * @param {number} scrollTop - Current scroll position
   * @param {number} containerHeight - Container height
   * @param {number} totalItems - Total item count
   * @param {number} overscan - Overscan count
   * @param {number} itemSize - Fixed item size
   * @returns {WindowResult} Calculated window
   */
  _calculateFixed(scrollTop, containerHeight, totalItems, overscan, itemSize) {
    const totalHeight = totalItems * itemSize;
    
    // Calculate visible range
    const startIndex = Math.floor(scrollTop / itemSize);
    const endIndex = Math.ceil((scrollTop + containerHeight) / itemSize);
    
    // Apply overscan
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(totalItems, endIndex + overscan);
    
    // Calculate offsets
    const offsetBefore = overscanStart * itemSize;
    const offsetAfter = (totalItems - overscanEnd) * itemSize;
    
    return {
      startIndex: overscanStart,
      endIndex: overscanEnd,
      offsetBefore,
      offsetAfter,
      totalHeight
    };
  }

  /**
   * Calculate window for variable-size items
   * 
   * @private
   * @param {number} scrollTop - Current scroll position
   * @param {number} containerHeight - Container height
   * @param {number} totalItems - Total item count
   * @param {number} overscan - Overscan count
   * @param {Function} itemSizeFn - Function that returns size for index
   * @returns {WindowResult} Calculated window
   */
  _calculateVariable(scrollTop, containerHeight, totalItems, overscan, itemSizeFn) {
    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = totalItems;
    let foundStart = false;
    
    // Find start index
    for (let i = 0; i < totalItems; i++) {
      const size = itemSizeFn(i);
      
      if (!foundStart && accumulatedHeight + size > scrollTop) {
        startIndex = i;
        foundStart = true;
      }
      
      if (foundStart && accumulatedHeight > scrollTop + containerHeight) {
        endIndex = i;
        break;
      }
      
      accumulatedHeight += size;
    }
    
    // Apply overscan
    const overscanStart = Math.max(0, startIndex - overscan);
    const overscanEnd = Math.min(totalItems, endIndex + overscan);
    
    // Calculate offsets
    let offsetBefore = 0;
    for (let i = 0; i < overscanStart; i++) {
      offsetBefore += itemSizeFn(i);
    }
    
    let offsetAfter = 0;
    for (let i = overscanEnd; i < totalItems; i++) {
      offsetAfter += itemSizeFn(i);
    }
    
    return {
      startIndex: overscanStart,
      endIndex: overscanEnd,
      offsetBefore,
      offsetAfter,
      totalHeight: accumulatedHeight
    };
  }

  /**
   * Calculate total height for all items
   * 
   * @param {number} totalItems - Total item count
   * @param {Function|number} itemSize - Item size function or fixed size
   * @returns {number} Total height
   */
  calculateTotalHeight(totalItems, itemSize) {
    if (typeof itemSize === 'number') {
      return totalItems * itemSize;
    }
    
    let total = 0;
    for (let i = 0; i < totalItems; i++) {
      total += itemSize(i);
    }
    return total;
  }

  /**
   * Find item index at specific scroll position
   * 
   * @param {number} scrollTop - Scroll position
   * @param {Function|number} itemSize - Item size function or fixed size
   * @param {number} totalItems - Total item count
   * @returns {number} Item index
   */
  findIndexAtPosition(scrollTop, itemSize, totalItems) {
    if (typeof itemSize === 'number') {
      return Math.floor(scrollTop / itemSize);
    }
    
    let accumulatedHeight = 0;
    for (let i = 0; i < totalItems; i++) {
      const size = itemSize(i);
      if (accumulatedHeight + size > scrollTop) {
        return i;
      }
      accumulatedHeight += size;
    }
    
    return totalItems - 1;
  }

  /**
   * Clear internal caches
   */
  clearCache() {
    this._cache.clear();
  }
}