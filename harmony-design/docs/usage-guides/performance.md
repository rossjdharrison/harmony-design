# Performance Guide

Harmony Design System is built for performance. This guide helps you maintain optimal performance in your applications.

## Performance Budgets

Harmony enforces strict performance budgets:

- **Render Budget**: 16ms per frame (60fps)
- **Memory Budget**: 50MB WASM heap maximum
- **Load Budget**: 200ms initial load time

These are **absolute constraints** that cannot be violated.

## Component Performance

### Lazy Loading

Load components only when needed:

```javascript
// Load on interaction
button.addEventListener('click', async () => {
    const { HarmonyModal } = await import('./components/harmony-modal.js');
    const modal = new HarmonyModal();
    document.body.appendChild(modal);
});

// Load on intersection
const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
            await import('./components/harmony-card.js');
            observer.unobserve(entry.target);
        }
    });
});
```

### Efficient Rendering

Components use efficient rendering strategies:

```javascript
// Good - batch updates
requestAnimationFrame(() => {
    component.property1 = value1;
    component.property2 = value2;
    component.property3 = value3;
    // Single render cycle
});

// Bad - multiple renders
component.property1 = value1; // Render
component.property2 = value2; // Render
component.property3 = value3; // Render
```

### Virtual Scrolling

For large lists, use virtual scrolling:

```html
<harmony-virtual-list 
    item-height="48"
    visible-items="20">
    <!-- Only visible items are rendered -->
</harmony-virtual-list>
```

## Animation Performance

### Use Transform and Opacity

Animate only compositor properties:

```css
/* Good - GPU accelerated */
.element {
    transform: translateX(100px);
    opacity: 0.5;
}

/* Bad - triggers layout */
.element {
    left: 100px;
    width: 200px;
}
```

### Request Animation Frame

Use `requestAnimationFrame` for smooth animations:

```javascript
function animate() {
    // Update position
    element.style.transform = `translateX(${position}px)`;
    
    if (animating) {
        requestAnimationFrame(animate);
    }
}

requestAnimationFrame(animate);
```

### Will-Change Hint

Use `will-change` for upcoming animations:

```css
.element {
    will-change: transform;
}

/* Remove after animation */
.element.animated {
    will-change: auto;
}
```

## Memory Management

### Clean Up Event Listeners

Always remove event listeners:

```javascript
class MyComponent extends HTMLElement {
    connectedCallback() {
        this.handleClick = () => { /* ... */ };
        this.addEventListener('click', this.handleClick);
    }
    
    disconnectedCallback() {
        this.removeEventListener('click', this.handleClick);
    }
}
```

### Avoid Memory Leaks

```javascript
// Bad - creates memory leak
const elements = [];
setInterval(() => {
    elements.push(document.createElement('div'));
}, 1000);

// Good - clean up
let intervalId;
function startCollecting() {
    intervalId = setInterval(() => {
        // Process and clean up
    }, 1000);
}

function stopCollecting() {
    clearInterval(intervalId);
    elements.length = 0; // Clear array
}
```

### Weak References

Use WeakMap/WeakSet for caching:

```javascript
const cache = new WeakMap();

function getCachedData(element) {
    if (cache.has(element)) {
        return cache.get(element);
    }
    
    const data = computeExpensiveData(element);
    cache.set(element, data);
    return data;
}
// Elements can be garbage collected
```

## Network Performance

### Minimize Bundle Size

- Use tree-shaking
- Load components on demand
- Avoid large dependencies

```javascript
// Good - import only what you need
import { specificFunction } from './utils.js';

// Bad - imports everything
import * as utils from './utils.js';
```

### Resource Hints

Use resource hints for critical resources:

```html
<!-- Preconnect to API -->
<link rel="preconnect" href="https://api.example.com">

<!-- Prefetch next page -->
<link rel="prefetch" href="/next-page.js">

<!-- Preload critical resources -->
<link rel="preload" href="/critical.js" as="script">
```

## Measuring Performance

### Chrome DevTools

Use Performance panel:

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with your app
5. Stop recording
6. Analyze the flame chart

Look for:
- Long tasks (>50ms)
- Layout thrashing
- Memory leaks
- Excessive repaints

### Performance API

Measure in code:

```javascript
// Mark start
performance.mark('component-render-start');

// Render component
component.render();

// Mark end
performance.mark('component-render-end');

// Measure duration
performance.measure(
    'component-render',
    'component-render-start',
    'component-render-end'
);

// Get measurement
const measure = performance.getEntriesByName('component-render')[0];
console.log(`Render took ${measure.duration}ms`);
```

### Performance Observer

Monitor performance continuously:

```javascript
const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.duration > 16) {
            console.warn(`Slow render: ${entry.duration}ms`);
        }
    }
});

observer.observe({ entryTypes: ['measure'] });
```

## Testing Performance

### Automated Performance Tests

Include performance tests in your test suite:

```javascript
describe('Button Performance', () => {
    it('renders within budget', () => {
        const start = performance.now();
        
        const button = document.createElement('harmony-button');
        document.body.appendChild(button);
        
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(16); // 16ms budget
    });
});
```

### Load Testing

Test with realistic data volumes:

```javascript
// Test with 1000 items
const list = document.createElement('harmony-list');
list.items = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    label: `Item ${i}`
}));

// Measure render time
const start = performance.now();
document.body.appendChild(list);
const duration = performance.now() - start;

console.log(`Rendered 1000 items in ${duration}ms`);
```

## Best Practices

### Do: Debounce Expensive Operations

```javascript
function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

const search = debounce((query) => {
    // Expensive search operation
}, 300);

input.addEventListener('input', (e) => search(e.target.value));
```

### Do: Use Passive Event Listeners

```javascript
// Good - allows browser to optimize scrolling
element.addEventListener('touchstart', handler, { passive: true });

// Bad - blocks scrolling
element.addEventListener('touchstart', handler);
```

### Don't: Block the Main Thread

```javascript
// Bad - blocks UI
for (let i = 0; i < 1000000; i++) {
    // Heavy computation
}

// Good - split work
async function processInChunks(data, chunkSize = 100) {
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await processChunk(chunk);
        
        // Yield to browser
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}
```

### Don't: Create Layout Thrashing

```javascript
// Bad - read/write/read/write causes multiple layouts
elements.forEach(el => {
    const height = el.offsetHeight; // Read (layout)
    el.style.height = height + 10 + 'px'; // Write (layout)
});

// Good - batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // Read
elements.forEach((el, i) => {
    el.style.height = heights[i] + 10 + 'px'; // Write
});
```

## Performance Checklist

Before deploying:

- [ ] All animations run at 60fps
- [ ] Initial load under 200ms
- [ ] Memory usage under 50MB
- [ ] No long tasks (>50ms)
- [ ] Images optimized and lazy loaded
- [ ] Code split and tree-shaken
- [ ] Performance tests passing
- [ ] Tested on low-end devices

## Related Guides

- [Component Basics](./component-basics.md) - Component fundamentals
- [Testing Guide](./testing.md) - Performance testing
- See [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#performance-budgets) for budget details