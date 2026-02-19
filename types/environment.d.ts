/**
 * Environment Types for Harmony Design System
 * 
 * Provides TypeScript type definitions for environment configuration
 * across development, staging, and production environments.
 * 
 * @module types/environment
 * @see {@link file://./DESIGN_SYSTEM.md#Environment-Configuration}
 */

/**
 * Valid environment names
 */
export type EnvironmentName = 'development' | 'staging' | 'production';

/**
 * Log level configuration for different environments
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

/**
 * Feature flags for environment-specific functionality
 */
export interface FeatureFlags {
  /** Enable EventBus debugging UI */
  eventBusDebug: boolean;
  
  /** Enable performance monitoring */
  performanceMonitoring: boolean;
  
  /** Enable component graph visualization */
  componentGraph: boolean;
  
  /** Enable experimental features */
  experimentalFeatures: boolean;
  
  /** Enable source maps */
  sourceMaps: boolean;
  
  /** Enable hot module replacement */
  hotReload: boolean;
  
  /** Enable WebGPU audio processing */
  webGPUAudio: boolean;
  
  /** Enable WASM fallback for audio */
  wasmAudioFallback: boolean;
}

/**
 * Performance budget configuration
 */
export interface PerformanceBudget {
  /** Maximum render time per frame (ms) */
  maxRenderTime: number;
  
  /** Maximum WASM heap size (MB) */
  maxMemory: number;
  
  /** Maximum initial load time (ms) */
  maxLoadTime: number;
  
  /** Maximum audio processing latency (ms) */
  maxAudioLatency: number;
  
  /** Target frames per second */
  targetFPS: number;
}

/**
 * API endpoint configuration
 */
export interface APIConfig {
  /** Base URL for API requests */
  baseURL: string;
  
  /** Request timeout in milliseconds */
  timeout: number;
  
  /** Enable request retry logic */
  retryEnabled: boolean;
  
  /** Maximum number of retry attempts */
  maxRetries: number;
  
  /** API version */
  version: string;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Enable IndexedDB for project storage */
  indexedDB: boolean;
  
  /** IndexedDB database name */
  dbName: string;
  
  /** IndexedDB version */
  dbVersion: number;
  
  /** Enable localStorage fallback */
  localStorageFallback: boolean;
  
  /** Maximum storage quota (MB) */
  maxQuota: number;
}

/**
 * Audio configuration
 */
export interface AudioConfig {
  /** Sample rate (Hz) */
  sampleRate: number;
  
  /** Buffer size (samples) */
  bufferSize: number;
  
  /** Number of audio channels */
  channels: number;
  
  /** Enable SharedArrayBuffer for audio transfer */
  sharedArrayBuffer: boolean;
  
  /** Audio worklet processor URL */
  workletURL: string;
}

/**
 * Build configuration
 */
export interface BuildConfig {
  /** Build mode */
  mode: 'development' | 'production';
  
  /** Enable minification */
  minify: boolean;
  
  /** Enable tree shaking */
  treeShaking: boolean;
  
  /** Enable code splitting */
  codeSplitting: boolean;
  
  /** Output directory */
  outDir: string;
  
  /** Public path for assets */
  publicPath: string;
}

/**
 * Complete environment configuration
 */
export interface EnvironmentConfig {
  /** Environment name */
  name: EnvironmentName;
  
  /** Log level */
  logLevel: LogLevel;
  
  /** Feature flags */
  features: FeatureFlags;
  
  /** Performance budgets */
  performance: PerformanceBudget;
  
  /** API configuration */
  api: APIConfig;
  
  /** Storage configuration */
  storage: StorageConfig;
  
  /** Audio configuration */
  audio: AudioConfig;
  
  /** Build configuration */
  build: BuildConfig;
  
  /** Enable strict mode validation */
  strictMode: boolean;
  
  /** Base URL for the application */
  baseURL: string;
  
  /** CDN URL for static assets */
  cdnURL?: string;
  
  /** Sentry DSN for error tracking */
  sentryDSN?: string;
  
  /** Analytics tracking ID */
  analyticsID?: string;
}

/**
 * Environment detection utilities
 */
export interface EnvironmentDetection {
  /** Current environment name */
  current: EnvironmentName;
  
  /** Check if running in development */
  isDevelopment: boolean;
  
  /** Check if running in staging */
  isStaging: boolean;
  
  /** Check if running in production */
  isProduction: boolean;
  
  /** Check if running in browser */
  isBrowser: boolean;
  
  /** Check if running in Node.js */
  isNode: boolean;
  
  /** Check if running in Tauri desktop wrapper */
  isTauri: boolean;
}

/**
 * Environment variable schema
 */
export interface EnvironmentVariables {
  /** Node environment */
  NODE_ENV?: string;
  
  /** API base URL override */
  VITE_API_URL?: string;
  
  /** CDN URL override */
  VITE_CDN_URL?: string;
  
  /** Enable debug mode */
  VITE_DEBUG?: string;
  
  /** Sentry DSN */
  VITE_SENTRY_DSN?: string;
  
  /** Analytics ID */
  VITE_ANALYTICS_ID?: string;
  
  /** Environment name override */
  VITE_ENVIRONMENT?: EnvironmentName;
}

/**
 * Global environment declaration
 */
declare global {
  interface Window {
    /** Global environment configuration */
    __HARMONY_ENV__?: EnvironmentConfig;
    
    /** Environment detection utilities */
    __HARMONY_ENV_DETECT__?: EnvironmentDetection;
  }
}

export {};