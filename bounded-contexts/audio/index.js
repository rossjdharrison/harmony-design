/**
 * @fileoverview Audio Bounded Context - Composition Root
 * Exports audio processing components and creates AudioContextManager
 * with EventBus singleton integration.
 * 
 * Related documentation: DESIGN_SYSTEM.md § Audio Processing
 * 
 * @module bounded-contexts/audio
 */

import { AudioContextManager, AudioContextState } from './audio-context-manager.js';

/**
 * Create and configure AudioContextManager with EventBus
 * This is the composition root for the audio bounded context
 * 
 * @param {Object} eventBus - EventBus singleton from core/event-bus.js
 * @returns {AudioContextManager} Configured manager instance
 */
export function createAudioContext(eventBus) {
  if (!eventBus) {
    throw new Error('createAudioContext requires EventBus singleton');
  }

  const manager = new AudioContextManager(eventBus);

  // Register manager metadata with EventBus for debugging
  eventBus.publish('BoundedContext.Registered', {
    context: 'audio',
    component: 'AudioContextManager',
    commands: [
      'AudioContext.Initialize',
      'AudioContext.Resume',
      'AudioContext.Suspend',
      'AudioContext.Close',
      'AudioContext.GetState'
    ],
    events: [
      'AudioContext.Initialized',
      'AudioContext.InitializationFailed',
      'AudioContext.Resumed',
      'AudioContext.Suspended',
      'AudioContext.Closed',
      'AudioContext.StateChanged',
      'AudioContext.State',
      'AudioContext.Error',
      'AudioContext.AutoSuspended',
      'AudioContext.ResumeRequired'
    ]
  });

  return manager;
}

// Re-export for convenience
export { AudioContextManager, AudioContextState };