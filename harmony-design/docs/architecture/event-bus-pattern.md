# EventBus Pattern Architecture

## Overview
The Harmony Design System uses an EventBus pattern to decouple UI components from Bounded Contexts (BCs). This ensures clean separation of concerns and testability.

## Rules

### UI Components
- **NEVER** call BC methods directly
- **ALWAYS** publish events through EventBus
- Listen for result events to update UI state

### Bounded Contexts
- **NEVER** called directly by UI components
- **ALWAYS** subscribe to command events
- Publish result events after processing

## Event Flow

```
User Action → Component publishes event → EventBus routes → BC handles → BC publishes result → EventBus routes → Component updates
```

## Example: Playback Control

### ❌ WRONG (Direct Call)
```javascript
// DON'T DO THIS
import { AudioPlaybackBC } from './bounded-contexts/audio-playback.js';

class PlayButton extends HTMLElement {
  handleClick() {
    const bc = new AudioPlaybackBC();
    bc.play(); // DIRECT CALL - VIOLATES POLICY
  }
}
```

### ✅ CORRECT (EventBus Pattern)
```javascript
// Component publishes event
class PlayButton extends HTMLElement {
  handleClick() {
    window.eventBus.publish({
      type: 'audio.playback.play',
      payload: { trackId: this.trackId }
    });
  }
  
  connectedCallback() {
    this.subscription = window.eventBus.subscribe(
      'audio.playback.started',
      (event) => this.updateUIState(event.payload)
    );
  }
}

// BC subscribes and handles
class AudioPlaybackBC {
  constructor(eventBus) {
    eventBus.subscribe('audio.playback.play', (event) => {
      this.handlePlay(event.payload);
    });
  }
  
  handlePlay(payload) {
    // Process command
    const result = this.audioEngine.play(payload.trackId);
    
    // Publish result event
    this.eventBus.publish({
      type: 'audio.playback.started',
      payload: { trackId: payload.trackId, timestamp: Date.now() }
    });
  }
}
```

## Event Naming Convention

Format: `{domain}.{context}.{action}`

Examples:
- `audio.playback.play`
- `audio.playback.pause`
- `audio.playback.started`
- `audio.playback.paused`
- `component.state.update`
- `component.state.updated`

## Error Handling

All EventBus errors MUST be logged:
- Validation failures
- Missing subscribers
- Type mismatches

Include context: event type, source, payload, error message.

## References
- Implementation: `/harmony-core/event-bus.js`
- Debug UI: `/harmony-ui/components/event-bus-debug.js`
- Testing: `/harmony-design/tests/event-bus-integration.test.js`