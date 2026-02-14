# EventBus Development Mode

This module adds strict error handling for the EventBus in development environments.

## Features

- **Schema Violation Detection**: Throws `SchemaViolationError` when event payloads don't match their schemas
- **Missing Subscriber Detection**: Throws `MissingSubscriberError` when events have no subscribers
- **Production Safety**: In production, violations are logged but don't throw to prevent app crashes
- **Manual Control**: Can enable/disable dev mode via localStorage for testing

## Usage

### Basic Integration

```javascript
import { EventBus } from './event-bus.js';
import { validateEvent } from './validation.js';
import { enhanceEventBusWithDevMode, ensureHasSubscribersMethod } from './event-bus-with-dev-mode.js';

// Create EventBus instance
const eventBus = new EventBus();

// Ensure hasSubscribers method exists
ensureHasSubscribersMethod(eventBus);

// Enhance with dev mode validation
enhanceEventBusWithDevMode(eventBus, validateEvent);

// Now emit will throw on violations in dev mode
eventBus.emit('PlayRequested', { trackId: 123 }, 'PlayButton');
```

### Manual Dev Mode Control

```javascript
import { enableDevMode, disableDevMode, isDevMode } from './dev-mode.js';

// Check current mode
console.log('Dev mode:', isDevMode());

// Enable dev mode (persists in localStorage)
enableDevMode();

// Disable dev mode
disableDevMode();
```

## Development Mode Detection

Dev mode is automatically detected when:
- Hostname is `localhost` or `127.0.0.1`
- URL contains `?dev=true` parameter
- localStorage has `harmonyDevMode=true`

## Error Types

### SchemaViolationError

Thrown when event payload doesn't match schema:

```javascript
try {
  eventBus.emit('PlayRequested', { invalid: 'data' });
} catch (error) {
  console.log(error.eventType);   // 'PlayRequested'
  console.log(error.violations);  // ['Field "trackId" is required']
  console.log(error.payload);     // { invalid: 'data' }
  console.log(error.source);      // Component that emitted
}
```

### MissingSubscriberError

Thrown when event has no subscribers:

```javascript
try {
  eventBus.emit('UnknownEvent', {});
} catch (error) {
  console.log(error.eventType);  // 'UnknownEvent'
  console.log(error.source);     // Component that emitted
}
```

## Testing

Run tests with:

```bash
npm test harmony-core/event-bus/__tests__/dev-mode.test.js
npm test harmony-core/event-bus/__tests__/event-bus-with-dev-mode.test.js
```

## Related Documentation

- [EventBus Architecture](../../../harmony-design/DESIGN_SYSTEM.md#event-bus-architecture)
- [Event Schemas](../../../harmony-design/DESIGN_SYSTEM.md#event-schemas)
- [Runtime Validation](../../../harmony-design/DESIGN_SYSTEM.md#event-bus-validation)

## Performance Impact

- **Development**: Adds validation overhead (~1-2ms per event)
- **Production**: Minimal impact (only logging on violations)
- **Subscriber Check**: Only performed in dev mode

## Integration with Existing Code

This module builds on:
- `task-del-runtime-validation-in-eventbus`: Adds throwing behavior to existing validation
- `task-del-define-event-schemas-for-all-c`: Uses defined schemas for validation
- `task-del-event-source-highlighting-show`: Includes source information in errors