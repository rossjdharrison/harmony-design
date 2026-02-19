/**
 * @fileoverview useExperiment Hook - Hook to get variant and track exposure
 * @module hooks/use-experiment
 * 
 * Provides a composable hook for experiment variant assignment and exposure tracking.
 * Integrates with ExperimentContext and EventBus for proper event-driven architecture.
 * 
 * @see {@link ../contexts/experiment-context.js} for ExperimentContext implementation
 * @see {@link ../DESIGN_SYSTEM.md#experiment-system} for experiment system documentation
 */

/**
 * @typedef {Object} ExperimentVariant
 * @property {string} experimentId - Unique identifier for the experiment
 * @property {string} variant - Assigned variant name (e.g., 'control', 'treatment')
 * @property {boolean} isControl - Whether this is the control variant
 * @property {Object.<string, any>} config - Variant-specific configuration
 */

/**
 * @typedef {Object} ExperimentHookResult
 * @property {string} variant - The assigned variant name
 * @property {boolean} isControl - Whether the user is in the control group
 * @property {boolean} isLoading - Whether variant assignment is in progress
 * @property {Error|null} error - Any error that occurred during assignment
 * @property {Object.<string, any>} config - Variant-specific configuration
 * @property {Function} trackExposure - Function to manually track exposure
 */

/**
 * Custom hook for experiment variant assignment and exposure tracking.
 * 
 * This hook:
 * 1. Retrieves the assigned variant for a given experiment
 * 2. Automatically tracks exposure on first render (optional)
 * 3. Provides variant configuration and metadata
 * 4. Publishes events through EventBus for analytics
 * 
 * Performance: <1ms variant lookup, no blocking operations
 * 
 * @param {string} experimentId - Unique identifier for the experiment
 * @param {Object} options - Configuration options
 * @param {boolean} [options.autoTrack=true] - Automatically track exposure on mount
 * @param {Object.<string, any>} [options.defaultConfig={}] - Default config if experiment not found
 * @param {string} [options.defaultVariant='control'] - Default variant if assignment fails
 * @param {Function} [options.onVariantAssigned] - Callback when variant is assigned
 * @param {Function} [options.onExposureTracked] - Callback when exposure is tracked
 * @returns {ExperimentHookResult} Experiment variant and tracking utilities
 * 
 * @example
 * // Basic usage with auto-tracking
 * const { variant, isControl } = useExperiment('new-ui-test');
 * if (variant === 'treatment') {
 *   // Show new UI
 * }
 * 
 * @example
 * // Manual exposure tracking
 * const { variant, trackExposure } = useExperiment('feature-gate', {
 *   autoTrack: false
 * });
 * // Track exposure only when feature is actually used
 * function onFeatureActivated() {
 *   trackExposure();
 *   // ... feature logic
 * }
 * 
 * @example
 * // With configuration
 * const { variant, config } = useExperiment('button-color-test');
 * const buttonColor = config.color || '#0066cc';
 */
