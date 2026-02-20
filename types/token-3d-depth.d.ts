/**
 * @fileoverview TypeScript type definitions for 3D Depth Token Schema
 * @see harmony-schemas/token-3d-depth.schema.json
 */

/**
 * WebGL depth comparison function
 */
export type DepthFunc = 'LESS' | 'LEQUAL' | 'GREATER' | 'GEQUAL' | 'EQUAL' | 'NOTEQUAL' | 'ALWAYS' | 'NEVER';

/**
 * CSS unit types for spatial values
 */
export type CSSUnit = 'px' | 'em' | 'rem' | 'vh' | 'vw';

/**
 * Semantic depth layer classification
 */
export type DepthSemantic = 'foreground' | 'ui' | 'content' | 'background' | 'backdrop' | 'far';

/**
 * Semantic z-index stacking layer
 */
export type ZIndexSemantic = 'base' | 'dropdown' | 'sticky' | 'fixed' | 'modal-backdrop' | 'modal' | 'popover' | 'tooltip' | 'notification';

/**
 * Semantic perspective intensity
 */
export type PerspectiveSemantic = 'subtle' | 'moderate' | 'dramatic' | 'extreme';

/**
 * Semantic translation direction and intensity
 */
export type TranslateZSemantic = 'lift-subtle' | 'lift-moderate' | 'lift-high' | 'push-subtle' | 'push-moderate' | 'push-deep';

/**
 * GPU-specific depth buffer mapping configuration
 */
export interface GPUMapping {
  /** WebGL depth comparison function */
  depthFunc?: DepthFunc;
  /** Whether to write to depth buffer */
  depthWrite?: boolean;
}

/**
 * CSS transform mapping for DOM elements
 */
export interface CSSMapping {
  /** CSS translateZ value */
  translateZ?: string;
  /** Fallback z-index for non-3D contexts */
  zIndex?: number;
}

/**
 * 3D depth token with normalized depth value and optional GPU shader mapping
 */
export interface DepthToken {
  /** Normalized depth value (0=near, 1=far) for GPU depth buffer */
  value: number;
  /** Token type identifier */
  type: 'depth';
  /** Semantic layer classification */
  semantic?: DepthSemantic;
  /** Human-readable description of usage */
  description?: string;
  /** Optional GPU-specific depth buffer mapping */
  gpuMapping?: GPUMapping;
  /** CSS transform mapping for DOM elements */
  cssMapping?: CSSMapping;
}

/**
 * Traditional z-index token for 2D stacking context
 */
export interface ZIndexToken {
  /** CSS z-index value */
  value: number;
  /** Token type identifier */
  type: 'zIndex';
  /** Semantic stacking layer */
  semantic?: ZIndexSemantic;
  /** Human-readable description of usage */
  description?: string;
  /** Equivalent normalized depth value for 3D contexts */
  depthEquivalent?: number;
}

/**
 * Perspective distance token for 3D transform context
 */
export interface PerspectiveToken {
  /** Perspective distance value */
  value: number;
  /** Token type identifier */
  type: 'perspective';
  /** CSS unit for perspective value */
  unit: CSSUnit;
  /** Semantic perspective intensity */
  semantic?: PerspectiveSemantic;
  /** Human-readable description of usage */
  description?: string;
  /** Equivalent field of view in degrees for GPU cameras */
  fov?: number;
}

/**
 * Z-axis translation token for 3D positioning
 */
export interface TranslateZToken {
  /** Translation distance along Z-axis */
  value: number;
  /** Token type identifier */
  type: 'translateZ';
  /** CSS unit for translation value */
  unit: CSSUnit;
  /** Semantic translation direction and intensity */
  semantic?: TranslateZSemantic;
  /** Human-readable description of usage */
  description?: string;
  /** Normalized depth buffer value for GPU rendering */
  depthValue?: number;
}

/**
 * Collection of token categories
 */
export interface TokenCollection {
  /** 3D depth values for spatial positioning in GPU-accelerated scenes */
  depth?: Record<string, DepthToken>;
  /** Traditional 2D z-index values for DOM stacking context */
  zIndex?: Record<string, ZIndexToken>;
  /** Perspective distance values for 3D transforms */
  perspective?: Record<string, PerspectiveToken>;
  /** Z-axis translation values for 3D positioning */
  translateZ?: Record<string, TranslateZToken>;
}

/**
 * Metadata about the token set
 */
export interface TokenMetadata {
  /** Human-readable name of the token set */
  name?: string;
  /** Description of the token set purpose */
  description?: string;
  /** Author or organization */
  author?: string;
  /** Creation timestamp */
  created?: string;
  /** Last modification timestamp */
  modified?: string;
}

/**
 * Root schema for 3D depth tokens
 */
export interface Token3DDepthSchema {
  /** Semantic version of the token schema */
  version: string;
  /** Collection of 3D depth tokens organized by semantic purpose */
  tokens: TokenCollection;
  /** Metadata about the token set */
  metadata?: TokenMetadata;
}