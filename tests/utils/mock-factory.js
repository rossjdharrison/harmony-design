/**
 * Mock Factory for Test Data Generation
 * 
 * Provides factory functions for generating consistent, realistic test data
 * for nodes, edges, events, and other graph entities.
 * 
 * @module tests/utils/mock-factory
 * @see {@link ../../DESIGN_SYSTEM.md#mock-factory}
 */

/**
 * Counter for generating unique IDs
 * @type {number}
 */
let idCounter = 0;

/**
 * Resets the ID counter (useful for test isolation)
 */
export function resetIdCounter() {
  idCounter = 0;
}

/**
 * Generates a unique ID with optional prefix
 * 
 * @param {string} [prefix='id'] - Prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}-${++idCounter}`;
}

/**
 * Creates a mock node with default or custom properties
 * 
 * @param {Object} [overrides={}] - Properties to override defaults
 * @param {string} [overrides.id] - Node ID
 * @param {string} [overrides.type] - Node type
 * @param {string} [overrides.label] - Node label
 * @param {Object} [overrides.position] - Node position {x, y}
 * @param {Object} [overrides.data] - Custom node data
 * @param {Object} [overrides.metadata] - Node metadata
 * @returns {Object} Mock node object
 * 
 * @example
 * const node = createMockNode({ type: 'audio-source', label: 'Oscillator' });
 */
export function createMockNode(overrides = {}) {
  const id = overrides.id || generateId('node');
  
  return {
    id,
    type: overrides.type || 'default',
    label: overrides.label || `Node ${id}`,
    position: overrides.position || { x: 0, y: 0 },
    data: overrides.data || {},
    metadata: {
      created: Date.now(),
      updated: Date.now(),
      version: 1,
      ...overrides.metadata
    },
    inputs: overrides.inputs || [],
    outputs: overrides.outputs || [],
    state: overrides.state || 'idle'
  };
}

/**
 * Creates a mock edge connecting two nodes
 * 
 * @param {Object} [overrides={}] - Properties to override defaults
 * @param {string} [overrides.id] - Edge ID
 * @param {string} [overrides.source] - Source node ID
 * @param {string} [overrides.target] - Target node ID
 * @param {string} [overrides.sourcePort] - Source port ID
 * @param {string} [overrides.targetPort] - Target port ID
 * @param {string} [overrides.type] - Edge type
 * @param {Object} [overrides.data] - Custom edge data
 * @returns {Object} Mock edge object
 * 
 * @example
 * const edge = createMockEdge({ 
 *   source: 'node-1', 
 *   target: 'node-2',
 *   type: 'audio' 
 * });
 */
export function createMockEdge(overrides = {}) {
  const id = overrides.id || generateId('edge');
  const source = overrides.source || generateId('node');
  const target = overrides.target || generateId('node');
  
  return {
    id,
    source,
    target,
    sourcePort: overrides.sourcePort || 'output',
    targetPort: overrides.targetPort || 'input',
    type: overrides.type || 'default',
    data: overrides.data || {},
    metadata: {
      created: Date.now(),
      weight: 1,
      ...overrides.metadata
    }
  };
}

/**
 * Creates a mock event for the EventBus
 * 
 * @param {string} type - Event type
 * @param {Object} [payload={}] - Event payload
 * @param {Object} [overrides={}] - Additional properties
 * @returns {Object} Mock event object
 * 
 * @example
 * const event = createMockEvent('NodeAdded', { nodeId: 'node-1' });
 */
export function createMockEvent(type, payload = {}, overrides = {}) {
  return {
    id: overrides.id || generateId('event'),
    type,
    payload,
    timestamp: overrides.timestamp || Date.now(),
    source: overrides.source || 'test',
    metadata: overrides.metadata || {}
  };
}

/**
 * Creates a mock audio node with audio-specific properties
 * 
 * @param {Object} [overrides={}] - Properties to override defaults
 * @returns {Object} Mock audio node object
 * 
 * @example
 * const oscillator = createMockAudioNode({ 
 *   type: 'oscillator',
 *   data: { frequency: 440 }
 * });
 */
export function createMockAudioNode(overrides = {}) {
  return createMockNode({
    type: overrides.type || 'audio-source',
    inputs: overrides.inputs || [],
    outputs: overrides.outputs || ['audio-out'],
    data: {
      sampleRate: 48000,
      bufferSize: 512,
      channels: 2,
      ...overrides.data
    },
    ...overrides
  });
}

/**
 * Creates a mock graph with nodes and edges
 * 
 * @param {Object} [options={}] - Graph configuration
 * @param {number} [options.nodeCount=3] - Number of nodes
 * @param {number} [options.edgeCount=2] - Number of edges
 * @param {string} [options.nodeType='default'] - Default node type
 * @param {string} [options.edgeType='default'] - Default edge type
 * @returns {Object} Mock graph with nodes and edges
 * 
 * @example
 * const graph = createMockGraph({ nodeCount: 5, edgeCount: 4 });
 */
