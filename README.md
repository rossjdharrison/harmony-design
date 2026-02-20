# Harmony Design System

A GPU-first, WASM-powered design system for building high-performance audio and visual applications with Web Components.

## 🎯 Vision

Harmony advances web application architecture through four core pillars:

1. **Reactive Component System** - Event-driven Web Components with shadow DOM isolation
2. **Atomic Design** - Composable primitives, molecules, organisms, and templates
3. **WASM Performance** - Rust-powered bounded contexts for compute-intensive operations
4. **GPU-First Audio** - WebGPU-accelerated audio processing with <10ms latency

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for build tools only - not runtime)
- Rust 1.70+ with `wasm32-unknown-unknown` target
- Python 3.9+ (for dev servers and build scripts)
- Modern browser with WebGPU support (Chrome 113+, Edge 113+)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/harmony-design.git
cd harmony-design

# Install development tools (build only, not runtime dependencies)
npm install

# Build WASM modules
cd harmony-schemas
cargo build --target wasm32-unknown-unknown --release

# Start development server
python -m http.server 8080
```

### Your First Component

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Harmony Demo</title>
  <script type="module" src="/components/primitives/button/button.js"></script>
  <script type="module" src="/core/event-bus.js"></script>
</head>
<body>
  <!-- Event Bus (required for component communication) -->
  <harmony-event-bus id="event-bus"></harmony-event-bus>

  <!-- Button Component -->
  <harmony-button variant="primary">Click Me</harmony-button>

  <script type="module">
    // Subscribe to button events
    const eventBus = document.getElementById('event-bus');
    eventBus.subscribe('ButtonClicked', (event) => {
      console.log('Button clicked:', event.detail);
    });
  </script>
</body>
</html>
```

### Running Examples

Open any demo file in your browser:

- `demo-components.html` - Basic component showcase
- `demo-cascade.html` - Style cascade and theming
- `demo-advanced.html` - Advanced patterns and integrations

## 📚 Documentation

Complete documentation is available in [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md), covering:

- Architecture principles and patterns
- Component API reference
- Event-driven communication
- WASM bounded contexts
- GPU audio processing
- Performance budgets and optimization
- Testing strategies

## 🏗️ Architecture Overview

### Component Layer (Vanilla JS + Web Components)

All UI components are built with vanilla JavaScript and Web Components:

- **Primitives** (`/components/primitives/`) - Atomic UI elements (buttons, inputs, labels)
- **Molecules** (`/components/molecules/`) - Simple compositions (form fields, cards)
- **Organisms** (`/components/organisms/`) - Complex UI sections (navigation, modals)
- **Templates** (`/templates/`) - Page-level layouts and shells

### Bounded Contexts (Rust → WASM)

Compute-intensive operations run in WASM modules:

- **Component Lifecycle** (`/bounded-contexts/component-lifecycle/`) - State management
- **Full-Text Index** (`/bounded-contexts/full-text-index/`) - Search indexing
- **Spatial Index** (`/bounded-contexts/spatial-index/`) - Graph queries
- **WASM Bridge** (`/bounded-contexts/wasm-bridge/`) - JS ↔ WASM communication

### Event-Driven Communication

All components communicate via the EventBus:

```javascript
// Component publishes event
this.dispatchEvent(new CustomEvent('harmony-event', {
  bubbles: true,
  composed: true,
  detail: {
    type: 'PlayAudio',
    payload: { trackId: '123' }
  }
}));

// Bounded context subscribes
eventBus.subscribe('PlayAudio', async (event) => {
  const result = await audioProcessor.play(event.detail.payload);
  eventBus.publish('PlaybackStarted', result);
});
```

### Performance Budgets

All implementations must meet these constraints:

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| Render Time | 16ms/frame (60fps) | Chrome DevTools Performance |
| WASM Heap | 50MB maximum | Runtime monitoring |
| Initial Load | 200ms maximum | Lighthouse CI |
| Audio Latency | 10ms end-to-end | AudioWorklet metrics |
| Bundle Size | Tracked per PR | GitHub Actions |

## 🧪 Testing

### Component Testing

All UI components must be tested in Chrome before completion:

```bash
# Open test page in Chrome
python -m http.server 8080
# Navigate to: http://localhost:8080/components/primitives/button/button.test.html
```

Verify all states: default, hover, focus, active, disabled, error, loading.

### WASM Testing

```bash
cd bounded-contexts/component-lifecycle
cargo test
wasm-pack test --headless --chrome
```

### Performance Testing

```bash
# Run Lighthouse CI
npm run lighthouse

# Check bundle size
npm run bundle-check

# Monitor memory usage
# Use Chrome DevTools → Performance → Memory
```

## 🤝 Contributing

We welcome contributions that advance the Harmony vision!

### Development Workflow

1. **Check existing structure** - Review file list to avoid duplicates
2. **Create feature branch** - `git checkout -b feat/your-feature`
3. **Follow patterns** - Reference existing components for structure
4. **Meet quality gates** - All tests and budgets must pass
5. **Update documentation** - Modify `DESIGN_SYSTEM.md` (mandatory)
6. **Submit PR** - Include screenshots for UI changes

### Code Standards

#### JavaScript/HTML/CSS

- **No frameworks** - Vanilla JS + Web Components only
- **No npm runtime dependencies** - Build tools only
- **Shadow DOM required** - All components use shadow DOM
- **JSDoc comments** - Document all public APIs
- **Event-driven** - Components publish events, never call BCs directly

