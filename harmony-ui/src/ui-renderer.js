/**
 * @fileoverview UIRenderer - Core rendering component with cross-graph edge creation
 * @module harmony-ui/ui-renderer
 * 
 * Responsibilities:
 * - Assembles UI components from graph nodes
 * - Creates and manages cross-graph edges for reactive updates
 * - Maintains edge index for O(1) lookup
 * - Publishes rendering events via EventBus
 * 
 * Architecture:
 * - Subscribes to graph change events
 * - Indexes cross-graph edges by source and target graph IDs
 * - Renders DOM using template assembly pipeline
 * - GPU-accelerated animations via CSS transforms
 * 
 * Related docs: See DESIGN_SYSTEM.md § UIRenderer Component
 * Related code: harmony-graph/src/graph-engine.js, core/event-bus.js
 */

import { EventBus } from '../../core/event-bus.js';

/**
 * Cross-graph edge structure
 * @typedef {Object} CrossGraphEdge
 * @property {string} id - Unique edge identifier
 * @property {string} sourceGraphId - Source graph ID
 * @property {string} sourceNodeId - Source node ID within graph
 * @property {string} targetGraphId - Target graph ID
 * @property {string} targetNodeId - Target node ID within graph
 * @property {string} type - Edge type (data, control, event)
 * @property {Object} metadata - Additional edge metadata
 */

/**
 * UIRenderer component with cross-graph edge creation
 * Manages rendering pipeline and cross-graph reactivity
 */
export class UIRenderer {
  /**
   * @param {Object} options - Configuration options
   * @param {EventBus} options.eventBus - EventBus singleton instance
   * @param {HTMLElement} options.container - DOM container for rendering
   * @param {Object} options.config - Renderer configuration
   */
  constructor(options = {}) {
    if (!options.eventBus || !(options.eventBus instanceof EventBus)) {
      throw new Error('UIRenderer requires EventBus singleton instance');
    }

    if (!options.container || !(options.container instanceof HTMLElement)) {
      throw new Error('UIRenderer requires valid DOM container');
    }

    /** @private */
    this.eventBus = options.eventBus;

    /** @private */
    this.container = options.container;

    /** @private */
    this.config = {
      enableGPUAcceleration: true,
      maxRenderTime: 16, // 16ms budget for 60fps
      enableCrossGraphEdges: true,
      ...options.config
    };

    /**
     * Cross-graph edge index
     * Indexed by source graph ID for O(1) lookup
     * @private
     * @type {Map<string, Map<string, CrossGraphEdge>>}
     */
    this.edgeIndex = new Map();

    /**
     * Reverse edge index
     * Indexed by target graph ID for O(1) lookup
     * @private
     * @type {Map<string, Map<string, CrossGraphEdge>>}
     */
    this.reverseEdgeIndex = new Map();

    /**
     * Active graph instances
     * @private
     * @type {Map<string, Object>}
     */
    this.graphs = new Map();

    /**
     * Rendered component cache
     * @private
     * @type {Map<string, HTMLElement>}
     */
    this.componentCache = new Map();

    /**
     * Performance metrics
     * @private
     */
    this.metrics = {
      renderCount: 0,
      averageRenderTime: 0,
      edgeCount: 0,
      lastRenderTime: 0
    };

    this._initialize();
  }

  /**
   * Initialize renderer and subscribe to events
   * @private
   */
  _initialize() {
    // Subscribe to graph change events
    this.eventBus.subscribe('graph:changed', this._handleGraphChanged.bind(this));
    this.eventBus.subscribe('graph:node-added', this._handleNodeAdded.bind(this));
    this.eventBus.subscribe('graph:node-removed', this._handleNodeRemoved.bind(this));
    this.eventBus.subscribe('graph:edge-added', this._handleEdgeAdded.bind(this));
    this.eventBus.subscribe('graph:edge-removed', this._handleEdgeRemoved.bind(this));

    // Subscribe to rendering commands
    this.eventBus.subscribe('ui:render', this._handleRenderCommand.bind(this));
    this.eventBus.subscribe('ui:create-cross-graph-edge', this._handleCreateCrossGraphEdge.bind(this));

    console.log('[UIRenderer] Initialized with config:', this.config);
  }

