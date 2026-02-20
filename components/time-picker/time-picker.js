/**
 * @fileoverview Time Picker Component
 * @module components/time-picker
 * 
 * Provides hour, minute, and second selection with 12/24 hour format support.
 * Publishes events via EventBus for state changes.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#time-picker Time Picker Documentation}
 */

/**
 * Time Picker Web Component
 * 
 * Features:
 * - Hour, minute, second selection
 * - 12/24 hour format toggle
 * - Keyboard navigation
 * - Accessible ARIA labels
 * - Event-driven architecture
 * 
 * @fires time-change - When time value changes
 * @fires time-picker-open - When picker opens
 * @fires time-picker-close - When picker closes
 * 
 * @example
 * <time-picker 
 *   value="14:30:00" 
 *   format="24" 
 *   show-seconds="true">
 * </time-picker>
 */
class TimePicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._hour = 0;
    this._minute = 0;
    this._second = 0;
    this._format = '24'; // '12' or '24'
    this._period = 'AM'; // 'AM' or 'PM' for 12-hour format
    this._showSeconds = true;
    this._isOpen = false;
    this._focusedColumn = null;
    
    // Bind methods
    this._handleInputClick = this._handleInputClick.bind(this);
    this._handleDocumentClick = this._handleDocumentClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleScroll = this._handleScroll.bind(this);
  }
  
  static get observedAttributes() {
    return ['value', 'format', 'show-seconds', 'disabled', 'min', 'max'];
  }
  
  connectedCallback() {
    this._parseValue();
    this._render();
    this._attachEventListeners();
  }
  
  disconnectedCallback() {
    this._detachEventListeners();
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'value':
        this._parseValue();
        this._render();
        break;
      case 'format':
        this._format = newValue === '12' ? '12' : '24';
        this._render();
        break;
      case 'show-seconds':
        this._showSeconds = newValue === 'true';
        this._render();
        break;
      case 'disabled':
      case 'min':
      case 'max':
        this._render();
        break;
    }
  }
  
  /**
   * Parse value attribute into hour, minute, second
   * @private
   */
  _parseValue() {
    const value = this.getAttribute('value') || '00:00:00';
    const parts = value.split(':');
    
    this._hour = parseInt(parts[0] || '0', 10);
    this._minute = parseInt(parts[1] || '0', 10);
    this._second = parseInt(parts[2] || '0', 10);
    
    // Convert to 12-hour format if needed
    if (this._format === '12') {
      if (this._hour >= 12) {
        this._period = 'PM';
        this._hour = this._hour === 12 ? 12 : this._hour - 12;
      } else {
        this._period = 'AM';
        this._hour = this._hour === 0 ? 12 : this._hour;
      }
    }
  }
  
  /**
   * Get current time value in 24-hour format
   * @returns {string} Time in HH:MM:SS format
   */
  getValue() {
    let hour = this._hour;
    
    if (this._format === '12') {
      if (this._period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (this._period === 'AM' && hour === 12) {
        hour = 0;
      }
    }
    
    const h = String(hour).padStart(2, '0');
    const m = String(this._minute).padStart(2, '0');
    const s = String(this._second).padStart(2, '0');
    
    return `${h}:${m}:${s}`;
  }
  
  /**
   * Set time value
   * @param {string} value - Time in HH:MM:SS format
   */
  setValue(value) {
    this.setAttribute('value', value);
  }
  
  /**
   * Render component
   * @private
   */
  _render() {
    const disabled = this.hasAttribute('disabled');
    const displayHour = this._format === '12' ? this._hour : String(this._hour).padStart(2, '0');
    const displayMinute = String(this._minute).padStart(2, '0');
    const displaySecond = String(this._second).padStart(2, '0');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          --primary-color: #0066cc;
          --border-color: #d1d5db;
          --hover-bg: #f3f4f6;
          --focus-ring: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }
        
        .time-picker-input {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: white;
          cursor: pointer;
          user-select: none;
          transition: all 150ms ease;
        }
        
        .time-picker-input:hover:not(.disabled) {
          border-color: var(--primary-color);
        }
        
        .time-picker-input:focus-within {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: var(--focus-ring);
        }
        
        .time-picker-input.disabled {
          background: #f9fafb;
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .time-display {
          display: flex;
          align-items: center;
          gap: 2px;
          font-variant-numeric: tabular-nums;
        }
        
        .time-separator {
          color: #6b7280;
        }
        
        .icon {
          width: 16px;
          height: 16px;
          color: #6b7280;
        }
        
        .picker-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          z-index: 1000;
          display: none;
          padding: 12px;
          min-width: 240px;
        }
        
        .picker-dropdown.open {
          display: block;
        }
        
        .picker-columns {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .picker-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .column-label {
          font-size: 11px;
          font-weight: 500;
          color: #6b7280;
          text-align: center;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        
        .column-scroll {
          height: 180px;
          overflow-y: auto;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          scroll-behavior: smooth;
        }
        
        .column-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .column-scroll::-webkit-scrollbar-track {
          background: #f9fafb;
        }
        
        .column-scroll::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        .column-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        .column-item {
          padding: 8px;
          text-align: center;
          cursor: pointer;
          transition: background 100ms ease;
          font-variant-numeric: tabular-nums;
        }
        
        .column-item:hover {
          background: var(--hover-bg);
        }
        
        .column-item.selected {
          background: var(--primary-color);
          color: white;
          font-weight: 500;
        }
        
        .picker-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }
        
        .format-toggle {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          padding: 2px;
          border-radius: 4px;
        }
        
        .format-btn {
          padding: 4px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 3px;
          font-size: 12px;
          font-weight: 500;
          transition: all 100ms ease;
        }
        
        .format-btn.active {
          background: white;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 100ms ease;
        }
        
        .btn-clear {
          background: transparent;
          color: #6b7280;
        }
        
        .btn-clear:hover {
          background: var(--hover-bg);
        }
        
        .btn-now {
          background: var(--primary-color);
          color: white;
        }
        
        .btn-now:hover {
          background: #0052a3;
        }
      </style>
      
      <div class="time-picker-input ${disabled ? 'disabled' : ''}" 
           role="button" 
           tabindex="${disabled ? '-1' : '0'}"
           aria-label="Time picker"
           aria-expanded="${this._isOpen}"
           aria-haspopup="dialog">
        <div class="time-display">
          <span>${displayHour}</span>
          <span class="time-separator">:</span>
          <span>${displayMinute}</span>
          ${this._showSeconds ? `
            <span class="time-separator">:</span>
            <span>${displaySecond}</span>
          ` : ''}
          ${this._format === '12' ? `<span style="margin-left: 4px; font-size: 12px;">${this._period}</span>` : ''}
        </div>
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <div class="picker-dropdown ${this._isOpen ? 'open' : ''}" 
           role="dialog" 
           aria-label="Time selection">
        <div class="picker-columns">
          <div class="picker-column">
            <div class="column-label">Hour</div>
            <div class="column-scroll" data-column="hour">
              ${this._renderHourOptions()}
            </div>
          </div>
          <div class="picker-column">
            <div class="column-label">Minute</div>
            <div class="column-scroll" data-column="minute">
              ${this._renderMinuteOptions()}
            </div>
          </div>
          ${this._showSeconds ? `
            <div class="picker-column">
              <div class="column-label">Second</div>
              <div class="column-scroll" data-column="second">
                ${this._renderSecondOptions()}
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="picker-footer">
          <div class="format-toggle">
            <button class="format-btn ${this._format === '12' ? 'active' : ''}" 
                    data-format="12">12h</button>
            <button class="format-btn ${this._format === '24' ? 'active' : ''}" 
                    data-format="24">24h</button>
          </div>
          <div class="action-buttons">
            <button class="btn btn-clear" data-action="clear">Clear</button>
            <button class="btn btn-now" data-action="now">Now</button>
          </div>
        </div>
      </div>
    `;
    
    this._attachPickerListeners();
    this._scrollToSelected();
  }
  
  /**
   * Render hour options based on format
   * @private
   */
  _renderHourOptions() {
    const maxHour = this._format === '12' ? 12 : 23;
    const startHour = this._format === '12' ? 1 : 0;
    
    let html = '';
    for (let i = startHour; i <= maxHour; i++) {
      const displayValue = this._format === '24' ? String(i).padStart(2, '0') : i;
      const isSelected = i === this._hour;
      html += `<div class="column-item ${isSelected ? 'selected' : ''}" 
                    data-value="${i}">${displayValue}</div>`;
    }
    return html;
  }
  
  /**
   * Render minute options
   * @private
   */
  _renderMinuteOptions() {
    let html = '';
    for (let i = 0; i < 60; i++) {
      const displayValue = String(i).padStart(2, '0');
      const isSelected = i === this._minute;
      html += `<div class="column-item ${isSelected ? 'selected' : ''}" 
                    data-value="${i}">${displayValue}</div>`;
    }
    return html;
  }
  
  /**
   * Render second options
   * @private
   */
  _renderSecondOptions() {
    let html = '';
    for (let i = 0; i < 60; i++) {
      const displayValue = String(i).padStart(2, '0');
      const isSelected = i === this._second;
      html += `<div class="column-item ${isSelected ? 'selected' : ''}" 
                    data-value="${i}">${displayValue}</div>`;
    }
    return html;
  }
  
  /**
   * Scroll to selected values in columns
   * @private
   */
  _scrollToSelected() {
    requestAnimationFrame(() => {
      const columns = this.shadowRoot.querySelectorAll('.column-scroll');
      columns.forEach(column => {
        const selected = column.querySelector('.column-item.selected');
        if (selected) {
          selected.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    });
  }
  
  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    const input = this.shadowRoot.querySelector('.time-picker-input');
    input.addEventListener('click', this._handleInputClick);
    input.addEventListener('keydown', this._handleKeyDown);
  }
  
  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    document.removeEventListener('click', this._handleDocumentClick);
  }
  
  /**
   * Attach picker-specific listeners
   * @private
   */
  _attachPickerListeners() {
    // Column item clicks
    const items = this.shadowRoot.querySelectorAll('.column-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        const column = e.target.closest('.column-scroll').dataset.column;
        const value = parseInt(e.target.dataset.value, 10);
        this._updateValue(column, value);
      });
    });
    
    // Format toggle
    const formatBtns = this.shadowRoot.querySelectorAll('.format-btn');
    formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this._format = btn.dataset.format;
        this._convertFormat();
        this._render();
        this._publishEvent('format-change', { format: this._format });
      });
    });
    
    // Action buttons
    const clearBtn = this.shadowRoot.querySelector('[data-action="clear"]');
    clearBtn.addEventListener('click', () => this._clearTime());
    
    const nowBtn = this.shadowRoot.querySelector('[data-action="now"]');
    nowBtn.addEventListener('click', () => this._setNow());
  }
  
  /**
   * Handle input click
   * @private
   */
  _handleInputClick(e) {
    if (this.hasAttribute('disabled')) return;
    
    e.stopPropagation();
    this._togglePicker();
  }
  
  /**
   * Handle document click for closing picker
   * @private
   */
  _handleDocumentClick(e) {
    if (!this.contains(e.target)) {
      this._closePicker();
    }
  }
  
  /**
   * Handle keyboard navigation
   * @private
   */
  _handleKeyDown(e) {
    if (this.hasAttribute('disabled')) return;
    
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._togglePicker();
        break;
      case 'Escape':
        if (this._isOpen) {
          e.preventDefault();
          this._closePicker();
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        if (this._isOpen) {
          e.preventDefault();
          // Handle column navigation
        }
        break;
    }
  }
  
  /**
   * Toggle picker open/close
   * @private
   */
  _togglePicker() {
    if (this._isOpen) {
      this._closePicker();
    } else {
      this._openPicker();
    }
  }
  
  /**
   * Open picker
   * @private
   */
  _openPicker() {
    this._isOpen = true;
    this._render();
    document.addEventListener('click', this._handleDocumentClick);
    this._publishEvent('time-picker-open', {});
  }
  
  /**
   * Close picker
   * @private
   */
  _closePicker() {
    this._isOpen = false;
    this._render();
    document.removeEventListener('click', this._handleDocumentClick);
    this._publishEvent('time-picker-close', {});
  }
  
  /**
   * Update time value
   * @private
   */
  _updateValue(column, value) {
    switch (column) {
      case 'hour':
        this._hour = value;
        break;
      case 'minute':
        this._minute = value;
        break;
      case 'second':
        this._second = value;
        break;
    }
    
    const newValue = this.getValue();
    this.setAttribute('value', newValue);
    this._publishEvent('time-change', { value: newValue });
  }
  
  /**
   * Convert between 12/24 hour formats
   * @private
   */
  _convertFormat() {
    if (this._format === '12') {
      // Convert from 24 to 12
      if (this._hour >= 12) {
        this._period = 'PM';
        this._hour = this._hour === 12 ? 12 : this._hour - 12;
      } else {
        this._period = 'AM';
        this._hour = this._hour === 0 ? 12 : this._hour;
      }
    } else {
      // Convert from 12 to 24
      if (this._period === 'PM' && this._hour !== 12) {
        this._hour += 12;
      } else if (this._period === 'AM' && this._hour === 12) {
        this._hour = 0;
      }
    }
  }
  
  /**
   * Clear time value
   * @private
   */
  _clearTime() {
    this._hour = this._format === '12' ? 12 : 0;
    this._minute = 0;
    this._second = 0;
    this._period = 'AM';
    
    const newValue = this.getValue();
    this.setAttribute('value', newValue);
    this._render();
    this._publishEvent('time-change', { value: newValue });
  }
  
  /**
   * Set to current time
   * @private
   */
  _setNow() {
    const now = new Date();
    this._hour = now.getHours();
    this._minute = now.getMinutes();
    this._second = now.getSeconds();
    
    if (this._format === '12') {
      this._convertFormat();
    }
    
    const newValue = this.getValue();
    this.setAttribute('value', newValue);
    this._render();
    this._publishEvent('time-change', { value: newValue });
  }
  
  /**
   * Publish event via EventBus
   * @private
   */
  _publishEvent(eventType, detail) {
    const event = new CustomEvent(eventType, {
      detail,
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
    
    // Also publish to EventBus if available
    if (window.eventBus) {
      window.eventBus.publish({
        type: `time-picker:${eventType}`,
        payload: {
          ...detail,
          componentId: this.id || 'time-picker',
          timestamp: Date.now()
        }
      });
    }
  }
}

// Register custom element
customElements.define('time-picker', TimePicker);

export default TimePicker;