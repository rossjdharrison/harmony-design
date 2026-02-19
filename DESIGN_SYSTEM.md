# Harmony Design System

This document describes the Harmony Design System: how it works, how to use it, and how components connect together.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration System](#configuration-system)
4. [Component System](#component-system)
5. [Event System](#event-system)
6. [Performance Guidelines](#performance-guidelines)
7. [Development Workflow](#development-workflow)

## Overview

Harmony is a high-performance design system built with vanilla JavaScript, Web Components, and WebAssembly. It follows strict performance budgets and uses an event-driven architecture.

**Core Principles:**
- 60fps rendering (16ms budget)
- 50MB memory limit
- 200ms initial load
- No runtime dependencies
- Type-safe configuration

## Architecture

### Technology Stack

- **UI Layer**: Vanilla JS + Web Components (Shadow DOM)
- **Core Logic**: Rust → WebAssembly
- **State Management**: Event-driven with EventBus
- **Configuration**: Environment-based typed config
- **Build Tools**: npm (dev only), Python (scripts only)

### Directory Structure

```
harmony-design/
├── components/       # UI components (Web Components)
├── contexts/         # Context patterns for shared state
├── config/           # Configuration loaders
├── types/            # TypeScript type definitions
├── bounded-contexts/ # Rust business logic → WASM
├── hooks/            # Reusable component behaviors
└── styles/           # Global styles and tokens
```

## Configuration System

### Configuration Context

The configuration system provides typed, centralized access to environment-based configuration throughout the application.

**Files:**
- [`contexts/config-context.js`](./contexts/config-context.js) - Main context implementation
- [`config/environment-loader.js`](./config/environment-loader.js) - Loads environment config
- [`types/environment-types.js`](./types/environment-types.js) - TypeScript types

### Using Configuration

#### Basic Usage

```javascript
import { ConfigContext } from './contexts/config-context.js';

// Initialize once at app startup
const config = ConfigContext.getInstance();
await config.initialize();

// Access configuration
const apiUrl = config.get('api.baseUrl');
const isDebug = config.get('debug.enabled');
```

#### In Components

```javascript
import { useConfig } from './contexts/config-context.js';

class MyComponent extends HTMLElement {
  connectedCallback() {
    // Get config with default fallback
    const apiUrl = useConfig('api.baseUrl', 'http://localhost:3000');
    this.render(apiUrl);
  }
}
```

#### Subscribe to Changes

```javascript
const config = ConfigContext.getInstance();
const unsubscribe = config.subscribe((newConfig) => {
  console.log('Config updated:', newConfig);
});

// Later: unsubscribe();
```

### Configuration Pattern

The ConfigContext uses a **singleton pattern** to ensure single source of truth:

1. **Initialization**: Load config from environment at app startup
2. **Access**: Use `get()` or `getOrDefault()` for type-safe access
3. **Subscription**: Subscribe to config changes if needed
4. **Immutability**: Configuration is read-only after initialization

**Performance Note:** Config access is synchronous after initialization (no async overhead in render path).

## Component System

### Web Components

All UI components use native Web Components with Shadow DOM.

**Template:**

```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
      </style>
      <div>Content</div>
    `;
  }
}

customElements.define('my-component', MyComponent);
```

### Component Communication

Components **publish events**, never call bounded contexts directly:

```javascript
// Component publishes event
this.dispatchEvent(new CustomEvent('action-requested', {
  bubbles: true,
  composed: true,
  detail: { action: 'play' }
}));

// EventBus routes to bounded context
// Bounded context handles and publishes result
```

## Event System

### EventBus Pattern

See [`components/event-bus-debugger.js`](./components/event-bus-debugger.js) for EventBus implementation.

**Pattern:**
1. UI component publishes command event
2. EventBus validates and routes event
3. Bounded context subscribes to command
4. Bounded context processes and publishes result event
5. UI component subscribes to result event

## Performance Guidelines

### Budgets

- **Render**: 16ms per frame (60fps)
- **Memory**: 50MB WASM heap
- **Load**: 200ms initial load
- **Audio**: 10ms end-to-end latency

### Best Practices

1. **Avoid layout thrashing**: Batch DOM reads/writes
2. **Use RAF**: Wrap animations in `requestAnimationFrame`
3. **Lazy load**: Load components on demand
4. **Cache config**: Access ConfigContext once, cache result
5. **Profile regularly**: Use Chrome DevTools Performance panel

## Development Workflow

### Testing Components

All components must be tested in Chrome before completion:

1. Open component test file (e.g., `config-context.test.html`)
2. Test all states: default, hover, focus, active, disabled
3. Verify performance: 60fps target
4. Check console for errors

### Adding Configuration

1. Add type to [`types/environment-types.js`](./types/environment-types.js)
2. Add default in [`config/environment-loader.js`](./config/environment-loader.js)
3. Add environment override in `.env.development`, `.env.staging`, `.env.production`
4. Access via ConfigContext

### Documentation

When implementing features:

1. Write code in files (not in docs)
2. Update this document with concept explanation
3. Link to code files relatively
4. Keep explanations concise and friendly

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0.0