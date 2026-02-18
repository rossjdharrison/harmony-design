# Harmony Design System Tools

Development and validation tools for the Harmony Design System.

See: [harmony-design/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#development-tools)

## Available Tools

### validate_composition.py

Validates that component composition relationships follow atomic design hierarchy rules.

**Usage:**
```bash
python tools/validate_composition.py path/to/graph.json
```

**Rules Enforced:**
- Primitives cannot contain other components
- Molecules can only contain primitives
- Organisms can contain molecules and primitives
- Templates can contain organisms, molecules, and primitives
- Pages can contain any component type

**Exit Codes:**
- `0`: All composition rules pass
- `1`: One or more violations found or error occurred

**Example Output:**
```
✓ All composition rules validated successfully
  Checked 42 composition relationships
```

Or if violations found:
```
✗ Found 2 composition rule violation(s):

1. Invalid composition: molecule 'Card' cannot contain organism 'Header'. 
   Allowed children: primitive
   Edge: card -> header

2. Invalid composition: primitive 'Button' cannot contain primitive 'Icon'. 
   Allowed children: none
   Edge: button -> icon
```

### Running Tests

```bash
# Install pytest if needed
pip install pytest

# Run composition validator tests
pytest tools/test_validate_composition.py -v
```

## Integration with CI

Add to your CI pipeline to enforce composition rules:

```yaml
- name: Validate Composition Rules
  run: python harmony-design/tools/validate_composition.py harmony-graph/graph.json
```