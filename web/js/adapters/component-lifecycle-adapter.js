/**
 * Component Lifecycle Bounded Context Adapter
 * 
 * Bridges EventBus commands to the ComponentLifecycleBC WASM module.
 * See harmony-design/DESIGN_SYSTEM.md § Component Lifecycle
 * 
 * @module adapters/component-lifecycle-adapter
 */

import { ComponentLifecycleEvents } from '../events/component-lifecycle-events.js';

/**
 * Adapter for Component Lifecycle Bounded Context
 */
export class ComponentLifecycleAdapter {
  /**
   * @param {Object} eventBus - EventBus instance
   * @param {Object} wasmModule - Loaded ComponentLifecycleBC WASM module
   */
  constructor(eventBus, wasmModule) {
    this.eventBus = eventBus;
    this.bc = new wasmModule.ComponentLifecycleBC();
    
    this.setupSubscriptions();
  }

  /**
   * Setup event subscriptions
   * @private
   */
  setupSubscriptions() {
    // Command: Initialize component
    this.eventBus.subscribe(
      ComponentLifecycleEvents.INITIALIZE,
      this.handleInitialize.bind(this)
    );

    // Command: Transition component
    this.eventBus.subscribe(
      ComponentLifecycleEvents.TRANSITION,
      this.handleTransition.bind(this)
    );

    // Query: Get component state
    this.eventBus.subscribe(
      ComponentLifecycleEvents.GET_STATE,
      this.handleGetState.bind(this)
    );

    // Query: Get next states
    this.eventBus.subscribe(
      ComponentLifecycleEvents.GET_NEXT_STATES,
      this.handleGetNextStates.bind(this)
    );
  }

  /**
   * Handle initialize component command
   * @param {Object} event - Event object
   * @private
   */
  handleInitialize(event) {
    try {
      const { componentId } = event.payload;
      
      if (!componentId) {
        console.error('[ComponentLifecycleAdapter] Missing componentId in initialize command', event);
        return;
      }

      const resultJson = this.bc.initializeComponent(componentId);
      const result = JSON.parse(resultJson);

      if (result.success) {
        this.eventBus.publish({
          type: ComponentLifecycleEvents.STATE_CHANGED,
          payload: {
            componentId: result.component_id,
            fromState: null,
            toState: result.new_state,
          },
        });
      }
    } catch (error) {
      console.error('[ComponentLifecycleAdapter] Error initializing component:', error, event);
    }
  }

  /**
   * Handle transition component command
   * @param {Object} event - Event object
   * @private
   */
  handleTransition(event) {
    try {
      const { componentId, fromState, toState, reason } = event.payload;

      if (!componentId || !fromState || !toState) {
        console.error('[ComponentLifecycleAdapter] Missing required fields in transition command', event);
        return;
      }

      const transition = {
        component_id: componentId,
        from_state: fromState,
        to_state: toState,
        reason: reason || null,
      };

      const resultJson = this.bc.transitionComponent(JSON.stringify(transition));
      const result = JSON.parse(resultJson);

      if (result.success) {
        this.eventBus.publish({
          type: ComponentLifecycleEvents.STATE_CHANGED,
          payload: {
            componentId: result.component_id,
            fromState,
            toState: result.new_state,
            reason,
          },
        });
      } else {
        this.eventBus.publish({
          type: ComponentLifecycleEvents.TRANSITION_FAILED,
          payload: {
            componentId: result.component_id,
            fromState,
            toState,
            error: result.error,
          },
        });
      }
    } catch (error) {
      console.error('[ComponentLifecycleAdapter] Error transitioning component:', error, event);
    }
  }

  /**
   * Handle get state query
   * @param {Object} event - Event object
   * @private
   */
  handleGetState(event) {
    try {
      const { componentId } = event.payload;

      if (!componentId) {
        console.error('[ComponentLifecycleAdapter] Missing componentId in get_state query', event);
        return;
      }

      const stateJson = this.bc.getComponentState(componentId);
      const state = JSON.parse(stateJson);

      // Publish response event (query pattern)
      this.eventBus.publish({
        type: `${ComponentLifecycleEvents.GET_STATE}.response`,
        payload: {
          componentId,
          state,
        },
        correlationId: event.correlationId,
      });
    } catch (error) {
      console.error('[ComponentLifecycleAdapter] Error getting component state:', error, event);
    }
  }

  /**
   * Handle get next states query
   * @param {Object} event - Event object
   * @private
   */
  handleGetNextStates(event) {
    try {
      const { componentId } = event.payload;

      if (!componentId) {
        console.error('[ComponentLifecycleAdapter] Missing componentId in get_next_states query', event);
        return;
      }

      const nextStatesJson = this.bc.getNextStates(componentId);
      const nextStates = JSON.parse(nextStatesJson);

      // Publish response event (query pattern)
      this.eventBus.publish({
        type: `${ComponentLifecycleEvents.GET_NEXT_STATES}.response`,
        payload: {
          componentId,
          nextStates,
        },
        correlationId: event.correlationId,
      });
    } catch (error) {
      console.error('[ComponentLifecycleAdapter] Error getting next states:', error, event);
    }
  }
}