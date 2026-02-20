# Harmony Schemas

JSON Schema definitions for Harmony Design System graph nodes.

## Overview

This package contains JSON Schema definitions for the three primary node types in the Harmony knowledge graph:

- **Domain** - Bounded context definitions with ubiquitous language
- **Intent** - User goals and workflow triggers
- **Component** - UI component specifications

## Structure

```
harmony-schemas/
├── schemas/           # JSON Schema definitions
│   ├── component.schema.json
│   ├── domain.schema.json
│   └── intent.schema.json
├── examples/          # Validation examples
│   ├── validate-component.js
│   ├── validate-domain.js
│   └── validate-intent.js
└── utils/             # Validation utilities
    └── schema-validator.js
```

## Usage

### Importing Schemas

```javascript
import componentSchema from './schemas/component.schema.json' assert { type: 'json' };
import domainSchema from './schemas/domain.schema.json' assert { type: 'json' };
import intentSchema from './schemas/intent.schema.json' assert { type: 'json' };
```

### Validating Data

```javascript
import { validateSchema } from './utils/schema-validator.js';
import domainSchema from './schemas/domain.schema.json' assert { type: 'json' };

const domainNode = {
  id: 'domain-audio',
  type: 'Domain',
  name: 'Audio Engine',
  description: 'Core audio processing',
  ubiquitousLanguage: { Track: 'Audio file in workspace' },
  aggregateRoots: ['Project'],
  entities: ['AudioClip'],
  valueObjects: ['TimePosition'],
  domainEvents: ['TrackLoaded']
};

const result = validateSchema(domainSchema, domainNode);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Running Examples

```bash
node harmony-schemas/examples/validate-domain.js
node harmony-schemas/examples/validate-component.js
node harmony-schemas/examples/validate-intent.js
```

## Schema Definitions

### Domain Schema

Defines bounded contexts with:
- Ubiquitous language dictionary
- Aggregate roots, entities, value objects
- Domain events
- Metadata (version, tags, timestamps)

### Component Schema

Defines UI components with:
- Component type (primitive, molecule, organism, template)
- Props, events, slots
- Dependencies
- Metadata

### Intent Schema

Defines user intentions with:
- Trigger type (user-action, system-event, scheduled)
- Priority (low, medium, high, critical)
- Context requirements
- Target domains
- Expected outcomes

## Policies

- **No npm dependencies** - Uses vanilla JavaScript with relative imports
- **JSON Schema Draft 7** - All schemas conform to JSON Schema specification
- **Validation utilities** - Local validator implementation without external deps

## Documentation

See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) for:
- Graph node architecture
- Schema design patterns
- Integration with TypeNavigator
- Code generation pipeline