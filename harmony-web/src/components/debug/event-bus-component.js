/**
 * EventBusComponent - Debug web component for displaying event bus activity
 * 
 * Displays a real-time log of all events flowing through the EventBus.
 * Useful for debugging component-to-BC interactions and event flow.
 * 
 * Usage:
 *   <event-bus-component></event-bus-component>
 * 
 * Keyboard shortcut: Ctrl+Shift+E to toggle visibility
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#event-bus-component
 */
class EventBusComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.eventLog = [];
    this.maxLogSize = 100;
    this.filters = {
      commands: true,
      results: true,
      errors: true
    };
    this.isVisible = false;
  }

  connectedCallback() {
    this.render();
    this.subscribeToEvents();
    this.setupKeyboardShortcut();
    this.applyVisibility();
  }

  disconnectedCallback() {
    this.unsubscribeFromEvents();
    this.removeKeyboardShortcut();
  }

  /**
   * Subscribe to all EventBus events
   * Pattern: Listen to the EventBus's internal log/broadcast mechanism
   */
  subscribeToEvents() {
    // Hook into EventBus if available
    if (window.EventBus && typeof window.EventBus.subscribe === 'function') {
      this.unsubscribe = window.EventBus.subscribe('*', (event) => {
        this.logEvent(event);
      });
    } else {
      // Fallback: wrap console methods to capture EventBus logs
      this.setupConsoleInterception();
    }
  }

  /**
   * Unsubscribe from EventBus events
   */
  unsubscribeFromEvents() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.restoreConsole();
  }

  /**
   * Setup console interception to capture EventBus activity
   * Temporary solution until EventBus exposes proper debug API
   */
  setupConsoleInterception() {
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;

    console.log = (...args) => {
      this.originalConsoleLog.apply(console, args);
      this.interceptConsoleMessage('log', args);
    };

    console.error = (...args) => {
      this.originalConsoleError.apply(console, args);
      this.interceptConsoleMessage('error', args);
    };
  }

  /**
   * Restore original console methods
   */
  restoreConsole() {
    if (this.originalConsoleLog) {
      console.log = this.originalConsoleLog;
    }
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }
  }

  /**
   * Intercept console messages and extract EventBus events
   * @param {string} level - Log level (log, error)
   * @param {Array} args - Console arguments
   */
  interceptConsoleMessage(level, args) {
    const message = args.join(' ');
    
    // Detect EventBus-related messages
    if (message.includes('EventBus') || message.includes('Command') || message.includes('Event')) {
      this.logEvent({
        type: level === 'error' ? 'error' : 'info',
        timestamp: Date.now(),
        message: message,
        data: args
      });
    }
  }

  /**
   * Log an event to the display
   * @param {Object} event - Event object
   */
  logEvent(event) {
    const logEntry = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: event.timestamp || Date.now(),
      type: event.type || 'unknown',
      eventType: event.eventType || event.command || 'N/A',
      source: event.source || 'unknown',
      payload: event.payload || event.data || {},
      error: event.error || null
    };

    this.eventLog.unshift(logEntry);

    // Maintain max log size
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(0, this.maxLogSize);
    }

    this.updateEventList();
  }

  /**
   * Setup Ctrl+Shift+E keyboard shortcut
   */
  setupKeyboardShortcut() {
    this.keyboardHandler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.toggleVisibility();
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Remove keyboard shortcut listener
   */
  removeKeyboardShortcut() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
  }

  /**
   * Toggle component visibility
   */
  toggleVisibility() {
    this.isVisible = !this.isVisible;
    this.applyVisibility();
  }

  /**
   * Apply visibility state
   */
  applyVisibility() {
    this.style.display = this.isVisible ? 'block' : 'none';
  }

  /**
   * Clear event log
   */
  clearLog() {
    this.eventLog = [];
    this.updateEventList();
  }

  /**
   * Toggle filter
   * @param {string} filterName - Filter to toggle
   */
  toggleFilter(filterName) {
    this.filters[filterName] = !this.filters[filterName];
    this.updateEventList();
  }

  /**
   * Get filtered events
   * @returns {Array} Filtered event log
   */
  getFilteredEvents() {
    return this.eventLog.filter(event => {
      if (event.type === 'error' && !this.filters.errors) return false;
      if (event.eventType.includes('Command') && !this.filters.commands) return false;
      if (event.eventType.includes('Result') && !this.filters.results) return false;
      return true;
    });
  }

  /**
   * Update event list display
   */
  updateEventList() {
    const eventList = this.shadowRoot.querySelector('.event-list');
    if (!eventList) return;

    const filteredEvents = this.getFilteredEvents();

    if (filteredEvents.length === 0) {
      eventList.innerHTML = '<div class="empty-state">No events logged yet. Events will appear here as they flow through the EventBus.</div>';
      return;
    }

    eventList.innerHTML = filteredEvents.map(event => this.renderEventItem(event)).join('');
  }

  /**
   * Render a single event item
   * @param {Object} event - Event log entry
   * @returns {string} HTML string
   */
  renderEventItem(event) {
    const time = new Date(event.timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    const typeClass = event.type === 'error' ? 'error' : 
                     event.eventType.includes('Command') ? 'command' : 'result';

    const payloadStr = JSON.stringify(event.payload, null, 2);
    const hasPayload = Object.keys(event.payload).length > 0;

    return `
      <div class="event-item ${typeClass}">
        <div class="event-header">
          <span class="event-time">${time}</span>
          <span class="event-type">${event.eventType}</span>
          <span class="event-source">${event.source}</span>
        </div>
        ${hasPayload ? `
          <details class="event-payload">
            <summary>Payload</summary>
            <pre>${this.escapeHtml(payloadStr)}</pre>
          </details>
        ` : ''}
        ${event.error ? `
          <div class="event-error">${this.escapeHtml(event.error)}</div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render component
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 0;
          right: 0;
          width: 500px;
          max-height: 600px;
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 12px;
          border: 1px solid #3c3c3c;
          border-radius: 4px 0 0 0;
          box-shadow: -2px -2px 10px rgba(0, 0, 0, 0.3);
          z-index: 10000;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
        }

        .title {
          font-weight: bold;
          color: #4ec9b0;
        }

        .controls {
          display: flex;
          gap: 8px;
        }

        .btn {
          background: #3c3c3c;
          border: none;
          color: #d4d4d4;
          padding: 4px 8px;
          border-radius: 2px;
          cursor: pointer;
          font-size: 11px;
        }

        .btn:hover {
          background: #505050;
        }

        .filters {
          display: flex;
          gap: 12px;
          padding: 8px 12px;
          background: #2d2d30;
          border-bottom: 1px solid #3c3c3c;
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          user-select: none;
        }

        .filter-checkbox {
          width: 14px;
          height: 14px;
        }

        .event-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .event-list::-webkit-scrollbar {
          width: 8px;
        }

        .event-list::-webkit-scrollbar-track {
          background: #1e1e1e;
        }

        .event-list::-webkit-scrollbar-thumb {
          background: #3c3c3c;
          border-radius: 4px;
        }

        .event-list::-webkit-scrollbar-thumb:hover {
          background: #505050;
        }

        .empty-state {
          color: #858585;
          text-align: center;
          padding: 40px 20px;
          font-style: italic;
        }

        .event-item {
          margin-bottom: 8px;
          padding: 8px;
          background: #252526;
          border-left: 3px solid #3c3c3c;
          border-radius: 2px;
        }

        .event-item.command {
          border-left-color: #4ec9b0;
        }

        .event-item.result {
          border-left-color: #569cd6;
        }

        .event-item.error {
          border-left-color: #f48771;
          background: #2d2020;
        }

        .event-header {
          display: flex;
          gap: 12px;
          margin-bottom: 4px;
        }

        .event-time {
          color: #858585;
          font-size: 10px;
        }

        .event-type {
          color: #dcdcaa;
          font-weight: bold;
        }

        .event-source {
          color: #9cdcfe;
          font-size: 10px;
        }

        .event-payload {
          margin-top: 4px;
        }

        .event-payload summary {
          cursor: pointer;
          color: #858585;
          font-size: 10px;
        }

        .event-payload summary:hover {
          color: #d4d4d4;
        }

        .event-payload pre {
          margin: 4px 0 0 0;
          padding: 4px;
          background: #1e1e1e;
          border-radius: 2px;
          overflow-x: auto;
          font-size: 10px;
          color: #ce9178;
        }

        .event-error {
          margin-top: 4px;
          padding: 4px;
          background: #5a1e1e;
          border-radius: 2px;
          color: #f48771;
          font-size: 10px;
        }
      </style>

      <div class="header">
        <div class="title">EventBus Monitor</div>
        <div class="controls">
          <button class="btn" id="clear-btn">Clear</button>
          <button class="btn" id="close-btn">Close</button>
        </div>
      </div>

      <div class="filters">
        <label class="filter-item">
          <input type="checkbox" class="filter-checkbox" id="filter-commands" checked>
          <span>Commands</span>
        </label>
        <label class="filter-item">
          <input type="checkbox" class="filter-checkbox" id="filter-results" checked>
          <span>Results</span>
        </label>
        <label class="filter-item">
          <input type="checkbox" class="filter-checkbox" id="filter-errors" checked>
          <span>Errors</span>
        </label>
      </div>

      <div class="event-list"></div>
    `;

    // Attach event listeners
    this.shadowRoot.getElementById('clear-btn').addEventListener('click', () => this.clearLog());
    this.shadowRoot.getElementById('close-btn').addEventListener('click', () => this.toggleVisibility());
    
    this.shadowRoot.getElementById('filter-commands').addEventListener('change', (e) => {
      this.filters.commands = e.target.checked;
      this.updateEventList();
    });
    
    this.shadowRoot.getElementById('filter-results').addEventListener('change', (e) => {
      this.filters.results = e.target.checked;
      this.updateEventList();
    });
    
    this.shadowRoot.getElementById('filter-errors').addEventListener('change', (e) => {
      this.filters.errors = e.target.checked;
      this.updateEventList();
    });

    this.updateEventList();
  }
}

// Register the custom element
customElements.define('event-bus-component', EventBusComponent);