```javascript
/**
 * Button component with multiple variants.
 * @fires ButtonClicked - When button is activated
 * @example
 * <harmony-button variant="primary">Save</harmony-button>
 */
class HarmonyButton extends HTMLElement {
  // Implementation
}
```

#### Rust/WASM

- **Schema-first** - Modify `harmony-schemas`, then run codegen
- **No direct edits** - Don't edit generated Rust code
- **Memory safe** - Use Rust's ownership system
- **Error handling** - Return Result types, never panic

```rust
/// Processes audio buffer with GPU acceleration.
/// Returns processed samples or error.
pub fn process_audio(input: &[f32]) -> Result<Vec<f32>, AudioError> {
    // Implementation
}
```

### Schema Changes

When modifying data structures:

```bash
# 1. Edit schema
cd harmony-schemas
nano src/component.rs

# 2. Run codegen
cargo build
./target/release/codegen

# 3. Verify generated code compiles
cd ../bounded-contexts/component-lifecycle
cargo build

# 4. Commit schema + generated code together
git add harmony-schemas/ bounded-contexts/
git commit -m "feat: update component schema"
```

### Commit Message Format

```
feat(task-id): Brief description

Longer explanation if needed.

- List specific changes
- Reference related tasks
- Note breaking changes
```

### Pull Request Checklist

- [ ] All quality gates pass (CI build, bundle size, Lighthouse)
- [ ] UI components tested in Chrome (all states verified)
- [ ] WASM modules compile and pass tests
- [ ] Performance budgets met (16ms render, 50MB memory, 200ms load)
- [ ] `DESIGN_SYSTEM.md` updated with new concepts/APIs
- [ ] JSDoc comments on all public APIs
- [ ] No nested directories (`harmony-design/harmony-design/` is invalid)
- [ ] No runtime npm dependencies added
- [ ] EventBus communication pattern followed

### Common Issues

#### Nested Directory Structure

If you see `harmony-design/harmony-design/`, fix it:

```powershell
Move-Item -Path "harmony-design/harmony-design/*" -Destination "harmony-design/" -Force
Remove-Item -Path "harmony-design/harmony-design" -Recurse
```

#### Schema/Codegen Out of Sync

```bash
cd harmony-schemas
cargo build --release
./target/release/codegen
git add ../bounded-contexts/
```

#### Performance Budget Exceeded

- Use Chrome DevTools Performance panel
- Profile WASM with `wasm-opt`
- Check bundle size: `npm run bundle-check`
- Review GPU usage in WebGPU inspector

## 🎨 Design Tokens

Design tokens are defined in `/tokens/`:

- `colors.json` - Color palette and semantic colors
- `typography.json` - Font scales, weights, line heights
- `spacing.json` - Spacing scale (4px base unit)
- `motion.json` - Animation durations and easings

Tokens are consumed by components via CSS custom properties:

```css
:host {
  --button-bg: var(--color-primary-500);
  --button-padding: var(--spacing-md);
  --button-transition: var(--motion-duration-fast);
}
```

## 🔧 Project Structure

```
harmony-design/
├── components/           # UI components (vanilla JS + Web Components)
│   ├── primitives/      # Atomic elements
│   ├── molecules/       # Simple compositions
│   └── organisms/       # Complex sections
├── bounded-contexts/    # WASM modules (Rust)
│   ├── component-lifecycle/
│   ├── full-text-index/
│   ├── spatial-index/
│   └── wasm-bridge/
├── core/                # Core utilities (EventBus, TypeNavigator)
├── tokens/              # Design tokens (JSON)
├── templates/           # Page layouts
├── examples/            # Usage examples
├── tests/               # Integration tests
├── harmony-schemas/     # Rust schema definitions
├── DESIGN_SYSTEM.md     # Complete documentation
└── README.md           # This file
```

## 🐛 Debugging

### EventBus Inspector

Press `Ctrl+Shift+E` to open the EventBus inspector (available on all pages):

- View all published events in real-time
- Inspect event payloads
- Filter by event type
- Replay events for testing

### Performance Monitoring

```javascript
// Access performance metrics
const metrics = window.harmonyMetrics;
console.log('LCP:', metrics.getLCP());
console.log('FID:', metrics.getFID());
console.log('CLS:', metrics.getCLS());
```

### WASM Debugging

```bash
# Build with debug symbols
cargo build --target wasm32-unknown-unknown

# Use wasm-objdump for inspection
wasm-objdump -x target/wasm32-unknown-unknown/debug/module.wasm
```

## 📊 Monitoring

Health checks available at:

- `/health/readiness` - Component ready state
- `/health/liveness` - System health
- `/health/metrics` - Performance metrics (JSON)

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

Built with modern web standards:

- Web Components (Custom Elements, Shadow DOM, HTML Templates)
- WebAssembly (Rust → WASM compilation)
- WebGPU (GPU-accelerated compute and audio)
- Web Audio API (AudioWorklet, SharedArrayBuffer)

## 📞 Support

- Documentation: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)
- Issues: [GitHub Issues](https://github.com/your-org/harmony-design/issues)
- Discussions: [GitHub Discussions](https://github.com/your-org/harmony-design/discussions)

---

**Status**: Active Development | **Version**: 0.1.0 | **Last Updated**: 2025-01-XX