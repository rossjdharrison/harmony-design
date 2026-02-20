# GPU Synchronization Pattern Specification

**Version:** 1.0.0  
**Last Updated:** 2025-01-15  
**Status:** Active  
**Vision Alignment:** GPU-First Audio

## Overview

This specification defines synchronization patterns for GPU operations in the Harmony Design System. GPU operations must coordinate with audio processing to meet the 10ms end-to-end latency requirement while avoiding race conditions and ensuring data consistency.

## Core Requirements

### Performance Targets

- **Audio Latency:** Maximum 10ms end-to-end (Policy #5)
- **Frame Budget:** Maximum 16ms per frame for 60fps (Policy #1)
- **Memory Budget:** Maximum 50MB WASM heap (Policy #2)
- **No Async in Audio Thread:** Zero async operations in audio render thread (Policy #30)

### Data Transfer Requirements

- **Primary Channel:** SharedArrayBuffer for AudioWorklet ↔ GPU (Policy #26)
- **Dual Implementation:** All audio functions must have WebGPU + WASM versions (Policy #25)
- **Buffer Ownership:** Clear ownership model to prevent race conditions

## Synchronization Patterns

### Pattern 1: Double Buffering

**Use Case:** Real-time audio processing with GPU effects

**Implementation:**

```
┌─────────────┐         ┌─────────────┐
│  Buffer A   │ ◄─────► │  Audio      │
│  (Active)   │         │  Worklet    │
└─────────────┘         └─────────────┘
       │
       │ Swap on fence
       ▼
┌─────────────┐         ┌─────────────┐
│  Buffer B   │ ◄─────► │  GPU        │
│  (Writing)  │         │  Compute    │
└─────────────┘         └─────────────┘
```

**Rust Implementation Path:** `harmony-graph/src/gpu/double_buffer.rs`  
**WASM Bridge Path:** `harmony-web/workers/wasm-gpu-bridge.js`  
**Schema Path:** `harmony-schemas/gpu-sync-config.schema.json`

**Key Properties:**
- Audio worklet reads from active buffer (lock-free)
- GPU writes to inactive buffer
- Swap happens on GPU fence completion
- Zero-copy when using SharedArrayBuffer

### Pattern 2: Ring Buffer with Atomic Indices

**Use Case:** Streaming audio data from GPU to worklet

**Implementation:**

```
┌──────────────────────────────────────┐
│         Ring Buffer (SAB)            │
│  ┌───┬───┬───┬───┬───┬───┬───┬───┐  │
│  │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │  │
│  └───┴───┴───┴───┴───┴───┴───┴───┘  │
│    ▲                   ▲             │
│    │                   │             │
│  Read (Atomic)    Write (Atomic)     │
└──────────────────────────────────────┘
```

**Rust Implementation Path:** `harmony-graph/src/gpu/ring_buffer.rs`  
**TypeScript Interface Path:** `types/gpu-sync.d.ts`

**Key Properties:**
- Atomic read/write indices (Atomics.load/store)
- Lock-free single producer, single consumer
- Overflow detection and handling
- Configurable buffer size (power of 2)

### Pattern 3: GPU Fence Synchronization

**Use Case:** Ensuring GPU work completes before audio reads

**Implementation:**

```
GPU Timeline:
  Submit ──► Execute ──► Fence ──► Signal
                            │
Audio Timeline:            │
  Process ──► Wait ◄────────┘
```

**WebGPU API:**
```javascript
// Submit GPU work
device.queue.submit([commandBuffer]);

// Create fence
const fence = device.queue.onSubmittedWorkDone();

// In audio worklet (non-blocking check)
if (fence.isSignaled()) {
  // Safe to read GPU results
}
```

**Rust Implementation Path:** `harmony-graph/src/gpu/fence.rs`  
**WASM Bindings Path:** `harmony-web/workers/gpu-fence-bindings.js`

**Key Properties:**
- Non-blocking fence checks in audio thread
- Fallback to previous buffer if fence not ready
- Automatic fence cleanup after signal

### Pattern 4: Command Queue with Priority

**Use Case:** Scheduling GPU work without blocking audio

**Implementation:**

```
┌─────────────────────────────────────┐
│        Command Queue (SAB)          │
│  ┌──────────┬──────────┬──────────┐ │
│  │ High Pri │  Med Pri │  Low Pri │ │
│  │  (Audio) │  (FFT)   │  (Viz)   │ │
│  └──────────┴──────────┴──────────┘ │
└─────────────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │ GPU Executor│
    └─────────────┘
```

**Rust Implementation Path:** `harmony-graph/src/gpu/command_queue.rs`  
**Schema Path:** `harmony-schemas/gpu-command.schema.json`

**Key Properties:**
- Three priority levels: High (audio), Medium (analysis), Low (visualization)
- Audio commands always execute first
- Queue size limits per priority
- Automatic command batching

## Memory Models

### Ownership Model

```
┌──────────────────────────────────────────────┐
│              Memory Ownership                │
├──────────────────────────────────────────────┤
│  Audio Worklet: READ-ONLY (active buffer)   │
│  GPU Compute:   WRITE-ONLY (inactive buffer) │
│  Main Thread:   CONTROL-ONLY (swap signal)   │
└──────────────────────────────────────────────┘
```

**Rules:**
1. Only one writer per buffer region at a time
2. Readers must check fence before access
3. Main thread never directly touches audio data
4. All ownership transfers via atomic operations

### Buffer Layout

```
SharedArrayBuffer Layout:
┌────────────────────────────────────────────┐
│  Control Block (64 bytes)                  │
│  - Read Index (Atomic)                     │
│  - Write Index (Atomic)                    │
│  - Fence Status (Atomic)                   │
│  - Buffer Size                             │
│  - Sample Rate                             │
├────────────────────────────────────────────┤
│  Audio Buffer A (aligned to 128 bytes)     │
├────────────────────────────────────────────┤
│  Audio Buffer B (aligned to 128 bytes)     │
└────────────────────────────────────────────┘
```

**Implementation:** `harmony-graph/src/gpu/buffer_layout.rs`

## Error Handling

### Fence Timeout

```javascript
const FENCE_TIMEOUT_MS = 5; // 5ms max wait

if (!fence.isSignaled() && elapsed > FENCE_TIMEOUT_MS) {
  // Use previous buffer (graceful degradation)
  console.warn('GPU fence timeout, using stale buffer');
  metrics.recordFenceTimeout();
}
```

### Buffer Overflow

```javascript
const available = (writeIndex - readIndex + bufferSize) % bufferSize;

if (available < requiredSamples) {
  // Drop oldest samples or expand buffer
  console.error('Ring buffer overflow');
  metrics.recordOverflow();
}
```

### GPU Device Lost

```javascript
device.lost.then((info) => {
  console.error('GPU device lost:', info.message);
  // Fallback to WASM implementation
  audioProcessor.switchToWASM();
});
```

## Performance Monitoring

### Metrics to Track

```typescript
interface GPUSyncMetrics {
  fenceWaitTimeMs: number;      // Time waiting for fence
  bufferSwapCount: number;      // Number of buffer swaps
  overflowCount: number;        // Ring buffer overflows
  timeoutCount: number;         // Fence timeouts
  gpuUtilization: number;       // GPU usage percentage
  audioLatencyMs: number;       // End-to-end latency
}
```

**Implementation:** `performance/gpu-sync-metrics.js`  
**Schema:** `harmony-schemas/gpu-metrics.schema.json`

### Latency Budget Breakdown

```
Total Budget: 10ms
├─ Audio Callback: 1ms
├─ GPU Compute: 5ms
├─ Fence Wait: 1ms
├─ Buffer Copy: 2ms
└─ Overhead: 1ms
```

## Integration Points

### With WASM Bridge

**File:** `harmony-web/workers/wasm-gpu-bridge.js`

The WASM-GPU bridge must implement these synchronization patterns:

```javascript
class WASMGPUBridge {
  async allocateDoubleBuffer(sizeBytes) { /* ... */ }
  async allocateRingBuffer(sizeBytes) { /* ... */ }
  createFence() { /* ... */ }
  submitCommand(priority, command) { /* ... */ }
}
```

### With Audio Worklet

**File:** `harmony-web/workers/audio-worklet-processor.js`

Audio worklet must use non-blocking synchronization:

```javascript
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    // Non-blocking fence check
    if (this.gpuFence.isSignaled()) {
      this.swapBuffers();
    }
    
    // Always use active buffer (never blocks)
    this.processAudio(this.activeBuffer, outputs);
    
    return true;
  }
}
```

### With Bounded Contexts

**Rust BC:** `harmony-graph/src/audio_processing_bc.rs`

Bounded contexts coordinate GPU work via event bus:

```rust
pub struct AudioProcessingBC {
    gpu_executor: GPUExecutor,
    command_queue: CommandQueue,
}

impl AudioProcessingBC {
    pub fn handle_process_audio(&mut self, event: ProcessAudioEvent) {
        // Submit high-priority GPU command
        self.command_queue.submit(Priority::High, command);
    }
}
```

## Schema Definitions

### GPU Sync Configuration

**File:** `harmony-schemas/gpu-sync-config.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GPUSyncConfig",
  "type": "object",
  "properties": {
    "bufferMode": {
      "type": "string",
      "enum": ["double", "ring", "triple"]
    },
    "bufferSizeBytes": {
      "type": "integer",
      "minimum": 4096,
      "maximum": 1048576
    },
    "fenceTimeoutMs": {
      "type": "number",
      "minimum": 1,
      "maximum": 10
    },
    "priorityLevels": {
      "type": "integer",
      "minimum": 2,
      "maximum": 5
    }
  },
  "required": ["bufferMode", "bufferSizeBytes"]
}
```

### GPU Command

**File:** `harmony-schemas/gpu-command.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GPUCommand",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "priority": {
      "type": "string",
      "enum": ["high", "medium", "low"]
    },
    "operation": {
      "type": "string",
      "enum": ["process", "analyze", "visualize"]
    },
    "inputBuffer": { "type": "string" },
    "outputBuffer": { "type": "string" },
    "parameters": { "type": "object" }
  },
  "required": ["id", "priority", "operation"]
}
```

## Testing Requirements

### Unit Tests

**File:** `tests/gpu-sync.test.js`

- Test double buffer swap logic
- Test ring buffer overflow handling
- Test fence timeout behavior
- Test command queue priority ordering

### Performance Tests

**File:** `performance/gpu-sync-benchmark.js`

- Measure fence wait times under load
- Measure buffer swap overhead
- Verify 10ms latency budget
- Test with 128/256/512 sample buffers

### Integration Tests

**File:** `tests/integration/gpu-audio-sync.test.js`

- Test GPU → Audio worklet pipeline
- Test device lost recovery
- Test WASM fallback
- Test concurrent GPU operations

## Migration Guide

### From Async to Sync Patterns

**Before (violates Policy #30):**
```javascript
// WRONG: Async in audio thread
async process(inputs, outputs) {
  const result = await gpuCompute();
  outputs[0].set(result);
}
```

**After (compliant):**
```javascript
// CORRECT: Non-blocking sync
process(inputs, outputs) {
  if (this.fence.isSignaled()) {
    this.swapBuffers();
  }
  outputs[0].set(this.activeBuffer);
}
```

### From Callbacks to Atomics

**Before:**
```javascript
// WRONG: Callback-based coordination
gpuCompute((result) => {
  audioBuffer.set(result);
});
```

**After:**
```javascript
// CORRECT: Atomic-based coordination
Atomics.store(controlBlock, WRITE_INDEX, newIndex);
Atomics.notify(controlBlock, WRITE_INDEX);
```

## References

- **WASM Bridge:** `harmony-web/workers/wasm-gpu-bridge.js`
- **GPU Benchmarks:** `performance/gpu-benchmark-suite.js`
- **Audio Worklet:** `harmony-web/workers/audio-worklet-processor.js`
- **Event Bus:** `core/event-bus.js`
- **Rust GPU Module:** `harmony-graph/src/gpu/`
- **Design System:** `DESIGN_SYSTEM.md#gpu-synchronization`

## Version History

- **1.0.0** (2025-01-15): Initial specification
  - Double buffering pattern
  - Ring buffer pattern
  - Fence synchronization
  - Command queue with priority
  - Memory ownership model
  - Performance monitoring