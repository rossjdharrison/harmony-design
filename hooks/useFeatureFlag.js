/**
 * @fileoverview useFeatureFlag Hook - Check if feature is enabled
 * @module hooks/useFeatureFlag
 * 
 * Provides a hook to check feature flag status from FeatureFlagContext.
 * Integrates with environment-specific overrides and runtime toggles.
 * 
 * @see {@link file://./contexts/FeatureFlagContext.js} - Feature flag context provider
 * @see {@link file://../DESIGN_SYSTEM.md#feature-flags} - Feature flag documentation
 * 
 * @example
 * // Basic usage
 * const isEnabled = useFeatureFlag('new-mixer-ui');
 * if (isEnabled) {
 *   // Render new UI
 * }
 * 
 * @example
 * // With fallback
 * const isEnabled = useFeatureFlag('experimental-feature', false);
 */

import { FeatureFlagContext } from '../contexts/FeatureFlagContext.js';

/**
 * Custom hook to check if a feature flag is enabled
 * 
 * Performance: O(1) lookup via Map
 * Memory: Minimal - returns boolean primitive
 * 
 * @param {string} featureKey - The feature flag key to check
 * @param {boolean} [defaultValue=false] - Default value if flag not found
 * @returns {boolean} True if feature is enabled, false otherwise
 * 
 * @throws {Error} If called outside FeatureFlagContext provider
 * @throws {TypeError} If featureKey is not a string
 * 
 * @example
 * const NewFeature = () => {
 *   const isEnabled = useFeatureFlag('new-feature');
 *   
 *   return isEnabled 
 *     ? html`<new-feature-component></new-feature-component>`
 *     : html`<legacy-feature-component></legacy-feature-component>`;
 * };
 */
export function useFeatureFlag(featureKey, defaultValue = false) {
  // Type validation
  if (typeof featureKey !== 'string') {
    throw new TypeError(
      `useFeatureFlag: featureKey must be a string, got ${typeof featureKey}`
    );
  }

  if (featureKey.trim() === '') {
    throw new TypeError('useFeatureFlag: featureKey cannot be empty');
  }

  // Get context - this will throw if not within provider
  const context = FeatureFlagContext.use();

  if (!context) {
    throw new Error(
      'useFeatureFlag must be used within a FeatureFlagContext.Provider. ' +
      'Wrap your component tree with <feature-flag-provider>.'
    );
  }

  // Check if feature exists in context
  const isEnabled = context.isEnabled(featureKey);

  // If feature not found and default provided, use default
  if (isEnabled === undefined) {
    console.warn(
      `useFeatureFlag: Feature flag "${featureKey}" not found. ` +
      `Using default value: ${defaultValue}`
    );
    return defaultValue;
  }

  return isEnabled;
}

/**
 * Hook to get all feature flags
 * Useful for debugging or feature flag management UIs
 * 
 * @returns {Map<string, boolean>} Map of all feature flags and their states
 * 
 * @throws {Error} If called outside FeatureFlagContext provider
 * 
 * @example
 * const FeatureFlagDebugger = () => {
 *   const allFlags = useAllFeatureFlags();
 *   
 *   return html`
 *     <ul>
 *       ${Array.from(allFlags.entries()).map(([key, value]) => html`
 *         <li>${key}: ${value}</li>
 *       `)}
 *     </ul>
 *   `;
 * };
 */
export function useAllFeatureFlags() {
  const context = FeatureFlagContext.use();

  if (!context) {
    throw new Error(
      'useAllFeatureFlags must be used within a FeatureFlagContext.Provider'
    );
  }

  return context.getAllFlags();
}

/**
 * Hook to toggle a feature flag at runtime
 * Useful for development and testing
 * 
 * @returns {Function} Toggle function (featureKey: string, enabled: boolean) => void
 * 
 * @throws {Error} If called outside FeatureFlagContext provider
 * 
 * @example
 * const FeatureFlagToggle = () => {
 *   const toggleFlag = useFeatureFlagToggle();
 *   
 *   return html`
 *     <button @click=${() => toggleFlag('new-feature', true)}>
 *       Enable New Feature
 *     </button>
 *   `;
 * };
 */
export function useFeatureFlagToggle() {
  const context = FeatureFlagContext.use();

  if (!context) {
    throw new Error(
      'useFeatureFlagToggle must be used within a FeatureFlagContext.Provider'
    );
  }

  return context.toggleFlag.bind(context);
}

/**
 * Hook to check multiple feature flags at once
 * Returns true only if ALL flags are enabled
 * 
 * Performance: O(n) where n is number of flags
 * 
 * @param {...string} featureKeys - Feature flag keys to check
 * @returns {boolean} True if all features are enabled
 * 
 * @example
 * const isFullyEnabled = useFeatureFlags('feature-a', 'feature-b', 'feature-c');
 * if (isFullyEnabled) {
 *   // All features are enabled
 * }
 */
export function useFeatureFlags(...featureKeys) {
  const context = FeatureFlagContext.use();

  if (!context) {
    throw new Error(
      'useFeatureFlags must be used within a FeatureFlagContext.Provider'
    );
  }

  return featureKeys.every(key => context.isEnabled(key) === true);
}

/**
 * Hook to check if ANY of the provided feature flags are enabled
 * Returns true if at least one flag is enabled
 * 
 * Performance: O(n) where n is number of flags (short-circuits on first true)
 * 
 * @param {...string} featureKeys - Feature flag keys to check
 * @returns {boolean} True if any feature is enabled
 * 
 * @example
 * const hasAnyNewFeature = useAnyFeatureFlag('feature-a', 'feature-b');
 * if (hasAnyNewFeature) {
 *   // At least one feature is enabled
 * }
 */
export function useAnyFeatureFlag(...featureKeys) {
  const context = FeatureFlagContext.use();

  if (!context) {
    throw new Error(
      'useAnyFeatureFlag must be used within a FeatureFlagContext.Provider'
    );
  }

  return featureKeys.some(key => context.isEnabled(key) === true);
}