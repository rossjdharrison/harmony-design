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
## Feature Flags

Feature flags allow you to enable or disable features at runtime without code changes. This is useful for:
- Rolling out new features gradually
- A/B testing different implementations
- Environment-specific behavior
- Emergency feature disabling

### Using Feature Flags

The Feature Flag Context provides centralized flag management:

```jsx
import { FeatureFlagProvider } from './contexts/FeatureFlagContext.jsx';
import { useFeatureFlag } from './hooks/useFeatureFlag.js';

// Wrap your app with the provider
<FeatureFlagProvider initialFlags={{ webGPU: true, newEditor: false }}>
  <App />
</FeatureFlagProvider>

// Check flags in components
function MyComponent() {
  const isWebGPUEnabled = useFeatureFlag('webGPU');
  
  return isWebGPUEnabled ? <GPURenderer /> : <CPURenderer />;
}
```

### Available Flags

Common feature flags (defined in config/feature-flags.js):
- webGPU - Enable WebGPU acceleration for audio processing
- 
ewEditor - Use new audio editor interface
- etaFeatures - Enable experimental features
- dvancedAudio - Advanced audio processing features
- experimentalUI - New UI components in development

### Implementation Files

- **Context**: contexts/FeatureFlagContext.jsx - React context for flag state
- **Hook**: hooks/useFeatureFlag.js - Convenient hook for checking flags
- **Config**: config/feature-flags.js - Flag definitions and defaults
- **Test**: 	est-pages/feature-flag-context-test.html - Browser test page

### Performance

Flag lookups are O(1) using Map internally. Context updates only trigger re-renders for consuming components. Flags can be persisted to localStorage for development testing.

### Testing

Run the test page to verify flag behavior:
```bash
# Open in browser
test-pages/feature-flag-context-test.html
```

The test page verifies:
- Flag lookup performance (< 0.01ms per lookup)
- Context initialization and state management
- Batch updates and persistence
- Memory usage (< 1KB for typical flag sets)
## Feature Flag Context

The Feature Flag Context provides a vanilla JavaScript context system for managing feature flags across the application. It follows Web Component patterns and integrates with the EventBus for state propagation.

### Overview

Feature flags allow you to enable or disable features dynamically without deploying new code. The context system provides:

- **Web Component-based context provider** - <feature-flag-context> wraps components that need feature flags
- **Reactive state management** - Subscribers are notified when flags change
- **EventBus integration** - Publishes and listens to feature flag events
- **Utility functions** - Helper functions for easy access to feature flags

### Implementation

**Location**: `contexts/feature-flag-context.js`

The context is implemented as a custom element that manages feature flag state:

```javascript
<feature-flag-context>
  <my-component></my-component>
</feature-flag-context>
```

### Usage Patterns

#### In Web Components

Components can access the context using the `useFeatureFlags` utility:

```javascript
import { useFeatureFlags } from './contexts/feature-flag-context.js';

class MyComponent extends HTMLElement {
  connectedCallback() {
    const { isEnabled, subscribe } = useFeatureFlags(this);
    
    if (isEnabled('newFeature')) {
      this.renderNewFeature();
    }
    
    // Subscribe to changes
    this.unsubscribe = subscribe((flags) => {
      this.render();
    });
  }
  
  disconnectedCallback() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
```

#### Direct Context Access

Components can also access the context directly:

```javascript
import { getFeatureFlagContext } from './contexts/feature-flag-context.js';

const context = getFeatureFlagContext(this);
const isEnabled = context.isEnabled('featureName');
```

#### Updating Flags

Flags can be updated programmatically:

```javascript
const context = document.querySelector('feature-flag-context');
context.updateFlag('newFeature', true);
```

### EventBus Integration

The context publishes and subscribes to feature flag events:

**Published Events**:
- `feature-flag:updated` - When a flag is updated via `updateFlag()`

**Subscribed Events**:
- `feature-flag:updated` - Updates from external sources
- `environment:changed` - Reloads flags when environment changes

### API Reference

#### FeatureFlagContext Methods

- `isEnabled(flagName: string): boolean` - Check if a flag is enabled
- `getAllFlags(): Object` - Get all feature flags as an object
- `subscribe(callback: Function): Function` - Subscribe to changes, returns unsubscribe function
- `unsubscribe(callback: Function): void` - Unsubscribe from changes
- `updateFlag(flagName: string, enabled: boolean): void` - Update a flag

#### Utility Functions

- `getFeatureFlagContext(element: HTMLElement): FeatureFlagContext|null` - Find nearest context
- `useFeatureFlags(element: HTMLElement): FeatureFlagState` - Get feature flag utilities

### Configuration Integration

Feature flags are loaded from `config/feature-flags.js` using the `getFeatureFlags()` function. This allows flags to be defined based on environment variables and configuration.

### Testing

**Test File**: `contexts/feature-flag-context.test.html`

Open the test file in Chrome to verify:
- Context initialization
- Feature flag checking
- Subscribe/unsubscribe functionality
- Flag updates
- Utility functions
- Interactive demo

### Performance Considerations

- Context uses `display: contents` to avoid affecting layout
- Subscribers are stored in a Set for efficient add/remove
- AbortController is used for automatic event cleanup
- State changes are batched to minimize re-renders

### Related Files

- `config/feature-flags.js` - Feature flag configuration
- `config/environment-loader.js` - Environment configuration
- `core/event-bus.js` - EventBus implementation



## Feature Flag Hook

