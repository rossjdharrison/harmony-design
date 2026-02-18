/**
 * @fileoverview EventBus debug component for monitoring event flow.
 * See: /harmony-design/DESIGN_SYSTEM.md#event-system
 * 
 * Policy: Must be available on every page via Ctrl+Shift+E
 * 
 * @module harmony-ui/components/event-bus-debug
 */

/**
 * Debug UI component for EventBus monitoring.
 * Shows event history, subscribers, and allows event inspection.
 * 
 * @class EventBusDebugComponent
 * @extends HTMLElement
 */
export class EventBusDebugComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.visible = false;
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.startMonitoring();
    
    // Global keyboard shortcut: Ctrl+Shift+E
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  disconnectedCallback() {
    this.stopMonitoring();
  }

  toggle() {
    this.visible = !this.visible;
    this.style.display = this.visible ? 'block' : 'none';
    if (this.visible) {
      this.refresh();
    }
  }

  startMonitoring() {
    // Subscribe to all events for monitoring
    const originalPublish = window.eventBus.publish.bind(window.eventBus);
    window.eventBus.publish = (event) => {
      originalPublish(event);
      if (this.visible) {
        this.refresh();
      }
    };
  }

  stopMonitoring() {
    // Cleanup if needed
  }

  refresh() {
    const history = window.eventBus.getHistory();
    const subscribers = window.eventBus.getSubscribers();
    
    const historyList = this.shadowRoot.querySelector('#event-history');
    const subscriberList = this.shadowRoot.querySelector('#subscribers');
    
    // Render history
    historyList.innerHTML = history.slice(-20).reverse().map(event => `
      <div class="event-item">
        <span class="event-type">${event.type}</span>
        <span class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</span>
        <span class="event-source">${event.source}</span>
        <details>
          <summary>Payload</summary>
          <pre>${JSON.stringify(event.payload, null, 2)}</pre>
        </details>
      </div>
    `).join('');
    
    // Render subscribers
    subscriberList.innerHTML = Object.entries(subscribers).map(([type, count]) => `
      <div class="subscriber-item">
        <span class="subscriber-type">${type}</span>
        <span class="subscriber-count">${count} subscriber(s)</span>
      </div>
    `).join('');
  }

  attachEventListeners() {
    const closeBtn = this.shadowRoot.querySelector('#close-btn');
    const clearBtn = this.shadowRoot.querySelector('#clear-btn');
    const debugToggle = this.shadowRoot.querySelector('#debug-toggle');
    
    closeBtn.addEventListener('click', () => this.toggle());
    clearBtn.addEventListener('click', () => {
      window.eventBus.clearHistory();
      this.refresh();
    });
    
    debugToggle.addEventListener('change', (e) => {
      window.eventBus.setDebugMode(e.target.checked);
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 500px;
          max-height: 80vh;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          color: #fff;
          font-family: monospace;
          font-size: 12px;
          z-index: 10000;
          display: none;
          overflow: hidden;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #252525;
          border-bottom: 1px solid #333;
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
          background: #333;
          border: 1px solid #444;
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        }

        button:hover {
          background: #444;
        }

        .content {
          overflow-y: auto;
          max-height: calc(80vh - 60px);
          padding: 16px;
        }

        .section {
          margin-bottom: 20px;
        }

        .section-title {
          font-weight: bold;
          margin-bottom: 8px;
          color: #4a9eff;
        }

        .event-item, .subscriber-item {
          padding: 8px;
          margin-bottom: 4px;
          background: #252525;
          border-radius: 4px;
          border-left: 3px solid #4a9eff;
        }

        .event-type, .subscriber-type {
          font-weight: bold;
          color: #4a9eff;
        }

        .event-time, .event-source {
          color: #888;
          font-size: 10px;
          margin-left: 8px;
        }

        .subscriber-count {
          color: #888;
          margin-left: 8px;
        }

        details {
          margin-top: 4px;
        }

        summary {
          cursor: pointer;
          color: #888;
        }

        pre {
          margin: 4px 0 0 0;
          padding: 8px;
          background: #1a1a1a;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 10px;
        }

        label {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }

        input[type="checkbox"] {
          cursor: pointer;
        }
      </style>

      <div class="header">
        <div class="title">EventBus Monitor</div>
        <div class="controls">
          <label>
            <input type="checkbox" id="debug-toggle">
            Debug
          </label>
          <button id="clear-btn">Clear</button>
          <button id="close-btn">✕</button>
        </div>
      </div>

      <div class="content">
        <div class="section">
          <div class="section-title">Event History (last 20)</div>
          <div id="event-history"></div>
        </div>

        <div class="section">
          <div class="section-title">Subscribers</div>
          <div id="subscribers"></div>
        </div>
      </div>
    `;
  }
}

customElements.define('event-bus-debug', EventBusDebugComponent);