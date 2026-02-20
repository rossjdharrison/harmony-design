/**
 * @fileoverview Graph Test Fixtures
 * @module tests/fixtures/graph-fixtures
 * 
 * Pre-built graph structures for testing graph algorithms.
 * Provides common graph patterns: DAGs, cyclic graphs, trees, disconnected graphs.
 * 
 * Related: harmony-graph/, DESIGN_SYSTEM.md#graph-system
 */

/**
 * Creates a simple linear graph: A -> B -> C
 * Useful for testing basic traversal and path finding
 * 
 * @returns {Object} Graph structure with nodes and edges
 */
export function createLinearGraph() {
  return {
    nodes: [
      { id: 'A', type: 'start', data: { value: 1 } },
      { id: 'B', type: 'middle', data: { value: 2 } },
      { id: 'C', type: 'end', data: { value: 3 } }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 1 },
      { id: 'e2', source: 'B', target: 'C', weight: 1 }
    ],
    metadata: {
      type: 'linear',
      nodeCount: 3,
      edgeCount: 2,
      isAcyclic: true,
      isConnected: true
    }
  };
}

/**
 * Creates a simple tree structure
 *        A
 *       / \
 *      B   C
 *     / \
 *    D   E
 * 
 * @returns {Object} Tree graph structure
 */
export function createTreeGraph() {
  return {
    nodes: [
      { id: 'A', type: 'root', data: { level: 0 } },
      { id: 'B', type: 'branch', data: { level: 1 } },
      { id: 'C', type: 'branch', data: { level: 1 } },
      { id: 'D', type: 'leaf', data: { level: 2 } },
      { id: 'E', type: 'leaf', data: { level: 2 } }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 1 },
      { id: 'e2', source: 'A', target: 'C', weight: 1 },
      { id: 'e3', source: 'B', target: 'D', weight: 1 },
      { id: 'e4', source: 'B', target: 'E', weight: 1 }
    ],
    metadata: {
      type: 'tree',
      nodeCount: 5,
      edgeCount: 4,
      isAcyclic: true,
      isConnected: true,
      maxDepth: 2
    }
  };
}

/**
 * Creates a cyclic graph for testing cycle detection
 *    A -> B
 *    ^    |
 *    |    v
 *    D <- C
 * 
 * @returns {Object} Cyclic graph structure
 */
export function createCyclicGraph() {
  return {
    nodes: [
      { id: 'A', type: 'node', data: {} },
      { id: 'B', type: 'node', data: {} },
      { id: 'C', type: 'node', data: {} },
      { id: 'D', type: 'node', data: {} }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 1 },
      { id: 'e2', source: 'B', target: 'C', weight: 1 },
      { id: 'e3', source: 'C', target: 'D', weight: 1 },
      { id: 'e4', source: 'D', target: 'A', weight: 1 }
    ],
    metadata: {
      type: 'cyclic',
      nodeCount: 4,
      edgeCount: 4,
      isAcyclic: false,
      isConnected: true,
      cycles: [['A', 'B', 'C', 'D']]
    }
  };
}

/**
 * Creates a DAG (Directed Acyclic Graph) suitable for topological sorting
 *    A -> B -> D
 *    |    |
 *    v    v
 *    C -> E
 * 
 * @returns {Object} DAG structure
 */
export function createDAG() {
  return {
    nodes: [
      { id: 'A', type: 'source', data: { priority: 0 } },
      { id: 'B', type: 'process', data: { priority: 1 } },
      { id: 'C', type: 'process', data: { priority: 1 } },
      { id: 'D', type: 'sink', data: { priority: 2 } },
      { id: 'E', type: 'sink', data: { priority: 2 } }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 1 },
      { id: 'e2', source: 'A', target: 'C', weight: 1 },
      { id: 'e3', source: 'B', target: 'D', weight: 1 },
      { id: 'e4', source: 'B', target: 'E', weight: 1 },
      { id: 'e5', source: 'C', target: 'E', weight: 1 }
    ],
    metadata: {
      type: 'dag',
      nodeCount: 5,
      edgeCount: 5,
      isAcyclic: true,
      isConnected: true,
      topologicalOrder: ['A', 'B', 'C', 'D', 'E']
    }
  };
}

/**
 * Creates a disconnected graph with multiple components
 * Component 1: A -> B
 * Component 2: C -> D
 * Component 3: E (isolated)
 * 
 * @returns {Object} Disconnected graph structure
 */
