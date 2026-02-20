# Graph Code Storage Format Specification

**Status:** Draft  
**Version:** 1.0.0  
**Last Updated:** 2025-01-XX

## Overview

This specification defines how JavaScript code is stored, serialized, and executed within graph nodes in the Harmony Design System. The format supports ES modules, reactive expressions, and computed properties while maintaining serialization compatibility for IndexedDB persistence.

## Vision Alignment

This specification advances the **Reactive Component System** by defining how code flows through the graph runtime, and supports **WASM Performance** by establishing clear boundaries between JavaScript and WASM execution contexts.

## Core Principles

1. **Serialization-First**: All code must be serializable to JSON for IndexedDB storage
2. **Module Isolation**: Each node's code runs in its own module scope
3. **Type Safety**: Code properties include type metadata for validation
4. **Security**: Code execution is sandboxed and validated before execution
5. **Performance**: Compiled code is cached to avoid repeated parsing

## Code Storage Types

### 1. ES Module Code

ES modules are stored as string literals and dynamically imported at runtime.

```typescript
interface ESModuleCode {
  type: "es-module";
  source: string;           // Raw ES module source code
  exports: string[];        // List of exported identifiers
  imports: ImportSpec[];    // Module dependencies
  hash: string;             // SHA-256 hash for cache validation
}

interface ImportSpec {
  specifier: string;        // Import path or URL
  imports: string[];        // Named imports
  default?: string;         // Default import name
}
```

**Example:**
```json
{
  "type": "es-module",
  "source": "export function transform(value) { return value * 2; }",
  "exports": ["transform"],
  "imports": [],
  "hash": "a3f5b8c9..."
}
```

### 2. Code Properties

Code properties are function bodies stored as strings, compiled into functions at runtime.

```typescript
interface CodeProperty {
  type: "code-property";
  body: string;             // Function body (without function wrapper)
  params: ParamSpec[];      // Parameter definitions
  returnType: string;       // Expected return type
  async: boolean;           // Whether function is async
  pure: boolean;            // Whether function has no side effects
}

interface ParamSpec {
  name: string;
  type: string;
  optional: boolean;
  default?: any;
}
```

**Example:**
```json
{
  "type": "code-property",
  "body": "return input.value * this.multiplier;",
  "params": [
    {"name": "input", "type": "object", "optional": false}
  ],
  "returnType": "number",
  "async": false,
  "pure": true
}
```

### 3. Computed Expressions

Computed expressions are reactive expressions that automatically recompute when dependencies change.

```typescript
interface ComputedExpression {
  type: "computed-expression";
  expression: string;       // JavaScript expression
  dependencies: string[];   // Node IDs or property paths this depends on
  cached: boolean;          // Whether to cache the result
  debounce?: number;        // Debounce delay in milliseconds
}
```

**Example:**
```json
{
  "type": "computed-expression",
  "expression": "inputs.frequency * 2 * Math.PI",
  "dependencies": ["node-123.outputs.frequency"],
  "cached": true,
  "debounce": 16
}
```

## Node Code Storage Schema

Each graph node can contain multiple code storage entries:

```typescript
interface GraphNode {
  id: string;
  type: string;
  code?: NodeCode;
  // ... other node properties
}

interface NodeCode {
  modules?: Map<string, ESModuleCode>;
  properties?: Map<string, CodeProperty>;
  computed?: Map<string, ComputedExpression>;
  metadata: CodeMetadata;
}

interface CodeMetadata {
  version: string;          // Code format version
  compiled?: Date;          // Last compilation timestamp
  errors?: CodeError[];     // Validation or runtime errors
}
```

## Serialization Format

When persisting to IndexedDB, the code is serialized to JSON:

