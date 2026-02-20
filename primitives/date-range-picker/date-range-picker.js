/**
 * @file Date Range Picker Component
 * @description A date range picker with start and end date selection and visual range indication.
 * Follows Harmony Design System principles for accessible date selection.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#date-range-picker
 * 
 * Performance targets:
 * - Render: <16ms per frame
 * - Memory: <2MB component footprint
 * - Interaction: <100ms response time
 */

/**
 * DateRangePicker Web Component
 * Provides dual calendar interface for selecting date ranges with visual feedback.
 * 
 * @fires daterange-change - Emitted when range selection changes
 * @fires daterange-complete - Emitted when both start and end dates are selected
 * @fires daterange-clear - Emitted when range is cleared
 * 
 * @example
 * <date-range-picker 
 *   min-date="2024-01-01" 
 *   max-date="2024-12-31"
 *   start-date="2024-06-01"
 *   end-date="2024-06-15">
 * </date-range-picker>
 */
class DateRangePicker extends HTMLElement {
  /**
   * @private
   * @type {Date|null}
   */
  #startDate = null;

  /**
   * @private
   * @type {Date|null}
   */
  #endDate = null;

  /**
   * @private
   * @type {Date|null}
   */
  #hoverDate = null;

  /**
   * @private
   * @type {Date|null}
   */
  #minDate = null;

  /**
   * @private
   * @type {Date|null}
   */
  #maxDate = null;

  /**
   * @private
   * @type {Date}
   */
  #currentMonth = new Date();

  /**
   * @private
   * @type {'start'|'end'|null}
   */
  #selectingMode = null;

  static get observedAttributes() {
    return ['start-date', 'end-date', 'min-date', 'max-date', 'disabled'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.#render();
  }

  connectedCallback() {
    this.#attachEventListeners();
    this.#updateCalendar();
  }

  disconnectedCallback() {
    this.#detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'start-date':
        this.#startDate = newValue ? this.#parseDate(newValue) : null;
        break;
      case 'end-date':
        this.#endDate = newValue ? this.#parseDate(newValue) : null;
        break;
      case 'min-date':
        this.#minDate = newValue ? this.#parseDate(newValue) : null;
        break;
      case 'max-date':
        this.#maxDate = newValue ? this.#parseDate(newValue) : null;
        break;
      case 'disabled':
        this.#updateDisabledState();
        break;
    }

    this.#updateCalendar();
  }

  /**
   * Get the selected start date
   * @returns {Date|null}
   */
  get startDate() {
    return this.#startDate;
  }

  /**
   * Set the start date
   * @param {Date|string|null} value
   */
  set startDate(value) {
    const date = typeof value === 'string' ? this.#parseDate(value) : value;
    this.#startDate = date;
    this.#updateCalendar();
    this.#emitChangeEvent();
  }

  /**
   * Get the selected end date
   * @returns {Date|null}
   */
  get endDate() {
    return this.#endDate;
  }

  /**
   * Set the end date
   * @param {Date|string|null} value
   */
  set endDate(value) {
    const date = typeof value === 'string' ? this.#parseDate(value) : value;
    this.#endDate = date;
    this.#updateCalendar();
    this.#emitChangeEvent();
  }

  /**
   * Clear the selected range
   */
  clearRange() {
    this.#startDate = null;
    this.#endDate = null;
    this.#selectingMode = null;
    this.#updateCalendar();
    this.#emitEvent('daterange-clear', {});
  }

  /**
   * Parse date string to Date object
   * @private
   * @param {string} dateString
   * @returns {Date|null}
   */
  #parseDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Format date to YYYY-MM-DD
   * @private
   * @param {Date} date
   * @returns {string}
   */
  #formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if two dates are the same day
   * @private
   * @param {Date} date1
   * @param {Date} date2
   * @returns {boolean}
   */
  #isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Check if date is in selected range
   * @private
   * @param {Date} date
   * @returns {boolean}
   */
  #isInRange(date) {
    if (!this.#startDate || !this.#endDate) return false;
    return date >= this.#startDate && date <= this.#endDate;
  }

  /**
   * Check if date is in hover preview range
   * @private
   * @param {Date} date
   * @returns {boolean}
   */
  #isInHoverRange(date) {
    if (!this.#hoverDate || !this.#startDate || this.#endDate) return false;
    const start = this.#startDate < this.#hoverDate ? this.#startDate : this.#hoverDate;
    const end = this.#startDate < this.#hoverDate ? this.#hoverDate : this.#startDate;
    return date >= start && date <= end;
  }

