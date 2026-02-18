# Memoization Strategy for Audio Components

## Overview

This document provides guidelines for using memoization patterns (`useMemo`/`useCallback` equivalents) in Harmony Design System audio components to optimize performance while maintaining the 16ms render budget and 10ms audio processing latency.

## Core Principles

1. **Audio Thread First**: Never memoize on the audio render thread (AudioWorklet). Memoization adds overhead that violates the 10ms latency constraint.
2. **UI Thread Selective**: Only memoize expensive computations in UI components that would otherwise cause frame drops.
3. **Measure Before Optimizing**: Use Chrome DevTools Performance panel to identify actual bottlenecks before adding memoization.
4. **Vanilla JS Patterns**: We use vanilla JavaScript equivalents, not React hooks.

## When to Memoize

### ✅ DO Memoize

1. **Expensive Calculations in Render Path**
   - FFT visualizations (spectrum analysis)
   - Waveform rendering calculations
   - Complex layout computations for large track lists

2. **Event Handler Creation**
   - Handlers passed to child components
   - Handlers used in event listeners that re-register frequently

3. **Reference Equality Optimization**
   - Objects/arrays passed as component properties
   - Configuration objects for Web Audio API nodes

### ❌ DO NOT Memoize

1. **Audio Processing Functions**
   - AudioWorklet processors
   - Real-time DSP calculations
   - Buffer manipulation in audio thread

2. **Simple Calculations**
   - Basic arithmetic (< 1ms execution)
   - String concatenation
   - Simple object property access

3. **One-Time Operations**
   - Component initialization
   - Setup functions called once

## Vanilla JS Memoization Patterns

### Pattern 1: Cached Property with Invalidation

For expensive computed values that depend on component state:

```javascript
/**
 * Memoizes expensive spectrum calculation
 * @example
 * class SpectrumAnalyzer extends HTMLElement {
 *   #fftCache = new MemoizedValue(() => this.#calculateFFT());
 *   
 *   set audioData(value) {
 *     this.#audioData = value;
 *     this.#fftCache.invalidate();
 *   }
 *   
 *   get spectrum() {
 *     return this.#fftCache.get();
 *   }
 * }
 */
class MemoizedValue {
  #compute;
  #cached;
  #valid = false;

  constructor(computeFn) {
    this.#compute = computeFn;
  }

  get() {
    if (!this.#valid) {
      this.#cached = this.#compute();
      this.#valid = true;
    }
    return this.#cached;
  }

  invalidate() {
    this.#valid = false;
  }
}
```

**Use for**: FFT results, waveform paths, layout calculations

### Pattern 2: Weak Memoization for Event Handlers

For handlers that need stable references:

```javascript
/**
 * Creates stable event handler references
 * @example
 * class AudioControl extends HTMLElement {
 *   #handlers = new WeakMemo();
 *   
 *   connectedCallback() {
 *     const handler = this.#handlers.get(this.#handlePlay, this);
 *     this.addEventListener('click', handler);
 *   }
 *   
 *   #handlePlay(event) {
 *     // Handler implementation
 *   }
 * }
 */
class WeakMemo {
  #cache = new WeakMap();

  get(fn, context) {
    if (!this.#cache.has(fn)) {
      this.#cache.set(fn, fn.bind(context));
    }
    return this.#cache.get(fn);
  }
}
```

**Use for**: Event handlers, callback functions passed to child components

### Pattern 3: Dependency-Based Cache

For values that depend on multiple inputs:

```javascript
/**
 * Memoizes based on dependency array (similar to useMemo)
 * @example
 * class WaveformRenderer extends HTMLElement {
 *   #pathCache = new DependencyCache();
 *   
 *   render() {
 *     const path = this.#pathCache.compute(
 *       [this.audioBuffer, this.width, this.height],
 *       () => this.#generateWaveformPath()
 *     );
 *     this.#drawPath(path);
 *   }
 * }
 */
class DependencyCache {
  #lastDeps = [];
  #lastResult;

  compute(deps, computeFn) {
    if (this.#depsChanged(deps)) {
      this.#lastDeps = deps;
      this.#lastResult = computeFn();
    }
    return this.#lastResult;
  }

  #depsChanged(newDeps) {
    if (this.#lastDeps.length !== newDeps.length) return true;
    return newDeps.some((dep, i) => !Object.is(dep, this.#lastDeps[i]));
  }
}
```

**Use for**: Waveform paths, spectrum data, filtered lists

## Component-Specific Guidelines

### Spectrum Analyzer

```javascript
/**
 * Spectrum analyzer with memoized FFT calculation
 * Location: components/organisms/spectrum-analyzer.js
 */
class SpectrumAnalyzer extends HTMLElement {
  #fftCache = new MemoizedValue(() => this.#performFFT());
  #audioData = null;

  set audioData(buffer) {
    this.#audioData = buffer;
    this.#fftCache.invalidate();
    this.#scheduleRender();
  }

  #performFFT() {
    // Expensive FFT calculation
    // Only runs when audioData changes
    const fft = new Float32Array(this.#fftSize);
    // ... FFT implementation
    return fft;
  }

  render() {
    const spectrum = this.#fftCache.get();
    this.#drawSpectrum(spectrum);
  }
}
```

### Waveform Display

```javascript
/**
 * Waveform with cached path generation
 * Location: components/organisms/waveform-display.js
 */
class WaveformDisplay extends HTMLElement {
  #pathCache = new DependencyCache();

  render() {
    const path = this.#pathCache.compute(
      [this.audioBuffer, this.offsetWidth, this.offsetHeight],
      () => {
        // Expensive path calculation
        return this.#generateSVGPath(
          this.audioBuffer,
          this.offsetWidth,
          this.offsetHeight
        );
      }
    );

    this.shadowRoot.querySelector('path').setAttribute('d', path);
  }
}
```

