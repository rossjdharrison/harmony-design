/**
 * @fileoverview useEnvironment Hook - Access environment config in components
 * @module hooks/useEnvironment
 * 
 * Provides a React-style hook pattern for accessing environment configuration
 * in Web Components. Uses ConfigContext to retrieve typed environment values.
 * 
 * @see {@link ../DESIGN_SYSTEM.md#environment-configuration}
 * @see {@link ../contexts/ConfigContext.js}
 * @see {@link ../config/environment-loader.js}
 */

import { ConfigContext } from '../contexts/ConfigContext.js';

/**
 * Hook to access environment configuration in components
 * 
 * @returns {Object} Environment configuration object
 * @returns {string} return.apiUrl - API base URL
 * @returns {string} return.wsUrl - WebSocket URL
 * @returns {string} return.environment - Current environment (development/staging/production)
 * @returns {boolean} return.enableDebug - Debug mode flag
 * @returns {boolean} return.enableAnalytics - Analytics flag
 * @returns {number} return.audioBufferSize - Audio buffer size in samples
 * @returns {number} return.maxPolyphony - Maximum polyphony
 * @returns {string} return.logLevel - Logging level
 * 
 * @example
 * class MyComponent extends HTMLElement {
 *   connectedCallback() {
 *     const env = useEnvironment();
 *     console.log('API URL:', env.apiUrl);
 *     console.log('Debug mode:', env.enableDebug);
 *     
 *     // Use environment values
 *     if (env.enableDebug) {
 *       this.attachDebugTools();
 *     }
 *   }
 * }
 * 
 * @example
 * // Access specific config values
 * const env = useEnvironment();
 * fetch(`${env.apiUrl}/projects`)
 *   .then(response => response.json())
 *   .then(data => console.log(data));
 * 
 * @example
 * // Conditional features based on environment
 * const env = useEnvironment();
 * if (env.environment === 'development') {
 *   // Enable dev-only features
 *   this.enableHotReload();
 * }
 * 
 * @throws {Error} If ConfigContext is not available (should never happen in practice)
 */
export function useEnvironment() {
  const config = ConfigContext.getConfig();
  
  if (!config) {
    console.error('[useEnvironment] ConfigContext not initialized');
    // Return safe defaults to prevent crashes
    return {
      apiUrl: '',
      wsUrl: '',
      environment: 'development',
      enableDebug: false,
      enableAnalytics: false,
      audioBufferSize: 256,
      maxPolyphony: 32,
      logLevel: 'info'
    };
  }
  
  return config;
}

/**
 * Hook to access a specific environment value
 * 
 * @param {string} key - The configuration key to retrieve
 * @param {*} [defaultValue] - Default value if key doesn't exist
 * @returns {*} The configuration value or default
 * 
 * @example
 * const apiUrl = useEnvironmentValue('apiUrl');
 * const bufferSize = useEnvironmentValue('audioBufferSize', 256);
 * 
 * @example
 * // Use in component initialization
 * class AudioProcessor extends HTMLElement {
 *   connectedCallback() {
 *     const bufferSize = useEnvironmentValue('audioBufferSize', 256);
 *     this.initAudioContext(bufferSize);
 *   }
 * }
 */
export function useEnvironmentValue(key, defaultValue = undefined) {
  const config = useEnvironment();
  return config[key] ?? defaultValue;
}

/**
 * Hook to check if we're in a specific environment
 * 
 * @param {string} envName - Environment name to check ('development', 'staging', 'production')
 * @returns {boolean} True if current environment matches
 * 
 * @example
 * if (useIsEnvironment('development')) {
 *   console.log('Running in development mode');
 * }
 * 
 * @example
 * // Conditional rendering
 * class DevTools extends HTMLElement {
 *   connectedCallback() {
 *     if (!useIsEnvironment('production')) {
 *       this.style.display = 'block';
 *     }
 *   }
 * }
 */
export function useIsEnvironment(envName) {
  const config = useEnvironment();
  return config.environment === envName;
}

/**
 * Hook to check if debug mode is enabled
 * 
 * @returns {boolean} True if debug mode is enabled
 * 
 * @example
 * if (useDebugMode()) {
 *   console.log('[Component] Detailed debug info...');
 * }
 * 
 * @example
 * class Component extends HTMLElement {
 *   log(message) {
 *     if (useDebugMode()) {
 *       console.log(`[${this.tagName}]`, message);
 *     }
 *   }
 * }
 */
export function useDebugMode() {
  const config = useEnvironment();
  return config.enableDebug === true;
}

/**
 * Hook to get audio-specific configuration
 * 
 * @returns {Object} Audio configuration
 * @returns {number} return.bufferSize - Audio buffer size in samples
 * @returns {number} return.maxPolyphony - Maximum polyphony
 * 
 * @example
 * const audioConfig = useAudioConfig();
 * const context = new AudioContext({
 *   latencyHint: 'interactive',
 *   sampleRate: 48000
 * });
 * const worklet = await context.audioWorklet.addModule('processor.js');
 * // Use audioConfig.bufferSize for worklet configuration
 */
export function useAudioConfig() {
  const config = useEnvironment();
  return {
    bufferSize: config.audioBufferSize,
    maxPolyphony: config.maxPolyphony
  };
}

/**
 * Hook to get API endpoints configuration
 * 
 * @returns {Object} API configuration
 * @returns {string} return.apiUrl - REST API base URL
 * @returns {string} return.wsUrl - WebSocket URL
 * 
 * @example
 * const { apiUrl, wsUrl } = useApiConfig();
 * 
 * // REST API call
 * fetch(`${apiUrl}/projects`)
 *   .then(response => response.json());
 * 
 * // WebSocket connection
 * const ws = new WebSocket(wsUrl);
 */
export function useApiConfig() {
  const config = useEnvironment();
  return {
    apiUrl: config.apiUrl,
    wsUrl: config.wsUrl
  };
}

/**
 * Default export for convenience
 */
export default useEnvironment;