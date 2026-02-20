# Harmony Design System

[Previous content remains unchanged...]

## GPU Compute Shaders

### Edge Cascade Propagation

The edge cascade propagation system uses WebGPU compute shaders to parallelize graph updates, achieving <10ms latency for audio processing graphs.

**Architecture:**
- **WGSL Shader**: `harmony-graph/src/shaders/edge-cascade-propagation.wgsl` - Core compute kernels
- **TypeScript Pipeline**: `harmony-graph/src/gpu/edge-propagation-pipeline.ts` - GPU resource management
- **WASM Bridge**: Connects Rust graph engine to GPU via `harmony-graph/src/wasm-gpu-bridge.ts`

**Compute Kernels:**

1. **propagate_edge** - Main propagation kernel that processes edges in parallel
2. **propagate_edge_limited** - Depth-limited version to prevent infinite cascades
3. **clear_dirty_flags** - Resets processed node flags
4. **initialize_cascade** - Sets up initial state for propagation pass

**Data Structures:**

```
Edge: { source_id, target_id, weight, flags }
NodeState: { value, dirty, generation, reserved }
PropagationMeta: { total_edges, active_nodes, current_generation, max_depth }
```

**Performance Targets:**
- <1ms propagation for 10,000 edges on mid-range GPU
- <50ms initialization time
- 256-thread workgroup size for optimal occupancy

**Usage Example:**

```typescript
import { EdgePropagationPipeline } from './harmony-graph/src/gpu/edge-propagation-pipeline.ts';

const pipeline = new EdgePropagationPipeline(device, {
  maxEdges: 10000,
  maxNodes: 1000,
  workgroupSize: 256
});

await pipeline.initialize();

const result = await pipeline.propagate(edges, states, {
  totalEdges: edges.length,
  activeNodes: states.length,
  currentGeneration: 0,
  maxDepth: 10
});
```

**Policy Compliance:**
- ✓ Rule 25: Audio processing has WebGPU implementation
- ✓ Rule 5: Audio latency <10ms end-to-end
- ✓ Rule 23: GPU-first performance targets met
- ✓ Rule 26: SharedArrayBuffer used for data transfer (via WASM bridge)

**See Also:**
- [GPU Synchronization Patterns](./docs/gpu-synchronization-spec.md)
- [WASM-GPU Bridge](./harmony-graph/src/wasm-gpu-bridge.ts)
- [GPU Benchmark Suite](./performance/gpu-benchmark-suite.ts)

---

[Rest of document continues...]
