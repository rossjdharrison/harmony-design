/**
 * @fileoverview Query Components UI Web Component
 * @module tools/query-components/ui
 * 
 * Provides interactive UI for querying and filtering design system components.
 * Uses shadow DOM and publishes events via EventBus.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#query-components-tool
 */

/**
 * Web component for query components tool UI
 * @extends HTMLElement
 */
export class QueryComponentsUI extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._results = [];
    this._stats = null;
  }

  connectedCallback() {
    this.render();
    this._attachEventListeners();
  }

  /**
   * Render the component UI
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
        }

        .container {
          padding: 16px;
          max-width: 1200px;
        }

        .filters {
          background: #f5f5f5;
          padding: 16px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .filter-group {
          margin-bottom: 12px;
        }

        .filter-group:last-child {
          margin-bottom: 0;
        }

        .filter-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 4px;
          color: #333;
        }

        .checkbox-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: normal;
          cursor: pointer;
        }

        .token-filter {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        input[type="text"],
        input[type="number"] {
          padding: 6px 8px;
          border: 1px solid #ccc;
          border-radius: 3px;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
        }

        input[type="number"] {
          width: 80px;
        }

        .actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        button {
          padding: 8px 16px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        button:hover {
          background: #0052a3;
        }

        button.secondary {
          background: #666;
        }

        button.secondary:hover {
          background: #555;
        }

        .stats {
          background: #e8f4f8;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #0066cc;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }

        .results {
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .results-header {
          padding: 12px 16px;
          background: #f9f9f9;
          border-bottom: 1px solid #ddd;
          font-weight: 600;
        }

        .result-item {
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          gap: 12px;
          align-items: center;
        }

        .result-item:last-child {
          border-bottom: none;
        }

        .result-item:hover {
          background: #f9f9f9;
        }

        .result-name {
          font-weight: 500;
        }

        .result-level,
        .result-state {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-block;
          text-align: center;
        }

        .result-level {
          background: #e3f2fd;
          color: #1976d2;
        }

        .result-state {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .result-tokens {
          font-size: 12px;
          color: #666;
        }

        .empty-state {
          padding: 32px;
          text-align: center;
          color: #999;
        }
      </style>

      <div class="container">
        <div class="filters">
          <div class="filter-group">
            <label>Component Level</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="level" value="primitive"> Primitive</label>
              <label><input type="checkbox" name="level" value="molecule"> Molecule</label>
              <label><input type="checkbox" name="level" value="organism"> Organism</label>
              <label><input type="checkbox" name="level" value="template"> Template</label>
            </div>
          </div>

          <div class="filter-group">
            <label>Lifecycle State</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="state" value="draft"> Draft</label>
              <label><input type="checkbox" name="state" value="design_complete"> Design Complete</label>
              <label><input type="checkbox" name="state" value="implementation_in_progress"> In Progress</label>
              <label><input type="checkbox" name="state" value="implemented"> Implemented</label>
              <label><input type="checkbox" name="state" value="deprecated"> Deprecated</label>
            </div>
          </div>

          <div class="filter-group">
            <label>Token Usage</label>
            <div class="token-filter">
              <div>
                <label>Includes Tokens (comma-separated)</label>
                <input type="text" id="token-includes" placeholder="token-id-1, token-id-2">
              </div>
              <div>
                <label>Excludes Tokens (comma-separated)</label>
                <input type="text" id="token-excludes" placeholder="token-id-3, token-id-4">
              </div>
              <div>
                <label>Min Token Count</label>
                <input type="number" id="token-min" min="0" placeholder="0">
              </div>
              <div>
                <label>Max Token Count</label>
                <input type="number" id="token-max" min="0" placeholder="∞">
              </div>
            </div>
          </div>

          <div class="actions">
            <button id="query-btn">Query Components</button>
            <button id="stats-btn" class="secondary">Show Statistics</button>
            <button id="clear-btn" class="secondary">Clear Filters</button>
          </div>
        </div>

        <div id="stats-container"></div>

        <div class="results">
          <div class="results-header">
            Results (<span id="result-count">0</span>)
          </div>
          <div id="results-list"></div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to UI elements
   * @private
   */
  _attachEventListeners() {
    const queryBtn = this.shadowRoot.getElementById('query-btn');
    const statsBtn = this.shadowRoot.getElementById('stats-btn');
    const clearBtn = this.shadowRoot.getElementById('clear-btn');

    queryBtn.addEventListener('click', () => this._handleQuery());
    statsBtn.addEventListener('click', () => this._handleShowStats());
    clearBtn.addEventListener('click', () => this._handleClear());
  }

  /**
   * Handle query button click
   * @private
   */
  _handleQuery() {
    const filter = this._collectFilters();
    
    // Publish QueryComponents command via EventBus
    const event = new CustomEvent('query-components', {
      detail: { filter },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle show statistics button click
   * @private
   */
  _handleShowStats() {
    const event = new CustomEvent('query-components-stats', {
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  /**
   * Handle clear filters button click
   * @private
   */
  _handleClear() {
    // Clear all checkboxes
    this.shadowRoot.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });

    // Clear all text inputs
    this.shadowRoot.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
      input.value = '';
    });

    // Clear results
    this._results = [];
    this._stats = null;
    this._renderResults();
    this._renderStats();
  }

  /**
   * Collect filter values from UI
   * @private
   * @returns {Object} Filter object
   */
  _collectFilters() {
    const filter = {};

    // Collect levels
    const levels = Array.from(
      this.shadowRoot.querySelectorAll('input[name="level"]:checked')
    ).map(cb => cb.value);
    if (levels.length > 0) {
      filter.levels = levels;
    }

    // Collect states
    const states = Array.from(
      this.shadowRoot.querySelectorAll('input[name="state"]:checked')
    ).map(cb => cb.value);
    if (states.length > 0) {
      filter.states = states;
    }

    // Collect token usage
    const tokenIncludes = this.shadowRoot.getElementById('token-includes').value;
    const tokenExcludes = this.shadowRoot.getElementById('token-excludes').value;
    const tokenMin = this.shadowRoot.getElementById('token-min').value;
    const tokenMax = this.shadowRoot.getElementById('token-max').value;

    if (tokenIncludes || tokenExcludes || tokenMin || tokenMax) {
      filter.tokenUsage = {};
      
      if (tokenIncludes) {
        filter.tokenUsage.includes = tokenIncludes.split(',').map(s => s.trim());
      }
      if (tokenExcludes) {
        filter.tokenUsage.excludes = tokenExcludes.split(',').map(s => s.trim());
      }
      if (tokenMin) {
        filter.tokenUsage.minCount = parseInt(tokenMin, 10);
      }
      if (tokenMax) {
        filter.tokenUsage.maxCount = parseInt(tokenMax, 10);
      }
    }

    return filter;
  }

  /**
   * Update results display
   * @param {Array} results - Query results
   */
  updateResults(results) {
    this._results = results;
    this._renderResults();
  }

  /**
   * Update statistics display
   * @param {Object} stats - Statistics object
   */
  updateStats(stats) {
    this._stats = stats;
    this._renderStats();
  }

  /**
   * Render results list
   * @private
   */
  _renderResults() {
    const resultsList = this.shadowRoot.getElementById('results-list');
    const resultCount = this.shadowRoot.getElementById('result-count');

    resultCount.textContent = this._results.length;

    if (this._results.length === 0) {
      resultsList.innerHTML = '<div class="empty-state">No components match the current filters</div>';
      return;
    }

    resultsList.innerHTML = this._results.map(result => `
      <div class="result-item">
        <div class="result-name">${result.name}</div>
        <div><span class="result-level">${result.level}</span></div>
        <div><span class="result-state">${result.state}</span></div>
        <div class="result-tokens">${result.tokenCount} tokens</div>
        <div class="result-tokens">${result.tokens.slice(0, 3).join(', ')}${result.tokens.length > 3 ? '...' : ''}</div>
      </div>
    `).join('');
  }

  /**
   * Render statistics
   * @private
   */
  _renderStats() {
    const statsContainer = this.shadowRoot.getElementById('stats-container');

    if (!this._stats) {
      statsContainer.innerHTML = '';
      return;
    }

    statsContainer.innerHTML = `
      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">${this._stats.total}</div>
          <div class="stat-label">Total Components</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${this._stats.tokenUsage.average.toFixed(1)}</div>
          <div class="stat-label">Avg Tokens</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${this._stats.tokenUsage.min}</div>
          <div class="stat-label">Min Tokens</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${this._stats.tokenUsage.max}</div>
          <div class="stat-label">Max Tokens</div>
        </div>
      </div>
    `;
  }
}

customElements.define('query-components-ui', QueryComponentsUI);