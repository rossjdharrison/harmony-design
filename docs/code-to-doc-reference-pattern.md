# Code-to-Doc Reference Pattern

**Status**: Active  
**Mission**: del-code-to-doc-reference-pattern-  
**Vision**: Single Unified Documentation (Policy #21)

## Purpose

Establishes a standard comment pattern for all code files to link to relevant sections in `DESIGN_SYSTEM.md`. This creates bidirectional references between code and documentation, making the system easier to navigate and maintain.

## Pattern Specification

### Standard Header Comment

Every code file MUST include a header comment block with these elements:

```javascript
/**
 * @fileoverview Brief description of what this file does
 * @see {@link file://./DESIGN_SYSTEM.md#section-anchor Section Name} - Related documentation
 * @module path/to/module
 */
```

### Multi-Section References

When a file relates to multiple documentation sections:

```javascript
/**
 * @fileoverview Brief description of what this file does
 * @see {@link file://./DESIGN_SYSTEM.md#event-bus Event Bus Architecture}
 * @see {@link file://./DESIGN_SYSTEM.md#bounded-contexts Bounded Contexts}
 * @module path/to/module
 */
```

### Inline Documentation References

For specific functions or classes that implement documented patterns:

```javascript
/**
 * Processes audio commands through the event bus.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#audio-processing Audio Processing}
 * @param {Object} command - Command object
 * @returns {Promise<void>}
 */
async function processAudioCommand(command) {
  // implementation
}
```

## Anchor Format in DESIGN_SYSTEM.md

Documentation sections should use clear, stable anchors:

```markdown
## Event Bus Architecture {#event-bus}

Content about event bus...

### Command Pattern {#event-bus-command-pattern}

Specific pattern details...
```

## Examples by File Type

### Core Infrastructure

```javascript
/**
 * @fileoverview EventBus singleton - central message routing system
 * @see {@link file://./DESIGN_SYSTEM.md#event-bus Event Bus Architecture}
 * @see {@link file://./DESIGN_SYSTEM.md#singleton-pattern Singleton Pattern}
 * @module core/event-bus
 */
```

### Bounded Context

```javascript
/**
 * @fileoverview Audio Graph Bounded Context - manages audio processing graph
 * @see {@link file://./DESIGN_SYSTEM.md#bounded-contexts Bounded Contexts}
 * @see {@link file://./DESIGN_SYSTEM.md#audio-graph Audio Graph}
 * @module bounded-contexts/audio-graph
 */
```

### UI Component

```javascript
/**
 * @fileoverview Knob control primitive - rotary input component
 * @see {@link file://./DESIGN_SYSTEM.md#atomic-design Atomic Design}
 * @see {@link file://./DESIGN_SYSTEM.md#primitives Primitives}
 * @module components/primitives/knob
 */
```

### WASM Bridge

```javascript
/**
 * @fileoverview WASM bridge for audio processing - JS ↔ Rust interface
 * @see {@link file://./DESIGN_SYSTEM.md#wasm-architecture WASM Architecture}
 * @see {@link file://./DESIGN_SYSTEM.md#audio-processing Audio Processing}
 * @module core/wasm-bridge
 */
```

## Reverse References (Doc to Code)

In `DESIGN_SYSTEM.md`, reference implementations:

```markdown
## Event Bus Architecture {#event-bus}

The EventBus provides centralized message routing.

**Implementation**: [`core/event-bus.js`](./core/event-bus.js)  
**Tests**: [`tests/unit/event-bus.test.js`](./tests/unit/event-bus.test.js)  
**Example**: [`examples/event-bus-demo.html`](./examples/event-bus-demo.html)
```

## Migration Strategy

### Phase 1: Core Infrastructure
Add references to:
- `core/event-bus.js`
- `core/type-navigator.js`
- `core/wasm-bridge.js`
- `core/composition-root.js`

### Phase 2: Bounded Contexts
Add references to all files in:
- `bounded-contexts/audio-graph/`
- `bounded-contexts/playback/`
- `bounded-contexts/project/`

### Phase 3: UI Components
Add references to:
- `components/primitives/`
- `components/molecules/`
- `components/organisms/`

### Phase 4: Supporting Infrastructure
Add references to:
- `utils/`
- `hooks/`
- `controls/`

## Validation

A file is compliant when:

1. ✅ Has `@fileoverview` describing purpose
2. ✅ Has at least one `@see` link to DESIGN_SYSTEM.md
3. ✅ Uses stable anchor format (`#section-name`)
4. ✅ Anchor exists in DESIGN_SYSTEM.md
5. ✅ Corresponding section in DESIGN_SYSTEM.md links back to code file

## Tooling Support

Future automation can:
- Validate all `@see` links point to valid anchors
- Check bidirectional references are complete
- Generate navigation maps
- Detect orphaned code or documentation

## Benefits

1. **Discoverability**: Developers can navigate from code to concepts
2. **Maintainability**: Documentation updates trigger code review
3. **Onboarding**: New developers see context immediately
4. **Validation**: Broken links indicate documentation drift
5. **Architecture Enforcement**: Missing links highlight undocumented patterns

## Related Policies

- **Policy #21**: Single Unified Documentation
- **Policy #19**: Documentation Non-Optional
- **DESIGN_SYSTEM.md Format Requirements**: Links to code files relatively