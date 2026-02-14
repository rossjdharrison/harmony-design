/**
 * Implementation Tracker Component
 * 
 * Displays the relationship between design specs and their implementations.
 * Shows completeness, implemented states, and any deviations.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#implementation-tracking
 */

class ImplementationTrackerComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._implementations = [];
    this._filterMode = 'all'; // 'all', 'incomplete', 'deviations'
  }

  connectedCallback() {
    this.render();
    this._subscribeToEvents();
  }

  disconnectedCallback() {
    this._unsubscribeFromEvents();
  }

  /**
   * Set the implementations to display
   * @param {Array} implementations - Array of implementation edge data
   */
  setImplementations(implementations) {
    this._implementations = implementations;
    this.render();
  }

  /**
   * Set the filter mode
   * @param {'all'|'incomplete'|'deviations'} mode - Filter mode
   */
  setFilterMode(mode) {
    this._filterMode = mode;
    this.render();
  }

  _subscribeToEvents() {
    window.EventBus?.subscribe('ImplementationUpdated', this._handleUpdate.bind(this));
  }

  _unsubscribeFromEvents() {
    window.EventBus?.unsubscribe('ImplementationUpdated', this._handleUpdate.bind(this));
  }

  _handleUpdate(event) {
    // Refresh implementation data when updates occur
    this._fetchImplementations();
  }

  async _fetchImplementations() {
    try {
      // Query the graph engine for implementation edges
      const response = await window.TypeNavigator?.query({
        type: 'find_implementations',
        filter: this._filterMode
      });
      
      if (response?.data) {
        this.setImplementations(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch implementations:', error);
    }
  }

  _getFilteredImplementations() {
    switch (this._filterMode) {
      case 'incomplete':
        return this._implementations.filter(impl => impl.completeness < 1.0);
      case 'deviations':
        return this._implementations.filter(impl => impl.deviations?.length > 0);
      default:
        return this._implementations;
    }
  }

  _renderImplementationCard(impl) {
    const completenessPercent = Math.round(impl.completeness * 100);
    const statusClass = impl.completeness >= 1.0 ? 'complete' : 'incomplete';
    const hasDeviations = impl.deviations?.length > 0;

    return `
      <div class="implementation-card ${statusClass}">
        <div class="card-header">
          <div class="file-info">
            <span class="file-path">${impl.file_path}</span>
            <span class="component-name">${impl.component_name}</span>
          </div>
          <div class="completeness">
            <span class="percentage">${completenessPercent}%</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${completenessPercent}%"></div>
            </div>
          </div>
        </div>
        
        <div class="card-body">
          ${impl.implemented_states?.length > 0 ? `
            <div class="states">
              <strong>States:</strong>
              ${impl.implemented_states.map(state => `<span class="tag">${state}</span>`).join('')}
            </div>
          ` : ''}
          
          ${impl.implemented_variants?.length > 0 ? `
            <div class="variants">
              <strong>Variants:</strong>
              ${impl.implemented_variants.map(variant => `<span class="tag">${variant}</span>`).join('')}
            </div>
          ` : ''}
          
          ${hasDeviations ? `
            <div class="deviations warning">
              <strong>⚠️ Deviations:</strong>
              <ul>
                ${impl.deviations.map(dev => `<li>${dev}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${impl.notes ? `
            <div class="notes">
              <strong>Notes:</strong> ${impl.notes}
            </div>
          ` : ''}
          
          ${impl.last_verified ? `
            <div class="verified">
              Last verified: ${new Date(impl.last_verified * 1000).toLocaleDateString()}
            </div>
          ` : ''}
        </div>
        
        <div class="card-actions">
          <button class="verify-btn" data-impl-id="${impl.source}">
            Verify Implementation
          </button>
          <button class="view-spec-btn" data-spec-id="${impl.target}">
            View Spec
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const filtered = this._getFilteredImplementations();
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .toolbar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .filter-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          background: #e0e0e0;
        }

        .filter-btn.active {
          background: #2196F3;
          color: white;
          border-color: #2196F3;
        }

        .implementations-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .implementation-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .implementation-card.complete {
          border-left: 4px solid #4CAF50;
        }

        .implementation-card.incomplete {
          border-left: 4px solid #FF9800;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .file-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .file-path {
          font-family: monospace;
          font-size: 0.9rem;
          color: #666;
        }

        .component-name {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .completeness {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .percentage {
          font-weight: bold;
          color: #2196F3;
        }

        .progress-bar {
          width: 100px;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9800, #4CAF50);
          transition: width 0.3s ease;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .tag {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #e3f2fd;
          color: #1976d2;
          border-radius: 4px;
          font-size: 0.85rem;
          margin-right: 0.5rem;
        }

        .deviations {
          padding: 0.75rem;
          background: #fff3e0;
          border-left: 3px solid #ff9800;
          border-radius: 4px;
        }

        .deviations ul {
          margin: 0.5rem 0 0 0;
          padding-left: 1.5rem;
        }

        .notes {
          padding: 0.75rem;
          background: #f5f5f5;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .verified {
          font-size: 0.85rem;
          color: #666;
          font-style: italic;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .card-actions button {
          padding: 0.5rem 1rem;
          border: 1px solid #2196F3;
          background: white;
          color: #2196F3;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .card-actions button:hover {
          background: #2196F3;
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666;
        }
      </style>

      <div class="toolbar">
        <button class="filter-btn ${this._filterMode === 'all' ? 'active' : ''}" 
                data-filter="all">
          All (${this._implementations.length})
        </button>
        <button class="filter-btn ${this._filterMode === 'incomplete' ? 'active' : ''}" 
                data-filter="incomplete">
          Incomplete (${this._implementations.filter(i => i.completeness < 1.0).length})
        </button>
        <button class="filter-btn ${this._filterMode === 'deviations' ? 'active' : ''}" 
                data-filter="deviations">
          With Deviations (${this._implementations.filter(i => i.deviations?.length > 0).length})
        </button>
      </div>

      <div class="implementations-list">
        ${filtered.length > 0 
          ? filtered.map(impl => this._renderImplementationCard(impl)).join('')
          : '<div class="empty-state">No implementations found</div>'
        }
      </div>
    `;

    this._attachEventListeners();
  }

  _attachEventListeners() {
    // Filter buttons
    this.shadowRoot.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setFilterMode(btn.dataset.filter);
      });
    });

    // Verify buttons
    this.shadowRoot.querySelectorAll('.verify-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._handleVerify(btn.dataset.implId);
      });
    });

    // View spec buttons
    this.shadowRoot.querySelectorAll('.view-spec-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._handleViewSpec(btn.dataset.specId);
      });
    });
  }

  _handleVerify(implId) {
    window.EventBus?.publish({
      type: 'VerifyImplementationRequested',
      source: 'ImplementationTracker',
      payload: { implementationId: implId }
    });
  }

  _handleViewSpec(specId) {
    window.EventBus?.publish({
      type: 'ViewSpecRequested',
      source: 'ImplementationTracker',
      payload: { specId }
    });
  }
}

customElements.define('implementation-tracker', ImplementationTrackerComponent);