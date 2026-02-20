/**
 * @fileoverview Select.Content - Dropdown content container for select options
 * @module components/primitives/select/select-content
 * 
 * Container for select options with positioning and animation.
 * 
 * @see {@link ../../../../DESIGN_SYSTEM.md#compound-select-pattern}
 * 
 * Performance Budget:
 * - Render: <2ms
 * - Animation: 60fps
 * - Memory: <10KB per instance
 */

/**
 * SelectContent - Dropdown content container
 * 
 * @class SelectContent
 * @extends HTMLElement
 * 
 * @attr {string} position - Position relative to trigger (bottom, top, auto)
 * @attr {number} max-height - Maximum height in pixels
 * 
 * @example
 * <select-content position="bottom" max-height="300">
 *   <select-option value="1">Option 1</select-option>
 *   <select-option value="2">Option 2</select-option>
 * </select-content>
 */
class SelectContent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private @type {SelectRoot|null} */
    this._context = null;
    
    /** @private @type {boolean} */
    this._visible = false;
  }

  static get observedAttributes() {
    return ['position', 'max-height'];
  }

  connectedCallback() {
    this.render();
    this.hide(); // Start hidden
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.render();
  }

  /**
   * Render shadow DOM structure
   * @private
   */
  render() {
    const position = this.getAttribute('position') || 'bottom';
    const maxHeight = this.getAttribute('max-height') || '300';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: absolute;
          z-index: var(--z-index-dropdown, 1000);
          width: 100%;
          margin-top: var(--spacing-1, 0.25rem);
        }

        :host([data-position="top"]) {
          margin-top: 0;
          margin-bottom: var(--spacing-1, 0.25rem);
        }

        .content {
          background: var(--color-surface, white);
          border: 1px solid var(--color-border, #d1d5db);
          border-radius: var(--radius-md, 0.375rem);
          box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
          max-height: ${maxHeight}px;
          overflow-y: auto;
          opacity: 0;
          transform: translateY(-8px);
          transition: opacity 0.15s ease, transform 0.15s ease;
          will-change: opacity, transform;
        }

        :host([data-position="top"]) .content {
          transform: translateY(8px);
        }

        .content[data-visible="true"] {
          opacity: 1;
          transform: translateY(0);
        }

        .content::-webkit-scrollbar {
          width: 8px;
        }

        .content::-webkit-scrollbar-track {
          background: var(--color-surface, white);
        }

        .content::-webkit-scrollbar-thumb {
          background: var(--color-border, #d1d5db);
          border-radius: 4px;
        }

        .content::-webkit-scrollbar-thumb:hover {
          background: var(--color-border-hover, #9ca3af);
        }

        ::slotted(select-option) {
          display: block;
        }
      </style>
      <div class="content" part="content" role="listbox">
        <slot></slot>
      </div>
    `;
  }

  /**
   * Set context (parent SelectRoot)
   * @param {SelectRoot} context
   */
  setContext(context) {
    this._context = context;
  }

  /**
   * Show content
   */
  show() {
    this._visible = true;
    this.style.display = 'block';
    
    // Force reflow for animation
    requestAnimationFrame(() => {
      const content = this.shadowRoot.querySelector('.content');
      if (content) {
        content.setAttribute('data-visible', 'true');
      }
    });
    
    this.updatePosition();
  }

  /**
   * Hide content
   */
  hide() {
    this._visible = false;
    const content = this.shadowRoot.querySelector('.content');
    if (content) {
      content.setAttribute('data-visible', 'false');
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      if (!this._visible) {
        this.style.display = 'none';
      }
    }, 150);
  }

  /**
   * Update position relative to trigger
   * @private
   */
  updatePosition() {
    if (!this._context) return;
    
    const position = this.getAttribute('position') || 'auto';
    
    if (position === 'auto') {
      // Calculate best position based on viewport
      const rect = this._context.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const contentHeight = parseInt(this.getAttribute('max-height') || '300');
      
      if (spaceBelow < contentHeight && spaceAbove > spaceBelow) {
        this.setAttribute('data-position', 'top');
        this.style.bottom = '100%';
        this.style.top = 'auto';
      } else {
        this.setAttribute('data-position', 'bottom');
        this.style.top = '100%';
        this.style.bottom = 'auto';
      }
    } else if (position === 'top') {
      this.setAttribute('data-position', 'top');
      this.style.bottom = '100%';
      this.style.top = 'auto';
    } else {
      this.setAttribute('data-position', 'bottom');
      this.style.top = '100%';
      this.style.bottom = 'auto';
    }
  }
}

customElements.define('select-content', SelectContent);

export { SelectContent };