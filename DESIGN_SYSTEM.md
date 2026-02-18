# Harmony Design System

Welcome to the Harmony Design System documentation. This system provides a complete set of design tokens, components, and patterns for building the Harmony DAW interface.

## Overview

Harmony is a modern Digital Audio Workstation (DAW) built with web technologies. The design system ensures consistency, performance, and maintainability across all UI components.

### Core Principles

1. **Performance First**: All components meet strict performance budgets (16ms render, 50MB memory, 200ms load)
2. **Web Standards**: Built with vanilla JavaScript, Web Components, and Shadow DOM
3. **Token-Based Design**: All visual properties derive from design tokens
4. **Accessibility**: WCAG 2.1 AA compliance throughout
5. **Audio-Optimized**: Specialized components for audio production workflows

## Design Tokens

Design tokens are the foundation of the visual language. They are implemented as JavaScript modules that export both JS constants and CSS custom properties.

### Typography Tokens

#### Font Size Scale
8-step scale providing consistent sizing across all text elements.

- **Implementation**: [`tokens/font-size.js`](tokens/font-size.js)
- **Documentation**: [`docs/tokens/font-size-scale.html`](docs/tokens/font-size-scale.html)
- **Values**: xs (10px), sm (12px), base (14px), md (16px), lg (18px), xl (20px), 2xl (24px), 3xl (32px)

```javascript
import { FONT_SIZE } from './tokens/font-size.js';
element.style.fontSize = FONT_SIZE.base; // 14px
```

#### Font Weight
Standard weight scale for typographic hierarchy.

- **Implementation**: [`tokens/font-weight.js`](tokens/font-weight.js)
- **Documentation**: [`docs/tokens/font-weight.html`](docs/tokens/font-weight.html)
- **Values**: regular (400), medium (500), semibold (600), bold (700)

```javascript
import { FONT_WEIGHT } from './tokens/font-weight.js';
element.style.fontWeight = FONT_WEIGHT.semibold; // 600
```

#### Line Height
Vertical rhythm and text readability control.

- **Implementation**: [`tokens/line-height.js`](tokens/line-height.js)
- **Documentation**: [`docs/tokens/line-height.html`](docs/tokens/line-height.html)
- **Values**: tight (1.2), normal (1.5), relaxed (1.8)

```javascript
import { LINE_HEIGHT } from './tokens/line-height.js';
element.style.lineHeight = LINE_HEIGHT.normal; // 1.5
```

#### Letter Spacing
Horizontal spacing between characters (tracking).

- **Implementation**: [`tokens/letter-spacing.js`](tokens/letter-spacing.js)
- **Documentation**: [`docs/tokens/letter-spacing.html`](docs/tokens/letter-spacing.html)
- **Values**: tight (-0.02em), normal (0), wide (0.02em)

Letter spacing affects readability and visual density:
- **Tight**: Use for headings and display text (18px+) where natural spacing is generous
- **Normal**: Default for most body text and UI elements
- **Wide**: Improves readability for small text (12px and below) and uppercase labels

```javascript
import { LETTER_SPACING } from './tokens/letter-spacing.js';
element.style.letterSpacing = LETTER_SPACING.tight; // -0.02em
```

**Typography Combination Example**:
```javascript
// Heading style
heading.style.fontSize = FONT_SIZE.xl;
heading.style.fontWeight = FONT_WEIGHT.bold;
heading.style.lineHeight = LINE_HEIGHT.tight;
heading.style.letterSpacing = LETTER_SPACING.tight;

// Body text style
body.style.fontSize = FONT_SIZE.base;
body.style.fontWeight = FONT_WEIGHT.regular;
body.style.lineHeight = LINE_HEIGHT.normal;
body.style.letterSpacing = LETTER_SPACING.normal;

// Small label style
label.style.fontSize = FONT_SIZE.sm;
label.style.fontWeight = FONT_WEIGHT.medium;
label.style.textTransform = 'uppercase';
label.style.letterSpacing = LETTER_SPACING.wide;
```

### Layout Tokens

#### Spacing Scale
4px base unit system for consistent spacing and sizing.

- **Implementation**: [`tokens/spacing.js`](tokens/spacing.js)
- **Documentation**: [`docs/tokens/spacing-scale.html`](docs/tokens/spacing-scale.html)
- **Values**: 0 (0px), 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 7 (28px), 8 (32px), 9 (36px), 10 (40px), 11 (44px), 12 (48px)

```javascript
import { SPACING } from './tokens/spacing.js';
element.style.padding = SPACING[4]; // 16px
element.style.gap = SPACING[2]; // 8px
```

### Color Tokens

#### Accent Colors
Semantic colors for interactive elements and feedback.

- **Implementation**: [`tokens/accent-colors.js`](tokens/accent-colors.js)
- **Documentation**: [`docs/tokens/accent-colors.html`](docs/tokens/accent-colors.html)
- **Colors**: blue (primary actions), green (success), red (danger/error), yellow (warning)

