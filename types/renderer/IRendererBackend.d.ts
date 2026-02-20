/**
 * @fileoverview IRendererBackend Interface Specification
 * @module types/renderer/IRendererBackend
 * 
 * Defines the contract for pluggable render backends supporting 2D, 3D, and XR rendering.
 * All implementations must satisfy the 16ms render budget for 60fps performance.
 * 
 * Related documentation: DESIGN_SYSTEM.md § Renderer Architecture
 * 
 * @see {@link https://github.com/harmony-design DESIGN_SYSTEM.md}
 */

/**
 * Render backend type discriminator
 */
export type RendererBackendType = '2d' | '3d' | 'xr';

/**
 * Viewport configuration for render target
 */
export interface ViewportConfig {
  /** Viewport width in pixels */
  width: number;
  /** Viewport height in pixels */
  height: number;
  /** Device pixel ratio for high-DPI displays */
  devicePixelRatio: number;
  /** Optional field of view for 3D/XR backends (degrees) */
  fieldOfView?: number;
}

/**
 * Camera configuration for 3D and XR rendering
 */
export interface CameraConfig {
  /** Camera position in world space [x, y, z] */
  position: [number, number, number];
  /** Camera rotation as quaternion [x, y, z, w] */
  rotation: [number, number, number, number];
  /** Field of view in degrees */
  fieldOfView: number;
  /** Near clipping plane distance */
  near: number;
  /** Far clipping plane distance */
  far: number;
  /** Optional aspect ratio override (defaults to viewport aspect) */
  aspectRatio?: number;
}

/**
 * Transform data for renderable objects
 */
export interface Transform3D {
  /** Position in world space [x, y, z] */
  position: [number, number, number];
  /** Rotation as quaternion [x, y, z, w] */
  rotation: [number, number, number, number];
  /** Scale factors [x, y, z] */
  scale: [number, number, number];
}

/**
 * Material properties for rendering
 */
export interface MaterialConfig {
  /** Base color as RGBA [0-1, 0-1, 0-1, 0-1] */
  color: [number, number, number, number];
  /** Metallic factor (0 = dielectric, 1 = metallic) */
  metallic?: number;
  /** Roughness factor (0 = smooth, 1 = rough) */
  roughness?: number;
  /** Emissive color as RGB [0-1, 0-1, 0-1] */
  emissive?: [number, number, number];
  /** Optional texture references */
  textures?: {
    baseColor?: string;
    normal?: string;
    metallic?: string;
    roughness?: string;
    emissive?: string;
  };
}

/**
 * Renderable scene object
 */
export interface SceneObject {
  /** Unique identifier for this object */
  id: string;
  /** Object transform in world space */
  transform: Transform3D;
  /** Geometry reference (backend-specific) */
  geometry: unknown;
  /** Material configuration */
  material: MaterialConfig;
  /** Visibility flag */
  visible: boolean;
  /** Layer mask for selective rendering */
  layers: number;
}

/**
 * Light source configuration
 */
export interface LightConfig {
  /** Light type */
  type: 'directional' | 'point' | 'spot' | 'ambient';
  /** Light color as RGB [0-1, 0-1, 0-1] */
  color: [number, number, number];
  /** Light intensity */
  intensity: number;
  /** Position for point/spot lights [x, y, z] */
  position?: [number, number, number];
  /** Direction for directional/spot lights [x, y, z] */
  direction?: [number, number, number];
  /** Range for point/spot lights */
  range?: number;
  /** Inner cone angle for spot lights (degrees) */
  innerConeAngle?: number;
  /** Outer cone angle for spot lights (degrees) */
  outerConeAngle?: number;
}

/**
 * Performance metrics from last render
 */
export interface RenderMetrics {
  /** Frame render time in milliseconds (must be ≤16ms for 60fps) */
  frameTime: number;
  /** Number of draw calls issued */
  drawCalls: number;
  /** Number of triangles rendered */
  triangles: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** GPU time in milliseconds (if available) */
  gpuTime?: number;
}

/**
 * Render pass configuration
 */
export interface RenderPassConfig {
  /** Clear color as RGBA [0-1, 0-1, 0-1, 0-1] */
  clearColor?: [number, number, number, number];
  /** Clear depth value (0-1) */
  clearDepth?: number;
  /** Clear stencil value */
  clearStencil?: number;
  /** Enable depth testing */
  depthTest?: boolean;
  /** Enable depth writing */
  depthWrite?: boolean;
  /** Enable stencil testing */
  stencilTest?: boolean;
  /** Blend mode */
  blendMode?: 'none' | 'alpha' | 'additive' | 'multiply';
}

