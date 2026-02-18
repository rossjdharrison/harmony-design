# Harmony Design System

A complete design system for building audio production interfaces with consistent visual language, accessible components, and performance-first architecture.

## Overview

Harmony is a design system built for professional audio applications. It provides design tokens, reusable components, and clear patterns for creating interfaces that are both beautiful and functional.

**Key Principles:**
- **Performance First**: 60fps animations, <16ms render budget, <200ms load time
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support
- **Consistency**: Unified visual language through design tokens
- **Modularity**: Atomic design methodology with clear component hierarchy

## Getting Started

### Quick Start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="styles/tokens.css">
</head>
<body>
  <harmony-button variant="primary">Click Me</harmony-button>
  <script type="module" src="components/controls/harmony-button.js"></script>
</body>
</html>
```

### Design Tokens

Design tokens are the foundation of the visual design system. They store design decisions as data and ensure consistency across all components.

**Token Categories:**
- **Colors**: Primary and neutral scales with semantic naming
- **Typography**: Font families, sizes, weights, and line heights
- **Spacing**: Consistent spacing scale for layout and components
- **Elevation**: Shadow tokens for depth and hierarchy

#### Color Tokens

**Primary Scale (50-950)**

The primary color scale provides 11 shades for the main brand color. See [tokens/colors.json](tokens/colors.json).

Usage patterns:
- **50-200**: Subtle backgrounds, tinted surfaces
- **400-600**: Interactive elements, buttons, CTAs
- **700-950**: Text on light backgrounds, emphasis

Example:
```css
.button-primary {
  background: var(--color-primary-500);
  color: white;
}

.button-primary:hover {
  background: var(--color-primary-600);
}
```

**Neutral/Gray Scale (50-950)**

The neutral scale provides 11 achromatic shades for surfaces, text, and UI elements. This is the workhorse of the color system, used for establishing visual hierarchy and ensuring proper contrast ratios. See [tokens/colors.json](tokens/colors.json).

Usage patterns:
- **50-100**: Page and card backgrounds, subtle surfaces
- **200-300**: Borders, dividers, separator lines
- **300-400**: Disabled states, inactive elements
- **400-500**: Placeholder text, secondary icons
- **500-700**: Secondary and body text
- **700-800**: Headings, emphasized text
- **900-950**: Primary text, maximum contrast elements

The neutral scale is designed with accessibility in mind. All text color combinations meet WCAG 2.1 AA contrast requirements:
- Neutral-900 on Neutral-50: 17.6:1 contrast ratio
- Neutral-700 on Neutral-50: 9.8:1 contrast ratio
- Neutral-600 on Neutral-100: 7.2:1 contrast ratio

Example:
```css
.card {
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  color: var(--color-neutral-900);
}

.card-subtitle {
  color: var(--color-neutral-600);
}

.card-disabled {
  color: var(--color-neutral-400);
  background: var(--color-neutral-100);
}
```

**Visual Token Catalog**

Browse all tokens with live previews: [docs/tokens/token-catalog.html](docs/tokens/token-catalog.html)

### Using Tokens in JavaScript

```javascript
import { getToken } from './core/token-hook.js';

const primaryColor = getToken('color.primary.500');
const neutralText = getToken('color.neutral.700');
const neutralBorder = getToken('color.neutral-200');
```

See: [core/token-hook.js](core/token-hook.js)

### Token Provider

The TokenProvider manages theme state and provides tokens to components:

```javascript
import './core/token-provider.js';

// TokenProvider automatically loads and provides tokens
// Components can access via getToken() or CSS custom properties
```

See: [core/token-provider.js](core/token-provider.js)

## Component Architecture

### Atomic Design Hierarchy

Harmony uses atomic design methodology to organize components:

1. **Primitives** (Atoms): Basic building blocks (buttons, inputs, labels)
2. **Molecules**: Simple component groups (labeled inputs, icon buttons)
3. **Organisms**: Complex UI sections (navigation bars, forms)
4. **Templates**: Page-level layouts
5. **Pages**: Specific implementations

See: [docs/atomic-design-hierarchy.md](docs/atomic-design-hierarchy.md)

### Web Components

All UI components are built as Web Components with shadow DOM:

```javascript
class HarmonyButton extends HTMLElement {
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
        button {
          background: var(--color-primary-500);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
        }
      </style>
      <button><slot></slot></button>
    `;
  }
}

customElements.define('harmony-button', HarmonyButton);
```

### Event-Driven Communication

Components communicate through the EventBus, never calling bounded contexts directly:

```javascript
// Component publishes event
this.dispatchEvent(new CustomEvent('harmony-action', {
  bubbles: true,
  composed: true,
  detail: { action: 'play', trackId: '123' }
}));

// EventBus routes to appropriate bounded context
// Bounded context processes and publishes result
```

See: [core/event-bus.js](core/event-bus.js)

## Token Transformation Pipeline

Tokens are transformed from source JSON to multiple output formats:

1. **Source**: DTCG-format JSON in `tokens/` directory
2. **Build**: Style Dictionary transforms tokens
3. **Output**: CSS custom properties, TypeScript declarations, documentation

Run the build:
```bash
node scripts/build-tokens.js
```

See: [scripts/build-tokens.js](scripts/build-tokens.js)

## Development Tools

### Token Catalog

Interactive visual catalog of all design tokens:
- [docs/tokens/token-catalog.html](docs/tokens/token-catalog.html)

### Token-Component Matrix

Documentation showing which components use which tokens:
- [docs/tokens/token-component-matrix.js](docs/tokens/token-component-matrix.js)

### EventBus Debugger

Real-time event monitoring (Ctrl+Shift+E):
- [components/event-bus-debugger.js](components/event-bus-debugger.js)

### Color Contrast Validator

Validates WCAG contrast ratios:
- [components/color-contrast-validator.js](components/color-contrast-validator.js)

## Performance Requirements

All components must meet these budgets:

- **Render Budget**: 16ms per frame (60fps)
- **Memory Budget**: 50MB WASM heap maximum
- **Load Budget**: 200ms initial load time
- **Audio Latency**: 10ms end-to-end maximum

## Testing Requirements

All UI components must be tested in Chrome before completion:
- Default, hover, focus, active, disabled states
- Error states, loading states, empty states
- 60fps animation performance (Chrome DevTools Performance panel)

## Architecture Decisions

### Technology Choices

- **UI Layer**: Vanilla HTML/CSS/JavaScript with Web Components
- **Core Logic**: Rust compiled to WASM for bounded contexts
- **Build Tools**: Node.js/npm for development only (no runtime dependencies)
- **Desktop Wrapper**: Tauri (not Electron)

### No Runtime Dependencies

The system uses zero npm packages in production. All runtime code is vanilla JavaScript to ensure:
- Minimal bundle size
- Maximum performance
- Long-term stability
- No dependency vulnerabilities

## Documentation

This file (DESIGN_SYSTEM.md) is the single source of truth for system documentation. Code files contain minimal comments with references back to relevant sections here.

## Contributing

When implementing new features:

1. Define tokens first in `tokens/` directory
2. Build components using those tokens
3. Test all states in Chrome
4. Update this documentation
5. Ensure all quality gates pass

See individual component files for implementation details.