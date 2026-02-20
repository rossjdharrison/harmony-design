/**
 * @fileoverview Base implementation for renderer backends
 * @module core/renderer/RendererBackendBase
 * 
 * Provides common functionality for all renderer backend implementations.
 * Concrete backends (WebGL2Backend, WebGPUBackend, XRBackend) extend this class.
 * 
 * Related documentation: DESIGN_SYSTEM.md § Renderer Architecture
 * Related types: types/renderer/IRendererBackend.d.ts
 */

/**
 * @typedef {import('../../types/renderer/IRendererBackend.js').IRendererBackend} IRendererBackend
 * @typedef {import('../../types/renderer/IRendererBackend.js').RendererBackendType} RendererBackendType
 * @typedef {import('../../types/renderer/IRendererBackend.js').ViewportConfig} ViewportConfig
 * @typedef {import('../../types/renderer/IRendererBackend.js').CameraConfig} CameraConfig
 * @typedef {import('../../types/renderer/IRendererBackend.js').SceneObject} SceneObject
 * @typedef {import('../../types/renderer/IRendererBackend.js').LightConfig} LightConfig
 * @typedef {import('../../types/renderer/IRendererBackend.js').RenderMetrics} RenderMetrics
 * @typedef {import('../../types/renderer/IRendererBackend.js').RenderPassConfig} RenderPassConfig
 */

/**
 * Base class for renderer backend implementations
 * @implements {IRendererBackend}
 */
export class RendererBackendBase {
  /**
   * @param {RendererBackendType} type - Backend type
   * @param {string} name - Backend name
   */
  constructor(type, name) {
    /** @type {RendererBackendType} */
    this.type = type;
    
    /** @type {string} */
    this.name = name;
    
    /** @type {HTMLCanvasElement | null} */
    this._canvas = null;
    
    /** @type {ViewportConfig | null} */
    this._viewport = null;
    
    /** @type {CameraConfig | null} */
    this._camera = null;
    
    /** @type {Map<string, SceneObject>} */
    this._objects = new Map();
    
    /** @type {Map<string, LightConfig>} */
    this._lights = new Map();
    
    /** @type {RenderPassConfig} */
    this._renderPassConfig = {
      clearColor: [0, 0, 0, 1],
      clearDepth: 1,
      clearStencil: 0,
      depthTest: true,
      depthWrite: true,
      stencilTest: false,
      blendMode: 'none',
    };
    
    /** @type {RenderMetrics} */
    this._metrics = {
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      memoryUsage: 0,
    };
    
    /** @type {boolean} */
    this._initialized = false;
    
    /** @type {number} */
    this._nextObjectId = 1;
    
    /** @type {number} */
    this._nextLightId = 1;
  }

  /**
   * Initialize the renderer backend
   * @param {HTMLCanvasElement} canvas - Target canvas element
   * @param {ViewportConfig} config - Initial viewport configuration
   * @returns {Promise<void>}
   */
  async initialize(canvas, config) {
    if (this._initialized) {
      throw new Error(`${this.name} already initialized`);
    }
    
    this._canvas = canvas;
    this._viewport = config;
    
    // Subclasses override this to perform actual initialization
    await this._initializeBackend();
    
    this._initialized = true;
  }

  /**
   * Backend-specific initialization (override in subclasses)
   * @protected
   * @returns {Promise<void>}
   */
  async _initializeBackend() {
    throw new Error('_initializeBackend must be implemented by subclass');
  }

  /**
   * Resize the viewport
   * @param {ViewportConfig} config - New viewport configuration
   */
  resize(config) {
    this._ensureInitialized();
    this._viewport = config;
    this._resizeBackend(config);
  }

  /**
   * Backend-specific resize (override in subclasses)
   * @protected
   * @param {ViewportConfig} config - New viewport configuration
   */
  _resizeBackend(config) {
    throw new Error('_resizeBackend must be implemented by subclass');
  }

  /**
   * Set camera configuration
   * @param {CameraConfig} camera - Camera configuration
   */
  setCamera(camera) {
    this._ensureInitialized();
    this._camera = camera;
  }

