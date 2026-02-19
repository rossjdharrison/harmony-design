# Harmony Design System

A high-performance design system for audio and creative applications, built with Web Components, Rust/WASM, and vanilla JavaScript.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Environment Configuration](#environment-configuration)
5. [Components](#components)
6. [Bounded Contexts](#bounded-contexts)
7. [Event Bus](#event-bus)
8. [Performance](#performance)
9. [Testing](#testing)
10. [Contributing](#contributing)

## Overview

Harmony Design System is a GPU-accelerated, memory-efficient design system optimized for real-time audio processing and creative tools. It combines Web Components for UI, Rust/WASM for performance-critical operations, and a graph-based architecture for complex audio workflows.

### Key Features

- **Web Components**: Shadow DOM-based components with no framework dependencies
- **Rust/WASM**: High-performance bounded contexts for audio processing
- **Event-Driven**: Decoupled architecture using EventBus pattern
- **GPU-First**: WebGPU acceleration for audio and visual processing
- **Type-Safe**: TypeScript types with runtime validation
- **A/B Testing**: Built-in experimentation framework

## Architecture

### Technology Stack

- **UI Layer**: Vanilla HTML/CSS/JavaScript with Web Components
- **Core Logic**: Rust compiled to WebAssembly
- **Type System**: TypeScript for development, runtime validation
- **Build Tools**: npm for development only (no runtime dependencies)
- **Testing**: Pytest for test servers, browser-based for components

### Directory Structure

```
harmony-design/
├── components/          # UI components (Web Components)
├── bounded-contexts/    # Rust/WASM business logic
├── config/             # Environment and build configuration
├── tokens/             # Design tokens (colors, spacing, etc.)
├── hooks/              # Reusable JavaScript hooks
├── contexts/           # React-style contexts (vanilla JS)
├── animations/         # Animation presets and utilities
├── scripts/            # Build and development scripts
├── tests/              # Test suites
└── docs/               # Additional documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ (for development tools only)
- Rust 1.70+ (for WASM compilation)
- Modern browser with WebGPU support

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd harmony-design

# Install development dependencies
npm install

# Build WASM modules
cd bounded-contexts/component-lifecycle
cargo build --target wasm32-unknown-unknown
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Configuration

Harmony uses environment files to configure behavior across different deployment contexts. Configuration is loaded at runtime and validated against TypeScript types.

### Environment Files

- **`.env.example`**: Template showing all available variables
- **`.env.development`**: Development defaults (this file)
- **`.env.production`**: Production optimized settings
- **`.env.local`**: Local overrides (gitignored, for secrets)

### Configuration Categories

#### Core Environment
- `NODE_ENV`: Node.js environment (development/production)
- `HARMONY_ENV`: Harmony-specific environment identifier

#### Feature Flags
Development enables all debugging features:
- `ENABLE_EXPERIMENTS`: A/B testing framework
- `ENABLE_DEBUG_TOOLS`: Developer tools and inspectors
- `ENABLE_PERFORMANCE_MONITORING`: Performance tracking
- `ENABLE_EVENT_BUS_DEBUGGER`: EventBus visualization (Ctrl+Shift+E)

#### Performance Budgets
Strict budgets enforced in production, monitored in development:
- `RENDER_BUDGET_MS=16`: Maximum frame render time (60fps)
- `MEMORY_BUDGET_MB=50`: WASM heap limit
- `LOAD_BUDGET_MS=200`: Initial load time
- `AUDIO_LATENCY_BUDGET_MS=10`: End-to-end audio processing

#### Audio Engine
- `AUDIO_SAMPLE_RATE`: Sample rate (typically 48000)
- `AUDIO_BUFFER_SIZE`: Buffer size (lower = less latency)
- `AUDIO_ENABLE_GPU`: Enable WebGPU acceleration
- `AUDIO_ENABLE_WASM`: Enable WASM processing

#### Storage
- `INDEXEDDB_NAME`: Database name for project storage
- `INDEXEDDB_VERSION`: Schema version
- `ENABLE_STORAGE_PERSISTENCE`: Request persistent storage

### Loading Configuration

Configuration is loaded via `config/environment-loader.js`:

```javascript
import { loadEnvironment } from './config/environment-loader.js';

const env = loadEnvironment();
console.log('Running in:', env.HARMONY_ENV);
```

See [config/environment-loader.js](config/environment-loader.js) for implementation details.

### Type Safety

Environment variables are typed in [config/environment-types.ts](config/environment-types.ts). The loader validates all variables at runtime and provides defaults for missing values.

## Components

### Component Structure

All components follow this pattern:

```javascript
/**
 * Custom element implementation
 * @element harmony-component-name
 */
class HarmonyComponentName extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>/* Component styles */</style>
      <div><!-- Component markup --></div>
    `;
  }
}

customElements.define('harmony-component-name', HarmonyComponentName);
```

### Component Categories

- **Primitives**: Basic UI elements (buttons, inputs, sliders)
- **Molecules**: Composite components (faders, knobs, meters)
- **Organisms**: Complex components (mixer channels, transport)
- **Templates**: Page-level layouts

### Testing Components

All components must be tested in Chrome before completion:

1. Open component test file in Chrome
2. Verify all states: default, hover, focus, active, disabled
3. Check error states, loading states, empty states
4. Verify 60fps animations using DevTools Performance panel

## Bounded Contexts

Bounded contexts implement business logic in Rust, compiled to WASM. They subscribe to command events and publish result events.

### Pattern

```
UI Component → Publishes Event → EventBus Routes → BC Handles → Publishes Result
```

### Example: Component Lifecycle

See [bounded-contexts/component-lifecycle/](bounded-contexts/component-lifecycle/) for implementation.

### Modifying Bounded Contexts

1. Navigate to `harmony-schemas`
2. Modify schema definition
3. Run codegen: `npm run codegen`
4. Verify Rust compilation
5. Commit schema + generated code together

## Event Bus

The EventBus decouples UI components from business logic. All communication happens through events.

### Publishing Events

```javascript
window.dispatchEvent(new CustomEvent('harmony:command:play', {
  detail: { trackId: 'track-1' }
}));
```

### Subscribing to Events

```javascript
window.addEventListener('harmony:result:playback-started', (event) => {
  console.log('Playback started:', event.detail);
});
```

### Debugging

Press `Ctrl+Shift+E` to open the EventBus debugger. It shows:
- All published events
- Event payloads
- Subscriber counts
- Validation errors

See [components/event-bus-debugger.js](components/event-bus-debugger.js) for implementation.

## Performance

### Budgets

- **Render**: 16ms per frame (60fps)
- **Memory**: 50MB WASM heap
- **Load**: 200ms initial load
- **Audio**: 10ms end-to-end latency

### Monitoring

Enable performance monitoring in development:

```bash
ENABLE_PERFORMANCE_MONITORING=true
```

### GPU Acceleration

Audio processing uses WebGPU when available, falling back to WASM. Data transfer uses SharedArrayBuffer for zero-copy performance.

## Testing

### Component Tests

Browser-based tests for UI components:

```html
<!-- components/example/example.test.html -->
<script type="module">
  import './example.js';
  
  // Test component behavior
</script>
```

### Unit Tests

Rust tests for bounded contexts:

```bash
cd bounded-contexts/component-lifecycle
cargo test
```

### Integration Tests

End-to-end tests using pytest:

```bash
pytest tests/
```

## Contributing

### Before Committing

1. Run quality gates: `npm run validate`
2. Test components in Chrome
3. Update DESIGN_SYSTEM.md
4. Run codegen if schemas changed
5. Verify performance budgets

### Commit Message Format

```
feat(component-name): Brief description

Detailed explanation of changes.
Relates to task-id or issue number.
```

### Pull Request Checklist

- [ ] All quality gates pass
- [ ] Components tested in Chrome
- [ ] Documentation updated
- [ ] No technical debt introduced
- [ ] Performance budgets met

## Additional Resources

- [Schema Documentation](harmony-schemas/)
- [Component Examples](examples/)
- [Performance Reports](reports/)

---

**Last Updated**: 2024-02-15
**Version**: 1.0.0

## Environment Configuration

Harmony Design System supports multiple environment configurations through .env files. Each environment has specific overrides tailored to its purpose.

### Available Environments

- **Development** (.env.development) - Local development with hot reload and extensive debugging
- **Staging** (.env.staging) - Pre-production environment mirroring production with debugging enabled
- **Production** (.env.production) - Optimized production configuration with minimal logging

### Staging Environment

The staging environment (.env.staging) provides a production-like setup with enhanced debugging capabilities:

**Key Features:**
- Production-like API endpoints (staging-api.harmonydesign.dev)
- Full analytics and experiment tracking enabled
- Debug tools available (Event Bus Debugger, Performance Panel, State Inspector)
- Comprehensive logging to both console and remote server
- Preview mode support for testing deployments
- Same performance budgets as production (16ms render, 50MB memory, 200ms load)

**Use Cases:**
- Pre-release testing and validation
- QA verification before production deployment
- Performance testing under production-like conditions
- Integration testing with staging APIs
- Preview deployments for stakeholder review

**Configuration Loading:**
Environment files are loaded by config/environment-loader.js based on the NODE_ENV variable. The loader merges environment-specific settings with defaults from .env.example.

**Related Files:**
- .env.staging - Staging environment overrides
- .env.development - Development environment defaults
- .env.production - Production environment configuration
- .env.example - Template with all available variables
- config/environment-loader.js - Environment configuration loader
- config/environment.d.ts - TypeScript types for environment variables



## Environment Configuration

Harmony uses environment-specific configuration files to manage settings across development, staging, and production environments.

### Production Environment (.env.production)

The production environment is optimized for performance, security, and reliability:

**Key Production Settings:**
- Debug tools are disabled for security and performance
- Performance monitoring and error reporting are enabled
- Logging is set to error-level only and sent to external services
- Source maps are disabled to protect code
- Code is minified and tree-shaken for optimal bundle size
- CDN is enabled for static asset delivery
- Analytics and experiments run at full capacity

**Performance Budgets:**
All production builds enforce strict performance budgets:
- Render: 16ms per frame (60fps)
- Memory: 50MB WASM heap maximum
- Load: 200ms initial load time
- Audio: 10ms end-to-end latency

**Security Features:**
- Content Security Policy (CSP) enabled
- CORS configured with allowed origins only
- Source maps disabled in production builds
- Debug tools completely disabled

**Monitoring:**
Production uses external monitoring services:
- Error tracking via Sentry (10% trace sampling)
- Analytics tracking (100% event sampling)
- Performance monitoring enabled
- Event bus validation enabled (no debug logging)

### Environment Files

- .env.development - Development defaults (debug enabled, verbose logging)
- .env.staging - Staging overrides (production-like with debug tools)
- .env.production - Production overrides (optimized, secure, monitored)
- .env.example - Template showing all available options

**Usage:**
Environment files are loaded automatically based on NODE_ENV. The environment loader ([config/environment-loader.js](config/environment-loader.js)) merges settings with the following precedence:

1. System environment variables (highest priority)
2. Environment-specific file (.env.production)
3. Example file defaults (.env.example)

**Never commit sensitive values** like API keys or tokens. Use environment variables or a secrets management service instead.

See [config/environment-loader.js](config/environment-loader.js) for implementation details.

