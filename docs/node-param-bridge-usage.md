# NodeParamBridge Usage Guide

## Overview

The NodeParamBridge provides a connection between UI controls and Web Audio API AudioParam objects. It handles parameter updates, automation, and value mapping for audio nodes.

**Current Status**: Parameter management functionality exists within `AudioEngineBoundedContext`. A dedicated bridge abstraction is recommended for future extraction.

## Basic Concepts

### What is a Parameter Bridge?

A parameter bridge connects:
- **UI Layer**: Sliders, knobs, input fields
- **Audio Layer**: Web Audio API AudioParam objects

It provides:
- Type-safe parameter updates
- Value range mapping (UI range → audio range)
- Automation scheduling
- Change event propagation

## How to Use (Current Implementation)

### 1. Setting Node Parameters

Use the AudioEngine's `setNodeParameter` method:

```javascript
// Get AudioEngine instance
const audioEngine = AudioEngineBoundedContext.getInstance();

// Set a parameter value
await audioEngine.setNodeParameter(
  'oscillator-1',  // nodeId
  'frequency',     // paramName
  440             // value in Hz
);
```

### 2. Via EventBus (Recommended Pattern)

UI components should publish events, not call AudioEngine directly:

```javascript
// In your UI component
class FrequencyKnob extends HTMLElement {
  handleValueChange(newValue) {
    // Publish event instead of direct call
    window.eventBus.publish('audio:setParameter', {
      nodeId: this.nodeId,
      paramName: 'frequency',
      value: newValue
    });
  }
}
```

Then subscribe in AudioEngine:

```javascript
// In audio-engine.ts initialization
this.eventBus.subscribe('audio:setParameter', async (event) => {
  const { nodeId, paramName, value } = event.payload;
  await this.setNodeParameter(nodeId, paramName, value);
});
```

### 3. Parameter Types

Web Audio API supports several parameter types:

```javascript
// Frequency (Hz)
audioEngine.setNodeParameter('osc-1', 'frequency', 440);

// Gain (0.0 to 1.0)
audioEngine.setNodeParameter('gain-1', 'gain', 0.5);

// Detune (cents, -1200 to 1200)
audioEngine.setNodeParameter('osc-1', 'detune', 100);

// Q Factor (0.0001 to 1000)
audioEngine.setNodeParameter('filter-1', 'Q', 1.0);
```

## Value Mapping

UI controls often use different ranges than audio parameters:

```javascript
/**
 * Map UI slider value (0-100) to gain (0.0-1.0)
 */
function mapSliderToGain(sliderValue) {
  return sliderValue / 100;
}

/**
 * Map UI knob rotation (0-360°) to frequency (20-20000 Hz)
 * Uses logarithmic scaling for natural feel
 */
function mapRotationToFrequency(degrees) {
  const normalized = degrees / 360; // 0.0 to 1.0
  const minFreq = Math.log(20);
  const maxFreq = Math.log(20000);
  return Math.exp(minFreq + normalized * (maxFreq - minFreq));
}

// Usage
knob.addEventListener('rotate', (e) => {
  const frequency = mapRotationToFrequency(e.detail.degrees);
  eventBus.publish('audio:setParameter', {
    nodeId: 'osc-1',
    paramName: 'frequency',
    value: frequency
  });
});
```

## Automation and Scheduling

Web Audio API supports scheduled parameter changes:

```javascript
// Current implementation (direct AudioParam access)
const node = audioEngine.nodes.get('osc-1');
const param = node.frequency;

// Linear ramp over 2 seconds
param.linearRampToValueAtTime(880, audioContext.currentTime + 2);

// Exponential ramp (better for frequency/gain)
param.exponentialRampToValueAtTime(880, audioContext.currentTime + 2);

// Set at specific time
param.setValueAtTime(440, audioContext.currentTime + 1);
```

**Note**: These require direct node access. A proper bridge would expose automation methods.

## Recommended Bridge Interface

For future implementation, the bridge should provide:

```typescript
interface NodeParamBridge {
  /**
   * Set parameter immediately
   */
  setValue(nodeId: string, paramName: string, value: number): void;
  
  /**
   * Schedule linear ramp
   */
  linearRampTo(
    nodeId: string,
    paramName: string,
    targetValue: number,
    duration: number
  ): void;
  
  /**
   * Schedule exponential ramp
   */
  exponentialRampTo(
    nodeId: string,
    paramName: string,
    targetValue: number,
    duration: number
  ): void;
  
  /**
   * Cancel scheduled changes
   */
  cancelScheduled(nodeId: string, paramName: string): void;
  
  /**
   * Get current parameter value
   */
  getValue(nodeId: string, paramName: string): number;
  
  /**
   * Subscribe to parameter changes
   */
  onValueChange(
    nodeId: string,
    paramName: string,
    callback: (value: number) => void
  ): () => void;
}
```

