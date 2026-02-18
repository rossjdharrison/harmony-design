/**
 * @fileoverview Command: Add Component Intent Link
 * 
 * Adds a new link between a component and an intent, establishing
 * what actions are available for the component.
 * 
 * Related docs: See DESIGN_SYSTEM.md § Graph Commands → Add Component Intent Link
 * 
 * @module harmony-design/graph/commands/add-component-intent-link
 */

import { createComponentIntentLink, validateComponentIntentLink } from '../component-intent-link.js';

/**
 * Adds a component-intent link to the graph.
 * 
 * @param {Object} graphState - Current graph state
 * @param {Object} payload - Command payload
 * @param {string} payload.componentId - ID of the component
 * @param {string} payload.intentId - ID of the intent
 * @param {string} payload.triggerMechanism - How the intent is triggered
 * @param {boolean} [payload.isPrimary] - Whether this is the primary action
 * @param {Object} [payload.defaultPayload] - Default payload data
 * @param {string[]} [payload.conditions] - Availability conditions
 * @returns {{success: boolean, graphState?: Object, error?: string, link?: Object}} Result
 */
export function addComponentIntentLink(graphState, payload) {
  // Validate required fields
  if (!payload.componentId) {
    return { success: false, error: 'componentId is required' };
  }
  
  if (!payload.intentId) {
    return { success: false, error: 'intentId is required' };
  }
  
  if (!payload.triggerMechanism) {
    return { success: false, error: 'triggerMechanism is required' };
  }
  
  // Check if component exists
  if (!graphState.components || !graphState.components.some(c => c.id === payload.componentId)) {
    return { success: false, error: `Component ${payload.componentId} not found` };
  }
  
  // Check if intent exists
  if (!graphState.intents || !graphState.intents.some(i => i.id === payload.intentId)) {
    return { success: false, error: `Intent ${payload.intentId} not found` };
  }
  
  // Create the link
  const link = createComponentIntentLink(payload.componentId, payload.intentId, {
    triggerMechanism: payload.triggerMechanism,
    isPrimary: payload.isPrimary,
    defaultPayload: payload.defaultPayload,
    conditions: payload.conditions
  });
  
  // Validate the link
  const validation = validateComponentIntentLink(link);
  if (!validation.valid) {
    return { 
      success: false, 
      error: `Invalid link: ${validation.errors.join(', ')}` 
    };
  }
  
  // Check for duplicate
  const existingLinks = graphState.componentIntentLinks || [];
  const isDuplicate = existingLinks.some(
    existing => existing.componentId === link.componentId && 
                existing.intentId === link.intentId &&
                existing.triggerMechanism === link.triggerMechanism
  );
  
  if (isDuplicate) {
    return { 
      success: false, 
      error: 'Link already exists with same component, intent, and trigger mechanism' 
    };
  }
  
  // Add to graph state
  const newGraphState = {
    ...graphState,
    componentIntentLinks: [...existingLinks, link]
  };
  
  return { 
    success: true, 
    graphState: newGraphState,
    link
  };
}