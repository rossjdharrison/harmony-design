/**
 * @fileoverview Skeleton Group Component - Composite skeleton layouts
 * @module components/skeleton-group
 * 
 * Provides pre-configured skeleton layouts for common UI patterns.
 * Reduces boilerplate when creating loading states for complex components.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#skeleton-ui Skeleton UI Documentation}
 * 
 * @example
 * <harmony-skeleton-group layout="card"></harmony-skeleton-group>
 * <harmony-skeleton-group layout="list" items="5"></harmony-skeleton-group>
 * <harmony-skeleton-group layout="profile"></harmony-skeleton-group>
 */

/**
 * Skeleton Group Web Component
 * 
 * Provides common skeleton layouts:
 * - card: Image + title + description
 * - list: Multiple list items with avatar
 * - profile: Avatar + name + bio
 * - article: Title + paragraphs
 * - table: Header + rows
 * 
 * @class HarmonySkeletonGroup
 * @extends HTMLElement
 * 
 * @property {string} layout - Layout type: 'card', 'list', 'profile', 'article', 'table'
 * @property {number} items - Number of items for list/table layouts
 * @property {string} theme - Theme: 'light' or 'dark'
 */
class HarmonySkeletonGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this._config = {
      layout: 'card',
      items: 3,
      theme: 'light'
    };
  }

  static get observedAttributes() {
    return ['layout', 'items', 'theme'];
  }

  connectedCallback() {
    this._updateConfig();
    this._render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this._updateConfig();
      this._render();
    }
  }

  _updateConfig() {
    this._config.layout = this.getAttribute('layout') || 'card';
    this._config.items = parseInt(this.getAttribute('items') || '3', 10);
    this._config.theme = this.getAttribute('theme') || 'light';
  }

  /**
   * Generate layout HTML based on type
   * @private
   * @returns {string} Layout HTML
   */
  _generateLayout() {
    const { layout, items, theme } = this._config;

    switch (layout) {
      case 'card':
        return this._cardLayout();
      case 'list':
        return this._listLayout(items);
      case 'profile':
        return this._profileLayout();
      case 'article':
        return this._articleLayout();
      case 'table':
        return this._tableLayout(items);
      default:
        return this._cardLayout();
    }
  }

  /**
   * Card layout: image + title + description
   * @private
   */
  _cardLayout() {
    const { theme } = this._config;
    return `
      <div class="skeleton-card">
        <harmony-skeleton variant="rect" width="100%" height="200px" theme="${theme}"></harmony-skeleton>
        <div class="skeleton-card-content">
          <harmony-skeleton variant="text" width="70%" height="24px" theme="${theme}"></harmony-skeleton>
          <harmony-skeleton variant="text" width="100%" count="3" theme="${theme}"></harmony-skeleton>
        </div>
      </div>
    `;
  }

  /**
   * List layout: multiple items with avatars
   * @private
   */
  _listLayout(count) {
    const { theme } = this._config;
    return Array.from({ length: count }, () => `
      <div class="skeleton-list-item">
        <harmony-skeleton variant="circle" size="40px" theme="${theme}"></harmony-skeleton>
        <div class="skeleton-list-content">
          <harmony-skeleton variant="text" width="40%" height="16px" theme="${theme}"></harmony-skeleton>
          <harmony-skeleton variant="text" width="80%" height="14px" theme="${theme}"></harmony-skeleton>
        </div>
      </div>
    `).join('');
  }

  /**
   * Profile layout: avatar + name + bio
   * @private
   */
  _profileLayout() {
    const { theme } = this._config;
    return `
      <div class="skeleton-profile">
        <harmony-skeleton variant="avatar" size="80px" theme="${theme}"></harmony-skeleton>
        <harmony-skeleton variant="text" width="50%" height="24px" theme="${theme}"></harmony-skeleton>
        <harmony-skeleton variant="text" width="70%" height="16px" theme="${theme}"></harmony-skeleton>
        <harmony-skeleton variant="text" width="100%" count="4" theme="${theme}"></harmony-skeleton>
      </div>
    `;
  }

  /**
   * Article layout: title + paragraphs
   * @private
   */
  _articleLayout() {
    const { theme } = this._config;
    return `
      <div class="skeleton-article">
        <harmony-skeleton variant="text" width="80%" height="32px" theme="${theme}"></harmony-skeleton>
        <harmony-skeleton variant="text" width="40%" height="16px" theme="${theme}"></harmony-skeleton>
        <harmony-skeleton variant="text" width="100%" count="5" theme="${theme}"></harmony-skeleton>
      </div>
    `;
  }

  /**
   * Table layout: header + rows
   * @private
   */
  _tableLayout(count) {
    const { theme } = this._config;
    const header = `
      <div class="skeleton-table-header">
        <harmony-skeleton variant="text" width="100%" height="20px" theme="${theme}"></harmony-skeleton>
      </div>
    `;
    
    const rows = Array.from({ length: count }, () => `
      <div class="skeleton-table-row">
        <harmony-skeleton variant="text" width="100%" height="16px" theme="${theme}"></harmony-skeleton>
      </div>
    `).join('');

    return `<div class="skeleton-table">${header}${rows}</div>`;
  }

  _render() {
    const layoutHTML = this._generateLayout();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          box-sizing: border-box;
        }

        /* Card Layout */
        .skeleton-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .skeleton-card-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* List Layout */
        .skeleton-list-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .skeleton-list-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Profile Layout */
        .skeleton-profile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        /* Article Layout */
        .skeleton-article {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Table Layout */
        .skeleton-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .skeleton-table-header {
          padding: 12px;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 4px;
        }

        .skeleton-table-row {
          padding: 12px;
        }
      </style>

      <div class="skeleton-group-container" role="status" aria-label="Loading content">
        ${layoutHTML}
      </div>
    `;
  }
}

// Register custom element
if (!customElements.get('harmony-skeleton-group')) {
  customElements.define('harmony-skeleton-group', HarmonySkeletonGroup);
}

export { HarmonySkeletonGroup };