/**
 * Badge Primitive Component
 * 
 * A foundational badge component using design tokens for colors.
 * Supports semantic variants for different message types.
 * 
 * @module primitives/badge
 * @see {@link ../DESIGN_SYSTEM.md#primitives-badge}
 */

import { colors } from '../tokens/colors.js';

/**
 * Custom badge element with design token integration
 * @extends HTMLElement
 */
class HarmonyBadge extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['variant', 'size'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) {
      this.render();
    }
  }

  /**
   * Render the badge with design tokens
   * @private
   */
  render() {
    const variant = this.getAttribute('variant') || 'neutral';
    const size = this.getAttribute('size') || 'medium';

    // Variant color mapping using semantic tokens
    const variantStyles = {
      neutral: {
        bg: colors.neutral[200],
        color: colors.ui.text.primary,
      },
      primary: {
        bg: colors.primary[500],
        color: colors.neutral[0],
      },
      success: {
        bg: colors.semantic.success.main,
        color: colors.semantic.success.contrast,
      },
      warning: {
        bg: colors.semantic.warning.main,
        color: colors.semantic.warning.contrast,
      },
      error: {
        bg: colors.semantic.error.main,
        color: colors.semantic.error.contrast,
      },
      info: {
        bg: colors.semantic.info.main,
        color: colors.semantic.info.contrast,
      },
    };

    const style = variantStyles[variant] || variantStyles.neutral;

    // Size variants
    const sizeStyles = {
      small: {
        padding: '2px 6px',
        fontSize: '12px',
      },
      medium: {
        padding: '4px 8px',
        fontSize: '14px',
      },
      large: {
        padding: '6px 12px',
        fontSize: '16px',
      },
    };

    const sizeStyle = sizeStyles[size] || sizeStyles.medium;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: 500;
          border-radius: 12px;
          white-space: nowrap;
          
          /* Size-specific styles */
          padding: ${sizeStyle.padding};
          font-size: ${sizeStyle.fontSize};
          
          /* Variant-specific colors using design tokens */
          background-color: ${style.bg};
          color: ${style.color};
          
          /* Subtle border for definition */
          border: 1px solid ${colors.ui.overlay.light};
        }
      </style>
      <span class="badge" part="badge">
        <slot></slot>
      </span>
    `;
  }
}

customElements.define('harmony-badge', HarmonyBadge);

export { HarmonyBadge };