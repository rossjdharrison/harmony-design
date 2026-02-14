/**
 * @fileoverview Web component for controlling event recording
 * @module components/EventRecorderComponent
 * 
 * Provides UI controls for starting/stopping event recording,
 * viewing statistics, and downloading log files.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#event-recorder-component
 */

/**
 * EventRecorderComponent provides UI for event recording control
 * 
 * @class
 * @extends HTMLElement
 * @example
 * <event-recorder-component></event-recorder-component>
 */
export class EventRecorderComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @private */
    this.recorder = null;
    
    /** @private */
    this.updateInterval = null;
  }

  /**
   * Set the EventRecorder instance
   * @public
   * @param {EventRecorder} recorder - EventRecorder instance
   */
  setRecorder(recorder) {
    this.recorder = recorder;
    this.render();
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  /**
   * Render component
   * @private
   */
  render() {
    const stats = this.recorder ? this.recorder.getStats() : null;
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
        }

        .recorder-panel {
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ccc;
        }

        .status-indicator.recording {
          background: #f44336;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .controls {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        button {
          padding: 8px 16px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: #fff;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        button:hover {
          background: #f5f5f5;
        }

        button:active {
          transform: translateY(1px);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        button.primary {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        button.primary:hover {
          background: #1976d2;
        }

        button.danger {
          background: #f44336;
          color: white;
          border-color: #f44336;
        }

        button.danger:hover {
          background: #d32f2f;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .stat {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .memory-bar {
          width: 100%;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 4px;
        }

        .memory-fill {
          height: 100%;
          background: #4caf50;
          transition: width 0.3s;
        }

        .memory-fill.warning {
          background: #ff9800;
        }

        .memory-fill.danger {
          background: #f44336;
        }

        .no-recorder {
          color: #999;
          text-align: center;
          padding: 24px;
        }
      </style>

      <div class="recorder-panel">
        ${this.recorder ? `
          <div class="header">
            <div class="title">Event Recorder</div>
            <div class="status">
              <div class="status-indicator ${stats.isRecording ? 'recording' : ''}"></div>
              <span>${stats.isRecording ? 'Recording' : 'Stopped'}</span>
            </div>
          </div>

          <div class="controls">
            <button class="primary" id="start-btn" ${stats.isRecording ? 'disabled' : ''}>
              Start Recording
            </button>
            <button class="danger" id="stop-btn" ${!stats.isRecording ? 'disabled' : ''}>
              Stop Recording
            </button>
            <button id="download-btn" ${stats.totalEvents === 0 ? 'disabled' : ''}>
              Download Log
            </button>
            <button id="clear-btn" ${stats.totalEvents === 0 ? 'disabled' : ''}>
              Clear
            </button>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-label">Total Events</div>
              <div class="stat-value">${stats.totalEvents}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Duration</div>
              <div class="stat-value">${this._formatDuration(stats.duration)}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Event Types</div>
              <div class="stat-value">${Object.keys(stats.eventTypes).length}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Memory Usage</div>
              <div class="stat-value">${(stats.memoryUsage * 100).toFixed(1)}%</div>
              <div class="memory-bar">
                <div class="memory-fill ${this._getMemoryClass(stats.memoryUsage)}" 
                     style="width: ${stats.memoryUsage * 100}%"></div>
              </div>
            </div>
          </div>
        ` : `
          <div class="no-recorder">
            No recorder instance set
          </div>
        `}
      </div>
    `;
  }

  /**
   * Attach event listeners
   * @private
   */
  attachEventListeners() {
    if (!this.recorder) return;

    const startBtn = this.shadowRoot.getElementById('start-btn');
    const stopBtn = this.shadowRoot.getElementById('stop-btn');
    const downloadBtn = this.shadowRoot.getElementById('download-btn');
    const clearBtn = this.shadowRoot.getElementById('clear-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.recorder.start();
        this.render();
        this.startAutoUpdate();
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.recorder.stop();
        this.render();
        this.stopAutoUpdate();
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.recorder.downloadLog();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all recorded events?')) {
          this.recorder.clear();
          this.render();
        }
      });
    }
  }

  /**
   * Start auto-updating stats
   * @private
   */
  startAutoUpdate() {
    if (this.updateInterval) return;
    
    this.updateInterval = setInterval(() => {
      this.render();
      this.attachEventListeners();
    }, 1000);
  }

  /**
   * Stop auto-updating stats
   * @private
   */
  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Format duration in ms to human readable
   * @private
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Get CSS class for memory usage indicator
   * @private
   * @param {number} usage - Memory usage (0-1)
   * @returns {string} CSS class name
   */
  _getMemoryClass(usage) {
    if (usage > 0.9) return 'danger';
    if (usage > 0.7) return 'warning';
    return '';
  }
}

// Register custom element
customElements.define('event-recorder-component', EventRecorderComponent);