  /**
   * Add a scene object
   * @param {SceneObject} object - Scene object to add
   * @returns {string} Object identifier
   */
  addObject(object) {
    this._ensureInitialized();
    const id = object.id || `object_${this._nextObjectId++}`;
    this._objects.set(id, { ...object, id });
    return id;
  }

  /**
   * Update a scene object
   * @param {string} id - Object identifier
   * @param {Partial<SceneObject>} updates - Partial object updates
   */
  updateObject(id, updates) {
    this._ensureInitialized();
    const object = this._objects.get(id);
    if (!object) {
      throw new Error(`Object not found: ${id}`);
    }
    Object.assign(object, updates);
  }

  /**
   * Remove a scene object
   * @param {string} id - Object identifier
   */
  removeObject(id) {
    this._ensureInitialized();
    this._objects.delete(id);
  }

  /**
   * Add a light source
   * @param {LightConfig} light - Light configuration
   * @returns {string} Light identifier
   */
  addLight(light) {
    this._ensureInitialized();
    const id = `light_${this._nextLightId++}`;
    this._lights.set(id, light);
    return id;
  }

  /**
   * Update a light source
   * @param {string} id - Light identifier
   * @param {Partial<LightConfig>} updates - Partial light updates
   */
  updateLight(id, updates) {
    this._ensureInitialized();
    const light = this._lights.get(id);
    if (!light) {
      throw new Error(`Light not found: ${id}`);
    }
    Object.assign(light, updates);
  }

  /**
   * Remove a light source
   * @param {string} id - Light identifier
   */
  removeLight(id) {
    this._ensureInitialized();
    this._lights.delete(id);
  }

  /**
   * Configure render pass settings
   * @param {RenderPassConfig} config - Render pass configuration
   */
  configureRenderPass(config) {
    this._ensureInitialized();
    Object.assign(this._renderPassConfig, config);
  }

  /**
   * Render a single frame
   * @param {number} deltaTime - Time since last frame in seconds
   * @returns {RenderMetrics} Render metrics for this frame
   */
  render(deltaTime) {
    this._ensureInitialized();
    
    const startTime = performance.now();
    
    // Subclasses override this to perform actual rendering
    this._renderFrame(deltaTime);
    
    const endTime = performance.now();
    this._metrics.frameTime = endTime - startTime;
    
    // Enforce 16ms budget for 60fps (Policy #1)
    if (this._metrics.frameTime > 16) {
      console.warn(
        `[${this.name}] Frame time exceeded 16ms budget: ${this._metrics.frameTime.toFixed(2)}ms`
      );
    }
    
    return { ...this._metrics };
  }

  /**
   * Backend-specific rendering (override in subclasses)
   * @protected
   * @param {number} deltaTime - Time since last frame in seconds
   */
  _renderFrame(deltaTime) {
    throw new Error('_renderFrame must be implemented by subclass');
  }

  /**
   * Clear all scene objects and lights
   */
  clear() {
    this._ensureInitialized();
    this._objects.clear();
    this._lights.clear();
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    if (!this._initialized) {
      return;
    }
    
    this.clear();
    this._disposeBackend();
    
    this._canvas = null;
    this._viewport = null;
    this._camera = null;
    this._initialized = false;
  }

  /**
   * Backend-specific disposal (override in subclasses)
   * @protected
   */
  _disposeBackend() {
    // Override in subclasses if needed
  }

  /**
   * Get current performance metrics
   * @returns {RenderMetrics} Latest render metrics
   */
  getMetrics() {
    return { ...this._metrics };
  }

  /**
   * Check if backend supports a specific feature
   * @param {string} feature - Feature name to check
   * @returns {boolean} true if feature is supported
   */
  supportsFeature(feature) {
    // Override in subclasses
    return false;
  }

  /**
   * Ensure backend is initialized
   * @protected
   * @throws {Error} If not initialized
   */
  _ensureInitialized() {
    if (!this._initialized) {
      throw new Error(`${this.name} not initialized`);
    }
  }
}