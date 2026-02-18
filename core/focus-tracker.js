/**
 * @fileoverview Multi-state focus tracking utility for Harmony Design System
 * Tracks focus, hover, active, and disabled states for interactive elements.
 * See DESIGN_SYSTEM.md section "Focus Management" for usage patterns.
 */

/**
 * @typedef {Object} FocusState
 * @property {boolean} focused - Element has keyboard focus
 * @property {boolean} hovered - Mouse is over element
 * @property {boolean} active - Element is being pressed/activated
 * @property {boolean} disabled - Element is disabled
 */

/**
 * @typedef {Object} FocusTrackerOptions
 * @property {HTMLElement} element - Element to track
 * @property {Function} onStateChange - Callback when state changes
 * @property {boolean} [trackHover=true] - Whether to track hover state
 * @property {boolean} [trackActive=true] - Whether to track active state
 * @property {boolean} [trackFocus=true] - Whether to track focus state
 */

/**
 * Multi-state focus tracker for interactive elements.
 * Manages focus, hover, active, and disabled states with proper cleanup.
 * 
 * @class FocusTracker
 * @example
 * const tracker = new FocusTracker({
 *   element: buttonElement,
 *   onStateChange: (state) => {
 *     console.log('Focus state:', state);
 *   }
 * });
 */
export class FocusTracker {
  /**
   * @param {FocusTrackerOptions} options - Configuration options
   */
  constructor(options) {
    this.element = options.element;
    this.onStateChange = options.onStateChange;
    this.trackHover = options.trackHover !== false;
    this.trackActive = options.trackActive !== false;
    this.trackFocus = options.trackFocus !== false;

    /** @type {FocusState} */
    this.state = {
      focused: false,
      hovered: false,
      active: false,
      disabled: false
    };

    /** @type {Map<string, Function>} */
    this.listeners = new Map();

    this._initialize();
  }

  /**
   * Initialize event listeners for state tracking
   * @private
   */
  _initialize() {
    if (this.trackFocus) {
      this._addListener('focus', () => this._updateState({ focused: true }));
      this._addListener('blur', () => this._updateState({ focused: false }));
    }

    if (this.trackHover) {
      this._addListener('mouseenter', () => this._updateState({ hovered: true }));
      this._addListener('mouseleave', () => this._updateState({ hovered: false }));
    }

    if (this.trackActive) {
      this._addListener('mousedown', () => this._updateState({ active: true }));
      this._addListener('mouseup', () => this._updateState({ active: false }));
      this._addListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          this._updateState({ active: true });
        }
      });
      this._addListener('keyup', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          this._updateState({ active: false });
        }
      });
    }

    // Check initial disabled state
    this._checkDisabledState();

    // Observe disabled attribute changes
    this.observer = new MutationObserver(() => this._checkDisabledState());
    this.observer.observe(this.element, {
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled']
    });
  }

  /**
   * Add event listener and store for cleanup
   * @private
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  _addListener(event, handler) {
    this.element.addEventListener(event, handler);
    this.listeners.set(event, handler);
  }

  /**
   * Check and update disabled state
   * @private
   */
  _checkDisabledState() {
    const disabled = this.element.hasAttribute('disabled') ||
                     this.element.getAttribute('aria-disabled') === 'true';
    
    if (disabled !== this.state.disabled) {
      this._updateState({ disabled });
      
      // Clear other states when disabled
      if (disabled) {
        this._updateState({
          focused: false,
          hovered: false,
          active: false
        });
      }
    }
  }

  /**
   * Update state and notify callback
   * @private
   * @param {Partial<FocusState>} updates - State updates
   */
  _updateState(updates) {
    const oldState = { ...this.state };
    Object.assign(this.state, updates);

    // Only notify if state actually changed
    if (this._hasStateChanged(oldState, this.state)) {
      this.onStateChange({ ...this.state });
    }
  }

  /**
   * Check if state has changed
   * @private
   * @param {FocusState} oldState - Previous state
   * @param {FocusState} newState - New state
   * @returns {boolean} Whether state changed
   */
  _hasStateChanged(oldState, newState) {
    return oldState.focused !== newState.focused ||
           oldState.hovered !== newState.hovered ||
           oldState.active !== newState.active ||
           oldState.disabled !== newState.disabled;
  }

  /**
   * Get current state
   * @returns {FocusState} Current focus state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Check if element is in any interactive state
   * @returns {boolean} True if focused, hovered, or active
   */
  isInteractive() {
    return !this.state.disabled &&
           (this.state.focused || this.state.hovered || this.state.active);
  }

  /**
   * Get CSS class names based on current state
   * @param {string} [prefix=''] - Class name prefix
   * @returns {string[]} Array of class names
   */
  getClassNames(prefix = '') {
    const classes = [];
    if (this.state.focused) classes.push(`${prefix}focused`);
    if (this.state.hovered) classes.push(`${prefix}hovered`);
    if (this.state.active) classes.push(`${prefix}active`);
    if (this.state.disabled) classes.push(`${prefix}disabled`);
    return classes;
  }

  /**
   * Get CSS class string based on current state
   * @param {string} [prefix=''] - Class name prefix
   * @returns {string} Space-separated class names
   */
  getClassString(prefix = '') {
    return this.getClassNames(prefix).join(' ');
  }

  /**
   * Programmatically set disabled state
   * @param {boolean} disabled - Whether element should be disabled
   */
  setDisabled(disabled) {
    if (disabled) {
      this.element.setAttribute('disabled', '');
    } else {
      this.element.removeAttribute('disabled');
    }
    // MutationObserver will handle state update
  }

  /**
   * Clean up event listeners and observers
   */
  destroy() {
    // Remove event listeners
    for (const [event, handler] of this.listeners) {
      this.element.removeEventListener(event, handler);
    }
    this.listeners.clear();

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

/**
 * Create a focus tracker for an element
 * @param {FocusTrackerOptions} options - Configuration options
 * @returns {FocusTracker} Focus tracker instance
 */
export function createFocusTracker(options) {
  return new FocusTracker(options);
}