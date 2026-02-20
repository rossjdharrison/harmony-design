/**
 * @fileoverview GraphVisualizer - Generate visual representation of graph structure
 * @module harmony-graph/graph-visualizer
 * 
 * Renders graph structures as interactive SVG visualizations with support for:
 * - Force-directed layout
 * - Hierarchical layout
 * - Circular layout
 * - Custom node/edge rendering
 * - Interactive pan/zoom
 * - Performance-optimized rendering (16ms budget)
 * 
 * @see DESIGN_SYSTEM.md#graph-visualizer
 */

import { EventBus } from '../core/event-bus.js';
import { GraphIntrospector } from './graph-introspector.js';

/**
 * Layout algorithms for graph visualization
 * @enum {string}
 */
export const LayoutType = {
  FORCE_DIRECTED: 'force-directed',
  HIERARCHICAL: 'hierarchical',
  CIRCULAR: 'circular',
  GRID: 'grid'
};

/**
 * Visual representation generator for graph structures
 * 
 * @class GraphVisualizer
 * @example
 * const visualizer = new GraphVisualizer({
 *   width: 800,
 *   height: 600,
 *   layout: LayoutType.FORCE_DIRECTED
 * });
 * 
 * const svg = visualizer.render(graph);
 * document.body.appendChild(svg);
 */
export class GraphVisualizer {
  /**
   * @param {Object} options - Visualization options
   * @param {number} [options.width=800] - Canvas width in pixels
   * @param {number} [options.height=600] - Canvas height in pixels
   * @param {LayoutType} [options.layout=LayoutType.FORCE_DIRECTED] - Layout algorithm
   * @param {Object} [options.nodeStyle] - Default node styling
   * @param {Object} [options.edgeStyle] - Default edge styling
   * @param {boolean} [options.interactive=true] - Enable pan/zoom interactions
   * @param {number} [options.animationDuration=300] - Animation duration in ms
   */
  constructor(options = {}) {
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.layout = options.layout || LayoutType.FORCE_DIRECTED;
    this.interactive = options.interactive !== false;
    this.animationDuration = options.animationDuration || 300;
    
    this.nodeStyle = {
      radius: 20,
      fill: '#4A90E2',
      stroke: '#2E5C8A',
      strokeWidth: 2,
      ...options.nodeStyle
    };
    
    this.edgeStyle = {
      stroke: '#999',
      strokeWidth: 1.5,
      opacity: 0.6,
      ...options.edgeStyle
    };
    
    this.introspector = new GraphIntrospector();
    this.transform = { x: 0, y: 0, scale: 1 };
    this.isDragging = false;
    this.selectedNode = null;
    
    // Performance tracking
    this.renderStartTime = 0;
    this.lastFrameTime = 0;
  }
  
  /**
   * Render graph to SVG element
   * 
   * @param {Object} graph - Graph structure to visualize
   * @returns {SVGElement} SVG element containing visualization
   * @throws {Error} If rendering exceeds 16ms budget
   */
  render(graph) {
    this.renderStartTime = performance.now();
    
    // Analyze graph structure
    const analysis = this.introspector.analyzeStructure(graph);
    
    // Calculate node positions based on layout
    const positions = this._calculateLayout(graph, analysis);
    
    // Create SVG container
    const svg = this._createSVGContainer();
    
    // Create layers for proper z-ordering
    const edgeLayer = this._createGroup(svg, 'edges');
    const nodeLayer = this._createGroup(svg, 'nodes');
    const labelLayer = this._createGroup(svg, 'labels');
    
    // Render edges
    this._renderEdges(edgeLayer, graph, positions);
    
    // Render nodes
    this._renderNodes(nodeLayer, graph, positions);
    
    // Render labels
    this._renderLabels(labelLayer, graph, positions);
    
    // Add interactions if enabled
    if (this.interactive) {
      this._addInteractions(svg, nodeLayer);
    }
    
    // Verify performance budget
    const renderTime = performance.now() - this.renderStartTime;
    if (renderTime > 16) {
      console.warn(`GraphVisualizer: Render exceeded 16ms budget (${renderTime.toFixed(2)}ms)`);
    }
    
    // Publish render event
    EventBus.publish('GraphVisualizer:Rendered', {
      nodeCount: analysis.nodeCount,
      edgeCount: analysis.edgeCount,
      renderTime,
      layout: this.layout
    });
    
    return svg;
  }
  
