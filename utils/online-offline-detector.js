/**
 * @fileoverview Online/Offline Detector - Monitors network state changes and triggers sync operations
 * @module utils/online-offline-detector
 * 
 * Detects network connectivity changes using the Network Information API and navigator.onLine.
 * Publishes events to EventBus for other components to react to connectivity changes.
 * Integrates with offline mutation queue to trigger sync when coming back online.
 * 
 * Performance:
 * - Event listeners are passive and non-blocking
 * - Debounces rapid state changes to prevent event spam
 * - Memory footprint: < 1KB
 * 
 * @see {@link ../../DESIGN_SYSTEM.md#online-offline-detector}
 */

import { EventBus } from './event-bus.js';

/**
 * @typedef {Object} NetworkState
 * @property {boolean} online - Whether the browser reports being online
 * @property {string} effectiveType - Effective connection type (4g, 3g, 2g, slow-2g)
 * @property {number} downlink - Downlink speed in Mbps
 * @property {number} rtt - Round-trip time in milliseconds
 * @property {boolean} saveData - Whether the user has requested reduced data usage
 * @property {number} timestamp - Timestamp when state was captured
 */

/**
 * @typedef {Object} OnlineOfflineDetectorConfig
 * @property {number} debounceMs - Debounce time for rapid state changes (default: 500ms)
 * @property {boolean} enableNetworkInfo - Whether to use Network Information API (default: true)
 * @property {boolean} autoSync - Whether to automatically trigger sync on reconnection (default: true)
 * @property {number} syncDelayMs - Delay before triggering sync after reconnection (default: 1000ms)
 */

/**
 * OnlineOfflineDetector class
 * Monitors network connectivity and publishes state change events
 */
export class OnlineOfflineDetector {
  /**
   * @param {OnlineOfflineDetectorConfig} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      debounceMs: 500,
      enableNetworkInfo: true,
      autoSync: true,
      syncDelayMs: 1000,
      ...config,
    };

    /** @type {boolean} */
    this.isOnline = navigator.onLine;

    /** @type {NetworkState|null} */
    this.lastState = null;

    /** @type {number|null} */
    this.debounceTimer = null;

    /** @type {number|null} */
    this.syncTimer = null;

    /** @type {boolean} */
    this.isInitialized = false;

    /** @type {EventBus|null} */
    this.eventBus = null;

