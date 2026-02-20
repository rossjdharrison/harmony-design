# GPU-to-CPU Fallback Implementation Specification

**Status:** Draft  
**Version:** 1.0.0  
**Last Updated:** 2025-01-XX  
**Mission Ref:** del-gpu-cpu-fallback-spec

## Overview

This specification defines the CPU fallback implementation strategy for all GPU-accelerated operations in the Harmony Design System. When WebGPU is unavailable or fails, the system must gracefully degrade to CPU-based implementations while maintaining functional correctness and acceptable performance.

## Vision Alignment

- **GPU-First Audio:** Ensures audio processing continues even without GPU acceleration
- **WASM Performance:** CPU fallbacks leverage WASM for performance-critical paths
- **Reactive Component System:** Fallback detection triggers reactive capability updates

## Design Principles

### 1. Transparent Fallback
Operations must work identically from the caller's perspective regardless of GPU/CPU execution.

### 2. Performance Budgets
CPU fallbacks must meet relaxed but defined performance targets:
- Audio processing: 20ms max (vs 10ms GPU target)
- Graph traversal: 100ms for 10K nodes (vs 50ms GPU target)
- Intent queries: 50ms for 1K nodes (vs 10ms GPU target)

### 3. Feature Parity
All GPU operations must have CPU equivalents with identical outputs (within floating-point precision).

### 4. Explicit Capability Detection
System must detect and report GPU availability; fallback is never silent.

## Architecture

### Fallback Detection Layer

```
┌─────────────────────────────────────────┐
│   Application Layer                     │
│   (uses unified interface)              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   Capability Manager                    │
│   - Detects GPU availability            │
│   - Routes to GPU or CPU backend        │
│   - Publishes capability events         │
└─────────────────┬───────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
┌────────▼─────┐  ┌───────▼──────┐
│ GPU Backend  │  │ CPU Backend  │
│ (WebGPU)     │  │ (WASM/JS)    │
└──────────────┘  └──────────────┘
```

### Interface Contract

All GPU operations expose a unified interface:

```typescript
interface ComputeBackend {
  /** Initialize backend and verify availability */
  initialize(): Promise<boolean>;
  
  /** Check if backend is currently available */
  isAvailable(): boolean;
  
  /** Execute graph traversal */
  traverseGraph(
    nodes: NodeBuffer,
    edges: EdgeBuffer,
    startNode: number
  ): Promise<TraversalResult>;
  
  /** Execute intent availability query */
  queryIntent(
    graph: GraphBuffer,
    intentId: string
  ): Promise<IntentResult>;
  
  /** Execute edge cascade propagation */
  propagateEdges(
    edges: EdgeBuffer,
    changes: ChangeSet
  ): Promise<PropagationResult>;
  
  /** Clean up resources */
  dispose(): void;
}
```

## CPU Implementation Strategy

### 1. Graph Traversal Fallback

**GPU Implementation:** `docs/edge-propagation.wgsl`  
**CPU Implementation:** `harmony-graph/src/cpu/graph-traversal.js`

```javascript
/**
 * CPU-based graph traversal using iterative BFS
 * @param {Uint32Array} nodes - Node buffer
 * @param {Uint32Array} edges - Edge adjacency list
 * @param {number} startNode - Starting node index
 * @returns {Uint32Array} Visited node indices
 */
function traverseGraphCPU(nodes, edges, startNode) {
  const visited = new Set();
  const queue = [startNode];
  const result = [];
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    
    // Find edges for current node
    const edgeStart = nodes[current * 2];
    const edgeCount = nodes[current * 2 + 1];
    
    for (let i = 0; i < edgeCount; i++) {
      const targetNode = edges[edgeStart + i];
      if (!visited.has(targetNode)) {
        queue.push(targetNode);
      }
    }
  }
  
  return new Uint32Array(result);
}
```

**Performance Target:** 100ms for 10K nodes, 1K edges per node average

### 2. Intent Availability Fallback

**GPU Implementation:** `docs/intent-availability.wgsl`  
**CPU Implementation:** `harmony-graph/src/cpu/intent-query.js`

```javascript
/**
 * CPU-based intent availability query
 * @param {GraphBuffer} graph - Graph data structure
 * @param {string} intentId - Intent to query
 * @returns {IntentResult} Availability result
 */
function queryIntentCPU(graph, intentId) {
  const { nodes, edges, intents } = graph;
  const intentIndex = intents.findIndex(i => i.id === intentId);
  
  if (intentIndex === -1) {
    return { available: false, reason: 'intent_not_found' };
  }
  
  // Check all nodes that provide this intent
  const providers = nodes.filter(n => 
    n.provides && n.provides.includes(intentId)
  );
  
  if (providers.length === 0) {
    return { available: false, reason: 'no_providers' };
  }
  
  // Check if any provider is reachable
  for (const provider of providers) {
    if (isNodeReachable(graph, provider.id)) {
      return { 
        available: true, 
        providerId: provider.id,
        cost: calculateCost(graph, provider.id)
      };
    }
  }
  
  return { available: false, reason: 'providers_unreachable' };
}
```

