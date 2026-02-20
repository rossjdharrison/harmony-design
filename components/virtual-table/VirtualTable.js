/**
 * @fileoverview VirtualTable - Virtualized table with fixed headers and row recycling
 * @module components/virtual-table
 * 
 * Implements efficient table rendering for large datasets using:
 * - Fixed header positioning
 * - Row recycling (only visible rows in DOM)
 * - Smooth scrolling with transform
 * - Column resizing support
 * - Sort integration hooks
 * 
 * Performance targets:
 * - 60fps scrolling (16ms budget)
 * - Support 100k+ rows
 * - < 50MB memory footprint
 * 
 * Related: See DESIGN_SYSTEM.md § Virtual Table Component
 */

/**
 * VirtualTable Web Component
 * Renders large datasets efficiently with fixed headers and row virtualization
 * 
 * @fires virtual-table:row-click - When a row is clicked
 * @fires virtual-table:sort - When column header is clicked for sorting
 * @fires virtual-table:scroll - When table scrolls (throttled)
 * @fires virtual-table:selection-change - When row selection changes
 * 
 * @example
 * ```html
 * <virtual-table
 *   id="myTable"
 *   row-height="40"
 *   buffer-size="5"
 *   selectable>
 * </virtual-table>
 * 
 * <script>
 *   const table = document.getElementById('myTable');
 *   table.setColumns([
 *     { id: 'name', label: 'Name', width: 200, sortable: true },
 *     { id: 'email', label: 'Email', width: 250 },
 *     { id: 'status', label: 'Status', width: 100 }
 *   ]);
 *   table.setData(largeDataArray);
 * </script>
 * ```
 */
class VirtualTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Core state
    this._data = [];
    this._columns = [];
    this._rowHeight = 40;
    this._bufferSize = 5;
    this._scrollTop = 0;
    this._containerHeight = 0;
    this._selectedRows = new Set();
    this._sortColumn = null;
    this._sortDirection = 'asc';
    
    // Recycled row pool
    this._rowPool = [];
    this._activeRows = new Map();
    
    // Performance tracking
    this._lastFrameTime = 0;
    this._rafId = null;
    
    // Scroll throttling
    this._scrollTimeout = null;
    this._lastScrollEmit = 0;
    
    // Bound methods
    this._handleScroll = this._handleScroll.bind(this);
    this._handleResize = this._handleResize.bind(this);
    this._handleHeaderClick = this._handleHeaderClick.bind(this);
  }
  
  static get observedAttributes() {
    return ['row-height', 'buffer-size', 'selectable', 'striped'];
  }
  
  connectedCallback() {
    this._render();
    this._attachEventListeners();
    
    // Initial measurement
    requestAnimationFrame(() => {
      this._measureContainer();
      this._updateVisibleRows();
    });
  }
  
  disconnectedCallback() {
    this._detachEventListeners();
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout);
    }
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'row-height':
        this._rowHeight = parseInt(newValue, 10) || 40;
        this._updateVisibleRows();
        break;
      case 'buffer-size':
        this._bufferSize = parseInt(newValue, 10) || 5;
        this._updateVisibleRows();
        break;
      case 'selectable':
      case 'striped':
        this._updateStyles();
        break;
    }
  }
  
  /**
   * Set table columns configuration
   * @param {Array<{id: string, label: string, width?: number, sortable?: boolean, align?: string}>} columns
   */
  setColumns(columns) {
    this._columns = columns.map(col => ({
      id: col.id,
      label: col.label,
      width: col.width || 150,
      sortable: col.sortable || false,
      align: col.align || 'left',
      render: col.render || null
    }));
    
    this._renderHeader();
    this._updateVisibleRows();
  }
  
  /**
   * Set table data
   * @param {Array<Object>} data - Array of row objects
   */
  setData(data) {
    this._data = data;
    this._selectedRows.clear();
    this._updateScrollHeight();
    this._updateVisibleRows();
    
    this.dispatchEvent(new CustomEvent('virtual-table:data-change', {
      detail: { rowCount: data.length },
      bubbles: true
    }));
  }
  
  /**
   * Get current data
   * @returns {Array<Object>}
   */
  getData() {
    return this._data;
  }
  
  /**
   * Get selected row indices
   * @returns {Array<number>}
   */
  getSelectedRows() {
    return Array.from(this._selectedRows);
  }
  
  /**
   * Set selected rows
   * @param {Array<number>} indices
   */
  setSelectedRows(indices) {
    this._selectedRows = new Set(indices);
    this._updateVisibleRows();
    this._emitSelectionChange();
  }
  
  /**
   * Clear selection
   */
  clearSelection() {
    this._selectedRows.clear();
    this._updateVisibleRows();
    this._emitSelectionChange();
  }
  
  /**
   * Scroll to specific row index
   * @param {number} index
   * @param {string} align - 'start', 'center', or 'end'
   */
  scrollToRow(index, align = 'start') {
    const viewport = this.shadowRoot.querySelector('.virtual-table__viewport');
    if (!viewport) return;
    
    let scrollTop = index * this._rowHeight;
    
    if (align === 'center') {
      scrollTop -= this._containerHeight / 2 - this._rowHeight / 2;
    } else if (align === 'end') {
      scrollTop -= this._containerHeight - this._rowHeight;
    }
    
    viewport.scrollTop = Math.max(0, scrollTop);
  }
  
  /**
   * Refresh visible rows (useful after data mutation)
   */
  refresh() {
    this._updateVisibleRows();
  }
  
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 100%;
          height: 400px;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: var(--radius-md, 4px);
          overflow: hidden;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
          font-size: var(--font-size-base, 14px);
        }
        
        .virtual-table__container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }
        
        .virtual-table__header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--color-surface-elevated, #f5f5f5);
          border-bottom: 2px solid var(--color-border, #e0e0e0);
          display: flex;
          flex-shrink: 0;
        }
        
        .virtual-table__header-cell {
          padding: 12px 16px;
          font-weight: 600;
          color: var(--color-text-primary, #212121);
          border-right: 1px solid var(--color-border-light, #f0f0f0);
          user-select: none;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .virtual-table__header-cell:last-child {
          border-right: none;
        }
        
        .virtual-table__header-cell--sortable {
          cursor: pointer;
        }
        
        .virtual-table__header-cell--sortable:hover {
          background: var(--color-surface-hover, #eeeeee);
        }
        
        .virtual-table__sort-icon {
          width: 16px;
          height: 16px;
          opacity: 0.4;
          transition: opacity 0.2s, transform 0.2s;
        }
        
        .virtual-table__header-cell--sorted .virtual-table__sort-icon {
          opacity: 1;
        }
        
        .virtual-table__header-cell--sorted.sort-desc .virtual-table__sort-icon {
          transform: rotate(180deg);
        }
        
        .virtual-table__viewport {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          position: relative;
          will-change: scroll-position;
        }
        
        .virtual-table__scroll-container {
          position: relative;
        }
        
        .virtual-table__body {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          will-change: transform;
        }
        
        .virtual-table__row {
          display: flex;
          border-bottom: 1px solid var(--color-border-light, #f5f5f5);
          transition: background-color 0.15s;
          cursor: pointer;
        }
        
        .virtual-table__row:hover {
          background: var(--color-surface-hover, #fafafa);
        }
        
        :host([striped]) .virtual-table__row:nth-child(even) {
          background: var(--color-surface-alt, #fafafa);
        }
        
        .virtual-table__row--selected {
          background: var(--color-primary-light, #e3f2fd) !important;
        }
        
        .virtual-table__cell {
          padding: 12px 16px;
          color: var(--color-text-secondary, #424242);
          border-right: 1px solid var(--color-border-light, #f5f5f5);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        
        .virtual-table__cell:last-child {
          border-right: none;
        }
        
        .virtual-table__cell--align-center {
          justify-content: center;
        }
        
        .virtual-table__cell--align-right {
          justify-content: flex-end;
        }
        
        .virtual-table__empty {
          padding: 48px 24px;
          text-align: center;
          color: var(--color-text-tertiary, #757575);
        }
        
        /* Custom scrollbar */
        .virtual-table__viewport::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .virtual-table__viewport::-webkit-scrollbar-track {
          background: var(--color-surface, #f5f5f5);
        }
        
        .virtual-table__viewport::-webkit-scrollbar-thumb {
          background: var(--color-border, #bdbdbd);
          border-radius: 4px;
        }
        
        .virtual-table__viewport::-webkit-scrollbar-thumb:hover {
          background: var(--color-border-dark, #9e9e9e);
        }
      </style>
      
      <div class="virtual-table__container">
        <div class="virtual-table__header"></div>
        <div class="virtual-table__viewport">
          <div class="virtual-table__scroll-container">
            <div class="virtual-table__body"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  _renderHeader() {
    const header = this.shadowRoot.querySelector('.virtual-table__header');
    if (!header) return;
    
    header.innerHTML = '';
    
    this._columns.forEach(column => {
      const cell = document.createElement('div');
      cell.className = 'virtual-table__header-cell';
      cell.style.width = `${column.width}px`;
      cell.style.minWidth = `${column.width}px`;
      cell.dataset.columnId = column.id;
      
      if (column.sortable) {
        cell.classList.add('virtual-table__header-cell--sortable');
      }
      
      if (this._sortColumn === column.id) {
        cell.classList.add('virtual-table__header-cell--sorted');
        if (this._sortDirection === 'desc') {
          cell.classList.add('sort-desc');
        }
      }
      
      const label = document.createElement('span');
      label.textContent = column.label;
      cell.appendChild(label);
      
      if (column.sortable) {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.classList.add('virtual-table__sort-icon');
        icon.setAttribute('viewBox', '0 0 16 16');
        icon.innerHTML = '<path fill="currentColor" d="M8 3l4 5H4z"/>';
        cell.appendChild(icon);
      }
      
      header.appendChild(cell);
    });
  }
  
  _updateScrollHeight() {
    const scrollContainer = this.shadowRoot.querySelector('.virtual-table__scroll-container');
    if (!scrollContainer) return;
    
    const totalHeight = this._data.length * this._rowHeight;
    scrollContainer.style.height = `${totalHeight}px`;
  }
  
  _measureContainer() {
    const viewport = this.shadowRoot.querySelector('.virtual-table__viewport');
    if (!viewport) return;
    
    this._containerHeight = viewport.clientHeight;
  }
  
  _updateVisibleRows() {
    const startTime = performance.now();
    
    if (!this._data.length || !this._columns.length) {
      this._renderEmpty();
      return;
    }
    
    const visibleStart = Math.floor(this._scrollTop / this._rowHeight);
    const visibleEnd = Math.ceil((this._scrollTop + this._containerHeight) / this._rowHeight);
    
    const bufferStart = Math.max(0, visibleStart - this._bufferSize);
    const bufferEnd = Math.min(this._data.length, visibleEnd + this._bufferSize);
    
    const body = this.shadowRoot.querySelector('.virtual-table__body');
    if (!body) return;
    
    // Determine which rows need to be rendered
    const currentIndices = new Set();
    for (let i = bufferStart; i < bufferEnd; i++) {
      currentIndices.add(i);
    }
    
    // Remove rows that are no longer visible
    for (const [index, row] of this._activeRows.entries()) {
      if (!currentIndices.has(index)) {
        this._recycleRow(row);
        this._activeRows.delete(index);
      }
    }
    
    // Add or update visible rows
    for (let i = bufferStart; i < bufferEnd; i++) {
      if (!this._activeRows.has(i)) {
        const row = this._getOrCreateRow();
        this._updateRow(row, i);
        this._activeRows.set(i, row);
        body.appendChild(row);
      }
    }
    
    // Position the body container
    body.style.transform = `translateY(${bufferStart * this._rowHeight}px)`;
    
    // Performance check
    const elapsed = performance.now() - startTime;
    if (elapsed > 16) {
      console.warn(`VirtualTable: Row update took ${elapsed.toFixed(2)}ms (budget: 16ms)`);
    }
  }
  
  _getOrCreateRow() {
    if (this._rowPool.length > 0) {
      return this._rowPool.pop();
    }
    
    const row = document.createElement('div');
    row.className = 'virtual-table__row';
    row.style.height = `${this._rowHeight}px`;
    
    this._columns.forEach(column => {
      const cell = document.createElement('div');
      cell.className = 'virtual-table__cell';
      cell.style.width = `${column.width}px`;
      cell.style.minWidth = `${column.width}px`;
      
      if (column.align) {
        cell.classList.add(`virtual-table__cell--align-${column.align}`);
      }
      
      cell.dataset.columnId = column.id;
      row.appendChild(cell);
    });
    
    row.addEventListener('click', (e) => {
      const index = parseInt(row.dataset.index, 10);
      this._handleRowClick(index, e);
    });
    
    return row;
  }
  
  _updateRow(row, index) {
    const data = this._data[index];
    row.dataset.index = index;
    
    if (this._selectedRows.has(index)) {
      row.classList.add('virtual-table__row--selected');
    } else {
      row.classList.remove('virtual-table__row--selected');
    }
    
    const cells = row.querySelectorAll('.virtual-table__cell');
    cells.forEach((cell, i) => {
      const column = this._columns[i];
      if (column.render) {
        const content = column.render(data[column.id], data, index);
        if (typeof content === 'string') {
          cell.textContent = content;
        } else {
          cell.innerHTML = '';
          cell.appendChild(content);
        }
      } else {
        cell.textContent = data[column.id] ?? '';
      }
    });
  }
  
  _recycleRow(row) {
    row.remove();
    this._rowPool.push(row);
  }
  
  _renderEmpty() {
    const body = this.shadowRoot.querySelector('.virtual-table__body');
    if (!body) return;
    
    body.innerHTML = '<div class="virtual-table__empty">No data available</div>';
  }
  
  _handleScroll(e) {
    this._scrollTop = e.target.scrollTop;
    
    // Use RAF for smooth updates
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => {
        this._updateVisibleRows();
        this._rafId = null;
      });
    }
    
    // Throttled scroll event emission
    const now = Date.now();
    if (now - this._lastScrollEmit > 100) {
      this._lastScrollEmit = now;
      this.dispatchEvent(new CustomEvent('virtual-table:scroll', {
        detail: { scrollTop: this._scrollTop },
        bubbles: true
      }));
    }
  }
  
  _handleResize() {
    this._measureContainer();
    this._updateVisibleRows();
  }
  
  _handleHeaderClick(e) {
    const cell = e.target.closest('.virtual-table__header-cell');
    if (!cell || !cell.classList.contains('virtual-table__header-cell--sortable')) {
      return;
    }
    
    const columnId = cell.dataset.columnId;
    
    if (this._sortColumn === columnId) {
      this._sortDirection = this._sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortColumn = columnId;
      this._sortDirection = 'asc';
    }
    
    this._renderHeader();
    
    this.dispatchEvent(new CustomEvent('virtual-table:sort', {
      detail: {
        column: this._sortColumn,
        direction: this._sortDirection
      },
      bubbles: true
    }));
  }
  
  _handleRowClick(index, event) {
    if (this.hasAttribute('selectable')) {
      if (event.ctrlKey || event.metaKey) {
        // Toggle selection
        if (this._selectedRows.has(index)) {
          this._selectedRows.delete(index);
        } else {
          this._selectedRows.add(index);
        }
      } else if (event.shiftKey && this._selectedRows.size > 0) {
        // Range selection
        const lastSelected = Math.max(...this._selectedRows);
        const start = Math.min(lastSelected, index);
        const end = Math.max(lastSelected, index);
        for (let i = start; i <= end; i++) {
          this._selectedRows.add(i);
        }
      } else {
        // Single selection
        this._selectedRows.clear();
        this._selectedRows.add(index);
      }
      
      this._updateVisibleRows();
      this._emitSelectionChange();
    }
    
    this.dispatchEvent(new CustomEvent('virtual-table:row-click', {
      detail: {
        index,
        data: this._data[index],
        selected: this._selectedRows.has(index)
      },
      bubbles: true
    }));
  }
  
  _emitSelectionChange() {
    this.dispatchEvent(new CustomEvent('virtual-table:selection-change', {
      detail: {
        selectedIndices: Array.from(this._selectedRows),
        selectedData: Array.from(this._selectedRows).map(i => this._data[i])
      },
      bubbles: true
    }));
  }
  
  _attachEventListeners() {
    const viewport = this.shadowRoot.querySelector('.virtual-table__viewport');
    const header = this.shadowRoot.querySelector('.virtual-table__header');
    
    if (viewport) {
      viewport.addEventListener('scroll', this._handleScroll);
    }
    
    if (header) {
      header.addEventListener('click', this._handleHeaderClick);
    }
    
    // Resize observer for container size changes
    this._resizeObserver = new ResizeObserver(this._handleResize);
    this._resizeObserver.observe(this);
  }
  
  _detachEventListeners() {
    const viewport = this.shadowRoot.querySelector('.virtual-table__viewport');
    const header = this.shadowRoot.querySelector('.virtual-table__header');
    
    if (viewport) {
      viewport.removeEventListener('scroll', this._handleScroll);
    }
    
    if (header) {
      header.removeEventListener('click', this._handleHeaderClick);
    }
    
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }
  
  _updateStyles() {
    // Trigger re-render if needed for attribute changes
    this._updateVisibleRows();
  }
}

// Register the custom element
if (!customElements.get('virtual-table')) {
  customElements.define('virtual-table', VirtualTable);
}

export default VirtualTable;