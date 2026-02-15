# Harmony Design System

A performance-focused design system built with vanilla Web Components.

## Directory Structure

The Harmony Design System follows a clear, flat directory structure. **No nested directories are allowed.**

### Root Structure

```
harmony-design/
├── src/                    # Core system files
│   ├── event-bus.js       # Central event routing
│   └── type-navigator.js  # Type-safe queries
├── primitives/            # Basic UI components (buttons, inputs)
├── molecules/             # Combined primitives (search bars, cards)
├── organisms/             # Complex components (headers, forms)
├── templates/             # Page layouts
├── bounded-contexts/      # Domain logic (Rust → WASM)
├── scripts/               # Build and verification tools
├── reports/               # Task reports and documentation
│   └── blocked/          # Blocked task reports
└── DESIGN_SYSTEM.md      # This file
```

### Critical Rule: No Nesting

The system must **never** have nested `harmony-design/harmony-design/` directories. This can happen during:
- Git operations (clone, merge)
- Manual file moves
- Build script errors

**Verification Tool:** Run `scripts/verify-structure.ps1` to check for nesting issues.

**Fix Tool:** If nesting is detected, run `scripts/fix-nested-structure.ps1` to automatically correct it.

## Performance Budgets

Every component must meet these limits:

- **Render Budget:** 16ms per frame (60fps)
- **Memory Budget:** 50MB WASM heap maximum
- **Load Budget:** 200ms initial load time

See [Performance Testing](#performance-testing) for verification methods.

## Architecture Principles

### Technology Boundaries

**Rust → WASM** for:
- Bounded contexts (domain logic)
- Graph engine
- Audio processing

**Vanilla HTML/CSS/JS** for:
- UI rendering
- DOM manipulation
- Component interfaces

**Python** for (development only):
- Test servers (pytest)
- Build scripts
- Dev tools
- Prototypes

**npm packages** for (development only):
- Build tools
- Dev servers
- Testing frameworks

### Event-Driven Communication

Components never call bounded contexts directly. All communication flows through the EventBus.

**Pattern:**
1. User interacts with component
2. Component publishes event to EventBus
3. EventBus routes to bounded context
4. Bounded context processes and publishes result
5. Component subscribes to result and updates UI

See: [`src/event-bus.js`](src/event-bus.js)

## Component Development

### Web Components with Shadow DOM

All UI components use native Web Components with shadow DOM for encapsulation.

**Basic Structure:**
```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>/* scoped styles */</style>
      <div>/* component markup */</div>
    `;
  }
}
customElements.define('my-component', MyComponent);
```

### Testing Requirements

Before marking any component task complete:

1. **Test in Chrome** - All components must be manually tested
2. **Test all states:**
   - Default, hover, focus, active, disabled
   - Error states, loading states, empty states (if applicable)
3. **Performance testing:**
   - Use Chrome DevTools Performance panel
   - Verify 60fps for animations
   - Check memory usage

### Event Publishing Pattern

Components publish events, never call methods directly:

```javascript
// In component
this.dispatchEvent(new CustomEvent('action-requested', {
  bubbles: true,
  composed: true,
  detail: { action: 'play', trackId: 123 }
}));
```

See: [`primitives/`](primitives/) for examples

## Bounded Contexts

Domain logic lives in Rust and compiles to WASM. Each bounded context:

1. Subscribes to command events
2. Processes business logic
3. Publishes result events

**Pattern:**
```javascript
// Subscribe to commands
eventBus.subscribe('PlayCommand', (event) => {
  // Process in WASM
  const result = wasmModule.play(event.detail.trackId);
  
  // Publish result
  eventBus.publish('PlaybackStarted', { trackId: result.id });
});
```

See: [`bounded-contexts/`](bounded-contexts/)

## Schema Management

**Critical:** Never edit generated Rust code directly.

**Process:**
1. Navigate to `harmony-schemas/`
2. Modify TypeScript schema
3. Run codegen: `npm run codegen`
4. Verify Rust compilation
5. Commit schema AND generated code together

CI will fail if schema changes but generated code is stale.

## EventBus Debugging

The EventBusComponent is available on every page for debugging.

**Access:** Press `Ctrl+Shift+E` to toggle visibility

**Features:**
- View all published events
- Inspect event payloads
- Monitor subscriber activity
- See validation errors

All EventBus errors log to console with context:
- Event type
- Source component
- Payload data
- Error message

See: [`src/event-bus.js`](src/event-bus.js)

## Documentation Standards

This file (`DESIGN_SYSTEM.md`) is the **single source of truth** for system documentation.

**Requirements:**
- Written in B1-level English (simple, clear)
- Logical sections per concern
- Concise but friendly tone
- Relative links to code files
- Minimal code samples (code lives in files)

**Two-way references:**
- Documentation links to code files
- Code comments point to relevant doc sections

**Mandatory:** Every task must update this file before completion.

## Quality Gates

Before any task is complete:

1. ✓ Code compiles/runs without errors
2. ✓ Component tested in Chrome (if UI component)
3. ✓ Performance budgets met
4. ✓ DESIGN_SYSTEM.md updated
5. ✓ Changes committed
6. ✓ Changes pushed to remote

## Blocked Tasks

If a task cannot be completed:

1. Create report: `reports/blocked/{task_id}.md`
2. Include:
   - Reason for blockage
   - Attempted solutions
   - Recommended enabling work
3. Await further instructions OR create enabling task

## Scripts and Tools

### Directory Structure Verification

**Check structure:** `scripts/verify-structure.ps1`
- Detects nested directories
- Verifies expected folders exist
- Checks critical files present

**Fix nesting:** `scripts/fix-nested-structure.ps1`
- Automatically moves files from nested directories
- Removes empty nested folders
- Interactive confirmation before changes

**When to run:**
- After git operations (clone, pull, merge)
- Before starting new tasks
- When directory structure seems incorrect
- As part of CI/CD pipeline

## Getting Started

1. Clone repository
2. Run `scripts/verify-structure.ps1` to check setup
3. Review this documentation
4. Explore [`primitives/`](primitives/) for component examples
5. Check [`src/event-bus.js`](src/event-bus.js) for event patterns

## Common Issues

**Nested directories:** Run `scripts/verify-structure.ps1` then `scripts/fix-nested-structure.ps1` if needed.

**Schema changes not reflecting:** Ensure you ran codegen and committed generated files together.

**Component not responding:** Check EventBus console logs for validation errors.

**Performance issues:** Use Chrome DevTools Performance panel to identify bottlenecks.

---

*This documentation is maintained as part of every task completion. Last updated: task-manual-fix-directory-structure*