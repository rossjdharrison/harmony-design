# Harmony Design System

A comprehensive design system for building consistent, accessible, and performant user interfaces.

## Overview

Harmony is a design system built on atomic design principles with a strong focus on composition, performance, and maintainability. It provides a complete toolchain for managing design specifications, component implementations, and their relationships.

## Atomic Design Hierarchy

Components are organized into five levels following atomic design methodology:

- **Primitives**: Basic building blocks (buttons, inputs, icons) - cannot contain other components
- **Molecules**: Simple component groups (search field = input + button) - can only contain primitives
- **Organisms**: Complex UI sections (header, card list) - can contain molecules and primitives
- **Templates**: Page layouts without content - can contain organisms, molecules, and primitives
- **Pages**: Complete views with real content - can contain any component type

## Composition Rules

The design system enforces strict composition rules to maintain hierarchy integrity:

### Rule Enforcement

Composition relationships are validated using the `validate_composition` tool (see [Development Tools](#development-tools)).

**Allowed Compositions:**

| Parent Level | Can Contain |
|--------------|-------------|
| Primitive | *(nothing)* |
| Molecule | Primitives only |
| Organism | Molecules, Primitives |
| Template | Organisms, Molecules, Primitives |
| Page | Any component type |

**Examples:**

✓ Valid: `SearchField` (molecule) contains `Input` (primitive) and `Button` (primitive)  
✓ Valid: `Header` (organism) contains `Navigation` (molecule) and `Logo` (primitive)  
✗ Invalid: `Button` (primitive) cannot contain `Icon` (primitive)  
✗ Invalid: `Card` (molecule) cannot contain `Header` (organism)

### Composition Graph

Component relationships are stored in `harmony-graph/graph.json` as directed edges:

```json
{
  "edges": [
    {
      "from": "search-field",
      "to": "input",
      "type": "composedOf"
    }
  ]
}
```

Related tools:
- [tools/validate_composition.py](tools/validate_composition.py) - Validates composition rules
- [tools/get_component_dependencies.py](tools/get_component_dependencies.py) - Traces composition tree

## Component Lifecycle

Components progress through defined states:

1. **draft** - Initial design in progress
2. **design_complete** - Design finalized, ready for implementation
3. **in_development** - Implementation in progress
4. **implemented** - Code complete, needs testing
5. **tested** - Tested in Chrome, ready for production

See lifecycle schema: [harmony-schemas/src/lifecycle.rs](../harmony-schemas/src/lifecycle.rs)

## Development Tools

### Composition Validation

**Tool:** `tools/validate_composition.py`

Validates that all composition relationships follow atomic design hierarchy rules.

```bash
python harmony-design/tools/validate_composition.py harmony-graph/graph.json
```

**When to Use:**
- Before committing changes to component relationships
- In CI pipeline to catch violations early
- When refactoring component hierarchy

**Exit Codes:**
- `0` - All rules pass
- `1` - Violations found or error occurred

See: [tools/README.md](tools/README.md#validate_compositionpy)

### Component Querying

**Tool:** `query_components` (TypeNavigator)

Filter and search components by level, state, or tokens.

See recent commit: `cee6a0d feat(task-del-query-components-tool-filter-b)`

### Dependency Tracing

**Tool:** `get_component_dependencies` (TypeNavigator)

Trace full composition tree for a component.

See recent commit: `14d71a2 feat(task-del-get-component-dependencies-too)`

## File Structure

```
harmony-design/
├── DESIGN_SYSTEM.md          # This file - main documentation
├── specs/                     # Design specifications (.pen files)
├── tools/                     # Development and validation tools
│   ├── validate_composition.py
│   ├── test_validate_composition.py
│   └── README.md
└── reports/                   # Task reports and blocked items

harmony-graph/
└── graph.json                 # Component graph with relationships

harmony-schemas/
└── src/                       # Rust schemas for graph nodes
    ├── lifecycle.rs
    └── composition.rs
```

## Testing Requirements

All UI components must be tested in Chrome before marking tasks complete (Policy #10).

**Test Coverage:**
- Default, hover, focus, active, disabled states
- Error states, loading states, empty states (for complex components)
- Performance: 60fps for animations (use Chrome DevTools Performance panel)

**Retesting Required When:**
- Design spec (.pen file) changes for implemented component
- Composition relationships change
- Lifecycle state advances to `tested`

## Performance Budgets

**Absolute Constraints:**
- Render: 16ms per frame (60fps)
- Memory: 50MB WASM heap maximum
- Load: 200ms initial load time

**Architecture:**
- Core logic: Rust → WASM
- UI rendering: Vanilla HTML/CSS/JS with Web Components
- No runtime npm dependencies
- No frameworks (React, Vue, etc.)

## Event-Driven Architecture

**Pattern:** UI components publish events → EventBus routes → Bounded Contexts handle

**UI Components:**
```javascript
// Components publish, never call BCs directly
button.addEventListener('click', () => {
  eventBus.publish('PlayRequested', { trackId: '123' });
});
```

**Bounded Contexts:**
```rust
// BCs subscribe to commands, publish results
eventBus.subscribe('PlayRequested', handle_play);
// ... process ...
eventBus.publish('PlaybackStarted', { trackId: '123' });
```

**Debugging:** EventBusComponent available on every page via `Ctrl+Shift+E`

## Documentation Standards

- Written in B1-level English (simple, clear)
- Logical sections per concern
- Concise but friendly tone
- Relative links to code files
- Minimal code samples (code lives in files)
- Two-way references: docs ↔ code

## Quality Gates

Before completing any task:

1. ✓ Composition rules validated
2. ✓ Performance budgets met
3. ✓ UI components tested in Chrome (all states)
4. ✓ Documentation updated (this file)
5. ✓ Changes committed and pushed
6. ✓ No technical debt introduced

## Related Documentation

- [Tools README](tools/README.md) - Detailed tool documentation
- [Blocked Tasks](reports/blocked/) - Tasks awaiting enablement
- Schema files in `harmony-schemas/src/` - Type definitions

## Recent Changes

- Composition validation tool with test suite
- Component dependency tracing
- Lifecycle state tracking
- Design spec to implementation linking
- Query filtering by level, state, tokens