# ZoneAffinity.XR Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2025-01-XX

## Overview

`ZoneAffinity.XR` is a semantic execution routing directive that ensures WebXR-specific operations are dispatched to the appropriate execution context. This specification defines how the Harmony Design System routes XR-related commands, queries, and render operations to WebXR-capable zones.

## Purpose

WebXR operations require specialized execution environments with access to:
- XR device APIs (headsets, controllers, hand tracking)
- Stereoscopic rendering pipelines
- Spatial audio processing
- 6DOF (six degrees of freedom) tracking data
- Session management (immersive-vr, immersive-ar, inline)

The `ZoneAffinity.XR` marker ensures these operations execute in contexts where WebXR APIs are available and initialized.

## Specification

### Semantic Type

```
semantic_type: "ZoneAffinity.XR"
```

### Execution Zones

Operations marked with `ZoneAffinity.XR` MUST be routed to one of the following execution zones:

1. **XR Render Thread** (Primary)
   - WebXR animation frame callbacks
   - Stereoscopic rendering
   - Pose updates
   - View matrix calculations

2. **XR Session Manager** (Secondary)
   - Session initialization/teardown
   - Feature negotiation
   - Reference space management
   - Input source tracking

3. **XR Audio Context** (Specialized)
   - Spatial audio processing with head tracking
   - Listener position/orientation updates
   - HRTF (Head-Related Transfer Function) processing

### Routing Behavior

#### Command Routing

Commands with `ZoneAffinity.XR` follow this dispatch pattern:

```
EventBus.processCommand({
  type: "XR.StartSession",
  zoneAffinity: "ZoneAffinity.XR",
  payload: {
    mode: "immersive-vr",
    requiredFeatures: ["local-floor"]
  }
})
```

**Routing Logic:**

1. EventBus validates `zoneAffinity` field
2. Checks if XR zone is initialized (`navigator.xr` available)
3. If XR zone unavailable, returns error: `XR_ZONE_UNAVAILABLE`
4. If available, routes to XR Session Manager
5. Session Manager processes in XR-capable context

#### Query Routing

Queries with `ZoneAffinity.XR` retrieve state from XR-specific stores:

```
TypeNavigator.query({
  semantic_type: "XRPose",
  zoneAffinity: "ZoneAffinity.XR"
})
```

**Query Resolution:**

1. TypeNavigator checks zone affinity
2. Routes to XR State Store (not general state store)
3. Returns XR-specific data (pose, views, input sources)
4. Data includes XR frame timestamp for synchronization

#### Render Routing

Render operations with `ZoneAffinity.XR` execute in XR animation frame:

```
{
  semantic_type: "RenderCommand",
  zoneAffinity: "ZoneAffinity.XR",
  target: "XRWebGLLayer",
  operations: [...]
}
```

**Render Pipeline:**

1. Queued during standard frame
2. Executed in `XRSession.requestAnimationFrame()` callback
3. Access to XR frame data (poses, views)
4. Renders to XR framebuffer, not canvas

### Fallback Behavior

When `ZoneAffinity.XR` is specified but XR zone is unavailable:

**Option A: Graceful Degradation** (Default)
- Log warning: `XR zone requested but unavailable, falling back to standard rendering`
- Execute in standard render thread
- Use monoscopic rendering
- Disable spatial audio

**Option B: Hard Failure** (Strict Mode)
- Throw error: `XR_ZONE_REQUIRED`
- Halt operation
- Return error event to caller

Configuration in `config/execution-zones.json`:

```json
{
  "zoneAffinity": {
    "XR": {
      "fallbackMode": "graceful" | "strict",
      "fallbackZone": "Render.Main"
    }
  }
}
```

## Integration Points

### EventBus Integration

The EventBus MUST recognize `zoneAffinity` as a routing hint:

**File:** `core/event-bus.js`

```javascript
/**
 * Process command with zone affinity routing
 * @see docs/architecture/zone-affinity-xr-spec.md
 */
processCommand(command) {
  if (command.zoneAffinity === 'ZoneAffinity.XR') {
    return this.routeToXRZone(command);
  }
  // ... standard routing
}
```

### TypeNavigator Integration

TypeNavigator MUST respect zone affinity for queries:

**File:** `core/type-navigator.js`

