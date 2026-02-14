# Event Source Highlighting

This feature adds visual highlighting to show which component emitted each event in the EventBusComponent.

## Features

- **Unique Color Assignment**: Each event source gets a unique, consistent color
- **Source Badges**: Visual badges show the source name with color coding
- **Border Highlighting**: Event items have colored left borders matching their source
- **Interactive Legend**: Shows all active sources with their colors
- **Auto-Update**: Legend updates dynamically as new sources emit events

## Usage

### Integration

Import the integration patch after defining EventBusComponent:

```javascript
import { patchEventBusComponent } from './integration-patch.js';

// After EventBusComponent is defined
patchEventBusComponent(EventBusComponent);
```

### Event Source Detection

The highlighter automatically detects sources from event detail objects:

1. `detail.source` - Explicit source field (preferred)
2. `detail.componentId` - Component identifier
3. `detail.emitter` - Emitter identifier
4. Falls back to "unknown" if none found

### Recommended Event Pattern

Components should include a source identifier when publishing events:

```javascript
eventBus.publish('ButtonClicked', {
  source: 'PlayButton',
  action: 'play'
});
```

## Architecture

### EventSourceHighlighter

Core class managing color assignment and source tracking:

- Maintains a map of sources to colors
- Uses a predefined color palette (12 colors)
- Provides methods for badge creation and element highlighting

### SourceLegend

UI component displaying the legend:

- Shows all active sources with colors
- Collapsible for space efficiency
- Highlights sources as events arrive
- Responsive grid layout

### Integration Patch

Non-invasive patching approach:

- Extends existing EventBusComponent without modifying core files
- Intercepts `connectedCallback`, `renderEvent`, and `clearLog`
- Adds highlighter and legend functionality

## Performance

- **Memory**: ~1KB per unique source (color + metadata)
- **Render**: Badge creation < 1ms
- **Legend Update**: O(n) where n = number of sources
- **GPU Acceleration**: Transform animations use `will-change`

## Accessibility

- Source badges have descriptive `title` attributes
- Keyboard navigation supported for legend toggle
- Focus indicators on interactive elements
- Dark mode support via `prefers-color-scheme`

## Styling

Styles are in `styles/source-highlighting.css`:

- BEM-like naming convention
- CSS custom properties for easy theming
- Responsive breakpoints for mobile
- Animation performance optimized

## Testing

Test in Chrome DevTools:

1. Open EventBusComponent (Ctrl+Shift+E)
2. Trigger events from different components
3. Verify each source has unique color
4. Check legend updates correctly
5. Test legend collapse/expand
6. Verify dark mode appearance

## See Also

- [DESIGN_SYSTEM.md](../../../harmony-design/DESIGN_SYSTEM.md#event-source-highlighting)
- [EventBusComponent Documentation](./event-bus-component.js)