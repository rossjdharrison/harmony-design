/**
 * @fileoverview Table Sorting System
 * Provides column sorting with multi-column support and custom comparators
 * 
 * Features:
 * - Single and multi-column sorting
 * - Custom comparator functions
 * - Sort direction indicators (asc/desc)
 * - Stable sorting for consistent results
 * - Type-aware default comparators
 * 
 * Performance:
 * - Uses stable sort algorithm
 * - Memoizes comparator chains
 * - Target: <5ms for 1000 rows
 * 
 * @see DESIGN_SYSTEM.md#table-sorting
 */

/**
 * Sort direction enum
 * @enum {string}
 */
export const SortDirection = {
  ASC: 'asc',
  DESC: 'desc',
  NONE: 'none'
};

/**
 * Default comparators for common data types
 */
export const DefaultComparators = {
  /**
   * String comparator (case-insensitive)
   * @param {string} a - First value
   * @param {string} b - Second value
   * @returns {number} Comparison result
   */
  string: (a, b) => {
    const aStr = String(a || '').toLowerCase();
    const bStr = String(b || '').toLowerCase();
    return aStr.localeCompare(bStr);
  },

  /**
   * Number comparator
   * @param {number} a - First value
   * @param {number} b - Second value
   * @returns {number} Comparison result
   */
  number: (a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);
    if (isNaN(aNum) && isNaN(bNum)) return 0;
    if (isNaN(aNum)) return 1;
    if (isNaN(bNum)) return -1;
    return aNum - bNum;
  },

  /**
   * Date comparator
   * @param {Date|string|number} a - First value
   * @param {Date|string|number} b - Second value
   * @returns {number} Comparison result
   */
  date: (a, b) => {
    const aDate = new Date(a);
    const bDate = new Date(b);
    if (isNaN(aDate.getTime()) && isNaN(bDate.getTime())) return 0;
    if (isNaN(aDate.getTime())) return 1;
    if (isNaN(bDate.getTime())) return -1;
    return aDate.getTime() - bDate.getTime();
  },

  /**
   * Boolean comparator
   * @param {boolean} a - First value
   * @param {boolean} b - Second value
   * @returns {number} Comparison result
   */
  boolean: (a, b) => {
    const aBool = Boolean(a);
    const bBool = Boolean(b);
    return aBool === bBool ? 0 : aBool ? 1 : -1;
  }
};

/**
 * Sort state for a single column
 * @typedef {Object} ColumnSortState
 * @property {string} columnId - Column identifier
 * @property {SortDirection} direction - Sort direction
 * @property {number} priority - Sort priority (0 = highest)
 * @property {Function} [comparator] - Custom comparator function
 */

/**
 * Table sorting manager
 * Handles multi-column sorting with custom comparators
 */
export class TableSortingManager {
  /**
   * @param {Object} options - Configuration options
   * @param {boolean} [options.multiSort=false] - Enable multi-column sorting
   * @param {Object} [options.defaultComparators] - Default comparators by column
   */
  constructor(options = {}) {
    this.multiSort = options.multiSort || false;
    this.defaultComparators = options.defaultComparators || {};
    
    /** @type {Map<string, ColumnSortState>} */
    this.sortStates = new Map();
    
    /** @type {Function|null} */
    this._cachedComparator = null;
    this._cacheKey = '';
  }

  /**
   * Toggle sort for a column
   * @param {string} columnId - Column identifier
   * @param {Object} [options] - Toggle options
   * @param {Function} [options.comparator] - Custom comparator
   * @param {boolean} [options.clearOthers=true] - Clear other sorts (if not multi-sort)
   * @returns {ColumnSortState[]} Updated sort states
   */
  toggleSort(columnId, options = {}) {
    const { comparator, clearOthers = !this.multiSort } = options;
    
    if (clearOthers && !this.multiSort) {
      this.sortStates.clear();
    }

    const currentState = this.sortStates.get(columnId);
    
    if (!currentState) {
      // New sort - add as ascending
      this.sortStates.set(columnId, {
        columnId,
        direction: SortDirection.ASC,
        priority: this.sortStates.size,
        comparator: comparator || this.defaultComparators[columnId]
      });
    } else {
      // Toggle through: asc -> desc -> none
      if (currentState.direction === SortDirection.ASC) {
        currentState.direction = SortDirection.DESC;
      } else if (currentState.direction === SortDirection.DESC) {
        this.sortStates.delete(columnId);
        // Update priorities
        this._updatePriorities();
      }
    }

    this._invalidateCache();
    return this.getSortStates();
  }

