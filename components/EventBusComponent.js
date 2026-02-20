/**
 * @fileoverview EventBus debugging component
 * @module components/EventBusComponent
 * 
 * Visual debugging interface for EventBus activity.
 * Shows real-time events, subscriptions, and diagnostics.
 * 
 * Usage: Include in app-shell, toggle with Ctrl+Shift+E
 * Related: DESIGN_SYSTEM.md § EventBus Architecture
 * Related: core/EventBus.js
 */

import eventBus from '../core/EventBus.js';

/**
 * EventBus debugging component
 * @extends HTMLElement
 */
class EventBusComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.visible = false;
    this.autoScroll = true;
    this.filterType = '';
    this.subscriptionId = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.setupKeyboardShortcut();
    
    // Subscribe to all events for monitoring
    this.startMonitoring();
  }

  disconnectedCallback() {
    if (this.subscriptionId) {
      eventBus.unsubscribe(this.subscriptionId);
    }
    document.removeEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Setup keyboard shortcut (Ctrl+Shift+E)
   */
  setupKeyboardShortcut() {
    this.keyboardHandler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Start monitoring EventBus activity
   */
  startMonitoring() {
    // Monitor by subscribing to common event patterns
    const eventTypes = eventBus.getRegisteredEventTypes();
    
    // If no types registered yet, use wildcard monitoring
    if (eventTypes.length === 0) {
      // Patch publish to intercept all events
      this.originalPublish = eventBus.publish.bind(eventBus);
      eventBus.publish = async (type, data, options) => {
        this.logEvent({ type, data, ...options, timestamp: Date.now() });
        return this.originalPublish(type, data, options);
      };
    } else {
      // Subscribe to each registered type
      eventTypes.forEach(type => {
        eventBus.subscribe(type, (event) => {
          this.logEvent(event);
        }, { priority: -1000 }); // Low priority to not interfere
      });
    }
  }

  /**
   * Log event to display
   * @param {Object} event
   */
  logEvent(event) {
    if (this.filterType && event.type !== this.filterType) {
      return;
    }

    const logContainer = this.shadowRoot.querySelector('.event-log');
    if (!logContainer) return;

    const entry = document.createElement('div');
    entry.className = 'event-entry';
    entry.innerHTML = `
      <div class="event-header">
        <span class="event-type">${event.type}</span>
        <span class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="event-details">
        <div><strong>Source:</strong> ${event.source || 'unknown'}</div>
        <div><strong>Data:</strong> <pre>${JSON.stringify(event.data, null, 2)}</pre></div>
      </div>
    `;

    logContainer.appendChild(entry);

    // Auto-scroll if enabled
    if (this.autoScroll) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }

    // Limit entries
    const entries = logContainer.querySelectorAll('.event-entry');
    if (entries.length > 100) {
      entries[0].remove();
    }
  }

  /**
   * Setup event listeners for controls
   */
  setupEventListeners() {
    const clearBtn = this.shadowRoot.querySelector('.clear-btn');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    const autoScrollCheckbox = this.shadowRoot.querySelector('.auto-scroll');
    const filterInput = this.shadowRoot.querySelector('.filter-input');
    const refreshBtn = this.shadowRoot.querySelector('.refresh-btn');

    clearBtn?.addEventListener('click', () => this.clearLog());
    closeBtn?.addEventListener('click', () => this.hide());
    autoScrollCheckbox?.addEventListener('change', (e) => {
      this.autoScroll = e.target.checked;
    });
    filterInput?.addEventListener('input', (e) => {
      this.filterType = e.target.value.trim();
      this.clearLog();
    });
    refreshBtn?.addEventListener('click', () => this.refreshDiagnostics());
  }

  /**
   * Clear event log
   */
  clearLog() {
    const logContainer = this.shadowRoot.querySelector('.event-log');
    if (logContainer) {
      logContainer.innerHTML = '';
    }
  }

  /**
   * Refresh diagnostics display
   */
  refreshDiagnostics() {
    const diagnostics = eventBus.getDiagnostics();
    const diagContainer = this.shadowRoot.querySelector('.diagnostics');
    
    if (diagContainer) {
      diagContainer.innerHTML = `
        <div><strong>Total Subscribers:</strong> ${diagnostics.totalSubscribers}</div>
        <div><strong>Event Types:</strong> ${diagnostics.eventTypes.length}</div>
        <div><strong>History Size:</strong> ${diagnostics.historySize}</div>
        <div><strong>Debug Mode:</strong> ${diagnostics.debugMode ? 'ON' : 'OFF'}</div>
        <details>
          <summary>Subscribers by Type</summary>
          <pre>${JSON.stringify(diagnostics.subscribersByType, null, 2)}</pre>
        </details>
      `;
    }
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show component
   */
  show() {
    this.visible = true;
    this.style.display = 'block';
    this.refreshDiagnostics();
  }

  /**
   * Hide component
   */
  hide() {
    this.visible = false;
    this.style.display = 'none';
  }

  /**
   * Render component
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          top: 20px;
          right: 20px;
          width: 600px;
          max-height: 80vh;
          background: #1e1e1e;
          color: #d4d4d4;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          z-index: 10000;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
        }

        .title {
          font-weight: bold;
          font-size: 14px;
        }

        .controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        button {
          padding: 4px 8px;
          background: #0e639c;
          color: white;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          font-size: 11px;
        }

        button:hover {
          background: #1177bb;
        }

        .close-btn {
          background: #c42b1c;
        }

        .close-btn:hover {
          background: #e81123;
        }

        .filter-input {
          padding: 4px 8px;
          background: #3c3c3c;
          border: 1px solid #555;
          color: #d4d4d4;
          border-radius: 2px;
          font-size: 11px;
        }

        .auto-scroll {
          margin-left: 8px;
        }

        .diagnostics {
          padding: 12px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
          font-size: 11px;
        }

        .diagnostics > div {
          margin-bottom: 4px;
        }

        details {
          margin-top: 8px;
        }

        summary {
          cursor: pointer;
          color: #4ec9b0;
        }

        pre {
          margin: 4px 0;
          padding: 4px;
          background: #1e1e1e;
          border-radius: 2px;
          overflow-x: auto;
        }

        .event-log {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .event-entry {
          margin-bottom: 12px;
          padding: 8px;
          background: #252526;
          border-left: 3px solid #0e639c;
          border-radius: 2px;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .event-type {
          color: #4ec9b0;
          font-weight: bold;
        }

        .event-time {
          color: #858585;
          font-size: 10px;
        }

        .event-details {
          font-size: 11px;
          color: #cccccc;
        }

        .event-details > div {
          margin-bottom: 4px;
        }

        .event-details strong {
          color: #9cdcfe;
        }
      </style>

      <div class="header">
        <div class="title">🔍 EventBus Monitor</div>
        <div class="controls">
          <input type="text" class="filter-input" placeholder="Filter by type...">
          <label>
            <input type="checkbox" class="auto-scroll" checked>
            Auto-scroll
          </label>
          <button class="refresh-btn">Refresh</button>
          <button class="clear-btn">Clear</button>
          <button class="close-btn">✕</button>
        </div>
      </div>

      <div class="diagnostics"></div>

      <div class="event-log"></div>
    `;
  }
}

// Register custom element
customElements.define('harmony-eventbus', EventBusComponent);

export default EventBusComponent;