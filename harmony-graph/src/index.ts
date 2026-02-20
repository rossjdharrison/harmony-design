/**
 * @fileoverview Public API barrel export for harmony-graph
 * @module harmony-graph
 *
 * Re-exports the graph engine's public interface. All imports use
 * relative paths — no npm packages in runtime code.
 *
 * @see {@link file://./DESIGN_SYSTEM.md#graph-engine Graph Engine Architecture}
 */

// Availability query engine
export {
  AvailabilityStatus,
  AvailabilityQueryEngine,
} from './availability-query-engine.js';

export type {
  AvailabilityResult,
  AvailabilityQueryOptions,
} from './availability-query-engine.js';

// Core utilities
export { EventBus } from './core/event_bus.js';
export { TypeNavigator, isTypeNavigator } from './core/type_navigator.js';

// Processors
export { CompositionExtractor } from './processors/composition_extractor.js';
export { CompositionValidator } from './processors/composition_validator.js';
