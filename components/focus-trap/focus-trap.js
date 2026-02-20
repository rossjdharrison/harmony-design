/**
 * Focus Trap Web Component
 * 
 * Web component wrapper for focus trap functionality.
 * Automatically manages focus containment for modal content.
 * 
 * @module components/focus-trap
 * @see DESIGN_SYSTEM.md#focus-trap-component
 */

import { FocusTrap } from '../../utils/focus-trap.js';

/**
 * FocusTrapElement - Web Component for focus containment
 * 
 * @element harmony-focus-trap
 * 
 * @attr {boolean} active - Whether the focus trap is active
 * @attr {boolean} escape-deactivates - Whether Escape key deactivates the trap
 * @attr {boolean} return-focus - Whether to return focus on deactivation
 * @attr {boolean} allow-outside-click - Whether to allow clicks outside
 * 
 * @fires focus-trap:activated - Fired when trap is activated
 * @fires focus-trap:deactivated - Fired when trap is deactivated
 * 
 * @example
 * <harmony-focus-trap active>
 *   <div role="dialog">
 *     <h2>Modal Title</h2>
 *     <button>Action</button>
 *   </div>
 * </harmony-focus-trap>
 */
class FocusTrapElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this._focusTrap = null;
    this._container = null;
  }

  /**
   * Observed attributes
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['active', 'escape-deactivates', 'return-focus', 'allow-outside-click'];
  }

  /**
   * Component connected to DOM
   */
  connectedCallback() {
    this._render();
    this._setupFocusTrap();
    
    // Activate if active attribute is present
    if (this.hasAttribute('active')) {
      this.activate();
    }
  }

  /**
   * Component disconnected from DOM
   */
  disconnectedCallback() {
    this._cleanup();
  }

  /**
   * Attribute changed callback
   * @param {string} name - Attribute name
   * @param {string} oldValue - Old value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'active':
        if (newValue !== null) {
          this.activate();
        } else {
          this.deactivate();
        }
        break;
      
      case 'escape-deactivates':
      case 'return-focus':
      case 'allow-outside-click':
        if (this._focusTrap) {
          this._focusTrap.updateOptions(this._getOptions());
        }
        break;
    }
  }

  /**
   * Render component template
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }

        .focus-trap-container {
          display: contents;
        }
      </style>
      <div class="focus-trap-container" part="container">
        <slot></slot>
      </div>
    `;

    this._container = this.shadowRoot.querySelector('.focus-trap-container');
  }

  /**
   * Setup focus trap instance
   * @private
   */
  _setupFocusTrap() {
    if (this._focusTrap) {
      this._focusTrap.deactivate();
    }

    // Use the light DOM (slotted content) as the trap container
    this._focusTrap = new FocusTrap(this, this._getOptions());
  }

  /**
   * Get focus trap options from attributes
   * @returns {Object}
   * @private
   */
  _getOptions() {
    return {
      escapeDeactivates: this.hasAttribute('escape-deactivates') 
        ? this.getAttribute('escape-deactivates') !== 'false'
        : true,
      returnFocus: this.hasAttribute('return-focus')
        ? this.getAttribute('return-focus') !== 'false'
        : true,
      allowOutsideClick: this.hasAttribute('allow-outside-click')
        ? this.getAttribute('allow-outside-click') !== 'false'
        : false,
      onActivate: () => {
        this.dispatchEvent(new CustomEvent('focus-trap:activated', {
          bubbles: true,
          composed: true,
          detail: { trap: this }
        }));
      },
      onDeactivate: () => {
        this.dispatchEvent(new CustomEvent('focus-trap:deactivated', {
          bubbles: true,
          composed: true,
          detail: { trap: this }
        }));
      }
    };
  }

  /**
   * Cleanup resources
   * @private
   */
  _cleanup() {
    if (this._focusTrap) {
      this._focusTrap.deactivate();
      this._focusTrap = null;
    }
  }

  /**
   * Activate the focus trap
   * @public
   */
  activate() {
    if (this._focusTrap && !this._focusTrap.isActive()) {
      this._focusTrap.activate();
    }
  }

  /**
   * Deactivate the focus trap
   * @public
   */
  deactivate() {
    if (this._focusTrap && this._focusTrap.isActive()) {
      this._focusTrap.deactivate();
    }
  }

  /**
   * Pause the focus trap
   * @public
   */
  pause() {
    if (this._focusTrap) {
      this._focusTrap.pause();
    }
  }

  /**
   * Resume the focus trap
   * @public
   */
  resume() {
    if (this._focusTrap) {
      this._focusTrap.resume();
    }
  }

  /**
   * Check if trap is active
   * @returns {boolean}
   * @public
   */
  isActive() {
    return this._focusTrap ? this._focusTrap.isActive() : false;
  }

  /**
   * Check if trap is paused
   * @returns {boolean}
   * @public
   */
  isPaused() {
    return this._focusTrap ? this._focusTrap.isPaused() : false;
  }
}

// Register custom element
customElements.define('harmony-focus-trap', FocusTrapElement);

export { FocusTrapElement };