**Performance Target:** 50ms for 1K nodes

### 3. Edge Cascade Propagation Fallback

**GPU Implementation:** `docs/edge-propagation.wgsl`  
**CPU Implementation:** `harmony-graph/src/cpu/edge-propagation.js`

```javascript
/**
 * CPU-based edge cascade propagation
 * @param {EdgeBuffer} edges - Edge data
 * @param {ChangeSet} changes - Initial changes
 * @returns {PropagationResult} Updated edges
 */
function propagateEdgesCPU(edges, changes) {
  const affected = new Set(changes.nodeIds);
  const propagated = new Map();
  const queue = [...changes.nodeIds];
  
  while (queue.length > 0) {
    const nodeId = queue.shift();
    
    // Find outgoing edges
    const outEdges = edges.filter(e => e.source === nodeId);
    
    for (const edge of outEdges) {
      const targetId = edge.target;
      
      if (!affected.has(targetId)) {
        affected.add(targetId);
        queue.push(targetId);
        
        // Track propagation path
        propagated.set(targetId, {
          from: nodeId,
          edgeId: edge.id,
          depth: (propagated.get(nodeId)?.depth || 0) + 1
        });
      }
    }
  }
  
  return {
    affectedNodes: Array.from(affected),
    propagationPaths: propagated,
    depth: Math.max(...Array.from(propagated.values()).map(p => p.depth))
  };
}
```

**Performance Target:** 80ms for 5K edges

### 4. Cross-Graph Cascade Fallback

**GPU Implementation:** `docs/cross-graph-cascade.wgsl`  
**CPU Implementation:** `harmony-graph/src/cpu/cross-graph-cascade.js`

```javascript
/**
 * CPU-based cross-graph cascade propagation
 * @param {Graph[]} graphs - Multiple graph instances
 * @param {CrossEdge[]} crossEdges - Inter-graph edges
 * @param {ChangeSet} changes - Initial changes
 * @returns {CrossGraphResult} Updated state
 */
function propagateCrossGraphCPU(graphs, crossEdges, changes) {
  const graphStates = new Map();
  const queue = [];
  
  // Initialize with changed nodes
  for (const change of changes.nodeIds) {
    const graphId = findGraphForNode(graphs, change);
    queue.push({ graphId, nodeId: change, depth: 0 });
  }
  
  while (queue.length > 0) {
    const { graphId, nodeId, depth } = queue.shift();
    
    // Update graph state
    if (!graphStates.has(graphId)) {
      graphStates.set(graphId, new Set());
    }
    graphStates.get(graphId).add(nodeId);
    
    // Find cross-graph edges from this node
    const outgoing = crossEdges.filter(e => 
      e.sourceGraph === graphId && e.sourceNode === nodeId
    );
    
    for (const edge of outgoing) {
      const targetGraph = edge.targetGraph;
      const targetNode = edge.targetNode;
      
      const targetState = graphStates.get(targetGraph);
      if (!targetState || !targetState.has(targetNode)) {
        queue.push({ 
          graphId: targetGraph, 
          nodeId: targetNode, 
          depth: depth + 1 
        });
      }
    }
  }
  
  return {
    affectedGraphs: Array.from(graphStates.keys()),
    graphStates: Object.fromEntries(graphStates),
    maxDepth: Math.max(...queue.map(q => q.depth))
  };
}
```

**Performance Target:** 150ms for 5 graphs, 10K total nodes

## Capability Manager Implementation

**File:** `harmony-graph/src/capability-manager.js`

```javascript
/**
 * Manages GPU/CPU capability detection and backend routing
 */
export class CapabilityManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.gpuBackend = null;
    this.cpuBackend = null;
    this.activeBackend = null;
    this.capabilities = {
      webgpu: false,
      wasm: false,
      sharedArrayBuffer: false
    };
  }
  
  /**
   * Initialize and detect available backends
   */
  async initialize() {
    // Check WebGPU
    if ('gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          this.gpuBackend = await this.initializeGPUBackend(adapter);
          this.capabilities.webgpu = true;
        }
      } catch (err) {
        console.warn('[CapabilityManager] WebGPU unavailable:', err);
      }
    }
    
    // Check WASM
    if (typeof WebAssembly !== 'undefined') {
      this.capabilities.wasm = true;
    }
    
    // Check SharedArrayBuffer
    if (typeof SharedArrayBuffer !== 'undefined') {
      this.capabilities.sharedArrayBuffer = true;
    }
    
    // Initialize CPU backend (always available)
    this.cpuBackend = await this.initializeCPUBackend();
    
    // Select active backend
    this.activeBackend = this.capabilities.webgpu 
      ? this.gpuBackend 
      : this.cpuBackend;
    
    // Publish capability event
    this.eventBus.publish('system:capabilities:detected', {
      capabilities: this.capabilities,
      activeBackend: this.activeBackend === this.gpuBackend ? 'gpu' : 'cpu'
    });
    
    return this.capabilities;
  }
  
  /**
   * Get current active backend
   */
  getBackend() {
    return this.activeBackend;
  }
  
  /**
   * Force fallback to CPU (for testing)
   */
  forceCPUFallback() {
    this.activeBackend = this.cpuBackend;
    this.eventBus.publish('system:backend:switched', {
      from: 'gpu',
      to: 'cpu',
      reason: 'forced'
    });
  }
}
```

