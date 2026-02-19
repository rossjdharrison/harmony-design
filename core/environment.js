/**
 * Environment Configuration Module
 * 
 * Provides runtime environment detection and configuration management
 * for the Harmony Design System. Supports dev, staging, and production
 * environments with appropriate defaults and overrides.
 * 
 * @module core/environment
 * @see {@link file://../types/environment.d.ts}
 * @see {@link file://../DESIGN_SYSTEM.md#Environment-Configuration}
 */

/**
 * Default performance budgets (enforced globally)
 * @type {Object}
 */
const DEFAULT_PERFORMANCE_BUDGET = {
  maxRenderTime: 16, // 60fps requirement
  maxMemory: 50, // 50MB WASM heap
  maxLoadTime: 200, // 200ms initial load
  maxAudioLatency: 10, // 10ms audio latency
  targetFPS: 60
};

/**
 * Development environment configuration
 * @type {Object}
 */
const DEVELOPMENT_CONFIG = {
  name: 'development',
  logLevel: 'debug',
  features: {
    eventBusDebug: true,
    performanceMonitoring: true,
    componentGraph: true,
    experimentalFeatures: true,
    sourceMaps: true,
    hotReload: true,
    webGPUAudio: true,
    wasmAudioFallback: true
  },
  performance: DEFAULT_PERFORMANCE_BUDGET,
  api: {
    baseURL: 'http://localhost:3000',
    timeout: 30000,
    retryEnabled: false,
    maxRetries: 0,
    version: 'v1'
  },
  storage: {
    indexedDB: true,
    dbName: 'harmony-dev',
    dbVersion: 1,
    localStorageFallback: true,
    maxQuota: 100
  },
  audio: {
    sampleRate: 48000,
    bufferSize: 256,
    channels: 2,
    sharedArrayBuffer: true,
    workletURL: '/workers/audio-processor.js'
  },
  build: {
    mode: 'development',
    minify: false,
    treeShaking: false,
    codeSplitting: false,
    outDir: 'dist',
    publicPath: '/'
  },
  strictMode: true,
  baseURL: 'http://localhost:5173'
};

/**
 * Staging environment configuration
 * @type {Object}
 */
const STAGING_CONFIG = {
  name: 'staging',
  logLevel: 'info',
  features: {
    eventBusDebug: true,
    performanceMonitoring: true,
    componentGraph: true,
    experimentalFeatures: true,
    sourceMaps: true,
    hotReload: false,
    webGPUAudio: true,
    wasmAudioFallback: true
  },
  performance: DEFAULT_PERFORMANCE_BUDGET,
  api: {
    baseURL: 'https://api-staging.harmony.dev',
    timeout: 15000,
    retryEnabled: true,
    maxRetries: 3,
    version: 'v1'
  },
  storage: {
    indexedDB: true,
    dbName: 'harmony-staging',
    dbVersion: 1,
    localStorageFallback: true,
    maxQuota: 500
  },
  audio: {
    sampleRate: 48000,
    bufferSize: 256,
    channels: 2,
    sharedArrayBuffer: true,
    workletURL: '/workers/audio-processor.js'
  },
  build: {
    mode: 'production',
    minify: true,
    treeShaking: true,
    codeSplitting: true,
    outDir: 'dist',
    publicPath: '/'
  },
  strictMode: true,
  baseURL: 'https://staging.harmony.dev'
};

/**
 * Production environment configuration
 * @type {Object}
 */
const PRODUCTION_CONFIG = {
  name: 'production',
  logLevel: 'error',
  features: {
    eventBusDebug: false,
    performanceMonitoring: true,
    componentGraph: false,
    experimentalFeatures: false,
    sourceMaps: false,
    hotReload: false,
    webGPUAudio: true,
    wasmAudioFallback: true
  },
  performance: DEFAULT_PERFORMANCE_BUDGET,
  api: {
    baseURL: 'https://api.harmony.dev',
    timeout: 10000,
    retryEnabled: true,
    maxRetries: 3,
    version: 'v1'
  },
  storage: {
    indexedDB: true,
    dbName: 'harmony-prod',
    dbVersion: 1,
    localStorageFallback: true,
    maxQuota: 1000
  },
  audio: {
    sampleRate: 48000,
    bufferSize: 256,
    channels: 2,
    sharedArrayBuffer: true,
    workletURL: '/workers/audio-processor.js'
  },
  build: {
    mode: 'production',
    minify: true,
    treeShaking: true,
    codeSplitting: true,
    outDir: 'dist',
    publicPath: '/'
  },
  strictMode: false,
  baseURL: 'https://harmony.dev'
};

/**
 * Detect current environment from various sources
 * @returns {string} Environment name (development, staging, or production)
 */
