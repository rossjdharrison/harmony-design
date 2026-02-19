/**
 * Feature Flag Type Guards and Utilities
 * 
 * Runtime type checking and validation for feature flags.
 * Complements the TypeScript definitions for runtime safety.
 * 
 * @module types/feature-flags
 * @see {@link file://./feature-flags.d.ts} - TypeScript type definitions
 */

/**
 * Valid feature flag keys
 * @type {ReadonlyArray<string>}
 */
const VALID_FLAG_KEYS = Object.freeze([
  'new-ui',
  'advanced-audio',
  'gpu-acceleration',
  'experimental-waveform',
  'beta-collaboration',
  'debug-mode',
  'performance-metrics',
  'accessibility-enhancements'
]);

/**
 * Type guard to check if a string is a valid feature flag key
 * 
 * @param {string} key - The key to check
 * @returns {boolean} True if the key is a valid feature flag key
 * 
 * @example
 * if (isFeatureFlagKey('new-ui')) {
 *   // TypeScript knows this is a FeatureFlagKey
 * }
 */
export function isFeatureFlagKey(key) {
  return typeof key === 'string' && VALID_FLAG_KEYS.includes(key);
}

/**
 * Type guard to check if an object is a valid feature flag
 * 
 * @param {unknown} obj - The object to check
 * @returns {boolean} True if the object is a valid feature flag
 * 
 * @example
 * if (isFeatureFlag(data)) {
 *   console.log(data.enabled);
 * }
 */
export function isFeatureFlag(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const flag = /** @type {Record<string, unknown>} */ (obj);

  return (
    typeof flag.key === 'string' &&
    isFeatureFlagKey(flag.key) &&
    typeof flag.name === 'string' &&
    typeof flag.description === 'string' &&
    typeof flag.enabled === 'boolean'
  );
}

/**
 * Validates a feature flag configuration
 * 
 * @param {unknown} config - The configuration to validate
 * @returns {boolean} True if the configuration is valid
 * 
 * @example
 * if (isValidFeatureFlagConfig(config)) {
 *   // Safe to use config
 * }
 */
export function isValidFeatureFlagConfig(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const configObj = /** @type {Record<string, unknown>} */ (config);

  return Object.entries(configObj).every(([key, value]) => {
    return isFeatureFlagKey(key) && isFeatureFlag(value);
  });
}

/**
 * Creates a default feature flag configuration
 * 
 * @param {string} key - The feature flag key
 * @param {Partial<{name: string, description: string, enabled: boolean}>} options - Optional configuration
 * @returns {object} A valid feature flag configuration
 * 
 * @example
 * const flag = createFeatureFlag('new-ui', {
 *   name: 'New UI',
 *   description: 'Enable the new user interface',
 *   enabled: false
 * });
 */
export function createFeatureFlag(key, options = {}) {
  if (!isFeatureFlagKey(key)) {
    throw new Error(`Invalid feature flag key: ${key}`);
  }

  return {
    key,
    name: options.name || key,
    description: options.description || '',
    enabled: options.enabled ?? false
  };
}

/**
 * Validates feature flag dependencies
 * 
 * @param {string} key - The feature flag key
 * @param {Array<string>} dependencies - The dependencies to check
 * @param {Record<string, {enabled: boolean}>} flags - All feature flags
 * @returns {boolean} True if all dependencies are satisfied
 * 
 * @example
 * const canEnable = validateDependencies('new-ui', ['gpu-acceleration'], flags);
 */
export function validateDependencies(key, dependencies, flags) {
  if (!dependencies || dependencies.length === 0) {
    return true;
  }

  return dependencies.every(dep => {
    if (!isFeatureFlagKey(dep)) {
      console.warn(`Invalid dependency key: ${dep} for flag: ${key}`);
      return false;
    }

    const depFlag = flags[dep];
    return depFlag && depFlag.enabled === true;
  });
}

/**
 * Checks if a feature should be enabled based on rollout percentage
 * 
 * @param {number} rolloutPercentage - Rollout percentage (0-100)
 * @param {string} userId - User identifier for consistent hashing
 * @returns {boolean} True if the feature should be enabled for this user
 * 
 * @example
 * const shouldEnable = shouldRollout(50, 'user-123');
 */
export function shouldRollout(rolloutPercentage, userId) {
  if (rolloutPercentage >= 100) {
    return true;
  }

  if (rolloutPercentage <= 0) {
    return false;
  }

  // Simple hash function for consistent rollout
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  const percentage = Math.abs(hash % 100);
  return percentage < rolloutPercentage;
}

/**
 * Gets all valid feature flag keys
 * 
 * @returns {ReadonlyArray<string>} Array of valid feature flag keys
 * 
 * @example
 * const keys = getValidFlagKeys();
 * console.log(keys); // ['new-ui', 'advanced-audio', ...]
 */
export function getValidFlagKeys() {
  return VALID_FLAG_KEYS;
}