/**
 * @fileoverview ChannelStrip composite component
 * 
 * Assembles fader, knob, meter, and buttons into a channel strip control.
 * See harmony-design/DESIGN_SYSTEM.md#channel-strip for usage and patterns.
 * 
 * @module components/organisms/channel-strip
 */

/**
 * ChannelStrip composite component
 * 
 * A vertical channel strip combining:
 * - Gain knob (top)
 * - Level meter (middle)
 * - Volume fader (middle-bottom)
 * - Control buttons: solo, mute, record arm (bottom)
 * 
 * Publishes events via EventBus for all user interactions.
 * Does not call bounded contexts directly.
 * 
 * @fires channel-strip:gain-change - When gain knob changes
 * @fires channel-strip:volume-change - When volume fader changes
 * @fires channel-strip:solo-toggle - When solo button toggled
 * @fires channel-strip:mute-toggle - When mute button toggled
 * @fires channel-strip:record-toggle - When record arm toggled
 * 
 * @example
 * <harmony-channel-strip 
 *   channel-id="track-1"
 *   label="Vocals"
 *   gain="0"
 *   volume="-6"
 *   solo="false"
 *   mute="false"
 *   record="false">
 * </harmony-channel-strip>
 */
class ChannelStrip extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._channelId = '';
    this._label = 'Channel';
    this._gain = 0;
    this._volume = 0;
    this._solo = false;
    this._mute = false;
    this._record = false;
    this._meterLevel = -60; // dB
    this._meterPeak = -60;
  }

  static get observedAttributes() {
    return [
      'channel-id',
      'label',
      'gain',
      'volume',
      'solo',
      'mute',
      'record',
      'meter-level',
      'meter-peak'
    ];
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    this.detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'channel-id':
        this._channelId = newValue;
        break;
      case 'label':
        this._label = newValue;
        this.updateLabel();
        break;
      case 'gain':
        this._gain = parseFloat(newValue) || 0;
        this.updateGain();
        break;
      case 'volume':
        this._volume = parseFloat(newValue) || 0;
        this.updateVolume();
        break;
      case 'solo':
        this._solo = newValue === 'true';
        this.updateSolo();
        break;
      case 'mute':
        this._mute = newValue === 'true';
        this.updateMute();
        break;
      case 'record':
        this._record = newValue === 'true';
        this.updateRecord();
        break;
      case 'meter-level':
        this._meterLevel = parseFloat(newValue) || -60;
        this.updateMeter();
        break;
      case 'meter-peak':
        this._meterPeak = parseFloat(newValue) || -60;
        this.updateMeterPeak();
        break;
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: 80px;
          height: 400px;
          background: var(--surface-color, #2a2a2a);
          border: 1px solid var(--border-color, #444);
          border-radius: 4px;
          padding: 12px 8px;
          box-sizing: border-box;
          font-family: var(--font-family, system-ui, -apple-system, sans-serif);
          color: var(--text-color, #e0e0e0);
        }

        .channel-strip {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          gap: 8px;
        }

        .label {
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
          margin-bottom: 4px;
        }

        .gain-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .gain-label {
          font-size: 9px;
          color: var(--text-secondary-color, #999);
        }

        .gain-value {
          font-size: 10px;
          font-family: monospace;
          min-width: 40px;
          text-align: center;
        }

        .meter-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          min-height: 120px;
        }

        .meter {
          width: 16px;
          height: 100%;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 2px;
          position: relative;
          overflow: hidden;
        }

        .meter-fill {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, #00ff00 0%, #ffff00 70%, #ff0000 90%);
          transition: height 50ms ease-out;
          height: 0%;
        }

        .meter-peak {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: #ff0000;
          transition: bottom 100ms ease-out;
          bottom: 0%;
        }

        .fader-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .volume-value {
          font-size: 10px;
          font-family: monospace;
          min-width: 40px;
          text-align: center;
        }

        .buttons-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }

        .button-row {
          display: flex;
          gap: 4px;
          justify-content: center;
        }

        /* Placeholder styles for child components until they're loaded */
        harmony-knob {
          width: 48px;
          height: 48px;
        }

        harmony-fader {
          height: 80px;
        }

        harmony-toggle {
          width: 100%;
        }

        .solo-button {
          --toggle-active-color: #ffaa00;
        }

        .mute-button {
          --toggle-active-color: #ff4444;
        }

        .record-button {
          --toggle-active-color: #ff0000;
        }
      </style>

      <div class="channel-strip">
        <div class="label">${this._label}</div>

        <div class="gain-section">
          <span class="gain-label">GAIN</span>
          <harmony-knob 
            id="gain-knob"
            min="-12"
            max="12"
            value="${this._gain}"
            step="0.1">
          </harmony-knob>
          <span class="gain-value">${this.formatDb(this._gain)}</span>
        </div>

        <div class="meter-section">
          <div class="meter">
            <div class="meter-fill" id="meter-fill"></div>
            <div class="meter-peak" id="meter-peak"></div>
          </div>
        </div>

        <div class="fader-section">
          <harmony-fader
            id="volume-fader"
            min="-60"
            max="12"
            value="${this._volume}"
            step="0.1"
            orientation="vertical">
          </harmony-fader>
          <span class="volume-value">${this.formatDb(this._volume)}</span>
        </div>

        <div class="buttons-section">
          <harmony-toggle
            id="solo-button"
            class="solo-button"
            label="S"
            active="${this._solo}">
          </harmony-toggle>
          <harmony-toggle
            id="mute-button"
            class="mute-button"
            label="M"
            active="${this._mute}">
          </harmony-toggle>
          <harmony-toggle
            id="record-button"
            class="record-button"
            label="R"
            active="${this._record}">
          </harmony-toggle>
        </div>
      </div>
    `;
  }

  /**
   * Format decibel value for display
   * @param {number} value - Value in dB
   * @returns {string} Formatted string
   */
  formatDb(value) {
    if (value <= -60) return '-∞';
    return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  }

  /**
   * Convert dB to percentage for meter display
   * @param {number} db - Value in dB (-60 to +12)
   * @returns {number} Percentage (0-100)
   */
  dbToPercent(db) {
    if (db <= -60) return 0;
    if (db >= 12) return 100;
    // Linear scale from -60dB to +12dB
    return ((db + 60) / 72) * 100;
  }

  attachEventListeners() {
    const gainKnob = this.shadowRoot.getElementById('gain-knob');
    const volumeFader = this.shadowRoot.getElementById('volume-fader');
    const soloButton = this.shadowRoot.getElementById('solo-button');
    const muteButton = this.shadowRoot.getElementById('mute-button');
    const recordButton = this.shadowRoot.getElementById('record-button');

    if (gainKnob) {
      gainKnob.addEventListener('change', this.handleGainChange.bind(this));
    }

    if (volumeFader) {
      volumeFader.addEventListener('change', this.handleVolumeChange.bind(this));
    }

    if (soloButton) {
      soloButton.addEventListener('toggle', this.handleSoloToggle.bind(this));
    }

    if (muteButton) {
      muteButton.addEventListener('toggle', this.handleMuteToggle.bind(this));
    }

    if (recordButton) {
      recordButton.addEventListener('toggle', this.handleRecordToggle.bind(this));
    }
  }

  detachEventListeners() {
    const gainKnob = this.shadowRoot.getElementById('gain-knob');
    const volumeFader = this.shadowRoot.getElementById('volume-fader');
    const soloButton = this.shadowRoot.getElementById('solo-button');
    const muteButton = this.shadowRoot.getElementById('mute-button');
    const recordButton = this.shadowRoot.getElementById('record-button');

    if (gainKnob) {
      gainKnob.removeEventListener('change', this.handleGainChange.bind(this));
    }

    if (volumeFader) {
      volumeFader.removeEventListener('change', this.handleVolumeChange.bind(this));
    }

    if (soloButton) {
      soloButton.removeEventListener('toggle', this.handleSoloToggle.bind(this));
    }

    if (muteButton) {
      muteButton.removeEventListener('toggle', this.handleMuteToggle.bind(this));
    }

    if (recordButton) {
      recordButton.removeEventListener('toggle', this.handleRecordToggle.bind(this));
    }
  }

  handleGainChange(event) {
    const value = parseFloat(event.detail.value);
    this._gain = value;
    
    // Update display
    const gainValue = this.shadowRoot.querySelector('.gain-value');
    if (gainValue) {
      gainValue.textContent = this.formatDb(value);
    }

    // Publish event via EventBus
    this.publishEvent('channel-strip:gain-change', {
      channelId: this._channelId,
      gain: value
    });
  }

  handleVolumeChange(event) {
    const value = parseFloat(event.detail.value);
    this._volume = value;
    
    // Update display
    const volumeValue = this.shadowRoot.querySelector('.volume-value');
    if (volumeValue) {
      volumeValue.textContent = this.formatDb(value);
    }

    // Publish event via EventBus
    this.publishEvent('channel-strip:volume-change', {
      channelId: this._channelId,
      volume: value
    });
  }

  handleSoloToggle(event) {
    this._solo = event.detail.active;
    
    // Publish event via EventBus
    this.publishEvent('channel-strip:solo-toggle', {
      channelId: this._channelId,
      solo: this._solo
    });
  }

  handleMuteToggle(event) {
    this._mute = event.detail.active;
    
    // Publish event via EventBus
    this.publishEvent('channel-strip:mute-toggle', {
      channelId: this._channelId,
      mute: this._mute
    });
  }

  handleRecordToggle(event) {
    this._record = event.detail.active;
    
    // Publish event via EventBus
    this.publishEvent('channel-strip:record-toggle', {
      channelId: this._channelId,
      record: this._record
    });
  }

  /**
   * Publish event to EventBus
   * Pattern: UI components publish events, never call BCs directly
   * @param {string} eventType - Event type
   * @param {object} payload - Event payload
   */
  publishEvent(eventType, payload) {
    const event = new CustomEvent('eventbus:publish', {
      bubbles: true,
      composed: true,
      detail: {
        type: eventType,
        payload: payload,
        timestamp: Date.now()
      }
    });
    this.dispatchEvent(event);
  }

  updateLabel() {
    const label = this.shadowRoot.querySelector('.label');
    if (label) {
      label.textContent = this._label;
    }
  }

  updateGain() {
    const gainKnob = this.shadowRoot.getElementById('gain-knob');
    if (gainKnob) {
      gainKnob.setAttribute('value', this._gain);
    }
    
    const gainValue = this.shadowRoot.querySelector('.gain-value');
    if (gainValue) {
      gainValue.textContent = this.formatDb(this._gain);
    }
  }

  updateVolume() {
    const volumeFader = this.shadowRoot.getElementById('volume-fader');
    if (volumeFader) {
      volumeFader.setAttribute('value', this._volume);
    }
    
    const volumeValue = this.shadowRoot.querySelector('.volume-value');
    if (volumeValue) {
      volumeValue.textContent = this.formatDb(this._volume);
    }
  }

  updateSolo() {
    const soloButton = this.shadowRoot.getElementById('solo-button');
    if (soloButton) {
      soloButton.setAttribute('active', this._solo);
    }
  }

  updateMute() {
    const muteButton = this.shadowRoot.getElementById('mute-button');
    if (muteButton) {
      muteButton.setAttribute('active', this._mute);
    }
  }

  updateRecord() {
    const recordButton = this.shadowRoot.getElementById('record-button');
    if (recordButton) {
      recordButton.setAttribute('active', this._record);
    }
  }

  updateMeter() {
    const meterFill = this.shadowRoot.getElementById('meter-fill');
    if (meterFill) {
      const percent = this.dbToPercent(this._meterLevel);
      meterFill.style.height = `${percent}%`;
    }
  }

  updateMeterPeak() {
    const meterPeak = this.shadowRoot.getElementById('meter-peak');
    if (meterPeak) {
      const percent = this.dbToPercent(this._meterPeak);
      meterPeak.style.bottom = `${percent}%`;
    }
  }

  // Public API

  /**
   * Set meter level (typically called by audio processing)
   * @param {number} db - Level in dB
   */
  setMeterLevel(db) {
    this._meterLevel = db;
    this.updateMeter();
  }

  /**
   * Set meter peak hold
   * @param {number} db - Peak level in dB
   */
  setMeterPeak(db) {
    this._meterPeak = db;
    this.updateMeterPeak();
  }

  /**
   * Get current channel state
   * @returns {object} Channel state
   */
  getState() {
    return {
      channelId: this._channelId,
      label: this._label,
      gain: this._gain,
      volume: this._volume,
      solo: this._solo,
      mute: this._mute,
      record: this._record,
      meterLevel: this._meterLevel,
      meterPeak: this._meterPeak
    };
  }
}

customElements.define('harmony-channel-strip', ChannelStrip);

export { ChannelStrip };