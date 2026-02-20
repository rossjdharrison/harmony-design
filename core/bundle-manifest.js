/**
 * @fileoverview BundleManifest - Manifest describing dependencies, entry point, capabilities
 * 
 * Provides a standardized format for describing code bundles (WASM, JS modules, workers)
 * with their dependencies, entry points, and capabilities. Used by the module loader
 * and dependency resolver to ensure correct initialization order and capability checks.
 * 
 * Related: See DESIGN_SYSTEM.md § Bundle System
 * @module core/bundle-manifest
 */

/**
 * @typedef {Object} BundleCapability
 * @property {string} name - Capability identifier (e.g., "webgpu", "audio-worklet")
 * @property {string} version - Semantic version of the capability
 * @property {boolean} required - Whether this capability is required for bundle to function
 * @property {string} [fallback] - Alternative capability if this one is unavailable
 */

/**
 * @typedef {Object} BundleDependency
 * @property {string} name - Dependency bundle name
 * @property {string} version - Semantic version or version range
 * @property {boolean} lazy - Whether dependency can be loaded lazily
 * @property {string} [condition] - Conditional loading expression
 */

/**
 * @typedef {Object} BundleEntryPoint
 * @property {string} type - Entry point type: "wasm", "js", "worker", "worklet"
 * @property {string} path - Relative path to entry file
 * @property {string} [export] - Specific export name (for ES modules)
 * @property {Object.<string, any>} [initParams] - Initialization parameters
 */

/**
 * @typedef {Object} BundleManifest
 * @property {string} id - Unique bundle identifier
 * @property {string} name - Human-readable bundle name
 * @property {string} version - Semantic version
 * @property {string} description - Bundle description
 * @property {BundleEntryPoint[]} entryPoints - Entry points for this bundle
 * @property {BundleDependency[]} dependencies - Bundle dependencies
 * @property {BundleCapability[]} capabilities - Required and provided capabilities
 * @property {Object.<string, any>} [metadata] - Additional metadata
 * @property {number} [priority] - Loading priority (0-100, higher = earlier)
 * @property {string[]} [tags] - Categorization tags
 */

/**
 * Validates a bundle manifest structure
 * @param {BundleManifest} manifest - Manifest to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateManifest(manifest) {
  const errors = [];

  // Required fields
  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Missing or invalid "id" field');
  }
  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Missing or invalid "name" field');
  }
  if (!manifest.version || !isValidVersion(manifest.version)) {
    errors.push('Missing or invalid "version" field (must be semantic version)');
  }

  // Entry points validation
  if (!Array.isArray(manifest.entryPoints) || manifest.entryPoints.length === 0) {
    errors.push('Missing or empty "entryPoints" array');
  } else {
    manifest.entryPoints.forEach((ep, idx) => {
      if (!['wasm', 'js', 'worker', 'worklet'].includes(ep.type)) {
        errors.push(`Entry point ${idx}: invalid type "${ep.type}"`);
      }
      if (!ep.path || typeof ep.path !== 'string') {
        errors.push(`Entry point ${idx}: missing or invalid "path"`);
      }
    });
  }

  // Dependencies validation
  if (manifest.dependencies) {
    if (!Array.isArray(manifest.dependencies)) {
      errors.push('"dependencies" must be an array');
    } else {
      manifest.dependencies.forEach((dep, idx) => {
        if (!dep.name || typeof dep.name !== 'string') {
          errors.push(`Dependency ${idx}: missing or invalid "name"`);
        }
        if (!dep.version || typeof dep.version !== 'string') {
          errors.push(`Dependency ${idx}: missing or invalid "version"`);
        }
      });
    }
  }

  // Capabilities validation
  if (manifest.capabilities) {
    if (!Array.isArray(manifest.capabilities)) {
      errors.push('"capabilities" must be an array');
    } else {
      manifest.capabilities.forEach((cap, idx) => {
        if (!cap.name || typeof cap.name !== 'string') {
          errors.push(`Capability ${idx}: missing or invalid "name"`);
        }
        if (cap.version && !isValidVersion(cap.version)) {
          errors.push(`Capability ${idx}: invalid version format`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Checks if a version string is valid semantic version
 * @param {string} version - Version string to check
 * @returns {boolean} True if valid semver
 */
function isValidVersion(version) {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  return semverRegex.test(version);
}

/**
 * Resolves bundle dependencies in topological order
 * @param {BundleManifest[]} manifests - Array of manifests to resolve
 * @returns {{order: string[], errors: string[]}} Resolution result
 */
