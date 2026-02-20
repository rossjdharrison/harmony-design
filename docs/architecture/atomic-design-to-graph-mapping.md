# Atomic Design to Graph Mapping

**Status**: Active  
**Last Updated**: 2025-01-XX  
**Related**: [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md), [Graph Architecture](./graph-architecture.md)

## Overview

This document provides a comprehensive mapping between Atomic Design methodology and the Harmony Design System's graph-based architecture. It explains how traditional UI component hierarchies translate into graph nodes, edges, and cascade operations.

## Core Concept

In Harmony, **every UI element is a graph node**. Atomic Design levels (atoms, molecules, organisms, templates, pages) become **node types** with specific relationship patterns and cascade behaviors.

```
Atomic Design Level  →  Graph Node Type  →  Cascade Behavior
```

## Node Type Mapping

### 1. Atoms → Primitive Nodes

**Definition**: Smallest, indivisible UI elements that cannot be broken down further.

**Graph Representation**:
- **Node Type**: `primitive`
- **Subtype Examples**: `button`, `input`, `label`, `icon`, `color-swatch`
- **Edge Pattern**: Leaf nodes (no outgoing composition edges)
- **Cascade Role**: Receivers only

**Properties**:
```typescript
{
  nodeType: "primitive",
  subtype: "button",
  state: {
    variant: "primary" | "secondary" | "tertiary",
    size: "sm" | "md" | "lg",
    disabled: boolean,
    loading: boolean
  },
  style: {
    backgroundColor: string,
    textColor: string,
    borderRadius: number
  }
}
```

**Example Nodes**:
- `button-primary-md` (Button atom)
- `input-text-default` (Text input atom)
- `icon-play-24px` (Icon atom)
- `color-token-primary-500` (Design token)

**Cascade Behavior**:
- **Receives**: Theme changes, token updates, global state
- **Propagates**: State changes to parent molecules (via inverse edges)
- **GPU Shader**: Processes style updates in parallel

**File Location**: `primitives/{category}/{name}.js`

---

### 2. Molecules → Composite Nodes

**Definition**: Simple groups of atoms functioning together as a unit.

**Graph Representation**:
- **Node Type**: `composite`
- **Subtype Examples**: `search-field`, `form-group`, `card-header`
- **Edge Pattern**: Outgoing edges to 2-5 primitive nodes
- **Cascade Role**: Aggregators and distributors

**Properties**:
```typescript
{
  nodeType: "composite",
  subtype: "search-field",
  children: ["input-text-search", "button-search", "icon-search"],
  state: {
    value: string,
    focused: boolean,
    hasError: boolean
  },
  layout: {
    direction: "horizontal" | "vertical",
    gap: number,
    alignment: string
  }
}
```

**Example Nodes**:
- `search-field-default` (Input + Button + Icon)
- `form-group-text` (Label + Input + Error message)
- `card-header` (Title + Subtitle + Icon)

**Cascade Behavior**:
- **Receives**: Parent organism state, theme updates
- **Propagates**: State to child atoms, layout constraints
- **Distributes**: Focus state, validation errors
- **GPU Shader**: Batch processes child updates

**Edge Types**:
- **Outgoing**: `contains` → primitives
- **Incoming**: `part-of` ← organisms
- **Cross-Graph**: `shares-state-with` ↔ other molecules

**File Location**: `components/molecules/{name}.js`

---

### 3. Organisms → Container Nodes

**Definition**: Complex UI components composed of molecules and/or atoms.

**Graph Representation**:
- **Node Type**: `container`
- **Subtype Examples**: `navigation-bar`, `data-table`, `media-player`
- **Edge Pattern**: Outgoing edges to 3-20 composite/primitive nodes
- **Cascade Role**: Orchestrators and coordinators

