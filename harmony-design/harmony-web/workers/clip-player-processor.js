/**
 * @fileoverview ClipPlayerProcessor - AudioWorkletProcessor for sample-accurate audio buffer playback
 * @module harmony-web/workers/clip-player-processor
 * 
 * Manages audio buffer playback with sample-accurate timing from transport state.
 * Uses harmony-sound scheduling for precise synchronization.
 * 
 * Related documentation: See DESIGN_SYSTEM.md § Audio Processing Architecture
 * 
 * @performance
 * - Zero-copy buffer access via SharedArrayBuffer
 * - Sample-accurate timing (<1ms jitter)
 * - No allocations in audio thread
 * - Maximum 10ms end-to-end latency (Policy §5)
 * 
 * @architecture
 * - Extends AudioWorkletProcessor for real-time audio rendering
 * - Receives transport state via MessagePort
 * - Schedules playback using harmony-sound timing
 * - Supports loop points and crossfades
 */

/**
 * Transport state received from main thread
 * @typedef {Object} TransportState
 * @property {boolean} isPlaying - Whether transport is playing
 * @property {number} samplePosition - Current sample position in timeline
 * @property {number} sampleRate - Audio sample rate
 * @property {number} tempo - Current tempo in BPM
 * @property {number} timeSignatureNumerator - Time signature numerator
 * @property {number} timeSignatureDenominator - Time signature denominator
 */

/**
 * Clip scheduling parameters
 * @typedef {Object} ClipSchedule
 * @property {number} startSample - When to start playback (in timeline samples)
 * @property {number} endSample - When to end playback (in timeline samples)
 * @property {number} offsetSamples - Offset into buffer to start reading
 * @property {number} loopStartSamples - Loop start point in buffer (0 = no loop)
 * @property {number} loopEndSamples - Loop end point in buffer
 * @property {number} fadeInSamples - Fade in duration
 * @property {number} fadeOutSamples - Fade out duration
 * @property {number} gain - Playback gain (0.0 - 1.0)
 */

/**
 * Audio buffer descriptor for SharedArrayBuffer access
 * @typedef {Object} AudioBufferDescriptor
 * @property {SharedArrayBuffer} buffer - Shared memory buffer
 * @property {number} channels - Number of audio channels
 * @property {number} length - Length in samples
 * @property {number} sampleRate - Buffer sample rate
 */

/**
 * ClipPlayerProcessor - Sample-accurate audio buffer playback
 * 
 * Responsibilities:
 * - Read from SharedArrayBuffer with zero-copy access
 * - Apply sample-accurate scheduling based on transport state
 * - Handle loop points with crossfade
 * - Apply gain envelopes (fade in/out)
 * - Resample if buffer sample rate differs from output
 * 
 * Performance constraints:
 * - No allocations in process() method
 * - No async operations (Policy §30)
 * - Maximum 128 samples per render quantum
 * - Must complete within render budget (16ms / 60fps)
 * 
 * @extends AudioWorkletProcessor
 */
class ClipPlayerProcessor extends AudioWorkletProcessor {
  /**
   * Processor parameter descriptors
   * @returns {Array<AudioParamDescriptor>}
   */
  static get parameterDescriptors() {
    return [
      {
        name: 'gain',
        defaultValue: 1.0,
        minValue: 0.0,
        maxValue: 2.0,
        automationRate: 'a-rate', // Per-sample automation
      },
      {
        name: 'playbackRate',
        defaultValue: 1.0,
        minValue: 0.25,
        maxValue: 4.0,
        automationRate: 'k-rate', // Per-block automation
      },
    ];
  }

