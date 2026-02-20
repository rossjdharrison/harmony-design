# SpatialIndex Bounded Context

Spatial index for nodes with coordinates using quadtree data structure for efficient spatial queries.

## Overview

The SpatialIndex provides efficient spatial indexing and querying capabilities for nodes with 2D coordinates. It uses a quadtree data structure to partition space hierarchically, enabling fast range queries, radius queries, and nearest neighbor searches.

## Architecture

- **Language**: Rust (compiled to WASM)
- **Data Structure**: Quadtree with configurable node capacity
- **Memory Budget**: 10MB
- **Performance**: O(log n) average case for insertion and queries

## API

### Constructor

```javascript
const spatialIndex = createSpatialIndex(minX, minY, maxX, maxY, capacity);
```

- `minX, minY, maxX, maxY`: Bounds of the spatial index
- `capacity`: Maximum nodes per quadtree node before subdivision (default: 4)

### Methods

#### insert(id, x, y, metadata)
Insert a node with coordinates into the index.

**Parameters:**
- `id` (string): Unique node identifier
- `x` (number): X coordinate
- `y` (number): Y coordinate
- `metadata` (object): Additional metadata

**Returns:** `boolean` - True if successful

#### queryRange(minX, minY, maxX, maxY)
Query nodes within a rectangular bounding box.

**Returns:** `Array<object>` - Nodes within the range

#### queryRadius(centerX, centerY, radius)
Query nodes within a circular radius.

**Returns:** `Array<object>` - Nodes within the radius

#### queryNearest(x, y, k)
Find k-nearest neighbors to a point.

**Returns:** `Array<object>` - k nearest nodes, sorted by distance

#### getPosition(id)
Get the position of a node by ID.

**Returns:** `object|null` - Position {x, y} or null

#### size()
Get total number of indexed nodes.

**Returns:** `number` - Node count

#### clear()
Clear all nodes from the index.

## Usage Example

```javascript
// Load the WASM module
const createSpatialIndex = await loadSpatialIndex();

// Create index with bounds (0,0) to (1000,1000)
const index = createSpatialIndex(0, 0, 1000, 1000, 4);

// Insert nodes
index.insert('node1', 100, 100, { type: 'audio' });
index.insert('node2', 200, 200, { type: 'effect' });
index.insert('node3', 150, 150, { type: 'mixer' });

// Query range
const nodesInRange = index.queryRange(50, 50, 250, 250);
console.log('Nodes in range:', nodesInRange);

// Query radius
const nearbyNodes = index.queryRadius(100, 100, 75);
console.log('Nearby nodes:', nearbyNodes);

// Find nearest neighbors
const nearest = index.queryNearest(100, 100, 2);
console.log('2 nearest nodes:', nearest);

// Get position
const position = index.getPosition('node1');
console.log('Node1 position:', position);
```

## Integration with EventBus

The SpatialIndex can be integrated with the EventBus for reactive spatial queries:

```javascript
// Subscribe to node position updates
eventBus.subscribe('node:position:updated', (event) => {
  const { nodeId, x, y, metadata } = event.payload;
  spatialIndex.insert(nodeId, x, y, metadata);
});

// Publish spatial query results
const results = spatialIndex.queryRadius(centerX, centerY, radius);
eventBus.publish('spatial:query:results', { results });
```

## Performance Characteristics

- **Insert**: O(log n) average case
- **Query Range**: O(log n + k) where k is result count
- **Query Radius**: O(log n + k) where k is result count
- **Query Nearest**: O(n log n) for sorting (can be optimized with priority queue)

## Memory Management

The quadtree automatically subdivides when a node exceeds its capacity. The capacity parameter controls the trade-off between memory usage and query performance:

- **Lower capacity** (2-4): More subdivisions, better query performance, higher memory
- **Higher capacity** (8-16): Fewer subdivisions, slower queries, lower memory

## Building

```bash
cd bounded-contexts/spatial-index
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/spatial_index.wasm --out-dir . --target web
```

## Testing

Run Rust tests:
```bash
cargo test
```

## See Also

- [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md#spatial-index) - System-wide documentation
- [GraphIndex](../graph-index/) - Property-based indexing
- [FullTextIndex](../full-text-index/) - Text search indexing