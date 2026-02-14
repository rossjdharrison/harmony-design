/**
 * @fileoverview Time-travel debugging UI for event playback
 * @see harmony-design/DESIGN_SYSTEM.md#time-travel-debugging
 */

/**
 * Time-travel debugger component for replaying and inspecting recorded events.
 * Provides timeline scrubbing, playback controls, and event inspection.
 * 
 * @fires timetraveldebugger:seek - When user seeks to a specific event index
 * @fires timetraveldebugger:play - When playback is started
 * @fires timetraveldebugger:pause - When playback is paused
 * @fires timetraveldebugger:step - When stepping through events
 * @fires timetraveldebugger:reset - When resetting to initial state
 * 
 * @example
 * <time-travel-debugger></time-travel-debugger>
 */
class TimeTravelDebugger extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {Array<{type: string, payload: any, timestamp: number, source: string}>} */
    this.events = [];
    
    /** @type {number} Current position in event timeline (0-based index) */
    this.currentIndex = -1;
    
    /** @type {boolean} Whether playback is active */
    this.isPlaying = false;
    
    /** @type {number|null} Playback interval ID */
    this.playbackInterval = null;
    
    /** @type {number} Playback speed multiplier */
    this.playbackSpeed = 1.0;
    
    /** @type {number|null} Selected event index for inspection */
    this.selectedEventIndex = null;
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.subscribeToEventBus();
  }

  disconnectedCallback() {
    this.stopPlayback();
    this.unsubscribeFromEventBus();
  }

  /**
   * Subscribe to EventBus to capture recorded events
   */
  subscribeToEventBus() {
    // Listen for event recording updates
    window.EventBus?.subscribe('eventrecorder:recorded', (event) => {
      this.events = event.payload.events || [];
      this.updateTimeline();
    });

    // Listen for replay position updates
    window.EventBus?.subscribe('eventreplay:position', (event) => {
      this.currentIndex = event.payload.index;
      this.updateTimelinePosition();
    });
  }

  /**
   * Unsubscribe from EventBus
   */
  unsubscribeFromEventBus() {
    // EventBus handles cleanup automatically
  }

  /**
   * Render the component UI
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          background: #1e1e1e;
          color: #d4d4d4;
          border-radius: 4px;
          overflow: hidden;
        }

        .debugger-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 400px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        button {
          background: #0e639c;
          color: white;
          border: none;
          border-radius: 3px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s;
        }

        button:hover {
          background: #1177bb;
        }

        button:active {
          background: #0d5a8f;
        }

        button:disabled {
          background: #3e3e42;
          color: #858585;
          cursor: not-allowed;
        }

        button.secondary {
          background: #3e3e42;
        }

        button.secondary:hover {
          background: #505050;
        }

        .speed-control {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }

        .speed-control select {
          background: #3e3e42;
          color: #d4d4d4;
          border: 1px solid #555;
          border-radius: 3px;
          padding: 4px 8px;
          font-size: 12px;
        }

        .timeline-container {
          padding: 16px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .timeline {
          position: relative;
          height: 60px;
          background: #1e1e1e;
          border-radius: 3px;
          margin-bottom: 8px;
          cursor: pointer;
        }

        .timeline-track {
          position: absolute;
          top: 28px;
          left: 8px;
          right: 8px;
          height: 4px;
          background: #3e3e42;
          border-radius: 2px;
        }

        .timeline-events {
          position: absolute;
          top: 20px;
          left: 8px;
          right: 8px;
          height: 20px;
        }

        .timeline-event {
          position: absolute;
          width: 2px;
          height: 20px;
          background: #4ec9b0;
          cursor: pointer;
          transition: background 0.15s;
        }

        .timeline-event:hover {
          background: #6fddcc;
          width: 3px;
        }

        .timeline-event.selected {
          background: #f48771;
          width: 3px;
        }

        .timeline-position {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #007acc;
          pointer-events: none;
          transition: left 0.1s ease-out;
        }

        .timeline-position::before {
          content: '';
          position: absolute;
          top: 24px;
          left: -4px;
          width: 10px;
          height: 10px;
          background: #007acc;
          border-radius: 50%;
          border: 2px solid #1e1e1e;
        }

        .timeline-info {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #858585;
          margin-top: 8px;
        }

        .content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .event-list {
          flex: 1;
          overflow-y: auto;
          border-right: 1px solid #3e3e42;
        }

        .event-item {
          padding: 8px 16px;
          border-bottom: 1px solid #2d2d30;
          cursor: pointer;
          transition: background 0.15s;
          font-size: 12px;
        }

        .event-item:hover {
          background: #2a2d2e;
        }

        .event-item.current {
          background: #094771;
          border-left: 3px solid #007acc;
        }

        .event-item.selected {
          background: #37373d;
        }

        .event-item.future {
          opacity: 0.5;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .event-type {
          font-weight: 600;
          color: #4ec9b0;
        }

        .event-time {
          font-size: 11px;
          color: #858585;
        }

        .event-source {
          font-size: 11px;
          color: #ce9178;
        }

        .inspector {
          width: 350px;
          overflow-y: auto;
          padding: 16px;
          background: #1e1e1e;
        }

        .inspector h4 {
          margin: 0 0 12px 0;
          font-size: 13px;
          color: #cccccc;
        }

        .inspector-empty {
          color: #858585;
          font-size: 12px;
          font-style: italic;
        }

        .inspector-section {
          margin-bottom: 16px;
        }

        .inspector-label {
          font-size: 11px;
          color: #858585;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .inspector-value {
          font-size: 12px;
          color: #d4d4d4;
          font-family: 'Consolas', 'Monaco', monospace;
          background: #252526;
          padding: 8px;
          border-radius: 3px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .no-events {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #858585;
          font-size: 13px;
        }
      </style>

      <div class="debugger-container">
        <div class="header">
          <h3>Time-Travel Debugger</h3>
          <div class="controls">
            <button id="reset-btn" class="secondary" title="Reset to initial state">
              ⏮ Reset
            </button>
            <button id="step-back-btn" class="secondary" title="Step backward">
              ⏪ Step Back
            </button>
            <button id="play-pause-btn" title="Play/Pause">
              ▶ Play
            </button>
            <button id="step-forward-btn" class="secondary" title="Step forward">
              Step Forward ⏩
            </button>
            <div class="speed-control">
              <label for="speed-select">Speed:</label>
              <select id="speed-select">
                <option value="0.25">0.25×</option>
                <option value="0.5">0.5×</option>
                <option value="1" selected>1×</option>
                <option value="2">2×</option>
                <option value="4">4×</option>
              </select>
            </div>
          </div>
        </div>

        <div class="timeline-container">
          <div class="timeline" id="timeline">
            <div class="timeline-track"></div>
            <div class="timeline-events" id="timeline-events"></div>
            <div class="timeline-position" id="timeline-position"></div>
          </div>
          <div class="timeline-info">
            <span id="timeline-current">Event: 0 / 0</span>
            <span id="timeline-duration">Duration: 0.0s</span>
          </div>
        </div>

        <div class="content">
          <div class="event-list" id="event-list">
            <div class="no-events">No events recorded yet</div>
          </div>
          <div class="inspector" id="inspector">
            <h4>Event Inspector</h4>
            <div class="inspector-empty">Select an event to inspect</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to UI elements
   */
  attachEventListeners() {
    const resetBtn = this.shadowRoot.getElementById('reset-btn');
    const stepBackBtn = this.shadowRoot.getElementById('step-back-btn');
    const playPauseBtn = this.shadowRoot.getElementById('play-pause-btn');
    const stepForwardBtn = this.shadowRoot.getElementById('step-forward-btn');
    const speedSelect = this.shadowRoot.getElementById('speed-select');
    const timeline = this.shadowRoot.getElementById('timeline');

    resetBtn.addEventListener('click', () => this.handleReset());
    stepBackBtn.addEventListener('click', () => this.handleStepBack());
    playPauseBtn.addEventListener('click', () => this.handlePlayPause());
    stepForwardBtn.addEventListener('click', () => this.handleStepForward());
    speedSelect.addEventListener('change', (e) => {
      this.playbackSpeed = parseFloat(e.target.value);
    });
    timeline.addEventListener('click', (e) => this.handleTimelineClick(e));
  }

  /**
   * Handle reset to initial state
   */
  handleReset() {
    this.stopPlayback();
    this.currentIndex = -1;
    this.selectedEventIndex = null;
    
    window.EventBus?.emit({
      type: 'timetraveldebugger:reset',
      payload: {},
      source: 'TimeTravelDebugger'
    });

    this.updateTimelinePosition();
    this.updateEventList();
    this.updateInspector();
  }

  /**
   * Handle step backward
   */
  handleStepBack() {
    if (this.currentIndex > -1) {
      this.stopPlayback();
      this.seekToIndex(this.currentIndex - 1);
      
      window.EventBus?.emit({
        type: 'timetraveldebugger:step',
        payload: { direction: 'back', index: this.currentIndex },
        source: 'TimeTravelDebugger'
      });
    }
  }

  /**
   * Handle play/pause toggle
   */
  handlePlayPause() {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  /**
   * Handle step forward
   */
  handleStepForward() {
    if (this.currentIndex < this.events.length - 1) {
      this.stopPlayback();
      this.seekToIndex(this.currentIndex + 1);
      
      window.EventBus?.emit({
        type: 'timetraveldebugger:step',
        payload: { direction: 'forward', index: this.currentIndex },
        source: 'TimeTravelDebugger'
      });
    }
  }

  /**
   * Start automatic playback
   */
  startPlayback() {
    if (this.events.length === 0) return;
    
    this.isPlaying = true;
    const playPauseBtn = this.shadowRoot.getElementById('play-pause-btn');
    playPauseBtn.textContent = '⏸ Pause';
    
    window.EventBus?.emit({
      type: 'timetraveldebugger:play',
      payload: { speed: this.playbackSpeed },
      source: 'TimeTravelDebugger'
    });

    // Calculate base interval from event timestamps
    const baseInterval = this.calculateAverageInterval();
    const interval = Math.max(50, baseInterval / this.playbackSpeed);

    this.playbackInterval = setInterval(() => {
      if (this.currentIndex < this.events.length - 1) {
        this.seekToIndex(this.currentIndex + 1);
      } else {
        this.stopPlayback();
      }
    }, interval);
  }

  /**
   * Stop automatic playback
   */
  stopPlayback() {
    this.isPlaying = false;
    const playPauseBtn = this.shadowRoot.getElementById('play-pause-btn');
    playPauseBtn.textContent = '▶ Play';
    
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
      
      window.EventBus?.emit({
        type: 'timetraveldebugger:pause',
        payload: { index: this.currentIndex },
        source: 'TimeTravelDebugger'
      });
    }
  }

  /**
   * Calculate average interval between events
   * @returns {number} Average interval in milliseconds
   */
  calculateAverageInterval() {
    if (this.events.length < 2) return 500;
    
    let totalInterval = 0;
    for (let i = 1; i < this.events.length; i++) {
      totalInterval += this.events[i].timestamp - this.events[i - 1].timestamp;
    }
    
    return totalInterval / (this.events.length - 1);
  }

  /**
   * Seek to a specific event index
   * @param {number} index - Target event index
   */
  seekToIndex(index) {
    const clampedIndex = Math.max(-1, Math.min(index, this.events.length - 1));
    this.currentIndex = clampedIndex;
    
    window.EventBus?.emit({
      type: 'timetraveldebugger:seek',
      payload: { index: clampedIndex },
      source: 'TimeTravelDebugger'
    });

    this.updateTimelinePosition();
    this.updateEventList();
  }

  /**
   * Handle timeline click for scrubbing
   * @param {MouseEvent} event - Click event
   */
  handleTimelineClick(event) {
    if (this.events.length === 0) return;

    const timeline = this.shadowRoot.getElementById('timeline');
    const rect = timeline.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, (x - 8) / (rect.width - 16)));
    const targetIndex = Math.round(percent * (this.events.length - 1));
    
    this.stopPlayback();
    this.seekToIndex(targetIndex);
  }

  /**
   * Update timeline visualization
   */
  updateTimeline() {
    const timelineEvents = this.shadowRoot.getElementById('timeline-events');
    const timelineDuration = this.shadowRoot.getElementById('timeline-duration');
    
    if (this.events.length === 0) {
      timelineEvents.innerHTML = '';
      timelineDuration.textContent = 'Duration: 0.0s';
      this.updateEventList();
      return;
    }

    // Calculate duration
    const duration = (this.events[this.events.length - 1].timestamp - this.events[0].timestamp) / 1000;
    timelineDuration.textContent = `Duration: ${duration.toFixed(1)}s`;

    // Render event markers
    const width = timelineEvents.offsetWidth;
    timelineEvents.innerHTML = this.events.map((event, index) => {
      const percent = this.events.length === 1 ? 0.5 : index / (this.events.length - 1);
      const left = percent * width;
      return `<div class="timeline-event" data-index="${index}" style="left: ${left}px;"></div>`;
    }).join('');

    // Attach click handlers to event markers
    timelineEvents.querySelectorAll('.timeline-event').forEach(marker => {
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(marker.dataset.index);
        this.selectedEventIndex = index;
        this.updateEventList();
        this.updateInspector();
      });
    });

    this.updateTimelinePosition();
    this.updateEventList();
  }

  /**
   * Update timeline position indicator
   */
  updateTimelinePosition() {
    const timelinePosition = this.shadowRoot.getElementById('timeline-position');
    const timelineCurrent = this.shadowRoot.getElementById('timeline-current');
    
    if (this.events.length === 0) {
      timelinePosition.style.display = 'none';
      timelineCurrent.textContent = 'Event: 0 / 0';
      return;
    }

    timelinePosition.style.display = 'block';
    
    const percent = this.currentIndex === -1 ? 0 : 
      this.events.length === 1 ? 0.5 : 
      this.currentIndex / (this.events.length - 1);
    
    const timeline = this.shadowRoot.getElementById('timeline');
    const width = timeline.offsetWidth - 16;
    timelinePosition.style.left = `${8 + percent * width}px`;
    
    timelineCurrent.textContent = `Event: ${this.currentIndex + 1} / ${this.events.length}`;
  }

  /**
   * Update event list display
   */
  updateEventList() {
    const eventList = this.shadowRoot.getElementById('event-list');
    
    if (this.events.length === 0) {
      eventList.innerHTML = '<div class="no-events">No events recorded yet</div>';
      return;
    }

    eventList.innerHTML = this.events.map((event, index) => {
      const classes = ['event-item'];
      if (index === this.currentIndex) classes.push('current');
      if (index === this.selectedEventIndex) classes.push('selected');
      if (index > this.currentIndex) classes.push('future');
      
      const relativeTime = index === 0 ? '0ms' : 
        `+${(event.timestamp - this.events[0].timestamp).toFixed(0)}ms`;
      
      return `
        <div class="${classes.join(' ')}" data-index="${index}">
          <div class="event-header">
            <span class="event-type">${this.escapeHtml(event.type)}</span>
            <span class="event-time">${relativeTime}</span>
          </div>
          <div class="event-source">${this.escapeHtml(event.source || 'unknown')}</div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    eventList.querySelectorAll('.event-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.selectedEventIndex = index;
        this.updateEventList();
        this.updateInspector();
      });
    });

    // Scroll current event into view
    if (this.currentIndex >= 0) {
      const currentItem = eventList.querySelector('.event-item.current');
      if (currentItem) {
        currentItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  /**
   * Update inspector panel with selected event details
   */
  updateInspector() {
    const inspector = this.shadowRoot.getElementById('inspector');
    
    if (this.selectedEventIndex === null || !this.events[this.selectedEventIndex]) {
      inspector.innerHTML = `
        <h4>Event Inspector</h4>
        <div class="inspector-empty">Select an event to inspect</div>
      `;
      return;
    }

    const event = this.events[this.selectedEventIndex];
    
    inspector.innerHTML = `
      <h4>Event Inspector</h4>
      
      <div class="inspector-section">
        <div class="inspector-label">Event Type</div>
        <div class="inspector-value">${this.escapeHtml(event.type)}</div>
      </div>
      
      <div class="inspector-section">
        <div class="inspector-label">Source</div>
        <div class="inspector-value">${this.escapeHtml(event.source || 'unknown')}</div>
      </div>
      
      <div class="inspector-section">
        <div class="inspector-label">Timestamp</div>
        <div class="inspector-value">${new Date(event.timestamp).toISOString()}</div>
      </div>
      
      <div class="inspector-section">
        <div class="inspector-label">Payload</div>
        <div class="inspector-value">${this.escapeHtml(JSON.stringify(event.payload, null, 2))}</div>
      </div>
    `;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('time-travel-debugger', TimeTravelDebugger);