  /**
   * Set sort for a column
   * @param {string} columnId - Column identifier
   * @param {SortDirection} direction - Sort direction
   * @param {Object} [options] - Set options
   * @param {Function} [options.comparator] - Custom comparator
   * @param {boolean} [options.clearOthers=true] - Clear other sorts
   * @returns {ColumnSortState[]} Updated sort states
   */
  setSort(columnId, direction, options = {}) {
    const { comparator, clearOthers = !this.multiSort } = options;
    
    if (clearOthers && !this.multiSort) {
      this.sortStates.clear();
    }

    if (direction === SortDirection.NONE) {
      this.sortStates.delete(columnId);
      this._updatePriorities();
    } else {
      this.sortStates.set(columnId, {
        columnId,
        direction,
        priority: this.sortStates.has(columnId) 
          ? this.sortStates.get(columnId).priority 
          : this.sortStates.size,
        comparator: comparator || this.defaultComparators[columnId]
      });
    }

    this._invalidateCache();
    return this.getSortStates();
  }

  /**
   * Clear all sorts
   */
  clearSort() {
    this.sortStates.clear();
    this._invalidateCache();
  }

  /**
   * Get current sort states
   * @returns {ColumnSortState[]} Array of sort states ordered by priority
   */
  getSortStates() {
    return Array.from(this.sortStates.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get sort state for a specific column
   * @param {string} columnId - Column identifier
   * @returns {ColumnSortState|null} Sort state or null
   */
  getColumnSort(columnId) {
    return this.sortStates.get(columnId) || null;
  }

  /**
   * Sort data based on current sort states
   * @param {Array<Object>} data - Data to sort
   * @param {Object} [options] - Sort options
   * @param {Function} [options.accessor] - Function to access column value
   * @returns {Array<Object>} Sorted data
   */
  sortData(data, options = {}) {
    if (this.sortStates.size === 0) {
      return data;
    }

    const { accessor = (row, columnId) => row[columnId] } = options;
    const comparator = this._getComparator(accessor);
    
    // Use stable sort by adding original index
    const indexed = data.map((item, index) => ({ item, index }));
    
    indexed.sort((a, b) => {
      const result = comparator(a.item, b.item);
      return result !== 0 ? result : a.index - b.index;
    });

    return indexed.map(({ item }) => item);
  }

  /**
   * Get or create cached comparator
   * @private
   * @param {Function} accessor - Value accessor function
   * @returns {Function} Comparator function
   */
  _getComparator(accessor) {
    const cacheKey = this._generateCacheKey();
    
    if (this._cachedComparator && this._cacheKey === cacheKey) {
      return this._cachedComparator;
    }

    const sortStates = this.getSortStates();
    
    this._cachedComparator = (a, b) => {
      for (const state of sortStates) {
        const aVal = accessor(a, state.columnId);
        const bVal = accessor(b, state.columnId);
        
        const comparator = state.comparator || this._getDefaultComparator(aVal);
        let result = comparator(aVal, bVal);
        
        if (state.direction === SortDirection.DESC) {
          result = -result;
        }
        
        if (result !== 0) {
          return result;
        }
      }
      return 0;
    };

    this._cacheKey = cacheKey;
    return this._cachedComparator;
  }

  /**
   * Get default comparator based on value type
   * @private
   * @param {*} value - Sample value
   * @returns {Function} Comparator function
   */
  _getDefaultComparator(value) {
    if (value instanceof Date) {
      return DefaultComparators.date;
    }
    if (typeof value === 'number') {
      return DefaultComparators.number;
    }
    if (typeof value === 'boolean') {
      return DefaultComparators.boolean;
    }
    return DefaultComparators.string;
  }

  /**
   * Generate cache key from current sort states
   * @private
   * @returns {string} Cache key
   */
  _generateCacheKey() {
    return this.getSortStates()
      .map(s => `${s.columnId}:${s.direction}`)
      .join('|');
  }

  /**
   * Invalidate comparator cache
   * @private
   */
  _invalidateCache() {
    this._cachedComparator = null;
    this._cacheKey = '';
  }

  /**
   * Update priorities after removing a sort
   * @private
   */
  _updatePriorities() {
    const states = Array.from(this.sortStates.values())
      .sort((a, b) => a.priority - b.priority);
    
    states.forEach((state, index) => {
      state.priority = index;
    });
  }
}

/**
 * Sortable Table Header Cell Component
 * Extends TableCell with sorting controls
 * 
 * @fires sort-change - When sort state changes
 * 
 * @example
 * <sortable-table-header 
 *   column-id="name"
 *   sortable
 *   sort-direction="asc"
 *   sort-priority="0">
 *   Name
 * </sortable-table-header>
 */
export class SortableTableHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this._columnId = '';
    this._sortable = false;
    this._sortDirection = SortDirection.NONE;
    this._sortPriority = null;
  }

