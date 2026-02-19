/**
 * @fileoverview Gradual Rollout Engine - Percentage-based feature rollout
 * @module utils/rollout-engine
 * 
 * Implements consistent user bucketing for gradual feature rollouts.
 * Uses deterministic hashing to ensure users stay in same bucket across sessions.
 * 
 * Performance: O(1) bucket assignment, <1ms per check
 * Memory: <1KB for rollout state
 * 
 * @see {@link ../DESIGN_SYSTEM.md#gradual-rollout}
 */

/**
 * @typedef {Object} RolloutConfig
 * @property {number} percentage - Rollout percentage (0-100)
 * @property {string} [seed] - Optional seed for deterministic bucketing
 * @property {string[]} [includedUsers] - Users always included regardless of percentage
 * @property {string[]} [excludedUsers] - Users always excluded regardless of percentage
 * @property {Date|string} [startDate] - Optional rollout start date
 * @property {Date|string} [endDate] - Optional rollout end date
 */

/**
 * @typedef {Object} RolloutResult
 * @property {boolean} enabled - Whether feature is enabled for this user
 * @property {string} reason - Reason for the decision
 * @property {number} bucket - User's bucket number (0-99)
 * @property {number} threshold - Rollout threshold
 */

/**
 * Simple hash function for consistent user bucketing
 * Uses FNV-1a algorithm for deterministic hashing
 * 
 * @param {string} str - String to hash
 * @returns {number} Hash value
 * @private
 */
function hashString(str) {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Assigns user to a bucket (0-99) based on userId and feature key
 * Uses deterministic hashing to ensure consistency across sessions
 * 
 * @param {string} userId - User identifier
 * @param {string} featureKey - Feature flag key
 * @param {string} [seed=''] - Optional seed for bucket assignment
 * @returns {number} Bucket number (0-99)
 * 
 * @example
 * const bucket = getUserBucket('user123', 'new-editor', 'v1');
 * // Returns consistent bucket for this user+feature+seed combination
 */
export function getUserBucket(userId, featureKey, seed = '') {
  const combinedKey = `${userId}:${featureKey}:${seed}`;
  const hash = hashString(combinedKey);
  return hash % 100;
}

/**
 * Checks if rollout is currently active based on date range
 * 
 * @param {Date|string} [startDate] - Rollout start date
 * @param {Date|string} [endDate] - Rollout end date
 * @returns {boolean} Whether rollout is active
 * @private
 */
function isRolloutActive(startDate, endDate) {
  const now = new Date();
  
  if (startDate) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    if (now < start) {
      return false;
    }
  }
  
  if (endDate) {
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    if (now > end) {
      return false;
    }
  }
  
  return true;
}

/**
 * Evaluates whether a feature should be enabled for a user based on rollout config
 * 
 * @param {string} userId - User identifier
 * @param {string} featureKey - Feature flag key
 * @param {RolloutConfig} config - Rollout configuration
 * @returns {RolloutResult} Rollout evaluation result
 * 
 * @example
 * const result = evaluateRollout('user123', 'new-editor', {
 *   percentage: 25,
 *   seed: 'v1',
 *   includedUsers: ['admin@example.com']
 * });
 * 
 * if (result.enabled) {
 *   console.log(`Feature enabled: ${result.reason}`);
 * }
 */
export function evaluateRollout(userId, featureKey, config) {
  const {
    percentage = 0,
    seed = '',
    includedUsers = [],
    excludedUsers = [],
    startDate,
    endDate
  } = config;

  // Validate percentage
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));

  // Check date range
  if (!isRolloutActive(startDate, endDate)) {
    return {
      enabled: false,
      reason: 'Rollout not active (outside date range)',
      bucket: 0,
      threshold: normalizedPercentage
    };
  }

  // Check explicit exclusions first
  if (excludedUsers.includes(userId)) {
    return {
      enabled: false,
      reason: 'User explicitly excluded',
      bucket: 0,
      threshold: normalizedPercentage
    };
  }

  // Check explicit inclusions
  if (includedUsers.includes(userId)) {
    return {
      enabled: true,
      reason: 'User explicitly included',
      bucket: 0,
      threshold: normalizedPercentage
    };
  }

  // 0% rollout - disabled for everyone
  if (normalizedPercentage === 0) {
    return {
      enabled: false,
      reason: 'Rollout at 0%',
      bucket: 0,
      threshold: 0
    };
  }

  // 100% rollout - enabled for everyone
  if (normalizedPercentage === 100) {
    return {
      enabled: true,
      reason: 'Rollout at 100%',
      bucket: 0,
      threshold: 100
    };
  }

  // Percentage-based bucketing
  const bucket = getUserBucket(userId, featureKey, seed);
  const enabled = bucket < normalizedPercentage;

  return {
    enabled,
    reason: enabled 
      ? `User in rollout bucket (${bucket} < ${normalizedPercentage})` 
      : `User not in rollout bucket (${bucket} >= ${normalizedPercentage})`,
    bucket,
    threshold: normalizedPercentage
  };
}