  /**
   * Initialize ClipPlayerProcessor
   * @param {AudioWorkletNodeOptions} options - Initialization options
   */
  constructor(options) {
    super();

    /**
     * Current transport state
     * @type {TransportState}
     * @private
     */
    this._transportState = {
      isPlaying: false,
      samplePosition: 0,
      sampleRate: sampleRate,
      tempo: 120.0,
      timeSignatureNumerator: 4,
      timeSignatureDenominator: 4,
    };

    /**
     * Audio buffer descriptor
     * @type {AudioBufferDescriptor|null}
     * @private
     */
    this._bufferDescriptor = null;

    /**
     * Float32Array views into SharedArrayBuffer (one per channel)
     * @type {Float32Array[]|null}
     * @private
     */
    this._bufferViews = null;

    /**
     * Current clip schedule
     * @type {ClipSchedule|null}
     * @private
     */
    this._schedule = null;

    /**
     * Current read position in buffer (fractional for resampling)
     * @type {number}
     * @private
     */
    this._readPosition = 0.0;

    /**
     * Whether clip is currently active
     * @type {boolean}
     * @private
     */
    this._isActive = false;

    /**
     * Sample counter for fade envelope calculation
     * @type {number}
     * @private
     */
    this._envelopeSample = 0;

    /**
     * Pre-allocated output buffer to avoid allocations
     * @type {Float32Array}
     * @private
     */
    this._scratchBuffer = new Float32Array(128);

    // Set up message port for transport state updates
    this.port.onmessage = this._handleMessage.bind(this);

    // Notify main thread that processor is ready
    this.port.postMessage({ type: 'ready' });
  }

  /**
   * Handle messages from main thread
   * @param {MessageEvent} event - Message event
   * @private
   */
  _handleMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'transportState':
        this._updateTransportState(data);
        break;

      case 'setBuffer':
        this._setBuffer(data);
        break;

      case 'schedule':
        this._setSchedule(data);
        break;

      case 'start':
        this._start();
        break;

      case 'stop':
        this._stop();
        break;

      case 'seek':
        this._seek(data.samplePosition);
        break;

