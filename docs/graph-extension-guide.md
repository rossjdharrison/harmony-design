# Graph Extension Guide

**How to add custom node and edge types to the Harmony Graph System**

This guide explains how to extend the graph engine with custom node types and edge types for specialized audio processing workflows.

## Overview

The Harmony Graph System is built on a flexible node-edge architecture. You can extend it by:

1. **Defining custom node types** in the schema layer
2. **Registering node processors** in the WASM runtime
3. **Creating custom edge types** for specialized routing
4. **Implementing validation rules** for your extensions

## Custom Node Types

### Step 1: Define Schema

Custom nodes are defined in `harmony-schemas/src/graph/node_types.rs`:

```rust
// Add your custom node type to the enum
pub enum NodeType {
    // ... existing types
    CustomFilter,
    CustomEffect,
}
```

### Step 2: Create Node Processor

Implement the processor in `bounded-contexts/wasm-node-registry/`:

**File:** `bounded-contexts/wasm-node-registry/src/processors/custom_filter.rs`

```rust
use harmony_schemas::graph::{NodeId, AudioBuffer};

pub struct CustomFilterProcessor {
    cutoff: f32,
    resonance: f32,
}

impl CustomFilterProcessor {
    pub fn new() -> Self {
        Self {
            cutoff: 1000.0,
            resonance: 0.7,
        }
    }
    
    pub fn process(&mut self, input: &AudioBuffer, output: &mut AudioBuffer) {
        // Your processing logic here
    }
    
    pub fn set_parameter(&mut self, name: &str, value: f32) {
        match name {
            "cutoff" => self.cutoff = value,
            "resonance" => self.resonance = value,
            _ => {}
        }
    }
}
```

### Step 3: Register Processor

Add registration in `bounded-contexts/wasm-node-registry/src/registry.rs`:

```rust
pub fn register_custom_nodes(registry: &mut NodeRegistry) {
    registry.register(
        NodeType::CustomFilter,
        Box::new(|| Box::new(CustomFilterProcessor::new()))
    );
}
```

### Step 4: Run Codegen

```bash
cd harmony-schemas
cargo build
npm run codegen
```

This generates TypeScript types and WASM bindings automatically.

### Step 5: Use in UI Layer

Create a UI component in `harmony-graph/nodes/`:

**File:** `harmony-graph/nodes/custom-filter-node.js`

```javascript
/**
 * Custom Filter Node Component
 * @extends HTMLElement
 */
export class CustomFilterNode extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    
    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: var(--surface-color);
                    border-radius: 8px;
                    padding: 16px;
                }
            </style>
            <div class="node-header">Custom Filter</div>
            <input type="range" id="cutoff" min="20" max="20000" />
            <input type="range" id="resonance" min="0" max="1" step="0.01" />
        `;
    }
    
    setupEventListeners() {
        const cutoff = this.shadowRoot.getElementById('cutoff');
        const resonance = this.shadowRoot.getElementById('resonance');
        
        cutoff.addEventListener('input', (e) => {
            this.publishParameterChange('cutoff', parseFloat(e.target.value));
        });
        
        resonance.addEventListener('input', (e) => {
            this.publishParameterChange('resonance', parseFloat(e.target.value));
        });
    }
    
    /**
     * Publish parameter change to EventBus
     * @param {string} paramName - Parameter name
     * @param {number} value - New value
     */
    publishParameterChange(paramName, value) {
        const event = new CustomEvent('harmony:graph:node:parameter-changed', {
            bubbles: true,
            composed: true,
            detail: {
                nodeId: this.getAttribute('node-id'),
                parameter: paramName,
                value: value
            }
        });
        this.dispatchEvent(event);
    }
}

customElements.define('custom-filter-node', CustomFilterNode);
```

## Custom Edge Types

### Step 1: Define Edge Schema

In `harmony-schemas/src/graph/edge_types.rs`:

```rust
pub enum EdgeType {
    // ... existing types
    AudioStereo,
    AudioMultichannel,
    ControlCV,
}

pub struct EdgeMetadata {
    pub edge_type: EdgeType,
    pub channel_count: u32,
    pub sample_rate: u32,
}
```

### Step 2: Implement Edge Processor

In `bounded-contexts/wasm-edge-executor/src/edges/`:

**File:** `bounded-contexts/wasm-edge-executor/src/edges/stereo_edge.rs`

```rust
pub struct StereoEdgeProcessor {
    buffer_left: Vec<f32>,
    buffer_right: Vec<f32>,
}

impl StereoEdgeProcessor {
    pub fn new(buffer_size: usize) -> Self {
        Self {
            buffer_left: vec![0.0; buffer_size],
            buffer_right: vec![0.0; buffer_size],
        }
    }
    
    pub fn transfer(&mut self, source: &AudioBuffer, dest: &mut AudioBuffer) {
        // Transfer logic with stereo routing
    }
}
```

### Step 3: Register Edge Type

In `bounded-contexts/wasm-edge-executor/src/registry.rs`:

```rust
pub fn register_custom_edges(registry: &mut EdgeRegistry) {
    registry.register(
        EdgeType::AudioStereo,
        Box::new(|buffer_size| Box::new(StereoEdgeProcessor::new(buffer_size)))
    );
}
```

### Step 4: Create UI Component

**File:** `harmony-graph/edges/stereo-edge.js`

```javascript
/**
 * Stereo Edge Component
 * Renders a stereo audio connection between nodes
 */