/**
 * RolloutEngine class for managing multiple feature rollouts
 * Provides caching and batch evaluation capabilities
 */
export class RolloutEngine {
  constructor() {
    /** @type {Map<string, RolloutConfig>} */
    this.rolloutConfigs = new Map();
    
    /** @type {Map<string, Map<string, RolloutResult>>} */
    this.resultCache = new Map();
  }

  /**
   * Registers a rollout configuration for a feature
   * 
   * @param {string} featureKey - Feature flag key
   * @param {RolloutConfig} config - Rollout configuration
   */
  registerRollout(featureKey, config) {
    this.rolloutConfigs.set(featureKey, config);
    // Clear cache for this feature
    this.resultCache.delete(featureKey);
  }

  /**
   * Evaluates rollout for a user, with caching
   * 
   * @param {string} userId - User identifier
   * @param {string} featureKey - Feature flag key
   * @returns {RolloutResult|null} Rollout result or null if no config exists
   */
  evaluate(userId, featureKey) {
    const config = this.rolloutConfigs.get(featureKey);
    if (!config) {
      return null;
    }

    // Check cache
    if (!this.resultCache.has(featureKey)) {
      this.resultCache.set(featureKey, new Map());
    }

    const featureCache = this.resultCache.get(featureKey);
    if (featureCache.has(userId)) {
      return featureCache.get(userId);
    }

    // Evaluate and cache
    const result = evaluateRollout(userId, featureKey, config);
    featureCache.set(userId, result);

    return result;
  }

  /**
   * Clears cached results (e.g., when rollout config changes)
   * 
   * @param {string} [featureKey] - Optional feature to clear, or all if omitted
   */
  clearCache(featureKey) {
    if (featureKey) {
      this.resultCache.delete(featureKey);
    } else {
      this.resultCache.clear();
    }
  }

  /**
   * Gets current rollout statistics for a feature
   * 
   * @param {string} featureKey - Feature flag key
   * @returns {Object} Rollout statistics
   */
  getStats(featureKey) {
    const config = this.rolloutConfigs.get(featureKey);
    if (!config) {
      return null;
    }

    const featureCache = this.resultCache.get(featureKey);
    const cachedResults = featureCache ? Array.from(featureCache.values()) : [];

    const enabled = cachedResults.filter(r => r.enabled).length;
    const total = cachedResults.length;

    return {
      featureKey,
      configuredPercentage: config.percentage,
      totalEvaluations: total,
      enabledCount: enabled,
      actualPercentage: total > 0 ? (enabled / total) * 100 : 0,
      includedUsers: config.includedUsers?.length || 0,
      excludedUsers: config.excludedUsers?.length || 0,
      isActive: isRolloutActive(config.startDate, config.endDate)
    };
  }

  /**
   * Gets all registered rollout configurations
   * 
   * @returns {Array<{featureKey: string, config: RolloutConfig}>}
   */
  getAllRollouts() {
    return Array.from(this.rolloutConfigs.entries()).map(([featureKey, config]) => ({
      featureKey,
      config
    }));
  }
}

// Global rollout engine instance
let globalRolloutEngine = null;

/**
 * Gets or creates the global rollout engine instance
 * 
 * @returns {RolloutEngine}
 */
export function getRolloutEngine() {
  if (!globalRolloutEngine) {
    globalRolloutEngine = new RolloutEngine();
  }
  return globalRolloutEngine;
}