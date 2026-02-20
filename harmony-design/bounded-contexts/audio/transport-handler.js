/**
 * @fileoverview TransportHandler - Bridge between UI transport controls and Audio Worklet
 * @module bounded-contexts/audio/transport-handler
 * 
 * Provides sample-accurate playhead position tracking and tempo changes via AudioParam.
 * Integrates with harmony-sound/domains/scheduling for precise timing control.
 * 
 * Architecture:
 * - UI publishes transport commands via EventBus
 * - TransportHandler translates to AudioWorklet messages
 * - TransportProcessor (worklet) handles sample-accurate scheduling
 * - Position updates flow back via MessagePort
 * 
 * Related: DESIGN_SYSTEM.md § Audio Transport Architecture
 */

import { EventBus } from '../../core/event-bus.js';

/**
 * Transport state enumeration
 * @enum {string}
 */
export const TransportState = {
  STOPPED: 'stopped',
  PLAYING: 'playing',
  PAUSED: 'paused',
  RECORDING: 'recording'
};

/**
 * TransportHandler - Manages transport state and bridges UI to Audio Worklet
 * 
 * @class
 * @example
 * const transport = new TransportHandler(audioContext);
 * await transport.initialize();
 * transport.play();
 */
export class TransportHandler {
  /**
   * @param {AudioContext} audioContext - Web Audio API context
   */
  constructor(audioContext) {
    if (!audioContext) {
      throw new Error('TransportHandler requires AudioContext');
    }

    /** @private {AudioContext} */
    this._audioContext = audioContext;

    /** @private {AudioWorkletNode|null} */
    this._workletNode = null;

    /** @private {TransportState} */
    this._state = TransportState.STOPPED;

    /** @private {number} Sample position in frames */
    this._playheadPosition = 0;

    /** @private {number} Beats per minute */
    this._tempo = 120.0;

    /** @private {number} Time signature numerator */
    this._timeSignatureNumerator = 4;

    /** @private {number} Time signature denominator */
    this._timeSignatureDenominator = 4;

    /** @private {boolean} */
    this._isInitialized = false;

    /** @private {EventBus} */
    this._eventBus = EventBus.getInstance();

    /** @private {number} Request ID for position updates */
    this._positionUpdateRequestId = null;

    this._setupEventSubscriptions();
  }

  /**
   * Initialize the transport handler and load worklet processor
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._isInitialized) {
      console.warn('TransportHandler already initialized');
      return;
    }

    try {
      // Load the transport processor worklet
      await this._audioContext.audioWorklet.addModule(
        '/bounded-contexts/audio/worklets/transport-processor.js'
      );

      // Create worklet node
      this._workletNode = new AudioWorkletNode(
        this._audioContext,
        'transport-processor',
        {
          numberOfInputs: 0,
          numberOfOutputs: 0,
          processorOptions: {
            sampleRate: this._audioContext.sampleRate,
            tempo: this._tempo,
            timeSignature: {
              numerator: this._timeSignatureNumerator,
              denominator: this._timeSignatureDenominator
            }
          }
        }
      );

      // Setup message handling from worklet
      this._workletNode.port.onmessage = (event) => {
        this._handleWorkletMessage(event.data);
      };

      this._isInitialized = true;

      this._eventBus.publish({
        type: 'transport.initialized',
        payload: {
          sampleRate: this._audioContext.sampleRate,
          tempo: this._tempo
        }
      });

    } catch (error) {
      console.error('Failed to initialize TransportHandler:', error);
      this._eventBus.publish({
        type: 'transport.error',
        payload: {
          error: error.message,
          context: 'initialization'
        }
      });
      throw error;
    }
  }

  /**
   * Setup EventBus subscriptions for transport commands
   * @private
   */
  _setupEventSubscriptions() {
    // Play command
    this._eventBus.subscribe('transport.play', () => {
      this.play();
    });

    // Pause command
    this._eventBus.subscribe('transport.pause', () => {
      this.pause();
    });

    // Stop command
    this._eventBus.subscribe('transport.stop', () => {
      this.stop();
    });

    // Seek command
    this._eventBus.subscribe('transport.seek', (event) => {
      const { position } = event.payload;
      this.seek(position);
    });

    // Tempo change command
    this._eventBus.subscribe('transport.setTempo', (event) => {
      const { tempo } = event.payload;
      this.setTempo(tempo);
    });

    // Time signature change command
    this._eventBus.subscribe('transport.setTimeSignature', (event) => {
      const { numerator, denominator } = event.payload;
      this.setTimeSignature(numerator, denominator);
    });
  }