**Properties**:
```typescript
{
  nodeType: "container",
  subtype: "navigation-bar",
  children: [
    "logo-composite",
    "nav-menu-composite",
    "search-field-composite",
    "user-menu-composite"
  ],
  state: {
    expanded: boolean,
    activeRoute: string,
    scrolled: boolean
  },
  behavior: {
    sticky: boolean,
    collapsible: boolean,
    responsive: boolean
  }
}
```

**Example Nodes**:
- `navigation-bar-main` (Logo + Menu + Search + User controls)
- `data-table-sortable` (Header + Rows + Pagination + Actions)
- `media-player-audio` (Controls + Timeline + Volume + Playlist)

**Cascade Behavior**:
- **Receives**: Page-level state, user interactions, data updates
- **Propagates**: Coordinated state to all children
- **Orchestrates**: Complex interactions (drag-drop, multi-select)
- **GPU Shader**: Manages visibility culling, layout calculations

**Edge Types**:
- **Outgoing**: `contains` → composites/primitives
- **Incoming**: `part-of` ← templates
- **Cross-Graph**: `depends-on` → data sources, `emits-to` → event bus

**File Location**: `organisms/{category}/{name}.js`

---

### 4. Templates → Layout Nodes

**Definition**: Page-level structures that define content placement without specific content.

**Graph Representation**:
- **Node Type**: `layout`
- **Subtype Examples**: `dashboard-layout`, `article-layout`, `app-shell`
- **Edge Pattern**: Outgoing edges to slot definitions (5-15 containers)
- **Cascade Role**: Structural coordinators

**Properties**:
```typescript
{
  nodeType: "layout",
  subtype: "dashboard-layout",
  slots: {
    header: "navigation-bar-main",
    sidebar: "sidebar-nav-container",
    main: "content-area-container",
    footer: "footer-container"
  },
  grid: {
    columns: "auto 1fr",
    rows: "auto 1fr auto",
    areas: ["header header", "sidebar main", "footer footer"]
  },
  responsive: {
    breakpoints: { mobile: 768, tablet: 1024, desktop: 1440 }
  }
}
```

**Example Nodes**:
- `app-shell-standard` (Header + Sidebar + Main + Footer)
- `dashboard-layout-2col` (Nav + Sidebar + Main + Widgets)
- `article-layout-centered` (Header + Content + Related)

**Cascade Behavior**:
- **Receives**: Viewport changes, route transitions
- **Propagates**: Layout constraints to all slots
- **Coordinates**: Responsive breakpoints, scroll behavior
- **GPU Shader**: Viewport culling, layout reflow optimization

**Edge Types**:
- **Outgoing**: `defines-slot` → containers
- **Incoming**: `instantiated-by` ← pages
- **Cross-Graph**: `inherits-from` → base layouts

**File Location**: `templates/{name}-layout.js`

---

### 5. Pages → Instance Nodes

**Definition**: Specific instances of templates with real content and data.

**Graph Representation**:
- **Node Type**: `instance`
- **Subtype Examples**: `home-page`, `track-editor-page`, `settings-page`
- **Edge Pattern**: Single edge to template + edges to data sources
- **Cascade Role**: Root orchestrators

**Properties**:
```typescript
{
  nodeType: "instance",
  subtype: "track-editor-page",
  template: "app-shell-standard",
  route: "/editor/:trackId",
  data: {
    trackId: string,
    projectId: string
  },
  boundedContexts: [
    "audio-playback-bc",
    "track-management-bc",
    "effect-processing-bc"
  ],
  state: {
    loaded: boolean,
    dirty: boolean,
    saving: boolean
  }
}
```

**Example Nodes**:
- `home-page-instance` (Dashboard layout + user data)
- `track-editor-page-instance` (Editor layout + track data)
- `settings-page-instance` (Settings layout + preferences)

**Cascade Behavior**:
- **Receives**: Route parameters, user actions, BC events
- **Propagates**: Data and state to entire component tree
- **Orchestrates**: Page lifecycle, data fetching, navigation
- **GPU Shader**: Scene-level optimizations, batch updates

