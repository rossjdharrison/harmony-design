# Focus Trap Component

Focus containment utility and web component for modal dialogs and overlays.

## Features

- **Keyboard Navigation**: Tab and Shift+Tab cycle through focusable elements
- **Escape Key**: Optionally close trap with Escape key
- **Return Focus**: Returns focus to triggering element on deactivation
- **Outside Click**: Optional handling of clicks outside trap
- **Pause/Resume**: Temporarily disable trap without deactivation
- **Accessibility**: Full ARIA and keyboard support

## Usage

### As Web Component

```html
<harmony-focus-trap active escape-deactivates return-focus>
  <div role="dialog" aria-labelledby="dialog-title">
    <h2 id="dialog-title">Modal Dialog</h2>
    <button>First Focusable</button>
    <input type="text" placeholder="Input field">
    <button>Last Focusable</button>
  </div>
</harmony-focus-trap>
```

### As JavaScript Utility

```javascript
import { createFocusTrap } from '../../utils/focus-trap.js';

const container = document.querySelector('.modal');
const trap = createFocusTrap(container, {
  initialFocus: container.querySelector('.primary-button'),
  escapeDeactivates: true,
  returnFocus: true,
  onActivate: () => console.log('Trap activated'),
  onDeactivate: () => console.log('Trap deactivated')
});

// Later...
trap.deactivate();
```

## API

### Attributes

- `active` - Activates the focus trap
- `escape-deactivates` - Allow Escape key to deactivate (default: true)
- `return-focus` - Return focus to previous element on deactivate (default: true)
- `allow-outside-click` - Allow clicks outside trap (default: false)

### Methods

- `activate()` - Activate the focus trap
- `deactivate()` - Deactivate the focus trap
- `pause()` - Temporarily pause the trap
- `resume()` - Resume a paused trap
- `isActive()` - Check if trap is active
- `isPaused()` - Check if trap is paused

### Events

- `focus-trap:activated` - Fired when trap activates
- `focus-trap:deactivated` - Fired when trap deactivates

## Accessibility

The focus trap follows WCAG 2.1 guidelines:

- **2.1.2 No Keyboard Trap**: Users can always exit with Escape
- **2.4.3 Focus Order**: Tab order follows DOM structure
- **2.4.7 Focus Visible**: Clear focus indicators

## Performance

- **Event Delegation**: Uses capture phase for efficiency
- **RAF Scheduling**: Focus changes use requestAnimationFrame
- **Minimal DOM Queries**: Caches focusable elements

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Related

- See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#focus-trap) for architecture
- See [Modal Component](../modal/) for usage example
- See [Dialog Component](../dialog/) for usage example