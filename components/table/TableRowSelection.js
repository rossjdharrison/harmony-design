/**
 * @fileoverview Table Row Selection Component
 * @module components/table/TableRowSelection
 * 
 * Provides single and multi-select row selection with checkbox column.
 * Manages selection state and publishes selection events via EventBus.
 * 
 * Features:
 * - Single-select mode (radio behavior)
 * - Multi-select mode (checkbox behavior)
 * - Select all functionality
 * - Keyboard navigation (Space to toggle)
 * - Accessible ARIA labels
 * 
 * Related: See DESIGN_SYSTEM.md § Table Components § Row Selection
 * 
 * @example
 * <harmony-table-row-selection mode="multi">
 *   <harmony-table-core>...</harmony-table-core>
 * </harmony-table-row-selection>
 */

import { EventBus } from '../../core/EventBus.js';

/**
 * TableRowSelection Web Component
 * Wraps table with row selection capabilities
 * 
 * @class TableRowSelection
 * @extends HTMLElement
 * 
 * @attr {string} mode - Selection mode: 'single' or 'multi' (default: 'multi')
 * @attr {string} selected-rows - Comma-separated list of selected row IDs
 * @attr {boolean} show-select-all - Show select all checkbox in header (multi mode only)
 * 
 * @fires table:selection:changed - When selection changes
 * @fires table:row:selected - When a row is selected
 * @fires table:row:deselected - When a row is deselected
 * @fires table:selection:cleared - When all selections are cleared
 */
