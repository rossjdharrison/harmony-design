/**
 * @fileoverview TypeScript type definitions for the Harmony Design System experiment framework.
 * @module types/experiment
 * @see {@link file://./DESIGN_SYSTEM.md#experiment-system Experiment System Documentation}
 */

/**
 * Unique identifier for an experiment
 */
export type ExperimentId = string;

/**
 * Unique identifier for a variant within an experiment
 */
export type VariantId = string;

/**
 * Unique identifier for a metric
 */
export type MetricId = string;

/**
 * User identifier for experiment assignment
 */
export type UserId = string;

/**
 * Timestamp in milliseconds since epoch
 */
export type Timestamp = number;

/**
 * Traffic allocation percentage (0-100)
 */
export type TrafficAllocation = number;

/**
 * Experiment status lifecycle states
 */
export type ExperimentStatus = 
  | 'draft'      // Being configured, not running
  | 'scheduled'  // Scheduled to start
  | 'running'    // Currently active
  | 'paused'     // Temporarily stopped
  | 'completed'  // Finished successfully
  | 'archived';  // Historical record

/**
 * Metric types for measurement
 */
export type MetricType =
  | 'counter'      // Simple count (clicks, views)
  | 'gauge'        // Current value (active users)
  | 'histogram'    // Distribution (load times)
  | 'rate'         // Events per time unit
  | 'conversion';  // Binary success/failure

/**
 * Statistical significance test types
 */
export type SignificanceTest =
  | 'ttest'        // T-test for continuous metrics
  | 'chi-square'   // Chi-square for categorical
  | 'mann-whitney' // Non-parametric alternative
  | 'bayesian';    // Bayesian inference

/**
 * A single variant in an experiment
 */
export interface ExperimentVariant {
  /** Unique identifier for this variant */
  id: VariantId;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description of what this variant does */
  description?: string;
  
  /** Percentage of traffic allocated to this variant (0-100) */
  allocation: TrafficAllocation;
  
  /** Whether this is the control/baseline variant */
  isControl: boolean;
  
  /** Configuration payload for this variant */
  config: Record<string, unknown>;
  
  /** Optional feature flags enabled for this variant */
  features?: string[];
}

/**
 * Metric definition for experiment measurement
 */
export interface ExperimentMetric {
  /** Unique identifier for this metric */
  id: MetricId;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description */
  description?: string;
  
  /** Type of metric */
  type: MetricType;
  
  /** Whether this is the primary success metric */
  isPrimary: boolean;
  
  /** Unit of measurement (e.g., 'ms', 'clicks', '%') */
  unit?: string;
  
  /** Target value or threshold for success */
  target?: number;
  
  /** Statistical test to use for analysis */
  significanceTest?: SignificanceTest;
  
  /** Minimum sample size needed for valid results */
  minSampleSize?: number;
  
  /** Custom aggregation function name */
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'p50' | 'p95' | 'p99';
}

/**
 * Complete experiment configuration
 */
export interface Experiment {
  /** Unique identifier for this experiment */
  id: ExperimentId;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description of experiment hypothesis and goals */
  description?: string;
  
  /** Current status */
  status: ExperimentStatus;
  
  /** All variants in this experiment (must include one control) */
  variants: ExperimentVariant[];
  
  /** Metrics being tracked */
  metrics: ExperimentMetric[];
  
  /** When the experiment starts (null = immediate) */
  startDate?: Timestamp | null;
  
  /** When the experiment ends (null = manual stop) */
  endDate?: Timestamp | null;
  
  /** Percentage of total traffic included (0-100) */
  trafficAllocation: TrafficAllocation;
  
  /** Targeting rules for user inclusion */
  targeting?: ExperimentTargeting;
  
  /** Metadata for tracking and organization */
  metadata?: ExperimentMetadata;
  
  /** Creation timestamp */
  createdAt: Timestamp;
  
  /** Last update timestamp */
  updatedAt: Timestamp;
  
  /** User who created the experiment */
  createdBy?: string;
}

/**
 * Targeting rules for experiment inclusion
 */
export interface ExperimentTargeting {
  /** Include only these user segments */
  includeSegments?: string[];
  
  /** Exclude these user segments */
  excludeSegments?: string[];
  
  /** Custom attribute filters */
  attributes?: Record<string, unknown>;
  
  /** Geographic targeting */
  geo?: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
  };
  
  /** Device targeting */
  device?: {
    types?: ('mobile' | 'tablet' | 'desktop')[];
    os?: string[];
    browsers?: string[];
  };
  
  /** Time-based targeting */
  schedule?: {
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    hoursOfDay?: number[]; // 0-23
    timezone?: string;
  };
}

/**
 * Experiment metadata for organization
 */
export interface ExperimentMetadata {
  /** Tags for categorization */
  tags?: string[];
  
  /** Team or department owning this experiment */
  owner?: string;
  
  /** Related experiment IDs */
  relatedExperiments?: ExperimentId[];
  
  /** Links to design docs, tickets, etc. */
  links?: {
    title: string;
    url: string;
  }[];
  
  /** Custom key-value pairs */
  custom?: Record<string, unknown>;
}

/**
 * User assignment to an experiment variant
 */
export interface ExperimentAssignment {
  /** Experiment ID */
  experimentId: ExperimentId;
  
  /** User ID */
  userId: UserId;
  
  /** Assigned variant ID */
  variantId: VariantId;
  
  /** When the assignment was made */
  assignedAt: Timestamp;
  
