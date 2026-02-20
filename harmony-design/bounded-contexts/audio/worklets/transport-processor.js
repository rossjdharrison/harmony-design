/**
 * @fileoverview TransportProcessor - Audio Worklet for sample-accurate transport
 * @module bounded-contexts/audio/worklets/transport-processor
 * 
 * Runs on audio render thread for precise timing.
 * Integrates with harmony-sound/domains/scheduling for scheduling events.
 * 
 * Performance constraints:
 * - Must complete within 128 samples (2.67ms at 48kHz)
 * - No allocations in process() method
 * - No async operations
 * 
 * Related: DESIGN_SYSTEM.md § Audio Worklet Architecture
 */

/**
 * Transport state constants (must match TransportState enum)
 * @const {Object}
 */
const TransportState = {
  STOPPED: 'stopped',
  PLAYING: 'playing',
  PAUSED: 'paused',
  RECORDING: 'recording'
};

/**
 * TransportProcessor - Sample-accurate transport timing on audio thread
 * 
 * @class
 * @extends AudioWorkletProcessor
 */
class TransportProcessor extends AudioWorkletProcessor {
  /**
   * @param {Object} options - Processor options
   */
  constructor(options) {
    super();

    const processorOptions = options.processorOptions || {};

    /** @private {number} */
    this._sampleRate = processorOptions.sampleRate || 48000;

    /** @private {string} */
    this._state = TransportState.STOPPED;

    /** @private {number} Sample position */
    this._position = 0;

    /** @private {number} Beats per minute */
    this._tempo = processorOptions.tempo || 120.0;

    /** @private {number} */
    this._timeSignatureNumerator = processorOptions.timeSignature?.numerator || 4;

    /** @private {number} */
    this._timeSignatureDenominator = processorOptions.timeSignature?.denominator || 4;

    /** @private {number} Samples per beat */
    this._samplesPerBeat = this._calculateSamplesPerBeat();

    /** @private {number} Frame counter for position updates */
    this._framesSinceLastUpdate = 0;

    /** @private {number} Update position every N frames (60 Hz) */
    this._updateInterval = Math.floor(this._sampleRate / 60);

    /** @private {number|null} Scheduled tempo change */
    this._scheduledTempo = null;

    /** @private {number|null} Sample frame for tempo change */
    this._scheduledTempoFrame = null;

    // Setup message port handler
    this.port.onmessage = (event) => {
      this._handleMessage(event.data);
    };
  }

  /**
   * Static getter for processor parameter descriptors
   * @returns {Array<AudioParamDescriptor>}
   */
  static get parameterDescriptors() {
    return [
      {
        name: 'tempo',
        defaultValue: 120.0,
        minValue: 20.0,
        maxValue: 999.0,
        automationRate: 'k-rate'
      }
    ];
  }

  /**
   * Calculate samples per beat based on current tempo
   * @private
   * @returns {number}
   */
  _calculateSamplesPerBeat() {
    const secondsPerBeat = 60.0 / this._tempo;
    return secondsPerBeat * this._sampleRate;
  }

  /**
   * Handle messages from main thread
   * @private
   * @param {Object} message - Message object
   */
  _handleMessage(message) {
    switch (message.type) {
      case 'play':
        this._handlePlay(message);
        break;

      case 'pause':
        this._handlePause(message);
        break;

      case 'stop':
        this._handleStop(message);
        break;

      case 'seek':
        this._handleSeek(message);
        break;

      case 'setTempo':
        this._handleSetTempo(message);
        break;

      case 'setTimeSignature':
        this._handleSetTimeSignature(message);
        break;

      default:
        console.warn('TransportProcessor: Unknown message type:', message.type);
    }
  }

  /**
   * Handle play command
   * @private
   * @param {Object} message
   */
  _handlePlay(message) {
    if (this._state === TransportState.PLAYING) {
      return;
    }

    this._state = TransportState.PLAYING;

    this.port.postMessage({
      type: 'stateChanged',
      state: this._state,
      timestamp: currentTime
    });
  }

  /**
   * Handle pause command
   * @private
   * @param {Object} message
   */
  _handlePause(message) {
    if (this._state !== TransportState.PLAYING) {
      return;
    }

    this._state = TransportState.PAUSED;

    this.port.postMessage({
      type: 'stateChanged',
      state: this._state,
      timestamp: currentTime
    });
  }

