# Harmony Design System

A Web Audio DAW design system built with Web Components, Rust/WASM bounded contexts, and GPU-accelerated audio processing.

## Overview

Harmony is a modular design system for building professional audio production interfaces. It combines vanilla Web Components for UI with Rust/WASM for audio processing, ensuring high performance and type safety.

## Core Principles

1. **Performance First**: 16ms render budget, 10ms audio latency, GPU acceleration
2. **Type Safety**: TypeScript types + Rust schemas with codegen
3. **Zero Runtime Dependencies**: Vanilla JS/HTML/CSS for UI
4. **Event-Driven Architecture**: Components publish events, bounded contexts handle logic
5. **Progressive Enhancement**: Works without JavaScript, enhanced with it

## Architecture

### Technology Stack

- **UI Layer**: Vanilla Web Components with Shadow DOM
- **Audio Processing**: Rust → WASM + WebGPU
- **State Management**: EventBus + Bounded Contexts
- **Type System**: TypeScript definitions + Rust schemas
- **Build Tools**: npm for dev tools only (not runtime)

### Bounded Contexts

Rust-based isolated domains compiled to WASM:

- `component-lifecycle`: Component state management
- Audio processing contexts (see `bounded-contexts/`)

### Event-Driven Communication

Components never call bounded contexts directly. Pattern:

1. User interacts with component
2. Component publishes event to EventBus
3. EventBus routes to appropriate bounded context
4. Bounded context processes and publishes result event
5. Components subscribe to result events and update UI

See `core/event-bus.js` for implementation.

## Environment Configuration

### Overview

The environment system provides typed configuration management across development, staging, and production environments. Configuration is loaded from `.env` files and made available through a React-style hook API.

### Files

- **Types**: `config/environment-types.js` - TypeScript-style JSDoc types
- **Loader**: `config/environment-loader.js` - Loads and validates environment config
- **Context**: `contexts/ConfigContext.js` - Global configuration singleton
- **Hook**: `hooks/useEnvironment.js` - Component access to environment config
- **Environment Files**:
  - `.env.development` - Development defaults
  - `.env.staging` - Staging overrides
  - `.env.production` - Production overrides

### Using the Environment Hook

The `useEnvironment` hook provides convenient access to environment configuration in Web Components:

```javascript
import { useEnvironment } from './hooks/useEnvironment.js';

class MyComponent extends HTMLElement {
  connectedCallback() {
    const env = useEnvironment();
    console.log('API URL:', env.apiUrl);
    console.log('Debug mode:', env.enableDebug);
  }
}
```

### Hook Variants

**Basic Access**:
```javascript
const env = useEnvironment(); // Get full config object
```

**Specific Values**:
```javascript
const apiUrl = useEnvironmentValue('apiUrl', 'http://default');
```

**Environment Detection**:
```javascript
if (useIsEnvironment('development')) {
  // Development-only code
}
```

**Debug Mode**:
```javascript
if (useDebugMode()) {
  console.log('Debug info...');
}
```

**Audio Config**:
```javascript
const { bufferSize, maxPolyphony } = useAudioConfig();
```

**API Config**:
```javascript
const { apiUrl, wsUrl } = useApiConfig();
```

### Configuration Values

Available configuration keys:

- `apiUrl`: REST API base URL
- `wsUrl`: WebSocket URL
- `environment`: Current environment name
- `enableDebug`: Debug mode flag
- `enableAnalytics`: Analytics flag
- `audioBufferSize`: Audio buffer size in samples
- `maxPolyphony`: Maximum simultaneous voices
- `logLevel`: Logging level (debug/info/warn/error)

### Initialization

Environment is initialized automatically by `environment-loader.js` which:

1. Detects current environment from `NODE_ENV`
2. Loads appropriate `.env` file
3. Validates configuration against schema
4. Stores in `ConfigContext` for hook access

### Testing

Test the hook in Chrome:
```bash
# Serve the test file
python -m http.server 8000

# Open in browser
http://localhost:8000/hooks/useEnvironment.test.html
```

## Component Development

### Web Component Template

```javascript
/**
 * @fileoverview MyComponent - Brief description
 * @see {@link ../DESIGN_SYSTEM.md#relevant-section}
 */

class MyComponent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
      </style>
      <div>Content</div>
    `;
  }
}

customElements.define('my-component', MyComponent);
```

### Testing Components

All UI components must be tested in Chrome before task completion:

1. Create `.test.html` file alongside component
2. Test all states: default, hover, focus, active, disabled
3. Verify performance with DevTools (60fps target)
4. Check accessibility with screen reader

## Performance Budgets

- **Render**: 16ms per frame (60fps)
- **Memory**: 50MB WASM heap max
- **Load**: 200ms initial load
- **Audio**: 10ms end-to-end latency

## Quality Gates

Run before committing:

```bash
npm run lint
npm run test
npm run build
```

## Documentation Standards

- Write in B1-level English (clear, simple)
- Link to code files relatively
- Keep code in files, not in docs
- Two-way references between docs and code

## Contributing

1. Check existing structure before creating files
2. Follow event-driven patterns
3. No npm runtime dependencies
4. Test in Chrome before completing
5. Update this documentation file

## Resources

- EventBus: `core/event-bus.js`
- Type Navigator: `core/type-navigator.js`
- Environment Config: `hooks/useEnvironment.js`
- Bounded Contexts: `bounded-contexts/`
- Components: `components/`

---

For detailed implementation notes, see code files linked throughout this document.