  /**
   * Register a graph instance for rendering
   * @param {string} graphId - Unique graph identifier
   * @param {Object} graphInstance - Graph instance
   */
  registerGraph(graphId, graphInstance) {
    if (!graphId || typeof graphId !== 'string') {
      throw new Error('Invalid graphId: must be non-empty string');
    }

    if (!graphInstance || typeof graphInstance !== 'object') {
      throw new Error('Invalid graphInstance: must be object');
    }

    this.graphs.set(graphId, graphInstance);

    this.eventBus.publish({
      type: 'ui:graph-registered',
      payload: { graphId },
      source: 'UIRenderer'
    });

    console.log(`[UIRenderer] Registered graph: ${graphId}`);
  }

  /**
   * Unregister a graph instance
   * @param {string} graphId - Graph identifier
   */
  unregisterGraph(graphId) {
    if (!this.graphs.has(graphId)) {
      console.warn(`[UIRenderer] Graph not found: ${graphId}`);
      return;
    }

    // Remove all edges associated with this graph
    this._removeGraphEdges(graphId);

    this.graphs.delete(graphId);

    this.eventBus.publish({
      type: 'ui:graph-unregistered',
      payload: { graphId },
      source: 'UIRenderer'
    });

    console.log(`[UIRenderer] Unregistered graph: ${graphId}`);
  }

  /**
   * Create a cross-graph edge
   * @param {CrossGraphEdge} edge - Edge definition
   * @returns {string} Edge ID
   */
  createCrossGraphEdge(edge) {
    const startTime = performance.now();

    // Validate edge structure
    if (!this._validateEdge(edge)) {
      throw new Error('Invalid edge structure');
    }

    // Check if graphs exist
    if (!this.graphs.has(edge.sourceGraphId)) {
      throw new Error(`Source graph not found: ${edge.sourceGraphId}`);
    }

    if (!this.graphs.has(edge.targetGraphId)) {
      throw new Error(`Target graph not found: ${edge.targetGraphId}`);
    }

    // Generate edge ID if not provided
    const edgeId = edge.id || this._generateEdgeId(edge);

    const crossGraphEdge = {
      ...edge,
      id: edgeId,
      createdAt: Date.now()
    };

    // Add to forward index
    if (!this.edgeIndex.has(edge.sourceGraphId)) {
      this.edgeIndex.set(edge.sourceGraphId, new Map());
    }
    this.edgeIndex.get(edge.sourceGraphId).set(edgeId, crossGraphEdge);

    // Add to reverse index
    if (!this.reverseEdgeIndex.has(edge.targetGraphId)) {
      this.reverseEdgeIndex.set(edge.targetGraphId, new Map());
    }
    this.reverseEdgeIndex.get(edge.targetGraphId).set(edgeId, crossGraphEdge);

    this.metrics.edgeCount++;

    const duration = performance.now() - startTime;

    this.eventBus.publish({
      type: 'ui:cross-graph-edge-created',
      payload: {
        edgeId,
        sourceGraphId: edge.sourceGraphId,
        targetGraphId: edge.targetGraphId,
        duration
      },
      source: 'UIRenderer'
    });

    console.log(`[UIRenderer] Created cross-graph edge: ${edgeId} (${duration.toFixed(2)}ms)`);

    return edgeId;
  }

