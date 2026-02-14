# Harmony Design System

Welcome to Harmony! This is a design system built for creating consistent and beautiful user interfaces.

## What is Harmony?

Harmony is a complete design system that helps you build user interfaces. It includes reusable components, design patterns, and guidelines that work together smoothly.

## How to Use This Documentation

This document explains the main ideas and how to work with the system. For detailed code, look at the files linked in each section.

## Graph Structure

Harmony models the design system as a graph where components, patterns, tokens, and designs are connected through meaningful relationships.

### Edge Types

The system uses five types of relationships (edges) to connect nodes:

1. **composes_of** - Shows when one component contains another
   - Example: A Form contains Buttons
   - Direction: Parent → Child

2. **inherits_pattern** - Shows when a component follows a pattern
   - Example: PrimaryButton follows BaseButton pattern
   - Direction: Variant → Base Pattern

3. **implements_design** - Shows when code implements a design
   - Example: ButtonComponent implements ButtonDesignSpec
   - Direction: Implementation → Specification

4. **uses_token** - Shows when a component uses a design token
   - Example: Button uses ColorPrimary token
   - Direction: Component → Token

5. **used_by** - Shows where a component is used (reverse of composes_of)
   - Example: Button is used by Form
   - Direction: Child → Parent

### Why Use a Graph?

The graph structure helps us:
- Track dependencies between components
- Find where changes will have impact
- Understand component relationships
- Maintain consistency across the system
- Generate documentation automatically

### Implementation

Edge types are defined in [`harmony-schemas/src/graph/edge_types.rs`](../harmony-schemas/src/graph/edge_types.rs).

For detailed information about each edge type, see [`docs/graph-edge-types.md`](docs/graph-edge-types.md).

## Architecture Rules

### What Goes Where

- **Rust + WASM**: Graph engine, schema definitions, core logic
- **Vanilla JS/HTML/CSS**: UI components, DOM manipulation
- **Python**: Build scripts, test servers, development tools only
- **npm**: Build tools and development only, not runtime code

### Component Communication

Components never call bounded contexts directly. Instead:
1. User interacts with component
2. Component publishes event to EventBus
3. EventBus routes event to bounded context
4. Bounded context processes and publishes result
5. Component listens for result event and updates

### Performance Budgets

Every feature must meet these limits:
- **Render**: Maximum 16ms per frame (60fps)
- **Memory**: Maximum 50MB WASM heap
- **Load**: Maximum 200ms initial load time

## Development Workflow

### Before You Start

1. Read this documentation
2. Check existing components in the repository
3. Review recent commits to understand current work

### Making Changes

1. **Schema Changes**: Always start in `harmony-schemas`, run codegen, then update dependent code
2. **UI Components**: Build in vanilla JS with Web Components, test in Chrome
3. **Documentation**: Update this file with every change - this is required, not optional

### Testing Requirements

All UI components must be tested in Chrome before completion:
- Test all states: default, hover, focus, active, disabled
- Test animations with Performance panel (target: 60fps)
- Test error states, loading states, empty states

### Committing Work

1. Make your changes
2. Update this documentation
3. Run tests
4. Commit changes
5. Push to remote - this is required before starting new work

## File Organization

```
harmony-design/          Main design system repository
  DESIGN_SYSTEM.md      This file - main documentation
  docs/                 Detailed documentation by topic
  reports/blocked/      Reports for blocked tasks

harmony-schemas/         Schema definitions (Rust)
  src/graph/            Graph structure and edge types
    edge_types.rs       Edge type definitions
    mod.rs              Graph module exports
  lib.rs                Main library file
```

## Getting Help

If you're stuck:
1. Read the relevant section in this document
2. Check the linked code files
3. Look at similar existing implementations
4. Create a blocked task report in `reports/blocked/`

## Recent Work

The system recently added:
- Glissando gesture detection for continuous parameters
- Multi-state focus tracking (focus, hover, active, pressed)
- Executable examples for each component
- Usage guides and best practices
- Storybook stories for all components

## Next Steps

Common tasks when working with Harmony:
1. Adding a new component? Check composition patterns and edge types
2. Modifying behavior? Start with schema changes in Rust
3. Building UI? Use Web Components with shadow DOM
4. Need to track relationships? Use the graph edge types

---

Remember: Code and documentation must stay in sync. When you change code, update this document. When you read this document, check that code matches.