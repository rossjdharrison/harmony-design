# Design Tokens Documentation

This directory contains interactive documentation for all design tokens in the Harmony Design System.

## Available Token Categories

### Typography
- **[Font Size Scale](font-size-scale.html)** - 8-step scale from xs (10px) to 3xl (32px)
- **[Font Weight](font-weight.html)** - regular (400), medium (500), semibold (600), bold (700)
- **[Line Height](line-height.html)** - tight (1.2), normal (1.5), relaxed (1.8)
- **[Letter Spacing](letter-spacing.html)** - tight (-0.02em), normal (0), wide (0.02em)

### Layout
- **[Spacing Scale](spacing-scale.html)** - 4px base unit with 13 steps (0-12)

### Color
- **[Accent Colors](accent-colors.html)** - Blue, green, red, yellow semantic colors
- **[Alpha Transparency](alpha-transparency.html)** - Overlay and transparency variants

## Token Structure

All tokens follow these principles:

1. **JavaScript Modules**: Tokens are exported as ES6 modules from `/tokens/`
2. **CSS Variables**: Each token automatically generates CSS custom properties
3. **Type Safety**: JSDoc annotations provide IDE autocomplete and type checking
4. **Auto-Apply**: Tokens automatically inject CSS variables when imported
5. **Shadow DOM Support**: Tokens work in both document and shadow roots

## Usage Pattern

```javascript
// Import tokens
import { FONT_SIZE } from './tokens/font-size.js';
import { LETTER_SPACING } from './tokens/letter-spacing.js';

// Use in JavaScript
element.style.fontSize = FONT_SIZE.base;
element.style.letterSpacing = LETTER_SPACING.normal;

// Or use CSS variables
element.style.cssText = `
  font-size: var(--font-size-base);
  letter-spacing: var(--letter-spacing-normal);
`;
```

## Design System Integration

These tokens are the foundation of the Harmony Design System. They ensure:

- **Consistency**: All components use the same visual language
- **Maintainability**: Changes propagate automatically through the system
- **Performance**: Tokens are lightweight and optimized for runtime use
- **Developer Experience**: Strong typing and documentation at every level

## Related Documentation

- [Main Design System Documentation](../../DESIGN_SYSTEM.md)
- [Token Implementation Guide](../../DESIGN_SYSTEM.md#design-tokens)
- [Component Usage Examples](../../DESIGN_SYSTEM.md#components)