  /**
   * Check if date is disabled
   * @private
   * @param {Date} date
   * @returns {boolean}
   */
  #isDateDisabled(date) {
    if (this.hasAttribute('disabled')) return true;
    if (this.#minDate && date < this.#minDate) return true;
    if (this.#maxDate && date > this.#maxDate) return true;
    return false;
  }

  /**
   * Handle date cell click
   * @private
   * @param {Date} date
   */
  #handleDateClick(date) {
    if (this.#isDateDisabled(date)) return;

    // If no dates selected, set start date
    if (!this.#startDate && !this.#endDate) {
      this.#startDate = date;
      this.#selectingMode = 'end';
    }
    // If only start date selected, set end date
    else if (this.#startDate && !this.#endDate) {
      if (date < this.#startDate) {
        // Clicked before start, swap them
        this.#endDate = this.#startDate;
        this.#startDate = date;
      } else {
        this.#endDate = date;
      }
      this.#selectingMode = null;
      this.#emitCompleteEvent();
    }
    // If both selected, start new selection
    else {
      this.#startDate = date;
      this.#endDate = null;
      this.#selectingMode = 'end';
    }

    this.#updateCalendar();
    this.#emitChangeEvent();
  }

  /**
   * Handle date cell hover
   * @private
   * @param {Date} date
   */
  #handleDateHover(date) {
    if (this.#isDateDisabled(date)) return;
    if (this.#startDate && !this.#endDate) {
      this.#hoverDate = date;
      this.#updateCalendar();
    }
  }

  /**
   * Navigate to previous month
   * @private
   */
  #previousMonth() {
    this.#currentMonth = new Date(
      this.#currentMonth.getFullYear(),
      this.#currentMonth.getMonth() - 1,
      1
    );
    this.#updateCalendar();
  }

  /**
   * Navigate to next month
   * @private
   */
  #nextMonth() {
    this.#currentMonth = new Date(
      this.#currentMonth.getFullYear(),
      this.#currentMonth.getMonth() + 1,
      1
    );
    this.#updateCalendar();
  }

  /**
   * Emit change event
   * @private
   */
  #emitChangeEvent() {
    this.#emitEvent('daterange-change', {
      startDate: this.#startDate ? this.#formatDate(this.#startDate) : null,
      endDate: this.#endDate ? this.#formatDate(this.#endDate) : null,
    });
  }

  /**
   * Emit complete event
   * @private
   */
  #emitCompleteEvent() {
    this.#emitEvent('daterange-complete', {
      startDate: this.#formatDate(this.#startDate),
      endDate: this.#formatDate(this.#endDate),
    });
  }

  /**
   * Emit custom event
   * @private
   * @param {string} eventName
   * @param {Object} detail
   */
  #emitEvent(eventName, detail) {
    this.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Attach event listeners
   * @private
   */
  #attachEventListeners() {
    const prevBtn = this.shadowRoot.querySelector('.prev-month');
    const nextBtn = this.shadowRoot.querySelector('.next-month');
    const clearBtn = this.shadowRoot.querySelector('.clear-btn');

    if (prevBtn) prevBtn.addEventListener('click', () => this.#previousMonth());
    if (nextBtn) nextBtn.addEventListener('click', () => this.#nextMonth());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearRange());
  }

  /**
   * Detach event listeners
   * @private
   */
  #detachEventListeners() {
    // Event listeners are on shadow DOM elements which will be garbage collected
  }

  /**
   * Update disabled state
   * @private
   */
  #updateDisabledState() {
    const container = this.shadowRoot.querySelector('.date-range-picker');
    if (container) {
      container.classList.toggle('disabled', this.hasAttribute('disabled'));
    }
  }

  /**
   * Update calendar display
   * @private
   */
  #updateCalendar() {
    const calendarGrid = this.shadowRoot.querySelector('.calendar-grid');
    if (!calendarGrid) return;

    const year = this.#currentMonth.getFullYear();
    const month = this.#currentMonth.getMonth();
    
    // Update month/year display
    const monthYear = this.shadowRoot.querySelector('.month-year');
    if (monthYear) {
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.#currentMonth);
      monthYear.textContent = `${monthName} ${year}`;
    }

    // Generate calendar days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    let html = '';

    // Day headers
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    dayNames.forEach(day => {
      html += `<div class="day-header">${day}</div>`;
    });

    // Empty cells for padding
    for (let i = 0; i < startPadding; i++) {
      html += '<div class="day-cell empty"></div>';
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const classes = ['day-cell'];
      
      if (this.#isSameDay(date, this.#startDate)) classes.push('start-date');
      if (this.#isSameDay(date, this.#endDate)) classes.push('end-date');
      if (this.#isInRange(date)) classes.push('in-range');
      if (this.#isInHoverRange(date)) classes.push('hover-range');
      if (this.#isDateDisabled(date)) classes.push('disabled');
      if (this.#isSameDay(date, new Date())) classes.push('today');

      const disabled = this.#isDateDisabled(date);
      const dateStr = this.#formatDate(date);

      html += `
        <button 
          class="${classes.join(' ')}" 
          data-date="${dateStr}"
          ${disabled ? 'disabled' : ''}
          aria-label="${dateStr}"
        >
          ${day}
        </button>
      `;
    }

    calendarGrid.innerHTML = html;

    // Attach click handlers to day cells
    calendarGrid.querySelectorAll('.day-cell:not(.empty):not(.disabled)').forEach(cell => {
      const dateStr = cell.getAttribute('data-date');
      const date = this.#parseDate(dateStr);
      
      cell.addEventListener('click', () => this.#handleDateClick(date));
      cell.addEventListener('mouseenter', () => this.#handleDateHover(date));
    });

    // Clear hover on mouse leave
    calendarGrid.addEventListener('mouseleave', () => {
      this.#hoverDate = null;
      this.#updateCalendar();
    });
  }

  /**
   * Render component template
   * @private
   */
  #render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --primary-color: #0066cc;
          --primary-light: #e6f2ff;
          --border-color: #d0d0d0;
          --text-color: #1a1a1a;
          --disabled-color: #a0a0a0;
          --hover-bg: #f5f5f5;
          --range-bg: #e6f2ff;
        }

        .date-range-picker {
          background: white;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 320px;
        }

        .date-range-picker.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .month-year {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-color);
        }

        .nav-buttons {
          display: flex;
          gap: 8px;
        }

        .nav-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .nav-btn:hover {
          background: var(--hover-bg);
          border-color: var(--primary-color);
        }

        .nav-btn:active {
          transform: scale(0.95);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .day-header {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: var(--disabled-color);
          padding: 8px 0;
        }

        .day-cell {
          aspect-ratio: 1;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.15s;
          position: relative;
        }

        .day-cell:not(.empty):not(.disabled):hover {
          background: var(--hover-bg);
          border-color: var(--primary-color);
        }

        .day-cell.empty {
          cursor: default;
        }

        .day-cell.disabled {
          color: var(--disabled-color);
          cursor: not-allowed;
        }

        .day-cell.today {
          font-weight: 600;
          color: var(--primary-color);
        }

        .day-cell.start-date,
        .day-cell.end-date {
          background: var(--primary-color);
          color: white;
          font-weight: 600;
        }

        .day-cell.start-date {
          border-top-left-radius: 50%;
          border-bottom-left-radius: 50%;
        }

        .day-cell.end-date {
          border-top-right-radius: 50%;
          border-bottom-right-radius: 50%;
        }

        .day-cell.in-range {
          background: var(--range-bg);
          border-radius: 0;
        }

        .day-cell.hover-range {
          background: var(--primary-light);
          border-radius: 0;
        }

        .day-cell.start-date.end-date {
          border-radius: 50%;
        }

        .footer {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .selected-range {
          font-size: 14px;
          color: var(--text-color);
        }

        .clear-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: var(--hover-bg);
          border-color: var(--primary-color);
        }

        .clear-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      </style>

      <div class="date-range-picker">
        <div class="header">
          <div class="month-year"></div>
          <div class="nav-buttons">
            <button class="nav-btn prev-month" aria-label="Previous month">◀</button>
            <button class="nav-btn next-month" aria-label="Next month">▶</button>
          </div>
        </div>
        <div class="calendar-grid"></div>
        <div class="footer">
          <div class="selected-range"></div>
          <button class="clear-btn">Clear</button>
        </div>
      </div>
    `;

    // Update selected range display
    this.#updateSelectedRangeDisplay();
  }

  /**
   * Update the selected range display text
   * @private
   */
  #updateSelectedRangeDisplay() {
    const rangeDisplay = this.shadowRoot.querySelector('.selected-range');
    const clearBtn = this.shadowRoot.querySelector('.clear-btn');
    
    if (!rangeDisplay || !clearBtn) return;

    if (this.#startDate && this.#endDate) {
      const start = this.#formatDate(this.#startDate);
      const end = this.#formatDate(this.#endDate);
      rangeDisplay.textContent = `${start} — ${end}`;
      clearBtn.disabled = false;
    } else if (this.#startDate) {
      rangeDisplay.textContent = `${this.#formatDate(this.#startDate)} — ...`;
      clearBtn.disabled = false;
    } else {
      rangeDisplay.textContent = 'Select date range';
      clearBtn.disabled = true;
    }
  }
}

customElements.define('date-range-picker', DateRangePicker);

export default DateRangePicker;