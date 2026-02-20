# Component Development Guide

This guide explains how to create new components in the Harmony Design System. All components follow Web Components standards with vanilla JavaScript—no frameworks.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Component Architecture](#component-architecture)
3. [File Structure](#file-structure)
4. [Component Types](#component-types)
5. [Implementation Steps](#implementation-steps)
6. [Event-Driven Communication](#event-driven-communication)
7. [Performance Requirements](#performance-requirements)
8. [Testing Requirements](#testing-requirements)
9. [Documentation Requirements](#documentation-requirements)
10. [Common Patterns](#common-patterns)

## Quick Start

Creating a new component involves these steps:

1. Choose the correct location based on component type
2. Create the component class extending `HTMLElement`
3. Use Shadow DOM for encapsulation
4. Publish events instead of calling functions
5. Test in Chrome with all states
6. Document in DESIGN_SYSTEM.md

## Component Architecture

All Harmony components follow these principles:

- **Web Components**: Use native Custom Elements API
- **Shadow DOM**: All components use shadow DOM for style encapsulation
- **Event-Driven**: Components publish events, never call bounded contexts directly
- **Vanilla JS**: No frameworks or runtime dependencies
- **Performance-First**: 16ms render budget, 60fps animations

## File Structure

Components are organized by Atomic Design principles:

```
harmony-design/
├── primitives/          # Atoms: buttons, inputs, labels
│   └── button/
│       ├── button.js    # Component implementation
│       ├── button.css   # Scoped styles
│       └── button.test.html  # Browser tests
├── components/          # Molecules: search bars, cards
│   └── search-bar/
│       ├── search-bar.js
│       └── search-bar.css
├── organisms/           # Complex UI sections
│   └── header/
│       ├── header.js
│       └── header.css
└── templates/           # Page layouts
    └── app-shell/
        ├── app-shell.js
        └── app-shell.css
```

### Choosing the Right Location

- **primitives/**: Single-purpose, reusable elements (button, input, icon)
- **components/**: Combinations of primitives (search-bar, card, modal)
- **organisms/**: Complex sections with business logic (header, sidebar, timeline)
- **templates/**: Full page layouts (app-shell, dashboard-layout)

## Component Types

### 1. Primitive Components

Simple, single-purpose components. Example: Button

```javascript
/**
 * @component harmony-button
 * @description A reusable button primitive with multiple variants
 * @fires click - Emitted when button is clicked
 * @attr {string} variant - Button style: primary, secondary, ghost
 * @attr {boolean} disabled - Disables the button
 */
class HarmonyButton extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'disabled'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const variant = this.getAttribute('variant') || 'primary';
    const disabled = this.hasAttribute('disabled');

    this.shadowRoot.innerHTML = `
      <style>
        @import url('./button.css');
      </style>
      <button 
        class="harmony-button harmony-button--${variant}"
        ?disabled="${disabled}">
        <slot></slot>
      </button>
    `;
  }

  setupEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    button.addEventListener('click', this.handleClick.bind(this));
  }

  removeEventListeners() {
    const button = this.shadowRoot.querySelector('button');
    if (button) {
      button.removeEventListener('click', this.handleClick.bind(this));
    }
  }

  handleClick(event) {
    if (!this.hasAttribute('disabled')) {
      this.dispatchEvent(new CustomEvent('harmony-click', {
        bubbles: true,
        composed: true,
        detail: { originalEvent: event }
      }));
    }
  }
}

customElements.define('harmony-button', HarmonyButton);
```

### 2. Complex Components with Event Publishing

Components that interact with bounded contexts must publish events:

```javascript
/**
 * @component harmony-playback-controls
 * @description Audio playback controls that publish commands via EventBus
 * @fires harmony-command - Published to EventBus for bounded context handling
 */
class HarmonyPlaybackControls extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  handlePlay() {
    // Publish event - do NOT call bounded context directly
    this.dispatchEvent(new CustomEvent('harmony-command', {
      bubbles: true,
      composed: true,
      detail: {
        type: 'audio.play',
        payload: { trackId: this.getAttribute('track-id') }
      }
    }));
  }

  handlePause() {
    this.dispatchEvent(new CustomEvent('harmony-command', {
      bubbles: true,
      composed: true,
      detail: {
        type: 'audio.pause',
        payload: {}
      }
    }));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('./playback-controls.css');
      </style>
      <div class="controls">
        <harmony-button id="play" variant="primary">Play</harmony-button>
        <harmony-button id="pause" variant="secondary">Pause</harmony-button>
      </div>
    `;
  }

  setupEventListeners() {
    this.shadowRoot.getElementById('play')
      .addEventListener('harmony-click', () => this.handlePlay());
    this.shadowRoot.getElementById('pause')
      .addEventListener('harmony-click', () => this.handlePause());
  }
}

customElements.define('harmony-playback-controls', HarmonyPlaybackControls);
```

## Implementation Steps

### Step 1: Create Component Directory

```bash
# For a new primitive
mkdir primitives/my-component
cd primitives/my-component

# Create files
touch my-component.js
touch my-component.css
touch my-component.test.html
```

### Step 2: Implement Component Class

```javascript
/**
 * @component harmony-my-component
 * @description [Brief description of component purpose]
 * @fires [event-name] - [Event description]
 * @attr {type} attribute-name - [Attribute description]
 * @slot - [Default slot description]
 * @slot name - [Named slot description]
 */
class HarmonyMyComponent extends HTMLElement {
  // 1. Define observed attributes
  static get observedAttributes() {
    return ['attribute-name'];
  }

  // 2. Constructor - setup shadow DOM
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Initialize state
    this._state = {};
  }

  // 3. Connected callback - component added to DOM
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  // 4. Disconnected callback - cleanup
  disconnectedCallback() {
    this.removeEventListeners();
  }

  // 5. Attribute changed callback - reactive updates
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  // 6. Render method - update shadow DOM
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('./my-component.css');
      </style>
      <div class="my-component">
        <slot></slot>
      </div>
    `;
  }

  // 7. Event handlers
  setupEventListeners() {
    // Add listeners
  }

  removeEventListeners() {
    // Remove listeners
  }
}

// 8. Register custom element
customElements.define('harmony-my-component', HarmonyMyComponent);
```

### Step 3: Create Styles

```css
/* my-component.css */

/* Use CSS custom properties for theming */
:host {
  display: block;
  --component-bg: var(--harmony-surface-primary, #ffffff);
  --component-text: var(--harmony-text-primary, #000000);
}

/* Component container */
.my-component {
  background: var(--component-bg);
  color: var(--component-text);
  padding: var(--harmony-spacing-md, 16px);
  border-radius: var(--harmony-radius-md, 8px);
}

/* State modifiers */
:host([disabled]) {
  opacity: 0.5;
  pointer-events: none;
}

/* Responsive design */
@media (max-width: 768px) {
  .my-component {
    padding: var(--harmony-spacing-sm, 8px);
  }
}

/* Animation with performance budget */
.my-component {
  transition: transform 200ms ease-out;
  will-change: transform;
}

.my-component:hover {
  transform: translateY(-2px);
}
```

### Step 4: Create Test File

```html
<!-- my-component.test.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Component Test</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      padding: 2rem;
      background: #f5f5f5;
    }
    .test-section {
      background: white;
      padding: 2rem;
      margin-bottom: 2rem;
      border-radius: 8px;
    }
    h2 {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <h1>My Component Tests</h1>

  <div class="test-section">
    <h2>Default State</h2>
    <harmony-my-component>Default content</harmony-my-component>
  </div>

  <div class="test-section">
    <h2>With Attributes</h2>
    <harmony-my-component attribute-name="value">
      Custom content
    </harmony-my-component>
  </div>

  <div class="test-section">
    <h2>Disabled State</h2>
    <harmony-my-component disabled>Disabled content</harmony-my-component>
  </div>

  <div class="test-section">
    <h2>Event Testing</h2>
    <harmony-my-component id="event-test">
      Click to test events
    </harmony-my-component>
    <p id="event-log">Events will appear here</p>
  </div>

  <script type="module" src="./my-component.js"></script>
  <script>
    // Test event handling
    const eventTest = document.getElementById('event-test');
    const eventLog = document.getElementById('event-log');

    eventTest.addEventListener('harmony-event', (e) => {
      eventLog.textContent = `Event fired: ${JSON.stringify(e.detail)}`;
    });
  </script>
</body>
</html>
```

### Step 5: Test in Chrome

**MANDATORY**: Open the test file in Chrome and verify:

1. **Default state** renders correctly
2. **Hover state** shows visual feedback
3. **Focus state** is keyboard-accessible
4. **Active state** provides click feedback
5. **Disabled state** prevents interaction
6. **Error states** (if applicable) display properly
7. **Loading states** (if applicable) show progress
8. **Empty states** (if applicable) guide user

Use Chrome DevTools:
- **Elements panel**: Inspect shadow DOM
- **Performance panel**: Verify 60fps animations
- **Console**: Check for errors or warnings
- **Network panel**: Verify no unnecessary requests

## Event-Driven Communication

### Publishing Events

Components publish events, never call bounded contexts directly:

```javascript
// ✅ CORRECT: Publish event
this.dispatchEvent(new CustomEvent('harmony-command', {
  bubbles: true,
  composed: true,  // Crosses shadow DOM boundary
  detail: {
    type: 'audio.play',
    payload: { trackId: this.trackId }
  }
}));

// ❌ WRONG: Direct call to bounded context
// audioEngine.play(this.trackId);  // NEVER DO THIS
```

### Event Naming Convention

- **harmony-command**: Commands for bounded contexts
- **harmony-query**: Data requests via TypeNavigator
- **harmony-click**: User interactions
- **harmony-change**: Value changes
- **harmony-error**: Error conditions

### Subscribing to Events

Components can listen for result events:

```javascript
connectedCallback() {
  this.render();
  
  // Subscribe to playback state changes
  window.addEventListener('harmony-event', this.handlePlaybackState.bind(this));
}

handlePlaybackState(event) {
  if (event.detail.type === 'audio.playback-started') {
    this.updatePlayButton('playing');
  }
}

disconnectedCallback() {
  window.removeEventListener('harmony-event', this.handlePlaybackState.bind(this));
}
```

## Performance Requirements

All components must meet these budgets:

### Render Budget: 16ms per frame (60fps)

```javascript
// ✅ GOOD: Efficient rendering
render() {
  // Use template strings for simple updates
  this.shadowRoot.innerHTML = `...`;
}

// ❌ BAD: Expensive DOM manipulation in loop
render() {
  for (let i = 0; i < 1000; i++) {
    const div = document.createElement('div');
    this.shadowRoot.appendChild(div);
  }
}
```

### Animation Performance

```css
/* ✅ GOOD: GPU-accelerated properties */
.component {
  transition: transform 200ms ease-out, opacity 200ms ease-out;
  will-change: transform;
}

/* ❌ BAD: CPU-intensive properties */
.component {
  transition: width 200ms, height 200ms, left 200ms;
}
```

### Memory Budget: 50MB WASM heap

- Avoid memory leaks by cleaning up event listeners
- Use weak references for large objects
- Implement `disconnectedCallback` properly

### Load Budget: 200ms initial load

- Keep component files small (<10KB)
- Lazy-load complex components
- Use CSS imports, not inline styles

## Testing Requirements

### Browser Testing (MANDATORY)

Before marking task complete, test in Chrome:

1. Open `my-component.test.html` in Chrome
2. Verify all states visually
3. Test keyboard navigation (Tab, Enter, Space)
4. Test screen reader announcements (if applicable)
5. Check console for errors
6. Use Performance panel for animations

### Performance Testing

```javascript
// Add performance markers
performance.mark('component-render-start');
this.render();
performance.mark('component-render-end');
performance.measure('component-render', 'component-render-start', 'component-render-end');

// Log if over budget
const measure = performance.getEntriesByName('component-render')[0];
if (measure.duration > 16) {
  console.warn(`Component render took ${measure.duration}ms (budget: 16ms)`);
}
```

### Automated Tests

Create test assertions in test.html:

```javascript
// Simple assertion framework
function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
  } else {
    console.log('✅ PASS:', message);
  }
}

// Test component creation
const component = document.createElement('harmony-my-component');
assert(component instanceof HTMLElement, 'Component is HTMLElement');

// Test shadow DOM
assert(component.shadowRoot !== null, 'Component has shadow DOM');

// Test attributes
component.setAttribute('variant', 'primary');
assert(component.getAttribute('variant') === 'primary', 'Attribute is set');
```

## Documentation Requirements

### JSDoc Comments (MANDATORY)

Every component must have complete JSDoc:

```javascript
/**
 * @component harmony-my-component
 * @description A reusable component for [purpose]. Follows Harmony Design System
 * patterns with shadow DOM encapsulation and event-driven architecture.
 * 
 * @example
 * <harmony-my-component variant="primary" disabled>
 *   Content goes here
 * </harmony-my-component>
 * 
 * @fires harmony-click - Emitted when component is clicked
 * @fires harmony-change - Emitted when value changes
 * 
 * @attr {string} variant - Visual variant: primary, secondary, ghost
 * @attr {boolean} disabled - Disables user interaction
 * @attr {string} size - Size variant: sm, md, lg
 * 
 * @slot - Default slot for main content
 * @slot icon - Named slot for icon element
 * 
 * @csspart container - The main container element
 * @csspart label - The label element
 * 
 * @cssprop --component-bg - Background color
 * @cssprop --component-text - Text color
 * @cssprop --component-padding - Internal padding
 */
class HarmonyMyComponent extends HTMLElement {
  // Implementation
}
```

### DESIGN_SYSTEM.md Update (MANDATORY)

Add your component to the main documentation:

```markdown
## Components

### My Component

**Location**: `primitives/my-component/my-component.js`

A reusable component for [purpose]. Publishes events for bounded context integration.

**Usage**:
```html
<harmony-my-component variant="primary">
  Content
</harmony-my-component>
```

**Attributes**:
- `variant`: Visual style (primary, secondary, ghost)
- `disabled`: Disables interaction

**Events**:
- `harmony-click`: User clicked component
- `harmony-change`: Value changed

**Related Files**:
- Implementation: [`primitives/my-component/my-component.js`](./primitives/my-component/my-component.js)
- Styles: [`primitives/my-component/my-component.css`](./primitives/my-component/my-component.css)
- Tests: [`primitives/my-component/my-component.test.html`](./primitives/my-component/my-component.test.html)
```

## Common Patterns

### Pattern 1: Reactive Attributes

```javascript
static get observedAttributes() {
  return ['value', 'disabled', 'variant'];
}

attributeChangedCallback(name, oldValue, newValue) {
  if (oldValue === newValue) return;
  
  switch(name) {
    case 'value':
      this.updateValue(newValue);
      break;
    case 'disabled':
      this.updateDisabledState(newValue !== null);
      break;
    case 'variant':
      this.updateVariant(newValue);
      break;
  }
}
```

### Pattern 2: Slotted Content

```javascript
render() {
  this.shadowRoot.innerHTML = `
    <style>
      ::slotted(*) {
        color: inherit;
      }
    </style>
    <div class="container">
      <slot name="icon"></slot>
      <slot></slot>
    </div>
  `;
}
```

Usage:
```html
<harmony-my-component>
  <svg slot="icon">...</svg>
  <span>Main content</span>
</harmony-my-component>
```

### Pattern 3: CSS Parts for Styling

```javascript
render() {
  this.shadowRoot.innerHTML = `
    <style>...</style>
    <div part="container">
      <label part="label">Label</label>
      <input part="input" />
    </div>
  `;
}
```

External styling:
```css
harmony-my-component::part(container) {
  background: blue;
}

harmony-my-component::part(label) {
  font-weight: bold;
}
```

### Pattern 4: Form Integration

```javascript
class HarmonyInput extends HTMLElement {
  // Make component form-associated
  static formAssociated = true;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._internals = this.attachInternals();
  }

  // Implement form callbacks
  formResetCallback() {
    this.value = '';
  }

  formDisabledCallback(disabled) {
    this.toggleAttribute('disabled', disabled);
  }

  // Update form value
  updateValue(value) {
    this._internals.setFormValue(value);
  }
}
```

### Pattern 5: Accessibility

```javascript
render() {
  const disabled = this.hasAttribute('disabled');
  const ariaLabel = this.getAttribute('aria-label') || 'Default label';
  
  this.shadowRoot.innerHTML = `
    <style>...</style>
    <button
      role="button"
      aria-label="${ariaLabel}"
      aria-disabled="${disabled}"
      tabindex="${disabled ? -1 : 0}">
      <slot></slot>
    </button>
  `;
}

// Keyboard support
setupEventListeners() {
  this.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  });
}
```

### Pattern 6: Loading States

```javascript
class HarmonyCard extends HTMLElement {
  showLoading() {
    this.setAttribute('loading', '');
    this.render();
  }

  hideLoading() {
    this.removeAttribute('loading');
    this.render();
  }

  render() {
    const loading = this.hasAttribute('loading');
    
    this.shadowRoot.innerHTML = `
      <style>
        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      </style>
      <div class="card">
        ${loading ? '<div class="skeleton"></div>' : '<slot></slot>'}
      </div>
    `;
  }
}
```

### Pattern 7: Error States

```javascript
class HarmonyInput extends HTMLElement {
  setError(message) {
    this.setAttribute('error', message);
    this.render();
    this.announceError(message);
  }

  clearError() {
    this.removeAttribute('error');
    this.render();
  }

  announceError(message) {
    // Screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'alert');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.textContent = message;
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }

  render() {
    const error = this.getAttribute('error');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host([error]) input {
          border-color: var(--harmony-error, #d32f2f);
        }
        .error-message {
          color: var(--harmony-error, #d32f2f);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
      </style>
      <div>
        <input />
        ${error ? `<div class="error-message">${error}</div>` : ''}
      </div>
    `;
  }
}
```

## Checklist for Component Completion

Before marking a component task as complete:

- [ ] Component class created with proper JSDoc
- [ ] Shadow DOM used for encapsulation
- [ ] All attributes defined in `observedAttributes`
- [ ] Event listeners cleaned up in `disconnectedCallback`
- [ ] Events published instead of direct BC calls
- [ ] CSS file created with design tokens
- [ ] Test file created with all states
- [ ] Tested in Chrome browser (all states verified)
- [ ] Performance tested (60fps animations, <16ms render)
- [ ] Keyboard navigation working
- [ ] Screen reader support (if interactive)
- [ ] DESIGN_SYSTEM.md updated with component docs
- [ ] Code committed and pushed to repository

## Related Documentation

- [Architecture Overview](./architecture-overview.md) - System architecture
- [API Reference](./api-reference.md) - Generated API documentation
- [Event Bus Pattern](../components/EventBusComponent.js) - Event-driven architecture
- [Design Tokens](../tokens/) - CSS custom properties
- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Main system documentation

## Vision Alignment

This component development approach advances the Harmony Design System vision:

- **Reactive Component System**: Attribute-based reactivity with `observedAttributes`
- **Atomic Design**: Clear hierarchy from primitives to templates
- **WASM Performance**: Event-driven architecture enables WASM bounded contexts
- **GPU-First Audio**: Components publish commands for GPU-accelerated processing

## Getting Help

If you encounter issues:

1. Check existing components for patterns
2. Review EventBus integration in `components/EventBusComponent.js`
3. Test in Chrome DevTools Performance panel
4. Verify shadow DOM structure in Elements panel
5. Check console for event validation errors

Remember: Components are the UI layer. They render state and publish events. Bounded contexts handle business logic and state management.