  /** Whether exposure has been tracked */
  exposureTracked: boolean;
  
  /** When exposure was first tracked */
  exposureTrackedAt?: Timestamp;
  
  /** Session ID when assigned */
  sessionId?: string;
  
  /** Whether this was a forced assignment (override) */
  forced?: boolean;
}

/**
 * Exposure event when user sees experiment variant
 */
export interface ExperimentExposure {
  /** Experiment ID */
  experimentId: ExperimentId;
  
  /** User ID */
  userId: UserId;
  
  /** Variant ID shown */
  variantId: VariantId;
  
  /** When exposure occurred */
  timestamp: Timestamp;
  
  /** Session ID */
  sessionId?: string;
  
  /** Page or component where exposure occurred */
  context?: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Metric event for experiment measurement
 */
export interface MetricEvent {
  /** Experiment ID */
  experimentId: ExperimentId;
  
  /** User ID */
  userId: UserId;
  
  /** Variant ID user is in */
  variantId: VariantId;
  
  /** Metric being recorded */
  metricId: MetricId;
  
  /** Metric value */
  value: number;
  
  /** When event occurred */
  timestamp: Timestamp;
  
  /** Session ID */
  sessionId?: string;
  
  /** Additional context */
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated results for a variant
 */
export interface VariantResults {
  /** Variant ID */
  variantId: VariantId;
  
  /** Number of users assigned */
  sampleSize: number;
  
  /** Number of exposures tracked */
  exposures: number;
  
  /** Metric results */
  metrics: {
    [metricId: MetricId]: MetricResults;
  };
}

/**
 * Statistical results for a metric
 */
export interface MetricResults {
  /** Metric ID */
  metricId: MetricId;
  
  /** Mean value */
  mean: number;
  
  /** Standard deviation */
  stdDev: number;
  
  /** Median value */
  median?: number;
  
  /** Percentile values */
  percentiles?: {
    p50?: number;
    p75?: number;
    p90?: number;
    p95?: number;
    p99?: number;
  };
  
  /** Total count of events */
  count: number;
  
  /** Sum of all values */
  sum: number;
  
  /** Minimum value */
  min?: number;
  
  /** Maximum value */
  max?: number;
  
  /** Confidence interval */
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number; // e.g., 0.95 for 95%
  };
}

/**
 * Comparison between control and treatment variant
 */
export interface VariantComparison {
  /** Control variant ID */
  controlVariantId: VariantId;
  
  /** Treatment variant ID */
  treatmentVariantId: VariantId;
  
  /** Metric being compared */
  metricId: MetricId;
  
  /** Relative lift (percentage change from control) */
  lift: number;
  
  /** Absolute difference */
  absoluteDifference: number;
  
  /** Statistical significance (p-value) */
  pValue: number;
  
  /** Whether result is statistically significant */
  isSignificant: boolean;
  
  /** Confidence level used */
  confidenceLevel: number;
  
  /** Test statistic value */
  testStatistic?: number;
  
  /** Degrees of freedom (for t-test) */
  degreesOfFreedom?: number;
}

/**
 * Complete experiment results
 */
export interface ExperimentResults {
  /** Experiment ID */
  experimentId: ExperimentId;
  
  /** When results were calculated */
  calculatedAt: Timestamp;
  
  /** Results for each variant */
  variantResults: VariantResults[];
  
  /** Pairwise comparisons between variants */
  comparisons: VariantComparison[];
  
  /** Overall experiment health indicators */
  health: {
    /** Sample size adequacy */
    sampleSizeAdequate: boolean;
    
    /** Data quality score (0-1) */
    dataQuality: number;
    
    /** Any warnings or issues */
    warnings?: string[];
  };
  
  /** Recommended action */
  recommendation?: 'continue' | 'stop-winner' | 'stop-no-effect' | 'needs-more-data';
}

/**
 * Configuration for experiment analytics
 */
export interface ExperimentAnalyticsConfig {
  /** Default confidence level for significance tests */
  defaultConfidenceLevel: number;
  
  /** Minimum sample size per variant */
  minSampleSize: number;
  
  /** Maximum duration in days before auto-stop */
  maxDuration?: number;
  
  /** Enable automatic winner selection */
  autoWinner?: boolean;
  
  /** P-value threshold for significance */
  significanceThreshold: number;
  
  /** Minimum detectable effect size */
  minEffect?: number;
}

/**
 * Experiment override for testing
 */
export interface ExperimentOverride {
  /** Experiment ID */
  experimentId: ExperimentId;
  
  /** Forced variant ID */
  variantId: VariantId;
  
  /** User ID to override (optional, for specific user) */
  userId?: UserId;
  
  /** Expiration timestamp */
  expiresAt?: Timestamp;
  
  /** Reason for override */
  reason?: string;
}

/**
 * Event payload for experiment exposure tracking
 * Published via EventBus
 */
export interface ExperimentExposureEvent {
  type: 'ExperimentExposure';
  payload: ExperimentExposure;
}

/**
 * Event payload for metric tracking
 * Published via EventBus
 */
export interface MetricTrackEvent {
  type: 'MetricTrack';
  payload: MetricEvent;
}

/**
 * Event payload for experiment assignment
 * Published via EventBus
 */
export interface ExperimentAssignmentEvent {
  type: 'ExperimentAssignment';
  payload: ExperimentAssignment;
}

/**
 * Union type of all experiment-related events
 */
export type ExperimentEvent = 
  | ExperimentExposureEvent
  | MetricTrackEvent
  | ExperimentAssignmentEvent;