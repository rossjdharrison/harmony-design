/**
 * @fileoverview Deterministic variant assignment based on user ID
 * Implements consistent hashing to ensure users always see the same variant
 * @module components/experiment/variant-assignment
 * @see DESIGN_SYSTEM.md#experimentation-framework
 */

/**
 * Simple hash function for deterministic variant assignment
 * Uses FNV-1a hash algorithm for consistent distribution
 * 
 * @param {string} str - Input string to hash
 * @returns {number} 32-bit hash value
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
 * Normalizes hash to a value between 0 and 1
 * 
 * @param {number} hash - Hash value
 * @returns {number} Normalized value between 0 and 1
 * @private
 */
function normalizeHash(hash) {
  return hash / 0xFFFFFFFF;
}

/**
 * Creates a deterministic seed from experiment ID and user ID
 * 
 * @param {string} experimentId - Unique experiment identifier
 * @param {string} userId - Unique user identifier
 * @returns {string} Combined seed string
 * @private
 */
function createSeed(experimentId, userId) {
  return `${experimentId}:${userId}`;
}

/**
 * Assigns a variant to a user deterministically based on their ID
 * Uses consistent hashing to ensure the same user always gets the same variant
 * 
 * @param {string} experimentId - Unique experiment identifier
 * @param {string} userId - Unique user identifier
 * @param {Array<{id: string, weight: number}>} variants - Array of variant configurations
 * @returns {string} Assigned variant ID
 * 
 * @example
 * const variants = [
 *   { id: 'control', weight: 0.5 },
 *   { id: 'variant-a', weight: 0.3 },
 *   { id: 'variant-b', weight: 0.2 }
 * ];
 * const variantId = assignVariant('exp-001', 'user-123', variants);
 * // Returns same variant for same experimentId + userId combination
 */
export function assignVariant(experimentId, userId, variants) {
  if (!experimentId || typeof experimentId !== 'string') {
    throw new Error('experimentId must be a non-empty string');
  }
  
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a non-empty string');
  }
  
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error('variants must be a non-empty array');
  }
  
  // Validate and normalize weights
  const totalWeight = variants.reduce((sum, v) => {
    if (typeof v.weight !== 'number' || v.weight < 0) {
      throw new Error(`Invalid weight for variant ${v.id}: must be a non-negative number`);
    }
    return sum + v.weight;
  }, 0);
  
  if (totalWeight === 0) {
    throw new Error('Total weight of all variants must be greater than 0');
  }
  
  // Create deterministic seed and hash it
  const seed = createSeed(experimentId, userId);
  const hash = hashString(seed);
  const normalized = normalizeHash(hash);
  
  // Map normalized hash to variant based on weights
  const threshold = normalized * totalWeight;
  let cumulative = 0;
  
  for (const variant of variants) {
    cumulative += variant.weight;
    if (threshold < cumulative) {
      return variant.id;
    }
  }
  
  // Fallback to last variant (handles floating point edge cases)
  return variants[variants.length - 1].id;
}

/**
 * Checks if a user is in the experiment based on traffic allocation
 * Uses deterministic hashing to ensure consistent enrollment
 * 
 * @param {string} experimentId - Unique experiment identifier
 * @param {string} userId - Unique user identifier
 * @param {number} trafficAllocation - Percentage of users to include (0-1)
 * @returns {boolean} True if user should be enrolled
 * 
 * @example
 * // Enroll 25% of users
 * const enrolled = isUserInExperiment('exp-001', 'user-123', 0.25);
 */
export function isUserInExperiment(experimentId, userId, trafficAllocation) {
  if (typeof trafficAllocation !== 'number' || trafficAllocation < 0 || trafficAllocation > 1) {
    throw new Error('trafficAllocation must be a number between 0 and 1');
  }
  
  // Use a different seed prefix to avoid correlation with variant assignment
  const seed = `enrollment:${createSeed(experimentId, userId)}`;
  const hash = hashString(seed);
  const normalized = normalizeHash(hash);
  
  return normalized < trafficAllocation;
}

/**
 * Gets the assigned variant for a user with traffic allocation
 * Combines enrollment check and variant assignment
 * 
 * @param {Object} config - Assignment configuration
 * @param {string} config.experimentId - Unique experiment identifier
 * @param {string} config.userId - Unique user identifier
 * @param {Array<{id: string, weight: number}>} config.variants - Variant configurations
 * @param {number} [config.trafficAllocation=1.0] - Percentage of users to include (0-1)
 * @param {string} [config.defaultVariant='control'] - Variant for users not in experiment
 * @returns {string} Assigned variant ID
 * 
 * @example
 * const variant = getVariantWithTraffic({
 *   experimentId: 'exp-001',
 *   userId: 'user-123',
 *   variants: [
 *     { id: 'control', weight: 0.5 },
 *     { id: 'treatment', weight: 0.5 }
 *   ],
 *   trafficAllocation: 0.25,
 *   defaultVariant: 'control'
 * });
 */
export function getVariantWithTraffic(config) {
  const {
    experimentId,
    userId,
    variants,
    trafficAllocation = 1.0,
    defaultVariant = 'control'
  } = config;
  
  // Check if user is enrolled in experiment
  if (!isUserInExperiment(experimentId, userId, trafficAllocation)) {
    return defaultVariant;
  }
  
  // Assign variant deterministically
  return assignVariant(experimentId, userId, variants);
}

/**
 * Validates that variant assignment is deterministic
 * Useful for testing and debugging
 * 
 * @param {string} experimentId - Unique experiment identifier
 * @param {string} userId - Unique user identifier
 * @param {Array<{id: string, weight: number}>} variants - Variant configurations
 * @param {number} [iterations=100] - Number of times to test consistency
 * @returns {boolean} True if assignment is consistent across iterations
 */
export function validateDeterminism(experimentId, userId, variants, iterations = 100) {
  const firstAssignment = assignVariant(experimentId, userId, variants);
  
  for (let i = 0; i < iterations; i++) {
    const assignment = assignVariant(experimentId, userId, variants);
    if (assignment !== firstAssignment) {
      return false;
    }
  }
  
  return true;
}

/**
 * Analyzes variant distribution for a set of user IDs
 * Useful for validating that weights are respected
 * 
 * @param {string} experimentId - Unique experiment identifier
 * @param {Array<string>} userIds - Array of user IDs to test
 * @param {Array<{id: string, weight: number}>} variants - Variant configurations
 * @returns {Object} Distribution statistics
 * 
 * @example
 * const stats = analyzeDistribution('exp-001', userIds, variants);
 * console.log(stats);
 * // {
 * //   control: { count: 500, percentage: 0.50 },
 * //   treatment: { count: 500, percentage: 0.50 }
 * // }
 */
export function analyzeDistribution(experimentId, userIds, variants) {
  const counts = {};
  
  // Initialize counts
  variants.forEach(v => {
    counts[v.id] = 0;
  });
  
  // Assign variants and count
  userIds.forEach(userId => {
    const variantId = assignVariant(experimentId, userId, variants);
    counts[variantId]++;
  });
  
  // Calculate percentages
  const total = userIds.length;
  const distribution = {};
  
  Object.entries(counts).forEach(([variantId, count]) => {
    distribution[variantId] = {
      count,
      percentage: count / total,
      expectedPercentage: variants.find(v => v.id === variantId)?.weight / 
        variants.reduce((sum, v) => sum + v.weight, 0)
    };
  });
  
  return distribution;
}