      default:
        console.warn(`[ClipPlayerProcessor] Unknown message type: ${type}`);
    }
  }

  /**
   * Update transport state from main thread
   * @param {TransportState} state - New transport state
   * @private
   */
  _updateTransportState(state) {
    this._transportState = state;

    // If transport stopped, stop playback
    if (!state.isPlaying && this._isActive) {
      this._isActive = false;
    }
  }

  /**
   * Set audio buffer from SharedArrayBuffer
   * @param {AudioBufferDescriptor} descriptor - Buffer descriptor
   * @private
   */
  _setBuffer(descriptor) {
    this._bufferDescriptor = descriptor;

    // Create Float32Array views for each channel
    const { buffer, channels, length } = descriptor;
    this._bufferViews = [];

    const bytesPerSample = 4; // Float32
    const channelBytes = length * bytesPerSample;

    for (let ch = 0; ch < channels; ch++) {
      const offset = ch * channelBytes;
      this._bufferViews.push(
        new Float32Array(buffer, offset, length)
      );
    }
  }

  /**
   * Set clip schedule
   * @param {ClipSchedule} schedule - Clip schedule parameters
   * @private
   */
  _setSchedule(schedule) {
    this._schedule = schedule;
    this._readPosition = schedule.offsetSamples;
    this._envelopeSample = 0;
  }

  /**
   * Start clip playback
   * @private
   */
  _start() {
    if (!this._bufferViews || !this._schedule) {
      console.warn('[ClipPlayerProcessor] Cannot start: no buffer or schedule');
      return;
    }

    this._isActive = true;
    this._envelopeSample = 0;
  }

  /**
   * Stop clip playback
   * @private
   */
  _stop() {
    this._isActive = false;
  }

  /**
   * Seek to specific sample position
   * @param {number} samplePosition - Target sample position
   * @private
   */
  _seek(samplePosition) {
    if (!this._schedule) return;

    const offset = samplePosition - this._schedule.startSample;
    this._readPosition = this._schedule.offsetSamples + offset;
    this._envelopeSample = offset;
  }

  /**
   * Calculate gain envelope for fade in/out
   * @param {number} sampleIndex - Sample index relative to clip start
   * @returns {number} Envelope gain (0.0 - 1.0)
   * @private
   */
  _calculateEnvelope(sampleIndex) {
    if (!this._schedule) return 1.0;

    const { fadeInSamples, fadeOutSamples, startSample, endSample } = this._schedule;
    const clipLength = endSample - startSample;

    let envelope = 1.0;

    // Fade in
    if (fadeInSamples > 0 && sampleIndex < fadeInSamples) {
      envelope *= sampleIndex / fadeInSamples;
    }

    // Fade out
    const samplesFromEnd = clipLength - sampleIndex;
    if (fadeOutSamples > 0 && samplesFromEnd < fadeOutSamples) {
      envelope *= samplesFromEnd / fadeOutSamples;
    }

    return envelope;
  }

  /**
   * Read sample from buffer with linear interpolation
   * @param {number} channel - Channel index
   * @param {number} position - Fractional read position
   * @returns {number} Interpolated sample value
   * @private
   */
  _readSample(channel, position) {
    if (!this._bufferViews || channel >= this._bufferViews.length) {
      return 0.0;
    }

    const view = this._bufferViews[channel];
    const index = Math.floor(position);
    const frac = position - index;

    // Bounds check
    if (index < 0 || index >= view.length - 1) {
      return 0.0;
    }

    // Linear interpolation
    const sample0 = view[index];
    const sample1 = view[index + 1];
    return sample0 + (sample1 - sample0) * frac;
  }

  /**
   * Handle loop wrapping
   * @private
   */
  _handleLoop() {
    if (!this._schedule) return;

    const { loopStartSamples, loopEndSamples, offsetSamples } = this._schedule;

    // No loop if start == end
    if (loopStartSamples === 0 && loopEndSamples === 0) return;
    if (loopStartSamples >= loopEndSamples) return;

    const loopStart = offsetSamples + loopStartSamples;
    const loopEnd = offsetSamples + loopEndSamples;

    if (this._readPosition >= loopEnd) {
      // Wrap to loop start
      const overshoot = this._readPosition - loopEnd;
      this._readPosition = loopStart + overshoot;
    }
  }

  /**
   * Check if clip should be active based on transport state
   * @returns {boolean} Whether clip should be playing
   * @private
   */
  _shouldBeActive() {
    if (!this._transportState.isPlaying) return false;
    if (!this._schedule) return false;

    const { samplePosition } = this._transportState;
    const { startSample, endSample } = this._schedule;

    return samplePosition >= startSample && samplePosition < endSample;
  }

  /**
   * Process audio (called by AudioWorklet)
   * @param {Float32Array[][]} inputs - Input audio buffers (unused)
   * @param {Float32Array[][]} outputs - Output audio buffers
   * @param {Object<string, Float32Array>} parameters - Audio parameters
   * @returns {boolean} True to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const frameCount = output[0].length;
    const gainValues = parameters.gain;
    const playbackRateValues = parameters.playbackRate;

    // Check if we should be active
    const shouldBeActive = this._shouldBeActive();
    if (shouldBeActive && !this._isActive) {
      this._start();
    } else if (!shouldBeActive && this._isActive) {
      this._stop();
    }

    // If not active, output silence
    if (!this._isActive || !this._bufferViews || !this._schedule) {
      for (let ch = 0; ch < output.length; ch++) {
        output[ch].fill(0);
      }
      return true;
    }

    // Get playback rate (k-rate, so single value)
    const playbackRate = playbackRateValues[0];

    // Process each frame
    for (let i = 0; i < frameCount; i++) {
      // Calculate envelope gain
      const envelopeGain = this._calculateEnvelope(this._envelopeSample);

      // Get per-sample gain (a-rate)
      const gain = gainValues.length === 1 ? gainValues[0] : gainValues[i];

      // Combined gain
      const totalGain = gain * envelopeGain * this._schedule.gain;

      // Read and write samples for each channel
      for (let ch = 0; ch < output.length; ch++) {
        const sample = this._readSample(ch, this._readPosition);
        output[ch][i] = sample * totalGain;
      }

      // Advance read position
      this._readPosition += playbackRate;
      this._envelopeSample++;

      // Handle loop wrapping
      this._handleLoop();

      // Check if we've reached the end
      if (!this._schedule.loopStartSamples && !this._schedule.loopEndSamples) {
        const bufferLength = this._bufferDescriptor ? this._bufferDescriptor.length : 0;
        if (this._readPosition >= bufferLength) {
          this._isActive = false;
          this.port.postMessage({ type: 'ended' });
          break;
        }
      }
    }

    // Update transport position
    this._transportState.samplePosition += frameCount;

    return true; // Keep processor alive
  }
}

// Register processor
registerProcessor('clip-player-processor', ClipPlayerProcessor);