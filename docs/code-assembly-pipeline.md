# Code Assembly Pipeline

**Status:** Implemented  
**Mission:** `del-code-assembly-pipeline-spec`  
**Vision Alignment:** Reactive Component System, WASM Performance

## Overview

The Code Assembly Pipeline transforms graph nodes into executable JavaScript bundles for browser execution. It bridges the gap between declarative graph representations and imperative runtime code, ensuring optimal performance while maintaining the reactive component model.

## Architecture

### Pipeline Stages

```
Graph Nodes → Validation → Code Generation → Bundling → Optimization → Execution
```

1. **Validation Stage**: Verify node integrity and dependencies
2. **Code Generation Stage**: Transform nodes to JavaScript modules
3. **Bundling Stage**: Combine modules into executable chunks
4. **Optimization Stage**: Tree-shake, minify, and inline hot paths
5. **Execution Stage**: Load and initialize in browser runtime

### Key Components

- **UIRenderer**: Core assembly orchestrator (`core/ui-renderer.js`)
- **CodeGenerator**: Node-to-JS transformer (`harmony-graph/code-generator.js`)
- **BundleOptimizer**: Performance optimization (`harmony-graph/bundle-optimizer.js`)
- **ModuleLoader**: Runtime loader (`core/module-loader.js`)

## Implementation

### UIRenderer

The UIRenderer is responsible for coordinating the entire assembly pipeline. It receives graph nodes from the Graph Storage layer and produces executable JavaScript bundles.

**Location:** `core/ui-renderer.js`

**Key Responsibilities:**
- Graph traversal and topological sorting
- Dependency resolution
- Code generation orchestration
- Bundle optimization
- Runtime initialization

**Performance Constraints:**
- Initial bundle generation: < 100ms
- Incremental updates: < 16ms (one frame)
- Memory overhead: < 5MB per bundle

### Code Generation

The CodeGenerator transforms individual graph nodes into JavaScript module code. Each node type has a specific code template.

**Location:** `harmony-graph/code-generator.js`

**Node Type Mappings:**

| Node Type | Output Format | Example |
|-----------|---------------|---------|
| Component | Web Component class | `class HdsButton extends HTMLElement` |
| State | Reactive store | `const state = reactive({ count: 0 })` |
| Event | EventBus subscription | `eventBus.subscribe('click', handler)` |
| Compute | Pure function | `const computed = (a, b) => a + b` |
| Effect | Side-effect handler | `effect(() => { /* side effect */ })` |

**Code Template Structure:**

```javascript
// Module header (imports, dependencies)
import { ... } from '...';

// Node implementation (generated from graph node)
export class GeneratedComponent extends HTMLElement {
  // ... generated code ...
}

// Module footer (exports, registration)
customElements.define('generated-component', GeneratedComponent);
```

### Bundle Optimization

The BundleOptimizer applies performance optimizations to generated code before execution.

**Location:** `harmony-graph/bundle-optimizer.js`

**Optimization Techniques:**

1. **Tree Shaking**: Remove unused code paths
2. **Dead Code Elimination**: Remove unreachable code
3. **Constant Folding**: Evaluate compile-time constants
4. **Inline Expansion**: Inline small, hot functions
5. **Code Splitting**: Separate critical and lazy-loaded code

**Optimization Levels:**

- **Development**: Minimal optimization, full source maps
- **Preview**: Moderate optimization, readable output
- **Production**: Maximum optimization, no debug info

### Module Loading

The ModuleLoader handles runtime loading and initialization of assembled bundles.

**Location:** `core/module-loader.js`

**Loading Strategies:**

1. **Eager Loading**: Critical path components (< 200ms target)
2. **Lazy Loading**: On-demand components (triggered by user action)
3. **Prefetch Loading**: Predicted-next components (idle time)
4. **Streaming Loading**: Large components (progressive enhancement)

**Cache Strategy:**
- Use browser Cache API for bundle storage
- Versioned by content hash
- Invalidate on graph changes
- Maximum cache size: 50MB

## Data Flow

### Assembly Request Flow

```
1. Graph Change Event
   ↓
2. UIRenderer.assembleGraph(graphId)
   ↓
3. GraphStorage.loadGraph(graphId)
   ↓
4. TopologicalSort(nodes)
   ↓
5. CodeGenerator.generateModule(node) [for each node]
   ↓
6. BundleOptimizer.optimize(modules)
   ↓
7. ModuleLoader.load(bundle)
   ↓
8. Runtime Execution
```

### Incremental Update Flow

```
1. Node Update Event
   ↓
2. UIRenderer.updateNode(nodeId)
   ↓
3. DependencyGraph.getAffectedNodes(nodeId)
   ↓
4. CodeGenerator.generateModule(affectedNode) [for each]
   ↓
5. BundleOptimizer.optimizeIncremental(changedModules)
   ↓
6. ModuleLoader.hotReload(changedModules)
   ↓
7. Runtime Hot Update
```

## Bundle Format

### Bundle Structure

```javascript
// harmony-bundle-v1.js
(function(global) {
  'use strict';
  
  // Bundle metadata
  const __BUNDLE_META__ = {
    version: '1.0.0',
    graphId: 'graph-abc123',
    timestamp: 1704067200000,
    modules: ['module-1', 'module-2', ...],
    entryPoint: 'module-1'
  };
  
  // Module registry
  const __MODULES__ = {};
  
  // Module loader
  function __require__(moduleId) {
    if (!__MODULES__[moduleId]) {
      throw new Error(`Module ${moduleId} not found`);
    }
    if (!__MODULES__[moduleId].exports) {
      const module = { exports: {} };
      __MODULES__[moduleId].factory(module, module.exports, __require__);
      __MODULES__[moduleId].exports = module.exports;
    }
    return __MODULES__[moduleId].exports;
  }
  
  // Module definitions
  __MODULES__['module-1'] = {
    factory: function(module, exports, require) {
      // Generated module code here
    }
  };
  
  // Initialize entry point
  __require__(__BUNDLE_META__.entryPoint);
  
})(window);
```

