# Harmony Design System

This document describes the Harmony Design System: its concepts, how to work with it, and implementation notes.

## Overview

The Harmony Design System is a component library built with Web Components (Custom Elements with Shadow DOM). It follows atomic design principles and integrates with the EventBus architecture for bounded context communication.

## Core Principles

1. **Web Standards First**: Uses native Web Components, no framework dependencies
2. **Performance Budgets**: 16ms render, 50MB memory, 200ms load time
3. **Event-Driven Architecture**: Components publish events, never call bounded contexts directly
4. **Shadow DOM Isolation**: All components use shadow DOM for style encapsulation
5. **Vanilla JavaScript**: No runtime npm dependencies, only build tools

## Component Levels

### Atoms
Basic building blocks that cannot be broken down further. Examples: buttons, inputs, labels.

### Molecules
Simple combinations of atoms functioning together. Examples: form fields with labels, search boxes.

### Organisms
Complex components made of molecules and atoms. Examples: navigation bars, forms, cards.

### Templates
Page-level layouts combining organisms, molecules, and atoms.

## Component Requirements

All components must satisfy these acceptance criteria:

1. **Valid Module Export**: Component exports a class extending HTMLElement
2. **Browser Rendering**: Renders without errors in Chrome (all states tested)
3. **No Compilation Errors**: TypeScript/JSDoc types are valid
4. **Atomic Design Level**: Clearly identified as atom, molecule, or organism
5. **Value Prop**: Has a `value` property for state management
6. **Change Handler**: Fires `change` event and supports `onchange` handler
7. **Placeholder Support**: Has `placeholder` attribute for empty states

## EventBus Integration

Components communicate via the EventBus singleton located at `core/event-bus.js`.

### Publishing Events

```javascript
import { EventBus } from '../core/event-bus.js';

class MyComponent extends HTMLElement {
  connectedCallback() {
    this.eventBus = EventBus.getInstance();
  }

  handleAction() {
    this.eventBus.publish({
      type: 'user:action',
      source: 'MyComponent',
      payload: { value: this.value },
      timestamp: Date.now()
    });
  }
}
```

### Event Format

All events must follow this structure:
- `type`: String identifying the event (e.g., 'audiocontext:created')
- `source`: Component or module name
- `payload`: Event-specific data
- `timestamp`: Unix timestamp in milliseconds

## Audio Components

### AudioContext Lifecycle Manager

**File**: `components/del-audiocontext-lifecycle-managem.js`  
**Level**: Molecule  
**Purpose**: Manages AudioContext lifecycle with automatic state transitions and user gesture handling.

The AudioContext Lifecycle Manager handles creation, state management, and cleanup of Web Audio API AudioContext instances. It follows best practices for context initialization, requiring user gestures for audio playback, and proper resource cleanup.

**Key Features**:
- Automatic AudioContext creation with configurable sample rate and latency
- User gesture handling for browser autoplay policies
- State management (suspended, running, closed, interrupted)
- EventBus integration for bounded context communication
- Visual state indicator with toggle controls

**Usage**:
```html
<audio-context-lifecycle-manager 
  value="suspended"
  placeholder="Click to enable audio"
  sample-rate="48000"
  latency-hint="interactive">
</audio-context-lifecycle-manager>
```

**Properties**:
- `value`: Current state ('suspended', 'running', 'closed')
- `placeholder`: Text shown before context is initialized
- `disabled`: Disables interaction
- `sample-rate`: AudioContext sample rate in Hz (optional)
- `latency-hint`: Latency optimization ('interactive', 'balanced', 'playback')

**Methods**:
- `getState()`: Returns current AudioContext state object
- `context`: Getter for the managed AudioContext instance

**Events Published**:
- `audiocontext:created`: When AudioContext is created
- `audiocontext:statechange`: When state changes
- `audiocontext:closed`: When context is closed
- `audiocontext:error`: When an error occurs

**Events Fired**:
- `change`: When value changes (bubbles, composed)
- `error`: When an error occurs (bubbles, composed)

The component ensures proper cleanup on disconnect and handles AudioContext state transitions according to Web Audio API specifications. It automatically manages the suspended state required by browser autoplay policies and provides user controls to resume audio playback.

## File Naming Convention

Component files follow this pattern:
- `del-{component-name}.js` - Deletable/experimental components
- `cap-{component-name}.js` - Capability components (stable)
- Standard component names use kebab-case

## Testing Requirements

Before marking a task complete:

1. **Chrome Testing**: Load component in Chrome browser
2. **State Testing**: Verify all states (default, hover, focus, active, disabled, error, loading, empty)
3. **Performance Testing**: Use Chrome DevTools Performance panel, target 60fps
4. **Event Testing**: Verify EventBus events are published correctly
5. **Shadow DOM Testing**: Verify styles are encapsulated

## Performance Guidelines

### Render Budget: 16ms
- Keep DOM operations minimal
- Use `requestAnimationFrame` for animations
- Batch DOM updates
- Avoid layout thrashing

### Memory Budget: 50MB
- Clean up event listeners on disconnect
- Release references to large objects
- Use WeakMap/WeakSet for caches
- Profile with Chrome DevTools Memory panel

### Load Budget: 200ms
- Lazy load non-critical components
- Use dynamic imports for large modules
- Minimize initial bundle size
- Optimize critical rendering path

### Audio Latency: 10ms
- Use AudioWorklet for processing
- Minimize buffer sizes (128-256 samples)
- Avoid synchronous operations in audio thread
- Use SharedArrayBuffer for data transfer

## Documentation Standards

Documentation must be:
1. **B1-level English**: Clear, simple, friendly
2. **Logically Sectioned**: One concern per section
3. **Concise**: Code lives in files, docs explain concepts
4. **Well-Linked**: Relative links to code files
5. **Minimal Code**: Show usage examples, not implementation

## Related Files

- EventBus: `core/event-bus.js`
- Component Examples: `components/`
- Test Pages: `test-pages/`
- Schemas: `harmony-schemas/`

## Questions?

See the project README.md for setup instructions and contribution guidelines.