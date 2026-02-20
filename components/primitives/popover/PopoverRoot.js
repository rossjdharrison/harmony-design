/**
 * @fileoverview Popover Root Component - Compound pattern container
 * @module components/primitives/popover/PopoverRoot
 * 
 * Manages state and coordination for Popover.Trigger and Popover.Content.
 * Handles open/close state, positioning context, and click-outside detection.
 * 
 * Related: DESIGN_SYSTEM.md § Compound Components > Popover Pattern
 */

/**
 * PopoverRoot Web Component
 * 
 * Container component that manages popover state and provides context
 * to child Trigger and Content components.
 * 
 * @element harmony-popover-root
 * 
 * @attr {boolean} open - Controls popover visibility
 * @attr {string} placement - Positioning preference (top|bottom|left|right)
 * @attr {number} offset - Distance from trigger in pixels (default: 8)
 * @attr {boolean} modal - Whether to render with backdrop (default: false)
 * 
 * @fires popover-open - Fired when popover opens
 * @fires popover-close - Fired when popover closes
 * 
 * @example
 * <harmony-popover-root placement="bottom" offset="12">
 *   <harmony-popover-trigger>Click me</harmony-popover-trigger>
 *   <harmony-popover-content>Popover content</harmony-popover-content>
 * </harmony-popover-root>
 */
class PopoverRoot extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._isOpen = false;
    
    /** @type {HTMLElement|null} */
    this._triggerElement = null;
    
    /** @type {HTMLElement|null} */
    this._contentElement = null;
    
    /** @type {Function|null} */
    this._clickOutsideHandler = null;
    
    /** @type {Function|null} */
    this._escapeHandler = null;
  }

  static get observedAttributes() {
    return ['open', 'placement', 'offset', 'modal'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    
    // Check initial open state
    if (this.hasAttribute('open')) {
      this._isOpen = true;
      this.notifyStateChange();
    }
  }

  disconnectedCallback() {
    this.removeGlobalListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      const shouldBeOpen = newValue !== null;
      if (shouldBeOpen !== this._isOpen) {
        this._isOpen = shouldBeOpen;
        this.notifyStateChange();
        
        if (shouldBeOpen) {
          this.addGlobalListeners();
          this.dispatchEvent(new CustomEvent('popover-open', {
            bubbles: true,
            composed: true
          }));
        } else {
          this.removeGlobalListeners();
          this.dispatchEvent(new CustomEvent('popover-close', {
            bubbles: true,
            composed: true
          }));
        }
      }
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
      </style>
      <slot></slot>
    `;
  }

  setupEventListeners() {
    // Listen for trigger registration
    this.addEventListener('popover-trigger-register', (e) => {
      e.stopPropagation();
      this._triggerElement = e.detail.element;
    });

    // Listen for content registration
    this.addEventListener('popover-content-register', (e) => {
      e.stopPropagation();
      this._contentElement = e.detail.element;
    });

    // Listen for trigger click
    this.addEventListener('popover-trigger-click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
  }

  /**
   * Opens the popover
   * @public
   */
  open() {
    if (!this._isOpen) {
      this.setAttribute('open', '');
    }
  }

  /**
   * Closes the popover
   * @public
   */
  close() {
    if (this._isOpen) {
      this.removeAttribute('open');
    }
  }

  /**
   * Toggles popover open/closed state
   * @public
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Notifies child components of state change
   * @private
   */
  notifyStateChange() {
    const event = new CustomEvent('popover-state-change', {
      bubbles: false,
      composed: false,
      detail: {
        isOpen: this._isOpen,
        triggerElement: this._triggerElement,
        placement: this.getAttribute('placement') || 'bottom',
        offset: parseInt(this.getAttribute('offset') || '8', 10),
        modal: this.hasAttribute('modal')
      }
    });
    
    // Dispatch to direct children
    this.dispatchEvent(event);
  }

  /**
   * Adds global event listeners for click-outside and escape
   * @private
   */
  addGlobalListeners() {
    if (this._clickOutsideHandler) return;

    this._clickOutsideHandler = (e) => {
      // Check if click is outside both trigger and content
      const path = e.composedPath();
      const clickedTrigger = this._triggerElement && path.includes(this._triggerElement);
      const clickedContent = this._contentElement && path.includes(this._contentElement);
      
      if (!clickedTrigger && !clickedContent) {
        this.close();
      }
    };

    this._escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };

    // Use setTimeout to avoid closing immediately on the same click that opened
    setTimeout(() => {
      document.addEventListener('click', this._clickOutsideHandler, true);
      document.addEventListener('keydown', this._escapeHandler);
    }, 0);
  }

  /**
   * Removes global event listeners
   * @private
   */
  removeGlobalListeners() {
    if (this._clickOutsideHandler) {
      document.removeEventListener('click', this._clickOutsideHandler, true);
      this._clickOutsideHandler = null;
    }
    
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
  }
}

customElements.define('harmony-popover-root', PopoverRoot);

export default PopoverRoot;