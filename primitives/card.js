/**
 * Card Primitive Component
 * 
 * A foundational card component using design tokens for colors.
 * Provides a container with consistent styling and elevation.
 * 
 * @module primitives/card
 * @see {@link ../DESIGN_SYSTEM.md#primitives-card}
 */

import { colors } from '../tokens/colors.js';

/**
 * Custom card element with design token integration
 * @extends HTMLElement
 */
class HarmonyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['elevation', 'interactive'];
  }

  connectedCallback() {
    this.render();
    if (this.hasAttribute('interactive')) {
      this.setupInteractiveListeners();
    }
  }

  attributeChangedCallback() {
    if (this.shadowRoot) {
      this.render();
    }
  }

  /**
   * Setup event listeners for interactive cards
   * @private
   */
  setupInteractiveListeners() {
    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;

    card.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('harmony-card-click', {
        bubbles: true,
        composed: true
      }));
    });
  }

  /**
   * Render the card with design tokens
   * @private
   */
  render() {
    const elevation = this.getAttribute('elevation') || '1';
    const interactive = this.hasAttribute('interactive');

    // Shadow values using overlay tokens for consistency
    const shadows = {
      '0': 'none',
      '1': `0 1px 3px ${colors.ui.overlay.main}`,
      '2': `0 2px 6px ${colors.ui.overlay.main}`,
      '3': `0 4px 12px ${colors.ui.overlay.dark}`,
      '4': `0 8px 24px ${colors.ui.overlay.dark}`,
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .card {
          /* Background uses primary background token */
          background-color: ${colors.ui.background.primary};
          
          /* Border uses light border token */
          border: 1px solid ${colors.ui.border.light};
          border-radius: 8px;
          padding: 16px;
          box-shadow: ${shadows[elevation] || shadows['1']};
          transition: all 200ms ease-in-out;
        }

        /* Interactive cards get hover effects */
        .card.interactive {
          cursor: pointer;
        }

        .card.interactive:hover {
          /* Hover uses slightly darker shadow */
          box-shadow: ${shadows[Math.min(parseInt(elevation) + 1, 4)]};
          
          /* Subtle background change using overlay token */
          background-color: ${colors.ui.background.secondary};
          
          /* Border becomes more prominent */
          border-color: ${colors.ui.border.main};
        }

        .card.interactive:active {
          /* Active state uses even darker shadow */
          box-shadow: ${shadows[Math.max(parseInt(elevation) - 1, 0)]};
          transform: translateY(1px);
        }

        .card.interactive:focus-visible {
          outline: 2px solid ${colors.ui.focus.ring};
          outline-offset: 2px;
        }

        ::slotted(*) {
          color: ${colors.ui.text.primary};
        }
      </style>
      <div 
        class="card ${interactive ? 'interactive' : ''}"
        tabindex="${interactive ? '0' : '-1'}"
        role="${interactive ? 'button' : 'article'}"
        part="card"
      >
        <slot></slot>
      </div>
    `;

    if (interactive) {
      this.setupInteractiveListeners();
    }
  }
}

customElements.define('harmony-card', HarmonyCard);

export { HarmonyCard };