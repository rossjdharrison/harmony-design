/**
 * @fileoverview Component → Intent Link
 * 
 * Represents a link between a ComponentNode and an IntentNode, indicating
 * what actions/intents are available for a component. For example, a Button
 * component might link to "click", "submit", "cancel" intents.
 * 
 * Related docs: See DESIGN_SYSTEM.md § Graph Structure → Component-Intent Links
 * 
 * @module harmony-design/graph/component-intent-link
 */

/**
 * Creates a link between a component and an intent it can trigger.
 * 
 * @typedef {Object} ComponentIntentLink
 * @property {string} id - Unique identifier for this link
 * @property {string} componentId - ID of the ComponentNode
 * @property {string} intentId - ID of the IntentNode
 * @property {string} triggerMechanism - How the intent is triggered (e.g., "click", "submit", "change")
 * @property {boolean} isPrimary - Whether this is the primary action for the component
 * @property {Object<string, any>} [defaultPayload] - Default payload data for the intent
 * @property {string[]} [conditions] - Conditions under which this intent is available
 * @property {number} createdAt - Timestamp when link was created
 * @property {number} updatedAt - Timestamp when link was last updated
 */

/**
 * Creates a new component-intent link.
 * 
 * @param {string} componentId - ID of the component
 * @param {string} intentId - ID of the intent
 * @param {Object} options - Link configuration
 * @param {string} options.triggerMechanism - How the intent is triggered
 * @param {boolean} [options.isPrimary=false] - Whether this is the primary action
 * @param {Object<string, any>} [options.defaultPayload] - Default payload data
 * @param {string[]} [options.conditions] - Availability conditions
 * @returns {ComponentIntentLink} The created link
 */
export function createComponentIntentLink(componentId, intentId, options) {
  const now = Date.now();
  
  return {
    id: `component-intent-${componentId}-${intentId}-${now}`,
    componentId,
    intentId,
    triggerMechanism: options.triggerMechanism,
    isPrimary: options.isPrimary || false,
    defaultPayload: options.defaultPayload || null,
    conditions: options.conditions || [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Updates an existing component-intent link.
 * 
 * @param {ComponentIntentLink} link - The link to update
 * @param {Partial<ComponentIntentLink>} updates - Fields to update
 * @returns {ComponentIntentLink} The updated link
 */
export function updateComponentIntentLink(link, updates) {
  return {
    ...link,
    ...updates,
    id: link.id, // Preserve ID
    componentId: link.componentId, // Preserve component ID
    intentId: link.intentId, // Preserve intent ID
    updatedAt: Date.now()
  };
}

/**
 * Validates a component-intent link structure.
 * 
 * @param {ComponentIntentLink} link - The link to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateComponentIntentLink(link) {
  const errors = [];
  
  if (!link.id || typeof link.id !== 'string') {
    errors.push('Link must have a valid id');
  }
  
  if (!link.componentId || typeof link.componentId !== 'string') {
    errors.push('Link must have a valid componentId');
  }
  
  if (!link.intentId || typeof link.intentId !== 'string') {
    errors.push('Link must have a valid intentId');
  }
  
  if (!link.triggerMechanism || typeof link.triggerMechanism !== 'string') {
    errors.push('Link must have a valid triggerMechanism');
  }
  
  if (typeof link.isPrimary !== 'boolean') {
    errors.push('isPrimary must be a boolean');
  }
  
  if (link.conditions && !Array.isArray(link.conditions)) {
    errors.push('conditions must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}