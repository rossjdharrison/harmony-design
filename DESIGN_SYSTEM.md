
### Domain JSON Schema

**Location**: ``harmony-schemas/schemas/domain.schema.json``

The Domain schema defines bounded context nodes in the knowledge graph. Each domain represents a cohesive area of the system with its own ubiquitous language, aggregate roots, and domain events.

**Key Properties**:
- ``ubiquitousLanguage``: Dictionary mapping domain terms to definitions
- ``aggregateRoots``: List of aggregate root entity names
- ``entities``: List of entity names within the domain
- ``valueObjects``: List of value object names
- ``domainEvents``: List of domain event names

**Example**:
```json
{
  'id': 'domain-audio-engine',
  'type': 'Domain',
  'name': 'Audio Engine',
  'description': 'Core audio processing and playback engine',
  'ubiquitousLanguage': {
    'Track': 'An audio file loaded into the workspace',
    'Timeline': 'The temporal arrangement of tracks'
  },
  'aggregateRoots': ['Project', 'Track'],
  'entities': ['AudioClip', 'EffectChain'],
  'valueObjects': ['TimePosition', 'AudioBuffer'],
  'domainEvents': ['TrackLoaded', 'PlaybackStarted']
}
```

**Validation**: Run ``node harmony-schemas/examples/validate-domain.js`` to see validation examples.

**Related Files**:
- Schema: ``harmony-schemas/schemas/domain.schema.json``
- Validator: ``harmony-schemas/utils/schema-validator.js``
- Examples: ``harmony-schemas/examples/validate-domain.js``