  /**
   * Remove a cross-graph edge
   * @param {string} edgeId - Edge identifier
   * @returns {boolean} Success status
   */
  removeCrossGraphEdge(edgeId) {
    let removed = false;

    // Search forward index
    for (const [graphId, edges] of this.edgeIndex.entries()) {
      if (edges.has(edgeId)) {
        const edge = edges.get(edgeId);
        edges.delete(edgeId);

        // Clean up empty maps
        if (edges.size === 0) {
          this.edgeIndex.delete(graphId);
        }

        // Remove from reverse index
        if (this.reverseEdgeIndex.has(edge.targetGraphId)) {
          this.reverseEdgeIndex.get(edge.targetGraphId).delete(edgeId);
          if (this.reverseEdgeIndex.get(edge.targetGraphId).size === 0) {
            this.reverseEdgeIndex.delete(edge.targetGraphId);
          }
        }

        this.metrics.edgeCount--;
        removed = true;

        this.eventBus.publish({
          type: 'ui:cross-graph-edge-removed',
          payload: { edgeId },
          source: 'UIRenderer'
        });

        console.log(`[UIRenderer] Removed cross-graph edge: ${edgeId}`);
        break;
      }
    }

    return removed;
  }

  /**
   * Get all edges from a source graph
   * @param {string} sourceGraphId - Source graph ID
   * @returns {CrossGraphEdge[]} Array of edges
   */
  getEdgesFromGraph(sourceGraphId) {
    if (!this.edgeIndex.has(sourceGraphId)) {
      return [];
    }

    return Array.from(this.edgeIndex.get(sourceGraphId).values());
  }

  /**
   * Get all edges to a target graph
   * @param {string} targetGraphId - Target graph ID
   * @returns {CrossGraphEdge[]} Array of edges
   */
  getEdgesToGraph(targetGraphId) {
    if (!this.reverseEdgeIndex.has(targetGraphId)) {
      return [];
    }

    return Array.from(this.reverseEdgeIndex.get(targetGraphId).values());
  }

  /**
   * Render a component from a graph node
   * @param {string} graphId - Graph identifier
   * @param {string} nodeId - Node identifier
   * @param {Object} options - Render options
   * @returns {HTMLElement} Rendered component
   */
  render(graphId, nodeId, options = {}) {
    const startTime = performance.now();

    if (!this.graphs.has(graphId)) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const graph = this.graphs.get(graphId);
    const node = this._getNodeFromGraph(graph, nodeId);

    if (!node) {
      throw new Error(`Node not found: ${nodeId} in graph ${graphId}`);
    }

    // Check cache
    const cacheKey = `${graphId}:${nodeId}`;
    if (this.componentCache.has(cacheKey) && !options.forceRender) {
      console.log(`[UIRenderer] Using cached component: ${cacheKey}`);
      return this.componentCache.get(cacheKey);
    }

    // Assemble component from node
    const component = this._assembleComponent(node, options);

    // Apply GPU acceleration if enabled
    if (this.config.enableGPUAcceleration) {
      this._applyGPUAcceleration(component);
    }

    // Cache component
    this.componentCache.set(cacheKey, component);

    // Update metrics
    const duration = performance.now() - startTime;
    this.metrics.renderCount++;
    this.metrics.lastRenderTime = duration;
    this.metrics.averageRenderTime =
      (this.metrics.averageRenderTime * (this.metrics.renderCount - 1) + duration) /
      this.metrics.renderCount;

    // Check performance budget
    if (duration > this.config.maxRenderTime) {
      console.warn(
        `[UIRenderer] Render exceeded budget: ${duration.toFixed(2)}ms > ${this.config.maxRenderTime}ms`
      );
    }

    this.eventBus.publish({
      type: 'ui:component-rendered',
      payload: {
        graphId,
        nodeId,
        duration,
        cacheHit: false
      },
      source: 'UIRenderer'
    });

    return component;
  }

