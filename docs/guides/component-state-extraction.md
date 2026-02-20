# Component State Extraction Guide

**Vision Alignment:** Reactive Component System, Atomic Design, Graph-First Architecture

## Overview

This guide explains how to extract hardcoded values, state properties, and computed values from UI components into the graph structure. By moving component state into the graph, we enable:

- **Reactive updates** across component boundaries
- **State persistence** and time-travel debugging
- **GPU-accelerated** state propagation
- **Declarative composition** of complex UIs

## Core Principles

### 1. Components Are Views, Not State Owners

Components **render** state from the graph. They do not own or manage state internally.

```javascript
// ❌ BAD: Component owns state
class MyButton extends HTMLElement {
  constructor() {
    super();
    this.isEnabled = true; // Internal state
  }
}

// ✅ GOOD: Component reads from graph
class MyButton extends HTMLElement {
  constructor() {
    super();
    this.nodeId = null; // Reference to graph node
  }
  
  connectedCallback() {
    this.subscribe();
  }
  
  subscribe() {
    // Subscribe to graph node updates
    graphEngine.subscribe(this.nodeId, (state) => {
      this.render(state);
    });
  }
}
```

### 2. Three Types of Extractable Values

| Type | Description | Example |
|------|-------------|---------|
| **Hardcoded Values** | Static configuration | Button labels, colors, sizes |
| **State Properties** | Dynamic runtime state | Enabled/disabled, selected, loading |
| **Computed Values** | Derived from other state | Validation errors, filtered lists |

## Extraction Process

### Step 1: Identify Extractable State

Audit your component for:

1. **Constructor assignments** (`this.x = y`)
2. **Class fields** (`enabled = true`)
3. **Local variables** that affect rendering
4. **Computed getters** (`get isValid()`)

**Example Component Before Extraction:**

```javascript
class AudioTrack extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Hardcoded values
    this.trackColor = '#4A90E2';
    this.height = 64;
    
    // State properties
    this.isMuted = false;
    this.volume = 0.8;
    this.isSolo = false;
    
    // Computed
    this.displayVolume = Math.round(this.volume * 100);
  }
  
  get isAudible() {
    return !this.isMuted && this.volume > 0;
  }
}
```

### Step 2: Create Graph Schema

Define the node type in `harmony-schemas/src/nodes/`:

```rust
// harmony-schemas/src/nodes/audio_track.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioTrackNode {
    pub id: String,
    
    // Configuration (hardcoded → schema)
    pub track_color: String,
    pub height: u32,
    
    // State properties
    pub is_muted: bool,
    pub volume: f32,
    pub is_solo: bool,
    
    // Computed values stored for GPU access
    pub display_volume: u32,
    pub is_audible: bool,
}

impl AudioTrackNode {
    pub fn compute_derived(&mut self) {
        self.display_volume = (self.volume * 100.0).round() as u32;
        self.is_audible = !self.is_muted && self.volume > 0.0;
    }
}
```

**Important:** After modifying schemas, run codegen:

```bash
cd harmony-schemas
cargo build
cd ../harmony-dev
npm run codegen
```

### Step 3: Register Node Type

Add to graph engine type registry in `harmony-graph/src/types/registry.js`:

```javascript
/**
 * Node type definitions for graph engine
 * @see harmony-schemas/src/nodes/ for schema definitions
 */
export const NODE_TYPES = {
  // ... existing types
  AUDIO_TRACK: 'audio_track',
};

export const NODE_SCHEMAS = {
  [NODE_TYPES.AUDIO_TRACK]: {
    config: ['track_color', 'height'],
    state: ['is_muted', 'volume', 'is_solo'],
    computed: ['display_volume', 'is_audible'],
  },
};
```

### Step 4: Create Graph Nodes

Initialize nodes in your composition root or controller:

```javascript
// controllers/track-controller.js

/**
 * Creates an audio track node in the graph
 * @param {string} trackId - Unique track identifier
 * @param {Object} config - Initial configuration
 * @returns {Promise<string>} Node ID
 */
async function createTrackNode(trackId, config = {}) {
  const nodeId = await graphEngine.createNode({
    type: 'audio_track',
    id: trackId,
    data: {
      track_color: config.color || '#4A90E2',
      height: config.height || 64,
      is_muted: false,
      volume: 0.8,
      is_solo: false,
    },
  });
  
  // Compute initial derived values
  await graphEngine.compute(nodeId);
  
  return nodeId;
}
```

### Step 5: Connect Component to Graph

Update component to subscribe to graph node:

```javascript
class AudioTrack extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.nodeId = null;
    this.unsubscribe = null;
  }
  
  /**
   * Set the graph node this component renders
   * @param {string} nodeId - Graph node identifier
   */
  setNode(nodeId) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    this.nodeId = nodeId;
    this.subscribe();
  }
  
  subscribe() {
    this.unsubscribe = graphEngine.subscribe(this.nodeId, (state) => {
      this.render(state);
    });
    
    // Initial render
    const state = graphEngine.getNode(this.nodeId);
    this.render(state);
  }
  
  /**
   * Render component from graph state
   * @param {Object} state - Node state from graph
   */
  render(state) {
    this.shadowRoot.innerHTML = `
      <style>
        .track {
          height: ${state.height}px;
          background: ${state.track_color};
          opacity: ${state.is_audible ? 1 : 0.5};
        }
        .volume {
          width: ${state.display_volume}%;
        }
      </style>
      <div class="track">
        <div class="volume"></div>
        <span>${state.is_muted ? '🔇' : '🔊'} ${state.display_volume}%</span>
      </div>
    `;
  }
  
  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
```

