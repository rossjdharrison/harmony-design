/**
 * @fileoverview Keyboard Navigation Manager for Harmony Design System
 * Provides consistent keyboard navigation patterns across all interactive components.
 * See DESIGN_SYSTEM.md#keyboard-navigation for usage guidelines.
 * 
 * @module KeyboardNavigation
 */

/**
 * Standard keyboard shortcuts for the Harmony Design System
 * @const {Object}
 */
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  TAB: 'Tab',
  SHIFT_TAB: 'Shift+Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  
  // Actions
  ENTER: 'Enter',
  SPACE: 'Space',
  ESCAPE: 'Escape',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  
  // Modifiers
  CTRL: 'Control',
  ALT: 'Alt',
  SHIFT: 'Shift',
  META: 'Meta',
  
  // Transport controls
  PLAY_PAUSE: 'Space',
  STOP: 'Escape',
  RECORD: 'r',
  LOOP: 'l',
  
  // Editing
  CUT: 'Control+x',
  COPY: 'Control+c',
  PASTE: 'Control+v',
  UNDO: 'Control+z',
  REDO: 'Control+Shift+z',
  SELECT_ALL: 'Control+a',
  
  // View
  ZOOM_IN: 'Control+=',
  ZOOM_OUT: 'Control+-',
  ZOOM_RESET: 'Control+0',
  
  // Debug
  EVENT_BUS_TOGGLE: 'Control+Shift+e'
};

/**
 * Keyboard navigation manager that handles focus management and keyboard shortcuts
 * @class KeyboardNavigationManager
 */
export class KeyboardNavigationManager {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.shortcuts = new Map();
    
    /** @type {Array<HTMLElement>} */
    this.focusableElements = [];
    
    /** @type {number} */
    this.currentFocusIndex = -1;
    
    /** @type {boolean} */
    this.enabled = true;
    
    /** @type {Set<string>} */
    this.pressedKeys = new Set();
    
    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundKeyUp = this._handleKeyUp.bind(this);
    
