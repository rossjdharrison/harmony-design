# Harmony Design System

A high-performance, GPU-accelerated design system built with Web Components, Rust/WASM, and vanilla JavaScript.

## Overview

Harmony is a modern design system that combines:

- **Reactive Web Components** - Vanilla JavaScript with shadow DOM
- **Rust/WASM Core** - High-performance bounded contexts
- **GPU-First Audio** - WebGPU-accelerated audio processing
- **Atomic Design** - Scalable component architecture
- **Zero Runtime Dependencies** - Pure web standards

## Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/harmony-design.git
cd harmony-design

# Install dev tools
npm install

# Build WASM modules
npm run build:wasm

# Start dev server
npm run dev
```

Open `http://localhost:3000` to see the design system.

## Installation

For detailed setup instructions, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

### Prerequisites

- Node.js 18+
- Rust 1.70+ with wasm-pack
- Modern browser (Chrome 90+, Firefox 88+, Safari 15+)

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="dist/styles/tokens.css">
</head>
<body>
  <script type="module" src="dist/components/button.js"></script>
  <harmony-button variant="primary">Click Me</harmony-button>
</body>
</html>
```

## Documentation

- **[Installation Guide](docs/INSTALLATION.md)** - Step-by-step setup
- **[Design System](DESIGN_SYSTEM.md)** - Architecture and concepts
- **[Contributing](CONTRIBUTING.md)** - Development workflow
- **[Examples](examples/)** - Usage examples

## Architecture

### Core Principles

1. **Performance First** - 16ms render budget, 50MB memory limit
2. **Web Standards** - No frameworks, pure Web Components
3. **Type Safety** - Rust for core logic, TypeScript for tooling
4. **Progressive Enhancement** - Works without JavaScript

### Technology Stack

- **UI Layer**: Web Components (vanilla JS), Shadow DOM, CSS Custom Properties
- **Core Logic**: Rust compiled to WASM
- **Audio**: WebGPU + AudioWorklet + SharedArrayBuffer
- **State**: EventBus pattern, no global state
- **Build**: npm (dev tools only), wasm-pack, custom scripts

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for detailed architecture.

## Project Structure

```
harmony-design/
├── components/          # Web Components
├── primitives/          # Atomic design primitives
├── organisms/           # Complex components
├── bounded-contexts/    # Rust WASM modules
│   ├── component-lifecycle/
│   ├── wasm-bridge/
│   └── spatial-index/
├── styles/              # CSS tokens and themes
├── docs/                # Documentation
├── examples/            # Usage examples
├── tests/               # Test suites
└── DESIGN_SYSTEM.md     # Main documentation
```

## Performance Budgets

Harmony enforces strict performance budgets:

- **Render**: 16ms per frame (60fps)
- **Memory**: 50MB WASM heap
- **Load**: 200ms initial load time
- **Audio**: 10ms end-to-end latency

All budgets are enforced in CI via quality gates.

## Features

### Web Components

- Custom elements with shadow DOM
- Reactive properties and attributes
- Event-driven communication
- No framework dependencies

### WASM Bounded Contexts

- Component lifecycle management
- Spatial indexing for large graphs
- Full-text search
- Audio processing nodes

### GPU Audio Processing

- WebGPU compute shaders for DSP
- SharedArrayBuffer for zero-copy transfer
- AudioWorklet integration
- 10ms latency target

### Developer Experience

- Hot reload in development
- Comprehensive test pages
- Performance profiling tools
- EventBus debugger UI

## Development

### Run Tests

```bash
# All tests
npm test

# Specific tests
npm run test:wasm
npm run test:components
npm run test:performance
```

### Quality Gates

```bash
# Run all quality checks
npm run quality:check

# Individual gates
npm run lint
npm run build:check
npm run test:coverage
```

### Build for Production

```bash
npm run build
```

Output in `dist/` directory.

## Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90 | Full support including WebGPU (113+) |
| Firefox | 88 | WebGPU experimental |
| Safari | 15 | WebGPU in Technology Preview |
| Edge | 90 | Chromium-based, full support |

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development workflow
- Code style guidelines
- Testing requirements
- Pull request process

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run quality gates: `npm run quality:check`
5. Test in Chrome (all component states)
6. Submit pull request

## Examples

### Basic Button

```html
<script type="module" src="components/button.js"></script>
<harmony-button variant="primary" size="large">
  Click Me
</harmony-button>
```

### Event Handling

```javascript
const button = document.querySelector('harmony-button');
button.addEventListener('harmony-click', (e) => {
  console.log('Button clicked:', e.detail);
});
```

### WASM Integration

```javascript
import init, { ComponentLifecycle } from './bounded-contexts/component-lifecycle/pkg/component_lifecycle.js';

await init();
const lifecycle = new ComponentLifecycle();
lifecycle.mount('my-component', config);
```

See [examples/](examples/) for more.

## Troubleshooting

### WASM Build Issues

```bash
# Reinstall Rust toolchain
rustup update
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# Rebuild
npm run build:wasm
```

### Component Not Rendering

1. Check browser console for errors
2. Verify WASM modules are built: `ls bounded-contexts/*/pkg/`
3. Ensure using `<script type="module">`
4. Check shadow DOM in DevTools

See [docs/INSTALLATION.md](docs/INSTALLATION.md#troubleshooting) for more.

## Performance

### Monitoring

```bash
# Run performance tests
npm run test:performance

# Profile in browser
npm run profile
```

### Optimization Tips

- Use CSS containment: `contain: layout style paint`
- Batch DOM updates with `requestAnimationFrame`
- Minimize shadow DOM boundary crossings
- Use WASM for compute-heavy operations

See [performance/README.md](performance/README.md) for detailed optimization guide.

## Roadmap

- [ ] WebGPU audio processing (in progress)
- [ ] Desktop app with Tauri
- [ ] Advanced animation system
- [ ] Component marketplace
- [ ] Visual editor

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built with:
- Web Components
- Rust + WebAssembly
- WebGPU
- Modern web standards

## Links

- **Documentation**: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- **Installation**: [docs/INSTALLATION.md](docs/INSTALLATION.md)
- **Examples**: [examples/](examples/)
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

**Status**: Active Development  
**Version**: 0.1.0-alpha  
**Last Updated**: 2024