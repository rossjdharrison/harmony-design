/**
 * @fileoverview Quality Gate Visualization Component
 * Web component that displays quality gate results in the UI.
 * 
 * Usage:
 *   <quality-gate-display></quality-gate-display>
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#quality-gates
 */

/**
 * Quality gate display component
 * @class QualityGateDisplay
 * @extends HTMLElement
 */
class QualityGateDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._report = null;
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Sets the gate report to display
   * @param {Object} report - Gate report from GateRunner
   */
  setReport(report) {
    this._report = report;
    this.render();
  }

  /**
   * Renders the component
   */
  render() {
    if (!this._report) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: system-ui, -apple-system, sans-serif;
            padding: 1rem;
          }
          .empty {
            color: #666;
            font-style: italic;
          }
        </style>
        <div class="empty">No quality gate results to display</div>
      `;
      return;
    }

    const statusColor = this._report.passed ? '#22c55e' : '#ef4444';
    const statusIcon = this._report.passed ? '✓' : '✗';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          padding: 1rem;
          border: 2px solid ${statusColor};
          border-radius: 8px;
          background: #fff;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .status-icon {
          font-size: 1.5rem;
          color: ${statusColor};
        }
        .summary {
          font-size: 1.125rem;
          font-weight: 600;
          color: ${statusColor};
        }
        .stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #666;
        }
        .results {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .result {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 4px;
          background: #f9fafb;
        }
        .result.passed {
          border-left: 3px solid #22c55e;
        }
        .result.failed {
          border-left: 3px solid #ef4444;
        }
        .result-icon {
          font-size: 1rem;
        }
        .result-gate {
          font-weight: 500;
          flex: 1;
        }
        .result-message {
          font-size: 0.875rem;
          color: #666;
        }
      </style>
      <div class="header">
        <span class="status-icon">${statusIcon}</span>
        <span class="summary">${this._report.summary}</span>
      </div>
      <div class="stats">
        <span>Total: ${this._report.totalGates}</span>
        <span>Passed: ${this._report.passedGates}</span>
        <span>Failed: ${this._report.failedGates}</span>
      </div>
      <div class="results">
        ${this._report.results.map(r => `
          <div class="result ${r.passed ? 'passed' : 'failed'}">
            <span class="result-icon">${r.passed ? '✓' : '✗'}</span>
            <span class="result-gate">${r.gate}</span>
            <span class="result-message">${r.message}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}

customElements.define('quality-gate-display', QualityGateDisplay);

export { QualityGateDisplay };