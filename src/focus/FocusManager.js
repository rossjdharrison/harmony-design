/**
 * @fileoverview Atomic focus management with event coordination
 * @see DESIGN_SYSTEM.md#focus-management
 */

/**
 * FocusManager - Centralized focus state management with event-driven coordination
 * 
 * Responsibilities:
 * - Track focus state across the application
 * - Coordinate focus changes through EventBus
 * - Manage focus trapping for modals/dialogs
 * - Restore focus after interruptions
 * - Provide focus visibility controls
 * 
 * @class
 */
export class FocusManager {
  constructor() {
    /** @type {HTMLElement|null} */
    this.currentFocus = null;
    
    /** @type {HTMLElement|null} */
    this.previousFocus = null;
    
    /** @type {Array<HTMLElement>} */
    this.focusStack = [];
    
    /** @type {HTMLElement|null} */
    this.trapContainer = null;
    
    /** @type {boolean} */
    this.isKeyboardUser = false;
    
    /** @type {EventTarget} */
    this.eventBus = null;
    
    this._initializeListeners();
  }

  /**
   * Initialize focus tracking and keyboard detection
   * @private
   */
  _initializeListeners() {
    // Detect keyboard usage for focus visibility
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.isKeyboardUser = true;
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      this.isKeyboardUser = false;
      document.body.classList.remove('keyboard-navigation');
    });

    // Track focus changes
    document.addEventListener('focusin', (e) => {
      this._handleFocusChange(e.target);
    });

    document.addEventListener('focusout', (e) => {
      this.previousFocus = e.target;
    });
  }

  /**
   * Connect to EventBus for event coordination
   * @param {EventTarget} eventBus - The application EventBus instance
   */
  connectEventBus(eventBus) {
    this.eventBus = eventBus;
    
    // Subscribe to focus-related commands
    this.eventBus.addEventListener('focus:request', (e) => {
      this._handleFocusRequest(e.detail);
    });

    this.eventBus.addEventListener('focus:trap', (e) => {
      this._handleTrapRequest(e.detail);
    });

    this.eventBus.addEventListener('focus:restore', (e) => {
      this._handleRestoreRequest(e.detail);
    });

    this.eventBus.addEventListener('focus:push', (e) => {
      this._handlePushRequest(e.detail);
    });

    this.eventBus.addEventListener('focus:pop', (e) => {
      this._handlePopRequest(e.detail);
    });
  }

  /**
   * Handle internal focus changes
   * @private
   * @param {HTMLElement} element - The newly focused element
   */
  _handleFocusChange(element) {
    if (element === this.currentFocus) return;

    const previousElement = this.currentFocus;
    this.currentFocus = element;

    // Publish focus change event
    if (this.eventBus) {
      this.eventBus.dispatchEvent(new CustomEvent('focus:changed', {
        detail: {
          current: element,
          previous: previousElement,
          isKeyboard: this.isKeyboardUser,
          timestamp: Date.now()
        }
      }));
    }
  }

  /**
   * Handle focus request from EventBus
   * @private
   * @param {Object} detail - Event detail
   */
  _handleFocusRequest(detail) {
    const { selector, element, options = {} } = detail;
    
    let target = element;
    if (!target && selector) {
      target = document.querySelector(selector);
    }

    if (!target) {
      console.error('[FocusManager] Focus target not found', { selector, element });
      return;
    }

    // Check if focus is trapped and target is outside trap
    if (this.trapContainer && !this.trapContainer.contains(target)) {
      console.warn('[FocusManager] Focus request blocked by trap', { target, trap: this.trapContainer });
      return;
    }

    // Apply focus with optional scroll behavior
    target.focus({
      preventScroll: options.preventScroll || false
    });

    // Optionally scroll into view
    if (options.scrollIntoView) {
      target.scrollIntoView({
        behavior: options.smooth ? 'smooth' : 'auto',
        block: options.block || 'nearest'
      });
    }
  }

  /**
   * Handle focus trap request
   * @private
   * @param {Object} detail - Event detail
   */
  _handleTrapRequest(detail) {
    const { selector, element, enable = true } = detail;
    
    if (!enable) {
      this._releaseTrap();
      return;
    }

    let container = element;
    if (!container && selector) {
      container = document.querySelector(selector);
    }

    if (!container) {
      console.error('[FocusManager] Trap container not found', { selector, element });
      return;
    }

    this._setTrap(container);
  }

  /**
   * Set focus trap on container
   * @private
   * @param {HTMLElement} container - Container to trap focus within
   */
  _setTrap(container) {
    this.trapContainer = container;
    
    // Find all focusable elements within container
    const focusableElements = this._getFocusableElements(container);
    
    if (focusableElements.length === 0) {
      console.warn('[FocusManager] No focusable elements in trap container');
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Handle Tab key to cycle focus
    this._trapHandler = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: moving backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', this._trapHandler);

    // Focus first element
    firstElement.focus();

    // Publish trap event
    if (this.eventBus) {
      this.eventBus.dispatchEvent(new CustomEvent('focus:trapped', {
        detail: { container, focusableCount: focusableElements.length }
      }));
    }
  }

  /**
   * Release focus trap
   * @private
   */
  _releaseTrap() {
    if (!this.trapContainer) return;

    if (this._trapHandler) {
      this.trapContainer.removeEventListener('keydown', this._trapHandler);
      this._trapHandler = null;
    }

    const releasedContainer = this.trapContainer;
    this.trapContainer = null;

    // Publish release event
    if (this.eventBus) {
      this.eventBus.dispatchEvent(new CustomEvent('focus:released', {
        detail: { container: releasedContainer }
      }));
    }
  }

  /**
   * Get all focusable elements within container
   * @private
   * @param {HTMLElement} container - Container to search
   * @returns {Array<HTMLElement>} Focusable elements
   */
  _getFocusableElements(container) {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(',');

    return Array.from(container.querySelectorAll(selector))
      .filter(el => {
        // Check visibility
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
      });
  }

  /**
   * Handle focus restore request
   * @private
   * @param {Object} detail - Event detail
   */
  _handleRestoreRequest(detail) {
    const { fallbackSelector } = detail || {};
    
    let target = this.previousFocus;
    
    // If no previous focus, try fallback
    if (!target && fallbackSelector) {
      target = document.querySelector(fallbackSelector);
    }

    // Last resort: focus body
    if (!target) {
      target = document.body;
    }

    target.focus();
  }

  /**
   * Handle push request - save current focus to stack
   * @private
   * @param {Object} detail - Event detail
   */
  _handlePushRequest(detail) {
    const { element } = detail || {};
    const focusToSave = element || this.currentFocus || document.activeElement;
    
    if (focusToSave && focusToSave !== document.body) {
      this.focusStack.push(focusToSave);
      
      if (this.eventBus) {
        this.eventBus.dispatchEvent(new CustomEvent('focus:pushed', {
          detail: { 
            element: focusToSave,
            stackDepth: this.focusStack.length 
          }
        }));
      }
    }
  }

  /**
   * Handle pop request - restore focus from stack
   * @private
   * @param {Object} detail - Event detail
   */
  _handlePopRequest(detail) {
    if (this.focusStack.length === 0) {
      console.warn('[FocusManager] Focus stack is empty');
      return;
    }

    const element = this.focusStack.pop();
    
    // Verify element still exists and is focusable
    if (document.body.contains(element)) {
      element.focus();
      
      if (this.eventBus) {
        this.eventBus.dispatchEvent(new CustomEvent('focus:popped', {
          detail: { 
            element,
            stackDepth: this.focusStack.length 
          }
        }));
      }
    } else {
      console.warn('[FocusManager] Popped element no longer in DOM', element);
      // Try to pop again if stack has more
      if (this.focusStack.length > 0) {
        this._handlePopRequest(detail);
      }
    }
  }

  /**
   * Get current focus state for serialization
   * @returns {Object} Serializable focus state
   */
  getState() {
    return {
      currentSelector: this._getSelector(this.currentFocus),
      previousSelector: this._getSelector(this.previousFocus),
      stackSelectors: this.focusStack.map(el => this._getSelector(el)),
      trapSelector: this._getSelector(this.trapContainer),
      isKeyboardUser: this.isKeyboardUser
    };
  }

  /**
   * Restore focus state from serialized data
   * @param {Object} state - Serialized focus state
   */
  restoreState(state) {
    if (!state) return;

    // Restore keyboard mode
    if (state.isKeyboardUser) {
      this.isKeyboardUser = true;
      document.body.classList.add('keyboard-navigation');
    }

    // Restore stack
    if (state.stackSelectors) {
      this.focusStack = state.stackSelectors
        .map(sel => document.querySelector(sel))
        .filter(el => el !== null);
    }

    // Restore trap
    if (state.trapSelector) {
      const trapEl = document.querySelector(state.trapSelector);
      if (trapEl) {
        this._setTrap(trapEl);
      }
    }

    // Restore current focus
    if (state.currentSelector) {
      const currentEl = document.querySelector(state.currentSelector);
      if (currentEl) {
        currentEl.focus();
      }
    }
  }

  /**
   * Generate a stable selector for an element
   * @private
   * @param {HTMLElement|null} element - Element to generate selector for
   * @returns {string|null} CSS selector or null
   */
  _getSelector(element) {
    if (!element || !document.body.contains(element)) return null;

    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }

    // Try data-focus-id attribute
    if (element.hasAttribute('data-focus-id')) {
      return `[data-focus-id="${element.getAttribute('data-focus-id')}"]`;
    }

    // Generate path-based selector as fallback
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        selector += '.' + Array.from(current.classList).join('.');
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  /**
   * Destroy the focus manager and clean up
   */
  destroy() {
    this._releaseTrap();
    this.focusStack = [];
    this.currentFocus = null;
    this.previousFocus = null;
    this.eventBus = null;
  }
}

// Singleton instance
let focusManagerInstance = null;

/**
 * Get the global FocusManager instance
 * @returns {FocusManager}
 */
export function getFocusManager() {
  if (!focusManagerInstance) {
    focusManagerInstance = new FocusManager();
  }
  return focusManagerInstance;
}