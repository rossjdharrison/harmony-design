
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



### Cross-Graph Edge Schema

**Location**: `harmony-schemas/cross-graph-edge-schema.json`  
**Validator**: `harmony-schemas/validate-cross-graph-edge.js`

The cross-graph edge schema defines connections between different graph types (Component, Domain, Intent). These edges enable the Graph Engine to maintain relationships across bounded contexts.

**Required Fields**:
- `id` (string): Unique identifier for the edge definition
- `sourceGraph` (enum): Source graph type - Component, Domain, or Intent
- `targetGraph` (enum): Target graph type - Component, Domain, or Intent
- `edgeType` (string): Semantic relationship type (e.g., 'implements', 'triggers', 'references')

**Optional Fields**:
- `constraints` (array): Validation rules that must be satisfied for the edge to be valid
- `metadata` (object): Additional edge information including description and bidirectionality

**Example Edge Definition**:
```json
{
  'id': 'component-domain-link',
  'sourceGraph': 'Component',
  'targetGraph': 'Domain',
  'edgeType': 'implements',
  'metadata': {
    'description': 'Component implements domain entity',
    'bidirectional': false
  }
}
```

**Validation**: Run `node harmony-schemas/validate-cross-graph-edge.js` to see validation examples.

**Policy Compliance**: Cross-Graph Edges Must Be Indexed (Policy #22) - all edges defined using this schema are automatically indexed by the Graph Engine for efficient traversal.


## Cross-Graph Edges

Cross-graph edges connect nodes across different graph types (Component, Intent, Domain) to represent relationships in the system architecture.

### Schema Definition

The cross-graph edge schema is defined in `harmony-schemas/cross-graph-edge.schema.json`.

**Required Fields:**
- `id`: Unique identifier (pattern: `edge-[a-z0-9-]+`)
- `sourceGraph`: Source graph type (`component`, `intent`, or `domain`)
- `sourceNodeId`: ID of the source node
- `targetGraph`: Target graph type (`component`, `intent`, or `domain`)
- `targetNodeId`: ID of the target node
- `edgeType`: Relationship type (see Edge Types below)
- `metadata`: Edge metadata including creation timestamp and indexing status

### Edge Types

The schema supports the following relationship types:

- **implements**: Component implements an intent
- **triggers**: Component triggers an intent
- **satisfies**: Intent satisfies a domain requirement
- **depends-on**: Node depends on another node
- **provides**: Node provides data/functionality to another
- **consumes**: Node consumes data/functionality from another
- **validates**: Node validates another node
- **transforms**: Node transforms data from another node

### Indexing Requirement

**Policy**: All cross-graph edges MUST be indexed for fast traversal (`metadata.indexed: true`).

This ensures TypeNavigator can efficiently query relationships across graph boundaries without performance degradation.

### Validation

Use the validation script to verify edge definitions:

\`\`\`bash
node harmony-schemas/validate-cross-graph-edge.js
\`\`\`

The validator checks:
- Required fields are present
- Enum values are valid
- ID patterns match requirements
- Metadata structure is correct
- Constraints are properly formed

### Example Usage

\`\`\`json
{
  'id': 'edge-play-button-triggers-playback',
  'sourceGraph': 'component',
  'sourceNodeId': 'comp-play-button',
  'targetGraph': 'intent',
  'targetNodeId': 'intent-start-playback',
  'edgeType': 'triggers',
  'metadata': {
    'createdAt': '2025-02-15T10:00:00Z',
    'indexed': true,
    'description': 'Play button triggers playback intent'
  }
}
\`\`\`

See `harmony-schemas/examples/cross-graph-edges.json` for more examples.

### Integration with TypeNavigator

TypeNavigator uses cross-graph edges to:
1. Trace component ? intent ? domain relationships
2. Find all components that implement a given intent
3. Discover domain requirements satisfied by intents
4. Validate architectural constraints

The indexed edges enable O(1) lookup performance for common traversal patterns.
