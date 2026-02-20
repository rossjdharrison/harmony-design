/**
 * @fileoverview Health Check UI Component
 * @module health/health-check-component
 * 
 * Web component for displaying health check status in development/admin UIs.
 * Shows liveness and readiness probe results with auto-refresh.
 * 
 * Related: See DESIGN_SYSTEM.md § Health Monitoring
 */

import { getHealthCheckService } from './health-check-service.js';

/**
 * Health Check Display Component
 * 
 * @element harmony-health-check
 * 
 * @attr {boolean} auto-refresh - Enable auto-refresh
 * @attr {number} refresh-interval - Refresh interval in ms (default: 5000)
 * 
 * @example
 * <harmony-health-check auto-refresh refresh-interval="3000"></harmony-health-check>
 */
export class HealthCheckComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {number|null} */
    this.refreshTimer = null;
    
    /** @type {HealthCheckService} */
    this.service = getHealthCheckService();
  }

  static get observedAttributes() {
    return ['auto-refresh', 'refresh-interval'];
  }

  connectedCallback() {
    this.render();
    this.refresh();
    
    if (this.hasAttribute('auto-refresh')) {
      this.startAutoRefresh();
    }
  }

  disconnectedCallback() {
    this.stopAutoRefresh();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'auto-refresh') {
      if (newValue !== null) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    }
    
    if (name === 'refresh-interval' && this.hasAttribute('auto-refresh')) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }
  }

  /**
   * Start auto-refresh timer
   */
  startAutoRefresh() {
    this.stopAutoRefresh();
    const interval = parseInt(this.getAttribute('refresh-interval') || '5000', 10);
    this.refreshTimer = setInterval(() => this.refresh(), interval);
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Refresh health check data
   */
  async refresh() {
    const [liveness, readiness] = await Promise.all([
      this.service.checkLiveness(true),
      this.service.checkReadiness(true)
    ]);
    
    this.updateDisplay(liveness, readiness);
  }

  /**
   * Update display with health check results
   * @param {HealthCheckResult} liveness - Liveness result
   * @param {HealthCheckResult} readiness - Readiness result
   */
  updateDisplay(liveness, readiness) {
    const livenessEl = this.shadowRoot.querySelector('#liveness-status');
    const readinessEl = this.shadowRoot.querySelector('#readiness-status');
    const timestampEl = this.shadowRoot.querySelector('#timestamp');
    
    if (livenessEl) {
      livenessEl.innerHTML = this.renderProbeResult('Liveness', liveness);
    }
    
    if (readinessEl) {
      readinessEl.innerHTML = this.renderProbeResult('Readiness', readiness);
    }
    
    if (timestampEl) {
      timestampEl.textContent = new Date().toLocaleTimeString();
    }
  }

  /**
   * Render probe result HTML
   * @param {string} name - Probe name
   * @param {HealthCheckResult} result - Check result
   * @returns {string} HTML string
   */
  renderProbeResult(name, result) {
    const statusClass = result.healthy ? 'healthy' : 'unhealthy';
    const statusIcon = result.healthy ? '✓' : '✗';
    
    let checksHtml = '';
    for (const [checkName, checkResult] of Object.entries(result.checks)) {
      const checkIcon = checkResult.healthy ? '✓' : '✗';
      const checkClass = checkResult.healthy ? 'check-pass' : 'check-fail';
      
      checksHtml += `
        <div class="check-item ${checkClass}">
          <span class="check-icon">${checkIcon}</span>
          <span class="check-name">${checkName}</span>
          <span class="check-duration">${checkResult.duration}ms</span>
          ${checkResult.message ? `<div class="check-message">${checkResult.message}</div>` : ''}
        </div>
      `;
    }
    
    return `
      <div class="probe-header ${statusClass}">
        <span class="probe-icon">${statusIcon}</span>
        <span class="probe-name">${name}</span>
        <span class="probe-status">${result.status}</span>
      </div>
      <div class="probe-checks">
        ${checksHtml}
      </div>
    `;
  }

  /**
   * Render component
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          background: var(--harmony-surface, #ffffff);
          border: 1px solid var(--harmony-border, #e0e0e0);
          border-radius: 8px;
          padding: 16px;
          max-width: 600px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--harmony-border, #e0e0e0);
        }

        .title {
          font-size: 16px;
          font-weight: 600;
          color: var(--harmony-text, #000000);
        }

        .timestamp {
          font-size: 12px;
          color: var(--harmony-text-secondary, #666666);
        }

        .refresh-btn {
          padding: 4px 12px;
          background: var(--harmony-primary, #0066cc);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .refresh-btn:hover {
          background: var(--harmony-primary-hover, #0052a3);
        }

        .probe-section {
          margin-bottom: 16px;
        }

        .probe-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .probe-header.healthy {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .probe-header.unhealthy {
          background: #ffebee;
          color: #c62828;
        }

        .probe-icon {
          font-size: 18px;
          font-weight: bold;
        }

        .probe-name {
          font-weight: 600;
          flex: 1;
        }

        .probe-status {
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .probe-checks {
          padding-left: 16px;
        }

        .check-item {
          display: grid;
          grid-template-columns: 20px 1fr auto;
          gap: 8px;
          padding: 6px 8px;
          margin-bottom: 4px;
          border-radius: 4px;
          align-items: center;
        }

        .check-item.check-pass {
          background: #f1f8f4;
        }

        .check-item.check-fail {
          background: #fef1f1;
        }

        .check-icon {
          font-weight: bold;
        }

        .check-item.check-pass .check-icon {
          color: #2e7d32;
        }

        .check-item.check-fail .check-icon {
          color: #c62828;
        }

        .check-name {
          font-family: monospace;
          font-size: 12px;
        }

        .check-duration {
          font-size: 11px;
          color: var(--harmony-text-secondary, #666666);
        }

        .check-message {
          grid-column: 2 / 4;
          font-size: 11px;
          color: var(--harmony-text-secondary, #666666);
          margin-top: 2px;
        }
      </style>

      <div class="header">
        <div class="title">Health Check Status</div>
        <div class="controls">
          <span class="timestamp" id="timestamp">--:--:--</span>
          <button class="refresh-btn" id="refresh-btn">Refresh</button>
        </div>
      </div>

      <div class="probe-section" id="liveness-status">
        Loading...
      </div>

      <div class="probe-section" id="readiness-status">
        Loading...
      </div>
    `;

    // Attach event listeners
    const refreshBtn = this.shadowRoot.querySelector('#refresh-btn');
    refreshBtn.addEventListener('click', () => this.refresh());
  }
}

// Register custom element
if (!customElements.get('harmony-health-check')) {
  customElements.define('harmony-health-check', HealthCheckComponent);
}