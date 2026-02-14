# Waveform Primitive Component

Audio visualization component for displaying waveforms in oscilloscope or spectrum analyzer modes.

## Usage

```html
<harmony-waveform 
  mode="oscilloscope"
  color="#00ff00"
  width="400"
  height="100">
</harmony-waveform>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | `"oscilloscope"` | Visualization mode: `"oscilloscope"` or `"spectrum"` |
| `color` | string | `"#00ff00"` | Waveform color (CSS color) |
| `background` | string | `"#000000"` | Background color |
| `width` | number | `400` | Canvas width in pixels |
| `height` | number | `100` | Canvas height in pixels |
| `line-width` | number | `2` | Line thickness for drawing |
| `fill` | boolean | `false` | Fill area under waveform |

## Methods

### `updateData(audioData: Float32Array)`
Update waveform with new audio sample data. Data should be normalized between -1 and 1.

### `clear()`
Clear the waveform display to empty state.

### `startLiveMode()`
Start continuous rendering loop for live audio visualization.

### `stopLiveMode()`
Stop continuous rendering to save resources.

## Events

### `waveform-ready`
Emitted when component is initialized and ready to display data.

```javascript
waveform.addEventListener('waveform-ready', (e) => {
  console.log('Waveform ready', e.detail);
});
```

### `waveform-overflow`
Emitted when audio data exceeds normalized bounds (>1.0 or <-1.0).

```javascript
waveform.addEventListener('waveform-overflow', (e) => {
  console.warn('Audio clipping detected');
});
```

## Modes

### Oscilloscope Mode
Displays time-domain waveform as continuous line. Best for viewing audio signal shape over time.

### Spectrum Mode
Displays frequency-domain data as vertical bars. Best for visualizing frequency content.

## Performance

- Target: 60fps rendering (16ms budget per frame)
- Canvas-based rendering with hardware acceleration
- Performance warnings logged when frame time exceeds budget
- Supports multiple simultaneous instances

## Testing

Open `waveform.test.html` in Chrome to verify:
- ✅ Oscilloscope mode with sine wave
- ✅ Spectrum mode with random data
- ✅ Complex waveform rendering
- ✅ Overflow detection and indicator
- ✅ Multiple sizes and configurations
- ✅ Start/stop/clear controls
- ✅ Fill mode rendering
- ✅ Performance at 60fps

## Integration Example

```javascript
import { HarmonyWaveform } from './waveform.component.js';

const waveform = document.querySelector('harmony-waveform');

// Connect to Web Audio API
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

const dataArray = new Float32Array(analyser.fftSize);

function updateVisualization() {
  analyser.getFloatTimeDomainData(dataArray);
  waveform.updateData(dataArray);
  requestAnimationFrame(updateVisualization);
}

updateVisualization();
```

## Related Components

- [Meter](../meter/README.md) - Audio level metering
- [Fader](../fader/README.md) - Linear level control
- [Knob](../knob/README.md) - Rotary control

## Documentation

See [DESIGN_SYSTEM.md § Primitives > Waveform](../../DESIGN_SYSTEM.md) for architectural details.