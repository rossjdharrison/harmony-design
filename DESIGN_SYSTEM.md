# Harmony Design System

This document describes the Harmony Design System architecture, patterns, and implementation guidelines.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Token System](#token-system)
- [Experiment System](#experiment-system)
- [Component Patterns](#component-patterns)
- [Event Bus](#event-bus)
- [Performance Guidelines](#performance-guidelines)

## Overview

Harmony is a high-performance design system built for audio production interfaces. It uses vanilla JavaScript, Web Components, and WASM for core functionality.

## Architecture

### Technology Stack

- **UI Layer**: Vanilla HTML/CSS/JS with Web Components
- **Core Logic**: Rust compiled to WASM
- **State Management**: Event-driven architecture via EventBus
- **Storage**: IndexedDB for persistence

### Bounded Contexts

Core functionality is organized into bounded contexts implemented in Rust:

- `component-lifecycle`: Component state management
- Additional contexts in `bounded-contexts/` directory

## Token System

Design tokens define the visual language of the system.

### Token Files

- [`tokens/colors.json`](./tokens/colors.json) - Color palette and semantic colors
- [`tokens/spacing.json`](./tokens/spacing.json) - Spacing scale
- [`tokens/typography.json`](./tokens/typography.json) - Font families, sizes, weights
- [`tokens/shadows.json`](./tokens/shadows.json) - Shadow and elevation system

### Using Tokens

Tokens are consumed via CSS custom properties:

```css
.my-component {
  color: var(--color-primary-500);
  padding: var(--spacing-4);
  font-size: var(--font-size-body);
}
```

## Experiment System

The experiment system enables A/B testing and feature experimentation with statistical rigor.

### Type Definitions

All experiment types are defined in [`types/experiment.d.ts`](./types/experiment.d.ts). Key types include:

- **`Experiment`**: Complete experiment configuration with variants, metrics, and targeting
- **`ExperimentVariant`**: Individual variant definition with traffic allocation
- **`ExperimentMetric`**: Metric definition for measurement (counter, gauge, histogram, etc.)
- **`ExperimentAssignment`**: User assignment to a variant
- **`ExperimentExposure`**: Exposure tracking event when user sees variant
- **`MetricEvent`**: Metric measurement event
- **`ExperimentResults`**: Statistical analysis results with comparisons

### Core Concepts

#### Experiments

An experiment tests multiple variants against a control. Each experiment has:

- **Variants**: Different versions being tested (one must be control)
- **Metrics**: Measurements to track (one primary, multiple secondary)
- **Traffic Allocation**: Percentage of users included (0-100)
- **Targeting**: Rules for user inclusion (segments, geo, device, time)
- **Status**: Lifecycle state (draft, running, completed, etc.)

#### Variants

Each variant represents a different experience:

- **Allocation**: Traffic percentage assigned to this variant
- **Config**: Configuration payload for the variant
- **Features**: Optional feature flags enabled
- **isControl**: Whether this is the baseline variant

#### Metrics

Metrics measure experiment success:

- **Types**: counter, gauge, histogram, rate, conversion
- **Primary vs Secondary**: One primary metric, multiple secondary
- **Statistical Tests**: t-test, chi-square, Mann-Whitney, Bayesian
- **Aggregation**: sum, avg, min, max, p50, p95, p99

### Usage Pattern

1. **Define Experiment**: Create experiment config with variants and metrics
2. **Assignment**: User gets assigned to a variant (deterministic hash-based)
3. **Exposure**: Track when user actually sees the variant
4. **Measurement**: Record metric events as user interacts
5. **Analysis**: Calculate statistical significance and lift

### Event Bus Integration

Experiment system publishes events via EventBus:

```javascript
// Exposure tracking
eventBus.publish({
  type: 'ExperimentExposure',
  payload: {
    experimentId: 'exp-123',
    userId: 'user-456',
    variantId: 'variant-a',
    timestamp: Date.now()
  }
});

// Metric tracking
eventBus.publish({
  type: 'MetricTrack',
  payload: {
    experimentId: 'exp-123',
    userId: 'user-456',
    variantId: 'variant-a',
    metricId: 'click-rate',
    value: 1,
    timestamp: Date.now()
  }
});
```

### Components

- [`components/experiment/experiment-context.js`](./components/experiment/experiment-context.js) - Context provider
- [`components/experiment/use-experiment.js`](./components/experiment/use-experiment.js) - Hook for variant access
- [`components/experiment/variant-component.js`](./components/experiment/variant-component.js) - Declarative variant rendering
- [`components/experiment/experiment-analytics.js`](./components/experiment/experiment-analytics.js) - Analytics tracking

### Statistical Analysis

Results include:

- **Lift**: Percentage change from control
- **P-value**: Statistical significance
- **Confidence Intervals**: Range of likely true effect
- **Sample Size**: Number of users per variant
- **Recommendations**: Continue, stop winner, or needs more data

### Targeting Rules

Experiments can target specific users:

```typescript
{
  includeSegments: ['premium-users'],
  geo: { countries: ['US', 'CA'] },
  device: { types: ['desktop'] },
  schedule: { daysOfWeek: [1, 2, 3, 4, 5] } // Weekdays only
}
```

### Best Practices

1. **Always include a control variant** with `isControl: true`
2. **Define one primary metric** for decision making
3. **Set minimum sample sizes** to ensure statistical power
4. **Track exposure separately** from assignment
5. **Use deterministic assignment** for consistent user experience
6. **Monitor data quality** via health indicators
7. **Respect user privacy** - anonymize where possible

## Component Patterns

### Web Components

All UI components use Web Components with shadow DOM:

```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>/* styles */</style>
      <div>/* markup */</div>
    `;
  }
}

customElements.define('my-component', MyComponent);
```

### Event Publishing

Components publish events, never call bounded contexts directly:

```javascript
this.dispatchEvent(new CustomEvent('action', {
  bubbles: true,
  composed: true,
  detail: { /* payload */ }
}));
```

## Event Bus

The EventBus routes events between components and bounded contexts.

### Pattern

1. Component publishes event
2. EventBus validates and routes
3. Bounded context subscribes and processes
4. Result published as new event

### Debugging

EventBusComponent is available on every page via `Ctrl+Shift+E` for real-time event monitoring.

## Performance Guidelines

### Budgets

- **Render**: Maximum 16ms per frame (60fps)
- **Memory**: Maximum 50MB WASM heap
- **Load**: Maximum 200ms initial load
- **Audio Latency**: Maximum 10ms end-to-end

### Testing

All UI components must be tested in Chrome before completion. Verify all states: default, hover, focus, active, disabled, error, loading, empty.

### Animations

Target 60fps for standard UI animations. Use Chrome DevTools Performance panel to verify.

## Contributing

1. Check existing structure before creating files
2. Follow TypeNavigator-only queries for data access
3. Use EventBus ProcessCommand pattern
4. Pass quality gates before proceeding
5. Update this documentation with every change
6. Test in Chrome before marking complete

## File Organization

```
harmony-design/
├── tokens/              # Design tokens (JSON)
├── types/               # TypeScript type definitions
├── components/          # Web Components
├── bounded-contexts/    # Rust WASM modules
├── hooks/               # Reusable hooks
├── contexts/            # Context providers
├── utils/               # Utility functions
└── DESIGN_SYSTEM.md     # This file
```

## Links

- [Experiment Types](./types/experiment.d.ts)
- [Token Files](./tokens/)
- [Components](./components/)
- [Bounded Contexts](./bounded-contexts/)