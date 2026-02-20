/**
 * @fileoverview Harmony UI - Composition Root
 * @module harmony-ui
 * 
 * Exports:
 * - UIRenderer: Core rendering component with cross-graph edge creation
 * 
 * This module wires the EventBus singleton and exposes the public API
 * for the Harmony UI rendering system.
 * 
 * Related docs: See DESIGN_SYSTEM.md § Harmony UI Package
 */

export { UIRenderer } from './ui-renderer.js';