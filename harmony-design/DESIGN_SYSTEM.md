# Harmony Design System

Welcome to the Harmony Design System documentation. This document describes how our design system works, how to use it, and how to contribute to it.

## Current Status

⚠️ **System Initialization Phase**

The Harmony Design System is currently being set up. This documentation will grow as components and patterns are implemented.

## Recent Issues

### Task Tracking System

There is currently an issue with task metadata propagation. Recent commits show "undefined" task IDs, indicating a problem with the task management system. See `reports/blocked/undefined.md` for details.

## Architecture Overview

The Harmony Design System follows these core principles:

### Technology Boundaries

**Rust + WebAssembly** handles:
- Bounded contexts (business logic)
- Graph engine
- Audio processing

**Vanilla HTML/CSS/JavaScript** handles:
- UI rendering
- DOM manipulation
- Web Components

**Python** is used only for:
- Test servers (pytest)
- Build scripts
- Development tools
- Prototypes

### Performance Budgets

All implementations must meet these requirements:
- **Render Budget**: Maximum 16ms per frame (60fps)
- **Memory Budget**: Maximum 50MB WASM heap
- **Load Budget**: Maximum 200ms initial load time

### Communication Pattern

Components and bounded contexts communicate via EventBus:

1. **UI Components** → Publish events (never call BCs directly)
2. **EventBus** → Routes events to subscribers
3. **Bounded Contexts** → Subscribe to commands, publish results

Example flow:
```
User clicks Play button 
→ Component publishes "Play" event 
→ EventBus routes to Audio BC 
→ Audio BC processes 
→ Audio BC publishes "PlaybackStarted" event
```

## Component Development

### Testing Requirements

All UI components must be tested in Chrome before completion:

**Required state verification**:
- Default, hover, focus, active, disabled states
- Error states, loading states, empty states (for complex components)
- Animation performance (60fps target)

**Performance testing**:
- Use Chrome DevTools Performance panel
- Verify render budget compliance

### Component Structure

All components use:
- Web Components (Custom Elements)
- Shadow DOM for encapsulation
- Vanilla JavaScript (no frameworks)
- JSDoc documentation

## Schema-Driven Development

When changing Rust behavior:

1. Navigate to `harmony-schemas`
2. Modify the schema
3. Run codegen
4. Verify compilation
5. Commit schema + generated code together

**Never edit generated Rust code directly.**

## Documentation Standards

This file (`DESIGN_SYSTEM.md`) is written in B1-level English for accessibility. It:
- Uses logical sections per concern
- Stays concise but friendly
- Links to code files relatively
- Contains minimal code (code lives in files)

Code files contain minimal comments that point back to relevant sections here.

## EventBus Debugging

The EventBusComponent is available on every page via `Ctrl+Shift+E`. All EventBus errors are logged to console with context including:
- Event type
- Source
- Payload
- Error message

## Reports

Task blocking reports are stored in `reports/blocked/{task_id}.md`.

## Getting Started

(This section will be expanded as the system grows)

---

*This documentation is maintained as part of every task completion. See Policy #19.*