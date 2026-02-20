/**
 * @fileoverview Harmony Web Components - Composition Root
 * @module harmony-web-components
 * 
 * This module serves as the composition root for all Harmony Design System
 * web components. It wires the EventBus singleton, registers components,
 * and exposes the public API.
 * 
 * Architecture:
 * - Re-exports EventBus singleton from core/event-bus.js
 * - Lazy-loads components for optimal bundle size
 * - Provides component registry for dynamic instantiation
 * 
 * Related docs: harmony-design/DESIGN_SYSTEM.md § Web Components, § Composition Root
 */

// Re-export EventBus singleton (mandatory per policy 32)
export { EventBus } from '../../core/event-bus.js';

// Import and register components
import { HdsButtonGpu } from './hds-button-gpu.js';

/**
 * Component registry for dynamic instantiation
 * @type {Map<string, typeof HTMLElement>}
 */
const componentRegistry = new Map();

/**
 * Register a web component
 * @param {string} name - Component tag name
 * @param {typeof HTMLElement} constructor - Component class
 */
export function registerComponent(name, constructor) {
  componentRegistry.set(name, constructor);
  
  // Define custom element if not already defined
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

/**
 * Get a component constructor by name
 * @param {string} name - Component tag name
 * @returns {typeof HTMLElement|undefined} Component constructor
 */
export function getComponent(name) {
  return componentRegistry.get(name);
}

/**
 * Initialize all components
 * Called by application bootstrap
 */
export function initializeComponents() {
  // Register GPU-enabled button
  registerComponent('hds-button-gpu', HdsButtonGpu);
  
  console.log('[HarmonyWebComponents] Components initialized:', Array.from(componentRegistry.keys()));
}

/**
 * Get list of all registered components
 * @returns {string[]} Array of component tag names
 */
export function getRegisteredComponents() {
  return Array.from(componentRegistry.keys());
}

// Auto-initialize on module load
initializeComponents();

// Export components for direct import
export { HdsButtonGpu };