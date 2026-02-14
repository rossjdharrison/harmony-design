/**
 * Event Replay System
 * 
 * Restores application state by replaying events from the event log.
 * Works with the existing event recording system to enable time-travel debugging
 * and state restoration.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#event-replay
 */

import { EventBus } from './event-bus.js';

/**
 * @typedef {Object} ReplayOptions
 * @property {number} [startIndex=0] - Index to start replay from
 * @property {number} [endIndex] - Index to end replay at (exclusive)
 * @property {number} [delayMs=0] - Delay between events in milliseconds
 * @property {boolean} [skipValidation=false] - Skip validation during replay
 * @property {string[]} [eventFilter] - Only replay events matching these types
 * @property {Function} [onProgress] - Callback with (current, total) progress
 */

/**
 * @typedef {Object} ReplayState
 * @property {boolean} isReplaying - Whether replay is currently active
 * @property {number} currentIndex - Current event index being replayed
 * @property {number} totalEvents - Total events to replay
 * @property {boolean} isPaused - Whether replay is paused
 * @property {number} startTime - Timestamp when replay started
 */

export class EventReplay {
  constructor() {
    /** @type {ReplayState} */
    this.state = {
      isReplaying: false,
      currentIndex: 0,
      totalEvents: 0,
      isPaused: false,
      startTime: 0
    };

    this._abortController = null;
    this._pausePromise = null;
    this._pauseResolve = null;
  }

  /**
   * Replay events from the event log to restore application state
   * 
   * @param {Array<Object>} eventLog - Array of recorded events
   * @param {ReplayOptions} [options={}] - Replay configuration
   * @returns {Promise<{success: boolean, eventsReplayed: number, errors: Array}>}
   */
  async replay(eventLog, options = {}) {
    if (this.state.isReplaying) {
      throw new Error('Replay already in progress. Call stop() first.');
    }

    const {
      startIndex = 0,
      endIndex = eventLog.length,
      delayMs = 0,
      skipValidation = false,
      eventFilter = null,
      onProgress = null
    } = options;

    // Filter events if needed
    let eventsToReplay = eventLog.slice(startIndex, endIndex);
    if (eventFilter && eventFilter.length > 0) {
      eventsToReplay = eventsToReplay.filter(entry => 
        eventFilter.includes(entry.type)
      );
    }

    this.state = {
      isReplaying: true,
      currentIndex: 0,
      totalEvents: eventsToReplay.length,
      isPaused: false,
      startTime: Date.now()
    };

    this._abortController = new AbortController();
    const errors = [];
    let eventsReplayed = 0;

    console.log(`[EventReplay] Starting replay of ${eventsToReplay.length} events`);

    try {
      for (let i = 0; i < eventsToReplay.length; i++) {
        // Check for abort
        if (this._abortController.signal.aborted) {
          console.log('[EventReplay] Replay aborted');
          break;
        }

        // Handle pause
        if (this.state.isPaused) {
          await this._pausePromise;
        }

        this.state.currentIndex = i;
        const entry = eventsToReplay[i];

        try {
          // Replay the event
          await this._replayEvent(entry, skipValidation);
          eventsReplayed++;

          // Progress callback
          if (onProgress) {
            onProgress(i + 1, eventsToReplay.length);
          }

          // Delay between events if specified
          if (delayMs > 0 && i < eventsToReplay.length - 1) {
            await this._delay(delayMs);
          }
        } catch (error) {
          console.error(`[EventReplay] Error replaying event at index ${i}:`, error);
          errors.push({
            index: i,
            event: entry,
            error: error.message
          });
        }
      }

      const duration = Date.now() - this.state.startTime;
      console.log(`[EventReplay] Completed in ${duration}ms. Replayed ${eventsReplayed}/${eventsToReplay.length} events`);

      return {
        success: errors.length === 0,
        eventsReplayed,
        errors
      };
    } finally {
      this.state.isReplaying = false;
      this._abortController = null;
    }
  }

  /**
   * Replay a single event
   * 
   * @private
   * @param {Object} entry - Event log entry
   * @param {boolean} skipValidation - Whether to skip validation
   */
  async _replayEvent(entry, skipValidation) {
    const { type, payload, metadata } = entry;

    // Emit the event with replay flag
    const replayMetadata = {
      ...metadata,
      isReplay: true,
      originalTimestamp: metadata.timestamp
    };

    // Use EventBus to emit, but mark as replay
    if (skipValidation) {
      // Direct emit without validation
      EventBus._emitWithoutValidation(type, payload, replayMetadata);
    } else {
      // Normal emit with validation
      EventBus.emit(type, payload, replayMetadata);
    }
  }

  /**
   * Pause the current replay
   */
  pause() {
    if (!this.state.isReplaying || this.state.isPaused) {
      return;
    }

    this.state.isPaused = true;
    this._pausePromise = new Promise(resolve => {
      this._pauseResolve = resolve;
    });

    console.log('[EventReplay] Replay paused');
  }

  /**
   * Resume a paused replay
   */
  resume() {
    if (!this.state.isReplaying || !this.state.isPaused) {
      return;
    }

    this.state.isPaused = false;
    if (this._pauseResolve) {
      this._pauseResolve();
      this._pauseResolve = null;
      this._pausePromise = null;
    }

    console.log('[EventReplay] Replay resumed');
  }

  /**
   * Stop the current replay
   */
  stop() {
    if (!this.state.isReplaying) {
      return;
    }

    if (this._abortController) {
      this._abortController.abort();
    }

    // Resume if paused to allow cleanup
    if (this.state.isPaused) {
      this.resume();
    }

    console.log('[EventReplay] Replay stopped');
  }

  /**
   * Get current replay state
   * 
   * @returns {ReplayState}
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Replay events up to a specific point in time
   * 
   * @param {Array<Object>} eventLog - Array of recorded events
   * @param {number} timestamp - Target timestamp
   * @returns {Promise<{success: boolean, eventsReplayed: number, errors: Array}>}
   */
  async replayToTimestamp(eventLog, timestamp) {
    const endIndex = eventLog.findIndex(entry => 
      entry.metadata.timestamp > timestamp
    );

    return this.replay(eventLog, {
      endIndex: endIndex === -1 ? eventLog.length : endIndex
    });
  }

  /**
   * Replay a specific range of events by timestamp
   * 
   * @param {Array<Object>} eventLog - Array of recorded events
   * @param {number} startTimestamp - Start timestamp
   * @param {number} endTimestamp - End timestamp
   * @returns {Promise<{success: boolean, eventsReplayed: number, errors: Array}>}
   */
  async replayTimeRange(eventLog, startTimestamp, endTimestamp) {
    const startIndex = eventLog.findIndex(entry => 
      entry.metadata.timestamp >= startTimestamp
    );
    const endIndex = eventLog.findIndex(entry => 
      entry.metadata.timestamp > endTimestamp
    );

    return this.replay(eventLog, {
      startIndex: startIndex === -1 ? 0 : startIndex,
      endIndex: endIndex === -1 ? eventLog.length : endIndex
    });
  }

  /**
   * Utility to delay execution
   * 
   * @private
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const eventReplay = new EventReplay();