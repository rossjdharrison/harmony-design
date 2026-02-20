# Graph Model Documentation

## Overview

The Harmony Graph Model is a reactive computation graph that powers the design system's component lifecycle, state management, and event propagation. It provides a declarative way to model dependencies, transformations, and side effects.

**Related Files:**
- Implementation: `harmony-graph/src/graph.js`
- Type Definitions: `harmony-graph/types/graph.d.ts`
- Schema: `harmony-schemas/src/graph.rs`

## Core Concepts

### Nodes

Nodes represent computational units in the graph. Each node has:
- **ID**: Unique identifier (string)
- **Type**: Classification of the node's purpose
- **State**: Current data/value held by the node
- **Dependencies**: List of upstream node IDs
- **Subscribers**: List of downstream node IDs

#### Node Types

1. **Source Nodes** - Entry points with no dependencies
   - User input events
   - External data sources
   - Timer/animation frames

2. **Transform Nodes** - Pure computations with dependencies
   - Data mapping/filtering
   - Derived state calculations
   - Validation logic

3. **Effect Nodes** - Side-effect producing operations
   - DOM updates
   - Network requests
   - Storage operations

4. **Sink Nodes** - Terminal nodes (no subscribers)
   - Logging
   - Analytics
   - Final rendering

**Example Node Structure:**
```javascript
{
  id: "user-input-handler",
  type: "source",
  state: { value: null },
  dependencies: [],
  subscribers: ["validation-node", "transform-node"]
}
```

### Edges

Edges define directed relationships between nodes, representing data flow and dependency chains.

#### Edge Properties

- **Source Node ID**: Origin of the connection
- **Target Node ID**: Destination of the connection
- **Edge Type**: Classification of the relationship
- **Weight**: Optional priority/ordering hint
- **Metadata**: Additional edge-specific data

#### Edge Types

1. **Data Flow** - Value propagation
   - Parent component → child component
   - State → derived state
   - Input → output

2. **Event Flow** - Event propagation
   - User action → handler
   - Lifecycle event → subscriber
   - Error → error boundary

3. **Dependency** - Execution ordering
   - Resource A must load before B
   - Validation before submission
   - Cleanup after unmount

**Example Edge Structure:**
```javascript
{
  source: "input-node",
  target: "validation-node",
  type: "data-flow",
  weight: 1,
  metadata: { transform: "debounce" }
}
```

### Events

Events are messages that flow through the graph, triggering node computations and state updates.

#### Event Structure

```javascript
{
  type: "NodeStateChanged",
  nodeId: "input-field",
  timestamp: 1234567890,
  payload: { value: "new text" },
  metadata: {
    source: "user-interaction",
    priority: "high"
  }
}
```

#### Event Types

1. **Node Lifecycle Events**
   - `NodeCreated` - New node added to graph
   - `NodeUpdated` - Node state changed
   - `NodeRemoved` - Node deleted from graph

2. **Edge Events**
   - `EdgeCreated` - New connection established
   - `EdgeRemoved` - Connection severed

3. **Propagation Events**
   - `PropagationStarted` - Update wave begins
   - `PropagationCompleted` - Update wave finished
   - `PropagationError` - Error during propagation

4. **Custom Domain Events**
   - Component-specific events
   - Application-level events
   - Integration events

### Propagation

Propagation is the process of updating nodes when their dependencies change, ensuring consistency across the graph.

#### Propagation Algorithm

1. **Change Detection**
   - Node state changes trigger propagation
   - Compare previous and current state
   - Skip if no actual change occurred

2. **Topological Ordering**
   - Sort affected nodes by dependency depth
   - Ensure parents process before children
   - Detect and break cycles if needed

3. **Batch Processing**
   - Collect all changes in current frame
   - Process in single propagation wave
   - Minimize redundant computations

4. **Update Execution**
   - Execute node computation functions
   - Update node state with results
   - Mark node as "clean" (up-to-date)

#### Propagation Modes

**Synchronous Mode** - Immediate propagation
- Used for critical updates
- Blocks until completion
- Guarantees consistency

