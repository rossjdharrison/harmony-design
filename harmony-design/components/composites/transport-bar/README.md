# TransportBar Composite

TransportBar is a composite component that provides standard DAW transport controls including play, pause, stop, record buttons, and displays for playback position and tempo (BPM).

## Usage

```html
<harmony-transport-bar 
  position="00:00:000"
  bpm="120">
</harmony-transport-bar>
```

## Attributes

- `position` - Playback position in format MM:SS:mmm (default: "00:00:000")
- `bpm` - Tempo in beats per minute (default: 120)
- `playing` - Boolean attribute indicating playback state
- `recording` - Boolean attribute indicating recording state

## JavaScript API

```javascript
const transport = document.querySelector('harmony-transport-bar');

// Update position
transport.setPosition('01:23:456');

// Update BPM
transport.setBPM(140);

// Set playing state
transport.setPlaying(true);

// Set recording state
transport.setRecording(true);
```

## Events

All events bubble and are composed for EventBus integration:

- `transport-play` - User clicked play button
- `transport-pause` - User clicked pause button
- `transport-stop` - User clicked stop button
- `transport-record` - User toggled record button

Event detail structure:
```javascript
{
  timestamp: 1234567890,
  recording: true  // Only on transport-record event
}
```

## Keyboard Shortcuts

- `Space` - Toggle play/pause
- `R` - Toggle record

## Styling

CSS custom properties for theming:

```css
harmony-transport-bar {
  --transport-bg: #2a2a2a;
  --transport-border: #3a3a3a;
  --transport-text: #e0e0e0;
  --button-size: 40px;
  --button-gap: 8px;
  --play-color: #4caf50;
  --stop-color: #666;
  --record-color: #f44336;
  --record-active: #ff1744;
}
```

## Architecture

TransportBar is a composite component that:
- Uses shadow DOM for encapsulation
- Publishes events (never calls BCs directly)
- Provides both declarative (attributes) and imperative (methods) APIs
- Implements keyboard shortcuts for common operations
- Uses CSS animations for recording indicator pulse

## Performance

- Render budget: ~2ms per frame
- Memory footprint: ~50KB per instance
- No external dependencies
- Efficient CSS animations using transform/opacity

## Testing

Open `transport-bar.test.html` in Chrome to verify:
- Default state rendering
- Button interactions (hover, active, disabled states)
- Keyboard shortcuts
- Event publishing
- Programmatic control via API
- Multiple instances performance

## Related Components

- See: [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md#transport-bar)
- Related: ChannelStrip, TrackLane, Clip composites