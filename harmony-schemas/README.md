# Harmony Schemas

JSON Schema definitions for Harmony Design System graph nodes.

## Overview

This package contains JSON Schema definitions that describe the structure and validation rules for nodes in the Harmony graph database. These schemas are used for:

- **Validation**: Ensuring data integrity at runtime and build time
- **Code Generation**: Generating TypeScript types and Rust structs
- **Documentation**: Providing machine-readable API contracts
- **Tooling**: Enabling IDE autocomplete and validation

## Schemas

### Component Schema (`schemas/component.schema.json`)

Defines the structure of Component nodes in the graph. Components are reusable UI elements that follow atomic design principles.

**Key Properties:**
- `id`: Unique kebab-case identifier
- `name`: Human-readable name
- `type`: Must be "component"
- `category`: Atomic design level (atom, molecule, organism, template, page)
- `props`: Array of component properties with types and defaults
- `events`: Array of events the component can emit
- `slots`: Named slots for content projection
- `styles`: CSS custom properties and theming tokens

### Intent Schema (`schemas/intent.schema.json`)

Defines the structure of Intent nodes in the graph. Intents represent user actions or system commands that flow through the EventBus.

**Key Properties:**
- `id`: Unique kebab-case identifier
- `name`: Human-readable name
- `type`: Must be "intent"
- `category`: Intent classification (user, system, navigation, data)
- `payload`: JSON Schema for the intent's data payload
- `source`: Component or domain that typically emits this intent
- `handlers`: Bounded contexts that handle this intent

### Domain Schema (`schemas/domain.schema.json`)

Defines the structure of Domain nodes in the graph. Domains represent bounded contexts or logical groupings of components and intents.

**Key Properties:**
- `id`: Unique kebab-case identifier
- `name`: Human-readable name
- `type`: Must be "domain"
- `description`: Purpose and scope of the domain
- `status`: Lifecycle status (draft, active, deprecated, archived)
- `components`: Array of component IDs belonging to this domain
- `intents`: Array of intent IDs belonging to this domain
- `dependencies`: Array of domain IDs this domain depends on
- `metadata`: Additional tags, documentation links, timestamps

## Validation Examples

Each schema has a corresponding validation example in the `examples/` directory:

- `examples/validate-component.js` - Component validation examples
- `examples/validate-intent.js` - Intent validation examples
- `examples/validate-domain.js` - Domain validation examples

Run examples:

```bash
node examples/validate-component.js
node examples/validate-intent.js
node examples/validate-domain.js
```

## Usage

### In JavaScript/TypeScript

```javascript
import { readFileSync } from 'fs';
import Ajv from 'ajv';

const schema = JSON.parse(readFileSync('./schemas/domain.schema.json'));
const ajv = new Ajv();
const validate = ajv.compile(schema);

const domain = {
  id: 'audio-processing',
  name: 'Audio Processing',
  type: 'domain'
};

if (validate(domain)) {
  console.log('Valid domain!');
} else {
  console.error('Validation errors:', validate.errors);
}
```

### In Rust (via codegen)

The schemas are used to generate Rust types in the `harmony-graph` crate:

```bash
cd ../harmony-graph
cargo run --bin codegen
```

This generates strongly-typed Rust structs from the JSON schemas.

## Schema Design Principles

1. **Strict by Default**: Use `additionalProperties: false` to prevent typos
2. **Clear Constraints**: Use `pattern`, `minLength`, `maxLength` for validation
3. **Self-Documenting**: Every property has a `description`
4. **Version Controlled**: Schemas follow semantic versioning
5. **Cross-Referenced**: Schemas link to each other via ID patterns

## Development

This is a **dev-time package**. The schemas and validation tools are used during development and build processes, not in production runtime.

### Dependencies

- `ajv`: JSON Schema validator (dev dependency)
- `ajv-formats`: Additional format validators (dev dependency)

### Adding a New Schema

1. Create `schemas/your-schema.schema.json`
2. Follow the existing patterns (required fields, strict validation)
3. Create `examples/validate-your-schema.js` with test cases
4. Update this README
5. Run codegen to generate types

## Integration

These schemas integrate with:

- **harmony-graph**: Rust graph database (via codegen)
- **harmony-core**: Runtime validation utilities
- **harmony-web**: Build-time validation
- **CI Pipeline**: Schema validation on every commit

## Reference

See `DESIGN_SYSTEM.md § Graph Schema System` for architectural context.