**Asynchronous Mode** - Scheduled propagation
- Used for non-critical updates
- Batched with requestAnimationFrame
- Better performance for UI updates

**Manual Mode** - Developer-controlled
- Explicit trigger required
- Used for testing/debugging
- Fine-grained control

#### Performance Optimization

1. **Dirty Marking**
   - Only recompute "dirty" nodes
   - Skip clean nodes during propagation
   - Reduces unnecessary work

2. **Memoization**
   - Cache computation results
   - Skip if inputs haven't changed
   - Configurable cache strategies

3. **Pruning**
   - Remove inactive subgraphs
   - Garbage collect orphaned nodes
   - Reduce memory footprint

## Graph Operations

### Creating Nodes

```javascript
// See: harmony-graph/src/graph.js - addNode()
graph.addNode({
  id: 'my-node',
  type: 'transform',
  compute: (inputs) => inputs.value * 2,
  dependencies: ['input-node']
});
```

### Creating Edges

```javascript
// See: harmony-graph/src/graph.js - addEdge()
graph.addEdge({
  source: 'input-node',
  target: 'my-node',
  type: 'data-flow'
});
```

### Triggering Propagation

```javascript
// See: harmony-graph/src/graph.js - propagate()
graph.updateNode('input-node', { value: 42 });
// Propagation happens automatically
```

### Querying the Graph

```javascript
// See: harmony-graph/src/graph.js - query methods
const node = graph.getNode('my-node');
const ancestors = graph.getAncestors('my-node');
const descendants = graph.getDescendants('my-node');
```

## Integration with Components

### Component as Node

Each Web Component can register itself as a graph node:

```javascript
// See: components/primitives/base-component.js
class MyComponent extends HTMLElement {
  connectedCallback() {
    this.nodeId = graph.addNode({
      id: `component-${this.id}`,
      type: 'effect',
      compute: (inputs) => this.render(inputs),
      dependencies: this.getDependencies()
    });
  }
}
```

### Reactive Properties

Component properties can be graph nodes:

```javascript
// Property changes trigger propagation
this.value = newValue;
// Graph automatically updates dependent components
```

### Event Bus Integration

Graph events integrate with the EventBus:

```javascript
// See: core/event-bus.js
eventBus.subscribe('NodeStateChanged', (event) => {
  // React to graph changes
  console.log(`Node ${event.nodeId} updated`);
});
```

## Cross-Graph Edges

For complex applications, multiple graphs may exist. Cross-graph edges enable communication between isolated graphs.

### Creating Cross-Graph Edges

```javascript
// See: harmony-graph/src/cross-graph.js
crossGraphManager.createEdge({
  sourceGraph: 'ui-graph',
  sourceNode: 'button-click',
  targetGraph: 'audio-graph',
  targetNode: 'play-sound'
});
```

### Indexing Requirements

**MANDATORY RULE 22**: Cross-graph edges must be indexed for performance.

```javascript
// Index maintained automatically
const index = crossGraphManager.getIndex();
// Fast lookups by source or target graph
```

## Performance Considerations

### Render Budget Compliance

**MANDATORY RULE 1**: Maximum 16ms per frame for 60fps.

- Propagation must complete within frame budget
- Use async mode for non-critical updates
- Monitor with Performance API

```javascript
// See: performance/graph-metrics.js
const startTime = performance.now();
graph.propagate();
const duration = performance.now() - startTime;
console.assert(duration < 16, 'Propagation exceeded budget');
```

### Memory Management

**MANDATORY RULE 2**: Maximum 50MB WASM heap.

- Prune unused nodes regularly
- Limit graph depth and breadth
- Use weak references for caches

### Cycle Detection

Cycles in the graph can cause infinite loops:

```javascript
// Graph validates acyclicity on edge creation
try {
  graph.addEdge({ source: 'A', target: 'B' });
  graph.addEdge({ source: 'B', target: 'A' }); // Throws error
} catch (e) {
  console.error('Cycle detected:', e);
}
```

## Debugging

### Graph Visualization

