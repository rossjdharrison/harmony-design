# Meter Primitive

Audio level visualization component with peak detection and decay.

## Usage

```html
<harmony-meter 
  orientation="vertical"
  min-db="-60"
  max-db="0"
  value="-12"
  peak-hold="1500">
</harmony-meter>
```

## Attributes

- `orientation`: `"vertical"` | `"horizontal"` (default: `"vertical"`)
- `min-db`: Minimum level in dB (default: `-60`)
- `max-db`: Maximum level in dB (default: `0`)
- `value`: Current level in dB
- `peak-hold`: Peak hold time in milliseconds (default: `1500`)
- `disabled`: Disables the meter

## Methods

- `setValue(valueDb)`: Set meter value programmatically
- `resetPeak()`: Reset peak indicator
- `getValue()`: Get current value
- `getPeak()`: Get peak value

## Events

- `meter-overflow`: Dispatched when level exceeds threshold (3dB below max)

## Color Zones

- Green: 0-75% of range (safe levels)
- Yellow: 75-90% of range (approaching limit)
- Red: 90-100% of range (danger zone)

## Performance

- Target: 60fps for real-time audio visualization
- Render budget: <16ms per frame
- Uses `will-change` for GPU acceleration
- No transitions on fill for real-time response

## Testing

Open `meter.test.html` in Chrome to verify:
- Default state rendering
- Vertical and horizontal orientations
- Disabled state
- Custom ranges
- Real-time animation (60fps)
- Event handling

See: [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#meter-primitive)