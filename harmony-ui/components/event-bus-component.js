/**
 * @fileoverview EventBusComponent - Visual debugging tool for EventBus
 * 
 * Displays real-time event traffic for debugging. Available on every page,
 * shown/hidden with Ctrl+Shift+E.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#debugging-tools
 */

import eventBus from '../../harmony-core/event-bus.js';

/**
 * Visual debugging component for EventBus
 * Shows event history and real-time traffic
 */
class EventBusComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isVisible = false;
    this.unsubscribe = null;
  }

  connectedCallback() {
    this.render();
    this.setupKeyboardShortcut();
    this.subscribeToAllEvents();
  }

  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.removeKeyboardShortcut();
  }

  /**
   * Setup Ctrl+Shift+E keyboard shortcut
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
   * Remove keyboard shortcut listener
   */
  removeKeyboardShortcut() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
  }

  /**
   * Subscribe to all events for display
   */
  subscribeToAllEvents() {
    // We'll update display when events are published
    // The EventBus history already tracks them
    this.refreshInterval = setInterval(() => {
      if (this.isVisible) {
        this.updateEventList();
      }
    }, 500);
  }

  /**
   * Toggle visibility
   */
  toggle() {
    this.isVisible = !this.isVisible;
    this.shadowRoot.querySelector('.event-bus-panel').style.display = 
      this.isVisible ? 'flex' : 'none';
    
    if (this.isVisible) {
      this.updateEventList();
    }
  }

  /**
   * Update the event list display
   */
  updateEventList() {
    const history = eventBus.getHistory();
    const listElement = this.shadowRoot.querySelector('.event-list');
    
    listElement.innerHTML = history
      .slice()
      .reverse()
      .map(event => this.renderEvent(event))
      .join('');
  }

  /**
   * Render a single event item
   * @param {Object} event
   * @returns {string}
   */
  renderEvent(event) {
    const time = new Date(event.timestamp).toLocaleTimeString();
    const payloadStr = JSON.stringify(event.payload, null, 2);
    
    return `
      <div class="event-item">
        <div class="event-header">
          <span class="event-type">${this.escapeHtml(event.type)}</span>
          <span class="event-time">${time}</span>
        </div>
        <div class="event-source">Source: ${this.escapeHtml(event.source)}</div>
        <details class="event-payload">
          <summary>Payload</summary>
          <pre>${this.escapeHtml(payloadStr)}</pre>
        </details>
      </div>
    `;
  }

  /**
   * Escape HTML for safe display
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  /**
   * Clear event history
   */
  clearHistory() {
    eventBus.clearHistory();
    this.updateEventList();
  }

  /**
   * Toggle debug mode
   */
  toggleDebugMode() {
    const currentMode = eventBus.debugMode;
    eventBus.setDebugMode(!currentMode);
    const button = this.shadowRoot.querySelector('.debug-toggle');
    button.textContent = eventBus.debugMode ? 'Disable Console Logging' : 'Enable Console Logging';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .event-bus-panel {
          display: none;
          position: fixed;
          top: 20px;
          right: 20px;
          width: 400px;
          max-height: 600px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          flex-direction: column;
          z-index: 10000;
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
        }

        .panel-header {
          padding: 12px 16px;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #252525;
          border-radius: 8px 8px 0 0;
        }

        .panel-title {
          font-size: 14px;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          color: #999;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: #fff;
        }

        .panel-controls {
          padding: 8px 16px;
          border-bottom: 1px solid #333;
          display: flex;
          gap: 8px;
        }

        .control-button {
          padding: 6px 12px;
          background: #333;
          border: none;
          border-radius: 4px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
        }

        .control-button:hover {
          background: #444;
        }

        .event-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .event-item {
          background: #252525;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .event-type {
          font-weight: 600;
          color: #4a9eff;
        }

        .event-time {
          color: #999;
          font-size: 11px;
        }

        .event-source {
          color: #999;
          margin-bottom: 4px;
        }

        .event-payload summary {
          cursor: pointer;
          color: #4a9eff;
          margin-top: 4px;
        }

        .event-payload pre {
          background: #1a1a1a;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 4px 0 0 0;
          font-size: 11px;
          color: #ddd;
        }

        .empty-state {
          padding: 40px 16px;
          text-align: center;
          color: #999;
        }
      </style>

      <div class="event-bus-panel">
        <div class="panel-header">
          <div class="panel-title">EventBus Monitor</div>
          <button class="close-button" onclick="this.getRootNode().host.toggle()">×</button>
        </div>
        <div class="panel-controls">
          <button class="control-button" onclick="this.getRootNode().host.clearHistory()">
            Clear History
          </button>
          <button class="control-button debug-toggle" onclick="this.getRootNode().host.toggleDebugMode()">
            Enable Console Logging
          </button>
        </div>
        <div class="event-list">
          <div class="empty-state">No events yet. Press Ctrl+Shift+E to toggle this panel.</div>
        </div>
      </div>
    `;
  }
}

customElements.define('harmony-event-bus', EventBusComponent);

export default EventBusComponent;