# Harmony Design System

A high-performance, GPU-accelerated design system for audio applications.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Installation Guide](#installation-guide)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Component Library](#component-library)
6. [Performance Guidelines](#performance-guidelines)
7. [Contributing](#contributing)

---

## Architecture Overview

Harmony Design System is built on four core pillars: **Reactive Component System**, **Atomic Design**, **WASM Performance**, and **GPU-First Audio**. This architecture enables professional-grade audio applications with real-time performance.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Runtime                          │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Vanilla JS + Web Components)                     │
│  ├─ Templates (Page-level compositions)                     │
│  ├─ Organisms (Complex UI sections)                         │
│  ├─ Molecules (Composite components)                        │
│  └─ Primitives (Atomic elements)                            │
├─────────────────────────────────────────────────────────────┤
│  Event Bus (Command/Query Pattern)                          │
│  ├─ Event routing and validation                            │
│  ├─ Type-safe messaging                                     │
│  └─ Debugging interface                                     │
├─────────────────────────────────────────────────────────────┤
│  Bounded Contexts (Rust → WASM)                             │
│  ├─ Component Lifecycle                                     │
│  ├─ Full-Text Index                                         │
│  ├─ Spatial Index                                           │
│  ├─ WASM Bridge                                             │
│  ├─ WASM Edge Executor                                      │
│  └─ WASM Node Registry                                      │
├─────────────────────────────────────────────────────────────┤
│  Audio Processing (WebGPU + AudioWorklet)                   │
│  ├─ GPU compute shaders                                     │
│  ├─ SharedArrayBuffer transfer                              │
│  └─ Real-time audio thread                                  │
├─────────────────────────────────────────────────────────────┤
│  State Management (Harmony Graph)                           │
│  ├─ Reactive graph engine                                   │
│  ├─ Cross-graph edge indexing                               │
│  └─ Serializable project state                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend (UI Layer)**
- **Vanilla JavaScript**: No framework dependencies for minimal bundle size
- **Web Components**: Shadow DOM for encapsulation and reusability
- **CSS Custom Properties**: Theme tokens for consistent styling
- **HTML Templates**: Declarative component markup

**Core Logic (Bounded Contexts)**
- **Rust**: Memory-safe, high-performance business logic
- **WebAssembly**: Near-native execution speed in browser
- **Component-Based Architecture**: Isolated, testable modules

**Audio Processing**
- **WebGPU**: GPU-accelerated audio effects and synthesis
- **AudioWorklet**: Real-time audio thread processing
- **SharedArrayBuffer**: Zero-copy data transfer between threads

**State Management**
- **Harmony Graph**: Custom reactive graph engine in Rust
- **IndexedDB**: Persistent project storage
- **JSON Serialization**: Portable project format

### Design Principles

#### 1. Reactive Component System

Components react to state changes through the Event Bus. No direct coupling between UI and business logic.

**Pattern:**
```
User Action → UI Event → EventBus → Bounded Context → Result Event → UI Update
```

**Example Flow:**
1. User clicks "Play" button
2. Button component publishes `PlayCommand` event
3. EventBus validates and routes to Audio BC
4. Audio BC processes and publishes `PlaybackStarted` event
5. UI components subscribed to playback state update

**Key Files:**
- [`core/event-bus.js`](core/event-bus.js) - Event routing and validation
- [`bounded-contexts/`](bounded-contexts/) - Business logic modules
- [`components/`](components/) - UI component library

#### 2. Atomic Design

Components follow atomic design methodology for consistency and reusability.

**Hierarchy:**
- **Primitives**: Basic elements (buttons, inputs, labels)
- **Molecules**: Simple combinations (labeled input, icon button)
- **Organisms**: Complex sections (toolbar, mixer channel)
- **Templates**: Page layouts (project view, settings panel)

**Benefits:**
- Consistent visual language
- Easy to test in isolation
- Clear composition patterns
- Scalable component library

**Key Files:**
- [`primitives/`](primitives/) - Atomic UI elements
- [`components/`](components/) - Molecule-level components
- [`organisms/`](organisms/) - Complex UI sections
- [`templates/`](templates/) - Page-level layouts

#### 3. WASM Performance

All performance-critical code runs in WebAssembly for near-native speed.

**Performance Budgets:**
- **Render Budget**: 16ms per frame (60fps)
- **Memory Budget**: 50MB WASM heap maximum
- **Load Budget**: 200ms initial load time
- **Audio Latency**: 10ms end-to-end maximum

**Optimization Strategies:**
- Compile Rust to WASM with size optimizations
- Use `wasm-opt` for binary size reduction
- Lazy-load non-critical WASM modules
- Pool allocations to reduce GC pressure

**Key Files:**
- [`bounded-contexts/*/Cargo.toml`](bounded-contexts/) - Rust module configs
- [`bounded-contexts/*/src/`](bounded-contexts/) - Rust source code
- [`harmony-schemas/`](harmony-schemas/) - Type definitions

#### 4. GPU-First Audio

Audio processing leverages WebGPU for parallel computation.

**Architecture:**
```
Audio Input → AudioWorklet → SharedArrayBuffer → WebGPU Compute → Output
```

**Dual Implementation:**
- **WebGPU**: Primary path for GPU-accelerated processing
- **WASM**: Fallback for systems without GPU support

**Latency Targets:**
- Buffer size: 128 samples (2.9ms at 44.1kHz)
- Processing overhead: <5ms
- Total latency: <10ms end-to-end

**Key Files:**
- [`harmony-core/`](harmony-core/) - Core audio engine
- [`harmony-graph/`](harmony-graph/) - Audio graph processing

### Data Flow

#### Command Flow (User Actions)

```
UI Component
    ↓ (publishes command event)
EventBus
    ↓ (validates and routes)
Bounded Context (WASM)
    ↓ (processes logic)
EventBus
    ↓ (publishes result event)
UI Components (subscribers)
```

#### Query Flow (Data Reads)

```
UI Component
    ↓ (calls TypeNavigator)
TypeNavigator
    ↓ (queries indexed data)
Spatial/Full-Text Index (WASM)
    ↓ (returns results)
UI Component (renders)
```

#### Audio Flow (Real-Time Processing)

```
Audio Input
    ↓
AudioWorklet Thread
    ↓ (writes to SharedArrayBuffer)
WebGPU Compute Shader
    ↓ (processes in parallel)
SharedArrayBuffer
    ↓ (reads processed data)
AudioWorklet Thread
    ↓
Audio Output
```

### Schema-Driven Development

All data structures are defined in JSON Schema and code-generated.

**Workflow:**
1. Define or modify schema in `harmony-schemas/`
2. Run codegen: `npm run codegen`
3. Generated code appears in `harmony-dev/crates/` and `harmony-dev/workers/`
4. Commit schema and generated code together

**Benefits:**
- Type safety across Rust/JS boundary
- Single source of truth for data structures
- Automatic validation logic
- Consistent serialization

**Key Files:**
- [`harmony-schemas/`](harmony-schemas/) - JSON Schema definitions
- [`scripts/codegen.js`](scripts/codegen.js) - Code generation script

### Performance Monitoring

Built-in performance tracking ensures system meets budgets.

**Metrics Collected:**
- **Web Vitals**: LCP, FID, CLS, TTFB
- **Custom Metrics**: WASM init time, audio latency, render time
- **Performance Observer**: Frame timing, long tasks

**Key Files:**
- [`performance/web-vitals-collector.js`](performance/web-vitals-collector.js)
- [`performance/custom-metrics-registry.js`](performance/custom-metrics-registry.js)
- [`performance/performance-observer.js`](performance/performance-observer.js)

### Error Handling

Structured error tracking with fingerprinting for deduplication.

**Features:**
- Unhandled promise rejection tracking
- Error fingerprinting for grouping
- Structured JSON logging
- Context preservation

**Key Files:**
- [`health/unhandled-rejection-tracker.js`](health/unhandled-rejection-tracker.js)
- [`health/error-fingerprinting.js`](health/error-fingerprinting.js)
- [`health/structured-logger.js`](health/structured-logger.js)

### Security Model

Security boundaries prevent unauthorized access and data leaks.

**Principles:**
- No `eval()` or `Function()` constructors
- Content Security Policy enforcement
- WASM sandbox isolation
- Event validation and sanitization

**Key Files:**
- [`security/`](security/) - Security utilities and policies

### Testing Strategy

Multi-layer testing ensures quality at every level.

**Test Types:**
- **Unit Tests**: Individual functions and components
- **Integration Tests**: Component interactions via EventBus
- **Performance Tests**: Budget validation
- **Visual Tests**: Component rendering in Chrome

**Chrome Testing Requirements:**
All UI components must be tested in Chrome before task completion:
- Default, hover, focus, active, disabled states
- Error, loading, empty states (for complex components)
- 60fps animation performance validation

**Key Files:**
- [`tests/`](tests/) - Test suites
- [`test-pages/`](test-pages/) - Manual testing pages

### Deployment Architecture

**Development:**
- Local dev server with hot reload
- In-browser testing and debugging
- EventBus debug panel (Ctrl+Shift+E)

**Production:**
- Static file hosting (Vercel, Netlify, etc.)
- CDN distribution for assets
- Optional Tauri desktop wrapper

**Desktop (Optional):**
- Tauri for native desktop application
- Shared codebase with web version
- Native file system access

**Key Files:**
- [`vercel.json`](vercel.json) - Vercel deployment config
- [`Dockerfile`](Dockerfile) - Container deployment

### Extension Points

The architecture supports extension without modification.

**Custom Bounded Contexts:**
1. Create new directory in `bounded-contexts/`
2. Define Rust module with `manifest.json`
3. Register with EventBus
4. Publish/subscribe to events

**Custom Components:**
1. Create Web Component in appropriate layer
2. Use shadow DOM for encapsulation
3. Publish events for actions
4. Subscribe to state events

**Custom Audio Processors:**
1. Implement WebGPU compute shader
2. Implement WASM fallback
3. Register with audio graph
4. Connect via graph edges

### Migration Path

For existing projects integrating Harmony:

**Phase 1: Foundation**
- Install design tokens and primitives
- Set up EventBus infrastructure
- Initialize WASM modules

**Phase 2: Component Migration**
- Replace existing components incrementally
- Maintain existing state management temporarily
- Test each component in isolation

**Phase 3: State Migration**
- Migrate to Harmony Graph
- Connect bounded contexts
- Enable GPU audio processing

**Phase 4: Optimization**
- Profile and optimize hot paths
- Enable advanced GPU features
- Fine-tune performance budgets

### Further Reading

- [Installation Guide](#installation-guide) - Setup instructions
- [Component Library](#component-library) - Available components
- [Performance Guidelines](#performance-guidelines) - Optimization tips
- [Contributing](#contributing) - Development workflow

---

## Installation Guide

### Prerequisites

- Node.js 18+ (for build tools only)
- Rust 1.70+ (for WASM compilation)
- Modern browser with WebGPU support (Chrome 113+, Edge 113+)

### Step-by-Step Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/harmony-design.git
   cd harmony-design
   ```

2. **Install development dependencies**
   ```bash
   npm install
   ```
   Note: These are build tools only, not runtime dependencies.

3. **Build WASM modules**
   ```bash
   npm run build:wasm
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

### Verification

Check that the system is working:
- EventBus debug panel opens with Ctrl+Shift+E
- No console errors on page load
- Health check endpoint returns 200: `/health`

---

## Quick Start

### Using Components

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/styles/tokens.css">
</head>
<body>
  <!-- Include EventBus -->
  <script type="module" src="/core/event-bus.js"></script>
  
  <!-- Use components -->
  <harmony-button variant="primary">Click Me</harmony-button>
  
  <script type="module">
    import '/primitives/harmony-button.js';
    
    const button = document.querySelector('harmony-button');
    button.addEventListener('harmony-click', (e) => {
      console.log('Button clicked!', e.detail);
    });
  </script>
</body>
</html>
```

### Publishing Events

```javascript
import { EventBus } from '/core/event-bus.js';

// Publish a command
EventBus.publish('PlayCommand', {
  trackId: 'track-123',
  position: 0
});

// Subscribe to results
EventBus.subscribe('PlaybackStarted', (event) => {
  console.log('Playback started:', event.payload);
});
```

### Creating Components

```javascript
/**
 * Custom button component
 * @extends HTMLElement
 */
class HarmonyButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector('button')
      .addEventListener('click', () => this.handleClick());
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        button {
          background: var(--color-primary);
          color: var(--color-on-primary);
          padding: var(--spacing-md);
          border: none;
          border-radius: var(--radius-md);
        }
      </style>
      <button><slot></slot></button>
    `;
  }
  
  handleClick() {
    this.dispatchEvent(new CustomEvent('harmony-click', {
      bubbles: true,
      composed: true,
      detail: { timestamp: Date.now() }
    }));
  }
}

customElements.define('harmony-button', HarmonyButton);
```

---

## Core Concepts

### Event Bus

Central message router for all component communication.

**Key Methods:**
- `publish(type, payload)` - Send event
- `subscribe(type, handler)` - Listen for events
- `unsubscribe(type, handler)` - Stop listening

See: [`core/event-bus.js`](core/event-bus.js)

### Bounded Contexts

Isolated business logic modules compiled to WASM.

**Available Contexts:**
- Component Lifecycle - Component state management
- Full-Text Index - Text search capabilities
- Spatial Index - Geometric queries
- WASM Bridge - JS/WASM communication
- WASM Edge Executor - Edge computation
- WASM Node Registry - Node management

See: [`bounded-contexts/`](bounded-contexts/)

### Design Tokens

CSS custom properties for consistent theming.

**Token Categories:**
- Colors - Semantic color palette
- Spacing - Layout measurements
- Typography - Font styles and sizes
- Shadows - Elevation system
- Radius - Border radius values

See: [`tokens/`](tokens/)

---

## Component Library

### Primitives

Basic building blocks:
- `harmony-button` - Interactive buttons
- `harmony-input` - Text input fields
- `harmony-label` - Text labels
- `harmony-icon` - Icon display

See: [`primitives/`](primitives/)

### Molecules

Composite components:
- `harmony-labeled-input` - Input with label
- `harmony-icon-button` - Button with icon
- `harmony-search-box` - Search input with icon

See: [`components/`](components/)

### Organisms

Complex UI sections:
- `harmony-toolbar` - Application toolbar
- `harmony-mixer-channel` - Audio mixer strip
- `harmony-transport-controls` - Playback controls

See: [`organisms/`](organisms/)

### Templates

Page-level layouts:
- `harmony-app-shell` - Main application layout
- `harmony-project-view` - Project workspace
- `harmony-settings-panel` - Settings interface

See: [`templates/`](templates/)

---

## Performance Guidelines

### Render Performance

- Keep JavaScript execution under 16ms per frame
- Use `requestAnimationFrame` for animations
- Batch DOM updates
- Leverage CSS transforms for smooth animations

### Memory Management

- Limit WASM heap to 50MB
- Pool frequently allocated objects
- Clean up event listeners on disconnect
- Use WeakMap for component references

### Load Performance

- Lazy-load non-critical WASM modules
- Code-split large components
- Optimize WASM binary size with `wasm-opt`
- Use HTTP/2 for parallel asset loading

### Audio Performance

- Target 128-sample buffer size
- Keep AudioWorklet processing under 5ms
- Use SharedArrayBuffer for zero-copy transfer
- Implement GPU fallback for WASM processing

See: [`performance/`](performance/)

---

## Contributing

### Development Workflow

1. Create feature branch
2. Implement changes
3. Run quality gates: `npm run quality-gates`
4. Test in Chrome browser
5. Update DESIGN_SYSTEM.md
6. Commit and push
7. Create pull request

### Code Standards

- Use JSDoc comments for all functions
- Follow existing naming conventions
- No runtime npm dependencies
- All components use shadow DOM
- Publish events, don't call BCs directly

### Testing Requirements

- Unit tests for all functions
- Integration tests for component interactions
- Performance tests for budget validation
- Manual Chrome testing for UI components

### Documentation

All changes must update DESIGN_SYSTEM.md with:
- Concept explanation in B1-level English
- Links to relevant code files
- Usage examples (minimal code in docs)
- Cross-references between docs and code

---

## License

See LICENSE file for details.

## Support

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas
- Wiki: Additional documentation and guides