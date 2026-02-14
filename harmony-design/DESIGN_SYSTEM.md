# Harmony Design System

A design system for the Harmony digital audio workstation, built with web components and a graph-based architecture.

## Overview

The Harmony Design System provides reusable UI components, design patterns, and development tools for building the Harmony DAW interface. It emphasizes performance, accessibility, and maintainability through strict policies and automated validation.

## Core Concepts

### Component Lifecycle State Machine

Components progress through defined states from initial design to completion:

```
draft → design_complete → in_progress → code_review → testing → complete
```

Each transition requires specific prerequisites to be met, enforced by the transition validator.

### State Machine Validation

**Location**: `state-machine/transition-validator.js`

The transition validator checks prerequisites before allowing state changes, ensuring quality gates are met at each stage.

#### Validation Flow

1. **Check Required Fields**: Ensures all mandatory data is present
2. **Check Required Links**: Verifies component relationships (domain, intent, UI)
3. **Run Custom Checks**: Executes state-specific validation logic
4. **Report Results**: Returns validation result with errors and warnings

#### Key Transitions

**draft → design_complete**
- Requires: component name, type, design specification
- Validates: Design spec file exists

**in_progress → code_review**
- Requires: implementation file, domain links, intent links
- Validates: Component documents what domain types it renders and what actions are available

**testing → complete**
- Requires: all tests passed, Chrome testing, state verification, performance validation
- Validates: Compliance with Policies #10, #11, #12 (see below)

### Component Relationships

Components maintain typed relationships to other system elements:

- **Domain Links**: What domain types the component renders (e.g., Button renders PlayIntent)
- **Intent Links**: What actions are available (e.g., Button can trigger Play, Stop)
- **UI Links**: Where the component is used in the interface (e.g., Button used in PlayerControls)

**Tools**: 
- `get_component_usage` - Find where components are used
- See `state-machine/transition-validator.js` for link validation

### Quality Gates

Before transitioning to `complete`, components must pass:

1. **Chrome Testing** (Policy #10): Tested in Chrome browser
2. **State Verification** (Policy #11): All states tested (default, hover, focus, active, disabled, error, loading, empty)
3. **Performance Validation** (Policy #12): 60fps for animations, verified with Chrome DevTools Performance panel

## Critical Policies

### Performance Budgets
- **Render**: Maximum 16ms per frame (60fps)
- **Memory**: Maximum 50MB WASM heap
- **Load**: Maximum 200ms initial load time

### Testing Requirements
- **Policy #10**: All UI components tested in Chrome before completion
- **Policy #11**: All component states verified (default, hover, focus, active, disabled, error, loading, empty)
- **Policy #12**: Animations tested for 60fps performance

### Architecture Boundaries
- **Rust → WASM**: Bounded contexts, graph engine, audio processing
- **Vanilla JS/HTML/CSS**: UI rendering, DOM manipulation
- **No frameworks**: React, Leptos, Vue prohibited without architecture review
- **No npm runtime dependencies**: Build tools only

### Documentation
- **Policy #19**: Documentation update mandatory for task completion
- **Policy #21**: Single unified documentation in this file
- **Format**: B1-level English, logical sections, concise, links to code files

## Implementation Notes

### Using the Transition Validator

```javascript
import { validateTransition } from './state-machine/transition-validator.js';

const context = {
  component_name: 'Button',
  implementation_file: 'button.js',
  chrome_tested: true,
  states_verified: true,
  performance_validated: true,
  tests_passed: true,
  domain_links: ['PlayIntent'],
  intent_links: ['Play', 'Stop'],
  ui_links: ['PlayerControls']
};

const result = validateTransition('testing', 'complete', context);
if (!result.valid) {
  console.error('Cannot complete component:', result.errors);
}
```

### Adding New Validation Rules

Edit `TRANSITION_PREREQUISITES` in `state-machine/transition-validator.js`:

```javascript
'state_from_to_state_to': {
  requiredFields: ['field1', 'field2'],
  requiredLinks: ['link_type'],
  checks: [
    {
      name: 'check_name',
      message: 'Error message if check fails',
      validate: (context) => /* return boolean */
    }
  ]
}
```

### Testing Components

1. Open component in Chrome
2. Test all states: default, hover, focus, active, disabled
3. For complex components: error, loading, empty states
4. Open DevTools Performance panel
5. Record interaction, verify 60fps
6. Update component context: `chrome_tested: true`, `states_verified: true`, `performance_validated: true`

## File Structure

```
harmony-design/
├── DESIGN_SYSTEM.md (this file)
├── state-machine/
│   ├── transition-validator.js
│   ├── transition-validator.test.js
│   ├── test-runner.html
│   └── README.md
└── reports/
    └── blocked/ (for blocked task reports)
```

## Recent Changes

- Added transition validation system with prerequisite checking
- Enforces Policies #10, #11, #12 for component completion
- Validates component relationships (domain, intent, UI links)
- Provides test suite and browser-based test runner

## See Also

- `state-machine/transition-validator.js` - Validation implementation
- `state-machine/README.md` - Detailed validation documentation