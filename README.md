# Harmony Design System

A design system for building music applications with consistent design and excellent performance.

## Quick Start

1. Clone the repository
2. Open `harmony-ui/templates/app-shell.html` in a browser
3. Press `Ctrl+Shift+E` to open the EventBus Monitor

## Documentation

See [DESIGN_SYSTEM.md](harmony-design/DESIGN_SYSTEM.md) for complete documentation.

## Architecture

- **UI**: Vanilla Web Components (HTML/CSS/JS)
- **Core Logic**: Rust → WebAssembly
- **Communication**: Event-driven via EventBus

## Performance Budgets

- Render: 16ms per frame (60fps)
- Memory: 50MB WASM heap max
- Load: 200ms initial load max

## Project Structure

```
harmony-design/          # Documentation and design specs
harmony-core/           # Core WASM modules and EventBus
harmony-ui/             # UI components and templates
harmony-schemas/        # Schema definitions
```

## Development

The system uses:
- **Rust/WASM**: Bounded contexts, graph engine, audio processing
- **HTML/CSS/JS**: UI rendering, DOM manipulation
- **Python**: Test servers, build scripts, dev tools
- **npm**: Build tools, dev servers, testing frameworks only

## Contributing

Every task must:
1. Update documentation
2. Pass quality gates
3. Meet performance budgets
4. Be committed and pushed

No technical debt allowed.

## License

(To be determined)