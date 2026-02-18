# Design Tokens Documentation

This directory contains interactive documentation for all design tokens in the Harmony Design System.

## Available Token Categories

### Typography Tokens
- **[Font Size Scale](./font-size-scale.html)** - 8-step scale from xs (10px) to 3xl (32px)
- **[Font Weight](./font-weight.html)** - 4 weights: regular (400), medium (500), semibold (600), bold (700)

### Color Tokens
- **[Primary Colors](./accent-colors.html)** - Primary brand color scale (50-950)
- **[Accent Colors](./accent-colors.html)** - Blue, green, red, yellow accent palettes
- **[Alpha Transparency](./alpha-transparency.html)** - Transparency variants for overlay effects

### Spacing Tokens
- **[Spacing Scale](./spacing-scale.html)** - 4px base unit scale (0-12 steps)

## Token Catalog

The **[Token Catalog](./token-catalog.html)** provides a comprehensive overview of all tokens with visual previews and usage examples.

## Using These Tokens

All tokens are defined as CSS custom properties in the `styles/` directory:

- `styles/tokens-font-size.css` - Font size tokens
- `styles/tokens-font-weight.css` - Font weight tokens
- `styles/tokens-colors.css` - Color tokens
- `styles/tokens-spacing.css` - Spacing tokens

### Basic Usage

```css
/* In your component styles */
.my-component {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-600);
  padding: var(--spacing-4);
}
```

### Web Components

```javascript
class MyComponent extends HTMLElement {
  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          font-size: var(--font-size-md);
          font-weight: var(--font-weight-regular);
          color: var(--color-neutral-900);
        }
      </style>
      <div>Content</div>
    `;
  }
}
```

## Design Principles

1. **Consistency** - Tokens ensure consistent design across all components
2. **Maintainability** - Change once, update everywhere
3. **Accessibility** - Tokens are chosen with WCAG guidelines in mind
4. **Performance** - CSS custom properties enable efficient theming

## Related Documentation

- [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) - Complete design system documentation
- [Token-Component Matrix](./token-component-matrix.js) - Maps which components use which tokens