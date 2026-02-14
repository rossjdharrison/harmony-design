# Harmony Design System

Welcome to the Harmony Design System documentation. This system helps you build music applications with consistent design and good performance.

## What is Harmony?

Harmony is a design system for music software. It provides ready-to-use components and patterns that work together smoothly.

## How to Use This Documentation

This document explains concepts and how things work. Code files contain implementation details. We link between documentation and code so you can find what you need quickly.

## Architecture Overview

Harmony uses a clean separation of concerns:

- **UI Layer**: Vanilla HTML/CSS/JS with Web Components
- **Core Logic**: Rust compiled to WebAssembly (WASM)
- **Communication**: Event-driven architecture with EventBus

### Technology Boundaries

**Rust → WASM** is used for:
- Bounded contexts (business logic)
- Graph engine (audio routing)
- Audio processing (DSP)

**HTML/CSS/JS** is used for:
- UI rendering
- DOM manipulation
- User interactions

**Python** is used for:
- Test servers (pytest)
- Build scripts
- Development tools
- Prototypes

**npm packages** are used for:
- Build tools
- Dev servers
- Testing frameworks

These boundaries cannot be crossed without architecture review.

## Performance Budgets

All code must meet these requirements:

- **Render Budget**: Maximum 16ms per frame (60fps)
- **Memory Budget**: Maximum 50MB WASM heap
- **Load Budget**: Maximum 200ms initial load time

## Event-Driven Communication

Components communicate through events, never directly.

### UI Component Pattern

```
User clicks button → Component publishes event → EventBus routes → Bounded Context handles
```

See: `harmony-core/event-bus.js`

### Bounded Context Pattern

```
Subscribe to command event → Process logic → Publish result event
```

Bounded Contexts must use the ProcessCommand pattern.

## Component Development

All UI components must:

1. Use Web Components with shadow DOM
2. Publish events instead of calling business logic directly
3. Be tested in Chrome before completion
4. Verify all states: default, hover, focus, active, disabled
5. Test animations for 60fps performance

See: `harmony-ui/components/` for examples (coming soon)

## Schema-Driven Development

When changing Rust behavior:

1. Navigate to `harmony-schemas/`
2. Modify the schema
3. Run codegen
4. Verify compilation

**Never edit generated Rust code directly.**

Commit schema changes and generated code together.

## Quality Gates

Every task must pass quality gates before proceeding. No technical debt is allowed.

## Debugging Tools

The EventBusComponent is available on every page for debugging:

- Hidden by default
- Show with `Ctrl+Shift+E`
- Logs all event traffic

EventBus errors are logged to console with full context.

## Project Structure

```
harmony-design/          # This documentation and design specs
harmony-core/           # Core WASM modules and EventBus
harmony-ui/             # UI components
harmony-schemas/        # Schema definitions for codegen
```

## Getting Started

(This section will grow as components are added)

## Contributing

When completing any task:

1. Implement the feature completely
2. Update this documentation
3. Commit changes
4. Push to remote

Documentation updates are non-optional for task completion.

---

*This is a living document. It grows with the system.*