export class TableRowSelection extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Set<string>} Selected row IDs */
    this._selectedRows = new Set();
    
    /** @type {'single' | 'multi'} Selection mode */
    this._mode = 'multi';
    
    /** @type {boolean} Whether select all is checked */
    this._selectAllChecked = false;
    
    /** @type {boolean} Whether select all is indeterminate */
    this._selectAllIndeterminate = false;
    
    /** @type {Map<string, HTMLElement>} Row elements by ID */
    this._rowElements = new Map();
    
    /** @type {number} Total number of selectable rows */
    this._totalRows = 0;
  }

  static get observedAttributes() {
    return ['mode', 'selected-rows', 'show-select-all'];
  }

  connectedCallback() {
    this._mode = this.getAttribute('mode') || 'multi';
    this._parseSelectedRows();
    this._render();
    this._setupEventListeners();
    this._observeTableChanges();
  }

  disconnectedCallback() {
    this._cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'mode':
        this._mode = newValue || 'multi';
        if (this._mode === 'single' && this._selectedRows.size > 1) {
          // Clear all but first selection in single mode
          const firstSelected = Array.from(this._selectedRows)[0];
          this._selectedRows.clear();
          if (firstSelected) {
            this._selectedRows.add(firstSelected);
          }
        }
        this._render();
        break;
      case 'selected-rows':
        this._parseSelectedRows();
        this._updateRowStates();
        break;
      case 'show-select-all':
        this._render();
        break;
    }
  }

  /**
   * Parse selected-rows attribute into Set
   * @private
   */
  _parseSelectedRows() {
    const attr = this.getAttribute('selected-rows');
    this._selectedRows.clear();
    if (attr) {
      attr.split(',').forEach(id => {
        const trimmed = id.trim();
        if (trimmed) {
          this._selectedRows.add(trimmed);
        }
      });
    }
  }

  /**
   * Render component shadow DOM
   * @private
   */
  _render() {
    const showSelectAll = this.hasAttribute('show-select-all') && this._mode === 'multi';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
        }

        .selection-wrapper {
          width: 100%;
          height: 100%;
        }

        .select-column {
          width: 48px;
          min-width: 48px;
          text-align: center;
          padding: 8px;
        }

        .select-checkbox,
        .select-radio {
          width: 18px;
          height: 18px;
          cursor: pointer;
          margin: 0;
          accent-color: var(--harmony-color-primary, #0066cc);
        }

        .select-checkbox:focus,
        .select-radio:focus {
          outline: 2px solid var(--harmony-color-focus, #0066cc);
          outline-offset: 2px;
        }

        .select-checkbox:disabled,
        .select-radio:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Row selection states */
        ::slotted([data-selected="true"]) {
          background-color: var(--harmony-color-selected-bg, #e6f2ff);
        }

        ::slotted([data-selected="true"]:hover) {
          background-color: var(--harmony-color-selected-hover-bg, #cce5ff);
        }

        /* Accessibility */
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        /* Selection info */
        .selection-info {
          padding: 8px 16px;
          background: var(--harmony-color-info-bg, #e6f2ff);
          border-bottom: 1px solid var(--harmony-color-border, #e0e0e0);
          font-size: 14px;
          display: none;
        }

        .selection-info.visible {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .selection-count {
          font-weight: 500;
        }

        .clear-selection {
          background: none;
          border: none;
          color: var(--harmony-color-primary, #0066cc);
          cursor: pointer;
          padding: 4px 8px;
          text-decoration: underline;
          font-size: 14px;
        }

        .clear-selection:hover {
          color: var(--harmony-color-primary-dark, #0052a3);
        }
      </style>

      <div class="selection-wrapper">
        <div class="selection-info" id="selection-info">
          <span class="selection-count" id="selection-count">0 selected</span>
          <button class="clear-selection" id="clear-selection">Clear selection</button>
        </div>
        <slot></slot>
      </div>
    `;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for clear selection button
    const clearBtn = this.shadowRoot.getElementById('clear-selection');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSelection());
    }

    // Listen for row clicks (delegated)
    this.addEventListener('click', this._handleRowClick.bind(this));
    
    // Listen for keyboard events
    this.addEventListener('keydown', this._handleKeyDown.bind(this));
  }

  /**
   * Observe table changes to inject selection column
   * @private
   */
  _observeTableChanges() {
    // Wait for slotted content
    requestAnimationFrame(() => {
      this._injectSelectionColumn();
      this._updateRowStates();
      this._updateSelectionInfo();
    });

    // Observe for dynamic changes
    const slot = this.shadowRoot.querySelector('slot');
    if (slot) {
      slot.addEventListener('slotchange', () => {
        this._injectSelectionColumn();
        this._updateRowStates();
        this._updateSelectionInfo();
      });
    }
  }

  /**
   * Inject selection column into table
   * @private
   */
  _injectSelectionColumn() {
    const table = this.querySelector('harmony-table-core');
    if (!table) return;

    // Get table structure
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (!thead || !tbody) return;

    // Add header cell
    const headerRow = thead.querySelector('tr');
    if (headerRow) {
      // Check if selection column already exists
      let selectHeader = headerRow.querySelector('.select-column');
      if (!selectHeader) {
        selectHeader = document.createElement('th');
        selectHeader.className = 'select-column';
        selectHeader.setAttribute('aria-label', 'Row selection');
        
        if (this._mode === 'multi' && this.hasAttribute('show-select-all')) {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'select-checkbox';
          checkbox.setAttribute('aria-label', 'Select all rows');
          checkbox.id = 'select-all-checkbox';
          checkbox.addEventListener('change', (e) => this._handleSelectAll(e));
          selectHeader.appendChild(checkbox);
          this._updateSelectAllState();
        }
        
        headerRow.insertBefore(selectHeader, headerRow.firstChild);
      }
    }

    // Add body cells
    const rows = tbody.querySelectorAll('tr');
    this._totalRows = rows.length;
    this._rowElements.clear();
    
    rows.forEach((row, index) => {
      const rowId = row.getAttribute('data-row-id') || `row-${index}`;
      row.setAttribute('data-row-id', rowId);
      this._rowElements.set(rowId, row);

      // Check if selection cell already exists
      let selectCell = row.querySelector('.select-column');
      if (!selectCell) {
        selectCell = document.createElement('td');
        selectCell.className = 'select-column';
        
        const input = document.createElement('input');
        input.type = this._mode === 'single' ? 'radio' : 'checkbox';
        input.className = this._mode === 'single' ? 'select-radio' : 'select-checkbox';
        input.name = this._mode === 'single' ? 'table-row-selection' : '';
        input.value = rowId;
        input.setAttribute('aria-label', `Select row ${index + 1}`);
        input.addEventListener('change', (e) => this._handleRowSelection(e, rowId));
        
        selectCell.appendChild(input);
        row.insertBefore(selectCell, row.firstChild);
      }
    });
  }

  /**
   * Handle row click (for row-level selection)
   * @private
   * @param {MouseEvent} event
   */
  _handleRowClick(event) {
    const row = event.target.closest('tr');
    if (!row || !row.hasAttribute('data-row-id')) return;
    
    // Don't trigger if clicking on checkbox/radio directly
    if (event.target.matches('input[type="checkbox"], input[type="radio"]')) return;
    
    const rowId = row.getAttribute('data-row-id');
    const input = row.querySelector('.select-column input');
    if (input) {
      input.checked = !input.checked;
      this._handleRowSelection({ target: input }, rowId);
    }
  }

  /**
   * Handle keyboard navigation
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeyDown(event) {
    if (event.key === ' ' && event.target.matches('tr[data-row-id]')) {
      event.preventDefault();
      const rowId = event.target.getAttribute('data-row-id');
      const input = event.target.querySelector('.select-column input');
      if (input) {
        input.checked = !input.checked;
        this._handleRowSelection({ target: input }, rowId);
      }
    }
  }

  /**
   * Handle row selection change
   * @private
   * @param {Event} event
   * @param {string} rowId
   */
  _handleRowSelection(event, rowId) {
    const isChecked = event.target.checked;

    if (this._mode === 'single') {
      // Single select: clear all others
      this._selectedRows.clear();
      if (isChecked) {
        this._selectedRows.add(rowId);
      }
    } else {
      // Multi select: toggle
      if (isChecked) {
        this._selectedRows.add(rowId);
      } else {
        this._selectedRows.delete(rowId);
      }
    }

    this._updateRowStates();
    this._updateSelectAllState();
    this._updateSelectionInfo();
    this._syncAttribute();
    this._publishSelectionEvent(rowId, isChecked);
  }

  /**
   * Handle select all checkbox
   * @private
   * @param {Event} event
   */
  _handleSelectAll(event) {
    const isChecked = event.target.checked;

    if (isChecked) {
      // Select all rows
      this._rowElements.forEach((row, rowId) => {
        this._selectedRows.add(rowId);
      });
    } else {
      // Deselect all rows
      this._selectedRows.clear();
    }

    this._updateRowStates();
    this._updateSelectionInfo();
    this._syncAttribute();
    this._publishSelectionEvent(null, isChecked, true);
  }

  /**
   * Update visual state of all rows
   * @private
   */
  _updateRowStates() {
    this._rowElements.forEach((row, rowId) => {
      const isSelected = this._selectedRows.has(rowId);
      const input = row.querySelector('.select-column input');
      
      if (input) {
        input.checked = isSelected;
      }
      
      row.setAttribute('data-selected', isSelected.toString());
      row.setAttribute('aria-selected', isSelected.toString());
    });
  }

  /**
   * Update select all checkbox state
   * @private
   */
  _updateSelectAllState() {
    if (this._mode !== 'multi') return;

    const selectAllCheckbox = this.shadowRoot.getElementById('select-all-checkbox');
    if (!selectAllCheckbox) return;

    const selectedCount = this._selectedRows.size;
    
    if (selectedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === this._totalRows) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  /**
   * Update selection info display
   * @private
   */
  _updateSelectionInfo() {
    const infoEl = this.shadowRoot.getElementById('selection-info');
    const countEl = this.shadowRoot.getElementById('selection-count');
    
    if (!infoEl || !countEl) return;

    const count = this._selectedRows.size;
    
    if (count > 0) {
      infoEl.classList.add('visible');
      countEl.textContent = `${count} row${count === 1 ? '' : 's'} selected`;
    } else {
      infoEl.classList.remove('visible');
    }
  }

  /**
   * Sync selected-rows attribute
   * @private
   */
  _syncAttribute() {
    const value = Array.from(this._selectedRows).join(',');
    if (value) {
      this.setAttribute('selected-rows', value);
    } else {
      this.removeAttribute('selected-rows');
    }
  }

  /**
   * Publish selection event to EventBus
   * @private
   * @param {string|null} rowId
   * @param {boolean} isSelected
   * @param {boolean} isSelectAll
   */
  _publishSelectionEvent(rowId, isSelected, isSelectAll = false) {
    const selectedArray = Array.from(this._selectedRows);

    // Main selection changed event
    EventBus.publish('table:selection:changed', {
      selectedRows: selectedArray,
      mode: this._mode,
      count: selectedArray.length
    });

    // Specific events
    if (isSelectAll) {
      if (isSelected) {
        EventBus.publish('table:selection:all-selected', {
          selectedRows: selectedArray,
          count: selectedArray.length
        });
      } else {
        EventBus.publish('table:selection:cleared', {
          previousCount: this._totalRows
        });
      }
    } else if (rowId) {
      if (isSelected) {
        EventBus.publish('table:row:selected', {
          rowId,
          selectedRows: selectedArray
        });
      } else {
        EventBus.publish('table:row:deselected', {
          rowId,
          selectedRows: selectedArray
        });
      }
    }
  }

  /**
   * Public API: Get selected row IDs
   * @returns {string[]}
   */
  getSelectedRows() {
    return Array.from(this._selectedRows);
  }

  /**
   * Public API: Set selected rows programmatically
   * @param {string[]} rowIds
   */
  setSelectedRows(rowIds) {
    this._selectedRows.clear();
    
    if (this._mode === 'single' && rowIds.length > 0) {
      this._selectedRows.add(rowIds[0]);
    } else {
      rowIds.forEach(id => this._selectedRows.add(id));
    }

    this._updateRowStates();
    this._updateSelectAllState();
    this._updateSelectionInfo();
    this._syncAttribute();
    this._publishSelectionEvent(null, true);
  }

  /**
   * Public API: Select a row
   * @param {string} rowId
   */
  selectRow(rowId) {
    if (this._mode === 'single') {
      this._selectedRows.clear();
    }
    this._selectedRows.add(rowId);
    
    this._updateRowStates();
    this._updateSelectAllState();
    this._updateSelectionInfo();
    this._syncAttribute();
    this._publishSelectionEvent(rowId, true);
  }

  /**
   * Public API: Deselect a row
   * @param {string} rowId
   */
  deselectRow(rowId) {
    this._selectedRows.delete(rowId);
    
    this._updateRowStates();
    this._updateSelectAllState();
    this._updateSelectionInfo();
    this._syncAttribute();
    this._publishSelectionEvent(rowId, false);
  }

  /**
   * Public API: Clear all selections
   */
  clearSelection() {
    const hadSelection = this._selectedRows.size > 0;
    this._selectedRows.clear();
    
    this._updateRowStates();
    this._updateSelectAllState();
    this._updateSelectionInfo();
    this._syncAttribute();
    
    if (hadSelection) {
      EventBus.publish('table:selection:cleared', {
        previousCount: this._totalRows
      });
    }
  }

  /**
   * Public API: Check if row is selected
   * @param {string} rowId
   * @returns {boolean}
   */
  isRowSelected(rowId) {
    return this._selectedRows.has(rowId);
  }

  /**
   * Cleanup
   * @private
   */
  _cleanup() {
    this._selectedRows.clear();
    this._rowElements.clear();
  }
}

// Register custom element
customElements.define('harmony-table-row-selection', TableRowSelection);