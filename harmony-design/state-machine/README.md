# State Machine Transition Validation

This module provides validation for state transitions in the Harmony Design System's component lifecycle state machine.

## Purpose

Ensures that components meet all prerequisites before transitioning between states, enforcing quality gates and policy compliance.

## Files

- `transition-validator.js` - Core validation logic
- `transition-validator.test.js` - Test suite
- `test-runner.html` - Browser-based test runner

## Usage

```javascript
import { validateTransition } from './transition-validator.js';

const context = {
  component_name: 'Button',
  component_type: 'primitive',
  design_spec: 'button.pen'
};

const result = validateTransition('draft', 'design_complete', context);

if (result.valid) {
  // Proceed with transition
} else {
  console.error('Transition blocked:', result.errors);
}
```

## State Transitions

### draft → design_complete
- **Required**: `component_name`, `component_type`, `design_spec`
- **Checks**: Design specification file must exist

### design_complete → in_progress
- **Required**: `component_name`, `component_type`, `design_spec`, `assigned_to`
- **Checks**: Component must be assigned to a developer

### in_progress → code_review
- **Required**: `component_name`, `implementation_file`
- **Required Links**: `domain_links`, `intent_links`
- **Checks**: Implementation exists, has domain and intent links

### code_review → testing
- **Required**: `component_name`, `implementation_file`, `review_approved`
- **Required Links**: `domain_links`, `intent_links`, `ui_links`
- **Checks**: Code review approved, UI links documented

### testing → complete
- **Required**: `component_name`, `implementation_file`, `tests_passed`
- **Required Links**: `domain_links`, `intent_links`, `ui_links`
- **Checks**: 
  - All tests passed
  - Chrome testing completed (Policy #10)
  - All states verified (Policy #11)
  - Performance validated (Policy #12)

## Policy Enforcement

The validator enforces critical design system policies:

- **Policy #10**: All UI components tested in Chrome
- **Policy #11**: All component states verified (default, hover, focus, active, disabled, error, loading, empty)
- **Policy #12**: Performance meets budgets (60fps for animations)

## Testing

Open `test-runner.html` in Chrome to run the test suite.

## See Also

- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#state-machine-validation) - Conceptual overview
- [state-machine-definition](./state-machine-definition.md) - State machine structure