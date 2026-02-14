/**
 * @fileoverview Focus Trap Component with state restoration support
 * @module harmony-ui/components/focus-trap
 * 
 * Web component that traps focus within its boundaries and supports
 * state serialization. See DESIGN_SYSTEM.md § Focus Management
 */

import { focusStateManager } from '../utils/focus-state-manager.js';

/**
 * Focus Trap Web Component
 * Traps keyboard focus within its boundaries with state restoration
 * 
 * @element harmony-focus-trap
 * 
 * @attr {boolean} active - Whether the focus trap is active
 * @attr {boolean} restore-on-activate - Restore focus state when activated
 * @attr {string} context-key - Unique key for state restoration
 * 
 * @fires focus-trapped - Fired when focus is trapped
 * @fires focus-escaped - Fired when focus escapes (shouldn't happen)
 * 
 * @example
 * <harmony-focus-trap active context-key="modal-123">
 *   <button>First</button>
 *   <button>Last</button>
 * </harmony-focus-trap>
 */
export class HarmonyFocusTrap extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._active = false;
    
    /** @type {Element|null} */
    this._previouslyFocused = null;
    
    /** @type {Function} */
    this._boundHandleKeyDown = this._handleKeyDown.bind(this);
    
    /** @type {Function} */
    this._boundHandleFocusIn = this._handleFocusIn.bind(this);
  }

  static get observedAttributes() {
    return ['active', 'restore-on-activate', 'context-key'];
  }

  connectedCallback() {
    this._render();
    
    if (this.hasAttribute('active')) {
      this._activate();
    }
  }

  disconnectedCallback() {
    this._deactivate();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'active') {
      if (newValue !== null) {
        this._activate();
      } else {
        this._deactivate();
      }
    }
  }

  /**
   * Gets the context key for state restoration
   * @returns {string} Context key
   */
  get contextKey() {
    return this.getAttribute('context-key') || `focus-trap-${this._generateId()}`;
  }

  /**
   * Gets whether focus should be restored on activation
   * @returns {boolean} Restore on activate flag
   */
  get restoreOnActivate() {
    return this.hasAttribute('restore-on-activate');
  }

  /**
   * Activates the focus trap
   */
  activate() {
    this.setAttribute('active', '');
  }

  /**
   * Deactivates the focus trap
   */
  deactivate() {
    this.removeAttribute('active');
  }

  /**
   * Captures current focus state
   * @returns {boolean} True if state was captured
   */
  captureFocusState() {
    const state = focusStateManager.captureFocusState(this.contextKey);
    return state !== null;
  }

  /**
   * Restores previously captured focus state
   * @returns {Promise<boolean>} True if state was restored
   */
  async restoreFocusState() {
    return focusStateManager.restoreFocusState(this.contextKey);
  }

  /**
   * Renders the component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }

  /**
   * Activates focus trapping
   * @private
   */
  async _activate() {
    if (this._active) {
      return;
    }

    this._active = true;
    this._previouslyFocused = document.activeElement;

    // Restore focus state if requested
    if (this.restoreOnActivate) {
      const restored = await this.restoreFocusState();
      if (!restored) {
        this._focusFirstElement();
      }
    } else {
      this._focusFirstElement();
    }

    // Add event listeners
    document.addEventListener('keydown', this._boundHandleKeyDown, true);
    document.addEventListener('focusin', this._boundHandleFocusIn, true);

    this.dispatchEvent(new CustomEvent('focus-trapped', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Deactivates focus trapping
   * @private
   */
  _deactivate() {
    if (!this._active) {
      return;
    }

    this._active = false;

    // Capture state before deactivating
    this.captureFocusState();

    // Remove event listeners
    document.removeEventListener('keydown', this._boundHandleKeyDown, true);
    document.removeEventListener('focusin', this._boundHandleFocusIn, true);

    // Restore previous focus
    if (this._previouslyFocused && this._previouslyFocused.focus) {
      this._previouslyFocused.focus();
    }

    this._previouslyFocused = null;
  }

  /**
   * Handles keydown events for Tab trapping
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyDown(event) {
    if (!this._active || event.key !== 'Tab') {
      return;
    }

    const focusableElements = this._getFocusableElements();
    
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: wrap from first to last
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: wrap from last to first
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Handles focusin events to prevent focus escape
   * @private
   * @param {FocusEvent} event - Focus event
   */
  _handleFocusIn(event) {
    if (!this._active) {
      return;
    }

    const target = event.target;
    
    // Check if focus is within this trap
    if (!this.contains(target) && !this.shadowRoot.contains(target)) {
      event.preventDefault();
      event.stopPropagation();
      
      this._focusFirstElement();
      
      this.dispatchEvent(new CustomEvent('focus-escaped', {
        bubbles: true,
        composed: true,
        detail: { escapedTo: target }
      }));
    }
  }

  /**
   * Gets all focusable elements within the trap
   * @private
   * @returns {Element[]} Array of focusable elements
   */
  _getFocusableElements() {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(this.querySelectorAll(selector))
      .filter(el => el.offsetParent !== null); // Filter out hidden elements
  }

  /**
   * Focuses the first focusable element
   * @private
   */
  _focusFirstElement() {
    const focusableElements = this._getFocusableElements();
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Generates a unique ID for the trap
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

customElements.define('harmony-focus-trap', HarmonyFocusTrap);