  static get observedAttributes() {
    return ['column-id', 'sortable', 'sort-direction', 'sort-priority'];
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
      case 'column-id':
        this._columnId = newValue;
        break;
      case 'sortable':
        this._sortable = newValue !== null;
        break;
      case 'sort-direction':
        this._sortDirection = newValue || SortDirection.NONE;
        break;
      case 'sort-priority':
        this._sortPriority = newValue !== null ? parseInt(newValue, 10) : null;
        break;
    }

    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: table-cell;
          padding: var(--table-cell-padding, 12px 16px);
          text-align: left;
          font-weight: var(--table-header-font-weight, 600);
          font-size: var(--table-header-font-size, 14px);
          color: var(--table-header-color, #1a1a1a);
          background: var(--table-header-bg, #f5f5f5);
          border-bottom: var(--table-header-border, 2px solid #e0e0e0);
          vertical-align: middle;
          user-select: none;
        }

        :host([sortable]) {
          cursor: pointer;
        }

        :host([sortable]:hover) {
          background: var(--table-header-hover-bg, #ebebeb);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .label {
          flex: 1;
        }

        .sort-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          opacity: 0.3;
          transition: opacity 0.2s ease;
        }

        :host([sortable]:hover) .sort-indicator {
          opacity: 0.6;
        }

        :host([sort-direction="asc"]) .sort-indicator,
        :host([sort-direction="desc"]) .sort-indicator {
          opacity: 1;
        }

        .sort-arrow {
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
        }

        .sort-arrow.up {
          border-bottom: 5px solid currentColor;
          opacity: 0.3;
        }

        .sort-arrow.down {
          border-top: 5px solid currentColor;
          opacity: 0.3;
        }

        :host([sort-direction="asc"]) .sort-arrow.up {
          opacity: 1;
        }

        :host([sort-direction="desc"]) .sort-arrow.down {
          opacity: 1;
        }

        .sort-priority {
          font-size: 10px;
          font-weight: 600;
          color: var(--table-sort-priority-color, #666);
          min-width: 12px;
          text-align: center;
        }
      </style>
      
      <div class="header-content">
        <span class="label">
          <slot></slot>
        </span>
        ${this._sortable ? `
          <div class="sort-indicator">
            <div class="sort-arrow up"></div>
            <div class="sort-arrow down"></div>
          </div>
          ${this._sortPriority !== null && this._sortPriority > 0 ? `
            <span class="sort-priority">${this._sortPriority + 1}</span>
          ` : ''}
        ` : ''}
      </div>
    `;
  }

  _attachEventListeners() {
    if (this._sortable) {
      this._handleClick = this._handleClick.bind(this);
      this.addEventListener('click', this._handleClick);
    }
  }

  _detachEventListeners() {
    if (this._handleClick) {
      this.removeEventListener('click', this._handleClick);
    }
  }

  _handleClick(event) {
    if (!this._sortable) return;

    const multiSort = event.shiftKey || event.ctrlKey || event.metaKey;

    this.dispatchEvent(new CustomEvent('sort-change', {
      bubbles: true,
      composed: true,
      detail: {
        columnId: this._columnId,
        currentDirection: this._sortDirection,
        multiSort
      }
    }));
  }
}

customElements.define('sortable-table-header', SortableTableHeader);