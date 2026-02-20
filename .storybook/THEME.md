# Harmony Storybook Theme

Custom Storybook theme implementation that matches the Harmony Design System visual identity.

## Overview

The Harmony Storybook theme provides a consistent visual experience across the component documentation, matching the design system's colors, typography, and spacing.

## Features

- **Light and Dark Modes**: Full support for both themes with automatic system preference detection
- **Design Token Integration**: Uses the same tokens as the component library
- **Custom Typography**: Inter font family with Fira Code for code blocks
- **Responsive Layout**: Optimized for different viewport sizes
- **Performance**: Smooth transitions and optimized rendering

## File Structure

```
.storybook/
├── harmony-theme.js        # Theme definitions (light & dark)
├── manager.js              # Manager configuration with theme
├── manager-head.html       # Custom head content (fonts, styles)
├── preview.js              # Preview configuration with decorators
├── theme-variables.css     # CSS custom properties
├── addons/
│   └── theme-switcher.js   # Theme toggle addon
└── THEME.md               # This file
```

## Usage

### Applying the Theme

The theme is automatically applied when Storybook starts. No additional configuration needed.

### Switching Themes

1. **Via Toolbar**: Click the theme icon in the Storybook toolbar
2. **Via System Preference**: Theme follows system dark/light mode
3. **Via localStorage**: Preference is saved and persists across sessions

### Customizing the Theme

To modify theme values, edit `.storybook/harmony-theme.js`:

```javascript
const colors = {
  primary: '#6366f1',  // Change primary color
  // ... other colors
};
```

### Using Theme Variables in Stories

Access theme variables in your component stories:

```javascript
export const Example = () => `
  <div style="
    background: var(--harmony-surface);
    color: var(--harmony-text-primary);
    padding: var(--harmony-space-md);
    border-radius: var(--harmony-radius-md);
  ">
    Themed content
  </div>
`;
```

## Design Tokens

The theme uses the following design token categories:

### Colors

- **Primary**: Brand colors (indigo palette)
- **Neutral**: Background, surface, border colors
- **Text**: Primary, secondary, tertiary text colors
- **Semantic**: Success, warning, error, info colors

### Typography

- **Font Families**: Inter (UI), Fira Code (code)
- **Font Sizes**: 12px - 48px scale
- **Font Weights**: 400, 500, 600, 700
- **Line Heights**: Tight, normal, relaxed

### Spacing

- **Scale**: 4px base unit
- **Range**: xs (4px) to 2xl (48px)

### Effects

- **Shadows**: Small, medium, large
- **Border Radius**: 4px - 12px
- **Transitions**: Fast (150ms), base (200ms), slow (300ms)

## Integration with Components

Components automatically inherit theme variables through CSS custom properties. No additional setup required.

```javascript
// Component automatically uses theme
class HarmonyButton extends HTMLElement {
  connectedCallback() {
    this.style.background = 'var(--harmony-primary)';
    this.style.color = 'var(--harmony-text-inverse)';
  }
}
```

## Performance Considerations

- **CSS Variables**: Used for efficient theme switching without re-render
- **Transition Optimization**: Only animates necessary properties
- **Font Loading**: Preconnect and display=swap for optimal performance
- **Bundle Size**: Minimal theme code (~5KB gzipped)

## Accessibility

- **Color Contrast**: All color combinations meet WCAG AA standards
- **Focus Indicators**: Visible focus states in both themes
- **Reduced Motion**: Respects prefers-reduced-motion preference

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Related Documentation

- [Design System Overview](../DESIGN_SYSTEM.md)
- [Storybook Configuration](./README.md)
- [Component Development Guide](../docs/component-development-guide.md)

## Troubleshooting

### Theme Not Applying

1. Clear browser cache and localStorage
2. Verify fonts are loading (check Network tab)
3. Check console for errors

### Theme Switching Not Working

1. Ensure localStorage is enabled
2. Check that manager.js is properly loaded
3. Verify theme-switcher addon is registered

### Custom Properties Not Working

1. Ensure theme-variables.css is imported in preview.js
2. Check that :root selector is not overridden
3. Verify browser supports CSS custom properties