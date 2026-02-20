/**
 * Scene3D Semantic Type Definition
 * 
 * Container for 3D objects with spatial positioning.
 * Extends the Spatial3D pattern with scene-specific properties.
 * 
 * @see {@link file://./harmony-schemas/schemas/semantic-types/scene3d.json}
 * @see {@link file://./../DESIGN_SYSTEM.md#scene3d-semantic-type}
 */

/**
 * 3D vector for position, rotation, or scale
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Spatial3D properties for 3D positioning
 */
export interface Spatial3D {
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
}

/**
 * Ambient light configuration
 */
export interface AmbientLight {
  color: string;
  intensity: number;
}

/**
 * Camera configuration
 */
export interface Camera {
  fov: number;
  near: number;
  far: number;
}

/**
 * Fog configuration
 */
export interface Fog {
  enabled: boolean;
  color: string;
  near: number;
  far: number;
}

/**
 * Scene-specific properties
 */
export interface SceneProperties {
  background_color?: string;
  ambient_light?: AmbientLight;
  camera?: Camera;
  fog?: Fog;
}

/**
 * Scene3D semantic type
 * 
 * Represents a 3D scene container that can hold multiple 3D objects.
 * Provides spatial positioning, lighting, camera, and fog configuration.
 */
export interface Scene3D {
  semantic_type: 'Scene3D';
  spatial: Spatial3D;
  scene_properties?: SceneProperties;
  children?: string[];
}

/**
 * Type guard to check if a node is a Scene3D
 */
export function isScene3D(node: unknown): node is Scene3D {
  return (
    typeof node === 'object' &&
    node !== null &&
    'semantic_type' in node &&
    (node as any).semantic_type === 'Scene3D'
  );
}