**Edge Types**:
- **Outgoing**: `uses-template` → layout, `fetches-from` → data sources
- **Incoming**: `navigated-to` ← router
- **Cross-Graph**: `subscribes-to` → bounded contexts

**File Location**: `pages/{name}-page.js`

---

## Edge Type Taxonomy

### Composition Edges (Structural)

| Edge Type | Direction | Connects | Cascade Behavior |
|-----------|-----------|----------|------------------|
| `contains` | Parent → Child | Any level → lower level | State flows down |
| `part-of` | Child → Parent | Lower level → higher level | Events bubble up |
| `defines-slot` | Layout → Container | Template → organism | Layout constraints |
| `uses-template` | Instance → Layout | Page → template | Content injection |

### Dependency Edges (Functional)

| Edge Type | Direction | Connects | Cascade Behavior |
|-----------|-----------|----------|------------------|
| `depends-on` | Consumer → Provider | Component → data/service | Reactive updates |
| `shares-state-with` | Peer ↔ Peer | Same-level components | Synchronized state |
| `inherits-from` | Child → Parent | Specialized → base | Property inheritance |
| `emits-to` | Source → Sink | Component → event bus | Event propagation |

### Cross-Graph Edges (Integration)

| Edge Type | Direction | Connects | Cascade Behavior |
|-----------|-----------|----------|------------------|
| `subscribes-to` | UI → BC | Component → bounded context | Data binding |
| `publishes-to` | UI → Bus | Component → event bus | Command dispatch |
| `observes` | UI → State | Component → state machine | Reactive rendering |
| `references` | Any → Token | Component → design token | Style updates |

---

## Cascade Patterns by Level

### Pattern 1: Token Cascade (Bottom-Up)

**Trigger**: Design token change (color, spacing, typography)

```
Token Node (primitive)
  ↓ cascade
Atoms using token (primitive)
  ↓ cascade
Molecules containing atoms (composite)
  ↓ cascade
Organisms containing molecules (container)
  ↓ cascade
Templates containing organisms (layout)
  ↓ cascade
Pages using templates (instance)
```

**GPU Optimization**: Batch token updates across all levels in single shader pass.

**Implementation**: `harmony-graph/shaders/token-cascade.wgsl`

---

### Pattern 2: State Cascade (Top-Down)

**Trigger**: User interaction or data change at page level

```
Page Node (instance)
  ↓ cascade
Template slots (layout)
  ↓ cascade
Organisms in slots (container)
  ↓ cascade
Molecules in organisms (composite)
  ↓ cascade
Atoms in molecules (primitive)
```

**GPU Optimization**: Parallel state distribution with early exit for unchanged subtrees.

**Implementation**: `harmony-graph/shaders/state-propagation.wgsl`

---

### Pattern 3: Event Cascade (Bottom-Up with Cross-Graph)

**Trigger**: User interaction on primitive (button click, input change)

```
Atom Node (primitive) → emits event
  ↑ bubble
Molecule Node (composite) → may handle or pass through
  ↑ bubble
Organism Node (container) → coordinates response
  → cross-graph edge
Bounded Context (business logic) → processes command
  → cross-graph edge back
Organism Node → updates state
  ↓ cascade (Pattern 2)
```

**GPU Optimization**: Event batching and deduplication.

**Implementation**: `core/event-bus.js` + `harmony-graph/shaders/event-batch.wgsl`

---

### Pattern 4: Layout Cascade (Template-Driven)

**Trigger**: Viewport resize or responsive breakpoint change

```
Template Node (layout) → recalculates grid
  ↓ cascade layout constraints
Organism Nodes in slots (container) → adjust dimensions
  ↓ cascade constraints
Molecule Nodes (composite) → reflow content
  ↓ cascade constraints
Atom Nodes (primitive) → adjust sizes
```

**GPU Optimization**: Layout calculations in compute shader, CSS updates batched.

