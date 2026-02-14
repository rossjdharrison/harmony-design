# Event Catalog

This document catalogs all events in the Harmony Design System, organized by bounded context.

## Event Naming Convention

Events follow the pattern: `{context}.{category}.{action}`

- **context**: Bounded context (playback, component, graph, ui, audio)
- **category**: `command` (request) or `result` (response)
- **action**: Specific action (play, pause, started, error, etc.)

## Playback Context

### Commands (Component → BC)

| Event Type | Description | Required Payload | Optional Payload |
|------------|-------------|------------------|------------------|
| `playback.command.play` | Start playback of a track | `trackId` | `startPosition` |
| `playback.command.pause` | Pause current playback | - | `savePosition` |
| `playback.command.stop` | Stop playback completely | - | - |
| `playback.command.seek` | Seek to position | `position` | - |
| `playback.command.volume` | Change volume level | `level` (0.0-1.0) | - |

### Results (BC → Component)

| Event Type | Description | Payload |
|------------|-------------|---------|
| `playback.result.started` | Playback has started | `trackId`, `duration`, `position` |
| `playback.result.paused` | Playback paused | `position` |
| `playback.result.stopped` | Playback stopped | - |
| `playback.result.progress` | Periodic progress update | `position`, `duration`, `buffered` |
| `playback.result.error` | Playback error occurred | `code`, `message`, `details` |

## Component Context

### Commands (Component → BC)

| Event Type | Description | Required Payload | Optional Payload |
|------------|-------------|------------------|------------------|
| `component.command.updateState` | Request state transition | `componentId`, `state` | `validationRequired` |

### Results (BC → Component)

| Event Type | Description | Payload |
|------------|-------------|---------|
| `component.result.stateUpdated` | State successfully updated | `componentId`, `previousState`, `newState`, `validationsPassed` |
| `component.result.validationFailed` | State transition validation failed | `componentId`, `state`, `failedChecks` |

## Graph Context

### Commands (Component → BC)

| Event Type | Description | Required Payload | Optional Payload |
|------------|-------------|------------------|------------------|
| `graph.command.query` | Query the component graph | `queryType` | `parameters` |

**Query Types:**
- `findComponentsByState`: Find all components in a specific state
- `findLinkedUI`: Find UI elements linked to a component
- `findDependencies`: Find component dependencies
- `findUsages`: Find where a component is used

### Results (BC → Component)

| Event Type | Description | Payload |
|------------|-------------|---------|
| `graph.result.queryResponse` | Query results | `results`, `count`, `queryTime` |

## UI Context

### Commands (Component → BC)

| Event Type | Description | Required Payload | Optional Payload |
|------------|-------------|------------------|------------------|
| `ui.command.navigate` | Navigate to a route | `route` | `params`, `replaceHistory` |

### Results (BC → Component)

| Event Type | Description | Payload |
|------------|-------------|---------|
| `ui.result.navigated` | Navigation completed | `route`, `previousRoute` |

## Audio Context

### Commands (Component → BC)

| Event Type | Description | Required Payload | Optional Payload |
|------------|-------------|------------------|------------------|
| `audio.command.process` | Process audio data | `operation`, `audioData` | `parameters` |

**Operations:**
- `normalize`: Normalize audio levels
- `fade`: Apply fade in/out
- `trim`: Trim audio
- `mix`: Mix multiple tracks
- `analyze`: Analyze audio characteristics

### Results (BC → Component)

| Event Type | Description | Payload |
|------------|-------------|---------|
| `audio.result.processed` | Processing complete | `operation`, `result`, `processingTime` |

## Error Handling

All result events may include error information:

```javascript
{
  type: "*.result.error",
  payload: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details: { /* context-specific details */ }
  }
}
```

## Correlation

Use `correlationId` to match command and result events:

```javascript
// Component publishes command
eventBus.publish({
  type: "playback.command.play",
  correlationId: "req-123",
  payload: { trackId: "track-456" }
});

// BC publishes result with same correlationId
eventBus.publish({
  type: "playback.result.started",
  correlationId: "req-123",
  payload: { trackId: "track-456", duration: 180 }
});
```

## Schema Validation

All events are validated against `harmony-schemas/events/component-events.json` before publishing. Invalid events are logged to console and rejected.

See [EventBus Documentation](../../harmony-design/DESIGN_SYSTEM.md#eventbus) for usage patterns.