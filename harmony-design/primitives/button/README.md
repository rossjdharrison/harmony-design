# HDS Button Primitive

Button primitive component with toggle and momentary interaction modes.

## Quick Start

```html
<script type="module" src="./hds-button.js"></script>

<!-- Momentary button (default) -->
<hds-button>Click Me</hds-button>

<!-- Toggle button -->
<hds-button mode="toggle" pressed>Mute</hds-button>
```

## Modes

### Momentary Mode (Default)
Standard button behavior - emits press and release events.

```html
<hds-button>Play</hds-button>
```

Events:
- `button-press` - Fired when button is pressed
- `button-release` - Fired when button is released

### Toggle Mode
Button maintains pressed/unpressed state.

```html
<hds-button mode="toggle" pressed>Mute</hds-button>
```

Events:
- `button-toggle` - Fired when button state changes (includes `pressed` boolean)

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | string | `"momentary"` | Interaction mode: `"momentary"` or `"toggle"` |
| `pressed` | boolean | `false` | Pressed state (toggle mode only) |
| `disabled` | boolean | `false` | Disabled state |
| `variant` | string | `"primary"` | Visual variant: `"primary"`, `"secondary"`, `"tertiary"` |
| `size` | string | `"medium"` | Size: `"small"`, `"medium"`, `"large"` |

## Variants

### Primary (Default)
```html
<hds-button variant="primary">Primary</hds-button>
```

### Secondary
```html
<hds-button variant="secondary">Secondary</hds-button>
```

### Tertiary
```html
<hds-button variant="tertiary">Tertiary</hds-button>
```

## Sizes

```html
<hds-button size="small">Small</hds-button>
<hds-button size="medium">Medium</hds-button>
<hds-button size="large">Large</hds-button>
```

## Programmatic API

### Momentary Mode
```javascript
const button = document.querySelector('hds-button');

// Trigger press
button.press();

// Trigger release
button.release();
```

### Toggle Mode
```javascript
const button = document.querySelector('hds-button[mode="toggle"]');

// Toggle state
button.toggle();

// Check state
console.log(button.hasAttribute('pressed'));
```

## Event Integration

Button events follow the EventBus pattern - components publish events, never call BCs directly.

```javascript
// Listen for button events
document.addEventListener('button-press', (event) => {
  console.log('Button pressed:', event.detail);
  // Publish command to EventBus
  eventBus.emit('PlayCommand', { timestamp: event.detail.timestamp });
});

document.addEventListener('button-toggle', (event) => {
  console.log('Button toggled:', event.detail.pressed);
  // Publish command to EventBus
  eventBus.emit('MuteCommand', { muted: event.detail.pressed });
});
```

## Keyboard Support

- **Tab**: Focus navigation
- **Space**: Activate button
- **Enter**: Activate button

## Accessibility

- Proper ARIA attributes (`aria-pressed` for toggle mode)
- Keyboard navigation support
- Focus indicators
- Disabled state handling

## Testing

Open `index.html` in Chrome to test:
- All variants and sizes
- Both interaction modes
- Keyboard navigation
- Programmatic API
- Event logging

## Performance

- Shadow DOM for style encapsulation
- CSS transitions for smooth interactions
- No runtime dependencies
- Minimal DOM operations

## Browser Support

- Chrome (tested)
- Modern browsers with Web Components support

## See Also

- [Design System Documentation](../../DESIGN_SYSTEM.md#button-primitive)
- [EventBus Pattern](../../DESIGN_SYSTEM.md#eventbus-pattern)