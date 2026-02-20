/**
 * @fileoverview Bottom Navigation Component
 * @module components/mobile-navigation/bottom-nav
 * 
 * Mobile-optimized bottom navigation bar with icon + label pattern.
 * Follows Material Design bottom navigation guidelines.
 * 
 * @see DESIGN_SYSTEM.md#mobile-navigation-pattern
 * 
 * Performance Budget:
 * - Render: <2ms per interaction
 * - Memory: <1MB for component instance
 * - Touch response: <100ms
 * 
 * Events Published:
 * - harmony:navigation:item-selected { itemId, label, index }
 * 
 * @example
 * <harmony-bottom-nav>
 *   <harmony-bottom-nav-item icon="home" label="Home" item-id="home"></harmony-bottom-nav-item>
 *   <harmony-bottom-nav-item icon="search" label="Search" item-id="search"></harmony-bottom-nav-item>
 * </harmony-bottom-nav>
 */

class HarmonyBottomNav extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._selectedIndex = 0;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.selectInitialItem();
  }

  /**
   * Renders the bottom navigation container
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: var(--surface-color, #ffffff);
          border-top: 1px solid var(--border-color, #e0e0e0);
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
          contain: layout style paint;
        }

        .nav-container {
          display: flex;
          height: 56px;
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
          justify-content: space-around;
          align-items: center;
        }

        ::slotted(harmony-bottom-nav-item) {
          flex: 1;
          min-width: 0;
        }

        @media (min-width: 768px) {
          :host {
            display: none;
          }
        }

        @media (prefers-color-scheme: dark) {
          :host {
            background: var(--surface-dark, #1e1e1e);
            border-top-color: var(--border-dark, #333333);
          }
        }
      </style>
      <nav class="nav-container" role="navigation" aria-label="Primary navigation">
        <slot></slot>
      </nav>
    `;
  }

  /**
   * Sets up event delegation for nav items
   */
  setupEventListeners() {
    const slot = this.shadowRoot.querySelector('slot');
    
    slot.addEventListener('slotchange', () => {
      this.updateNavItems();
    });

    this.addEventListener('harmony:nav-item:click', (e) => {
      this.handleItemClick(e);
    });
  }

  /**
   * Updates all nav items with proper attributes
   */
  updateNavItems() {
    const items = this.getNavItems();
    items.forEach((item, index) => {
      item.setAttribute('index', index);
      if (index === this._selectedIndex) {
        item.setAttribute('selected', '');
      } else {
        item.removeAttribute('selected');
      }
    });
  }

  /**
   * Handles nav item click
   * @param {CustomEvent} e - The click event
   */
  handleItemClick(e) {
    const { index, itemId, label } = e.detail;
    this.selectItem(index);

    // Publish event via EventBus pattern
    this.dispatchEvent(new CustomEvent('harmony:navigation:item-selected', {
      bubbles: true,
      composed: true,
      detail: { itemId, label, index }
    }));
  }

  /**
   * Selects a navigation item by index
   * @param {number} index - The index to select
   */
  selectItem(index) {
    this._selectedIndex = index;
    this.updateNavItems();
  }

  /**
   * Selects initial item (first one or one with selected attribute)
   */
  selectInitialItem() {
    const items = this.getNavItems();
    const selectedItem = items.find(item => item.hasAttribute('selected'));
    if (selectedItem) {
      const index = parseInt(selectedItem.getAttribute('index'), 10);
      this._selectedIndex = index;
    }
    this.updateNavItems();
  }

  /**
   * Gets all nav item elements
   * @returns {Array<HTMLElement>} Array of nav items
   */
  getNavItems() {
    const slot = this.shadowRoot.querySelector('slot');
    return slot.assignedElements().filter(el => el.tagName === 'HARMONY-BOTTOM-NAV-ITEM');
  }
}

/**
 * Bottom Navigation Item Component
 */
class HarmonyBottomNavItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['icon', 'label', 'selected', 'badge', 'item-id'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Renders the nav item
   */
  render() {
    const icon = this.getAttribute('icon') || 'circle';
    const label = this.getAttribute('label') || '';
    const selected = this.hasAttribute('selected');
    const badge = this.getAttribute('badge');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          position: relative;
          padding: 6px 12px;
          min-width: 80px;
          max-width: 168px;
          transition: color 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        :host(:hover) {
          background: var(--hover-color, rgba(0, 0, 0, 0.04));
        }

        :host(:active) {
          background: var(--active-color, rgba(0, 0, 0, 0.08));
        }

        .icon-container {
          position: relative;
          width: 24px;
          height: 24px;
          margin-bottom: 4px;
        }

        .icon {
          width: 24px;
          height: 24px;
          fill: ${selected ? 'var(--primary-color, #1976d2)' : 'var(--text-secondary, #757575)'};
          transition: fill 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .label {
          font-size: 12px;
          font-weight: ${selected ? '600' : '400'};
          color: ${selected ? 'var(--primary-color, #1976d2)' : 'var(--text-secondary, #757575)'};
          text-align: center;
          line-height: 16px;
          transition: color 200ms cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .badge {
          position: absolute;
          top: -4px;
          right: -8px;
          background: var(--error-color, #d32f2f);
          color: white;
          border-radius: 10px;
          min-width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          padding: 0 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        @media (prefers-color-scheme: dark) {
          :host(:hover) {
            background: var(--hover-dark, rgba(255, 255, 255, 0.08));
          }

          :host(:active) {
            background: var(--active-dark, rgba(255, 255, 255, 0.12));
          }

          .icon {
            fill: ${selected ? 'var(--primary-light, #42a5f5)' : 'var(--text-secondary-dark, #b0b0b0)'};
          }

          .label {
            color: ${selected ? 'var(--primary-light, #42a5f5)' : 'var(--text-secondary-dark, #b0b0b0)'};
          }
        }
      </style>
      <div class="icon-container">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
          ${this.getIconPath(icon)}
        </svg>
        ${badge ? `<span class="badge" aria-label="${badge} notifications">${badge}</span>` : ''}
      </div>
      <span class="label">${label}</span>
    `;
  }

  /**
   * Sets up click event listener
   */
  setupEventListeners() {
    this.addEventListener('click', () => {
      const index = parseInt(this.getAttribute('index'), 10) || 0;
      const itemId = this.getAttribute('item-id') || '';
      const label = this.getAttribute('label') || '';

      this.dispatchEvent(new CustomEvent('harmony:nav-item:click', {
        bubbles: true,
        composed: true,
        detail: { index, itemId, label }
      }));
    });
  }

  /**
   * Gets SVG path for icon
   * @param {string} iconName - Name of the icon
   * @returns {string} SVG path markup
   */
  getIconPath(iconName) {
    const icons = {
      home: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>',
      search: '<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
      notifications: '<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>',
      profile: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>',
      menu: '<path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>',
      circle: '<circle cx="12" cy="12" r="8"/>'
    };
    return icons[iconName] || icons.circle;
  }
}

customElements.define('harmony-bottom-nav', HarmonyBottomNav);
customElements.define('harmony-bottom-nav-item', HarmonyBottomNavItem);