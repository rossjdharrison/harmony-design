/**
 * @fileoverview ArrangeView organism - assembles track lanes with timeline
 * Composite component for DAW arrangement view showing multiple tracks.
 * See harmony-design/DESIGN_SYSTEM.md#arrange-view for usage patterns.
 * 
 * @module organisms/arrange-view
 */

/**
 * ArrangeView - Main arrangement view for DAW
 * Assembles multiple track lanes with a shared timeline ruler.
 * 
 * @class ArrangeView
 * @extends HTMLElement
 * 
 * @attr {string} zoom-level - Timeline zoom level (1x, 2x, 4x, etc.)
 * @attr {number} scroll-position - Horizontal scroll position in pixels
 * @attr {number} track-count - Number of tracks to display
 * 
 * @fires arrange-view:track-added - When new track is added
 * @fires arrange-view:track-removed - When track is removed
 * @fires arrange-view:zoom-changed - When zoom level changes
 * @fires arrange-view:scroll-changed - When scroll position changes
 * 
 * @example
 * <arrange-view zoom-level="2x" track-count="8"></arrange-view>
 */
class ArrangeView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Internal state
    this._zoomLevel = '1x';
    this._scrollPosition = 0;
    this._trackCount = 4;
    this._tracks = [];
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartScroll = 0;
  }

  /**
   * Observed attributes for reactivity
   */
  static get observedAttributes() {
    return ['zoom-level', 'scroll-position', 'track-count'];
  }

  /**
   * Lifecycle: Component connected to DOM
   */
  connectedCallback() {
    this._render();
    this._attachEventListeners();
    this._initializeTracks();
  }

  /**
   * Lifecycle: Component disconnected from DOM
   */
  disconnectedCallback() {
    this._detachEventListeners();
  }

  /**
   * Lifecycle: Attribute changed
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'zoom-level':
        this._zoomLevel = newValue;
        this._updateZoom();
        break;
      case 'scroll-position':
        this._scrollPosition = parseInt(newValue, 10);
        this._updateScroll();
        break;
      case 'track-count':
        this._trackCount = parseInt(newValue, 10);
        this._updateTrackCount();
        break;
    }
  }

  /**
   * Render component structure
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background: var(--surface-primary, #1a1a1a);
          overflow: hidden;
          position: relative;
        }

        .timeline-ruler {
          height: 32px;
          background: var(--surface-secondary, #2a2a2a);
          border-bottom: 1px solid var(--border-primary, #3a3a3a);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .ruler-content {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 8px;
          transition: transform 0.1s ease-out;
        }

        .ruler-marker {
          position: absolute;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-bottom: 4px;
          color: var(--text-secondary, #999);
          font-size: 11px;
          font-family: monospace;
        }

        .ruler-tick {
          width: 1px;
          height: 8px;
          background: var(--border-primary, #3a3a3a);
          margin-bottom: 2px;
        }

        .ruler-tick.major {
          height: 12px;
          background: var(--border-secondary, #4a4a4a);
        }

        .tracks-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
        }

        .tracks-scroll-wrapper {
          position: relative;
          min-height: 100%;
        }

        .track-lane-wrapper {
          position: relative;
          border-bottom: 1px solid var(--border-primary, #3a3a3a);
        }

        .scroll-indicator {
          position: absolute;
          bottom: 8px;
          right: 8px;
          padding: 4px 8px;
          background: var(--surface-overlay, rgba(0, 0, 0, 0.8));
          color: var(--text-primary, #fff);
          font-size: 11px;
          font-family: monospace;
          border-radius: 4px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .scroll-indicator.visible {
          opacity: 1;
        }

        .zoom-controls {
          position: absolute;
          top: 4px;
          right: 8px;
          display: flex;
          gap: 4px;
          z-index: 10;
        }

        .zoom-button {
          width: 24px;
          height: 24px;
          background: var(--surface-tertiary, #3a3a3a);
          border: 1px solid var(--border-primary, #4a4a4a);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.15s;
        }

        .zoom-button:hover {
          background: var(--surface-hover, #4a4a4a);
          border-color: var(--border-hover, #5a5a5a);
        }

        .zoom-button:active {
          background: var(--surface-active, #2a2a2a);
        }

        .playhead {
          position: absolute;
          top: 0;
          left: 0;
          width: 2px;
          height: 100%;
          background: var(--accent-primary, #ff6b35);
          pointer-events: none;
          z-index: 100;
          transition: left 0.05s linear;
        }

        .playhead::before {
          content: '';
          position: absolute;
          top: 0;
          left: -4px;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 8px solid var(--accent-primary, #ff6b35);
        }

        /* Performance optimizations */
        .tracks-container {
          will-change: scroll-position;
        }

        .ruler-content {
          will-change: transform;
        }

        /* Accessibility */
        :host(:focus-within) .timeline-ruler {
          outline: 2px solid var(--focus-ring, #0066ff);
          outline-offset: -2px;
        }
      </style>

      <div class="timeline-ruler">
        <div class="zoom-controls">
          <button class="zoom-button" data-action="zoom-out" title="Zoom Out">−</button>
          <button class="zoom-button" data-action="zoom-in" title="Zoom In">+</button>
        </div>
        <div class="ruler-content" role="presentation"></div>
      </div>

      <div class="tracks-container" role="region" aria-label="Track lanes">
        <div class="tracks-scroll-wrapper">
          <!-- Track lanes will be inserted here -->
        </div>
        <div class="playhead" role="presentation"></div>
      </div>

      <div class="scroll-indicator" role="status" aria-live="polite"></div>
    `;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this._boundHandleZoomClick = this._handleZoomClick.bind(this);
    this._boundHandleScroll = this._handleScroll.bind(this);
    this._boundHandleWheel = this._handleWheel.bind(this);

    const zoomControls = this.shadowRoot.querySelector('.zoom-controls');
    zoomControls.addEventListener('click', this._boundHandleZoomClick);

    const tracksContainer = this.shadowRoot.querySelector('.tracks-container');
    tracksContainer.addEventListener('scroll', this._boundHandleScroll);
    tracksContainer.addEventListener('wheel', this._boundHandleWheel, { passive: false });
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const zoomControls = this.shadowRoot.querySelector('.zoom-controls');
    if (zoomControls) {
      zoomControls.removeEventListener('click', this._boundHandleZoomClick);
    }

    const tracksContainer = this.shadowRoot.querySelector('.tracks-container');
    if (tracksContainer) {
      tracksContainer.removeEventListener('scroll', this._boundHandleScroll);
      tracksContainer.removeEventListener('wheel', this._boundHandleWheel);
    }
  }

  /**
   * Initialize track lanes
   * @private
   */
  _initializeTracks() {
    const wrapper = this.shadowRoot.querySelector('.tracks-scroll-wrapper');
    
    for (let i = 0; i < this._trackCount; i++) {
      const trackWrapper = document.createElement('div');
      trackWrapper.className = 'track-lane-wrapper';
      
      const trackLane = document.createElement('track-lane');
      trackLane.setAttribute('track-id', `track-${i + 1}`);
      trackLane.setAttribute('track-name', `Track ${i + 1}`);
      
      trackWrapper.appendChild(trackLane);
      wrapper.appendChild(trackWrapper);
      this._tracks.push(trackLane);
    }

    this._renderRuler();
  }

  /**
   * Render timeline ruler with markers
   * @private
   */
  _renderRuler() {
    const rulerContent = this.shadowRoot.querySelector('.ruler-content');
    rulerContent.innerHTML = '';

    const zoomMultiplier = this._getZoomMultiplier();
    const pixelsPerBeat = 40 * zoomMultiplier;
    const beatsPerMeasure = 4;
    const totalMeasures = 32;

    for (let measure = 0; measure < totalMeasures; measure++) {
      for (let beat = 0; beat < beatsPerMeasure; beat++) {
        const position = (measure * beatsPerMeasure + beat) * pixelsPerBeat;
        const isMajor = beat === 0;

        const marker = document.createElement('div');
        marker.className = 'ruler-marker';
        marker.style.left = `${position}px`;

        const tick = document.createElement('div');
        tick.className = isMajor ? 'ruler-tick major' : 'ruler-tick';
        marker.appendChild(tick);

        if (isMajor) {
          const label = document.createElement('span');
          label.textContent = `${measure + 1}`;
          marker.appendChild(label);
        }

        rulerContent.appendChild(marker);
      }
    }
  }

  /**
   * Get zoom multiplier from zoom level string
   * @private
   * @returns {number}
   */
  _getZoomMultiplier() {
    const match = this._zoomLevel.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 1;
  }

  /**
   * Handle zoom button clicks
   * @private
   * @param {Event} event
   */
  _handleZoomClick(event) {
    const action = event.target.dataset.action;
    if (!action) return;

    const currentMultiplier = this._getZoomMultiplier();
    let newMultiplier;

    if (action === 'zoom-in') {
      newMultiplier = Math.min(currentMultiplier * 1.5, 8);
    } else if (action === 'zoom-out') {
      newMultiplier = Math.max(currentMultiplier / 1.5, 0.25);
    }

    const newZoomLevel = `${newMultiplier.toFixed(2)}x`;
    this.setAttribute('zoom-level', newZoomLevel);

    this._dispatchEvent('arrange-view:zoom-changed', {
      zoomLevel: newZoomLevel,
      multiplier: newMultiplier
    });
  }

  /**
   * Handle scroll events
   * @private
   * @param {Event} event
   */
  _handleScroll(event) {
    const container = event.target;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // Update ruler position
    const rulerContent = this.shadowRoot.querySelector('.ruler-content');
    rulerContent.style.transform = `translateX(${-scrollLeft}px)`;

    // Show scroll indicator
    this._showScrollIndicator(scrollLeft, scrollTop);

    this._dispatchEvent('arrange-view:scroll-changed', {
      scrollLeft,
      scrollTop
    });
  }

  /**
   * Handle wheel events for horizontal scrolling
   * @private
   * @param {WheelEvent} event
   */
  _handleWheel(event) {
    // Allow horizontal scroll with shift+wheel
    if (event.shiftKey) {
      event.preventDefault();
      const container = this.shadowRoot.querySelector('.tracks-container');
      container.scrollLeft += event.deltaY;
    }
  }

  /**
   * Show scroll indicator temporarily
   * @private
   * @param {number} scrollLeft
   * @param {number} scrollTop
   */
  _showScrollIndicator(scrollLeft, scrollTop) {
    const indicator = this.shadowRoot.querySelector('.scroll-indicator');
    const pixelsPerBeat = 40 * this._getZoomMultiplier();
    const beat = Math.floor(scrollLeft / pixelsPerBeat);
    const measure = Math.floor(beat / 4) + 1;
    const beatInMeasure = (beat % 4) + 1;

    indicator.textContent = `${measure}:${beatInMeasure}`;
    indicator.classList.add('visible');

    clearTimeout(this._scrollIndicatorTimeout);
    this._scrollIndicatorTimeout = setTimeout(() => {
      indicator.classList.remove('visible');
    }, 1000);
  }

  /**
   * Update zoom level
   * @private
   */
  _updateZoom() {
    this._renderRuler();
    
    // Update all track lanes with new zoom
    this._tracks.forEach(track => {
      track.setAttribute('zoom-level', this._zoomLevel);
    });
  }

  /**
   * Update scroll position
   * @private
   */
  _updateScroll() {
    const container = this.shadowRoot.querySelector('.tracks-container');
    container.scrollLeft = this._scrollPosition;
  }

  /**
   * Update track count
   * @private
   */
  _updateTrackCount() {
    const wrapper = this.shadowRoot.querySelector('.tracks-scroll-wrapper');
    const currentCount = this._tracks.length;

    if (this._trackCount > currentCount) {
      // Add tracks
      for (let i = currentCount; i < this._trackCount; i++) {
        const trackWrapper = document.createElement('div');
        trackWrapper.className = 'track-lane-wrapper';
        
        const trackLane = document.createElement('track-lane');
        trackLane.setAttribute('track-id', `track-${i + 1}`);
        trackLane.setAttribute('track-name', `Track ${i + 1}`);
        
        trackWrapper.appendChild(trackLane);
        wrapper.appendChild(trackWrapper);
        this._tracks.push(trackLane);
      }

      this._dispatchEvent('arrange-view:track-added', {
        trackCount: this._trackCount
      });
    } else if (this._trackCount < currentCount) {
      // Remove tracks
      const toRemove = currentCount - this._trackCount;
      for (let i = 0; i < toRemove; i++) {
        const track = this._tracks.pop();
        track.parentElement.remove();
      }

      this._dispatchEvent('arrange-view:track-removed', {
        trackCount: this._trackCount
      });
    }
  }

  /**
   * Dispatch custom event
   * @private
   * @param {string} eventName
   * @param {Object} detail
   */
  _dispatchEvent(eventName, detail) {
    this.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Public API: Add a new track
   * @public
   * @returns {HTMLElement} The new track lane element
   */
  addTrack() {
    this._trackCount++;
    this.setAttribute('track-count', this._trackCount);
    return this._tracks[this._tracks.length - 1];
  }

  /**
   * Public API: Remove a track by index
   * @public
   * @param {number} index - Track index to remove
   */
  removeTrack(index) {
    if (index >= 0 && index < this._tracks.length) {
      this._tracks[index].parentElement.remove();
      this._tracks.splice(index, 1);
      this._trackCount--;
      this.setAttribute('track-count', this._trackCount);
    }
  }

  /**
   * Public API: Get all track lanes
   * @public
   * @returns {Array<HTMLElement>}
   */
  getTracks() {
    return [...this._tracks];
  }

  /**
   * Public API: Set playhead position
   * @public
   * @param {number} position - Position in pixels
   */
  setPlayheadPosition(position) {
    const playhead = this.shadowRoot.querySelector('.playhead');
    playhead.style.left = `${position}px`;
  }
}

// Register custom element
customElements.define('arrange-view', ArrangeView);

export default ArrangeView;