export class StereoEdge extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }
    
    connectedCallback() {
        this.render();
    }
    
    render() {
        const sourceId = this.getAttribute('source-id');
        const targetId = this.getAttribute('target-id');
        
        this.shadowRoot.innerHTML = `
            <style>
                svg {
                    position: absolute;
                    pointer-events: none;
                    z-index: 1;
                }
                path {
                    fill: none;
                    stroke: var(--edge-color-stereo, #4CAF50);
                    stroke-width: 3;
                }
            </style>
            <svg>
                <path d="${this.calculatePath()}" />
            </svg>
        `;
    }
    
    calculatePath() {
        // Calculate SVG path between source and target
        return 'M 0 0 L 100 100';
    }
}

customElements.define('stereo-edge', StereoEdge);
```

## Validation Rules

### Custom Validation

Add validation in `harmony-schemas/src/graph/validation.rs`:

```rust
pub fn validate_custom_connection(
    source_type: &NodeType,
    target_type: &NodeType,
    edge_type: &EdgeType
) -> Result<(), ValidationError> {
    match (source_type, target_type, edge_type) {
        (NodeType::CustomFilter, NodeType::Output, EdgeType::AudioStereo) => Ok(()),
        _ => Err(ValidationError::IncompatibleConnection)
    }
}
```

## Performance Considerations

### GPU-First Processing

For GPU-accelerated custom nodes:

**File:** `bounded-contexts/wasm-node-registry/src/processors/gpu_custom.rs`

```rust
pub struct GPUCustomProcessor {
    gpu_context: GPUContext,
    shader_module: ShaderModule,
}

impl GPUCustomProcessor {
    pub async fn new(device: &Device) -> Self {
        let shader_module = device.create_shader_module(/* WGSL shader */);
        // Setup GPU pipeline
    }
    
    pub fn process_gpu(&mut self, input: &AudioBuffer, output: &mut AudioBuffer) {
        // GPU processing via WebGPU
    }
}
```

### Memory Budget

Custom nodes must respect the 50MB WASM heap limit:

- Use fixed-size buffers
- Avoid dynamic allocations in audio thread
- Recycle buffers between frames

### Latency Budget

Audio processing must complete within 10ms end-to-end:

- Profile your processor with `cargo bench`
- Target < 1ms per node for complex graphs
- Use SIMD optimizations where possible

## Testing Custom Extensions

### Unit Tests

**File:** `bounded-contexts/wasm-node-registry/tests/custom_filter_test.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_custom_filter_processing() {
        let mut processor = CustomFilterProcessor::new();
        let input = AudioBuffer::new(512);
        let mut output = AudioBuffer::new(512);
        
        processor.process(&input, &mut output);
        
        assert!(output.is_valid());
    }
}
```

### Integration Tests

**File:** `tests/graph-extensions.test.js`

```javascript
/**
 * Integration tests for custom graph extensions
 */
import { GraphEngine } from '../harmony-graph/graph-engine.js';

describe('Custom Node Extensions', () => {
    test('CustomFilterNode processes audio', async () => {
        const engine = new GraphEngine();
        const nodeId = await engine.addNode('CustomFilter');
        
        // Verify node was added
        expect(engine.hasNode(nodeId)).toBe(true);
    });
});
```

### Chrome Testing

1. Open `test-pages/graph-extensions.html`
2. Open DevTools Performance panel
3. Record while playing audio through custom nodes
4. Verify 60fps maintained
5. Check memory usage stays under 50MB

## EventBus Integration

Custom nodes communicate via EventBus:

```javascript
// Node publishes parameter change
window.dispatchEvent(new CustomEvent('harmony:command:graph:set-parameter', {
    detail: {
        nodeId: 'node-123',
        parameter: 'cutoff',
        value: 2000.0
    }
}));

// Bounded context subscribes
window.addEventListener('harmony:command:graph:set-parameter', (e) => {
    const { nodeId, parameter, value } = e.detail;
    // Update WASM processor
});
```

## Example: Complete Custom Node

See `examples/custom-node-example/` for a complete working example including:

- Schema definition
- Rust processor implementation
- UI component
- Tests
- Documentation

## Troubleshooting

### Codegen Fails

- Ensure `harmony-schemas` compiles: `cd harmony-schemas && cargo build`
- Check schema syntax in `.rs` files
- Verify `npm run codegen` script exists

### Node Not Appearing

- Check registration in `registry.rs`
- Verify WASM module loaded: check browser console
- Ensure custom element defined: `customElements.get('custom-filter-node')`

### Audio Glitches

- Profile with Chrome DevTools
- Check for allocations in audio thread
- Verify buffer sizes match (typically 128 or 512 samples)
- Test with `--enable-precise-memory-info` flag

### Performance Issues

- Use GPU processing for heavy computation
- Batch parameter updates
- Avoid string operations in audio thread
- Use SharedArrayBuffer for zero-copy transfers

## Further Reading

- [Graph Model Documentation](./graph-model.md) - Core graph concepts
- [Architecture Overview](./architecture-overview.md) - System architecture
- [WASM Bridge Documentation](../bounded-contexts/wasm-bridge/README.md) - WASM integration
- [Audio Processing Guide](./audio-processing-guide.md) - Audio fundamentals

## Related Files

- Schema definitions: `harmony-schemas/src/graph/`
- Node processors: `bounded-contexts/wasm-node-registry/src/processors/`
- Edge processors: `bounded-contexts/wasm-edge-executor/src/edges/`
- UI components: `harmony-graph/nodes/`, `harmony-graph/edges/`
- Tests: `tests/graph-extensions.test.js`