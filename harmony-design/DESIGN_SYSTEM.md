# Harmony Design System

A comprehensive design system for building musical interfaces with Web Components, WASM-powered audio processing, and event-driven architecture.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Event-Driven Communication](#event-driven-communication)
3. [Event Source Highlighting](#event-source-highlighting)
4. [Component Development](#component-development)
5. [Bounded Contexts](#bounded-contexts)
6. [Performance Requirements](#performance-requirements)
7. [Development Workflow](#development-workflow)

## Architecture Overview

Harmony uses a layered architecture with clear separation of concerns:

- **UI Layer**: Vanilla Web Components (HTML/CSS/JS)
- **Event Layer**: EventBus for decoupled communication
- **Logic Layer**: Bounded Contexts (Rust → WASM)
- **Audio Layer**: Graph Engine (Rust → WASM)

### Technology Boundaries

- **Rust → WASM**: Bounded contexts, graph engine, audio processing
- **Vanilla JS**: UI rendering, DOM manipulation, event handling
- **Python**: Test servers, build scripts, dev tools only
- **npm**: Build tools and dev dependencies only (no runtime deps)

## Event-Driven Communication

All component-to-component and component-to-BC communication happens via EventBus.

### Pattern

```
User Action → Component publishes event → EventBus routes → BC handles → BC publishes result
```

### Event Schema

All events must have defined schemas in `harmony-schemas/`. Events are validated at runtime.

### Direct Calls Prohibited

Components must NEVER call Bounded Contexts directly. Always use EventBus.

See: [harmony-ui/core/event-bus.js](../harmony-ui/core/event-bus.js)

## Event Source Highlighting

The EventBusComponent includes visual highlighting to show which component emitted each event.

### Features

- **Unique Colors**: Each event source gets a consistent color from a 12-color palette
- **Source Badges**: Visual badges display the source name with color coding
- **Border Highlighting**: Event items have colored left borders matching their source
- **Interactive Legend**: Collapsible legend shows all active sources
- **Auto-Detection**: Sources are automatically extracted from event detail objects

### How It Works

When an event is logged:

1. The source is extracted from `detail.source`, `detail.componentId`, or `detail.emitter`
2. A unique color is assigned (or retrieved if source seen before)
3. A colored badge is added to the event item
4. The event item's left border is colored
5. The legend is updated with the new source

### Component Integration

Components should include a `source` field when publishing events:

```javascript
eventBus.publish('ButtonClicked', {
  source: 'PlayButton',  // ← Identifies the emitting component
  action: 'play'
});
```

### Visual Design

- **Color Palette**: 12 distinct colors optimized for differentiation
- **Badge Style**: Rounded rectangles with 20% opacity background
- **Border Width**: 3px solid left border on event items
- **Legend Layout**: Responsive grid, collapsible, sticky positioning

### Performance

- Color assignment: O(1) lookup via Map
- Badge creation: < 1ms per event
- Legend update: O(n) where n = number of unique sources
- Memory: ~1KB per unique source

### Files

- [event-source-highlighter.js](../harmony-ui/components/event-bus-component/event-source-highlighter.js) - Core highlighting logic
- [source-legend.js](../harmony-ui/components/event-bus-component/source-legend.js) - Legend UI component
- [source-highlighting.css](../harmony-ui/components/event-bus-component/styles/source-highlighting.css) - Styles
- [integration-patch.js](../harmony-ui/components/event-bus-component/integration-patch.js) - EventBusComponent integration

## Component Development

### Web Component Structure

All UI components use shadow DOM and follow this structure:

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
    // Render to shadow DOM
  }
}
```

### Event Publishing

Components publish events, never handle business logic:

```javascript
this.publishEvent('ActionRequested', {
  source: this.componentId,
  action: 'play',
  timestamp: Date.now()
});
```

### Testing Requirements

All components must be tested in Chrome before task completion:

- ✅ Default state
- ✅ Hover state
- ✅ Focus state
- ✅ Active state
- ✅ Disabled state
- ✅ Error states (if applicable)
- ✅ Loading states (if applicable)
- ✅ Empty states (if applicable)

### Performance Testing

Animations must maintain 60fps. Use Chrome DevTools Performance panel to verify.

## Bounded Contexts

Bounded Contexts (BCs) contain business logic and are implemented in Rust, compiled to WASM.

### Pattern

```rust
// Subscribe to command events
eventBus.subscribe("PlayCommand", handlePlay);

// Process and publish results
fn handlePlay(event: Event) {
    // Business logic here
    eventBus.publish("PlaybackStarted", result);
}
```

### Schema Changes

When changing BC behavior:

1. Navigate to `harmony-schemas/`
2. Modify the schema file
3. Run codegen: `./scripts/codegen.sh`
4. Verify compilation
5. Commit schema + generated code together

**Never edit generated Rust code directly.**

## Performance Requirements

### Absolute Constraints

- **Render Budget**: Maximum 16ms per frame (60fps)
- **Memory Budget**: Maximum 50MB WASM heap
- **Load Budget**: Maximum 200ms initial load time

These cannot be violated under any circumstances.

## Development Workflow

### EventBusComponent Access

Press `Ctrl+Shift+E` on any page to open the EventBusComponent debugger. It shows:

- Real-time event stream
- Event filtering by type
- Event source highlighting
- Event payload inspection

The EventBusComponent must be included in the app-shell template on every page.

### Error Logging

EventBus errors (validation failures, missing subscribers, type mismatches) are logged to console with full context:

- Event type
- Source component
- Payload data
- Error message

### Git Workflow

1. Implement task
2. Test in Chrome (all states)
3. Update DESIGN_SYSTEM.md (mandatory)
4. Commit changes
5. Push to remote (mandatory before starting new task)

### Documentation Requirements

- DESIGN_SYSTEM.md must be updated for every task
- Use B1-level English (simple, clear)
- Code goes in files, not documentation
- Use relative links to code files
- Maintain two-way references (doc ↔ code)

### Blocked Tasks

If a task cannot be completed:

1. Create report in `harmony-design/reports/blocked/{task_id}.md`
2. Include reason, attempted solutions, recommended enabling work
3. Await further instructions OR create enabling task

## Quality Gates

All tasks must pass quality gates before completion:

- ✅ Performance budgets met
- ✅ All tests pass
- ✅ Chrome testing complete
- ✅ Documentation updated
- ✅ Changes committed and pushed
- ✅ No technical debt introduced

---

*This document is the single source of truth for Harmony Design System. All code should reference relevant sections here, and this document should link to implementation files.*