```javascript
import { ACCENT_COLORS } from './tokens/accent-colors.js';
button.style.backgroundColor = ACCENT_COLORS.blue[500];
```

#### Alpha Transparency
Overlay and transparency variants for layering and depth.

- **Implementation**: [`tokens/alpha-transparency.js`](tokens/alpha-transparency.js)
- **Documentation**: [`docs/tokens/alpha-transparency.html`](docs/tokens/alpha-transparency.html)
- **Values**: Opacity levels from 0% to 90% in 10% increments

```javascript
import { ALPHA } from './tokens/alpha-transparency.js';
overlay.style.backgroundColor = `rgb(0 0 0 / ${ALPHA[50]})`; // 50% opacity
```

### Token Usage Patterns

All tokens follow consistent patterns:

1. **Auto-injection**: Tokens automatically create CSS variables when imported
2. **Dual access**: Use via JavaScript constants or CSS custom properties
3. **Shadow DOM ready**: Tokens work in both document and shadow roots
4. **Type-safe**: Full JSDoc annotations for IDE support

```javascript
// Pattern 1: JavaScript access
import { FONT_SIZE } from './tokens/font-size.js';
element.style.fontSize = FONT_SIZE.base;

// Pattern 2: CSS variables
element.style.fontSize = 'var(--font-size-base)';

// Pattern 3: Shadow DOM
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-size: var(--font-size-base);
          letter-spacing: var(--letter-spacing-normal);
        }
      </style>
    `;
  }
}
```

## Components

Components are organized by atomic design principles:

- **Primitives**: Basic building blocks (buttons, inputs, labels)
- **Molecules**: Simple combinations (labeled inputs, icon buttons)
- **Organisms**: Complex UI sections (transport bar, mixer channel)
- **Templates**: Page-level layouts (project view, mixer view)

All components:
- Use Shadow DOM for encapsulation
- Publish events via EventBus (never call bounded contexts directly)
- Follow performance budgets
- Include comprehensive JSDoc documentation

### Component Development

See individual component directories for implementation details:
- [`components/controls/`](components/controls/) - Form controls and inputs
- [`components/composites/`](components/composites/) - Multi-part components
- [`components/organisms/`](components/organisms/) - Complex UI sections

## Architecture

### Event-Driven Communication

Components communicate through the EventBus:

```javascript
// Component publishes event
this.dispatchEvent(new CustomEvent('harmony:play-clicked', {
  bubbles: true,
  composed: true,
  detail: { timestamp: Date.now() }
}));

// Bounded context subscribes
eventBus.subscribe('harmony:play-clicked', (event) => {
  // Handle playback logic
});
```

### Bounded Contexts

Core logic is implemented in Rust/WASM bounded contexts:
- Audio processing
- State management
- Graph engine
- Project serialization

UI components remain in vanilla JavaScript for optimal DOM performance.

### Performance Budgets

All code must meet these constraints:
- **Render**: 16ms per frame (60fps)
- **Memory**: 50MB WASM heap maximum
- **Load**: 200ms initial load time
- **Audio Latency**: 10ms end-to-end

## Development Workflow

### Adding New Tokens

1. Create token module in `tokens/`
2. Create documentation in `docs/tokens/`
3. Update this file with token reference
4. Test in Chrome with real components
5. Commit with descriptive message

### Creating Components

1. Choose appropriate atomic level
2. Implement with Shadow DOM
3. Use design tokens exclusively
4. Add JSDoc documentation
5. Create test page
6. Verify in Chrome (all states: default, hover, focus, active, disabled)
7. Update this documentation

### Testing Requirements

- All UI components must be tested in Chrome before completion
- Verify all interactive states (hover, focus, active, disabled)
- Check performance with DevTools (60fps target)
- Test with EventBus debugger (Ctrl+Shift+E)

## Tools and Debugging

### EventBus Debugger
Available on every page via Ctrl+Shift+E. Shows:
- All published events
- Event payload inspection
- Subscriber information
- Validation errors

### Token Inspector
Import tokens in browser console for live inspection:
```javascript
import('./tokens/font-size.js').then(m => console.table(m.FONT_SIZE));
```

## Related Documentation

- **Token Reference**: [`docs/tokens/README.md`](docs/tokens/README.md)
- **Architecture Diagrams**: [`docs/atomic-design-diagram.md`](docs/atomic-design-diagram.md)
- **Component Schemas**: [`core/validation/component-schemas.js`](core/validation/component-schemas.js)

## Contributing

When modifying the design system:

1. Follow existing patterns and conventions
2. Update documentation (non-optional)
3. Test thoroughly in Chrome
4. Ensure performance budgets are met
5. Commit generated code with schema changes
6. Push changes before starting new tasks

---

**Version**: 1.0  
**Last Updated**: 2025-01-15  
**Maintainer**: Harmony Design System Team