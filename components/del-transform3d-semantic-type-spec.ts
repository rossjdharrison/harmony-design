/**
 * @fileoverview Transform3D Semantic Type Specification
 * @module components/del-transform3d-semantic-type-spec
 * 
 * Defines semantic types for 3D transformations in the Harmony Design System.
 * This specification provides type-safe representations of CSS 3D transforms
 * including translate3d, rotate3d, scale3d, and matrix3d operations.
 * 
 * Performance Considerations:
 * - Transform operations should be GPU-accelerated via CSS transforms
 * - Matrix calculations must complete within 16ms render budget
 * - Use transform3d() over individual transforms for better performance
 * 
 * @see DESIGN_SYSTEM.md#transform-system
 */

/**
 * Represents a 3D translation vector
 * @interface Translate3D
 */
export interface Translate3D {
  /** Translation along X axis (px, em, rem, %, vw, etc.) */
  x: string | number;
  /** Translation along Y axis (px, em, rem, %, vh, etc.) */
  y: string | number;
  /** Translation along Z axis (px only) */
  z: string | number;
}

/**
 * Represents a 3D rotation with axis and angle
 * @interface Rotate3D
 */
export interface Rotate3D {
  /** X component of rotation axis vector */
  x: number;
  /** Y component of rotation axis vector */
  y: number;
  /** Z component of rotation axis vector */
  z: number;
  /** Rotation angle (deg, rad, grad, turn) */
  angle: string | number;
}

/**
 * Represents a 3D scale transformation
 * @interface Scale3D
 */
export interface Scale3D {
  /** Scale factor along X axis */
  x: number;
  /** Scale factor along Y axis */
  y: number;
  /** Scale factor along Z axis */
  z: number;
}

/**
 * Represents a 4x4 transformation matrix for 3D transforms
 * @interface Matrix3D
 */
export interface Matrix3D {
  /** 16 values representing a 4x4 matrix in column-major order */
  values: [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
  ];
}

/**
 * Represents perspective depth for 3D transforms
 * @interface Perspective
 */
export interface Perspective {
  /** Distance from viewer to z=0 plane (px) */
  distance: number;
}

/**
 * Represents the origin point for 3D transformations
 * @interface TransformOrigin3D
 */
export interface TransformOrigin3D {
  /** X coordinate of origin (px, %, left, center, right) */
  x: string | number;
  /** Y coordinate of origin (px, %, top, center, bottom) */
  y: string | number;
  /** Z coordinate of origin (px only) */
  z: string | number;
}

/**
 * Composite 3D transformation specification
 * @interface Transform3DSpec
 */
export interface Transform3DSpec {
  /** Translation component */
  translate?: Translate3D;
  /** Rotation component */
  rotate?: Rotate3D;
  /** Scale component */
  scale?: Scale3D;
  /** Raw matrix transformation */
  matrix?: Matrix3D;
  /** Perspective setting */
  perspective?: Perspective;
  /** Transform origin point */
  origin?: TransformOrigin3D;
}

/**
 * Animation-specific transform specification
 * @interface AnimatedTransform3D
 */
export interface AnimatedTransform3D extends Transform3DSpec {
  /** Animation duration in milliseconds */
  duration: number;
  /** Timing function (ease, linear, ease-in, ease-out, ease-in-out, cubic-bezier) */
  easing: string;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Number of times to repeat (Infinity for infinite) */
  iterations?: number;
  /** Animation direction (normal, reverse, alternate, alternate-reverse) */
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  /** Fill mode (none, forwards, backwards, both) */
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

/**
 * Converts a Transform3DSpec to a CSS transform string
 * @param {Transform3DSpec} spec - Transform specification
 * @returns {string} CSS transform value
 */
export function toTransformString(spec: Transform3DSpec): string {
  const parts: string[] = [];

  if (spec.perspective) {
    parts.push(`perspective(${spec.perspective.distance}px)`);
  }

  if (spec.translate) {
    const { x, y, z } = spec.translate;
    const xVal = typeof x === 'number' ? `${x}px` : x;
    const yVal = typeof y === 'number' ? `${y}px` : y;
    const zVal = typeof z === 'number' ? `${z}px` : z;
    parts.push(`translate3d(${xVal}, ${yVal}, ${zVal})`);
  }

  if (spec.rotate) {
    const { x, y, z, angle } = spec.rotate;
    const angleVal = typeof angle === 'number' ? `${angle}deg` : angle;
    parts.push(`rotate3d(${x}, ${y}, ${z}, ${angleVal})`);
  }

  if (spec.scale) {
    const { x, y, z } = spec.scale;
    parts.push(`scale3d(${x}, ${y}, ${z})`);
  }

  if (spec.matrix) {
    parts.push(`matrix3d(${spec.matrix.values.join(', ')})`);
  }

  return parts.join(' ');
}

/**
 * Converts a Transform3DSpec to a CSS transform-origin string
 * @param {TransformOrigin3D} origin - Transform origin specification
 * @returns {string} CSS transform-origin value
 */
export function toOriginString(origin: TransformOrigin3D): string {
  const xVal = typeof origin.x === 'number' ? `${origin.x}px` : origin.x;
  const yVal = typeof origin.y === 'number' ? `${origin.y}px` : origin.y;
  const zVal = typeof origin.z === 'number' ? `${origin.z}px` : origin.z;
  return `${xVal} ${yVal} ${zVal}`;
}

/**
 * Creates an identity matrix (no transformation)
 * @returns {Matrix3D} Identity matrix
 */
export function identityMatrix(): Matrix3D {
  return {
    values: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
  };
}

/**
 * Validates a Transform3DSpec for correctness
 * @param {Transform3DSpec} spec - Transform specification to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateTransform3D(spec: Transform3DSpec): boolean {
  if (spec.scale) {
    if (spec.scale.x === 0 || spec.scale.y === 0 || spec.scale.z === 0) {
      throw new Error('Scale values cannot be zero');
    }
  }

  if (spec.perspective && spec.perspective.distance <= 0) {
    throw new Error('Perspective distance must be positive');
  }

  if (spec.matrix && spec.matrix.values.length !== 16) {
    throw new Error('Matrix3D must have exactly 16 values');
  }

  return true;
}

/**
 * Type guard to check if a value is a valid Transform3DSpec
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is Transform3DSpec
 */
export function isTransform3DSpec(value: unknown): value is Transform3DSpec {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const spec = value as Partial<Transform3DSpec>;
  
  // At least one transform property must be present
  return !!(
    spec.translate ||
    spec.rotate ||
    spec.scale ||
    spec.matrix ||
    spec.perspective
  );
}

/**
 * Default export containing all type definitions and utilities
 */
export default {
  toTransformString,
  toOriginString,
  identityMatrix,
  validateTransform3D,
  isTransform3DSpec
};