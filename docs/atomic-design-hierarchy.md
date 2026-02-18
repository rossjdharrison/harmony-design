# Atomic Design Hierarchy

This document maps the Harmony Design System components to Brad Frost's Atomic Design methodology. The hierarchy helps organize UI components from smallest building blocks to complete page templates.

## Overview

Atomic Design organizes components into five distinct levels:

1. **Atoms** - Basic building blocks (buttons, inputs, labels)
2. **Molecules** - Simple component groups (form fields, search bars)
3. **Composites** - Complex functional units (clips, transport bars)
4. **Organisms** - Complex UI sections (dashboards, navigation)
5. **Templates** - Page-level layouts (app shell, project view)

## Hierarchy Map

### Level 1: Atoms (Primitives)

Atoms are the foundational building blocks. In Harmony, these live in `/primitives` and `/controls`.

#### Interactive Controls
- **harmony-toggle** - Binary state switch control
  - Location: `controls/harmony-toggle/harmony-toggle.js`
  - Purpose: On/off state management
  - Events: `toggle-changed`

- **harmony-fader** - Continuous value slider
  - Location: `components/controls/harmony-fader.js`
  - Purpose: Audio level/parameter control
  - Events: `fader-changed`

#### Core Primitives
- **Tokens** - Design tokens (colors, spacing, typography)
  - Location: `tokens/`
  - Purpose: Visual consistency foundation

### Level 2: Molecules

Molecules combine atoms into simple functional groups. Currently minimal in Harmony.

**Future Examples:**
- Form field (label + input + validation message)
- Search bar (input + search button)
- Labeled fader (label + harmony-fader + value display)

### Level 3: Composites

Composites are complex functional units specific to audio/DAW workflows. Located in `/components/composites`.

#### Audio Components
- **clip** - Audio/MIDI clip representation
  - Location: `components/composites/clip/clip.js`
  - Purpose: Timeline clip with waveform/MIDI visualization
  - Events: `clip-selected`, `clip-moved`, `clip-resized`

- **transport-bar** - Playback control interface
  - Location: `components/composites/transport-bar/transport-bar.js`
  - Purpose: Play/pause/stop/record controls with timeline position
  - Events: `transport-play`, `transport-pause`, `transport-stop`

### Level 4: Organisms

Organisms are substantial UI sections combining multiple composites. Located in `/components/organisms`.

#### System Components
- **design-system-dashboard** - Component catalog and documentation viewer
  - Location: `components/organisms/design-system-dashboard.js`
  - Purpose: Live component showcase with property controls
  - Integrates: Multiple primitives and composites

**Future Examples:**
- Track strip (fader + pan + effects + routing)
- Mixer section (multiple track strips)
- Plugin rack (effect chain with bypass/reorder)

### Level 5: Templates

Templates define page-level layouts. Currently defined in `/templates` and `/pages`.

#### Application Templates
- **app-shell** - Main application container
  - Purpose: Top-level layout with navigation and content areas
  - Integrates: EventBus, theme system, routing

- **test-pages** - Component testing environments
  - Location: `test-pages/`
  - Purpose: Isolated component testing and validation

## Component Communication

All levels follow the same event-driven pattern:

```
User Interaction → Component Event → EventBus → Bounded Context → Result Event
```

### Example Flow
1. User clicks harmony-toggle (Atom)
2. Toggle emits `toggle-changed` event
3. EventBus routes to appropriate BC
4. BC processes command
5. BC emits result event
6. UI updates via event subscription

See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) for EventBus patterns.

## Directory Structure

```
harmony-design/
├── primitives/          # Atoms (future)
├── controls/            # Atoms (interactive)
├── components/
│   ├── controls/        # Atoms (interactive)
│   ├── composites/      # Level 3: Composites
│   └── organisms/       # Level 4: Organisms
├── templates/           # Level 5: Templates
├── pages/               # Level 5: Page implementations
└── tokens/              # Atoms (design tokens)
```

## Design Principles

### Composition Over Inheritance
Components combine smaller components, not extend them.

