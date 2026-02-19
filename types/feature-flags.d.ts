/**
 * Feature Flag Type Definitions
 * 
 * Provides TypeScript types for feature flags with autocomplete support.
 * This enables type-safe feature flag usage across the codebase.
 * 
 * @module types/feature-flags
 * @see {@link file://./contexts/feature-flag-context.js} - Feature flag context implementation
 * @see {@link file://./hooks/use-feature-flag.js} - Feature flag hook
 * @see {@link file://./gates/feature-gate.js} - Feature gate component
 * @see {@link file://../DESIGN_SYSTEM.md#feature-flags} - Feature flag documentation
 */

/**
 * Available feature flag keys
 * Add new flags here to enable autocomplete throughout the codebase
 */
export type FeatureFlagKey =
  | 'new-ui'
  | 'advanced-audio'
  | 'gpu-acceleration'
  | 'experimental-waveform'
  | 'beta-collaboration'
  | 'debug-mode'
  | 'performance-metrics'
  | 'accessibility-enhancements';

/**
 * Feature flag configuration object
 */
export interface FeatureFlag {
  /** Unique identifier for the feature flag */
  key: FeatureFlagKey;
  /** Human-readable name */
  name: string;
  /** Description of what this flag controls */
  description: string;
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Environment where this flag applies (optional) */
  environment?: 'development' | 'staging' | 'production';
  /** Rollout percentage (0-100) for gradual rollouts */
  rolloutPercentage?: number;
  /** Dependencies - other flags that must be enabled */
  dependencies?: FeatureFlagKey[];
  /** Metadata for additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Feature flag configuration map
 * Maps flag keys to their configuration
 */
export type FeatureFlagConfig = Partial<Record<FeatureFlagKey, FeatureFlag>>;

/**
 * Feature flag context value
 */
export interface FeatureFlagContextValue {
  /** All feature flags */
  flags: FeatureFlagConfig;
  /** Check if a feature is enabled */
  isEnabled: (key: FeatureFlagKey) => boolean;
  /** Enable a feature flag */
  enable: (key: FeatureFlagKey) => void;
  /** Disable a feature flag */
  disable: (key: FeatureFlagKey) => void;
  /** Toggle a feature flag */
  toggle: (key: FeatureFlagKey) => void;
  /** Get flag configuration */
  getFlag: (key: FeatureFlagKey) => FeatureFlag | undefined;
  /** Update flag configuration */
  updateFlag: (key: FeatureFlagKey, updates: Partial<FeatureFlag>) => void;
}

/**
 * Feature gate component props
 */
export interface FeatureGateProps {
  /** Feature flag key to check */
  feature: FeatureFlagKey;
  /** Fallback content when feature is disabled */
  fallback?: string;
  /** Whether to show fallback content */
  showFallback?: boolean;
}

/**
 * Feature flag hook return type
 */
export interface UseFeatureFlagReturn {
  /** Whether the feature is enabled */
  isEnabled: boolean;
  /** Feature flag configuration */
  flag: FeatureFlag | undefined;
  /** Enable the feature */
  enable: () => void;
  /** Disable the feature */
  disable: () => void;
  /** Toggle the feature */
  toggle: () => void;
}

/**
 * Feature flag event payload
 */
export interface FeatureFlagEvent {
  /** Event type */
  type: 'feature-flag-changed' | 'feature-flag-enabled' | 'feature-flag-disabled';
  /** Flag key that changed */
  key: FeatureFlagKey;
  /** New enabled state */
  enabled: boolean;
  /** Previous enabled state */
  previousEnabled?: boolean;
  /** Timestamp of the change */
  timestamp: number;
}

/**
 * Feature flag storage interface
 */
export interface FeatureFlagStorage {
  /** Load flags from storage */
  load: () => Promise<FeatureFlagConfig>;
  /** Save flags to storage */
  save: (flags: FeatureFlagConfig) => Promise<void>;
  /** Clear all stored flags */
  clear: () => Promise<void>;
}

/**
 * Feature flag override for testing
 */
export interface FeatureFlagOverride {
  /** Flag key to override */
  key: FeatureFlagKey;
  /** Override value */
  enabled: boolean;
  /** Expiration time (optional) */
  expiresAt?: number;
}

/**
 * Feature flag analytics event
 */
export interface FeatureFlagAnalytics {
  /** Flag key */
  key: FeatureFlagKey;
  /** Action performed */
  action: 'viewed' | 'enabled' | 'disabled' | 'toggled';
  /** User ID (if available) */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Timestamp */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Type guard to check if a string is a valid feature flag key
 */
export function isFeatureFlagKey(key: string): key is FeatureFlagKey;

/**
 * Type guard to check if an object is a valid feature flag
 */
export function isFeatureFlag(obj: unknown): obj is FeatureFlag;