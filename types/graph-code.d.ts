/**
 * @fileoverview Type definitions for graph code storage format
 * @see docs/graph-code-storage-format.md
 */

/**
 * Import specification for ES modules
 */
export interface ImportSpec {
  /** Import path or URL */
  specifier: string;
  /** Named imports */
  imports: string[];
  /** Default import name */
  default?: string;
}

/**
 * ES Module code storage format
 */
export interface ESModuleCode {
  type: "es-module";
  /** Raw ES module source code */
  source: string;
  /** List of exported identifiers */
  exports: string[];
  /** Module dependencies */
  imports: ImportSpec[];
  /** SHA-256 hash for cache validation */
  hash: string;
}

/**
 * Parameter specification for code properties
 */
export interface ParamSpec {
  /** Parameter name */
  name: string;
  /** Parameter type (TypeScript-style) */
  type: string;
  /** Whether parameter is optional */
  optional: boolean;
  /** Default value if optional */
  default?: any;
}

/**
 * Code property storage format (function body)
 */
export interface CodeProperty {
  type: "code-property";
  /** Function body without wrapper */
  body: string;
  /** Parameter definitions */
  params: ParamSpec[];
  /** Expected return type */
  returnType: string;
  /** Whether function is async */
  async: boolean;
  /** Whether function has no side effects */
  pure: boolean;
}

/**
 * Computed expression storage format
 */
export interface ComputedExpression {
  type: "computed-expression";
  /** JavaScript expression */
  expression: string;
  /** Node IDs or property paths this depends on */
  dependencies: string[];
  /** Whether to cache the result */
  cached: boolean;
  /** Debounce delay in milliseconds */
  debounce?: number;
}

/**
 * Code validation or runtime error
 */
export interface CodeError {
  /** Error message */
  message: string;
  /** Line number in source */
  line?: number;
  /** Column number in source */
  column?: number;
  /** Error severity */
  severity: "error" | "warning" | "info";
}

/**
 * Metadata about stored code
 */
export interface CodeMetadata {
  /** Code format version */
  version: string;
  /** Last compilation timestamp */
  compiled?: Date;
  /** Validation or runtime errors */
  errors?: CodeError[];
}

/**
 * Complete node code storage
 */
export interface NodeCode {
  /** ES modules keyed by module name */
  modules?: Map<string, ESModuleCode>;
  /** Code properties keyed by property name */
  properties?: Map<string, CodeProperty>;
  /** Computed expressions keyed by expression name */
  computed?: Map<string, ComputedExpression>;
  /** Code metadata */
  metadata: CodeMetadata;
}

/**
 * Graph node with code storage
 */
export interface GraphNode {
  /** Unique node identifier */
  id: string;
  /** Node type identifier */
  type: string;
  /** Optional code storage */
  code?: NodeCode;
  /** Node inputs */
  inputs?: Record<string, any>;
  /** Node outputs */
  outputs?: Record<string, any>;
  /** Node state */
  state?: Record<string, any>;
}

/**
 * Code compilation result
 */
export interface CompiledCode {
  /** Compiled function or module */
  executable: Function | object;
  /** Compilation timestamp */
  timestamp: Date;
  /** Source hash for cache validation */
  hash: string;
}

/**
 * Code execution context
 */
export interface ExecutionContext {
  /** Node inputs */
  inputs: Record<string, any>;
  /** Node state */
  state: Record<string, any>;
  /** Node outputs (writable) */
  outputs: Record<string, any>;
  /** Parent graph context */
  graph: any;
}

/**
 * Code storage serialization options
 */
export interface SerializationOptions {
  /** Include source maps */
  sourceMaps?: boolean;
  /** Minify code */
  minify?: boolean;
  /** Include metadata */
  includeMetadata?: boolean;
}