### Module Format

Each module in the bundle follows this structure:

```javascript
{
  id: 'unique-module-id',
  dependencies: ['dep-1', 'dep-2'],
  factory: function(module, exports, require) {
    // Module implementation
    const dep1 = require('dep-1');
    const dep2 = require('dep-2');
    
    // Module code
    class MyComponent extends HTMLElement {
      // ...
    }
    
    // Export
    exports.MyComponent = MyComponent;
  }
}
```

## Performance Optimization

### Critical Path Optimization

The assembly pipeline prioritizes critical path components:

1. **Identify Critical Nodes**: Components needed for initial render
2. **Inline Critical Code**: Embed small critical modules in HTML
3. **Defer Non-Critical**: Lazy-load below-the-fold components
4. **Preconnect Dependencies**: DNS prefetch for external resources

### Code Splitting Strategy

```javascript
// Critical bundle (inline in HTML)
harmony-critical.js: {
  'app-shell',
  'hds-button',
  'event-bus'
}

// Primary bundle (load immediately)
harmony-primary.js: {
  'hds-input',
  'hds-select',
  'hds-checkbox'
}

// Secondary bundle (lazy load)
harmony-secondary.js: {
  'hds-modal',
  'hds-tooltip',
  'hds-datepicker'
}
```

### Memory Management

- **Module Unloading**: Remove unused modules after timeout
- **Weak References**: Use WeakMap for component instances
- **Garbage Collection Hints**: Null references on component disconnect
- **Memory Profiling**: Track bundle memory usage in development

## Error Handling

### Compilation Errors

```javascript
{
  type: 'compilation-error',
  stage: 'code-generation',
  nodeId: 'node-abc123',
  message: 'Invalid property reference',
  context: {
    line: 42,
    column: 10,
    code: 'this.invalidProperty'
  }
}
```

### Runtime Errors

```javascript
{
  type: 'runtime-error',
  stage: 'execution',
  moduleId: 'module-abc123',
  message: 'Uncaught TypeError',
  stack: '...',
  context: {
    componentName: 'hds-button',
    eventType: 'click'
  }
}
```

### Recovery Strategies

1. **Fallback Rendering**: Use static HTML if bundle fails
2. **Partial Loading**: Load working modules, skip broken ones
3. **Error Boundaries**: Isolate component errors
4. **Hot Reload**: Attempt recompilation on error fix

## Development Workflow

### Local Development

```bash
# Watch mode - recompile on graph changes
npm run dev:assembly

# Debug mode - verbose logging, source maps
npm run dev:assembly -- --debug

# Profile mode - performance metrics
npm run dev:assembly -- --profile
```

### Testing

```bash
# Unit tests - code generation
npm run test:assembly:unit

# Integration tests - full pipeline
npm run test:assembly:integration

# Performance tests - bundle size, load time
npm run test:assembly:performance
```

### Debugging

The assembly pipeline includes comprehensive debugging tools:

- **Bundle Inspector**: Visualize module dependencies
- **Code Diff**: Compare generated code across versions
- **Performance Profiler**: Measure each pipeline stage
- **Memory Analyzer**: Track memory usage per module

## Integration Points

### Graph Storage Integration

The pipeline reads graph data from the Graph Storage layer:

```javascript
import { GraphStorage } from '../harmony-graph/storage.js';

const storage = new GraphStorage();
const graph = await storage.loadGraph(graphId);
const nodes = graph.nodes;
```

See: [Graph Code Storage Format](./graph-code-storage-format.md)

### Template Integration

Generated components use templates from Template Storage:

```javascript
import { TemplateStorage } from '../harmony-graph/template-storage.js';

const templates = new TemplateStorage();
const template = await templates.getTemplate(templateId);
```

See: [Template Storage Strategy](./template-storage-strategy.md)

### EventBus Integration

Generated code subscribes to EventBus events:

```javascript
import { EventBus } from '../core/event-bus.js';

const eventBus = EventBus.getInstance();
eventBus.subscribe('button:click', handler);
```

See: [Event Bus Architecture](../DESIGN_SYSTEM.md#event-bus)

## Future Enhancements

### WebAssembly Compilation

Future versions will support WASM compilation for performance-critical nodes:

```
Graph Node → WASM Module → JavaScript Glue → Execution
```

**Benefits:**
- 2-5x faster execution for compute nodes
- Reduced memory footprint
- Better optimization opportunities

### GPU Shader Compilation

Animation and visual effect nodes will compile to GPU shaders:

```
Animation Node → WGSL Shader → WebGPU Pipeline → GPU Execution
```

**Benefits:**
- 60fps guaranteed for visual effects
- Offload work from main thread
- Hardware acceleration

### Ahead-of-Time Compilation

Production builds will support AOT compilation:

```
Build Time: Graph → Optimized Bundle
Run Time: Load Pre-compiled Bundle
```

**Benefits:**
- Zero compilation overhead at runtime
- Maximum optimization
- Smaller bundle sizes

## References

- **Implementation**: `core/ui-renderer.js`, `harmony-graph/code-generator.js`
- **Tests**: `tests/assembly-pipeline.test.js`
- **Related Docs**: [Graph Storage](./graph-code-storage-format.md), [Template Storage](./template-storage-strategy.md)
- **Vision**: Reactive Component System, WASM Performance