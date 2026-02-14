# Accessibility Guide

Harmony Design System is built with accessibility as a core principle. This guide helps you create accessible applications.

## Core Principles

1. **Semantic HTML**: Use the right element for the job
2. **Keyboard Navigation**: All functionality accessible via keyboard
3. **Screen Reader Support**: Proper ARIA labels and roles
4. **Visual Clarity**: Sufficient contrast and clear focus indicators
5. **Flexible Text**: Support text resizing and zoom

## Keyboard Navigation

All components support keyboard interaction:

### Buttons
- `Enter` or `Space`: Activate button
- `Tab`: Move focus to next element
- `Shift+Tab`: Move focus to previous element

### Forms
- `Tab`: Move between form fields
- `Enter`: Submit form (on submit button)
- `Escape`: Cancel/close (in modals)

### Lists and Menus
- `Arrow Up/Down`: Navigate items
- `Home`: First item
- `End`: Last item
- `Enter`: Select item

### Custom Components

Test keyboard navigation:

```javascript
// Focus management example
const modal = document.querySelector('harmony-modal');
modal.addEventListener('harmony-modal-open', () => {
    // Focus first interactive element
    const firstButton = modal.querySelector('harmony-button');
    firstButton?.focus();
});
```

## Screen Reader Support

### ARIA Labels

Always provide accessible labels:

```html
<!-- Visible label -->
<harmony-button aria-label="Play audio track">
    <svg><!-- Play icon --></svg>
</harmony-button>

<!-- Descriptive label -->
<harmony-input 
    aria-label="Search for tracks"
    placeholder="Search...">
</harmony-input>
```

### ARIA Roles

Components use appropriate ARIA roles:

```html
<!-- Button role (automatic) -->
<harmony-button role="button">Click</harmony-button>

<!-- Custom roles -->
<harmony-card role="article" aria-labelledby="card-title">
    <h2 id="card-title">Article Title</h2>
</harmony-card>
```

### Live Regions

Announce dynamic changes:

```html
<div role="status" aria-live="polite" aria-atomic="true">
    <!-- Status messages appear here -->
</div>
```

```javascript
// Update status for screen readers
const status = document.querySelector('[role="status"]');
status.textContent = 'Track added to playlist';
```

## Visual Accessibility

### Color Contrast

Harmony components meet WCAG AA standards:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

Test contrast with browser DevTools or online tools.

### Focus Indicators

All interactive elements have visible focus:

```css
/* Focus styles are built-in */
harmony-button:focus-visible {
    outline: 2px solid var(--harmony-focus-color);
    outline-offset: 2px;
}
```

Never remove focus indicators without providing an alternative.

### Text Sizing

Support browser text zoom (up to 200%):

```css
/* Use relative units */
harmony-text {
    font-size: 1rem; /* Not 16px */
    line-height: 1.5;
}
```

## Forms and Validation

### Labels and Hints

Always provide clear labels:

```html
<label for="email-input">Email Address</label>
<harmony-input 
    id="email-input"
    type="email"
    required
    aria-describedby="email-hint">
</harmony-input>
<span id="email-hint">We'll never share your email</span>
```

### Error Messages

Make errors clear and accessible:

```html
<harmony-input 
    type="email"
    aria-invalid="true"
    aria-errormessage="email-error">
</harmony-input>
<span id="email-error" role="alert">
    Please enter a valid email address
</span>
```

### Required Fields

Indicate required fields clearly:

```html
<label for="name-input">
    Name <span aria-label="required">*</span>
</label>
<harmony-input 
    id="name-input"
    required
    aria-required="true">
</harmony-input>
```

## Testing Accessibility

### Keyboard Testing

1. Unplug your mouse
2. Use `Tab` to navigate through your app
3. Verify all functionality is accessible
4. Check focus indicators are visible

### Screen Reader Testing

Test with common screen readers:
- **Windows**: NVDA (free) or JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca

Basic VoiceOver commands (macOS):
- `Cmd+F5`: Toggle VoiceOver
- `Ctrl+Option+Right Arrow`: Next element
- `Ctrl+Option+Space`: Activate element

### Automated Testing

Use accessibility testing tools:
- Chrome DevTools Lighthouse
- axe DevTools browser extension
- WAVE browser extension

## Common Patterns

### Skip Links

Provide skip navigation:

```html
<a href="#main-content" class="skip-link">
    Skip to main content
</a>

<main id="main-content">
    <!-- Page content -->
</main>
```

### Loading States

Announce loading to screen readers:

```html
<div role="status" aria-live="polite">
    <harmony-spinner></harmony-spinner>
    <span class="sr-only">Loading content...</span>
</div>
```

### Modals and Dialogs

Trap focus in modals:

```javascript
modal.addEventListener('harmony-modal-open', () => {
    // Store previous focus
    previousFocus = document.activeElement;
    
    // Focus modal
    modal.focus();
});

modal.addEventListener('harmony-modal-close', () => {
    // Restore focus
    previousFocus?.focus();
});
```

## Best Practices

### Do: Use Semantic HTML

```html
<!-- Good -->
<nav>
    <harmony-button>Home</harmony-button>
</nav>

<!-- Bad -->
<div>
    <div onclick="navigate()">Home</div>
</div>
```

### Do: Provide Text Alternatives

```html
<!-- Good -->
<harmony-button aria-label="Close dialog">
    <svg aria-hidden="true"><!-- X icon --></svg>
</harmony-button>

<!-- Bad -->
<harmony-button>
    <svg><!-- X icon --></svg>
</harmony-button>
```

### Don't: Use Color Alone

```html
<!-- Good - uses icon + color -->
<harmony-alert variant="error">
    <svg aria-hidden="true"><!-- Error icon --></svg>
    Error: Invalid input
</harmony-alert>

<!-- Bad - color only -->
<div style="color: red">Error: Invalid input</div>
```

### Don't: Disable Zoom

```html
<!-- Bad -->
<meta name="viewport" content="width=device-width, user-scalable=no">

<!-- Good -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)

## Related Guides

- [Component Basics](./component-basics.md) - Component fundamentals
- [Testing Guide](./testing.md) - Testing accessible components