    // Bind event handlers
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    this.handleConnectionChange = this.handleConnectionChange.bind(this);
  }

  /**
   * Initialize the detector and start monitoring
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('[OnlineOfflineDetector] Already initialized');
      return;
    }

    try {
      // Get EventBus instance
      this.eventBus = EventBus.getInstance();

      // Capture initial state
      this.lastState = this.captureNetworkState();

      // Add event listeners
      window.addEventListener('online', this.handleOnline, { passive: true });
      window.addEventListener('offline', this.handleOffline, { passive: true });

      // Monitor Network Information API if available and enabled
      if (this.config.enableNetworkInfo && 'connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          connection.addEventListener('change', this.handleConnectionChange, { passive: true });
        }
      }

      this.isInitialized = true;

      // Publish initial state
      this.publishNetworkState('NetworkStateInitialized', this.lastState);

      console.log('[OnlineOfflineDetector] Initialized', this.lastState);
    } catch (error) {
      console.error('[OnlineOfflineDetector] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Capture current network state
   * @returns {NetworkState}
   */
  captureNetworkState() {
    const state = {
      online: navigator.onLine,
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false,
      timestamp: Date.now(),
    };

    // Get Network Information API data if available
    if (this.config.enableNetworkInfo && 'connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        state.effectiveType = connection.effectiveType || 'unknown';
        state.downlink = connection.downlink || 0;
        state.rtt = connection.rtt || 0;
        state.saveData = connection.saveData || false;
      }
    }

    return state;
  }

  /**
   * Handle online event
   * @private
   */
  handleOnline() {
    console.log('[OnlineOfflineDetector] Browser reports online');
    this.isOnline = true;
    this.debouncedStateChange('online');
  }

  /**
   * Handle offline event
   * @private
   */
  handleOffline() {
    console.log('[OnlineOfflineDetector] Browser reports offline');
    this.isOnline = false;
    this.debouncedStateChange('offline');
  }

  /**
   * Handle connection change event (Network Information API)
   * @private
   */
  handleConnectionChange() {
    console.log('[OnlineOfflineDetector] Connection properties changed');
    this.debouncedStateChange('connection-change');
  }

  /**
   * Debounced state change handler
   * @param {string} trigger - What triggered the change
   * @private
   */
  debouncedStateChange(trigger) {
    // Clear existing timer
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.processStateChange(trigger);
      this.debounceTimer = null;
    }, this.config.debounceMs);
  }

  /**
   * Process state change and publish events
   * @param {string} trigger - What triggered the change
   * @private
   */
  processStateChange(trigger) {
    const newState = this.captureNetworkState();
    const wasOnline = this.lastState ? this.lastState.online : false;
    const isNowOnline = newState.online;

    console.log('[OnlineOfflineDetector] State change:', {
      trigger,
      wasOnline,
      isNowOnline,
      state: newState,
    });

    // Detect transition
    if (!wasOnline && isNowOnline) {
      // Came back online
      this.publishNetworkState('NetworkOnline', newState);
      this.triggerSync();
    } else if (wasOnline && !isNowOnline) {
      // Went offline
      this.publishNetworkState('NetworkOffline', newState);
      this.cancelSync();
    } else {
      // Connection properties changed but online status same
      this.publishNetworkState('NetworkStateChanged', newState);
    }

    this.lastState = newState;
  }

  /**
   * Publish network state event to EventBus
   * @param {string} eventType - Event type
   * @param {NetworkState} state - Network state
   * @private
   */
  publishNetworkState(eventType, state) {
    if (!this.eventBus) {
      console.warn('[OnlineOfflineDetector] EventBus not available');
      return;
    }

    try {
      this.eventBus.publish({
        type: eventType,
        source: 'OnlineOfflineDetector',
        payload: {
          state,
          isOnline: state.online,
          effectiveType: state.effectiveType,
          downlink: state.downlink,
          rtt: state.rtt,
          saveData: state.saveData,
        },
        timestamp: state.timestamp,
      });
    } catch (error) {
      console.error(`[OnlineOfflineDetector] Failed to publish ${eventType}:`, error);
    }
  }

  /**
   * Trigger sync operation after reconnection
   * @private
   */
  triggerSync() {
    if (!this.config.autoSync) {
      return;
    }

    // Cancel any existing sync timer
    this.cancelSync();

    // Schedule sync with delay
    this.syncTimer = setTimeout(() => {
      console.log('[OnlineOfflineDetector] Triggering sync after reconnection');
      
      if (this.eventBus) {
        try {
          this.eventBus.publish({
            type: 'TriggerOfflineSync',
            source: 'OnlineOfflineDetector',
            payload: {
              reason: 'reconnection',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('[OnlineOfflineDetector] Failed to publish TriggerOfflineSync:', error);
        }
      }

      this.syncTimer = null;
    }, this.config.syncDelayMs);
  }

  /**
   * Cancel pending sync operation
   * @private
   */
  cancelSync() {
    if (this.syncTimer !== null) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
      console.log('[OnlineOfflineDetector] Cancelled pending sync');
    }
  }

  /**
   * Get current network state
   * @returns {NetworkState}
   */
  getState() {
    return this.lastState || this.captureNetworkState();
  }

  /**
   * Check if currently online
   * @returns {boolean}
   */
  isCurrentlyOnline() {
    return navigator.onLine;
  }

  /**
   * Check if connection is considered fast
   * Fast = 4g or better, or downlink > 5 Mbps
   * @returns {boolean}
   */
  isFastConnection() {
    const state = this.getState();
    
    if (state.effectiveType === '4g') {
      return true;
    }

    if (state.downlink > 5) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has requested reduced data usage
   * @returns {boolean}
   */
  isSaveDataEnabled() {
    const state = this.getState();
    return state.saveData;
  }

  /**
   * Destroy the detector and clean up
   */
  destroy() {
    if (!this.isInitialized) {
      return;
    }

    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    if (this.config.enableNetworkInfo && 'connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        connection.removeEventListener('change', this.handleConnectionChange);
      }
    }

    // Clear timers
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.cancelSync();

    this.isInitialized = false;
    this.eventBus = null;
    this.lastState = null;

    console.log('[OnlineOfflineDetector] Destroyed');
  }
}

// Singleton instance
let detectorInstance = null;

/**
 * Get singleton instance of OnlineOfflineDetector
 * @param {OnlineOfflineDetectorConfig} config - Configuration options
 * @returns {OnlineOfflineDetector}
 */
export function getOnlineOfflineDetector(config = {}) {
  if (!detectorInstance) {
    detectorInstance = new OnlineOfflineDetector(config);
  }
  return detectorInstance;
}

/**
 * Initialize and start the detector
 * @param {OnlineOfflineDetectorConfig} config - Configuration options
 * @returns {Promise<OnlineOfflineDetector>}
 */
export async function initializeDetector(config = {}) {
  const detector = getOnlineOfflineDetector(config);
  await detector.initialize();
  return detector;
}