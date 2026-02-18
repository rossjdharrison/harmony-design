# Error Boundary Component

A vanilla JavaScript error boundary component that catches errors in child components and displays fallback UI.

## Features

- **Error Catching**: Captures JavaScript errors and unhandled promise rejections
- **Fallback UI**: Displays user-friendly error messages
- **Error Details**: Optional stack trace display for debugging
- **Reset Functionality**: Allows users to retry after an error
- **EventBus Integration**: Publishes errors for monitoring and logging
- **Customizable**: Configure title, message, and appearance

## Usage

### Basic Usage

```html
<error-boundary>
  <my-component></my-component>
</error-boundary>
```

### Custom Fallback Messages

```html
<error-boundary 
  fallback-title="Audio Component Failed"
  fallback-message="The audio component encountered an error. Your work has been saved.">
  <audio-processor></audio-processor>
</error-boundary>
```

### Show Error Details

```html
<error-boundary show-details="true">
  <my-component></my-component>
</error-boundary>
```

### Nested Error Boundaries

```html
<error-boundary fallback-title="Outer Boundary">
  <header-component></header-component>
  
  <error-boundary fallback-title="Content Boundary">
    <content-component></content-component>
  </error-boundary>
  
  <footer-component></footer-component>
</error-boundary>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `fallback-title` | string | "Something went wrong" | Title shown in error UI |
| `fallback-message` | string | "An error occurred..." | Message shown in error UI |
| `show-details` | boolean | false | Whether to show error stack trace |

## Methods

### `reset()`

Resets the error boundary and attempts to re-render child components.

```javascript
const boundary = document.querySelector('error-boundary');
boundary.reset();
```

## Events

The error boundary publishes errors to the EventBus:

```javascript
{
  type: 'component:error',
  data: {
    error: {
      message: string,
      stack: string,
      name: string
    },
    component: string,
    timestamp: number,
    info: object
  }
}
```

## CSS Custom Properties

The component uses design tokens for styling:

```css
--spacing-2, --spacing-3, --spacing-4
--color-error-surface, --color-error-border, --color-error-text
--color-error-heading, --color-error-button, --color-error-button-hover
--radius-1, --radius-2
--font-size-xs, --font-size-sm, --font-size-base, --font-size-lg
--font-weight-semibold
--line-height-relaxed
--font-mono
```

## Testing

Open `error-boundary.test.html` in Chrome to run interactive tests:

1. Render errors
2. Custom fallback messages
3. Error details display
4. Promise rejections
5. Nested boundaries
6. EventBus integration

## Performance

- **Render Budget**: <1ms (fallback UI only)
- **Memory**: <100KB
- **No Runtime Dependencies**: Pure vanilla JS

## Architecture Notes

- Uses Web Components and Shadow DOM
- Wraps child component lifecycle methods
- Captures both synchronous errors and promise rejections
- Integrates with Harmony EventBus for centralized error logging
- Does not block error propagation to parent boundaries

## Related Documentation

- [Error Handling Strategy](../../DESIGN_SYSTEM.md#error-handling)
- [EventBus Documentation](../../core/event-bus.js)
- [Component Lifecycle](../../bounded-contexts/component-lifecycle/)