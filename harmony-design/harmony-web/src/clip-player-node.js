/**
 * @fileoverview ClipPlayerNode - AudioWorkletNode wrapper for ClipPlayerProcessor
 * @module harmony-web/clip-player-node
 * 
 * Main thread wrapper for ClipPlayerProcessor. Provides high-level API for
 * audio clip playback with transport synchronization.
 * 
 * Related documentation: See DESIGN_SYSTEM.md § Audio Processing Architecture
 * Related files:
 * - ../workers/clip-player-processor.js (AudioWorkletProcessor implementation)
 * - ../../core/event-bus.js (Event system integration)
 * 
 * @example
 * const clipNode = new ClipPlayerNode(audioContext);
 * await clipNode.loadBuffer(audioBuffer);
 * clipNode.schedule({
 *   startSample: 0,
 *   endSample: audioBuffer.length,
 *   offsetSamples: 0,
 *   gain: 1.0
 * });
 * clipNode.connect(audioContext.destination);
 * clipNode.start();
 */

/**
 * ClipPlayerNode - High-level audio clip player
 * 
 * Wraps ClipPlayerProcessor AudioWorkletNode and provides:
 * - Buffer loading from AudioBuffer to SharedArrayBuffer
 * - Transport state synchronization
 * - Event-based lifecycle notifications
 * - Parameter automation helpers
 * 
 * @extends AudioWorkletNode
 */
export class ClipPlayerNode extends AudioWorkletNode {
  /**
   * Create ClipPlayerNode
   * @param {AudioContext} context - Web Audio context
   * @param {Object} options - Node options
   * @param {number} [options.numberOfInputs=0] - Number of inputs
   * @param {number} [options.numberOfOutputs=1] - Number of outputs
   * @param {number} [options.outputChannelCount=[2]] - Output channel counts
   */
  constructor(context, options = {}) {
    const nodeOptions = {
      numberOfInputs: options.numberOfInputs ?? 0,
      numberOfOutputs: options.numberOfOutputs ?? 1,
      outputChannelCount: options.outputChannelCount ?? [2],
      processorOptions: {},
    };

    super(context, 'clip-player-processor', nodeOptions);

    /**
     * Current buffer descriptor
     * @type {Object|null}
     * @private
     */
    this._bufferDescriptor = null;

    /**
     * Current schedule
     * @type {Object|null}
     * @private
     */
    this._schedule = null;

    /**
     * Whether processor is ready
     * @type {boolean}
     * @private
     */
    this._isReady = false;

    /**
     * Ready promise
     * @type {Promise<void>}
     * @private
     */
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });

    /**
     * Event listeners
     * @type {Map<string, Set<Function>>}
     * @private
     */
    this._listeners = new Map();

    // Set up message handling
    this.port.onmessage = this._handleMessage.bind(this);

    // Expose parameters
    /**
     * Gain parameter (0.0 - 2.0)
     * @type {AudioParam}
     */
    this.gain = this.parameters.get('gain');

    /**
     * Playback rate parameter (0.25 - 4.0)
     * @type {AudioParam}
     */
    this.playbackRate = this.parameters.get('playbackRate');
  }

  /**
   * Wait for processor to be ready
   * @returns {Promise<void>}
   */
  async ready() {
    return this._readyPromise;
  }

  /**
   * Handle messages from processor
   * @param {MessageEvent} event - Message event
   * @private
   */
  _handleMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'ready':
        this._isReady = true;
        this._resolveReady();
        this._emit('ready');
        break;

      case 'ended':
        this._emit('ended');
        break;

      default:
        console.warn(`[ClipPlayerNode] Unknown message type: ${type}`);
    }
  }

  /**
   * Load audio buffer into SharedArrayBuffer
   * @param {AudioBuffer} audioBuffer - Source audio buffer
   * @returns {Promise<void>}
   */
  async loadBuffer(audioBuffer) {
    await this.ready();

    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    // Calculate SharedArrayBuffer size
    const bytesPerSample = 4; // Float32
    const channelBytes = length * bytesPerSample;
    const totalBytes = channels * channelBytes;

    // Create SharedArrayBuffer
    const sharedBuffer = new SharedArrayBuffer(totalBytes);

    // Copy audio data to SharedArrayBuffer
    for (let ch = 0; ch < channels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);
      const offset = ch * channelBytes;
      const view = new Float32Array(sharedBuffer, offset, length);
      view.set(channelData);
    }

    // Create descriptor
    this._bufferDescriptor = {
      buffer: sharedBuffer,
      channels,
      length,
      sampleRate,
    };

    // Send to processor
    this.port.postMessage({
      type: 'setBuffer',
      data: this._bufferDescriptor,
    });
  }

  /**
   * Set clip schedule
   * @param {Object} schedule - Schedule parameters
   * @param {number} schedule.startSample - Start sample in timeline
   * @param {number} schedule.endSample - End sample in timeline
   * @param {number} [schedule.offsetSamples=0] - Offset into buffer
   * @param {number} [schedule.loopStartSamples=0] - Loop start (0 = no loop)
   * @param {number} [schedule.loopEndSamples=0] - Loop end
   * @param {number} [schedule.fadeInSamples=0] - Fade in duration
   * @param {number} [schedule.fadeOutSamples=0] - Fade out duration
   * @param {number} [schedule.gain=1.0] - Clip gain
   */
  schedule(schedule) {
    this._schedule = {
      startSample: schedule.startSample,
      endSample: schedule.endSample,
      offsetSamples: schedule.offsetSamples ?? 0,
      loopStartSamples: schedule.loopStartSamples ?? 0,
      loopEndSamples: schedule.loopEndSamples ?? 0,
      fadeInSamples: schedule.fadeInSamples ?? 0,
      fadeOutSamples: schedule.fadeOutSamples ?? 0,
      gain: schedule.gain ?? 1.0,
    };

    this.port.postMessage({
      type: 'schedule',
      data: this._schedule,
    });
  }

  /**
   * Update transport state
   * @param {Object} state - Transport state
   * @param {boolean} state.isPlaying - Is playing
   * @param {number} state.samplePosition - Current sample position
   * @param {number} state.sampleRate - Sample rate
   * @param {number} [state.tempo=120] - Tempo in BPM
   * @param {number} [state.timeSignatureNumerator=4] - Time signature numerator
   * @param {number} [state.timeSignatureDenominator=4] - Time signature denominator
   */
  updateTransport(state) {
    this.port.postMessage({
      type: 'transportState',
      data: {
        isPlaying: state.isPlaying,
        samplePosition: state.samplePosition,
        sampleRate: state.sampleRate,
        tempo: state.tempo ?? 120,
        timeSignatureNumerator: state.timeSignatureNumerator ?? 4,
        timeSignatureDenominator: state.timeSignatureDenominator ?? 4,
      },
    });
  }

  /**
   * Start playback
   */
  start() {
    this.port.postMessage({ type: 'start' });
  }

  /**
   * Stop playback
   */
  stop() {
    this.port.postMessage({ type: 'stop' });
  }

  /**
   * Seek to sample position
   * @param {number} samplePosition - Target sample position
   */
  seek(samplePosition) {
    this.port.postMessage({
      type: 'seek',
      data: { samplePosition },
    });
  }

  /**
   * Add event listener
   * @param {string} event - Event name ('ready', 'ended')
   * @param {Function} callback - Event callback
   */
  addEventListener(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  removeEventListener(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @private
   */
  _emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Dispose node and clean up resources
   */
  dispose() {
    this.disconnect();
    this._listeners.clear();
    this._bufferDescriptor = null;
    this._schedule = null;
  }
}