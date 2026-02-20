/**
 * @fileoverview Graceful Degradation Manager
 * 
 * Provides feature detection and degradation rules for when capabilities are unavailable.
 * Ensures the system works across different browsers and environments by detecting
 * available features and applying appropriate fallbacks.
 * 
 * Key responsibilities:
 * - Detect browser capabilities (WebGPU, WASM, SharedArrayBuffer, etc.)
 * - Register degradation strategies for missing features
 * - Apply appropriate fallbacks automatically
 * - Monitor feature availability changes
 * - Log degradation decisions for debugging
 * 
 * Vision Alignment:
 * - WASM Performance: Detects WASM availability and provides fallbacks
 * - GPU-First Audio: Detects WebGPU and provides CPU fallbacks
 * - Reactive Component System: Notifies components of capability changes
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Graceful Degradation
 * 
 * @module core/graceful-degradation-manager
 */

/**
 * Feature capability levels
 * @enum {string}
 */
export const CapabilityLevel = {
  FULL: 'full',           // All features available
  DEGRADED: 'degraded',   // Some features unavailable, fallbacks active
  MINIMAL: 'minimal',     // Basic functionality only
  UNSUPPORTED: 'unsupported' // Critical features missing
};

/**
 * Feature categories
 * @enum {string}
 */
export const FeatureCategory = {
  AUDIO: 'audio',
  GRAPHICS: 'graphics',
  COMPUTE: 'compute',
  STORAGE: 'storage',
  NETWORK: 'network',
  SECURITY: 'security'
};

/**
 * @typedef {Object} FeatureDetection
 * @property {string} name - Feature name
 * @property {FeatureCategory} category - Feature category
 * @property {boolean} available - Whether feature is available
 * @property {Function} detect - Detection function
 * @property {string[]} dependencies - Other features this depends on
 * @property {boolean} critical - Whether this is a critical feature
 */

/**
 * @typedef {Object} DegradationRule
 * @property {string} featureName - Feature this rule applies to
 * @property {CapabilityLevel} targetLevel - Capability level when degraded
 * @property {Function} apply - Function to apply degradation
 * @property {Function} [revert] - Optional function to revert degradation
 * @property {string} description - Human-readable description
 */

/**
 * @typedef {Object} CapabilityReport
 * @property {CapabilityLevel} overall - Overall capability level
 * @property {Object.<string, boolean>} features - Map of feature availability
 * @property {string[]} activeDegradations - List of active degradation rules
 * @property {string[]} warnings - Warning messages
 * @property {string[]} errors - Error messages
 */

/**
 * Graceful Degradation Manager
 * 
 * Manages feature detection and applies degradation strategies when
 * capabilities are unavailable. Ensures graceful fallbacks across
 * different browser environments.
 */
export class GracefulDegradationManager {
  constructor() {
    /** @type {Map<string, FeatureDetection>} */
    this.features = new Map();
    
    /** @type {Map<string, DegradationRule>} */
    this.degradationRules = new Map();
    
    /** @type {Set<string>} */
    this.activeDegradations = new Set();
    
    /** @type {CapabilityLevel} */
    this.currentLevel = CapabilityLevel.FULL;
    
    /** @type {Function[]} */
    this.listeners = [];
    
    /** @type {boolean} */
    this.initialized = false;
    
    this._initializeBuiltInFeatures();
  }

