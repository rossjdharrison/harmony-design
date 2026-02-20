/**
 * @fileoverview ScrollManager - Low-level scroll event handling and throttling
 * @module primitives/windowing/ScrollManager
 * 
 * Provides optimized scroll event handling with requestAnimationFrame-based throttling.
 * Prevents layout thrashing and ensures smooth scrolling performance.
 * 
 * Performance targets:
 * - Event handling: <0.5ms
 * - RAF-based throttling for 60fps
 * - Automatic cleanup
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#windowing-primitives}
 */

/**
 * @typedef {Object} ScrollState
 * @property {number} scrollTop - Current scroll position
 * @property {number} scrollLeft - Horizontal scroll position
 * @property {number} scrollHeight - Total scrollable height
 * @property {number} clientHeight - Visible height
 * @property {number} velocity - Scroll velocity (px/ms)
 * @property {string} direction - Scroll direction ('up', 'down', 'none')
 */

/**
 * ScrollManager - Manages scroll events with optimized throttling
 * 
 * @class
 * @example
 * const manager = new ScrollManager(containerElement);
 * manager.onScroll((state) => {
 *   console.log('Scrolled to:', state.scrollTop);
 * });
 */
export class ScrollManager {
  /**
   * @param {HTMLElement} element - Element to monitor
   * @param {Object} options - Configuration options
   * @param {boolean} [options.passive=true] - Use passive event listeners
   * @param {boolean} [options.capture=false] - Use capture phase
   */
  constructor(element, options = {}) {
    /** @private */
    this._element = element;
    
    /** @private */
    this._options = {
      passive: true,
      capture: false,
      ...options
    };
    
    /** @private */
    this._callbacks = new Set();
    
    /** @private */
    this._rafId = null;
    
    /** @private */
    this._lastScrollTop = 0;
    
    /** @private */
    this._lastScrollTime = 0;
    
    /** @private */
    this._scrollPending = false;
    
    /** @private */
    this._boundHandleScroll = this._handleScroll.bind(this);
    
    this._attach();
  }

  /**
   * Register scroll callback
   * 
   * @param {Function} callback - Callback function receiving ScrollState
   * @returns {Function} Unsubscribe function
   */
  onScroll(callback) {
    this._callbacks.add(callback);
    
    return () => {
      this._callbacks.delete(callback);
    };
  }

  /**
   * Get current scroll state
   * 
   * @returns {ScrollState} Current scroll state
   */
  getScrollState() {
    const now = performance.now();
    const deltaTime = now - this._lastScrollTime;
    const deltaScroll = this._element.scrollTop - this._lastScrollTop;
    
    const velocity = deltaTime > 0 ? deltaScroll / deltaTime : 0;
    const direction = deltaScroll > 0 ? 'down' : deltaScroll < 0 ? 'up' : 'none';
    
    return {
      scrollTop: this._element.scrollTop,
      scrollLeft: this._element.scrollLeft,
      scrollHeight: this._element.scrollHeight,
      clientHeight: this._element.clientHeight,
      velocity,
      direction
    };
  }

  /**
   * Scroll to specific position
   * 
   * @param {number} scrollTop - Target scroll position
   * @param {Object} options - Scroll options
   * @param {string} [options.behavior='auto'] - Scroll behavior ('auto', 'smooth')
   */
  scrollTo(scrollTop, options = {}) {
    this._element.scrollTo({
      top: scrollTop,
      behavior: options.behavior || 'auto'
    });
  }

  /**
   * Scroll to specific item index
   * 
   * @param {number} index - Item index
   * @param {Function|number} itemSize - Item size function or fixed size
   * @param {Object} options - Scroll options
   */
  scrollToIndex(index, itemSize, options = {}) {
    let scrollTop = 0;
    
    if (typeof itemSize === 'number') {
      scrollTop = index * itemSize;
    } else {
      for (let i = 0; i < index; i++) {
        scrollTop += itemSize(i);
      }
    }
    
    this.scrollTo(scrollTop, options);
  }

  /**
   * Attach scroll listener
   * 
   * @private
   */
  _attach() {
    this._element.addEventListener(
      'scroll',
      this._boundHandleScroll,
      this._options
    );
  }

  /**
   * Handle scroll event
   * 
   * @private
   */
  _handleScroll() {
    if (this._scrollPending) {
      return;
    }
    
    this._scrollPending = true;
    
    this._rafId = requestAnimationFrame(() => {
      this._scrollPending = false;
      
      const state = this.getScrollState();
      
      // Notify all callbacks
      this._callbacks.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error('[ScrollManager] Callback error:', error);
        }
      });
      
      // Update tracking
      this._lastScrollTop = state.scrollTop;
      this._lastScrollTime = performance.now();
    });
  }

  /**
   * Detach scroll listener and cleanup
   */
  destroy() {
    this._element.removeEventListener(
      'scroll',
      this._boundHandleScroll,
      this._options
    );
    
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    
    this._callbacks.clear();
  }
}