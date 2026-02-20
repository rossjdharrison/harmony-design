# Token Customization Guide

This guide explains how to customize design tokens in the Harmony Design System.

## What Are Design Tokens?

Design tokens are the visual design atoms of the system. They store values for:

- **Colors**: Primary, secondary, semantic colors
- **Spacing**: Margins, padding, gaps
- **Typography**: Font sizes, weights, line heights
- **Shadows**: Elevation levels
- **Border Radius**: Corner roundness
- **Transitions**: Animation timing

Tokens ensure visual consistency across all components.

## Token Structure

Tokens are defined in `tokens/design-tokens.json`:

```json
{
  "color": {
    "primary": { "value": "#6366f1" },
    "secondary": { "value": "#8b5cf6" }
  },
  "spacing": {
    "xs": { "value": "0.25rem" },
    "sm": { "value": "0.5rem" }
  }
}
```

The token system (`tokens/token-system.js`) converts these to CSS custom properties.

## How to Customize Tokens

### Method 1: Edit Token File (Build Time)

For permanent changes, edit `tokens/design-tokens.json`:

```json
{
  "color": {
    "primary": { "value": "#ff6b6b" }
  }
}
```

Then rebuild:

```bash
npm run build
```

The token system will generate CSS custom properties automatically.

### Method 2: Override CSS Variables (Runtime)

For dynamic theming, override CSS custom properties:

```css
:root {
  --color-primary: #ff6b6b;
  --spacing-md: 1.5rem;
}
```

Or use JavaScript:

```javascript
document.documentElement.style.setProperty('--color-primary', '#ff6b6b');
```

### Method 3: Theme Variants

Create theme variants by scoping overrides:

```css
[data-theme="dark"] {
  --color-background: #1a1a1a;
  --color-text: #ffffff;
  --color-primary: #818cf8;
}

[data-theme="high-contrast"] {
  --color-primary: #000000;
  --color-background: #ffffff;
}
```

Apply theme by setting attribute:

```javascript
document.documentElement.setAttribute('data-theme', 'dark');
```

## Token Categories

### Color Tokens

```json
{
  "color": {
    "primary": { "value": "#6366f1" },
    "secondary": { "value": "#8b5cf6" },
    "success": { "value": "#10b981" },
    "warning": { "value": "#f59e0b" },
    "error": { "value": "#ef4444" },
    "background": { "value": "#ffffff" },
    "surface": { "value": "#f9fafb" },
    "text": { "value": "#1f2937" }
  }
}
```

### Spacing Tokens

```json
{
  "spacing": {
    "xs": { "value": "0.25rem" },
    "sm": { "value": "0.5rem" },
    "md": { "value": "1rem" },
    "lg": { "value": "1.5rem" },
    "xl": { "value": "2rem" },
    "2xl": { "value": "3rem" }
  }
}
```

### Typography Tokens

```json
{
  "font": {
    "size": {
      "xs": { "value": "0.75rem" },
      "sm": { "value": "0.875rem" },
      "base": { "value": "1rem" },
      "lg": { "value": "1.125rem" },
      "xl": { "value": "1.25rem" }
    },
    "weight": {
      "normal": { "value": "400" },
      "medium": { "value": "500" },
      "semibold": { "value": "600" },
      "bold": { "value": "700" }
    },
    "family": {
      "sans": { "value": "system-ui, -apple-system, sans-serif" },
      "mono": { "value": "ui-monospace, monospace" }
    }
  }
}
```

### Shadow Tokens

```json
{
  "shadow": {
    "sm": { "value": "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
    "md": { "value": "0 4px 6px -1px rgba(0, 0, 0, 0.1)" },
    "lg": { "value": "0 10px 15px -3px rgba(0, 0, 0, 0.1)" },
    "xl": { "value": "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }
  }
}
```

### Border Radius Tokens

