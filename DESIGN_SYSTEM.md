# Harmony Design System

**Version**: 1.0.0  
**Last Updated**: 2025-01-15

Welcome to the Harmony Design System documentation. This guide explains the core concepts, workflows, and implementation patterns for building high-performance audio applications with reactive components.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Architecture](#architecture)
4. [Component System](#component-system)
5. [Event-Driven Communication](#event-driven-communication)
6. [Audio Processing](#audio-processing)
7. [Performance Budgets](#performance-budgets)
8. [Development Workflows](#development-workflows)
9. [Testing Guidelines](#testing-guidelines)
10. [File Organization](#file-organization)
11. [Implementation Notes](#implementation-notes)

---

## Overview

Harmony is a **GPU-first, WASM-powered audio design system** built on four foundational pillars:

- **Reactive Component System**: Web Components with shadow DOM and event-driven state
- **Atomic Design**: Hierarchical composition from primitives to templates
- **WASM Performance**: Rust-based bounded contexts compiled to WebAssembly
- **GPU-First Audio**: WebGPU acceleration for audio processing

### Design Philosophy

Harmony prioritizes **performance, modularity, and developer experience**. Every component, module, and pattern is designed to meet strict performance budgets while remaining simple to understand and extend.

---

## Core Concepts

### Bounded Contexts

Bounded contexts encapsulate domain logic in **Rust modules compiled to WASM**. They handle:

- Audio graph processing (see `harmony-graph-bc/`)
- Parameter management (see `bounded-contexts/parameter-bc/`)
- State transitions (see `state-machine/`)

**Key Pattern**: Bounded contexts subscribe to command events and publish result events. They never directly manipulate the DOM.

**Example Flow**:
```
User clicks Play → UI publishes "PlayCommand" → GraphBC subscribes → Processes → Publishes "PlaybackStarted"
```

See implementation: `bounded-contexts/graph-bc/src/lib.rs`

### Semantic Types

Semantic types define **domain-specific data structures** with validation and serialization:

- `Scene3D`: 3D scene configuration (see `harmony-schemas/schemas/semantic_types/Scene3D.json`)
- `Transform3D`: 3D transformation matrices (see `harmony-schemas/schemas/semantic_types/Transform3D.json`)
- `SpatialInput`: XR/spatial input abstraction (see `docs/specs/SpatialInput.md`)

**Workflow**: Define schema in `harmony-schemas/` → Run codegen → Use generated types in Rust/TypeScript.

See: `harmony-schemas/README.md`

### Design Tokens

Design tokens are **immutable design decisions** stored as JSON schemas:

- Visual: colors, typography, spacing (see `tokens/visual/`)
- Spatial: 3D depth, field-of-view (see `tokens/spatial/`)
- Temporal: animation timing, audio latency (see `tokens/temporal/`)

**Usage**: Import tokens in components via `import tokens from '../../tokens/visual/colors.json'`

See: `tokens/README.md`

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI Rendering** | Vanilla HTML/CSS/JS | DOM manipulation, visual components |
| **Component Model** | Web Components | Encapsulation via shadow DOM |
| **Business Logic** | Rust → WASM | Bounded contexts, audio processing |
| **Communication** | EventBus singleton | Decoupled pub/sub messaging |
| **Audio Engine** | WebGPU + AudioWorklet | GPU-accelerated DSP |
| **Build Tools** | wasm-pack, esbuild | Compilation and bundling |

**Critical Rule**: UI code is JavaScript. Core logic is Rust. No exceptions without architecture review.

### Package Structure

```
harmony-design/
├── components/          # UI components (primitives, molecules, organisms)
├── bounded-contexts/    # Rust WASM modules (graph-bc, parameter-bc)
├── harmony-schemas/     # JSON schemas and codegen
├── tokens/              # Design tokens (visual, spatial, temporal)
├── core/                # EventBus singleton, TypeNavigator
├── hooks/               # Reactive state hooks
├── styles/              # Global CSS and themes
├── examples/            # Demo applications
└── DESIGN_SYSTEM.md     # This file
```

See: `package.json` for build scripts

### Data Flow

```
User Interaction → UI Component → EventBus → Bounded Context → State Update → UI Re-render
```

**Example**: Slider adjustment
1. User drags slider (see `components/primitives/slider/slider.js`)
2. Slider publishes `ParameterChanged` event
3. EventBus routes to ParameterBC (see `bounded-contexts/parameter-bc/src/lib.rs`)
4. ParameterBC validates and updates state
5. ParameterBC publishes `ParameterUpdated` event
6. UI components subscribed to updates re-render

---

## Component System

### Atomic Design Hierarchy

Components follow **atomic design principles**:

1. **Primitives** (`components/primitives/`): Buttons, sliders, knobs
2. **Molecules** (`components/molecules/`): Parameter groups, control clusters
3. **Organisms** (`organisms/`): Complete plugin UIs, mixers
4. **Templates** (`templates/`): Page layouts, application shells

**Naming Convention**: `{level}-{name}.js` (e.g., `primitive-button.js`)

### Web Component Pattern

All components extend `HTMLElement` and use shadow DOM:

```javascript
class HarmonyButton extends HTMLElement {
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
      <button part="button">${this.textContent}</button>
    `;
  }
}

customElements.define('harmony-button', HarmonyButton);
```

See: `components/primitives/button/button.js`

### Component Lifecycle

1. **Construction**: Initialize shadow DOM
2. **Connection**: Render template, attach listeners
3. **Attribute Changes**: Re-render on observed attributes
4. **Disconnection**: Clean up listeners, subscriptions

**Performance Note**: Use `requestAnimationFrame` for visual updates to stay within 16ms budget.

### State Management

Components use **reactive hooks** for state:

```javascript
import { useSignal } from '../../../hooks/use-signal.js';

const count = useSignal(0);
count.subscribe(value => this.render());
count.set(count.value + 1);
```

See: `hooks/use-signal.js`

---

## Event-Driven Communication

### EventBus Singleton

The EventBus is the **central nervous system** of Harmony. It provides decoupled pub/sub messaging.

**Critical Policy**: Only ONE EventBus instance exists, defined in `core/event-bus.js`.

**Location**: `core/event-bus.js`

### Publishing Events

```javascript
import { EventBus } from '../core/event-bus.js';

const bus = EventBus.getInstance();
bus.publish('ParameterChanged', {
  nodeId: 'osc-1',
  paramName: 'frequency',
  value: 440
});
```

### Subscribing to Events

```javascript
const subscription = bus.subscribe('ParameterChanged', (payload) => {
  console.log('Parameter changed:', payload);
});

// Clean up
subscription.unsubscribe();
```

### ProcessCommand Pattern

Bounded contexts use the **ProcessCommand pattern**:

```rust
// In Rust WASM module
#[wasm_bindgen]
pub fn process_command(command_type: &str, payload: JsValue) -> Result<JsValue, JsValue> {
    match command_type {
        "Play" => handle_play(payload),
        "Stop" => handle_stop(payload),
        _ => Err(JsValue::from_str("Unknown command"))
    }
}
```

See: `bounded-contexts/graph-bc/src/commands.rs`

### Event Naming Convention

- **Commands**: Imperative verbs (e.g., `PlayCommand`, `SetParameterCommand`)
- **Events**: Past tense (e.g., `PlaybackStarted`, `ParameterUpdated`)
- **Queries**: Questions (e.g., `GetNodeState`, `QueryAvailablePlugins`)

### EventBus Debugging

The EventBus component is available on every page for debugging:

- **Shortcut**: `Ctrl+Shift+E` to toggle visibility
- **Location**: Included in `templates/app-shell.html`
- **Features**: Event log, payload inspection, subscription viewer

See: `components/organisms/event-bus-debugger/event-bus-debugger.js`

---

## Audio Processing

### WebGPU Pipeline

Audio processing uses **WebGPU compute shaders** for maximum performance:

1. **Input**: AudioWorklet reads audio buffer
2. **Transfer**: SharedArrayBuffer passes data to GPU
3. **Processing**: WebGPU compute shader applies DSP
4. **Output**: Results written back via SharedArrayBuffer
5. **Playback**: AudioWorklet outputs processed audio

**Latency Budget**: Maximum 10ms end-to-end.

See: `harmony-graph/src/gpu-processor.js`

### Audio Graph

The audio graph is a **directed acyclic graph (DAG)** of processing nodes:

- **Nodes**: Oscillators, filters, effects (see `harmony-graph/src/nodes/`)
- **Edges**: Audio connections with gain and routing
- **Parameters**: Automatable values with smoothing

**Implementation**: Rust in `harmony-graph-bc/src/graph.rs`

### Cross-Graph Edges

Edges between graphs **must be indexed** for efficient lookup:

```rust
pub struct CrossGraphEdge {
    pub source_graph_id: GraphId,
    pub target_graph_id: GraphId,
    pub source_node_id: NodeId,
    pub target_node_id: NodeId,
}

// Indexed in HashMap for O(1) lookup
```

See: `harmony-graph-bc/src/cross_graph.rs`

### Dual Implementation Requirement

All audio processing functions **must have both WebGPU and WASM implementations**:

- **WebGPU**: For GPU-capable devices (preferred)
- **WASM**: Fallback for compatibility

**Example**: Convolution reverb has both `gpu-convolution.wgsl` and `wasm-convolution.rs`.

See: `harmony-graph/src/processors/`

---

## Performance Budgets

### Strict Limits

| Metric | Budget | Measurement |
|--------|--------|-------------|
| **Render Time** | 16ms | Chrome DevTools Performance panel |
| **Memory** | 50MB WASM heap | `performance.memory.usedJSHeapSize` |
| **Initial Load** | 200ms | Lighthouse Performance score |
| **Audio Latency** | 10ms | AudioWorklet round-trip time |
| **Frame Rate** | 60fps | Animations and visual updates |

**Policy**: These budgets are **absolute constraints** and cannot be violated.

### Performance Testing

All animations and complex components must be tested:

1. Open Chrome DevTools → Performance tab
2. Record interaction (e.g., slider drag, animation)
3. Verify all frames complete within 16ms
4. Check for layout thrashing or forced reflows

**Example**: `components/primitives/slider/slider.test.js` includes performance benchmarks.

### GPU-First Targets

- **Buffer Size**: 128 samples (preferred), 256 max
- **Sample Rate**: 48kHz standard
- **Channels**: Stereo (2 channels)
- **Bit Depth**: 32-bit float

See: `harmony-graph/src/audio-context.js`

---

## Development Workflows

### Adding a New Component

1. **Design**: Create `.pen` file in `design/` (optional)
2. **Implement**: Create component in `components/{level}/{name}/`
3. **Style**: Use design tokens from `tokens/`
4. **Test**: Write tests in `{name}.test.js`
5. **Verify**: Test all states in Chrome (default, hover, focus, active, disabled)
6. **Document**: Update this file with usage examples
7. **Commit**: Include component, tests, and documentation

**Template**: See `components/primitives/button/` for reference structure.

### Modifying a Schema

1. **Navigate**: `cd harmony-schemas`
2. **Edit**: Modify schema in `schemas/semantic_types/{Type}.json`
3. **Codegen**: Run `npm run codegen`
4. **Verify**: Check generated code in `harmony-dev/crates/` and `harmony-dev/workers/`
5. **Commit**: Commit schema AND generated code together

**Critical**: CI fails if schema changed but generated code is stale.

See: `harmony-schemas/README.md`

### Building WASM Modules

1. **Navigate**: `cd bounded-contexts/{context-name}`
2. **Build**: `wasm-pack build --target web`
3. **Output**: Check `pkg/` directory for `.wasm` and `.js` files
4. **Import**: Use in JavaScript via `import init, { processCommand } from './pkg/{context}.js'`

**CI Requirement**: `.github/workflows/ci-build.yml` must include `build-wasm` job.

### Testing in Chrome

**Mandatory for all UI components**:

1. Open `examples/{component-name}.html` in Chrome
2. Test **all states**: default, hover, focus, active, disabled
3. For complex components: error states, loading states, empty states
4. Verify **performance**: 60fps for animations
5. Check **accessibility**: keyboard navigation, screen reader support

**No component is complete without Chrome verification.**

### Creating a Bounded Context

1. **Create**: `mkdir bounded-contexts/{context-name}`
2. **Initialize**: `cargo init --lib`
3. **Configure**: Add `wasm-bindgen` and `serde` dependencies
4. **Implement**: Define commands and state in `src/lib.rs`
5. **Build**: `wasm-pack build --target web`
6. **Integrate**: Wire into EventBus in composition root

See: `bounded-contexts/graph-bc/` for reference implementation.

---

## Testing Guidelines

### Unit Tests

- **Location**: `{module}.test.js` next to source file
- **Framework**: Native browser APIs (no Jest, Mocha, etc.)
- **Pattern**: Arrange, Act, Assert

```javascript
// slider.test.js
export function testSliderValue() {
  const slider = document.createElement('harmony-slider');
  slider.setAttribute('value', '50');
  document.body.appendChild(slider);
  
  const actual = slider.value;
  const expected = 50;
  
  console.assert(actual === expected, `Expected ${expected}, got ${actual}`);
  document.body.removeChild(slider);
}
```

### Integration Tests

- **Location**: `tests/integration/`
- **Scope**: Multi-component interactions, EventBus flows
- **Example**: User clicks button → EventBus → BC → State update → UI re-render

See: `tests/integration/parameter-flow.test.js`

### Performance Tests

- **Requirement**: All animations must target 60fps
- **Tool**: Chrome DevTools Performance panel
- **Metrics**: Frame time, scripting time, rendering time

```javascript
// Performance benchmark example
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  slider.setValue(Math.random() * 100);
}
const end = performance.now();
console.assert(end - start < 16, 'Exceeded 16ms budget');
```

### Quality Gates

Before merging, all quality gates must pass:

1. **Build**: All TypeScript/Rust compiles without errors
2. **Tests**: All unit and integration tests pass
3. **Performance**: Budgets met (16ms render, 50MB memory, 200ms load)
4. **Linting**: ESLint and Prettier pass
5. **WASM**: `build-wasm` job succeeds in CI

**CI Pipeline**: `.github/workflows/ci-build.yml`

---

## File Organization

### Directory Structure

```
harmony-design/
├── components/
│   ├── primitives/        # Atomic UI elements
│   │   ├── button/
│   │   ├── slider/
│   │   └── knob/
│   ├── molecules/         # Component compositions
│   └── organisms/         # Complex UI sections
├── bounded-contexts/
│   ├── graph-bc/          # Audio graph processing (Rust)
│   └── parameter-bc/      # Parameter management (Rust)
├── harmony-schemas/       # JSON schemas and codegen
│   ├── schemas/
│   │   └── semantic_types/
│   └── codegen/
├── tokens/
│   ├── visual/            # Colors, typography, spacing
│   ├── spatial/           # 3D depth, FOV
│   └── temporal/          # Animation timing
├── core/
│   ├── event-bus.js       # EventBus singleton
│   └── type-navigator.js  # Type-safe queries
├── hooks/                 # Reactive state hooks
├── styles/                # Global CSS
├── examples/              # Demo applications
├── tests/                 # Integration tests
└── DESIGN_SYSTEM.md       # This file
```

### Naming Conventions

- **Components**: `{level}-{name}.js` (e.g., `primitive-button.js`)
- **Bounded Contexts**: `{domain}-bc/` (e.g., `graph-bc/`)
- **Schemas**: `{Type}.json` (e.g., `Scene3D.json`)
- **Tokens**: `{category}.json` (e.g., `colors.json`)
- **Tests**: `{module}.test.js`

### Import Paths

Use **relative imports** for local modules:

```javascript
// Good
import { EventBus } from '../../core/event-bus.js';

// Bad (no npm dependencies in runtime)
import { EventBus } from '@harmony/core';
```

### Composition Root

Every deployable package must export a **composition root** from `src/index.js`:

```javascript
// src/index.js
import { EventBus } from '../core/event-bus.js';
import { initGraphBC } from '../bounded-contexts/graph-bc/init.js';

export function initializeHarmony() {
  const bus = EventBus.getInstance();
  initGraphBC(bus);
  return { bus };
}
```

**Policy**: A package without `src/index.js` is incomplete.

---

## Implementation Notes

### TypeNavigator Pattern

Use **TypeNavigator** for type-safe queries:

```javascript
import { TypeNavigator } from '../core/type-navigator.js';

const nav = new TypeNavigator(state);
const frequency = nav.query('nodes.osc-1.parameters.frequency');
```

**Policy**: TypeNavigator-only queries. No direct object access.

See: `core/type-navigator.js`

### SharedArrayBuffer for Audio

**AudioWorklet ↔ GPU data transfer must use SharedArrayBuffer**:

```javascript
const sharedBuffer = new SharedArrayBuffer(bufferSize * 4);
const float32View = new Float32Array(sharedBuffer);

// AudioWorklet writes
float32View.set(inputBuffer);

// GPU reads
const gpuBuffer = device.createBuffer({
  size: sharedBuffer.byteLength,
  usage: GPUBufferUsage.STORAGE,
  mappedAtCreation: true
});
new Float32Array(gpuBuffer.getMappedRange()).set(float32View);
```

See: `harmony-graph/src/shared-buffer.js`

### Project Serialization

**All project files must be serializable to JSON** for IndexedDB storage:

```javascript
const project = {
  version: '1.0.0',
  graph: {
    nodes: [...],
    edges: [...]
  },
  parameters: {...},
  metadata: {...}
};

// Save to IndexedDB
await db.put('projects', project, projectId);
```

See: `core/project-serializer.js`

### Desktop Wrapper

**Desktop applications must use Tauri**, not Electron:

```toml
# Cargo.toml
[dependencies]
tauri = "1.5"
```

**Rationale**: Smaller bundle size, better performance, Rust integration.

See: `desktop/tauri.conf.json`

### No Async in Audio Thread

**Audio render thread must be synchronous**:

```javascript
// AudioWorkletProcessor
process(inputs, outputs, parameters) {
  // Good: Synchronous processing
  for (let i = 0; i < outputs[0][0].length; i++) {
    outputs[0][0][i] = inputs[0][0][i] * gain;
  }
  
  // Bad: Async operations
  // await fetch('/data'); // NEVER DO THIS
  
  return true;
}
```

**Policy**: No async operations in audio render thread. Pre-fetch data in main thread.

### Blocked Task Protocol

If a task cannot be completed:

1. **Create Report**: `reports/blocked/{task_id}.md`
2. **Include**:
   - Reason for blockage
   - Attempted solutions
   - Recommended enabling work
3. **Await Instructions** or create enabling task

See: `reports/blocked/` for examples.

### Documentation Updates

**Mandatory**: Every task completion must update this file.

**Pattern**:
1. Implement feature
2. Add usage example to relevant section
3. Link to code files
4. Commit documentation with code

**Policy**: Task is not complete without documentation update.

### Git Workflow

**Push before starting new task**:

```bash
git add .
git commit -m "feat(task-id): Description"
git push origin main
```

**Verification**: `git status` must show "Your branch is up to date with 'origin/main'".

**Policy**: Cannot start new task until changes are pushed to remote.

---

## Quick Reference

### Common Commands

```bash
# Build WASM modules
cd bounded-contexts/graph-bc && wasm-pack build --target web

# Run codegen
cd harmony-schemas && npm run codegen

# Start dev server
npm run dev

# Run tests
npm test

# Check performance
npm run perf
```

### Key Files

- **EventBus Singleton**: `core/event-bus.js`
- **Type Navigator**: `core/type-navigator.js`
- **Schema Definitions**: `harmony-schemas/schemas/semantic_types/`
- **Design Tokens**: `tokens/`
- **Component Examples**: `examples/`

### Performance Checklist

- [ ] Render time < 16ms
- [ ] Memory < 50MB
- [ ] Load time < 200ms
- [ ] Audio latency < 10ms
- [ ] Animations at 60fps

### Before Committing

- [ ] All tests pass
- [ ] WASM builds successfully
- [ ] Chrome testing complete (all states verified)
- [ ] Documentation updated
- [ ] Quality gates pass
- [ ] No nested harmony-* directories

---

## Getting Help

- **Architecture Questions**: Review this file and `harmony-schemas/README.md`
- **Component Patterns**: See `components/primitives/button/` for reference
- **EventBus Usage**: Check `core/event-bus.js` and examples
- **Performance Issues**: Use Chrome DevTools Performance panel
- **Schema Changes**: Follow workflow in "Modifying a Schema" section

---

**Last Updated**: 2025-01-15  
**Maintainers**: Harmony Design System Team  
**License**: MIT