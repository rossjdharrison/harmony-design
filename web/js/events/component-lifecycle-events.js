/**
 * Component Lifecycle Event Definitions
 * 
 * Events for managing component state transitions through the design system lifecycle.
 * See harmony-design/DESIGN_SYSTEM.md § Component Lifecycle for state machine definition.
 * 
 * @module events/component-lifecycle-events
 */

/**
 * Command: Initialize a component in draft state
 * @typedef {Object} InitializeComponentCommand
 * @property {string} type - 'component_lifecycle.initialize'
 * @property {Object} payload
 * @property {string} payload.componentId - Unique component identifier
 */

/**
 * Command: Transition component to new state
 * @typedef {Object} TransitionComponentCommand
 * @property {string} type - 'component_lifecycle.transition'
 * @property {Object} payload
 * @property {string} payload.componentId - Component identifier
 * @property {string} payload.fromState - Expected current state
 * @property {string} payload.toState - Target state
 * @property {string} [payload.reason] - Optional reason for transition
 */

/**
 * Query: Get component current state
 * @typedef {Object} GetComponentStateQuery
 * @property {string} type - 'component_lifecycle.get_state'
 * @property {Object} payload
 * @property {string} payload.componentId - Component identifier
 */

/**
 * Query: Get valid next states for component
 * @typedef {Object} GetNextStatesQuery
 * @property {string} type - 'component_lifecycle.get_next_states'
 * @property {Object} payload
 * @property {string} payload.componentId - Component identifier
 */

/**
 * Event: Component state changed
 * @typedef {Object} ComponentStateChangedEvent
 * @property {string} type - 'component_lifecycle.state_changed'
 * @property {Object} payload
 * @property {string} payload.componentId - Component identifier
 * @property {string} payload.fromState - Previous state
 * @property {string} payload.toState - New state
 * @property {string} [payload.reason] - Optional reason for transition
 */

/**
 * Event: State transition failed
 * @typedef {Object} TransitionFailedEvent
 * @property {string} type - 'component_lifecycle.transition_failed'
 * @property {Object} payload
 * @property {string} payload.componentId - Component identifier
 * @property {string} payload.fromState - Attempted from state
 * @property {string} payload.toState - Attempted to state
 * @property {string} payload.error - Error message
 */

export const ComponentLifecycleEvents = {
  // Commands
  INITIALIZE: 'component_lifecycle.initialize',
  TRANSITION: 'component_lifecycle.transition',
  
  // Queries
  GET_STATE: 'component_lifecycle.get_state',
  GET_NEXT_STATES: 'component_lifecycle.get_next_states',
  
  // Events
  STATE_CHANGED: 'component_lifecycle.state_changed',
  TRANSITION_FAILED: 'component_lifecycle.transition_failed',
};

/**
 * Valid component lifecycle states
 */
export const ComponentStates = {
  DRAFT: 'draft',
  DESIGN_COMPLETE: 'design_complete',
  IN_DEVELOPMENT: 'in_development',
  IMPLEMENTED: 'implemented',
  PUBLISHED: 'published',
};