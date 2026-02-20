/**
 * Harmony Graph - Composition Root
 * 
 * Main entry point for the graph processing engine.
 * Exports graph capability and template management modules.
 * 
 * NOTE: GPU dispatch code belongs in harmony-graph-bc (Rust/WASM).
 * This JS barrel only exports JS-side utilities.
 * For TypeScript exports (AvailabilityQueryEngine etc.), use index.ts.
 * 
 * @module harmony-graph
 * @see DESIGN_SYSTEM.md#graph-engine
 */

// Capability management
export { default as CapabilityManager } from './capability-manager.js';

// Template management
export { default as TemplateCache } from './template-cache.js';
export { default as TemplateStorage } from './template-storage.js';