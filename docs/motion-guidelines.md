# Motion Guidelines

## Overview

Motion in the Harmony Design System creates smooth, purposeful animations that enhance user experience. Our motion system respects user preferences and maintains 60fps performance.

## Core Principles

### 1. Purposeful Motion
Every animation should have a clear purpose:
- **Feedback**: Confirm user actions (button press, toggle)
- **Transition**: Guide attention between states
- **Hierarchy**: Show relationships between elements
- **Delight**: Add personality without distraction

### 2. Performance First
- Target: 60fps (16ms per frame)
- Use GPU-accelerated properties: `transform`, `opacity`
- Avoid: `width`, `height`, `top`, `left`, `margin`
- Test with Chrome DevTools Performance panel

### 3. Accessibility
- Respect `prefers-reduced-motion`
- Provide instant alternatives for essential actions
- Keep animations under 400ms for feedback
- Avoid rapid flashing (seizure risk)

## Duration Guidelines

```
Instant:    0ms     - Immediate state changes
Fast:       100ms   - Micro-interactions (hover, focus)
Normal:     200ms   - Standard transitions (fade, slide)
Slow:       300ms   - Complex animations (expand, morph)
Deliberate: 400ms   - Attention-grabbing effects
```

## Easing Functions

### Standard Easings
- **ease-out**: Natural deceleration (default for entrances)
- **ease-in**: Acceleration (exits, dismissals)
- **ease-in-out**: Smooth acceleration/deceleration (state changes)
- **linear**: Constant speed (progress indicators, loading)

### Custom Curves
```javascript
// Snappy - Quick with bounce
cubic-bezier(0.34, 1.56, 0.64, 1)

// Smooth - Gentle and fluid
cubic-bezier(0.4, 0.0, 0.2, 1)

// Expressive - Playful overshoot
cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

## Animation Patterns

### Fade
Use for: Overlays, tooltips, notifications
- Fade In: opacity 0 → 1
- Fade Out: opacity 1 → 0
- Duration: 200ms (normal)

### Slide
Use for: Drawers, panels, dropdowns
- Slide In: translateX/Y + opacity
- Slide Out: translateX/Y + opacity
- Duration: 300ms (slow)

### Scale
Use for: Modals, popovers, zoom effects
- Scale Up: scale(0.95) → scale(1)
- Scale Down: scale(1) → scale(0.95)
- Duration: 200ms (normal)

### Rotate
Use for: Loading spinners, toggle indicators
- Continuous: rotate(0deg) → rotate(360deg)
- Toggle: rotate(0deg) ↔ rotate(180deg)
- Duration: Variable

## Implementation Files

### Motion Variants
**File**: [animations/motion-variants.js](../animations/motion-variants.js)

Reusable animation configurations for common patterns:
- `fadeIn`, `fadeOut`
- `slideIn`, `slideOut` (all directions)
- `scaleIn`, `scaleOut`
- `rotateIn`, `rotateOut`

### Transition Presets
**File**: [animations/transition-presets.js](../animations/transition-presets.js)

Standard timing configurations:
- `INSTANT` (0ms)
- `FAST` (100ms)
- `NORMAL` (200ms)
- `SLOW` (300ms)
- `DELIBERATE` (400ms)

### Gesture Animations
**File**: [animations/gesture-animations.js](../animations/gesture-animations.js)

Interactive animation helpers:
- Hover effects
- Tap/press feedback
- Drag interactions
- Touch gestures

### Stagger Children
**File**: [animations/stagger-children.js](../animations/stagger-children.js)

Orchestrate animations for lists and groups:
- Sequential reveals
- Cascading effects
- Coordinated exits

### Reduced Motion Hook
**File**: [hooks/useReducedMotion.js](../hooks/useReducedMotion.js)

Accessibility helper:
- Detects `prefers-reduced-motion`
- Provides fallback animations
- Auto-updates on preference change

## Usage Examples

See [motion-examples.html](./motion-examples.html) for interactive demonstrations.

## Testing Checklist

Before shipping animations:
- [ ] Runs at 60fps on target devices
- [ ] Respects `prefers-reduced-motion`
- [ ] No layout thrashing (check Performance panel)
- [ ] Works with keyboard navigation
- [ ] Tested in Chrome (required)
- [ ] Durations follow guidelines
- [ ] Uses GPU-accelerated properties

## Common Mistakes

### ❌ Don't
```javascript
// Animating layout properties
element.style.transition = 'width 300ms';
element.style.width = '500px';

// Ignoring reduced motion
element.animate(...); // Always animates
```

### ✅ Do
```javascript
// Animate transforms instead
element.style.transition = 'transform 300ms';
element.style.transform = 'scaleX(2)';

// Check reduced motion preference
import { useReducedMotion } from '../hooks/useReducedMotion.js';
const prefersReduced = useReducedMotion();
const duration = prefersReduced ? 0 : 300;
```

## Performance Tips

1. **Batch DOM Reads/Writes**
   ```javascript
   // Read all
   const height = element.offsetHeight;
   const width = element.offsetWidth;
   
   // Then write all
   element.style.transform = `translate(${width}px, ${height}px)`;
   ```

2. **Use `will-change` Sparingly**
   ```javascript
   // Only for animations you're about to trigger
   element.style.willChange = 'transform';
   // ... animate ...
   element.style.willChange = 'auto'; // Clean up
   ```

3. **Prefer CSS Animations for Simple Cases**
   ```css
   @keyframes fade-in {
     from { opacity: 0; }
     to { opacity: 1; }
   }
   
   .fade-enter {
     animation: fade-in 200ms ease-out;
   }
   ```

4. **Use Web Animations API for Complex Sequences**
   ```javascript
   element.animate([
     { opacity: 0, transform: 'scale(0.95)' },
     { opacity: 1, transform: 'scale(1)' }
   ], {
     duration: 200,
     easing: 'ease-out'
   });
   ```

## Related Documentation

- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Main design system documentation
- [Animation Components](../animations/) - Implementation files
- [Accessibility Guidelines](../DESIGN_SYSTEM.md#accessibility) - A11y requirements