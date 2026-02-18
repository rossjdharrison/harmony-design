# Harmony Design System

A complete design system for building audio production interfaces with consistent, accessible components.

## Quick Start

### Development Environment

The Harmony Design System provides a Docker-based development environment for consistent builds across all platforms.

**Prerequisites:**
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Git

**Setup:**

```bash
# Clone the repository
git clone <repository-url>
cd harmony-design

# Build the development container
./scripts/docker-dev.sh build        # Linux/Mac
.\scripts\docker-dev.ps1 build       # Windows

# Start the development environment
./scripts/docker-dev.sh start        # Linux/Mac
.\scripts\docker-dev.ps1 start       # Windows

# Open a shell in the container
./scripts/docker-dev.sh shell        # Linux/Mac
.\scripts\docker-dev.ps1 shell       # Windows
```

**What's Included:**
- Rust toolchain with wasm-pack for WASM compilation
- Node.js 20.x LTS (build tools only, not runtime)
- Python 3.11 (test servers and build scripts only)
- Chrome (for UI component testing per policy #10)
- All system dependencies pre-configured

**Common Commands:**

```bash
# Build WASM modules
./scripts/docker-dev.sh build-wasm

# Run Rust tests
./scripts/docker-dev.sh test

# Run Chrome UI tests
./scripts/docker-dev.sh test-chrome

# Clean build artifacts
./scripts/docker-dev.sh clean

# View logs
./scripts/docker-dev.sh logs
```

**Volume Mounts:**
- Project files are mounted at `/workspace` for live development
- Cargo cache is persisted for faster rebuilds
- Target directory is cached between container restarts

See [Dockerfile](./Dockerfile) and [docker-compose.yml](./docker-compose.yml) for configuration details.

### Manual Setup (Without Docker)

If you prefer not to use Docker, install these tools manually:

1. **Rust** (1.70+): Install from [rustup.rs](https://rustup.rs)
2. **wasm-pack**: Install with `cargo install wasm-pack`
3. **Node.js** (20.x LTS): For build tools only
4. **Python** (3.11+): For test servers only
5. **Chrome**: Required for UI component testing

## Architecture Overview

Harmony uses a layered architecture:

**Core Layer (Rust → WASM):**
- Bounded contexts: Component lifecycle, state management
- Graph engine: Audio processing graph
- Schemas: Type definitions and validation

**UI Layer (Vanilla JS/HTML/CSS):**
- Web Components with Shadow DOM
- Event-driven communication via EventBus
- Token-based theming system

**Key Principles:**
1. **No Runtime Dependencies**: Zero npm packages in production code
2. **No Frameworks**: Pure Web Components, no React/Vue/Leptos
3. **Event-Driven**: UI publishes events, bounded contexts handle logic
4. **Performance First**: 16ms render budget, 10ms audio latency

See [Architecture Decisions](./docs/architecture-decisions.md) for detailed rationale.

## Component Hierarchy

Harmony follows Atomic Design principles:

**Primitives** (Atoms):
- Basic controls: buttons, sliders, toggles
- Pure presentation, minimal logic
- Example: [harmony-toggle](./controls/harmony-toggle/harmony-toggle.js)

**Molecules**:
- Composed from primitives
- Single responsibility
- Example: [harmony-fader](./components/controls/harmony-fader.js)

**Organisms**:
- Complex, feature-complete components
- Example: [transport-bar](./components/composites/transport-bar/transport-bar.js)

**Templates**:
- Page-level layouts
- Combine organisms into workflows

See [Atomic Design Hierarchy](./docs/atomic-design-hierarchy.md) for the complete component tree.

## Token System

Design tokens define the visual language of Harmony:

**Token Categories:**
- **Primitive Tokens**: Raw values (colors, spacing, typography)
- **Semantic Tokens**: Context-aware mappings (primary-color, spacing-medium)
- **Component Tokens**: Component-specific overrides

**Usage:**

```javascript
import { TokenProvider } from './core/token-provider.js';

// Access tokens in JavaScript
const provider = new TokenProvider();
const primaryColor = provider.getToken('color-primary');

// Tokens are available as CSS custom properties
// See styles/tokens.css
```

**Files:**
- [Primitive Tokens](./styles/tokens.css)
- [Dark Theme](./styles/theme-dark.css)
- [Light Theme](./styles/theme-light.css)
- [Token Provider](./core/token-provider.js)

## Event System

All communication happens through the EventBus:

**Pattern:**
1. UI component publishes event
2. EventBus validates and routes
3. Bounded context handles command
4. Bounded context publishes result
5. UI subscribes to result

**Example:**

```javascript
import { EventBus } from './core/event-bus.js';

// Publish command
EventBus.publish('transport.play', { timestamp: Date.now() });

// Subscribe to result
EventBus.subscribe('playback.started', (data) => {
  console.log('Playback started:', data);
});
```

**Debugging:**
- EventBusComponent is available on every page (Ctrl+Shift+E)
- All events are logged with context
- Validation failures include detailed error messages

See [Event Bus](./core/event-bus.js) and [Event Schemas](./core/validation/event-schemas.js).

## Development Workflow

### 1. Schema Changes

When changing Rust behavior:

```bash
# 1. Navigate to schemas
cd harmony-schemas

# 2. Modify schema definition
vim src/component_lifecycle.rs

# 3. Run codegen
cargo build

# 4. Verify compilation
cargo test

# 5. Commit schema AND generated code together
git add .
git commit -m "feat: update component lifecycle schema"
```

**Important**: CI fails if schema changed but generated code is stale (policy #6).

### 2. UI Component Development

```bash
# 1. Create component file
touch components/controls/my-component.js

# 2. Implement with Shadow DOM
# See existing components for patterns

# 3. Create test file
touch components/controls/my-component.test.html

# 4. Test in Chrome (MANDATORY per policy #10)
# Verify ALL states: default, hover, focus, active, disabled

# 5. Update documentation
vim DESIGN_SYSTEM.md
```

### 3. WASM Module Development

```bash
# 1. Modify Rust code in bounded-contexts/
vim bounded-contexts/component-lifecycle/src/lib.rs

# 2. Build WASM
cd bounded-contexts/component-lifecycle
wasm-pack build --target web

# 3. Test in browser
# Import from pkg/ directory
```

## Performance Budgets

All code must meet these targets:

**Render Performance:**
- Maximum 16ms per frame (60fps)
- GPU-accelerated animations where possible
- Use Chrome DevTools Performance panel to verify

**Memory:**
- Maximum 50MB WASM heap
- Monitor with Chrome Task Manager

**Load Time:**
- Maximum 200ms initial load
- Lazy-load non-critical components

**Audio Latency:**
- Maximum 10ms end-to-end
- WebGPU + WASM dual implementation required

See [Performance Budget](./docs/performance/performance-budget.md) and [Memoization Strategy](./docs/performance/memoization-strategy.md).

## Testing

### Unit Tests (Rust)

```bash
cd harmony-schemas
cargo test
```

### Integration Tests (JavaScript)

Open test HTML files in Chrome:
- [harmony-toggle.test.html](./controls/harmony-toggle/harmony-toggle.test.html)
- [harmony-fader.test.html](./components/controls/harmony-fader.test.html)
- [transport-bar.test.html](./components/composites/transport-bar/transport-bar.test.html)

### Performance Tests

Use Chrome DevTools:
1. Open Performance panel
2. Record interaction
3. Verify 60fps (no frames over 16ms)
4. Check memory usage

## CI/CD

GitHub Actions runs on every PR:

**Quality Gates:**
1. Rust tests (`cargo test`)
2. WASM build (`wasm-pack build`)
3. Bundle size check (enforces performance budget)
4. Lint and format checks

**Preview Deployments:**
- Vercel deploys preview on every PR
- Test components in production-like environment

See [CI Build Pipeline](./.github/workflows/ci-build.yml) and [Bundle Size Check](./.github/workflows/bundle-size-check.yml).

## Contributing

1. Create feature branch from `main`
2. Implement changes following policies
3. Test in Chrome (UI components)
4. Update DESIGN_SYSTEM.md (MANDATORY per policy #19)
5. Commit with conventional commits format
6. Push to remote (MANDATORY per policy #20)
7. Open PR

**Blocked Tasks:**
If you cannot complete a task, create a report in `reports/blocked/{task_id}.md` (policy #18).

## File Organization

```
harmony-design/
├── bounded-contexts/     # Rust bounded contexts (WASM)
├── components/           # UI components (Web Components)
├── controls/             # Primitive controls
├── core/                 # Core utilities (EventBus, TokenProvider)
├── docs/                 # Technical documentation
├── scripts/              # Build and dev scripts
├── styles/               # CSS tokens and themes
├── tests/                # Test files
├── Dockerfile            # Development environment
├── docker-compose.yml    # Container orchestration
└── DESIGN_SYSTEM.md      # This file
```

## Key Policies

These rules apply to every task:

1. **No Runtime Dependencies**: npm packages for build tools only
2. **No Frameworks**: Pure Web Components
3. **Event-Driven**: UI publishes, BCs handle
4. **Chrome Testing**: All UI components tested in Chrome
5. **Documentation**: DESIGN_SYSTEM.md updated with every task
6. **Git Push**: Changes pushed before new tasks
7. **Performance**: Meet render/memory/load budgets
8. **Schema-First**: Codegen from schemas, don't edit Rust directly

See full policy list in task documentation.

## Support

- **Documentation**: This file and [docs/](./docs/)
- **Code Examples**: See existing components
- **Debugging**: EventBusComponent (Ctrl+Shift+E)
- **Issues**: Check [reports/blocked/](./reports/blocked/)

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-15
## Storybook Configuration

The Harmony Design System uses Storybook 8 for component development, documentation, and testing.

### Setup

Storybook is configured in the .storybook/ directory with:

- **Vite Builder**: Fast HMR and optimized production builds
- **Dark Mode**: Theme switching via `@storybook/addon-themes`
- **Accessibility Testing**: Automated checks with axe-playwright
- **Web Components**: Native support for custom elements

### Quick Start

```bash
# Start Storybook dev server
npm run storybook

# Build static Storybook
npm run build-storybook

# Run accessibility tests
npm run test-storybook
```

### Writing Stories

Stories follow this pattern:

```javascript
// components/my-component/my-component.stories.js
export default {
  title: 'Components/MyComponent',
  tags: ['autodocs'],
};

export const Default = () => {
  const element = document.createElement('my-component');
  return element;
};
```

### Theme Support

Storybook provides automatic theme switching between light and dark modes. Components should use CSS variables for theming:

- `--color-background`: Main background color
- `--color-surface`: Surface/card background
- `--color-text`: Primary text color
- `--color-text-secondary`: Secondary text color
- `--color-border`: Border color
- `--color-primary`: Primary brand color
- `--color-primary-hover`: Primary hover state

Example usage:

```javascript
button.style.backgroundColor = 'var(--color-primary)';
button.style.color = 'white';
```

### Accessibility Testing

All stories are automatically tested for WCAG 2.1 AA compliance. The a11y addon checks:

- Color contrast ratios
- ARIA attributes
- Keyboard navigation
- Focus management
- Semantic HTML

To disable a11y testing for a specific story:

```javascript
MyStory.parameters = {
  a11y: {
    disable: true,
  },
};
```

### Performance Targets

Storybook configuration follows Harmony performance budgets:

- Dev server start: <3s
- HMR update: <100ms
- Story render: <16ms (60fps target)
- Production build: <30s

### Configuration Files

- [.storybook/main.js](../.storybook/main.js): Main configuration
- [.storybook/preview.js](../.storybook/preview.js): Preview decorators and parameters
- [.storybook/manager.js](../.storybook/manager.js): Manager UI customization
- [.storybook/vite.config.js](../.storybook/vite.config.js): Vite build configuration
- [.storybook/preview-head.html](../.storybook/preview-head.html): Custom preview HTML
- [.storybook/test-runner.js](../.storybook/test-runner.js): Test runner configuration

### Example Stories

See [.storybook/example.stories.js](../.storybook/example.stories.js) for a complete example demonstrating theme support and accessibility best practices.

