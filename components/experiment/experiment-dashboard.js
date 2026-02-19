/**
 * @fileoverview Experiment Dashboard Component
 * @module components/experiment/experiment-dashboard
 * 
 * Dev-mode UI component for viewing and debugging active experiments.
 * Displays experiment state, active variants, exposure tracking, and analytics.
 * 
 * Features:
 * - Real-time experiment state display
 * - Active variant visualization
 * - Exposure event tracking
 * - Manual variant override (dev only)
 * - Analytics event log
 * - Performance metrics
 * 
 * Usage:
 * ```html
 * <experiment-dashboard></experiment-dashboard>
 * ```
 * 
 * Toggle visibility with Ctrl+Shift+X
 * 
 * @see {@link file://./experiment-context.js} - Experiment Context
 * @see {@link file://./../../hooks/useExperiment.js} - useExperiment Hook
 * @see {@link file://./../../types/experiment.types.js} - Type Definitions
 * @see {@link file://./../../DESIGN_SYSTEM.md#experiment-dashboard} - Documentation
 */

/**
 * Experiment Dashboard Web Component
 * Provides dev-mode UI for viewing and debugging experiments
 * 
 * @class ExperimentDashboard
 * @extends HTMLElement
 * 
 * @fires experiment-override - When variant is manually overridden
 * @fires dashboard-toggle - When dashboard visibility changes
 */
class ExperimentDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Map<string, ExperimentState>} */
    this.experiments = new Map();
    
    /** @type {Array<ExposureEvent>} */
    this.exposureLog = [];
    
    /** @type {Array<AnalyticsEvent>} */
    this.analyticsLog = [];
    
    /** @type {boolean} */
    this.isVisible = false;
    
    /** @type {number} */
    this.maxLogEntries = 100;
    
    /** @type {string} */
    this.selectedTab = 'experiments';
    
    this._handleKeyboardShortcut = this._handleKeyboardShortcut.bind(this);
    this._handleExperimentEvent = this._handleExperimentEvent.bind(this);
    this._handleExposureEvent = this._handleExposureEvent.bind(this);
    this._handleAnalyticsEvent = this._handleAnalyticsEvent.bind(this);
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
    this._subscribeToEvents();
    this._loadState();
  }

  disconnectedCallback() {
    this._detachEventListeners();
    this._unsubscribeFromEvents();
  }

  /**
   * Attach global event listeners
   * @private
   */
  _attachEventListeners() {
    document.addEventListener('keydown', this._handleKeyboardShortcut);
  }

  /**
   * Detach global event listeners
   * @private
   */
  _detachEventListeners() {
    document.removeEventListener('keydown', this._handleKeyboardShortcut);
  }

  /**
   * Subscribe to experiment-related events
   * @private
   */
  _subscribeToEvents() {
    // Subscribe to experiment state changes
    window.addEventListener('experiment:registered', this._handleExperimentEvent);
    window.addEventListener('experiment:variant-assigned', this._handleExperimentEvent);
    window.addEventListener('experiment:exposure', this._handleExposureEvent);
    window.addEventListener('experiment:analytics', this._handleAnalyticsEvent);
  }

  /**
   * Unsubscribe from experiment-related events
   * @private
   */
  _unsubscribeFromEvents() {
    window.removeEventListener('experiment:registered', this._handleExperimentEvent);
    window.removeEventListener('experiment:variant-assigned', this._handleExperimentEvent);
    window.removeEventListener('experiment:exposure', this._handleExposureEvent);
    window.removeEventListener('experiment:analytics', this._handleAnalyticsEvent);
  }

  /**
   * Handle keyboard shortcut (Ctrl+Shift+X)
   * @private
   * @param {KeyboardEvent} event
   */
  _handleKeyboardShortcut(event) {
    if (event.ctrlKey && event.shiftKey && event.key === 'X') {
      event.preventDefault();
      this.toggle();
    }
  }

  /**
   * Handle experiment state events
   * @private
   * @param {CustomEvent} event
   */
  _handleExperimentEvent(event) {
    const { experimentId, variant, config } = event.detail;
    
    const existing = this.experiments.get(experimentId) || {
      id: experimentId,
      config: config,
      variant: null,
      exposureCount: 0,
      lastExposure: null,
      registeredAt: Date.now()
    };

    if (variant) {
      existing.variant = variant;
      existing.assignedAt = Date.now();
    }

    this.experiments.set(experimentId, existing);
    this._render();
  }

  /**
   * Handle exposure tracking events
   * @private
   * @param {CustomEvent} event
   */
  _handleExposureEvent(event) {
    const { experimentId, variant, timestamp } = event.detail;
    
    // Update experiment exposure count
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.exposureCount = (experiment.exposureCount || 0) + 1;
      experiment.lastExposure = timestamp;
      this.experiments.set(experimentId, experiment);
    }

    // Add to exposure log
    this.exposureLog.unshift({
      experimentId,
      variant,
      timestamp,
      id: `exp-${Date.now()}-${Math.random()}`
    });

    // Trim log
    if (this.exposureLog.length > this.maxLogEntries) {
      this.exposureLog = this.exposureLog.slice(0, this.maxLogEntries);
    }

    this._render();
  }

  /**
   * Handle analytics events
   * @private
   * @param {CustomEvent} event
   */
  _handleAnalyticsEvent(event) {
    const { experimentId, variant, eventName, properties, timestamp } = event.detail;

    this.analyticsLog.unshift({
      experimentId,
      variant,
      eventName,
      properties,
      timestamp,
      id: `analytics-${Date.now()}-${Math.random()}`
    });

    // Trim log
    if (this.analyticsLog.length > this.maxLogEntries) {
      this.analyticsLog = this.analyticsLog.slice(0, this.maxLogEntries);
    }

    this._render();
  }

  /**
   * Load persisted state from sessionStorage
   * @private
   */
  _loadState() {
    try {
      const stored = sessionStorage.getItem('experiment-dashboard-state');
      if (stored) {
        const state = JSON.parse(stored);
        this.isVisible = state.isVisible || false;
        this.selectedTab = state.selectedTab || 'experiments';
        this._render();
      }
    } catch (error) {
      console.warn('Failed to load experiment dashboard state:', error);
    }
  }

  /**
   * Persist state to sessionStorage
   * @private
   */
  _saveState() {
    try {
      sessionStorage.setItem('experiment-dashboard-state', JSON.stringify({
        isVisible: this.isVisible,
        selectedTab: this.selectedTab
      }));
    } catch (error) {
      console.warn('Failed to save experiment dashboard state:', error);
    }
  }

  /**
   * Toggle dashboard visibility
   * @public
   */
  toggle() {
    this.isVisible = !this.isVisible;
    this._saveState();
    this._render();
    
    this.dispatchEvent(new CustomEvent('dashboard-toggle', {
      detail: { visible: this.isVisible },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Show dashboard
   * @public
   */
  show() {
    if (!this.isVisible) {
      this.toggle();
    }
  }

  /**
   * Hide dashboard
   * @public
   */
  hide() {
    if (this.isVisible) {
      this.toggle();
    }
  }

  /**
   * Override variant for an experiment (dev only)
   * @public
   * @param {string} experimentId - Experiment identifier
   * @param {string} variant - Variant to assign
   */
  overrideVariant(experimentId, variant) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      console.warn(`Cannot override variant: experiment ${experimentId} not found`);
      return;
    }

    // Dispatch override event
    this.dispatchEvent(new CustomEvent('experiment-override', {
      detail: { experimentId, variant },
      bubbles: true,
      composed: true
    }));

    // Update local state
    experiment.variant = variant;
    experiment.overridden = true;
    experiment.overriddenAt = Date.now();
    this.experiments.set(experimentId, experiment);
    
    this._render();
  }

  /**
   * Clear all logs
   * @public
   */
  clearLogs() {
    this.exposureLog = [];
    this.analyticsLog = [];
    this._render();
  }

  /**
   * Clear variant override for an experiment
   * @public
   * @param {string} experimentId - Experiment identifier
   */
  clearOverride(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      delete experiment.overridden;
      delete experiment.overriddenAt;
      this.experiments.set(experimentId, experiment);
      this._render();
    }
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    const startTime = performance.now();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          bottom: 0;
          right: 0;
          width: 600px;
          max-height: 500px;
          background: var(--color-surface, #1e1e1e);
          color: var(--color-on-surface, #e0e0e0);
          border: 1px solid var(--color-border, #333);
          border-radius: 8px 0 0 0;
          box-shadow: var(--shadow-elevation-high, 0 8px 16px rgba(0,0,0,0.3));
          font-family: var(--font-family-mono, 'Courier New', monospace);
          font-size: 12px;
          z-index: 10000;
          transform: ${this.isVisible ? 'translateY(0)' : 'translateY(100%)'};
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--color-surface-variant, #2a2a2a);
          border-bottom: 1px solid var(--color-border, #333);
          cursor: move;
        }

        .title {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .badge {
          background: var(--color-primary, #6200ea);
          color: var(--color-on-primary, #fff);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
        }

        .controls {
          display: flex;
          gap: 8px;
        }

        .btn {
          background: transparent;
          border: 1px solid var(--color-border, #444);
          color: var(--color-on-surface, #e0e0e0);
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s;
        }

        .btn:hover {
          background: var(--color-surface-variant, #333);
          border-color: var(--color-primary, #6200ea);
        }

        .tabs {
          display: flex;
          gap: 4px;
          padding: 8px 12px;
          background: var(--color-surface-variant, #252525);
          border-bottom: 1px solid var(--color-border, #333);
        }

        .tab {
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .tab:hover {
          background: var(--color-surface, #2a2a2a);
        }

        .tab.active {
          background: var(--color-primary, #6200ea);
          color: var(--color-on-primary, #fff);
          border-color: var(--color-primary, #6200ea);
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .experiment-card {
          background: var(--color-surface-variant, #252525);
          border: 1px solid var(--color-border, #333);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .experiment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .experiment-id {
          font-weight: 600;
          color: var(--color-primary, #bb86fc);
        }

        .experiment-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 8px;
          font-size: 11px;
          color: var(--color-on-surface-variant, #999);
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-label {
          font-weight: 600;
          text-transform: uppercase;
          font-size: 10px;
          opacity: 0.7;
        }

        .variant-badge {
          display: inline-block;
          background: var(--color-secondary, #03dac6);
          color: var(--color-on-secondary, #000);
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 11px;
        }

        .variant-badge.overridden {
          background: var(--color-warning, #ff9800);
        }

        .override-controls {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }

        .override-select {
          flex: 1;
          background: var(--color-surface, #1e1e1e);
          border: 1px solid var(--color-border, #444);
          color: var(--color-on-surface, #e0e0e0);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
        }

        .log-entry {
          background: var(--color-surface-variant, #252525);
          border-left: 3px solid var(--color-primary, #6200ea);
          padding: 8px;
          margin-bottom: 8px;
          border-radius: 4px;
          font-size: 11px;
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .log-timestamp {
          color: var(--color-on-surface-variant, #999);
          font-size: 10px;
        }

        .log-details {
          color: var(--color-on-surface-variant, #ccc);
          font-family: var(--font-family-mono, monospace);
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--color-on-surface-variant, #999);
        }

        .perf-warning {
          color: var(--color-error, #cf6679);
          font-size: 10px;
          margin-top: 4px;
        }

        /* Scrollbar styling */
        .content::-webkit-scrollbar {
          width: 8px;
        }

        .content::-webkit-scrollbar-track {
          background: var(--color-surface, #1e1e1e);
        }

        .content::-webkit-scrollbar-thumb {
          background: var(--color-border, #444);
          border-radius: 4px;
        }

        .content::-webkit-scrollbar-thumb:hover {
          background: var(--color-primary, #6200ea);
        }
      </style>

      <div class="header">
        <div class="title">
          <span>🧪 Experiment Dashboard</span>
          <span class="badge">${this.experiments.size}</span>
        </div>
        <div class="controls">
          <button class="btn" onclick="this.getRootNode().host.clearLogs()">Clear Logs</button>
          <button class="btn" onclick="this.getRootNode().host.toggle()">Close</button>
        </div>
      </div>

      <div class="tabs">
        <div class="tab ${this.selectedTab === 'experiments' ? 'active' : ''}" 
             onclick="this.getRootNode().host._selectTab('experiments')">
          Experiments
        </div>
        <div class="tab ${this.selectedTab === 'exposures' ? 'active' : ''}" 
             onclick="this.getRootNode().host._selectTab('exposures')">
          Exposures (${this.exposureLog.length})
        </div>
        <div class="tab ${this.selectedTab === 'analytics' ? 'active' : ''}" 
             onclick="this.getRootNode().host._selectTab('analytics')">
          Analytics (${this.analyticsLog.length})
        </div>
      </div>

      <div class="content">
        ${this._renderTabContent()}
      </div>
    `;

    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`ExperimentDashboard render exceeded 16ms budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Select a tab
   * @private
   * @param {string} tab - Tab name
   */
  _selectTab(tab) {
    this.selectedTab = tab;
    this._saveState();
    this._render();
  }

  /**
   * Render tab content based on selected tab
   * @private
   * @returns {string} HTML content
   */
  _renderTabContent() {
    switch (this.selectedTab) {
      case 'experiments':
        return this._renderExperimentsTab();
      case 'exposures':
        return this._renderExposuresTab();
      case 'analytics':
        return this._renderAnalyticsTab();
      default:
        return '';
    }
  }

  /**
   * Render experiments tab
   * @private
   * @returns {string} HTML content
   */
  _renderExperimentsTab() {
    if (this.experiments.size === 0) {
      return `
        <div class="empty-state">
          <p>No active experiments</p>
          <p style="font-size: 11px; margin-top: 8px;">Experiments will appear here when registered</p>
        </div>
      `;
    }

    return Array.from(this.experiments.values())
      .sort((a, b) => (b.registeredAt || 0) - (a.registeredAt || 0))
      .map(exp => `
        <div class="experiment-card">
          <div class="experiment-header">
            <div class="experiment-id">${exp.id}</div>
            ${exp.variant ? `
              <span class="variant-badge ${exp.overridden ? 'overridden' : ''}">
                ${exp.variant}${exp.overridden ? ' (overridden)' : ''}
              </span>
            ` : '<span style="color: #999;">No variant assigned</span>'}
          </div>

          <div class="experiment-meta">
            <div class="meta-item">
              <span class="meta-label">Exposures</span>
              <span>${exp.exposureCount || 0}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Last Exposure</span>
              <span>${exp.lastExposure ? this._formatTime(exp.lastExposure) : 'Never'}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Registered</span>
              <span>${this._formatTime(exp.registeredAt)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Variants</span>
              <span>${exp.config?.variants?.length || 0}</span>
            </div>
          </div>

          ${exp.config?.variants?.length > 0 ? `
            <div class="override-controls">
              <select class="override-select" 
                      onchange="this.getRootNode().host.overrideVariant('${exp.id}', this.value)">
                <option value="">Override variant...</option>
                ${exp.config.variants.map(v => `
                  <option value="${v}" ${exp.variant === v ? 'selected' : ''}>${v}</option>
                `).join('')}
              </select>
              ${exp.overridden ? `
                <button class="btn" onclick="this.getRootNode().host.clearOverride('${exp.id}')">
                  Clear
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `).join('');
  }

  /**
   * Render exposures tab
   * @private
   * @returns {string} HTML content
   */
  _renderExposuresTab() {
    if (this.exposureLog.length === 0) {
      return `
        <div class="empty-state">
          <p>No exposure events logged</p>
          <p style="font-size: 11px; margin-top: 8px;">Exposure events will appear here when experiments are viewed</p>
        </div>
      `;
    }

    return this.exposureLog.map(log => `
      <div class="log-entry">
        <div class="log-header">
          <span>${log.experimentId}</span>
          <span class="log-timestamp">${this._formatTime(log.timestamp)}</span>
        </div>
        <div class="log-details">
          Variant: <strong>${log.variant}</strong>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render analytics tab
   * @private
   * @returns {string} HTML content
   */
  _renderAnalyticsTab() {
    if (this.analyticsLog.length === 0) {
      return `
        <div class="empty-state">
          <p>No analytics events logged</p>
          <p style="font-size: 11px; margin-top: 8px;">Analytics events will appear here when tracked</p>
        </div>
      `;
    }

    return this.analyticsLog.map(log => `
      <div class="log-entry">
        <div class="log-header">
          <span>${log.experimentId} • ${log.eventName}</span>
          <span class="log-timestamp">${this._formatTime(log.timestamp)}</span>
        </div>
        <div class="log-details">
          Variant: <strong>${log.variant}</strong><br>
          ${log.properties ? `Properties: ${JSON.stringify(log.properties, null, 2)}` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * Format timestamp for display
   * @private
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted time
   */
  _formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  }
}

// Register custom element
customElements.define('experiment-dashboard', ExperimentDashboard);

export { ExperimentDashboard };