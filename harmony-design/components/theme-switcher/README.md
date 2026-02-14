# Theme Switcher Component

A UI component for switching between light and dark themes in the Harmony Design System.

## Overview

The Theme Switcher provides an intuitive interface for users to toggle between light and dark themes. It integrates seamlessly with the ThemeProvider component and publishes events via the EventBus pattern.

## Usage

### Basic Toggle (Default)

```html
<theme-switcher></theme-switcher>
```

### Dropdown Variant

```html
<theme-switcher variant="dropdown"></theme-switcher>
```

### Disabled State

```html
<theme-switcher disabled></theme-switcher>
```

## Variants

### Toggle Button
- Visual toggle switch with sun/moon icons
- Smooth animation between states
- Clear visual feedback for current theme

### Dropdown
- Select dropdown with theme options
- More compact for limited space
- Accessible via keyboard navigation

## API

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | `'toggle' \| 'dropdown'` | `'toggle'` | Visual style of the switcher |
| `disabled` | `boolean` | `false` | Disables user interaction |

### Methods

#### `setTheme(theme)`
Sets the current theme programmatically.

```javascript
const switcher = document.querySelector('theme-switcher');
switcher.setTheme('dark');
```

#### `getTheme()`
Returns the current theme value.

```javascript
const switcher = document.querySelector('theme-switcher');
const currentTheme = switcher.getTheme(); // 'light' or 'dark'
```

## Events

### Published Events

#### `theme-change-requested`
Dispatched when user requests a theme change.

```javascript
document.addEventListener('theme-change-requested', (e) => {
  console.log('New theme requested:', e.detail.theme);
});
```

**EventBus equivalent:** `ThemeChangeRequested`

```javascript
EventBus.subscribe('ThemeChangeRequested', (event) => {
  console.log('Theme change:', event.payload.theme);
});
```

### Subscribed Events

#### `ThemeChanged`
Listens for theme changes from ThemeProvider to stay in sync.

## Styling

The component uses CSS custom properties from the design token system:

```css
--color-surface-primary
--color-surface-secondary
--color-surface-tertiary
--color-border
--color-text-primary
--color-text-secondary
--color-primary
--spacing-xs
--spacing-sm
--spacing-md
--font-family-base
--font-size-sm
--border-radius-md
```

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigable (Tab, Space, Enter)
- Focus indicators for keyboard users
- Screen reader friendly
- Disabled state properly communicated

## Performance

- Renders within 16ms budget for 60fps
- Smooth transitions using CSS transforms
- Minimal DOM manipulation
- No layout thrashing

## Testing

Open `theme-switcher.test.html` in Chrome to verify:

1. **Default State**: Component renders correctly
2. **Hover State**: Visual feedback on hover
3. **Focus State**: Clear focus indicators
4. **Active State**: Animation during click
5. **Disabled State**: No interaction when disabled
6. **Performance**: 60fps animations verified in DevTools

## Integration

### With ThemeProvider

```html
<theme-provider>
  <header>
    <theme-switcher></theme-switcher>
  </header>
  <main>
    <!-- Your content -->
  </main>
</theme-provider>
```

### With EventBus

The component automatically publishes to EventBus when available. Ensure EventBus is loaded before the component.

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

Requires Web Components support (custom elements, shadow DOM).

## See Also

- [Design System Documentation](../../DESIGN_SYSTEM.md#theme-switcher-component)
- [ThemeProvider Component](../theme-provider/theme-provider.js)
- [Design Tokens](../../tokens/design-tokens.js)