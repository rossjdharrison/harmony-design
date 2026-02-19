/**
 * @fileoverview Environment Loader - Load configuration from environment variables and .env files
 * @module config/environment-loader
 * 
 * Loads environment configuration with precedence:
 * 1. Runtime environment variables (highest priority)
 * 2. .env.local (local overrides, not committed)
 * 3. .env.{environment} (environment-specific)
 * 4. .env (base configuration)
 * 
 * Performance: Synchronous parsing, < 1ms load time
 * Memory: Minimal footprint, parsed config cached in memory
 * 
 * @see {@link ../DESIGN_SYSTEM.md#environment-configuration}
 */

/**
 * @typedef {import('../types/environment.js').EnvironmentConfig} EnvironmentConfig
 * @typedef {import('../types/environment.js').EnvironmentType} EnvironmentType
 */

/**
 * Parsed environment configuration cache
 * @type {EnvironmentConfig | null}
 */
let cachedConfig = null;

/**
 * Parse .env file content into key-value pairs
 * Supports:
 * - KEY=value
 * - KEY="value with spaces"
 * - KEY='value with spaces'
 * - # comments
 * - Empty lines
 * - Export statements (export KEY=value)
 * 
 * @param {string} content - .env file content
 * @returns {Record<string, string>} Parsed key-value pairs
 * @private
 */
function parseEnvFile(content) {
  const result = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Remove 'export ' prefix if present
    const cleaned = trimmed.replace(/^export\s+/, '');
    
    // Match KEY=value pattern
    const match = cleaned.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    result[key] = value;
  }
  
  return result;
}

/**
 * Load .env file from filesystem (Node.js environment)
 * 
 * @param {string} path - Path to .env file
 * @returns {Promise<Record<string, string>>} Parsed environment variables
 * @private
 */
async function loadEnvFileNode(path) {
  try {
    // Dynamic import to avoid bundling fs in browser builds
    const fs = await import('fs');
    const content = await fs.promises.readFile(path, 'utf-8');
    return parseEnvFile(content);
  } catch (error) {
    // File not found or read error - return empty object
    return {};
  }
}

/**
 * Load .env file from HTTP (browser environment)
 * 
 * @param {string} path - Path to .env file
 * @returns {Promise<Record<string, string>>} Parsed environment variables
 * @private
 */
async function loadEnvFileBrowser(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return {};
    }
    const content = await response.text();
    return parseEnvFile(content);
  } catch (error) {
    // Network error or file not found
    return {};
  }
}

/**
 * Detect current environment type
 * 
 * @returns {EnvironmentType} Current environment
 * @private
 */
function detectEnvironment() {
  // Check explicit environment variable
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    const env = process.env.NODE_ENV.toLowerCase();
    if (env === 'production' || env === 'development' || env === 'test') {
      return env;
    }
  }
  
  // Check browser environment indicators
  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    if (hostname?.includes('test') || hostname?.includes('staging')) {
      return 'test';
    }
  }
  
  // Default to production for safety
  return 'production';
}

/**
 * Determine if running in Node.js environment
 * 
 * @returns {boolean} True if Node.js environment
 * @private
 */
function isNodeEnvironment() {
  return typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.node != null;
}

/**
 * Load environment configuration from all sources
 * Precedence (highest to lowest):
 * 1. Runtime environment variables
 * 2. .env.local
 * 3. .env.{environment}
 * 4. .env
 * 
 * @returns {Promise<EnvironmentConfig>} Loaded configuration
 */
