# Harmony Design System

**Version:** 1.0.0  
**Last Updated:** 2025-02-15

## Overview

Harmony is a high-performance design system for audio-visual applications. It combines:

- **Reactive Component System** — Web Components with shadow DOM
- **Atomic Design** — Tokens → Primitives → Molecules → Organisms → Templates
- **WASM Performance** — Rust-based bounded contexts compiled to WebAssembly
- **GPU-First Audio** — WebGPU compute shaders for DSP operations

## Documentation Update Checklist

Every task completion MUST update this documentation file. Use this checklist to ensure complete documentation:

### Before Starting Implementation

- [ ] Read relevant sections of DESIGN_SYSTEM.md
- [ ] Identify which section(s) will need updates
- [ ] Note any new concepts that need documentation

### During Implementation

- [ ] Keep notes of architectural decisions
- [ ] Document any deviations from original plan
- [ ] Track new files created and their purpose

### Task Completion Checklist

- [ ] **Code Implementation Complete** — All files created and tested
- [ ] **Documentation Updated** — DESIGN_SYSTEM.md reflects new implementation
- [ ] **Cross-References Added** — Code files link to docs, docs link to code files
- [ ] **Examples Provided** — Usage examples added where appropriate
- [ ] **Vision Alignment Noted** — Document how task advances core pillars
- [ ] **Quality Gates Passed** — All automated checks pass
- [ ] **Chrome Testing Complete** — UI components tested in browser (if applicable)
- [ ] **Git Committed** — Changes committed with proper message format
- [ ] **Git Pushed** — Changes pushed to remote repository

### Documentation Update Guidelines

When updating DESIGN_SYSTEM.md:

1. **Use B1-level English** — Clear, simple, friendly language
2. **Be Concise** — Explain concepts, not implementation details
3. **Link Relatively** — Use relative paths to code files: `../../path/to/file.js`
4. **Minimal Code** — Show usage patterns, not full implementations
5. **Logical Sections** — Group related concepts together
6. **Two-Way References** — Docs point to code, code points to docs

### Where to Document Different Changes

| Change Type | Documentation Section |
|-------------|----------------------|
| New component | Component Architecture → [Component Type] |
| New token | Design Tokens → [Token Category] |
| New bounded context | Bounded Contexts → [Context Name] |
| EventBus pattern | Event-Driven Architecture |
| Performance optimization | Performance Budgets |
| Build process | Development Workflow |
| Testing approach | Quality Gates |
| Spatial/XR feature | Spatial Computing |

### Example Documentation Entry

```markdown
## Component Architecture

### Button Primitive

Location: `primitives/button/button.js`

A foundational interactive element following atomic design principles.

**Usage:**
\`\`\`html
<harmony-button variant="primary">Click Me</harmony-button>
\`\`\`

**States:** default, hover, focus, active, disabled

**Events Published:**
- `button.clicked` — User activates button

**Implementation Notes:**
- Uses shadow DOM for style encapsulation
- Keyboard accessible (Space/Enter)
- See code for full API: [button.js](../../primitives/button/button.js)
```

## Architecture Principles

### Reactive Component System

All UI components are Web Components using shadow DOM. No frameworks.

**Pattern:**
```javascript
class HarmonyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
}
```

### Atomic Design

**Hierarchy:**
- **Tokens** — Design values (colors, spacing, typography)
- **Primitives** — Basic components (button, input, label)
- **Molecules** — Simple compositions (form field, card header)
- **Organisms** — Complex sections (navigation, form, player)
- **Templates** — Page layouts (app-shell, editor-layout)

### WASM Performance

Bounded contexts written in Rust, compiled to WebAssembly:

- **harmony-graph-bc** — Audio graph engine
- **harmony-audio-bc** — DSP processing
- **harmony-project-bc** — Project management

**Build:** `wasm-pack build --target web`

### GPU-First Audio

Audio processing uses WebGPU compute shaders when available, falls back to WASM.

**Performance Targets:**
- Audio latency: ≤10ms end-to-end
- Frame budget: ≤16ms (60fps)
- Memory budget: ≤50MB WASM heap
- Load time: ≤200ms initial

## Design Tokens

Design tokens are JSON files in `tokens/` directory.

**Categories:**
- **Color** — Brand colors, semantic colors, alpha variants
- **Spacing** — Layout spacing scale (4px base)
- **Typography** — Font families, sizes, weights, line heights
- **Motion** — Animation durations, easing functions
- **3D Depth** — Z-depth tokens for spatial layouts
- **Field-of-View** — Camera FOV tokens for XR

**Schema Location:** `harmony-schemas/schemas/tokens/`

