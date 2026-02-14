/**
 * @fileoverview TrackLane composite organizing clips on timeline
 * @see harmony-design/DESIGN_SYSTEM.md#tracklane-composite
 */

/**
 * TrackLane Web Component
 * Organizes audio/MIDI clips on a horizontal timeline with track controls
 * 
 * @element harmony-track-lane
 * 
 * @attr {string} track-id - Unique identifier for this track
 * @attr {string} track-name - Display name for the track
 * @attr {string} track-color - CSS color for track accent (default: #4A90E2)
 * @attr {boolean} muted - Whether track is muted
 * @attr {boolean} solo - Whether track is soloed
 * @attr {boolean} armed - Whether track is armed for recording
 * @attr {number} height - Track height in pixels (default: 80)
 * @attr {number} pixels-per-second - Zoom level for timeline (default: 100)
 * 
 * @fires track-mute - Fired when mute button toggled {trackId, muted}
 * @fires track-solo - Fired when solo button toggled {trackId, solo}
 * @fires track-arm - Fired when arm button toggled {trackId, armed}
 * @fires track-select - Fired when track clicked {trackId}
 * @fires clip-moved - Fired when clip dragged {trackId, clipId, startTime}
 * @fires clip-selected - Fired when clip clicked {trackId, clipId}
 * @fires clip-delete - Fired when clip delete requested {trackId, clipId}
 * 
 * @example
 * <harmony-track-lane 
 *   track-id="track-1"
 *   track-name="Vocals"
 *   track-color="#E24A90"
 *   height="120">
 * </harmony-track-lane>
 */
