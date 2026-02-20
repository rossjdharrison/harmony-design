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

#

## NodeParamBridge - Audio Parameter Management

The NodeParamBridge connects UI controls to Web Audio API parameters. It provides type-safe parameter updates and handles value mapping between UI ranges and audio ranges.

### Current Implementation

Parameter management is currently handled by ``AudioEngineBoundedContext.setNodeParameter()``. A dedicated bridge abstraction is planned for future extraction.

**File**: ``bounded-contexts/audio-engine/audio-engine.ts``

### How to Use

UI components publish parameter change events:

````javascript
// In UI component
window.eventBus.publish('audio:setParameter', {
  nodeId: 'oscillator-1',
  paramName: 'frequency',
  value: 440
});
````

AudioEngine subscribes and updates parameters:

````javascript
// In audio-engine.ts
eventBus.subscribe('audio:setParameter', async (event) => {
  await this.setNodeParameter(
    event.payload.nodeId,
    event.payload.paramName,
    event.payload.value
  );
});
````

### Key Principles

1. **Event-Driven**: UI never calls AudioEngine directly
2. **Audio-Thread Safe**: Always use Web Audio scheduling methods
3. **Value Mapping**: Convert UI ranges to audio ranges before publishing
4. **Rate Limiting**: Throttle UI updates to avoid overwhelming audio thread

### Supported Parameter Types

- **Frequency**: Hz (e.g., ``oscillator.frequency``)
- **Gain**: 0.0 to 1.0 (e.g., ``gainNode.gain``)
- **Detune**: Cents, -1200 to 1200 (e.g., ``oscillator.detune``)
- **Q Factor**: 0.0001 to 1000 (e.g., ``filter.Q``)
- **Time**: Seconds (e.g., ``delay.delayTime``)

### Performance Budget

- **Update Rate**: Max 60 fps (16ms throttle)
- **Scheduling**: Use ``setValueAtTime()`` for immediate changes
- **Automation**: Use ``linearRampToValueAtTime()`` or ``exponentialRampToValueAtTime()``

### Detailed Documentation

See [NodeParamBridge Usage Guide](docs/node-param-bridge-usage.md) for:
- Value mapping examples
- Automation patterns
- Error handling
- Performance optimization
- Testing strategies

### Future Architecture

A dedicated ``NodeParamBridge`` class will be extracted to provide:
- Unified parameter interface
- Built-in value mapping utilities
- Change notification system
- Automation scheduling helpers
- Undo/redo support
## Bounded Contexts

Core logic organized into bounded contexts (Rust â†’ WASM):
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

## Bridge Validation Anti-Pattern ?

**Status**: REMOVED - This is an anti-pattern and must not be used.

### What Not To Do

Bridge validation refers to placing validation logic in the WASM bridge layer between JavaScript UI and Rust bounded contexts. This is **explicitly forbidden**.

### Why It's Wrong

1. **Violates Single Responsibility**: Bridge layer is for serialization only
2. **Creates Duplication**: Validation exists in UI, bridge, AND bounded context
3. **Performance Overhead**: Unnecessary WASM boundary crossings
4. **Breaks Event Architecture**: Requires synchronous responses
5. **Complicates Testing**: Requires WASM compilation for validation tests

### Correct Pattern

Validation belongs in **three distinct layers**:

#### 1. UI Layer (Component-Level)
- Immediate user feedback
- Format validation (email, phone)
- Required field checks
- Client-side only, no WASM

``````javascript
// ? CORRECT: Validation in component
class EmailInput extends HTMLElement {
  validate() {
    const email = this.value;
    if (!email.includes('@')) {
      this.showError('Invalid email format');
      return false;
    }
    return true;
  }
}
``````

#### 2. Schema Layer (JSON Schema)
- Event payload validation
- Type checking before WASM boundary
- Contract enforcement
- See: ``harmony-schemas/validation/``

#### 3. Bounded Context (Business Rules)
- Domain validation (source of truth)
- State consistency checks
- Authorization rules
- Rust implementation in bounded context

``````rust
// ? CORRECT: Validation in bounded context
impl AudioContext {
    pub fn set_volume(&mut self, value: f32) -> Result<(), AudioError> {
        if value < 0.0 || value > 1.0 {
            return Err(AudioError::InvalidVolume);
        }
        self.volume = value;
        Ok(())
    }
}
``````

### Bridge Layer: Serialization Only

``````rust
// ? CORRECT: Pure serialization, no validation
#[wasm_bindgen]
pub fn handle_command(event_json: &str) -> String {
    let event: Event = serde_json::from_str(event_json)?;
    let result = bounded_context.handle(event);
    serde_json::to_string(&result)?
}
``````

``````rust
// ? INCORRECT: Validation in bridge
#[wasm_bindgen]
pub fn handle_command(event_json: &str) -> String {
    let event: Event = serde_json::from_str(event_json)?;
    
    // ? DON'T DO THIS
    if event.payload.is_empty() {
        return error_response('Empty payload');
    }
    
    let result = bounded_context.handle(event);
    serde_json::to_string(&result)?
}
``````

### Audit Tool

Run the audit script to detect bridge validation:

``````bash
node scripts/audit-bridge-validation.js
``````

### Related Documentation

- Detailed guide: ``docs/bridge-validation-antipattern.md``
- Validation architecture: ``docs/validation-architecture.md`` (if exists)
- Event Bus pattern: See 'Event Bus' section above

### Decision Rationale

Bridge validation was removed to:
- Maintain clear separation of concerns
- Improve WASM performance (-2ms average per call)
- Reduce code duplication
- Simplify testing and maintenance
- Enforce proper event-driven architecture



