/**
 * @fileoverview Menu.Content - Content container for compound menu pattern
 * @module primitives/menu/menu-content
 * 
 * Container for menu items. Positioned relative to trigger.
 * Registers itself with parent Menu.Root for state management.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#compound-menu-pattern}
 */

/**
 * Menu.Content Web Component
 * 
 * Content container for menu items.
 * Must be child of harmony-menu-root.
 * 
 * @element harmony-menu-content
 * 
 * @attr {string} width - Content width: 'auto' | 'trigger' | specific value
 * 
 * @example
 * <harmony-menu-content>
 *   <harmony-menu-item>Item 1</harmony-menu-item>
 *   <harmony-menu-item>Item 2</harmony-menu-item>
 * </harmony-menu-content>
 */
class MenuContent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private @type {MenuRoot|null} */
    this._root = null;
    
    /** @private @type {boolean} */
    this._isVisible = false;
  }

  connectedCallback() {
    this.findRoot();
    this.render();
  }

  /**
   * Find parent Menu.Root
   * @private
   */
  findRoot() {
    let parent = this.parentElement;
    while (parent) {
      if (parent.tagName === 'HARMONY-MENU-ROOT') {
        this._root = parent;
        this._root.registerContent(this);
        break;
      }
      parent = parent.parentElement;
    }
    
    if (!this._root) {
      console.warn('MenuContent must be child of harmony-menu-root');
    }
  }

  /**
   * Render shadow DOM
   * @private
   */
  render() {
    const width = this.getAttribute('width') || 'auto';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          position: absolute;
          z-index: 1000;
        }
        
        :host([visible]) {
          display: block;
        }
        
        .content {
          min-width: 12rem;
          max-width: 20rem;
          padding: 0.25rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 0.375rem;
          box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
          animation: slideIn 0.15s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-0.5rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Width variants */
        :host([width="trigger"]) .content {
          width: 100%;
        }
        
        ::slotted(*) {
          /* Allow items to style themselves */
        }
      </style>
      <div class="content" role="menu">
        <slot></slot>
      </div>
    `;
  }

  /**
   * Show content
   */
  show() {
    this._isVisible = true;
    this.setAttribute('visible', '');
  }

  /**
   * Hide content
   */
  hide() {
    this._isVisible = false;
    this.removeAttribute('visible');
  }

  /**
   * Get content element for positioning
   * @returns {HTMLElement|null}
   */
  getContentElement() {
    return this.shadowRoot?.querySelector('.content');
  }

  /**
   * Check if content is visible
   * @returns {boolean}
   */
  isVisible() {
    return this._isVisible;
  }
}

customElements.define('harmony-menu-content', MenuContent);

export { MenuContent };