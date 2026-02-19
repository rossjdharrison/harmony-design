# Harmony Design System

This document describes the Harmony Design System - a comprehensive design language for building audio production interfaces with consistent visual design, interaction patterns, and performance characteristics.

## Overview

Harmony is a design system built for high-performance audio applications. It provides design tokens, components, and patterns that work together to create professional audio production tools.

## Design Tokens

Design tokens are the atomic design decisions that define the visual language of Harmony. They are stored as JSON files and transformed into CSS custom properties at runtime.

### Token Files

- **[tokens/colors.json](tokens/colors.json)** - Color palette including brand colors, semantic colors, and alpha variants
- **[tokens/spacing.json](tokens/spacing.json)** - Spacing scale from 0.25rem to 20rem for consistent layout
- **[tokens/typography.json](tokens/typography.json)** - Typography system including fonts, sizes, weights, and type scales

### Typography System

The typography system provides a comprehensive set of tokens for text styling:

#### Font Families

- **Primary**: System font stack for body text (-apple-system, BlinkMacSystemFont, etc.)
- **Mono**: Monospace fonts for code and technical content
- **Display**: Display fonts for headings and emphasis

#### Font Sizes

Scale from `xs` (0.75rem/12px) to `7xl` (4.5rem/72px) with semantic naming:
- `xs`, `sm`, `base`, `lg`, `xl` - Body text sizes
- `2xl` through `5xl` - Heading sizes
- `6xl`, `7xl` - Display sizes

#### Font Weights

Nine weight levels from `thin` (100) to `black` (900):
- `normal` (400) - Default body text
- `medium` (500) - Emphasis
- `semibold` (600) - Subheadings
- `bold` (700) - Headings

#### Line Heights

Six levels from `none` (1) to `loose` (2):
- `tight` (1.25) - Headings
- `normal` (1.5) - Body text
- `relaxed` (1.625) - Increased readability

#### Letter Spacing

Six levels from `tighter` (-0.05em) to `widest` (0.1em):
- `normal` (0) - Default
- `wide` (0.025em) - Labels and buttons
- `widest` (0.1em) - All-caps text

#### Type Scale

Pre-composed typography styles for common use cases:
- **Body styles**: `body`, `bodySmall`, `bodyLarge`
- **Headings**: `heading1` through `heading6`
- **Specialized**: `caption`, `overline`, `code`, `codeBlock`, `label`, `button`

Each type scale combines font family, size, weight, line height, and letter spacing into a single reusable style.

### Token Schema

All token files conform to [tokens/token-schema.json](tokens/token-schema.json). The schema validates:
- Token structure and metadata
- Value types (color, spacing, fontSize, fontWeight, etc.)
- Reference syntax for token composition

### Token Loading

Tokens are loaded at runtime via [tokens/token-loader.js](tokens/token-loader.js):
- Fetches JSON files
- Validates against schema
- Resolves token references
- Applies to CSS custom properties

### Token Transformation

The [tokens/token-transform.js](tokens/token-transform.js) pipeline:
1. Loads raw tokens
2. Resolves references ({color.primary.500})
3. Transforms values (hex to rgb, rem to px)
4. Generates CSS custom properties
5. Outputs platform-specific formats

### Token Validation

[tokens/token-validator.js](tokens/token-validator.js) provides runtime validation:
- Schema compliance checking
- Reference integrity validation
- Type checking
- Error reporting with context

### Token Watching

[tokens/token-watcher.js](tokens/token-watcher.js) enables hot-reloading during development:
- Watches token files for changes
- Automatically reloads and validates
- Updates CSS custom properties live
- Logs changes to console

## Token Usage

### In CSS

```css
.heading {
  font-family: var(--font-family-display);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: var(--letter-spacing-tight);
  color: var(--color-primary-700);
  margin-bottom: var(--spacing-4);
}
```

### In JavaScript

```javascript
import { loadTokens } from './tokens/token-loader.js';

const tokens = await loadTokens(['colors', 'spacing', 'typography']);
const primaryColor = tokens.colors.primary['500'];
const baseSpacing = tokens.spacing['4'];
const headingStyle = tokens.typography.typeScale.heading1;
```

