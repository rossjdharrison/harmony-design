/**
 * @fileoverview Timeline primitive component with beat/bar markers
 * @module harmony/primitives/timeline
 * 
 * Provides visual representation of time with beat/bar divisions for audio applications.
 * Supports zoom, scroll, and customizable time signatures.
 * 
 * See: harmony-design/DESIGN_SYSTEM.md#timeline-primitive
 */

/**
 * Timeline primitive web component
 * 
 * @fires timeline-click - Fired when timeline is clicked {position: number, beat: number, bar: number}
 * @fires timeline-drag - Fired when timeline is dragged {startPosition: number, endPosition: number}
 * 
 * @example
 * <harmony-timeline 
 *   duration="120" 
 *   beats-per-bar="4" 
 *   zoom="1.0"
 *   current-position="30">
 * </harmony-timeline>
 */
class HarmonyTimeline extends HTMLElement {
  static get observedAttributes() {
    return [
      'duration',
      'beats-per-bar',
      'beat-subdivisions',
      'zoom',
      'current-position',
      'disabled'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Default state
    this._duration = 120; // seconds
    this._beatsPerBar = 4;
    this._beatSubdivisions = 4;
    this._zoom = 1.0;
    this._currentPosition = 0;
    this._disabled = false;
    this._isDragging = false;
    this._scrollOffset = 0;
    
    // Performance tracking
    this._lastRenderTime = 0;
    this._renderCount = 0;
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'duration':
        this._duration = parseFloat(newValue) || 120;
        break;
      case 'beats-per-bar':
        this._beatsPerBar = parseInt(newValue, 10) || 4;
        break;
      case 'beat-subdivisions':
        this._beatSubdivisions = parseInt(newValue, 10) || 4;
        break;
      case 'zoom':
        this._zoom = Math.max(0.1, Math.min(10, parseFloat(newValue) || 1.0));
        break;
      case 'current-position':
        this._currentPosition = parseFloat(newValue) || 0;
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        break;
    }

    if (this.shadowRoot.firstChild) {
      this._updateTimeline();
    }
  }

  /**
   * Render the component structure
   * @private
   */
  _render() {
    const startTime = performance.now();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 64px;
          position: relative;
          --timeline-bg: #1a1a1a;
          --timeline-bar-line: #ffffff;
          --timeline-beat-line: #666666;
          --timeline-subdivision-line: #333333;
          --timeline-text: #cccccc;
          --timeline-playhead: #00ff00;
          --timeline-disabled-opacity: 0.5;
        }

        :host([disabled]) {
          opacity: var(--timeline-disabled-opacity);
          pointer-events: none;
        }

        .timeline-container {
          width: 100%;
          height: 100%;
          background: var(--timeline-bg);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }

        .timeline-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .timeline-playhead {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--timeline-playhead);
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 0 4px var(--timeline-playhead);
        }

        .timeline-labels {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 20px;
          pointer-events: none;
          z-index: 5;
        }

        .timeline-label {
          position: absolute;
          top: 2px;
          font-family: monospace;
          font-size: 11px;
          color: var(--timeline-text);
          white-space: nowrap;
        }
      </style>

      <div class="timeline-container">
        <canvas class="timeline-canvas"></canvas>
        <div class="timeline-labels"></div>
        <div class="timeline-playhead"></div>
      </div>
    `;

    this._canvas = this.shadowRoot.querySelector('.timeline-canvas');
    this._ctx = this._canvas.getContext('2d', { alpha: false });
    this._playhead = this.shadowRoot.querySelector('.timeline-playhead');
    this._labelsContainer = this.shadowRoot.querySelector('.timeline-labels');

    this._resizeCanvas();
    this._updateTimeline();

    const renderTime = performance.now() - startTime;
    this._lastRenderTime = renderTime;
    this._renderCount++;

    // Performance budget check (16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`Timeline render exceeded budget: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Resize canvas to match display size
   * @private
   */
  _resizeCanvas() {
    const rect = this._canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this._canvas.width = rect.width * dpr;
    this._canvas.height = rect.height * dpr;
    this._ctx.scale(dpr, dpr);
    
    this._canvas.style.width = `${rect.width}px`;
    this._canvas.style.height = `${rect.height}px`;
  }

  /**
   * Update timeline visualization
   * @private
   */
  _updateTimeline() {
    const startTime = performance.now();

    this._resizeCanvas();
    this._drawTimeline();
    this._updateLabels();
    this._updatePlayhead();

    const updateTime = performance.now() - startTime;
    
    // Performance budget check
    if (updateTime > 16) {
      console.warn(`Timeline update exceeded budget: ${updateTime.toFixed(2)}ms`);
    }
  }

  /**
   * Draw timeline markers on canvas
   * @private
   */
  _drawTimeline() {
    const rect = this._canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    this._ctx.fillStyle = getComputedStyle(this).getPropertyValue('--timeline-bg');
    this._ctx.fillRect(0, 0, width, height);

    // Calculate pixels per second with zoom
    const pixelsPerSecond = (width / this._duration) * this._zoom;
    
    // Assume 120 BPM for beat calculations (this could be made configurable)
    const bpm = 120;
    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * this._beatsPerBar;

    // Draw subdivisions
    this._ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--timeline-subdivision-line');
    this._ctx.lineWidth = 1;
    
    const subdivisionInterval = secondsPerBeat / this._beatSubdivisions;
    for (let time = 0; time <= this._duration; time += subdivisionInterval) {
      const x = (time * pixelsPerSecond) - this._scrollOffset;
      if (x < 0 || x > width) continue;
      
      this._ctx.beginPath();
      this._ctx.moveTo(x, height * 0.7);
      this._ctx.lineTo(x, height);
      this._ctx.stroke();
    }

    // Draw beats
    this._ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--timeline-beat-line');
    this._ctx.lineWidth = 1;
    
    for (let time = 0; time <= this._duration; time += secondsPerBeat) {
      const x = (time * pixelsPerSecond) - this._scrollOffset;
      if (x < 0 || x > width) continue;
      
      this._ctx.beginPath();
      this._ctx.moveTo(x, height * 0.5);
      this._ctx.lineTo(x, height);
      this._ctx.stroke();
    }

    // Draw bars
    this._ctx.strokeStyle = getComputedStyle(this).getPropertyValue('--timeline-bar-line');
    this._ctx.lineWidth = 2;
    
    for (let time = 0; time <= this._duration; time += secondsPerBar) {
      const x = (time * pixelsPerSecond) - this._scrollOffset;
      if (x < 0 || x > width) continue;
      
      this._ctx.beginPath();
      this._ctx.moveTo(x, 0);
      this._ctx.lineTo(x, height);
      this._ctx.stroke();
    }
  }

  /**
   * Update bar number labels
   * @private
   */
  _updateLabels() {
    const rect = this._canvas.getBoundingClientRect();
    const width = rect.width;
    
    // Clear existing labels
    this._labelsContainer.innerHTML = '';

    const pixelsPerSecond = (width / this._duration) * this._zoom;
    const bpm = 120;
    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * this._beatsPerBar;

    let barNumber = 1;
    for (let time = 0; time <= this._duration; time += secondsPerBar) {
      const x = (time * pixelsPerSecond) - this._scrollOffset;
      if (x < -20 || x > width + 20) {
        barNumber++;
        continue;
      }
      
      const label = document.createElement('div');
      label.className = 'timeline-label';
      label.textContent = barNumber;
      label.style.left = `${x + 4}px`;
      this._labelsContainer.appendChild(label);
      
      barNumber++;
    }
  }

  /**
   * Update playhead position
   * @private
   */
  _updatePlayhead() {
    const rect = this._canvas.getBoundingClientRect();
    const width = rect.width;
    const pixelsPerSecond = (width / this._duration) * this._zoom;
    const x = (this._currentPosition * pixelsPerSecond) - this._scrollOffset;
    
    this._playhead.style.left = `${x}px`;
    this._playhead.style.display = (x >= 0 && x <= width) ? 'block' : 'none';
  }

  /**
   * Convert pixel position to time
   * @private
   * @param {number} x - Pixel position
   * @returns {number} Time in seconds
   */
  _pixelToTime(x) {
    const rect = this._canvas.getBoundingClientRect();
    const width = rect.width;
    const pixelsPerSecond = (width / this._duration) * this._zoom;
    return (x + this._scrollOffset) / pixelsPerSecond;
  }

  /**
   * Convert time to beat/bar information
   * @private
   * @param {number} time - Time in seconds
   * @returns {{bar: number, beat: number}} Bar and beat numbers
   */
  _timeToBarBeat(time) {
    const bpm = 120;
    const secondsPerBeat = 60 / bpm;
    const totalBeats = time / secondsPerBeat;
    const bar = Math.floor(totalBeats / this._beatsPerBar) + 1;
    const beat = Math.floor(totalBeats % this._beatsPerBar) + 1;
    return { bar, beat };
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    this._handleClick = this._onClick.bind(this);
    this._handleMouseDown = this._onMouseDown.bind(this);
    this._handleMouseMove = this._onMouseMove.bind(this);
    this._handleMouseUp = this._onMouseUp.bind(this);
    this._handleResize = this._onResize.bind(this);

    const container = this.shadowRoot.querySelector('.timeline-container');
    container.addEventListener('click', this._handleClick);
    container.addEventListener('mousedown', this._handleMouseDown);
    window.addEventListener('resize', this._handleResize);
  }

  /**
   * Detach event listeners
   * @private
   */
  _detachEventListeners() {
    const container = this.shadowRoot.querySelector('.timeline-container');
    if (container) {
      container.removeEventListener('click', this._handleClick);
      container.removeEventListener('mousedown', this._handleMouseDown);
    }
    window.removeEventListener('mousemove', this._handleMouseMove);
    window.removeEventListener('mouseup', this._handleMouseUp);
    window.removeEventListener('resize', this._handleResize);
  }

  /**
   * Handle click event
   * @private
   * @param {MouseEvent} event
   */
  _onClick(event) {
    if (this._disabled || this._isDragging) return;

    const rect = this._canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = this._pixelToTime(x);
    const { bar, beat } = this._timeToBarBeat(time);

    this.dispatchEvent(new CustomEvent('timeline-click', {
      detail: { position: time, beat, bar },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle mouse down event
   * @private
   * @param {MouseEvent} event
   */
  _onMouseDown(event) {
    if (this._disabled) return;

    this._isDragging = true;
    const rect = this._canvas.getBoundingClientRect();
    this._dragStartX = event.clientX - rect.left;
    this._dragStartTime = this._pixelToTime(this._dragStartX);

    window.addEventListener('mousemove', this._handleMouseMove);
    window.addEventListener('mouseup', this._handleMouseUp);
  }

  /**
   * Handle mouse move event
   * @private
   * @param {MouseEvent} event
   */
  _onMouseMove(event) {
    if (!this._isDragging) return;

    const rect = this._canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = this._pixelToTime(x);

    this.dispatchEvent(new CustomEvent('timeline-drag', {
      detail: { 
        startPosition: this._dragStartTime, 
        endPosition: time 
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Handle mouse up event
   * @private
   */
  _onMouseUp() {
    this._isDragging = false;
    window.removeEventListener('mousemove', this._handleMouseMove);
    window.removeEventListener('mouseup', this._handleMouseUp);
  }

  /**
   * Handle window resize
   * @private
   */
  _onResize() {
    this._updateTimeline();
  }

  /**
   * Set the current playhead position
   * @param {number} position - Position in seconds
   */
  setPosition(position) {
    this._currentPosition = Math.max(0, Math.min(this._duration, position));
    this._updatePlayhead();
  }

  /**
   * Set zoom level
   * @param {number} zoom - Zoom level (0.1 to 10)
   */
  setZoom(zoom) {
    this._zoom = Math.max(0.1, Math.min(10, zoom));
    this._updateTimeline();
  }

  /**
   * Get performance metrics
   * @returns {{lastRenderTime: number, renderCount: number}} Performance data
   */
  getPerformanceMetrics() {
    return {
      lastRenderTime: this._lastRenderTime,
      renderCount: this._renderCount
    };
  }
}

// Register the custom element
customElements.define('harmony-timeline', HarmonyTimeline);

export { HarmonyTimeline };