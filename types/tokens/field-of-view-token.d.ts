/**
 * Field-of-View Token Type Definitions
 * 
 * Defines TypeScript types for camera field-of-view tokens used in 3D rendering.
 * See harmony-schemas/schemas/field-of-view-token.schema.json for JSON Schema.
 * 
 * @module types/tokens/field-of-view-token
 */

/**
 * FOV orientation - which dimension the measurement applies to
 */
export type FieldOfViewOrientation = 'vertical' | 'horizontal' | 'diagonal';

/**
 * Detailed field-of-view specification with orientation and aspect ratio
 */
export interface FieldOfViewValue {
  /** Field of view in degrees (0-180 exclusive) */
  degrees: number;
  
  /** Which dimension the FOV measurement applies to */
  orientation?: FieldOfViewOrientation;
  
  /** Aspect ratio (width/height) for calculating complementary FOV */
  aspectRatio?: number;
}

/**
 * Field-of-View Token
 * 
 * Represents camera perspective field-of-view values for 3D rendering contexts.
 * Can be a simple degree value, detailed specification, or reference to another token.
 * 
 * @example Simple FOV
 * ```json
 * {
 *   "$type": "fieldOfView",
 *   "value": 60,
 *   "description": "Standard perspective camera"
 * }
 * ```
 * 
 * @example Detailed FOV
 * ```json
 * {
 *   "$type": "fieldOfView",
 *   "value": {
 *     "degrees": 75,
 *     "orientation": "vertical",
 *     "aspectRatio": 1.777777
 *   },
 *   "description": "Wide-angle 16:9"
 * }
 * ```
 */
export interface FieldOfViewToken {
  /** Token type identifier */
  $type: 'fieldOfView';
  
  /** FOV value in degrees, detailed spec, or token reference */
  value: number | FieldOfViewValue | string;
  
  /** Human-readable description */
  description?: string;
  
  /** Vendor-specific extensions */
  extensions?: Record<string, unknown>;
}

/**
 * Type guard to check if a value is a FieldOfViewToken
 */
export function isFieldOfViewToken(token: unknown): token is FieldOfViewToken {
  return (
    typeof token === 'object' &&
    token !== null &&
    '$type' in token &&
    (token as FieldOfViewToken).$type === 'fieldOfView'
  );
}

/**
 * Type guard to check if a value is a detailed FieldOfViewValue
 */
export function isFieldOfViewValue(value: unknown): value is FieldOfViewValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'degrees' in value &&
    typeof (value as FieldOfViewValue).degrees === 'number'
  );
}