# HarmonyToggle Control Component

A toggle button control component that wraps the button primitive with state management and event publishing capabilities.

## Overview

HarmonyToggle provides a stateful toggle button control that integrates with the Harmony Design System's event architecture. It wraps the button primitive component and adds toggle-specific behavior.

## Usage

```html
<harmony-toggle
  label="Mute"
  pressed="false"
  variant="primary"
  size="medium">
</harmony-toggle>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `label` | string | "Toggle" | Button label text |
| `pressed` | boolean | false | Toggle state (pressed/unpressed) |
| `variant` | string | "secondary" | Visual variant (primary, secondary, danger, ghost) |
| `size` | string | "medium" | Size variant (small, medium, large) |
| `disabled` | boolean | false | Disabled state |

## Properties

### Methods

- `toggle()` - Toggle the pressed state
- `setPressed(pressed: boolean)` - Set pressed state programmatically
- `getPressed(): boolean` - Get current pressed state

## Events

### harmony-toggle-changed

Published when the toggle state changes (either by user interaction or programmatic control).

**Event Detail:**
```javascript
{
  pressed: boolean,      // New pressed state
  label: string,         // Toggle label
  componentId: string,   // Component ID (if set)
  timestamp: number      // Event timestamp
}
```

## Examples

### Basic Toggle

```html
<harmony-toggle label="Mute"></harmony-toggle>
```

### Pre-pressed Toggle

```html
<harmony-toggle label="Solo" pressed="true" variant="primary"></harmony-toggle>
```

### Programmatic Control

```javascript
const toggle = document.querySelector('harmony-toggle');

// Toggle state
toggle.toggle();

// Set specific state
toggle.setPressed(true);

// Get current state
const isPressed = toggle.getPressed();

// Listen to changes
toggle.addEventListener('harmony-toggle-changed', (event) => {
  console.log('Toggle changed:', event.detail.pressed);
});
```

### Common Audio Use Cases

```html
<!-- Mute button -->
<harmony-toggle id="mute" label="M" variant="secondary"></harmony-toggle>

<!-- Solo button -->
<harmony-toggle id="solo" label="S" variant="primary"></harmony-toggle>

<!-- Record arm -->
<harmony-toggle id="rec" label="R" variant="danger"></harmony-toggle>

<!-- Monitor -->
<harmony-toggle id="mon" label="Mon" variant="secondary"></harmony-toggle>
```

## Design Patterns

### State Management

HarmonyToggle maintains internal state and synchronizes with the DOM attribute:
- User clicks → internal state updates → attribute updates → event published
- Attribute changes → internal state updates → button updates
- Programmatic calls → internal state updates → attribute updates → event published

### Event Publishing

The component publishes events through two channels:
1. DOM CustomEvent (bubbles through shadow DOM)
2. EventBus (if available globally)

This allows both direct component listeners and system-wide event handling.

### Performance

- Transitions use CSS for hardware acceleration
- State changes are debounced through the event loop
- Shadow DOM isolation prevents style recalculation cascades
- Minimal DOM updates on state changes

## Testing

Open `harmony-toggle.test.html` in Chrome to test:
- All states (default, pressed, disabled)
- All variants (primary, secondary, danger, ghost)
- All sizes (small, medium, large)
- Programmatic control
- Event publishing
- Performance benchmarks

## Dependencies

- `harmony-button` primitive component

## Architecture Notes

**Layer:** Controls  
**Pattern:** Stateful wrapper over primitive  
**Event Model:** Publisher (does not subscribe)  
**State:** Internal state synchronized with attributes

See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#controls-layer) for architectural context.