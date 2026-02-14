/**
 * @fileoverview Design System Dashboard - Shows graph state and health metrics
 * @see harmony-design/DESIGN_SYSTEM.md#design-system-dashboard
 */

/**
 * Dashboard displaying design system graph state, health metrics, and event activity
 * 
 * @element design-system-dashboard
 * 
 * @fires {CustomEvent} dashboard-refresh - When user requests manual refresh
 * 
 * @example
 * <design-system-dashboard></design-system-dashboard>
 */
class DesignSystemDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Map<string, number>} Event type counters */
    this._eventCounts = new Map();
    
    /** @type {number} Total events processed */
    this._totalEvents = 0;
    
    /** @type {number} Last refresh timestamp */
    this._lastRefresh = Date.now();
    
    /** @type {Array<{type: string, timestamp: number, source: string}>} Recent events */
    this._recentEvents = [];
    
    /** @type {number} Max events to track */
    this._maxRecentEvents = 50;
  }

  connectedCallback() {
    this.render();
    this._subscribeToEvents();
    this._startHealthCheck();
  }

  disconnectedCallback() {
    this._unsubscribeFromEvents();
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
    }
  }

  /**
   * Subscribe to EventBus events for monitoring
   * @private
   */
  _subscribeToEvents() {
    // Listen to all events on the EventBus for monitoring
    if (window.EventBus) {
      // Store original publish to intercept
      this._originalPublish = window.EventBus.publish.bind(window.EventBus);
      window.EventBus.publish = (eventType, payload, source) => {
        this._trackEvent(eventType, source);
        return this._originalPublish(eventType, payload, source);
      };
    }
  }

  /**
   * Unsubscribe from events
   * @private
   */
  _unsubscribeFromEvents() {
    if (window.EventBus && this._originalPublish) {
      window.EventBus.publish = this._originalPublish;
    }
  }

  /**
   * Track an event for statistics
   * @private
   * @param {string} eventType - Type of event
   * @param {string} source - Source component
   */
  _trackEvent(eventType, source) {
    this._totalEvents++;
    this._eventCounts.set(eventType, (this._eventCounts.get(eventType) || 0) + 1);
    
    this._recentEvents.unshift({
      type: eventType,
      timestamp: Date.now(),
      source: source || 'unknown'
    });
    
    if (this._recentEvents.length > this._maxRecentEvents) {
      this._recentEvents.pop();
    }
    
    this._updateMetrics();
  }

  /**
   * Start periodic health check
   * @private
   */
  _startHealthCheck() {
    this._healthCheckInterval = setInterval(() => {
      this._updateHealthStatus();
    }, 2000);
  }

  /**
   * Update health status indicators
   * @private
   */
  _updateHealthStatus() {
    const healthIndicator = this.shadowRoot.querySelector('.health-indicator');
    const statusText = this.shadowRoot.querySelector('.status-text');
    
    if (!healthIndicator || !statusText) return;
    
    // Check if EventBus is available
    const eventBusHealthy = typeof window.EventBus !== 'undefined';
    
    // Check event activity (should have events in last 10 seconds for active system)
    const recentActivity = this._recentEvents.length > 0 && 
      (Date.now() - this._recentEvents[0].timestamp) < 10000;
    
    if (eventBusHealthy && recentActivity) {
      healthIndicator.className = 'health-indicator healthy';
      statusText.textContent = 'Healthy';
    } else if (eventBusHealthy) {
      healthIndicator.className = 'health-indicator idle';
      statusText.textContent = 'Idle';
    } else {
      healthIndicator.className = 'health-indicator error';
      statusText.textContent = 'Error';
    }
  }

  /**
   * Update metrics display
   * @private
   */
  _updateMetrics() {
    const totalEventsEl = this.shadowRoot.querySelector('.metric-total-events');
    const eventTypesEl = this.shadowRoot.querySelector('.metric-event-types');
    const eventsPerSecEl = this.shadowRoot.querySelector('.metric-events-per-sec');
    
    if (totalEventsEl) {
      totalEventsEl.textContent = this._totalEvents.toString();
    }
    
    if (eventTypesEl) {
      eventTypesEl.textContent = this._eventCounts.size.toString();
    }
    
    if (eventsPerSecEl) {
      const elapsed = (Date.now() - this._lastRefresh) / 1000;
      const rate = elapsed > 0 ? (this._totalEvents / elapsed).toFixed(2) : '0.00';
      eventsPerSecEl.textContent = rate;
    }
  }

  /**
   * Handle refresh button click
   * @private
   */
  _handleRefresh() {
    this._eventCounts.clear();
    this._totalEvents = 0;
    this._recentEvents = [];
    this._lastRefresh = Date.now();
    this._updateMetrics();
    
    this.dispatchEvent(new CustomEvent('dashboard-refresh', {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Render the dashboard
   * @private
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-family-base, system-ui, sans-serif);
          color: var(--color-text-primary, #1a1a1a);
          background: var(--color-surface-primary, #ffffff);
        }

        .dashboard {
          padding: var(--spacing-lg, 24px);
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg, 24px);
          padding-bottom: var(--spacing-md, 16px);
          border-bottom: 2px solid var(--color-border-primary, #e0e0e0);
        }

        .dashboard-title {
          font-size: var(--font-size-2xl, 28px);
          font-weight: var(--font-weight-bold, 700);
          margin: 0;
        }

        .dashboard-actions {
          display: flex;
          gap: var(--spacing-sm, 12px);
        }

        .btn-refresh {
          padding: var(--spacing-sm, 12px) var(--spacing-md, 16px);
          background: var(--color-primary, #007bff);
          color: var(--color-text-inverse, #ffffff);
          border: none;
          border-radius: var(--border-radius-md, 8px);
          cursor: pointer;
          font-size: var(--font-size-base, 16px);
          font-weight: var(--font-weight-medium, 500);
          transition: background 0.2s ease;
        }

        .btn-refresh:hover {
          background: var(--color-primary-hover, #0056b3);
        }

        .btn-refresh:active {
          transform: translateY(1px);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--spacing-lg, 24px);
          margin-bottom: var(--spacing-lg, 24px);
        }

        .card {
          background: var(--color-surface-secondary, #f8f9fa);
          border: 1px solid var(--color-border-primary, #e0e0e0);
          border-radius: var(--border-radius-lg, 12px);
          padding: var(--spacing-lg, 24px);
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm, 12px);
          margin-bottom: var(--spacing-md, 16px);
        }

        .card-title {
          font-size: var(--font-size-lg, 20px);
          font-weight: var(--font-weight-semibold, 600);
          margin: 0;
        }

        .health-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        .health-indicator.healthy {
          background: var(--color-success, #28a745);
        }

        .health-indicator.idle {
          background: var(--color-warning, #ffc107);
        }

        .health-indicator.error {
          background: var(--color-error, #dc3545);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-text {
          font-size: var(--font-size-sm, 14px);
          color: var(--color-text-secondary, #6c757d);
        }

        .metrics {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md, 16px);
        }

        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-label {
          font-size: var(--font-size-sm, 14px);
          color: var(--color-text-secondary, #6c757d);
        }

        .metric-value {
          font-size: var(--font-size-xl, 24px);
          font-weight: var(--font-weight-bold, 700);
          color: var(--color-text-primary, #1a1a1a);
        }

        .event-list {
          max-height: 400px;
          overflow-y: auto;
          background: var(--color-surface-primary, #ffffff);
          border-radius: var(--border-radius-md, 8px);
          padding: var(--spacing-sm, 12px);
        }

        .event-item {
          padding: var(--spacing-sm, 12px);
          border-bottom: 1px solid var(--color-border-secondary, #f0f0f0);
          font-size: var(--font-size-sm, 14px);
        }

        .event-item:last-child {
          border-bottom: none;
        }

        .event-type {
          font-weight: var(--font-weight-medium, 500);
          color: var(--color-primary, #007bff);
        }

        .event-source {
          color: var(--color-text-secondary, #6c757d);
          font-size: var(--font-size-xs, 12px);
        }

        .event-time {
          color: var(--color-text-tertiary, #adb5bd);
          font-size: var(--font-size-xs, 12px);
        }

        .top-events {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm, 12px);
        }

        .top-event-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm, 12px);
          background: var(--color-surface-primary, #ffffff);
          border-radius: var(--border-radius-sm, 4px);
        }

        .top-event-name {
          font-size: var(--font-size-sm, 14px);
          font-weight: var(--font-weight-medium, 500);
        }

        .top-event-count {
          font-size: var(--font-size-sm, 14px);
          color: var(--color-text-secondary, #6c757d);
          background: var(--color-surface-secondary, #f8f9fa);
          padding: 2px 8px;
          border-radius: var(--border-radius-sm, 4px);
        }
      </style>

      <div class="dashboard">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Design System Dashboard</h1>
          <div class="dashboard-actions">
            <button class="btn-refresh" aria-label="Refresh dashboard">
              Refresh
            </button>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="card">
            <div class="card-header">
              <div class="health-indicator idle"></div>
              <h2 class="card-title">System Health</h2>
            </div>
            <div class="status-text">Checking...</div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Event Metrics</h2>
            </div>
            <div class="metrics">
              <div class="metric">
                <span class="metric-label">Total Events</span>
                <span class="metric-value metric-total-events">0</span>
              </div>
              <div class="metric">
                <span class="metric-label">Event Types</span>
                <span class="metric-value metric-event-types">0</span>
              </div>
              <div class="metric">
                <span class="metric-label">Events/Second</span>
                <span class="metric-value metric-events-per-sec">0.00</span>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Top Events</h2>
            </div>
            <div class="top-events">
              <div class="top-event-item">
                <span class="top-event-name">No events yet</span>
                <span class="top-event-count">0</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Recent Activity</h2>
          </div>
          <div class="event-list">
            <div class="event-item">
              <div class="event-type">Waiting for events...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners
    const refreshBtn = this.shadowRoot.querySelector('.btn-refresh');
    refreshBtn.addEventListener('click', () => this._handleRefresh());

    // Initial metrics update
    this._updateMetrics();
    this._updateHealthStatus();
    this._updateTopEvents();
    this._updateRecentActivity();
  }

  /**
   * Update top events display
   * @private
   */
  _updateTopEvents() {
    const topEventsContainer = this.shadowRoot.querySelector('.top-events');
    if (!topEventsContainer) return;

    const sortedEvents = Array.from(this._eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (sortedEvents.length === 0) {
      topEventsContainer.innerHTML = `
        <div class="top-event-item">
          <span class="top-event-name">No events yet</span>
          <span class="top-event-count">0</span>
        </div>
      `;
      return;
    }

    topEventsContainer.innerHTML = sortedEvents.map(([type, count]) => `
      <div class="top-event-item">
        <span class="top-event-name">${this._escapeHtml(type)}</span>
        <span class="top-event-count">${count}</span>
      </div>
    `).join('');
  }

  /**
   * Update recent activity display
   * @private
   */
  _updateRecentActivity() {
    const eventList = this.shadowRoot.querySelector('.event-list');
    if (!eventList) return;

    if (this._recentEvents.length === 0) {
      eventList.innerHTML = `
        <div class="event-item">
          <div class="event-type">Waiting for events...</div>
        </div>
      `;
      return;
    }

    eventList.innerHTML = this._recentEvents.slice(0, 20).map(event => {
      const timeAgo = this._formatTimeAgo(event.timestamp);
      return `
        <div class="event-item">
          <div class="event-type">${this._escapeHtml(event.type)}</div>
          <div class="event-source">Source: ${this._escapeHtml(event.source)}</div>
          <div class="event-time">${timeAgo}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Format timestamp as time ago
   * @private
   * @param {number} timestamp - Timestamp in milliseconds
   * @returns {string} Formatted time ago string
   */
  _formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('design-system-dashboard', DesignSystemDashboard);