### Type Scale Application

```javascript
// Apply a complete type scale
function applyTypeScale(element, scaleName) {
  const scale = tokens.typography.typeScale[scaleName].value;
  element.style.fontFamily = scale.fontFamily;
  element.style.fontSize = scale.fontSize;
  element.style.fontWeight = scale.fontWeight;
  element.style.lineHeight = scale.lineHeight;
  element.style.letterSpacing = scale.letterSpacing;
}
```

## Components

Components are built using Web Components with Shadow DOM for encapsulation. All components follow these patterns:

- Use design tokens for styling
- Publish events for user interactions
- Subscribe to EventBus for state changes
- Include JSDoc documentation
- Pass quality gates before deployment

### Component Categories

- **Primitives**: Basic UI elements (buttons, inputs, icons)
- **Molecules**: Composed elements (form fields, cards)
- **Organisms**: Complex components (modals, navigation)
- **Templates**: Page-level layouts

## Architecture

### Technology Stack

- **UI Layer**: Vanilla HTML/CSS/JavaScript with Web Components
- **Core Logic**: Rust compiled to WebAssembly
- **Audio Processing**: Rust with WebGPU fallback
- **State Management**: EventBus pattern with bounded contexts

### Bounded Contexts

Bounded contexts are implemented in Rust and compiled to WASM:
- [bounded-contexts/component-lifecycle](bounded-contexts/component-lifecycle) - Component lifecycle management

### Event-Driven Architecture

Components communicate via EventBus:
1. UI components publish events (user interactions)
2. EventBus routes to subscribers
3. Bounded contexts process commands
4. Results published as events
5. UI components update based on events

See [components/event-bus-debugger.js](components/event-bus-debugger.js) for debugging tools.

## Performance Budgets

All code must meet these targets:

- **Render Budget**: 16ms per frame (60fps)
- **Memory Budget**: 50MB WASM heap maximum
- **Load Budget**: 200ms initial load time
- **Audio Latency**: 10ms end-to-end maximum

## Development Workflow

### Token Development

1. Edit token JSON files in [tokens/](tokens/)
2. Run validation: `node tokens/token-validator.js`
3. Test with watcher: `node tokens/token-watcher.js`
4. Verify in browser with live reload

### Component Development

1. Create component in appropriate directory
2. Use shadow DOM for encapsulation
3. Reference design tokens via CSS custom properties
4. Test all states in Chrome (default, hover, focus, active, disabled)
5. Verify performance with DevTools
6. Document in this file

### Schema Changes

When modifying Rust behavior:
1. Navigate to [harmony-schemas](harmony-schemas)
2. Modify schema definitions
3. Run codegen pipeline
4. Verify compilation
5. Commit schema + generated code together

## Testing

- **UI Components**: Test in Chrome, verify all states
- **Performance**: Use Chrome DevTools Performance panel
- **Animations**: Target 60fps for all UI animations
- **Token Validation**: Automated via token-validator.js

## Quality Gates

All changes must pass quality gates before merging:
- Schema validation
- Type checking
- Performance budgets
- Visual regression tests
- Accessibility checks

## Documentation Standards

This document is written in B1-level English for accessibility. Code examples are minimal - implementation details live in source files with cross-references between docs and code.

## Getting Started

1. Load design tokens: `import { loadTokens } from './tokens/token-loader.js'`
2. Use tokens in CSS via custom properties: `var(--color-primary-500)`
3. Build components with Web Components and Shadow DOM
4. Follow EventBus pattern for component communication
5. Test in Chrome and verify performance budgets

## Additional Resources

- Token Schema: [tokens/token-schema.json](tokens/token-schema.json)
- Event Bus Debugger: [components/event-bus-debugger.js](components/event-bus-debugger.js)
- Component Lifecycle: [bounded-contexts/component-lifecycle](bounded-contexts/component-lifecycle)

---

*This is a living document. Update it when adding new patterns, components, or architectural decisions.*