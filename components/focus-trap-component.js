/**
 * @fileoverview Focus Trap Web Component
 * @module components/focus-trap-component
 * 
 * A declarative web component for creating focus traps.
 * Wraps the focus trap utility in a reusable component.
 * 
 * Usage:
 * <focus-trap active loop>
 *   <div>Trapped content</div>
 * </focus-trap>
 * 
 * @see DESIGN_SYSTEM.md#focus-management-system
 */

import focusManager from '../utils/focus-manager.js';

/**
 * FocusTrapComponent - Declarative focus trap
 * @extends HTMLElement
 */
class FocusTrapComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {FocusTrap|null} */
    this.trap = null;
    
    this._render();
  }

  /**
   * Observed attributes
   * @static
   */
  static get observedAttributes() {
    return ['active', 'loop', 'allow-outside-click', 'initial-focus'];
  }

  /**
   * Component connected to DOM
   */
  connectedCallback() {
    this._setupTrap();
    
    if (this.hasAttribute('active')) {
      this._activate();
    }
  }

  /**
   * Component disconnected from DOM
   */
  disconnectedCallback() {
    this._deactivate();
  }

  /**
   * Attribute changed
   * @param {string} name - Attribute name
   * @param {string} oldValue - Old value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'active':
        if (newValue !== null) {
          this._activate();
        } else {
          this._deactivate();
        }
        break;
      
      case 'loop':
      case 'allow-outside-click':
      case 'initial-focus':
        // Recreate trap with new config
        if (this.trap) {
          const wasActive = this.trap.isActive;
          this._deactivate();
          this._setupTrap();
          if (wasActive) {
            this._activate();
          }
        }
        break;
    }
  }

  /**
   * Render component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: contents;
        }
        
        :host([hidden]) {
          display: none;
        }
      </style>
      <slot></slot>
    `;
  }

  /**
   * Setup focus trap
   * @private
   */
  _setupTrap() {
    const config = {
      container: this,
      loop: this.hasAttribute('loop'),
      allowOutsideClick: this.hasAttribute('allow-outside-click'),
      onEscape: () => {
        this.dispatchEvent(new CustomEvent('escape', {
          bubbles: true,
          composed: true,
        }));
      },
    };

    // Get initial focus element
    const initialFocusId = this.getAttribute('initial-focus');
    if (initialFocusId) {
      const initialElement = this.querySelector(`#${initialFocusId}`);
      if (initialElement) {
        config.initialFocus = initialElement;
      }
    }

    this.trap = focusManager.createTrap(config);
  }

  /**
   * Activate trap
   * @private
   */
  _activate() {
    if (this.trap && !this.trap.isActive) {
      const success = this.trap.activate();
      
      if (success) {
        this.dispatchEvent(new CustomEvent('trap-activated', {
          bubbles: true,
          composed: true,
        }));
      }
    }
  }

  /**
   * Deactivate trap
   * @private
   */
  _deactivate() {
    if (this.trap && this.trap.isActive) {
      const success = this.trap.deactivate();
      
      if (success) {
        this.dispatchEvent(new CustomEvent('trap-deactivated', {
          bubbles: true,
          composed: true,
        }));
      }
    }
  }

  /**
   * Public API: Activate trap
   */
  activate() {
    this.setAttribute('active', '');
  }

  /**
   * Public API: Deactivate trap
   */
  deactivate() {
    this.removeAttribute('active');
  }

  /**
   * Public API: Toggle trap
   */
  toggle() {
    if (this.hasAttribute('active')) {
      this.deactivate();
    } else {
      this.activate();
    }
  }
}

// Register component
customElements.define('focus-trap', FocusTrapComponent);

export default FocusTrapComponent;