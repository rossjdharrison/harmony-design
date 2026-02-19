# Harmony Spinner

Loading indicator atom component with size variants.

## Overview

The Spinner component provides visual feedback during loading states. It uses CSS animations for optimal performance and supports multiple size variants.

## Usage

```html
<!-- Basic usage -->
<harmony-spinner></harmony-spinner>

<!-- Size variants -->
<harmony-spinner size="small"></harmony-spinner>
<harmony-spinner size="medium"></harmony-spinner>
<harmony-spinner size="large"></harmony-spinner>

<!-- With accessible label -->
<harmony-spinner aria-label="Loading your content"></harmony-spinner>
```

## JavaScript API

```javascript
import { HarmonySpinner } from './primitives/spinner/harmony-spinner.js';

// Create programmatically
const spinner = document.createElement('harmony-spinner');
spinner.size = 'large';
spinner.setAttribute('aria-label', 'Processing request');
document.body.appendChild(spinner);

// Listen for mounted event
spinner.addEventListener('spinner-mounted', (e) => {
  console.log('Spinner mounted:', e.detail);
});
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Size variant |
| `aria-label` | `string` | `'Loading'` | Accessible label for screen readers |

## Size Specifications

| Size | Diameter | Border Width |
|------|----------|--------------|
| Small | 16px | 2px |
| Medium | 32px | 3px |
| Large | 48px | 4px |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `spinner-mounted` | `{ size: string, timestamp: number }` | Dispatched when component connects to DOM |

## Design Tokens

The spinner uses the following design tokens:

- `--color-border-subtle`: Border color for inactive segments
- `--color-primary`: Border color for active segment (animated)

## Accessibility

- Uses `role="status"` for screen reader announcement
- Includes `aria-label` for meaningful description
- Supports `aria-live="polite"` for non-intrusive updates
- Respects `prefers-reduced-motion` for accessibility

## Performance

- **GPU-accelerated**: Uses CSS `transform` animations
- **No JavaScript loops**: Pure CSS animation
- **Target**: 60fps animation performance
- **Budget**: <16ms frame time
- **Containment**: Uses CSS `contain` for optimization

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Testing

Open `harmony-spinner.test.html` in Chrome to verify:

1. ✅ All size variants render correctly
2. ✅ Inline usage works properly
3. ✅ Background variants display correctly
4. ✅ ARIA attributes are present
5. ✅ Animation runs at 60fps
6. ✅ Events are dispatched correctly
7. ✅ Dynamic size changes work
8. ✅ Memory usage stays within budget

## Related Documentation

See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) § Primitives > Spinner for architectural context.