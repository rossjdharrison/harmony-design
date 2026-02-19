# Harmony Design System

This document describes the Harmony Design System architecture, development workflows, and implementation guidelines.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Development Workflow](#development-workflow)
4. [Code Formatting](#code-formatting)
5. [Component Development](#component-development)
6. [Performance Guidelines](#performance-guidelines)
7. [Testing Requirements](#testing-requirements)
8. [Documentation Standards](#documentation-standards)

## Overview

Harmony is a high-performance design system for audio production interfaces. It combines Rust/WASM for audio processing with vanilla Web Components for UI rendering.

## Architecture

### Technology Stack

- **UI Layer**: Vanilla HTML/CSS/JavaScript with Web Components
- **Core Logic**: Rust compiled to WebAssembly
- **State Management**: EventBus with TypeNavigator queries
- **Audio Processing**: WebGPU + WASM implementations
- **Desktop Wrapper**: Tauri (not Electron)

### Bounded Contexts

Bounded contexts handle domain logic in Rust:

- `component-lifecycle/` - Component state management
- See `bounded-contexts/` for all contexts

### File Organization

```
harmony-design/
├── components/        # Web Components (UI layer)
├── bounded-contexts/  # Rust bounded contexts
├── core/             # Core utilities (EventBus, errors, etc.)
├── primitives/       # Atomic UI components
├── tokens/           # Design tokens
├── styles/           # Global styles
└── scripts/          # Build and dev tools
```

## Development Workflow

### Setup

1. Clone repository
2. Install dependencies: `npm install` (dev tools only)
3. Build WASM: `cd bounded-contexts && cargo build --target wasm32-unknown-unknown`
4. Run dev server: `npm run dev`

### Making Changes

1. **UI Components**: Edit files in `components/`, `primitives/`, etc.
2. **Core Logic**: Edit schemas in `harmony-schemas/`, run codegen
3. **Documentation**: Update this file (DESIGN_SYSTEM.md)

### Schema Changes

When modifying Rust behavior:

1. Navigate to `harmony-schemas/`
2. Modify the schema
3. Run codegen: `npm run codegen`
4. Verify compilation
5. Commit schema + generated code together

**Important**: CI fails if schema changed but generated code is stale.

## Code Formatting

### Prettier Configuration

The project uses Prettier for consistent code formatting. Configuration is in `.prettierrc.json`.

**Key formatting rules:**

- **Print width**: 100 characters (80 for Markdown/JSON)
- **Indentation**: 2 spaces (4 for Rust)
- **Quotes**: Single quotes for JS/CSS, double for HTML attributes
- **Semicolons**: Always required
- **Trailing commas**: ES5 style
- **Line endings**: LF (Unix style)

### Running Prettier

```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check

# Format specific file
npx prettier --write path/to/file.js
```

### Editor Integration

The `.editorconfig` file provides IDE-agnostic formatting rules. Most modern editors support it automatically.

**Recommended VS Code settings** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### File-Specific Rules

- **JavaScript/HTML/CSS**: 100 character line length, 2 space indent
- **Markdown**: 80 character line length, wrap prose
- **JSON**: 80 character line length for readability
- **Rust**: 4 space indent (Rust convention), 100 character line length
- **YAML**: 2 space indent, single quotes

### Ignored Files

See `.prettierignore` for excluded paths:

- Generated files (`harmony-dev/crates/`, `harmony-dev/workers/`)
- Build outputs (`dist/`, `target/`, `*.wasm`)
- Dependencies (`node_modules/`)
- Lock files and logs

### Pre-commit Hooks

Husky runs Prettier on staged files before commit. If formatting fails, the commit is blocked.

To bypass (not recommended): `git commit --no-verify`

## Component Development

### Web Component Pattern

All UI components must:

1. Extend `HTMLElement`
2. Use Shadow DOM
3. Publish events (never call bounded contexts directly)
4. Follow performance budgets

**Example structure**:

```javascript
/**
 * MyComponent - Brief description
 * @fires my-event - When something happens
 */
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
      <style>/* Component styles */</style>
      <div>/* Component markup */</div>
    `;
  }
}

customElements.define('my-component', MyComponent);
```

See `components/` for examples.

### Event-Driven Communication

**UI → Bounded Context**:

```javascript
// Component publishes event
this.dispatchEvent(new CustomEvent('play-clicked', {
  bubbles: true,
  composed: true,
  detail: { trackId: 123 }
}));
```

**Bounded Context → UI**:

```javascript
// Component subscribes to result
window.EventBus.subscribe('playback-started', (data) => {
  this.updatePlayState(data);
});
```

### EventBus Pattern

- UI components publish command events
- EventBus routes to bounded contexts
- Bounded contexts publish result events
- UI components subscribe to results

**Required on every page**: `<event-bus-component>` for debugging (Ctrl+Shift+E)

See `core/event-bus.js` for implementation.

## Performance Guidelines

### Absolute Constraints

1. **Render Budget**: Maximum 16ms per frame (60fps)
2. **Memory Budget**: Maximum 50MB WASM heap
3. **Load Budget**: Maximum 200ms initial load time
4. **Audio Latency**: Maximum 10ms end-to-end

### Optimization Strategies

- Use GPU-first rendering where possible
- Avoid async operations in audio render thread
- Use SharedArrayBuffer for AudioWorklet ↔ GPU transfer
- Minimize DOM manipulation (batch updates)
- Use CSS transforms for animations (GPU-accelerated)

### Performance Testing

Test animations with Chrome DevTools Performance panel. Target: 60fps for all UI animations.

## Testing Requirements

### Chrome Testing (Mandatory)

All UI components must be tested in Chrome before task completion.

**Test all states**:

- Default, hover, focus, active, disabled
- Error states, loading states, empty states (for complex components)

### Test Files

Components should have corresponding `.test.html` files:

```
components/
  my-component/
    my-component.js
    my-component.test.html
```

Open test file in Chrome to verify behavior.

### Quality Gates

Quality gates must pass before proceeding:

- TypeScript type checking
- Prettier formatting
- ESLint rules
- Rust compilation
- WASM build

Run all gates: `npm run quality-gates`

## Documentation Standards

### B1-Level English

Write documentation in clear, simple English (B1 CEFR level):

- Short sentences
- Common vocabulary
- Active voice
- Clear structure

### Code Comments

**Minimal inline comments**. Code should be self-documenting. Use JSDoc for public APIs:

```javascript
/**
 * Calculates the peak value over a time window
 * @param {Float32Array} samples - Audio samples
 * @param {number} windowMs - Window size in milliseconds
 * @returns {number} Peak value (0-1)
 */
function calculatePeak(samples, windowMs) {
  // Implementation
}
```

### Linking

Use relative links to code files:

```markdown
See [EventBus implementation](core/event-bus.js) for details.
```

### Documentation Updates

Updating DESIGN_SYSTEM.md is **mandatory** for every task. Agent cannot declare completion without filesystem evidence of documentation changes.

## Additional Resources

- **Architecture Decisions**: See `docs/` directory
- **Component Examples**: See `components/` and `primitives/`
- **Performance Reports**: See `reports/` directory
- **GitHub Workflows**: See `.github/workflows/`

---

**Last Updated**: 2025-01-XX (update with each change)