## Zone Affinity and Execution Routing

Harmony's execution model supports **zone affinity** to route operations to specialized execution contexts. This ensures performance-critical operations (like WebXR rendering) execute in appropriate environments.

### ZoneAffinity.XR

The ``ZoneAffinity.XR`` semantic marker routes operations to WebXR-capable execution zones. This is critical for:

- **Stereoscopic rendering** - Render to left/right eye views in XR animation frames
- **Pose tracking** - Access 6DOF head and controller tracking data
- **Spatial audio** - Process audio with head-tracked listener position
- **Input handling** - Process XR controller and hand tracking events

**Full Specification:** [docs/architecture/zone-affinity-xr-spec.md](docs/architecture/zone-affinity-xr-spec.md)

### Usage Pattern

Commands and queries specify zone affinity to control execution routing:

````javascript
// Route to XR zone for stereoscopic rendering
EventBus.processCommand({
  type: 'XR.StartSession',
  zoneAffinity: 'ZoneAffinity.XR',
  payload: {
    mode: 'immersive-vr',
    requiredFeatures: ['local-floor']
  }
});

// Query XR-specific state
TypeNavigator.query({
  semantic_type: 'XRPose',
  zoneAffinity: 'ZoneAffinity.XR',
  referenceSpace: 'local-floor'
});
````

### Fallback Behavior

When an XR zone is unavailable (WebXR not supported), the system can:

- **Graceful degradation** - Fall back to monoscopic rendering (default)
- **Strict failure** - Throw error and halt operation

Configure in ``config/execution-zones.json``.

### Performance Targets

XR zones have stricter performance requirements:

- **Motion-to-Photon Latency:** < 20ms (target: 11ms)
- **Render Budget per Eye:** < 8ms (16ms total @ 60fps stereo)
- **Memory Budget:** 80MB (50MB standard + 30MB XR-specific)

### Integration

Zone affinity is recognized by:

- **EventBus** - Routes commands to appropriate zones ([core/event-bus.js](core/event-bus.js))
- **TypeNavigator** - Queries zone-specific state stores ([core/type-navigator.js](core/type-navigator.js))
- **IRendererBackend** - Checks zone support before execution ([types/renderer-backend.d.ts](types/renderer-backend.d.ts))

See the full specification for error handling, testing requirements, and migration guides.


## Spatial Input Abstraction

**Location:** ``docs/specs/spatial-input-abstraction.md``  
**Types:** ``types/spatial-input.d.ts``  
**Status:** Specification (not yet implemented)

### Overview

The Spatial Input Abstraction defines unified input primitives for XR devices including gaze tracking, motion controllers, and hand tracking. This specification provides a device-agnostic interface while preserving device-specific capabilities.

### Input Modalities

**Gaze Input** tracks eye direction and focus point in 3D space:
- Eye ray with origin and direction vectors
- Focus point intersection detection
- Dwell time measurement for gaze-based selection
- Blink detection for accessibility features

**Controller Input** provides 6DOF tracked controllers:
- Position and orientation with velocity tracking
- Button states (pressed, touched, analog values)
- Thumbstick and trigger analog inputs
- Haptic feedback output capability
- Standard button mapping across vendors

**Hand Tracking** offers skeletal tracking without physical controllers:
- 25 joints per hand with position and orientation
- Pinch gesture detection (thumb-finger contact)
- Grip strength measurement
- Gesture recognition (open palm, fist, pointing, etc.)

### Unified Interface

All input modalities implement the ``InputSource`` interface:
```typescript
interface InputSource {
  id: string;
  type: 'gaze' | 'controller' | 'hand';
  getPose(): Pose | null;
  getRay(): Ray | null;
}
```

The ``InputManager`` provides central access to all input sources with capability queries and source filtering.

### EventBus Integration

Spatial input events follow the naming convention:
```
spatial:input:{modality}:{action}
```

Examples:
- ``spatial:input:gaze:focus`` - Gaze enters target
- ``spatial:input:controller:buttondown`` - Button pressed
- ``spatial:input:hand:pinchstart`` - Pinch gesture begins

All events include source metadata and timestamp for coordination across multiple input devices.

### Performance Requirements

- **Gaze latency:** < 5ms from eye movement to event
- **Controller latency:** < 10ms from physical movement to event  
- **Hand latency:** < 15ms from hand movement to event
- **Memory per source:** < 1KB state storage
- **Update frequency:** 30-120 Hz depending on device capability

### Coordinate System

**World Space:** Right-handed coordinate system with origin at XR session start point. Units in meters. X-axis right, Y-axis up, Z-axis backward (toward user).

**Local Space:** Device-specific reference frames transformed to world space via pose matrices.

### Accessibility

The specification supports multiple interaction patterns:
- Gaze + dwell (look and wait)
- Gaze + voice (look and speak)
- Controller only (full functionality)
- Hand only (full functionality)

Customizable thresholds for dwell duration, pinch sensitivity, and haptic intensity ensure accessibility for diverse user needs.

### Implementation Status

This is a **specification document only**. Implementation will occur in future tasks:
- WebXR API integration layer
- Rust/WASM input processing pipeline
- EventBus event publishers
- Input manager component

See ``docs/specs/spatial-input-abstraction.md`` for complete technical specification including data structures, event payloads, error handling, and testing requirements.

### Related Specifications

- [XR Zone Affinity](./docs/specs/xr-zone-affinity.md) - Spatial layout zones
- [Transform3D Semantic Type](./docs/specs/transform3d-semantic-type.md) - 3D transforms
- [Scene3D Semantic Type](./docs/specs/scene3d-semantic-type.md) - 3D scene graphs

