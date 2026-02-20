
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

### Cross-Graph Edge Schema

**Location**: ``harmony-schemas/cross-graph-edge-schema.json``

The Cross-Graph Edge schema defines edges connecting nodes across different graph types (Component, Intent, Domain). These edges enable multi-graph navigation and relationship tracking.

**Required Fields**:
- ``id``: Unique edge identifier (pattern: ``edge-*``)
- ``sourceGraph``: Source graph type (component|intent|domain)
- ``sourceNodeId``: Source node ID within its graph
- ``targetGraph``: Target graph type (component|intent|domain)
- ``targetNodeId``: Target node ID within its graph
- ``edgeType``: Semantic relationship type

**Edge Types**:
- ``implements``: Target implements source (Intent ? Component)
- ``triggers``: Source triggers target (Component ? Domain)
- ``depends-on``: Source depends on target
- ``provides-data-to``: Data flow from source to target
- ``consumes-data-from``: Data flow from target to source
- ``validates-against``: Validation relationship
- ``renders-for``: Rendering relationship
- ``handles-event-from``: Event handling relationship

**Indexing (Required)**:
All cross-graph edges MUST be indexed per Policy 22. Configure indexing with:
- ``indexed: true`` (required)
- ``indexKeys``: Array of index types (composite-source, composite-target, edgeType)
- ``priority``: Query priority (low|medium|high|critical)

**Validation**: Run ``node harmony-schemas/validate-cross-graph-edge.js``

**Examples**: See ``harmony-schemas/examples/cross-graph-edge-*.json``

**Related**: Component Schema, Intent Schema, Domain Schema, Graph Architecture