## Performance Considerations

### Audio Thread Safety

- ✅ `setValueAtTime()` is audio-thread safe
- ✅ Scheduling methods are audio-thread safe
- ❌ Direct property assignment (`param.value = 440`) is NOT safe
- ❌ Synchronous getters can cause glitches

Always use Web Audio API scheduling methods:

```javascript
// ❌ BAD: Direct assignment
node.frequency.value = 440;

// ✅ GOOD: Scheduled update
node.frequency.setValueAtTime(440, audioContext.currentTime);
```

### Update Rate Limiting

Avoid updating parameters faster than necessary:

```javascript
// Throttle UI updates to 60 fps max
let lastUpdate = 0;
const throttleMs = 16; // ~60 fps

knob.addEventListener('input', (e) => {
  const now = performance.now();
  if (now - lastUpdate < throttleMs) return;
  
  lastUpdate = now;
  updateParameter(e.detail.value);
});
```

## Error Handling

```javascript
try {
  await audioEngine.setNodeParameter('osc-1', 'frequency', 440);
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Node does not exist:', error);
    // Show user feedback
  } else if (error.message.includes('AudioParam')) {
    console.error('Invalid parameter name:', error);
    // Show validation error
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Common Patterns

### Linking Multiple Parameters

```javascript
// Link cutoff and resonance for filter sweep
function sweepFilter(cutoffHz, resonanceQ) {
  eventBus.publish('audio:setParameter', {
    nodeId: 'filter-1',
    paramName: 'frequency',
    value: cutoffHz
  });
  
  eventBus.publish('audio:setParameter', {
    nodeId: 'filter-1',
    paramName: 'Q',
    value: resonanceQ
  });
}
```

### Parameter Presets

```javascript
const presets = {
  bright: { frequency: 5000, Q: 2.0 },
  warm: { frequency: 800, Q: 0.7 },
  dark: { frequency: 200, Q: 1.5 }
};

function loadPreset(presetName) {
  const preset = presets[presetName];
  Object.entries(preset).forEach(([param, value]) => {
    eventBus.publish('audio:setParameter', {
      nodeId: 'filter-1',
      paramName: param,
      value: value
    });
  });
}
```

### Modulation (LFO)

```javascript
// Simple LFO implementation
class ParameterLFO {
  constructor(nodeId, paramName, rate, depth, center) {
    this.nodeId = nodeId;
    this.paramName = paramName;
    this.rate = rate; // Hz
    this.depth = depth;
    this.center = center;
    this.phase = 0;
    this.running = false;
  }
  
  start() {
    this.running = true;
    this.tick();
  }
  
  stop() {
    this.running = false;
  }
  
  tick() {
    if (!this.running) return;
    
    const value = this.center + Math.sin(this.phase) * this.depth;
    
    eventBus.publish('audio:setParameter', {
      nodeId: this.nodeId,
      paramName: this.paramName,
      value: value
    });
    
    this.phase += (2 * Math.PI * this.rate) / 60; // 60 fps
    if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
    
    requestAnimationFrame(() => this.tick());
  }
}

// Usage
const lfo = new ParameterLFO('osc-1', 'frequency', 2, 50, 440);
lfo.start();
```

## Testing

### Unit Test Example

```javascript
describe('NodeParamBridge', () => {
  it('should update parameter value', async () => {
    const audioEngine = AudioEngineBoundedContext.getInstance();
    
    await audioEngine.setNodeParameter('test-osc', 'frequency', 440);
    
    const node = audioEngine.nodes.get('test-osc');
    expect(node.frequency.value).toBe(440);
  });
  
  it('should handle invalid node ID', async () => {
    const audioEngine = AudioEngineBoundedContext.getInstance();
    
    await expect(
      audioEngine.setNodeParameter('invalid-id', 'frequency', 440)
    ).rejects.toThrow('not found');
  });
});
```

## Migration Path

When a dedicated NodeParamBridge is extracted:

1. **Phase 1**: Create bridge class wrapping existing functionality
2. **Phase 2**: Add automation/scheduling methods
3. **Phase 3**: Add value mapping utilities
4. **Phase 4**: Add change notification system
5. **Phase 5**: Deprecate direct AudioEngine parameter access

## Related Documentation

- [Audio Engine Architecture](../DESIGN_SYSTEM.md#audio-engine)
- [EventBus Pattern](../DESIGN_SYSTEM.md#eventbus)
- [Web Audio API Parameters](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam)

## Current Implementation

See: `bounded-contexts/audio-engine/audio-engine.ts` → `setNodeParameter()` method

## Questions?

If you need parameter functionality not covered here:
1. Check if Web Audio API supports it natively
2. Consider if it belongs in the bridge or audio engine
3. Create feature request with use case