export function createMockGraph(options = {}) {
  const {
    nodeCount = 3,
    edgeCount = 2,
    nodeType = 'default',
    edgeType = 'default'
  } = options;
  
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(createMockNode({
      type: nodeType,
      position: { x: i * 100, y: i * 50 }
    }));
  }
  
  const edges = [];
  for (let i = 0; i < Math.min(edgeCount, nodeCount - 1); i++) {
    edges.push(createMockEdge({
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: edgeType
    }));
  }
  
  return {
    id: generateId('graph'),
    nodes,
    edges,
    metadata: {
      created: Date.now(),
      version: 1
    }
  };
}

/**
 * Creates a mock audio graph with connected audio nodes
 * 
 * @param {Object} [options={}] - Graph configuration
 * @param {number} [options.nodeCount=3] - Number of audio nodes
 * @returns {Object} Mock audio graph
 * 
 * @example
 * const audioGraph = createMockAudioGraph({ nodeCount: 4 });
 */
export function createMockAudioGraph(options = {}) {
  const { nodeCount = 3 } = options;
  
  const nodes = [];
  const edges = [];
  
  // Create source node
  nodes.push(createMockAudioNode({
    type: 'oscillator',
    label: 'Oscillator',
    data: { frequency: 440, type: 'sine' }
  }));
  
  // Create processing nodes
  for (let i = 1; i < nodeCount - 1; i++) {
    nodes.push(createMockAudioNode({
      type: 'filter',
      label: `Filter ${i}`,
      inputs: ['audio-in'],
      outputs: ['audio-out'],
      data: { type: 'lowpass', frequency: 1000 }
    }));
  }
  
  // Create destination node
  nodes.push(createMockAudioNode({
    type: 'audio-destination',
    label: 'Output',
    inputs: ['audio-in'],
    outputs: []
  }));
  
  // Connect nodes sequentially
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push(createMockEdge({
      source: nodes[i].id,
      target: nodes[i + 1].id,
      type: 'audio',
      sourcePort: 'audio-out',
      targetPort: 'audio-in'
    }));
  }
  
  return {
    id: generateId('audio-graph'),
    nodes,
    edges,
    metadata: {
      created: Date.now(),
      sampleRate: 48000,
      version: 1
    }
  };
}

/**
 * Creates a batch of mock events for testing event flows
 * 
 * @param {Array<Object>} eventSpecs - Array of event specifications
 * @param {string} eventSpecs[].type - Event type
 * @param {Object} [eventSpecs[].payload] - Event payload
 * @returns {Array<Object>} Array of mock events
 * 
 * @example
 * const events = createMockEventBatch([
 *   { type: 'NodeAdded', payload: { nodeId: 'node-1' } },
 *   { type: 'EdgeAdded', payload: { edgeId: 'edge-1' } }
 * ]);
 */
export function createMockEventBatch(eventSpecs) {
  return eventSpecs.map(spec => 
    createMockEvent(spec.type, spec.payload || {})
  );
}

/**
 * Creates a mock command event for testing command flows
 * 
 * @param {string} command - Command name
 * @param {Object} [params={}] - Command parameters
 * @param {Object} [overrides={}] - Additional properties
 * @returns {Object} Mock command event
 * 
 * @example
 * const cmd = createMockCommand('AddNode', { type: 'oscillator' });
 */
export function createMockCommand(command, params = {}, overrides = {}) {
  return createMockEvent('Command', {
    command,
    params,
    requestId: overrides.requestId || generateId('req')
  }, overrides);
}

/**
 * Creates a mock query event for testing query flows
 * 
 * @param {string} query - Query name
 * @param {Object} [params={}] - Query parameters
 * @param {Object} [overrides={}] - Additional properties
 * @returns {Object} Mock query event
 * 
 * @example
 * const query = createMockQuery('GetNodeById', { id: 'node-1' });
 */
export function createMockQuery(query, params = {}, overrides = {}) {
  return createMockEvent('Query', {
    query,
    params,
    requestId: overrides.requestId || generateId('req')
  }, overrides);
}

/**
 * Creates mock performance metrics for testing
 * 
 * @param {Object} [overrides={}] - Properties to override defaults
 * @returns {Object} Mock performance metrics
 * 
 * @example
 * const metrics = createMockMetrics({ renderTime: 12.5 });
 */
export function createMockMetrics(overrides = {}) {
  return {
    timestamp: Date.now(),
    renderTime: overrides.renderTime || 8.5,
    memoryUsage: overrides.memoryUsage || 25.3,
    gpuUtilization: overrides.gpuUtilization || 45.2,
    audioLatency: overrides.audioLatency || 5.2,
    nodeCount: overrides.nodeCount || 10,
    edgeCount: overrides.edgeCount || 15,
    fps: overrides.fps || 60,
    ...overrides
  };
}

