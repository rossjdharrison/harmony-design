/**
 * @fileoverview Skeleton UI Component - Loading placeholder with shimmer animation
 * @module components/skeleton
 * 
 * Provides visual feedback during content loading with customizable shapes and animations.
 * Optimized for 60fps performance using CSS transforms and GPU acceleration.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#skeleton-ui Skeleton UI Documentation}
 * 
 * @example
 * <harmony-skeleton variant="text" width="200px"></harmony-skeleton>
 * <harmony-skeleton variant="circle" size="48px"></harmony-skeleton>
 * <harmony-skeleton variant="rect" width="100%" height="120px"></harmony-skeleton>
 */

/**
 * Skeleton UI Web Component
 * 
 * Performance considerations:
 * - Uses CSS transforms for shimmer animation (GPU accelerated)
 * - Shadow DOM prevents style conflicts
 * - No JavaScript animation loop (CSS only)
 * - Minimal DOM structure for fast rendering
 * 
 * @class HarmonySkeleton
 * @extends HTMLElement
 * 
 * @property {string} variant - Shape variant: 'text', 'circle', 'rect', 'avatar'
 * @property {string} width - Width (CSS units)
 * @property {string} height - Height (CSS units)
 * @property {string} size - Size for square/circle variants (CSS units)
 * @property {boolean} animated - Enable shimmer animation (default: true)
 * @property {number} count - Number of skeleton lines for text variant (default: 1)
 * @property {string} theme - Theme: 'light' or 'dark' (default: 'light')
 */
class HarmonySkeleton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Default configuration
    this._config = {
      variant: 'rect',
      width: '100%',
      height: '20px',
      size: null,
      animated: true,
      count: 1,
      theme: 'light'
    };
  }

  /**
   * Observed attributes for reactive updates
   * @returns {string[]} List of observed attribute names
   */
  static get observedAttributes() {
    return ['variant', 'width', 'height', 'size', 'animated', 'count', 'theme'];
  }

  /**
   * Lifecycle: Connected to DOM
   */
  connectedCallback() {
    this._updateConfig();
    this._render();
  }

  /**
   * Lifecycle: Attribute changed
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._updateConfig();
      this._render();
    }
  }

  /**
   * Update internal configuration from attributes
   * @private
   */
  _updateConfig() {
    this._config.variant = this.getAttribute('variant') || 'rect';
    this._config.width = this.getAttribute('width') || '100%';
    this._config.height = this.getAttribute('height') || '20px';
    this._config.size = this.getAttribute('size');
    this._config.animated = this.getAttribute('animated') !== 'false';
    this._config.count = parseInt(this.getAttribute('count') || '1', 10);
    this._config.theme = this.getAttribute('theme') || 'light';
  }

  /**
   * Get computed dimensions based on variant
   * @private
   * @returns {{width: string, height: string}} Computed dimensions
   */
  _getComputedDimensions() {
    const { variant, width, height, size } = this._config;

    if (size) {
      return { width: size, height: size };
    }

    switch (variant) {
      case 'text':
        return { width, height: '1em' };
      case 'circle':
        return { width: '48px', height: '48px' };
      case 'avatar':
        return { width: '40px', height: '40px' };
      case 'rect':
      default:
        return { width, height };
    }
  }

  /**
   * Get border radius based on variant
   * @private
   * @returns {string} Border radius value
   */
  _getBorderRadius() {
    const { variant } = this._config;
    
    switch (variant) {
      case 'text':
        return '4px';
      case 'circle':
        return '50%';
      case 'avatar':
        return '50%';
      case 'rect':
      default:
        return '8px';
    }
  }

  /**
   * Render skeleton UI
   * @private
   */
  _render() {
    const { variant, animated, count, theme } = this._config;
    const dimensions = this._getComputedDimensions();
    const borderRadius = this._getBorderRadius();
    
    // Theme colors
    const themeColors = {
      light: {
        base: '#e0e0e0',
        highlight: '#f5f5f5',
        background: '#ffffff'
      },
      dark: {
        base: '#2a2a2a',
        highlight: '#3a3a3a',
        background: '#1a1a1a'
      }
    };
    
    const colors = themeColors[theme] || themeColors.light;

    // Generate skeleton items (for text variant with count > 1)
    const items = Array.from({ length: count }, (_, index) => {
      const isLast = index === count - 1;
      const itemWidth = isLast && count > 1 ? '80%' : dimensions.width;
      
      return `
        <div class="skeleton-item" style="
          width: ${itemWidth};
          height: ${dimensions.height};
          border-radius: ${borderRadius};
          margin-bottom: ${index < count - 1 ? '8px' : '0'};
        "></div>
      `;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          box-sizing: border-box;
        }

        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .skeleton-item {
          background: ${colors.base};
          position: relative;
          overflow: hidden;
          will-change: transform;
        }

        ${animated ? `
          .skeleton-item::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent 0%,
              ${colors.highlight} 50%,
              transparent 100%
            );
            transform: translateX(-100%);
            animation: shimmer 1.5s ease-in-out infinite;
          }

          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        ` : ''}

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .skeleton-item::after {
            animation: none;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .skeleton-item {
            border: 1px solid currentColor;
          }
        }
      </style>

      <div class="skeleton-container" role="status" aria-label="Loading content" aria-live="polite">
        ${items}
      </div>
    `;
  }
}

// Register custom element
if (!customElements.get('harmony-skeleton')) {
  customElements.define('harmony-skeleton', HarmonySkeleton);
}

export { HarmonySkeleton };