  /**
   * Handle messages from the worklet processor
   * @private
   * @param {Object} message - Message from worklet
   */
  _handleWorkletMessage(message) {
    switch (message.type) {
      case 'position':
        this._playheadPosition = message.position;
        this._eventBus.publish({
          type: 'transport.positionUpdate',
          payload: {
            position: message.position,
            beat: message.beat,
            bar: message.bar,
            tick: message.tick,
            timestamp: message.timestamp
          }
        });
        break;

      case 'stateChanged':
        this._state = message.state;
        this._eventBus.publish({
          type: 'transport.stateChanged',
          payload: {
            state: message.state,
            timestamp: message.timestamp
          }
        });
        break;

      case 'error':
        console.error('TransportProcessor error:', message.error);
        this._eventBus.publish({
          type: 'transport.error',
          payload: {
            error: message.error,
            context: 'worklet'
          }
        });
        break;

      default:
        console.warn('Unknown message type from TransportProcessor:', message.type);
    }
  }

  /**
   * Start playback
   * @returns {void}
   */
  play() {
    if (!this._isInitialized) {
      throw new Error('TransportHandler not initialized');
    }

    if (this._state === TransportState.PLAYING) {
      return;
    }

    this._workletNode.port.postMessage({
      type: 'play',
      timestamp: this._audioContext.currentTime
    });

    this._eventBus.publish({
      type: 'transport.playRequested',
      payload: {
        position: this._playheadPosition
      }
    });
  }

  /**
   * Pause playback (maintains position)
   * @returns {void}
   */
  pause() {
    if (!this._isInitialized) {
      throw new Error('TransportHandler not initialized');
    }

    if (this._state !== TransportState.PLAYING) {
      return;
    }

    this._workletNode.port.postMessage({
      type: 'pause',
      timestamp: this._audioContext.currentTime
    });

    this._eventBus.publish({
      type: 'transport.pauseRequested',
      payload: {
        position: this._playheadPosition
      }
    });
  }

  /**
   * Stop playback (resets position to zero)
   * @returns {void}
   */
  stop() {
    if (!this._isInitialized) {
      throw new Error('TransportHandler not initialized');
    }

    this._workletNode.port.postMessage({
      type: 'stop',
      timestamp: this._audioContext.currentTime
    });

    this._eventBus.publish({
      type: 'transport.stopRequested',
      payload: {
        position: 0
      }
    });
  }

  /**
   * Seek to specific sample position
   * @param {number} position - Sample frame position
   * @returns {void}
   */
  seek(position) {
    if (!this._isInitialized) {
      throw new Error('TransportHandler not initialized');
    }

    if (typeof position !== 'number' || position < 0) {
      throw new Error('Invalid seek position');
    }

    this._workletNode.port.postMessage({
      type: 'seek',
      position: Math.floor(position),
      timestamp: this._audioContext.currentTime
    });

    this._eventBus.publish({
      type: 'transport.seekRequested',
      payload: {
        position: Math.floor(position)
      }
    });
  }

  /**
   * Set tempo (BPM) with sample-accurate scheduling
   * @param {number} tempo - Beats per minute (20-999)
   * @param {number} [scheduleTime] - When to apply change (audioContext time)
   * @returns {void}
   */
  setTempo(tempo, scheduleTime = null) {
    if (!this._isInitialized) {
      throw new Error('TransportHandler not initialized');
    }

    if (typeof tempo !== 'number' || tempo < 20 || tempo > 999) {
      throw new Error('Tempo must be between 20 and 999 BPM');
    }

    const time = scheduleTime !== null 
      ? scheduleTime 
      : this._audioContext.currentTime;

    this._tempo = tempo;

    this._workletNode.port.postMessage({
      type: 'setTempo',
      tempo: tempo,
      scheduleTime: time
    });

    this._eventBus.publish({
      type: 'transport.tempoChanged',
      payload: {
        tempo: tempo,
        scheduleTime: time
      }
    });
  }