```json
{
  "id": "node-audio-filter",
  "type": "audio-processor",
  "code": {
    "modules": {
      "main": {
        "type": "es-module",
        "source": "export class Filter { ... }",
        "exports": ["Filter"],
        "imports": [],
        "hash": "..."
      }
    },
    "properties": {
      "processBlock": {
        "type": "code-property",
        "body": "return this.filter(input);",
        "params": [{"name": "input", "type": "Float32Array", "optional": false}],
        "returnType": "Float32Array",
        "async": false,
        "pure": false
      }
    },
    "computed": {
      "cutoffFrequency": {
        "type": "computed-expression",
        "expression": "this.baseFrequency * this.resonance",
        "dependencies": ["baseFrequency", "resonance"],
        "cached": true
      }
    },
    "metadata": {
      "version": "1.0.0",
      "compiled": "2025-01-15T10:30:00Z"
    }
  }
}
```

## Code Execution Runtime

### Module Loading

ES modules are loaded using dynamic import with blob URLs:

```javascript
// See: harmony-graph/src/runtime/module-loader.js
const blob = new Blob([moduleCode.source], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);
const module = await import(url);
URL.revokeObjectURL(url);
```

### Property Compilation

Code properties are compiled into functions with proper context binding:

```javascript
// See: harmony-graph/src/runtime/code-compiler.js
const func = new Function(...params, body);
const boundFunc = func.bind(nodeContext);
```

### Computed Expression Evaluation

Computed expressions are evaluated in a sandboxed context with dependency tracking:

```javascript
// See: harmony-graph/src/runtime/expression-evaluator.js
const result = evaluateExpression(expression, {
  inputs: nodeInputs,
  state: nodeState,
  context: executionContext
});
```

## Security Considerations

1. **Sandboxing**: All code runs in a restricted scope without access to global objects
2. **Validation**: Code is validated before compilation to prevent injection attacks
3. **CSP Compliance**: Dynamic code execution respects Content Security Policy headers
4. **Resource Limits**: CPU and memory limits are enforced during execution

## Performance Optimization

1. **Compilation Caching**: Compiled functions are cached by hash to avoid recompilation
2. **Lazy Loading**: Modules are loaded only when needed
3. **Expression Memoization**: Computed expressions cache results when dependencies haven't changed
4. **Worker Offloading**: Heavy computations can be offloaded to Web Workers

## Migration Path

Existing graph nodes without structured code storage can be migrated:

```javascript
// See: harmony-graph/src/migration/code-migration.js
function migrateNodeCode(oldNode) {
  return {
    ...oldNode,
    code: {
      properties: {
        process: {
          type: "code-property",
          body: oldNode.processFunction.toString(),
          // ... infer parameters and types
        }
      },
      metadata: { version: "1.0.0" }
    }
  };
}
```

## Integration Points

- **Graph Engine**: `harmony-graph/src/engine/` - Executes node code during graph traversal
- **Schema Validation**: `harmony-schemas/src/graph-node.schema.json` - Validates code structure
- **IndexedDB Storage**: `harmony-graph/src/storage/` - Persists serialized code
- **Type System**: `types/graph.d.ts` - TypeScript definitions for code storage

## Testing Requirements

1. **Serialization Round-Trip**: Verify code can be serialized and deserialized without loss
2. **Execution Isolation**: Ensure code in one node cannot affect other nodes
3. **Error Handling**: Test validation and runtime error reporting
4. **Performance**: Benchmark compilation and execution overhead (target: <1ms per node)

## Future Enhancements

1. **WASM Integration**: Support for compiled WASM modules in nodes
2. **GPU Shader Code**: Storage format for WebGPU compute shaders
3. **Hot Reloading**: Live code updates without graph restart
4. **Visual Programming**: Conversion between visual blocks and code

## References

- [Graph Runtime Architecture](./graph-runtime-architecture.md)
- [Reactive Component System](./reactive-component-system.md)
- [WASM Performance Guidelines](./wasm-performance.md)
- [IndexedDB Storage Strategy](./indexeddb-storage.md)

---

**Related Files:**
- Implementation: `harmony-graph/src/runtime/code-storage.js`
- Schema: `harmony-schemas/src/graph-code.schema.json`
- Types: `types/graph-code.d.ts`
- Tests: `tests/graph-code-storage.test.js`