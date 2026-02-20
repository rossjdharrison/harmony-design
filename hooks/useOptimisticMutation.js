/**
 * @fileoverview Hook for using optimistic mutations in Web Components
 * 
 * Provides reactive state management for optimistic mutations with
 * automatic component updates.
 * 
 * @module hooks/useOptimisticMutation
 * @see {@link file://./DESIGN_SYSTEM.md#optimistic-mutations}
 */

import { createOptimisticMutation, createEventBusMutation } from '../utils/optimistic-mutation.js';

/**
 * Hook for using optimistic mutations in Web Components
 * 
 * @param {import('../utils/optimistic-mutation.js').MutationConfig} config - Mutation configuration
 * @param {HTMLElement} component - Component instance for updates
 * @returns {import('../utils/optimistic-mutation.js').MutationResult} Mutation result with auto-update
 * 
 * @example
 * class UserProfile extends HTMLElement {
 *   constructor() {
 *     super();
 *     this.attachShadow({ mode: 'open' });
 *     
 *     this.updateMutation = useOptimisticMutation({
 *       mutationFn: async (data) => {
 *         return await fetch('/api/user', {
 *           method: 'PUT',
 *           body: JSON.stringify(data)
 *         }).then(r => r.json());
 *       },
 *       onMutate: (data) => {
 *         const previous = this.userData;
 *         this.userData = { ...this.userData, ...data };
 *         this.render();
 *         return { previous };
 *       },
 *       onError: (error, variables, context) => {
 *         this.userData = context.previous;
 *         this.render();
 *       }
 *     }, this);
 *   }
 *   
 *   async handleSubmit(formData) {
 *     await this.updateMutation.execute(formData);
 *   }
 * }
 */
export function useOptimisticMutation(config, component) {
  const mutation = createOptimisticMutation(config);

  // Subscribe to mutation state changes and trigger component update
  const unsubscribe = mutation.subscribe((state) => {
    if (component.requestUpdate) {
      component.requestUpdate();
    } else if (component.render) {
      component.render();
    }
  });

  // Cleanup on disconnect
  const originalDisconnectedCallback = component.disconnectedCallback;
  component.disconnectedCallback = function() {
    unsubscribe();
    if (originalDisconnectedCallback) {
      originalDisconnectedCallback.call(this);
    }
  };

  return mutation;
}

/**
 * Hook for using EventBus mutations in Web Components
 * 
 * @param {Object} config - EventBus mutation configuration
 * @param {HTMLElement} component - Component instance for updates
 * @returns {import('../utils/optimistic-mutation.js').MutationResult} Mutation result with auto-update
 * 
 * @example
 * class PlayButton extends HTMLElement {
 *   constructor() {
 *     super();
 *     this.attachShadow({ mode: 'open' });
 *     
 *     this.playMutation = useEventBusMutation({
 *       commandType: 'PlayTrack',
 *       successType: 'PlaybackStarted',
 *       errorType: 'PlaybackError',
 *       onMutate: (trackId) => {
 *         this.setAttribute('playing', '');
 *         return { wasPlaying: false };
 *       },
 *       onError: (error, trackId, context) => {
 *         this.removeAttribute('playing');
 *       }
 *     }, this);
 *   }
 *   
 *   async handleClick() {
 *     await this.playMutation.execute({ trackId: this.trackId });
 *   }
 * }
 */
export function useEventBusMutation(config, component) {
  const mutation = createEventBusMutation(config);

  // Subscribe to mutation state changes and trigger component update
  const unsubscribe = mutation.subscribe((state) => {
    if (component.requestUpdate) {
      component.requestUpdate();
    } else if (component.render) {
      component.render();
    }
  });

  // Cleanup on disconnect
  const originalDisconnectedCallback = component.disconnectedCallback;
  component.disconnectedCallback = function() {
    unsubscribe();
    if (originalDisconnectedCallback) {
      originalDisconnectedCallback.call(this);
    }
  };

  return mutation;
}