/**
 * @fileoverview AudioContext Lifecycle Manager
 * Manages Web Audio API AudioContext lifecycle including creation, suspension,
 * resumption, and cleanup. Handles browser autoplay policies and page visibility.
 * 
 * Related documentation: DESIGN_SYSTEM.md § Audio Processing § AudioContext Lifecycle
 * 
 * @module bounded-contexts/audio/audio-context-manager
 */

/**
 * AudioContext lifecycle states
 * @enum {string}
 */
export const AudioContextState = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  RUNNING: 'running',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
  ERROR: 'error'
};

/**
 * Manages the lifecycle of Web Audio API AudioContext
 * Ensures proper initialization, suspension, and cleanup
 * Handles browser autoplay policies and page visibility changes
 * 
 * @class AudioContextManager
 */
export class AudioContextManager {
  /**
   * @param {Object} eventBus - EventBus singleton for publishing lifecycle events
   */
  constructor(eventBus) {
    if (!eventBus) {
      throw new Error('AudioContextManager requires EventBus instance');
    }

    /** @private @type {Object} */
    this._eventBus = eventBus;

    /** @private @type {AudioContext|null} */
    this._audioContext = null;

    /** @private @type {string} */
    this._state = AudioContextState.UNINITIALIZED;

    /** @private @type {number} */
    this._sampleRate = 48000; // Default, can be overridden

    /** @private @type {number} */
    this._latencyHint = 0.010; // 10ms target latency (policy requirement)

    /** @private @type {Set<Function>} */
    this._stateChangeListeners = new Set();

    /** @private @type {boolean} */
    this._autoSuspendOnHidden = true;

    /** @private @type {AbortController|null} */
    this._abortController = null;

    /** @private @type {number|null} */
    this._initializationTimestamp = null;

    /** @private @type {Error|null} */
    this._lastError = null;

    // Subscribe to relevant commands
    this._subscribeToCommands();
  }

  /**
   * Subscribe to EventBus commands
   * @private
   */
  _subscribeToCommands() {
    this._eventBus.subscribe('AudioContext.Initialize', (payload) => {
      this.initialize(payload?.options).catch(err => {
        console.error('AudioContext initialization failed:', err);
        this._publishError(err);
      });
    });

    this._eventBus.subscribe('AudioContext.Resume', () => {
      this.resume().catch(err => {
        console.error('AudioContext resume failed:', err);
        this._publishError(err);
      });
    });

    this._eventBus.subscribe('AudioContext.Suspend', () => {
      this.suspend().catch(err => {
        console.error('AudioContext suspend failed:', err);
        this._publishError(err);
      });
    });

    this._eventBus.subscribe('AudioContext.Close', () => {
      this.close().catch(err => {
        console.error('AudioContext close failed:', err);
        this._publishError(err);
      });
    });

    this._eventBus.subscribe('AudioContext.GetState', () => {
      this._publishState();
    });
  }