### Transport Controls

```javascript
/**
 * Transport bar with stable event handlers
 * Location: components/composites/transport-bar/transport-bar.js
 */
class TransportBar extends HTMLElement {
  #handlers = new WeakMemo();

  connectedCallback() {
    const playHandler = this.#handlers.get(this.#handlePlay, this);
    const stopHandler = this.#handlers.get(this.#handleStop, this);

    this.shadowRoot.querySelector('#play').addEventListener('click', playHandler);
    this.shadowRoot.querySelector('#stop').addEventListener('click', stopHandler);
  }

  #handlePlay(event) {
    this.dispatchEvent(new CustomEvent('transport-play'));
  }

  #handleStop(event) {
    this.dispatchEvent(new CustomEvent('transport-stop'));
  }
}
```

## Performance Measurement

### Before Adding Memoization

1. **Profile the Component**
   ```javascript
   // Add performance marks
   performance.mark('render-start');
   this.render();
   performance.mark('render-end');
   performance.measure('render', 'render-start', 'render-end');
   ```

2. **Check Frame Times**
   - Open Chrome DevTools → Performance
   - Record interaction
   - Look for frames > 16ms
   - Identify expensive functions

3. **Verify Need**
   - Is the function called multiple times per frame?
   - Does it take > 2ms to execute?
   - Is the result deterministic based on inputs?

### After Adding Memoization

1. **Verify Improvement**
   - Compare before/after performance marks
   - Check cache hit rate in development
   - Ensure no memory leaks

2. **Monitor Memory**
   ```javascript
   // Add cache size tracking in development
   if (process.env.NODE_ENV === 'development') {
     console.log('Cache size:', this.#cache.size);
   }
   ```

## Anti-Patterns to Avoid

### ❌ Memoizing in AudioWorklet

```javascript
// WRONG: Never memoize on audio thread
class BadAudioProcessor extends AudioWorkletProcessor {
  #cache = new Map(); // ❌ Adds latency

  process(inputs, outputs, parameters) {
    const cached = this.#cache.get(inputs); // ❌ Cache lookup overhead
    // ...
  }
}
```

### ❌ Over-Memoization

```javascript
// WRONG: Memoizing trivial calculations
class OverMemoized extends HTMLElement {
  #cache = new MemoizedValue(() => this.width * 2); // ❌ Too simple
}
```

### ❌ Forgetting to Invalidate

```javascript
// WRONG: Cache never invalidates
class StaleCache extends HTMLElement {
  #cache = new MemoizedValue(() => this.#expensiveCalc());

  set data(value) {
    this.#data = value;
    // ❌ Forgot to invalidate cache
  }
}
```

## Testing Memoization

### Unit Test Pattern

```javascript
/**
 * Test that memoization works correctly
 * Location: tests/performance/memoization.test.js
 */
describe('MemoizedValue', () => {
  it('should cache result', () => {
    let callCount = 0;
    const memo = new MemoizedValue(() => {
      callCount++;
      return 42;
    });

    const result1 = memo.get();
    const result2 = memo.get();

    assert.equal(result1, 42);
    assert.equal(result2, 42);
    assert.equal(callCount, 1); // Called once
  });

  it('should recompute after invalidation', () => {
    let callCount = 0;
    const memo = new MemoizedValue(() => ++callCount);

    memo.get(); // 1
    memo.invalidate();
    const result = memo.get(); // 2

    assert.equal(result, 2);
  });
});
```

## Integration with EventBus

Memoization should not interfere with event-driven architecture:

```javascript
/**
 * Component with memoized rendering and event publishing
 */
class AudioComponent extends HTMLElement {
  #renderCache = new DependencyCache();

  connectedCallback() {
    // Subscribe to events (no memoization needed)
    window.eventBus?.subscribe('audio-data-updated', (event) => {
      this.#handleAudioData(event.detail);
    });
  }

  #handleAudioData(data) {
    // Update state (no memoization)
    this.audioData = data;

    // Publish event (no memoization)
    window.eventBus?.publish({
      type: 'visualization-updated',
      source: 'audio-component',
      payload: { timestamp: Date.now() }
    });

    // Render with memoization
    this.#scheduleRender();
  }

  render() {
    // Memoize expensive rendering calculation
    const visualization = this.#renderCache.compute(
      [this.audioData, this.width, this.height],
      () => this.#generateVisualization()
    );

    this.#draw(visualization);
  }
}
```

## Summary Checklist

Before adding memoization:
- [ ] Profiled component and identified bottleneck
- [ ] Verified function is called multiple times per frame
- [ ] Confirmed execution time > 2ms
- [ ] Checked it's not in audio thread (AudioWorklet)

After adding memoization:
- [ ] Added invalidation logic for all state dependencies
- [ ] Tested cache hit/miss scenarios
- [ ] Verified performance improvement with DevTools
- [ ] Added tests for memoization behavior
- [ ] Documented why memoization is needed

## Related Documentation

- [Performance Budget](../DESIGN_SYSTEM.md#performance-budget)
- [Audio Processing Guidelines](../DESIGN_SYSTEM.md#audio-processing)
- [Component Lifecycle](../DESIGN_SYSTEM.md#component-lifecycle)
- [Testing Strategy](../tests/README.md)

## References

- Implementation: `performance/memoization-utils.js`
- Tests: `tests/performance/memoization.test.js`
- Examples: `examples/memoization-patterns.html`