export async function loadEnvironment() {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const environment = detectEnvironment();
  const isNode = isNodeEnvironment();
  const loadEnvFile = isNode ? loadEnvFileNode : loadEnvFileBrowser;
  
  // Load .env files in order (lowest to highest priority)
  const envBase = await loadEnvFile('.env');
  const envEnvironment = await loadEnvFile(`.env.${environment}`);
  const envLocal = await loadEnvFile('.env.local');
  
  // Merge configurations (later sources override earlier ones)
  const merged = {
    ...envBase,
    ...envEnvironment,
    ...envLocal,
  };
  
  // Runtime environment variables have highest priority
  if (isNode && typeof process !== 'undefined' && process.env) {
    Object.assign(merged, process.env);
  }
  
  // Parse and validate configuration
  const config = {
    environment,
    apiUrl: merged.API_URL || merged.VITE_API_URL || 'http://localhost:3000',
    wsUrl: merged.WS_URL || merged.VITE_WS_URL || 'ws://localhost:3000',
    debug: merged.DEBUG === 'true' || merged.VITE_DEBUG === 'true' || environment === 'development',
    logLevel: merged.LOG_LEVEL || merged.VITE_LOG_LEVEL || (environment === 'production' ? 'warn' : 'debug'),
    enableAnalytics: merged.ENABLE_ANALYTICS === 'true' || merged.VITE_ENABLE_ANALYTICS === 'true' || environment === 'production',
    enableExperiments: merged.ENABLE_EXPERIMENTS === 'true' || merged.VITE_ENABLE_EXPERIMENTS === 'true' || environment !== 'production',
    audioBufferSize: parseInt(merged.AUDIO_BUFFER_SIZE || merged.VITE_AUDIO_BUFFER_SIZE || '128', 10),
    audioSampleRate: parseInt(merged.AUDIO_SAMPLE_RATE || merged.VITE_AUDIO_SAMPLE_RATE || '48000', 10),
    maxPolyphony: parseInt(merged.MAX_POLYPHONY || merged.VITE_MAX_POLYPHONY || '32', 10),
    wasmMemoryPages: parseInt(merged.WASM_MEMORY_PAGES || merged.VITE_WASM_MEMORY_PAGES || '256', 10),
    enableGpu: merged.ENABLE_GPU !== 'false' && merged.VITE_ENABLE_GPU !== 'false',
    raw: merged,
  };
  
  // Cache the configuration
  cachedConfig = config;
  
  return config;
}

/**
 * Get current environment configuration
 * Returns cached config or loads if not yet loaded
 * 
 * @returns {Promise<EnvironmentConfig>} Current configuration
 */
export async function getEnvironment() {
  return loadEnvironment();
}

/**
 * Get specific environment variable value
 * 
 * @param {string} key - Environment variable key
 * @param {string} [defaultValue] - Default value if not found
 * @returns {Promise<string | undefined>} Variable value
 */
export async function getEnvVar(key, defaultValue) {
  const config = await getEnvironment();
  return config.raw[key] ?? defaultValue;
}

/**
 * Check if running in development mode
 * 
 * @returns {Promise<boolean>} True if development mode
 */
export async function isDevelopment() {
  const config = await getEnvironment();
  return config.environment === 'development';
}

/**
 * Check if running in production mode
 * 
 * @returns {Promise<boolean>} True if production mode
 */
export async function isProduction() {
  const config = await getEnvironment();
  return config.environment === 'production';
}

/**
 * Check if running in test mode
 * 
 * @returns {Promise<boolean>} True if test mode
 */
export async function isTest() {
  const config = await getEnvironment();
  return config.environment === 'test';
}

/**
 * Clear cached configuration (useful for testing)
 * 
 * @returns {void}
 */
export function clearCache() {
  cachedConfig = null;
}

/**
 * Validate environment configuration
 * Checks for required variables and valid values
 * 
 * @param {EnvironmentConfig} config - Configuration to validate
 * @returns {Array<string>} Array of validation errors (empty if valid)
 */
export function validateConfig(config) {
  const errors = [];
  
  // Validate environment type
  if (!['development', 'test', 'production'].includes(config.environment)) {
    errors.push(`Invalid environment: ${config.environment}`);
  }
  
  // Validate URLs
  try {
    new URL(config.apiUrl);
  } catch {
    errors.push(`Invalid API URL: ${config.apiUrl}`);
  }
  
  // Validate numeric values
  if (config.audioBufferSize < 64 || config.audioBufferSize > 2048) {
    errors.push(`Audio buffer size out of range: ${config.audioBufferSize} (must be 64-2048)`);
  }
  
  if (config.audioSampleRate < 22050 || config.audioSampleRate > 96000) {
    errors.push(`Audio sample rate out of range: ${config.audioSampleRate} (must be 22050-96000)`);
  }
  
  if (config.maxPolyphony < 1 || config.maxPolyphony > 128) {
    errors.push(`Max polyphony out of range: ${config.maxPolyphony} (must be 1-128)`);
  }
  
  if (config.wasmMemoryPages < 1 || config.wasmMemoryPages > 65536) {
    errors.push(`WASM memory pages out of range: ${config.wasmMemoryPages} (must be 1-65536)`);
  }
  
  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    errors.push(`Invalid log level: ${config.logLevel} (must be one of: ${validLogLevels.join(', ')})`);
  }
  
  return errors;
}