export function createDisconnectedGraph() {
  return {
    nodes: [
      { id: 'A', type: 'node', data: { component: 1 } },
      { id: 'B', type: 'node', data: { component: 1 } },
      { id: 'C', type: 'node', data: { component: 2 } },
      { id: 'D', type: 'node', data: { component: 2 } },
      { id: 'E', type: 'node', data: { component: 3 } }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 1 },
      { id: 'e2', source: 'C', target: 'D', weight: 1 }
    ],
    metadata: {
      type: 'disconnected',
      nodeCount: 5,
      edgeCount: 2,
      isAcyclic: true,
      isConnected: false,
      componentCount: 3,
      components: [['A', 'B'], ['C', 'D'], ['E']]
    }
  };
}

/**
 * Creates a weighted graph for shortest path algorithms
 *      A --5-- B
 *      |       |
 *      2       1
 *      |       |
 *      C --3-- D
 * 
 * @returns {Object} Weighted graph structure
 */
export function createWeightedGraph() {
  return {
    nodes: [
      { id: 'A', type: 'node', data: { x: 0, y: 0 } },
      { id: 'B', type: 'node', data: { x: 10, y: 0 } },
      { id: 'C', type: 'node', data: { x: 0, y: 10 } },
      { id: 'D', type: 'node', data: { x: 10, y: 10 } }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 5 },
      { id: 'e2', source: 'A', target: 'C', weight: 2 },
      { id: 'e3', source: 'B', target: 'D', weight: 1 },
      { id: 'e4', source: 'C', target: 'D', weight: 3 }
    ],
    metadata: {
      type: 'weighted',
      nodeCount: 4,
      edgeCount: 4,
      isAcyclic: true,
      isConnected: true,
      shortestPath: {
        'A-D': { path: ['A', 'C', 'D'], distance: 5 },
        'A-B': { path: ['A', 'B'], distance: 5 }
      }
    }
  };
}

/**
 * Creates a complex DAG for stress testing
 * Multiple levels with cross-level connections
 * 
 * @returns {Object} Complex DAG structure
 */
export function createComplexDAG() {
  return {
    nodes: [
      { id: 'A1', type: 'input', data: { level: 0 } },
      { id: 'A2', type: 'input', data: { level: 0 } },
      { id: 'B1', type: 'process', data: { level: 1 } },
      { id: 'B2', type: 'process', data: { level: 1 } },
      { id: 'B3', type: 'process', data: { level: 1 } },
      { id: 'C1', type: 'process', data: { level: 2 } },
      { id: 'C2', type: 'process', data: { level: 2 } },
      { id: 'D1', type: 'output', data: { level: 3 } }
    ],
    edges: [
      { id: 'e1', source: 'A1', target: 'B1', weight: 1 },
      { id: 'e2', source: 'A1', target: 'B2', weight: 1 },
      { id: 'e3', source: 'A2', target: 'B2', weight: 1 },
      { id: 'e4', source: 'A2', target: 'B3', weight: 1 },
      { id: 'e5', source: 'B1', target: 'C1', weight: 1 },
      { id: 'e6', source: 'B2', target: 'C1', weight: 1 },
      { id: 'e7', source: 'B2', target: 'C2', weight: 1 },
      { id: 'e8', source: 'B3', target: 'C2', weight: 1 },
      { id: 'e9', source: 'C1', target: 'D1', weight: 1 },
      { id: 'e10', source: 'C2', target: 'D1', weight: 1 },
      { id: 'e11', source: 'A1', target: 'C1', weight: 2 } // Cross-level edge
    ],
    metadata: {
      type: 'complex-dag',
      nodeCount: 8,
      edgeCount: 11,
      isAcyclic: true,
      isConnected: true,
      maxDepth: 3
    }
  };
}

/**
 * Creates a diamond-shaped graph for testing merge points
 *      A
 *     / \
 *    B   C
 *     \ /
 *      D
 * 
 * @returns {Object} Diamond graph structure
 */
export function createDiamondGraph() {
  return {
    nodes: [
      { id: 'A', type: 'start', data: {} },
      { id: 'B', type: 'branch', data: {} },
      { id: 'C', type: 'branch', data: {} },
      { id: 'D', type: 'merge', data: {} }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 1 },
      { id: 'e2', source: 'A', target: 'C', weight: 1 },
      { id: 'e3', source: 'B', target: 'D', weight: 1 },
      { id: 'e4', source: 'C', target: 'D', weight: 1 }
    ],
    metadata: {
      type: 'diamond',
      nodeCount: 4,
      edgeCount: 4,
      isAcyclic: true,
      isConnected: true,
      mergePoints: ['D']
    }
  };
}

/**
 * Creates a graph with self-loops for testing edge cases
 * 
 * @returns {Object} Graph with self-loops
 */
