/**
 * @fileoverview Clip composite component combining waveform, timeline, and playback controls
 * @module components/composites/clip
 * 
 * Composite component for audio clip visualization and control.
 * Combines waveform display, timeline with beat/bar markers, and playback controls.
 * 
 * Events Published:
 * - clip:play - Playback start requested
 * - clip:pause - Playback pause requested
 * - clip:stop - Playback stop requested
 * - clip:seek - Seek to position requested (detail: { position: number })
 * - clip:loop-toggle - Loop mode toggled (detail: { enabled: boolean })
 * 
 * Events Subscribed:
 * - playback:position-changed - Updates playhead position
 * - playback:state-changed - Updates control states
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#clip-composite
 */

/**
 * Clip composite web component
 * @class HarmonyClip
 * @extends HTMLElement
 */
class HarmonyClip extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._duration = 0;
    this._position = 0;
    this._isPlaying = false;
    this._isLooping = false;
    this._waveformData = [];
    this._beatDivision = 4;
    this._bpm = 120;
  }

  static get observedAttributes() {
    return ['duration', 'position', 'playing', 'looping', 'bpm', 'beat-division'];
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.subscribeToEvents();
  }

  disconnectedCallback() {
    this.unsubscribeFromEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'duration':
        this._duration = parseFloat(newValue) || 0;
        break;
      case 'position':
        this._position = parseFloat(newValue) || 0;
        this.updatePlayhead();
        break;
      case 'playing':
        this._isPlaying = newValue !== null;
        this.updateControlStates();
        break;
      case 'looping':
        this._isLooping = newValue !== null;
        this.updateLoopButton();
        break;
      case 'bpm':
        this._bpm = parseFloat(newValue) || 120;
        this.updateTimeline();
        break;
      case 'beat-division':
        this._beatDivision = parseInt(newValue) || 4;
        this.updateTimeline();
        break;
    }
  }

  /**
   * Set waveform data for visualization
   * @param {number[]} data - Array of amplitude values (0-1)
   */
  setWaveformData(data) {
    this._waveformData = data;
    this.renderWaveform();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          background: var(--harmony-surface-1, #1a1a1a);
          border-radius: 8px;
          padding: 16px;
          box-sizing: border-box;
        }

        .clip-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .waveform-container {
          position: relative;
          width: 100%;
          height: 120px;
          background: var(--harmony-surface-2, #252525);
          border-radius: 4px;
          overflow: hidden;
        }

        .waveform-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .playhead {
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: var(--harmony-accent, #00d4ff);
          pointer-events: none;
          z-index: 2;
          transition: left 0.05s linear;
        }

        .timeline-container {
          position: relative;
          width: 100%;
          height: 32px;
        }

        .controls-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--harmony-surface-2, #252525);
          border-radius: 4px;
        }

        .transport-controls {
          display: flex;
          gap: 4px;
        }

        .control-button {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          background: var(--harmony-surface-3, #333);
          color: var(--harmony-text, #fff);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }

        .control-button:hover {
          background: var(--harmony-surface-4, #444);
        }

        .control-button:active {
          background: var(--harmony-surface-5, #555);
        }

        .control-button.active {
          background: var(--harmony-accent, #00d4ff);
          color: var(--harmony-surface-1, #1a1a1a);
        }

        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .time-display {
          margin-left: auto;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          color: var(--harmony-text-secondary, #aaa);
          user-select: none;
        }

        /* Performance optimization */
        .waveform-canvas {
          will-change: transform;
        }

        .playhead {
          will-change: left;
        }
      </style>

      <div class="clip-container">
        <div class="waveform-container">
          <canvas class="waveform-canvas"></canvas>
          <div class="playhead"></div>
        </div>
        
        <div class="timeline-container">
          <harmony-timeline 
            duration="${this._duration}"
            bpm="${this._bpm}"
            beat-division="${this._beatDivision}">
          </harmony-timeline>
        </div>

        <div class="controls-container">
          <div class="transport-controls">
            <button class="control-button play-button" title="Play" aria-label="Play">
              ▶
            </button>
            <button class="control-button pause-button" title="Pause" aria-label="Pause">
              ⏸
            </button>
            <button class="control-button stop-button" title="Stop" aria-label="Stop">
              ⏹
            </button>
            <button class="control-button loop-button" title="Loop" aria-label="Toggle Loop">
              ↻
            </button>
          </div>
          <div class="time-display">
            <span class="current-time">00:00.000</span> / 
            <span class="total-time">00:00.000</span>
          </div>
        </div>
      </div>
    `;

    this.updateTimeDisplay();
    this.renderWaveform();
  }

  attachEventListeners() {
    const playButton = this.shadowRoot.querySelector('.play-button');
    const pauseButton = this.shadowRoot.querySelector('.pause-button');
    const stopButton = this.shadowRoot.querySelector('.stop-button');
    const loopButton = this.shadowRoot.querySelector('.loop-button');
    const waveformContainer = this.shadowRoot.querySelector('.waveform-container');

    playButton.addEventListener('click', () => this.handlePlay());
    pauseButton.addEventListener('click', () => this.handlePause());
    stopButton.addEventListener('click', () => this.handleStop());
    loopButton.addEventListener('click', () => this.handleLoopToggle());
    waveformContainer.addEventListener('click', (e) => this.handleWaveformClick(e));
  }

  subscribeToEvents() {
    // Subscribe to playback events from EventBus
    this._positionHandler = (e) => this.handlePositionChanged(e.detail);
    this._stateHandler = (e) => this.handleStateChanged(e.detail);

    window.addEventListener('playback:position-changed', this._positionHandler);
    window.addEventListener('playback:state-changed', this._stateHandler);
  }

  unsubscribeFromEvents() {
    if (this._positionHandler) {
      window.removeEventListener('playback:position-changed', this._positionHandler);
    }
    if (this._stateHandler) {
      window.removeEventListener('playback:state-changed', this._stateHandler);
    }
  }

  handlePlay() {
    this.dispatchEvent(new CustomEvent('clip:play', {
      bubbles: true,
      composed: true,
      detail: { clipId: this.id }
    }));
  }

  handlePause() {
    this.dispatchEvent(new CustomEvent('clip:pause', {
      bubbles: true,
      composed: true,
      detail: { clipId: this.id }
    }));
  }

  handleStop() {
    this.dispatchEvent(new CustomEvent('clip:stop', {
      bubbles: true,
      composed: true,
      detail: { clipId: this.id }
    }));
  }

  handleLoopToggle() {
    this._isLooping = !this._isLooping;
    this.updateLoopButton();
    
    this.dispatchEvent(new CustomEvent('clip:loop-toggle', {
      bubbles: true,
      composed: true,
      detail: { 
        clipId: this.id,
        enabled: this._isLooping 
      }
    }));
  }

  handleWaveformClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = (x / rect.width) * this._duration;
    
    this.dispatchEvent(new CustomEvent('clip:seek', {
      bubbles: true,
      composed: true,
      detail: { 
        clipId: this.id,
        position 
      }
    }));
  }

  handlePositionChanged(detail) {
    if (detail.clipId === this.id) {
      this._position = detail.position;
      this.updatePlayhead();
      this.updateTimeDisplay();
    }
  }

  handleStateChanged(detail) {
    if (detail.clipId === this.id) {
      this._isPlaying = detail.state === 'playing';
      this.updateControlStates();
    }
  }

  renderWaveform() {
    const canvas = this.shadowRoot.querySelector('.waveform-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Set canvas size to match container (with device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    canvas.style.width = `${container.clientWidth}px`;
    canvas.style.height = `${container.clientHeight}px`;
    ctx.scale(dpr, dpr);

    const width = container.clientWidth;
    const height = container.clientHeight;
    const midY = height / 2;

    // Clear canvas
    ctx.fillStyle = getComputedStyle(this).getPropertyValue('--harmony-surface-2') || '#252525';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    if (this._waveformData.length > 0) {
      ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--harmony-accent') || '#00d4ff';
      ctx.lineWidth = 1;
      ctx.beginPath();

      const step = width / this._waveformData.length;
      
      for (let i = 0; i < this._waveformData.length; i++) {
        const x = i * step;
        const amplitude = this._waveformData[i] * (height / 2) * 0.9;
        
        if (i === 0) {
          ctx.moveTo(x, midY - amplitude);
        } else {
          ctx.lineTo(x, midY - amplitude);
        }
      }
      
      ctx.stroke();
      
      // Draw mirrored bottom half
      ctx.beginPath();
      for (let i = 0; i < this._waveformData.length; i++) {
        const x = i * step;
        const amplitude = this._waveformData[i] * (height / 2) * 0.9;
        
        if (i === 0) {
          ctx.moveTo(x, midY + amplitude);
        } else {
          ctx.lineTo(x, midY + amplitude);
        }
      }
      ctx.stroke();
    } else {
      // Draw placeholder line
      ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--harmony-text-secondary') || '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
    }
  }

  updatePlayhead() {
    const playhead = this.shadowRoot.querySelector('.playhead');
    if (!playhead || this._duration === 0) return;

    const percentage = (this._position / this._duration) * 100;
    playhead.style.left = `${percentage}%`;
  }

  updateControlStates() {
    const playButton = this.shadowRoot.querySelector('.play-button');
    const pauseButton = this.shadowRoot.querySelector('.pause-button');

    if (this._isPlaying) {
      playButton.classList.add('active');
      pauseButton.classList.remove('active');
    } else {
      playButton.classList.remove('active');
      pauseButton.classList.add('active');
    }
  }

  updateLoopButton() {
    const loopButton = this.shadowRoot.querySelector('.loop-button');
    if (this._isLooping) {
      loopButton.classList.add('active');
    } else {
      loopButton.classList.remove('active');
    }
  }

  updateTimeline() {
    const timeline = this.shadowRoot.querySelector('harmony-timeline');
    if (timeline) {
      timeline.setAttribute('bpm', this._bpm);
      timeline.setAttribute('beat-division', this._beatDivision);
    }
  }

  updateTimeDisplay() {
    const currentTimeEl = this.shadowRoot.querySelector('.current-time');
    const totalTimeEl = this.shadowRoot.querySelector('.total-time');

    if (currentTimeEl) {
      currentTimeEl.textContent = this.formatTime(this._position);
    }
    if (totalTimeEl) {
      totalTimeEl.textContent = this.formatTime(this._duration);
    }
  }

  /**
   * Format time in seconds to MM:SS.mmm
   * @param {number} seconds
   * @returns {string}
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }
}

customElements.define('harmony-clip', HarmonyClip);