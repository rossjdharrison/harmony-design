# Harmony Design System

This document describes the Harmony Design System architecture, how to work with it, and implementation notes. All code files reference this document, and this document references code files.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Audio Processing Pipeline](#audio-processing-pipeline)
4. [Event-Driven Communication](#event-driven-communication)
5. [Component System](#component-system)
6. [Performance Budgets](#performance-budgets)
7. [Development Workflow](#development-workflow)
8. [Testing Strategy](#testing-strategy)

## Overview

Harmony is a professional audio workstation built with web technologies. The system uses Rust/WASM for audio processing and bounded contexts, with vanilla JavaScript/HTML/CSS for UI rendering.

## Architecture

### Technology Stack

- **Audio Processing**: Rust → WASM (harmony-graph, harmony-sound)
- **UI Layer**: Vanilla JavaScript + Web Components + Shadow DOM
- **State Management**: EventBus pattern (core/event-bus.js)
- **Build Tools**: wasm-pack, esbuild, npm scripts

### Bounded Contexts

Each bounded context is a self-contained Rust crate compiled to WASM:

- `harmony-graph`: Signal graph engine
- `harmony-sound`: Audio processing domains (effects, synthesis, analysis)
- `harmony-schemas`: Type definitions and code generation

## Audio Processing Pipeline

### Architecture Overview

Audio processing happens in three layers:

1. **AudioContext** (Web Audio API) - Manages audio graph
2. **AudioWorklet** (Dedicated thread) - Real-time processing
3. **WASM Modules** (Compiled Rust) - DSP algorithms

### Audio Worklet Processors

Located in `web/worklets/`:

#### TransportProcessor
**File**: `web/worklets/transport-processor.js`

Handles playback transport with sample-accurate timing:
- Play/pause/stop commands
- Tempo and time signature changes
- Sample-accurate scheduling
- Latency compensation

#### ClipPlayerProcessor
**File**: `web/worklets/clip-player-processor.js`

Plays audio clips with scheduling:
- Clip loading and buffering
- Loop points and regions
- Crossfading and transitions
- Multi-clip playback

#### EffectsProcessor
**File**: `web/worklets/effects-processor.js`

Bridges to WASM EffectFunctionRegistry for real-time effects processing:
- Dynamic effect chain management
- Real-time parameter automation via AudioParam
- Zero-copy buffer processing via SharedArrayBuffer
- Sub-10ms latency guarantee

**Effect Chain Architecture**:
```
Input → WASM Memory → Effect 1 → Effect 2 → ... → Effect N → Output
                ↑                                            ↓
                └────────── Dry/Wet Mix Parameter ──────────┘
```

**WASM Interface**:
- `process_effects(inputPtr, outputPtr, numFrames, numChannels)` - Process audio
- `add_effect(effectType)` - Add effect to chain
- `remove_effect(effectId)` - Remove effect from chain
- `set_parameter(effectId, paramName, value)` - Update parameter
- `bypass_effect(effectId, bypass)` - Bypass effect

**Control Messages**:
- `add-effect` - Add effect to chain
- `remove-effect` - Remove effect from chain
- `set-parameter` - Update effect parameter
- `bypass-effect` - Bypass/enable effect
- `clear-chain` - Clear all effects
- `get-stats` - Retrieve processing statistics

**Performance Monitoring**:
The processor tracks:
- Processed frames count
- Dropped frames count
- Average latency (moving average over 100 samples)

Latency exceeding 10ms triggers console warnings.

### WASM Integration Pattern

All audio worklets follow this pattern:

1. **Initialization**: Request WASM module via message port
2. **Memory Allocation**: Allocate buffers in WASM linear memory
3. **Processing Loop**: Copy data → Call WASM → Copy results
4. **Zero-Copy Optimization**: Use SharedArrayBuffer when possible

**Memory Layout Example**:
```
WASM Linear Memory:
[Input Buffer: 128 frames × 2 channels × 4 bytes]
[Output Buffer: 128 frames × 2 channels × 4 bytes]
[Effect State: Variable size]
```

### Real-Time Constraints

**Critical Rules**:
- No async operations in `process()` callback
- No memory allocations in audio thread
- No locks or blocking operations
- Maximum 10ms end-to-end latency

**Latency Budget Breakdown**:
- Buffer copy to WASM: <1ms
- WASM processing: <8ms
- Buffer copy from WASM: <1ms
- **Total**: <10ms

## Event-Driven Communication

### EventBus Singleton

**File**: `core/event-bus.js`

The EventBus is a singleton that coordinates all application communication. Only one instance may exist.

**Pattern**:
```javascript
// UI Component publishes event
eventBus.publish('PlayClicked', { clipId: 123 });

// Bounded Context subscribes
eventBus.subscribe('PlayClicked', (event) => {
  // Process command
  // Publish result
  eventBus.publish('PlaybackStarted', { clipId: 123 });
});
```

**Rules**:
- UI components publish events, never call BCs directly
- Bounded Contexts subscribe to commands, publish results
- EventBus errors must be logged with context
- EventBusComponent must be available on every page (Ctrl+Shift+E)

## Component System

### Atomic Design Levels

- **Atoms**: `primitives/` - Basic building blocks (buttons, inputs)
- **Molecules**: `components/` - Simple combinations (labeled input)
- **Organisms**: `organisms/` - Complex features (mixer channel)
- **Templates**: `templates/` - Page layouts (app-shell)

### Web Component Pattern

All components use:
- Shadow DOM for encapsulation
- Custom Elements API
- No frameworks or libraries
- Vanilla JavaScript only

**Example Structure**:
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

## Performance Budgets

### Render Budget
- **Maximum**: 16ms per frame (60fps)
- **Target**: 8ms per frame (120fps capable)

### Memory Budget
- **WASM Heap**: Maximum 50MB per module
- **Total Application**: Maximum 200MB

### Load Budget
- **Initial Load**: Maximum 200ms
- **WASM Module Load**: Maximum 100ms
- **First Paint**: Maximum 500ms

### Audio Processing Budget
- **Latency**: Maximum 10ms end-to-end
- **Buffer Size**: 128 frames (2.9ms at 44.1kHz)
- **Processing Time**: <8ms per buffer

## Development Workflow

### Adding a New Effect

1. **Define Schema** (harmony-schemas):
   ```rust
   pub struct MyEffect {
       pub parameter: f32,
   }
   ```

2. **Run Codegen**:
   ```bash
   cd harmony-schemas
   cargo run --bin codegen
   ```

3. **Implement Effect** (harmony-graph/src/domains/effects):
   ```rust
   impl EffectFunction for MyEffect {
       fn process(&mut self, input: &[f32], output: &mut [f32]) {
           // DSP code
       }
   }
   ```

4. **Register Effect** (harmony-graph/src/domains/effects/registry.rs):
   ```rust
   registry.register("my-effect", Box::new(MyEffect::default()));
   ```

5. **Use in Worklet** (web/worklets/effects-processor.js):
   ```javascript
   processor.port.postMessage({
       type: 'add-effect',
       data: { effectType: 'my-effect', config: { parameter: 0.5 } }
   });
   ```

### Testing in Chrome

**Required for all UI components**:

1. Open component in Chrome
2. Test all states: default, hover, focus, active, disabled
3. Test complex states: error, loading, empty
4. Verify performance (60fps target)
5. Check DevTools Performance panel

## Testing Strategy

### Quality Gates

All PRs must pass:
- TypeScript compilation
- ESLint validation
- Bundle size check (<200KB per chunk)
- WASM build pipeline
- Snapshot validation

### Performance Testing

Use Chrome DevTools:
- **Performance Panel**: Record and analyze frame timing
- **Memory Panel**: Check for leaks and excessive allocations
- **Network Panel**: Verify load budget compliance

### Audio Testing

- **Latency Measurement**: Use `performance.now()` in worklet
- **Buffer Underruns**: Monitor dropped frames counter
- **Quality Verification**: Listen to processed audio

## Related Files

### Core Infrastructure
- `core/event-bus.js` - EventBus singleton
- `src/index.js` - Composition root

### Audio Worklets
- `web/worklets/transport-processor.js` - Transport handling
- `web/worklets/clip-player-processor.js` - Clip playback
- `web/worklets/effects-processor.js` - Effects processing

### Bounded Contexts
- `harmony-graph/` - Signal graph engine (Rust/WASM)
- `harmony-sound/` - Audio processing domains (Rust/WASM)
- `harmony-schemas/` - Type definitions and codegen

### Build Configuration
- `.github/workflows/ci-build.yml` - CI pipeline with WASM build
- `package.json` - Build scripts and dev dependencies

---

**Last Updated**: 2025-01-XX (task-cap-effects-impl)