**Usage in CSS:**
```css
:root {
  --color-primary: #0066cc;
  --spacing-md: 16px;
}
```

## Component Architecture

### Primitives

Location: `primitives/`

Basic building blocks. Each primitive:
- Lives in its own directory
- Has a `.js` file (component) and `.css` file (styles)
- Uses shadow DOM
- Publishes events, never calls BCs directly

**Testing:** All primitives must be tested in Chrome before completion.

### Molecules

Location: `organisms/` (historical naming)

Compositions of primitives. Follow same patterns as primitives.

### Organisms

Complex components combining multiple molecules and primitives.

### Templates

Page-level layouts. Include:
- **app-shell** — Main application frame with EventBusComponent

## Bounded Contexts

Rust modules compiled to WASM. Each context:
- Has a schema in `harmony-schemas/schemas/`
- Generates TypeScript types via codegen
- Exposes WASM interface
- Subscribes to command events
- Publishes result events

**Contexts:**
- **GraphEngine** — Audio node graph
- **AudioProcessor** — DSP operations
- **ProjectManager** — Project state

**Codegen Pipeline:**
```
harmony-schemas → harmony-dev/crates → harmony-dev/workers
```

**Rule:** Never edit Rust directly. Change schema, run codegen, verify compilation.

## Event-Driven Architecture

### EventBus Singleton

Location: `core/event-bus.js`

**Critical Rules:**
- Only ONE EventBus instance across entire runtime
- Singleton originates from `core/event-bus.js`
- Other packages re-export: `export { EventBus } from "../../core/event-bus.js"`
- No duplicate implementations permitted

**Pattern:**

**UI Component publishes:**
```javascript
eventBus.publish('playback.play', { trackId: 123 });
```

**Bounded Context subscribes:**
```javascript
eventBus.subscribe('playback.play', (payload) => {
  // Process command
  // Publish result
  eventBus.publish('playback.started', { trackId: 123 });
});
```

### EventBusComponent

Location: `components/event-bus/event-bus-component.js`

Debug UI for EventBus. Must be available on every page.

**Activation:** `Ctrl+Shift+E`

**Inclusion:** Add to app-shell template.

### Error Logging

EventBus errors MUST be logged with context:
- Event type
- Source
- Payload
- Error message

## Spatial Computing

### Semantic Types

Spatial components use semantic types for factory instantiation:

- **Scene3D** — `semantic_type: "scene_3d"`
- **Transform3D** — `semantic_type: "transform_3d"`

**Control Factory:** Maps semantic_type to component class.

Location: `core/control-factory.js`

### Zone Affinity

XR-specific feature for spatial zones.

**ZoneAffinity.XR** — Component prefers XR rendering context.

**Spec:** Document in spatial computing section.

### Spatial Input Abstraction

Unified input handling for 2D and XR environments.

**Primitives:**
- Mouse/touch → 2D
- Hand tracking → XR
- Controllers → XR

**Abstraction Layer:** `controls/spatial-input/`

## Performance Budgets

**Absolute Constraints:**
- Render: ≤16ms per frame (60fps)
- Memory: ≤50MB WASM heap
- Load: ≤200ms initial
- Audio: ≤10ms end-to-end latency

**GPU-First Targets:**
- Audio processing on GPU when available
- Fallback to WASM
- SharedArrayBuffer for AudioWorklet ↔ GPU transfer

**Monitoring:**
- Chrome DevTools Performance panel
- Performance budget CI check (`.github/performance-budget.json`)

## Development Workflow

### Composition Root

Every deployable package must have `src/index.js` that:
- Wires EventBus singleton
- Registers plugins
- Exposes public API

**Example:**
```javascript
// src/index.js
import { EventBus } from '../core/event-bus.js';
import { registerComponents } from './components/index.js';

export function initialize() {
  const eventBus = EventBus.getInstance();
  registerComponents(eventBus);
  return { eventBus };
}
```

### Module Reachability

All modules must be reachable from composition root via imports. Orphaned modules must be removed or connected.

### Schema Changes

1. Navigate to `harmony-schemas/`
2. Modify schema file
3. Run codegen: `npm run codegen`
4. Verify compilation
5. Commit schema + generated code together

**CI Requirement:** CI fails if schema changed but generated code is stale.

### Testing Requirements

**UI Components:**
- Test in Chrome before marking complete
- Verify all states: default, hover, focus, active, disabled
- Complex components: error, loading, empty states
- Animations: 60fps target, use Performance panel

**Bounded Contexts:**
- Unit tests for Rust code
- Integration tests for WASM interface

### Git Workflow

1. Implement feature
2. Update DESIGN_SYSTEM.md (non-optional)
3. Commit with format: `feat(task-id): description`
4. Push to remote (non-optional)
5. CI must pass all quality gates

