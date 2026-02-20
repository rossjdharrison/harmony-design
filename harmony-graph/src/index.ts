/**
 * @fileoverview Harmony Graph Package Entry Point
 * @module harmony-graph
 * 
 * Composition root for the graph query and navigation system.
 * Exports all public APIs and wires together the graph infrastructure.
 * 
 * @see {@link file://./DESIGN_SYSTEM.md#Graph-System Graph System Documentation}
 */

export { QueryEngine } from './query-engine.js';
export { 
  AvailabilityQueryEngine,
  type AvailabilityStatus,
  type AvailabilityQueryResult,
  type AvailabilityQueryOptions
} from './availability-query-engine.js';
export type { 
  GraphNode, 
  GraphEdge, 
  QueryResult,
  QueryOptions 
} from './types.js';