### Step 6: Handle User Interactions

Components publish events; graph updates via EventBus:

```javascript
class AudioTrack extends HTMLElement {
  // ... previous code
  
  connectedCallback() {
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.matches('.mute-button')) {
        // Publish command event
        eventBus.publish({
          type: 'track.toggle-mute',
          payload: { nodeId: this.nodeId },
        });
      }
    });
  }
}
```

Controller handles the event and updates graph:

```javascript
// controllers/track-controller.js

eventBus.subscribe('track.toggle-mute', async ({ nodeId }) => {
  const state = graphEngine.getNode(nodeId);
  
  await graphEngine.updateNode(nodeId, {
    is_muted: !state.is_muted,
  });
  
  // Graph will auto-compute derived values and notify subscribers
});
```

## Extraction Patterns

### Pattern 1: Configuration Values

**When to extract:** Static values that may need to be:
- Themed or customized
- Persisted across sessions
- Shared across component instances

**Example:**

```javascript
// Before
class Button extends HTMLElement {
  constructor() {
    super();
    this.borderRadius = '4px';
    this.padding = '8px 16px';
  }
}

// After: Create design token node
const buttonTokens = await graphEngine.createNode({
  type: 'design_tokens',
  id: 'button-tokens',
  data: {
    border_radius: '4px',
    padding: '8px 16px',
  },
});
```

### Pattern 2: Boolean Flags

**When to extract:** Any boolean that affects rendering or behavior

**Example:**

```javascript
// Before
this.isLoading = false;
this.isDisabled = false;
this.isSelected = false;

// After: In graph schema
pub struct ButtonNode {
  pub is_loading: bool,
  pub is_disabled: bool,
  pub is_selected: bool,
}
```

### Pattern 3: Computed Properties

**When to extract:** Derived values used in multiple places or GPU shaders

**Example:**

```javascript
// Before
get canSubmit() {
  return this.isValid && !this.isSubmitting;
}

// After: Compute in graph
impl FormNode {
  pub fn compute_derived(&mut self) {
    self.can_submit = self.is_valid && !self.is_submitting;
  }
}
```

### Pattern 4: Collections and Lists

**When to extract:** Arrays of items that need filtering, sorting, or aggregation

**Example:**

```javascript
// Before
class TrackList extends HTMLElement {
  constructor() {
    super();
    this.tracks = [];
    this.filter = 'all';
  }
  
  get visibleTracks() {
    return this.tracks.filter(t => 
      this.filter === 'all' || t.type === this.filter
    );
  }
}

// After: Create collection node with computed edges
const listNode = await graphEngine.createNode({
  type: 'track_collection',
  id: 'main-tracks',
  data: {
    filter: 'all',
    visible_count: 0, // Computed
  },
});

// Add edges to individual track nodes
for (const trackId of trackIds) {
  await graphEngine.createEdge(listNode, trackId, {
    type: 'contains',
    visible: true, // Computed based on filter
  });
}
```

## GPU Compute Integration

For performance-critical computed values, implement GPU shaders:

### Step 1: Define Compute Shader

Create in `harmony-graph/src/shaders/`:

```wgsl
// compute_track_visibility.wgsl

struct TrackNode {
    is_muted: u32,
    volume: f32,
    is_solo: u32,
    is_audible: u32, // Output
}

@group(0) @binding(0) var<storage, read_write> tracks: array<TrackNode>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    if (idx >= arrayLength(&tracks)) {
        return;
    }
    
    // Compute derived value
    tracks[idx].is_audible = u32(
        tracks[idx].is_muted == 0u && tracks[idx].volume > 0.0
    );
}
```

### Step 2: Register Compute Pipeline

```javascript
// harmony-graph/src/compute/track-compute.js

/**
 * GPU compute pipeline for track state
 * @see ../shaders/compute_track_visibility.wgsl
 */
export class TrackComputePipeline {
  constructor(device) {
    this.device = device;
    this.pipeline = null;
  }
  
  async init() {
    const shaderModule = this.device.createShaderModule({
      code: await fetch('/shaders/compute_track_visibility.wgsl')
        .then(r => r.text()),
    });
    
    this.pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });
  }
  
  /**
   * Compute derived values for all tracks
   * @param {GPUBuffer} trackBuffer - Buffer containing track nodes
   * @param {number} trackCount - Number of tracks
   */
  compute(trackBuffer, trackCount) {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.createBindGroup(trackBuffer));
    pass.dispatchWorkgroups(Math.ceil(trackCount / 64));
    pass.end();
    
    this.device.queue.submit([encoder.finish()]);
  }
}
```

