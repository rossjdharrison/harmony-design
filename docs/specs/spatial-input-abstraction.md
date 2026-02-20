# Spatial Input Abstraction Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2025-01-XX  
**Mission Ref:** del-spatial-input-abstraction-spec

## Overview

This specification defines input primitives for spatial computing interfaces including gaze tracking, motion controllers, and hand tracking. The abstraction layer provides a unified interface for XR input devices while maintaining device-specific capabilities.

## Design Principles

1. **Device Agnostic:** Common interface across all spatial input modalities
2. **Progressive Enhancement:** Graceful degradation when capabilities are unavailable
3. **Low Latency:** Input processing within 10ms for responsive interactions
4. **Event-Driven:** Integration with EventBus for decoupled architecture
5. **Type Safe:** Full TypeScript support with semantic types

## Input Primitives

### 1. Gaze Input

Gaze input tracks the user's eye direction and focus point in 3D space.

#### Capabilities

- **Eye Ray:** 3D ray from eye origin through gaze point
- **Focus Point:** 3D coordinates of gaze intersection
- **Dwell Time:** Duration of sustained gaze on target
- **Saccade Detection:** Rapid eye movement events
- **Blink Detection:** Eye closure events

#### Data Structure

```typescript
interface GazeInput {
  timestamp: number;           // High-resolution timestamp (ms)
  eyeRay: {
    origin: Vector3;           // Eye position in world space
    direction: Vector3;        // Normalized gaze direction
  };
  focusPoint: Vector3 | null;  // Intersection point (null if no hit)
  dwellTime: number;           // Milliseconds on current target
  confidence: number;          // 0.0 to 1.0 tracking quality
  blinkState: 'open' | 'closed' | 'transitioning';
}
```

#### Events

- `gaze:focus` - Gaze enters target area
- `gaze:blur` - Gaze leaves target area
- `gaze:dwell` - Gaze held for threshold duration
- `gaze:blink` - Eye closure detected
- `gaze:lost` - Tracking lost

#### Coordinate System

- **Origin:** User's dominant eye or midpoint between eyes
- **Axes:** Right-handed coordinate system aligned with head pose
- **Units:** Meters for position, radians for angles

### 2. Controller Input

Motion controllers provide 6DOF tracking with buttons and analog inputs.

#### Capabilities

- **Pose Tracking:** Position and orientation in 3D space
- **Button States:** Discrete button press/release events
- **Analog Inputs:** Continuous values for triggers and thumbsticks
- **Haptic Feedback:** Vibration output for tactile response
- **Grip Detection:** Hand presence on controller

#### Data Structure

```typescript
interface ControllerInput {
  timestamp: number;
  handedness: 'left' | 'right' | 'unknown';
  pose: {
    position: Vector3;         // World space position
    orientation: Quaternion;   // World space rotation
    linearVelocity: Vector3;   // m/s
    angularVelocity: Vector3;  // rad/s
  };
  buttons: {
    [key: string]: {
      pressed: boolean;        // Current state
      touched: boolean;        // Touch sensor state
      value: number;           // 0.0 to 1.0 for analog buttons
    };
  };
  axes: {
    [key: string]: number;     // -1.0 to 1.0 for thumbsticks
  };
  connected: boolean;
  batteryLevel: number | null; // 0.0 to 1.0, null if unavailable
}
```

#### Standard Button Mapping

- **trigger:** Primary action button (index finger)
- **grip:** Squeeze button (middle fingers)
- **thumbstick:** Analog stick with click
- **a_button:** Face button A (right controller)
- **b_button:** Face button B (right controller)
- **x_button:** Face button X (left controller)
- **y_button:** Face button Y (left controller)
- **menu:** System menu button

#### Events

- `controller:connected` - Controller becomes available
- `controller:disconnected` - Controller removed
- `controller:buttondown` - Button pressed
- `controller:buttonup` - Button released
- `controller:axischanged` - Analog input changed
- `controller:pose` - Pose updated (per frame)

### 3. Hand Tracking

Hand tracking provides skeletal tracking of fingers and palm without physical controllers.

#### Capabilities

- **Skeletal Tracking:** 25 joints per hand
- **Gesture Recognition:** Common hand poses
- **Pinch Detection:** Thumb-finger contact
- **Grip Strength:** Hand closure amount
- **Collision Mesh:** Simplified geometry for physics

