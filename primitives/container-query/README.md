# Container Query Primitives

CSS primitives for @container queries with automatic polyfill fallback.

## Overview

Container queries allow components to respond to their container's size rather than the viewport size. This is essential for truly reusable components that work in any context.

This implementation provides:
- Native `@container` query support when available
- Automatic polyfill using ResizeObserver for older browsers
- Performance-optimized with RAF debouncing
- Named container support for specific use cases
- Zero runtime dependencies

## Browser Support

- **Native**: Chrome 105+, Edge 105+, Safari 16+, Firefox 110+
- **Polyfill**: All browsers with ResizeObserver support (Chrome 64+, Firefox 69+, Safari 13.1+)

## Usage

### Basic Container

```html
<div class="hds-container">
  <div class="hds-cq-flex-col hds-cq-flex-row">
    <!-- Stacks vertically in small containers, horizontal in large -->
  </div>
</div>
```

### Named Containers

```html
<div class="hds-container--card">
  <h2>Card Title</h2>
  <p class="hds-cq-text-responsive">
    Text size adapts to card width
  </p>
</div>
```

### JavaScript API

```javascript
// Observe a specific container
HarmonyContainerQuery.observe(element, {
  name: 'sidebar',
  onChange: (breakpoint, width) => {
    console.log(`Container is now ${breakpoint} at ${width}px`);
  }
});

// Observe all containers in document
HarmonyContainerQuery.observeAll();

// Stop observing
HarmonyContainerQuery.unobserve(element);

// Check native support
if (HarmonyContainerQuery.hasNativeSupport) {
  console.log('Using native container queries');
}
```

## Breakpoints

| Breakpoint | Min Width | Use Case |
|------------|-----------|----------|
| xs | 0px | Extra small containers |
| sm | 320px | Small containers (mobile) |
| md | 640px | Medium containers (tablet) |
| lg | 960px | Large containers (desktop) |
| xl | 1280px | Extra large containers |

## Performance

- **Polyfill overhead**: ~2KB gzipped
- **Runtime cost**: <1ms per container resize (RAF debounced)
- **Memory**: WeakMap-based, no memory leaks
- **Layout thrashing**: Prevented via RAF batching

## Examples

### Responsive Card Grid

```html
<div class="hds-container--grid-item">
  <div class="hds-cq-grid-2 hds-cq-grid-3 hds-cq-grid-4">
    <!-- 2 columns in small, 3 in medium, 4 in large containers -->
  </div>
</div>
```

### Adaptive Typography

```html
<div class="hds-container">
  <h1 class="hds-cq-text-responsive">
    Heading scales with container
  </h1>
</div>
```

### Conditional Layout

```css
@container (min-width: 640px) {
  .sidebar {
    display: block;
  }
}

@container (max-width: 639px) {
  .sidebar {
    display: none;
  }
}
```

## Integration with Design System

Container queries work seamlessly with:
- **Compound Components**: Adapt layout based on available space
- **Polymorphic Components**: Respond to container context
- **Responsive Tokens**: Use container-relative spacing and typography

## Testing

Run tests in Chrome to verify polyfill behavior:

```bash
npm test -- container-query.test.js
```

## See Also

- [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#container-query-primitives)
- [CSS Containment Spec](https://www.w3.org/TR/css-contain-3/)
- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)