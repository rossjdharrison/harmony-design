# Harmony Design System

Welcome! This document describes the Harmony Design System - how it works, how to use it, and how to contribute.

## What is Harmony?

Harmony is a design system for building audio and creative applications. It provides reusable components, patterns, and tools that work together smoothly.

## Current Status

The system is in early development. The foundation has been set up, but specific components and features are being added step by step.

### Recent Activity

- Initial repository structure created
- Several feature implementations in progress
- Core policies and constraints established

## How to Work With This System

### For Developers

When building components or features:

1. **Check the policies** - Read the absolute constraints and mandatory rules
2. **Follow the patterns** - Use EventBus for communication, Web Components for UI
3. **Test in Chrome** - All UI components must be tested before completion
4. **Update this document** - Documentation is mandatory for every task

### For Designers

Design specifications should be provided as `.pen` files. When designs change, components must be retested.

## Architecture Overview

### Technology Choices

**Rust + WASM** is used for:
- Bounded contexts (business logic)
- Graph engine (audio processing)
- Performance-critical operations

**Vanilla HTML/CSS/JavaScript** is used for:
- UI rendering
- DOM manipulation
- Component implementation

**Python** is used ONLY for:
- Test servers
- Build scripts
- Development tools

### Component Communication

Components use an **EventBus pattern**:

1. UI components publish events (never call business logic directly)
2. EventBus routes events to subscribers
3. Bounded contexts handle commands and publish results

Example: Button click → Event published → EventBus routes → Logic handles → Result event → UI updates

### Performance Budgets

All code must meet these limits:

- **16ms per frame** - For smooth 60fps rendering
- **50MB WASM heap** - Maximum memory usage
- **200ms initial load** - Maximum startup time

## Component Structure

Components are organized by complexity:

- **Primitives** - Basic building blocks (buttons, inputs)
- **Molecules** - Simple combinations (search box, card)
- **Organisms** - Complex components (navigation, player controls)
- **Templates** - Page layouts

## Testing Requirements

Every UI component must be tested in Chrome for these states:

- Default
- Hover
- Focus
- Active
- Disabled
- Error (if applicable)
- Loading (if applicable)
- Empty (if applicable)

Animations must maintain 60fps (verified with Chrome DevTools Performance panel).

## Documentation Rules

This is the **single source of truth** for the design system. Code files should have minimal comments that reference sections in this document.

When you change code, update this document. When you read this document, check that code matches.

## Getting Help

- **Blocked on a task?** Create a report in `harmony-design/reports/blocked/{task_id}.md`
- **Need to understand a component?** Check this document first, then look at code files
- **Found a bug?** Check if it violates performance budgets or mandatory rules

## What's Next

The system needs foundational work before features can be built:

1. EventBus infrastructure
2. App shell template
3. Component library structure
4. Testing workflows

Check `harmony-design/reports/blocked/` for current blockers and enabling work recommendations.

## File Structure

```
harmony-design/
├── DESIGN_SYSTEM.md          # This file
├── reports/
│   └── blocked/              # Blocked task reports
└── (more structure to be added)
```

## Contributing

Before starting any task:

1. Read the absolute constraints and mandatory rules
2. Check existing patterns in the codebase
3. Verify you have all needed information
4. Create a blocked task report if you cannot proceed

After completing any task:

1. Update this documentation
2. Test in Chrome (for UI components)
3. Verify all policies are satisfied
4. Commit and push changes

---

*This document evolves with the system. Last updated: Initial version*