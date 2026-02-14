/**
 * @fileoverview EventRecorder captures all EventBus events to log file
 * @module core/EventRecorder
 * 
 * Records all events flowing through the EventBus to a downloadable log file.
 * Useful for debugging, auditing, and replaying event sequences.
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#event-recording
 */

/**
 * @typedef {Object} RecordedEvent
 * @property {string} type - Event type
 * @property {*} payload - Event payload
 * @property {string} source - Component that emitted the event
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {string} id - Unique event ID
 */

/**
 * EventRecorder captures all EventBus events to memory and provides
 * export functionality to download as JSON log file.
 * 
 * @class
 * @example
 * const recorder = new EventRecorder(eventBus);
 * recorder.start();
 * // ... events occur ...
 * recorder.downloadLog('events.json');
 * recorder.stop();
 */
export class EventRecorder {
  /**
   * @param {Object} eventBus - EventBus instance to record from
   */
  constructor(eventBus) {
    /** @private */
    this.eventBus = eventBus;
    
    /** @private @type {RecordedEvent[]} */
    this.events = [];
    
    /** @private */
    this.isRecording = false;
    
    /** @private */
    this.boundListener = null;
    
    /** @private */
    this.maxEvents = 10000; // Prevent memory overflow
    
    /** @private */
    this.eventCounter = 0;
    
    /** @private */
    this.startTime = null;
  }

  /**
   * Start recording events
   * @public
   */
  start() {
    if (this.isRecording) {
      console.warn('[EventRecorder] Already recording');
      return;
    }

    this.isRecording = true;
    this.startTime = Date.now();
    this.events = [];
    this.eventCounter = 0;

    // Subscribe to all events using wildcard pattern
    this.boundListener = (event) => this._recordEvent(event);
    
    // Hook into EventBus emit to capture all events
    this._installHook();

    console.log('[EventRecorder] Started recording');
  }

  /**
   * Stop recording events
   * @public
   */
  stop() {
    if (!this.isRecording) {
      console.warn('[EventRecorder] Not currently recording');
      return;
    }

    this.isRecording = false;
    this._uninstallHook();

    const duration = Date.now() - this.startTime;
    console.log(`[EventRecorder] Stopped recording. Captured ${this.events.length} events over ${duration}ms`);
  }

  /**
   * Install hook to capture events from EventBus
   * @private
   */
  _installHook() {
    // Store original emit method
    this.originalEmit = this.eventBus.emit.bind(this.eventBus);
    
    // Replace with wrapped version
    this.eventBus.emit = (type, payload, source = 'unknown') => {
      // Record the event
      if (this.isRecording) {
        this._recordEvent({ type, payload, source });
      }
      
      // Call original emit
      return this.originalEmit(type, payload, source);
    };
  }

  /**
   * Uninstall hook and restore original EventBus emit
   * @private
   */
  _uninstallHook() {
    if (this.originalEmit) {
      this.eventBus.emit = this.originalEmit;
      this.originalEmit = null;
    }
  }

  /**
   * Record a single event
   * @private
   * @param {Object} event - Event to record
   */
  _recordEvent(event) {
    if (!this.isRecording) return;

    // Check memory budget
    if (this.events.length >= this.maxEvents) {
      console.warn('[EventRecorder] Max events reached, dropping oldest');
      this.events.shift(); // Remove oldest event
    }

    const recordedEvent = {
      type: event.type,
      payload: this._clonePayload(event.payload),
      source: event.source || 'unknown',
      timestamp: Date.now(),
      id: `evt_${this.eventCounter++}_${Date.now()}`
    };

    this.events.push(recordedEvent);
  }

  /**
   * Clone payload to prevent mutations affecting recorded data
   * @private
   * @param {*} payload - Payload to clone
   * @returns {*} Cloned payload
   */
  _clonePayload(payload) {
    try {
      // Deep clone using JSON (works for most cases)
      return JSON.parse(JSON.stringify(payload));
    } catch (e) {
      // If payload contains non-serializable data, return string representation
      return `[Non-serializable: ${String(payload)}]`;
    }
  }

  /**
   * Get recorded events
   * @public
   * @returns {RecordedEvent[]} Array of recorded events
   */
  getEvents() {
    return [...this.events]; // Return copy
  }

  /**
   * Clear recorded events
   * @public
   */
  clear() {
    this.events = [];
    this.eventCounter = 0;
    console.log('[EventRecorder] Cleared recorded events');
  }

  /**
   * Export events as JSON string
   * @public
   * @returns {string} JSON string of events
   */
  exportJSON() {
    const exportData = {
      metadata: {
        recordingStart: this.startTime,
        recordingEnd: Date.now(),
        eventCount: this.events.length,
        version: '1.0.0'
      },
      events: this.events
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Download events as JSON file
   * @public
   * @param {string} filename - Filename for download (default: events-{timestamp}.json)
   */
  downloadLog(filename = null) {
    const defaultFilename = `events-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const finalFilename = filename || defaultFilename;

    const json = this.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`[EventRecorder] Downloaded log to ${finalFilename}`);
  }

  /**
   * Get recording statistics
   * @public
   * @returns {Object} Statistics about current recording
   */
  getStats() {
    const eventTypes = {};
    const sources = {};

    this.events.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      sources[event.source] = (sources[event.source] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      isRecording: this.isRecording,
      startTime: this.startTime,
      duration: this.startTime ? Date.now() - this.startTime : 0,
      eventTypes,
      sources,
      memoryUsage: this.events.length / this.maxEvents
    };
  }

  /**
   * Filter events by type
   * @public
   * @param {string} type - Event type to filter
   * @returns {RecordedEvent[]} Filtered events
   */
  filterByType(type) {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Filter events by source
   * @public
   * @param {string} source - Event source to filter
   * @returns {RecordedEvent[]} Filtered events
   */
  filterBySource(source) {
    return this.events.filter(event => event.source === source);
  }

  /**
   * Filter events by time range
   * @public
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {RecordedEvent[]} Filtered events
   */
  filterByTimeRange(startTime, endTime) {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }
}