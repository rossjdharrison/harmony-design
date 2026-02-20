# Harmony Design System

This document describes the Harmony Design System: its concepts, how to work with it, and implementation notes.

## Overview

The Harmony Design System is a comprehensive design and development framework for building high-performance audio production interfaces. It combines atomic design principles with real-time performance requirements.

## Core Concepts

### Atomic Design Levels
- **Atoms**: Basic building blocks (buttons, inputs, labels)
- **Molecules**: Simple component groups (form fields, toolbar items)
- **Organisms**: Complex interface sections (navigation, panels, mixers)
- **Templates**: Page-level layouts
- **Pages**: Specific instances with real content

### Performance Targets
- **Render Budget**: 16ms per frame (60fps)
- **Memory Budget**: 50MB WASM heap
- **Load Budget**: 200ms initial load
- **Audio Latency**: 10ms end-to-end

## Transform System

The transform system provides type-safe 3D transformations for UI elements and animations.

### Transform3D Semantic Types

The `del-transform3d-semantic-type-spec.ts` module defines semantic types for 3D transformations:

**Core Types:**
- `Translate3D`: 3D translation vectors (x, y, z)
- `Rotate3D`: 3D rotation with axis and angle
- `Scale3D`: 3D scaling factors
- `Matrix3D`: 4x4 transformation matrix
- `Perspective`: Perspective depth setting
- `TransformOrigin3D`: Transform origin point

**Composite Type:**
- `Transform3DSpec`: Combines multiple transform operations
- `AnimatedTransform3D`: Extends Transform3DSpec with animation properties

**Utilities:**
- `toTransformString()`: Converts spec to CSS transform value
- `toOriginString()`: Converts origin to CSS transform-origin
- `identityMatrix()`: Creates identity matrix
- `validateTransform3D()`: Validates transform specifications
- `isTransform3DSpec()`: Type guard for Transform3DSpec

**Usage Example:**
```typescript
import { Transform3DSpec, toTransformString } from './components/del-transform3d-semantic-type-spec.js';

const transform: Transform3DSpec = {
  translate: { x: 100, y: 50, z: 0 },
  rotate: { x: 0, y: 1, z: 0, angle: 45 },
  scale: { x: 1.2, y: 1.2, z: 1 }
};

element.style.transform = toTransformString(transform);
```

**Performance Notes:**
- All transform operations are GPU-accelerated via CSS transforms
- Use `translate3d()` to trigger GPU compositing
- Matrix calculations must complete within 16ms render budget
- Prefer composite transforms over individual operations

**Related Files:**
- Implementation: [components/del-transform3d-semantic-type-spec.ts](components/del-transform3d-semantic-type-spec.ts)

## Event System

All UI components publish events through the EventBus singleton. Components never call bounded contexts directly.

**Pattern:**
1. User interacts with component
2. Component publishes event to EventBus
3. EventBus routes to appropriate bounded context
4. Bounded context processes and publishes result event
5. UI components subscribe to result events and update

**EventBus Singleton:**
- Lives at `core/event-bus.js`
- Only one instance across entire runtime
- Packages re-export from core path
- Available on every page via Ctrl+Shift+E

## Component Architecture

### Web Components
All UI components use Web Components with shadow DOM:
- Encapsulated styles
- Custom element registration
- Lifecycle callbacks
- Property/attribute reflection

### No Framework Dependencies
- Vanilla HTML/CSS/JavaScript only
- No React, Vue, Leptos, or similar frameworks
- No npm runtime dependencies
- Web Components standard only

## Documentation Standards

### Code Documentation
- All functions have JSDoc comments
- Type definitions include descriptions
- Performance notes where relevant
- Links to related files

### File References
- Code files reference relevant DESIGN_SYSTEM.md sections
- Documentation links to implementation files
- Two-way references between docs and code

## Quality Gates

All code must pass quality gates before merging:
- TypeScript compilation
- Performance budgets
- Browser rendering tests
- Event bus validation

## Testing Requirements

### Browser Testing
All UI components must be tested in Chrome:
- Default state
- Hover state
- Focus state
- Active state
- Disabled state
- Error states (where applicable)
- Loading states (where applicable)
- Empty states (where applicable)

### Performance Testing
- 60fps target for animations
- Chrome DevTools Performance panel
- Memory profiling for large datasets

## Architecture Boundaries

### Rust → WASM
- Bounded contexts
- Graph engine
- Audio processing

### JavaScript
- UI rendering
- DOM manipulation
- Event handling

### Python
- Test servers (pytest)
- Build scripts
- Dev tools
- Prototypes

**Not for production runtime or core logic**

## Schema-Driven Development

1. Navigate to `harmony-schemas`
2. Modify schema
3. Run codegen
4. Verify compilation
5. Commit schema + generated code together

**Never edit Rust directly** - always go through schemas.

## File Organization

### Package Structure
Each deployable package has:
- `src/index.js`: Composition root
- Wires EventBus singleton
- Registers plugins
- Exposes public API

### No Nested Harmony Packages
All `harmony-*` packages are direct children of repository root.
No `harmony-*/harmony-*` nesting allowed.

### Orphan Prevention
All modules must be reachable from composition root via imports.
Unreachable modules must be removed or connected.

## Git Workflow

### Commit Requirements
- Push changes before starting new tasks
- Include generated code with schema changes
- Update DESIGN_SYSTEM.md in every task
- Verify with `git status` against remote

### Blocked Tasks
When task cannot be completed:
1. Create report in `reports/blocked/{task_id}.md`
2. Include reason and attempted solutions
3. Recommend enabling work
4. Await further instructions

## Cross-References

- Event System: `core/event-bus.js`
- Transform Types: `components/del-transform3d-semantic-type-spec.ts`
- Quality Gates: `.github/workflows/`
- Performance Budgets: `.github/performance-budget.json`