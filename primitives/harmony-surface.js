/**
 * @fileoverview Surface Atom - Background container with elevation, padding, radius variants
 * @module primitives/harmony-surface
 * 
 * Provides a foundational surface component for building UI with consistent
 * elevation (shadow depth), padding, and border radius variants.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#surface-atom}
 */

/**
 * HarmonySurface - Background container with elevation, padding, radius variants
 * 
 * @element harmony-surface
 * 
 * @attr {string} elevation - Elevation level: 'flat' | 'raised' | 'overlay' | 'modal'
 * @attr {string} padding - Padding size: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @attr {string} radius - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'full'
 * @attr {string} background - Background variant: 'primary' | 'secondary' | 'tertiary' | 'transparent'
 * 
 * @example
 * <harmony-surface elevation="raised" padding="md" radius="md">
 *   <p>Content goes here</p>
 * </harmony-surface>
 * 
 * @example
 * <harmony-surface elevation="modal" padding="lg" radius="lg" background="primary">
 *   <h2>Modal Content</h2>
 * </harmony-surface>
 */
class HarmonySurface extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['elevation', 'padding', 'radius', 'background'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Get elevation CSS class based on attribute
   * @returns {string} CSS class name for elevation
   * @private
   */
  _getElevationClass() {
    const elevation = this.getAttribute('elevation') || 'flat';
    const validElevations = ['flat', 'raised', 'overlay', 'modal'];
    return validElevations.includes(elevation) ? `elevation-${elevation}` : 'elevation-flat';
  }

  /**
   * Get padding CSS class based on attribute
   * @returns {string} CSS class name for padding
   * @private
   */
  _getPaddingClass() {
    const padding = this.getAttribute('padding') || 'md';
    const validPaddings = ['none', 'xs', 'sm', 'md', 'lg', 'xl'];
    return validPaddings.includes(padding) ? `padding-${padding}` : 'padding-md';
  }

  /**
   * Get radius CSS class based on attribute
   * @returns {string} CSS class name for border radius
   * @private
   */
  _getRadiusClass() {
    const radius = this.getAttribute('radius') || 'md';
    const validRadii = ['none', 'sm', 'md', 'lg', 'full'];
    return validRadii.includes(radius) ? `radius-${radius}` : 'radius-md';
  }

  /**
   * Get background CSS class based on attribute
   * @returns {string} CSS class name for background
   * @private
   */
  _getBackgroundClass() {
    const background = this.getAttribute('background') || 'primary';
    const validBackgrounds = ['primary', 'secondary', 'tertiary', 'transparent'];
    return validBackgrounds.includes(background) ? `bg-${background}` : 'bg-primary';
  }

  /**
   * Render the surface component
   * @private
   */
  render() {
    const elevationClass = this._getElevationClass();
    const paddingClass = this._getPaddingClass();
    const radiusClass = this._getRadiusClass();
    const backgroundClass = this._getBackgroundClass();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          box-sizing: border-box;
        }

        .surface {
          box-sizing: border-box;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          will-change: box-shadow;
        }

        /* Elevation variants */
        .elevation-flat {
          box-shadow: none;
        }

        .elevation-raised {
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.24);
        }

        .elevation-overlay {
          box-shadow: 
            0 3px 6px rgba(0, 0, 0, 0.16),
            0 3px 6px rgba(0, 0, 0, 0.23);
        }

        .elevation-modal {
          box-shadow: 
            0 10px 20px rgba(0, 0, 0, 0.19),
            0 6px 6px rgba(0, 0, 0, 0.23);
        }

        /* Padding variants */
        .padding-none {
          padding: 0;
        }

        .padding-xs {
          padding: var(--spacing-xs, 4px);
        }

        .padding-sm {
          padding: var(--spacing-sm, 8px);
        }

        .padding-md {
          padding: var(--spacing-md, 16px);
        }

        .padding-lg {
          padding: var(--spacing-lg, 24px);
        }

        .padding-xl {
          padding: var(--spacing-xl, 32px);
        }

        /* Border radius variants */
        .radius-none {
          border-radius: 0;
        }

        .radius-sm {
          border-radius: var(--radius-sm, 4px);
        }

        .radius-md {
          border-radius: var(--radius-md, 8px);
        }

        .radius-lg {
          border-radius: var(--radius-lg, 16px);
        }

        .radius-full {
          border-radius: 9999px;
        }

        /* Background variants */
        .bg-primary {
          background-color: var(--surface-background, #ffffff);
        }

        .bg-secondary {
          background-color: var(--surface-background-secondary, #f5f5f5);
        }

        .bg-tertiary {
          background-color: var(--surface-background-tertiary, #e0e0e0);
        }

        .bg-transparent {
          background-color: transparent;
        }

        /* Performance optimization */
        @media (prefers-reduced-motion: reduce) {
          .surface {
            transition: none;
          }
        }
      </style>
      <div class="surface ${elevationClass} ${paddingClass} ${radiusClass} ${backgroundClass}">
        <slot></slot>
      </div>
    `;
  }
}

// Register the custom element
customElements.define('harmony-surface', HarmonySurface);

export { HarmonySurface };