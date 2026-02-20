/**
 * @fileoverview Offline Queue Status Component - Visual indicator for offline queue state
 * @module components/offline-queue-status
 * 
 * Web component that displays the current state of the offline mutation queue,
 * including pending count, sync status, and network connectivity.
 * 
 * Related Documentation: See DESIGN_SYSTEM.md § Offline Support
 */

/**
 * Offline Queue Status Component
 * Displays queue status and provides sync controls
 * 
 * @element offline-queue-status
 * 
 * @attr {string} position - Position on screen: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
 * @attr {boolean} compact - Use compact display mode
 * @attr {boolean} show-controls - Show sync controls
 * 
 * @fires {CustomEvent} sync-requested - When user requests manual sync
 * @fires {CustomEvent} retry-requested - When user requests retry of failed mutations
 * @fires {CustomEvent} clear-requested - When user requests clearing failed mutations
 */
export class OfflineQueueStatus extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    /** @type {import('../core/offline-mutation-queue.js').OfflineMutationQueue|null} */
    this.queue = null;
    
    /** @type {number|null} */
    this.updateInterval = null;
  }

  static get observedAttributes() {
    return ['position', 'compact', 'show-controls'];
  }

  connectedCallback() {
    this.render();
    this._connectToQueue();
    this._startPolling();
  }

  disconnectedCallback() {
    this._stopPolling();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Connect to offline mutation queue
   * @private
   */
  _connectToQueue() {
    if (window.offlineMutationQueue) {
      this.queue = window.offlineMutationQueue;
      this._update();
    } else {
      // Retry connection after a delay
      setTimeout(() => this._connectToQueue(), 1000);
    }
  }

  /**
   * Start polling for updates
   * @private
   */
  _startPolling() {
    this._stopPolling();
    this.updateInterval = setInterval(() => this._update(), 2000);
  }

  /**
   * Stop polling
   * @private
   */
  _stopPolling() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update display
   * @private
   */
  _update() {
    if (!this.queue) return;
    
    const status = this.queue.getStatus();
    this._updateDisplay(status);
  }

  /**
   * Update display with status data
   * @private
   * @param {Object} status - Queue status
   */
  _updateDisplay(status) {
    const statusEl = this.shadowRoot.querySelector('.status');
    const countEl = this.shadowRoot.querySelector('.count');
    const syncBtn = this.shadowRoot.querySelector('.sync-btn');
    const indicator = this.shadowRoot.querySelector('.indicator');

    if (!statusEl || !countEl) return;

    // Update online/offline indicator
    indicator.className = `indicator ${status.isOnline ? 'online' : 'offline'}`;
    indicator.title = status.isOnline ? 'Online' : 'Offline';

    // Update pending count
    countEl.textContent = status.totalPending;

    // Update status text
    if (status.isSyncing) {
      statusEl.textContent = 'Syncing...';
      if (syncBtn) syncBtn.disabled = true;
    } else if (status.totalPending > 0) {
      const failed = status.byStatus.failed || 0;
      statusEl.textContent = failed > 0 ? `${failed} failed` : 'Pending';
      if (syncBtn) syncBtn.disabled = !status.isOnline;
    } else {
      statusEl.textContent = 'All synced';
      if (syncBtn) syncBtn.disabled = true;
    }

    // Show/hide component based on pending count
    if (status.totalPending === 0 && !this.hasAttribute('always-visible')) {
      this.style.display = 'none';
    } else {
      this.style.display = 'block';
    }
  }

  /**
   * Handle sync button click
   * @private
   */
  async _handleSync() {
    if (!this.queue) return;
    
    this.dispatchEvent(new CustomEvent('sync-requested', {
      bubbles: true,
      composed: true
    }));

    try {
      await this.queue.syncPendingMutations();
      this._update();
    } catch (error) {
      console.error('[OfflineQueueStatus] Sync failed:', error);
    }
  }

  /**
   * Handle retry button click
   * @private
   */
  async _handleRetry() {
    if (!this.queue) return;
    
    this.dispatchEvent(new CustomEvent('retry-requested', {
      bubbles: true,
      composed: true
    }));

    try {
      await this.queue.retryFailedMutations();
      this._update();
    } catch (error) {
      console.error('[OfflineQueueStatus] Retry failed:', error);
    }
  }

  /**
   * Handle clear button click
   * @private
   */
  async _handleClear() {
    if (!this.queue) return;
    
    this.dispatchEvent(new CustomEvent('clear-requested', {
      bubbles: true,
      composed: true
    }));

    try {
      await this.queue.clearFailedMutations();
      this._update();
    } catch (error) {
      console.error('[OfflineQueueStatus] Clear failed:', error);
    }
  }

  /**
   * Render component
   */
  render() {
    const position = this.getAttribute('position') || 'bottom-right';
    const compact = this.hasAttribute('compact');
    const showControls = this.hasAttribute('show-controls');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
        }

        :host([position="top-right"]) { top: 16px; right: 16px; }
        :host([position="top-left"]) { top: 16px; left: 16px; }
        :host([position="bottom-right"]) { bottom: 16px; right: 16px; }
        :host([position="bottom-left"]) { bottom: 16px; left: 16px; }

        .container {
          background: rgba(0, 0, 0, 0.9);
          color: white;
          border-radius: 8px;
          padding: 12px 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: ${compact ? '120px' : '200px'};
        }

        .indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .indicator.online {
          background: #4ade80;
          box-shadow: 0 0 8px #4ade80;
        }

        .indicator.offline {
          background: #f87171;
          box-shadow: 0 0 8px #f87171;
        }

        .info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .count {
          font-size: 18px;
          font-weight: 600;
        }

        .status {
          font-size: 12px;
          opacity: 0.8;
        }

        .controls {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        button {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :host([compact]) .info {
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }

        :host([compact]) .status {
          font-size: 11px;
        }
      </style>

      <div class="container">
        <div class="indicator online"></div>
        <div class="info">
          <div class="count">0</div>
          <div class="status">All synced</div>
        </div>
        ${showControls ? `
          <div class="controls">
            <button class="sync-btn" title="Sync now">Sync</button>
            <button class="retry-btn" title="Retry failed">Retry</button>
            <button class="clear-btn" title="Clear failed">Clear</button>
          </div>
        ` : ''}
      </div>
    `;

    // Attach event listeners
    const syncBtn = this.shadowRoot.querySelector('.sync-btn');
    const retryBtn = this.shadowRoot.querySelector('.retry-btn');
    const clearBtn = this.shadowRoot.querySelector('.clear-btn');

    if (syncBtn) syncBtn.addEventListener('click', () => this._handleSync());
    if (retryBtn) retryBtn.addEventListener('click', () => this._handleRetry());
    if (clearBtn) clearBtn.addEventListener('click', () => this._handleClear());
  }
}

customElements.define('offline-queue-status', OfflineQueueStatus);