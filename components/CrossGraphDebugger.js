/**
 * @fileoverview Visual debugger component for cross-graph edges
 * @module components/CrossGraphDebugger
 * 
 * Provides real-time visualization and debugging of cross-graph edges
 * in the Harmony Design System. Displays edge relationships, validates
 * connections, and highlights issues.
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#cross-graph-debugger}
 * @see {@link ../harmony-graph/src/cross-graph-index.ts}
 * @see {@link ../harmony-schemas/cross-graph-schema.json}
 */

import { EventBus } from '../core/event-bus.js';

/**
 * CrossGraphDebugger Web Component
 * 
 * Displays cross-graph edges with filtering, search, and validation status.
 * Updates in real-time as edges are added, removed, or modified.
 * 
 * @example
 * <cross-graph-debugger></cross-graph-debugger>
 * 
 * @fires cross-graph-debugger:edge-selected - When user selects an edge
 * @fires cross-graph-debugger:filter-changed - When filter criteria changes
 * @fires cross-graph-debugger:refresh-requested - When user requests refresh
 */
export class CrossGraphDebugger extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {EventBus} */
    this._eventBus = null;
    
    /** @type {Array<Object>} */
    this._edges = [];
    
    /** @type {string} */
    this._filterGraph = '';
    
    /** @type {string} */
    this._searchTerm = '';
    
    /** @type {string|null} */
    this._selectedEdgeId = null;
    
    /** @type {boolean} */
    this._showValidOnly = false;
    
    /** @type {number} */
    this._refreshInterval = null;
  }

  /**
   * Observed attributes for reactive updates
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ['visible', 'auto-refresh', 'refresh-rate'];
  }

  /**
   * Lifecycle: component connected to DOM
   */
  connectedCallback() {
    this._eventBus = EventBus.getInstance();
    this._render();
    this._attachEventListeners();
    this._subscribeToEvents();
    
    // Request initial data
    this._requestEdgeData();
    
    // Setup auto-refresh if enabled
    const autoRefresh = this.getAttribute('auto-refresh');
    if (autoRefresh === 'true') {
      const rate = parseInt(this.getAttribute('refresh-rate') || '5000', 10);
      this._startAutoRefresh(rate);
    }
  }

  /**
   * Lifecycle: component disconnected from DOM
   */
  disconnectedCallback() {
    this._detachEventListeners();
    this._unsubscribeFromEvents();
    this._stopAutoRefresh();
  }

  /**
   * Lifecycle: attribute changed
   * @param {string} name - Attribute name
   * @param {string} oldValue - Previous value
   * @param {string} newValue - New value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'visible':
        this._updateVisibility(newValue === 'true');
        break;
      case 'auto-refresh':
        if (newValue === 'true') {
          const rate = parseInt(this.getAttribute('refresh-rate') || '5000', 10);
          this._startAutoRefresh(rate);
        } else {
          this._stopAutoRefresh();
        }
        break;
      case 'refresh-rate':
        if (this.getAttribute('auto-refresh') === 'true') {
          this._stopAutoRefresh();
          this._startAutoRefresh(parseInt(newValue, 10));
        }
        break;
    }
  }

  /**
   * Render component template
   * @private
   */
  _render() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 60px;
          right: 20px;
          width: 400px;
          max-height: 600px;
          background: #1e1e1e;
          border: 1px solid #3c3c3c;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 12px;
          color: #d4d4d4;
          z-index: 9999;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        :host([hidden]) {
          display: none;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
          user-select: none;
        }
        
        .title {
          font-weight: 600;
          color: #ffffff;
          font-size: 13px;
        }
        
        .controls {
          display: flex;
          gap: 8px;
        }
        
        .btn {
          background: transparent;
          border: 1px solid #3c3c3c;
          color: #d4d4d4;
          padding: 4px 8px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.15s ease;
        }
        
        .btn:hover {
          background: #3c3c3c;
          border-color: #4e4e4e;
        }
        
        .btn:active {
          background: #2a2a2a;
        }
        
        .filters {
          padding: 12px;
          background: #252526;
          border-bottom: 1px solid #3c3c3c;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .filter-row {
          display: flex;
          gap: 8px;
        }
        
        input[type="text"] {
          flex: 1;
          background: #3c3c3c;
          border: 1px solid #4e4e4e;
          color: #d4d4d4;
          padding: 6px 8px;
          border-radius: 3px;
          font-family: inherit;
          font-size: 11px;
        }
        
        input[type="text"]:focus {
          outline: none;
          border-color: #007acc;
          box-shadow: 0 0 0 1px #007acc;
        }
        
        select {
          background: #3c3c3c;
          border: 1px solid #4e4e4e;
          color: #d4d4d4;
          padding: 6px 8px;
          border-radius: 3px;
          font-family: inherit;
          font-size: 11px;
          cursor: pointer;
        }
        
        select:focus {
          outline: none;
          border-color: #007acc;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 11px;
        }
        
        input[type="checkbox"] {
          cursor: pointer;
        }
        
        .stats {
          padding: 8px 12px;
          background: #2d2d30;
          border-bottom: 1px solid #3c3c3c;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        
        .stat {
          display: flex;
          gap: 4px;
        }
        
        .stat-label {
          color: #858585;
        }
        
        .stat-value {
          color: #4ec9b0;
          font-weight: 600;
        }
        
        .stat-value.error {
          color: #f48771;
        }
        
        .edge-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        
        .edge-item {
          background: #2d2d30;
          border: 1px solid #3c3c3c;
          border-radius: 3px;
          padding: 10px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .edge-item:hover {
          background: #37373d;
          border-color: #4e4e4e;
        }
        
        .edge-item.selected {
          background: #094771;
          border-color: #007acc;
        }
        
        .edge-item.invalid {
          border-left: 3px solid #f48771;
        }
        
        .edge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        
        .edge-id {
          font-weight: 600;
          color: #dcdcaa;
          font-size: 11px;
        }
        
        .edge-status {
          padding: 2px 6px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 600;
        }
        
        .edge-status.valid {
          background: #1e3a1e;
          color: #4ec9b0;
        }
        
        .edge-status.invalid {
          background: #3a1e1e;
          color: #f48771;
        }
        
        .edge-connection {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          font-size: 11px;
        }
        
        .graph-name {
          color: #4fc1ff;
        }
        
        .node-id {
          color: #ce9178;
        }
        
        .arrow {
          color: #858585;
        }
        
        .edge-meta {
          font-size: 10px;
          color: #858585;
          margin-top: 6px;
        }
        
        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #858585;
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.3;
        }
        
        .empty-text {
          font-size: 13px;
        }
        
        /* Scrollbar styling */
        .edge-list::-webkit-scrollbar {
          width: 10px;
        }
        
        .edge-list::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        
        .edge-list::-webkit-scrollbar-thumb {
          background: #3c3c3c;
          border-radius: 5px;
        }
        
        .edge-list::-webkit-scrollbar-thumb:hover {
          background: #4e4e4e;
        }
      </style>
      
      <div class="header">
        <div class="title">Cross-Graph Debugger</div>
        <div class="controls">
          <button class="btn" id="refresh-btn" title="Refresh edges">
            ↻
          </button>
          <button class="btn" id="close-btn" title="Close debugger">
            ✕
          </button>
        </div>
      </div>
      
      <div class="filters">
        <div class="filter-row">
          <input 
            type="text" 
            id="search-input" 
            placeholder="Search edges, nodes, graphs..."
          />
          <select id="graph-filter">
            <option value="">All Graphs</option>
          </select>
        </div>
        <label class="checkbox-label">
          <input type="checkbox" id="valid-only-checkbox" />
          Show valid edges only
        </label>
      </div>
      
      <div class="stats">
        <div class="stat">
          <span class="stat-label">Total:</span>
          <span class="stat-value" id="total-count">0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Valid:</span>
          <span class="stat-value" id="valid-count">0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Invalid:</span>
          <span class="stat-value error" id="invalid-count">0</span>
        </div>
      </div>
      
      <div class="edge-list" id="edge-list"></div>
    `;
    
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  /**
   * Attach DOM event listeners
   * @private
   */
  _attachEventListeners() {
    const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
    const closeBtn = this.shadowRoot.getElementById('close-btn');
    const searchInput = this.shadowRoot.getElementById('search-input');
    const graphFilter = this.shadowRoot.getElementById('graph-filter');
    const validOnlyCheckbox = this.shadowRoot.getElementById('valid-only-checkbox');
    
    refreshBtn.addEventListener('click', () => this._handleRefresh());
    closeBtn.addEventListener('click', () => this._handleClose());
    searchInput.addEventListener('input', (e) => this._handleSearch(e.target.value));
    graphFilter.addEventListener('change', (e) => this._handleGraphFilter(e.target.value));
    validOnlyCheckbox.addEventListener('change', (e) => this._handleValidOnlyFilter(e.target.checked));
  }

  /**
   * Detach DOM event listeners
   * @private
   */
  _detachEventListeners() {
    // Event listeners will be cleaned up when shadow DOM is removed
  }

  /**
   * Subscribe to EventBus events
   * @private
   */
  _subscribeToEvents() {
    if (!this._eventBus) return;
    
    this._eventBus.subscribe('cross-graph:edge-added', (data) => {
      this._handleEdgeAdded(data);
    });
    
    this._eventBus.subscribe('cross-graph:edge-removed', (data) => {
      this._handleEdgeRemoved(data);
    });
    
    this._eventBus.subscribe('cross-graph:edge-updated', (data) => {
      this._handleEdgeUpdated(data);
    });
    
    this._eventBus.subscribe('cross-graph:edges-loaded', (data) => {
      this._handleEdgesLoaded(data);
    });
  }

  /**
   * Unsubscribe from EventBus events
   * @private
   */
  _unsubscribeFromEvents() {
    // EventBus handles cleanup internally
  }

  /**
   * Request edge data from the system
   * @private
   */
  _requestEdgeData() {
    if (!this._eventBus) return;
    
    this._eventBus.publish('cross-graph:request-edges', {
      timestamp: Date.now()
    });
  }

  /**
   * Handle refresh button click
   * @private
   */
  _handleRefresh() {
    this._requestEdgeData();
    
    this._eventBus.publish('cross-graph-debugger:refresh-requested', {
      timestamp: Date.now()
    });
  }

  /**
   * Handle close button click
   * @private
   */
  _handleClose() {
    this.setAttribute('hidden', '');
  }

  /**
   * Handle search input
   * @param {string} term - Search term
   * @private
   */
  _handleSearch(term) {
    this._searchTerm = term.toLowerCase();
    this._updateEdgeList();
    
    this._eventBus.publish('cross-graph-debugger:filter-changed', {
      search: this._searchTerm,
      graph: this._filterGraph,
      validOnly: this._showValidOnly
    });
  }

  /**
   * Handle graph filter change
   * @param {string} graph - Graph name
   * @private
   */
  _handleGraphFilter(graph) {
    this._filterGraph = graph;
    this._updateEdgeList();
    
    this._eventBus.publish('cross-graph-debugger:filter-changed', {
      search: this._searchTerm,
      graph: this._filterGraph,
      validOnly: this._showValidOnly
    });
  }

  /**
   * Handle valid-only filter change
   * @param {boolean} checked - Checkbox state
   * @private
   */
  _handleValidOnlyFilter(checked) {
    this._showValidOnly = checked;
    this._updateEdgeList();
    
    this._eventBus.publish('cross-graph-debugger:filter-changed', {
      search: this._searchTerm,
      graph: this._filterGraph,
      validOnly: this._showValidOnly
    });
  }

  /**
   * Handle edge added event
   * @param {Object} data - Edge data
   * @private
   */
  _handleEdgeAdded(data) {
    if (data && data.edge) {
      this._edges.push(data.edge);
      this._updateGraphFilter();
      this._updateEdgeList();
    }
  }

  /**
   * Handle edge removed event
   * @param {Object} data - Edge data
   * @private
   */
  _handleEdgeRemoved(data) {
    if (data && data.edgeId) {
      this._edges = this._edges.filter(e => e.id !== data.edgeId);
      this._updateEdgeList();
    }
  }

  /**
   * Handle edge updated event
   * @param {Object} data - Edge data
   * @private
   */
  _handleEdgeUpdated(data) {
    if (data && data.edge) {
      const index = this._edges.findIndex(e => e.id === data.edge.id);
      if (index !== -1) {
        this._edges[index] = data.edge;
        this._updateEdgeList();
      }
    }
  }

  /**
   * Handle edges loaded event
   * @param {Object} data - Edges data
   * @private
   */
  _handleEdgesLoaded(data) {
    if (data && Array.isArray(data.edges)) {
      this._edges = data.edges;
      this._updateGraphFilter();
      this._updateEdgeList();
    }
  }

  /**
   * Update graph filter dropdown
   * @private
   */
  _updateGraphFilter() {
    const graphFilter = this.shadowRoot.getElementById('graph-filter');
    const graphs = new Set();
    
    this._edges.forEach(edge => {
      if (edge.sourceGraph) graphs.add(edge.sourceGraph);
      if (edge.targetGraph) graphs.add(edge.targetGraph);
    });
    
    const currentValue = graphFilter.value;
    graphFilter.innerHTML = '<option value="">All Graphs</option>';
    
    Array.from(graphs).sort().forEach(graph => {
      const option = document.createElement('option');
      option.value = graph;
      option.textContent = graph;
      graphFilter.appendChild(option);
    });
    
    if (currentValue && graphs.has(currentValue)) {
      graphFilter.value = currentValue;
    }
  }

  /**
   * Update edge list display
   * @private
   */
  _updateEdgeList() {
    const edgeList = this.shadowRoot.getElementById('edge-list');
    const filtered = this._getFilteredEdges();
    
    // Update stats
    const totalCount = this.shadowRoot.getElementById('total-count');
    const validCount = this.shadowRoot.getElementById('valid-count');
    const invalidCount = this.shadowRoot.getElementById('invalid-count');
    
    totalCount.textContent = filtered.length;
    validCount.textContent = filtered.filter(e => e.valid !== false).length;
    invalidCount.textContent = filtered.filter(e => e.valid === false).length;
    
    // Render edges
    if (filtered.length === 0) {
      edgeList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">No edges found</div>
        </div>
      `;
      return;
    }
    
    edgeList.innerHTML = '';
    filtered.forEach(edge => {
      const item = this._createEdgeItem(edge);
      edgeList.appendChild(item);
    });
  }

  /**
   * Get filtered edges based on current filters
   * @returns {Array<Object>}
   * @private
   */
  _getFilteredEdges() {
    return this._edges.filter(edge => {
      // Graph filter
      if (this._filterGraph) {
        if (edge.sourceGraph !== this._filterGraph && edge.targetGraph !== this._filterGraph) {
          return false;
        }
      }
      
      // Valid-only filter
      if (this._showValidOnly && edge.valid === false) {
        return false;
      }
      
      // Search filter
      if (this._searchTerm) {
        const searchable = [
          edge.id,
          edge.sourceGraph,
          edge.sourceNode,
          edge.targetGraph,
          edge.targetNode,
          edge.type
        ].join(' ').toLowerCase();
        
        if (!searchable.includes(this._searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Create edge item DOM element
   * @param {Object} edge - Edge data
   * @returns {HTMLElement}
   * @private
   */
  _createEdgeItem(edge) {
    const item = document.createElement('div');
    item.className = 'edge-item';
    
    if (edge.valid === false) {
      item.classList.add('invalid');
    }
    
    if (this._selectedEdgeId === edge.id) {
      item.classList.add('selected');
    }
    
    const statusClass = edge.valid === false ? 'invalid' : 'valid';
    const statusText = edge.valid === false ? 'Invalid' : 'Valid';
    
    item.innerHTML = `
      <div class="edge-header">
        <div class="edge-id">${this._escapeHtml(edge.id || 'unknown')}</div>
        <div class="edge-status ${statusClass}">${statusText}</div>
      </div>
      <div class="edge-connection">
        <span class="graph-name">${this._escapeHtml(edge.sourceGraph || '?')}</span>
        <span class="node-id">${this._escapeHtml(edge.sourceNode || '?')}</span>
        <span class="arrow">→</span>
        <span class="graph-name">${this._escapeHtml(edge.targetGraph || '?')}</span>
        <span class="node-id">${this._escapeHtml(edge.targetNode || '?')}</span>
      </div>
      ${edge.type ? `<div class="edge-meta">Type: ${this._escapeHtml(edge.type)}</div>` : ''}
      ${edge.error ? `<div class="edge-meta" style="color: #f48771;">${this._escapeHtml(edge.error)}</div>` : ''}
    `;
    
    item.addEventListener('click', () => this._handleEdgeClick(edge));
    
    return item;
  }

  /**
   * Handle edge item click
   * @param {Object} edge - Edge data
   * @private
   */
  _handleEdgeClick(edge) {
    this._selectedEdgeId = edge.id;
    this._updateEdgeList();
    
    this._eventBus.publish('cross-graph-debugger:edge-selected', {
      edge: edge,
      timestamp: Date.now()
    });
  }

  /**
   * Start auto-refresh timer
   * @param {number} rate - Refresh rate in milliseconds
   * @private
   */
  _startAutoRefresh(rate) {
    this._stopAutoRefresh();
    this._refreshInterval = setInterval(() => {
      this._requestEdgeData();
    }, rate);
  }

  /**
   * Stop auto-refresh timer
   * @private
   */
  _stopAutoRefresh() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  /**
   * Update visibility
   * @param {boolean} visible - Visibility state
   * @private
   */
  _updateVisibility(visible) {
    if (visible) {
      this.removeAttribute('hidden');
      this._requestEdgeData();
    } else {
      this.setAttribute('hidden', '');
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - Input string
   * @returns {string}
   * @private
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Register custom element
customElements.define('cross-graph-debugger', CrossGraphDebugger);