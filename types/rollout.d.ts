/**
 * @fileoverview TypeScript definitions for Gradual Rollout System
 * @see {@link ../DESIGN_SYSTEM.md#gradual-rollout}
 */

/**
 * Configuration for percentage-based feature rollout
 */
export interface RolloutConfig {
  /** Rollout percentage (0-100) */
  percentage: number;
  
  /** Optional seed for deterministic bucketing */
  seed?: string;
  
  /** Users always included regardless of percentage */
  includedUsers?: string[];
  
  /** Users always excluded regardless of percentage */
  excludedUsers?: string[];
  
  /** Optional rollout start date */
  startDate?: Date | string;
  
  /** Optional rollout end date */
  endDate?: Date | string;
}

/**
 * Result of rollout evaluation
 */
export interface RolloutResult {
  /** Whether feature is enabled for this user */
  enabled: boolean;
  
  /** Reason for the decision */
  reason: string;
  
  /** User's bucket number (0-99) */
  bucket: number;
  
  /** Rollout threshold */
  threshold: number;
}

/**
 * Statistics for a feature rollout
 */
export interface RolloutStats {
  /** Feature key */
  featureKey: string;
  
  /** Configured rollout percentage */
  configuredPercentage: number;
  
  /** Total number of evaluations */
  totalEvaluations: number;
  
  /** Number of enabled users */
  enabledCount: number;
  
  /** Actual percentage of enabled users */
  actualPercentage: number;
  
  /** Number of explicitly included users */
  includedUsers: number;
  
  /** Number of explicitly excluded users */
  excludedUsers: number;
  
  /** Whether rollout is currently active */
  isActive: boolean;
}

/**
 * Assigns user to a bucket (0-99) based on userId and feature key
 */
export function getUserBucket(
  userId: string,
  featureKey: string,
  seed?: string
): number;

/**
 * Evaluates whether a feature should be enabled for a user
 */
export function evaluateRollout(
  userId: string,
  featureKey: string,
  config: RolloutConfig
): RolloutResult;

/**
 * Engine for managing multiple feature rollouts
 */
export class RolloutEngine {
  constructor();
  
  /**
   * Registers a rollout configuration for a feature
   */
  registerRollout(featureKey: string, config: RolloutConfig): void;
  
  /**
   * Evaluates rollout for a user, with caching
   */
  evaluate(userId: string, featureKey: string): RolloutResult | null;
  
  /**
   * Clears cached results
   */
  clearCache(featureKey?: string): void;
  
  /**
   * Gets current rollout statistics for a feature
   */
  getStats(featureKey: string): RolloutStats | null;
  
  /**
   * Gets all registered rollout configurations
   */
  getAllRollouts(): Array<{
    featureKey: string;
    config: RolloutConfig;
  }>;
}

/**
 * Gets or creates the global rollout engine instance
 */
export function getRolloutEngine(): RolloutEngine;