export function resolveDependencies(manifests) {
  const errors = [];
  const manifestMap = new Map();
  const graph = new Map();
  const inDegree = new Map();

  // Build manifest map and dependency graph
  for (const manifest of manifests) {
    manifestMap.set(manifest.id, manifest);
    graph.set(manifest.id, []);
    inDegree.set(manifest.id, 0);
  }

  // Build edges
  for (const manifest of manifests) {
    const deps = manifest.dependencies || [];
    for (const dep of deps) {
      if (!manifestMap.has(dep.name)) {
        if (!dep.lazy) {
          errors.push(`Bundle "${manifest.id}" depends on missing bundle "${dep.name}"`);
        }
        continue;
      }
      graph.get(dep.name).push(manifest.id);
      inDegree.set(manifest.id, inDegree.get(manifest.id) + 1);
    }
  }

  // Topological sort (Kahn's algorithm)
  const queue = [];
  const order = [];

  // Find nodes with no incoming edges
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    // Sort by priority if available
    queue.sort((a, b) => {
      const priorityA = manifestMap.get(a).priority || 50;
      const priorityB = manifestMap.get(b).priority || 50;
      return priorityB - priorityA;
    });

    const current = queue.shift();
    order.push(current);

    for (const dependent of graph.get(current)) {
      inDegree.set(dependent, inDegree.get(dependent) - 1);
      if (inDegree.get(dependent) === 0) {
        queue.push(dependent);
      }
    }
  }

  // Check for cycles
  if (order.length !== manifests.length) {
    errors.push('Circular dependency detected in bundle manifests');
  }

  return { order, errors };
}

/**
 * Checks if required capabilities are available in the runtime
 * @param {BundleCapability[]} capabilities - Capabilities to check
 * @returns {{available: boolean, missing: string[], fallbacks: Object.<string, string>}} Capability check result
 */
export function checkCapabilities(capabilities) {
  const missing = [];
  const fallbacks = {};

  for (const cap of capabilities) {
    const available = isCapabilityAvailable(cap.name);
    
    if (!available) {
      if (cap.required) {
        missing.push(cap.name);
      }
      if (cap.fallback) {
        fallbacks[cap.name] = cap.fallback;
      }
    }
  }

  return {
    available: missing.length === 0,
    missing,
    fallbacks
  };
}

/**
 * Checks if a specific capability is available in the current runtime
 * @param {string} capabilityName - Capability to check
 * @returns {boolean} True if available
 */
function isCapabilityAvailable(capabilityName) {
  switch (capabilityName) {
    case 'webgpu':
      return 'gpu' in navigator;
    case 'webassembly':
      return typeof WebAssembly !== 'undefined';
    case 'audio-worklet':
      return typeof AudioWorklet !== 'undefined';
    case 'shared-array-buffer':
      return typeof SharedArrayBuffer !== 'undefined';
    case 'web-worker':
      return typeof Worker !== 'undefined';
    case 'indexeddb':
      return 'indexedDB' in window;
    case 'offscreen-canvas':
      return typeof OffscreenCanvas !== 'undefined';
    default:
      console.warn(`Unknown capability: ${capabilityName}`);
      return false;
  }
}

/**
 * Creates a manifest for a WASM bundle
 * @param {Object} options - Manifest options
 * @param {string} options.id - Bundle ID
 * @param {string} options.name - Bundle name
 * @param {string} options.version - Bundle version
 * @param {string} options.wasmPath - Path to WASM file
 * @param {BundleDependency[]} [options.dependencies] - Dependencies
 * @param {BundleCapability[]} [options.capabilities] - Capabilities
 * @returns {BundleManifest} Created manifest
 */
export function createWasmManifest(options) {
  return {
    id: options.id,
    name: options.name,
    version: options.version,
    description: options.description || '',
    entryPoints: [
      {
        type: 'wasm',
        path: options.wasmPath
      }
    ],
    dependencies: options.dependencies || [],
    capabilities: [
      { name: 'webassembly', version: '1.0.0', required: true },
      ...(options.capabilities || [])
    ],
    metadata: options.metadata || {},
    priority: options.priority || 50,
    tags: options.tags || []
  };
}

/**
 * Creates a manifest for a JavaScript module bundle
 * @param {Object} options - Manifest options
 * @param {string} options.id - Bundle ID
 * @param {string} options.name - Bundle name
 * @param {string} options.version - Bundle version
 * @param {string} options.modulePath - Path to JS module
 * @param {string} [options.exportName] - Specific export name
 * @param {BundleDependency[]} [options.dependencies] - Dependencies
 * @returns {BundleManifest} Created manifest
 */
export function createModuleManifest(options) {
  return {
    id: options.id,
    name: options.name,
    version: options.version,
    description: options.description || '',
    entryPoints: [
      {
        type: 'js',
        path: options.modulePath,
        export: options.exportName
      }
    ],
    dependencies: options.dependencies || [],
    capabilities: options.capabilities || [],
    metadata: options.metadata || {},
    priority: options.priority || 50,
    tags: options.tags || []
  };
}

/**
 * Serializes a manifest to JSON string
 * @param {BundleManifest} manifest - Manifest to serialize
 * @param {boolean} [pretty=false] - Whether to pretty-print
 * @returns {string} JSON string
 */
export function serializeManifest(manifest, pretty = false) {
  return JSON.stringify(manifest, null, pretty ? 2 : 0);
}

/**
 * Deserializes a manifest from JSON string
 * @param {string} json - JSON string
 * @returns {BundleManifest} Parsed manifest
 * @throws {Error} If JSON is invalid or manifest validation fails
 */
export function deserializeManifest(json) {
  const manifest = JSON.parse(json);
  const validation = validateManifest(manifest);
  
  if (!validation.valid) {
    throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
  }
  
  return manifest;
}