#### Data Structure

```typescript
interface HandInput {
  timestamp: number;
  handedness: 'left' | 'right';
  joints: {
    [jointName: string]: {
      position: Vector3;       // World space position
      orientation: Quaternion; // World space rotation
      radius: number;          // Joint sphere radius (m)
    };
  };
  pinch: {
    active: boolean;           // Thumb touching finger
    strength: number;          // 0.0 to 1.0
    position: Vector3;         // Pinch point in world space
  };
  grip: {
    strength: number;          // 0.0 (open) to 1.0 (closed)
  };
  confidence: number;          // 0.0 to 1.0 tracking quality
  visible: boolean;            // Hand in tracking volume
}
```

#### Joint Naming Convention

```
wrist
thumb_metacarpal, thumb_phalanx_proximal, thumb_phalanx_distal, thumb_tip
index_metacarpal, index_phalanx_proximal, index_phalanx_intermediate, index_phalanx_distal, index_tip
middle_metacarpal, middle_phalanx_proximal, middle_phalanx_intermediate, middle_phalanx_distal, middle_tip
ring_metacarpal, ring_phalanx_proximal, ring_phalanx_intermediate, ring_phalanx_distal, ring_tip
pinky_metacarpal, pinky_phalanx_proximal, pinky_phalanx_intermediate, pinky_phalanx_distal, pinky_tip
```

#### Gesture Recognition

Standard gestures detected by the system:

- **open_palm:** All fingers extended
- **closed_fist:** All fingers curled
- **pointing:** Index extended, others curled
- **thumbs_up:** Thumb extended, others curled
- **peace_sign:** Index and middle extended
- **pinch:** Thumb and index touching

#### Events

- `hand:visible` - Hand enters tracking volume
- `hand:lost` - Hand leaves tracking volume
- `hand:pinchstart` - Pinch gesture begins
- `hand:pinchend` - Pinch gesture ends
- `hand:gesture` - Recognized gesture detected
- `hand:pose` - Hand pose updated (per frame)

## Unified Input Interface

### InputSource Abstraction

All input modalities implement a common `InputSource` interface:

```typescript
interface InputSource {
  id: string;                  // Unique identifier
  type: 'gaze' | 'controller' | 'hand';
  handedness?: 'left' | 'right' | 'none';
  connected: boolean;
  capabilities: Set<string>;   // Available features
  
  // Unified spatial properties
  getPose(): Pose | null;
  getRay(): Ray | null;
  
  // Event subscription
  addEventListener(type: string, handler: Function): void;
  removeEventListener(type: string, handler: Function): void;
}
```

### InputManager

Central manager for all spatial input sources:

```typescript
interface InputManager {
  // Source management
  getSources(): InputSource[];
  getSourceById(id: string): InputSource | null;
  getSourcesByType(type: string): InputSource[];
  
  // Capability queries
  hasCapability(capability: string): boolean;
  getPreferredInputSource(): InputSource | null;
  
  // Global events
  addEventListener(type: string, handler: Function): void;
  removeEventListener(type: string, handler: Function): void;
}
```

## Integration with EventBus

All spatial input events flow through the EventBus using the ProcessCommand pattern.

### Event Naming Convention

```
spatial:input:{modality}:{action}
```

Examples:
- `spatial:input:gaze:focus`
- `spatial:input:controller:buttondown`
- `spatial:input:hand:pinchstart`

### Event Payload Structure

```typescript
interface SpatialInputEvent {
  source: {
    id: string;
    type: 'gaze' | 'controller' | 'hand';
    handedness?: 'left' | 'right';
  };
  timestamp: number;
  data: GazeInput | ControllerInput | HandInput;
}
```

### Command Pattern

UI components publish input commands:

```javascript
eventBus.publish('spatial:input:controller:haptic', {
  sourceId: 'controller-right',
  intensity: 0.5,
  duration: 100
});
```

Bounded contexts subscribe to process:

```javascript
eventBus.subscribe('spatial:input:gaze:dwell', (event) => {
  // Handle gaze dwell interaction
});
```

## Performance Requirements

### Latency Targets

