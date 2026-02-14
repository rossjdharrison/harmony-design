/**
 * @fileoverview Real-time event stream visualizer with filtering
 * @see harmony-design/DESIGN_SYSTEM.md#event-stream-visualization
 */

/**
 * EventStreamVisualizer Web Component
 * Provides real-time visualization of EventBus events with filtering capabilities
 * 
 * @extends HTMLElement
 * 
 * @example
 * <event-stream-visualizer max-events="100"></event-stream-visualizer>
 */
class EventStreamVisualizer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Array<{timestamp: number, type: string, source: string, payload: any, id: string}>} */
    this._events = [];
    
    /** @type {number} */
    this._maxEvents = 100;
    
    /** @type {Set<string>} */
    this._filteredTypes = new Set();
    
    /** @type {Set<string>} */
    this._filteredSources = new Set();
    
    /** @type {string} */
    this._searchText = '';
    
    /** @type {boolean} */
    this._isPaused = false;
    
    /** @type {number} */
    this._eventCounter = 0;
    
    /** @type {Map<string, number>} */
    this._typeStats = new Map();
    
    /** @type {number|null} */
    this._animationFrame = null;
  }

  static get observedAttributes() {
    return ['max-events', 'visible'];
  }

  connectedCallback() {
    this._maxEvents = parseInt(this.getAttribute('max-events') || '100', 10);
    this._render();
    this._attachEventListeners();
    this._subscribeToEventBus();
  }

  disconnectedCallback() {
    this._unsubscribeFromEventBus();
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'max-events') {
      this._maxEvents = parseInt(newValue || '100', 10);
      this._trimEvents();
    } else if (name === 'visible') {
      this._updateVisibility();
    }
  }

  /**
   * Subscribe to EventBus for all events
   * @private
   */
  _subscribeToEventBus() {
    if (window.EventBus) {
      // Subscribe to all events using wildcard pattern
      this._eventHandler = (event) => this._handleEvent(event);
      window.EventBus.subscribeAll(this._eventHandler);
    }
  }

  /**
   * Unsubscribe from EventBus
   * @private
   */
  _unsubscribeFromEventBus() {
    if (window.EventBus && this._eventHandler) {
      window.EventBus.unsubscribeAll(this._eventHandler);
    }
  }

  /**
   * Handle incoming event from EventBus
   * @param {Object} event - Event object
   * @private
   */
  _handleEvent(event) {
    if (this._isPaused) return;

    const eventRecord = {
      timestamp: Date.now(),
      type: event.type || 'unknown',
      source: event.source || 'unknown',
      payload: event.payload,
      id: `evt-${this._eventCounter++}`
    };

    // Update statistics
    const count = this._typeStats.get(eventRecord.type) || 0;
    this._typeStats.set(eventRecord.type, count + 1);

    this._events.unshift(eventRecord);
    this._trimEvents();

    // Request render on next frame (performance budget: 16ms)
    if (!this._animationFrame) {
      this._animationFrame = requestAnimationFrame(() => {
        this._updateEventList();
        this._updateStats();
        this._animationFrame = null;
      });
    }
  }

  /**
   * Trim events to max limit
   * @private
   */
  _trimEvents() {
    if (this._events.length > this._maxEvents) {
      this._events = this._events.slice(0, this._maxEvents);
    }
  }

  /**
   * Render component structure
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${this._getStyles()}
      </style>
      <div class="visualizer">
        <div class="header">
          <h3>Event Stream</h3>
          <div class="controls">
            <button id="pauseBtn" class="control-btn" title="Pause/Resume">
              <span class="icon">⏸</span>
            </button>
            <button id="clearBtn" class="control-btn" title="Clear Events">
              <span class="icon">🗑</span>
            </button>
            <button id="exportBtn" class="control-btn" title="Export Events">
              <span class="icon">💾</span>
            </button>
          </div>
        </div>

        <div class="filters">
          <input 
            type="text" 
            id="searchInput" 
            placeholder="Search events..." 
            class="search-input"
          />
          <div class="filter-chips" id="typeFilters"></div>
        </div>

        <div class="stats" id="stats">
          <div class="stat">
            <span class="stat-label">Total:</span>
            <span class="stat-value" id="totalCount">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Filtered:</span>
            <span class="stat-value" id="filteredCount">0</span>
          </div>
        </div>

        <div class="event-list" id="eventList">
          <div class="empty-state">No events captured yet</div>
        </div>
      </div>
    `;
  }

  /**
   * Get component styles
   * @returns {string} CSS styles
   * @private
   */
  _getStyles() {
    return `
      :host {
        display: block;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        color: #333;
      }

      .visualizer {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
        border-bottom: 1px solid #ddd;
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #212529;
      }

      .controls {
        display: flex;
        gap: 8px;
      }

      .control-btn {
        padding: 6px 12px;
        background: #fff;
        border: 1px solid #ced4da;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .control-btn:hover {
        background: #f8f9fa;
        border-color: #adb5bd;
      }

      .control-btn:active {
        transform: translateY(1px);
      }

      .control-btn.paused {
        background: #fff3cd;
        border-color: #ffc107;
      }

      .icon {
        font-size: 16px;
      }

      .filters {
        padding: 12px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #ddd;
      }

      .search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 14px;
        margin-bottom: 8px;
      }

      .search-input:focus {
        outline: none;
        border-color: #0d6efd;
        box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
      }

      .filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        min-height: 24px;
      }

      .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: #e9ecef;
        border: 1px solid #ced4da;
        border-radius: 12px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .filter-chip:hover {
        background: #dee2e6;
      }

      .filter-chip.active {
        background: #0d6efd;
        color: #fff;
        border-color: #0d6efd;
      }

      .stats {
        display: flex;
        gap: 16px;
        padding: 8px 16px;
        background: #fff;
        border-bottom: 1px solid #ddd;
        font-size: 12px;
      }

      .stat {
        display: flex;
        gap: 4px;
      }

      .stat-label {
        color: #6c757d;
      }

      .stat-value {
        font-weight: 600;
        color: #212529;
      }

      .event-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        background: #fff;
      }

      .empty-state {
        padding: 32px;
        text-align: center;
        color: #6c757d;
      }

      .event-item {
        padding: 8px 12px;
        margin-bottom: 4px;
        background: #f8f9fa;
        border-left: 3px solid #0d6efd;
        border-radius: 4px;
        font-size: 13px;
        transition: background 0.15s ease;
        animation: slideIn 0.2s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .event-item:hover {
        background: #e9ecef;
      }

      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .event-type {
        font-weight: 600;
        color: #212529;
      }

      .event-time {
        font-size: 11px;
        color: #6c757d;
      }

      .event-meta {
        display: flex;
        gap: 8px;
        font-size: 11px;
        color: #6c757d;
        margin-bottom: 4px;
      }

      .event-source {
        font-style: italic;
      }

      .event-payload {
        padding: 6px 8px;
        background: #fff;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        color: #495057;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 100px;
        overflow-y: auto;
      }

      /* Scrollbar styling */
      .event-list::-webkit-scrollbar,
      .event-payload::-webkit-scrollbar {
        width: 8px;
      }

      .event-list::-webkit-scrollbar-track,
      .event-payload::-webkit-scrollbar-track {
        background: #f1f1f1;
      }

      .event-list::-webkit-scrollbar-thumb,
      .event-payload::-webkit-scrollbar-thumb {
        background: #ced4da;
        border-radius: 4px;
      }

      .event-list::-webkit-scrollbar-thumb:hover,
      .event-payload::-webkit-scrollbar-thumb:hover {
        background: #adb5bd;
      }
    `;
  }

  /**
   * Attach event listeners to controls
   * @private
   */
  _attachEventListeners() {
    const pauseBtn = this.shadowRoot.getElementById('pauseBtn');
    const clearBtn = this.shadowRoot.getElementById('clearBtn');
    const exportBtn = this.shadowRoot.getElementById('exportBtn');
    const searchInput = this.shadowRoot.getElementById('searchInput');

    pauseBtn.addEventListener('click', () => this._togglePause());
    clearBtn.addEventListener('click', () => this._clearEvents());
    exportBtn.addEventListener('click', () => this._exportEvents());
    searchInput.addEventListener('input', (e) => this._handleSearch(e.target.value));
  }

  /**
   * Toggle pause state
   * @private
   */
  _togglePause() {
    this._isPaused = !this._isPaused;
    const pauseBtn = this.shadowRoot.getElementById('pauseBtn');
    const icon = pauseBtn.querySelector('.icon');
    
    if (this._isPaused) {
      icon.textContent = '▶';
      pauseBtn.classList.add('paused');
      pauseBtn.title = 'Resume';
    } else {
      icon.textContent = '⏸';
      pauseBtn.classList.remove('paused');
      pauseBtn.title = 'Pause';
    }
  }

  /**
   * Clear all events
   * @private
   */
  _clearEvents() {
    this._events = [];
    this._typeStats.clear();
    this._updateEventList();
    this._updateStats();
    this._updateFilterChips();
  }

  /**
   * Export events as JSON
   * @private
   */
  _exportEvents() {
    const data = JSON.stringify(this._events, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-stream-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Handle search input
   * @param {string} text - Search text
   * @private
   */
  _handleSearch(text) {
    this._searchText = text.toLowerCase();
    this._updateEventList();
  }

  /**
   * Toggle type filter
   * @param {string} type - Event type
   * @private
   */
  _toggleTypeFilter(type) {
    if (this._filteredTypes.has(type)) {
      this._filteredTypes.delete(type);
    } else {
      this._filteredTypes.add(type);
    }
    this._updateEventList();
    this._updateFilterChips();
  }

  /**
   * Filter events based on current filters
   * @returns {Array} Filtered events
   * @private
   */
  _getFilteredEvents() {
    return this._events.filter(event => {
      // Type filter
      if (this._filteredTypes.size > 0 && !this._filteredTypes.has(event.type)) {
        return false;
      }

      // Search filter
      if (this._searchText) {
        const searchableText = `${event.type} ${event.source} ${JSON.stringify(event.payload)}`.toLowerCase();
        if (!searchableText.includes(this._searchText)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Update event list display
   * @private
   */
  _updateEventList() {
    const eventList = this.shadowRoot.getElementById('eventList');
    const filteredEvents = this._getFilteredEvents();

    if (filteredEvents.length === 0) {
      eventList.innerHTML = '<div class="empty-state">No events match current filters</div>';
      return;
    }

    // Performance: Only render visible events (virtual scrolling concept)
    const maxVisible = 50;
    const visibleEvents = filteredEvents.slice(0, maxVisible);

    eventList.innerHTML = visibleEvents.map(event => this._renderEventItem(event)).join('');

    // Update stats
    const filteredCount = this.shadowRoot.getElementById('filteredCount');
    filteredCount.textContent = filteredEvents.length;
  }

  /**
   * Render single event item
   * @param {Object} event - Event record
   * @returns {string} HTML string
   * @private
   */
  _renderEventItem(event) {
    const time = new Date(event.timestamp).toLocaleTimeString();
    const payloadStr = JSON.stringify(event.payload, null, 2);

    return `
      <div class="event-item" data-event-id="${event.id}">
        <div class="event-header">
          <span class="event-type">${this._escapeHtml(event.type)}</span>
          <span class="event-time">${time}</span>
        </div>
        <div class="event-meta">
          <span class="event-source">from: ${this._escapeHtml(event.source)}</span>
        </div>
        <div class="event-payload">${this._escapeHtml(payloadStr)}</div>
      </div>
    `;
  }

  /**
   * Update statistics display
   * @private
   */
  _updateStats() {
    const totalCount = this.shadowRoot.getElementById('totalCount');
    totalCount.textContent = this._events.length;

    this._updateFilterChips();
  }

  /**
   * Update filter chips
   * @private
   */
  _updateFilterChips() {
    const typeFilters = this.shadowRoot.getElementById('typeFilters');
    const uniqueTypes = Array.from(this._typeStats.keys()).sort();

    if (uniqueTypes.length === 0) {
      typeFilters.innerHTML = '<span style="color: #6c757d; font-size: 12px;">No event types yet</span>';
      return;
    }

    typeFilters.innerHTML = uniqueTypes.map(type => {
      const count = this._typeStats.get(type);
      const isActive = this._filteredTypes.size === 0 || this._filteredTypes.has(type);
      return `
        <div class="filter-chip ${isActive ? 'active' : ''}" data-type="${this._escapeHtml(type)}">
          ${this._escapeHtml(type)} (${count})
        </div>
      `;
    }).join('');

    // Attach click handlers
    typeFilters.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const type = chip.getAttribute('data-type');
        this._toggleTypeFilter(type);
      });
    });
  }

  /**
   * Update visibility
   * @private
   */
  _updateVisibility() {
    const visible = this.getAttribute('visible') === 'true';
    this.style.display = visible ? 'block' : 'none';
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format timestamp for display
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted time
   * @private
   */
  _formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }
}

// Register custom element
customElements.define('event-stream-visualizer', EventStreamVisualizer);

export default EventStreamVisualizer;