/**
 * @fileoverview Query: Get Component Intents
 * 
 * Retrieves all intents available for a specific component, including
 * trigger mechanisms and conditions.
 * 
 * Related docs: See DESIGN_SYSTEM.md § Graph Queries → Component Intents
 * 
 * @module harmony-design/graph/queries/get-component-intents
 */

/**
 * Gets all intents linked to a component.
 * 
 * @param {Object} graphState - Current graph state
 * @param {string} componentId - ID of the component to query
 * @returns {Array<{intent: Object, link: Object}>} Array of intent-link pairs
 */
export function getComponentIntents(graphState, componentId) {
  if (!graphState.componentIntentLinks || !graphState.intents) {
    return [];
  }
  
  const links = graphState.componentIntentLinks.filter(
    link => link.componentId === componentId
  );
  
  return links.map(link => {
    const intent = graphState.intents.find(i => i.id === link.intentId);
    return {
      intent: intent || null,
      link
    };
  }).filter(pair => pair.intent !== null);
}

/**
 * Gets the primary intent for a component (if any).
 * 
 * @param {Object} graphState - Current graph state
 * @param {string} componentId - ID of the component to query
 * @returns {{intent: Object, link: Object}|null} Primary intent-link pair or null
 */
export function getPrimaryComponentIntent(graphState, componentId) {
  const intents = getComponentIntents(graphState, componentId);
  return intents.find(pair => pair.link.isPrimary) || null;
}

/**
 * Gets intents for a component filtered by trigger mechanism.
 * 
 * @param {Object} graphState - Current graph state
 * @param {string} componentId - ID of the component to query
 * @param {string} triggerMechanism - Trigger mechanism to filter by
 * @returns {Array<{intent: Object, link: Object}>} Filtered intent-link pairs
 */
export function getComponentIntentsByTrigger(graphState, componentId, triggerMechanism) {
  const intents = getComponentIntents(graphState, componentId);
  return intents.filter(pair => pair.link.triggerMechanism === triggerMechanism);
}

/**
 * Checks if a component has a specific intent available.
 * 
 * @param {Object} graphState - Current graph state
 * @param {string} componentId - ID of the component
 * @param {string} intentId - ID of the intent
 * @returns {boolean} True if the intent is available for this component
 */
export function hasComponentIntent(graphState, componentId, intentId) {
  if (!graphState.componentIntentLinks) {
    return false;
  }
  
  return graphState.componentIntentLinks.some(
    link => link.componentId === componentId && link.intentId === intentId
  );
}