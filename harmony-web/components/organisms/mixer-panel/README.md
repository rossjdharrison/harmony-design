# MixerPanel Organism

Composite organism that assembles multiple ChannelStrip components in a horizontal mixer layout.

## Overview

MixerPanel represents a traditional audio mixer interface, displaying multiple channel strips side-by-side. Each channel strip contains faders, knobs, and meters for controlling audio parameters.

See: [Design System Documentation](../../../harmony-design/DESIGN_SYSTEM.md#mixer-panel)

## Usage

```html
<!-- Basic usage with default 8 channels -->
<mixer-panel></mixer-panel>

<!-- Custom channel count -->
<mixer-panel channels="16"></mixer-panel>

<!-- With custom labels -->
<mixer-panel 
  channels="4"
  channel-labels="Drums, Bass, Guitar, Vocals">
</mixer-panel>
```

## Attributes

- `channels` (number): Number of channel strips to display (default: 8)
- `channel-labels` (string): Comma-separated labels for channels

## Events Published

### mixer-panel:initialized
Published when the panel is fully initialized.

```javascript
{
  type: 'mixer-panel:initialized',
  payload: {
    channels: 8,
    timestamp: 1234567890
  }
}
```

### mixer-panel:channel-changed
Published when any channel parameter changes.

```javascript
{
  type: 'mixer-panel:channel-changed',
  payload: {
    channelIndex: 0,
    volume: 0.75,
    pan: 0.5,
    muted: false,
    soloed: false,
    timestamp: 1234567890
  }
}
```

## Public API

### getChannelState(channelIndex)
Returns the state of a specific channel.

```javascript
const mixer = document.querySelector('mixer-panel');
const state = mixer.getChannelState(0);
// { volume: 0.75, pan: 0.5, muted: false, soloed: false, label: 'Ch 1' }
```

### getAllChannelStates()
Returns states of all channels.

```javascript
const states = mixer.getAllChannelStates();
// [{ index: 0, volume: 0.75, ... }, { index: 1, volume: 0.8, ... }]
```

### setChannelState(channelIndex, state)
Sets the state of a specific channel.

```javascript
mixer.setChannelState(0, { volume: 1.0, muted: true });
```

## Dependencies

- ChannelStrip organism
- EventBus core system

## Testing

Open `mixer-panel.test.html` in Chrome to verify:
- Default state (8 channels)
- Custom channel counts
- Custom channel labels
- Programmatic control
- Empty state (0 channels)
- Performance with 32 channels
- Event publishing

## Performance

- Target: <16ms render time for 60fps
- Tested with up to 32 channels
- Horizontal scrolling for overflow
- Efficient state management with Map

## Files

- `mixer-panel.js` - Component implementation
- `mixer-panel.test.html` - Chrome test page
- `README.md` - This file