/**
 * @fileoverview Web Component mixin for responsive token support
 * @module tokens/responsive-token-mixin
 * 
 * Provides a mixin that adds responsive token functionality to Web Components
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#responsive-tokens}
 */

import {
  getResponsiveTokenValue,
  getCurrentBreakpoint,
  onBreakpointChange,
} from './responsive-tokens.js';

/**
 * Mixin that adds responsive token support to a Web Component
 * @param {typeof HTMLElement} Base - Base class to extend
 * @returns {typeof HTMLElement} Extended class with responsive token support
 * 
 * @example
 * class MyComponent extends ResponsiveTokenMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback();
 *     const margin = this.getToken('spacing-page-margin');
 *     this.style.margin = margin;
 *   }
 * }
 */
export function ResponsiveTokenMixin(Base) {
  return class extends Base {
    constructor() {
      super();
      
      /** @private */
      this._breakpointUnsubscribe = null;
      
      /** @private */
      this._tokenBindings = new Map();
    }
    
    /**
     * Get responsive token value for current breakpoint
     * @param {string} tokenName - Token name
     * @returns {string|null} Token value
     */
    getToken(tokenName) {
      return getResponsiveTokenValue(tokenName);
    }
    
    /**
     * Get current breakpoint
     * @returns {string} Current breakpoint name
     */
    getCurrentBreakpoint() {
      return getCurrentBreakpoint();
    }
    
    /**
     * Bind a token to a callback function
     * The callback will be called whenever the breakpoint changes
     * @param {string} tokenName - Token name
     * @param {Function} callback - Callback function receiving token value
     */
    bindToken(tokenName, callback) {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      
      this._tokenBindings.set(tokenName, callback);
      
      // Call immediately with current value
      const value = this.getToken(tokenName);
      if (value !== null) {
        callback(value);
      }
    }
    
    /**
     * Unbind a token callback
     * @param {string} tokenName - Token name
     */
    unbindToken(tokenName) {
      this._tokenBindings.delete(tokenName);
    }
    
    /**
     * Handle breakpoint changes
     * @private
     */
    _handleBreakpointChange() {
      this._tokenBindings.forEach((callback, tokenName) => {
        const value = this.getToken(tokenName);
        if (value !== null) {
          try {
            callback(value);
          } catch (error) {
            console.error(
              `Error in token binding callback for "${tokenName}":`,
              error
            );
          }
        }
      });
      
      // Call lifecycle hook if implemented
      if (typeof this.onBreakpointChange === 'function') {
        this.onBreakpointChange(getCurrentBreakpoint());
      }
    }
    
    /**
     * Called when component is connected to DOM
     */
    connectedCallback() {
      if (super.connectedCallback) {
        super.connectedCallback();
      }
      
      // Subscribe to breakpoint changes
      this._breakpointUnsubscribe = onBreakpointChange(() => {
        this._handleBreakpointChange();
      });
    }
    
    /**
     * Called when component is disconnected from DOM
     */
    disconnectedCallback() {
      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }
      
      // Unsubscribe from breakpoint changes
      if (this._breakpointUnsubscribe) {
        this._breakpointUnsubscribe();
        this._breakpointUnsubscribe = null;
      }
      
      // Clear token bindings
      this._tokenBindings.clear();
    }
  };
}

/**
 * Helper function to create CSS custom property references
 * @param {string} tokenName - Token name
 * @returns {string} CSS var() reference
 * 
 * @example
 * const margin = tokenVar('spacing-page-margin');
 * // Returns: 'var(--spacing-page-margin)'
 */
export function tokenVar(tokenName) {
  return `var(--${tokenName})`;
}

/**
 * Helper function to create CSS custom property references with fallback
 * @param {string} tokenName - Token name
 * @param {string} fallback - Fallback value
 * @returns {string} CSS var() reference with fallback
 * 
 * @example
 * const margin = tokenVarWithFallback('spacing-page-margin', '16px');
 * // Returns: 'var(--spacing-page-margin, 16px)'
 */
export function tokenVarWithFallback(tokenName, fallback) {
  return `var(--${tokenName}, ${fallback})`;
}