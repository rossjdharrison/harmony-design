/**
 * @fileoverview Offline UI Indicator Component
 * Shows offline status and pending sync count to inform users about network state
 * and queued operations.
 * 
 * @module components/offline-indicator-component
 * @see {@link file://./DESIGN_SYSTEM.md#offline-indicator-component}
 * 
 * Events Published:
 * - offline-indicator:retry-sync - User requests manual sync retry
 * 
 * Events Subscribed:
 * - network:status-changed - Network status updates
 * - offline-queue:updated - Pending mutation count updates
 * - sync:progress - Sync operation progress
 * - sync:completed - Sync operation completed
 * - sync:failed - Sync operation failed
 * 
 * Performance:
 * - Render budget: <1ms (simple status display)
 * - Memory: <100KB
 * - Updates: Throttled to prevent excessive repaints
 */

/**
 * @typedef {Object} NetworkStatus
 * @property {boolean} online - Whether network is available
 * @property {string} effectiveType - Connection type (4g, 3g, 2g, slow-2g)
 * @property {number} downlink - Downlink speed in Mbps
 * @property {number} rtt - Round-trip time in ms
 */

/**
 * @typedef {Object} QueueStatus
 * @property {number} pendingCount - Number of pending mutations
 * @property {number} failedCount - Number of failed mutations
 * @property {Array<Object>} mutations - Queued mutation objects
 */

/**
 * @typedef {Object} SyncProgress
 * @property {number} completed - Number of synced items
 * @property {number} total - Total items to sync
 * @property {boolean} inProgress - Whether sync is active
 */

class OfflineIndicatorComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Component state
    this._state = {
      online: navigator.onLine,
      pendingCount: 0,
      failedCount: 0,
      syncing: false,
      syncProgress: { completed: 0, total: 0 },
      lastSyncError: null,
      connectionQuality: 'unknown'
    };
    
    // Throttle state updates to prevent excessive repaints
    this._updateThrottle = null;
    this._throttleDelay = 100; // ms
    
    // Event handlers bound to this instance
    this._boundHandlers = {
      networkStatusChanged: this._handleNetworkStatusChanged.bind(this),
      queueUpdated: this._handleQueueUpdated.bind(this),
      syncProgress: this._handleSyncProgress.bind(this),
      syncCompleted: this._handleSyncCompleted.bind(this),
      syncFailed: this._handleSyncFailed.bind(this),
      retryClick: this._handleRetryClick.bind(this)
    };
  }

  connectedCallback() {
    this._render();
    this._attachEventListeners();
    this._subscribeToEvents();
    
    // Request initial state
    this._requestInitialState();
  }

  disconnectedCallback() {
    this._unsubscribeFromEvents();
    this._detachEventListeners();
    
    if (this._updateThrottle) {
      clearTimeout(this._updateThrottle);
    }
  }

  /**
   * Subscribe to EventBus events
   * @private
   */
  _subscribeToEvents() {
    const eventBus = window.eventBus;
    if (!eventBus) {
      console.warn('[OfflineIndicator] EventBus not available');
      return;
    }

    eventBus.subscribe('network:status-changed', this._boundHandlers.networkStatusChanged);
    eventBus.subscribe('offline-queue:updated', this._boundHandlers.queueUpdated);
    eventBus.subscribe('sync:progress', this._boundHandlers.syncProgress);
    eventBus.subscribe('sync:completed', this._boundHandlers.syncCompleted);
    eventBus.subscribe('sync:failed', this._boundHandlers.syncFailed);
  }

  /**
   * Unsubscribe from EventBus events
   * @private
   */
  _unsubscribeFromEvents() {
    const eventBus = window.eventBus;
    if (!eventBus) return;

    eventBus.unsubscribe('network:status-changed', this._boundHandlers.networkStatusChanged);
    eventBus.unsubscribe('offline-queue:updated', this._boundHandlers.queueUpdated);
    eventBus.unsubscribe('sync:progress', this._boundHandlers.syncProgress);
    eventBus.unsubscribe('sync:completed', this._boundHandlers.syncCompleted);
    eventBus.unsubscribe('sync:failed', this._boundHandlers.syncFailed);
  }

  /**
   * Request initial state from relevant systems
   * @private
   */
  _requestInitialState() {
    const eventBus = window.eventBus;
    if (!eventBus) return;

    // Request current network status
    eventBus.publish('network:status-request', {
      source: 'offline-indicator',
      timestamp: Date.now()
    });

    // Request current queue status
    eventBus.publish('offline-queue:status-request', {
      source: 'offline-indicator',
      timestamp: Date.now()
    });
  }

  /**
   * Handle network status change events
   * @param {Object} event - Event payload
   * @param {NetworkStatus} event.status - Network status
   * @private
   */
  _handleNetworkStatusChanged(event) {
    if (!event || !event.status) return;

    this._throttledUpdate(() => {
      this._state.online = event.status.online;
      this._state.connectionQuality = this._determineConnectionQuality(event.status);
      this._updateDisplay();
    });
  }

  /**
   * Handle offline queue update events
   * @param {Object} event - Event payload
   * @param {QueueStatus} event.queue - Queue status
   * @private
   */
  _handleQueueUpdated(event) {
    if (!event || !event.queue) return;

    this._throttledUpdate(() => {
      this._state.pendingCount = event.queue.pendingCount || 0;
      this._state.failedCount = event.queue.failedCount || 0;
      this._updateDisplay();
    });
  }

  /**
   * Handle sync progress events
   * @param {Object} event - Event payload
   * @param {SyncProgress} event.progress - Sync progress
   * @private
   */
  _handleSyncProgress(event) {
    if (!event || !event.progress) return;

    this._throttledUpdate(() => {
      this._state.syncing = event.progress.inProgress;
      this._state.syncProgress = event.progress;
      this._updateDisplay();
    });
  }

  /**
   * Handle sync completed events
   * @param {Object} event - Event payload
   * @private
   */
  _handleSyncCompleted(event) {
    this._throttledUpdate(() => {
      this._state.syncing = false;
      this._state.lastSyncError = null;
      this._state.syncProgress = { completed: 0, total: 0 };
      this._updateDisplay();
    });
  }

  /**
   * Handle sync failed events
   * @param {Object} event - Event payload
   * @param {string} event.error - Error message
   * @private
   */
  _handleSyncFailed(event) {
    this._throttledUpdate(() => {
      this._state.syncing = false;
      this._state.lastSyncError = event.error || 'Sync failed';
      this._updateDisplay();
    });
  }

  /**
   * Handle retry button click
   * @param {Event} event - Click event
   * @private
   */
  _handleRetryClick(event) {
    event.preventDefault();
    
    const eventBus = window.eventBus;
    if (!eventBus) {
      console.error('[OfflineIndicator] EventBus not available for retry');
      return;
    }

    // Publish retry sync event
    eventBus.publish('offline-indicator:retry-sync', {
      source: 'offline-indicator',
      timestamp: Date.now()
    });

    // Update UI to show syncing state
    this._state.syncing = true;
    this._state.lastSyncError = null;
    this._updateDisplay();
  }

  /**
   * Throttle state updates to prevent excessive repaints
   * @param {Function} updateFn - Update function to throttle
   * @private
   */
  _throttledUpdate(updateFn) {
    if (this._updateThrottle) {
      clearTimeout(this._updateThrottle);
    }

    this._updateThrottle = setTimeout(() => {
      updateFn();
      this._updateThrottle = null;
    }, this._throttleDelay);
  }

  /**
   * Determine connection quality from network status
   * @param {NetworkStatus} status - Network status
   * @returns {string} Connection quality (good, fair, poor, offline)
   * @private
   */
  _determineConnectionQuality(status) {
    if (!status.online) return 'offline';
    
    const effectiveType = status.effectiveType || '';
    if (effectiveType === '4g') return 'good';
    if (effectiveType === '3g') return 'fair';
    return 'poor';
  }

  /**
   * Attach event listeners to DOM elements
   * @private
   */
  _attachEventListeners() {
    const retryButton = this.shadowRoot.querySelector('.retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', this._boundHandlers.retryClick);
    }
  }

  /**
   * Detach event listeners from DOM elements
   * @private
   */
  _detachEventListeners() {
    const retryButton = this.shadowRoot.querySelector('.retry-button');
    if (retryButton) {
      retryButton.removeEventListener('click', this._boundHandlers.retryClick);
    }
  }

  /**
   * Update the display based on current state
   * @private
   */
  _updateDisplay() {
    const container = this.shadowRoot.querySelector('.offline-indicator');
    const statusIcon = this.shadowRoot.querySelector('.status-icon');
    const statusText = this.shadowRoot.querySelector('.status-text');
    const pendingCount = this.shadowRoot.querySelector('.pending-count');
    const syncProgress = this.shadowRoot.querySelector('.sync-progress');
    const retryButton = this.shadowRoot.querySelector('.retry-button');
    const errorMessage = this.shadowRoot.querySelector('.error-message');

    if (!container) return;

    // Update visibility - only show when offline or has pending items
    const shouldShow = !this._state.online || this._state.pendingCount > 0 || this._state.syncing;
    container.classList.toggle('visible', shouldShow);
    container.classList.toggle('offline', !this._state.online);
    container.classList.toggle('syncing', this._state.syncing);
    container.classList.toggle('has-error', !!this._state.lastSyncError);

    // Update status icon and text
    if (statusIcon && statusText) {
      if (this._state.syncing) {
        statusIcon.textContent = '🔄';
        statusText.textContent = 'Syncing...';
      } else if (!this._state.online) {
        statusIcon.textContent = '⚠️';
        statusText.textContent = 'Offline';
      } else if (this._state.pendingCount > 0) {
        statusIcon.textContent = '⏳';
        statusText.textContent = 'Pending sync';
      } else {
        statusIcon.textContent = '✓';
        statusText.textContent = 'Online';
      }
    }

    // Update pending count
    if (pendingCount) {
      if (this._state.pendingCount > 0) {
        pendingCount.textContent = `${this._state.pendingCount} pending`;
        pendingCount.style.display = 'inline';
      } else {
        pendingCount.style.display = 'none';
      }
    }

    // Update sync progress
    if (syncProgress) {
      if (this._state.syncing && this._state.syncProgress.total > 0) {
        const percent = Math.round(
          (this._state.syncProgress.completed / this._state.syncProgress.total) * 100
        );
        syncProgress.textContent = `${percent}%`;
        syncProgress.style.display = 'inline';
      } else {
        syncProgress.style.display = 'none';
      }
    }

    // Update retry button
    if (retryButton) {
      const showRetry = !this._state.online && this._state.pendingCount > 0 && !this._state.syncing;
      retryButton.style.display = showRetry ? 'inline-block' : 'none';
    }

    // Update error message
    if (errorMessage) {
      if (this._state.lastSyncError) {
        errorMessage.textContent = this._state.lastSyncError;
        errorMessage.style.display = 'block';
      } else {
        errorMessage.style.display = 'none';
      }
    }
  }

  /**
   * Render the component
   * @private
   */
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
        }

        .offline-indicator {
          position: fixed;
          bottom: 16px;
          right: 16px;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: 8px;
          padding: 12px 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 320px;
          opacity: 0;
          transform: translateY(100%);
          transition: opacity 0.3s ease, transform 0.3s ease;
          pointer-events: none;
          z-index: 1000;
        }

        .offline-indicator.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .offline-indicator.offline {
          background: var(--color-warning-light, #fff3cd);
          border-color: var(--color-warning, #ffc107);
        }

        .offline-indicator.has-error {
          background: var(--color-error-light, #f8d7da);
          border-color: var(--color-error, #dc3545);
        }

        .status-icon {
          font-size: 20px;
          line-height: 1;
          flex-shrink: 0;
        }

        .offline-indicator.syncing .status-icon {
          animation: rotate 1s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .status-content {
          flex: 1;
          min-width: 0;
        }

        .status-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary, #212121);
          margin: 0;
        }

        .status-details {
          font-size: 12px;
          color: var(--color-text-secondary, #757575);
          margin-top: 4px;
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .pending-count,
        .sync-progress {
          display: none;
        }

        .error-message {
          font-size: 12px;
          color: var(--color-error, #dc3545);
          margin-top: 4px;
          display: none;
        }

        .retry-button {
          background: var(--color-primary, #1976d2);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: none;
          transition: background 0.2s ease;
        }

        .retry-button:hover {
          background: var(--color-primary-dark, #1565c0);
        }

        .retry-button:active {
          background: var(--color-primary-darker, #0d47a1);
        }

        .retry-button:focus {
          outline: 2px solid var(--color-focus, #2196f3);
          outline-offset: 2px;
        }

        @media (max-width: 768px) {
          .offline-indicator {
            bottom: 8px;
            right: 8px;
            left: 8px;
            max-width: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .offline-indicator {
            transition: none;
          }
          
          .offline-indicator.syncing .status-icon {
            animation: none;
          }
        }
      </style>

      <div class="offline-indicator" role="status" aria-live="polite">
        <span class="status-icon" aria-hidden="true">⚠️</span>
        <div class="status-content">
          <div class="status-text">Offline</div>
          <div class="status-details">
            <span class="pending-count"></span>
            <span class="sync-progress"></span>
          </div>
          <div class="error-message"></div>
        </div>
        <button class="retry-button" type="button" aria-label="Retry sync">
          Retry
        </button>
      </div>
    `;

    // Initial display update
    this._updateDisplay();
  }
}

// Register the custom element
customElements.define('offline-indicator-component', OfflineIndicatorComponent);

export { OfflineIndicatorComponent };