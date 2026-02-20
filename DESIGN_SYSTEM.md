# Harmony Design System

A high-performance design system built for audio production, combining WebGPU rendering, WASM-powered bounded contexts, and vanilla web components.

## Overview

Harmony is a design system focused on real-time audio production interfaces. It follows strict performance budgets (16ms render, 50MB memory, 200ms load) and uses a bounded context architecture where core logic runs in WASM while UI remains in vanilla JavaScript.

## Architecture

### Core Principles

1. **Bounded Contexts in WASM**: Audio processing, graph engine, and domain logic run in Rust/WASM
2. **Vanilla UI Layer**: All rendering uses vanilla HTML/CSS/JS with Web Components
3. **EventBus Communication**: UI components publish events, bounded contexts subscribe and respond
4. **GPU-First Performance**: WebGPU for visualizations and compute-heavy operations

### Technology Stack

- **Runtime**: Rust (WASM) for bounded contexts, vanilla JS for UI
- **Rendering**: WebGPU for graphics, Shadow DOM for components
- **Communication**: EventBus singleton pattern (core/event-bus.js)
- **Build**: wasm-pack, native ES modules
- **Testing**: Playwright for E2E, Chrome DevTools for performance

### Repository Structure

```
harmony-design/
├── harmony-schemas/          # JSON schemas for bounded contexts
│   └── src/
│       └── bounded-contexts/ # Schema definitions per BC
├── harmony-graph-bc/         # Graph engine bounded context (Rust/WASM)
├── harmony-core/             # Core utilities and EventBus
├── harmony-ui/               # UI component library
├── components/               # Web Components
├── primitives/               # Base UI primitives
├── core/                     # Core JS utilities
│   └── event-bus.js         # EventBus singleton (MUST be only instance)
└── DESIGN_SYSTEM.md         # This file
```

## Schemas

### Bounded Context Schemas

Schemas define the contract between UI and bounded contexts. They specify:
- Event types (commands, results, queries)
- Domain types and validation rules
- Data structures for serialization

**Location**: `harmony-schemas/src/bounded-contexts/`

#### Graph Schema

The graph bounded context schema defines the graph engine's API:

**File**: [harmony-schemas/src/bounded-contexts/graph.json](harmony-schemas/src/bounded-contexts/graph.json)

**Key Types**:
- `Node`: Graph node with id, type, position, and metadata
- `Edge`: Connection between nodes with source, target, and type
- `GraphState`: Complete graph state with nodes and edges

**Commands**:
- `AddNode`: Add a node to the graph
- `RemoveNode`: Remove a node from the graph
- `AddEdge`: Create an edge between nodes
- `RemoveEdge`: Remove an edge
- `UpdateNodePosition`: Move a node
- `CreateGraph`: Initialize a new graph instance
- `DeleteGraph`: Destroy a graph instance

**Results**:
- `NodeAdded`, `NodeRemoved`: Node mutation confirmations
- `EdgeAdded`, `EdgeRemoved`: Edge mutation confirmations
- `NodePositionUpdated`: Position change confirmation
- `GraphCreated`, `GraphDeleted`: Graph lifecycle events
- `GraphError`: Error reporting

**Queries**:
- `GetGraphState`: Retrieve complete graph state
- `GetNode`: Fetch single node data
- `GetEdge`: Fetch single edge data

### Schema-Driven Development Workflow

1. **Define Schema**: Create/modify JSON schema in `harmony-schemas/src/bounded-contexts/`
2. **Run Codegen**: Execute codegen pipeline to generate Rust types
3. **Implement BC**: Implement bounded context logic using generated types
4. **Wire EventBus**: Connect UI events to BC commands via EventBus
5. **Test Integration**: Verify event flow in Chrome DevTools

**Critical Rule**: Never edit Rust types directly. Always modify schema first, then run codegen.

## EventBus Pattern

### Singleton Architecture

