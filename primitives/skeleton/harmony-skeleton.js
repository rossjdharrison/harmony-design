/**
 * @fileoverview Harmony Skeleton - Content placeholder with animation
 * @module primitives/skeleton
 * 
 * Provides visual feedback during content loading with animated placeholders.
 * Supports multiple variants (text, circular, rectangular) and animation types.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#skeleton-atom}
 * 
 * Performance Characteristics:
 * - Uses CSS animations (GPU-accelerated)
 * - Shadow DOM for style encapsulation
 * - No layout thrashing
 * - < 1ms render time per instance
 * 
 * @example
 * <harmony-skeleton variant="text" width="200px"></harmony-skeleton>
 * <harmony-skeleton variant="circular" size="48px"></harmony-skeleton>
 * <harmony-skeleton variant="rectangular" width="100%" height="200px"></harmony-skeleton>
 */

/**
 * @class HarmonySkeleton
 * @extends HTMLElement
 * 
 * Content placeholder component with loading animation.
 * 
 * @attr {string} variant - Shape variant: 'text' | 'circular' | 'rectangular' (default: 'text')
 * @attr {string} animation - Animation type: 'pulse' | 'wave' | 'none' (default: 'pulse')
 * @attr {string} width - Width (CSS value, default: '100%')
 * @attr {string} height - Height (CSS value, default varies by variant)
 * @attr {string} size - Size for circular variant (CSS value)
 * @attr {string} border-radius - Custom border radius (CSS value)
 * 
 * @cssprop --skeleton-bg - Background color (default: var(--surface-2))
 * @cssprop --skeleton-highlight - Highlight color for animation (default: var(--surface-3))
 * @cssprop --skeleton-animation-duration - Animation duration (default: 1.5s)
 * @cssprop --skeleton-border-radius - Border radius (default varies by variant)
 * 
 * @fires skeleton:mounted - Dispatched when component mounts
 */
class HarmonySkeleton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  /**
   * Observed attributes for reactive updates
   * @returns {string[]} List of observed attribute names
   */
  static get observedAttributes() {
    return ['variant', 'animation', 'width', 'height', 'size', 'border-radius'];
  }

  /**
   * Lifecycle: Connected to DOM
   */
  connectedCallback() {
    this.render();
    this.dispatchEvent(new CustomEvent('skeleton:mounted', {
      bubbles: true,
      composed: true,
      detail: { variant: this.variant }
    }));
  }

  /**
   * Lifecycle: Attribute changed
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.shadowRoot.querySelector('.skeleton')) {
      this.render();
    }
  }

  /**
   * Get variant type
   * @returns {string} Variant type
   */
  get variant() {
    return this.getAttribute('variant') || 'text';
  }

  /**
   * Get animation type
   * @returns {string} Animation type
   */
  get animation() {
    return this.getAttribute('animation') || 'pulse';
  }

  /**
   * Get width
   * @returns {string} Width value
   */
  get width() {
    return this.getAttribute('width') || '100%';
  }

  /**
   * Get height
   * @returns {string} Height value
   */
  get height() {
    const attr = this.getAttribute('height');
    if (attr) return attr;
    
    // Default heights by variant
    switch (this.variant) {
      case 'text':
        return '1em';
      case 'circular':
        return this.size;
      case 'rectangular':
        return '200px';
      default:
        return 'auto';
    }
  }

  /**
   * Get size (for circular variant)
   * @returns {string} Size value
   */
  get size() {
    return this.getAttribute('size') || '48px';
  }

  /**
   * Get border radius
   * @returns {string} Border radius value
   */
  get borderRadius() {
    const attr = this.getAttribute('border-radius');
    if (attr) return attr;
    
    // Default border radius by variant
    switch (this.variant) {
      case 'text':
        return '4px';
      case 'circular':
        return '50%';
      case 'rectangular':
        return '8px';
      default:
        return '4px';
    }
  }

  /**
   * Render component
   */
  render() {
    const styles = this.getStyles();
    const skeleton = this.getSkeleton();

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      ${skeleton}
    `;
  }

  /**
   * Get component styles
   * @returns {string} CSS styles
   */
  getStyles() {
    return `
      :host {
        display: inline-block;
        width: ${this.width};
        vertical-align: middle;
      }

      .skeleton {
        display: block;
        width: 100%;
        height: ${this.height};
        background-color: var(--skeleton-bg, var(--surface-2, #e0e0e0));
        border-radius: var(--skeleton-border-radius, ${this.borderRadius});
        position: relative;
        overflow: hidden;
      }

      /* Pulse animation */
      .skeleton--pulse {
        animation: skeleton-pulse var(--skeleton-animation-duration, 1.5s) ease-in-out infinite;
      }

      @keyframes skeleton-pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      /* Wave animation */
      .skeleton--wave::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          var(--skeleton-highlight, var(--surface-3, #f5f5f5)),
          transparent
        );
        animation: skeleton-wave var(--skeleton-animation-duration, 1.5s) ease-in-out infinite;
        transform: translateX(-100%);
      }

      @keyframes skeleton-wave {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      /* Variant: circular */
      .skeleton--circular {
        width: ${this.size};
        height: ${this.size};
        border-radius: 50%;
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .skeleton--pulse,
        .skeleton--wave::after {
          animation: none;
        }
        .skeleton {
          opacity: 0.7;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .skeleton {
          border: 1px solid currentColor;
        }
      }
    `;
  }

  /**
   * Get skeleton HTML
   * @returns {string} HTML markup
   */
  getSkeleton() {
    const animationClass = this.animation !== 'none' ? `skeleton--${this.animation}` : '';
    const variantClass = this.variant !== 'text' ? `skeleton--${this.variant}` : '';
    
    return `
      <div 
        class="skeleton ${animationClass} ${variantClass}"
        role="status"
        aria-label="Loading content"
        aria-live="polite"
      ></div>
    `;
  }
}

// Register custom element
if (!customElements.get('harmony-skeleton')) {
  customElements.define('harmony-skeleton', HarmonySkeleton);
}

export default HarmonySkeleton;