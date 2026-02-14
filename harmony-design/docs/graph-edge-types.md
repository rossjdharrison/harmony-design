# Graph Edge Types

This document describes the edge types used in the Harmony Design System graph to model relationships between components, patterns, tokens, and design specifications.

## Overview

The design system uses a directed graph to represent relationships. Each edge has a specific type that defines the semantic meaning of the relationship.

## Edge Types

### composes_of

**Direction:** A → B (A contains B)

**Meaning:** Component A is composed of Component B as a child element.

**Examples:**
- `Form` composes_of `Button`
- `Card` composes_of `Image`
- `Navigation` composes_of `Link`

**Use Cases:**
- Component hierarchy visualization
- Dependency tracking for changes
- Impact analysis when updating child components

### inherits_pattern

**Direction:** A → B (A derives from B)

**Meaning:** Component A inherits behavioral or structural patterns from Pattern B.

**Examples:**
- `PrimaryButton` inherits_pattern `BaseButton`
- `IconButton` inherits_pattern `BaseButton`
- `DataTable` inherits_pattern `ScrollableContainer`

**Use Cases:**
- Pattern reuse tracking
- Consistency enforcement
- Variant management

### implements_design

**Direction:** A → B (A realizes B)

**Meaning:** Component implementation A realizes Design Specification B.

**Examples:**
- `ButtonComponent` implements_design `ButtonDesignSpec`
- `InputField` implements_design `InputDesignSpec`

**Use Cases:**
- Design-to-code traceability
- Design system governance
- Implementation coverage tracking

### uses_token

**Direction:** A → B (A depends on B)

**Meaning:** Component A uses Design Token B for styling or configuration.

**Examples:**
- `Button` uses_token `ColorPrimary`
- `Heading` uses_token `FontSizeH1`
- `Card` uses_token `SpacingMedium`

**Use Cases:**
- Token usage analysis
- Breaking change impact assessment
- Theme customization tracking

### used_by

**Direction:** A → B (A is contained in B)

**Meaning:** Component A is used by Component B. This is the reverse of `composes_of`.

**Examples:**
- `Button` used_by `Form`
- `Image` used_by `Card`
- `Link` used_by `Navigation`

**Use Cases:**
- Reverse dependency queries
- Component usage statistics
- Deprecation impact analysis

## Edge Properties

Edges can carry additional metadata:

```json
{
  "id": "edge-123",
  "from": "button",
  "to": "color-primary",
  "edge_type": "uses_token",
  "metadata": {
    "weight": 0.8,
    "label": "Primary background color",
    "properties": {
      "usage_context": "default_state"
    }
  }
}
```

### weight

Optional float (0.0 to 1.0) indicating the strength or importance of the relationship.

### label

Optional human-readable description of the relationship.

### properties

Optional JSON object for custom metadata specific to the relationship.

## Querying Relationships

### Finding Dependencies

To find all tokens used by a component:

```
MATCH (component)-[uses_token]->(token)
WHERE component.id = "button"
RETURN token
```

### Finding Composition

To find all components that compose a higher-level component:

```
MATCH (parent)-[composes_of]->(child)
WHERE parent.id = "form"
RETURN child
```

### Finding Usage

To find where a component is used:

```
MATCH (component)-[used_by]->(parent)
WHERE component.id = "button"
RETURN parent
```

## Implementation Notes

- Edge types are defined in `harmony-schemas/src/graph/edge_types.rs`
- Some edge types have natural inverses (`composes_of` ↔ `used_by`)
- Edge types can be classified as dependencies or composition relationships
- All edge types are serializable to JSON for storage and transmission

## Related Documentation

- See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#graph-structure) for overall graph architecture
- See `harmony-schemas/src/graph/edge_types.rs` for implementation details