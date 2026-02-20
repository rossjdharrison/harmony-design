/**
 * Focus Trap Utility
 * 
 * Manages focus containment within modal boundaries for accessibility.
 * Prevents keyboard navigation from escaping modal content.
 * 
 * @module utils/focus-trap
 * @see DESIGN_SYSTEM.md#focus-trap
 */

/**
 * Focusable element selector
 * @constant {string}
 */
const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex^="-"])'
].join(',');

/**
 * FocusTrap class
 * Manages focus containment within a container element
 */
export class FocusTrap {
  /**
   * @param {HTMLElement} container - The container element to trap focus within
   * @param {Object} options - Configuration options
   * @param {HTMLElement} [options.initialFocus] - Element to focus on activation
   * @param {HTMLElement} [options.returnFocus] - Element to focus on deactivation
   * @param {boolean} [options.escapeDeactivates=true] - Whether Escape key deactivates trap
   * @param {Function} [options.onDeactivate] - Callback when trap is deactivated
   * @param {Function} [options.onActivate] - Callback when trap is activated
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      initialFocus: options.initialFocus || null,
      returnFocus: options.returnFocus || null,
      escapeDeactivates: options.escapeDeactivates !== false,
      onDeactivate: options.onDeactivate || null,
      onActivate: options.onActivate || null,
      allowOutsideClick: options.allowOutsideClick || false
    };

    this.active = false;
    this.paused = false;
    this.previouslyFocusedElement = null;

    // Bind methods
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleFocusIn = this._handleFocusIn.bind(this);
    this._handleClick = this._handleClick.bind(this);
  }

  /**
   * Get all focusable elements within the container
   * @returns {HTMLElement[]} Array of focusable elements
   * @private
   */
  _getFocusableElements() {
    const elements = Array.from(
      this.container.querySelectorAll(FOCUSABLE_ELEMENTS)
    );

    return elements.filter(el => {
      // Check if element is visible and not inert
      return el.offsetParent !== null && 
             !el.hasAttribute('inert') &&
             getComputedStyle(el).visibility !== 'hidden';
    });
  }

  /**
   * Handle keydown events for focus trap
   * @param {KeyboardEvent} event
   * @private
   */
  _handleKeyDown(event) {
    if (this.paused) return;

    // Handle Escape key
    if (event.key === 'Escape' && this.options.escapeDeactivates) {
      event.preventDefault();
      this.deactivate();
      return;
    }

    // Handle Tab key
    if (event.key === 'Tab') {
      this._handleTabKey(event);
    }
  }

  /**
   * Handle Tab key navigation
   * @param {KeyboardEvent} event
   * @private
   */
  _handleTabKey(event) {
    const focusableElements = this._getFocusableElements();
    
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    // Shift + Tab on first element -> focus last
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    // Tab on last element -> focus first
    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
      return;
    }
  }

  /**
   * Handle focus events to maintain trap
   * @param {FocusEvent} event
   * @private
   */
  _handleFocusIn(event) {
    if (this.paused || !this.active) return;

    const target = event.target;

    // If focus moved outside container, bring it back
    if (!this.container.contains(target)) {
      event.stopPropagation();
      this._returnFocusToContainer();
    }
  }

  /**
   * Handle click events outside container
   * @param {MouseEvent} event
   * @private
   */
  _handleClick(event) {
    if (this.paused || !this.active) return;

    if (!this.options.allowOutsideClick && !this.container.contains(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      this._returnFocusToContainer();
    }
  }

  /**
   * Return focus to container
   * @private
   */
  _returnFocusToContainer() {
    const focusableElements = this._getFocusableElements();
    
    if (focusableElements.length > 0) {
      // Focus first element or initial focus element
      const elementToFocus = this.options.initialFocus || focusableElements[0];
      if (elementToFocus && typeof elementToFocus.focus === 'function') {
        elementToFocus.focus();
      }
    } else {
      // No focusable elements, focus container itself
      this.container.setAttribute('tabindex', '-1');
      this.container.focus();
    }
  }

  /**
   * Activate the focus trap
   * @returns {FocusTrap} Returns this for chaining
   */
  activate() {
    if (this.active) return this;

    this.active = true;
    this.paused = false;

    // Store currently focused element to return focus later
    this.previouslyFocusedElement = document.activeElement;

    // Add event listeners
    document.addEventListener('keydown', this._handleKeyDown, true);
    document.addEventListener('focusin', this._handleFocusIn, true);
    document.addEventListener('click', this._handleClick, true);

    // Set initial focus
    requestAnimationFrame(() => {
      const focusableElements = this._getFocusableElements();
      const elementToFocus = this.options.initialFocus || focusableElements[0];

      if (elementToFocus && typeof elementToFocus.focus === 'function') {
        elementToFocus.focus();
      } else if (focusableElements.length === 0) {
        // No focusable elements, make container focusable
        this.container.setAttribute('tabindex', '-1');
        this.container.focus();
      }
    });

    // Call activation callback
    if (this.options.onActivate) {
      this.options.onActivate();
    }

    return this;
  }

  /**
   * Deactivate the focus trap
   * @returns {FocusTrap} Returns this for chaining
   */
  deactivate() {
    if (!this.active) return this;

    this.active = false;
    this.paused = false;

    // Remove event listeners
    document.removeEventListener('keydown', this._handleKeyDown, true);
    document.removeEventListener('focusin', this._handleFocusIn, true);
    document.removeEventListener('click', this._handleClick, true);

    // Return focus to previously focused element
    if (this.options.returnFocus !== null) {
      const returnElement = this.options.returnFocus || this.previouslyFocusedElement;
      if (returnElement && typeof returnElement.focus === 'function') {
        requestAnimationFrame(() => {
          returnElement.focus();
        });
      }
    }

    // Call deactivation callback
    if (this.options.onDeactivate) {
      this.options.onDeactivate();
    }

    return this;
  }

  /**
   * Pause the focus trap temporarily
   * @returns {FocusTrap} Returns this for chaining
   */
  pause() {
    if (!this.active || this.paused) return this;
    this.paused = true;
    return this;
  }

  /**
   * Resume the focus trap
   * @returns {FocusTrap} Returns this for chaining
   */
  resume() {
    if (!this.active || !this.paused) return this;
    this.paused = false;
    this._returnFocusToContainer();
    return this;
  }

  /**
   * Update trap options
   * @param {Object} options - New options to merge
   * @returns {FocusTrap} Returns this for chaining
   */
  updateOptions(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Check if trap is currently active
   * @returns {boolean}
   */
  isActive() {
    return this.active;
  }

  /**
   * Check if trap is currently paused
   * @returns {boolean}
   */
  isPaused() {
    return this.paused;
  }
}

/**
 * Create and activate a focus trap
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Configuration options
 * @returns {FocusTrap} Focus trap instance
 */
export function createFocusTrap(container, options = {}) {
  const trap = new FocusTrap(container, options);
  trap.activate();
  return trap;
}