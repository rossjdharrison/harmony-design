# Harmony Schemas

JSON schemas and validators for the Harmony Design System.

## Overview

This directory contains JSON Schema definitions and vanilla JavaScript validators for core system concepts. All validators use **relative paths only** (no npm dependencies) to comply with system policies.

## Schemas

### Cross-Graph Edge Schema

**File**: `cross-graph-edge.schema.json`

Defines the structure for edges that connect nodes across different graph contexts (UI, Audio, State, Control).

**Key Features**:
- Validates graph context identifiers
- Enforces latency budgets for audio edges (≤10ms policy)
- Requires edges to be indexed (policy #22)
- Validates data types and buffer sizes
- Supports metadata and tagging

**Validator**: `validate-cross-graph-edge.js`

**Tests**: `validate-cross-graph-edge.test.js`

## Usage

### Validating a Single Edge

```javascript
import { validateCrossGraphEdge } from './harmony-schemas/validate-cross-graph-edge.js';

const edge = {
  id: 'ui-to-audio-play',
  sourceGraph: 'ui',
  sourceNode: 'play-button',
  targetGraph: 'audio',
  targetNode: 'playback-engine',
  edgeType: 'event',
  dataType: 'event',
  latencyBudget: 5,
  indexed: true
};

const result = validateCrossGraphEdge(edge);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Validating Multiple Edges

```javascript
import { validateCrossGraphEdges } from './harmony-schemas/validate-cross-graph-edge.js';

const edges = [/* array of edge definitions */];
const result = validateCrossGraphEdges(edges);

console.log(`Valid: ${result.validEdges}/${result.totalEdges}`);
```

### Creating Default Edges

```javascript
import { createDefaultEdge } from './harmony-schemas/validate-cross-graph-edge.js';

const edge = createDefaultEdge(
  'my-edge',
  'ui',
  'source-node',
  'audio',
  'target-node'
);
```

## Policy Compliance

All validators in this directory comply with:

- **No npm imports**: Uses relative paths only
- **Policy #22**: Cross-graph edges must be indexed
- **Audio latency**: Maximum 10ms for audio edges
- **Vanilla JavaScript**: No frameworks or build tools required

## Testing

Run tests with Node.js:

```bash
node harmony-schemas/validate-cross-graph-edge.test.js
```

## Related Documentation

- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - Main system documentation
- [Cross-Graph Reactivity Flow](../docs/Cross-Graph-Reactivity-Flow.md) - How edges enable reactivity
- [Graph Code Storage Format](../docs/Graph-Code-Storage-Format.md) - Storage specification

## Schema Development

When adding new schemas:

1. Create JSON Schema file with `.schema.json` extension
2. Create validator with relative imports only
3. Create test file with `.test.js` extension
4. Update this README
5. Update DESIGN_SYSTEM.md with new schema documentation