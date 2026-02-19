/**
 * @fileoverview Enhanced useExperiment Hook with Analytics Integration
 * @module components/experiment/use-experiment-with-analytics
 * 
 * Extends useExperiment to automatically track analytics events.
 * Drop-in replacement for use-experiment.js with built-in tracking.
 * 
 * @see DESIGN_SYSTEM.md#experiment-hooks
 */

import { getExperimentAnalytics } from './experiment-analytics.js';

/**
 * @typedef {Object} ExperimentHookResult
 * @property {string} variant - Assigned variant identifier
 * @property {boolean} isLoading - Whether experiment is still loading
 * @property {Error|null} error - Error if experiment failed to load
 * @property {Function} trackConversion - Track conversion for this experiment
 */

/**
 * Hook to get experiment variant and automatically track exposure
 * 
 * Automatically tracks exposure when variant is assigned.
 * Provides trackConversion helper for easy conversion tracking.
 * 
 * @param {string} experimentId - Experiment identifier
 * @param {Object} [options] - Hook options
 * @param {string} [options.userId] - User identifier (auto-generated if not provided)
 * @param {string} [options.defaultVariant='control'] - Default variant
 * @param {boolean} [options.trackExposure=true] - Auto-track exposure
 * @param {Object} [options.metadata] - Additional metadata for tracking
 * @returns {ExperimentHookResult}
 * 
 * @example
 * ```javascript
 * const { variant, trackConversion } = useExperiment('exp-001', {
 *   userId: 'user-123',
 *   metadata: { page: 'homepage' }
 * });
 * 
 * // Render based on variant
 * if (variant === 'variant-b') {
 *   // Show variant B
 * }
 * 
 * // Track conversion when user completes action
 * button.addEventListener('click', () => {
 *   trackConversion('click');
 * });
 * ```
 */
export function useExperiment(experimentId, options = {}) {
  const {
    userId = generateUserId(),
    defaultVariant = 'control',
    trackExposure = true,
    metadata = {}
  } = options;

  // State
  let variant = defaultVariant;
  let isLoading = true;
  let error = null;

  // Get analytics instance
  const analytics = getExperimentAnalytics();

  // Get experiment context if available
  const context = typeof window !== 'undefined' && window.experimentContext;

  if (context) {
    try {
      // Get variant from context
      variant = context.getVariant(experimentId, userId);
      isLoading = false;

      // Auto-track exposure if enabled
      if (trackExposure) {
        analytics.trackExposure(experimentId, variant, userId, {
          ...metadata,
          source: 'useExperiment',
          timestamp: Date.now()
        });
      }

    } catch (err) {
      console.error(`[useExperiment] Error loading experiment ${experimentId}:`, err);
      error = err;
      isLoading = false;
    }
  } else {
    console.warn('[useExperiment] ExperimentContext not available, using default variant');
    isLoading = false;
  }

  /**
   * Track conversion for this experiment
   * 
   * @param {string} conversionType - Type of conversion
   * @param {number} [value] - Optional numeric value
   * @param {Object} [conversionMetadata] - Additional metadata
   * @returns {boolean} True if tracked successfully
   */
  function trackConversion(conversionType, value = null, conversionMetadata = {}) {
    return analytics.trackConversion(
      experimentId,
      variant,
      userId,
      conversionType,
      value,
      {
        ...metadata,
        ...conversionMetadata,
        source: 'useExperiment'
      }
    );
  }

  return {
    variant,
    isLoading,
    error,
    trackConversion
  };
}

/**
 * Generate anonymous user ID
 * Uses sessionStorage to persist across page loads
 * 
 * @returns {string} User identifier
 */
function generateUserId() {
  if (typeof window === 'undefined') {
    return `user-${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    let userId = sessionStorage.getItem('experiment-user-id');
    if (!userId) {
      userId = `user-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('experiment-user-id', userId);
    }
    return userId;
  } catch {
    // Fallback if sessionStorage not available
    return `user-${Math.random().toString(36).substr(2, 9)}`;
  }
}