# Event System Guide

Harmony Design System uses a centralized event bus for component communication. This guide explains how to work with events effectively.

## Event Bus Architecture

Components publish events to the EventBus. Bounded contexts subscribe to events and process them.

```
User Action → Component → EventBus → Bounded Context → Result Event → UI Update
```

### Key Principle

**Components never call bounded contexts directly.** All communication flows through events.

## Publishing Events

Components publish events using the EventBus:

```javascript
// Inside a component
this.dispatchEvent(new CustomEvent('harmony-button-click', {
    bubbles: true,
    composed: true,
    detail: {
        buttonId: this.id,
        timestamp: Date.now()
    }
}));
```

The EventBus automatically captures and routes these events.

## Subscribing to Events

Subscribe to events in your application code:

```javascript
// Get EventBus instance
const eventBus = window.harmonyEventBus;

// Subscribe to button clicks
eventBus.subscribe('harmony-button-click', (event) => {
    console.log('Button clicked:', event.detail);
    
    // Process the event
    if (event.detail.buttonId === 'play-button') {
        // Publish command to bounded context
        eventBus.publish('audio.play', {
            trackId: currentTrackId
        });
    }
});
```

## Event Naming Convention

Events follow a hierarchical naming pattern:

### Component Events
- `harmony-{component}-{action}`: `harmony-button-click`, `harmony-input-change`
- These bubble from components to the EventBus

### Command Events
- `{context}.{command}`: `audio.play`, `playlist.add`, `user.login`
- These are commands sent to bounded contexts

### Result Events
- `{context}.{result}`: `audio.playback-started`, `playlist.item-added`, `user.logged-in`
- These are results published by bounded contexts

## Event Payload Structure

All events should include structured payloads:

```javascript
{
    // Required fields
    timestamp: Date.now(),
    source: 'component-id',
    
    // Event-specific data
    data: {
        // Your event data here
    },
    
    // Optional metadata
    metadata: {
        userId: 'user-123',
        sessionId: 'session-456'
    }
}
```

## Command Pattern

Bounded contexts use the command pattern:

```javascript
// Bounded context subscribes to commands
eventBus.subscribe('audio.play', async (event) => {
    try {
        // Process command
        const result = await audioEngine.play(event.detail.trackId);
        
        // Publish success event
        eventBus.publish('audio.playback-started', {
            trackId: event.detail.trackId,
            duration: result.duration,
            timestamp: Date.now()
        });
    } catch (error) {
        // Publish error event
        eventBus.publish('audio.playback-error', {
            trackId: event.detail.trackId,
            error: error.message,
            timestamp: Date.now()
        });
    }
});
```

## Error Handling

The EventBus logs all errors with context:

```javascript
// Validation errors
// Console: "EventBus validation error: Invalid event type 'invalid.event'"

// Missing subscribers
// Console: "EventBus warning: No subscribers for event 'unknown.command'"

// Type mismatches
// Console: "EventBus error: Expected object payload, got string"
```

## Debugging Events

Use the EventBus Debug Component (Ctrl+Shift+E):

1. Press `Ctrl+Shift+E` to open the debug panel
2. View all events in real-time
3. Filter by event type or source
4. Inspect event payloads
5. See subscriber counts

The EventBusComponent is included in the app-shell template and available on every page.

## Best Practices

### Do: Use Descriptive Event Names

```javascript
// Good
eventBus.publish('playlist.track-added', { trackId, position });

// Bad
eventBus.publish('update', { id, pos });
```

### Do: Include Timestamps

```javascript
eventBus.publish('audio.play', {
    trackId: 'track-123',
    timestamp: Date.now() // Always include
});
```

### Do: Handle Errors Gracefully

```javascript
eventBus.subscribe('audio.play', async (event) => {
    try {
        await processPlayback(event.detail);
    } catch (error) {
        console.error('Playback error:', error);
        eventBus.publish('audio.playback-error', {
            error: error.message,
            trackId: event.detail.trackId
        });
    }
});
```

### Don't: Call Bounded Contexts Directly

```javascript
// Bad - violates architecture
const audio = await import('./bounded-contexts/audio.wasm');
audio.play(trackId);

// Good - use events
eventBus.publish('audio.play', { trackId });
```

### Don't: Store State in Events

```javascript
// Bad - events are ephemeral
eventBus.publish('state.update', { currentState: {...} });

// Good - use bounded context state management
eventBus.publish('state.request-update', { changes: {...} });
```

## Performance Considerations

- Event processing is synchronous by default
- Async handlers don't block event publishing
- EventBus overhead: <1ms per event
- Use event filtering to reduce unnecessary processing

## Related Guides

- [Component Basics](./component-basics.md) - Learn component fundamentals
- [Architecture Guide](../best-practices/architecture.md) - Understand system design
- See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#event-bus) for EventBus implementation details