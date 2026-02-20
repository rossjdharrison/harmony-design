# Pending State Indicator

Visual indicator component for pending optimistic updates in the Harmony Design System.

## Overview

The Pending State Indicator provides visual feedback when operations are in a pending or optimistic state. It supports multiple visual variants, sizes, and can be used inline or as an overlay.

## Usage

### Basic Usage

```html
<pending-state-indicator 
  variant="spinner" 
  size="medium">
</pending-state-indicator>
```

### With JavaScript

```javascript
const indicator = document.createElement('pending-state-indicator');
indicator.variant = 'pulse';
indicator.size = 'small';
indicator.label = 'Saving changes';

// Show the indicator
indicator.show();

// Hide when done
indicator.hide();
```

### As Overlay

```html
<div style="position: relative; padding: 20px;">
  <p>Content being updated...</p>
  <pending-state-indicator 
    overlay 
    variant="spinner" 
    size="large"
    label="Updating content">
  </pending-state-indicator>
</div>
```

### With Optimistic Mutations

```javascript
import { OptimisticMutationWrapper } from '../../state-machine/optimistic-mutation-wrapper.js';

const indicator = document.querySelector('pending-state-indicator');
const mutation = new OptimisticMutationWrapper();

// Show indicator during mutation
indicator.show();

mutation.execute(
  // Optimistic update
  () => updateUI(),
  // Server mutation
  async () => await saveToServer(),
  // Rollback
  () => revertUI()
).then(() => {
  indicator.hide();
}).catch(() => {
  indicator.hide();
});
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `variant` | string | `'spinner'` | Visual style: `'spinner'`, `'pulse'`, `'shimmer'`, `'dot'` |
| `size` | string | `'medium'` | Size: `'small'`, `'medium'`, `'large'` |
| `color` | string | `--harmony-color-primary` | Custom color (CSS color value) |
| `duration` | number | `1000` | Animation duration in milliseconds |
| `label` | string | `'Loading'` | Accessible label for screen readers |
| `overlay` | boolean | `false` | Show as overlay on parent element |
| `visible` | boolean | `false` | Visibility state |

## Methods

### `show()`
Shows the indicator and starts animation.

```javascript
indicator.show();
```

### `hide()`
Hides the indicator and stops animation.

```javascript
indicator.hide();
```

### `toggle()`
Toggles visibility state.

```javascript
indicator.toggle();
```

## Events

### `pending-start`
Fired when indicator is shown.

```javascript
indicator.addEventListener('pending-start', (e) => {
  console.log('Started at:', e.detail.timestamp);
});
```

### `pending-end`
Fired when indicator is hidden.

```javascript
indicator.addEventListener('pending-end', (e) => {
  console.log('Duration:', e.detail.duration, 'ms');
});
```

## Variants

### Spinner
Classic rotating spinner indicator.

```html
<pending-state-indicator variant="spinner"></pending-state-indicator>
```

### Pulse
Pulsing circle that scales and fades.

```html
<pending-state-indicator variant="pulse"></pending-state-indicator>
```

### Shimmer
Shimmering gradient effect.

```html
<pending-state-indicator variant="shimmer"></pending-state-indicator>
```

### Dot
Three bouncing dots.

```html
<pending-state-indicator variant="dot"></pending-state-indicator>
```

## Accessibility

- Uses `role="status"` for screen reader announcements
- Includes `aria-live="polite"` for non-intrusive updates
- Sets `aria-busy="true"` to indicate loading state
- Provides screen reader text via `label` attribute
- Hidden content uses `.sr-only` class for accessibility

## Performance

- **Render Budget**: < 5ms initial paint
- **Animation**: 60fps (16ms per frame) using CSS animations
- **Memory**: < 1MB per instance
- Uses CSS containment for layout isolation
- GPU-accelerated animations via `transform` and `opacity`
- Cleans up animation frames on disconnect

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- All modern browsers with Web Components support

## Related Components

- [Optimistic Mutation Wrapper](../../state-machine/optimistic-mutation-wrapper.js)
- [Rollback Handler](../../state-machine/rollback-handler.js)

## See Also

- [Design System Documentation](../../DESIGN_SYSTEM.md#pending-state-indicator)