export function createSelfLoopGraph() {
  return {
    nodes: [
      { id: 'A', type: 'node', data: {} },
      { id: 'B', type: 'node', data: {} },
      { id: 'C', type: 'node', data: {} }
    ],
    edges: [
      { id: 'e1', source: 'A', target: 'B', weight: 1 },
      { id: 'e2', source: 'B', target: 'B', weight: 1 }, // Self-loop
      { id: 'e3', source: 'B', target: 'C', weight: 1 },
      { id: 'e4', source: 'C', target: 'C', weight: 1 }  // Self-loop
    ],
    metadata: {
      type: 'self-loop',
      nodeCount: 3,
      edgeCount: 4,
      isAcyclic: false,
      isConnected: true,
      selfLoops: ['B', 'C']
    }
  };
}

/**
 * Creates a large graph for performance testing
 * 
 * @param {number} nodeCount - Number of nodes to create
 * @param {number} edgeDensity - Edge density (0-1)
 * @returns {Object} Large graph structure
 */
export function createLargeGraph(nodeCount = 100, edgeDensity = 0.1) {
  const nodes = [];
  const edges = [];
  
  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `N${i}`,
      type: 'node',
      data: { index: i }
    });
  }
  
  // Create edges based on density
  let edgeId = 0;
  for (let i = 0; i < nodeCount; i++) {
    const targetCount = Math.floor(edgeDensity * nodeCount);
    for (let j = 0; j < targetCount; j++) {
      const target = (i + j + 1) % nodeCount;
      if (target !== i) {
        edges.push({
          id: `e${edgeId++}`,
          source: `N${i}`,
          target: `N${target}`,
          weight: Math.random()
        });
      }
    }
  }
  
  return {
    nodes,
    edges,
    metadata: {
      type: 'large',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      isAcyclic: null, // Not computed for large graphs
      isConnected: null,
      density: edgeDensity
    }
  };
}

/**
 * Creates an audio processing graph fixture
 * Simulates typical audio node connections
 * 
 * @returns {Object} Audio graph structure
 */
export function createAudioGraph() {
  return {
    nodes: [
      { id: 'input', type: 'AudioInput', data: { channels: 2 } },
      { id: 'gain', type: 'GainNode', data: { gain: 0.8 } },
      { id: 'filter', type: 'FilterNode', data: { frequency: 1000, q: 1.0 } },
      { id: 'reverb', type: 'ReverbNode', data: { roomSize: 0.5, damping: 0.5 } },
      { id: 'output', type: 'AudioOutput', data: { channels: 2 } }
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'gain', weight: 1, data: { channel: 'stereo' } },
      { id: 'e2', source: 'gain', target: 'filter', weight: 1, data: { channel: 'stereo' } },
      { id: 'e3', source: 'filter', target: 'reverb', weight: 1, data: { channel: 'stereo' } },
      { id: 'e4', source: 'reverb', target: 'output', weight: 1, data: { channel: 'stereo' } }
    ],
    metadata: {
      type: 'audio',
      nodeCount: 5,
      edgeCount: 4,
      isAcyclic: true,
      isConnected: true,
      latency: 5.3, // ms
      sampleRate: 48000
    }
  };
}

/**
 * All available graph fixtures
 */
export const GRAPH_FIXTURES = {
  linear: createLinearGraph,
  tree: createTreeGraph,
  cyclic: createCyclicGraph,
  dag: createDAG,
  disconnected: createDisconnectedGraph,
  weighted: createWeightedGraph,
  complexDag: createComplexDAG,
  diamond: createDiamondGraph,
  selfLoop: createSelfLoopGraph,
  large: createLargeGraph,
  audio: createAudioGraph
};

/**
 * Gets a fixture by name
 * 
 * @param {string} name - Fixture name
 * @param {...any} args - Arguments to pass to fixture function
 * @returns {Object} Graph structure
 */
export function getFixture(name, ...args) {
  const fixture = GRAPH_FIXTURES[name];
  if (!fixture) {
    throw new Error(`Unknown fixture: ${name}`);
  }
  return fixture(...args);
}

/**
 * Validates a graph structure
 * 
 * @param {Object} graph - Graph to validate
 * @returns {Object} Validation result with errors array
 */
export function validateGraph(graph) {
  const errors = [];
  
  if (!graph.nodes || !Array.isArray(graph.nodes)) {
    errors.push('Graph must have nodes array');
  }
  
  if (!graph.edges || !Array.isArray(graph.edges)) {
    errors.push('Graph must have edges array');
  }
  
  if (graph.nodes && graph.edges) {
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    
    // Check for duplicate node IDs
    if (nodeIds.size !== graph.nodes.length) {
      errors.push('Duplicate node IDs detected');
    }
    
    // Check edge references
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references unknown source: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references unknown target: ${edge.target}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}