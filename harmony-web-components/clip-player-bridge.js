/**
 * @fileoverview ClipPlayerBridge - Main thread interface for ClipPlayerProcessor
 * @module harmony-web-components/clip-player-bridge
 * 
 * Provides a high-level API for controlling clip playback from the main thread.
 * Handles AudioWorkletNode creation, message passing, and state synchronization.
 * 
 * Usage:
 * ```javascript
 * const bridge = new ClipPlayerBridge(audioContext);
 * await bridge.initialize();
 * 
 * // Load audio buffer
 * await bridge.loadBuffer('clip1', audioBuffer);
 * 
 * // Schedule clip
 * bridge.scheduleClip({
 *   id: 'clip1',
 *   startTime: 0,
 *   duration: audioBuffer.length,
 *   offset: 0,
 *   gain: 0.8,
 *   pitch: 0,
 *   loop: false
 * });
 * 
 * // Control transport
 * bridge.play();
 * bridge.pause();
 * bridge.seek(1000);
 * ```
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#audio-clip-playback}
 */

/**
 * ClipPlayerBridge - Main thread interface for clip playback
 * 
 * Manages AudioWorkletNode lifecycle and provides convenient API
 * for scheduling and controlling audio clip playback.
 */
export class ClipPlayerBridge {
  /**
   * Create ClipPlayerBridge
   * @param {AudioContext} audioContext - Web Audio API context
   */
  constructor(audioContext) {
    /**
     * Audio context
     * @type {AudioContext}
     * @private
     */
    this.audioContext = audioContext;

    /**
     * AudioWorkletNode instance
     * @type {AudioWorkletNode|null}
     * @private
     */
    this.workletNode = null;

    /**
     * Current transport state
     * @type {Object}
     * @private
     */
    this.transportState = {
      isPlaying: false,
      samplePosition: 0,
      tempo: 120.0,
      sampleRate: audioContext.sampleRate,
      loopStart: -1,
      loopEnd: -1
    };

    /**
     * Promise resolvers for async operations
     * @type {Map<string, Function>}
     * @private
     */
    this.pendingOperations = new Map();

    /**
     * Event listeners
     * @type {Map<string, Set<Function>>}
     * @private
     */
    this.listeners = new Map();
  }

  /**
   * Initialize the worklet processor
   * @returns {Promise<void>}
   */
  async initialize() {
    // Load worklet module
    await this.audioContext.audioWorklet.addModule(
      new URL('./clip-player-processor.worklet.js', import.meta.url).href
    );

    // Create worklet node
    this.workletNode = new AudioWorkletNode(
      this.audioContext,
      'clip-player-processor',
      {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      }
    );

    // Set up message handler
    this.workletNode.port.onmessage = this._handleMessage.bind(this);

    // Wait for ready signal
    await new Promise((resolve) => {
      this.pendingOperations.set('ready', resolve);
    });
  }

  /**
   * Handle messages from worklet processor
   * @param {MessageEvent} event - Message event
   * @private
   */
  _handleMessage(event) {
    const { type, id } = event.data;

    // Resolve pending operations
    if (this.pendingOperations.has(type)) {
      const resolve = this.pendingOperations.get(type);
      resolve(event.data);
      this.pendingOperations.delete(type);
    }

    // Emit events
    this._emit(type, event.data);
  }

  /**
   * Load audio buffer for playback
   * @param {string} id - Buffer identifier
   * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer
   * @returns {Promise<void>}
   */
  async loadBuffer(id, audioBuffer) {
    // Extract channel data
    const channelData = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    // Send to worklet
    this.workletNode.port.postMessage({
      type: 'load-buffer',
      data: { id, channelData }
    });

    // Wait for confirmation
    await new Promise((resolve) => {
      this.pendingOperations.set('buffer-loaded', resolve);
    });
  }

  /**
   * Schedule clip for playback
   * @param {Object} clipData - Clip metadata
   * @param {string} clipData.id - Clip identifier
   * @param {number} clipData.startTime - Start time in samples
   * @param {number} clipData.duration - Duration in samples
   * @param {number} clipData.offset - Offset into buffer
   * @param {number} clipData.gain - Playback gain
   * @param {number} clipData.pitch - Pitch shift in semitones
   * @param {boolean} clipData.loop - Loop enabled
   * @returns {Promise<void>}
   */
  async scheduleClip(clipData) {
    this.workletNode.port.postMessage({
      type: 'schedule-clip',
      data: clipData
    });

    await new Promise((resolve) => {
      this.pendingOperations.set('clip-scheduled', resolve);
    });
  }

  /**
   * Start playback
   */
  play() {
    this.transportState.isPlaying = true;
    this._updateTransport();
  }

  /**
   * Pause playback
   */
  pause() {
    this.transportState.isPlaying = false;
    this._updateTransport();
  }

  /**
   * Stop playback and reset position
   */
  stop() {
    this.transportState.isPlaying = false;
    this.transportState.samplePosition = 0;
    this._updateTransport();
  }

  /**
   * Seek to position
   * @param {number} samplePosition - Position in samples
   */
  seek(samplePosition) {
    this.transportState.samplePosition = samplePosition;
    this._updateTransport();
  }

  /**
   * Set tempo
   * @param {number} tempo - Tempo in BPM
   */
  setTempo(tempo) {
    this.transportState.tempo = tempo;
    this._updateTransport();
  }

  /**
   * Set loop region
   * @param {number} startSample - Loop start in samples
   * @param {number} endSample - Loop end in samples
   */
  setLoop(startSample, endSample) {
    this.transportState.loopStart = startSample;
    this.transportState.loopEnd = endSample;
    this._updateTransport();
  }

  /**
   * Clear loop region
   */
  clearLoop() {
    this.transportState.loopStart = -1;
    this.transportState.loopEnd = -1;
    this._updateTransport();
  }

  /**
   * Update transport state in worklet
   * @private
   */
  _updateTransport() {
    this.workletNode.port.postMessage({
      type: 'update-transport',
      data: this.transportState
    });
  }

  /**
   * Remove clip from schedule
   * @param {string} id - Clip identifier
   */
  removeClip(id) {
    this.workletNode.port.postMessage({
      type: 'remove-clip',
      data: { id }
    });
  }

  /**
   * Clear all scheduled clips
   */
  clearClips() {
    this.workletNode.port.postMessage({
      type: 'clear'
    });
  }

  /**
   * Set master gain
   * @param {number} gain - Gain value (0.0 - 2.0)
   */
  setMasterGain(gain) {
    if (this.workletNode) {
      this.workletNode.parameters.get('masterGain').value = gain;
    }
  }

  /**
   * Set pitch shift
   * @param {number} semitones - Pitch shift in semitones
   */
  setPitch(semitones) {
    if (this.workletNode) {
      this.workletNode.parameters.get('pitch').value = semitones;
    }
  }

  /**
   * Connect to audio destination
   * @param {AudioNode} destination - Destination node
   */
  connect(destination) {
    if (this.workletNode) {
      this.workletNode.connect(destination);
    }
  }

  /**
   * Disconnect from audio graph
   */
  disconnect() {
    if (this.workletNode) {
      this.workletNode.disconnect();
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  _emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        callback(data);
      }
    }
  }

  /**
   * Dispose resources
   */
  dispose() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    this.listeners.clear();
    this.pendingOperations.clear();
  }
}