  /**
   * Initialize AudioContext with specified options
   * Handles browser autoplay policies by creating context in suspended state
   * 
   * @param {Object} options - Initialization options
   * @param {number} [options.sampleRate=48000] - Sample rate in Hz
   * @param {number|string} [options.latencyHint=0.010] - Latency hint (seconds or 'interactive'/'playback')
   * @param {boolean} [options.autoSuspendOnHidden=true] - Auto-suspend when page hidden
   * @returns {Promise<AudioContext>} The initialized AudioContext
   * @throws {Error} If initialization fails or context already exists
   */
  async initialize(options = {}) {
    if (this._state === AudioContextState.INITIALIZING) {
      throw new Error('AudioContext initialization already in progress');
    }

    if (this._audioContext && this._state !== AudioContextState.CLOSED) {
      throw new Error('AudioContext already initialized. Close existing context first.');
    }

    this._setState(AudioContextState.INITIALIZING);
    this._initializationTimestamp = performance.now();

    try {
      // Apply options
      this._sampleRate = options.sampleRate || this._sampleRate;
      this._latencyHint = options.latencyHint || this._latencyHint;
      this._autoSuspendOnHidden = options.autoSuspendOnHidden !== undefined 
        ? options.autoSuspendOnHidden 
        : this._autoSuspendOnHidden;

      // Create AudioContext
      const contextOptions = {
        sampleRate: this._sampleRate,
        latencyHint: this._latencyHint
      };

      this._audioContext = new (window.AudioContext || window.webkitAudioContext)(contextOptions);

      // Set up abort controller for cleanup
      this._abortController = new AbortController();
      const { signal } = this._abortController;

      // Monitor AudioContext state changes
      this._audioContext.addEventListener('statechange', () => {
        this._handleNativeStateChange();
      }, { signal });

      // Handle page visibility changes
      if (this._autoSuspendOnHidden) {
        document.addEventListener('visibilitychange', () => {
          this._handleVisibilityChange();
        }, { signal });
      }

      // Handle user interaction for autoplay policy
      this._setupAutoplayHandlers(signal);

      // Initial state
      this._setState(AudioContextState.SUSPENDED);

      this._eventBus.publish('AudioContext.Initialized', {
        sampleRate: this._audioContext.sampleRate,
        state: this._audioContext.state,
        baseLatency: this._audioContext.baseLatency,
        outputLatency: this._audioContext.outputLatency,
        initializationTime: performance.now() - this._initializationTimestamp
      });

      return this._audioContext;

    } catch (error) {
      this._lastError = error;
      this._setState(AudioContextState.ERROR);
      this._eventBus.publish('AudioContext.InitializationFailed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Resume the AudioContext
   * Required after user interaction due to browser autoplay policies
   * 
   * @returns {Promise<void>}
   * @throws {Error} If context not initialized or in invalid state
   */
  async resume() {
    if (!this._audioContext) {
      throw new Error('AudioContext not initialized');
    }

    if (this._state === AudioContextState.CLOSED) {
      throw new Error('Cannot resume closed AudioContext');
    }

    if (this._audioContext.state === 'running') {
      return; // Already running
    }

    const startTime = performance.now();

    try {
      await this._audioContext.resume();
      this._setState(AudioContextState.RUNNING);

      this._eventBus.publish('AudioContext.Resumed', {
        currentTime: this._audioContext.currentTime,
        resumeTime: performance.now() - startTime
      });

    } catch (error) {
      this._lastError = error;
      this._setState(AudioContextState.ERROR);
      throw error;
    }
  }

  /**
   * Suspend the AudioContext
   * Reduces CPU usage when audio is not needed
   * 
   * @returns {Promise<void>}
   * @throws {Error} If context not initialized
   */
  async suspend() {
    if (!this._audioContext) {
      throw new Error('AudioContext not initialized');
    }

    if (this._audioContext.state === 'suspended') {
      return; // Already suspended
    }

    try {
      await this._audioContext.suspend();
      this._setState(AudioContextState.SUSPENDED);

      this._eventBus.publish('AudioContext.Suspended', {
        currentTime: this._audioContext.currentTime
      });

    } catch (error) {
      this._lastError = error;
      throw error;
    }
  }

  /**
   * Close the AudioContext and release all resources
   * This is irreversible - a new context must be created to use audio again
   * 
   * @returns {Promise<void>}
   */
  async close() {
    if (!this._audioContext) {
      return; // Nothing to close
    }

    if (this._state === AudioContextState.CLOSED) {
      return; // Already closed
    }

    try {
      // Abort all event listeners
      if (this._abortController) {
        this._abortController.abort();
        this._abortController = null;
      }

      // Close the context
      await this._audioContext.close();
      this._setState(AudioContextState.CLOSED);

      this._eventBus.publish('AudioContext.Closed', {
        finalTime: this._audioContext.currentTime
      });

      // Clear reference
      this._audioContext = null;
      this._lastError = null;

    } catch (error) {
      this._lastError = error;
      console.error('Error closing AudioContext:', error);
      throw error;
    }
  }

  /**
   * Get the current AudioContext instance
   * @returns {AudioContext|null}
   */
  getContext() {
    return this._audioContext;
  }

  /**
   * Get the current lifecycle state
   * @returns {string} Current state from AudioContextState enum
   */
  getState() {
    return this._state;
  }

  /**
   * Get the last error that occurred
   * @returns {Error|null}
   */
  getLastError() {
    return this._lastError;
  }

  /**
   * Check if AudioContext is ready for audio processing
   * @returns {boolean}
   */
  isReady() {
    return this._state === AudioContextState.RUNNING && 
           this._audioContext && 
           this._audioContext.state === 'running';
  }

  /**
   * Get AudioContext metrics
   * @returns {Object|null} Metrics object or null if not initialized
   */
  getMetrics() {
    if (!this._audioContext) {
      return null;
    }

    return {
      state: this._state,
      nativeState: this._audioContext.state,
      sampleRate: this._audioContext.sampleRate,
      currentTime: this._audioContext.currentTime,
      baseLatency: this._audioContext.baseLatency,
      outputLatency: this._audioContext.outputLatency || 0,
      destination: {
        maxChannelCount: this._audioContext.destination.maxChannelCount,
        channelCount: this._audioContext.destination.channelCount
      }
    };
  }

  /**
   * Handle native AudioContext state changes
   * @private
   */
  _handleNativeStateChange() {
    if (!this._audioContext) return;

    const nativeState = this._audioContext.state;
    
    // Sync our state with native state
    if (nativeState === 'running' && this._state !== AudioContextState.RUNNING) {
      this._setState(AudioContextState.RUNNING);
    } else if (nativeState === 'suspended' && this._state !== AudioContextState.SUSPENDED) {
      this._setState(AudioContextState.SUSPENDED);
    } else if (nativeState === 'closed' && this._state !== AudioContextState.CLOSED) {
      this._setState(AudioContextState.CLOSED);
    }

    this._eventBus.publish('AudioContext.StateChanged', {
      state: this._state,
      nativeState: nativeState,
      currentTime: this._audioContext.currentTime
    });
  }

  /**
   * Handle page visibility changes
   * Auto-suspend when page is hidden to save resources
   * @private
   */
  async _handleVisibilityChange() {
    if (!this._audioContext || !this._autoSuspendOnHidden) return;

    try {
      if (document.hidden && this._audioContext.state === 'running') {
        await this.suspend();
        this._eventBus.publish('AudioContext.AutoSuspended', {
          reason: 'page_hidden'
        });
      } else if (!document.hidden && this._audioContext.state === 'suspended') {
        // Don't auto-resume - require explicit user interaction
        this._eventBus.publish('AudioContext.ResumeRequired', {
          reason: 'page_visible'
        });
      }
    } catch (error) {
      console.error('Error handling visibility change:', error);
    }
  }

  /**
   * Set up handlers for browser autoplay policy
   * Resume context on first user interaction
   * @private
   * @param {AbortSignal} signal - Abort signal for cleanup
   */
  _setupAutoplayHandlers(signal) {
    const userInteractionEvents = ['click', 'touchstart', 'keydown'];
    
    const handleUserInteraction = async () => {
      if (this._audioContext && this._audioContext.state === 'suspended') {
        try {
          await this.resume();
          // Remove listeners after first successful resume
          userInteractionEvents.forEach(event => {
            document.removeEventListener(event, handleUserInteraction);
          });
        } catch (error) {
          console.warn('Failed to resume AudioContext on user interaction:', error);
        }
      }
    };

    userInteractionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { 
        once: false, // Keep trying until successful
        signal 
      });
    });
  }

