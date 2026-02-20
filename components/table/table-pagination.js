/**
 * @fileoverview Table Pagination Component
 * 
 * Provides pagination controls with:
 * - Page size selection
 * - Page navigation (first, previous, next, last)
 * - Current page indicator
 * - Total items/pages display
 * 
 * Performance targets:
 * - Render: <16ms per frame
 * - Memory: Minimal overhead
 * 
 * @module components/table/table-pagination
 * @see DESIGN_SYSTEM.md#table-pagination
 */

/**
 * Table Pagination Web Component
 * 
 * @fires page-change - Emitted when page changes { page: number, pageSize: number }
 * @fires page-size-change - Emitted when page size changes { pageSize: number }
 * 
 * @example
 * <table-pagination
 *   total-items="100"
 *   page-size="10"
 *   current-page="1"
 *   page-sizes="[5,10,20,50]">
 * </table-pagination>
 */
class TablePagination extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._totalItems = 0;
    this._pageSize = 10;
    this._currentPage = 1;
    this._pageSizes = [10, 20, 50, 100];
    
    // Bind methods
    this._handleFirstPage = this._handleFirstPage.bind(this);
    this._handlePreviousPage = this._handlePreviousPage.bind(this);
    this._handleNextPage = this._handleNextPage.bind(this);
    this._handleLastPage = this._handleLastPage.bind(this);
    this._handlePageSizeChange = this._handlePageSizeChange.bind(this);
    this._handlePageInput = this._handlePageInput.bind(this);
  }

  static get observedAttributes() {
    return ['total-items', 'page-size', 'current-page', 'page-sizes'];
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
      case 'total-items':
        this._totalItems = parseInt(newValue, 10) || 0;
        break;
      case 'page-size':
        this._pageSize = parseInt(newValue, 10) || 10;
        break;
      case 'current-page':
        this._currentPage = parseInt(newValue, 10) || 1;
        break;
      case 'page-sizes':
        try {
          this._pageSizes = JSON.parse(newValue);
        } catch (e) {
          console.warn('Invalid page-sizes format, using default', e);
        }
        break;
    }

    if (this.isConnected) {
      this.render();
    }
  }

  /**
   * Get total number of pages
   * @returns {number}
   */
  get totalPages() {
    return Math.ceil(this._totalItems / this._pageSize) || 1;
  }

  /**
   * Get start index of current page
   * @returns {number}
   */
  get startIndex() {
    return (this._currentPage - 1) * this._pageSize + 1;
  }

  /**
   * Get end index of current page
   * @returns {number}
   */
  get endIndex() {
    return Math.min(this._currentPage * this._pageSize, this._totalItems);
  }

  /**
   * Check if on first page
   * @returns {boolean}
   */
  get isFirstPage() {
    return this._currentPage === 1;
  }

  /**
   * Check if on last page
   * @returns {boolean}
   */
  get isLastPage() {
    return this._currentPage >= this.totalPages;
  }

  /**
   * Navigate to specific page
   * @param {number} page - Page number (1-indexed)
   */
  goToPage(page) {
    const newPage = Math.max(1, Math.min(page, this.totalPages));
    if (newPage !== this._currentPage) {
      this._currentPage = newPage;
      this.setAttribute('current-page', newPage.toString());
      this._emitPageChange();
      this.render();
    }
  }

  /**
   * Change page size
   * @param {number} pageSize - New page size
   */
  setPageSize(pageSize) {
    if (pageSize !== this._pageSize) {
      this._pageSize = pageSize;
      this._currentPage = 1; // Reset to first page
      this.setAttribute('page-size', pageSize.toString());
      this.setAttribute('current-page', '1');
      this._emitPageSizeChange();
      this.render();
    }
  }

  /**
   * Handle first page button click
   * @private
   */
  _handleFirstPage() {
    this.goToPage(1);
  }

  /**
   * Handle previous page button click
   * @private
   */
  _handlePreviousPage() {
    this.goToPage(this._currentPage - 1);
  }

  /**
   * Handle next page button click
   * @private
   */
  _handleNextPage() {
    this.goToPage(this._currentPage + 1);
  }

  /**
   * Handle last page button click
   * @private
   */
  _handleLastPage() {
    this.goToPage(this.totalPages);
  }

  /**
   * Handle page size selection change
   * @private
   * @param {Event} event
   */
  _handlePageSizeChange(event) {
    const newSize = parseInt(event.target.value, 10);
    this.setPageSize(newSize);
  }

  /**
   * Handle page input change
   * @private
   * @param {Event} event
   */
  _handlePageInput(event) {
    const page = parseInt(event.target.value, 10);
    if (!isNaN(page)) {
      this.goToPage(page);
    }
  }

  /**
   * Emit page change event
   * @private
   */
  _emitPageChange() {
    this.dispatchEvent(new CustomEvent('page-change', {
      detail: {
        page: this._currentPage,
        pageSize: this._pageSize,
        startIndex: this.startIndex,
        endIndex: this.endIndex,
        totalPages: this.totalPages
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Emit page size change event
   * @private
   */
  _emitPageSizeChange() {
    this.dispatchEvent(new CustomEvent('page-size-change', {
      detail: {
        pageSize: this._pageSize,
        totalPages: this.totalPages
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    const firstBtn = this.shadowRoot.querySelector('[data-action="first"]');
    const prevBtn = this.shadowRoot.querySelector('[data-action="previous"]');
    const nextBtn = this.shadowRoot.querySelector('[data-action="next"]');
    const lastBtn = this.shadowRoot.querySelector('[data-action="last"]');
    const pageSizeSelect = this.shadowRoot.querySelector('[data-control="page-size"]');
    const pageInput = this.shadowRoot.querySelector('[data-control="page-input"]');

    if (firstBtn) firstBtn.addEventListener('click', this._handleFirstPage);
    if (prevBtn) prevBtn.addEventListener('click', this._handlePreviousPage);
    if (nextBtn) nextBtn.addEventListener('click', this._handleNextPage);
    if (lastBtn) lastBtn.addEventListener('click', this._handleLastPage);
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', this._handlePageSizeChange);
    if (pageInput) pageInput.addEventListener('change', this._handlePageInput);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const firstBtn = this.shadowRoot.querySelector('[data-action="first"]');
    const prevBtn = this.shadowRoot.querySelector('[data-action="previous"]');
    const nextBtn = this.shadowRoot.querySelector('[data-action="next"]');
    const lastBtn = this.shadowRoot.querySelector('[data-action="last"]');
    const pageSizeSelect = this.shadowRoot.querySelector('[data-control="page-size"]');
    const pageInput = this.shadowRoot.querySelector('[data-control="page-input"]');

    if (firstBtn) firstBtn.removeEventListener('click', this._handleFirstPage);
    if (prevBtn) prevBtn.removeEventListener('click', this._handlePreviousPage);
    if (nextBtn) nextBtn.removeEventListener('click', this._handleNextPage);
    if (lastBtn) lastBtn.removeEventListener('click', this._handleLastPage);
    if (pageSizeSelect) pageSizeSelect.removeEventListener('change', this._handlePageSizeChange);
    if (pageInput) pageInput.removeEventListener('change', this._handlePageInput);
  }

  /**
   * Render component
   */
  render() {
    const hasItems = this._totalItems > 0;
    const showPagination = hasItems && this.totalPages > 1;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
          font-size: var(--font-size-sm, 0.875rem);
          color: var(--color-text-primary, #1a1a1a);
        }

        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--color-border, #e5e5e5);
          background: var(--color-surface, #ffffff);
        }

        .pagination-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-secondary, #666666);
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .pagination-page-size {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .page-size-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: 4px;
          background: var(--color-surface, #ffffff);
          font-size: inherit;
          color: inherit;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .page-size-select:hover {
          border-color: var(--color-border-hover, #999999);
        }

        .page-size-select:focus {
          outline: none;
          border-color: var(--color-primary, #0066cc);
          box-shadow: 0 0 0 3px var(--color-primary-alpha-10, rgba(0, 102, 204, 0.1));
        }

        .pagination-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 2rem;
          height: 2rem;
          padding: 0 0.5rem;
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: 4px;
          background: var(--color-surface, #ffffff);
          color: var(--color-text-primary, #1a1a1a);
          font-size: inherit;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }

        .pagination-button:hover:not(:disabled) {
          background: var(--color-surface-hover, #f5f5f5);
          border-color: var(--color-border-hover, #999999);
        }

        .pagination-button:active:not(:disabled) {
          background: var(--color-surface-active, #e5e5e5);
        }

        .pagination-button:focus {
          outline: none;
          border-color: var(--color-primary, #0066cc);
          box-shadow: 0 0 0 3px var(--color-primary-alpha-10, rgba(0, 102, 204, 0.1));
        }

        .pagination-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-input-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .page-input {
          width: 3rem;
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: 4px;
          background: var(--color-surface, #ffffff);
          font-size: inherit;
          color: inherit;
          text-align: center;
          transition: border-color 0.2s;
        }

        .page-input:hover {
          border-color: var(--color-border-hover, #999999);
        }

        .page-input:focus {
          outline: none;
          border-color: var(--color-primary, #0066cc);
          box-shadow: 0 0 0 3px var(--color-primary-alpha-10, rgba(0, 102, 204, 0.1));
        }

        .page-input::-webkit-inner-spin-button,
        .page-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .page-input[type=number] {
          -moz-appearance: textfield;
        }

        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        @media (max-width: 640px) {
          .pagination-container {
            flex-direction: column;
            gap: 0.75rem;
          }

          .pagination-info {
            order: 2;
          }

          .pagination-controls {
            order: 1;
          }

          .pagination-page-size {
            order: 3;
          }
        }
      </style>

      <div class="pagination-container">
        <div class="pagination-info">
          ${hasItems ? `
            <span>
              Showing <strong>${this.startIndex}</strong> to <strong>${this.endIndex}</strong> of <strong>${this._totalItems}</strong> items
            </span>
          ` : `
            <span>No items</span>
          `}
        </div>

        ${showPagination ? `
          <div class="pagination-controls">
            <button
              class="pagination-button"
              data-action="first"
              aria-label="Go to first page"
              ${this.isFirstPage ? 'disabled' : ''}>
              <span aria-hidden="true">«</span>
              <span class="visually-hidden">First</span>
            </button>

            <button
              class="pagination-button"
              data-action="previous"
              aria-label="Go to previous page"
              ${this.isFirstPage ? 'disabled' : ''}>
              <span aria-hidden="true">‹</span>
              <span class="visually-hidden">Previous</span>
            </button>

            <div class="page-input-container">
              <label for="page-input">Page</label>
              <input
                type="number"
                id="page-input"
                class="page-input"
                data-control="page-input"
                min="1"
                max="${this.totalPages}"
                value="${this._currentPage}"
                aria-label="Current page">
              <span>of ${this.totalPages}</span>
            </div>

            <button
              class="pagination-button"
              data-action="next"
              aria-label="Go to next page"
              ${this.isLastPage ? 'disabled' : ''}>
              <span aria-hidden="true">›</span>
              <span class="visually-hidden">Next</span>
            </button>

            <button
              class="pagination-button"
              data-action="last"
              aria-label="Go to last page"
              ${this.isLastPage ? 'disabled' : ''}>
              <span aria-hidden="true">»</span>
              <span class="visually-hidden">Last</span>
            </button>
          </div>
        ` : ''}

        ${hasItems ? `
          <div class="pagination-page-size">
            <label for="page-size-select">Items per page:</label>
            <select
              id="page-size-select"
              class="page-size-select"
              data-control="page-size"
              aria-label="Items per page">
              ${this._pageSizes.map(size => `
                <option value="${size}" ${size === this._pageSize ? 'selected' : ''}>
                  ${size}
                </option>
              `).join('')}
            </select>
          </div>
        ` : ''}
      </div>
    `;

    // Reattach event listeners after render
    this._detachEventListeners();
    this._attachEventListeners();
  }
}

// Register custom element
customElements.define('table-pagination', TablePagination);

export default TablePagination;