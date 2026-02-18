# Harmony Design System

Welcome to the Harmony Design System documentation. This guide explains how to work with the system, its core concepts, and implementation patterns.

## Table of Contents

1. [Introduction](#introduction)
2. [Design Tokens](#design-tokens)
3. [Component Architecture](#component-architecture)
4. [Event System](#event-system)
5. [Performance Guidelines](#performance-guidelines)
6. [Development Workflow](#development-workflow)

## Introduction

Harmony is a design system built for a browser-based DAW (Digital Audio Workstation). It uses vanilla Web Components, follows atomic design principles, and prioritizes performance for real-time audio applications.

### Core Principles

- **Performance First**: 16ms render budget, 10ms audio latency
- **No Framework Dependencies**: Pure Web Components with Shadow DOM
- **Token-Driven Design**: Consistent spacing, colors, typography
- **Event-Based Architecture**: Components communicate via EventBus

## Design Tokens

Design tokens are the visual primitives of the system. They provide consistent values for spacing, colors, typography, and other visual properties.

### Color Palette

The color system includes primary scales, neutral grays, accent colors, and alpha transparency variants.

**Primary Scale (50-950)**
- 11 shades from lightest (50) to darkest (950)
- Usage: brand colors, primary actions, focus states
- Implementation: [`tokens/colors.js`](tokens/colors.js)
- Documentation: [`docs/tokens/primary-colors.html`](docs/tokens/primary-colors.html)

**Neutral/Gray Scale (50-950)**
- 11 shades for surfaces, borders, text
- Usage: backgrounds, dividers, disabled states
- Implementation: [`tokens/colors.js`](tokens/colors.js)
- Documentation: [`docs/tokens/neutral-colors.html`](docs/tokens/neutral-colors.html)

**Accent Colors**
- Blue, Green, Red, Yellow with 50-950 scales
- Usage: success, error, warning, info states
- Implementation: [`tokens/colors.js`](tokens/colors.js)
- Documentation: [`docs/tokens/accent-colors.html`](docs/tokens/accent-colors.html)

**Alpha Transparency**
- 10%, 20%, 30%, 40%, 50% opacity variants
- Usage: overlays, hover states, glassmorphism
- Implementation: [`tokens/colors.js`](tokens/colors.js)
- Documentation: [`docs/tokens/alpha-transparency.html`](docs/tokens/alpha-transparency.html)

### Spacing Scale

4px base unit with 13 steps (0-12) for consistent spacing.

**Scale**: 0px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px

**Usage**:
```javascript
import { spacing } from './tokens/spacing.js';
element.style.padding = `${spacing[3]}px`; // 12px
```

**Guidelines**:
- Use step 2 (8px) for tight spacing
- Use step 4 (16px) for standard spacing
- Use step 6 (24px) for comfortable spacing
- Use step 8+ (32px+) for section spacing

Implementation: [`tokens/spacing.js`](tokens/spacing.js)

### Typography

#### Font Size Scale

8 steps from xs (10px) to 3xl (32px).

**Scale**: xs(10), sm(12), base(14), md(16), lg(18), xl(24), 2xl(28), 3xl(32)

**Usage**:
```javascript
import { fontSize } from './tokens/typography.js';
element.style.fontSize = `${fontSize.lg}px`;
```

Implementation: [`tokens/typography.js`](tokens/typography.js)
Documentation: [`docs/tokens/font-size-scale.html`](docs/tokens/font-size-scale.html)

#### Font Weight

3 weights for hierarchy.

**Scale**: regular(400), medium(500), semibold(600)

**Usage**:
```javascript
import { fontWeight } from './tokens/typography.js';
element.style.fontWeight = fontWeight.semibold;
```

Implementation: [`tokens/typography.js`](tokens/typography.js)
Documentation: [`docs/tokens/font-weight.html`](docs/tokens/font-weight.html)

#### Line Height

3 values for different text densities.

**Scale**: tight(1.2), normal(1.5), relaxed(1.8)

**Usage**:
```javascript
import { lineHeight } from './tokens/typography.js';
element.style.lineHeight = lineHeight.normal;
```

**Guidelines**:
- Use tight (1.2) for headings
- Use normal (1.5) for body text
- Use relaxed (1.8) for long-form content

Implementation: [`tokens/typography.js`](tokens/typography.js)
Documentation: [`docs/tokens/line-height.html`](docs/tokens/line-height.html)

#### Letter Spacing

3 values for text tracking.

**Scale**: tight(-0.02em), normal(0), relaxed(0.05em)

**Usage**:
```javascript
import { letterSpacing } from './tokens/typography.js';
element.style.letterSpacing = letterSpacing.relaxed;
```

**Guidelines**:
- Use tight for large headings
- Use normal for body text
- Use relaxed for uppercase labels

Implementation: [`tokens/typography.js`](tokens/typography.js)
Documentation: [`docs/tokens/letter-spacing.html`](docs/tokens/letter-spacing.html)

### Border Radius Scale

7 steps for corner rounding, from sharp to fully rounded.

**Scale**: none(0), sm(2), default(4), md(6), lg(8), xl(12), full(9999)

**Usage**:
```javascript
import { borderRadius, getBorderRadiusCSS } from './tokens/border-radius.js';
element.style.borderRadius = getBorderRadiusCSS('md'); // "6px"
```

**Guidelines**:
- Use **none (0px)** for sharp corners: tables, code blocks, technical UI
- Use **sm (2px)** for subtle rounding: inputs, small buttons
- Use **default (4px)** for standard UI elements: most components
- Use **md (6px)** for cards, panels, modal dialogs
- Use **lg (8px)** for prominent elements: large cards
- Use **xl (12px)** for hero sections, feature cards
- Use **full (9999px)** for pills, badges, circular avatars

**CSS Custom Properties**:
```javascript
import { injectBorderRadiusVars } from './tokens/border-radius.js';
injectBorderRadiusVars(); // Injects CSS variables
// Then use: border-radius: var(--border-radius-md);
```

Implementation: [`tokens/border-radius.js`](tokens/border-radius.js)
Documentation: [`docs/tokens/border-radius.html`](docs/tokens/border-radius.html)
Tests: [`tokens/border-radius.test.html`](tokens/border-radius.test.html)

## Component Architecture

### Atomic Design Hierarchy

Components are organized into five levels:

1. **Primitives** (Atoms): Basic building blocks
2. **Molecules**: Simple component groups
3. **Organisms**: Complex UI sections
4. **Templates**: Page-level layouts
5. **Pages**: Specific instances

See [`docs/atomic-design-hierarchy.md`](docs/atomic-design-hierarchy.md) for detailed hierarchy.

### Web Components Pattern

All components use Shadow DOM and follow this structure:

```javascript
class HarmonyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>/* Scoped styles */</style>
      <!-- Component markup -->
    `;
  }
}
```

## Event System

Components communicate via EventBus using the ProcessCommand pattern.

### Publishing Events

```javascript
window.eventBus.publish({
  type: 'PlaybackCommand',
  action: 'play',
  timestamp: Date.now()
});
```

### Subscribing to Events

```javascript
window.eventBus.subscribe('PlaybackStarted', (event) => {
  console.log('Playback started:', event);
});
```

Implementation: [`core/event-bus.js`](core/event-bus.js)

## Performance Guidelines

### Budgets

- **Render Budget**: 16ms per frame (60fps)
- **Memory Budget**: 50MB WASM heap
- **Load Budget**: 200ms initial load
- **Audio Latency**: 10ms end-to-end

### Best Practices

1. Use CSS transforms for animations (GPU-accelerated)
2. Batch DOM updates with requestAnimationFrame
3. Lazy-load non-critical components
4. Use Web Workers for heavy computation
5. Profile with Chrome DevTools Performance panel

## Development Workflow

### Testing Components

1. Open component test file in Chrome: `component.test.html`
2. Verify all states: default, hover, focus, active, disabled
3. Check performance: 60fps for animations
4. Validate events: check EventBus debugger (Ctrl+Shift+E)

### Adding New Tokens

1. Create token file in `tokens/`
2. Export token object and helper functions
3. Add JSDoc documentation
4. Create visual documentation in `docs/tokens/`
5. Create test file: `tokens/token-name.test.html`
6. Update this documentation file

### Component Development

1. Create component file in appropriate directory
2. Implement Web Component with Shadow DOM
3. Use design tokens for styling
4. Publish/subscribe to events (never call BCs directly)
5. Create test file: `component.test.html`
6. Test in Chrome before marking complete

### Quality Gates

All changes must pass:
- JSDoc validation
- Event schema validation
- Performance budgets
- Chrome browser tests

See [`core/validation/`](core/validation/) for validation utilities.

## Additional Resources

- [Atomic Design Diagram](docs/atomic-design-diagram.md)
- [Token Documentation](docs/tokens/README.md)
- [Component Schemas](core/validation/component-schemas.js)
- [Event Schemas](core/validation/event-schemas.js)