```javascript
/**
 * Query with zone affinity
 * @see docs/architecture/zone-affinity-xr-spec.md
 */
query(criteria) {
  const zone = criteria.zoneAffinity || 'ZoneAffinity.Default';
  const store = this.getStoreForZone(zone);
  return store.query(criteria);
}
```

### Renderer Backend Integration

Renderer backends MUST check zone affinity before execution:

**File:** `types/renderer-backend.d.ts`

```typescript
interface IRendererBackend {
  /**
   * Execute render command with zone affinity check
   * @see docs/architecture/zone-affinity-xr-spec.md
   */
  execute(command: RenderCommand): Promise<void>;
  
  /**
   * Check if this backend supports the requested zone
   */
  supportsZone(affinity: string): boolean;
}
```

## XR-Specific Operations

### Session Management

```javascript
// Start XR session - MUST use ZoneAffinity.XR
EventBus.processCommand({
  type: "XR.StartSession",
  zoneAffinity: "ZoneAffinity.XR",
  payload: {
    mode: "immersive-vr",
    requiredFeatures: ["local-floor", "hand-tracking"]
  }
});
```

### Pose Tracking

```javascript
// Query current XR pose - MUST use ZoneAffinity.XR
TypeNavigator.query({
  semantic_type: "XRPose",
  zoneAffinity: "ZoneAffinity.XR",
  referenceSpace: "local-floor"
});
```

### Spatial Rendering

```javascript
// Render to XR views - MUST use ZoneAffinity.XR
{
  semantic_type: "RenderCommand",
  zoneAffinity: "ZoneAffinity.XR",
  target: "XRWebGLLayer",
  stereo: true,
  views: ["left", "right"]
}
```

### Input Handling

```javascript
// Process XR input - MUST use ZoneAffinity.XR
EventBus.processCommand({
  type: "XR.ProcessInput",
  zoneAffinity: "ZoneAffinity.XR",
  payload: {
    inputSource: "controller-left",
    action: "trigger-press"
  }
});
```

## Performance Considerations

### Latency Targets

XR operations have stricter latency requirements than standard rendering:

- **Motion-to-Photon Latency:** < 20ms (target: 11ms)
- **Render Budget per Eye:** < 8ms (16ms total for stereo @ 60fps)
- **Pose Prediction Accuracy:** ±1mm positional, ±0.5° rotational

### Zone Isolation

`ZoneAffinity.XR` ensures XR operations are isolated from:

- Heavy DOM operations (layout thrashing)
- Blocking network requests
- Synchronous file I/O
- Garbage collection pauses

XR render thread MUST be dedicated and high-priority.

### Memory Budget

XR zone has separate memory budget:

- **Standard Zone:** 50MB WASM heap
- **XR Zone:** Additional 30MB for:
  - Stereoscopic framebuffers
  - Pose history buffers
  - Input tracking data
  - Spatial audio HRTF tables

Total XR budget: 80MB

## Error Handling

### Zone Unavailable

```javascript
{
  error: "XR_ZONE_UNAVAILABLE",
  message: "WebXR not supported or session not active",
  fallback: "graceful" | "strict",
  timestamp: performance.now()
}
```

### Zone Timeout

If XR zone doesn't respond within 100ms:

```javascript
{
  error: "XR_ZONE_TIMEOUT",
  message: "XR zone failed to respond within 100ms",
  command: originalCommand,
  timestamp: performance.now()
}
```

### Zone Busy

If XR zone is overloaded:

```javascript
{
  error: "XR_ZONE_BUSY",
  message: "XR zone queue full, command dropped",
  queueDepth: 42,
  timestamp: performance.now()
}
```

## Testing Requirements

### Unit Tests

1. **Zone Detection**
   - Verify XR zone availability check
   - Test fallback when WebXR unavailable
   - Validate error messages

2. **Command Routing**
   - Commands with `ZoneAffinity.XR` route to XR zone
   - Commands without affinity route to default zone
   - Invalid affinity values throw errors

3. **Query Routing**
   - Queries route to correct state store
   - XR-specific data not leaked to standard store
   - Cross-zone queries fail gracefully

### Integration Tests

1. **Session Lifecycle**
   - Start session → XR zone initializes
   - End session → XR zone cleanup
   - Session error → XR zone recovery

2. **Render Pipeline**
   - XR render commands execute in XR frame
   - Standard render commands don't block XR
   - Frame timing meets latency targets

3. **Fallback Behavior**
   - Graceful mode degrades to monoscopic
   - Strict mode throws errors
   - Configuration changes apply correctly