**Implementation**: `harmony-graph/shaders/layout-cascade.wgsl`

---

## Query Patterns

### Query 1: Find All Primitives in Page

**Use Case**: Global theme update

```typescript
// TypeNavigator query
const primitives = navigator.query({
  startNode: "home-page-instance",
  traversal: "depth-first",
  edgeFilter: ["contains", "defines-slot"],
  nodeFilter: { nodeType: "primitive" }
});
```

**GPU Acceleration**: Parallel traversal with bitmask filtering.

---

### Query 2: Find Path from Atom to Page

**Use Case**: Debug event bubbling path

```typescript
// TypeNavigator query
const path = navigator.findPath({
  from: "button-primary-md",
  to: "home-page-instance",
  edgeTypes: ["part-of", "instantiated-by"]
});
```

**GPU Acceleration**: Bidirectional search with early termination.

---

### Query 3: Find All Dependents of Token

**Use Case**: Impact analysis before token change

```typescript
// TypeNavigator query
const dependents = navigator.query({
  startNode: "color-token-primary-500",
  traversal: "breadth-first",
  edgeFilter: ["references"],
  includeIndirect: true // transitive closure
});
```

**GPU Acceleration**: Transitive closure computation in shader.

---

## Implementation Mapping

### File Structure Alignment

```
Atomic Level    → Directory          → Node Type
─────────────────────────────────────────────────
Atoms           → primitives/        → primitive
Molecules       → components/        → composite
Organisms       → organisms/         → container
Templates       → templates/         → layout
Pages           → pages/             → instance
Tokens          → tokens/            → primitive (special)
```

### Web Component Registration

Each atomic level maps to a custom element prefix:

```javascript
// Atoms (primitives)
customElements.define("hmy-button", HarmonyButton);
customElements.define("hmy-input", HarmonyInput);

// Molecules (composites)
customElements.define("hmy-search-field", HarmonySearchField);
customElements.define("hmy-form-group", HarmonyFormGroup);

// Organisms (containers)
customElements.define("hmy-navigation-bar", HarmonyNavigationBar);
customElements.define("hmy-data-table", HarmonyDataTable);

// Templates (layouts)
customElements.define("hmy-app-shell", HarmonyAppShell);
customElements.define("hmy-dashboard-layout", HarmonyDashboardLayout);

// Pages (instances)
customElements.define("hmy-home-page", HarmonyHomePage);
customElements.define("hmy-editor-page", HarmonyEditorPage);
```

### Graph Node Registration

Each component registers itself with the graph engine:

```javascript
// In component constructor
connectedCallback() {
  this.nodeId = graphEngine.registerNode({
    nodeType: this.constructor.ATOMIC_LEVEL, // "primitive", "composite", etc.
    subtype: this.constructor.COMPONENT_TYPE, // "button", "search-field", etc.
    element: this,
    state: this.getInitialState(),
    metadata: this.getMetadata()
  });
  
  // Register edges to children
  this.registerCompositionEdges();
}
```

---

## Cascade Performance Targets

| Atomic Level | Max Cascade Time | Max Affected Nodes | GPU Batch Size |
|--------------|------------------|-------------------|----------------|
| Primitive    | 0.5ms            | 1                 | 1024           |
| Composite    | 2ms              | 5                 | 512            |
| Container    | 5ms              | 20                | 256            |
| Layout       | 10ms             | 100               | 128            |
| Instance     | 16ms             | 500               | 64             |

**Budget Compliance**: All cascade operations must complete within 16ms frame budget.

---

## Cross-Graph Integration

### Bounded Context Connections

Pages and organisms connect to bounded contexts via cross-graph edges:

```typescript
// Page instance node
{
  nodeType: "instance",
  crossGraphEdges: [
    {
      type: "subscribes-to",
      targetGraph: "audio-playback-bc",
      targetNode: "playback-state",
      binding: "reactive" // updates trigger cascade
    },
    {
      type: "publishes-to",
      targetGraph: "event-bus",
      targetNode: "command-channel",
      binding: "one-way" // fire-and-forget
    }
  ]
}
```