    this._initialize();
  }
  
  /**
   * Initialize keyboard event listeners
   * @private
   */
  _initialize() {
    document.addEventListener('keydown', this._boundKeyDown);
    document.addEventListener('keyup', this._boundKeyUp);
  }
  
  /**
   * Register a keyboard shortcut handler
   * @param {string} shortcut - Keyboard shortcut (e.g., 'Control+s', 'ArrowUp')
   * @param {Function} handler - Handler function to call
   * @param {Object} options - Options for the shortcut
   * @param {boolean} options.preventDefault - Whether to prevent default behavior
   * @returns {Function} Unregister function
   */
  registerShortcut(shortcut, handler, options = { preventDefault: true }) {
    const normalizedShortcut = this._normalizeShortcut(shortcut);
    
    if (!this.shortcuts.has(normalizedShortcut)) {
      this.shortcuts.set(normalizedShortcut, new Set());
    }
    
    const wrappedHandler = (event) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      handler(event);
    };
    
    this.shortcuts.get(normalizedShortcut).add(wrappedHandler);
    
    // Return unregister function
    return () => {
      const handlers = this.shortcuts.get(normalizedShortcut);
      if (handlers) {
        handlers.delete(wrappedHandler);
        if (handlers.size === 0) {
          this.shortcuts.delete(normalizedShortcut);
        }
      }
    };
  }
  
  /**
   * Normalize shortcut string to consistent format
   * @private
   * @param {string} shortcut - Raw shortcut string
   * @returns {string} Normalized shortcut
   */
  _normalizeShortcut(shortcut) {
    const parts = shortcut.split('+').map(p => p.trim());
    const modifiers = [];
    let key = '';
    
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === 'control' || lower === 'ctrl') {
        modifiers.push('Control');
      } else if (lower === 'shift') {
        modifiers.push('Shift');
      } else if (lower === 'alt') {
        modifiers.push('Alt');
      } else if (lower === 'meta' || lower === 'cmd') {
        modifiers.push('Meta');
      } else {
        key = part;
      }
    }
    
    modifiers.sort();
    return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
  }
  
  /**
   * Build shortcut string from keyboard event
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string} Shortcut string
   */
  _buildShortcutFromEvent(event) {
    const modifiers = [];
    
    if (event.ctrlKey) modifiers.push('Control');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.altKey) modifiers.push('Alt');
    if (event.metaKey) modifiers.push('Meta');
    
    modifiers.sort();
    return modifiers.length > 0 ? `${modifiers.join('+')}+${event.key}` : event.key;
  }
  
  /**
   * Handle keydown events
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyDown(event) {
    if (!this.enabled) return;
    
    // Track pressed keys
    this.pressedKeys.add(event.key);
    
    // Build shortcut string
    const shortcut = this._buildShortcutFromEvent(event);
    
    // Execute handlers
    const handlers = this.shortcuts.get(shortcut);
    if (handlers && handlers.size > 0) {
      handlers.forEach(handler => handler(event));
    }
  }
  
  /**
   * Handle keyup events
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyUp(event) {
    this.pressedKeys.delete(event.key);
  }
  
  /**
   * Register focusable elements for sequential keyboard navigation
   * @param {Array<HTMLElement>} elements - Array of focusable elements
   */
  registerFocusableElements(elements) {
    this.focusableElements = elements.filter(el => 
      el && !el.hasAttribute('disabled') && el.tabIndex >= 0
    );
    this.currentFocusIndex = -1;
  }
  
  /**
   * Move focus to next element
   * @returns {boolean} Whether focus was moved
   */
  focusNext() {
    if (this.focusableElements.length === 0) return false;
    
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentFocusIndex].focus();
    return true;
  }
  
  /**
   * Move focus to previous element
   * @returns {boolean} Whether focus was moved
   */
  focusPrevious() {
    if (this.focusableElements.length === 0) return false;
    
    this.currentFocusIndex = this.currentFocusIndex <= 0 
      ? this.focusableElements.length - 1 
      : this.currentFocusIndex - 1;
    this.focusableElements[this.currentFocusIndex].focus();
    return true;
  }
  
  /**
   * Move focus to first element
   * @returns {boolean} Whether focus was moved
   */
  focusFirst() {
    if (this.focusableElements.length === 0) return false;
    
    this.currentFocusIndex = 0;
    this.focusableElements[this.currentFocusIndex].focus();
    return true;
  }
  
  /**
   * Move focus to last element
   * @returns {boolean} Whether focus was moved
   */
  focusLast() {
    if (this.focusableElements.length === 0) return false;
    
    this.currentFocusIndex = this.focusableElements.length - 1;
    this.focusableElements[this.currentFocusIndex].focus();
    return true;
  }
  
  /**
   * Enable keyboard navigation
   */
  enable() {
    this.enabled = true;
  }
  
  /**
   * Disable keyboard navigation
   */
  disable() {
    this.enabled = false;
  }
  
  /**
   * Check if a key is currently pressed
   * @param {string} key - Key to check
   * @returns {boolean} Whether the key is pressed
   */
  isKeyPressed(key) {
    return this.pressedKeys.has(key);
  }
  
  /**
   * Cleanup and remove event listeners
   */
  destroy() {
    document.removeEventListener('keydown', this._boundKeyDown);
    document.removeEventListener('keyup', this._boundKeyUp);
    this.shortcuts.clear();
    this.focusableElements = [];
    this.pressedKeys.clear();
  }
}

/**
 * Global keyboard navigation manager instance
 * @type {KeyboardNavigationManager}
 */
export const keyboardManager = new KeyboardNavigationManager();

/**
 * Mixin for adding keyboard navigation to Web Components
 * @param {Class} BaseClass - Base class to extend
 * @returns {Class} Extended class with keyboard navigation
 */