  /**
   * Handle stop command
   * @private
   * @param {Object} message
   */
  _handleStop(message) {
    this._state = TransportState.STOPPED;
    this._position = 0;

    this.port.postMessage({
      type: 'stateChanged',
      state: this._state,
      timestamp: currentTime
    });

    // Send immediate position update
    this._sendPositionUpdate();
  }

  /**
   * Handle seek command
   * @private
   * @param {Object} message
   */
  _handleSeek(message) {
    if (typeof message.position !== 'number' || message.position < 0) {
      this.port.postMessage({
        type: 'error',
        error: 'Invalid seek position'
      });
      return;
    }

    this._position = Math.floor(message.position);

    // Send immediate position update
    this._sendPositionUpdate();
  }

  /**
   * Handle tempo change command
   * @private
   * @param {Object} message
   */
  _handleSetTempo(message) {
    const newTempo = message.tempo;

    if (typeof newTempo !== 'number' || newTempo < 20 || newTempo > 999) {
      this.port.postMessage({
        type: 'error',
        error: 'Invalid tempo value'
      });
      return;
    }

    // Schedule tempo change for next quantum boundary
    // This ensures sample-accurate tempo changes
    this._scheduledTempo = newTempo;
    this._scheduledTempoFrame = this._position + 128; // Next quantum

    this._tempo = newTempo;
    this._samplesPerBeat = this._calculateSamplesPerBeat();
  }

  /**
   * Handle time signature change command
   * @private
   * @param {Object} message
   */
  _handleSetTimeSignature(message) {
    const { numerator, denominator } = message;

    if (typeof numerator !== 'number' || numerator < 1 || numerator > 32) {
      this.port.postMessage({
        type: 'error',
        error: 'Invalid time signature numerator'
      });
      return;
    }

    const validDenominators = [1, 2, 4, 8, 16, 32];
    if (!validDenominators.includes(denominator)) {
      this.port.postMessage({
        type: 'error',
        error: 'Invalid time signature denominator'
      });
      return;
    }

    this._timeSignatureNumerator = numerator;
    this._timeSignatureDenominator = denominator;
  }

  /**
   * Send position update to main thread
   * @private
   */
  _sendPositionUpdate() {
    const musicalTime = this._calculateMusicalTime(this._position);

    this.port.postMessage({
      type: 'position',
      position: this._position,
      beat: musicalTime.beat,
      bar: musicalTime.bar,
      tick: musicalTime.tick,
      timestamp: currentTime
    });
  }

  /**
   * Calculate musical time from sample position
   * @private
   * @param {number} samples - Sample position
   * @returns {{bar: number, beat: number, tick: number}}
   */
  _calculateMusicalTime(samples) {
    const totalBeats = samples / this._samplesPerBeat;
    const beatsPerBar = this._timeSignatureNumerator;
    
    const bar = Math.floor(totalBeats / beatsPerBar);
    const beat = Math.floor(totalBeats % beatsPerBar);
    const tick = Math.floor((totalBeats % 1) * 960); // 960 ticks per beat

    return { bar, beat, tick };
  }

  /**
   * Process audio (runs on audio thread)
   * 
   * CRITICAL: Must complete within 128 samples (2.67ms at 48kHz)
   * No allocations, no async operations allowed.
   * 
   * @param {Array<Float32Array[]>} inputs - Input audio buffers (unused)
   * @param {Array<Float32Array[]>} outputs - Output audio buffers (unused)
   * @param {Object} parameters - Audio parameters
   * @returns {boolean} - true to keep processor alive
   */
  process(inputs, outputs, parameters) {
    // Handle tempo automation via AudioParam
    const tempoParam = parameters.tempo;
    if (tempoParam && tempoParam.length > 0) {
      const newTempo = tempoParam[0];
      if (newTempo !== this._tempo) {
        this._tempo = newTempo;
        this._samplesPerBeat = this._calculateSamplesPerBeat();
      }
    }

    // Advance position if playing
    if (this._state === TransportState.PLAYING) {
      this._position += 128; // Quantum size

      // Check for scheduled tempo change
      if (this._scheduledTempo !== null && 
          this._position >= this._scheduledTempoFrame) {
        this._tempo = this._scheduledTempo;
        this._samplesPerBeat = this._calculateSamplesPerBeat();
        this._scheduledTempo = null;
        this._scheduledTempoFrame = null;
      }
    }

    // Send position updates at ~60 Hz
    this._framesSinceLastUpdate += 128;
    if (this._framesSinceLastUpdate >= this._updateInterval) {
      this._sendPositionUpdate();
      this._framesSinceLastUpdate = 0;
    }

    // Keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor('transport-processor', TransportProcessor);