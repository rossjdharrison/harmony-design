# MCP Tools for Harmony Design System

Model Context Protocol (MCP) tools for managing the Harmony Design System.

## Available Tools

### update_component_state

Updates a component's state with automatic validation against state machine rules.

**Usage:**

```python
from harmony_design.mcp.tools import update_component_state

result = update_component_state(
    component_id="button-primary",
    new_state="design_complete"
)

if result["success"]:
    print(f"Updated to {result['to_state']}")
else:
    print(f"Failed: {result['error']}")
    for error in result.get("validation_errors", []):
        print(f"  - {error}")
```

**Parameters:**

- `component_id` (string, required): Unique identifier for the component
- `new_state` (string, required): Target state (draft, design_complete, implemented, validated)
- `force` (boolean, optional): Skip validation checks (default: false)

**Validation:**

The tool automatically validates:
- Component exists
- Transition is defined in state machine
- All prerequisites are met (files exist, properties set, links created)

**Returns:**

Success response:
```json
{
  "success": true,
  "component_id": "button-primary",
  "from_state": "draft",
  "to_state": "design_complete",
  "message": "Successfully updated button-primary from draft to design_complete"
}
```

Error response:
```json
{
  "success": false,
  "error": "Transition validation failed",
  "validation_errors": [
    "Prerequisite not met: Design specification file must exist"
  ],
  "component_id": "button-primary",
  "from_state": "draft",
  "to_state": "design_complete"
}
```

## Testing

Run tests with pytest:

```bash
pytest harmony-design/mcp/tools/test_update_component_state.py -v
```

## See Also

- [State Machine Documentation](../DESIGN_SYSTEM.md#state-machine)
- [Transition Rules](../state-machine/transition-rules.json)
- [Component State Format](../DESIGN_SYSTEM.md#component-state-format)