  /**
   * Calculate node positions using selected layout algorithm
   * 
   * @private
   * @param {Object} graph - Graph structure
   * @param {Object} analysis - Graph analysis from introspector
   * @returns {Map<string, {x: number, y: number}>} Node positions
   */
  _calculateLayout(graph, analysis) {
    const positions = new Map();
    
    switch (this.layout) {
      case LayoutType.FORCE_DIRECTED:
        return this._forceDirectedLayout(graph, analysis);
      case LayoutType.HIERARCHICAL:
        return this._hierarchicalLayout(graph, analysis);
      case LayoutType.CIRCULAR:
        return this._circularLayout(graph, analysis);
      case LayoutType.GRID:
        return this._gridLayout(graph, analysis);
      default:
        throw new Error(`Unknown layout type: ${this.layout}`);
    }
  }
  
  /**
   * Force-directed layout using simplified physics simulation
   * 
   * @private
   * @param {Object} graph - Graph structure
   * @param {Object} analysis - Graph analysis
   * @returns {Map<string, {x: number, y: number}>} Node positions
   */
  _forceDirectedLayout(graph, analysis) {
    const positions = new Map();
    const velocities = new Map();
    const nodes = Array.from(graph.nodes.keys());
    
    // Initialize random positions
    nodes.forEach(nodeId => {
      positions.set(nodeId, {
        x: Math.random() * this.width,
        y: Math.random() * this.height
      });
      velocities.set(nodeId, { x: 0, y: 0 });
    });
    
    // Simulation parameters
    const iterations = 50;
    const repulsionStrength = 1000;
    const attractionStrength = 0.01;
    const damping = 0.8;
    
    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
      // Calculate repulsion forces (all pairs)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          const pos1 = positions.get(node1);
          const pos2 = positions.get(node2);
          
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distSq = dx * dx + dy * dy + 0.01; // Avoid division by zero
          const dist = Math.sqrt(distSq);
          
          const force = repulsionStrength / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          const vel1 = velocities.get(node1);
          const vel2 = velocities.get(node2);
          vel1.x -= fx;
          vel1.y -= fy;
          vel2.x += fx;
          vel2.y += fy;
        }
      }
      
      // Calculate attraction forces (edges)
      graph.edges.forEach(edge => {
        const pos1 = positions.get(edge.source);
        const pos2 = positions.get(edge.target);
        
        if (!pos1 || !pos2) return;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const force = dist * attractionStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        const vel1 = velocities.get(edge.source);
        const vel2 = velocities.get(edge.target);
        vel1.x += fx;
        vel1.y += fy;
        vel2.x -= fx;
        vel2.y -= fy;
      });
      
      // Update positions
      nodes.forEach(nodeId => {
        const pos = positions.get(nodeId);
        const vel = velocities.get(nodeId);
        
        pos.x += vel.x;
        pos.y += vel.y;
        
        // Apply damping
        vel.x *= damping;
        vel.y *= damping;
        
        // Keep within bounds
        pos.x = Math.max(50, Math.min(this.width - 50, pos.x));
        pos.y = Math.max(50, Math.min(this.height - 50, pos.y));
      });
    }
    
    return positions;
  }
  
  /**
   * Hierarchical layout for directed acyclic graphs
   * 
   * @private
   * @param {Object} graph - Graph structure
   * @param {Object} analysis - Graph analysis
   * @returns {Map<string, {x: number, y: number}>} Node positions
   */
  _hierarchicalLayout(graph, analysis) {
    const positions = new Map();
    const layers = this._assignLayers(graph);
    
    const layerHeight = this.height / (layers.length + 1);
    
    layers.forEach((nodeIds, layerIndex) => {
      const layerWidth = this.width / (nodeIds.length + 1);
      
      nodeIds.forEach((nodeId, nodeIndex) => {
        positions.set(nodeId, {
          x: layerWidth * (nodeIndex + 1),
          y: layerHeight * (layerIndex + 1)
        });
      });
    });
    
    return positions;
  }
  
  /**
   * Assign nodes to layers for hierarchical layout
   * 
   * @private
   * @param {Object} graph - Graph structure
   * @returns {Array<Array<string>>} Layers of node IDs
   */
  _assignLayers(graph) {
    const layers = [];
    const visited = new Set();
    const inDegree = new Map();
    
    // Calculate in-degrees
    graph.nodes.forEach((_, nodeId) => {
      inDegree.set(nodeId, 0);
    });
    
    graph.edges.forEach(edge => {
      const current = inDegree.get(edge.target) || 0;
      inDegree.set(edge.target, current + 1);
    });
    
    // Assign layers using topological sort
    while (visited.size < graph.nodes.size) {
      const currentLayer = [];
      
      graph.nodes.forEach((_, nodeId) => {
        if (!visited.has(nodeId) && inDegree.get(nodeId) === 0) {
          currentLayer.push(nodeId);
        }
      });
      
      if (currentLayer.length === 0) {
        // Graph has cycles, add remaining nodes
        graph.nodes.forEach((_, nodeId) => {
          if (!visited.has(nodeId)) {
            currentLayer.push(nodeId);
          }
        });
      }
      
      currentLayer.forEach(nodeId => {
        visited.add(nodeId);
        
        // Reduce in-degree of neighbors
        graph.edges.forEach(edge => {
          if (edge.source === nodeId) {
            const current = inDegree.get(edge.target);
            inDegree.set(edge.target, current - 1);
          }
        });
      });
      
      layers.push(currentLayer);
    }
    
    return layers;
  }
  
  /**
   * Circular layout arranging nodes in a circle
   * 
   * @private
   * @param {Object} graph - Graph structure
   * @param {Object} analysis - Graph analysis
   * @returns {Map<string, {x: number, y: number}>} Node positions
   */
  _circularLayout(graph, analysis) {
    const positions = new Map();
    const nodes = Array.from(graph.nodes.keys());
    const radius = Math.min(this.width, this.height) * 0.4;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    nodes.forEach((nodeId, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      positions.set(nodeId, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    });
    
    return positions;
  }
  
  /**
   * Grid layout arranging nodes in a grid
   * 
   * @private
   * @param {Object} graph - Graph structure
   * @param {Object} analysis - Graph analysis
   * @returns {Map<string, {x: number, y: number}>} Node positions
   */
  _gridLayout(graph, analysis) {
    const positions = new Map();
    const nodes = Array.from(graph.nodes.keys());
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    
    const cellWidth = this.width / (cols + 1);
    const cellHeight = this.height / (rows + 1);
    
    nodes.forEach((nodeId, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      positions.set(nodeId, {
        x: cellWidth * (col + 1),
        y: cellHeight * (row + 1)
      });
    });
    
    return positions;
  }
  
  /**
   * Create SVG container element
   * 
   * @private
   * @returns {SVGElement} SVG container
   */
  _createSVGContainer() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', this.width);
    svg.setAttribute('height', this.height);
    svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    svg.style.border = '1px solid #ccc';
    svg.style.background = '#fff';
    
    return svg;
  }
  
  /**
   * Create SVG group element
   * 
   * @private
   * @param {SVGElement} parent - Parent element
   * @param {string} className - CSS class name
   * @returns {SVGGElement} Group element
   */
  _createGroup(parent, className) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', className);
    parent.appendChild(g);
    return g;
  }
  
  /**
   * Render graph edges
   * 
   * @private
   * @param {SVGGElement} container - Container for edges
   * @param {Object} graph - Graph structure
   * @param {Map} positions - Node positions
   */
  _renderEdges(container, graph, positions) {
    graph.edges.forEach((edge, index) => {
      const sourcePos = positions.get(edge.source);
      const targetPos = positions.get(edge.target);
      
      if (!sourcePos || !targetPos) return;
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', sourcePos.x);
      line.setAttribute('y1', sourcePos.y);
      line.setAttribute('x2', targetPos.x);
      line.setAttribute('y2', targetPos.y);
      line.setAttribute('stroke', this.edgeStyle.stroke);
      line.setAttribute('stroke-width', this.edgeStyle.strokeWidth);
      line.setAttribute('opacity', this.edgeStyle.opacity);
      line.setAttribute('data-edge-index', index);
      
      // Add arrow marker for directed edges
      if (edge.directed !== false) {
        this._addArrowMarker(line, sourcePos, targetPos);
      }
      
      container.appendChild(line);
    });
  }
  
  /**
   * Add arrow marker to edge
   * 
   * @private
   * @param {SVGLineElement} line - Edge line element
   * @param {Object} sourcePos - Source position
   * @param {Object} targetPos - Target position
   */
  _addArrowMarker(line, sourcePos, targetPos) {
    // Calculate arrow position (at target, offset by node radius)
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;
    
    const unitX = dx / length;
    const unitY = dy / length;
    
    const arrowSize = 8;
    const arrowX = targetPos.x - unitX * (this.nodeStyle.radius + arrowSize);
    const arrowY = targetPos.y - unitY * (this.nodeStyle.radius + arrowSize);
    
    // Create arrow path
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const perpX = -unitY * arrowSize / 2;
    const perpY = unitX * arrowSize / 2;
    
    const d = `M ${arrowX + perpX} ${arrowY + perpY} L ${arrowX + unitX * arrowSize} ${arrowY + unitY * arrowSize} L ${arrowX - perpX} ${arrowY - perpY}`;
    arrow.setAttribute('d', d);
    arrow.setAttribute('fill', this.edgeStyle.stroke);
    
    line.parentNode.appendChild(arrow);
  }
  
  /**
   * Render graph nodes
   * 
   * @private
   * @param {SVGGElement} container - Container for nodes
   * @param {Object} graph - Graph structure
   * @param {Map} positions - Node positions
   */
  _renderNodes(container, graph, positions) {
    graph.nodes.forEach((node, nodeId) => {
      const pos = positions.get(nodeId);
      if (!pos) return;
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', this.nodeStyle.radius);
      circle.setAttribute('fill', node.color || this.nodeStyle.fill);
      circle.setAttribute('stroke', this.nodeStyle.stroke);
      circle.setAttribute('stroke-width', this.nodeStyle.strokeWidth);
      circle.setAttribute('data-node-id', nodeId);
      circle.style.cursor = 'pointer';
      
      container.appendChild(circle);
    });
  }
  
  /**
   * Render node labels
   * 
   * @private
   * @param {SVGGElement} container - Container for labels
   * @param {Object} graph - Graph structure
   * @param {Map} positions - Node positions
   */
  _renderLabels(container, graph, positions) {
    graph.nodes.forEach((node, nodeId) => {
      const pos = positions.get(nodeId);
      if (!pos) return;
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y + this.nodeStyle.radius + 15);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#333');
      text.textContent = node.label || nodeId;
      
      container.appendChild(text);
    });
  }
  
  /**
   * Add interactive behaviors (pan, zoom, node selection)
   * 
   * @private
   * @param {SVGElement} svg - SVG container
   * @param {SVGGElement} nodeLayer - Node layer
   */
  _addInteractions(svg, nodeLayer) {
    // Pan and zoom
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    
    svg.addEventListener('mousedown', (e) => {
      if (e.target === svg) {
        isPanning = true;
        startX = e.clientX - this.transform.x;
        startY = e.clientY - this.transform.y;
        svg.style.cursor = 'grabbing';
      }
    });
    
    svg.addEventListener('mousemove', (e) => {
      if (isPanning) {
        this.transform.x = e.clientX - startX;
        this.transform.y = e.clientY - startY;
        this._applyTransform(svg);
      }
    });
    
    svg.addEventListener('mouseup', () => {
      isPanning = false;
      svg.style.cursor = 'default';
    });
    
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.transform.scale *= delta;
      this.transform.scale = Math.max(0.1, Math.min(5, this.transform.scale));
      this._applyTransform(svg);
    });
    
    // Node selection
    nodeLayer.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-node-id')) {
        const nodeId = e.target.getAttribute('data-node-id');
        this._selectNode(nodeId, e.target);
        
        EventBus.publish('GraphVisualizer:NodeSelected', { nodeId });
      }
    });
  }
  
  /**
   * Apply transform to SVG
   * 
   * @private
   * @param {SVGElement} svg - SVG container
   */
  _applyTransform(svg) {
    const groups = svg.querySelectorAll('g');
    groups.forEach(g => {
      g.setAttribute('transform', 
        `translate(${this.transform.x}, ${this.transform.y}) scale(${this.transform.scale})`
      );
    });
  }
  
  /**
   * Select a node visually
   * 
   * @private
   * @param {string} nodeId - Node ID
   * @param {SVGElement} element - Node element
   */
  _selectNode(nodeId, element) {
    // Deselect previous
    if (this.selectedNode) {
      this.selectedNode.setAttribute('stroke-width', this.nodeStyle.strokeWidth);
    }
    
    // Select new
    element.setAttribute('stroke-width', this.nodeStyle.strokeWidth * 2);
    this.selectedNode = element;
  }
  
  /**
   * Export visualization as PNG image
   * 
   * @param {SVGElement} svg - SVG element to export
   * @returns {Promise<Blob>} PNG image blob
   */
  async exportToPNG(svg) {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(resolve, 'image/png');
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    });
  }
  
  /**
   * Update visualization with new layout
   * 
   * @param {LayoutType} newLayout - New layout algorithm
   * @param {SVGElement} svg - Existing SVG element
   * @param {Object} graph - Graph structure
   */
  updateLayout(newLayout, svg, graph) {
    this.layout = newLayout;
    const newSvg = this.render(graph);
    svg.replaceWith(newSvg);
    return newSvg;
  }
}