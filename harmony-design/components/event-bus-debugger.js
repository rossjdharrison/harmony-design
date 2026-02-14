/**
 * @fileoverview EventBus Debugger Component
 * Visual debugging interface for EventBus activity.
 * See DESIGN_SYSTEM.md#event-bus-debugging for details.
 * 
 * @performance Target: <5ms render update
 * @memory Bounded event display with virtual scrolling
 */

/**
 * EventBus Debugger Web Component
 * Provides visual debugging interface for EventBus events
 * 
 * @element event-bus-debugger
 * @attr {boolean} visible - Visibility state (toggled via Ctrl+Shift+E)
 */
class EventBusDebugger extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._events = [];
    this._maxEvents = 100;
    this._isVisible = false;
    this._boundHandleKeydown = this._handleKeydown.bind(this);
    this._boundHandleEvent = this._handleEvent.bind(this);
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
    this._subscribeToAllEvents();
  }

  disconnectedCallback() {
    this._detachEventListeners();
    this._unsubscribeFromAllEvents();
  }

  /**
   * Renders the debugger component
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 0;
          right: 0;
          width: 400px;
          max-height: 500px;
          background: rgba(0, 0, 0, 0.95);
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          z-index: 10000;
          display: none;
          flex-direction: column;
          border-top-left-radius: 8px;
          box-shadow: -2px -2px 10px rgba(0, 0, 0, 0.5);
        }

        :host([visible]) {
          display: flex;
        }

        .header {
          padding: 12px;
          background: #222;
          border-bottom: 1px solid #444;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .title {
          font-weight: bold;
          color: #4CAF50;
        }

        .controls {
          display: flex;
          gap: 8px;
        }

        button {
          background: #333;
          color: #fff;
          border: 1px solid #555;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 3px;
          font-size: 11px;
        }

        button:hover {
          background: #444;
        }

        .events-container {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .event-item {
          padding: 8px;
          margin-bottom: 4px;
          background: #1a1a1a;
          border-left: 3px solid #4CAF50;
          border-radius: 3px;
          word-wrap: break-word;
        }

        .event-type {
          color: #4CAF50;
          font-weight: bold;
          margin-bottom: 4px;
        }

        .event-time {
          color: #888;
          font-size: 10px;
        }

        .event-payload {
          color: #ddd;
          margin-top: 4px;
          padding-left: 8px;
        }

        .subscribers-info {
          padding: 8px 12px;
          background: #1a1a1a;
          border-top: 1px solid #444;
          font-size: 11px;
          color: #888;
        }

        .empty-state {
          padding: 20px;
          text-align: center;
          color: #666;
        }
      </style>

      <div class="header">
        <span class="title">EventBus Debugger</span>
        <div class="controls">
          <button id="clear-btn">Clear</button>
          <button id="close-btn">Close (Ctrl+Shift+E)</button>
        </div>
      </div>

      <div class="events-container" id="events-container">
        <div class="empty-state">No events yet. Interact with components to see events.</div>
      </div>

      <div class="subscribers-info" id="subscribers-info">
        Subscribers: 0 event types
      </div>
    `;

    this._attachButtonListeners();
  }

  /**
   * Attaches event listeners
   * @private
   */
  _attachEventListeners() {
    document.addEventListener('keydown', this._boundHandleKeydown);
  }

  /**
   * Detaches event listeners
   * @private
   */
  _detachEventListeners() {
    document.removeEventListener('keydown', this._boundHandleKeydown);
  }

  /**
   * Attaches button listeners
   * @private
   */
  _attachButtonListeners() {
    const clearBtn = this.shadowRoot.getElementById('clear-btn');
    const closeBtn = this.shadowRoot.getElementById('close-btn');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this._clearEvents());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this._hide());
    }
  }

  /**
   * Handles keyboard shortcuts
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeydown(event) {
    // Ctrl+Shift+E to toggle
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
      event.preventDefault();
      this._toggle();
    }
  }

  /**
   * Subscribes to all EventBus events
   * @private
   */
  _subscribeToAllEvents() {
    if (!window.EventBus) {
      console.warn('[EventBusDebugger] EventBus not available');
      return;
    }

    // Subscribe to common events
    const eventTypes = ['ButtonClicked', 'ToggleChanged'];
    
    eventTypes.forEach(type => {
      window.EventBus.subscribe(type, this._boundHandleEvent);
    });
  }

  /**
   * Unsubscribes from all EventBus events
   * @private
   */
  _unsubscribeFromAllEvents() {
    if (!window.EventBus) return;

    const eventTypes = ['ButtonClicked', 'ToggleChanged'];
    
    eventTypes.forEach(type => {
      window.EventBus.unsubscribe(type, this._boundHandleEvent);
    });
  }

  /**
   * Handles EventBus events
   * @private
   * @param {any} payload
   * @param {string} eventType
   */
  _handleEvent(payload, eventType) {
    this._addEvent(eventType, payload);
  }

  /**
   * Adds an event to the display
   * @private
   * @param {string} type
   * @param {any} payload
   */
  _addEvent(type, payload) {
    const event = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };

    this._events.unshift(event);

    // Maintain bounded list
    if (this._events.length > this._maxEvents) {
      this._events.pop();
    }

    this._updateDisplay();
  }

  /**
   * Updates the event display
   * @private
   */
  _updateDisplay() {
    const container = this.shadowRoot.getElementById('events-container');
    
    if (this._events.length === 0) {
      container.innerHTML = '<div class="empty-state">No events yet. Interact with components to see events.</div>';
    } else {
      container.innerHTML = this._events.map(event => `
        <div class="event-item">
          <div class="event-type">${this._escapeHtml(event.type)}</div>
          <div class="event-time">${event.timestamp}</div>
          <div class="event-payload">${this._formatPayload(event.payload)}</div>
        </div>
      `).join('');
    }

    this._updateSubscribersInfo();
  }

  /**
   * Updates subscribers info
   * @private
   */
  _updateSubscribersInfo() {
    const info = this.shadowRoot.getElementById('subscribers-info');
    
    if (window.EventBus) {
      const subscribers = window.EventBus.getSubscribers();
      info.textContent = `Subscribers: ${subscribers.size} event types`;
    }
  }

  /**
   * Formats payload for display
   * @private
   * @param {any} payload
   * @returns {string}
   */
  _formatPayload(payload) {
    try {
      return this._escapeHtml(JSON.stringify(payload, null, 2));
    } catch (e) {
      return this._escapeHtml(String(payload));
    }
  }

  /**
   * Escapes HTML for safe display
   * @private
   * @param {string} text
   * @returns {string}
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clears all events
   * @private
   */
  _clearEvents() {
    this._events = [];
    this._updateDisplay();
  }

  /**
   * Shows the debugger
   * @private
   */
  _show() {
    this._isVisible = true;
    this.setAttribute('visible', '');
  }

  /**
   * Hides the debugger
   * @private
   */
  _hide() {
    this._isVisible = false;
    this.removeAttribute('visible');
  }

  /**
   * Toggles the debugger visibility
   * @private
   */
  _toggle() {
    if (this._isVisible) {
      this._hide();
    } else {
      this._show();
    }
  }
}

customElements.define('event-bus-debugger', EventBusDebugger);