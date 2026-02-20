/**
 * @fileoverview Control Factory Semantic Type Mapper
 * Maps semantic parameter types to appropriate UI control component tag names.
 * 
 * Part of the Harmony Design System - Reactive Component System
 * See: DESIGN_SYSTEM.md#control-factory-module
 * 
 * @module harmony-web-components/control-factory-semantic-map
 */

/**
 * Semantic type to component tag name mapping.
 * This is the single source of truth for control instantiation.
 * 
 * Semantic types represent the MEANING of a parameter (gain, frequency, etc.)
 * Component tags represent the UI CONTROL to render (knob, slider, etc.)
 * 
 * @type {Map<string, string>}
 * @const
 */
export const SEMANTIC_TYPE_MAP = new Map([
  // Audio Parameters - Continuous Controls
  ['gain', 'harmony-knob'],
  ['volume', 'harmony-knob'],
  ['pan', 'harmony-knob'],
  ['balance', 'harmony-knob'],
  ['mix', 'harmony-knob'],
  ['blend', 'harmony-knob'],
  
  // Frequency Parameters
  ['frequency', 'harmony-slider'],
  ['cutoff', 'harmony-knob'],
  ['resonance', 'harmony-knob'],
  ['q', 'harmony-knob'],
  
  // Time Parameters
  ['delay', 'harmony-slider'],
  ['attack', 'harmony-slider'],
  ['decay', 'harmony-slider'],
  ['sustain', 'harmony-slider'],
  ['release', 'harmony-slider'],
  ['duration', 'harmony-slider'],
  ['time', 'harmony-slider'],
  
  // Modulation Parameters
  ['rate', 'harmony-knob'],
  ['depth', 'harmony-knob'],
  ['amount', 'harmony-knob'],
  ['intensity', 'harmony-knob'],
  
  // Discrete Controls
  ['toggle', 'harmony-toggle'],
  ['switch', 'harmony-toggle'],
  ['enable', 'harmony-toggle'],
  ['bypass', 'harmony-toggle'],
  ['mute', 'harmony-toggle'],
  ['solo', 'harmony-toggle'],
  
  // Selection Controls
  ['select', 'harmony-select'],
  ['choice', 'harmony-select'],
  ['mode', 'harmony-select'],
  ['type', 'harmony-select'],
  ['waveform', 'harmony-select'],
  
  // Numeric Input
  ['number', 'harmony-number-input'],
  ['value', 'harmony-number-input'],
  ['count', 'harmony-number-input'],
  
  // Text Input
  ['text', 'harmony-text-input'],
  ['label', 'harmony-text-input'],
  ['name', 'harmony-text-input'],
  
  // XY Pad for 2D Parameters
  ['xy', 'harmony-xy-pad'],
  ['position', 'harmony-xy-pad'],
  ['coordinates', 'harmony-xy-pad'],
  
  // Default fallback
  ['default', 'harmony-slider'],
]);

/**
 * Gets the component tag name for a given semantic type.
 * 
 * @param {string} semanticType - The semantic type identifier
 * @returns {string} The component tag name (e.g., 'harmony-knob')
 * 
 * @example
 * const tagName = getComponentForSemanticType('gain');
 * // Returns: 'harmony-knob'
 */
export function getComponentForSemanticType(semanticType) {
  if (!semanticType || typeof semanticType !== 'string') {
    console.warn('[ControlFactory] Invalid semantic type:', semanticType);
    return SEMANTIC_TYPE_MAP.get('default');
  }
  
  const normalized = semanticType.toLowerCase().trim();
  const tagName = SEMANTIC_TYPE_MAP.get(normalized);
  
  if (!tagName) {
    console.warn(`[ControlFactory] Unknown semantic type: ${semanticType}, using default`);
    return SEMANTIC_TYPE_MAP.get('default');
  }
  
  return tagName;
}

/**
 * Checks if a semantic type is registered in the mapping.
 * 
 * @param {string} semanticType - The semantic type to check
 * @returns {boolean} True if the type is registered
 */
