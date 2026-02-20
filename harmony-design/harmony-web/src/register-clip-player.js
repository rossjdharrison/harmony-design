/**
 * @fileoverview Register ClipPlayerProcessor with AudioContext
 * @module harmony-web/register-clip-player
 * 
 * Utility to register the ClipPlayerProcessor AudioWorklet module.
 * Must be called before creating ClipPlayerNode instances.
 * 
 * Related documentation: See DESIGN_SYSTEM.md § Audio Processing Architecture
 * Related files:
 * - ../workers/clip-player-processor.js (Processor implementation)
 * - ./clip-player-node.js (Node wrapper)
 * 
 * @example
 * import { registerClipPlayer } from './register-clip-player.js';
 * 
 * const context = new AudioContext();
 * await registerClipPlayer(context);
 * // Now ClipPlayerNode can be created
 */

/**
 * Register ClipPlayerProcessor with AudioContext
 * @param {AudioContext} context - Web Audio context
 * @returns {Promise<void>}
 * @throws {Error} If registration fails
 */
export async function registerClipPlayer(context) {
  try {
    const processorUrl = new URL(
      '../workers/clip-player-processor.js',
      import.meta.url
    ).href;

    await context.audioWorklet.addModule(processorUrl);
  } catch (error) {
    console.error('[registerClipPlayer] Failed to register processor:', error);
    throw new Error(`Failed to register ClipPlayerProcessor: ${error.message}`);
  }
}

/**
 * Check if ClipPlayerProcessor is registered
 * @param {AudioContext} context - Web Audio context
 * @returns {boolean} Whether processor is registered
 */
export function isClipPlayerRegistered(context) {
  try {
    // Attempt to create a node - will throw if not registered
    const testNode = new AudioWorkletNode(context, 'clip-player-processor');
    testNode.disconnect();
    return true;
  } catch {
    return false;
  }
}