### Event Bus Integration

All atomic levels can emit events to the EventBus:

```javascript
// In any component
this.dispatchEvent(new CustomEvent("hmy:action", {
  bubbles: true,
  composed: true,
  detail: {
    action: "play-track",
    payload: { trackId: "123" },
    sourceNode: this.nodeId
  }
}));
```

The graph engine automatically creates `emits-to` edges for event flow tracking.

---

## Testing Strategy

### Unit Tests (Per Atomic Level)

```javascript
// Test primitive in isolation
test("button primitive renders correctly", () => {
  const button = document.createElement("hmy-button");
  button.variant = "primary";
  
  assert(button.nodeType === "primitive");
  assert(button.subtype === "button");
});
```

### Integration Tests (Cross-Level)

```javascript
// Test molecule with atom children
test("search-field composite contains correct primitives", () => {
  const searchField = document.createElement("hmy-search-field");
  document.body.appendChild(searchField);
  
  const graph = graphEngine.getSubgraph(searchField.nodeId);
  assert(graph.nodes.length === 3); // input + button + icon
  assert(graph.edges.every(e => e.type === "contains"));
});
```

### Cascade Tests (End-to-End)

```javascript
// Test token cascade across all levels
test("token change cascades to all dependents", async () => {
  const token = tokenRegistry.get("color-primary-500");
  const dependents = graphEngine.findDependents(token.nodeId);
  
  token.value = "#FF0000";
  await graphEngine.cascade(token.nodeId);
  
  dependents.forEach(node => {
    assert(node.style.backgroundColor === "#FF0000");
  });
});
```

---

## Migration Guide

### From Traditional Components

**Before** (flat component hierarchy):
```javascript
<div class="search-container">
  <input type="text" class="search-input" />
  <button class="search-button">Search</button>
</div>
```

**After** (graph-based atomic design):
```javascript
<hmy-search-field
  data-node-type="composite"
  data-children="input-text-search,button-search,icon-search">
</hmy-search-field>
```

### Adding Graph Awareness

1. **Identify atomic level** (atom, molecule, organism, template, page)
2. **Register with graph engine** in `connectedCallback()`
3. **Define composition edges** to children
4. **Implement cascade handlers** for state/style updates
5. **Emit events** instead of direct function calls

---

## Related Documentation

- [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) - Main design system documentation
- [Graph Architecture](./graph-architecture.md) - Graph engine details
- [Event Bus Specification](../event-bus-spec.md) - Event handling patterns
- [GPU Cascade Shaders](../../harmony-graph/shaders/README.md) - WebGPU implementation
- [Component Guidelines](../components/README.md) - Component authoring guide

---

## Appendix: Complete Node Type Schema

```typescript
// Base node interface
interface GraphNode {
  id: string;
  nodeType: "primitive" | "composite" | "container" | "layout" | "instance";
  subtype: string;
  state: Record<string, any>;
  metadata: {
    atomicLevel: "atom" | "molecule" | "organism" | "template" | "page";
    componentName: string;
    filePath: string;
    version: string;
  };
  edges: {
    outgoing: Edge[];
    incoming: Edge[];
    crossGraph: CrossGraphEdge[];
  };
}

// Edge interface
interface Edge {
  id: string;
  type: string;
  source: string;
  target: string;
  weight: number;
  metadata: Record<string, any>;
}

// Cross-graph edge interface
interface CrossGraphEdge extends Edge {
  targetGraph: string;
  binding: "reactive" | "one-way" | "two-way";
  synchronization: "immediate" | "batched" | "deferred";
}
```

---

**Document Version**: 1.0.0  
**Maintained By**: Harmony Architecture Team  
**Review Cycle**: Quarterly