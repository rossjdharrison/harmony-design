# Installation Guide

This guide helps you set up the Harmony Design System for development or integration into your project.

## Prerequisites

Before you start, make sure you have:

- **Node.js** 18 or higher
- **npm** 9 or higher
- **Git** for version control
- **Rust** 1.70+ and **wasm-pack** (for WASM development)
- A modern browser (Chrome 90+, Firefox 88+, Safari 15+)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/harmony-design.git
cd harmony-design
```

### 2. Install Development Tools

```bash
npm install
```

**Note:** npm packages are only for development tools (build, test, dev servers). No runtime dependencies are installed.

### 3. Set Up Environment

Copy the example environment file:

```bash
cp .env.example .env.development
```

Edit `.env.development` to configure your local settings.

### 4. Build WASM Modules

The system uses Rust-compiled WASM for core functionality:

```bash
# Build all bounded contexts
npm run build:wasm

# Or build individual modules
cd bounded-contexts/component-lifecycle
wasm-pack build --target web
```

### 5. Start Development Server

```bash
npm run dev
```

Open your browser to `http://localhost:3000` to see the design system.

## Detailed Setup

### Installing Rust and WASM Tools

If you don't have Rust installed:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### Project Structure Overview

```
harmony-design/
├── components/          # Web Components (vanilla JS)
├── bounded-contexts/    # Rust WASM modules
├── docs/               # Documentation
├── examples/           # Usage examples
├── primitives/         # Atomic design primitives
├── styles/             # CSS tokens and themes
├── tests/              # Test suites
└── DESIGN_SYSTEM.md    # Main documentation
```

See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) for architecture details.

## Development Workflow

### 1. Make Changes

Edit files in the appropriate directory:
- UI components: `components/`, `primitives/`, `organisms/`
- Core logic: `bounded-contexts/` (Rust)
- Styles: `styles/`, `tokens/`

### 2. Test in Browser

All UI components must be tested in Chrome before completion:

```bash
# Run test server
npm run test:serve

# Open test page
# Navigate to http://localhost:8080/test-pages/your-component.html
```

Verify all states: default, hover, focus, active, disabled, error, loading.

### 3. Run Quality Gates

```bash
# Run all checks
npm run quality:check

# Individual checks
npm run lint
npm run test
npm run build:check
```

### 4. Commit Changes

The project uses Husky pre-commit hooks:

```bash
git add .
git commit -m "feat(component): description"
```

Hooks automatically run linting and basic checks.

## Building for Production

### Build All Assets

```bash
npm run build
```

This creates:
- Compiled WASM modules in `dist/wasm/`
- Bundled components in `dist/components/`
- Optimized styles in `dist/styles/`

### Build Individual Modules

```bash
# Build only WASM
npm run build:wasm

# Build only components
npm run build:components

# Build only styles
npm run build:styles
```

## Integration into Your Project

### Option 1: Direct File Integration

Copy built files from `dist/` into your project:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="path/to/harmony-design/dist/styles/tokens.css">
</head>
<body>
  <script type="module" src="path/to/harmony-design/dist/components/button.js"></script>
  <harmony-button>Click Me</harmony-button>
</body>
</html>
```

### Option 2: CDN Integration

```html
<script type="module" src="https://cdn.example.com/harmony-design/v1/components/button.js"></script>
<harmony-button>Click Me</harmony-button>
```

### Option 3: Development Integration

Symlink the repository for live development:

```bash
# In your project directory
ln -s /path/to/harmony-design ./harmony-design

# In your HTML
<script type="module" src="./harmony-design/components/button.js"></script>
```

## Configuration

### Environment Variables

Create `.env.development` for local development:

```env
# Performance budgets
RENDER_BUDGET_MS=16
MEMORY_BUDGET_MB=50
LOAD_BUDGET_MS=200

# Feature flags
ENABLE_GPU_AUDIO=true
ENABLE_WASM_NODES=true

# Development
DEV_SERVER_PORT=3000
HOT_RELOAD=true
```

See [.env.example](../.env.example) for all options.

### Performance Budgets

The system enforces strict performance budgets:

- **Render**: 16ms per frame (60fps)
- **Memory**: 50MB WASM heap
- **Load**: 200ms initial load
- **Audio**: 10ms end-to-end latency

Configure in `.github/performance-budget.json`.

## Testing Your Setup

### 1. Verify WASM Modules

```bash
npm run test:wasm
```

### 2. Verify Components

Open `test-pages/demo-components.html` in Chrome and verify:
- All components render
- Interactions work (click, hover, focus)
- No console errors

### 3. Verify Performance

```bash
npm run test:performance
```

Should report all metrics within budget.

## Troubleshooting

### WASM Build Fails

**Problem:** `wasm-pack` command not found

**Solution:** Install wasm-pack:
```bash
cargo install wasm-pack
```

### Components Not Rendering

**Problem:** Components appear but don't render correctly

**Solution:** Check that WASM modules are built:
```bash
npm run build:wasm
ls -la bounded-contexts/component-lifecycle/pkg/
```

### Performance Budget Exceeded

**Problem:** Build fails with "Performance budget exceeded"

**Solution:** Profile your changes:
```bash
npm run profile
# Open Chrome DevTools Performance panel
# Look for long tasks (>50ms)
```

See [performance/README.md](../performance/README.md) for optimization tips.

### Module Not Found Errors

**Problem:** `Cannot find module` errors in console

**Solution:** Ensure you're using ES modules:
```html
<script type="module" src="..."></script>
```

Not:
```html
<script src="..."></script>
```

### Git Hooks Failing

**Problem:** Pre-commit hook fails

**Solution:** Run checks manually:
```bash
npm run lint:fix
npm run test
git add .
git commit -m "..."
```

## Next Steps

After installation:

1. **Read the documentation**: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)
2. **Try examples**: Open files in `examples/` directory
3. **Explore components**: Browse `components/` and `primitives/`
4. **Run demos**: Open `demo-components.html` in your browser
5. **Join development**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

## Advanced Setup

### Desktop Development (Tauri)

For desktop app development:

```bash
# Install Tauri CLI
cargo install tauri-cli

# Run desktop app
cargo tauri dev
```

See [desktop/README.md](../desktop/README.md) for details.

### GPU Audio Processing

Enable GPU-accelerated audio:

```bash
# Set environment variable
export ENABLE_GPU_AUDIO=true

# Build with GPU support
npm run build:wasm -- --features gpu-audio
```

Requires WebGPU support in browser (Chrome 113+).

### Schema Development

When modifying data schemas:

```bash
# Navigate to schemas
cd harmony-schemas

# Edit schema files
# ...

# Run codegen
npm run codegen

# Verify compilation
cargo check

# Commit schema + generated code together
git add .
git commit -m "feat(schema): updated component schema"
```

**Important:** CI fails if schema changed but generated code is stale.

## Getting Help

- **Documentation**: [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)
- **Examples**: `examples/` directory
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## Version Requirements

| Tool | Minimum | Recommended |
|------|---------|-------------|
| Node.js | 18.0.0 | 20.0.0+ |
| npm | 9.0.0 | 10.0.0+ |
| Rust | 1.70.0 | 1.75.0+ |
| Chrome | 90 | Latest |
| Firefox | 88 | Latest |
| Safari | 15 | Latest |

## License

See [LICENSE](../LICENSE) for details.