# Harmony Design System

This document describes how the Harmony Design System works. It uses simple English and links to code files. The code files contain the actual implementation.

## Overview

Harmony is a design system for a digital audio workstation (DAW). It provides reusable UI components, design tokens, and patterns for building audio production interfaces.

## Design Tokens

Design tokens are the visual design atoms of the system. They store values for colors, spacing, typography, and other design decisions.

### Token Files

- [tokens/colors.json](tokens/colors.json) - Color palette including brand colors, semantic colors, and neutral grays
- [tokens/spacing.json](tokens/spacing.json) - Spacing scale from 0px to 128px for consistent layout rhythm
- [tokens/token-schema.json](tokens/token-schema.json) - JSON Schema that validates all token files

### Spacing Scale

The spacing scale uses a base unit of 4px for alignment with an 8px grid system. Values range from 0px (flush layouts) to 128px (dramatic spacing).

**Common usage:**
- `spacing-1` (4px) - Icon gaps, tight controls
- `spacing-2` (8px) - Compact UI elements
- `spacing-4` (16px) - Default component padding (most common)
- `spacing-5` (24px) - Section gaps
- `spacing-6` (32px) - Major layout divisions

Audio controls often use tighter spacing (spacing-1, spacing-2) for dense mixer and transport layouts.

### Color System

The color system includes:
- **Brand colors** - Primary brand identity (harmony-blue family)
- **Semantic colors** - Success, warning, error, info states
- **Neutral colors** - Grays for backgrounds and text
- **Transparency values** - Alpha channels for overlays and shadows

See [tokens/colors.json](tokens/colors.json) for the complete palette.

### Token Loading

Tokens are loaded at runtime using the token loader:

- [tokens/token-loader.js](tokens/token-loader.js) - Loads and caches token JSON files
- [tokens/token-validator.js](tokens/token-validator.js) - Validates tokens against schema
- [tokens/token-watcher.js](tokens/token-watcher.js) - Hot-reloads tokens during development

**Usage example:**
```javascript
import { loadTokens } from './tokens/token-loader.js';

const colors = await loadTokens('colors');
const spacing = await loadTokens('spacing');

element.style.padding = `${spacing.tokens['spacing-4'].value}px`;
element.style.color = colors.tokens['primary-500'].value;
```

### Token Transform Pipeline

The transform pipeline processes raw tokens into platform-specific formats:

- [tokens/token-transformer.js](tokens/token-transformer.js) - Transforms tokens to CSS variables, JS modules, and other formats

**Supported outputs:**
- CSS custom properties (`:root { --spacing-4: 16px; }`)
- JavaScript modules (ES6 exports)
- TypeScript definitions
- Platform-specific formats (iOS, Android)

### Figma Sync

Tokens can be synchronized bidirectionally with Figma:

- [tokens/figma-token-sync.js](tokens/figma-token-sync.js) - Syncs tokens between code and Figma

This keeps design files and code in sync automatically.

## Components

Components are organized by complexity level:

- **Primitives** - Basic building blocks (buttons, inputs, sliders)
- **Molecules** - Simple combinations (labeled inputs, icon buttons)
- **Organisms** - Complex UI sections (mixer channels, transport bars)
- **Templates** - Page layouts (project view, mixer view)

All components use Web Components with shadow DOM. No frameworks.

### Audio-Specific Components

- [components/controls/harmony-fader.js](components/controls/harmony-fader.js) - Audio fader control with dB scale
- [components/composites/transport-bar/transport-bar.js](components/composites/transport-bar/transport-bar.js) - Playback controls
- [components/composites/clip/clip.js](components/composites/clip/clip.js) - Audio clip representation

### Development Tools

- [components/dev-tools/component-graph-event-log.js](components/dev-tools/component-graph-event-log.js) - Debug event flow
- [components/event-bus-debugger.js](components/event-bus-debugger.js) - Inspect EventBus messages
- [components/color-contrast-validator.js](components/color-contrast-validator.js) - Check WCAG compliance

## Event Architecture

Components communicate through an event bus. Components never call bounded contexts directly.

**Pattern:**
1. User interacts with component
2. Component publishes event to EventBus
3. EventBus routes to appropriate bounded context
4. Bounded context processes command
5. Bounded context publishes result event
6. UI components subscribe to result and update

The EventBus debugger (Ctrl+Shift+E) shows all events in real-time.

## Performance Budgets

All code must meet these targets:

- **Render Budget:** 16ms per frame (60fps)
- **Memory Budget:** 50MB WASM heap maximum
- **Load Budget:** 200ms initial load time
- **Audio Latency:** 10ms end-to-end maximum

Use Chrome DevTools Performance panel to verify. Animations must maintain 60fps.

## Testing Requirements

All UI components must be tested in Chrome before completion:

- Test all states: default, hover, focus, active, disabled
- For complex components: error states, loading states, empty states
- Verify animations maintain 60fps using Performance panel
- Check accessibility (keyboard navigation, screen readers)

## Technology Constraints

- **Core logic, bounded contexts, audio processing:** Rust compiled to WASM
- **UI rendering, DOM manipulation:** Vanilla HTML/CSS/JavaScript
- **No runtime npm dependencies** - Only build tools and dev servers
- **No frameworks** - Web Components only
- **Shadow DOM required** - Encapsulation for all components

## File Organization

```
harmony-design/
├── tokens/              # Design tokens (JSON files)
├── components/          # UI components (Web Components)
│   ├── controls/       # Form controls and inputs
│   ├── composites/     # Complex audio UI components
│   └── dev-tools/      # Development and debugging tools
├── styles/             # Global styles and CSS utilities
├── bounded-contexts/   # Rust bounded contexts (compiled to WASM)
└── harmony-schemas/    # Schema definitions for code generation
```

## Schema-Driven Development

When changing Rust behavior:

1. Navigate to `harmony-schemas/`
2. Modify the schema definition
3. Run code generation pipeline
4. Verify compilation

**Never edit generated Rust code directly.** Always change the schema and regenerate.

## Contributing

Before committing:

1. Run quality gates (linting, tests, performance checks)
2. Update this documentation if adding new concepts
3. Ensure all policies in task system are satisfied
4. Test components in Chrome (all states)
5. Push changes to remote (required before next task)

## Questions?

This document describes concepts and patterns. For implementation details, see the linked code files. Code files contain minimal comments that reference back to relevant sections here.