function detectEnvironment() {
  // Check explicit environment variable
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteEnv = import.meta.env.VITE_ENVIRONMENT;
    if (viteEnv && ['development', 'staging', 'production'].includes(viteEnv)) {
      return viteEnv;
    }
    
    // Check Vite mode
    if (import.meta.env.MODE === 'production') {
      // Distinguish between staging and production by hostname
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (hostname.includes('staging')) {
          return 'staging';
        }
      }
      return 'production';
    }
    
    return 'development';
  }
  
  // Check Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      return process.env.VITE_ENVIRONMENT || 'production';
    }
    return 'development';
  }
  
  // Default to development
  return 'development';
}

/**
 * Get environment configuration for the specified environment
 * @param {string} [envName] - Environment name (auto-detected if not provided)
 * @returns {Object} Environment configuration
 */
export function getEnvironmentConfig(envName) {
  const env = envName || detectEnvironment();
  
  let config;
  switch (env) {
    case 'staging':
      config = { ...STAGING_CONFIG };
      break;
    case 'production':
      config = { ...PRODUCTION_CONFIG };
      break;
    case 'development':
    default:
      config = { ...DEVELOPMENT_CONFIG };
      break;
  }
  
  // Apply environment variable overrides
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) {
      config.api.baseURL = import.meta.env.VITE_API_URL;
    }
    if (import.meta.env.VITE_CDN_URL) {
      config.cdnURL = import.meta.env.VITE_CDN_URL;
    }
    if (import.meta.env.VITE_SENTRY_DSN) {
      config.sentryDSN = import.meta.env.VITE_SENTRY_DSN;
    }
    if (import.meta.env.VITE_ANALYTICS_ID) {
      config.analyticsID = import.meta.env.VITE_ANALYTICS_ID;
    }
    if (import.meta.env.VITE_DEBUG === 'true') {
      config.logLevel = 'debug';
      config.features.eventBusDebug = true;
    }
  }
  
  return config;
}

/**
 * Get environment detection utilities
 * @returns {Object} Environment detection object
 */
export function getEnvironmentDetection() {
  const current = detectEnvironment();
  
  return {
    current,
    isDevelopment: current === 'development',
    isStaging: current === 'staging',
    isProduction: current === 'production',
    isBrowser: typeof window !== 'undefined',
    isNode: typeof process !== 'undefined' && process.versions?.node,
    isTauri: typeof window !== 'undefined' && window.__TAURI__ !== undefined
  };
}

/**
 * Initialize global environment configuration
 * Sets window.__HARMONY_ENV__ and window.__HARMONY_ENV_DETECT__
 */
export function initializeEnvironment() {
  if (typeof window === 'undefined') {
    return; // Skip in non-browser environments
  }
  
  window.__HARMONY_ENV__ = getEnvironmentConfig();
  window.__HARMONY_ENV_DETECT__ = getEnvironmentDetection();
  
  // Log environment info in development
  if (window.__HARMONY_ENV_DETECT__.isDevelopment) {
    console.log('[Harmony Environment]', {
      name: window.__HARMONY_ENV__.name,
      logLevel: window.__HARMONY_ENV__.logLevel,
      features: window.__HARMONY_ENV__.features
    });
  }
}

/**
 * Validate performance budget compliance
 * @param {Object} metrics - Performance metrics to validate
 * @param {number} metrics.renderTime - Render time in ms
 * @param {number} metrics.memory - Memory usage in MB
 * @param {number} metrics.loadTime - Load time in ms
 * @param {number} metrics.audioLatency - Audio latency in ms
 * @returns {Object} Validation result with pass/fail and violations
 */
export function validatePerformanceBudget(metrics) {
  const config = getEnvironmentConfig();
  const budget = config.performance;
  const violations = [];
  
  if (metrics.renderTime > budget.maxRenderTime) {
    violations.push({
      metric: 'renderTime',
      actual: metrics.renderTime,
      budget: budget.maxRenderTime,
      message: `Render time ${metrics.renderTime}ms exceeds budget of ${budget.maxRenderTime}ms`
    });
  }
  
  if (metrics.memory > budget.maxMemory) {
    violations.push({
      metric: 'memory',
      actual: metrics.memory,
      budget: budget.maxMemory,
      message: `Memory usage ${metrics.memory}MB exceeds budget of ${budget.maxMemory}MB`
    });
  }
  
  if (metrics.loadTime > budget.maxLoadTime) {
    violations.push({
      metric: 'loadTime',
      actual: metrics.loadTime,
      budget: budget.maxLoadTime,
      message: `Load time ${metrics.loadTime}ms exceeds budget of ${budget.maxLoadTime}ms`
    });
  }
  
  if (metrics.audioLatency > budget.maxAudioLatency) {
    violations.push({
      metric: 'audioLatency',
      actual: metrics.audioLatency,
      budget: budget.maxAudioLatency,
      message: `Audio latency ${metrics.audioLatency}ms exceeds budget of ${budget.maxAudioLatency}ms`
    });
  }
  
  return {
    pass: violations.length === 0,
    violations,
    budget
  };
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  initializeEnvironment();
}