export function KeyboardNavigationMixin(BaseClass) {
  return class extends BaseClass {
    constructor() {
      super();
      
      /** @type {Array<Function>} */
      this._keyboardUnsubscribers = [];
      
      /** @type {Map<string, string>} */
      this._ariaLabels = new Map();
    }
    
    /**
     * Register component-specific keyboard shortcuts
     * @protected
     */
    _registerKeyboardShortcuts() {
      // Override in subclass to register shortcuts
    }
    
    /**
     * Add keyboard shortcut for this component
     * @protected
     * @param {string} shortcut - Keyboard shortcut
     * @param {Function} handler - Handler function
     * @param {Object} options - Options
     */
    _addShortcut(shortcut, handler, options) {
      const unsubscribe = keyboardManager.registerShortcut(
        shortcut,
        handler.bind(this),
        options
      );
      this._keyboardUnsubscribers.push(unsubscribe);
    }
    
    /**
     * Make element focusable with proper ARIA attributes
     * @protected
     * @param {HTMLElement} element - Element to make focusable
     * @param {string} role - ARIA role
     * @param {string} label - ARIA label
     */
    _makeFocusable(element, role, label) {
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', role);
      element.setAttribute('aria-label', label);
      this._ariaLabels.set(element, label);
    }
    
    /**
     * Update ARIA label for an element
     * @protected
     * @param {HTMLElement} element - Element to update
     * @param {string} label - New label
     */
    _updateAriaLabel(element, label) {
      element.setAttribute('aria-label', label);
      this._ariaLabels.set(element, label);
    }
    
    /**
     * Set ARIA pressed state
     * @protected
     * @param {HTMLElement} element - Element to update
     * @param {boolean} pressed - Pressed state
     */
    _setAriaPressed(element, pressed) {
      element.setAttribute('aria-pressed', pressed.toString());
    }
    
    /**
     * Set ARIA expanded state
     * @protected
     * @param {HTMLElement} element - Element to update
     * @param {boolean} expanded - Expanded state
     */
    _setAriaExpanded(element, expanded) {
      element.setAttribute('aria-expanded', expanded.toString());
    }
    
    /**
     * Set ARIA disabled state
     * @protected
     * @param {HTMLElement} element - Element to update
     * @param {boolean} disabled - Disabled state
     */
    _setAriaDisabled(element, disabled) {
      element.setAttribute('aria-disabled', disabled.toString());
      if (disabled) {
        element.setAttribute('tabindex', '-1');
      } else {
        element.setAttribute('tabindex', '0');
      }
    }
    
    /**
     * Cleanup keyboard shortcuts on disconnect
     * @protected
     */
    disconnectedCallback() {
      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }
      
      this._keyboardUnsubscribers.forEach(unsub => unsub());
      this._keyboardUnsubscribers = [];
      this._ariaLabels.clear();
    }
  };
}

/**
 * Focus trap utility for modal dialogs and overlays
 * @class FocusTrap
 */
export class FocusTrap {
  /**
   * Create a focus trap
   * @param {HTMLElement} container - Container element to trap focus within
   */
  constructor(container) {
    /** @type {HTMLElement} */
    this.container = container;
    
    /** @type {Array<HTMLElement>} */
    this.focusableElements = [];
    
    /** @type {HTMLElement|null} */
    this.previousActiveElement = null;
    
    /** @type {boolean} */
    this.active = false;
    
    this._boundKeyDown = this._handleKeyDown.bind(this);
  }
  
  /**
   * Get all focusable elements within container
   * @private
   * @returns {Array<HTMLElement>} Focusable elements
   */
  _getFocusableElements() {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');
    
    return Array.from(this.container.querySelectorAll(selector));
  }
  
  /**
   * Handle keydown events to trap focus
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyDown(event) {
    if (event.key !== 'Tab') return;
    
    this.focusableElements = this._getFocusableElements();
    
    if (this.focusableElements.length === 0) {
      event.preventDefault();
      return;
    }
    
    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift+Tab: moving backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
  
  /**
   * Activate focus trap
   */
  activate() {
    if (this.active) return;
    
    this.previousActiveElement = document.activeElement;
    this.focusableElements = this._getFocusableElements();
    
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
    
    this.container.addEventListener('keydown', this._boundKeyDown);
    this.active = true;
  }
  
  /**
   * Deactivate focus trap
   */
  deactivate() {
    if (!this.active) return;
    
    this.container.removeEventListener('keydown', this._boundKeyDown);
    
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
      this.previousActiveElement = null;
    }
    
    this.active = false;
  }
  
  /**
   * Destroy focus trap
   */
  destroy() {
    this.deactivate();
    this.focusableElements = [];
  }
}