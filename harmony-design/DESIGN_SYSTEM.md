# Harmony Design System

A comprehensive design system for building musical interfaces with performance, accessibility, and consistency.

## Overview

Harmony is a design system that bridges design and implementation for music creation tools. It provides reusable components, patterns, and tools to maintain consistency across the application.

## Core Concepts

### Component States

Components progress through defined states during their lifecycle:

- **draft**: Initial state, design in progress
- **design_complete**: Design specification finalized
- **implemented**: Code implementation complete
- **validated**: Testing and validation complete

Each component's state is tracked in `harmony-design/components/{component-id}.state.json`.

### State Machine

The state machine defines valid transitions between component states and their prerequisites.

**Definition:** `harmony-design/state-machine/definition.json`

**Transition Rules:** `harmony-design/state-machine/transition-rules.json`

Transitions require specific prerequisites:
- **draft → design_complete**: Design specification file (`.pen`) must exist
- **design_complete → implemented**: Implementation file (`.js`) must exist
- **implemented → validated**: Testing and validation must be complete

See: [State Machine Definition](./state-machine/definition.json)

### Component Links

Components maintain relationships to other system elements:

- **Domain Links**: What domain types render this component
- **Intent Links**: What actions/intents are available
- **UI Links**: Where component is used in application

Links are stored in component state files and enable impact analysis.

## MCP Tools

### update_component_state

MCP tool for updating component state with automatic validation.

**Location:** `harmony-design/mcp/tools/update_component_state.py`

**Usage:**

```python
from harmony_design.mcp.tools import update_component_state

result = update_component_state(
    component_id="button-primary",
    new_state="design_complete"
)
```

**Validation:**

The tool automatically checks:
1. Component exists
2. Transition is valid per state machine
3. All prerequisites are satisfied
4. Required files exist
5. Required properties are set

**Force Mode:**

Use `force=True` to bypass validation (use with caution):

```python
result = update_component_state(
    component_id="button-primary",
    new_state="implemented",
    force=True
)
```

See: [MCP Tools Documentation](./mcp/README.md)

## Component State Format

Each component has a state file: `harmony-design/components/{component-id}.state.json`

```json
{
  "component_id": "button-primary",
  "state": "draft",
  "links": {
    "domain": [],
    "intent": [],
    "ui": []
  },
  "state_history": [
    {
      "from": "draft",
      "to": "design_complete",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Working with the System

### Creating a New Component

1. Create component state file in `harmony-design/components/`
2. Initial state is `draft`
3. Create design specification (`.pen` file)
4. Update state to `design_complete` using MCP tool
5. Implement component (`.js` file)
6. Update state to `implemented`
7. Test and validate
8. Update state to `validated`

### Updating Component State

Always use the MCP tool to ensure validation:

```python
result = update_component_state("my-component", "design_complete")

if not result["success"]:
    print("Validation errors:")
    for error in result["validation_errors"]:
        print(f"  - {error}")
```

### Checking Prerequisites

Before attempting a state transition, ensure:

1. Required files exist
2. Required properties are set in state file
3. Necessary links are established

The MCP tool will report specific missing prerequisites.

## Testing

### MCP Tool Tests

Run MCP tool tests:

```bash
pytest harmony-design/mcp/tools/test_update_component_state.py -v
```

Tests cover:
- State machine loading
- Transition validation
- Prerequisite checking
- State updates
- Force mode
- Error handling

## Implementation Notes

### State Machine Validation

Validation logic in `ComponentStateUpdater` class checks:

1. **Transition Existence**: Is the transition defined in state machine?
2. **File Prerequisites**: Do required files exist?
3. **Property Prerequisites**: Are required properties set?
4. **Link Prerequisites**: Are required links established?

### Prerequisite Types

- `file_exists`: Check if specific file exists (supports `{component_id}` placeholder)
- `property_set`: Check if property is set in component state
- `linked_resources`: Check if specific link type has entries

### State History

Each state transition is recorded with:
- Previous state
- New state
- Timestamp (ISO 8601 UTC)

This provides audit trail for component lifecycle.

## Architecture Compliance

This implementation follows Harmony's architecture policies:

- **Python for tooling**: MCP tools are Python (dev/build tools only)
- **No runtime dependencies**: Tools are separate from runtime code
- **Validation before action**: State changes validated before applied
- **Explicit error reporting**: Clear validation error messages
- **Audit trail**: State history tracked for all transitions

## See Also

- [MCP Tools](./mcp/README.md)
- [State Machine Definition](./state-machine/definition.json)
- [Transition Rules](./state-machine/transition-rules.json)