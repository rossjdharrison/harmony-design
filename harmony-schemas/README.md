# Harmony Schemas

JSON Schema definitions for the Harmony Design System graph nodes and data structures.

## Overview

This package contains JSON Schema definitions that validate the structure of nodes in the Harmony graph engine. These schemas ensure data consistency across the system and enable type-safe serialization to IndexedDB.

## Schemas

### Graph Node Schemas

- **`component-node.schema.json`** - Component graph nodes representing UI elements
- **`intent-node.schema.json`** - Intent graph nodes representing user goals and actions
- **`domain-node.schema.json`** - Domain graph nodes representing bounded contexts and logical groupings

### Usage

Each schema can be used for:
1. **Validation** - Validate node data before insertion into the graph
2. **Documentation** - Self-documenting structure for developers
3. **Code Generation** - Generate TypeScript types and Rust structs
4. **Serialization** - Ensure consistent JSON format for IndexedDB storage

## Schema Structure

All node schemas follow a common pattern:

```json
{
  "id": "unique-node-identifier",
  "type": "node-type",
  "name": "Human Readable Name",
  "metadata": { ... },
  ...
}
```

### Component Node

Represents UI components in the design system.

**Key Properties:**
- `id` - Pattern: `component:{name}`
- `type` - Always `"component"`
- `category` - Atomic design level (atom, molecule, organism, template, page)
- `implementation` - Path to component file
- `states` - Available component states
- `events` - Events the component publishes

### Intent Node

Represents user intents and interaction goals.

**Key Properties:**
- `id` - Pattern: `intent:{name}`
- `type` - Always `"intent"`
- `category` - Intent type (user-action, system-event, navigation, audio-control, etc.)
- `trigger` - What triggers this intent
- `command` - EventBus command to publish
- `context` - Required context data

### Domain Node

Represents bounded contexts and architectural domains.

**Key Properties:**
- `id` - Pattern: `domain:{name}`
- `type` - Always `"domain"`
- `namespace` - Domain namespace identifier
- `boundedContext` - Reference to BC implementation
- `responsibilities` - List of domain responsibilities
- `interfaces` - Commands, events, and queries
- `dependencies` - Other domains this depends on
- `implementation` - Language, target, and path
- `performance` - Memory and latency budgets

## Code Generation

Schemas are used to generate:
- **TypeScript types** - For web components and UI code
- **Rust structs** - For WASM bounded contexts
- **Validation functions** - Runtime validation helpers

### Codegen Pipeline

```
harmony-schemas → harmony-dev/crates → harmony-dev/workers
```

**Important:** When modifying schemas, always run the codegen pipeline and commit the generated code together with schema changes. CI will fail if schemas change but generated code is stale.

## Validation

Schemas use JSON Schema Draft 7 standard with additional constraints:

- **Pattern matching** - IDs, namespaces, and event names must follow naming conventions
- **String lengths** - Descriptions and names have max lengths for performance
- **Required fields** - Core properties are mandatory
- **Enum constraints** - Categories and types use fixed vocabularies
- **Additional properties** - Disabled to prevent schema drift

## Cross-References

Schemas support cross-references between nodes:

- **Component → Intent** - Components trigger intents via events
- **Intent → Domain** - Intents route to domain commands
- **Domain → Domain** - Domains can depend on other domains

All cross-graph edges must be indexed (Policy #22).

## Performance Considerations

- Schemas are designed for fast validation (<1ms per node)
- Maximum node size: ~10KB serialized JSON
- IndexedDB storage uses schema-validated JSON
- No nested objects deeper than 4 levels

## Related Documentation

- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md#graph-engine) - Graph engine architecture
- [harmony-graph/README.md](../harmony-graph/README.md) - Graph implementation
- [bounded-contexts/](../bounded-contexts/) - Domain implementations

## Contributing

When adding new schemas:

1. Follow the existing naming pattern: `{node-type}-node.schema.json`
2. Include all required fields: `id`, `type`, `name`
3. Add pattern validation for identifiers
4. Document all properties with descriptions
5. Update this README with the new schema
6. Run codegen pipeline and commit generated code
7. Update DESIGN_SYSTEM.md with usage examples

## License

Part of the Harmony Design System.