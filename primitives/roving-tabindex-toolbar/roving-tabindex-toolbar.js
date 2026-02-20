/**
 * @fileoverview Roving Tabindex Toolbar Component
 * 
 * Example implementation of a toolbar using the roving tabindex pattern.
 * Demonstrates horizontal arrow key navigation with proper ARIA attributes.
 * 
 * @see DESIGN_SYSTEM.md#roving-tabindex
 */

import { createRovingTabindex } from '../../utils/roving-tabindex.js';

/**
 * Toolbar component with roving tabindex navigation
 * 
 * @element roving-tabindex-toolbar
 * 
 * @attr {string} label - Accessible label for the toolbar
 * 
 * @slot - Toolbar items (buttons, links, etc.)
 * 
 * @example
 * <roving-tabindex-toolbar label="Text formatting">
 *   <button>Bold</button>
 *   <button>Italic</button>
 *   <button>Underline</button>
 * </roving-tabindex-toolbar>
 */
export class RovingTabindexToolbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._manager = null;
  }

  static get observedAttributes() {
    return ['label'];
  }

  connectedCallback() {
    this.render();
    this.setupRovingTabindex();
  }

  disconnectedCallback() {
    if (this._manager) {
      this._manager.destroy();
      this._manager = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Render the toolbar
   * @private
   */
  render() {
    const label = this.getAttribute('label') || 'Toolbar';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .toolbar {
          display: flex;
          gap: 4px;
          padding: 8px;
          background: var(--toolbar-bg, #f5f5f5);
          border: 1px solid var(--toolbar-border, #ddd);
          border-radius: 4px;
        }

        ::slotted(button),
        ::slotted(a) {
          padding: 8px 12px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.15s ease;
        }

        ::slotted(button:hover),
        ::slotted(a:hover) {
          background: var(--toolbar-item-hover-bg, #e0e0e0);
        }

        ::slotted(button:focus),
        ::slotted(a:focus) {
          outline: 2px solid var(--focus-color, #0066cc);
          outline-offset: 2px;
        }

        ::slotted(button[disabled]),
        ::slotted(button[aria-disabled="true"]) {
          opacity: 0.5;
          cursor: not-allowed;
        }

        ::slotted([data-selected]),
        ::slotted([aria-pressed="true"]) {
          background: var(--toolbar-item-active-bg, #d0d0d0);
          border-color: var(--toolbar-item-active-border, #999);
        }
      </style>
      <div class="toolbar" role="toolbar" aria-label="${label}">
        <slot></slot>
      </div>
    `;
  }

  /**
   * Set up roving tabindex navigation
   * @private
   */
  setupRovingTabindex() {
    const toolbar = this.shadowRoot.querySelector('.toolbar');
    if (!toolbar) return;

    // Wait for slotted content to be available
    requestAnimationFrame(() => {
      this._manager = createRovingTabindex(toolbar, {
        direction: 'horizontal',
        wrap: true,
        homeEndKeys: true,
        itemSelector: 'button:not([disabled]), a[href]',
        onFocusChange: (index, element) => {
          // Publish focus change event
          this.dispatchEvent(new CustomEvent('toolbar-focus-change', {
            detail: { index, element },
            bubbles: true,
            composed: true
          }));
        }
      });
    });
  }

  /**
   * Refresh the roving tabindex (call when items change)
   */
  refresh() {
    if (this._manager) {
      this._manager.refresh();
    }
  }
}

customElements.define('roving-tabindex-toolbar', RovingTabindexToolbar);