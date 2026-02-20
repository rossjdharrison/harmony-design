/**
 * Intent Graph Node Type Definition
 * 
 * TypeScript types for Intent nodes in the Harmony graph system.
 * Complements schemas/intent-node.schema.json
 * 
 * @see DESIGN_SYSTEM.md § Graph Engine § Intent Node Schema
 * @module types/intent-node
 */

/**
 * Intent category enumeration for routing and grouping
 */
export type IntentCategory =
  | 'playback'
  | 'navigation'
  | 'editing'
  | 'export'
  | 'import'
  | 'settings'
  | 'collaboration'
  | 'automation'
  | 'spatial'
  | 'system';

/**
 * Parameter data type
 */
export type ParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/**
 * Outcome status enumeration
 */
export type OutcomeStatus = 'success' | 'failure' | 'partial' | 'cancelled';

/**
 * Permission enumeration for access control
 */
export type Permission =
  | 'audio.read'
  | 'audio.write'
  | 'project.read'
  | 'project.write'
  | 'export'
  | 'import'
  | 'settings.read'
  | 'settings.write'
  | 'collaboration'
  | 'system';

/**
 * Parameter validation rules
 */
export interface ParameterValidation {
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Regular expression pattern (for strings) */
  pattern?: string;
  /** Allowed values */
  enum?: unknown[];
}

/**
 * Intent parameter definition
 */
export interface IntentParameter {
  /** Parameter data type */
  type: ParameterType;
  /** Whether this parameter is required */
  required: boolean;
  /** Default value if parameter is not provided */
  default?: unknown;
  /** Human-readable parameter description */
  description?: string;
  /** Validation rules for the parameter */
  validation?: ParameterValidation;
}

/**
 * Intent handler configuration
 */
export interface IntentHandler {
  /** Reference to handler node (Component or BoundedContext) UUID */
  nodeId: string;
  /** Handler priority (higher = preferred), 0-100 */
  priority: number;
  /** Conditions under which this handler is applicable */
  conditions?: Record<string, unknown>;
}

/**
 * Keyboard shortcut configuration
 */
export interface KeyBinding {
  /** Key code or character */
  key: string;
  /** Requires Ctrl/Cmd key */
  ctrl?: boolean;
  /** Requires Shift key */
  shift?: boolean;
  /** Requires Alt key */
  alt?: boolean;
}

/**
 * Intent trigger configuration
 */
export interface IntentTrigger {
  /** Event type that triggers this intent */
  eventType: string;
  /** CSS selector for DOM events (optional) */
  selector?: string;
  /** Keyboard shortcut configuration */
  keyBinding?: KeyBinding;
  /** JavaScript expression that must evaluate to true */
  condition?: string;
}

/**
 * Intent outcome configuration
 */
export interface IntentOutcome {
  /** Event type published as outcome */
  eventType: string;
  /** Outcome status */
  status: OutcomeStatus;
  /** Description of this outcome */
  description?: string;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Whether to track usage of this intent */
  track?: boolean;
  /** Analytics category */
  category?: string;
}

/**
 * Intent metadata
 */
export interface IntentMetadata {
  /** Schema version for this intent */
  version?: string;
  /** ISO 8601 timestamp of intent creation */
  createdAt?: string;
  /** ISO 8601 timestamp of last update */
  updatedAt?: string;
  /** Tags for categorization and search */
  tags?: string[];
  /** Analytics configuration */
  analytics?: AnalyticsConfig;
}

/**
 * Graph edges for Intent nodes
 */
export interface IntentEdges {
  /** Components or events that can trigger this intent */
  triggeredBy?: string[];
  /** Intents or commands triggered by this intent */
  triggers?: string[];
  /** Bounded contexts that handle this intent */
  handledBy?: string[];
  /** Graph nodes affected by executing this intent */
  affects?: string[];
}

/**
 * Intent Graph Node
 * 
 * Represents a user goal or system action in the Harmony graph.
 * Intents bridge UI interactions with bounded context handlers.
 * 
 * @see DESIGN_SYSTEM.md § Graph Engine § Intent Node Schema
 */
export interface IntentNode {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Node type discriminator, must be 'Intent' */
  type: 'Intent';
  /** Human-readable intent name */
  name: string;
  /** Intent category for grouping and routing */
  category: IntentCategory;
  /** Detailed description of the intent's purpose */
  description?: string;
  /** Named parameters required or accepted by this intent */
  parameters?: Record<string, IntentParameter>;
  /** List of handlers that can execute this intent */
  handlers?: IntentHandler[];
  /** UI or system events that can trigger this intent */
  triggers?: IntentTrigger[];
  /** Possible outcomes or result events after execution */
  outcomes?: IntentOutcome[];
  /** Required permissions to execute this intent */
  permissions?: Permission[];
  /** Additional metadata for tooling and analytics */
  metadata?: IntentMetadata;
  /** Graph edges connecting this intent to other nodes */
  edges?: IntentEdges;
}

/**
 * Type guard to check if an object is an IntentNode
 * 
 * @param obj - Object to check
 * @returns True if object is an IntentNode
 */
export function isIntentNode(obj: unknown): obj is IntentNode {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const node = obj as Partial<IntentNode>;
  return (
    typeof node.id === 'string' &&
    node.type === 'Intent' &&
    typeof node.name === 'string' &&
    typeof node.category === 'string'
  );
}