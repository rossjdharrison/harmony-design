# Harmony Design System

This document describes the Harmony Design System architecture, implementation patterns, and usage guidelines.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Design Tokens](#design-tokens)
4. [Primitives](#primitives)
5. [Components](#components)
6. [Event System](#event-system)
7. [Performance](#performance)
8. [Accessibility](#accessibility)
9. [Testing](#testing)

## Overview

Harmony is a design system built for high-performance audio applications. It uses vanilla JavaScript, Web Components, and design tokens to create a consistent, accessible user interface.

### Key Principles

- **Performance First**: 60fps animations, <16ms frame budget
- **Accessibility**: WCAG 2.1 AA compliant
- **No Dependencies**: Pure vanilla JavaScript, no frameworks
- **Web Standards**: Web Components with Shadow DOM
- **Design Tokens**: Centralized theming system

## Architecture

### Technology Stack

- **UI Layer**: Vanilla JavaScript + Web Components
- **Styling**: CSS with design tokens
- **State**: EventBus pattern for component communication
- **Backend**: Rust → WASM for audio processing

### File Structure

```
harmony-design/
├── primitives/          # Atomic UI components
│   ├── spinner/        # Loading indicators
│   ├── icon/           # Icon wrapper
│   ├── text/           # Text component
│   └── ...
├── components/         # Composite components
├── tokens/            # Design tokens
├── core/              # Core utilities
└── DESIGN_SYSTEM.md   # This file
```

## Design Tokens

Design tokens provide a centralized theming system. All components consume tokens via CSS custom properties.

### Token Categories

- **Colors**: `--color-primary`, `--color-border-subtle`
- **Spacing**: `--spacing-sm`, `--spacing-md`, `--spacing-lg`
- **Typography**: `--font-size-body`, `--font-weight-bold`
- **Elevation**: `--shadow-sm`, `--shadow-md`

## Primitives

Primitives are atomic UI components that cannot be broken down further.

### Spinner

Loading indicator with size variants.

**File**: [primitives/spinner/harmony-spinner.js](primitives/spinner/harmony-spinner.js)

**Usage**:
```html
<harmony-spinner size="medium"></harmony-spinner>
```

**Sizes**: `small` (16px), `medium` (32px), `large` (48px)

**Performance**: GPU-accelerated CSS animations, 60fps target

**Accessibility**: Includes `role="status"` and `aria-label`

See [primitives/spinner/README.md](primitives/spinner/README.md) for details.

### Icon

SVG icon wrapper with size and color variants.

**File**: [primitives/icon/harmony-icon.js](primitives/icon/harmony-icon.js)

**Usage**:
```html
<harmony-icon name="play" size="medium"></harmony-icon>
```

### Text

Styled text component with semantic variants.

**File**: [primitives/text/harmony-text.js](primitives/text/harmony-text.js)

**Usage**:
```html
<harmony-text variant="heading">Title</harmony-text>
```

### Surface

Background container with elevation levels.

**File**: [primitives/surface/harmony-surface.js](primitives/surface/harmony-surface.js)

### Divider

Horizontal/vertical separator with thickness variants.

**File**: [primitives/divider/harmony-divider.js](primitives/divider/harmony-divider.js)

### Badge

Small status indicator with color variants.

**File**: [primitives/badge/harmony-badge.js](primitives/badge/harmony-badge.js)

### Tooltip

Floating hint with arrow and placement options.

**File**: [primitives/tooltip/harmony-tooltip.js](primitives/tooltip/harmony-tooltip.js)

## Components

Components are composite elements built from primitives.

### Pattern: Event-Driven Communication

Components publish events instead of calling bounded contexts directly:

```javascript
// Component publishes event
this.dispatchEvent(new CustomEvent('action-requested', {
  bubbles: true,
  composed: true,
  detail: { action: 'play' }
}));
```

EventBus routes events to appropriate handlers.

## Event System

### EventBus Pattern

The EventBus provides centralized event routing and debugging.

**File**: [core/event-bus.js](core/event-bus.js)

### Component Events

All components follow this pattern:

1. User interaction triggers event
2. Component dispatches custom event
3. EventBus routes to subscribers
4. Bounded context handles logic
5. Result event updates UI

## Performance

### Budgets

- **Render**: <16ms per frame (60fps)
- **Memory**: <50MB WASM heap
- **Load**: <200ms initial load

### Optimization Techniques

- CSS `contain` for layout optimization
- `will-change` for animation hints
- Shadow DOM for style encapsulation
- GPU-accelerated transforms

### Monitoring

Use Chrome DevTools Performance panel to verify:

1. Frame rate stays at 60fps
2. No long tasks >50ms
3. Memory usage within budget

## Accessibility

### Requirements

- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Reduced motion support

### Implementation

All components include:

- Proper ARIA attributes (`role`, `aria-label`, `aria-live`)
- Keyboard event handlers
- Focus management
- `prefers-reduced-motion` media query support

## Testing

### Browser Testing

All components must be tested in Chrome before completion:

1. Visual appearance matches design
2. All states work (default, hover, focus, active, disabled)
3. Animations run at 60fps
4. Events dispatch correctly
5. Accessibility features work

### Test Pages

Each component includes a `.test.html` file demonstrating:

- All variants and states
- Performance monitoring
- Event logging
- Dynamic controls
- Accessibility features

### Performance Testing

Open Chrome DevTools > Performance:

1. Start recording
2. Interact with component
3. Stop recording
4. Verify no frames exceed 16ms budget

## Contributing

### Adding New Components

1. Create component directory in `primitives/` or `components/`
2. Implement Web Component with Shadow DOM
3. Add JSDoc documentation
4. Create test page
5. Test in Chrome (all states, 60fps)
6. Update this document

### Code Style

- Use JSDoc comments for all public APIs
- Follow EventBus pattern for communication
- Include performance budgets in comments
- Add accessibility attributes
- Use design tokens for styling

### Documentation

This file (DESIGN_SYSTEM.md) is the single source of truth. Code files contain minimal comments that reference relevant sections here.

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0