## Testing Strategy

### 1. Functional Equivalence Tests

Verify GPU and CPU backends produce identical results:

```javascript
describe('GPU/CPU Functional Equivalence', () => {
  it('should produce identical graph traversal results', async () => {
    const testGraph = generateTestGraph(1000);
    
    const gpuResult = await gpuBackend.traverseGraph(
      testGraph.nodes,
      testGraph.edges,
      0
    );
    
    const cpuResult = await cpuBackend.traverseGraph(
      testGraph.nodes,
      testGraph.edges,
      0
    );
    
    expect(gpuResult).toEqual(cpuResult);
  });
});
```

### 2. Performance Benchmark Tests

Ensure CPU fallbacks meet performance targets:

```javascript
describe('CPU Fallback Performance', () => {
  it('should traverse 10K nodes within 100ms', async () => {
    const graph = generateTestGraph(10000);
    
    const start = performance.now();
    await cpuBackend.traverseGraph(graph.nodes, graph.edges, 0);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});
```

### 3. Fallback Transition Tests

Verify graceful degradation:

```javascript
describe('Fallback Transition', () => {
  it('should switch to CPU when GPU fails', async () => {
    const manager = new CapabilityManager(eventBus);
    
    // Simulate GPU failure
    manager.gpuBackend.simulateFailure();
    
    const backend = manager.getBackend();
    expect(backend).toBe(manager.cpuBackend);
  });
});
```

## Performance Monitoring

### Metrics to Track

1. **Backend Selection Rate**
   - % of sessions using GPU vs CPU
   - Reasons for CPU fallback

2. **Performance Comparison**
   - GPU vs CPU execution time for same operation
   - CPU performance distribution across devices

3. **Fallback Events**
   - GPU initialization failures
   - Mid-session GPU loss
   - Forced fallback triggers

### Monitoring Implementation

```javascript
class PerformanceMonitor {
  trackOperation(backend, operation, duration, nodeCount) {
    this.eventBus.publish('performance:operation:complete', {
      backend: backend, // 'gpu' or 'cpu'
      operation: operation, // 'traverse', 'query', etc.
      duration: duration,
      nodeCount: nodeCount,
      timestamp: Date.now()
    });
  }
}
```

## Implementation Checklist

- [ ] Create `harmony-graph/src/cpu/` directory
- [ ] Implement `graph-traversal.js` CPU fallback
- [ ] Implement `intent-query.js` CPU fallback
- [ ] Implement `edge-propagation.js` CPU fallback
- [ ] Implement `cross-graph-cascade.js` CPU fallback
- [ ] Create `capability-manager.js`
- [ ] Add functional equivalence tests
- [ ] Add performance benchmark tests
- [ ] Add fallback transition tests
- [ ] Document performance budgets in DESIGN_SYSTEM.md
- [ ] Add EventBus events for capability detection
- [ ] Integrate with existing GPU implementations

## Related Documents

- [GPU Synchronization Specification](./gpu-synchronization-spec.md)
- [GPU Benchmark Suite](./gpu-benchmark-suite.md)
- [WebGPU Limits Validation](./webgpu-limits-validation.md)
- [Edge Propagation Shader](./edge-propagation.wgsl)
- [Intent Availability Shader](./intent-availability.wgsl)
- [Cross-Graph Cascade Shader](./cross-graph-cascade.wgsl)

## Performance Targets Summary

| Operation | GPU Target | CPU Target | Max Degradation |
|-----------|-----------|-----------|-----------------|
| Audio Processing | 10ms | 20ms | 2x |
| Graph Traversal (10K nodes) | 50ms | 100ms | 2x |
| Intent Query (1K nodes) | 10ms | 50ms | 5x |
| Edge Propagation (5K edges) | 40ms | 80ms | 2x |
| Cross-Graph Cascade | 75ms | 150ms | 2x |

## Open Questions

1. Should CPU fallback use Web Workers for parallelization?
2. What is the minimum acceptable CPU performance threshold?
3. Should we cache CPU results more aggressively than GPU results?
4. How do we handle partial GPU availability (e.g., limited buffer sizes)?

## Revision History

- **1.0.0** (2025-01-XX): Initial specification