- **Gaze Tracking:** < 5ms from eye movement to event
- **Controller Tracking:** < 10ms from physical movement to event
- **Hand Tracking:** < 15ms from hand movement to event
- **Event Dispatch:** < 1ms from input capture to EventBus publish

### Update Frequency

- **Gaze:** 60-120 Hz (per display refresh rate)
- **Controller:** 60-90 Hz (per XR frame rate)
- **Hand:** 30-60 Hz (per tracking system capability)

### Memory Budget

- **Per Input Source:** < 1KB state storage
- **Event Queue:** < 100KB total across all sources
- **History Buffer:** Last 60 frames (1 second at 60fps)

## Coordinate System Conventions

### World Space

- **Origin:** XR session origin point
- **X-Axis:** Right (positive)
- **Y-Axis:** Up (positive)
- **Z-Axis:** Backward (positive, toward user)
- **Units:** Meters

### Local Space

- **Origin:** Input device origin (e.g., controller grip point)
- **Orientation:** Device-specific reference frame
- **Transform:** Convert to world space via pose matrix

## Accessibility Considerations

### Alternative Input Modes

- **Gaze + Dwell:** Select by looking at target for duration
- **Gaze + Voice:** Look and speak command
- **Controller Only:** Full functionality without gaze/hand tracking
- **Hand Only:** Full functionality without controllers

### Customization

- **Dwell Threshold:** Adjustable 300ms - 2000ms
- **Pinch Sensitivity:** Adjustable detection threshold
- **Button Remapping:** User-configurable controller layout
- **Haptic Intensity:** Adjustable feedback strength

## Error Handling

### Tracking Loss

When input tracking is lost:

1. Publish `{modality}:lost` event
2. Set `connected: false` on InputSource
3. Clear active interaction states
4. Retry tracking acquisition

### Calibration Drift

For gaze tracking:

1. Detect drift via validation targets
2. Publish `gaze:calibration_required` event
3. Prompt user for recalibration
4. Resume tracking after calibration

### Device Conflicts

When multiple input sources target same interaction:

1. Use priority order: hand > controller > gaze
2. Allow explicit override via InputManager
3. Publish conflict events for user feedback

## Testing Requirements

### Unit Tests

- Input source state management
- Event payload validation
- Coordinate transformations
- Capability detection

### Integration Tests

- EventBus integration
- Multi-source coordination
- Tracking loss recovery
- Performance benchmarks

### Hardware Tests

- Real device testing required
- Multiple vendor support (Meta, Valve, Microsoft)
- Fallback behavior verification
- Latency measurement

## Implementation Notes

### WebXR API Integration

This specification maps to WebXR Device API:

- **Gaze:** `XRGazeInput` (when available)
- **Controller:** `XRInputSource` with `targetRayMode: 'tracked-pointer'`
- **Hand:** `XRHand` with joint tracking

### Polyfill Strategy

For non-XR environments:

- **Gaze:** Mouse cursor as 2D gaze proxy
- **Controller:** Gamepad API mapping
- **Hand:** Not available (graceful degradation)

### Rust/WASM Boundary

Input processing in WASM for performance:

- Raw input → Rust processing → Events to JS
- Gesture recognition in Rust
- Coordinate transforms in Rust
- EventBus publish from JS wrapper

## Future Extensions

### Planned Capabilities

- **Eye Vergence:** 3D depth from eye convergence
- **Facial Tracking:** Expression capture
- **Body Tracking:** Full-body skeletal tracking
- **Voice Input:** Spatial audio commands

### Research Areas

- Predictive tracking (anticipate movement)
- Multi-modal fusion (combine gaze + hand)
- Adaptive thresholds (learn user behavior)
- Privacy-preserving tracking

## References

- WebXR Device API Specification
- OpenXR Specification
- W3C Pointer Events Level 3
- Harmony Design System: DESIGN_SYSTEM.md § Spatial Computing

## Revision History

- **1.0.0** (2025-01-XX): Initial specification
  - Gaze, controller, and hand tracking primitives
  - EventBus integration pattern
  - Performance requirements
  - Accessibility guidelines

---

**Related Specifications:**
- [XR Zone Affinity Spec](./xr-zone-affinity.md)
- [Transform3D Semantic Type](./transform3d-semantic-type.md)
- [Scene3D Semantic Type](./scene3d-semantic-type.md)