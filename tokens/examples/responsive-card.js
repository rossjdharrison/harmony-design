/**
 * @fileoverview Example component demonstrating responsive token usage
 * @module tokens/examples/responsive-card
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#responsive-tokens}
 */

import { ResponsiveTokenMixin, tokenVar } from '../responsive-token-mixin.js';

/**
 * Responsive card component that adapts padding and spacing based on breakpoint
 * @extends {HTMLElement}
 * 
 * @example
 * <responsive-card>
 *   <h2 slot="title">Card Title</h2>
 *   <p>Card content goes here</p>
 * </responsive-card>
 */
class ResponsiveCard extends ResponsiveTokenMixin(HTMLElement) {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Bind tokens to update styles dynamically
    this.bindToken('card-padding', (value) => {
      const container = this.shadowRoot.querySelector('.card');
      if (container) {
        container.style.padding = value;
      }
    });
    
    this.bindToken('spacing-content-gap', (value) => {
      const container = this.shadowRoot.querySelector('.card');
      if (container) {
        container.style.gap = value;
      }
    });
  }
  
  /**
   * Called when breakpoint changes
   * @param {string} breakpoint - New breakpoint name
   */
  onBreakpointChange(breakpoint) {
    console.log(`Card breakpoint changed to: ${breakpoint}`);
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .card {
          display: flex;
          flex-direction: column;
          gap: ${tokenVar('spacing-content-gap')};
          padding: ${tokenVar('card-padding')};
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .card-title {
          margin: 0;
          font-size: ${tokenVar('font-size-h3')};
          line-height: ${tokenVar('line-height-heading')};
          color: var(--color-text-primary, #000000);
        }
        
        .card-content {
          font-size: ${tokenVar('font-size-body')};
          line-height: ${tokenVar('line-height-body')};
          color: var(--color-text-secondary, #666666);
        }
      </style>
      
      <div class="card">
        <div class="card-title">
          <slot name="title"></slot>
        </div>
        <div class="card-content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

customElements.define('responsive-card', ResponsiveCard);

export { ResponsiveCard };