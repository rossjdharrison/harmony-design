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

### Text Color Tokens

Text color tokens provide semantic naming for text colors across different UI contexts and themes. These tokens automatically adapt between light and dark themes while maintaining proper contrast ratios.

**Token Reference:** `tokens/text-color-tokens.js`
**Visual Documentation:** `docs/tokens/text-color.html`

#### Available Tokens

- **text-primary**: Primary text color for body copy, headings, and main content
  - Light: gb(17, 24, 39) (near-black for maximum readability)
  - Dark: gb(249, 250, 251) (near-white for dark backgrounds)

- **text-secondary**: Secondary text color for supporting content and labels
  - Light: gb(75, 85, 99) (medium gray for hierarchy)
  - Dark: gb(209, 213, 219) (light gray maintaining contrast)

- **text-tertiary**: Tertiary text color for placeholder text and hints
  - Light: gb(156, 163, 175) (lighter gray for minimal emphasis)
  - Dark: gb(107, 114, 128) (medium gray for subtle content)

- **text-disabled**: Disabled text color for inactive content
  - Light: gb(209, 213, 219) (very light gray indicating unavailability)
  - Dark: gb(75, 85, 99) (darker gray for disabled state)

- **text-inverse**: Inverse text color for contrasting backgrounds
  - Light: gb(255, 255, 255) (white text on dark backgrounds)
  - Dark: gb(17, 24, 39) (dark text on light backgrounds in dark mode)

#### Usage in CSS

`css
.heading {
  color: var(--text-primary);
}

.label {
  color: var(--text-secondary);
}

.placeholder {
  color: var(--text-tertiary);
}

.disabled {
  color: var(--text-disabled);
}

.button-text {
  color: var(--text-inverse);
}
`

#### Usage in JavaScript

`javascript
import { TEXT_COLOR_TOKENS, getTextColor, applyTextColorTokens } from './tokens/text-color-tokens.js';

// Get specific color value
const primaryColor = getTextColor('text-primary', 'light');
element.style.color = primaryColor;

// Apply all tokens to document
applyTextColorTokens('dark');

// Validate token name
import { isValidTextColorToken } from './tokens/text-color-tokens.js';
if (isValidTextColorToken('text-primary')) {
  // Token exists
}
`

#### Accessibility Considerations

All text color tokens are designed to meet WCAG 2.1 Level AA contrast requirements:
- Primary text: 7:1 contrast ratio (AAA)
- Secondary text: 4.5:1 contrast ratio (AA)
- Tertiary text: Use for non-critical content only
- Disabled text: Intentionally lower contrast to indicate unavailability
- Inverse text: Verified contrast on common background colors

#### Theme Adaptation

Text color tokens automatically adapt when theme changes. The system ensures:
1. Consistent semantic meaning across themes
2. Proper contrast ratios in both light and dark modes
3. Smooth transitions between theme states
4. Predictable behavior in mixed-theme contexts



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

### Surface State Tokens

Surface state tokens define interactive state variations for surface elements. These tokens provide consistent visual feedback across all interactive components in the system.

**Location:** 	okens/surface-state.css  
**Documentation:** [Surface State Tokens Demo](docs/tokens/surface-state.html)

**Available Tokens:**

- **--surface-hover**: Applied when cursor hovers over interactive elements (opacity: 0.08)
- **--surface-active**: Applied during click/press interaction (opacity: 0.12)
- **--surface-selected**: Applied to selected or currently active items (opacity: 0.16)
- **--surface-disabled**: Applied to non-interactive or disabled elements (opacity: 0.02)
- **--surface-disabled-text**: Text color for disabled elements (opacity: 0.38)

**Theme Support:**

All surface state tokens have light and dark theme variants that automatically adapt based on the data-theme attribute.

**Usage Example:**

```css
.button {
  background: transparent;
  transition: background 0.2s ease;
}

.button:hover {
  background: var(--surface-hover);
}

.button:active {
  background: var(--surface-active);
}

.button[aria-selected="true"] {
  background: var(--surface-selected);
}

.button:disabled {
  background: var(--surface-disabled);
  color: var(--surface-disabled-text);
}
```

**Design Principles:**

1. **Progressive Feedback**: States increase in visual prominence from hover ? active ? selected
2. **Subtlety**: Hover states are subtle to avoid distraction
3. **Clarity**: Selected states are clearly visible but not overwhelming
4. **Accessibility**: Disabled states reduce prominence while maintaining readability