```json
{
  "radius": {
    "none": { "value": "0" },
    "sm": { "value": "0.125rem" },
    "md": { "value": "0.375rem" },
    "lg": { "value": "0.5rem" },
    "full": { "value": "9999px" }
  }
}
```

### Transition Tokens

```json
{
  "transition": {
    "fast": { "value": "150ms" },
    "base": { "value": "200ms" },
    "slow": { "value": "300ms" },
    "timing": { "value": "cubic-bezier(0.4, 0, 0.2, 1)" }
  }
}
```

## Using Tokens in Components

### In CSS

```css
.my-component {
  color: var(--color-primary);
  padding: var(--spacing-md);
  font-size: var(--font-size-base);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base) var(--transition-timing);
}
```

### In JavaScript

```javascript
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary');
```

### In Web Components

```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: var(--spacing-md);
          background: var(--color-surface);
          border-radius: var(--radius-md);
        }
      </style>
      <slot></slot>
    `;
  }
}
```

## Creating Custom Token Sets

### Step 1: Define Token Structure

Create a new token file (e.g., `tokens/custom-theme.json`):

```json
{
  "color": {
    "brand": { "value": "#ff6b6b" },
    "accent": { "value": "#4ecdc4" }
  },
  "spacing": {
    "custom": { "value": "1.25rem" }
  }
}
```

### Step 2: Load Tokens

Use the token system to load your custom tokens:

```javascript
import { TokenSystem } from './tokens/token-system.js';

const tokenSystem = new TokenSystem();
await tokenSystem.loadTokens('./tokens/custom-theme.json');
tokenSystem.applyTokens();
```

### Step 3: Use Custom Tokens

```css
.custom-component {
  color: var(--color-brand);
  margin: var(--spacing-custom);
}
```

## Theme Switching

### Basic Theme Switcher

```javascript
class ThemeSwitcher {
  constructor() {
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.applyTheme(this.currentTheme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.currentTheme = theme;
  }

  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }
}

// Usage
const themeSwitcher = new ThemeSwitcher();
document.getElementById('theme-toggle').addEventListener('click', () => {
  themeSwitcher.toggle();
});
```

### Advanced Theme System

```javascript
class ThemeManager {
  constructor() {
    this.themes = new Map();
    this.currentTheme = null;
  }

  registerTheme(name, tokens) {
    this.themes.set(name, tokens);
  }

  applyTheme(name) {
    const theme = this.themes.get(name);
    if (!theme) {
      console.error(`Theme "${name}" not found`);
      return;
    }

    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    this.currentTheme = name;
    this.publishThemeChange(name);
  }

  publishThemeChange(theme) {
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme }
    }));
  }
}

// Usage
const themeManager = new ThemeManager();

themeManager.registerTheme('ocean', {
  'color-primary': '#0077be',
  'color-secondary': '#00a8e8',
  'color-background': '#f0f8ff'
});

themeManager.registerTheme('forest', {
  'color-primary': '#2d5016',
  'color-secondary': '#6a994e',
  'color-background': '#f1f8e9'
});

themeManager.applyTheme('ocean');
```

## Token Validation

Ensure token values are valid:

```javascript
class TokenValidator {
  static validateColor(value) {
    const s = new Option().style;
    s.color = value;
    return s.color !== '';
  }

  static validateSpacing(value) {
    return /^\d+(\.\d+)?(px|rem|em|%)$/.test(value);
  }

  static validateTokens(tokens) {
    const errors = [];

    if (tokens.color) {
      Object.entries(tokens.color).forEach(([key, { value }]) => {
        if (!this.validateColor(value)) {
          errors.push(`Invalid color value for ${key}: ${value}`);
        }
      });
    }

    if (tokens.spacing) {
      Object.entries(tokens.spacing).forEach(([key, { value }]) => {
        if (!this.validateSpacing(value)) {
          errors.push(`Invalid spacing value for ${key}: ${value}`);
        }
      });
    }

    return errors;
  }
}
```

## Performance Considerations

### CSS Custom Properties Performance

- **Inheritance**: Changes to root properties trigger recalculation
- **Scope**: Use scoped properties for frequently changing values
- **Batch Updates**: Group property changes together

```javascript
// Bad: Multiple reflows
document.documentElement.style.setProperty('--color-primary', '#ff0000');
document.documentElement.style.setProperty('--color-secondary', '#00ff00');
document.documentElement.style.setProperty('--color-accent', '#0000ff');

