/**
 * @fileoverview Lifecycle Manager for Harmony Design System
 * 
 * Manages component lifecycle states and transitions.
 * See: harmony-design/DESIGN_SYSTEM.md#lifecycle-states
 * 
 * @module harmony-web/js/lifecycle-manager
 */

/**
 * Valid lifecycle states for components
 * @enum {string}
 */
export const LifecycleState = {
  DRAFT: 'draft',
  DESIGN_COMPLETE: 'design_complete',
  IN_DEVELOPMENT: 'in_development',
  IMPLEMENTED: 'implemented',
  PUBLISHED: 'published',
  DEPRECATED: 'deprecated'
};

/**
 * Valid state transitions map
 * @type {Map<string, string[]>}
 */
const VALID_TRANSITIONS = new Map([
  [LifecycleState.DRAFT, [LifecycleState.DESIGN_COMPLETE, LifecycleState.DEPRECATED]],
  [LifecycleState.DESIGN_COMPLETE, [LifecycleState.IN_DEVELOPMENT, LifecycleState.DRAFT, LifecycleState.DEPRECATED]],
  [LifecycleState.IN_DEVELOPMENT, [LifecycleState.IMPLEMENTED, LifecycleState.DESIGN_COMPLETE, LifecycleState.DEPRECATED]],
  [LifecycleState.IMPLEMENTED, [LifecycleState.PUBLISHED, LifecycleState.IN_DEVELOPMENT, LifecycleState.DEPRECATED]],
  [LifecycleState.PUBLISHED, [LifecycleState.DEPRECATED, LifecycleState.IN_DEVELOPMENT]],
  [LifecycleState.DEPRECATED, []]
]);

/**
 * State descriptions for documentation
 * @type {Map<string, string>}
 */
const STATE_DESCRIPTIONS = new Map([
  [LifecycleState.DRAFT, 'Component is being conceptualized and designed'],
  [LifecycleState.DESIGN_COMPLETE, 'Design specification is complete and approved'],
  [LifecycleState.IN_DEVELOPMENT, 'Component is actively being implemented'],
  [LifecycleState.IMPLEMENTED, 'Implementation is complete and tested'],
  [LifecycleState.PUBLISHED, 'Component is published and available for use'],
  [LifecycleState.DEPRECATED, 'Component is deprecated and should not be used in new work']
]);

/**
 * Lifecycle entry representing a state at a point in time
 * @typedef {Object} LifecycleEntry
 * @property {string} state - The lifecycle state
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {StateMetadata} [metadata] - Optional metadata
 */

/**
 * Metadata for a state change
 * @typedef {Object} StateMetadata
 * @property {string} [reason] - Reason for state change
 * @property {string} [changedBy] - Who changed the state
 * @property {string} [notes] - Additional notes
 */

/**
 * Manages lifecycle states for a component
 */
export class LifecycleManager {
  /**
   * Creates a new lifecycle manager
   * @param {string} componentId - Unique identifier for the component
   */
  constructor(componentId) {
    /** @type {string} */
    this.componentId = componentId;
    
    /** @type {LifecycleEntry[]} */
    this.history = [];
  }

  /**
   * Gets the current lifecycle state
   * @returns {LifecycleEntry|null} Current state entry or null if no history
   */
  getCurrentState() {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Checks if a transition to a new state is valid
   * @param {string} targetState - The target state
   * @returns {boolean} True if transition is valid
   */
  canTransitionTo(targetState) {
    const current = this.getCurrentState();
    
    // If no current state, can only transition to DRAFT
    if (!current) {
      return targetState === LifecycleState.DRAFT;
    }

    const validTransitions = VALID_TRANSITIONS.get(current.state);
    return validTransitions ? validTransitions.includes(targetState) : false;
  }

  /**
   * Transitions to a new state
   * @param {string} newState - The new lifecycle state
   * @param {StateMetadata} [metadata] - Optional metadata
   * @returns {LifecycleEntry} The new state entry
   * @throws {Error} If transition is invalid
   */
  transitionTo(newState, metadata = null) {
    if (!Object.values(LifecycleState).includes(newState)) {
      throw new Error(`Invalid lifecycle state: ${newState}`);
    }

    if (!this.canTransitionTo(newState)) {
      const current = this.getCurrentState();
      throw new Error(
        `Invalid transition from ${current ? current.state : 'none'} to ${newState}`
      );
    }

    const entry = {
      state: newState,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata })
    };

    this.history.push(entry);
    return entry;
  }

  /**
   * Gets the description for a lifecycle state
   * @param {string} state - The lifecycle state
   * @returns {string} Human-readable description
   */
  static getStateDescription(state) {
    return STATE_DESCRIPTIONS.get(state) || 'Unknown state';
  }

  /**
   * Gets all valid transitions from a state
   * @param {string} state - The lifecycle state
   * @returns {string[]} Array of valid next states
   */
  static getValidTransitions(state) {
    return VALID_TRANSITIONS.get(state) || [];
  }

  /**
   * Gets all lifecycle states
   * @returns {string[]} Array of all valid states
   */
  static getAllStates() {
    return Object.values(LifecycleState);
  }

  /**
   * Serializes the lifecycle history to JSON
   * @returns {string} JSON representation
   */
  toJSON() {
    return JSON.stringify({
      componentId: this.componentId,
      history: this.history
    }, null, 2);
  }

  /**
   * Creates a lifecycle manager from JSON
   * @param {string} json - JSON string
   * @returns {LifecycleManager} New lifecycle manager instance
   */
  static fromJSON(json) {
    const data = JSON.parse(json);
    const manager = new LifecycleManager(data.componentId);
    manager.history = data.history || [];
    return manager;
  }
}