/**
 * @fileoverview TransportBar composite component with playback controls
 * @module components/composites/transport-bar
 * 
 * TransportBar provides standard DAW transport controls including play, pause,
 * stop, record, and position display. Publishes events to EventBus for
 * playback control commands.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#transport-bar
 */

/**
 * TransportBar composite component
 * Assembles playback control buttons and position display
 * 
 * @fires transport-play - User requests playback start
 * @fires transport-pause - User requests playback pause
 * @fires transport-stop - User requests playback stop
 * @fires transport-record - User toggles recording
 * 
 * @example
 * <harmony-transport-bar></harmony-transport-bar>
 */
class HarmonyTransportBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._isPlaying = false;
    this._isPaused = false;
    this._isRecording = false;
    this._position = '00:00:000';
    this._bpm = 120;
    
    this._render();
    this._attachEventListeners();
  }

  static get observedAttributes() {
    return ['position', 'bpm', 'playing', 'recording'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'position':
        this._position = newValue;
        this._updatePosition();
        break;
      case 'bpm':
        this._bpm = parseFloat(newValue) || 120;
        this._updateBPM();
        break;
      case 'playing':
        this._isPlaying = newValue !== null;
        this._updatePlayState();
        break;
      case 'recording':
        this._isRecording = newValue !== null;
        this._updateRecordState();
        break;
    }
  }

  /**
   * Render the component structure
   * @private
   */
  _render() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          --transport-bg: #2a2a2a;
          --transport-border: #3a3a3a;
          --transport-text: #e0e0e0;
          --button-size: 40px;
          --button-gap: 8px;
          --play-color: #4caf50;
          --stop-color: #666;
          --record-color: #f44336;
          --record-active: #ff1744;
        }

        .transport-container {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: var(--transport-bg);
          border: 1px solid var(--transport-border);
          border-radius: 4px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .controls-group {
          display: flex;
          align-items: center;
          gap: var(--button-gap);
        }

        .transport-button {
          width: var(--button-size);
          height: var(--button-size);
          border: none;
          border-radius: 4px;
          background: #3a3a3a;
          color: var(--transport-text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          position: relative;
        }

        .transport-button:hover {
          background: #4a4a4a;
          transform: translateY(-1px);
        }

        .transport-button:active {
          transform: translateY(0);
        }

        .transport-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .transport-button.active {
          background: var(--play-color);
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
        }

        .transport-button.recording {
          background: var(--record-active);
          box-shadow: 0 0 8px rgba(255, 23, 68, 0.4);
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Button icons using CSS shapes */
        .icon-play {
          width: 0;
          height: 0;
          border-left: 12px solid currentColor;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          margin-left: 2px;
        }

        .icon-pause {
          width: 12px;
          height: 16px;
          border-left: 4px solid currentColor;
          border-right: 4px solid currentColor;
        }

        .icon-stop {
          width: 14px;
          height: 14px;
          background: currentColor;
        }

        .icon-record {
          width: 16px;
          height: 16px;
          background: var(--record-color);
          border-radius: 50%;
        }

        .icon-record.active {
          background: var(--record-active);
        }

        .position-display {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
          border-left: 1px solid var(--transport-border);
          border-right: 1px solid var(--transport-border);
        }

        .position-time {
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: 600;
          color: var(--transport-text);
          letter-spacing: 1px;
          min-width: 100px;
        }

        .bpm-display {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          color: var(--transport-text);
        }

        .bpm-value {
          font-weight: 600;
          min-width: 40px;
        }

        .bpm-label {
          opacity: 0.7;
          font-size: 12px;
        }

        /* Accessibility */
        .transport-button:focus-visible {
          outline: 2px solid #4caf50;
          outline-offset: 2px;
        }
      </style>

      <div class="transport-container">
        <div class="controls-group">
          <button 
            class="transport-button" 
            id="play-btn"
            aria-label="Play"
            title="Play (Space)">
            <div class="icon-play"></div>
          </button>
          
          <button 
            class="transport-button" 
            id="pause-btn"
            aria-label="Pause"
            title="Pause">
            <div class="icon-pause"></div>
          </button>
          
          <button 
            class="transport-button" 
            id="stop-btn"
            aria-label="Stop"
            title="Stop">
            <div class="icon-stop"></div>
          </button>
          
          <button 
            class="transport-button" 
            id="record-btn"
            aria-label="Record"
            title="Record (R)">
            <div class="icon-record"></div>
          </button>
        </div>

        <div class="position-display">
          <div class="position-time" id="position">00:00:000</div>
          <div class="bpm-display">
            <span class="bpm-value" id="bpm">120</span>
            <span class="bpm-label">BPM</span>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  /**
   * Attach event listeners to control buttons
   * @private
   */
  _attachEventListeners() {
    const playBtn = this.shadowRoot.getElementById('play-btn');
    const pauseBtn = this.shadowRoot.getElementById('pause-btn');
    const stopBtn = this.shadowRoot.getElementById('stop-btn');
    const recordBtn = this.shadowRoot.getElementById('record-btn');

    playBtn.addEventListener('click', () => this._handlePlay());
    pauseBtn.addEventListener('click', () => this._handlePause());
    stopBtn.addEventListener('click', () => this._handleStop());
    recordBtn.addEventListener('click', () => this._handleRecord());

    // Keyboard shortcuts
    this.addEventListener('keydown', (e) => this._handleKeyboard(e));
  }

  /**
   * Handle play button click
   * @private
   */
  _handlePlay() {
    this._isPlaying = true;
    this._isPaused = false;
    this._updatePlayState();
    
    this.dispatchEvent(new CustomEvent('transport-play', {
      bubbles: true,
      composed: true,
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Handle pause button click
   * @private
   */
  _handlePause() {
    this._isPaused = true;
    this._isPlaying = false;
    this._updatePlayState();
    
    this.dispatchEvent(new CustomEvent('transport-pause', {
      bubbles: true,
      composed: true,
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Handle stop button click
   * @private
   */
  _handleStop() {
    this._isPlaying = false;
    this._isPaused = false;
    this._updatePlayState();
    
    this.dispatchEvent(new CustomEvent('transport-stop', {
      bubbles: true,
      composed: true,
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Handle record button click
   * @private
   */
  _handleRecord() {
    this._isRecording = !this._isRecording;
    this._updateRecordState();
    
    this.dispatchEvent(new CustomEvent('transport-record', {
      bubbles: true,
      composed: true,
      detail: { 
        recording: this._isRecording,
        timestamp: Date.now()
      }
    }));
  }

  /**
   * Handle keyboard shortcuts
   * @private
   * @param {KeyboardEvent} e - Keyboard event
   */
  _handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (this._isPlaying) {
          this._handlePause();
        } else {
          this._handlePlay();
        }
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        this._handleRecord();
        break;
    }
  }

  /**
   * Update play/pause button states
   * @private
   */
  _updatePlayState() {
    const playBtn = this.shadowRoot.getElementById('play-btn');
    const pauseBtn = this.shadowRoot.getElementById('pause-btn');

    if (this._isPlaying) {
      playBtn.classList.add('active');
      pauseBtn.classList.remove('active');
    } else if (this._isPaused) {
      playBtn.classList.remove('active');
      pauseBtn.classList.add('active');
    } else {
      playBtn.classList.remove('active');
      pauseBtn.classList.remove('active');
    }
  }

  /**
   * Update record button state
   * @private
   */
  _updateRecordState() {
    const recordBtn = this.shadowRoot.getElementById('record-btn');
    const icon = recordBtn.querySelector('.icon-record');

    if (this._isRecording) {
      recordBtn.classList.add('recording');
      icon.classList.add('active');
    } else {
      recordBtn.classList.remove('recording');
      icon.classList.remove('active');
    }
  }

  /**
   * Update position display
   * @private
   */
  _updatePosition() {
    const positionEl = this.shadowRoot.getElementById('position');
    if (positionEl) {
      positionEl.textContent = this._position;
    }
  }

  /**
   * Update BPM display
   * @private
   */
  _updateBPM() {
    const bpmEl = this.shadowRoot.getElementById('bpm');
    if (bpmEl) {
      bpmEl.textContent = this._bpm.toFixed(0);
    }
  }

  /**
   * Public API: Set playback position
   * @param {string} position - Position string (MM:SS:mmm)
   */
  setPosition(position) {
    this.setAttribute('position', position);
  }

  /**
   * Public API: Set BPM
   * @param {number} bpm - Beats per minute
   */
  setBPM(bpm) {
    this.setAttribute('bpm', bpm.toString());
  }

  /**
   * Public API: Set playing state
   * @param {boolean} playing - Is playing
   */
  setPlaying(playing) {
    if (playing) {
      this.setAttribute('playing', '');
    } else {
      this.removeAttribute('playing');
    }
  }

  /**
   * Public API: Set recording state
   * @param {boolean} recording - Is recording
   */
  setRecording(recording) {
    if (recording) {
      this.setAttribute('recording', '');
    } else {
      this.removeAttribute('recording');
    }
  }
}

customElements.define('harmony-transport-bar', HarmonyTransportBar);

export { HarmonyTransportBar };