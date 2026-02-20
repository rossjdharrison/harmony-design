
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

### Availability Query Engine

The Availability Query Engine provides specialized queries for checking component and resource availability across the graph system. It wraps the core query engine with availability-specific operations.

**Location:** ``harmony-graph/src/availability-query-engine.ts``

**Purpose:**
- Check if components are ready to use
- Verify resource availability before allocation
- Track dependency availability
- Support reactive UI updates based on availability

**Availability States:**
- **Available**: Resource is ready for use
- **InUse**: Resource is active but can be shared
- **Busy**: Resource is occupied and cannot be accessed
- **Unavailable**: Resource has errors or missing dependencies
- **Unknown**: Resource state cannot be determined

**Key Features:**

1. **Single Node Check**
   - Fast availability verification (< 1ms target)
   - Checks node attributes and state
   - Returns detailed status and reason

2. **Batch Checking**
   - Efficient multi-node queries (< 10ms for 100 nodes)
   - Useful for dashboard and list views

3. **Dependency Traversal**
   - Checks transitive dependencies
   - Configurable depth limit
   - Identifies blocking dependencies

4. **Discovery Queries**
   - Find all available nodes of a type
   - Useful for resource allocation

5. **Async Waiting**
   - Poll until resource becomes available
   - Configurable timeout
   - Returns promise

**Usage Example:**

``````typescript
import { createGraphSystem } from 'harmony-graph';

const { availabilityEngine } = createGraphSystem();

// Check single component
const result = availabilityEngine.checkAvailability('button-primary');
if (result.status === AvailabilityStatus.Available) {
  // Use component
}

// Check with dependencies
const deepResult = availabilityEngine.checkAvailability('complex-widget', {
  includeTransitive: true,
  maxDepth: 3
});

// Find available components
const available = availabilityEngine.findAvailable('button');

// Wait for availability
const ready = await availabilityEngine.waitForAvailability('async-loader', {
  timeout: 5000
});
``````

**Performance Targets:**
- Single check: < 1ms
- Batch check (100 nodes): < 10ms
- Dependency check: < 5ms per level

**Integration with UI:**

Components should query availability before rendering or enabling interactions:

``````javascript
// In web component
connectedCallback() {
  const result = this.availabilityEngine.checkAvailability(this.targetId);
  this.disabled = result.status !== AvailabilityStatus.Available;
  this.setAttribute('aria-disabled', this.disabled);
}
``````

**See Also:**
- [Query Engine](file://./harmony-graph/src/query-engine.ts) - Core query functionality
- [Cross-Graph Index](file://./harmony-graph/src/cross-graph-index.ts) - Cross-graph queries
- [Graph Engine](file://./harmony-graph/src/graph-engine.ts) - Core graph operations



## Availability Query Engine

The Availability Query Engine wraps the core query engine to provide specialized availability checking for nodes and edges across the multi-graph system.

### Purpose

Check if nodes and edges are available before using them. This prevents errors from missing, archived, or deleted entities.

### Key Features

- **Single Node Checks**: Verify individual node availability with <1ms latency
- **Dependency Checking**: Recursively check dependencies up to configurable depth
- **Batch Operations**: Check multiple entities in parallel for performance
- **Smart Caching**: Configurable cache duration (default 5 seconds) to reduce queries
- **Edge Validation**: Automatically checks source and target node availability

### Basic Usage

``````typescript
import { AvailabilityQueryEngine } from './harmony-graph/src/availability-query-engine.js';
import { QueryEngine } from './harmony-graph/src/query-engine.js';

const queryEngine = new QueryEngine();
const availEngine = new AvailabilityQueryEngine(queryEngine);

// Check single node
const result = await availEngine.checkNodeAvailability('node-123');
if (result.status.available) {
  // Safe to use node
}

// Check with dependencies
const deepCheck = await availEngine.checkNodeAvailability('node-123', {
  checkDependencies: true,
  maxDepth: 3
});

// Batch check
const results = await availEngine.checkBatchAvailability([
  'node-1', 'node-2', 'node-3'
]);
``````

### Availability Rules

A node is **unavailable** if:
- Node not found in graph
- Marked as `archived: true` in metadata
- Marked as `deleted: true` in metadata
- Explicitly set `available: false` in metadata
- Any required dependency is unavailable (when checking dependencies)

An edge is **unavailable** if:
- Edge not found in graph
- Source node is unavailable
- Target node is unavailable

### Performance Targets

- Single node check: <1ms
- Dependency tree check (depth 3): <10ms
- Batch check: <5ms per 100 nodes
- Cache hit: <0.1ms

### Cache Management

The engine caches availability status to reduce repeated queries:

``````typescript
// Clear specific node from cache
availEngine.clearCache('node-123');

// Clear entire cache
availEngine.clearCache();

// Get cache statistics
const stats = availEngine.getCacheStats();
console.log(`Cache has ${stats.size} entries`);
``````

### Integration with Query Engine

The availability engine wraps the core query engine and uses relative imports only:

``````typescript
// ? Correct - relative import
import { QueryEngine } from './query-engine.js';

// ? Wrong - npm import
import { QueryEngine } from '@harmony/graph';
``````

### Related Files

- Implementation: {@link file://./harmony-graph/src/availability-query-engine.ts}
- Tests: {@link file://./harmony-graph/src/availability-query-engine.test.ts}
- Core Query Engine: {@link file://./harmony-graph/src/query-engine.ts}
- Type Definitions: {@link file://./harmony-graph/src/types.ts}
- Package Entry: {@link file://./harmony-graph/src/index.ts}


## Benchmark CI Pipeline

The benchmark CI workflow (`.github/workflows/benchmark.yml`) continuously monitors performance against our absolute constraints.

### Performance Budgets Enforced

1. **Render Budget**: 16ms per frame (60fps) - checked via GPU benchmarks
2. **Memory Budget**: 50MB WASM heap - checked via WASM memory profiling
3. **Load Budget**: 200ms initial load - checked via Chrome load time tests
4. **Audio Latency**: 10ms end-to-end - checked via audio processing benchmarks

### Workflow Jobs

- `wasm-benchmarks` - Builds WASM modules and measures memory usage
- `gpu-benchmarks` - Tests render performance with Chrome headless
- `audio-benchmarks` - Measures audio processing latency
- `load-time-benchmarks` - Tests initial page load performance
- `benchmark-report` - Aggregates results and generates reports
- `track-performance` - Records historical performance data (main branch only)

### Budget Enforcement

The pipeline fails if any budget is exceeded. This is a hard gate - no exceptions.

See `performance/benchmarks/budget-gate.js` for enforcement logic.

### Viewing Results

Benchmark results are uploaded as CI artifacts and retained for 30 days. Historical data is committed to `performance/history/` on main branch.

For local benchmarks, see `performance/README.md`.