The `useFeatureFlag` hook checks if a feature is enabled in your app.

**Location:** `hooks/useFeatureFlag.js`

### Basic Usage

Check a single feature flag:

```javascript
import { useFeatureFlag } from './hooks/useFeatureFlag.js';

const isNewUIEnabled = useFeatureFlag('new-mixer-ui');
if (isNewUIEnabled) {
  // Show new UI
}
```

### With Default Value

Provide a fallback if the flag doesn't exist:

```javascript
const isEnabled = useFeatureFlag('experimental-feature', false);
```

### Check Multiple Flags

Check if ALL flags are enabled:

```javascript
import { useFeatureFlags } from './hooks/useFeatureFlag.js';

const allEnabled = useFeatureFlags('feature-a', 'feature-b', 'feature-c');
```

Check if ANY flag is enabled:

```javascript
import { useAnyFeatureFlag } from './hooks/useFeatureFlag.js';

const anyEnabled = useAnyFeatureFlag('feature-a', 'feature-b');
```

### Runtime Toggle

Toggle flags during development:

```javascript
import { useFeatureFlagToggle } from './hooks/useFeatureFlag.js';

const toggleFlag = useFeatureFlagToggle();
toggleFlag('new-feature', true);  // Enable
toggleFlag('old-feature', false); // Disable
```

### Get All Flags

Useful for debug panels:

```javascript
import { useAllFeatureFlags } from './hooks/useFeatureFlag.js';

const allFlags = useAllFeatureFlags();
// Returns Map<string, boolean>
```

### Requirements

- Must be used inside a `<feature-flag-provider>` component
- Flag keys must be non-empty strings
- Returns boolean values
- Logs warnings for missing flags

### Performance

- O(1) lookup via Map
- No memory allocation (returns primitive boolean)
- Suitable for frequent checks in render loops

### Related

- [Feature Flag Context](file://./contexts/FeatureFlagContext.js) - Provider component
- [Environment Hook](file://./hooks/useEnvironment.js) - Environment configuration
- [Config Context](file://./contexts/ConfigContext.js) - Typed config access


## Feature Flag Types

TypeScript type definitions provide autocomplete and type safety for feature flags.

### Type Definitions

All feature flag types are defined in `types/feature-flags.d.ts`:

- **FeatureFlagKey**: Union type of all valid flag keys
- **FeatureFlag**: Configuration object for a single flag
- **FeatureFlagConfig**: Map of all flags
- **FeatureFlagContextValue**: Context API interface

### Using Types in JavaScript

Use JSDoc comments to import types:

```javascript
/**
 * @typedef {import('./types/feature-flags').FeatureFlagKey} FeatureFlagKey
 */

/**
 * @param {FeatureFlagKey} key
 */
function checkFeature(key) {
  // VS Code provides autocomplete for 'key'
}
```

### Adding New Flags

1. Add the flag key to `FeatureFlagKey` union in `types/feature-flags.d.ts`
2. Add to `VALID_FLAG_KEYS` array in `types/feature-flags.js`
3. Add default configuration in `contexts/feature-flag-context.js`

### Type Guards

Runtime validation functions in `types/feature-flags.js`:

- `isFeatureFlagKey(key)`: Validates flag key
- `isFeatureFlag(obj)`: Validates flag object
- `validateDependencies()`: Checks flag dependencies

### Autocomplete Support

TypeScript provides autocomplete in:
- VS Code with JSDoc comments
- Function parameters
- Object properties
- Event payloads

See `types/README.md` for detailed usage examples.


## Code Quality and Linting

### ESLint Configuration

The project uses strict ESLint rules to ensure code quality, consistency, and accessibility compliance.

**Configuration Files:**
- .eslintrc.json - Main configuration entry point
- config/eslint.config.js - Detailed rule definitions
- config/eslint-a11y-rules.js - Custom accessibility rules for Web Components

**Key Features:**

1. **Policy Enforcement**: Automatically catches violations like npm imports in runtime code
2. **TypeScript Support**: Strict type checking and validation
3. **Accessibility**: Custom rules for WCAG 2.1 Level AA compliance
4. **Performance**: Rules enforce performance budgets (16ms render, 50MB memory)
5. **Web Components**: Specialized rules for custom element development

**Running Linting:**

```bash
# Validate configuration and run linting
node scripts/validate-eslint.js

# Auto-fix issues where possible
node scripts/validate-eslint.js --fix

# Lint specific files
npx eslint components/my-component.js
```

**Critical Rules:**

- **No npm imports**: Runtime code must use relative paths only (./file.js)
- **JSDoc required**: All functions, methods, and classes must have documentation
- **No console.log**: Use console.warn/error/info instead
- **Strict equality**: Always use === instead of ==
- **Async safety**: No async operations in loops, proper promise handling

**Accessibility Rules:**

The configuration includes custom rules for Web Components:
- Interactive elements must have keyboard handlers
- ARIA attributes must be valid and properly used
- Focus management must be explicit
- Color contrast requirements (enforced in tests)

**Integration:**

ESLint runs automatically in:
- Pre-commit hooks (via Husky)
- CI/CD pipeline (on every PR)
- IDE integration (VS Code, WebStorm)

For full accessibility validation, use axe-core integration tests in 	ests/a11y/.

**Related Files:**
- Validation script: scripts/validate-eslint.js
- Pre-commit hook: .husky/pre-commit
- CI workflow: .github/workflows/ci-build.yml