// Good: Single reflow
const root = document.documentElement;
root.style.cssText += `
  --color-primary: #ff0000;
  --color-secondary: #00ff00;
  --color-accent: #0000ff;
`;
```

### Token Loading Budget

- **Load Time**: Token loading must not exceed 200ms (part of initial load budget)
- **File Size**: Keep token files under 10KB
- **Parsing**: Use JSON for fast parsing

## Accessibility

### Color Contrast

Ensure token colors meet WCAG AA standards:

```javascript
function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color) {
  // Convert color to RGB and calculate relative luminance
  // Implementation details omitted for brevity
}

// Validate contrast
const ratio = getContrastRatio(
  getComputedStyle(document.documentElement).getPropertyValue('--color-text'),
  getComputedStyle(document.documentElement).getPropertyValue('--color-background')
);

if (ratio < 4.5) {
  console.warn('Insufficient contrast ratio for text');
}
```

### Motion Preferences

Respect user motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-fast: 0ms;
    --transition-base: 0ms;
    --transition-slow: 0ms;
  }
}
```

## Best Practices

### 1. Use Semantic Naming

```json
// Good
{
  "color": {
    "primary": { "value": "#6366f1" },
    "success": { "value": "#10b981" },
    "error": { "value": "#ef4444" }
  }
}

// Bad
{
  "color": {
    "blue": { "value": "#6366f1" },
    "green": { "value": "#10b981" },
    "red": { "value": "#ef4444" }
  }
}
```

### 2. Maintain Consistent Scale

```json
{
  "spacing": {
    "xs": { "value": "0.25rem" },   // 4px
    "sm": { "value": "0.5rem" },    // 8px
    "md": { "value": "1rem" },      // 16px
    "lg": { "value": "1.5rem" },    // 24px
    "xl": { "value": "2rem" }       // 32px
  }
}
```

### 3. Document Token Purpose

```json
{
  "color": {
    "primary": {
      "value": "#6366f1",
      "description": "Primary brand color for buttons and links"
    },
    "surface": {
      "value": "#f9fafb",
      "description": "Background for cards and elevated surfaces"
    }
  }
}
```

### 4. Version Token Sets

```json
{
  "version": "1.0.0",
  "color": {
    "primary": { "value": "#6366f1" }
  }
}
```

### 5. Test Across Themes

Always test components with different token values to ensure they work with any theme.

## Troubleshooting

### Tokens Not Applying

1. Check CSS custom property syntax: `var(--token-name)`
2. Verify token is defined in `:root` scope
3. Check for typos in token names
4. Ensure token system has loaded

### Theme Switching Issues

1. Verify `data-theme` attribute is set correctly
2. Check CSS specificity of theme overrides
3. Ensure localStorage persists theme choice
4. Test in different browsers

### Performance Problems

1. Reduce number of token overrides
2. Batch CSS property changes
3. Use CSS containment for isolated components
4. Profile with Chrome DevTools Performance panel

## Related Documentation

- [Component Development Guide](./component-development.md) - Using tokens in components
- [Architecture Overview](./architecture-overview.md) - Token system architecture
- [API Reference](./api-reference.md) - TokenSystem API

## Examples

See working examples in:
- `examples/theme-switcher.html` - Basic theme switching
- `examples/custom-tokens.html` - Custom token sets
- `test-pages/token-showcase.html` - All tokens visualized

## Support

For questions or issues with token customization:
1. Check existing component implementations for patterns
2. Review EventBus logs for token-related errors
3. Test token changes in isolation before applying system-wide