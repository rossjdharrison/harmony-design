# Custom Node Example

This example demonstrates how to create a complete custom node type for the Harmony Graph System.

## What's Included

- Custom "Waveshaper" distortion node
- Full schema definition
- Rust processor implementation
- UI component with controls
- Unit and integration tests

## Files

- `schema/` - Schema definitions
- `processor/` - Rust WASM processor
- `ui/` - Web component
- `tests/` - Test suite
- `demo.html` - Live demonstration

## Running the Example

1. Build the schema:
   ```bash
   cd harmony-schemas
   cargo build
   npm run codegen
   ```

2. Build the processor:
   ```bash
   cd examples/custom-node-example/processor
   cargo build --target wasm32-unknown-unknown
   ```

3. Open demo:
   ```bash
   # From repository root
   python -m http.server 8000
   # Navigate to http://localhost:8000/examples/custom-node-example/demo.html
   ```

## Integration Steps

See `INTEGRATION.md` for step-by-step integration instructions.