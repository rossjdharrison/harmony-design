/**
 * @fileoverview Component Graph Event Log - Tracks component lifecycle, state changes,
 * and relationships across the design system. Provides visualization and debugging
 * capabilities for the component graph.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#component-graph-event-log
 * 
 * @module harmony-design/components/dev-tools/component-graph-event-log
 */

/**
 * Component Graph Event Log Web Component
 * Monitors and visualizes the entire component graph state including:
 * - Component lifecycle (created, mounted, updated, destroyed)
 * - State changes and mutations
 * - Event flow between components
 * - Performance metrics
 * 
 * @class ComponentGraphEventLog
 * @extends HTMLElement
 */
class ComponentGraphEventLog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Array<ComponentGraphEvent>} */
    this._events = [];
    
    /** @type {Map<string, ComponentNode>} */
    this._componentGraph = new Map();
    
    /** @type {boolean} */
    this._isRecording = true;
    
    /** @type {number} */
    this._maxEvents = 1000;
    
    /** @type {Set<string>} */
    this._filters = new Set(['lifecycle', 'state', 'event', 'performance']);
    
    /** @type {string|null} */
    this._selectedComponent = null;
    
    this._render();
    this._attachEventListeners();
  }

  connectedCallback() {
    this._subscribeToSystemEvents();
    this._startPerformanceMonitoring();
  }

  disconnectedCallback() {
    this._unsubscribeFromSystemEvents();
    this._stopPerformanceMonitoring();
  }

  /**
   * Subscribe to all system events for monitoring
   * @private
   */
  _subscribeToSystemEvents() {
    // Listen to EventBus for all events
    window.addEventListener('eventbus:published', this._handleEventBusEvent.bind(this));
    
    // Monitor component lifecycle via MutationObserver
    this._observer = new MutationObserver(this._handleDOMMutations.bind(this));
    this._observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });
    
    // Monitor custom events
    window.addEventListener('component:created', this._handleComponentCreated.bind(this));
    window.addEventListener('component:mounted', this._handleComponentMounted.bind(this));
    window.addEventListener('component:updated', this._handleComponentUpdated.bind(this));
    window.addEventListener('component:destroyed', this._handleComponentDestroyed.bind(this));
    window.addEventListener('component:state-change', this._handleStateChange.bind(this));
  }

  /**
   * Unsubscribe from system events
   * @private
   */
  _unsubscribeFromSystemEvents() {
    window.removeEventListener('eventbus:published', this._handleEventBusEvent.bind(this));
    if (this._observer) {
      this._observer.disconnect();
    }
    window.removeEventListener('component:created', this._handleComponentCreated.bind(this));
    window.removeEventListener('component:mounted', this._handleComponentMounted.bind(this));
    window.removeEventListener('component:updated', this._handleComponentUpdated.bind(this));
    window.removeEventListener('component:destroyed', this._handleComponentDestroyed.bind(this));
    window.removeEventListener('component:state-change', this._handleStateChange.bind(this));
  }

  /**
   * Handle EventBus events
   * @private
   * @param {CustomEvent} event
   */
  _handleEventBusEvent(event) {
    if (!this._isRecording) return;
    
    this._addEvent({
      type: 'event',
      category: 'eventbus',
      timestamp: Date.now(),
      data: {
        eventType: event.detail.type,
        payload: event.detail.payload,
        source: event.detail.source
      }
    });
  }

  /**
   * Handle DOM mutations
   * @private
   * @param {MutationRecord[]} mutations
   */
  _handleDOMMutations(mutations) {
    if (!this._isRecording) return;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName.includes('-')) {
            this._trackComponentNode(node);
          }
        });
        
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName.includes('-')) {
            this._untrackComponentNode(node);
          }
        });
      }
    }
  }

  /**
   * Track a component node in the graph
   * @private
   * @param {HTMLElement} element
   */
  _trackComponentNode(element) {
    const id = this._getComponentId(element);
    const node = {
      id,
      tagName: element.tagName.toLowerCase(),
      element,
      createdAt: Date.now(),
      state: {},
      children: [],
      parent: null,
      events: []
    };
    
    this._componentGraph.set(id, node);
    
    // Build parent-child relationships
    const parent = element.parentElement?.closest('[data-component-id]');
    if (parent) {
      const parentId = parent.getAttribute('data-component-id');
      const parentNode = this._componentGraph.get(parentId);
      if (parentNode) {
        node.parent = parentId;
        parentNode.children.push(id);
      }
    }
    
    this._addEvent({
      type: 'lifecycle',
      category: 'created',
      timestamp: Date.now(),
      componentId: id,
      data: {
        tagName: node.tagName,
        parent: node.parent
      }
    });
  }

  /**
   * Untrack a component node from the graph
   * @private
   * @param {HTMLElement} element
   */
  _untrackComponentNode(element) {
    const id = this._getComponentId(element);
    const node = this._componentGraph.get(id);
    
    if (node) {
      this._addEvent({
        type: 'lifecycle',
        category: 'destroyed',
        timestamp: Date.now(),
        componentId: id,
        data: {
          tagName: node.tagName,
          lifespan: Date.now() - node.createdAt
        }
      });
      
      this._componentGraph.delete(id);
    }
  }

  /**
   * Get or create component ID
   * @private
   * @param {HTMLElement} element
   * @returns {string}
   */
  _getComponentId(element) {
    let id = element.getAttribute('data-component-id');
    if (!id) {
      id = `${element.tagName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      element.setAttribute('data-component-id', id);
    }
    return id;
  }

  /**
   * Handle component created event
   * @private
   * @param {CustomEvent} event
   */
  _handleComponentCreated(event) {
    if (!this._isRecording) return;
    
    this._addEvent({
      type: 'lifecycle',
      category: 'created',
      timestamp: Date.now(),
      componentId: event.detail.id,
      data: event.detail
    });
  }

  /**
   * Handle component mounted event
   * @private
   * @param {CustomEvent} event
   */
  _handleComponentMounted(event) {
    if (!this._isRecording) return;
    
    this._addEvent({
      type: 'lifecycle',
      category: 'mounted',
      timestamp: Date.now(),
      componentId: event.detail.id,
      data: event.detail
    });
  }

  /**
   * Handle component updated event
   * @private
   * @param {CustomEvent} event
   */
  _handleComponentUpdated(event) {
    if (!this._isRecording) return;
    
    this._addEvent({
      type: 'lifecycle',
      category: 'updated',
      timestamp: Date.now(),
      componentId: event.detail.id,
      data: event.detail
    });
  }

  /**
   * Handle component destroyed event
   * @private
   * @param {CustomEvent} event
   */
  _handleComponentDestroyed(event) {
    if (!this._isRecording) return;
    
    this._addEvent({
      type: 'lifecycle',
      category: 'destroyed',
      timestamp: Date.now(),
      componentId: event.detail.id,
      data: event.detail
    });
  }

  /**
   * Handle state change event
   * @private
   * @param {CustomEvent} event
   */
  _handleStateChange(event) {
    if (!this._isRecording) return;
    
    const node = this._componentGraph.get(event.detail.id);
    if (node) {
      node.state = { ...node.state, ...event.detail.state };
    }
    
    this._addEvent({
      type: 'state',
      category: 'change',
      timestamp: Date.now(),
      componentId: event.detail.id,
      data: {
        previous: event.detail.previous,
        current: event.detail.current,
        changed: event.detail.changed
      }
    });
  }

  /**
   * Add event to log
   * @private
   * @param {ComponentGraphEvent} event
   */
  _addEvent(event) {
    this._events.unshift(event);
    
    // Enforce max events limit
    if (this._events.length > this._maxEvents) {
      this._events = this._events.slice(0, this._maxEvents);
    }
    
    // Update component node with event
    if (event.componentId) {
      const node = this._componentGraph.get(event.componentId);
      if (node) {
        node.events.push(event);
      }
    }
    
    this._updateEventList();
  }

  /**
   * Start performance monitoring
   * @private
   */
  _startPerformanceMonitoring() {
    this._performanceInterval = setInterval(() => {
      if (!this._isRecording) return;
      
      const memory = performance.memory;
      const timing = performance.timing;
      
      this._addEvent({
        type: 'performance',
        category: 'snapshot',
        timestamp: Date.now(),
        data: {
          memory: memory ? {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          } : null,
          componentCount: this._componentGraph.size,
          eventCount: this._events.length
        }
      });
    }, 5000); // Every 5 seconds
  }

  /**
   * Stop performance monitoring
   * @private
   */
  _stopPerformanceMonitoring() {
    if (this._performanceInterval) {
      clearInterval(this._performanceInterval);
    }
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          background: var(--surface-primary, #ffffff);
          border: 1px solid var(--border-default, #e0e0e0);
          border-radius: 8px;
          overflow: hidden;
          height: 600px;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--surface-secondary, #f5f5f5);
          border-bottom: 1px solid var(--border-default, #e0e0e0);
        }

        .title {
          font-weight: 600;
          font-size: 16px;
          color: var(--text-primary, #000000);
        }

        .controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn {
          padding: 6px 12px;
          border: 1px solid var(--border-default, #e0e0e0);
          border-radius: 4px;
          background: var(--surface-primary, #ffffff);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn:hover {
          background: var(--surface-secondary, #f5f5f5);
        }

        .btn.active {
          background: var(--primary-default, #007bff);
          color: white;
          border-color: var(--primary-default, #007bff);
        }

        .content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .sidebar {
          width: 250px;
          border-right: 1px solid var(--border-default, #e0e0e0);
          overflow-y: auto;
          background: var(--surface-secondary, #fafafa);
        }

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .filters {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-default, #e0e0e0);
          flex-wrap: wrap;
        }

        .filter-chip {
          padding: 4px 12px;
          border: 1px solid var(--border-default, #e0e0e0);
          border-radius: 16px;
          background: var(--surface-primary, #ffffff);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .filter-chip:hover {
          background: var(--surface-secondary, #f5f5f5);
        }

        .filter-chip.active {
          background: var(--primary-default, #007bff);
          color: white;
          border-color: var(--primary-default, #007bff);
        }

        .event-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .event-item {
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid var(--border-default, #e0e0e0);
          border-radius: 4px;
          background: var(--surface-primary, #ffffff);
          cursor: pointer;
          transition: all 0.2s;
        }

        .event-item:hover {
          background: var(--surface-secondary, #f5f5f5);
          border-color: var(--primary-default, #007bff);
        }

        .event-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .event-type {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .event-type.lifecycle { background: #e3f2fd; color: #1976d2; }
        .event-type.state { background: #f3e5f5; color: #7b1fa2; }
        .event-type.event { background: #e8f5e9; color: #388e3c; }
        .event-type.performance { background: #fff3e0; color: #f57c00; }

        .event-time {
          font-size: 11px;
          color: var(--text-secondary, #666666);
        }

        .event-component {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary, #000000);
          margin-bottom: 4px;
        }

        .event-data {
          font-size: 11px;
          color: var(--text-secondary, #666666);
          font-family: 'Courier New', monospace;
        }

        .component-tree {
          padding: 8px;
        }

        .tree-node {
          padding: 4px 8px;
          margin: 2px 0;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .tree-node:hover {
          background: var(--surface-primary, #ffffff);
        }

        .tree-node.selected {
          background: var(--primary-default, #007bff);
          color: white;
        }

        .tree-node-label {
          font-size: 13px;
        }

        .tree-children {
          margin-left: 16px;
        }

        .stats {
          padding: 12px 16px;
          border-top: 1px solid var(--border-default, #e0e0e0);
          background: var(--surface-secondary, #f5f5f5);
          font-size: 12px;
          color: var(--text-secondary, #666666);
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-secondary, #666666);
          font-size: 14px;
        }
      </style>

      <div class="header">
        <div class="title">Component Graph Event Log</div>
        <div class="controls">
          <button class="btn" id="toggleRecording">⏸ Pause</button>
          <button class="btn" id="clearEvents">🗑 Clear</button>
          <button class="btn" id="exportData">💾 Export</button>
        </div>
      </div>

      <div class="content">
        <div class="sidebar">
          <div class="component-tree" id="componentTree"></div>
        </div>

        <div class="main">
          <div class="filters" id="filters">
            <div class="filter-chip active" data-filter="lifecycle">Lifecycle</div>
            <div class="filter-chip active" data-filter="state">State</div>
            <div class="filter-chip active" data-filter="event">Events</div>
            <div class="filter-chip active" data-filter="performance">Performance</div>
          </div>

          <div class="event-list" id="eventList">
            <div class="empty-state">No events recorded yet</div>
          </div>

          <div class="stats" id="stats">
            Components: 0 | Events: 0 | Recording: Active
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to UI elements
   * @private
   */
  _attachEventListeners() {
    const toggleBtn = this.shadowRoot.getElementById('toggleRecording');
    const clearBtn = this.shadowRoot.getElementById('clearEvents');
    const exportBtn = this.shadowRoot.getElementById('exportData');
    const filters = this.shadowRoot.getElementById('filters');

    toggleBtn.addEventListener('click', () => {
      this._isRecording = !this._isRecording;
      toggleBtn.textContent = this._isRecording ? '⏸ Pause' : '▶ Record';
      toggleBtn.classList.toggle('active', !this._isRecording);
      this._updateStats();
    });

    clearBtn.addEventListener('click', () => {
      this._events = [];
      this._updateEventList();
      this._updateStats();
    });

    exportBtn.addEventListener('click', () => {
      this._exportData();
    });

    filters.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-chip')) {
        const filter = e.target.dataset.filter;
        if (this._filters.has(filter)) {
          this._filters.delete(filter);
          e.target.classList.remove('active');
        } else {
          this._filters.add(filter);
          e.target.classList.add('active');
        }
        this._updateEventList();
      }
    });
  }

  /**
   * Update event list display
   * @private
   */
  _updateEventList() {
    const container = this.shadowRoot.getElementById('eventList');
    const filteredEvents = this._events.filter(e => this._filters.has(e.type));

    if (filteredEvents.length === 0) {
      container.innerHTML = '<div class="empty-state">No events match current filters</div>';
      return;
    }

    container.innerHTML = filteredEvents.map(event => `
      <div class="event-item" data-event-id="${event.timestamp}">
        <div class="event-header">
          <span class="event-type ${event.type}">${event.type}</span>
          <span class="event-time">${this._formatTime(event.timestamp)}</span>
        </div>
        ${event.componentId ? `<div class="event-component">${event.componentId}</div>` : ''}
        <div class="event-data">${this._formatEventData(event)}</div>
      </div>
    `).join('');

    this._updateComponentTree();
    this._updateStats();
  }

  /**
   * Update component tree display
   * @private
   */
  _updateComponentTree() {
    const container = this.shadowRoot.getElementById('componentTree');
    const rootComponents = Array.from(this._componentGraph.values())
      .filter(node => !node.parent);

    if (rootComponents.length === 0) {
      container.innerHTML = '<div class="empty-state">No components</div>';
      return;
    }

    container.innerHTML = rootComponents
      .map(node => this._renderTreeNode(node))
      .join('');
  }

  /**
   * Render a tree node
   * @private
   * @param {ComponentNode} node
   * @returns {string}
   */
  _renderTreeNode(node) {
    const children = node.children
      .map(id => this._componentGraph.get(id))
      .filter(Boolean)
      .map(child => this._renderTreeNode(child))
      .join('');

    const selected = this._selectedComponent === node.id ? 'selected' : '';

    return `
      <div class="tree-node ${selected}" data-component-id="${node.id}">
        <div class="tree-node-label">${node.tagName}</div>
        ${children ? `<div class="tree-children">${children}</div>` : ''}
      </div>
    `;
  }

  /**
   * Update stats display
   * @private
   */
  _updateStats() {
    const container = this.shadowRoot.getElementById('stats');
    const status = this._isRecording ? 'Active' : 'Paused';
    container.textContent = `Components: ${this._componentGraph.size} | Events: ${this._events.length} | Recording: ${status}`;
  }

  /**
   * Format timestamp
   * @private
   * @param {number} timestamp
   * @returns {string}
   */
  _formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  }

  /**
   * Format event data for display
   * @private
   * @param {ComponentGraphEvent} event
   * @returns {string}
   */
  _formatEventData(event) {
    return JSON.stringify(event.data, null, 2).substring(0, 200);
  }

  /**
   * Export data to JSON
   * @private
   */
  _exportData() {
    const data = {
      timestamp: Date.now(),
      events: this._events,
      graph: Array.from(this._componentGraph.entries()).map(([id, node]) => ({
        id,
        tagName: node.tagName,
        createdAt: node.createdAt,
        parent: node.parent,
        children: node.children,
        state: node.state
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `component-graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Get current graph state
   * @returns {Object}
   */
  getGraphState() {
    return {
      components: Array.from(this._componentGraph.entries()),
      events: this._events,
      recording: this._isRecording
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this._events = [];
    this._componentGraph.clear();
    this._updateEventList();
  }
}

/**
 * @typedef {Object} ComponentGraphEvent
 * @property {string} type - Event type (lifecycle, state, event, performance)
 * @property {string} category - Event category
 * @property {number} timestamp - Event timestamp
 * @property {string} [componentId] - Component ID if applicable
 * @property {Object} data - Event data
 */

/**
 * @typedef {Object} ComponentNode
 * @property {string} id - Component ID
 * @property {string} tagName - Component tag name
 * @property {HTMLElement} element - DOM element
 * @property {number} createdAt - Creation timestamp
 * @property {Object} state - Component state
 * @property {string[]} children - Child component IDs
 * @property {string|null} parent - Parent component ID
 * @property {ComponentGraphEvent[]} events - Component events
 */

customElements.define('component-graph-event-log', ComponentGraphEventLog);

export { ComponentGraphEventLog };