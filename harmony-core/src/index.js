/**
 * @fileoverview Harmony Core - Composition Root
 * @module harmony-core
 * 
 * Central export point for core functionality including EventBus,
 * GPU bridge, and shared utilities.
 */

// Re-export EventBus singleton from core/event-bus.js
export { EventBus } from '../core/event-bus.js';

// Export WASM-GPU Bridge
export { WASMGPUBridge } from '../wasm-gpu-bridge.js';

// Export examples and tests (for development)
export { runWASMGPUBridgeTests } from '../wasm-gpu-bridge.test.js';
export { AudioGPUProcessor, runAudioGPUExample } from '../examples/wasm-gpu-audio-example.js';