/**
 * @fileoverview Table Core Component - Base table with header, body, row, cell composition
 * @module primitives/table/table-core
 * 
 * Implements a composable table system following atomic design principles.
 * Components: HarmonyTable, HarmonyTableHeader, HarmonyTableBody, HarmonyTableRow, HarmonyTableCell
 * 
 * Performance targets:
 * - Render budget: <16ms per frame
 * - Memory: <5MB for 1000 rows
 * - Initial render: <50ms
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#table-core}
 */

/**
 * Base table cell component
 * Renders individual table cells with proper semantics
 * 
 * @class HarmonyTableCell
 * @extends HTMLElement
 * 
 * @attr {string} align - Text alignment (left, center, right)
 * @attr {string} valign - Vertical alignment (top, middle, bottom)
 * @attr {boolean} header - Whether this is a header cell
 * 
 * @example
 * <harmony-table-cell align="center">Content</harmony-table-cell>
 */
class HarmonyTableCell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['align', 'valign', 'header'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.children.length > 0) {
      this.render();
    }
  }

  render() {
    const align = this.getAttribute('align') || 'left';
    const valign = this.getAttribute('valign') || 'middle';
    const isHeader = this.hasAttribute('header');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: table-cell;
          padding: var(--table-cell-padding, 12px 16px);
          border-bottom: 1px solid var(--table-border-color, #e0e0e0);
          text-align: ${align};
          vertical-align: ${valign};
          font-size: var(--table-font-size, 14px);
          color: var(--table-text-color, #333);
          box-sizing: border-box;
        }

        :host([header]) {
          font-weight: var(--table-header-font-weight, 600);
          background-color: var(--table-header-bg, #f5f5f5);
          border-bottom: 2px solid var(--table-header-border-color, #d0d0d0);
          color: var(--table-header-text-color, #000);
        }

        .cell-content {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <div class="cell-content">
        <slot></slot>
      </div>
    `;
  }
}

/**
 * Table row component
 * Manages a collection of cells in a row
 * 
 * @class HarmonyTableRow
 * @extends HTMLElement
 * 
 * @attr {boolean} header - Whether this is a header row
 * @attr {boolean} selected - Whether this row is selected
 * @attr {boolean} hoverable - Whether to show hover effect
 * 
 * @fires row-click - Dispatched when row is clicked
 * @fires row-select - Dispatched when row selection changes
 * 
 * @example
 * <harmony-table-row hoverable>
 *   <harmony-table-cell>Cell 1</harmony-table-cell>
 *   <harmony-table-cell>Cell 2</harmony-table-cell>
 * </harmony-table-row>
 */
class HarmonyTableRow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._handleClick = this._handleClick.bind(this);
  }

  static get observedAttributes() {
    return ['header', 'selected', 'hoverable'];
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this._handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
  }

  attributeChangedCallback() {
    if (this.shadowRoot.children.length > 0) {
      this.render();
    }
  }

  _handleClick(event) {
    // Publish row-click event via EventBus pattern
    this.dispatchEvent(new CustomEvent('row-click', {
      bubbles: true,
      composed: true,
      detail: {
        row: this,
        selected: this.hasAttribute('selected')
      }
    }));
  }

  render() {
    const isHeader = this.hasAttribute('header');
    const isSelected = this.hasAttribute('selected');
    const isHoverable = this.hasAttribute('hoverable');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: table-row;
          background-color: var(--table-row-bg, transparent);
          transition: background-color 150ms ease;
        }

        :host([hoverable]:hover) {
          background-color: var(--table-row-hover-bg, #f9f9f9);
          cursor: pointer;
        }

        :host([selected]) {
          background-color: var(--table-row-selected-bg, #e3f2fd);
        }

        :host([header]) {
          background-color: var(--table-header-bg, #f5f5f5);
        }

        .row-content {
          display: contents;
        }
      </style>
      <div class="row-content">
        <slot></slot>
      </div>
    `;
  }
}

/**
 * Table header component
 * Contains header rows
 * 
 * @class HarmonyTableHeader
 * @extends HTMLElement
 * 
 * @example
 * <harmony-table-header>
 *   <harmony-table-row header>
 *     <harmony-table-cell header>Column 1</harmony-table-cell>
 *   </harmony-table-row>
 * </harmony-table-header>
 */
class HarmonyTableHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: table-header-group;
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: var(--table-header-bg, #f5f5f5);
        }

        .header-content {
          display: contents;
        }
      </style>
      <div class="header-content">
        <slot></slot>
      </div>
    `;
  }
}

/**
 * Table body component
 * Contains data rows
 * 
 * @class HarmonyTableBody
 * @extends HTMLElement
 * 
 * @example
 * <harmony-table-body>
 *   <harmony-table-row>
 *     <harmony-table-cell>Data 1</harmony-table-cell>
 *   </harmony-table-row>
 * </harmony-table-body>
 */
class HarmonyTableBody extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: table-row-group;
        }

        .body-content {
          display: contents;
        }
      </style>
      <div class="body-content">
        <slot></slot>
      </div>
    `;
  }
}

/**
 * Main table component
 * Container for table header and body
 * 
 * @class HarmonyTable
 * @extends HTMLElement
 * 
 * @attr {string} width - Table width (auto, 100%, or specific value)
 * @attr {boolean} bordered - Show borders around cells
 * @attr {boolean} striped - Alternate row colors
 * @attr {boolean} compact - Use compact spacing
 * 
 * @fires table-ready - Dispatched when table is rendered
 * 
 * @example
 * <harmony-table bordered striped>
 *   <harmony-table-header>
 *     <harmony-table-row header>
 *       <harmony-table-cell header>Name</harmony-table-cell>
 *       <harmony-table-cell header>Age</harmony-table-cell>
 *     </harmony-table-row>
 *   </harmony-table-header>
 *   <harmony-table-body>
 *     <harmony-table-row hoverable>
 *       <harmony-table-cell>John</harmony-table-cell>
 *       <harmony-table-cell>30</harmony-table-cell>
 *     </harmony-table-row>
 *   </harmony-table-body>
 * </harmony-table>
 */
class HarmonyTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['width', 'bordered', 'striped', 'compact'];
  }

  connectedCallback() {
    this.render();
    this._notifyReady();
  }

  attributeChangedCallback() {
    if (this.shadowRoot.children.length > 0) {
      this.render();
    }
  }

  _notifyReady() {
    // Publish table-ready event via EventBus pattern
    this.dispatchEvent(new CustomEvent('table-ready', {
      bubbles: true,
      composed: true,
      detail: {
        table: this
      }
    }));
  }

  render() {
    const width = this.getAttribute('width') || 'auto';
    const bordered = this.hasAttribute('bordered');
    const striped = this.hasAttribute('striped');
    const compact = this.hasAttribute('compact');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: ${width};
          overflow-x: auto;
          font-family: var(--table-font-family, system-ui, -apple-system, sans-serif);
        }

        .table-wrapper {
          display: table;
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          background-color: var(--table-bg, #fff);
        }

        :host([bordered]) .table-wrapper {
          border: 1px solid var(--table-border-color, #e0e0e0);
        }

        :host([bordered]) ::slotted(harmony-table-cell) {
          border-right: 1px solid var(--table-border-color, #e0e0e0);
        }

        :host([striped]) ::slotted(harmony-table-body) ::slotted(harmony-table-row:nth-child(even)) {
          background-color: var(--table-striped-bg, #fafafa);
        }

        :host([compact]) {
          --table-cell-padding: 8px 12px;
        }

        /* Performance optimization: Use transform for smooth scrolling */
        .table-wrapper {
          will-change: transform;
        }
      </style>
      <div class="table-wrapper">
        <slot></slot>
      </div>
    `;
  }
}

// Register custom elements
if (!customElements.get('harmony-table-cell')) {
  customElements.define('harmony-table-cell', HarmonyTableCell);
}

if (!customElements.get('harmony-table-row')) {
  customElements.define('harmony-table-row', HarmonyTableRow);
}

if (!customElements.get('harmony-table-header')) {
  customElements.define('harmony-table-header', HarmonyTableHeader);
}

if (!customElements.get('harmony-table-body')) {
  customElements.define('harmony-table-body', HarmonyTableBody);
}

if (!customElements.get('harmony-table')) {
  customElements.define('harmony-table', HarmonyTable);
}

// Export for module usage
export {
  HarmonyTable,
  HarmonyTableHeader,
  HarmonyTableBody,
  HarmonyTableRow,
  HarmonyTableCell
};