/**
 * Creates a mock spatial index entry
 * 
 * @param {Object} [overrides={}] - Properties to override defaults
 * @returns {Object} Mock spatial index entry
 * 
 * @example
 * const entry = createMockSpatialEntry({ bounds: { x: 0, y: 0, width: 100, height: 100 } });
 */
export function createMockSpatialEntry(overrides = {}) {
  const id = overrides.id || generateId('spatial');
  
  return {
    id,
    entityId: overrides.entityId || generateId('node'),
    bounds: overrides.bounds || {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    },
    layer: overrides.layer || 0,
    metadata: overrides.metadata || {}
  };
}

/**
 * Creates a mock WebAssembly execution context
 * 
 * @param {Object} [overrides={}] - Properties to override defaults
 * @returns {Object} Mock WASM context
 * 
 * @example
 * const context = createMockWasmContext({ memoryPages: 10 });
 */
export function createMockWasmContext(overrides = {}) {
  return {
    instance: overrides.instance || null,
    memory: overrides.memory || new WebAssembly.Memory({ initial: 1 }),
    memoryPages: overrides.memoryPages || 1,
    exports: overrides.exports || {},
    initialized: overrides.initialized !== undefined ? overrides.initialized : true
  };
}

/**
 * Creates a mock GPU compute context
 * 
 * @param {Object} [overrides={}] - Properties to override defaults
 * @returns {Object} Mock GPU context
 * 
 * @example
 * const gpuContext = createMockGpuContext({ device: mockDevice });
 */
export function createMockGpuContext(overrides = {}) {
  return {
    device: overrides.device || null,
    queue: overrides.queue || null,
    adapter: overrides.adapter || null,
    features: overrides.features || [],
    limits: overrides.limits || {},
    initialized: overrides.initialized !== undefined ? overrides.initialized : false
  };
}

/**
 * Creates a mock audio buffer with sample data
 * 
 * @param {Object} [options={}] - Buffer configuration
 * @param {number} [options.length=512] - Buffer length in samples
 * @param {number} [options.channels=2] - Number of channels
 * @param {number} [options.sampleRate=48000] - Sample rate
 * @returns {Object} Mock audio buffer
 * 
 * @example
 * const buffer = createMockAudioBuffer({ length: 1024, channels: 2 });
 */
export function createMockAudioBuffer(options = {}) {
  const {
    length = 512,
    channels = 2,
    sampleRate = 48000
  } = options;
  
  const channelData = [];
  for (let i = 0; i < channels; i++) {
    channelData.push(new Float32Array(length));
  }
  
  return {
    length,
    numberOfChannels: channels,
    sampleRate,
    duration: length / sampleRate,
    getChannelData: (channel) => channelData[channel],
    copyFromChannel: (destination, channelNumber, startInChannel = 0) => {
      destination.set(channelData[channelNumber].subarray(startInChannel));
    },
    copyToChannel: (source, channelNumber, startInChannel = 0) => {
      channelData[channelNumber].set(source, startInChannel);
    }
  };
}

/**
 * Utility to create multiple mock nodes at once
 * 
 * @param {number} count - Number of nodes to create
 * @param {Function} [generator] - Optional generator function
 * @returns {Array<Object>} Array of mock nodes
 * 
 * @example
 * const nodes = createMockNodes(5, (i) => ({ type: `type-${i}` }));
 */
export function createMockNodes(count, generator) {
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const overrides = generator ? generator(i) : {};
    nodes.push(createMockNode(overrides));
  }
  return nodes;
}

/**
 * Utility to create multiple mock edges at once
 * 
 * @param {number} count - Number of edges to create
 * @param {Function} [generator] - Optional generator function
 * @returns {Array<Object>} Array of mock edges
 * 
 * @example
 * const edges = createMockEdges(3, (i) => ({ type: 'audio' }));
 */
export function createMockEdges(count, generator) {
  const edges = [];
  for (let i = 0; i < count; i++) {
    const overrides = generator ? generator(i) : {};
    edges.push(createMockEdge(overrides));
  }
  return edges;
}

/**
 * Creates a mock project structure for testing
 * 
 * @param {Object} [overrides={}] - Properties to override defaults
 * @returns {Object} Mock project object
 * 
 * @example
 * const project = createMockProject({ name: 'Test Project' });
 */
export function createMockProject(overrides = {}) {
  return {
    id: overrides.id || generateId('project'),
    name: overrides.name || 'Test Project',
    version: overrides.version || '1.0.0',
    graph: overrides.graph || createMockGraph(),
    settings: overrides.settings || {
      sampleRate: 48000,
      bufferSize: 512,
      tempo: 120
    },
    metadata: {
      created: Date.now(),
      modified: Date.now(),
      author: 'Test User',
      ...overrides.metadata
    }
  };
}