export function useExperiment(experimentId, options = {}) {
  const {
    autoTrack = true,
    defaultConfig = {},
    defaultVariant = 'control',
    onVariantAssigned = null,
    onExposureTracked = null
  } = options;

  // State management (using vanilla JS pattern, no React)
  const state = {
    variant: defaultVariant,
    isControl: true,
    isLoading: true,
    error: null,
    config: defaultConfig,
    exposureTracked: false
  };

  /**
   * Gets the experiment context from the global registry.
   * @private
   * @returns {Object|null} ExperimentContext instance or null
   */
  function getExperimentContext() {
    if (typeof window === 'undefined') {
      return null;
    }
    
    // Check for global experiment context
    return window.__HARMONY_EXPERIMENT_CONTEXT__ || null;
  }

  /**
   * Gets the EventBus instance for publishing events.
   * @private
   * @returns {Object|null} EventBus instance or null
   */
  function getEventBus() {
    if (typeof window === 'undefined') {
      return null;
    }
    
    return window.__HARMONY_EVENT_BUS__ || null;
  }

  /**
   * Publishes an event through the EventBus.
   * @private
   * @param {string} eventType - Type of event to publish
   * @param {Object} payload - Event payload
   */
  function publishEvent(eventType, payload) {
    const eventBus = getEventBus();
    if (eventBus && typeof eventBus.publish === 'function') {
      try {
        eventBus.publish(eventType, {
          ...payload,
          timestamp: Date.now(),
          source: 'useExperiment'
        });
      } catch (error) {
        console.error(`[useExperiment] Failed to publish ${eventType}:`, error);
      }
    }
  }

  /**
   * Tracks exposure for the current experiment variant.
   * Publishes ExperimentExposure event through EventBus.
   * Idempotent - only tracks once per hook instance.
   * 
   * @returns {boolean} Whether exposure was successfully tracked
   */
  function trackExposure() {
    if (state.exposureTracked) {
      return true; // Already tracked
    }

    const context = getExperimentContext();
    if (!context) {
      console.warn(`[useExperiment] Cannot track exposure: ExperimentContext not available`);
      return false;
    }

    try {
      // Call context's trackExposure method
      if (typeof context.trackExposure === 'function') {
        context.trackExposure(experimentId);
      }

      // Publish event for analytics
      publishEvent('ExperimentExposure', {
        experimentId,
        variant: state.variant,
        isControl: state.isControl,
        config: state.config
      });

      state.exposureTracked = true;

      // Call callback if provided
      if (onExposureTracked) {
        onExposureTracked({
          experimentId,
          variant: state.variant,
          isControl: state.isControl
        });
      }

      return true;
    } catch (error) {
      console.error(`[useExperiment] Failed to track exposure for ${experimentId}:`, error);
      state.error = error;
      return false;
    }
  }

  /**
   * Initializes the hook by fetching variant assignment.
   * @private
   */
  function initialize() {
    const context = getExperimentContext();
    
    if (!context) {
      console.warn(`[useExperiment] ExperimentContext not available, using defaults`);
      state.isLoading = false;
      state.error = new Error('ExperimentContext not initialized');
      return;
    }

    try {
      // Get variant assignment from context
      const variantData = context.getVariant(experimentId);
      
      if (variantData) {
        state.variant = variantData.variant || defaultVariant;
        state.isControl = variantData.isControl !== undefined 
          ? variantData.isControl 
          : (state.variant === 'control');
        state.config = variantData.config || defaultConfig;
        state.error = null;

        // Publish variant assignment event
        publishEvent('ExperimentVariantAssigned', {
          experimentId,
          variant: state.variant,
          isControl: state.isControl,
          config: state.config
        });

        // Call callback if provided
        if (onVariantAssigned) {
          onVariantAssigned({
            experimentId,
            variant: state.variant,
            isControl: state.isControl,
            config: state.config
          });
        }

        // Auto-track exposure if enabled
        if (autoTrack) {
          // Use setTimeout to avoid blocking initialization
          setTimeout(() => trackExposure(), 0);
        }
      } else {
        console.warn(`[useExperiment] No variant found for experiment ${experimentId}, using defaults`);
        state.error = new Error(`Experiment ${experimentId} not found`);
      }
    } catch (error) {
      console.error(`[useExperiment] Error initializing experiment ${experimentId}:`, error);
      state.error = error;
    } finally {
      state.isLoading = false;
    }
  }

  // Initialize on creation
  initialize();

  // Return hook result
  return {
    variant: state.variant,
    isControl: state.isControl,
    isLoading: state.isLoading,
    error: state.error,
    config: state.config,
    trackExposure
  };
}

/**
 * Synchronous version of useExperiment for use in non-reactive contexts.
 * Does not auto-track exposure - caller must explicitly call trackExposure.
 * 
 * @param {string} experimentId - Unique identifier for the experiment
 * @param {Object} options - Configuration options (same as useExperiment)
 * @returns {ExperimentHookResult} Experiment variant and tracking utilities
 * 
 * @example
 * const { variant, trackExposure } = getExperimentVariant('feature-flag');
 * if (variant === 'enabled') {
 *   trackExposure();
 *   enableFeature();
 * }
 */
export function getExperimentVariant(experimentId, options = {}) {
  return useExperiment(experimentId, {
    ...options,
    autoTrack: false // Never auto-track in sync version
  });
}

/**
 * Helper function to check if an experiment variant matches expected value.
 * Useful for feature flags and simple A/B tests.
 * 
 * @param {string} experimentId - Unique identifier for the experiment
 * @param {string} expectedVariant - Variant name to check against
 * @param {Object} options - Configuration options
 * @param {boolean} [options.trackOnMatch=true] - Track exposure only if variant matches
 * @returns {boolean} Whether the variant matches the expected value
 * 
 * @example
 * if (isExperimentVariant('new-feature', 'enabled')) {
 *   // Show new feature
 * }
 */
export function isExperimentVariant(experimentId, expectedVariant, options = {}) {
  const { trackOnMatch = true } = options;
  
  const { variant, trackExposure } = useExperiment(experimentId, {
    autoTrack: false
  });
  
  const matches = variant === expectedVariant;
  
  if (matches && trackOnMatch) {
    trackExposure();
  }
  
  return matches;
}

/**
 * Helper function to get experiment config without variant assignment.
 * Useful when you only need configuration data.
 * 
 * @param {string} experimentId - Unique identifier for the experiment
 * @returns {Object.<string, any>} Experiment configuration
 * 
 * @example
 * const config = getExperimentConfig('ui-theme-test');
 * const primaryColor = config.primaryColor || '#0066cc';
 */
export function getExperimentConfig(experimentId) {
  const { config } = useExperiment(experimentId, {
    autoTrack: false
  });
  
  return config;
}