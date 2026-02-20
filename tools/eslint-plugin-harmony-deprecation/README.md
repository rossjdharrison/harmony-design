# ESLint Plugin: Harmony Deprecation

ESLint plugin for detecting deprecated pattern usage in the Harmony Design System.

## Installation

This plugin is internal to the Harmony Design System and is automatically configured.

## Rules

### `no-direct-bc-calls` (error)

Prevents UI components from calling bounded contexts directly. Enforces EventBus pattern.

**Bad:**
```javascript
boundedContext.playAudio(trackId);
```

**Good:**
```javascript
EventBus.publish({
  type: 'PlayAudio',
  payload: { trackId }
});
```

### `no-async-audio-thread` (error)

Prevents async operations in audio processing code to maintain real-time constraints (10ms max latency).

**Bad:**
```javascript
async process(inputs, outputs, parameters) {
  await fetchData();
}
```

**Good:**
```javascript
process(inputs, outputs, parameters) {
  // Synchronous processing only
}
```

### `no-framework-imports` (error)

Prevents usage of React, Vue, Angular, or other frameworks. Use vanilla Web Components.

**Bad:**
```javascript
import React from 'react';
```

**Good:**
```javascript
class MyComponent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
  }
}
```

### `shadow-dom-queries` (warning)

Enforces shadow DOM query patterns in Web Components.

**Bad:**
```javascript
document.querySelector('.my-element');
```

**Good:**
```javascript
this.shadowRoot.querySelector('.my-element');
```

### `eventbus-pattern` (warning)

Enforces EventBus.publish() over old CustomEvent pattern.

**Bad:**
```javascript
new CustomEvent('harmony:play', { detail: { trackId } });
```

**Good:**
```javascript
EventBus.publish({ type: 'Play', payload: { trackId } });
```

### `no-electron` (error)

Prevents Electron usage. Use Tauri for desktop wrapper.

**Bad:**
```javascript
const { app } = require('electron');
```

**Good:**
```javascript
// Use Tauri APIs instead
```

### `performance-budgets` (warning)

Warns about potential performance budget violations.

- Render Budget: 16ms per frame
- Memory Budget: 50MB WASM heap
- Load Budget: 200ms initial load

## Configuration

The plugin is automatically configured in `.eslintrc.json`. Two presets available:

### Recommended (default)
```json
{
  "extends": ["plugin:harmony-deprecation/recommended"]
}
```

### Strict
```json
{
  "extends": ["plugin:harmony-deprecation/strict"]
}
```

## See Also

- [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) - Main documentation
- [EventBus Architecture](../../DESIGN_SYSTEM.md#event-bus-architecture)
- [Performance Budgets](../../DESIGN_SYSTEM.md#performance-budgets)