/**
 * @fileoverview Safe Area Insets Handler
 * Handles notches, home indicators, and safe areas on iOS/Android devices.
 * Provides utilities for querying and applying safe area insets.
 * 
 * Related: DESIGN_SYSTEM.md § Safe Area Insets
 * 
 * @module utils/safe-area-insets
 */

/**
 * @typedef {Object} SafeAreaInsets
 * @property {number} top - Top inset in pixels
 * @property {number} right - Right inset in pixels
 * @property {number} bottom - Bottom inset in pixels
 * @property {number} left - Left inset in pixels
 */

/**
 * Safe Area Insets Handler
 * Manages safe area insets for devices with notches and home indicators.
 */
export class SafeAreaInsetsHandler {
  constructor() {
    /** @type {SafeAreaInsets} */
    this._insets = { top: 0, right: 0, bottom: 0, left: 0 };
    
    /** @type {Set<Function>} */
    this._listeners = new Set();
    
    /** @type {boolean} */
    this._initialized = false;
    
    /** @type {ResizeObserver|null} */
    this._resizeObserver = null;
    
    /** @type {number|null} */
    this._orientationTimeout = null;
  }

  /**
   * Initialize the safe area insets handler
   * @returns {void}
   */
  initialize() {
    if (this._initialized) {
      return;
    }

    this._initialized = true;
    this._applyViewportMeta();
    this._updateInsets();
    this._setupListeners();
    
    console.log('[SafeAreaInsets] Initialized', this._insets);
  }

  /**
   * Apply viewport meta tag for proper safe area support
   * @private
   * @returns {void}
   */
  _applyViewportMeta() {
    let viewport = document.querySelector('meta[name="viewport"]');
    
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }

    const content = viewport.getAttribute('content') || '';
    