## Testing Extracted State

### Unit Test: Schema Validation

```javascript
// tests/unit/schemas/audio-track-node.test.js

import { describe, it, expect } from 'vitest';
import { AudioTrackNode } from '../../../harmony-graph/dist/schemas.js';

describe('AudioTrackNode', () => {
  it('computes derived values correctly', () => {
    const node = new AudioTrackNode({
      id: 'track-1',
      is_muted: false,
      volume: 0.75,
    });
    
    node.compute_derived();
    
    expect(node.display_volume).toBe(75);
    expect(node.is_audible).toBe(true);
  });
  
  it('marks muted tracks as inaudible', () => {
    const node = new AudioTrackNode({
      id: 'track-2',
      is_muted: true,
      volume: 0.75,
    });
    
    node.compute_derived();
    
    expect(node.is_audible).toBe(false);
  });
});
```

### Integration Test: Component Reactivity

```javascript
// tests/integration/track-reactivity.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import { graphEngine } from '../../harmony-graph/src/index.js';
import '../components/audio-track.js';

describe('AudioTrack reactivity', () => {
  let nodeId;
  let component;
  
  beforeEach(async () => {
    nodeId = await graphEngine.createNode({
      type: 'audio_track',
      id: 'test-track',
      data: { volume: 0.5, is_muted: false },
    });
    
    component = document.createElement('audio-track');
    component.setNode(nodeId);
    document.body.appendChild(component);
  });
  
  it('updates when graph state changes', async () => {
    await graphEngine.updateNode(nodeId, { volume: 0.8 });
    
    // Wait for next frame
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    const display = component.shadowRoot.querySelector('.volume');
    expect(display.textContent).toContain('80%');
  });
});
```

## Performance Considerations

### Subscription Batching

Batch graph updates to minimize re-renders:

```javascript
// Use transaction for multiple updates
await graphEngine.transaction(async () => {
  await graphEngine.updateNode(nodeId1, { volume: 0.5 });
  await graphEngine.updateNode(nodeId2, { volume: 0.7 });
  await graphEngine.updateNode(nodeId3, { volume: 0.9 });
});
// Components notified once after transaction completes
```

### Selective Subscriptions

Subscribe to specific properties only:

```javascript
// Subscribe to volume changes only
graphEngine.subscribe(nodeId, (state) => {
  this.updateVolumeDisplay(state.volume);
}, { properties: ['volume'] });
```

### GPU Offload Threshold

Use GPU compute when:
- Computing for >100 nodes simultaneously
- Complex mathematical operations (FFT, convolution)
- Cross-node aggregations (sum, max, min)

Use CPU when:
- <100 nodes
- Simple boolean logic
- String manipulation

## Migration Checklist

When extracting state from an existing component:

- [ ] Identify all hardcoded values, state properties, and computed values
- [ ] Create or update schema in `harmony-schemas/src/nodes/`
- [ ] Run codegen: `cd harmony-schemas && cargo build && cd ../harmony-dev && npm run codegen`
- [ ] Register node type in `harmony-graph/src/types/registry.js`
- [ ] Update component to subscribe to graph node
- [ ] Move user interaction handlers to publish events
- [ ] Create controller to handle events and update graph
- [ ] Write unit tests for schema computed values
- [ ] Write integration tests for component reactivity
- [ ] Test in Chrome: verify all states render correctly
- [ ] Update component documentation with graph node reference

## Common Pitfalls

### ❌ Pitfall 1: Mixing Internal and Graph State

```javascript
// BAD: Component has both internal state AND graph subscription
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.internalFlag = false; // ❌ Internal state
    this.nodeId = null;        // ✅ Graph reference
  }
}
```

**Solution:** All state must be in graph. Use local variables only for transient UI state (scroll position, animation frame).

### ❌ Pitfall 2: Forgetting to Unsubscribe

```javascript
// BAD: Memory leak
connectedCallback() {
  graphEngine.subscribe(this.nodeId, this.render.bind(this));
  // ❌ No cleanup
}
```

**Solution:** Always store unsubscribe function and call in `disconnectedCallback`.

### ❌ Pitfall 3: Synchronous Graph Updates in Render

```javascript
// BAD: Updating graph during render
render(state) {
  if (state.invalid) {
    graphEngine.updateNode(this.nodeId, { fixed: true }); // ❌ Causes loop
  }
}
```

**Solution:** Publish events from user interactions, not from render methods.

## Related Documentation

- [Graph Engine Architecture](../architecture/graph-engine.md)
- [EventBus Pattern](../patterns/event-bus.md)
- [GPU Compute Shaders](../gpu/compute-shaders.md)
- [Schema Codegen Pipeline](../development/schema-codegen.md)
- [Atomic Design to Graph Mapping](./atomic-to-graph-mapping.md)

## Examples

Full working examples:

- [Simple Button with Graph State](../../examples/graph-button/)
- [Audio Track List](../../examples/audio-track-list/)
- [Form with Validation](../../examples/graph-form/)

---

**Last Updated:** 2025-01-15  
**Maintainer:** Harmony Design System Team  
**Related Tasks:** task-del-component-state-extraction-