/**
 * XR session configuration
 */
export interface XRSessionConfig {
  /** XR session mode */
  mode: 'inline' | 'immersive-vr' | 'immersive-ar';
  /** Required features */
  requiredFeatures?: string[];
  /** Optional features */
  optionalFeatures?: string[];
  /** Reference space type */
  referenceSpaceType: 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
}

/**
 * Main renderer backend interface
 * 
 * All implementations must:
 * - Maintain 60fps (≤16ms per frame)
 * - Stay within 50MB memory budget
 * - Support GPU-first rendering
 * - Emit performance metrics
 */
export interface IRendererBackend {
  /**
   * Backend type identifier
   */
  readonly type: RendererBackendType;

  /**
   * Backend name for debugging
   */
  readonly name: string;

  /**
   * Initialize the renderer backend
   * @param canvas - Target canvas element
   * @param config - Initial viewport configuration
   * @returns Promise that resolves when initialization is complete
   * @throws Error if initialization fails or capabilities are insufficient
   */
  initialize(canvas: HTMLCanvasElement, config: ViewportConfig): Promise<void>;

  /**
   * Resize the viewport
   * @param config - New viewport configuration
   */
  resize(config: ViewportConfig): void;

  /**
   * Set camera configuration (3D/XR only)
   * @param camera - Camera configuration
   */
  setCamera(camera: CameraConfig): void;

  /**
   * Add a scene object to be rendered
   * @param object - Scene object to add
   * @returns Handle for later updates/removal
   */
  addObject(object: SceneObject): string;

  /**
   * Update an existing scene object
   * @param id - Object identifier
   * @param updates - Partial object updates
   */
  updateObject(id: string, updates: Partial<SceneObject>): void;

  /**
   * Remove a scene object
   * @param id - Object identifier
   */
  removeObject(id: string): void;

  /**
   * Add a light source (3D/XR only)
   * @param light - Light configuration
   * @returns Light identifier
   */
  addLight(light: LightConfig): string;

  /**
   * Update an existing light
   * @param id - Light identifier
   * @param updates - Partial light updates
   */
  updateLight(id: string, updates: Partial<LightConfig>): void;

  /**
   * Remove a light source
   * @param id - Light identifier
   */
  removeLight(id: string): void;

  /**
   * Configure render pass settings
   * @param config - Render pass configuration
   */
  configureRenderPass(config: RenderPassConfig): void;

  /**
   * Start XR session (XR backend only)
   * @param config - XR session configuration
   * @returns Promise that resolves when session is active
   * @throws Error if XR is not supported or session fails
   */
  startXRSession?(config: XRSessionConfig): Promise<void>;

  /**
   * End XR session (XR backend only)
   */
  endXRSession?(): void;

  /**
   * Render a single frame
   * @param deltaTime - Time since last frame in seconds
   * @returns Render metrics for this frame
   * @throws Error if render fails or exceeds 16ms budget
   */
  render(deltaTime: number): RenderMetrics;

  /**
   * Clear all scene objects and lights
   */
  clear(): void;

  /**
   * Dispose of all resources and shut down
   */
  dispose(): void;

  /**
   * Get current performance metrics
   * @returns Latest render metrics
   */
  getMetrics(): RenderMetrics;

  /**
   * Check if backend supports a specific feature
   * @param feature - Feature name to check
   * @returns true if feature is supported
   */
  supportsFeature(feature: string): boolean;
}

/**
 * Factory function signature for creating renderer backends
 */
export type RendererBackendFactory = (type: RendererBackendType) => IRendererBackend;

/**
 * Renderer backend capabilities query
 */
export interface RendererCapabilities {
  /** WebGL/WebGPU version */
  apiVersion: string;
  /** Maximum texture size */
  maxTextureSize: number;
  /** Maximum render target size */
  maxRenderTargetSize: number;
  /** Maximum vertex attributes */
  maxVertexAttributes: number;
  /** Maximum uniform buffers */
  maxUniformBuffers: number;
  /** Supports compute shaders */
  supportsCompute: boolean;
  /** Supports ray tracing */
  supportsRayTracing: boolean;
  /** Supports XR */
  supportsXR: boolean;
  /** Available extensions */
  extensions: string[];
}

/**
 * Extended interface with capability queries
 */
export interface IRendererBackendExtended extends IRendererBackend {
  /**
   * Query backend capabilities
   * @returns Capability information
   */
  getCapabilities(): RendererCapabilities;
}