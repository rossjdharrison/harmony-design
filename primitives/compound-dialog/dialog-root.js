/**
 * @fileoverview Dialog.Root - Root container for dialog compound pattern
 * @module primitives/compound-dialog/dialog-root
 * 
 * Manages dialog state, focus trap, and coordinates child components.
 * Implements ARIA dialog pattern with keyboard navigation.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#compound-patterns}
 */

/**
 * DialogRoot Web Component
 * 
 * Root component that manages dialog state and provides context to children.
 * Handles open/close state, backdrop clicks, and ESC key handling.
 * 
 * @element dialog-root
 * 
 * @attr {boolean} open - Controls dialog visibility
 * @attr {boolean} modal - Whether dialog is modal (blocks interaction with page)
 * @attr {string} close-on - Space-separated list: "backdrop", "escape"
 * 
 * @fires dialog-open - Fired when dialog opens
 * @fires dialog-close - Fired when dialog closes
 * 
 * @example
 * <dialog-root open modal close-on="backdrop escape">
 *   <dialog-trigger>Open</dialog-trigger>
 *   <dialog-content>
 *     <h2>Title</h2>
 *     <p>Content</p>
 *     <dialog-close>Close</dialog-close>
 *   </dialog-content>
 * </dialog-root>
 */
class DialogRoot extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._isOpen = false;
    
    /** @type {Element|null} */
    this._previouslyFocusedElement = null;
    
    /** @type {Element[]} */
    this._focusableElements = [];
    
    /** @type {number} */
    this._currentFocusIndex = 0;
    
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleBackdropClick = this._handleBackdropClick.bind(this);
  }

  static get observedAttributes() {
    return ['open', 'modal', 'close-on'];
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
    
    // Check initial open state
    if (this.hasAttribute('open')) {
      this._open();
    }
  }

  disconnectedCallback() {
    this._cleanupEventListeners();
    if (this._isOpen) {
      this._restoreFocus();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      if (newValue !== null && !this._isOpen) {
        this._open();
      } else if (newValue === null && this._isOpen) {
        this._close();
      }
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
        
        ::slotted(dialog-content) {
          display: none;
        }
        
        :host([open]) ::slotted(dialog-content) {
          display: block;
        }
      </style>
      <slot></slot>
    `;
  }

  /**
   * Opens the dialog
   * @private
   */
  _open() {
    if (this._isOpen) return;
    
    this._isOpen = true;
    this._previouslyFocusedElement = document.activeElement;
    
    this.setAttribute('open', '');
    
    // Wait for next frame to ensure content is rendered
    requestAnimationFrame(() => {
      this._setupFocusTrap();
      this._focusFirstElement();
      
      // Dispatch open event
      this.dispatchEvent(new CustomEvent('dialog-open', {
        bubbles: true,
        composed: true,
        detail: { dialogRoot: this }
      }));
    });
  }

  /**
   * Closes the dialog
   * @private
   */
  _close() {
    if (!this._isOpen) return;
    
    this._isOpen = false;
    this.removeAttribute('open');
    this._restoreFocus();
    
    // Dispatch close event
    this.dispatchEvent(new CustomEvent('dialog-close', {
      bubbles: true,
      composed: true,
      detail: { dialogRoot: this }
    }));
  }

  /**
   * Sets up focus trap for modal dialogs
   * @private
   */
  _setupFocusTrap() {
    const content = this.querySelector('dialog-content');
    if (!content) return;
    
    // Find all focusable elements within dialog content
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'dialog-close'
    ].join(',');
    
    this._focusableElements = Array.from(
      content.querySelectorAll(focusableSelectors)
    ).filter(el => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    this._currentFocusIndex = 0;
  }

  /**
   * Focuses the first focusable element
   * @private
   */
  _focusFirstElement() {
    if (this._focusableElements.length > 0) {
      this._focusableElements[0].focus();
    }
  }

  /**
   * Restores focus to previously focused element
   * @private
   */
  _restoreFocus() {
    if (this._previouslyFocusedElement && 
        typeof this._previouslyFocusedElement.focus === 'function') {
      this._previouslyFocusedElement.focus();
    }
    this._previouslyFocusedElement = null;
  }

  /**
   * Handles keyboard navigation within dialog
   * @param {KeyboardEvent} event
   * @private
   */
  _handleKeyDown(event) {
    if (!this._isOpen) return;
    
    const closeOn = this.getAttribute('close-on') || '';
    
    // ESC key handling
    if (event.key === 'Escape' && closeOn.includes('escape')) {
      event.preventDefault();
      this._close();
      return;
    }
    
    // Tab key handling for focus trap
    if (event.key === 'Tab' && this.hasAttribute('modal')) {
      if (this._focusableElements.length === 0) {
        event.preventDefault();
        return;
      }
      
      event.preventDefault();
      
      if (event.shiftKey) {
        // Shift+Tab - move focus backward
        this._currentFocusIndex--;
        if (this._currentFocusIndex < 0) {
          this._currentFocusIndex = this._focusableElements.length - 1;
        }
      } else {
        // Tab - move focus forward
        this._currentFocusIndex++;
        if (this._currentFocusIndex >= this._focusableElements.length) {
          this._currentFocusIndex = 0;
        }
      }
      
      this._focusableElements[this._currentFocusIndex].focus();
    }
  }

  /**
   * Handles backdrop click
   * @param {MouseEvent} event
   * @private
   */
  _handleBackdropClick(event) {
    const closeOn = this.getAttribute('close-on') || '';
    if (!closeOn.includes('backdrop')) return;
    
    const content = this.querySelector('dialog-content');
    if (!content) return;
    
    // Check if click is outside content
    const rect = content.getBoundingClientRect();
    const isOutside = (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
    
    if (isOutside) {
      this._close();
    }
  }

  /**
   * Sets up event listeners
   * @private
   */
  _setupEventListeners() {
    document.addEventListener('keydown', this._handleKeyDown);
    
    // Listen for trigger clicks
    this.addEventListener('dialog-trigger-click', () => {
      if (!this._isOpen) {
        this._open();
      }
    });
    
    // Listen for close clicks
    this.addEventListener('dialog-close-click', () => {
      if (this._isOpen) {
        this._close();
      }
    });
    
    // Listen for backdrop clicks on content
    const content = this.querySelector('dialog-content');
    if (content) {
      content.addEventListener('click', this._handleBackdropClick);
    }
  }

  /**
   * Cleans up event listeners
   * @private
   */
  _cleanupEventListeners() {
    document.removeEventListener('keydown', this._handleKeyDown);
    
    const content = this.querySelector('dialog-content');
    if (content) {
      content.removeEventListener('click', this._handleBackdropClick);
    }
  }

  /**
   * Public API: Open the dialog
   * @public
   */
  open() {
    this.setAttribute('open', '');
  }

  /**
   * Public API: Close the dialog
   * @public
   */
  close() {
    this.removeAttribute('open');
  }

  /**
   * Public API: Toggle the dialog
   * @public
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}

customElements.define('dialog-root', DialogRoot);

export default DialogRoot;