### Performance Tests

1. **Latency Measurement**
   - Motion-to-photon < 20ms
   - Command dispatch < 1ms
   - Query resolution < 0.5ms

2. **Throughput**
   - 60 XR frames/second sustained
   - 120 commands/second processed
   - No frame drops under load

## Examples

### Basic XR Session

```javascript
// 1. Check XR support
if (!navigator.xr) {
  console.error('WebXR not supported');
  return;
}

// 2. Request session with zone affinity
const sessionResult = await EventBus.processCommand({
  type: "XR.StartSession",
  zoneAffinity: "ZoneAffinity.XR",
  payload: {
    mode: "immersive-vr",
    requiredFeatures: ["local-floor"]
  }
});

// 3. Render loop automatically uses XR zone
function onXRFrame(time, frame) {
  // All operations here implicitly have ZoneAffinity.XR
  const pose = frame.getViewerPose(referenceSpace);
  
  EventBus.processCommand({
    type: "Render.Scene",
    zoneAffinity: "ZoneAffinity.XR",
    payload: { pose, views: frame.views }
  });
}
```

### Spatial Audio with XR

```javascript
// Audio processing inherits XR zone affinity
EventBus.processCommand({
  type: "Audio.UpdateListener",
  zoneAffinity: "ZoneAffinity.XR",
  payload: {
    position: xrPose.transform.position,
    orientation: xrPose.transform.orientation
  }
});
```

### Controller Input

```javascript
// Input events processed in XR zone
EventBus.subscribe("XR.InputSourcesChange", (event) => {
  // Handler executes in XR zone context
  event.inputSources.forEach(source => {
    TypeNavigator.query({
      semantic_type: "XRInputSource",
      zoneAffinity: "ZoneAffinity.XR",
      handedness: source.handedness
    });
  });
});
```

## Migration Guide

### From Standard Rendering to XR

**Before:**
```javascript
EventBus.processCommand({
  type: "Render.Scene",
  payload: { camera, scene }
});
```

**After:**
```javascript
EventBus.processCommand({
  type: "Render.Scene",
  zoneAffinity: "ZoneAffinity.XR",  // Add this
  payload: { camera, scene, stereo: true }
});
```

### From Monoscopic to Stereoscopic

**Before:**
```javascript
renderer.render(scene, camera);
```

**After:**
```javascript
// XR zone handles stereoscopic rendering automatically
EventBus.processCommand({
  type: "Render.Stereo",
  zoneAffinity: "ZoneAffinity.XR",
  payload: {
    scene,
    leftView: frame.views[0],
    rightView: frame.views[1]
  }
});
```

## Future Enhancements

### Planned Features

1. **Zone Affinity Composition**
   - Combine multiple affinities: `["ZoneAffinity.XR", "ZoneAffinity.GPU"]`
   - Priority ordering for conflict resolution

2. **Dynamic Zone Migration**
   - Move operations between zones at runtime
   - Load balancing across XR sessions

3. **Zone Health Monitoring**
   - Track XR zone performance metrics
   - Auto-throttle on thermal limits
   - Alert on frame drops

4. **AR-Specific Affinity**
   - `ZoneAffinity.XR.AR` for augmented reality
   - Camera feed processing
   - Plane detection routing

## Related Specifications

- **[IRendererBackend Interface](../types/renderer-backend.d.ts)** - Renderer backend contract
- **[Scene3D Semantic Type](./scene3d-semantic-type-spec.md)** - 3D scene structure
- **[Transform3D Semantic Type](./transform3d-semantic-type-spec.md)** - 3D transformations
- **[Field-of-View Token Schema](../harmony-schemas/tokens/field-of-view.schema.json)** - Camera FOV
- **[3D Depth Token Schema](../harmony-schemas/tokens/depth-3d.schema.json)** - Z-depth tokens

## References

- [WebXR Device API Specification](https://www.w3.org/TR/webxr/)
- [WebXR Layers API](https://www.w3.org/TR/webxrlayers-1/)
- [WebXR Gamepads Module](https://www.w3.org/TR/webxr-gamepads-module-1/)
- [WebXR Hand Input Module](https://www.w3.org/TR/webxr-hand-input-1/)

## Changelog

### Version 1.0.0 (2025-01-XX)
- Initial specification
- Define zone affinity routing
- Specify fallback behavior
- Document integration points
- Add performance targets