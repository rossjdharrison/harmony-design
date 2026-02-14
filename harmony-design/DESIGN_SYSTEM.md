# Harmony Design System

Welcome to the Harmony Design System documentation. This system helps you build consistent, accessible, and performant user interfaces using a graph-based approach to component composition.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Component Hierarchy](#component-hierarchy)
3. [Lifecycle States](#lifecycle-states)
4. [Composition Relationships](#composition-relationships)
5. [Design System Tools](#design-system-tools)
6. [Working with the System](#working-with-the-system)
7. [Implementation Notes](#implementation-notes)

## Core Concepts

The Harmony Design System uses a **graph-based architecture** where components, tokens, and patterns are nodes connected by typed edges. This allows us to:

- Trace dependencies between components
- Understand composition chains
- Validate design consistency
- Generate documentation automatically
- Enforce architectural constraints

### Key Entities

- **DesignSpecNodes**: Component specifications in `.pen` files
- **ImplementationNodes**: TypeScript/JavaScript implementations (`.tsx`, `.js`)
- **DesignTokens**: Visual properties (colors, spacing, typography)
- **Edges**: Relationships between nodes (`composes_of`, `inherits_pattern`, `implements`)

## Component Hierarchy

Components are organized in levels following atomic design principles:

1. **Atoms**: Basic building blocks (buttons, inputs, icons)
2. **Molecules**: Simple combinations of atoms (form fields, cards)
3. **Organisms**: Complex UI sections (navigation, headers)
4. **Templates**: Page layouts without content
5. **Pages**: Complete views with real content

See [core/type-navigator.js](core/type-navigator.js) for graph traversal implementation.

## Lifecycle States

Every component progresses through defined states:

- `draft`: Initial concept, not ready for implementation
- `design_complete`: Design finalized, ready for development
- `implementation_ready`: Technical specs complete
- `in_development`: Currently being built
- `review`: Awaiting review
- `approved`: Ready for production use
- `deprecated`: Marked for removal

State transitions are tracked in the graph to maintain design-development synchronization.

## Composition Relationships

Components relate to each other through typed edges:

### composes_of

Indicates a component is built from other components.

```
button-primary (molecule)
  ├─ composes_of → icon-base (atom)
  └─ composes_of → text-label (atom)
```

### inherits_pattern

Indicates a component follows a design pattern.

```
button-primary → inherits_pattern → interactive-pattern
```

### implements

Links design specifications to code implementations.

```
button-primary.pen → implements → button-primary.tsx
```

See [tools/get_component_dependencies.js](tools/get_component_dependencies.js) for tracing these relationships.

## Design System Tools

Tools for querying and analyzing the design system graph.

### query_components

Filter and search components by criteria:

```javascript
import { queryComponents } from './tools/query_components.js';

// Find all atoms in draft state
const draftAtoms = await queryComponents({
  level: 'atom',
  state: 'draft'
});

// Find components using a specific token
const componentsWithPrimary = await queryComponents({
  usesToken: 'color-primary-500'
});
```

### get_component_dependencies

Trace composition chains and understand dependencies:

```javascript
import { getComponentDependencies } from './tools/get_component_dependencies.js';

// Get all dependencies of a component (what it uses)
const deps = await getComponentDependencies({
  componentId: 'button-primary',
  direction: 'upstream',
  maxDepth: 5
});

// Find what uses a component
const usages = await getComponentDependencies({
  componentId: 'icon-base',
  direction: 'downstream'
});

// Get both directions
const fullGraph = await getComponentDependencies({
  componentId: 'card-stats',
  direction: 'both',
  includePatterns: true
});
```

#### Dependency Query Options

- **componentId** (required): Component to trace from
- **direction**: `'upstream'` (dependencies), `'downstream'` (dependents), or `'both'`
- **maxDepth**: Maximum traversal depth (default: 10)
- **includePatterns**: Include `inherits_pattern` edges (default: false)
- **edgeTypes**: Array of edge types to follow (default: `['composes_of']`)

#### Result Structure

```javascript
{
  rootComponentId: 'button-primary',
  direction: 'upstream',
  totalDependencies: 5,
  maxDepthReached: 2,
  tree: {
    id: 'button-primary',
    name: 'Primary Button',
    type: 'molecule',
    depth: 0,
    relationship: 'root',
    dependencies: [
      {
        id: 'icon-base',
        name: 'Icon Base',
        type: 'atom',
        depth: 1,
        relationship: 'composes_of',
        dependencies: []
      },
      // ... more dependencies
    ]
  },
  flatList: ['button-primary', 'icon-base', 'text-label', ...],
  depthMap: {
    'button-primary': 0,
    'icon-base': 1,
    'text-label': 1
  }
}
```

### Helper Functions

#### findCircularDependencies

Detect circular composition chains:

```javascript
import { findCircularDependencies } from './tools/get_component_dependencies.js';

const cycles = await findCircularDependencies('button-primary');
// Returns: [['comp-a', 'comp-b', 'comp-a']] if cycle exists
```

#### getDependencyStats

Get quick statistics:

```javascript
import { getDependencyStats } from './tools/get_component_dependencies.js';

const stats = await getDependencyStats('button-primary');
// Returns: {
//   directDependencies: 2,
//   totalDependencies: 5,
//   dependents: 12,
//   maxDepth: 3
// }
```

#### findShortestPath

Find shortest composition path between components:

```javascript
import { findShortestPath } from './tools/get_component_dependencies.js';

const path = await findShortestPath('page-dashboard', 'icon-base');
// Returns: ['page-dashboard', 'card-stats', 'icon-base']
```

## Working with the System

### Adding a New Component

1. Create design spec in `.pen` file
2. Set initial state to `draft`
3. Define composition relationships
4. Progress through lifecycle states
5. Link implementation when ready

### Tracing Dependencies

Use `get_component_dependencies` to understand:

- What components a feature depends on
- Impact analysis before changes
- Reusability opportunities
- Circular dependency issues

### Validating Architecture

- Check that atoms don't depend on molecules
- Ensure no circular dependencies
- Verify all implementations link to specs
- Confirm state progression is valid

## Implementation Notes

### TypeNavigator-Only Queries

All graph queries must use TypeNavigator. Direct database access is not allowed. This ensures:

- Consistent query patterns
- Proper type validation
- Performance optimization
- Cache coherence

See [core/type-navigator.js](core/type-navigator.js) for API details.

### Performance Considerations

- Dependency queries are cached per session
- Maximum depth limits prevent infinite traversal
- Cycle detection uses visited set for O(n) complexity
- Flat list generation for quick lookups

### Edge Type Conventions

- `composes_of`: Component A contains component B
- `inherits_pattern`: Component follows a design pattern
- `implements`: Code file implements a design spec
- `uses_token`: Component uses a design token

### Testing

Run tool tests:

```bash
node harmony-design/tools/get_component_dependencies.test.js
```

All tools must have test coverage before deployment.

---

**Last Updated**: 2024 (task-del-get-component-dependencies-too)

For questions or contributions, see the project repository.