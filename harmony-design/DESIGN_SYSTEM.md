# Harmony Design System

A modern design system for audio and creative applications.

## Table of Contents

1. [Introduction](#introduction)
2. [Design Tokens](#design-tokens)
3. [Theme System](#theme-system)
4. [CSS Custom Properties](#css-custom-properties)
5. [Components](#components)
6. [Development Guide](#development-guide)

## Introduction

Harmony Design System provides a complete theming solution with design tokens, CSS custom properties, and reusable components. All components are built with vanilla JavaScript and Web Components.

## Design Tokens

Design tokens are the foundation of the theme system. They define colors, spacing, typography, and other design decisions.

**Implementation:** [`src/core/theme/tokens.js`](src/core/theme/tokens.js)

Tokens are organized by category:
- **Colors:** Primary, secondary, background, text, borders
- **Spacing:** Small, medium, large, extra-large
- **Typography:** Font sizes, weights, line heights
- **Borders:** Radius values for rounded corners
- **Shadows:** Elevation and depth effects

Both light and dark themes are supported.

## Theme System

The theme system manages the active theme and provides context to components.

**Implementation:** [`src/core/theme/theme-provider.js`](src/core/theme/theme-provider.js)

### ThemeProvider Component

The `ThemeProvider` component wraps your application and manages theme state. It automatically applies the correct theme based on user preference or system settings.

```html
<theme-provider theme="light">
  <!-- Your app content -->
</theme-provider>
```

### Theme Context

Components can access the current theme through the theme context API. This allows components to react to theme changes without manual updates.

## CSS Custom Properties

CSS custom properties (CSS variables) bridge design tokens and stylesheets. They enable dynamic theme switching and provide a standard way to use theme values in CSS.

**Implementation:** [`src/core/theme/css-properties.js`](src/core/theme/css-properties.js)

### How It Works

Design tokens are converted into CSS custom properties at runtime:

```javascript
// Token
{ color: { primary: { base: '#007bff' } } }

// Becomes CSS
--color-primary-base: #007bff;
```

### Using CSS Properties

In your stylesheets, reference theme values using CSS custom properties:

```css
.button {
  background: var(--color-primary-base);
  padding: var(--spacing-medium);
  border-radius: var(--radius-small);
}
```

### Theme Stylesheet Manager

The `ThemeStylesheet` class manages injection and removal of theme CSS:

**Implementation:** [`src/core/theme/theme-stylesheet.js`](src/core/theme/theme-stylesheet.js)

```javascript
import { createThemeStylesheet } from './theme-stylesheet.js';

const stylesheet = createThemeStylesheet(lightTokens, darkTokens);
// CSS properties are now available in your styles
```

### API Reference

#### generateCSSProperties(tokens)

Converts design tokens into CSS custom property declarations.

#### injectCSSProperties(tokens, selector)

Injects CSS custom properties into the document for a specific selector.

#### getCSSProperty(propertyName, element)

Reads the current value of a CSS custom property.

#### setCSSProperty(propertyName, value, element)

Updates a CSS custom property value.

#### createCSSPropertyMap(tokens)

Creates a Map of CSS variable names to their values.

### Example

See the complete example: [`examples/theme-css-properties.html`](examples/theme-css-properties.html)

This example demonstrates:
- Theme switching between light and dark modes
- CSS custom properties updating automatically
- Components styled with theme values
- Exporting theme CSS for static use

## Components

(Component documentation will be added as components are implemented)

## Development Guide

### File Structure

```
harmony-design/
├── src/
│   └── core/
│       └── theme/
│           ├── tokens.js          # Design token definitions
│           ├── theme-provider.js  # Theme context provider
│           ├── css-properties.js  # CSS custom property generator
│           └── theme-stylesheet.js # Stylesheet manager
├── examples/
│   └── theme-css-properties.html  # CSS properties demo
└── tests/
    └── core/
        └── theme/
            └── css-properties.test.js # CSS properties tests
```

### Adding New Theme Values

1. Add tokens to token definitions
2. CSS custom properties are generated automatically
3. Use properties in component styles

### Testing

Run tests in browser:
```bash
python -m http.server 8000
# Navigate to tests/core/theme/css-properties.test.js
```

### Performance

CSS custom properties have minimal performance impact:
- **Injection:** < 1ms for typical token sets
- **Updates:** Native browser performance
- **Memory:** Negligible overhead

All changes respect the 16ms render budget requirement.