**Good:**
```javascript
class TrackStrip extends HTMLElement {
  connectedCallback() {
    this.appendChild(document.createElement('harmony-fader'));
    this.appendChild(document.createElement('harmony-toggle'));
  }
}
```

**Avoid:**
```javascript
class TrackStrip extends HarmonyFader { /* Don't extend */ }
```

### Single Responsibility
Each level has clear boundaries:
- **Atoms**: Single UI element or token
- **Molecules**: 2-3 atoms with simple logic
- **Composites**: Complex domain-specific functionality
- **Organisms**: Multiple composites with orchestration
- **Templates**: Layout and routing only

### Progressive Enhancement
Higher levels add functionality, not replace it:
- Atoms work standalone
- Molecules enhance atoms with context
- Composites add domain logic
- Organisms coordinate multiple composites
- Templates provide structure

## Adding New Components

### 1. Identify Level
Ask: "What is the smallest unit this could be?"

- Single control? → Atom (`/controls` or `/primitives`)
- 2-3 atoms? → Molecule (`/components/molecules`)
- Domain-specific feature? → Composite (`/components/composites`)
- Section with multiple features? → Organism (`/components/organisms`)
- Full page layout? → Template (`/templates`)

### 2. Create Component
Follow Web Component standards:
- Use shadow DOM
- Emit custom events
- Subscribe to EventBus for external state
- Document with JSDoc

### 3. Add Tests
Create `.test.html` file alongside component:
```
components/composites/my-component/
├── my-component.js
└── my-component.test.html
```

### 4. Update Documentation
- Add to this hierarchy map
- Update DESIGN_SYSTEM.md with integration notes
- Document events in EventBus schema

## Testing Strategy

### Atom Testing
- Visual states (default, hover, focus, active, disabled)
- Event emission
- Property reactivity
- Performance (< 16ms render)

### Composite Testing
- Integration with child atoms
- Event coordination
- State management
- Domain logic correctness

### Organism Testing
- Multi-component orchestration
- Complex user workflows
- Performance under load
- Accessibility (ARIA, keyboard nav)

### Template Testing
- Layout responsiveness
- Routing behavior
- Global state management
- Initial load performance (< 200ms)

## Performance Considerations

Each level has specific performance targets:

| Level | Render Budget | Memory Budget | Notes |
|-------|--------------|---------------|-------|
| Atoms | < 2ms | < 1MB | Highly optimized |
| Molecules | < 4ms | < 2MB | Simple composition |
| Composites | < 8ms | < 10MB | Complex rendering |
| Organisms | < 12ms | < 25MB | Multiple composites |
| Templates | < 16ms | < 50MB | Full page budget |

**Critical:** All levels must stay within global 16ms render budget.

## Anti-Patterns

### ❌ Skip Levels
Don't jump from atoms directly to organisms. Build molecules and composites first.

### ❌ Tight Coupling
Don't reference specific parent components. Use events for communication.

### ❌ Framework Dependencies
Don't use React, Vue, etc. Only vanilla Web Components.

### ❌ Direct BC Calls
Don't call bounded contexts directly from UI. Use EventBus pattern.

### ❌ Inline Styles
Don't use inline styles. Use design tokens and CSS custom properties.

## Future Expansion

### Planned Atoms
- harmony-knob (rotary control)
- harmony-meter (level meter)
- harmony-button (standard button)
- harmony-label (text label)

### Planned Molecules
- labeled-control (label + control + value)
- stereo-fader (dual fader for L/R)
- parameter-group (multiple related controls)

### Planned Composites
- waveform-editor (audio waveform with editing)
- piano-roll (MIDI note editor)
- automation-lane (parameter automation curve)

### Planned Organisms
- mixer-channel (complete channel strip)
- effect-rack (plugin chain manager)
- browser-panel (file/preset browser)

## References

- [Atomic Design by Brad Frost](https://atomicdesign.bradfrost.com/)
- [Web Components Standard](https://www.webcomponents.org/)
- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Integration patterns
- [EventBus Documentation](../DESIGN_SYSTEM.md#eventbus-architecture)

## Maintenance

This document should be updated when:
- New components are added
- Component hierarchy changes
- New levels are introduced
- Testing strategies evolve

Last updated: 2025-01-XX