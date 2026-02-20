# Cross-Graph Edge Schema

## Overview

The Cross-Graph Edge schema defines the structure for edges that connect nodes across different graph types (Component, Intent, Domain) in the Harmony Design System. These edges enable multi-graph navigation and relationship tracking.

**See:** `DESIGN_SYSTEM.md` § Graph Architecture § Cross-Graph Relationships

## Purpose

Cross-graph edges solve the problem of relationships between different architectural concerns:

- **Component → Domain**: UI components triggering domain logic
- **Intent → Component**: User intents implemented by components  
- **Domain → Component**: Domain data consumed by UI
- **Component → Intent**: Components handling user intents

## Schema Location

- **Schema**: `harmony-schemas/cross-graph-edge-schema.json`
- **Examples**: `harmony-schemas/examples/cross-graph-edge-*.json`
- **Validator**: `harmony-schemas/validate-cross-graph-edge.js`

## Required Fields

```json
{
  "id": "edge-{descriptive-name}",
  "sourceGraph": "component|intent|domain",
  "sourceNodeId": "source-node-id",
  "targetGraph": "component|intent|domain", 
  "targetNodeId": "target-node-id",
  "edgeType": "implements|triggers|depends-on|..."
}
```

## Edge Types

| Type | Description | Example |
|------|-------------|---------|
| `implements` | Target implements source | Intent → Component |
| `triggers` | Source triggers target | Component → Domain |
| `depends-on` | Source depends on target | Component → Domain |
| `provides-data-to` | Source provides data to target | Domain → Component |
| `consumes-data-from` | Source consumes data from target | Component → Domain |
| `validates-against` | Source validates against target | Component → Domain |
| `renders-for` | Source renders for target | Component → Intent |
| `handles-event-from` | Source handles events from target | Domain → Component |

## Indexing (REQUIRED)

Per **Policy 22: Cross-Graph Edges Must Be Indexed**, all edges must include indexing configuration:

```json
{
  "indexing": {
    "indexed": true,
    "indexKeys": ["composite-source", "composite-target", "edgeType"],
    "priority": "high"
  }
}
```

### Index Key Types

- `sourceGraph`: Index by source graph type
- `sourceNodeId`: Index by source node ID
- `targetGraph`: Index by target graph type
- `targetNodeId`: Index by target node ID
- `edgeType`: Index by edge type
- `composite-source`: Combined index on sourceGraph + sourceNodeId
- `composite-target`: Combined index on targetGraph + targetNodeId
- `composite-type`: Combined index on edgeType + sourceGraph + targetGraph

### Priority Levels

- `low`: Infrequent queries
- `medium`: Standard queries (default)
- `high`: Frequent queries requiring fast lookup
- `critical`: Real-time queries, must be optimized

## Validation

Run validation tests:

```bash
node harmony-schemas/validate-cross-graph-edge.js
```

Expected output:
```
🔍 Validating Cross-Graph Edge Schema Examples

Testing: examples/cross-graph-edge-valid.json
✅ PASS - Valid as expected

Testing: examples/cross-graph-edge-minimal.json
✅ PASS - Valid as expected

Testing: examples/cross-graph-edge-invalid.json
✅ PASS - Invalid as expected

✅ All validation tests passed!
```

## Usage in Rust

After schema changes, regenerate Rust types:

```bash
cd harmony-schemas
npm run codegen
```

This generates:
- `harmony-dev/crates/harmony-graph/src/types/cross_graph_edge.rs`
- Serde serialization/deserialization
- Type-safe edge construction

## Usage in TypeScript

```typescript
import { validateCrossGraphEdge } from './harmony-schemas/validate-cross-graph-edge.js';

const edge = {
  id: "edge-button-to-audio",
  sourceGraph: "component",
  sourceNodeId: "play-button",
  targetGraph: "domain", 
  targetNodeId: "audio-playback",
  edgeType: "triggers",
  indexing: {
    indexed: true,
    indexKeys: ["composite-source", "edgeType"],
    priority: "critical"
  }
};

const result = validateCrossGraphEdge(schemaPath, edge);
if (!result.valid) {
  console.error("Invalid edge:", result.errors);
}
```

## Performance Considerations

- **Index all edges**: Required for sub-10ms query performance
- **Use composite indexes**: Faster than multiple single-key lookups
- **Set appropriate priority**: Critical edges get memory-resident indexes
- **Limit metadata size**: Keep descriptions under 500 characters

## Related Schemas

- `component-schema.json`: Component graph nodes
- `intent-schema.json`: Intent graph nodes
- `domain-schema.json`: Domain graph nodes

## Validation Rules

1. ✅ ID must match pattern `^edge-[a-z0-9-]+$`
2. ✅ Source and target graphs must be valid types
3. ✅ Node IDs must match pattern `^[a-z0-9-]+$`
4. ✅ Edge type must be from allowed enum
5. ✅ Indexing must be configured with `indexed: true`
6. ✅ Weight must be between 0 and 1
7. ✅ Timestamps must be valid ISO 8601 format
8. ✅ Tags must be unique and match pattern

## Examples

See `harmony-schemas/examples/` for complete examples:
- `cross-graph-edge-valid.json`: Full featured edge
- `cross-graph-edge-minimal.json`: Minimal required fields
- `cross-graph-edge-invalid.json`: Invalid edge for testing