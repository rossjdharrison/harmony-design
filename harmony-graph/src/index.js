/**
 * @fileoverview Composition root for harmony-graph package.
 * Wires EventBus singleton and exposes signal graph bridge API.
 * 
 * @module harmony-graph
 * @see {@link ../../DESIGN_SYSTEM.md#harmony-graph Harmony Graph Package}
 */

import { EventBus } from '../../core/event-bus.js';
import { SignalGraphBridge, NodeType, ParameterType } from '../signal-graph-bridge.js';

/**
 * Singleton instance of SignalGraphBridge.
 * @type {SignalGraphBridge|null}
 */
let bridgeInstance = null;

/**
 * Get or create the SignalGraphBridge singleton.
 * @param {EventBus} [eventBus] - EventBus singleton (required on first call)
 * @returns {SignalGraphBridge} Bridge instance
 * @throws {Error} If EventBus not provided on first call
 */
export function getSignalGraphBridge(eventBus) {
  if (!bridgeInstance) {
    if (!eventBus || !(eventBus instanceof EventBus)) {
      throw new Error('EventBus singleton required to initialize SignalGraphBridge');
    }
    bridgeInstance = new SignalGraphBridge(eventBus);
  }
  return bridgeInstance;
}

/**
 * Initialize the signal graph bridge with WASM module.
 * @param {string} wasmPath - Path to signal-graph WASM file
 * @param {EventBus} eventBus - EventBus singleton
 * @returns {Promise<SignalGraphBridge>} Initialized bridge
 */
export async function initializeSignalGraph(wasmPath, eventBus) {
  const bridge = getSignalGraphBridge(eventBus);
  await bridge.initialize(wasmPath);
  return bridge;
}

/**
 * Dispose of the signal graph bridge and release resources.
 */
export function disposeSignalGraph() {
  if (bridgeInstance) {
    bridgeInstance.dispose();
    bridgeInstance = null;
  }
}

// Re-export types and classes for convenience
export { SignalGraphBridge, NodeType, ParameterType };

// Re-export EventBus from core (Policy #32)
export { EventBus } from '../../core/event-bus.js';