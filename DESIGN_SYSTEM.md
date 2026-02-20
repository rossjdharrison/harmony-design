# Harmony Design System

**Version**: 1.0.0  
**Last Updated**: 2025-01-09

## Welcome

This is the Harmony Design System documentation. It describes how the system works, how to use it, and how to contribute. All documentation is written in clear, B1-level English.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Architecture](#architecture)
4. [Graph Model](#graph-model)
5. [Component System](#component-system)
6. [Event System](#event-system)
7. [Performance](#performance)
8. [Development Workflow](#development-workflow)
9. [Testing](#testing)
10. [Deployment](#deployment)

## Overview

Harmony is a design system built for high-performance web applications. It uses:
- **Web Components** for UI elements
- **Reactive Graph Model** for state management
- **WebAssembly** for computation-heavy tasks
- **GPU-First Audio** processing
- **Atomic Design** principles

**Key Files:**
- Main entry point: `src/index.js`
- Core components: `components/`
- Documentation: `docs/`

## Getting Started

### Installation

See detailed instructions: [`docs/installation.md`](docs/installation.md)

Quick start:
```bash
git clone <repository-url>
cd harmony-design
npm install
npm run dev
```

### Your First Component

```javascript
// components/my-component.js
class MyComponent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
      </style>
      <div>Hello, Harmony!</div>
    `;
  }
}

customElements.define('my-component', MyComponent);
```

## Architecture

### High-Level Overview

See full details: [`docs/architecture.md`](docs/architecture.md)

The system has three main layers:

1. **Presentation Layer** - Web Components (HTML/CSS/JS)
2. **Logic Layer** - Bounded Contexts (Rust → WASM)
3. **Data Layer** - Graph Model + IndexedDB

**Rule**: UI rendering uses vanilla JS. Core logic uses Rust/WASM.

### Directory Structure

```
harmony-design/
├── components/          # UI components
├── bounded-contexts/    # Rust WASM modules
├── harmony-graph/       # Graph engine
├── harmony-schemas/     # Type definitions
├── docs/               # Documentation
├── tests/              # Test suites
└── tools/              # Build and dev tools
```

## Graph Model

### Core Concepts

See full documentation: [`docs/graph-model.md`](docs/graph-model.md)

The Graph Model is a reactive computation graph that powers:
- Component state management
- Event propagation
- Dependency tracking
- Side effect coordination

#### Nodes

Nodes represent computational units:
- **Source Nodes**: Entry points (user input, timers)
- **Transform Nodes**: Pure computations
- **Effect Nodes**: Side effects (DOM updates, network)
- **Sink Nodes**: Terminal operations (logging, analytics)

**Example:**
```javascript
graph.addNode({
  id: 'my-transform',
  type: 'transform',
  compute: (inputs) => inputs.value * 2,
  dependencies: ['input-node']
});
```

See implementation: `harmony-graph/src/graph.js`

#### Edges

Edges define relationships between nodes:
- **Data Flow**: Value propagation
- **Event Flow**: Event propagation
- **Dependency**: Execution ordering

**Example:**
```javascript
graph.addEdge({
  source: 'input-node',
  target: 'my-transform',
  type: 'data-flow'
});
```

#### Events

Events trigger node computations:
- `NodeStateChanged` - Node value updated
- `PropagationStarted` - Update wave begins
- `PropagationCompleted` - Update wave finished

See event system: `core/event-bus.js`

#### Propagation

Propagation updates dependent nodes automatically:

1. Detect changes in source nodes
2. Sort affected nodes topologically
3. Batch updates in single frame
4. Execute computations in order

**Performance**: Must complete within 16ms (60fps budget).

See propagation details: [`docs/graph-model.md#propagation`](docs/graph-model.md#propagation)

### Integration with Components

Components register as graph nodes:

```javascript
class ReactiveComponent extends HTMLElement {
  connectedCallback() {
    this.nodeId = graph.addNode({
      id: `component-${this.id}`,
      type: 'effect',
      compute: (inputs) => this.render(inputs)
    });
  }
}
```

See base component: `components/primitives/base-component.js`

## Component System

### Atomic Design

Components follow atomic design principles:

- **Atoms**: `components/primitives/` - Basic elements
- **Molecules**: `components/molecules/` - Simple combinations
- **Organisms**: `organisms/` - Complex sections
- **Templates**: `templates/` - Page layouts

### Web Components

All components use Web Components standard:
- Custom elements
- Shadow DOM
- HTML templates

**Rule**: All components must use shadow DOM for style encapsulation.

### Component Lifecycle

See bounded context: `bounded-contexts/component-lifecycle/`

Lifecycle hooks:
- `connectedCallback()` - Component added to DOM
- `disconnectedCallback()` - Component removed
- `attributeChangedCallback()` - Attribute changed
- `adoptedCallback()` - Component moved to new document

## Event System

### EventBus

Central event bus for application-wide communication.

See implementation: `core/event-bus.js`

**Pattern**:
```javascript
// Publish event
eventBus.publish('ButtonClicked', { buttonId: 'submit' });

// Subscribe to event
eventBus.subscribe('ButtonClicked', (event) => {
  console.log('Button clicked:', event.buttonId);
});
```

**Rule**: UI components publish events, never call bounded contexts directly.

### EventBus Debugger

Press `Ctrl+Shift+E` to open the EventBus debugger on any page.

See component: `components/event-bus-component.js`

### Event Validation

Events are validated against schemas:

See schemas: `harmony-schemas/src/events.rs`

## Performance

### Performance Budgets

**Critical constraints** (cannot be violated):

1. **Render Budget**: 16ms per frame (60fps)
2. **Memory Budget**: 50MB WASM heap
3. **Load Budget**: 200ms initial load
4. **Audio Latency**: 10ms end-to-end

See monitoring: `performance/`

### Optimization Techniques

- **Graph Pruning**: Remove unused nodes
- **Memoization**: Cache computation results
- **Batch Updates**: Group related changes
- **Lazy Loading**: Load components on demand

See guidelines: `docs/performance.md`

### Performance Monitoring

```javascript
// See: performance/web-vitals-collector.js
import { collectWebVitals } from './performance/web-vitals-collector.js';

collectWebVitals((metrics) => {
  console.log('LCP:', metrics.lcp);
  console.log('FID:', metrics.fid);
  console.log('CLS:', metrics.cls);
});
```

## Development Workflow

### Making Changes

1. **Schema Changes**: Edit `harmony-schemas/src/*.rs`
2. **Run Codegen**: `cd harmony-schemas && npm run codegen`
3. **Verify**: Check generated code in `harmony-dev/`
4. **Test**: Run test suite
5. **Commit**: Include schema + generated code together

**Rule**: Never edit Rust directly. Always modify schema first.

### Testing Components

**Rule**: All UI components must be tested in Chrome before completion.

Test checklist:
- [ ] Default state
- [ ] Hover state
- [ ] Focus state
- [ ] Active state
- [ ] Disabled state
- [ ] Error states (if applicable)
- [ ] Loading states (if applicable)
- [ ] Empty states (if applicable)

### Git Workflow

```bash
# Make changes
git add .
git commit -m "feat(task-id): description"
git push origin main
```

**Rule**: Git push is mandatory before starting new tasks.

## Testing

### Unit Tests

```bash
npm run test:unit
```

See tests: `tests/unit/`

### Integration Tests

```bash
npm run test:integration
```

See tests: `tests/integration/`

### E2E Tests

```bash
npm run test:e2e
```

See tests: `tests/e2e/`

### Quality Gates

All tests must pass before merging:
- Unit tests
- Integration tests
- Performance tests
- Bundle size checks
- License validation

See CI: `.github/workflows/`

## Deployment

### Build

```bash
npm run build
```

Output: `dist/`

### Preview

```bash
npm run preview
```

### Production

Deployed automatically via Vercel on push to main.

See config: `vercel.json`

### Health Checks

Health endpoints for monitoring:

- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

See implementation: `health/`

## Additional Documentation

### Detailed Guides

- **Installation**: [`docs/installation.md`](docs/installation.md)
- **Architecture**: [`docs/architecture.md`](docs/architecture.md)
- **Graph Model**: [`docs/graph-model.md`](docs/graph-model.md)

### API Reference

- **EventBus**: `core/event-bus.js`
- **Graph**: `harmony-graph/src/graph.js`
- **Components**: `components/`

### Examples

- **Basic Demo**: `demo-components.html`
- **Advanced Demo**: `demo-advanced.html`
- **Cascade Demo**: `demo-cascade.html`

## Contributing

### Code Style

- Use JSDoc comments for all functions
- Follow ESLint rules (`.eslintrc.json`)
- Use Prettier for formatting (`.prettierrc.json`)

### Documentation

**Rule**: Documentation updates are mandatory for every task.

When you change code:
1. Update relevant docs in `docs/`
2. Update this file if needed
3. Add JSDoc comments to code
4. Link docs ↔ code (two-way references)

### Getting Help

1. Check documentation first
2. Use EventBus debugger (`Ctrl+Shift+E`)
3. Enable graph tracing
4. Create issue in repository

## License

See LICENSE file in repository.

---

**Questions?** Check the detailed guides in `docs/` or create an issue.