  /**
   * Initialize built-in feature detections
   * @private
   */
  _initializeBuiltInFeatures() {
    // Audio features
    this.registerFeature({
      name: 'webgpu',
      category: FeatureCategory.GRAPHICS,
      detect: () => 'gpu' in navigator,
      dependencies: [],
      critical: false
    });

    this.registerFeature({
      name: 'wasm',
      category: FeatureCategory.COMPUTE,
      detect: () => typeof WebAssembly !== 'undefined',
      dependencies: [],
      critical: true
    });

    this.registerFeature({
      name: 'sharedArrayBuffer',
      category: FeatureCategory.COMPUTE,
      detect: () => typeof SharedArrayBuffer !== 'undefined',
      dependencies: [],
      critical: false
    });

    this.registerFeature({
      name: 'audioWorklet',
      category: FeatureCategory.AUDIO,
      detect: () => {
        return typeof AudioWorklet !== 'undefined' && 
               typeof AudioContext !== 'undefined';
      },
      dependencies: [],
      critical: true
    });

    this.registerFeature({
      name: 'webAudio',
      category: FeatureCategory.AUDIO,
      detect: () => {
        return typeof AudioContext !== 'undefined' || 
               typeof (window as any).webkitAudioContext !== 'undefined';
      },
      dependencies: [],
      critical: true
    });

    this.registerFeature({
      name: 'indexedDB',
      category: FeatureCategory.STORAGE,
      detect: () => 'indexedDB' in window,
      dependencies: [],
      critical: false
    });

    this.registerFeature({
      name: 'webWorkers',
      category: FeatureCategory.COMPUTE,
      detect: () => typeof Worker !== 'undefined',
      dependencies: [],
      critical: false
    });

    this.registerFeature({
      name: 'offscreenCanvas',
      category: FeatureCategory.GRAPHICS,
      detect: () => typeof OffscreenCanvas !== 'undefined',
      dependencies: [],
      critical: false
    });

    this.registerFeature({
      name: 'webGL2',
      category: FeatureCategory.GRAPHICS,
      detect: () => {
        try {
          const canvas = document.createElement('canvas');
          return !!canvas.getContext('webgl2');
        } catch (e) {
          return false;
        }
      },
      dependencies: [],
      critical: false
    });

    this.registerFeature({
      name: 'webGL',
      category: FeatureCategory.GRAPHICS,
      detect: () => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
          return false;
        }
      },
      dependencies: [],
      critical: false
    });

    // Register built-in degradation rules
    this._initializeBuiltInDegradations();
  }

  /**
   * Initialize built-in degradation rules
   * @private
   */
  _initializeBuiltInDegradations() {
    // WebGPU → CPU fallback
    this.registerDegradation({
      featureName: 'webgpu',
      targetLevel: CapabilityLevel.DEGRADED,
      description: 'GPU audio processing unavailable, using CPU fallback',
      apply: () => {
        console.warn('[GracefulDegradation] WebGPU unavailable, audio processing will use CPU');
        // Signal to audio system to use CPU path
        this._dispatchDegradationEvent('webgpu', false);
      }
    });

    // SharedArrayBuffer → MessageChannel fallback
    this.registerDegradation({
      featureName: 'sharedArrayBuffer',
      targetLevel: CapabilityLevel.DEGRADED,
      description: 'SharedArrayBuffer unavailable, using MessageChannel for data transfer',
      apply: () => {
        console.warn('[GracefulDegradation] SharedArrayBuffer unavailable, using slower message passing');
        this._dispatchDegradationEvent('sharedArrayBuffer', false);
      }
    });

    // AudioWorklet → ScriptProcessor fallback
    this.registerDegradation({
      featureName: 'audioWorklet',
      targetLevel: CapabilityLevel.DEGRADED,
      description: 'AudioWorklet unavailable, using deprecated ScriptProcessorNode',
      apply: () => {
        console.warn('[GracefulDegradation] AudioWorklet unavailable, using ScriptProcessorNode (deprecated)');
        this._dispatchDegradationEvent('audioWorklet', false);
      }
    });

    // IndexedDB → LocalStorage fallback
    this.registerDegradation({
      featureName: 'indexedDB',
      targetLevel: CapabilityLevel.DEGRADED,
      description: 'IndexedDB unavailable, using LocalStorage (limited capacity)',
      apply: () => {
        console.warn('[GracefulDegradation] IndexedDB unavailable, using LocalStorage with limited capacity');
        this._dispatchDegradationEvent('indexedDB', false);
      }
    });

    // WebWorkers → Main thread fallback
    this.registerDegradation({
      featureName: 'webWorkers',
      targetLevel: CapabilityLevel.DEGRADED,
      description: 'Web Workers unavailable, computations will run on main thread',
      apply: () => {
        console.warn('[GracefulDegradation] Web Workers unavailable, may impact UI responsiveness');
        this._dispatchDegradationEvent('webWorkers', false);
      }
    });
  }

  /**
   * Register a feature detection
   * @param {FeatureDetection} feature - Feature detection configuration
   */
  registerFeature(feature) {
    if (!feature.name || typeof feature.detect !== 'function') {
      throw new Error('Feature must have name and detect function');
    }

    this.features.set(feature.name, {
      ...feature,
      available: false, // Will be set during detection
      dependencies: feature.dependencies || [],
      critical: feature.critical ?? false
    });
  }

  /**
   * Register a degradation rule
   * @param {DegradationRule} rule - Degradation rule configuration
   */
  registerDegradation(rule) {
    if (!rule.featureName || typeof rule.apply !== 'function') {
      throw new Error('Degradation rule must have featureName and apply function');
    }

    this.degradationRules.set(rule.featureName, rule);
  }

  /**
   * Detect all registered features
   * @returns {Promise<CapabilityReport>}
   */
  async detectCapabilities() {
    const report = {
      overall: CapabilityLevel.FULL,
      features: {},
      activeDegradations: [],
      warnings: [],
      errors: []
    };

    // Detect all features
    for (const [name, feature] of this.features) {
      try {
        feature.available = await this._detectFeature(feature);
        report.features[name] = feature.available;

        if (!feature.available) {
          const message = `Feature '${name}' is unavailable`;
          if (feature.critical) {
            report.errors.push(message);
          } else {
            report.warnings.push(message);
          }
        }
      } catch (error) {
        console.error(`[GracefulDegradation] Error detecting feature '${name}':`, error);
        feature.available = false;
        report.features[name] = false;
        report.errors.push(`Failed to detect feature '${name}': ${error.message}`);
      }
    }

    // Apply degradation rules for unavailable features
    for (const [name, feature] of this.features) {
      if (!feature.available && this.degradationRules.has(name)) {
        const rule = this.degradationRules.get(name);
        try {
          await rule.apply();
          this.activeDegradations.add(name);
          report.activeDegradations.push(name);
          
          // Update capability level
          if (rule.targetLevel === CapabilityLevel.MINIMAL && 
              report.overall !== CapabilityLevel.UNSUPPORTED) {
            report.overall = CapabilityLevel.MINIMAL;
          } else if (rule.targetLevel === CapabilityLevel.DEGRADED && 
                     report.overall === CapabilityLevel.FULL) {
            report.overall = CapabilityLevel.DEGRADED;
          }
        } catch (error) {
          console.error(`[GracefulDegradation] Error applying degradation for '${name}':`, error);
          report.errors.push(`Failed to apply degradation for '${name}': ${error.message}`);
        }
      }
    }

    // Check for critical missing features
    const criticalMissing = Array.from(this.features.values())
      .filter(f => f.critical && !f.available);
    
    if (criticalMissing.length > 0) {
      report.overall = CapabilityLevel.UNSUPPORTED;
      report.errors.push(
        `Critical features missing: ${criticalMissing.map(f => f.name).join(', ')}`
      );
    }

    this.currentLevel = report.overall;
    this.initialized = true;

    // Notify listeners
    this._notifyListeners(report);

    return report;
  }

  /**
   * Detect a single feature
   * @param {FeatureDetection} feature - Feature to detect
   * @returns {Promise<boolean>}
   * @private
   */
  async _detectFeature(feature) {
    // Check dependencies first
    for (const depName of feature.dependencies) {
      const dep = this.features.get(depName);
      if (dep && !dep.available) {
        return false;
      }
    }

    // Run detection
    try {
      const result = feature.detect();
      return result instanceof Promise ? await result : result;
    } catch (error) {
      console.error(`[GracefulDegradation] Detection failed for '${feature.name}':`, error);
      return false;
    }
  }

  /**
   * Check if a specific feature is available
   * @param {string} featureName - Name of the feature
   * @returns {boolean}
   */
  hasFeature(featureName) {
    const feature = this.features.get(featureName);
    return feature ? feature.available : false;
  }

  /**
   * Get current capability level
   * @returns {CapabilityLevel}
   */
  getCapabilityLevel() {
    return this.currentLevel;
  }

  /**
   * Check if a degradation is active
   * @param {string} featureName - Name of the feature
   * @returns {boolean}
   */
  isDegraded(featureName) {
    return this.activeDegradations.has(featureName);
  }

  /**
   * Get all active degradations
   * @returns {string[]}
   */
  getActiveDegradations() {
    return Array.from(this.activeDegradations);
  }

  /**
   * Subscribe to capability changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of capability changes
   * @param {CapabilityReport} report - Capability report
   * @private
   */
  _notifyListeners(report) {
    for (const listener of this.listeners) {
      try {
        listener(report);
      } catch (error) {
        console.error('[GracefulDegradation] Error in listener:', error);
      }
    }
  }

  /**
   * Dispatch degradation event for other systems to react to
   * @param {string} featureName - Feature name
   * @param {boolean} available - Whether feature is available
   * @private
   */
  _dispatchDegradationEvent(featureName, available) {
    const event = new CustomEvent('harmony:degradation', {
      detail: {
        feature: featureName,
        available,
        timestamp: Date.now()
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get a detailed capability report
   * @returns {CapabilityReport}
   */
  getReport() {
    const report = {
      overall: this.currentLevel,
      features: {},
      activeDegradations: Array.from(this.activeDegradations),
      warnings: [],
      errors: []
    };

    for (const [name, feature] of this.features) {
      report.features[name] = feature.available;
      if (!feature.available) {
        const message = `Feature '${name}' (${feature.category}) is unavailable`;
        if (feature.critical) {
          report.errors.push(message);
        } else {
          report.warnings.push(message);
        }
      }
    }

    return report;
  }

  /**
   * Re-detect capabilities (useful for hot-reload scenarios)
   * @returns {Promise<CapabilityReport>}
   */
  async refresh() {
    // Clear active degradations
    this.activeDegradations.clear();
    
    // Re-detect
    return await this.detectCapabilities();
  }

  /**
   * Get features by category
   * @param {FeatureCategory} category - Feature category
   * @returns {Map<string, FeatureDetection>}
   */
  getFeaturesByCategory(category) {
    const filtered = new Map();
    for (const [name, feature] of this.features) {
      if (feature.category === category) {
        filtered.set(name, feature);
      }
    }
    return filtered;
  }
}

// Singleton instance
let instance = null;

/**
 * Get the global GracefulDegradationManager instance
 * @returns {GracefulDegradationManager}
 */
export function getGracefulDegradationManager() {
  if (!instance) {
    instance = new GracefulDegradationManager();
  }
  return instance;
}

/**
 * Initialize graceful degradation and detect capabilities
 * Call this early in application startup
 * @returns {Promise<CapabilityReport>}
 */
export async function initializeGracefulDegradation() {
  const manager = getGracefulDegradationManager();
  const report = await manager.detectCapabilities();
  
  console.log('[GracefulDegradation] Initialized:', {
    level: report.overall,
    features: Object.keys(report.features).length,
    degradations: report.activeDegradations.length
  });
  
  if (report.warnings.length > 0) {
    console.warn('[GracefulDegradation] Warnings:', report.warnings);
  }
  
  if (report.errors.length > 0) {
    console.error('[GracefulDegradation] Errors:', report.errors);
  }
  
  return report;
}