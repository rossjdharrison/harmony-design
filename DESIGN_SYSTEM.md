# Harmony Design System

A comprehensive design system for building audio production interfaces with consistent visual language and behavior.

## Overview

The Harmony Design System provides design tokens, UI components, and patterns for creating professional audio production tools. It follows atomic design principles and emphasizes performance, accessibility, and consistency.

## Design Tokens

Design tokens are the visual design atoms of the system. They define colors, spacing, typography, and other fundamental visual properties.

### Color Palette

The system uses a carefully crafted color palette with semantic meaning:

- **Primary colors**: Main brand colors for key interactive elements
- **Accent colors**: Blue, green, red, yellow for status and feedback
- **Alpha variants**: Transparency levels for overlays and layering

See implementation: [tokens/colors.js](./tokens/colors.js)  
Interactive demo: [docs/tokens/accent-colors.html](./docs/tokens/accent-colors.html)

### Spacing Scale

A consistent spacing system based on a 4px base unit (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24).

See implementation: [tokens/spacing.js](./tokens/spacing.js)

### Typography

#### Font Size Scale
Eight-step scale from xs (10px) to 3xl (32px) for hierarchical text sizing.

See implementation: [tokens/font-size.js](./tokens/font-size.js)  
Interactive demo: [docs/tokens/font-size-scale.html](./docs/tokens/font-size-scale.html)

#### Font Weight
Three weights for emphasis: regular (400), medium (500), semibold (600).

See implementation: [tokens/font-weight.js](./tokens/font-weight.js)  
Interactive demo: [docs/tokens/font-weight.html](./docs/tokens/font-weight.html)

#### Line Height
Three options for text density: tight (1.2), normal (1.5), relaxed (1.8).

See implementation: [tokens/line-height.js](./tokens/line-height.js)  
Interactive demo: [docs/tokens/line-height.html](./docs/tokens/line-height.html)

#### Letter Spacing
Three tracking options: tight (-0.02em), normal (0), loose (0.05em).

See implementation: [tokens/letter-spacing.js](./tokens/letter-spacing.js)  
Interactive demo: [docs/tokens/letter-spacing.html](./docs/tokens/letter-spacing.html)

### Border Tokens

#### Border Radius
Six levels from none (0) to 2xl (16px) for varying corner roundness.

See implementation: [tokens/border-radius.js](./tokens/border-radius.js)  
Interactive demo: [docs/tokens/border-radius.html](./docs/tokens/border-radius.html)

#### Border Width
Four widths: none (0), thin (1px), default (2px), thick (4px).

See implementation: [tokens/border-width.js](./tokens/border-width.js)

### Shadow Tokens

Six elevation levels (none, sm, default, md, lg, xl) create visual hierarchy through depth and layering. Shadows use multiple layers for realistic depth perception.

**Usage guidelines:**
- **none**: Flat elements, on-surface components, disabled states
- **sm**: Subtle elevation for cards at rest, list items
- **default**: Standard elevation for buttons, cards, interactive elements
- **md**: Raised elements like dropdowns, popovers, tooltips
- **lg**: Modal dialogs, drawers, prominent overlays
- **xl**: Critical notifications, alerts, top-level modals

See implementation: [tokens/shadow.js](./tokens/shadow.js)  
Interactive demo: [docs/tokens/shadow.html](./docs/tokens/shadow.html)

## Components

Components are built using Web Components with shadow DOM for encapsulation.

### Primitives

Basic building blocks like buttons, inputs, and labels.

### Molecules

Combinations of primitives like labeled inputs and button groups.

### Organisms

Complex components like transport bars and mixer channels.

See implementations: [components/](./components/)

## Architecture

### Event-Driven Communication

Components communicate through an event bus rather than direct coupling. This enables loose coupling and testability.

See implementation: [core/event-bus.js](./core/event-bus.js)

### Token System

Design tokens are applied through CSS custom properties, allowing runtime theming and easy updates.

See implementation: [core/token-provider.js](./core/token-provider.js)

### Validation

Component schemas ensure type safety and consistent APIs.

See implementation: [core/validation/](./core/validation/)

## Performance

The system adheres to strict performance budgets:

- **Render Budget**: 16ms per frame (60fps)
- **Memory Budget**: 50MB WASM heap
- **Load Budget**: 200ms initial load
- **Audio Latency**: 10ms end-to-end

## Getting Started

1. Include the token provider in your HTML
2. Import required components
3. Use design tokens via CSS custom properties
4. Follow component patterns and guidelines

## Development

All code uses vanilla JavaScript, HTML, and CSS. No frameworks or runtime dependencies.

See development tools: [components/dev-tools/](./components/dev-tools/)

## Testing

Components must be tested in Chrome before completion, verifying all states (default, hover, focus, active, disabled).

See test pages: [test-pages/](./test-pages/)