```javascript
// See: tools/graph-visualizer.js
const graphViz = new GraphVisualizer(graph);
graphViz.render('#visualization-container');
```

### Propagation Tracing

```javascript
// Enable detailed logging
graph.enableTrace(true);
graph.updateNode('input', { value: 42 });
// Logs each step of propagation
```

### EventBus Integration

**MANDATORY RULE 16**: EventBusComponent available on every page.

Press `Ctrl+Shift+E` to open EventBus debugger and view graph events in real-time.

## Testing

### Unit Testing Nodes

```javascript
// See: tests/graph/node.test.js
describe('Transform Node', () => {
  it('computes output from inputs', () => {
    const node = new TransformNode({
      compute: (inputs) => inputs.a + inputs.b
    });
    const result = node.execute({ a: 1, b: 2 });
    expect(result).toBe(3);
  });
});
```

### Integration Testing Propagation

```javascript
// See: tests/graph/propagation.test.js
describe('Propagation', () => {
  it('updates dependent nodes', async () => {
    const graph = new Graph();
    graph.addNode({ id: 'A', compute: () => 1 });
    graph.addNode({ id: 'B', compute: (inputs) => inputs.A * 2 });
    graph.addEdge({ source: 'A', target: 'B' });
    
    await graph.propagate();
    expect(graph.getNode('B').state).toBe(2);
  });
});
```

## Best Practices

### 1. Keep Nodes Pure

Transform nodes should be pure functions:
- No side effects
- Deterministic output
- Testable in isolation

### 2. Minimize Edge Count

Excessive edges increase propagation cost:
- Prefer direct dependencies
- Avoid redundant connections
- Use event aggregation

### 3. Batch Updates

Group related updates:
```javascript
graph.batch(() => {
  graph.updateNode('A', { value: 1 });
  graph.updateNode('B', { value: 2 });
}); // Single propagation wave
```

### 4. Use Appropriate Node Types

- **Source**: External inputs only
- **Transform**: Pure computations
- **Effect**: Side effects isolated
- **Sink**: Terminal operations

### 5. Monitor Performance

```javascript
// See: performance/graph-metrics.js
graphMetrics.on('propagation', (stats) => {
  if (stats.duration > 16) {
    console.warn('Propagation too slow:', stats);
  }
});
```

## Advanced Topics

### Dynamic Graph Modification

Add/remove nodes at runtime:
```javascript
// Component lifecycle drives graph changes
connectedCallback() {
  this.nodeId = graph.addNode({ /* ... */ });
}

disconnectedCallback() {
  graph.removeNode(this.nodeId);
}
```

### Conditional Edges

Edges can be enabled/disabled:
```javascript
graph.setEdgeEnabled('A', 'B', false); // Temporarily disable
```

### Priority-Based Propagation

Process high-priority nodes first:
```javascript
graph.addNode({
  id: 'critical-update',
  priority: 10, // Higher = earlier
  compute: () => { /* ... */ }
});
```

### Subgraph Isolation

Create isolated computation regions:
```javascript
const subgraph = graph.createSubgraph(['nodeA', 'nodeB', 'nodeC']);
subgraph.propagate(); // Only affects these nodes
```

## Related Documentation

- **Architecture Overview**: `docs/architecture.md`
- **Component Lifecycle**: `bounded-contexts/component-lifecycle/README.md`
- **Event System**: `docs/event-system.md`
- **Performance Guidelines**: `docs/performance.md`
- **TypeNavigator Queries**: `docs/type-navigator.md`

## Schema Reference

The graph model is defined in Rust schemas:

**File**: `harmony-schemas/src/graph.rs`

Changes to the schema require running codegen:
```bash
cd harmony-schemas
cargo build
npm run codegen
```

**MANDATORY RULE 5**: Never edit Rust directly. Modify schema, run codegen, verify compilation.

## Support

For questions or issues with the graph model:
1. Check EventBus debugger (`Ctrl+Shift+E`)
2. Enable graph tracing for detailed logs
3. Review related documentation above
4. Create issue in repository

---

**Last Updated**: 2025-01-09  
**Version**: 1.0.0  
**Status**: Active