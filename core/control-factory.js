/**
 * Control Factory
 * 
 * Maps semantic_type to component implementations.
 * Provides centralized factory for creating UI controls based on semantic types.
 * 
 * @see {@link file://./../DESIGN_SYSTEM.md#control-factory}
 * @module core/control-factory
 */

import { createScene3D, isScene3D } from './semantic-types/scene3d-factory.js';

/**
 * Semantic type to component mapping
 * 
 * Maps semantic_type string to:
 * - component: Web component tag name
 * - factory: Factory function for creating instances
 * - validator: Type guard function
 */
const SEMANTIC_TYPE_MAP = {
  'Scene3D': {
    component: 'harmony-scene3d',
    factory: createScene3D,
    validator: isScene3D,
    description: 'Container for 3D objects with spatial positioning'
  }
  // Additional semantic types will be added here as they are implemented
};

/**
 * Gets component tag name for a semantic type
 * 
 * @param {string} semanticType - Semantic type identifier
 * @returns {string|null} Component tag name or null if not found
 * 
 * @example
 * const tag = getComponentForSemanticType('Scene3D');
 * // Returns: 'harmony-scene3d'
 */
export function getComponentForSemanticType(semanticType) {
  const mapping = SEMANTIC_TYPE_MAP[semanticType];
  return mapping ? mapping.component : null;
}

/**
 * Gets factory function for a semantic type
 * 
 * @param {string} semanticType - Semantic type identifier
 * @returns {Function|null} Factory function or null if not found
 * 
 * @example
 * const factory = getFactoryForSemanticType('Scene3D');
 * const scene = factory({ scene_properties: { background_color: '#1A1A1A' } });
 */
export function getFactoryForSemanticType(semanticType) {
  const mapping = SEMANTIC_TYPE_MAP[semanticType];
  return mapping ? mapping.factory : null;
}

/**
 * Gets validator function for a semantic type
 * 
 * @param {string} semanticType - Semantic type identifier
 * @returns {Function|null} Validator function or null if not found
 * 
 * @example
 * const validator = getValidatorForSemanticType('Scene3D');
 * const isValid = validator(nodeData);
 */
export function getValidatorForSemanticType(semanticType) {
  const mapping = SEMANTIC_TYPE_MAP[semanticType];
  return mapping ? mapping.validator : null;
}

/**
 * Creates a control instance for a semantic type
 * 
 * @param {string} semanticType - Semantic type identifier
 * @param {Object} [overrides={}] - Properties to override defaults
 * @returns {Object|null} Control instance or null if semantic type not found
 * 
 * @example
 * const scene = createControl('Scene3D', {
 *   spatial: { position: { x: 10, y: 0, z: 0 } }
 * });
 */
export function createControl(semanticType, overrides = {}) {
  const factory = getFactoryForSemanticType(semanticType);
  return factory ? factory(overrides) : null;
}

/**
 * Validates a control instance
 * 
 * @param {Object} control - Control instance to validate
 * @returns {boolean} True if valid
 * 
 * @example
 * const scene = createControl('Scene3D');
 * const isValid = validateControl(scene);
 */
export function validateControl(control) {
  if (!control || typeof control !== 'object' || !control.semantic_type) {
    return false;
  }

  const validator = getValidatorForSemanticType(control.semantic_type);
  return validator ? validator(control) : false;
}

/**
 * Gets all registered semantic types
 * 
 * @returns {string[]} Array of semantic type identifiers
 */
export function getRegisteredSemanticTypes() {
  return Object.keys(SEMANTIC_TYPE_MAP);
}

/**
 * Gets metadata for a semantic type
 * 
 * @param {string} semanticType - Semantic type identifier
 * @returns {Object|null} Metadata object or null if not found
 * 
 * @example
 * const metadata = getSemanticTypeMetadata('Scene3D');
 * // Returns: { component: 'harmony-scene3d', description: '...' }
 */
export function getSemanticTypeMetadata(semanticType) {
  const mapping = SEMANTIC_TYPE_MAP[semanticType];
  if (!mapping) {
    return null;
  }

  return {
    component: mapping.component,
    description: mapping.description,
    hasFactory: !!mapping.factory,
    hasValidator: !!mapping.validator
  };
}