  /**
   * Render all components in container
   * @param {string} graphId - Graph identifier
   * @param {Object} options - Render options
   */
  renderAll(graphId, options = {}) {
    const startTime = performance.now();

    if (!this.graphs.has(graphId)) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const graph = this.graphs.get(graphId);
    const nodes = this._getAllNodesFromGraph(graph);

    // Clear container
    this.container.innerHTML = '';

    // Render each node
    const fragment = document.createDocumentFragment();
    for (const node of nodes) {
      const component = this.render(graphId, node.id, options);
      fragment.appendChild(component);
    }

    this.container.appendChild(fragment);

    const duration = performance.now() - startTime;

    this.eventBus.publish({
      type: 'ui:all-components-rendered',
      payload: {
        graphId,
        nodeCount: nodes.length,
        duration
      },
      source: 'UIRenderer'
    });

    console.log(`[UIRenderer] Rendered ${nodes.length} components in ${duration.toFixed(2)}ms`);
  }

  /**
   * Get renderer metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Clear component cache
   */
  clearCache() {
    this.componentCache.clear();
    console.log('[UIRenderer] Cache cleared');
  }

  /**
   * Validate edge structure
   * @private
   * @param {CrossGraphEdge} edge - Edge to validate
   * @returns {boolean} Validation result
   */
  _validateEdge(edge) {
    if (!edge || typeof edge !== 'object') {
      return false;
    }

    const required = ['sourceGraphId', 'sourceNodeId', 'targetGraphId', 'targetNodeId', 'type'];
    for (const field of required) {
      if (!edge[field] || typeof edge[field] !== 'string') {
        console.error(`[UIRenderer] Invalid edge: missing or invalid ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Generate unique edge ID
   * @private
   * @param {CrossGraphEdge} edge - Edge definition
   * @returns {string} Generated ID
   */
  _generateEdgeId(edge) {
    return `edge_${edge.sourceGraphId}_${edge.sourceNodeId}_${edge.targetGraphId}_${edge.targetNodeId}_${Date.now()}`;
  }

  /**
   * Remove all edges associated with a graph
   * @private
   * @param {string} graphId - Graph identifier
   */
  _removeGraphEdges(graphId) {
    // Remove edges where graph is source
    if (this.edgeIndex.has(graphId)) {
      const edges = Array.from(this.edgeIndex.get(graphId).keys());
      for (const edgeId of edges) {
        this.removeCrossGraphEdge(edgeId);
      }
    }

    // Remove edges where graph is target
    if (this.reverseEdgeIndex.has(graphId)) {
      const edges = Array.from(this.reverseEdgeIndex.get(graphId).keys());
      for (const edgeId of edges) {
        this.removeCrossGraphEdge(edgeId);
      }
    }
  }

  /**
   * Get node from graph instance
   * @private
   * @param {Object} graph - Graph instance
   * @param {string} nodeId - Node identifier
   * @returns {Object|null} Node data
   */
  _getNodeFromGraph(graph, nodeId) {
    // Adapter for different graph implementations
    if (typeof graph.getNode === 'function') {
      return graph.getNode(nodeId);
    }

    if (graph.nodes && graph.nodes.has) {
      return graph.nodes.get(nodeId);
    }

    if (Array.isArray(graph.nodes)) {
      return graph.nodes.find(n => n.id === nodeId);
    }

    return null;
  }

  /**
   * Get all nodes from graph instance
   * @private
   * @param {Object} graph - Graph instance
   * @returns {Array} Array of nodes
   */
  _getAllNodesFromGraph(graph) {
    if (typeof graph.getAllNodes === 'function') {
      return graph.getAllNodes();
    }

    if (graph.nodes && graph.nodes.values) {
      return Array.from(graph.nodes.values());
    }

    if (Array.isArray(graph.nodes)) {
      return graph.nodes;
    }

    return [];
  }

  /**
   * Assemble component from node data
   * @private
   * @param {Object} node - Node data
   * @param {Object} options - Assembly options
   * @returns {HTMLElement} Assembled component
   */
  _assembleComponent(node, options = {}) {
    // Create container element
    const element = document.createElement(node.tagName || 'div');
    element.id = node.id;

    // Apply node properties
    if (node.className) {
      element.className = node.className;
    }

    if (node.attributes) {
      for (const [key, value] of Object.entries(node.attributes)) {
        element.setAttribute(key, value);
      }
    }

    if (node.styles) {
      Object.assign(element.style, node.styles);
    }

    // Set content
    if (node.textContent) {
      element.textContent = node.textContent;
    } else if (node.innerHTML) {
      element.innerHTML = node.innerHTML;
    }

    // Attach event listeners
    if (node.events) {
      for (const [eventType, handler] of Object.entries(node.events)) {
        element.addEventListener(eventType, handler);
      }
    }

    return element;
  }

  /**
   * Apply GPU acceleration to component
   * @private
   * @param {HTMLElement} element - Component element
   */
  _applyGPUAcceleration(element) {
    // Force GPU layer creation
    element.style.willChange = 'transform';
    element.style.transform = 'translateZ(0)';
  }

  /**
   * Handle graph changed event
   * @private
   * @param {Object} event - Event data
   */
  _handleGraphChanged(event) {
    const { graphId } = event.payload;
    console.log(`[UIRenderer] Graph changed: ${graphId}`);

    // Invalidate cache for this graph
    for (const [key] of this.componentCache.entries()) {
      if (key.startsWith(`${graphId}:`)) {
        this.componentCache.delete(key);
      }
    }
  }

  /**
   * Handle node added event
   * @private
   * @param {Object} event - Event data
   */
  _handleNodeAdded(event) {
    const { graphId, nodeId } = event.payload;
    console.log(`[UIRenderer] Node added: ${nodeId} in graph ${graphId}`);
  }

  /**
   * Handle node removed event
   * @private
   * @param {Object} event - Event data
   */
  _handleNodeRemoved(event) {
    const { graphId, nodeId } = event.payload;
    console.log(`[UIRenderer] Node removed: ${nodeId} from graph ${graphId}`);

    // Remove from cache
    const cacheKey = `${graphId}:${nodeId}`;
    this.componentCache.delete(cacheKey);
  }

  /**
   * Handle edge added event
   * @private
   * @param {Object} event - Event data
   */
  _handleEdgeAdded(event) {
    console.log('[UIRenderer] Edge added:', event.payload);
  }

  /**
   * Handle edge removed event
   * @private
   * @param {Object} event - Event data
   */
  _handleEdgeRemoved(event) {
    console.log('[UIRenderer] Edge removed:', event.payload);
  }

  /**
   * Handle render command event
   * @private
   * @param {Object} event - Event data
   */
  _handleRenderCommand(event) {
    const { graphId, nodeId, options } = event.payload;

    try {
      if (nodeId) {
        this.render(graphId, nodeId, options);
      } else {
        this.renderAll(graphId, options);
      }
    } catch (error) {
      console.error('[UIRenderer] Render command failed:', error);
      this.eventBus.publish({
        type: 'ui:render-error',
        payload: {
          graphId,
          nodeId,
          error: error.message
        },
        source: 'UIRenderer'
      });
    }
  }

  /**
   * Handle create cross-graph edge command
   * @private
   * @param {Object} event - Event data
   */
  _handleCreateCrossGraphEdge(event) {
    const edge = event.payload;

    try {
      const edgeId = this.createCrossGraphEdge(edge);
      console.log(`[UIRenderer] Cross-graph edge created: ${edgeId}`);
    } catch (error) {
      console.error('[UIRenderer] Failed to create cross-graph edge:', error);
      this.eventBus.publish({
        type: 'ui:cross-graph-edge-error',
        payload: {
          edge,
          error: error.message
        },
        source: 'UIRenderer'
      });
    }
  }

  /**
   * Dispose renderer and cleanup resources
   */
  dispose() {
    // Clear all edges
    this.edgeIndex.clear();
    this.reverseEdgeIndex.clear();

    // Clear graphs
    this.graphs.clear();

    // Clear cache
    this.componentCache.clear();

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('[UIRenderer] Disposed');
  }
}