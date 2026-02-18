/**
 * @fileoverview Visual indicator for keyboard navigation focus
 * Shows when keyboard navigation is active and highlights focused elements.
 * See DESIGN_SYSTEM.md#keyboard-navigation-indicator
 * 
 * @module KeyboardNavigationIndicator
 */

/**
 * Visual indicator component for keyboard navigation
 * Automatically shows/hides based on input method (keyboard vs mouse)
 * @class KeyboardNavigationIndicator
 * @extends HTMLElement
 */
export class KeyboardNavigationIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {boolean} */
    this._keyboardActive = false;
    
    /** @type {number|null} */
    this._mouseTimer = null;
    
    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundMouseDown = this._handleMouseDown.bind(this);
  }
  
  /**
   * Component connected to DOM
   */
  connectedCallback() {
    this._render();
    this._attachListeners();
    this._updateIndicatorState();
  }
  
  /**
   * Component disconnected from DOM
   */
  disconnectedCallback() {
    this._detachListeners();
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
        
        :host(.keyboard-active) * {
          outline: none;
        }
        
        :host(.keyboard-active) *:focus {
          outline: 2px solid var(--color-primary, #4a9eff);
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(74, 158, 255, 0.2);
        }
        
        .focus-indicator {
          position: fixed;
          pointer-events: none;
          border: 2px solid var(--color-primary, #4a9eff);
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.15s ease, transform 0.15s ease;
          z-index: 10000;
          box-shadow: 0 0 0 4px rgba(74, 158, 255, 0.2);
        }
        
        .focus-indicator.visible {
          opacity: 1;
        }
        
        .keyboard-hint {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: var(--color-surface, #2a2a2a);
          color: var(--color-text, #ffffff);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-family: var(--font-family, system-ui, sans-serif);
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
          z-index: 10000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .keyboard-hint.visible {
          opacity: 1;
        }
      </style>
      
      <div class="focus-indicator"></div>
      <div class="keyboard-hint">Press Tab to navigate</div>
    `;
    
    this._indicator = this.shadowRoot.querySelector('.focus-indicator');
    this._hint = this.shadowRoot.querySelector('.keyboard-hint');
  }
  
  /**
   * Attach event listeners
   * @private
   */
  _attachListeners() {
    document.addEventListener('keydown', this._boundKeyDown);
    document.addEventListener('mousedown', this._boundMouseDown);
    document.addEventListener('focusin', this._handleFocusIn.bind(this));
  }
  
  /**
   * Detach event listeners
   * @private
   */
  _detachListeners() {
    document.removeEventListener('keydown', this._boundKeyDown);
    document.removeEventListener('mousedown', this._boundMouseDown);
  }
  
  /**
   * Handle keyboard input - activate keyboard mode
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyDown(event) {
    if (event.key === 'Tab') {
      this._keyboardActive = true;
      this._updateIndicatorState();
    }
  }
  
  /**
   * Handle mouse input - deactivate keyboard mode
   * @private
   */
  _handleMouseDown() {
    this._keyboardActive = false;
    this._updateIndicatorState();
    
    // Clear any existing timer
    if (this._mouseTimer) {
      clearTimeout(this._mouseTimer);
    }
    
    // Hide hint after mouse interaction
    this._hint.classList.remove('visible');
  }
  
  /**
   * Handle focus changes - update indicator position
   * @private
   * @param {FocusEvent} event - Focus event
   */
  _handleFocusIn(event) {
    if (!this._keyboardActive) return;
    
    const target = event.target;
    if (!target || target === document.body) {
      this._indicator.classList.remove('visible');
      return;
    }
    
    // Update indicator position to match focused element
    requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      
      this._indicator.style.left = `${rect.left - 4}px`;
      this._indicator.style.top = `${rect.top - 4}px`;
      this._indicator.style.width = `${rect.width + 8}px`;
      this._indicator.style.height = `${rect.height + 8}px`;
      this._indicator.classList.add('visible');
    });
  }
  
  /**
   * Update indicator state based on input method
   * @private
   */
  _updateIndicatorState() {
    if (this._keyboardActive) {
      this.classList.add('keyboard-active');
      
      // Show hint briefly when keyboard mode activates
      this._hint.classList.add('visible');
      if (this._mouseTimer) {
        clearTimeout(this._mouseTimer);
      }
      this._mouseTimer = setTimeout(() => {
        this._hint.classList.remove('visible');
      }, 2000);
    } else {
      this.classList.remove('keyboard-active');
      this._indicator.classList.remove('visible');
    }
  }
}

customElements.define('keyboard-navigation-indicator', KeyboardNavigationIndicator);