**Commit Message Format:**
```
feat(task-del-button-primitive): Button Primitive: Basic interactive element

- Implements shadow DOM component
- Publishes button.clicked event
- Accessible keyboard support
- Tested in Chrome (all states)
- Documentation updated in DESIGN_SYSTEM.md
```

## Quality Gates

CI pipeline (`.github/workflows/ci-build.yml`) includes:

- **Build Check** — All packages compile
- **WASM Build** — `wasm-pack build --target web` in harmony-graph-bc
- **Bridge Validation** — EventBus singleton check
- **Snapshot Validation** — Component composition validation
- **Bundle Size** — Performance budget enforcement
- **License Check** — Dependency license compliance
- **Duplicate Code Audit** — Code duplication detection
- **Hardcode Audit** — Magic number detection

**Rule:** Quality gates must pass before proceeding to next task.

## Technology Constraints

### Runtime Dependencies

**Allowed:**
- Vanilla JavaScript (ES modules)
- Web Components (custom elements)
- Shadow DOM
- WebAssembly (Rust → WASM)
- WebGPU (for audio processing)

**NOT Allowed:**
- npm packages in runtime code
- React, Vue, Leptos, or any framework
- External runtime dependencies

### Build Dependencies

**Allowed:**
- npm packages for build tools
- Dev servers (Vite, webpack-dev-server)
- Testing frameworks (Vitest, Playwright)
- Python for build scripts and test servers

**NOT Allowed:**
- Python in production runtime
- Python for core logic or bounded contexts

### Desktop Wrapper

**Must Use:** Tauri

**Not Allowed:** Electron

## Cross-References

### Key Files

- **EventBus Singleton:** [core/event-bus.js](../../core/event-bus.js)
- **Control Factory:** [core/control-factory.js](../../core/control-factory.js)
- **EventBus Component:** [components/event-bus/event-bus-component.js](../../components/event-bus/event-bus-component.js)
- **App Shell Template:** [templates/app-shell/](../../templates/app-shell/)
- **Design Tokens:** [tokens/](../../tokens/)
- **Schemas:** [harmony-schemas/schemas/](../../harmony-schemas/schemas/)

### Documentation

- **This File:** `DESIGN_SYSTEM.md` — Architecture and concepts
- **README.md** — Project overview and getting started
- **CHANGELOG.md** — Version history and changes

## Vision Alignment

Every task should advance one or more core pillars:

1. **Reactive Component System** — Web Components, event-driven architecture
2. **Atomic Design** — Token-based design system, component hierarchy
3. **WASM Performance** — Rust bounded contexts, performance optimization
4. **GPU-First Audio** — WebGPU compute shaders, audio processing

When completing a task, document which pillar(s) it advances and how.

## Common Patterns

### Creating a New Component

1. Create directory: `primitives/my-component/`
2. Create files: `my-component.js`, `my-component.css`
3. Implement Web Component with shadow DOM
4. Publish events for user interactions
5. Test in Chrome (all states)
6. Update DESIGN_SYSTEM.md
7. Commit and push

### Adding a New Bounded Context

1. Create schema in `harmony-schemas/schemas/`
2. Run codegen: `npm run codegen`
3. Implement Rust module
4. Build WASM: `wasm-pack build --target web`
5. Wire to EventBus in composition root
6. Update DESIGN_SYSTEM.md
7. Commit schema + generated code together

### Adding a New Token

1. Create/update JSON in `tokens/`
2. Create schema in `harmony-schemas/schemas/tokens/`
3. Update CSS variables
4. Document in Design Tokens section
5. Commit and push

## Blocked Task Protocol

If a task cannot be completed:

1. Create report: `reports/blocked/{task_id}.md`
2. Include:
   - Reason for blockage
   - Attempted solutions
   - Recommended enabling work
3. Await further instructions OR create enabling task

## Troubleshooting

### EventBus Errors

Check console for:
- Event type
- Source component
- Payload structure
- Error message

Verify EventBus singleton is properly wired in composition root.

### WASM Build Failures

1. Check schema changes were committed
2. Run codegen: `npm run codegen`
3. Verify Rust compilation: `cargo check`
4. Check wasm-pack version compatibility

### Component Not Rendering

1. Verify custom element is registered
2. Check shadow DOM attachment
3. Inspect CSS encapsulation
4. Use Chrome DevTools Elements panel

### Performance Issues

1. Use Chrome DevTools Performance panel
2. Check frame timing (target: ≤16ms)
3. Profile WASM memory usage (target: ≤50MB)
4. Verify GPU shader usage for audio

## Additional Resources

