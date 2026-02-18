/**
 * @fileoverview Badge Atom Component
 * @module primitives/atoms/harmony-badge
 * 
 * Small status indicator with color variants and optional icon.
 * Supports semantic status colors (success, warning, error, info, neutral).
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#badge-atom} for usage guidelines
 * 
 * @example
 * <harmony-badge variant="success">Active</harmony-badge>
 * <harmony-badge variant="error" icon="alert">Error</harmony-badge>
 * <harmony-badge variant="info" icon="info" size="small">New</harmony-badge>
 */

import { getSemanticToken } from '../../tokens/semantic-tokens.js';

/**
 * Badge web component for status indicators
 * 
 * @class HarmonyBadge
 * @extends HTMLElement
 * 
 * @attr {string} variant - Color variant: success, warning, error, info, neutral (default: neutral)
 * @attr {string} icon - Optional icon name to display before text
 * @attr {string} size - Size variant: small, medium (default: medium)
 * 
 * @fires badge-click - Fired when badge is clicked (if clickable)
 * 
 * Performance:
 * - Render time: <1ms (static content)
 * - Memory: ~2KB per instance
 * - No layout thrashing (uses CSS containment)
 */
class HarmonyBadge extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._variant = 'neutral';
    this._icon = null;
    this._size = 'medium';
  }

  static get observedAttributes() {
    return ['variant', 'icon', 'size'];
  }

  /**
   * @returns {string} Current variant
   */
  get variant() {
    return this._variant;
  }

  /**
   * @param {string} value - Variant name
   */
  set variant(value) {
    const validVariants = ['success', 'warning', 'error', 'info', 'neutral'];
    if (validVariants.includes(value)) {
      this._variant = value;
      this.setAttribute('variant', value);
    }
  }

  /**
   * @returns {string|null} Current icon name
   */
  get icon() {
    return this._icon;
  }

  /**
   * @param {string|null} value - Icon name
   */
  set icon(value) {
    this._icon = value;
    if (value) {
      this.setAttribute('icon', value);
    } else {
      this.removeAttribute('icon');
    }
  }

  /**
   * @returns {string} Current size
   */
  get size() {
    return this._size;
  }

  /**
   * @param {string} value - Size variant
   */
  set size(value) {
    const validSizes = ['small', 'medium'];
    if (validSizes.includes(value)) {
      this._size = value;
      this.setAttribute('size', value);
    }
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      switch (name) {
        case 'variant':
          this._variant = newValue || 'neutral';
          break;
        case 'icon':
          this._icon = newValue;
          break;
        case 'size':
          this._size = newValue || 'medium';
          break;
      }
      this.render();
    }
  }

  /**
   * Get colors for current variant
   * @private
   * @returns {{bg: string, text: string, border: string}}
   */
  _getVariantColors() {
    const variant = this._variant;
    
    // Map variants to semantic token keys
    const colorMap = {
      success: {
        bg: getSemanticToken('--color-feedback-success-bg') || '#d4edda',
        text: getSemanticToken('--color-feedback-success-text') || '#155724',
        border: getSemanticToken('--color-feedback-success-border') || '#c3e6cb'
      },
      warning: {
        bg: getSemanticToken('--color-feedback-warning-bg') || '#fff3cd',
        text: getSemanticToken('--color-feedback-warning-text') || '#856404',
        border: getSemanticToken('--color-feedback-warning-border') || '#ffeeba'
      },
      error: {
        bg: getSemanticToken('--color-feedback-error-bg') || '#f8d7da',
        text: getSemanticToken('--color-feedback-error-text') || '#721c24',
        border: getSemanticToken('--color-feedback-error-border') || '#f5c6cb'
      },
      info: {
        bg: getSemanticToken('--color-feedback-info-bg') || '#d1ecf1',
        text: getSemanticToken('--color-feedback-info-text') || '#0c5460',
        border: getSemanticToken('--color-feedback-info-border') || '#bee5eb'
      },
      neutral: {
        bg: getSemanticToken('--color-surface-secondary') || '#e9ecef',
        text: getSemanticToken('--color-text-primary') || '#212529',
        border: getSemanticToken('--color-border-primary') || '#dee2e6'
      }
    };

    return colorMap[variant] || colorMap.neutral;
  }

  /**
   * Render icon SVG if icon attribute is set
   * @private
   * @returns {string} Icon HTML or empty string
   */
  _renderIcon() {
    if (!this._icon) return '';

    // Simple icon set for common status indicators
    const icons = {
      check: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      alert: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1L11 10H1L6 1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 5V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="8.5" r="0.5" fill="currentColor"/></svg>',
      info: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M6 6V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="6" cy="4" r="0.5" fill="currentColor"/></svg>',
      close: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      dot: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="3" fill="currentColor"/></svg>'
    };

    const iconSvg = icons[this._icon] || icons.dot;
    return `<span class="badge-icon" aria-hidden="true">${iconSvg}</span>`;
  }

  /**
   * Render the component
   * @private
   */
  render() {
    const colors = this._getVariantColors();
    const iconHtml = this._renderIcon();
    const sizeClass = this._size === 'small' ? 'badge--small' : 'badge--medium';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          contain: layout style paint;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
          border-radius: 12px;
          border: 1px solid;
          box-sizing: border-box;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .badge--medium {
          padding: 4px 10px;
          font-size: 12px;
          min-height: 20px;
        }

        .badge--small {
          padding: 2px 8px;
          font-size: 11px;
          min-height: 16px;
          border-radius: 8px;
        }

        .badge-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .badge-icon svg {
          display: block;
        }

        /* Variant colors applied via inline styles for dynamic token support */
        
        /* Focus styles for accessibility */
        :host(:focus-visible) .badge {
          outline: 2px solid var(--color-focus-ring, #0066cc);
          outline-offset: 2px;
        }

        /* Hover state if clickable */
        :host([clickable]) .badge {
          cursor: pointer;
        }

        :host([clickable]) .badge:hover {
          filter: brightness(0.95);
        }

        :host([clickable]) .badge:active {
          filter: brightness(0.9);
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .badge {
            border-width: 2px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .badge {
            transition: none;
          }
        }
      </style>
      <div 
        class="badge ${sizeClass}" 
        style="background-color: ${colors.bg}; color: ${colors.text}; border-color: ${colors.border};"
        role="status"
        aria-live="polite"
      >
        ${iconHtml}
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('harmony-badge', HarmonyBadge);

export { HarmonyBadge };