The EventBus is a **singleton** that lives at `core/event-bus.js`. Only one instance may exist across the entire runtime.

**Rules**:
- Import EventBus only from `core/event-bus.js` or re-exports
- Never create a second EventBus class
- Packages re-export: `export { EventBus } from "../../core/event-bus.js"`

### Communication Flow

```
User Interaction → UI Component → EventBus.publish(command)
                                        ↓
                          Bounded Context subscribes
                                        ↓
                          BC processes command
                                        ↓
                          EventBus.publish(result)
                                        ↓
                          UI Component subscribes → Update UI
```

### Event Naming Convention

- **Commands**: Imperative verbs (e.g., `AddNode`, `RemoveEdge`)
- **Results**: Past tense (e.g., `NodeAdded`, `EdgeRemoved`)
- **Errors**: Suffix with `Error` (e.g., `GraphError`)

### Example: Adding a Node

**UI Component**:
```javascript
// components/graph-editor.js
import { EventBus } from '../core/event-bus.js';

class GraphEditor extends HTMLElement {
  connectedCallback() {
    this.eventBus = new EventBus();
    this.addEventListener('click', this.handleAddNode);
  }

  handleAddNode(e) {
    this.eventBus.publish('Graph.AddNode', {
      graphId: this.graphId,
      node: {
        id: generateId(),
        type: 'audio',
        position: { x: e.clientX, y: e.clientY }
      }
    });
  }
}
```

**Bounded Context** (WASM):
```rust
// harmony-graph-bc/src/lib.rs
// Generated from schema, subscribes via JS bridge
```

## Component Development

### Web Component Structure

All UI components use Shadow DOM and follow this pattern:

```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>/* scoped styles */</style>
      <div class="container"><!-- markup --></div>
    `;
  }
}

customElements.define('my-component', MyComponent);
```

### Testing Requirements

Before marking a component task complete, verify in Chrome:

1. **All States**: default, hover, focus, active, disabled
2. **Complex States**: error, loading, empty (if applicable)
3. **Performance**: 60fps animations (Chrome DevTools Performance panel)
4. **Accessibility**: keyboard navigation, ARIA labels

### Performance Budgets

- **Render**: 16ms per frame (60fps)
- **Memory**: 50MB WASM heap maximum
- **Load**: 200ms initial load time
- **Audio Latency**: 10ms end-to-end

## Bounded Contexts

### Graph Bounded Context

**Repository**: [harmony-graph-bc](harmony-graph-bc/)  
**Schema**: [harmony-schemas/src/bounded-contexts/graph.json](harmony-schemas/src/bounded-contexts/graph.json)

The graph engine manages node-edge graphs for audio signal flow, effect chains, and modulation routing.

**Responsibilities**:
- Node and edge lifecycle management
- Graph topology validation
- Cross-graph edge indexing (Policy #22)
- Serialization for IndexedDB persistence

**WASM Bridge**: [harmony-graph-bc/src/lib.rs](harmony-graph-bc/src/lib.rs)

### Audio Bounded Context

**Repository**: harmony-audio-bc (future)

Audio processing, DSP, and AudioWorklet management.

**Requirements**:
- WebGPU and WASM implementations for all DSP functions
- SharedArrayBuffer for AudioWorklet ↔ GPU transfer
- No async operations in audio render thread

## Build and Development

### Running Locally

```bash
# Install dependencies (dev tools only, no runtime deps)
npm install

# Build WASM bounded contexts
cd harmony-graph-bc
wasm-pack build --target web