- **Storybook:** `.storybook/` — Component documentation and testing
- **Examples:** `examples/` — Usage examples and demos
- **Test Pages:** `test-pages/` — Integration test pages
- **Scripts:** `scripts/` — Build and development scripts

---

**Remember:** Documentation is non-optional. Every task completion requires updating this file with proper cross-references and clear explanations.
## Code-to-Doc Reference Pattern {#code-to-doc-reference-pattern}

Every code file links to relevant documentation sections, and documentation links back to implementation files. This creates bidirectional references that make the system navigable and maintainable.

### Standard Header Format

All JavaScript files include:

```javascript
/**
 * @fileoverview Brief description of purpose
 * @see {@link file://./DESIGN_SYSTEM.md#anchor-name Section Name}
 * @module path/to/module
 */
```

### Multiple References

When a file implements multiple documented patterns:

```javascript
/**
 * @fileoverview EventBus singleton - central message routing
 * @see {@link file://./DESIGN_SYSTEM.md#event-bus Event Bus Architecture}
 * @see {@link file://./DESIGN_SYSTEM.md#singleton-pattern Singleton Pattern}
 * @module core/event-bus
 */
```

### Reverse References

Documentation sections reference implementations:

```markdown
## Event Bus Architecture {#event-bus}

**Implementation**: [`core/event-bus.js`](./core/event-bus.js)
**Tests**: [`tests/unit/event-bus.test.js`](./tests/unit/event-bus.test.js)
```

### Validation

Run validation script to check compliance:

```bash
node scripts/validate-code-doc-links.js
```

**Full specification**: [`docs/code-to-doc-reference-pattern.md`](./docs/code-to-doc-reference-pattern.md)
**Templates**: [`templates/code-headers/`](./templates/code-headers/)
**Validation**: [`scripts/validate-code-doc-links.js`](./scripts/validate-code-doc-links.js)


### Domain Node Schema

**Location:** ``harmony-schemas/schemas/domain-node.schema.json``  
**Purpose:** Validates Domain graph nodes representing bounded contexts and architectural domains.

Domain nodes represent logical groupings of functionality within the system. Each domain encapsulates a set of related responsibilities, exposes well-defined interfaces, and may map to a bounded context implementation in Rust/WASM.

**Key Properties:**

- **id** - Pattern: ``domain:{name}`` (e.g., ``domain:audio``, ``domain:graph``)
- **type** - Always ``'domain'``
- **namespace** - Domain namespace identifier (e.g., ``audio``, ``graph``, ``ui``)
- **boundedContext** - Reference to BC implementation (e.g., ``audio-bc``)
- **responsibilities** - Array of domain responsibilities
- **interfaces** - Commands subscribed, events published, queries exposed
- **dependencies** - Other domains this domain depends on
- **implementation** - Language (rust/javascript), target (wasm/web), path
- **performance** - Memory budget, latency budget, critical path flag

**Example Domain Node:**

````json
{
  'id': 'domain:audio',
  'type': 'domain',
  'name': 'Audio Processing Domain',
  'namespace': 'audio',
  'description': 'Handles all audio processing, playback, and routing',
  'boundedContext': 'audio-bc',
  'responsibilities': [
    'Audio graph management',
    'Real-time audio processing',
    'Audio routing and mixing',
    'Effect processing'
  ],
  'interfaces': {
    'commands': ['Play', 'Pause', 'Stop', 'SetVolume'],
    'events': ['PlaybackStarted', 'PlaybackPaused', 'VolumeChanged'],
    'queries': ['getPlaybackState', 'getAudioGraph']
  },
  'dependencies': ['domain:graph'],
  'implementation': {
    'language': 'rust',
    'target': 'wasm',
    'path': 'bounded-contexts/audio-bc'
  },
  'performance': {
    'budget': {
      'memory': '20MB',
      'latency': '10ms'
    },
    'critical': true
  }
}
````

**Usage Pattern:**

1. **Define Domain** - Create domain node in graph with namespace and responsibilities
2. **Implement BC** - Build bounded context in Rust following domain specification
3. **Register Interfaces** - Subscribe to commands, publish events via EventBus
4. **Document Dependencies** - Declare cross-domain dependencies for validation
5. **Monitor Performance** - Track against declared budgets

**Cross-References:**

- Domain nodes connect to Intent nodes (intents route to domain commands)
- Domain nodes connect to Component nodes (components trigger domain operations)
- Domain nodes connect to other Domain nodes (domain dependencies)

**Related Files:**

- Schema: [harmony-schemas/schemas/domain-node.schema.json](harmony-schemas/schemas/domain-node.schema.json)
- Graph Engine: [harmony-graph/](harmony-graph/)
- Bounded Contexts: [bounded-contexts/](bounded-contexts/)