    // Ensure viewport-fit=cover is set for safe area support
    if (!content.includes('viewport-fit')) {
      const newContent = content ? `${content}, viewport-fit=cover` : 'viewport-fit=cover';
      viewport.setAttribute('content', newContent);
    }
  }

  /**
   * Setup event listeners for inset changes
   * @private
   * @returns {void}
   */
  _setupListeners() {
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      // Delay update to allow browser to settle
      if (this._orientationTimeout) {
        clearTimeout(this._orientationTimeout);
      }
      
      this._orientationTimeout = setTimeout(() => {
        this._updateInsets();
        this._orientationTimeout = null;
      }, 100);
    });

    // Listen for resize events (fallback)
    window.addEventListener('resize', () => {
      this._updateInsets();
    });

    // Listen for visual viewport changes (iOS Safari)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        this._updateInsets();
      });
    }

    // Observe document element for CSS variable changes
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        this._updateInsets();
      });
      this._resizeObserver.observe(document.documentElement);
    }
  }

  /**
   * Update safe area insets from CSS environment variables
   * @private
   * @returns {void}
   */
  _updateInsets() {
    const computedStyle = getComputedStyle(document.documentElement);
    
    const newInsets = {
      top: this._parseInset(computedStyle.getPropertyValue('env(safe-area-inset-top)')) ||
           this._parseInset(computedStyle.getPropertyValue('--safe-area-inset-top')) || 0,
      right: this._parseInset(computedStyle.getPropertyValue('env(safe-area-inset-right)')) ||
             this._parseInset(computedStyle.getPropertyValue('--safe-area-inset-right')) || 0,
      bottom: this._parseInset(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) ||
              this._parseInset(computedStyle.getPropertyValue('--safe-area-inset-bottom')) || 0,
      left: this._parseInset(computedStyle.getPropertyValue('env(safe-area-inset-left)')) ||
            this._parseInset(computedStyle.getPropertyValue('--safe-area-inset-left')) || 0,
    };

    // Check if insets have changed
    const changed = 
      this._insets.top !== newInsets.top ||
      this._insets.right !== newInsets.right ||
      this._insets.bottom !== newInsets.bottom ||
      this._insets.left !== newInsets.left;

    if (changed) {
      this._insets = newInsets;
      this._applyInsetsToDocument();
      this._notifyListeners();
      
      console.log('[SafeAreaInsets] Updated', this._insets);
    }
  }

  /**
   * Parse inset value from CSS string
   * @private
   * @param {string} value - CSS value
   * @returns {number} Parsed pixel value
   */
  _parseInset(value) {
    if (!value || value === '' || value === '0px') {
      return 0;
    }
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Apply insets as CSS custom properties to document
   * @private
   * @returns {void}
   */
  _applyInsetsToDocument() {
    const root = document.documentElement;
    
    root.style.setProperty('--safe-area-inset-top', `${this._insets.top}px`);
    root.style.setProperty('--safe-area-inset-right', `${this._insets.right}px`);
    root.style.setProperty('--safe-area-inset-bottom', `${this._insets.bottom}px`);
    root.style.setProperty('--safe-area-inset-left', `${this._insets.left}px`);
  }

  /**
   * Notify all listeners of inset changes
   * @private
   * @returns {void}
   */
  _notifyListeners() {
    this._listeners.forEach(listener => {
      try {
        listener(this._insets);
      } catch (error) {
        console.error('[SafeAreaInsets] Listener error', error);
      }
    });
  }

  /**
   * Get current safe area insets
   * @returns {SafeAreaInsets} Current insets
   */
  getInsets() {
    return { ...this._insets };
  }

  /**
   * Check if device has safe area insets
   * @returns {boolean} True if any inset is greater than 0
   */
  hasSafeAreaInsets() {
    return this._insets.top > 0 || 
           this._insets.right > 0 || 
           this._insets.bottom > 0 || 
           this._insets.left > 0;
  }

  /**
   * Subscribe to inset changes
   * @param {Function} listener - Callback function receiving SafeAreaInsets
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    
    // Immediately call with current insets
    listener(this._insets);
    
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Apply safe area padding to an element
   * @param {HTMLElement} element - Element to apply padding
   * @param {Object} options - Padding options
   * @param {boolean} [options.top=true] - Apply top inset
   * @param {boolean} [options.right=true] - Apply right inset
   * @param {boolean} [options.bottom=true] - Apply bottom inset
   * @param {boolean} [options.left=true] - Apply left inset
   * @param {number} [options.additionalTop=0] - Additional top padding
   * @param {number} [options.additionalRight=0] - Additional right padding
   * @param {number} [options.additionalBottom=0] - Additional bottom padding
   * @param {number} [options.additionalLeft=0] - Additional left padding
   * @returns {void}
   */
  applyPadding(element, options = {}) {
    const {
      top = true,
      right = true,
      bottom = true,
      left = true,
      additionalTop = 0,
      additionalRight = 0,
      additionalBottom = 0,
      additionalLeft = 0,
    } = options;

    if (top) {
      element.style.paddingTop = `calc(${additionalTop}px + var(--safe-area-inset-top, 0px))`;
    }
    if (right) {
      element.style.paddingRight = `calc(${additionalRight}px + var(--safe-area-inset-right, 0px))`;
    }
    if (bottom) {
      element.style.paddingBottom = `calc(${additionalBottom}px + var(--safe-area-inset-bottom, 0px))`;
    }
    if (left) {
      element.style.paddingLeft = `calc(${additionalLeft}px + var(--safe-area-inset-left, 0px))`;
    }
  }

  /**
   * Apply safe area margin to an element
   * @param {HTMLElement} element - Element to apply margin
   * @param {Object} options - Margin options (same as applyPadding)
   * @returns {void}
   */
  applyMargin(element, options = {}) {
    const {
      top = true,
      right = true,
      bottom = true,
      left = true,
      additionalTop = 0,
      additionalRight = 0,
      additionalBottom = 0,
      additionalLeft = 0,
    } = options;

    if (top) {
      element.style.marginTop = `calc(${additionalTop}px + var(--safe-area-inset-top, 0px))`;
    }
    if (right) {
      element.style.marginRight = `calc(${additionalRight}px + var(--safe-area-inset-right, 0px))`;
    }
    if (bottom) {
      element.style.marginBottom = `calc(${additionalBottom}px + var(--safe-area-inset-bottom, 0px))`;
    }
    if (left) {
      element.style.marginLeft = `calc(${additionalLeft}px + var(--safe-area-inset-left, 0px))`;
    }
  }

  /**
   * Cleanup and remove listeners
   * @returns {void}
   */
  destroy() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    
    if (this._orientationTimeout) {
      clearTimeout(this._orientationTimeout);
      this._orientationTimeout = null;
    }
    
    this._listeners.clear();
    this._initialized = false;
    
    console.log('[SafeAreaInsets] Destroyed');
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create the singleton safe area insets handler
 * @returns {SafeAreaInsetsHandler} The handler instance
 */
export function getSafeAreaInsetsHandler() {
  if (!instance) {
    instance = new SafeAreaInsetsHandler();
    instance.initialize();
  }
  return instance;
}

/**
 * Get current safe area insets
 * @returns {SafeAreaInsets} Current insets
 */
export function getSafeAreaInsets() {
  return getSafeAreaInsetsHandler().getInsets();
}

/**
 * Check if device has safe area insets
 * @returns {boolean} True if any inset exists
 */
export function hasSafeAreaInsets() {
  return getSafeAreaInsetsHandler().hasSafeAreaInsets();
}

/**
 * Subscribe to safe area inset changes
 * @param {Function} listener - Callback receiving SafeAreaInsets
 * @returns {Function} Unsubscribe function
 */
export function subscribeSafeAreaInsets(listener) {
  return getSafeAreaInsetsHandler().subscribe(listener);
}