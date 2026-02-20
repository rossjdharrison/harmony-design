/**
 * @fileoverview Table Filtering Component
 * @module components/table/TableFiltering
 * 
 * Provides column-level filtering with support for:
 * - Text filtering (contains, starts with, ends with, equals)
 * - Select filtering (single/multi-select from options)
 * - Date range filtering (from/to dates)
 * 
 * Integrates with TableCore for data filtering and state management.
 * Publishes filter change events via EventBus.
 * 
 * Related: {@link components/table/TableCore.js}
 * Related: {@link components/table/TableSorting.js}
 * Documentation: See DESIGN_SYSTEM.md § Table Filtering
 * 
 * @performance Target: <1ms filter application per 1000 rows
 */

/**
 * Filter type enumeration
 * @enum {string}
 */
export const FilterType = {
  TEXT: 'text',
  SELECT: 'select',
  DATE_RANGE: 'date-range',
  NUMBER_RANGE: 'number-range'
};

/**
 * Text filter operators
 * @enum {string}
 */
export const TextOperator = {
  CONTAINS: 'contains',
  EQUALS: 'equals',
  STARTS_WITH: 'starts-with',
  ENDS_WITH: 'ends-with',
  NOT_CONTAINS: 'not-contains'
};

/**
 * Table Filtering Web Component
 * 
 * @fires filter-change - When any filter value changes
 * @fires filter-clear - When filters are cleared
 * @fires filter-apply - When filters are applied (if manual mode)
 * 
 * @example
 * ```html
 * <harmony-table-filtering
 *   columns='[{"key": "name", "type": "text"}, {"key": "status", "type": "select"}]'
 *   auto-apply="true">
 * </harmony-table-filtering>
 * ```
 */
