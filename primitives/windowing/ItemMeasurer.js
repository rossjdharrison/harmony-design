/**
 * @fileoverview ItemMeasurer - Low-level utility for measuring dynamic item sizes
 * @module primitives/windowing/ItemMeasurer
 * 
 * Provides measurement utilities for variable-size items in virtualized lists.
 * Caches measurements to avoid repeated DOM reads.
 * 
 * Performance targets:
 * - Measurement: <0.5ms per item
 * - Cache hit rate: >95%
 * - Memory efficient caching
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#windowing-primitives}
 */

/**
 * @typedef {Object} MeasurementResult
 * @property {number} width - Measured width
 * @property {number} height - Measured height
 * @property {number} offsetTop - Offset from container top
 * @property {number} offsetLeft - Offset from container left
 */

/**
 * ItemMeasurer - Measures and caches item dimensions
 * 
 * @class
 * @example
 * const measurer = new ItemMeasurer();
 * const height = measurer.measure(element, 'height');
 */
export class ItemMeasurer {
  /**
   * @param {Object} options - Configuration options
   * @param {number} [options.cacheSize=1000] - Maximum cache entries
   * @param {number} [options.defaultHeight=50] - Default height estimate
   */
  constructor(options = {}) {
    /** @private */
    this._options = {
      cacheSize: 1000,
      defaultHeight: 50,
      ...options
    };
    
    /** @private */
    this._heightCache = new Map();
    
    /** @private */
    this._widthCache = new Map();
    
    /** @private */
    this._measurementCache = new Map();
  }

  /**
   * Measure element dimension
   * 
   * @param {HTMLElement} element - Element to measure
   * @param {string} dimension - Dimension to measure ('height', 'width', 'both')
   * @returns {number|MeasurementResult} Measured value(s)
   */
  measure(element, dimension = 'height') {
    if (!element) {
      return dimension === 'height' ? this._options.defaultHeight : 0;
    }
    
    switch (dimension) {
      case 'height':
        return element.offsetHeight;
      
      case 'width':
        return element.offsetWidth;
      
      case 'both':
        return {
          width: element.offsetWidth,
          height: element.offsetHeight,
          offsetTop: element.offsetTop,
          offsetLeft: element.offsetLeft
        };
      
      default:
        throw new Error(`Invalid dimension: ${dimension}`);
    }
  }

  /**
   * Get cached height for item index
   * 
   * @param {number} index - Item index
   * @returns {number|null} Cached height or null
   */
  getCachedHeight(index) {
    return this._heightCache.get(index) ?? null;
  }

  /**
   * Set cached height for item index
   * 
   * @param {number} index - Item index
   * @param {number} height - Item height
   */
  setCachedHeight(index, height) {
    // Enforce cache size limit
    if (this._heightCache.size >= this._options.cacheSize) {
      const firstKey = this._heightCache.keys().next().value;
      this._heightCache.delete(firstKey);
    }
    
    this._heightCache.set(index, height);
  }

  /**
   * Get cached width for item index
   * 
   * @param {number} index - Item index
   * @returns {number|null} Cached width or null
   */
  getCachedWidth(index) {
    return this._widthCache.get(index) ?? null;
  }

  /**
   * Set cached width for item index
   * 
   * @param {number} index - Item index
   * @param {number} width - Item width
   */
  setCachedWidth(index, width) {
    if (this._widthCache.size >= this._options.cacheSize) {
      const firstKey = this._widthCache.keys().next().value;
      this._widthCache.delete(firstKey);
    }
    
    this._widthCache.set(index, width);
  }

  /**
   * Measure and cache item
   * 
   * @param {HTMLElement} element - Element to measure
   * @param {number} index - Item index
   * @param {string} dimension - Dimension to measure
   * @returns {number|MeasurementResult} Measured value(s)
   */
  measureAndCache(element, index, dimension = 'height') {
    const measurement = this.measure(element, dimension);
    
    if (dimension === 'height' || dimension === 'both') {
      const height = typeof measurement === 'number' ? measurement : measurement.height;
      this.setCachedHeight(index, height);
    }
    
    if (dimension === 'width' || dimension === 'both') {
      const width = typeof measurement === 'number' ? measurement : measurement.width;
      this.setCachedWidth(index, width);
    }
    
    return measurement;
  }

  /**
   * Get height with fallback to cache or default
   * 
   * @param {number} index - Item index
   * @param {HTMLElement} [element] - Element to measure if not cached
   * @returns {number} Item height
   */
  getHeight(index, element = null) {
    const cached = this.getCachedHeight(index);
    if (cached !== null) {
      return cached;
    }
    
    if (element) {
      return this.measureAndCache(element, index, 'height');
    }
    
    return this._options.defaultHeight;
  }

  /**
   * Batch measure multiple elements
   * 
   * @param {Array<{element: HTMLElement, index: number}>} items - Items to measure
   * @param {string} dimension - Dimension to measure
   * @returns {Array<number|MeasurementResult>} Measurements
   */
  batchMeasure(items, dimension = 'height') {
    return items.map(({ element, index }) => {
      return this.measureAndCache(element, index, dimension);
    });
  }

  /**
   * Invalidate cache for specific index
   * 
   * @param {number} index - Item index
   */
  invalidate(index) {
    this._heightCache.delete(index);
    this._widthCache.delete(index);
    this._measurementCache.delete(index);
  }

  /**
   * Invalidate cache for range of indices
   * 
   * @param {number} startIndex - Start index (inclusive)
   * @param {number} endIndex - End index (exclusive)
   */
  invalidateRange(startIndex, endIndex) {
    for (let i = startIndex; i < endIndex; i++) {
      this.invalidate(i);
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this._heightCache.clear();
    this._widthCache.clear();
    this._measurementCache.clear();
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      heightCacheSize: this._heightCache.size,
      widthCacheSize: this._widthCache.size,
      measurementCacheSize: this._measurementCache.size,
      maxCacheSize: this._options.cacheSize
    };
  }
}