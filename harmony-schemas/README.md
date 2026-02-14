# Harmony Schemas

Core schema definitions for the Harmony Design System.

## Overview

This crate defines the canonical data structures and types used throughout the Harmony Design System, including:

- Graph edge types and relationships
- Component metadata structures
- Design token schemas
- Pattern definitions

## Building

```bash
cargo build
```

## Testing

```bash
cargo test
```

## Usage

This crate is compiled to WASM for use in the browser and can also be used directly in Rust code.

```rust
use harmony_schemas::{Edge, EdgeType};

let edge = Edge::new(
    "edge1".to_string(),
    "button".to_string(),
    "color-token".to_string(),
    EdgeType::UsesToken,
);
```

## Documentation

See [harmony-design/DESIGN_SYSTEM.md](../harmony-design/DESIGN_SYSTEM.md) for overall system documentation.

See [harmony-design/docs/graph-edge-types.md](../harmony-design/docs/graph-edge-types.md) for detailed edge type documentation.