export class TableFiltering extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Map<string, FilterConfig>} */
    this._filters = new Map();
    
    /** @type {Map<string, any>} */
    this._filterValues = new Map();
    
    /** @type {boolean} */
    this._autoApply = true;
    
    /** @type {number} */
    this._debounceTimeout = null;
    
    /** @type {number} */
    this._debounceDelay = 300;
  }

  static get observedAttributes() {
    return ['columns', 'auto-apply', 'debounce-delay'];
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'columns':
        this._parseColumns(newValue);
        this._render();
        break;
      case 'auto-apply':
        this._autoApply = newValue !== 'false';
        break;
      case 'debounce-delay':
        this._debounceDelay = parseInt(newValue, 10) || 300;
        break;
    }
  }

  /**
   * Parse column configuration
   * @param {string} columnsJson - JSON string of column configs
   * @private
   */
  _parseColumns(columnsJson) {
    try {
      const columns = JSON.parse(columnsJson);
      this._filters.clear();
      
      columns.forEach(col => {
        if (col.filterable !== false) {
          this._filters.set(col.key, {
            key: col.key,
            label: col.label || col.key,
            type: col.filterType || FilterType.TEXT,
            operator: col.filterOperator || TextOperator.CONTAINS,
            options: col.filterOptions || [],
            placeholder: col.filterPlaceholder || `Filter ${col.label || col.key}...`
          });
        }
      });
    } catch (e) {
      console.error('TableFiltering: Failed to parse columns', e);
    }
  }

  /**
   * Render the filtering UI
   * @private
   */
  _render() {
    const styles = `
      <style>
        :host {
          display: block;
          background: var(--surface-primary, #ffffff);
          border-bottom: 1px solid var(--border-subtle, #e5e7eb);
        }

        .filter-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 12px 16px;
          align-items: flex-end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 150px;
          flex: 1;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary, #6b7280);
          line-height: 1.5;
        }

        .filter-input-wrapper {
          position: relative;
          display: flex;
          gap: 4px;
        }

        .filter-input,
        .filter-select {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid var(--border-default, #d1d5db);
          border-radius: 4px;
          font-size: 14px;
          color: var(--text-primary, #111827);
          background: var(--surface-primary, #ffffff);
          transition: border-color 0.15s ease;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: var(--primary-500, #3b82f6);
          box-shadow: 0 0 0 3px var(--primary-100, rgba(59, 130, 246, 0.1));
        }

        .filter-input::placeholder {
          color: var(--text-tertiary, #9ca3af);
        }

        .filter-select {
          cursor: pointer;
        }

        .filter-input[type="date"] {
          max-width: 140px;
        }

        .date-range-inputs {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .date-separator {
          color: var(--text-secondary, #6b7280);
          font-size: 12px;
        }

        .filter-actions {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .filter-button {
          padding: 6px 12px;
          border: 1px solid var(--border-default, #d1d5db);
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: var(--surface-primary, #ffffff);
          color: var(--text-primary, #111827);
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .filter-button:hover {
          background: var(--surface-secondary, #f9fafb);
          border-color: var(--border-strong, #9ca3af);
        }

        .filter-button:active {
          transform: translateY(1px);
        }

        .filter-button.primary {
          background: var(--primary-500, #3b82f6);
          color: white;
          border-color: var(--primary-500, #3b82f6);
        }

        .filter-button.primary:hover {
          background: var(--primary-600, #2563eb);
          border-color: var(--primary-600, #2563eb);
        }

        .filter-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .clear-icon {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          cursor: pointer;
          color: var(--text-tertiary, #9ca3af);
          display: none;
        }

        .filter-input-wrapper:has(.filter-input:not(:placeholder-shown)) .clear-icon,
        .filter-input-wrapper:has(.filter-select:not([value=""])) .clear-icon {
          display: block;
        }

        .clear-icon:hover {
          color: var(--text-secondary, #6b7280);
        }

        .active-filters {
          display: flex;
          gap: 8px;
          padding: 0 16px 12px;
          flex-wrap: wrap;
        }

        .filter-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: var(--primary-50, #eff6ff);
          color: var(--primary-700, #1d4ed8);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .filter-chip-remove {
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--primary-200, #bfdbfe);
          color: var(--primary-700, #1d4ed8);
          transition: background 0.15s ease;
        }

        .filter-chip-remove:hover {
          background: var(--primary-300, #93c5fd);
        }

        @media (max-width: 768px) {
          .filter-container {
            flex-direction: column;
          }

          .filter-group {
            width: 100%;
          }

          .filter-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      </style>
    `;

    const filterInputs = Array.from(this._filters.values())
      .map(filter => this._renderFilterInput(filter))
      .join('');

    const showActions = !this._autoApply || this._filters.size > 0;

    const html = `
      ${styles}
      <div class="filter-container">
        ${filterInputs}
        ${showActions ? `
          <div class="filter-actions">
            ${!this._autoApply ? `
              <button class="filter-button primary" data-action="apply">
                Apply Filters
              </button>
            ` : ''}
            <button class="filter-button" data-action="clear">
              Clear All
            </button>
          </div>
        ` : ''}
      </div>
      ${this._renderActiveFilters()}
    `;

    this.shadowRoot.innerHTML = html;
  }

  /**
   * Render individual filter input based on type
   * @param {FilterConfig} filter
   * @returns {string}
   * @private
   */
  _renderFilterInput(filter) {
    const currentValue = this._filterValues.get(filter.key);

    switch (filter.type) {
      case FilterType.TEXT:
        return `
          <div class="filter-group">
            <label class="filter-label">${filter.label}</label>
            <div class="filter-input-wrapper">
              <input
                type="text"
                class="filter-input"
                data-filter-key="${filter.key}"
                data-filter-type="text"
                placeholder="${filter.placeholder}"
                value="${currentValue || ''}"
              />
              <span class="clear-icon" data-clear="${filter.key}">✕</span>
            </div>
          </div>
        `;

      case FilterType.SELECT:
        const options = filter.options.map(opt => {
          const value = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : opt;
          const selected = currentValue === value ? 'selected' : '';
          return `<option value="${value}" ${selected}>${label}</option>`;
        }).join('');

        return `
          <div class="filter-group">
            <label class="filter-label">${filter.label}</label>
            <div class="filter-input-wrapper">
              <select
                class="filter-select"
                data-filter-key="${filter.key}"
                data-filter-type="select"
              >
                <option value="">All</option>
                ${options}
              </select>
            </div>
          </div>
        `;

      case FilterType.DATE_RANGE:
        const fromValue = currentValue?.from || '';
        const toValue = currentValue?.to || '';
        return `
          <div class="filter-group">
            <label class="filter-label">${filter.label}</label>
            <div class="date-range-inputs">
              <input
                type="date"
                class="filter-input"
                data-filter-key="${filter.key}"
                data-filter-type="date-range"
                data-range-part="from"
                value="${fromValue}"
              />
              <span class="date-separator">to</span>
              <input
                type="date"
                class="filter-input"
                data-filter-key="${filter.key}"
                data-filter-type="date-range"
                data-range-part="to"
                value="${toValue}"
              />
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  /**
   * Render active filter chips
   * @returns {string}
   * @private
   */
  _renderActiveFilters() {
    if (this._filterValues.size === 0) return '';

    const chips = Array.from(this._filterValues.entries())
      .map(([key, value]) => {
        const filter = this._filters.get(key);
        if (!filter) return '';

        let displayValue = value;
        if (filter.type === FilterType.DATE_RANGE) {
          const parts = [];
          if (value.from) parts.push(`From: ${value.from}`);
          if (value.to) parts.push(`To: ${value.to}`);
          displayValue = parts.join(', ');
        }

        return `
          <div class="filter-chip">
            <span>${filter.label}: ${displayValue}</span>
            <span class="filter-chip-remove" data-remove-filter="${key}">✕</span>
          </div>
        `;
      })
      .join('');

    return `<div class="active-filters">${chips}</div>`;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this.shadowRoot.addEventListener('input', (e) => {
      const target = e.target;
      if (!target.dataset.filterKey) return;

      const key = target.dataset.filterKey;
      const type = target.dataset.filterType;

      if (type === 'date-range') {
        this._handleDateRangeInput(key, target);
      } else {
        this._handleFilterInput(key, target.value, type);
      }
    });

    this.shadowRoot.addEventListener('change', (e) => {
      const target = e.target;
      if (!target.dataset.filterKey) return;

      const key = target.dataset.filterKey;
      const type = target.dataset.filterType;

      if (type === 'select') {
        this._handleFilterInput(key, target.value, type);
      }
    });

    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target;

      if (target.dataset.action === 'clear') {
        this.clearAllFilters();
      } else if (target.dataset.action === 'apply') {
        this._applyFilters();
      } else if (target.dataset.clear) {
        this.clearFilter(target.dataset.clear);
      } else if (target.dataset.removeFilter) {
        this.clearFilter(target.dataset.removeFilter);
      }
    });
  }

  /**
   * Handle date range input
   * @param {string} key
   * @param {HTMLInputElement} input
   * @private
   */
  _handleDateRangeInput(key, input) {
    const rangePart = input.dataset.rangePart;
    const currentValue = this._filterValues.get(key) || { from: '', to: '' };
    
    currentValue[rangePart] = input.value;
    
    if (currentValue.from || currentValue.to) {
      this._handleFilterInput(key, currentValue, 'date-range');
    } else {
      this._filterValues.delete(key);
      if (this._autoApply) {
        this._applyFilters();
      }
    }
  }

  /**
   * Handle filter input change
   * @param {string} key
   * @param {any} value
   * @param {string} type
   * @private
   */
  _handleFilterInput(key, value, type) {
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }

    // Store value
    if (value === '' || (type === 'date-range' && !value.from && !value.to)) {
      this._filterValues.delete(key);
    } else {
      this._filterValues.set(key, value);
    }

    // Auto-apply with debounce for text inputs
    if (this._autoApply) {
      if (type === 'text') {
        this._debounceTimeout = setTimeout(() => {
          this._applyFilters();
        }, this._debounceDelay);
      } else {
        this._applyFilters();
      }
    }
  }

  /**
   * Apply current filters
   * @private
   */
  _applyFilters() {
    const filters = this._buildFilterState();
    
    this.dispatchEvent(new CustomEvent('filter-change', {
      detail: { filters },
      bubbles: true,
      composed: true
    }));

    // Publish to EventBus
    if (window.eventBus) {
      window.eventBus.publish({
        type: 'table.filter.apply',
        payload: { filters },
        source: 'TableFiltering'
      });
    }

    this._render();
  }

  /**
   * Build filter state object
   * @returns {Object}
   * @private
   */
  _buildFilterState() {
    const filters = {};
    
    this._filterValues.forEach((value, key) => {
      const filter = this._filters.get(key);
      filters[key] = {
        value,
        type: filter.type,
        operator: filter.operator
      };
    });

    return filters;
  }

  /**
   * Clear specific filter
   * @param {string} key - Filter key to clear
   * @public
   */
  clearFilter(key) {
    this._filterValues.delete(key);
    
    if (this._autoApply) {
      this._applyFilters();
    } else {
      this._render();
    }
  }

  /**
   * Clear all filters
   * @public
   */
  clearAllFilters() {
    this._filterValues.clear();
    
    this.dispatchEvent(new CustomEvent('filter-clear', {
      bubbles: true,
      composed: true
    }));

    if (window.eventBus) {
      window.eventBus.publish({
        type: 'table.filter.clear',
        payload: {},
        source: 'TableFiltering'
      });
    }

    this._render();
    
    if (this._autoApply) {
      this._applyFilters();
    }
  }

  /**
   * Get current filter values
   * @returns {Object}
   * @public
   */
  getFilters() {
    return this._buildFilterState();
  }

  /**
   * Set filter values programmatically
   * @param {Object} filters - Filter values to set
   * @public
   */
  setFilters(filters) {
    this._filterValues.clear();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (this._filters.has(key)) {
        this._filterValues.set(key, value);
      }
    });

    this._render();
    
    if (this._autoApply) {
      this._applyFilters();
    }
  }
}

/**
 * Apply filters to data array
 * @param {Array} data - Data to filter
 * @param {Object} filters - Filter configuration
 * @returns {Array} Filtered data
 * @public
 */
export function applyFilters(data, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return data;
  }

  return data.filter(row => {
    return Object.entries(filters).every(([key, filter]) => {
      const value = row[key];
      const filterValue = filter.value;

      if (filterValue === '' || filterValue === null || filterValue === undefined) {
        return true;
      }

      switch (filter.type) {
        case FilterType.TEXT:
          return applyTextFilter(value, filterValue, filter.operator);
        
        case FilterType.SELECT:
          return value === filterValue;
        
        case FilterType.DATE_RANGE:
          return applyDateRangeFilter(value, filterValue);
        
        case FilterType.NUMBER_RANGE:
          return applyNumberRangeFilter(value, filterValue);
        
        default:
          return true;
      }
    });
  });
}

/**
 * Apply text filter with operator
 * @param {string} value - Value to test
 * @param {string} filterValue - Filter value
 * @param {TextOperator} operator - Filter operator
 * @returns {boolean}
 * @private
 */
function applyTextFilter(value, filterValue, operator) {
  if (value === null || value === undefined) return false;
  
  const strValue = String(value).toLowerCase();
  const strFilter = String(filterValue).toLowerCase();

  switch (operator) {
    case TextOperator.CONTAINS:
      return strValue.includes(strFilter);
    case TextOperator.EQUALS:
      return strValue === strFilter;
    case TextOperator.STARTS_WITH:
      return strValue.startsWith(strFilter);
    case TextOperator.ENDS_WITH:
      return strValue.endsWith(strFilter);
    case TextOperator.NOT_CONTAINS:
      return !strValue.includes(strFilter);
    default:
      return true;
  }
}

/**
 * Apply date range filter
 * @param {string|Date} value - Value to test
 * @param {Object} filterValue - Filter range {from, to}
 * @returns {boolean}
 * @private
 */
function applyDateRangeFilter(value, filterValue) {
  if (!value) return false;
  
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;

  if (filterValue.from) {
    const fromDate = new Date(filterValue.from);
    if (date < fromDate) return false;
  }

  if (filterValue.to) {
    const toDate = new Date(filterValue.to);
    toDate.setHours(23, 59, 59, 999); // Include entire day
    if (date > toDate) return false;
  }

  return true;
}

/**
 * Apply number range filter
 * @param {number} value - Value to test
 * @param {Object} filterValue - Filter range {min, max}
 * @returns {boolean}
 * @private
 */
function applyNumberRangeFilter(value, filterValue) {
  if (value === null || value === undefined) return false;
  
  const numValue = Number(value);
  if (isNaN(numValue)) return false;

  if (filterValue.min !== undefined && numValue < filterValue.min) {
    return false;
  }

  if (filterValue.max !== undefined && numValue > filterValue.max) {
    return false;
  }

  return true;
}

// Register custom element
if (!customElements.get('harmony-table-filtering')) {
  customElements.define('harmony-table-filtering', TableFiltering);
}