# Start dev server
npm run dev
```

### CI Pipeline

**File**: [.github/workflows/ci-build.yml](.github/workflows/ci-build.yml)

Required jobs:
- `build-wasm`: Compile all WASM bounded contexts
- `test`: Run E2E tests in Chrome
- `performance`: Validate budgets (render, memory, load)
- `lint`: Code quality checks

**Critical**: CI must run all quality gates on every PR (Policy #29).

### Codegen Pipeline

When schemas change:

1. Modify schema in `harmony-schemas/src/bounded-contexts/`
2. Run codegen: `npm run codegen`
3. Commit schema + generated code together
4. CI validates schema and generated code are in sync

**Failure Mode**: CI fails if schema changed but generated code is stale (Policy #6).

## Quality Gates

Before proceeding with any task:

1. **Build**: All WASM modules compile without errors
2. **Tests**: E2E tests pass in Chrome
3. **Performance**: Budgets met (16ms render, 50MB memory, 200ms load)
4. **Lint**: No ESLint errors
5. **Schema Sync**: Generated code matches schema

## Documentation Standards

This file (DESIGN_SYSTEM.md) is the **single source of truth** for system documentation.

**Requirements**:
- Written in B1-level English (clear, simple, accessible)
- Logical sections per concern
- Concise but friendly tone
- Relative links to code files
- Minimal code (code lives in files, not docs)

**Two-Way References**: Documentation links to code, code comments link to doc sections.

## Policies and Constraints

### Absolute Constraints (Cannot be violated)

1. **Render Budget**: 16ms per frame (60fps)
2. **Memory Budget**: 50MB WASM heap
3. **Load Budget**: 200ms initial load
4. **Audio Latency**: 10ms end-to-end

### Critical Policies

- **EventBus Singleton** (Policy #31-32): Only one EventBus instance from `core/event-bus.js`
- **Schema-First Development** (Policy #5-6): Modify schema → run codegen → implement
- **Bounded Context Separation** (Policy #7): Rust/WASM for logic, vanilla JS for UI
- **Chrome Testing Required** (Policy #10-11): All UI components tested in Chrome before completion
- **No Nested Directories** (Policy #35): No `harmony-*/harmony-*` nesting
- **Composition Root** (Policy #33): Every package exports from `src/index.js`

**Full Policy List**: See task instructions for complete policy reference.

## Common Patterns

### Publishing an Event

```javascript
import { EventBus } from '../core/event-bus.js';

const bus = new EventBus();
bus.publish('Graph.AddNode', { graphId, node });
```

### Subscribing to an Event

```javascript
bus.subscribe('Graph.NodeAdded', (payload) => {
  console.log('Node added:', payload.node);
});
```

### Error Handling

```javascript
bus.subscribe('Graph.GraphError', (payload) => {
  console.error('Graph error:', payload.error, payload.details);
});
```

### Querying State

```javascript
// Publish query command
bus.publish('Graph.GetGraphState', { graphId });

// Subscribe to result
bus.subscribe('Graph.GraphStateRetrieved', (payload) => {
  const { nodes, edges } = payload.state;
  // Update UI
});
```

## Debugging

### EventBus Debugging Component

**Requirement** (Policy #16): EventBusComponent must be on every page, hidden by default.

**Activation**: `Ctrl+Shift+E`

**Features**:
- Real-time event log
- Payload inspection
- Subscriber list
- Event replay

### Chrome DevTools

- **Performance Panel**: Validate 60fps animations
- **Memory Panel**: Check WASM heap usage
- **Network Panel**: Verify 200ms load time
- **Console**: EventBus errors logged with context (Policy #17)

## Resources

- **Repository Root**: [harmony-design](.)
- **Core EventBus**: [core/event-bus.js](core/event-bus.js)
- **Graph Schema**: [harmony-schemas/src/bounded-contexts/graph.json](harmony-schemas/src/bounded-contexts/graph.json)
- **Graph BC**: [harmony-graph-bc](harmony-graph-bc/)
- **CI Pipeline**: [.github/workflows/ci-build.yml](.github/workflows/ci-build.yml)

## Contributing

1. Read this document thoroughly
2. Check existing schemas before creating new events
3. Run codegen after schema changes
4. Test in Chrome before marking tasks complete
5. Update this document with new patterns or components
6. Ensure all quality gates pass

---

**Last Updated**: 2025-01-15  
**Version**: 1.0.0