class HarmonyTrackLane extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // State
    this._clips = new Map(); // clipId -> {element, startTime, duration}
    this._selectedClipId = null;
    this._dragState = null; // {clipId, startX, startTime, element}
    
    // Performance tracking
    this._renderStart = 0;
    this._frameCount = 0;
  }

  static get observedAttributes() {
    return [
      'track-id',
      'track-name', 
      'track-color',
      'muted',
      'solo',
      'armed',
      'height',
      'pixels-per-second'
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
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Add a clip to the track lane
   * @param {string} clipId - Unique clip identifier
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds
   * @param {Object} clipData - Data to pass to clip component
   */
  addClip(clipId, startTime, duration, clipData = {}) {
    if (this._clips.has(clipId)) {
      console.warn(`Clip ${clipId} already exists in track`);
      return;
    }

    const clipElement = document.createElement('harmony-clip');
    clipElement.setAttribute('clip-id', clipId);
    clipElement.setAttribute('duration', duration);
    clipElement.setAttribute('start-time', startTime);
    
    // Apply clip data attributes
    Object.entries(clipData).forEach(([key, value]) => {
      clipElement.setAttribute(key, value);
    });

    this._clips.set(clipId, {
      element: clipElement,
      startTime,
      duration
    });

    this.renderClips();
  }

  /**
   * Remove a clip from the track lane
   * @param {string} clipId - Clip identifier to remove
   */
  removeClip(clipId) {
    const clip = this._clips.get(clipId);
    if (clip) {
      clip.element.remove();
      this._clips.delete(clipId);
    }
  }

  /**
   * Update clip position
   * @param {string} clipId - Clip identifier
   * @param {number} startTime - New start time in seconds
   */
  updateClipPosition(clipId, startTime) {
    const clip = this._clips.get(clipId);
    if (clip) {
      clip.startTime = startTime;
      clip.element.setAttribute('start-time', startTime);
      this.positionClip(clip.element, startTime);
    }
  }

  /**
   * Clear all clips from track
   */
  clearClips() {
    this._clips.forEach(clip => clip.element.remove());
    this._clips.clear();
    this._selectedClipId = null;
  }

  render() {
    const trackId = this.getAttribute('track-id') || 'unknown';
    const trackName = this.getAttribute('track-name') || 'Untitled Track';
    const trackColor = this.getAttribute('track-color') || '#4A90E2';
    const height = parseInt(this.getAttribute('height')) || 80;
    const muted = this.hasAttribute('muted');
    const solo = this.hasAttribute('solo');
    const armed = this.hasAttribute('armed');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          width: 100%;
          height: ${height}px;
          background: var(--track-bg, #1E1E1E);
          border-bottom: 1px solid var(--track-border, #333);
          contain: layout style paint;
        }

        .track-container {
          display: flex;
          height: 100%;
          position: relative;
        }

        .track-header {
          flex-shrink: 0;
          width: 200px;
          background: var(--track-header-bg, #252525);
          border-right: 1px solid var(--track-border, #333);
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-sizing: border-box;
        }

        .track-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .track-color-indicator {
          width: 4px;
          height: 100%;
          background: ${trackColor};
          border-radius: 2px;
          flex-shrink: 0;
        }

        .track-name {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary, #E0E0E0);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .track-controls {
          display: flex;
          gap: 4px;
        }

        .track-button {
          width: 28px;
          height: 24px;
          border: 1px solid var(--button-border, #444);
          background: var(--button-bg, #2A2A2A);
          color: var(--button-text, #999);
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .track-button:hover {
          background: var(--button-hover-bg, #333);
          border-color: var(--button-hover-border, #555);
        }

        .track-button:active {
          transform: translateY(1px);
        }

        .track-button.active {
          background: ${trackColor};
          border-color: ${trackColor};
          color: var(--button-active-text, #FFF);
        }

        .track-button.mute.active {
          background: #E24A4A;
          border-color: #E24A4A;
        }

        .track-button.solo.active {
          background: #E2C44A;
          border-color: #E2C44A;
        }

        .track-button.arm.active {
          background: #E24A4A;
          border-color: #E24A4A;
        }

        .track-content {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: var(--track-content-bg, #1A1A1A);
        }

        .clips-container {
          position: absolute;
          top: 4px;
          left: 0;
          right: 0;
          bottom: 4px;
          pointer-events: none;
        }

        .clips-container > * {
          pointer-events: auto;
        }

        /* Selection state */
        :host([selected]) .track-header {
          background: var(--track-header-selected-bg, #2A2A3A);
        }

        /* Disabled state */
        :host([disabled]) {
          opacity: 0.5;
          pointer-events: none;
        }

        /* Performance optimization */
        .track-content {
          will-change: scroll-position;
        }
      </style>

      <div class="track-container">
        <div class="track-header">
          <div class="track-info">
            <div class="track-color-indicator"></div>
            <div class="track-name" title="${trackName}">${trackName}</div>
          </div>
          <div class="track-controls">
            <button 
              class="track-button mute ${muted ? 'active' : ''}" 
              data-control="mute"
              title="Mute Track">
              M
            </button>
            <button 
              class="track-button solo ${solo ? 'active' : ''}"
              data-control="solo"
              title="Solo Track">
              S
            </button>
            <button 
              class="track-button arm ${armed ? 'active' : ''}"
              data-control="arm"
              title="Arm for Recording">
              R
            </button>
          </div>
        </div>
        <div class="track-content" data-track-content>
          <div class="clips-container" data-clips-container></div>
        </div>
      </div>
    `;

    this.renderClips();
  }

  renderClips() {
    const container = this.shadowRoot.querySelector('[data-clips-container]');
    if (!container) return;

    // Clear existing clips from DOM
    container.innerHTML = '';

    // Add all clips back with updated positions
    this._clips.forEach((clip, clipId) => {
      this.positionClip(clip.element, clip.startTime);
      container.appendChild(clip.element);
    });
  }

  positionClip(clipElement, startTime) {
    const pixelsPerSecond = parseFloat(this.getAttribute('pixels-per-second')) || 100;
    const leftPosition = startTime * pixelsPerSecond;
    
    clipElement.style.position = 'absolute';
    clipElement.style.left = `${leftPosition}px`;
    clipElement.style.top = '0';
    clipElement.style.bottom = '0';
  }

  attachEventListeners() {
    // Track control buttons
    this._handleControlClick = this.handleControlClick.bind(this);
    this.shadowRoot.addEventListener('click', this._handleControlClick);

    // Track selection
    this._handleTrackClick = this.handleTrackClick.bind(this);
    const trackContent = this.shadowRoot.querySelector('[data-track-content]');
    if (trackContent) {
      trackContent.addEventListener('click', this._handleTrackClick);
    }

    // Clip interactions
    this._handleClipClick = this.handleClipClick.bind(this);
    this._handleClipDragStart = this.handleClipDragStart.bind(this);
    this._handleClipDrag = this.handleClipDrag.bind(this);
    this._handleClipDragEnd = this.handleClipDragEnd.bind(this);

    const clipsContainer = this.shadowRoot.querySelector('[data-clips-container]');
    if (clipsContainer) {
      clipsContainer.addEventListener('click', this._handleClipClick);
      clipsContainer.addEventListener('mousedown', this._handleClipDragStart);
    }
  }

  detachEventListeners() {
    this.shadowRoot.removeEventListener('click', this._handleControlClick);
    
    const trackContent = this.shadowRoot.querySelector('[data-track-content]');
    if (trackContent) {
      trackContent.removeEventListener('click', this._handleTrackClick);
    }

    const clipsContainer = this.shadowRoot.querySelector('[data-clips-container]');
    if (clipsContainer) {
      clipsContainer.removeEventListener('click', this._handleClipClick);
      clipsContainer.removeEventListener('mousedown', this._handleClipDragStart);
    }

    document.removeEventListener('mousemove', this._handleClipDrag);
    document.removeEventListener('mouseup', this._handleClipDragEnd);
  }

  handleControlClick(e) {
    const button = e.target.closest('.track-button');
    if (!button) return;

    const control = button.dataset.control;
    const trackId = this.getAttribute('track-id');

    switch (control) {
      case 'mute':
        this.toggleMute();
        this.dispatchEvent(new CustomEvent('track-mute', {
          bubbles: true,
          composed: true,
          detail: { trackId, muted: this.hasAttribute('muted') }
        }));
        break;
      case 'solo':
        this.toggleSolo();
        this.dispatchEvent(new CustomEvent('track-solo', {
          bubbles: true,
          composed: true,
          detail: { trackId, solo: this.hasAttribute('solo') }
        }));
        break;
      case 'arm':
        this.toggleArm();
        this.dispatchEvent(new CustomEvent('track-arm', {
          bubbles: true,
          composed: true,
          detail: { trackId, armed: this.hasAttribute('armed') }
        }));
        break;
    }
  }

  handleTrackClick(e) {
    // Only fire if clicking track content area, not clips
    if (e.target.closest('harmony-clip')) return;
    
    const trackId = this.getAttribute('track-id');
    this.dispatchEvent(new CustomEvent('track-select', {
      bubbles: true,
      composed: true,
      detail: { trackId }
    }));
  }

  handleClipClick(e) {
    const clipElement = e.target.closest('harmony-clip');
    if (!clipElement) return;

    const clipId = clipElement.getAttribute('clip-id');
    const trackId = this.getAttribute('track-id');

    this._selectedClipId = clipId;

    this.dispatchEvent(new CustomEvent('clip-selected', {
      bubbles: true,
      composed: true,
      detail: { trackId, clipId }
    }));
  }

  handleClipDragStart(e) {
    const clipElement = e.target.closest('harmony-clip');
    if (!clipElement) return;

    const clipId = clipElement.getAttribute('clip-id');
    const clip = this._clips.get(clipId);
    if (!clip) return;

    e.preventDefault();

    this._dragState = {
      clipId,
      startX: e.clientX,
      startTime: clip.startTime,
      element: clipElement
    };

    clipElement.style.cursor = 'grabbing';
    clipElement.style.zIndex = '100';

    document.addEventListener('mousemove', this._handleClipDrag);
    document.addEventListener('mouseup', this._handleClipDragEnd);
  }

  handleClipDrag(e) {
    if (!this._dragState) return;

    const pixelsPerSecond = parseFloat(this.getAttribute('pixels-per-second')) || 100;
    const deltaX = e.clientX - this._dragState.startX;
    const deltaTime = deltaX / pixelsPerSecond;
    const newTime = Math.max(0, this._dragState.startTime + deltaTime);

    // Snap to grid (0.1 second increments)
    const snappedTime = Math.round(newTime * 10) / 10;

    this.positionClip(this._dragState.element, snappedTime);
  }

  handleClipDragEnd(e) {
    if (!this._dragState) return;

    const pixelsPerSecond = parseFloat(this.getAttribute('pixels-per-second')) || 100;
    const deltaX = e.clientX - this._dragState.startX;
    const deltaTime = deltaX / pixelsPerSecond;
    const newTime = Math.max(0, this._dragState.startTime + deltaTime);
    const snappedTime = Math.round(newTime * 10) / 10;

    const clip = this._clips.get(this._dragState.clipId);
    if (clip) {
      clip.startTime = snappedTime;
      clip.element.setAttribute('start-time', snappedTime);
    }

    this._dragState.element.style.cursor = '';
    this._dragState.element.style.zIndex = '';

    const trackId = this.getAttribute('track-id');
    this.dispatchEvent(new CustomEvent('clip-moved', {
      bubbles: true,
      composed: true,
      detail: {
        trackId,
        clipId: this._dragState.clipId,
        startTime: snappedTime
      }
    }));

    this._dragState = null;

    document.removeEventListener('mousemove', this._handleClipDrag);
    document.removeEventListener('mouseup', this._handleClipDragEnd);
  }

  toggleMute() {
    if (this.hasAttribute('muted')) {
      this.removeAttribute('muted');
    } else {
      this.setAttribute('muted', '');
    }
  }

  toggleSolo() {
    if (this.hasAttribute('solo')) {
      this.removeAttribute('solo');
    } else {
      this.setAttribute('solo', '');
    }
  }

  toggleArm() {
    if (this.hasAttribute('armed')) {
      this.removeAttribute('armed');
    } else {
      this.setAttribute('armed', '');
    }
  }

  /**
   * Get all clips data
   * @returns {Array} Array of clip objects
   */
  getClips() {
    return Array.from(this._clips.entries()).map(([clipId, clip]) => ({
      clipId,
      startTime: clip.startTime,
      duration: clip.duration,
      element: clip.element
    }));
  }

  /**
   * Performance check - ensure render is within budget
   */
  checkPerformance() {
    const renderTime = performance.now() - this._renderStart;
    if (renderTime > 16) {
      console.warn(`TrackLane render exceeded 16ms budget: ${renderTime.toFixed(2)}ms`);
    }
  }
}

customElements.define('harmony-track-lane', HarmonyTrackLane);

export { HarmonyTrackLane };