# Hooks

Reusable JavaScript hooks for reactive patterns in Harmony Design System.

## Available Hooks

### Container Query Hooks

- **`useContainerQuery`** - JavaScript-based container queries with ResizeObserver
- **`createContainerQueryMatcher`** - Multi-breakpoint container query matching
- **`createContainerQueryClassApplier`** - Automatic CSS class application based on container size

See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#container-query-hooks) for detailed documentation.

## Usage Pattern

All hooks follow the vanilla JS pattern with explicit lifecycle management:

```javascript
import { useContainerQuery } from './hooks/useContainerQuery.js';

const containerRef = { current: document.querySelector('.container') };
const query = useContainerQuery(containerRef, { minWidth: 600 });

// Subscribe to changes
const unsubscribe = query.subscribe((state) => {
  console.log('Matches:', state.matches);
  console.log('Dimensions:', state.dimensions);
});

// Cleanup when done
unsubscribe();
query.disconnect();
```

## Performance

- Query evaluation: <1ms target
- ResizeObserver-based (native browser optimization)
- Optional debouncing for high-frequency updates
- No framework dependencies

## Testing

Run tests in browser:
```
?test=useContainerQuery
```

Or run programmatically:
```javascript
import { runAllTests } from './hooks/useContainerQuery.test.js';
runAllTests();
```