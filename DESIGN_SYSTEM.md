# Harmony Design System

Complete design system documentation for the Harmony audio workstation.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Tokens](#tokens)
- [Patterns](#patterns)
- [Development](#development)
- [Tools](#tools)

## Overview

Harmony is a GPU-accelerated audio workstation built with Web Components, Rust/WASM, and WebGPU. The design system provides reusable UI primitives, molecules, organisms, and templates following Atomic Design principles.

### Core Principles

1. **Performance First**: 60fps UI, <10ms audio latency
2. **Web Standards**: Native Web Components, no frameworks
3. **Type Safety**: TypeScript definitions, schema-driven
4. **Accessibility**: ARIA compliant, keyboard navigable
5. **Reactive**: Event-driven architecture via EventBus

## Architecture

### Technology Stack

- **UI Layer**: Vanilla HTML/CSS/JS with Web Components
- **Logic Layer**: Rust compiled to WASM
- **Audio Processing**: WebGPU + AudioWorklet
- **State Management**: EventBus + Bounded Contexts
- **Storage**: IndexedDB for projects, schemas for validation

### Bounded Contexts

Core logic organized into bounded contexts (Rust → WASM):
- Audio Engine
- Project Management
- Plugin System
- MIDI Processing

UI components publish events; bounded contexts subscribe and respond.

## Components

### Primitives

Basic building blocks (atoms):
- Buttons, inputs, labels
- Icons, badges, avatars
- Progress bars, sliders

### Molecules

Simple combinations:
- Form fields (label + input + error)
- Search bars (input + icon + button)
- Cards (container + header + content)

### Organisms

Complex components:
- Navigation bars
- Modal dialogs
- Data tables
- Audio mixers

### Templates

Page-level layouts:
- App shell
- Dashboard
- Project editor

## Tokens

Design tokens defined in `tokens/`:
- Colors: `colors.json`
- Typography: `typography.json`
- Spacing: `spacing.json`
- Shadows: `shadows.json`

Tokens generate CSS custom properties via build script.

## Patterns

### Event-Driven Communication

Components publish events, never call bounded contexts directly:

```javascript
// Component publishes event
EventBus.publish('audio.play', { trackId: '123' });

// Bounded context subscribes
EventBus.subscribe('audio.play', handlePlay);
```

### Shadow DOM Encapsulation

All components use shadow DOM for style isolation:

```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
}
```

### Performance Budgets

- Render: 16ms per frame (60fps)
- Memory: 50MB WASM heap
- Load: 200ms initial
- Audio: 10ms end-to-end latency

## Development

### Component Creation

Use scaffold CLI:

```bash
node tools/component-scaffold/cli.js --name=my-component --type=primitive
```

### Testing in Chrome

All components MUST be tested in Chrome before completion:
1. Default state
2. Hover, focus, active states
3. Disabled state
4. Error/loading/empty states (if applicable)
5. Performance (60fps target)

### Quality Gates

Run before committing:

```bash
node scripts/quality-gate.js
```

Checks:
- Linting (ESLint)
- Type checking
- Performance budgets
- Accessibility

## Tools

### Codemod Runner

AST transformation tool for bulk code updates.

**Location**: `tools/codemod-runner/`

**Purpose**: Automate code transformations across the codebase using AST parsing and manipulation.

**Usage**:

```bash
# Add JSDoc comments to all components
node tools/codemod-runner/cli.js --transform=add-jsdoc --path=components/

# Update event patterns (dry run)
node tools/codemod-runner/cli.js --transform=update-event-pattern --path=primitives/ --dry-run

# Add performance marks
node tools/codemod-runner/cli.js --transform=add-performance-marks --path=organisms/
```

**Options**:
- `--transform=<name>`: Transform to apply (from transforms/ directory)
- `--path=<target>`: Target file or directory
- `--dry-run`: Preview changes without writing
- `--verbose`: Show detailed output

**Architecture**:
- `cli.js`: Command line interface
- `src/runner.js`: Orchestrates transformation pipeline
- `src/parser.js`: Parses JavaScript to AST
- `src/writer.js`: Writes modified AST back to files
- `src/file-scanner.js`: Recursively finds files to transform
- `src/transform-loader.js`: Dynamically loads transform modules
- `transforms/`: Individual transformation implementations

**Creating Custom Transforms**:

Create a new file in `tools/codemod-runner/transforms/`:

```javascript
/**
 * My custom transform
 * @param {Object} ast - Parsed AST
 * @param {string} filePath - File being transformed
 * @returns {Object} Modified AST (or null if no changes)
 */
export function transform(ast, filePath) {
  let code = ast.sourceCode;
  
  // Modify code here using regex or AST manipulation
  code = code.replace(/oldPattern/g, 'newPattern');
  
  return {
    ...ast,
    sourceCode: code
  };
}
```

**Performance**:
- Processes up to 4 files concurrently
- Skips unchanged files automatically
- Memory efficient for large codebases

**Example Transforms**:
- `example-add-jsdoc.js`: Adds JSDoc comments to functions without them
- `example-update-event-pattern.js`: Converts CustomEvent to EventBus pattern
- `example-add-performance-marks.js`: Adds performance.mark() to lifecycle methods

**See**: `tools/codemod-runner/README.md` for detailed documentation.

### Component Scaffold CLI

Generates component boilerplate:

**Location**: `tools/component-scaffold/`

```bash
node tools/component-scaffold/cli.js --name=button --type=primitive
```

Creates:
- Component class file
- Test file
- Story file
- Documentation stub

### Schema to Component

Generates components from JSON schemas:

**Location**: `tools/schema-to-component/`

```bash
node tools/schema-to-component/cli.js --schema=button-schema.json
```

### Pen to Component

Converts .pen design files to Web Components:

**Location**: `tools/pen-to-component/`

```bash
node tools/pen-to-component/cli.js --input=design.pen --output=components/
```

## Contributing

1. Create feature branch
2. Implement changes
3. Test in Chrome (all states)
4. Run quality gates
5. Update this documentation
6. Submit PR

## References

- EventBus: `core/event-bus.js`
- Quality Gates: `scripts/quality-gate.js`
- Component Patterns: `components/README.md`
- Performance Monitoring: `performance/README.md`