export function hasSemanticType(semanticType) {
  if (!semanticType || typeof semanticType !== 'string') {
    return false;
  }
  return SEMANTIC_TYPE_MAP.has(semanticType.toLowerCase().trim());
}

/**
 * Gets all registered semantic types.
 * Useful for validation and debugging.
 * 
 * @returns {string[]} Array of all registered semantic type identifiers
 */
export function getAllSemanticTypes() {
  return Array.from(SEMANTIC_TYPE_MAP.keys());
}

/**
 * Gets all unique component tag names used in the mapping.
 * Useful for dependency analysis and component registration verification.
 * 
 * @returns {string[]} Array of unique component tag names
 */
export function getAllComponentTags() {
  return Array.from(new Set(SEMANTIC_TYPE_MAP.values()));
}

/**
 * Registers a custom semantic type mapping.
 * Allows runtime extension of the semantic type system.
 * 
 * @param {string} semanticType - The semantic type identifier
 * @param {string} componentTag - The component tag name
 * @throws {Error} If parameters are invalid
 * 
 * @example
 * registerSemanticType('custom-param', 'harmony-custom-control');
 */
export function registerSemanticType(semanticType, componentTag) {
  if (!semanticType || typeof semanticType !== 'string') {
    throw new Error('[ControlFactory] Invalid semantic type for registration');
  }
  
  if (!componentTag || typeof componentTag !== 'string') {
    throw new Error('[ControlFactory] Invalid component tag for registration');
  }
  
  if (!componentTag.includes('-')) {
    throw new Error('[ControlFactory] Component tag must be a valid custom element name (contain hyphen)');
  }
  
  const normalized = semanticType.toLowerCase().trim();
  
  if (SEMANTIC_TYPE_MAP.has(normalized)) {
    console.warn(`[ControlFactory] Overwriting existing semantic type: ${normalized}`);
  }
  
  SEMANTIC_TYPE_MAP.set(normalized, componentTag);
}

/**
 * Creates a control element for a given semantic type.
 * This is a convenience factory method that combines lookup and instantiation.
 * 
 * @param {string} semanticType - The semantic type identifier
 * @param {Object} [attributes={}] - Optional attributes to set on the element
 * @returns {HTMLElement} The created control element
 * 
 * @example
 * const gainKnob = createControlForSemanticType('gain', {
 *   min: '0',
 *   max: '1',
 *   value: '0.8',
 *   label: 'Gain'
 * });
 */
export function createControlForSemanticType(semanticType, attributes = {}) {
  const tagName = getComponentForSemanticType(semanticType);
  const element = document.createElement(tagName);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      element.setAttribute(key, String(value));
    }
  });
  
  return element;
}

/**
 * Validates that all component tags in the mapping are registered as custom elements.
 * Useful for startup validation and debugging.
 * 
 * @returns {Object} Validation result with missing components
 * @property {boolean} valid - True if all components are registered
 * @property {string[]} missing - Array of unregistered component tag names
 * 
 * @example
 * const validation = validateComponentRegistration();
 * if (!validation.valid) {
 *   console.error('Missing components:', validation.missing);
 * }
 */
export function validateComponentRegistration() {
  const allTags = getAllComponentTags();
  const missing = allTags.filter(tag => !customElements.get(tag));
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Gets statistics about the semantic type mapping.
 * Useful for debugging and documentation.
 * 
 * @returns {Object} Statistics object
 * @property {number} totalTypes - Total number of semantic types
 * @property {number} uniqueComponents - Number of unique component types
 * @property {Object} componentUsage - Map of component tag to usage count
 */
export function getMapStatistics() {
  const componentUsage = {};
  
  SEMANTIC_TYPE_MAP.forEach((componentTag) => {
    componentUsage[componentTag] = (componentUsage[componentTag] || 0) + 1;
  });
  
  return {
    totalTypes: SEMANTIC_TYPE_MAP.size,
    uniqueComponents: getAllComponentTags().length,
    componentUsage
  };
}