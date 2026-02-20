# Scroll Sentinel

Invisible trigger element for load-more detection using Intersection Observer API.

## Vision Alignment

**Reactive Component System**: Publishes events via EventBus for reactive, decoupled load-more behavior.

## Features

- ✅ Zero-dependency Intersection Observer integration
- ✅ Configurable threshold and root margin
- ✅ Trigger-once mode for single-shot detection
- ✅ Debug visualization mode
- ✅ EventBus integration for global coordination
- ✅ Performance optimized (<1ms render time)
- ✅ Memory efficient (<100KB per instance)

## Usage

### Basic Infinite Scroll

```html
<div class="content-list">
  <!-- Content items -->
  <div class="item">Item 1</div>
  <div class="item">Item 2</div>
  <!-- ... -->
  
  <!-- Sentinel at bottom triggers load-more -->
  <scroll-sentinel id="load-more-trigger"></scroll-sentinel>
</div>

<script>
  document.getElementById('load-more-trigger')
    .addEventListener('sentinel:visible', (e) => {
      console.log('Load more content!');
      loadMoreItems();
    });
</script>
```

### With Root Margin (Pre-loading)

```html
<!-- Trigger 200px before sentinel enters viewport -->
<scroll-sentinel 
  root-margin="200px"
  threshold="0">
</scroll-sentinel>
```

### Trigger Once Mode

```html
<!-- Trigger only on first visibility -->
<scroll-sentinel 
  trigger-once
  id="one-time-trigger">
</scroll-sentinel>

<script>
  const sentinel = document.getElementById('one-time-trigger');
  
  sentinel.addEventListener('sentinel:triggered', () => {
    console.log('Triggered once!');
  });
  
  // Later: reset to allow re-trigger
  sentinel.reset();
</script>
```

### Debug Mode

```html
<!-- Show visual indicator for development -->
<scroll-sentinel debug id="debug-sentinel"></scroll-sentinel>
```

### EventBus Integration

```javascript
// Subscribe to sentinel events globally
EventBus.subscribe('sentinel:visible', (event) => {
  console.log('Sentinel visible:', event.payload);
  
  // Trigger load-more command
  EventBus.publish({
    type: 'content:load-more',
    payload: {
      source: event.payload.sentinel.id,
      timestamp: event.timestamp
    }
  });
});
```

## API

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `threshold` | number | `0` | Intersection ratio (0.0-1.0) to trigger |
| `root-margin` | string | `"0px"` | Margin around root for early/late triggering |
| `trigger-once` | boolean | `false` | Trigger only on first visibility |
| `disabled` | boolean | `false` | Disable intersection observation |
| `debug` | boolean | `false` | Show visual debug indicator |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isVisible` | boolean | Current visibility state (readonly) |
| `hasTriggered` | boolean | Whether triggered in trigger-once mode (readonly) |
| `threshold` | number | Get/set threshold value |
| `rootMargin` | string | Get/set root margin |
| `triggerOnce` | boolean | Get/set trigger-once mode |
| `disabled` | boolean | Get/set disabled state |

### Methods

| Method | Description |
|--------|-------------|
| `reset()` | Reset triggered state (useful for trigger-once mode) |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `sentinel:visible` | `{ sentinel, entry, intersectionRatio, boundingClientRect, timestamp }` | Fired when sentinel enters viewport |
| `sentinel:hidden` | `{ sentinel, entry, intersectionRatio, boundingClientRect, visibilityDuration, timestamp }` | Fired when sentinel exits viewport |
| `sentinel:triggered` | `{ sentinel, entry, intersectionRatio, boundingClientRect, timestamp }` | Fired on first visibility (semantic alias) |

## Performance

- **Render Budget**: <1ms (minimal DOM)
- **Memory Budget**: <100KB per instance
- **Event Latency**: <16ms from visibility to event publish
- **Observer Overhead**: Negligible (native browser API)

## Integration with Infinite Loader

```html
<infinite-loader id="content-loader">
  <div slot="items">
    <!-- Content items -->
  </div>
  
  <scroll-sentinel 
    slot="sentinel"
    root-margin="200px"
    threshold="0">
  </scroll-sentinel>
  
  <div slot="loading">Loading more...</div>
</infinite-loader>

<script>
  const loader = document.getElementById('content-loader');
  
  loader.addEventListener('load-more', async () => {
    const items = await fetchMoreItems();
    loader.appendItems(items);
  });
</script>
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 12.2+)
- Intersection Observer is widely supported (95%+ global coverage)

## Related Components

- `infinite-loader` - Consumer of sentinel events for infinite scroll
- `lazy-image` - Uses similar intersection observer pattern
- `viewport-tracker` - Tracks element visibility in viewport

## See Also

- [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) § Scroll Sentinel
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)