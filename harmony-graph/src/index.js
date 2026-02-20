/**
 * Harmony Graph - Composition Root
 * 
 * Main entry point for the graph processing engine.
 * Exports GPU-accelerated graph operations and intent query capabilities.
 * 
 * @module harmony-graph
 * @see DESIGN_SYSTEM.md#graph-engine
 */

export { IntentQueryExecutor, IntentState, NodeState, EdgeState } from './gpu/intent-query.js';

// Re-export EventBus singleton from core
export { EventBus } from '../../core/event-bus.js';