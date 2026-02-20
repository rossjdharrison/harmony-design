/**
 * @fileoverview Feature Flag Context - React context for feature flag state management
 * @module contexts/FeatureFlagContext
 * 
 * Provides centralized feature flag state management across the application.
 * Integrates with environment-specific configuration and provides hooks for
 * components to check feature availability.
 * 
 * @see {@link ../config/feature-flags.js} for flag definitions
 * @see {@link ../hooks/useFeatureFlag.js} for usage hook
 * @see {@link ../DESIGN_SYSTEM.md#feature-flags} for documentation
 * 
 * Performance Considerations:
 * - Context updates trigger re-renders only for consuming components
 * - Flag checks are O(1) Map lookups
 * - Memoized flag state to prevent unnecessary updates
 * 
 * @example
 * ```jsx
 * import { FeatureFlagProvider } from './contexts/FeatureFlagContext.jsx';
 * 
 * <FeatureFlagProvider initialFlags={{ newUI: true }}>
 *   <App />
 * </FeatureFlagProvider>
 * ```
 */

import { createContext, useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Feature flag context shape
 * @typedef {Object} FeatureFlagContextValue
 * @property {Map<string, boolean>} flags - Current feature flag states
 * @property {(flagName: string) => boolean} isEnabled - Check if flag is enabled
 * @property {(flagName: string, enabled: boolean) => void} setFlag - Update flag state
 * @property {(flags: Record<string, boolean>) => void} setFlags - Batch update flags
 * @property {() => void} reset - Reset to initial state
 */

/**
 * Feature Flag Context
 * @type {React.Context<FeatureFlagContextValue>}
 */
export const FeatureFlagContext = createContext(null);

/**
 * Feature Flag Provider Props
 * @typedef {Object} FeatureFlagProviderProps
 * @property {React.ReactNode} children - Child components
 * @property {Record<string, boolean>} [initialFlags={}] - Initial flag states
 * @property {boolean} [persistToStorage=true] - Whether to persist flags to localStorage
 * @property {string} [storageKey='harmony:feature-flags'] - localStorage key
 */

/**
 * Feature Flag Provider Component
 * 
 * Manages feature flag state and provides context to child components.
 * Optionally persists flag state to localStorage for development testing.
 * 
 * @param {FeatureFlagProviderProps} props
 * @returns {JSX.Element}
 * 
 * @example
 * ```jsx
 * <FeatureFlagProvider 
 *   initialFlags={{ 
 *     webGPU: true,
 *     newEditor: false 
 *   }}
 *   persistToStorage={true}
 * >
 *   <App />
 * </FeatureFlagProvider>
 * ```
 */
export function FeatureFlagProvider({ 
  children, 
  initialFlags = {},
  persistToStorage = true,
  storageKey = 'harmony:feature-flags'
}) {
  // Load persisted flags from storage on mount
  const loadPersistedFlags = useCallback(() => {
    if (!persistToStorage || typeof window === 'undefined') {
      return initialFlags;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...initialFlags, ...parsed };
      }
    } catch (error) {
      console.warn('[FeatureFlagContext] Failed to load persisted flags:', error);
    }

    return initialFlags;
  }, [initialFlags, persistToStorage, storageKey]);

  // Initialize flag state as Map for O(1) lookups
  const [flags, setFlagsState] = useState(() => {
    const loaded = loadPersistedFlags();
    return new Map(Object.entries(loaded));
  });

  // Persist flags to storage when they change
  useEffect(() => {
    if (!persistToStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const flagsObject = Object.fromEntries(flags);
      localStorage.setItem(storageKey, JSON.stringify(flagsObject));
    } catch (error) {
      console.warn('[FeatureFlagContext] Failed to persist flags:', error);
    }
  }, [flags, persistToStorage, storageKey]);

  /**
   * Check if a feature flag is enabled
   * @param {string} flagName - Name of the feature flag
   * @returns {boolean} True if enabled, false otherwise
   */
  const isEnabled = useCallback((flagName) => {
    return flags.get(flagName) === true;
  }, [flags]);

  /**
   * Set a single feature flag
   * @param {string} flagName - Name of the feature flag
   * @param {boolean} enabled - Whether the flag should be enabled
   */
  const setFlag = useCallback((flagName, enabled) => {
    setFlagsState(prevFlags => {
      const newFlags = new Map(prevFlags);
      newFlags.set(flagName, Boolean(enabled));
      return newFlags;
    });
  }, []);

  /**
   * Batch update multiple feature flags
   * @param {Record<string, boolean>} newFlags - Object of flag names to values
   */
  const setFlags = useCallback((newFlags) => {
    setFlagsState(prevFlags => {
      const updatedFlags = new Map(prevFlags);
      Object.entries(newFlags).forEach(([name, value]) => {
        updatedFlags.set(name, Boolean(value));
      });
      return updatedFlags;
    });
  }, []);

  /**
   * Reset flags to initial state
   */
  const reset = useCallback(() => {
    const loaded = loadPersistedFlags();
    setFlagsState(new Map(Object.entries(loaded)));
  }, [loadPersistedFlags]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    flags,
    isEnabled,
    setFlag,
    setFlags,
    reset
  }), [flags, isEnabled, setFlag, setFlags, reset]);

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook to access feature flag context
 * @returns {FeatureFlagContextValue}
 * @throws {Error} If used outside FeatureFlagProvider
 * 
 * @example
 * ```jsx
 * function MyComponent() {
 *   const { isEnabled } = useFeatureFlagContext();
 *   
 *   if (isEnabled('newUI')) {
 *     return <NewUI />;
 *   }
 *   return <OldUI />;
 * }
 * ```
 */
export function useFeatureFlagContext() {
  const context = useContext(FeatureFlagContext);
  
  if (!context) {
    throw new Error(
      '[FeatureFlagContext] useFeatureFlagContext must be used within a FeatureFlagProvider'
    );
  }
  
  return context;
}

// Re-export for convenience
import { useContext } from 'react';
export { FeatureFlagContext as default };