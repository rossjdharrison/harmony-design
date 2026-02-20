/**
 * Scene3D Factory
 * 
 * Creates Scene3D semantic type instances with default values.
 * Used by control-factory.js to instantiate Scene3D nodes.
 * 
 * @see {@link file://./../../DESIGN_SYSTEM.md#scene3d-semantic-type}
 * @see {@link file://./../../harmony-schemas/schemas/semantic-types/scene3d.json}
 * @module core/semantic-types/scene3d-factory
 */

/**
 * Default Scene3D configuration
 */
const DEFAULT_SCENE3D = {
  semantic_type: 'Scene3D',
  spatial: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  },
  scene_properties: {
    background_color: '#000000',
    ambient_light: {
      color: '#FFFFFF',
      intensity: 0.5
    },
    camera: {
      fov: 75,
      near: 0.1,
      far: 1000
    },
    fog: {
      enabled: false,
      color: '#CCCCCC',
      near: 1,
      far: 100
    }
  },
  children: []
};

/**
 * Creates a Scene3D instance with optional overrides
 * 
 * @param {Partial<Scene3D>} [overrides={}] - Properties to override defaults
 * @returns {Scene3D} Scene3D instance
 * 
 * @example
 * const scene = createScene3D({
 *   scene_properties: {
 *     background_color: '#1A1A1A',
 *     camera: { fov: 60 }
 *   }
 * });
 */
export function createScene3D(overrides = {}) {
  return {
    ...DEFAULT_SCENE3D,
    spatial: {
      ...DEFAULT_SCENE3D.spatial,
      ...(overrides.spatial || {})
    },
    scene_properties: {
      ...DEFAULT_SCENE3D.scene_properties,
      ...(overrides.scene_properties || {}),
      ambient_light: {
        ...DEFAULT_SCENE3D.scene_properties.ambient_light,
        ...(overrides.scene_properties?.ambient_light || {})
      },
      camera: {
        ...DEFAULT_SCENE3D.scene_properties.camera,
        ...(overrides.scene_properties?.camera || {})
      },
      fog: {
        ...DEFAULT_SCENE3D.scene_properties.fog,
        ...(overrides.scene_properties?.fog || {})
      }
    },
    children: overrides.children || []
  };
}

/**
 * Validates a Scene3D instance against the schema
 * 
 * @param {unknown} node - Node to validate
 * @returns {boolean} True if valid Scene3D
 */
export function isScene3D(node) {
  if (typeof node !== 'object' || node === null) {
    return false;
  }

  if (node.semantic_type !== 'Scene3D') {
    return false;
  }

  if (!node.spatial || typeof node.spatial !== 'object') {
    return false;
  }

  const { position, rotation, scale } = node.spatial;
  
  if (!position || !rotation || !scale) {
    return false;
  }

  const hasValidVector = (v) => 
    v && typeof v.x === 'number' && typeof v.y === 'number' && typeof v.z === 'number';

  return hasValidVector(position) && hasValidVector(rotation) && hasValidVector(scale);
}

/**
 * Updates spatial properties of a Scene3D instance
 * 
 * @param {Scene3D} scene - Scene3D instance
 * @param {Partial<Spatial3D>} spatialUpdate - Spatial properties to update
 * @returns {Scene3D} Updated Scene3D instance
 */
export function updateScene3DSpatial(scene, spatialUpdate) {
  return {
    ...scene,
    spatial: {
      position: { ...scene.spatial.position, ...(spatialUpdate.position || {}) },
      rotation: { ...scene.spatial.rotation, ...(spatialUpdate.rotation || {}) },
      scale: { ...scene.spatial.scale, ...(spatialUpdate.scale || {}) }
    }
  };
}

/**
 * Adds a child to a Scene3D instance
 * 
 * @param {Scene3D} scene - Scene3D instance
 * @param {string} childId - Node ID to add
 * @returns {Scene3D} Updated Scene3D instance
 */
export function addScene3DChild(scene, childId) {
  if (scene.children.includes(childId)) {
    return scene;
  }

  return {
    ...scene,
    children: [...scene.children, childId]
  };
}

/**
 * Removes a child from a Scene3D instance
 * 
 * @param {Scene3D} scene - Scene3D instance
 * @param {string} childId - Node ID to remove
 * @returns {Scene3D} Updated Scene3D instance
 */
export function removeScene3DChild(scene, childId) {
  return {
    ...scene,
    children: scene.children.filter(id => id !== childId)
  };
}