  /**
   * Update internal state and notify listeners
   * @private
   * @param {string} newState - New state from AudioContextState enum
   */
  _setState(newState) {
    const oldState = this._state;
    this._state = newState;

    // Notify listeners
    this._stateChangeListeners.forEach(listener => {
      try {
        listener(newState, oldState);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  /**
   * Publish current state to EventBus
   * @private
   */
  _publishState() {
    this._eventBus.publish('AudioContext.State', {
      state: this._state,
      metrics: this.getMetrics(),
      isReady: this.isReady(),
      lastError: this._lastError ? this._lastError.message : null
    });
  }

  /**
   * Publish error event
   * @private
   * @param {Error} error
   */
  _publishError(error) {
    this._eventBus.publish('AudioContext.Error', {
      error: error.message,
      stack: error.stack,
      state: this._state
    });
  }

  /**
   * Add a state change listener
   * @param {Function} listener - Callback function (newState, oldState) => void
   * @returns {Function} Unsubscribe function
   */
  addStateChangeListener(listener) {
    this._stateChangeListeners.add(listener);
    return () => {
      this._stateChangeListeners.delete(listener);
    };
  }

  /**
   * Clean up all resources
   * Should be called before discarding the manager instance
   */
  async destroy() {
    await this.close();
    this._stateChangeListeners.clear();
    this._eventBus = null;
  }
}