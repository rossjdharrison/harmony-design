/**
 * @fileoverview Table with Pagination Integration
 * 
 * Combines table-core, table-sorting, table-filtering, and table-pagination
 * into a complete paginated table solution.
 * 
 * @module components/table/table-with-pagination
 * @see DESIGN_SYSTEM.md#table-with-pagination
 */

import './table-core.js';
import './table-sorting.js';
import './table-filtering.js';
import './table-pagination.js';

/**
 * Table with Pagination Web Component
 * 
 * Provides complete table functionality with:
 * - Sorting
 * - Filtering
 * - Pagination
 * - Data management
 * 
 * @example
 * <table-with-pagination
 *   columns='[{"key":"name","label":"Name","sortable":true}]'
 *   page-size="10">
 * </table-with-pagination>
 */
class TableWithPagination extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._allData = [];
    this._filteredData = [];
    this._paginatedData = [];
    this._columns = [];
    this._pageSize = 10;
    this._currentPage = 1;
    this._pageSizes = [10, 20, 50, 100];
    this._sortColumn = null;
    this._sortDirection = null;
    this._filters = {};
    
    // Bind methods
    this._handleSort = this._handleSort.bind(this);
    this._handleFilter = this._handleFilter.bind(this);
    this._handlePageChange = this._handlePageChange.bind(this);
    this._handlePageSizeChange = this._handlePageSizeChange.bind(this);
  }

  static get observedAttributes() {
    return ['columns', 'page-size', 'page-sizes'];
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'columns':
        try {
          this._columns = JSON.parse(newValue);
        } catch (e) {
          console.warn('Invalid columns format', e);
        }
        break;
      case 'page-size':
        this._pageSize = parseInt(newValue, 10) || 10;
        break;
      case 'page-sizes':
        try {
          this._pageSizes = JSON.parse(newValue);
        } catch (e) {
          console.warn('Invalid page-sizes format', e);
        }
        break;
    }

    if (this.isConnected) {
      this._updateData();
      this.render();
    }
  }

  /**
   * Set table data
   * @param {Array<Object>} data - Table data
   */
  setData(data) {
    this._allData = data || [];
    this._currentPage = 1;
    this._updateData();
    this.render();
  }

  /**
   * Get current visible data
   * @returns {Array<Object>}
   */
  getData() {
    return this._paginatedData;
  }

  /**
   * Apply filters to data
   * @private
   */
  _applyFilters() {
    if (Object.keys(this._filters).length === 0) {
      this._filteredData = [...this._allData];
      return;
    }

    this._filteredData = this._allData.filter(row => {
      return Object.entries(this._filters).every(([key, filterValue]) => {
        const cellValue = row[key];
        
        if (filterValue === '' || filterValue === null || filterValue === undefined) {
          return true;
        }

        if (typeof filterValue === 'string') {
          return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
        }

        return cellValue === filterValue;
      });
    });
  }

  /**
   * Apply sorting to data
   * @private
   */
  _applySort() {
    if (!this._sortColumn || !this._sortDirection) {
      return;
    }

    this._filteredData.sort((a, b) => {
      const aVal = a[this._sortColumn];
      const bVal = b[this._sortColumn];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return this._sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Apply pagination to data
   * @private
   */
  _applyPagination() {
    const startIndex = (this._currentPage - 1) * this._pageSize;
    const endIndex = startIndex + this._pageSize;
    this._paginatedData = this._filteredData.slice(startIndex, endIndex);
  }

  /**
   * Update data after filter/sort/pagination changes
   * @private
   */
  _updateData() {
    this._applyFilters();
    this._applySort();
    this._applyPagination();
    this._updateTable();
    this._updatePagination();
  }

  /**
   * Update table with current data
   * @private
   */
  _updateTable() {
    const table = this.shadowRoot.querySelector('table-core');
    if (table) {
      table.setData(this._paginatedData);
    }
  }

  /**
   * Update pagination component
   * @private
   */
  _updatePagination() {
    const pagination = this.shadowRoot.querySelector('table-pagination');
    if (pagination) {
      pagination.setAttribute('total-items', this._filteredData.length.toString());
      pagination.setAttribute('page-size', this._pageSize.toString());
      pagination.setAttribute('current-page', this._currentPage.toString());
    }
  }

  /**
   * Handle sort event
   * @private
   * @param {CustomEvent} event
   */
  _handleSort(event) {
    const { column, direction } = event.detail;
    this._sortColumn = column;
    this._sortDirection = direction;
    this._updateData();
  }

  /**
   * Handle filter event
   * @private
   * @param {CustomEvent} event
   */
  _handleFilter(event) {
    const { column, value } = event.detail;
    
    if (value === '' || value === null || value === undefined) {
      delete this._filters[column];
    } else {
      this._filters[column] = value;
    }
    
    this._currentPage = 1; // Reset to first page on filter
    this._updateData();
  }

  /**
   * Handle page change event
   * @private
   * @param {CustomEvent} event
   */
  _handlePageChange(event) {
    this._currentPage = event.detail.page;
    this._updateData();
  }

  /**
   * Handle page size change event
   * @private
   * @param {CustomEvent} event
   */
  _handlePageSizeChange(event) {
    this._pageSize = event.detail.pageSize;
    this._currentPage = 1;
    this._updateData();
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this.shadowRoot.addEventListener('sort-change', this._handleSort);
    this.shadowRoot.addEventListener('filter-change', this._handleFilter);
    this.shadowRoot.addEventListener('page-change', this._handlePageChange);
    this.shadowRoot.addEventListener('page-size-change', this._handlePageSizeChange);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    this.shadowRoot.removeEventListener('sort-change', this._handleSort);
    this.shadowRoot.removeEventListener('filter-change', this._handleFilter);
    this.shadowRoot.removeEventListener('page-change', this._handlePageChange);
    this.shadowRoot.removeEventListener('page-size-change', this._handlePageSizeChange);
  }

  /**
   * Render component
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
        }

        .table-container {
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: 8px;
          overflow: hidden;
          background: var(--color-surface, #ffffff);
        }

        table-core {
          display: block;
        }

        table-pagination {
          display: block;
        }
      </style>

      <div class="table-container">
        <table-core
          columns='${JSON.stringify(this._columns)}'
          sortable
          filterable>
        </table-core>
        
        <table-pagination
          total-items="${this._filteredData.length}"
          page-size="${this._pageSize}"
          current-page="${this._currentPage}"
          page-sizes='${JSON.stringify(this._pageSizes)}'>
        </table-pagination>
      </div>
    `;

    // Set initial data
    this._updateTable();
  }
}

// Register custom element
customElements.define('table-with-pagination', TableWithPagination);

export default TableWithPagination;