  /**
   * Set time signature
   * @param {number} numerator - Beats per bar (1-32)
   * @param {number} denominator - Note value (1, 2, 4, 8, 16, 32)
   * @returns {void}
   */
  setTimeSignature(numerator, denominator) {
    if (!this._isInitialized) {
      throw new Error('TransportHandler not initialized');
    }

    if (typeof numerator !== 'number' || numerator < 1 || numerator > 32) {
      throw new Error('Time signature numerator must be between 1 and 32');
    }

    const validDenominators = [1, 2, 4, 8, 16, 32];
    if (!validDenominators.includes(denominator)) {
      throw new Error('Time signature denominator must be 1, 2, 4, 8, 16, or 32');
    }

    this._timeSignatureNumerator = numerator;
    this._timeSignatureDenominator = denominator;

    this._workletNode.port.postMessage({
      type: 'setTimeSignature',
      numerator: numerator,
      denominator: denominator
    });

    this._eventBus.publish({
      type: 'transport.timeSignatureChanged',
      payload: {
        numerator: numerator,
        denominator: denominator
      }
    });
  }

  /**
   * Get current transport state
   * @returns {TransportState}
   */
  getState() {
    return this._state;
  }

  /**
   * Get current playhead position in samples
   * @returns {number}
   */
  getPosition() {
    return this._playheadPosition;
  }

  /**
   * Get current tempo
   * @returns {number}
   */
  getTempo() {
    return this._tempo;
  }

  /**
   * Get current time signature
   * @returns {{numerator: number, denominator: number}}
   */
  getTimeSignature() {
    return {
      numerator: this._timeSignatureNumerator,
      denominator: this._timeSignatureDenominator
    };
  }

  /**
   * Convert sample position to musical time
   * @param {number} samples - Sample frame position
   * @returns {{bar: number, beat: number, tick: number}}
   */
  samplesToMusicalTime(samples) {
    const sampleRate = this._audioContext.sampleRate;
    const secondsPerBeat = 60.0 / this._tempo;
    const samplesPerBeat = secondsPerBeat * sampleRate;
    const totalBeats = samples / samplesPerBeat;
    
    const beatsPerBar = this._timeSignatureNumerator;
    const bar = Math.floor(totalBeats / beatsPerBar);
    const beat = Math.floor(totalBeats % beatsPerBar);
    const tick = Math.floor((totalBeats % 1) * 960); // 960 ticks per beat (MIDI standard)

    return { bar, beat, tick };
  }

  /**
   * Convert musical time to sample position
   * @param {number} bar - Bar number (0-indexed)
   * @param {number} beat - Beat number (0-indexed)
   * @param {number} tick - Tick number (0-959)
   * @returns {number} Sample frame position
   */
  musicalTimeToSamples(bar, beat, tick) {
    const sampleRate = this._audioContext.sampleRate;
    const secondsPerBeat = 60.0 / this._tempo;
    const samplesPerBeat = secondsPerBeat * sampleRate;
    
    const beatsPerBar = this._timeSignatureNumerator;
    const totalBeats = (bar * beatsPerBar) + beat + (tick / 960.0);
    
    return Math.floor(totalBeats * samplesPerBeat);
  }

  /**
   * Cleanup and release resources
   * @returns {void}
   */
  dispose() {
    if (this._positionUpdateRequestId !== null) {
      cancelAnimationFrame(this._positionUpdateRequestId);
      this._positionUpdateRequestId = null;
    }

    if (this._workletNode) {
      this._workletNode.port.onmessage = null;
      this._workletNode.disconnect();
      this._workletNode = null;
    }

    this._isInitialized = false;

    this._eventBus.publish({
      type: 'transport.disposed',
      payload: {}
    });
  }
}