# Harmony Design System - Architecture Overview

**Version:** 1.0  
**Last Updated:** 2025-01-15  
**Status:** Living Document

## Purpose

This document provides a high-level overview of the Harmony Design System architecture. It explains how the major components fit together, the data flow through the system, and the key design decisions that shape the implementation.

**Target Audience:** Developers new to Harmony, architects evaluating the system, contributors planning features.

## Table of Contents

1. [Vision & Principles](#vision--principles)
2. [System Layers](#system-layers)
3. [Core Architecture](#core-architecture)
4. [Component Model](#component-model)
5. [Data Flow](#data-flow)
6. [Performance Strategy](#performance-strategy)
7. [Technology Stack](#technology-stack)
8. [Key Design Decisions](#key-design-decisions)

---

## Vision & Principles

Harmony is a **GPU-first, graph-based design system** built for high-performance audio and visual applications. The system is designed around four core pillars:

### 1. Reactive Component System
All UI components are backed by reactive computation graphs. State changes propagate through the graph automatically, eliminating manual DOM synchronization.

### 2. Atomic Design
Components follow atomic design methodology (atoms → molecules → organisms → templates → pages), but each level is compiled to GPU-executable graph nodes.

### 3. WASM Performance
Bounded contexts (business logic domains) run in WebAssembly for predictable, near-native performance. Critical paths avoid JavaScript entirely.

### 4. GPU-First Audio
Audio processing runs on GPU compute shaders when available, falling back to WASM AudioWorklets. Target latency: **<10ms end-to-end**.

---

## System Layers

Harmony is organized into five distinct layers:

```
┌─────────────────────────────────────────────────────┐
│  Layer 5: Application Templates & Pages            │
│  (Composition of organisms, app-specific logic)     │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Layer 4: Organisms & Molecules                     │
│  (Reusable UI components, Web Components)           │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: Primitives & Atoms                        │
│  (Base components: buttons, inputs, labels)         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: Graph Runtime & Event Bus                 │
│  (Reactive graph engine, event routing, state)      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Layer 1: Bounded Contexts (WASM)                   │
│  (Audio, Graph, Transport, Timeline, Mixer)         │
└─────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**Layer 1 (Bounded Contexts):** Pure business logic, no DOM access. Compiled to WASM from Rust. Examples: audio processing, graph computation, transport control.

**Layer 2 (Graph Runtime):** Manages reactive computation graphs, event routing via EventBus, cross-graph reactivity. Pure JavaScript.

**Layer 3 (Primitives):** Atomic UI components with shadow DOM. Publish events, never call bounded contexts directly. Examples: `hds-button`, `hds-slider`, `hds-knob`.

**Layer 4 (Organisms):** Composed components with internal state. Examples: `mixer-channel`, `timeline-ruler`, `plugin-rack`.

**Layer 5 (Templates):** Full-page layouts and application shells. Wire up EventBus, initialize bounded contexts, manage routing.

---

## Core Architecture

### The Graph Engine

At the heart of Harmony is a **reactive computation graph** that powers both UI and audio processing.

**Key Concepts:**

- **Nodes:** Computation units with typed inputs/outputs
- **Edges:** Data flow connections between nodes
- **Cross-Graph Edges:** Special edges that connect nodes across different graph instances (see [cross-graph-reactivity-flow.md](./cross-graph-reactivity-flow.md))
- **Reactivity:** Changes propagate automatically through the graph

**Implementation:** See [harmony-graph/](../harmony-graph/) for the JavaScript runtime and [bounded-contexts/graph-bc/](../bounded-contexts/graph-bc/) for the WASM core.

### The Event Bus

The **EventBus** is the central nervous system of Harmony. It routes commands from UI to bounded contexts and publishes results back.

**Pattern:**
```
UI Component → Publish Event → EventBus → Route to BC → BC Processes → Publish Result → UI Updates
```

**Singleton Rule:** Only one EventBus instance exists per runtime, exported from [core/event-bus.js](../core/event-bus.js). All packages re-export from this path.

**Key Features:**
- Type-safe event validation via schemas
- Automatic logging of routing failures
- Debug UI via `Ctrl+Shift+E` (see [components/event-bus-component.js](../components/event-bus-component.js))

### Bounded Contexts

Bounded contexts are **domain-specific modules** that encapsulate business logic:

| Context | Responsibility | Location |
|---------|---------------|----------|
| **audio-bc** | Audio processing, DSP, effects | [bounded-contexts/audio-bc/](../bounded-contexts/audio-bc/) |
| **graph-bc** | Graph computation, reactivity | [bounded-contexts/graph-bc/](../bounded-contexts/graph-bc/) |
| **transport-bc** | Playback control, tempo, sync | [bounded-contexts/transport-bc/](../bounded-contexts/transport-bc/) |
| **timeline-bc** | Timeline rendering, clips, automation | [bounded-contexts/timeline-bc/](../bounded-contexts/timeline-bc/) |
| **mixer-bc** | Mixing, routing, sends, busses | [bounded-contexts/mixer-bc/](../bounded-contexts/mixer-bc/) |

**Technology:** All bounded contexts are written in **Rust** and compiled to **WebAssembly** using `wasm-pack`.

**Communication:** Bounded contexts **never call each other directly**. They communicate via EventBus events only.

---

## Component Model

### Web Components

All UI components are **vanilla Web Components** with shadow DOM. No frameworks.

**Base Pattern:**
```javascript
class HdsButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  render() {
    // Build shadow DOM
  }
  
  publishEvent(type, detail) {
    // Publish to EventBus, never call BCs directly
  }
}
```

**Location:** Primitives in [primitives/](../primitives/), molecules in [components/](../components/), organisms in [organisms/](../organisms/).

### Graph-Backed Components

Advanced components (like `hds-button`) are **backed by GPU computation graphs**:

1. Component state is extracted to a graph node
2. User interactions update graph inputs
3. Graph computes on GPU (via WebGPU shaders)
4. Results flow back to component for rendering

**Example:** The refactored `hds-button` (see [docs/hds-button-refactored.md](./hds-button-refactored.md)) computes hover/press states on GPU.

**Benefits:**
- Consistent 60fps even with hundreds of components
- Animation curves computed in parallel
- State changes batch automatically

---

## Data Flow

### User Interaction Flow

```
1. User clicks button
   ↓
2. Component publishes "ButtonClicked" event
   ↓
3. EventBus validates event schema
   ↓
4. EventBus routes to subscribed bounded context (e.g., transport-bc)
   ↓
5. BC processes command in WASM
   ↓
6. BC publishes result event (e.g., "PlaybackStarted")
   ↓
7. UI components subscribed to result update their state
   ↓
8. Graph reactivity propagates changes
   ↓
9. DOM updates (batched, 16ms budget)
```

### Audio Processing Flow

```
1. AudioWorklet requests samples
   ↓
2. SharedArrayBuffer transfers data to WASM
   ↓
3. audio-bc processes DSP graph
   ↓
4. GPU shaders compute effects (if available)
   ↓
5. Results written back to SharedArrayBuffer
   ↓
6. AudioWorklet renders to output
   ↓
   (Target: <10ms latency)
```

### State Synchronization

State lives in **three places**:

1. **Component local state:** Ephemeral UI state (hover, focus)
2. **Graph state:** Reactive computed state (derived values, animations)
3. **Bounded context state:** Business logic state (playback position, mixer levels)

**Synchronization:** EventBus events keep these in sync. Components never directly read BC state.

---

## Performance Strategy

### Budgets (Non-Negotiable)

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| Render frame | 16ms | Chrome DevTools Performance |
| WASM heap | 50MB | Runtime monitoring |
| Initial load | 200ms | Lighthouse CI |
| Audio latency | 10ms | Real-time profiling |

### Optimization Techniques

**1. GPU Offloading**
- Animation curves computed in WebGPU shaders
- Parallel processing of component states
- Audio effects run on GPU when available

**2. WASM for Critical Paths**
- Graph computation in Rust (predictable performance)
- Audio DSP in Rust (no GC pauses)
- Zero-copy data transfer via SharedArrayBuffer

**3. Batching & Caching**
- DOM updates batched per frame
- Graph computation results cached
- Event validation schemas compiled once

**4. Lazy Loading**
- Components loaded on-demand
- Bounded contexts initialized only when needed
- Assets streamed progressively

---

## Technology Stack

### Core Technologies

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| UI Components | Vanilla Web Components | Zero framework overhead, native browser support |
| Graph Runtime | JavaScript (ES modules) | Fast iteration, good tooling, native async |
| Bounded Contexts | Rust → WASM | Predictable performance, memory safety |
| GPU Compute | WebGPU (WGSL shaders) | Parallel processing, hardware acceleration |
| Audio | Web Audio API + AudioWorklets | Low-latency audio, standard API |
| Storage | IndexedDB | Persistent project storage, large capacity |
| Desktop | Tauri | Lightweight, secure, Rust-based |

### Build Tools (Dev-Only)

- **npm packages:** Build tools, dev servers, test runners (NOT runtime dependencies)
- **Python:** Test servers, build scripts, prototypes (NOT production runtime)
- **wasm-pack:** Rust → WASM compilation
- **Storybook:** Component development and documentation

### Forbidden Technologies

- ❌ React, Vue, Leptos, or any UI framework
- ❌ npm packages in production runtime code
- ❌ Electron (use Tauri for desktop)
- ❌ Async operations in audio render thread

---

## Key Design Decisions

### 1. Why No Frameworks?

**Decision:** Use vanilla Web Components instead of React/Vue/Leptos.

**Rationale:**
- Zero framework overhead (important for 200ms load budget)
- Native browser support (no polyfills)
- Fine-grained control over rendering (critical for 16ms frame budget)
- Long-term stability (Web Components are a web standard)

**Trade-off:** More boilerplate code, but performance is non-negotiable.

### 2. Why Rust for Bounded Contexts?

**Decision:** Write all business logic in Rust, compile to WASM.

**Rationale:**
- Predictable performance (no GC pauses during audio processing)
- Memory safety (critical for long-running audio apps)
- Shared code between desktop (Tauri) and web
- Strong type system catches bugs at compile time

**Trade-off:** Slower iteration than JavaScript, but correctness matters more than speed.

### 3. Why Graph-Based Reactivity?

**Decision:** Model all state as reactive computation graphs.

**Rationale:**
- Automatic propagation of changes (no manual `setState`)
- GPU-friendly (graphs compile to shaders)
- Visual debugging (graphs can be rendered as diagrams)
- Composable (small graphs combine into larger ones)

**Trade-off:** Steeper learning curve, but scales better than imperative code.

### 4. Why EventBus Instead of Direct Calls?

**Decision:** Components publish events, never call bounded contexts directly.

**Rationale:**
- Decoupling (UI doesn't know about BC implementation)
- Testability (mock EventBus for unit tests)
- Debuggability (all events logged and inspectable)
- Flexibility (swap BC implementations without changing UI)

**Trade-off:** More indirection, but maintainability is worth it.

### 5. Why GPU-First Audio?

**Decision:** Implement audio effects as WebGPU shaders when possible.

**Rationale:**
- Parallel processing (hundreds of effects in parallel)
- Lower latency (GPU compute is faster than CPU for DSP)
- Future-proof (GPU compute is the future of audio)

**Trade-off:** Fallback to WASM required (not all browsers support WebGPU yet).

---

## Next Steps

To dive deeper into specific areas:

- **Component Development:** See [atomic-to-graph-mapping.md](./atomic-to-graph-mapping.md)
- **Graph Programming:** See [cross-graph-reactivity-flow.md](./cross-graph-reactivity-flow.md)
- **Code Assembly:** See [code-assembly-pipeline.md](./code-assembly-pipeline.md)
- **State Extraction:** See [component-state-extraction-guide.md](./component-state-extraction-guide.md)
- **Shader Pipeline:** See [gpu-shader-compilation-pipeline.md](./gpu-shader-compilation-pipeline.md)

For implementation examples:

- **Button Component:** [primitives/hds-button/](../primitives/hds-button/)
- **EventBus Implementation:** [core/event-bus.js](../core/event-bus.js)
- **Graph Runtime:** [harmony-graph/](../harmony-graph/)
- **Audio BC:** [bounded-contexts/audio-bc/](../bounded-contexts/audio-bc/)

---

## Glossary

**Bounded Context (BC):** A domain-specific module that encapsulates business logic (Rust → WASM).

**Cross-Graph Edge:** A connection between nodes in different graph instances, enabling reactivity across component boundaries.

**EventBus:** The central event routing system that connects UI components to bounded contexts.

**Graph Node:** A computation unit in the reactive graph with typed inputs and outputs.

**Primitive:** An atomic UI component (e.g., button, input, label).

**Shadow DOM:** An encapsulated DOM tree attached to a Web Component, isolated from the main document.

**WASM (WebAssembly):** A binary instruction format for near-native performance in browsers.

**WebGPU:** A modern GPU API for compute shaders and rendering.

---

**Document Maintenance:**
This document is updated whenever major architectural changes occur. Last reviewed: 2025-01-15.

**Questions or Feedback:**
File an issue in the repository or discuss in the architecture channel.