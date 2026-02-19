# Hooks

Reusable reactive hooks for the Harmony Design System.

## Available Hooks

### useReducedMotion

Respects the `prefers-reduced-motion` media query for accessibility.

**Location:** `hooks/use-reduced-motion.js`

**Usage:**
```javascript
import { useReducedMotion, getAnimationDuration } from './hooks/use-reduced-motion.js';

// Create hook instance
const motionHook = useReducedMotion();

// Check current preference
if (motionHook.prefersReducedMotion) {
  element.style.transition = 'none';
}

// Subscribe to changes
const unsubscribe = motionHook.subscribe((prefersReduced) => {
  console.log('Motion preference changed:', prefersReduced);
});

// Helper: Get appropriate duration
const duration = getAnimationDuration(300, 50);
element.style.transitionDuration = `${duration}ms`;

// Cleanup
unsubscribe();
motionHook.cleanup();
```

**Testing:**
Open `hooks/use-reduced-motion.test.html` in Chrome and use DevTools to emulate motion preferences.

## Architecture

Hooks follow these principles:

1. **Reactive:** Subscribe to changes and get notified
2. **Cleanup:** Always provide cleanup methods
3. **Performance:** Minimal overhead, efficient listeners
4. **Accessibility:** Respect user preferences
5. **Browser Support:** Graceful fallbacks for older APIs

## See Also

- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#accessibility-motion-preferences)
- [animations/motion-variants.js](../animations/motion-variants.js)
- [animations/transition-presets.js](../animations/transition-presets.js)